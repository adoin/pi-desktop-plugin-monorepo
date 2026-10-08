/** Workspace build contracts shared by all plugin projects (not host SDK). */
export type PluginTask = 'build' | 'test' | 'browser';
export interface PluginProject {
  tasks: Record<PluginTask, string[]>;
  /** Static runtime files copied from source, relative to the plugin root. */
  assets: string[];
  /** Complete runtime allowlist after compilation, relative to output. */
  runtime: string[];
  /** Output-only paths that must never exist in the source tree. */
  generated: string[];
}
/** Fields used by workspace tooling; the installer remains the authoritative validator. */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  main?: string;
  renderer?: string;
  permissions: string[];
  engines: { piDesktop: string };
  ui?: { panel?: string; title?: string };
  contributes?: {
    themes?: { id: string; path: string }[];
    commands?: { id: string; title: string }[];
    windowAppearance?: { backgroundColor: { light: string; dark: string }; cornerRadius: number };
  };
}
export interface WorkspacePlugin {
  name: string;
  dir: string;
  manifest: PluginManifest;
  project: PluginProject;
}
export interface ReleaseInfo {
  plugin: string;
  id: string;
  name: string;
  version: string;
  file: string;
  bytes: number;
  sha256: string;
}
