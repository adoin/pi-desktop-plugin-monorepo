import type { RendererPluginApi } from '@pi-plugins/plugin-types';
import { captureSurface, createDissolveEngine, type SurfaceSnapshot, type PlayOptions } from './dissolve.js';
const ROW='.thread-item[data-sidebar-session-row]';
const SURFACES='.dialog[role="dialog"],dialog,.search-dialog,.plugins-modal,.notification-popover,.sidebar-floating-menu,.context-menu,.composer-model-menu,.composer-permission-menu,.settings-theme-menu,.settings-language-menu,.settings-menu-select-menu,.toast';
const SAFETY='[data-sax-dissolve-layer],#pi-plugin-layers,.extension-prompt-overlay,.permission-dialog,.permission-overlay,.asktool-card,[data-sensitive="true"]';
const NAV='[data-nav],[data-sort],[data-action="toggle-project-collapse"],[data-action="toggle-show-archived"],.thread-item-main';
const ACTIONS=new Set(['delete-session','batch-delete','toggle-session-archive','batch-archive']);
const STATED='.context-menu,.composer-model-menu,.composer-permission-menu,.settings-theme-menu,.settings-language-menu,.settings-menu-select-menu';
const EXIT='.closing,.is-closing,.sax-motion-leaving,[data-state="closed"]';

export function attachHostDissolve(pi: RendererPluginApi,{doc=document,activeTheme=()=>(doc.documentElement.dataset.pluginTheme||'').startsWith('plugin:local.pi-desktop-sax-theme:')}={}) {
  const view=doc.defaultView!,media=view.matchMedia('(prefers-reduced-motion: reduce)');
  const layer=pi.ui.openLayer(),engine=createDissolveEngine(layer.element);
  const surfaces=new Map<Element, SurfaceSnapshot>(),pending=new Map<string | undefined, {snapshot: SurfaceSnapshot; group: Element; created: number}>(),faded=new WeakSet<Element>();
  let lastRow: string | null | undefined=null,disposed=false,timer=0,expiryTimer=0,suppressUntil=0;
  const stats={played:0,skipped:0};
  const allowed=()=>!disposed&&activeTheme()&&!media.matches&&!doc.hidden&&!layer.element.closest('[hidden]')&&!doc.documentElement.matches('[data-sidebar-resizing="true"],[data-project-reordering="true"]');
  function visible(node: Element | null | undefined) {
    if(!node?.isConnected||node.closest('[hidden],[aria-hidden="true"],.collapsed'))return false;
    if(node.matches('dialog')&&!(node as HTMLDialogElement).open)return false;
    const s=view.getComputedStyle(node),r=node.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>1&&r.height>1&&r.bottom>0&&r.right>0&&r.top<view.innerHeight&&r.left<view.innerWidth;
  }
  function exiting(node: Element){return !!node.closest(EXIT)||(node.matches(STATED)&&!node.classList.contains('is-open'));}
  function eligible(node: Element) {
    return !node.closest(SAFETY)&&!/permission|approval|credential|secret|confirm-access/i.test(node.className?.toString()||'')&&(!node.matches('.toast')||!!node.closest('.toast-viewport'))&&!exiting(node)&&!faded.has(node)&&visible(node);
  }
  function reset(){surfaces.clear();pending.clear();lastRow=null;engine.clear();view.clearTimeout(expiryTimer);}
  function play(snapshot: SurfaceSnapshot,options: PlayOptions){if(allowed()&&view.performance.now()>=suppressUntil&&engine.play(snapshot,options))stats.played++;else stats.skipped++;}
  function rowFor(id: string | undefined){return doc.querySelector<HTMLElement>(`${ROW}[data-sidebar-session-row="${view.CSS.escape(String(id))}"]`);}
  function cache(node: Element,force=false){
    if(!eligible(node)||(!force&&surfaces.has(node)))return;
    const snapshot=captureSurface(node);
    if(snapshot){if(!surfaces.has(node)&&surfaces.size>=16)surfaces.delete(surfaces.keys().next().value!);surfaces.set(node,snapshot);}
  }
  function armExpiry(){
    view.clearTimeout(expiryTimer);
    if(pending.size)expiryTimer=view.setTimeout(()=>{flushExits();armExpiry();},Math.max(50,Math.min(...[...pending.values()].map(x=>x.created+12050-view.performance.now()))));
  }
  // Called in MutationObserver delivery, BEFORE the next paint. Only consumes
  // already captured snapshots; never waits for the 16ms cache-discovery timer.
  function flushExits(){
    if(!allowed()){reset();return;}
    const now=view.performance.now();
    for(const [node,snapshot] of surfaces){
      if(exiting(node)||faded.has(node)){surfaces.delete(node);continue;}
      if(!visible(node)){
        surfaces.delete(node);
        if(!node.isConnected||node.matches('dialog'))play(snapshot,{cancelWhen:()=>visible(node)});
      }else if(now-snapshot.capturedAt>15000)surfaces.delete(node);
    }
    for(const [id,item] of pending){
      if(now-item.created>12000){pending.delete(id);continue;}
      if(rowFor(id))continue;
      pending.delete(id);
      const invalid=()=>!allowed()||!!rowFor(id)||!item.group.isConnected||!visible(item.group)||!!item.group.querySelector('.sidebar-session-group-body.collapsed,.sidebar-session-group-body[aria-hidden="true"]');
      if(invalid())continue;
      // Hold the clone continuously in the vacated position during rollback
      // observation. Do NOT leave a blank frame then recreate the row later.
      play(item.snapshot,{holdMs:240,cancelWhen:invalid});
    }
  }
  function scan(){
    timer=0;flushExits();if(!allowed())return;
    const now=view.performance.now();if(now<suppressUntil){timer=view.setTimeout(scan,Math.ceil(suppressUntil-now)+1);return;}
    const candidates=[...doc.querySelectorAll(SURFACES)].filter(n=>!n.parentElement?.closest(SURFACES));
    for(const node of candidates.slice(0,16))cache(node);
  }
  function schedule(){if(!timer&&!disposed)timer=view.setTimeout(scan,16);}
  function onPointer(event: MouseEvent){
    if(!allowed())return;
    const target=event.target instanceof view.Element?event.target:null;if(!target||target.closest(SAFETY))return;
    if(target.closest(NAV)&&!target.closest('[data-action="session-menu"]')){reset();suppressUntil=view.performance.now()+350;return;}
    const row=target.closest<HTMLElement>(ROW);
    if(row&&(event.type==='contextmenu'||target.closest('[data-action="session-menu"]')))lastRow=row.dataset.sidebarSessionRow;
    for(const surface of [...doc.querySelectorAll(SURFACES)].filter(n=>!n.parentElement?.closest(SURFACES)).slice(0,16))if(surfaces.has(surface)||surface.contains(target))cache(surface,true);
  }
  function onClick(event: MouseEvent){
    if(!allowed())return;
    const button=event.target instanceof view.Element?event.target.closest<HTMLElement>('[data-action]'):null;
    if(!button||!button.closest('.sidebar-floating-menu'))return;
    const action=button.dataset.action;if(!action||!ACTIONS.has(action))return;
    if(action.includes('delete')&&button.dataset.armed!=='true')return;
    const expanded=doc.querySelector(`${ROW} [data-action="session-menu"][aria-expanded="true"]`)?.closest<HTMLElement>(ROW);
    const rows=action.startsWith('batch-')?[...doc.querySelectorAll<HTMLElement>(`${ROW}.selected`)]:[expanded||(lastRow&&rowFor(lastRow))].filter((row): row is HTMLElement => !!row);
    for(const row of rows.slice(0,8)){
      if(action.includes('archive')&&row.classList.contains('archived'))continue;
      const snapshot=captureSurface(row,{maxNodes:80,maxArea:160000}),group=row.closest('[data-sidebar-project-group],.sidebar-session-group');
      if(snapshot&&group){const id=row.dataset.sidebarSessionRow;if(!pending.has(id)&&pending.size>=8)pending.delete(pending.keys().next().value);pending.set(id,{snapshot,group,created:view.performance.now()});}
    }
    armExpiry();
  }
  function onKey(event: KeyboardEvent){if(event.key==='Escape')for(const node of surfaces.keys())cache(node,true);}
  function onViewport(){reset();suppressUntil=view.performance.now()+300;schedule();}
  const observer=new view.MutationObserver(records=>{
    if(disposed)return;
    let relevant=false;
    for(const record of records){
      const target=record.target instanceof view.Element?record.target:record.target.parentElement;
      if(target?.id==='pi-plugin-layers'&&record.attributeName==='hidden'){reset();schedule();continue;}
      if(target?.closest('[data-sax-dissolve-layer],#pi-plugin-layers'))continue;
      if(target?.matches('.app-shell,.sidebar')&&record.type==='attributes'){reset();suppressUntil=view.performance.now()+300;continue;}
      if(record.attributeName==='open'&&target?.matches('dialog[open]'))faded.delete(target);
      if(target?.closest(`${SURFACES},${ROW},[data-sidebar-project-group]`))relevant=true;
      if([...record.addedNodes,...record.removedNodes].some(n=>n instanceof view.Element&&(n.matches(`${SURFACES},${ROW},.app-shell`)||n.querySelector(`${SURFACES},${ROW},.app-shell`))))relevant=true;
    }
    if(relevant){flushExits();schedule();}
  });
  observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open','hidden','aria-hidden','data-state']});
  const themeObserver=new view.MutationObserver(()=>{reset();schedule();});
  themeObserver.observe(doc.documentElement,{attributes:true,attributeFilter:['data-plugin-theme','data-theme','data-sidebar-resizing','data-project-reordering']});
  const onAnimationStart=(e: AnimationEvent)=>{if(!(e.target instanceof view.Element))return;const node=e.target.closest(SURFACES);if(!node)return;if(/(?:^|[-_])(out|exit|leave)(?:[-_]|$)/i.test(e.animationName)){faded.add(node);surfaces.delete(node);}else if(/(?:^|[-_])(in|enter)(?:[-_]|$)/i.test(e.animationName)){faded.delete(node);}};
  const onAnimationEnd=(e: Event)=>{if(e.target instanceof view.Element&&e.target.matches(SURFACES))schedule();};
  doc.addEventListener('pointerdown',onPointer,true);doc.addEventListener('contextmenu',onPointer,true);doc.addEventListener('click',onClick,true);doc.addEventListener('keydown',onKey,true);
  doc.addEventListener('animationstart',onAnimationStart,true);doc.addEventListener('animationend',onAnimationEnd,true);doc.addEventListener('transitionend',onAnimationEnd,true);
  doc.addEventListener('scroll',onViewport,true);view.addEventListener('resize',onViewport);doc.addEventListener('visibilitychange',onViewport);media.addEventListener('change',onViewport);
  scan();const warmTimer=view.setTimeout(scan,350);
  return {stats,dispose(){if(disposed)return;disposed=true;observer.disconnect();themeObserver.disconnect();view.clearTimeout(timer);view.clearTimeout(expiryTimer);view.clearTimeout(warmTimer);reset();engine.dispose();layer.close();doc.removeEventListener('pointerdown',onPointer,true);doc.removeEventListener('contextmenu',onPointer,true);doc.removeEventListener('click',onClick,true);doc.removeEventListener('keydown',onKey,true);doc.removeEventListener('animationstart',onAnimationStart,true);doc.removeEventListener('animationend',onAnimationEnd,true);doc.removeEventListener('transitionend',onAnimationEnd,true);doc.removeEventListener('scroll',onViewport,true);view.removeEventListener('resize',onViewport);doc.removeEventListener('visibilitychange',onViewport);media.removeEventListener('change',onViewport);}};
}
