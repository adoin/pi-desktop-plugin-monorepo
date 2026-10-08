const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS = path.join(ROOT, '.artifacts');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function inside(base, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(x => !x || x === '.' || x === '..')) throw new Error(`Invalid relative path: ${relative}`);
  const absolute = path.resolve(base, relative);
  if (!absolute.startsWith(base + path.sep)) throw new Error(`Path escapes root: ${relative}`);
  return absolute;
}
function assertNoSymlink(file) {
  if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Symlinks are not supported: ${file}`);
}
function ensureDirectory(dir) {
  if (dir !== ARTIFACTS && !dir.startsWith(ARTIFACTS + path.sep)) throw new Error('Output must be inside .artifacts');
  const parts = path.relative(ROOT, dir).split(path.sep); let current = ROOT;
  for (const part of parts) { current = path.join(current, part); if (fs.existsSync(current)) assertNoSymlink(current); else fs.mkdirSync(current); }
}
function discover() {
  return fs.readdirSync(path.join(ROOT, 'plugins'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(e.name)) throw new Error(`Invalid plugin folder: ${e.name}`);
    const dir = path.join(ROOT, 'plugins', e.name);
    const manifest = readJson(path.join(dir, 'manifest.json'));
    const pkg = readJson(path.join(dir, 'package.json'));
    const project = readJson(path.join(dir, 'plugin.project.json'));
    if (pkg.version !== manifest.version) throw new Error(`${e.name}: package.json and manifest.json versions differ`);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(manifest.id) || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(manifest.version)) throw new Error(`${e.name}: invalid identity/version`);
    return { name: e.name, dir, manifest, project };
  }).sort((a,b) => a.name.localeCompare(b.name));
}
function runTask(plugin, task) {
  const entries = plugin.project.tasks?.[task];
  if (!Array.isArray(entries)) throw new Error(`${plugin.name}: missing task ${task}`);
  for (const entry of entries) {
    const script = inside(plugin.dir, entry); assertNoSymlink(script);
    console.log(`\n[${plugin.name}] ${task}: ${entry}`);
    const result = spawnSync(process.execPath, [script], { cwd: plugin.dir, stdio: 'inherit', env: process.env });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${plugin.name} ${task} failed (${result.status})`);
  }
}
function copyRuntime(source, target) {
  assertNoSymlink(source);
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      if (/^(?:\.git|node_modules|dist|\.env(?:\..*)?)$/.test(name)) throw new Error(`Forbidden runtime asset: ${name}`);
      copyRuntime(path.join(source, name), path.join(target, name));
    }
  } else if (stat.isFile()) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); }
  else throw new Error(`Not a regular runtime asset: ${source}`);
}
function stage(plugin) {
  const files = plugin.project.runtime;
  if (!Array.isArray(files) || !files.includes('manifest.json')) throw new Error(`${plugin.name}: runtime must include manifest.json`);
  // Validate the allowlist before replacing this plugin's generated output.
  for (const file of files) {
    const source = inside(plugin.dir, file);
    if (/^(?:\.git|node_modules|dist|scripts|styles|package\.json|plugin\.project\.json)(?:\/|$)/.test(file)) throw new Error(`Development-only runtime entry: ${file}`);
    assertNoSymlink(source);
  }
  ensureDirectory(path.join(ARTIFACTS, 'plugins'));
  const target = path.join(ARTIFACTS, 'plugins', plugin.name);
  if (fs.existsSync(target)) { assertNoSymlink(target); fs.rmSync(target, { recursive: true, force: true }); }
  fs.mkdirSync(target);
  for (const file of files) copyRuntime(inside(plugin.dir, file), inside(target, file));
  console.log(`Staged ${plugin.name}: ${path.relative(ROOT, target)}`);
  console.log('Next: run PluginCheck and PluginPack on this staged directory.');
  return target;
}
function collect(plugin) {
  const staged = path.join(ARTIFACTS, 'plugins', plugin.name);
  const manifest = readJson(path.join(staged, 'manifest.json'));
  if (manifest.id !== plugin.manifest.id || manifest.version !== plugin.manifest.version) throw new Error('Staged manifest is stale; build/stage/check/pack again');
  const filename = `${manifest.id}-${manifest.version}.piplug`;
  const source = path.join(staged, 'dist', filename); assertNoSymlink(source);
  const data = fs.readFileSync(source); const output = path.join(ARTIFACTS, 'releases'); ensureDirectory(output);
  const destination = path.join(output, filename); if (fs.existsSync(destination)) assertNoSymlink(destination);
  fs.copyFileSync(source, destination);
  const info = { plugin: plugin.name, id: manifest.id, name: manifest.name, version: manifest.version, file: filename, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
  fs.writeFileSync(path.join(output, `${manifest.id}-${manifest.version}.json`), JSON.stringify(info, null, 2) + '\n');
  console.log(`Ready for website upload: ${path.relative(ROOT, destination)}`);
  return info;
}
function main(args) {
  const [command = 'list', name, ...extra] = args;
  if (extra.length || !['list','build','test','browser','stage','collect'].includes(command)) throw new Error('Usage: node scripts/workspace.cjs list|build|test|browser|stage|collect [plugin-folder]');
  const all = discover(); const plugins = name ? all.filter(p => p.name === name) : all;
  if (!plugins.length) throw new Error(`No plugin found: ${name || '(all)'}`);
  for (const plugin of plugins) {
    if (command === 'list') console.log(`${plugin.name}\t${plugin.manifest.version}\t${plugin.manifest.id}`);
    else if (command === 'stage') { runTask(plugin, 'build'); runTask(plugin, 'test'); stage(plugin); }
    else if (command === 'collect') collect(plugin);
    else runTask(plugin, command);
  }
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { ROOT, ARTIFACTS, inside, discover, runTask, stage, collect };
