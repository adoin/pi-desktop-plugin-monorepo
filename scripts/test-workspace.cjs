const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, ARTIFACTS, inside, discover } = require('./workspace.cjs');
const { findBrowser } = require('../packages/test-utils/browser.cjs');
const plugins = discover();
assert.ok(plugins.length > 0);
assert.equal(new Set(plugins.map(p => p.manifest.id)).size, plugins.length, 'plugin IDs must be unique');
for (const value of ['../escape', 'a/../../escape', '.', '', '/absolute', 'bad\\path']) assert.throws(() => inside(ROOT, value));
assert.equal(findBrowser({ PI_TEST_BROWSER: process.execPath }), process.execPath);
assert.throws(() => findBrowser({ PI_TEST_BROWSER: path.join(ROOT, 'nonexistent-browser') }));
function files(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (prefix === '' && entry.name === 'dist') return [];
    const name = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), `runtime symlink: ${name}`);
    return entry.isDirectory() ? files(path.join(dir, entry.name), name + '/') : [name];
  });
}
for (const plugin of plugins) {
  const staged = path.join(ARTIFACTS, 'plugins', plugin.name);
  assert.ok(fs.existsSync(path.join(staged, 'manifest.json')), `Run pnpm run stage ${plugin.name} first`);
  const manifest = JSON.parse(fs.readFileSync(path.join(staged, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest, plugin.manifest);
  for (const forbidden of ['node_modules','scripts','styles','package.json','plugin.project.json','.git']) assert.ok(!fs.existsSync(path.join(staged, forbidden)), `development file leaked: ${forbidden}`);
  const required = [manifest.main, manifest.renderer, manifest.ui?.panel, ...(manifest.contributes?.themes || []).map(t => t.path)].filter(Boolean);
  for (const entry of required) assert.ok(fs.existsSync(inside(staged, entry)), `missing runtime entry ${entry}`);
  const runtime = files(staged);
  for (const relative of runtime) {
    assert.ok(plugin.project.runtime.some(entry => relative === entry || relative.startsWith(entry + '/')), `not allowlisted: ${relative}`);
    const output = fs.readFileSync(inside(staged, relative));
    assert.ok(output.equals(fs.readFileSync(inside(plugin.dir, relative))), `stale runtime file: ${relative}`);
    if (relative.endsWith('.mjs')) {
      for (const match of output.toString().matchAll(/\bimport\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
        assert.ok(match[1].startsWith('./'), `bundle shared runtime dependencies first: ${relative} imports ${match[1]}`);
        const dependency = path.resolve(path.dirname(inside(staged, relative)), match[1]);
        assert.ok(dependency.startsWith(staged + path.sep) && fs.existsSync(dependency), `missing module: ${match[1]}`);
      }
    }
  }
  console.log(`PASS ${plugin.name}: ${runtime.length} self-contained runtime files; build sources and dev dependencies excluded.`);
}
const theme = plugins.find(p => p.name === 'sax-design-theme');
if (theme) {
  assert.equal(theme.manifest.name, 'sax-design-theme');
  assert.equal(theme.manifest.ui.title, 'sax-design-theme');
  assert.equal(theme.manifest.id, 'local.pi-desktop-sax-theme', 'keep installed-plugin upgrade identity');
  assert.equal(theme.manifest.contributes.commands[0].title, 'sax-design-theme: Open Panel');
}
console.log('PASS workspace paths, identity, version agreement and browser configuration.');
