const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { saveJson, retry, backupDatabase, githubRepository, waitForPages } = require('./support.cjs');
const outbox = require('../../src/services/notificationOutbox.cjs');

const root = path.resolve(__dirname, '../..');
const publishable = file => file === 'index.html' || file === 'reports/history.json' || /^reports\/[^/]+\.html$/.test(file);

function command(program, args, cwd, env = process.env) {
  const result = spawnSync(program, args, { cwd, env, encoding: 'utf8', timeout: 10 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    const details = result.stderr || '';
    if (details) console.error(details.slice(-8000));
    const error = new Error(`Fallo: ${program} ${args.slice(0, 2).join(' ')}. Consulta el journal.`);
    error.transient = /Could not resolve|Could not connect|Connection (?:timed out|reset|refused)|Network is unreachable|Temporary failure|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|returned error: 50[234]/i.test(details);
    throw error;
  }
  return result.stdout.trim();
}

function changedFiles(git) {
  return [...new Set([
    ...git('diff', '--name-only', '-z', 'HEAD').split('\0'),
    ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
  ].filter(Boolean))];
}

function readState(file) {
  if (!fs.existsSync(file)) return null;
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (state.version !== 1 || !['prepare', 'collect', 'commit', 'push', 'deploy', 'done'].includes(state.stage) || typeof state.runId !== 'string') {
    throw new Error('Estado automatico invalido; revisa state.json sin borrarlo.');
  }
  return state;
}

async function main(projectRoot = root, execute = command, runJob = spawnSync, options = {}) {
  const folder = path.join(projectRoot, '.automation');
  const stateFile = path.join(folder, 'state.json');
  if (process.argv.includes('--status')) {
    console.log(JSON.stringify(readState(stateFile) || { status: 'Sin ejecuciones registradas' }, null, 2));
    return;
  }
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Usa Node.js 20 o superior.');
  require('dotenv').config({ path: path.join(projectRoot, '.env.local') });
  require('dotenv').config({ path: path.join(projectRoot, '.env') });
  const env = { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: 'ssh -oBatchMode=yes -oConnectTimeout=20' };
  env.DATABASE_URL = path.resolve(projectRoot, env.DATABASE_URL || 'data/prices.db');
  env.PLAYWRIGHT_USER_DATA_DIR = path.resolve(projectRoot, env.PLAYWRIGHT_USER_DATA_DIR || 'playwright-user-data-job');
  env.NOTIFICATION_OUTBOX = path.join(folder, 'outbox');
  delete env.REPORTS_DIR;
  fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
  const checkout = path.join(folder, 'checkout');
  const manual = options.manual ?? process.argv.includes('--manual');
  const network = operation => retry(operation, options.wait);
  let lock, state;
  const save = updates => {
    state = { ...state, ...updates, updatedAt: new Date().toISOString() };
    saveJson(stateFile, state);
  };
  const notice = text => {
    console.log(text);
    try { outbox.enqueue(env, text); } catch { console.error('No se pudo guardar el aviso; revisa espacio en disco.'); }
  };
  const drain = async () => { try { await outbox.flush(env); } catch { console.warn('No se pudo procesar la cola de avisos.'); } };
  try {
    lock = fs.openSync(path.join(folder, 'run.lock'), 'wx', 0o600);
    fs.writeFileSync(lock, String(process.pid));
    state = readState(stateFile);
    await drain();
    const remote = execute('git', ['remote', 'get-url', 'origin'], projectRoot, env);
    if (state && state.stage !== 'done' && state.remote !== remote) throw new Error('El remoto cambio con una operacion pendiente. Revisa state.json.');
    if (!state || state.stage === 'done') save({ version: 1, runId: randomUUID(), remote, stage: 'prepare', status: 'running', error: null, commit: null, base: null, backup: null, deploymentUrl: null });
    else save({ status: 'running', error: null });
    if (!fs.existsSync(checkout)) {
      if (state.stage !== 'prepare') throw new Error('Falta la copia con una publicacion pendiente; no se recreara automaticamente.');
      await network(() => execute('git', ['clone', '--branch', 'master', '--single-branch', remote, checkout], projectRoot, env));
    }
    const git = (...args) => execute('git', args, checkout, env);
    if (git('remote', 'get-url', 'origin') !== remote || git('branch', '--show-current') !== 'master') throw new Error('La copia automatica cambio de remoto o rama.');
    const assertClean = () => { if (changedFiles(git).length) throw new Error('Hay cambios inesperados en la copia automatica; revisalos antes de continuar.'); };
    if (state.stage === 'prepare') {
      const dirty = changedFiles(git);
      if (dirty.length && (!manual || dirty.some(file => !publishable(file)))) throw new Error('Hay cambios pendientes; revisa .automation/checkout y usa automation:manual para recuperar reportes.');
      if (!dirty.length) {
        await network(() => git('fetch', 'origin', 'master'));
        git('merge', '--ff-only', 'origin/master');
        if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/master')) throw new Error('Hay commits locales sin estado de publicacion; requieren revision manual.');
      }
      await network(() => execute('npm', ['ci', '--no-audit', '--no-fund'], checkout, env));
      await network(() => execute('npx', ['--no-install', 'playwright', 'install', 'chromium'], checkout, env));
      const backup = await (options.backup || backupDatabase)(env.DATABASE_URL, path.join(folder, 'backups'));
      save({ stage: 'collect', base: git('rev-parse', 'HEAD'), backup });
    } else if (state.stage === 'collect') {
      if (!manual) throw new Error('Recoleccion anterior fallida o interrumpida. Revisa el error y usa npm run automation:manual.');
      if (changedFiles(git).some(file => !publishable(file)) || git('rev-parse', 'HEAD') !== state.base) throw new Error('La copia cambio durante la recoleccion pendiente.');
      const backup = await (options.backup || backupDatabase)(env.DATABASE_URL, path.join(folder, 'backups'));
      save({ backup });
    }
    if (state.stage === 'collect') {
      const job = runJob('npm', ['run', manual ? 'run-job-manual' : 'run-job-headless'], { cwd: checkout, env, stdio: 'inherit', timeout: manual ? undefined : 30 * 60 * 1000 });
      if (job.status !== 0) throw new Error('El job fallo; no se publicaran datos parciales. Usa automation:manual tras revisar el problema.');
      save({ stage: 'commit' });
      notice('Datos recolectados y reportes generados. Publicacion pendiente.');
    }
    if (state.stage === 'commit') {
      const files = changedFiles(git);
      if (files.some(file => !publishable(file))) throw new Error('Cambios fuera de los reportes permitidos; publicacion cancelada.');
      const message = `chore: actualizar reportes de precios (${state.runId})`;
      if (git('rev-parse', 'HEAD') !== state.base) {
        // Recover a crash between git commit and saving its SHA, but reject unrelated commits.
        assertClean();
        if (git('rev-parse', 'HEAD^') !== state.base || git('log', '-1', '--format=%s') !== message || git('diff', '--name-only', '-z', state.base, 'HEAD').split('\0').filter(Boolean).some(file => !publishable(file))) throw new Error('Commit inesperado; revision manual necesaria.');
      } else if (files.length) {
        git('config', 'user.name', 'Book Price Monitor');
        git('config', 'user.email', 'book-price-monitor@localhost');
        git('add', '--', ...files);
        git('commit', '-m', message);
      } else {
        save({ stage: 'done', status: 'unchanged' });
        notice('Sin cambios en los reportes; no se genero un nuevo despliegue.');
        return;
      }
      save({ stage: 'push', commit: git('rev-parse', 'HEAD') });
    }
    if (['push', 'deploy'].includes(state.stage)) {
      assertClean();
      if (!/^[a-f0-9]{40}$/.test(state.commit || '') || git('rev-parse', 'HEAD') !== state.commit) throw new Error('El commit pendiente no coincide con la copia local.');
    }
    if (state.stage === 'push') {
      await network(() => git('push', 'origin', `${state.commit}:refs/heads/master`));
      save({ stage: 'deploy' });
      notice(`Push realizado: ${state.commit.slice(0, 8)}. Pages aun pendiente.`);
    }
    if (state.stage === 'deploy') {
      const deploymentUrl = await (options.verifyPages || waitForPages)(options.repository || githubRepository(remote), state.commit, env);
      save({ stage: 'done', status: 'success', deploymentUrl });
      notice(`Pagina actualizada: Pages confirmo el commit ${state.commit.slice(0, 8)}. ${deploymentUrl}`);
    }
  } catch (error) {
    console.error(error.message);
    if (lock !== undefined) {
      if (state) save({ status: 'failed', error: error.message });
      notice(`Monitor pendiente en ${state?.stage || 'inicio'}: ${error.message}`);
    }
    process.exitCode = 1;
  } finally {
    if (lock !== undefined) {
      try { await drain(); }
      finally { fs.closeSync(lock); fs.unlinkSync(path.join(folder, 'run.lock')); }
    }
  }
}

module.exports = { publishable, changedFiles, readState, main };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
