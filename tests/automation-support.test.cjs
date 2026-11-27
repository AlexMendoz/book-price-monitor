const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Database = require('better-sqlite3');
const { retry, backupDatabase, githubRepository, waitForPages } = require('../scripts/automation/support.cjs');
const { enqueue, flush } = require('../src/services/notificationOutbox.cjs');

test('network retries stop after three attempts; validation and permissions are not retried', async () => {
  let calls = 0; const waits = [];
  await assert.rejects(retry(async () => { calls++; const error = new Error('offline'); error.code = 'ENOTFOUND'; throw error; }, async ms => waits.push(ms)), /offline/);
  assert.equal(calls, 3); assert.deepEqual(waits, [10000, 30000]);
  for (const message of ['CAPTCHA', 'Extraction incomplete', 'non-fast-forward', 'Permission denied']) {
    calls = 0;
    await assert.rejects(retry(async () => { calls++; throw new Error(message); }, async () => {}));
    assert.equal(calls, 1);
  }
});

test('consistent SQLite backups retain WAL history and rotate only after success', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'book-backup-'));
  const file = path.join(folder, 'prices.db'), backups = path.join(folder, 'backups');
  const db = new Database(file);
  try {
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE prices(value INTEGER); INSERT INTO prices VALUES (10)');
    await backupDatabase(file, backups, 2);
    db.exec('INSERT INTO prices VALUES (20)');
    const backup = await backupDatabase(file, backups, 2);
    const copy = new Database(backup, { readonly: true });
    try { assert.deepEqual(copy.prepare('SELECT value FROM prices').all(), [{ value: 10 }, { value: 20 }]); }
    finally { copy.close(); }
    await backupDatabase(file, backups, 2);
    assert.equal(fs.readdirSync(backups).filter(name => name.endsWith('.db')).length, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM prices').get().n, 2);
    assert.equal(await backupDatabase(path.join(folder, 'missing.db'), backups), null);
  } finally { db.close(); fs.rmSync(folder, { recursive: true, force: true }); }
});

test('Telegram failures keep the notice on disk and recovery removes it after acknowledgement', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'book-notices-'));
  const env = { NOTIFICATION_OUTBOX: folder, TELEGRAM_BOT_TOKEN: 'fake', TELEGRAM_CHAT_ID: 'fake' };
  try {
    enqueue(env, 'Pages pending');
    await flush(env, async () => { throw new Error('offline'); });
    assert.equal(fs.readdirSync(folder).filter(name => name.endsWith('.json')).length, 1);
    await flush(env, async () => ({ ok: true, json: async () => ({ ok: false }) }));
    assert.equal(fs.readdirSync(folder).filter(name => name.endsWith('.json')).length, 1);
    await flush(env, async (_url, options) => {
      assert.equal(JSON.parse(options.body).text, 'Pages pending');
      return { ok: true, json: async () => ({ ok: true }) };
    });
    assert.equal(fs.readdirSync(folder).length, 0);
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('Pages checks the specific workflow and SHA, waits, and rejects failed deployments', async () => {
  assert.equal(githubRepository('git@github.com:owner/repo.git'), 'owner/repo');
  assert.equal(githubRepository('https://github.com/owner/repo.git'), 'owner/repo');
  assert.throws(() => githubRepository('https://other.example/owner/repo'));
  let polls = 0;
  const run = { id: 2, head_sha: 'abc', head_branch: 'master', status: 'completed', conclusion: 'success', html_url: 'https://github.com/owner/repo/actions/runs/2' };
  const response = workflow_runs => ({ ok: true, json: async () => ({ workflow_runs }) });
  const url = await waitForPages('owner/repo', 'abc', {}, async url => {
    assert.match(url, /workflows\/deploy-pages.yml\/runs\?head_sha=abc/);
    polls++;
    return response(polls === 1 ? [{ ...run, head_sha: 'wrong' }] : [run]);
  }, async () => {}, 2);
  assert.equal(url, run.html_url); assert.equal(polls, 2);
  await assert.rejects(waitForPages('owner/repo', 'abc', {}, async () => response([{ ...run, conclusion: 'failure' }]), async () => {}, 1), /failure/);
  await assert.rejects(waitForPages('owner/repo', 'abc', {}, async () => response([]), async () => {}, 1), /pendiente/);
  await assert.rejects(waitForPages('owner/repo', 'abc', {}, async () => ({ ok: false, status: 401 }), async () => {}, 1), /401/);
});
