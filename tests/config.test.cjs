const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('manifest and lockfile describe the same dependencies', () => {
  const manifest = JSON.parse(fs.readFileSync('package.json'));
  const lock = JSON.parse(fs.readFileSync('package-lock.json'));
  assert.deepEqual(manifest.dependencies, lock.packages[''].dependencies);
  assert.deepEqual(manifest.devDependencies, lock.packages[''].devDependencies);
});
