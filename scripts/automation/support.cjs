const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function saveJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function transient(error) {
  return error.transient === true || error.name === 'TimeoutError' || /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|UND_ERR_CONNECT_TIMEOUT/.test(error.code || error.cause?.code || '');
}

async function retry(operation, wait = sleep) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt === 2 || !transient(error)) throw error;
      console.warn(`Error de red; reintento ${attempt + 1}/2.`);
      await wait([10000, 30000][attempt]);
    }
  }
}

async function backupDatabase(database, directory, keep = 7) {
  if (!fs.existsSync(database)) return null;
  const Database = require('better-sqlite3');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const target = path.join(directory, `prices-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.db`);
  const db = new Database(database, { readonly: true, fileMustExist: true });
  try {
    // SQLite's backup API includes committed WAL data; a plain file copy does not.
    await db.backup(target + '.tmp');
    fs.chmodSync(target + '.tmp', 0o600);
    const copy = new Database(target + '.tmp', { readonly: true });
    try { if (copy.pragma('quick_check', { simple: true }) !== 'ok') throw new Error('Respaldo SQLite invalido.'); }
    finally { copy.close(); }
    fs.renameSync(target + '.tmp', target);
  } finally { db.close(); }
  const backups = fs.readdirSync(directory).filter(name => /^prices-.*\.db$/.test(name)).sort().reverse();
  for (const name of backups.slice(keep)) fs.unlinkSync(path.join(directory, name));
  return target;
}

function githubRepository(remote) {
  const match = remote.match(/^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (!match) throw new Error('La comprobacion de Pages requiere un remoto de github.com.');
  return match[1];
}

async function waitForPages(repository, sha, env, request = fetch, wait = sleep, polls = 20) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 0; attempt < polls; attempt++) {
    const data = await retry(async () => {
      const response = await request(`https://api.github.com/repos/${repository}/actions/workflows/deploy-pages.yml/runs?head_sha=${sha}&branch=master&per_page=10`, { headers, signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        const error = new Error(`GitHub Actions HTTP ${response.status}; revisa acceso y GH_TOKEN si el repositorio es privado.`);
        error.transient = response.status === 429 || response.status >= 500;
        throw error;
      }
      return response.json();
    }, wait);
    const run = (data.workflow_runs || []).filter(item => item.head_sha === sha && item.head_branch === 'master').sort((a, b) => b.id - a.id)[0];
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error(`Pages termino con ${run.conclusion}. Revisa o reejecuta Deploy Reports To GitHub Pages para ${sha}.`);
      return run.html_url;
    }
    if (attempt + 1 < polls) await wait(30000);
  }
  throw new Error('Push realizado; Pages sigue pendiente. La siguiente ejecucion comprobara el mismo commit.');
}

module.exports = { saveJson, retry, backupDatabase, githubRepository, waitForPages };
