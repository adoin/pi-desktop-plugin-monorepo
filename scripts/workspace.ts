import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import type { PluginManifest, PluginProject, PluginTask, WorkspacePlugin, ReleaseInfo } from '../packages/plugin-types/src/project.ts';

export const ROOT = path.resolve(__dirname, '..');
export const ARTIFACTS = path.join(ROOT, '.artifacts');
export const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
export function inside(base: string, relative: string): string {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(x => !x || x === '.' || x === '..')) throw new Error(`Invalid relative path: ${relative}`);
  const absolute = path.resolve(base, relative);
  if (!absolute.startsWith(base + path.sep)) throw new Error(`Path escapes root: ${relative}`);
  return absolute;
}
function assertNoSymlink(file: string): void {
  if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Symlinks are not supported: ${file}`);
}
function ensureDirectory(dir: string): void {
  if (dir !== ARTIFACTS && !dir.startsWith(ARTIFACTS + path.sep)) throw new Error('Output must be inside .artifacts');
  let current = ROOT;
  for (const part of path.relative(ROOT, dir).split(path.sep)) {
    current = path.join(current, part);
    if (fs.existsSync(current)) assertNoSymlink(current); else fs.mkdirSync(current);
  }
}
const forbidden = /^(?:\.git|node_modules|dist|scripts|styles|package\.json|plugin\.project\.json|tsconfig[^/]*)(?:\/|$)|\.(?:ts|tsx|map)$/;
function validateProject(project: PluginProject): void {
  for (const key of ['assets', 'runtime', 'generated'] as const) {
    if (!Array.isArray(project[key])) throw new Error(`project.${key} must be an array`);
    for (const entry of project[key]) {
      inside(ROOT, entry);
      if (forbidden.test(entry)) throw new Error(`Development-only runtime entry: ${entry}`);
    }
  }
  if (!project.assets.includes('manifest.json') || !project.runtime.includes('manifest.json')) throw new Error('assets/runtime must include manifest.json');
  for (const task of ['build', 'test', 'browser'] as const) {
    if (!Array.isArray(project.tasks?.[task])) throw new Error(`Missing task: ${task}`);
    for (const entry of project.tasks[task]) inside(ROOT, entry);
  }
  for (const entry of [...project.assets, ...project.generated]) {
    if (!project.runtime.some(file => entry === file || entry.startsWith(file + '/'))) throw new Error(`Not in runtime allowlist: ${entry}`);
  }
}
export function discover(): WorkspacePlugin[] {
  return fs.readdirSync(path.join(ROOT, 'plugins'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(e.name)) throw new Error(`Invalid plugin folder: ${e.name}`);
    const dir = path.join(ROOT, 'plugins', e.name);
    const manifest = readJson<PluginManifest>(path.join(dir, 'manifest.json'));
    const pkg = readJson<{ version: string }>(path.join(dir, 'package.json'));
    const project = readJson<PluginProject>(path.join(dir, 'plugin.project.json'));
    validateProject(project);
    if (pkg.version !== manifest.version) throw new Error(`${e.name}: package.json and manifest.json versions differ`);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(manifest.id) || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(manifest.version)) throw new Error(`${e.name}: invalid identity/version`);
    return { name: e.name, dir, manifest, project };
  }).sort((a,b) => a.name.localeCompare(b.name));
}
/** One compiled runtime per plugin, shared by development, tests and packaging. */
export function buildDirectory(pluginDir: string): string {
  const name = path.basename(pluginDir);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name) || path.resolve(pluginDir) !== path.join(ROOT, 'plugins', name)) throw new Error('Expected a workspace plugin directory');
  return path.join(ARTIFACTS, 'plugins', name);
}
function copyRuntime(source: string, target: string): void {
  assertNoSymlink(source);
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      if (/^(?:\.git|node_modules|dist|\.env(?:\..*)?)$/.test(name) || /\.(?:ts|tsx|map)$/.test(name)) throw new Error(`Forbidden runtime asset: ${name}`);
      copyRuntime(path.join(source, name), path.join(target, name));
    }
  } else if (stat.isFile()) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); }
  else throw new Error(`Not a regular runtime asset: ${source}`);
}
export function prepareBuild(plugin: WorkspacePlugin): string {
  validateProject(plugin.project);
  const target = buildDirectory(plugin.dir);
  for (const entry of plugin.project.assets) assertNoSymlink(inside(plugin.dir, entry));
  // Do not silently discard an uncollected package on rebuild.
  if (fs.existsSync(path.join(target, 'dist'))) {
    if (fs.readdirSync(path.join(target, 'dist')).length) throw new Error('Collect the existing package before rebuilding: pnpm release:collect ' + plugin.name);
  }
  ensureDirectory(target);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target);
  for (const entry of plugin.project.assets) copyRuntime(inside(plugin.dir, entry), inside(target, entry));
  return target;
}
export function runTask(plugin: WorkspacePlugin, task: PluginTask): void {
  const entries = plugin.project.tasks[task];
  const output = task === 'build' ? prepareBuild(plugin) : buildDirectory(plugin.dir);
  for (const entry of entries) {
    const script = inside(plugin.dir, entry); assertNoSymlink(script);
    console.log(`\n[${plugin.name}] ${task}: ${entry}`);
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(require.resolve('tsx')).href, script], { cwd: plugin.dir, stdio: 'inherit', env: { ...process.env, PI_PLUGIN_OUTPUT_DIR: output } });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${plugin.name} ${task} failed (${result.status})`);
  }
  if (task === 'build') stage(plugin);
}
/** Backward-compatible stage command: validate the single runtime, never copy it. */
export function stage(plugin: WorkspacePlugin): string {
  const target = buildDirectory(plugin.dir);
  for (const entry of [...plugin.project.runtime, ...plugin.project.generated]) assertNoSymlink(inside(target, entry));
  console.log(`Runtime ready: ${path.relative(ROOT, target)}`);
  return target;
}
export function collect(plugin: WorkspacePlugin): ReleaseInfo {
  const staged = buildDirectory(plugin.dir);
  const manifest = readJson<PluginManifest>(path.join(staged, 'manifest.json'));
  if (manifest.id !== plugin.manifest.id || manifest.version !== plugin.manifest.version) throw new Error('Runtime manifest is stale; build/check/pack again');
  const filename = `${manifest.id}-${manifest.version}.piplug`;
  const source = path.join(staged, 'dist', filename); assertNoSymlink(source);
  const data = fs.readFileSync(source);
  const output = path.join(ARTIFACTS, 'releases'); ensureDirectory(output);
  const destination = path.join(output, filename);
  if (fs.existsSync(destination)) {
    assertNoSymlink(destination);
    if (!fs.readFileSync(destination).equals(data)) throw new Error(`Release already exists with different content: ${filename}. Bump the plugin version before collecting; both packages were preserved.`);
  } else fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  if (!fs.readFileSync(destination).equals(data)) throw new Error('Collected package verification failed');
  const info: ReleaseInfo = { plugin: plugin.name, id: manifest.id, name: manifest.name, version: manifest.version, file: filename, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') };
  const metadata = path.join(output, `${manifest.id}-${manifest.version}.json`);
  if (fs.existsSync(metadata)) assertNoSymlink(metadata);
  fs.writeFileSync(metadata, JSON.stringify(info, null, 2) + '\n');
  fs.unlinkSync(source);
  if (!fs.readdirSync(path.dirname(source)).length) fs.rmdirSync(path.dirname(source));
  console.log(`Ready for website upload: ${path.relative(ROOT, destination)}`);
  return info;
}
function main(args: string[]): void {
  const [command = 'list', name, ...extra] = args;
  if (extra.length || !['list','build','test','browser','stage','collect'].includes(command)) throw new Error('Usage: tsx scripts/workspace.ts list|build|test|browser|stage|collect [plugin-folder]');
  const plugins = discover().filter(p => !name || p.name === name);
  if (!plugins.length) throw new Error(`No plugin found: ${name || '(all)'}`);
  for (const plugin of plugins) {
    if (command === 'list') console.log(`${plugin.name}\t${plugin.manifest.version}\t${plugin.manifest.id}`);
    else if (command === 'stage') { runTask(plugin, 'build'); runTask(plugin, 'test'); }
    else if (command === 'collect') collect(plugin);
    else runTask(plugin, command as PluginTask);
  }
}
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
