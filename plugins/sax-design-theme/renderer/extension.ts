import type { RendererPluginApi } from '@pi-plugins/plugin-types';
import { attachHostDissolve } from './host-dissolve.js';
let controller: ReturnType<typeof attachHostDissolve> | undefined;
export function onLoad(pi: RendererPluginApi) {
  controller?.dispose();
  controller = attachHostDissolve(pi);
}
export function onUnload() {
  controller?.dispose();
  controller = undefined;
}
