import type { RendererPluginApi } from '@pi-plugins/plugin-types';
import type { attachHostDissolve } from './renderer/host-dissolve.js';
import type { captureSurface, createDissolveEngine } from './renderer/dissolve.js';

/** Fixed preview HTML fixtures provide these elements before scripts execute. */
interface PreviewElements {
  theme: HTMLLinkElement;
  query: HTMLInputElement;
  outcome: HTMLSelectElement;
  'show-archived': HTMLInputElement;
  'demo-dialog': HTMLDialogElement;
  'particle-dialog': HTMLDialogElement;
  'dialog-close': HTMLButtonElement;
}
export interface PreviewDocument extends Document {
  getElementById<K extends keyof PreviewElements>(id: K): PreviewElements[K];
  getElementById(id: string): HTMLElement;
}

declare global {
  interface Window {
    /** Supplied by the standalone dissolve preview bundle before motion runs. */
    SaxDissolve: { attachHostDissolve: typeof attachHostDissolve };
    saxDissolveTest: {
      captureSurface: typeof captureSurface;
      createDissolveEngine: typeof createDissolveEngine;
      readonly controller: ReturnType<typeof attachHostDissolve> | null;
      mockPi: RendererPluginApi;
    };
  }
}
