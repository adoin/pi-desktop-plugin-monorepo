/** Observed contracts used by this workspace, not a complete PI-Desktop SDK. */
export interface CommandRegistration {
  id: string;
  title: string;
  keywords: string[];
  run(): void | Promise<void>;
}

/** Main-process capabilities exercised by the theme's entry point. */
export interface MainPluginApi {
  commands: {
    register(command: CommandRegistration): void | Promise<unknown>;
    unregister(id: string): void | Promise<unknown>;
  };
  ui: {
    openPanel(options: { title: string }): unknown | Promise<unknown>;
  };
}

/** Renderer layers are opened synchronously and explicitly closed on unload. */
export interface RendererLayer {
  element: HTMLElement;
  close(): void;
}

/** Only the renderer capability observed by the dissolve extension. */
export interface RendererPluginApi {
  ui: { openLayer(): RendererLayer };
}

export type { PluginTask, PluginProject, PluginManifest, WorkspacePlugin, ReleaseInfo } from './project.js';
