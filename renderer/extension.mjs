import { attachHostDissolve } from './host-dissolve.mjs';
let controller;
export function onLoad(pi) {
  controller?.dispose();
  controller = attachHostDissolve(pi);
}
export function onUnload() {
  controller?.dispose();
  controller = undefined;
}
