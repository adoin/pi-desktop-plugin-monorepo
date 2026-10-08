import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ARTIFACTS, inside, discover, buildDirectory, readJson } from './workspace.ts';
import { findBrowser } from '../packages/test-utils/browser.ts';
import type { PluginManifest } from '../packages/plugin-types/src/project.ts';
const plugins = discover();
assert.ok(plugins.length > 0);
assert.equal(new Set(plugins.map(p => p.manifest.id)).size, plugins.length, 'plugin IDs must be unique');
for (const value of ['../escape', 'a/../../escape', '.', '', '/absolute', 'bad\\path']) assert.throws(() => inside(ROOT, value));
assert.throws(() => buildDirectory(ROOT));
assert.throws(() => buildDirectory(path.join(ROOT, 'elsewhere', 'example')));
assert.equal(buildDirectory(path.join(ROOT, 'plugins', 'future-plugin')), path.join(ARTIFACTS, 'plugins', 'future-plugin'));
assert.ok(!fs.existsSync(path.join(ARTIFACTS, 'build')), 'obsolete duplicate build tree must be removed');
assert.equal(findBrowser({ PI_TEST_BROWSER: process.execPath }), process.execPath);
assert.throws(() => findBrowser({ PI_TEST_BROWSER: path.join(ROOT, 'nonexistent-browser') }));
function files(dir: string, prefix = ''): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (prefix === '' && entry.name === 'dist') return [];
    const name = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), `runtime symlink: ${name}`);
    return entry.isDirectory() ? files(path.join(dir, entry.name), name + '/') : [name];
  });
}
for (const plugin of plugins) {
  const runtimeDir = buildDirectory(plugin.dir);
  assert.ok(!fs.existsSync(path.join(plugin.dir, 'dist')), 'plugin-local dist is forbidden');
  for (const entry of plugin.project.generated) {
    assert.ok(!fs.existsSync(inside(plugin.dir, entry)), `generated output leaked into sources: ${entry}`);
    assert.ok(fs.existsSync(inside(runtimeDir, entry)), `missing generated output: ${entry}`);
  }
  assert.ok(fs.existsSync(path.join(runtimeDir, 'manifest.json')), `Run pnpm build ${plugin.name} first`);
  const manifest = readJson<PluginManifest>(path.join(runtimeDir, 'manifest.json'));
  assert.deepEqual(manifest, plugin.manifest);
  for (const forbidden of ['node_modules','scripts','styles','package.json','plugin.project.json','.git']) assert.ok(!fs.existsSync(path.join(runtimeDir, forbidden)), `development file leaked: ${forbidden}`);
  const required = [manifest.main, manifest.renderer, manifest.ui?.panel, ...(manifest.contributes?.themes || []).map(t => t.path)].filter((entry): entry is string => Boolean(entry));
  for (const entry of required) assert.ok(fs.existsSync(inside(runtimeDir, entry)), `missing runtime entry ${entry}`);
  const runtime = files(runtimeDir);
  for (const relative of runtime) {
    assert.ok(!/\.(?:ts|tsx|map)$/.test(relative), `TypeScript source leaked: ${relative}`);
    assert.ok(plugin.project.runtime.some(entry => relative === entry || relative.startsWith(entry + '/')), `not allowlisted: ${relative}`);
    const output = fs.readFileSync(inside(runtimeDir, relative));
    const generated = plugin.project.generated.some(entry => relative === entry || relative.startsWith(entry + '/'));
    if (!generated) {
      assert.ok(plugin.project.assets.some(entry => relative === entry || relative.startsWith(entry + '/')), `undeclared static asset: ${relative}`);
      assert.ok(output.equals(fs.readFileSync(inside(plugin.dir, relative))), `stale source copy: ${relative}`);
    }
    if (relative.endsWith('.mjs')) {
      for (const match of output.toString().matchAll(/\bimport\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
        assert.ok(match[1].startsWith('./'), `bundle shared runtime dependencies first: ${relative} imports ${match[1]}`);
        const dependency = path.resolve(path.dirname(inside(runtimeDir, relative)), match[1]);
        assert.ok(dependency.startsWith(runtimeDir + path.sep) && fs.existsSync(dependency), `missing module: ${match[1]}`);
      }
    }
    if (relative.endsWith('.html')) {
      for (const match of output.toString().matchAll(/(?:src|href)="([^"#]+)"/g)) {
        if (/^(?:https?:|data:)/.test(match[1])) continue;
        const asset = path.resolve(path.dirname(inside(runtimeDir, relative)), match[1]);
        assert.ok(asset.startsWith(runtimeDir + path.sep) && fs.existsSync(asset), `missing HTML asset: ${relative} -> ${match[1]}`);
      }
    }
  }
  console.log(`PASS ${plugin.name}: ${runtime.length} self-contained runtime files; no TS sources/dev dependencies or duplicate build tree.`);
}
const theme = plugins.find(p => p.name === 'sax-design-theme');
if (theme) {
  assert.equal(theme.manifest.name, 'sax-design-theme');
  assert.equal(theme.manifest.ui?.title, 'sax-design-theme');
  assert.equal(theme.manifest.id, 'local.pi-desktop-sax-theme', 'keep installed-plugin upgrade identity');
  assert.equal(theme.manifest.contributes?.commands?.[0].title, 'sax-design-theme: Open Panel');
}
console.log('PASS workspace paths, identity, version agreement and browser configuration.');
