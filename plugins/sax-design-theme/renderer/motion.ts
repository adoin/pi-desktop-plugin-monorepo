import type { PreviewDocument } from '../runtime-types.js';
import type { RendererPluginApi } from '@pi-plugins/plugin-types';
import type { attachHostDissolve } from './host-dissolve.js';
const document = window.document as PreviewDocument;
const menu = document.getElementById('demo-menu');
const trigger = document.getElementById('menu-toggle');
const items = [...menu.querySelectorAll('button')];
function setMenu(open: boolean, restore = false) {
  menu.inert = !open;
  menu.classList.toggle('is-open', open);
  trigger.setAttribute('aria-expanded', String(open));
  if (open) items[0].focus(); else if (restore) trigger.focus();
}
trigger.onclick = () => setMenu(!menu.classList.contains('is-open'));
menu.addEventListener('keydown', e => {
  const index = items.findIndex(item => item === document.activeElement);
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    items[e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  }
  if (e.key === 'Tab') setMenu(false, true);
});
items.forEach(item => item.onclick = () => { document.getElementById('result').textContent = `已选择：${item.textContent}`; setMenu(false, true); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { e.preventDefault(); setMenu(false, true); } });
document.addEventListener('pointerdown', e => { if (!(e.target instanceof Element) || !e.target.closest('.anchor')) setMenu(false); });
const dialog = document.getElementById('demo-dialog');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const particlePi: RendererPluginApi = { ui: { openLayer() { const element = document.createElement('div'); Object.assign(element.style, { position:'fixed', top:'0', left:'0', width:'0', height:'0', zIndex:'600' }); document.body.append(element); return { element, close:()=>element.remove() }; } } };
let particles: ReturnType<typeof attachHostDissolve> | null = window.SaxDissolve.attachHostDissolve(particlePi, { activeTheme:()=>true });
document.getElementById('particles-toggle').onclick = () => {
  if (particles) { particles.dispose(); particles = null; } else particles = window.SaxDissolve.attachHostDissolve(particlePi, { activeTheme:()=>true });
  document.getElementById('particles-toggle').setAttribute('aria-pressed', String(!!particles));
  document.getElementById('particles-toggle').textContent = particles ? '粒子开启：切换普通缩放退出' : '普通缩放：切换粒子溶解';
  updateStatus();
};
const logs: string[] = [];
function log(text: string) { logs.push(text); document.getElementById('event-log').textContent = logs.slice(-10).join('\n'); }
function duration(token: string) { const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim(); return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000) || 0; }
function updateStatus() {
  document.getElementById('motion-status').textContent = `系统减少动效：${reduced.matches ? '开启' : '关闭'} · 入场 ${duration('--sax-motion-dialog')}ms · 退出 ${particles ? '粒子 220' : duration('--sax-motion-exit')}ms · 页面 ${document.visibilityState}`;
}
reduced.addEventListener('change', updateStatus);
document.addEventListener('visibilitychange', updateStatus);
document.getElementById('theme').addEventListener('load', updateStatus);
document.getElementById('force').onclick = () => {
  const enabled = document.documentElement.dataset.previewMotion !== 'on';
  document.documentElement.dataset.previewMotion = enabled ? 'on' : '';
  document.getElementById('force').setAttribute('aria-pressed', String(enabled));
  document.getElementById('force').textContent = enabled ? '仅预览：恢复系统设置' : '仅预览：强制播放';
  updateStatus();
};
let exitTimer: ReturnType<typeof setTimeout> | undefined;
function finishClose() {
  clearTimeout(exitTimer);
  if (!dialog.classList.contains('sax-motion-leaving')) return;
  dialog.close();
  dialog.classList.remove('sax-motion-leaving');
  document.getElementById('dialog-close').disabled = false;
  log('closed：退场结束后关闭');
}
function closeDialog() {
  if (!dialog.open || dialog.classList.contains('sax-motion-leaving')) return;
  if (particles) { dialog.close(); log('closed：原始弹窗关闭，粒子观察器处理视觉副本'); return; }
  dialog.classList.add('sax-motion-leaving');
  document.getElementById('dialog-close').disabled = true;
  const ms = duration('--sax-motion-exit');
  if (ms === 0) finishClose();
  else exitTimer = setTimeout(finishClose, ms + 100); // hidden-page/event fallback
}
document.getElementById('dialog-open').onclick = () => {
  setMenu(false);
  if (dialog.open) return;
  clearTimeout(exitTimer);
  dialog.classList.remove('sax-motion-leaving');
  document.getElementById('dialog-close').disabled = false;
  dialog.showModal();
  log('open：开始入场');
};
document.getElementById('dialog-close').onclick = closeDialog;
dialog.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
dialog.addEventListener('animationstart', e => { if (e.target === dialog && !e.pseudoElement) log(`start：${e.animationName}`); });
dialog.addEventListener('animationend', e => {
  if (e.target !== dialog || e.pseudoElement) return;
  log(`end：${e.animationName} · ${Math.round(e.elapsedTime * 1000)}ms`);
  if (e.animationName === 'sax-dialog-exit') finishClose();
});
dialog.addEventListener('close', () => document.getElementById('dialog-open').focus());
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(); } });
updateStatus();
let toastTimer: ReturnType<typeof setTimeout> | undefined, removalTimer: ReturnType<typeof setTimeout> | undefined;
document.getElementById('toast-open').onclick = () => {
  clearTimeout(toastTimer); clearTimeout(removalTimer); document.querySelector('.toast')?.remove();
  let viewport = document.querySelector('.toast-viewport'); if (!viewport) { viewport=document.createElement('div');viewport.className='toast-viewport';document.body.append(viewport); }
  const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.textContent = '已完成 · 轻量反馈，不打断操作'; viewport.append(toast);
  toastTimer = setTimeout(() => { toast.classList.add('closing'); removalTimer = setTimeout(() => toast.remove(), duration('--sax-motion-exit') + 20); }, 1800);
};
document.getElementById('mode').onclick = () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.getElementById('theme').href = `../themes/sax-${dark ? 'dark' : 'light'}.css`; document.getElementById('mode').textContent = dark ? '切换浅色' : '切换深色'; };
