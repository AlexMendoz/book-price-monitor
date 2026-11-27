const { test } = require('node:test');
const assert = require('node:assert/strict');
const { publishable, changedFiles } = require('../scripts/automation/run.cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { main } = require('../scripts/automation/run.cjs');

test('timer randomizes each daily run within a two-hour morning window', () => {
  const installer = fs.readFileSync(path.join(__dirname, '../scripts/automation/install.cjs'), 'utf8');
  for (const setting of ['OnCalendar=*-*-* 09:00:00 America/Mexico_City', 'RandomizedDelaySec=2h', 'FixedRandomDelay=false', 'AccuracySec=1us', 'Persistent=true']) {
    assert.ok(installer.split('\n').includes(setting), setting);
  }
});

test('automation only permits public report files, never products, secrets or source', () => {
  for (const file of ['index.html', 'reports/history.json', 'reports/ranking_ofertas.html']) assert.equal(publishable(file), true);
  for (const file of ['.env', 'data/prices.db', 'private-products/report.html', 'src/index.ts', 'reports/private/data.json', 'reports/../.env']) assert.equal(publishable(file), false);
});
test('automation includes staged, unstaged and new files without splitting spaces', () => {
  const git = (...args) => args[0] === 'diff' ? 'reports/Un libro.html\0reports/history.json\0' : 'reports/Un libro.html\0.env\0';
  assert.deepEqual(changedFiles(git), ['reports/Un libro.html', 'reports/history.json', '.env']);
});

test('isolated automation publishes only after success and retains failed output for recovery', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'book-automation-'));
  const source = path.join(directory, 'source'), remote = path.join(directory, 'remote.git');
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const saved = { ...process.env }, exitCode = process.exitCode;
  try {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.DATABASE_URL;
    fs.mkdirSync(source);
    git(directory, 'init', '--bare', remote);
    git(source, 'init', '-b', 'master');
    git(source, 'config', 'user.name', 'Test');
    git(source, 'config', 'user.email', 'test@localhost');
    fs.mkdirSync(path.join(source, 'reports'));
    fs.writeFileSync(path.join(source, 'reports/history.json'), '["old"]');
    git(source, 'add', '.'); git(source, 'commit', '-m', 'initial');
    git(source, 'remote', 'add', 'origin', remote); git(source, 'push', '-u', 'origin', 'master');
    fs.writeFileSync(path.join(source, 'reports/history.json'), 'uncommitted user report');
    const execute = (program, args, cwd) => program === 'git' ? git(cwd, ...args) : '';
    const options = { repository: 'test/repo', verifyPages: async () => 'https://github.com/test/repo/actions/runs/1', wait: async () => {} };
    await main(source, execute, (_program, args, options) => {
      assert.equal(args[1], 'run-job-headless');
      assert.equal(options.env.DATABASE_URL, path.join(source, 'data/prices.db'));
      fs.writeFileSync(path.join(options.cwd, 'reports/history.json'), '["old","new"]');
      return { status: 0 };
    }, options);
    assert.equal(git(directory, '--git-dir', remote, 'show', 'master:reports/history.json'), '["old","new"]');
    assert.equal(fs.readFileSync(path.join(source, 'reports/history.json'), 'utf8'), 'uncommitted user report');
    const beforePending = git(directory, '--git-dir', remote, 'rev-parse', 'master');
    let pushAttempts = 0, collections = 0;
    const failedPush = (program, args, cwd) => {
      if (program === 'git' && args[0] === 'push') {
        pushAttempts++;
        const error = new Error('Network unavailable'); error.transient = true; throw error;
      }
      return execute(program, args, cwd);
    };
    await main(source, failedPush, (_program, _args, config) => {
      collections++;
      fs.writeFileSync(path.join(config.cwd, 'reports/history.json'), '["old","new","newer"]');
      return { status: 0 };
    }, options);
    const state = () => JSON.parse(fs.readFileSync(path.join(source, '.automation/state.json'), 'utf8'));
    assert.equal(pushAttempts, 3);
    assert.equal(state().stage, 'push');
    const pendingCommit = state().commit;
    assert.equal(git(directory, '--git-dir', remote, 'rev-parse', 'master'), beforePending);
    const noCollection = () => { collections++; throw new Error('Must not scrape again'); };
    const resume = (program, args, cwd) => { assert.equal(program, 'git'); return execute(program, args, cwd); };
    await main(source, resume, noCollection, { ...options, verifyPages: async (_repo, sha) => {
      assert.equal(sha, pendingCommit); throw new Error('Pages pending');
    } });
    assert.equal(state().stage, 'deploy');
    assert.equal(git(directory, '--git-dir', remote, 'rev-parse', 'master'), pendingCommit);
    await main(source, resume, noCollection, options);
    assert.equal(state().stage, 'done');
    assert.equal(state().status, 'success');
    assert.equal(collections, 1);
    const published = git(directory, '--git-dir', remote, 'rev-parse', 'master');
    await main(source, execute, (_program, _args, options) => {
      fs.writeFileSync(path.join(options.cwd, 'reports/history.json'), 'partial output');
      return { status: 1 };
    }, options);
    assert.equal(process.exitCode, 1);
    assert.equal(git(directory, '--git-dir', remote, 'rev-parse', 'master'), published);
    let executed = false;
    await main(source, execute, () => { executed = true; return { status: 0 }; }, options);
    assert.equal(executed, false);
    assert.equal(fs.existsSync(path.join(source, '.automation/run.lock')), false);
  } finally {
    process.env = saved;
    process.exitCode = exitCode;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
