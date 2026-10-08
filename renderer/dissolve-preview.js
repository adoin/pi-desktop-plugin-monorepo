/* Generated shared-engine file:// preview. Do not edit. */
(() => {
// Noise/erosion formula adapted from Sax Design Vue / Vuesax Alpha (MIT).
// See THIRD_PARTY_NOTICES.md. No source DOM mutations, network or persistence.
const NS = 'http://www.w3.org/2000/svg';
const clamp = n => Math.max(0, Math.min(1, n));
function dissolveFrame(progress) {
  const p = clamp(progress), erosion = clamp(p / .7), scatter = clamp((p - .28) / .72) ** 2;
  return { slope: 8 + erosion * 18, intercept: 1 - erosion * 14, scale: scatter * 26,
    dx: scatter * 12, dy: -scatter * 3.5, alpha: p === 1 ? 0 : p < .88 ? 1 : 1 - clamp((p - .88) / .12) };
}
const STYLE = ['display','box-sizing','width','height','min-width','max-width','min-height','max-height',
  'padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left',
  'position','top','right','bottom','left','flex','flex-direction','flex-wrap','align-items','justify-content','gap',
  'grid-template-columns','grid-template-rows','grid-column','grid-row','overflow','white-space','text-overflow',
  'font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-decoration',
  'color','background-color','background-image','border-radius','border-width','border-style','border-color','box-shadow','opacity',
  'vertical-align','word-break','overflow-wrap','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin'];
const SKIP = 'script,style,link,iframe,webview,object,embed,img,video,audio,canvas,svg foreignObject';
const SENSITIVE = '[data-sensitive="true"],[data-private="true"],.permission-dialog,.permission-overlay,.asktool-card,.extension-prompt-overlay';
const HTML = new Set(['div','span','p','h1','h2','h3','h4','h5','h6','button','a','section','header','footer','main','aside','nav','ul','ol','li','pre','code','strong','em','small','b','i','label','table','thead','tbody','tr','td','th','br','hr','dialog']);
const SVG = new Set(['svg','g','path','circle','rect','line','polyline','polygon','ellipse']);
const SVG_ATTR = ['viewBox','d','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','width','height','points'];
const captureBudgets = new WeakMap();
function captureSurface(source, { maxNodes = 240, maxArea = 850000 } = {}) {
  if (!source?.isConnected) return null;
  if (source.closest(SENSITIVE) || source.querySelector(SENSITIVE)) return null;
  // Active-session archive can roll back asynchronously; skip its visual exit.
  if(source.matches('.thread-item[data-sidebar-session-row]')&&(source.classList.contains('active')||source.querySelector('[aria-current="page"]')))return null;
  const doc = source.ownerDocument, view = doc.defaultView, rect = source.getBoundingClientRect();
  let budget=captureBudgets.get(doc);
  if(!budget){budget={nodes:640,calls:0,deadline:view.performance.now()+16};captureBudgets.set(doc,budget);view.setTimeout(()=>{if(captureBudgets.get(doc)===budget)captureBudgets.delete(doc);},0);}
  if(++budget.calls>4||budget.nodes<=0||view.performance.now()>budget.deadline)return null;
  if (rect.width < 2 || rect.height < 2 || rect.width * rect.height > maxArea || rect.bottom <= 0 || rect.right <= 0 || rect.top >= view.innerHeight || rect.left >= view.innerWidth) return null;
  // A clone cannot safely reconstruct an ancestor's clip/opacity. Skip rather
  // than flash content that wasn't actually visible. Native dialogs are top-layer.
  let opacity = 1;
  const topLayer = source.matches('dialog[open]');
  for (let ancestor=source; ancestor; ancestor=ancestor.parentElement) {
    const s=view.getComputedStyle(ancestor); opacity*=Number(s.opacity);
    if(s.display==='none'||s.visibility==='hidden'||opacity<.95)return null;
    if(ancestor!==source&&!topLayer) {
      const r=ancestor.getBoundingClientRect();
      if(/hidden|clip|auto|scroll/.test(s.overflowX)&&(rect.left<r.left-1||rect.right>r.right+1))return null;
      if(/hidden|clip|auto|scroll/.test(s.overflowY)&&(rect.top<r.top-1||rect.bottom>r.bottom+1))return null;
    }
  }
  let count = 0, rejected = false;
  function copy(node) {
    if (++count > maxNodes || --budget.nodes < 0 || view.performance.now()>budget.deadline) { rejected = true; return null; }
    if (node.nodeType === 3) return doc.createTextNode(node.textContent.slice(0, 4096));
    if (node.nodeType !== 1 || node.matches(SKIP) || node.matches(SENSITIVE)) return null;
    const computed = view.getComputedStyle(node);
    if (computed.display === 'none' || computed.visibility === 'hidden') return null;
    const tag = node.localName;
    // Inputs/passwords/editor contents are never copied into a visual snapshot.
    const field = node.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
    const out = node.namespaceURI === NS && SVG.has(tag) ? doc.createElementNS(NS, tag) : doc.createElement(HTML.has(tag) && !['button','a','dialog'].includes(tag) ? tag : 'div');
    for (const property of STYLE) {
      const value = computed.getPropertyValue(property);
      if (!/url\s*\(/i.test(value)) out.style.setProperty(property, value);
    }
    out.style.setProperty('pointer-events', 'none', 'important');
    out.style.setProperty('animation', 'none', 'important');
    out.style.setProperty('transition', 'none', 'important');
    if (out.namespaceURI === NS) for (const name of SVG_ATTR) {
      const value = node.getAttribute(name); if (value !== null && !/url\s*\(/i.test(value)) out.setAttribute(name, value);
    }
    if (!field) for (const child of node.childNodes) { const clone = copy(child); if (clone) out.append(clone); if (rejected) break; }
    return out;
  }
  const clone = copy(source);
  if (!clone || rejected) return null;
  Object.assign(clone.style, { position:'relative', top:'auto', right:'auto', bottom:'auto', left:'auto', margin:'0', width:`${rect.width}px`, height:`${rect.height}px`, minWidth:'0', minHeight:'0', maxWidth:'none', maxHeight:'none', transform:'none', translate:'none', scale:'none', opacity:'1', overflow:'hidden' });
  let backdrop = null;
  const native = source.matches('dialog:modal');
  const overlay = native ? source : source.parentElement?.closest('.search-overlay,.overlay,.plugins-modal-backdrop');
  if(overlay){const s=view.getComputedStyle(overlay,native?'::backdrop':null);if(s.backgroundColor!=='rgba(0, 0, 0, 0)')backdrop={owner:overlay,native,color:s.backgroundColor,blur:s.backdropFilter,opacity:s.opacity};}
  return { clone, backdrop, rect: { left:rect.left, top:rect.top, width:rect.width, height:rect.height }, capturedAt:view.performance.now(), nodes:count };
}
function svgNode(doc, name, attributes = {}) {
  const node = doc.createElementNS(NS, name);
  for (const [key,value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}
function createDissolveEngine(layer, { duration = 220, maxConcurrent = 3 } = {}) {
  const doc = layer.ownerDocument, view = doc.defaultView, media = view.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map(); let disposed = false, serial = 0;
  const prefix = `sax-dissolve-${view.crypto.randomUUID()}`;
  layer.dataset.saxDissolveLayer = '';
  layer.setAttribute('aria-hidden','true'); layer.inert = true;
  layer.style.setProperty('pointer-events','none','important');
  function clear() { for (const stop of [...active.values()]) stop(); }
  function play(snapshot, { holdMs = 0, cancelWhen = () => false } = {}) {
    if (disposed || !snapshot || media.matches || doc.hidden || layer.closest('[hidden]') || !layer.isConnected || view.performance.now() - snapshot.capturedAt > 15000) return false;
    while (active.size >= maxConcurrent) active.values().next().value();
    const wrapper = doc.createElement('div'), id = `${prefix}-${++serial}`;
    wrapper.dataset.saxDissolveGhost = ''; wrapper.inert = true; wrapper.setAttribute('aria-hidden','true');
    wrapper.dataset.saxDissolvePhase = holdMs > 0 ? 'holding' : 'playing';
    let veil = null;
    const mask = snapshot.backdrop;
    if(mask && (mask.native ? !mask.owner.open : !mask.owner.isConnected || view.getComputedStyle(mask.owner).display==='none')) {
      veil=doc.createElement('div');veil.dataset.saxDissolveVeil='';veil.inert=true;veil.setAttribute('aria-hidden','true');
      Object.assign(veil.style,{position:'fixed',inset:'0',background:mask.color,backdropFilter:mask.blur,pointerEvents:'none',opacity:mask.opacity,zIndex:'0'});layer.append(veil);
    }
    Object.assign(wrapper.style,{position:'fixed',left:`${snapshot.rect.left}px`,top:`${snapshot.rect.top}px`,width:`${snapshot.rect.width}px`,height:`${snapshot.rect.height}px`,margin:'0',pointerEvents:'none',overflow:'visible',zIndex:'1'});
    const svg = svgNode(doc,'svg',{width:0,height:0,'aria-hidden':'true'}); svg.style.position='absolute';
    const defs=svgNode(doc,'defs'), filter=svgNode(doc,'filter',{id,x:'-12%',y:'-12%',width:'124%',height:'124%','color-interpolation-filters':'sRGB'});
    filter.append(svgNode(doc,'feTurbulence',{type:'fractalNoise',baseFrequency:'.62 .78',numOctaves:2,seed:13,result:'noise'}));
    filter.append(svgNode(doc,'feColorMatrix',{in:'noise',type:'matrix',values:'0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .333 .333 .333 0 0',result:'noiseAlpha'}));
    const transfer=svgNode(doc,'feComponentTransfer',{in:'noiseAlpha',result:'particleMask'}), threshold=svgNode(doc,'feFuncA',{type:'linear',slope:8,intercept:1}); transfer.append(threshold);filter.append(transfer);
    filter.append(svgNode(doc,'feComposite',{in:'SourceGraphic',in2:'particleMask',operator:'in',result:'cut'}));
    const displacement=svgNode(doc,'feDisplacementMap',{in:'cut',in2:'noise',scale:0,xChannelSelector:'R',yChannelSelector:'G',result:'moved'});filter.append(displacement);
    const offset=svgNode(doc,'feOffset',{in:'moved',dx:0,dy:0,result:'shifted'});filter.append(offset);
    const fade=svgNode(doc,'feComponentTransfer',{in:'shifted'}), alpha=svgNode(doc,'feFuncA',{type:'linear',slope:1,intercept:0});fade.append(alpha);filter.append(fade);defs.append(filter);svg.append(defs);
    snapshot.clone.style.filter=`url("#${id}")`;wrapper.append(svg,snapshot.clone);layer.append(wrapper);
    let raf=0, timer=0;
    const stop=()=>{view.cancelAnimationFrame(raf);view.clearTimeout(timer);wrapper.remove();veil?.remove();active.delete(wrapper);};
    active.set(wrapper,stop);
    const start=view.performance.now();
    function tick(now) {
      if (disposed || doc.hidden || media.matches || !layer.isConnected || layer.closest('[hidden]') || cancelWhen()) return stop();
      if(now-start<holdMs){raf=view.requestAnimationFrame(tick);return;}
      if(wrapper.dataset.saxDissolvePhase!=='playing')wrapper.dataset.saxDissolvePhase='playing';
      const elapsed=clamp((now-start-holdMs)/duration), f=dissolveFrame(1-(1-elapsed)**3);
      if(veil)veil.style.opacity=String(Number(mask.opacity)*(1-elapsed));
      threshold.setAttribute('slope',f.slope);threshold.setAttribute('intercept',f.intercept);displacement.setAttribute('scale',f.scale);offset.setAttribute('dx',f.dx);offset.setAttribute('dy',f.dy);alpha.setAttribute('slope',f.alpha);
      if(elapsed<1) raf=view.requestAnimationFrame(tick);else stop();
    }
    raf=view.requestAnimationFrame(tick);timer=view.setTimeout(stop,holdMs+duration+150);
    return true;
  }
  const onHidden=()=>{if(doc.hidden)clear();};
  doc.addEventListener('visibilitychange',onHidden);media.addEventListener('change',clear);
  view.addEventListener('resize',clear);doc.addEventListener('scroll',clear,true);
  return { play, clear, get activeCount(){return active.size;}, dispose(){if(disposed)return;disposed=true;clear();doc.removeEventListener('visibilitychange',onHidden);media.removeEventListener('change',clear);view.removeEventListener('resize',clear);doc.removeEventListener('scroll',clear,true);} };
}

const ROW='.thread-item[data-sidebar-session-row]';
const SURFACES='.dialog[role="dialog"],dialog,.search-dialog,.plugins-modal,.notification-popover,.sidebar-floating-menu,.context-menu,.composer-model-menu,.composer-permission-menu,.settings-theme-menu,.settings-language-menu,.settings-menu-select-menu,.toast';
const SAFETY='[data-sax-dissolve-layer],#pi-plugin-layers,.extension-prompt-overlay,.permission-dialog,.permission-overlay,.asktool-card,[data-sensitive="true"]';
const NAV='[data-nav],[data-sort],[data-action="toggle-project-collapse"],[data-action="toggle-show-archived"],.thread-item-main';
const ACTIONS=new Set(['delete-session','batch-delete','toggle-session-archive','batch-archive']);
const STATED='.context-menu,.composer-model-menu,.composer-permission-menu,.settings-theme-menu,.settings-language-menu,.settings-menu-select-menu';
const EXIT='.closing,.is-closing,.sax-motion-leaving,[data-state="closed"]';

function attachHostDissolve(pi,{doc=document,activeTheme=()=>(doc.documentElement.dataset.pluginTheme||'').startsWith('plugin:local.pi-desktop-sax-theme:')}={}) {
  const view=doc.defaultView,media=view.matchMedia('(prefers-reduced-motion: reduce)');
  const layer=pi.ui.openLayer(),engine=createDissolveEngine(layer.element);
  const surfaces=new Map(),pending=new Map(),faded=new WeakSet();
  let lastRow=null,disposed=false,timer=0,expiryTimer=0,suppressUntil=0;
  const stats={played:0,skipped:0};
  const allowed=()=>!disposed&&activeTheme()&&!media.matches&&!doc.hidden&&!layer.element.closest('[hidden]')&&!doc.documentElement.matches('[data-sidebar-resizing="true"],[data-project-reordering="true"]');
  function visible(node) {
    if(!node?.isConnected||node.closest('[hidden],[aria-hidden="true"],.collapsed'))return false;
    if(node.matches('dialog')&&!node.open)return false;
    const s=view.getComputedStyle(node),r=node.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>1&&r.height>1&&r.bottom>0&&r.right>0&&r.top<view.innerHeight&&r.left<view.innerWidth;
  }
  function exiting(node){return !!node.closest(EXIT)||(node.matches(STATED)&&!node.classList.contains('is-open'));}
  function eligible(node) {
    return !node.closest(SAFETY)&&!/permission|approval|credential|secret|confirm-access/i.test(node.className?.toString()||'')&&(!node.matches('.toast')||!!node.closest('.toast-viewport'))&&!exiting(node)&&!faded.has(node)&&visible(node);
  }
  function reset(){surfaces.clear();pending.clear();lastRow=null;engine.clear();view.clearTimeout(expiryTimer);}
  function play(snapshot,options){if(allowed()&&view.performance.now()>=suppressUntil&&engine.play(snapshot,options))stats.played++;else stats.skipped++;}
  function rowFor(id){return doc.querySelector(`${ROW}[data-sidebar-session-row="${view.CSS.escape(id)}"]`);}
  function cache(node,force=false){
    if(!eligible(node)||(!force&&surfaces.has(node)))return;
    const snapshot=captureSurface(node);
    if(snapshot){if(!surfaces.has(node)&&surfaces.size>=16)surfaces.delete(surfaces.keys().next().value);surfaces.set(node,snapshot);}
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
  function onPointer(event){
    if(!allowed())return;
    const target=event.target instanceof view.Element?event.target:null;if(!target||target.closest(SAFETY))return;
    if(target.closest(NAV)&&!target.closest('[data-action="session-menu"]')){reset();suppressUntil=view.performance.now()+350;return;}
    const row=target.closest(ROW);
    if(row&&(event.type==='contextmenu'||target.closest('[data-action="session-menu"]')))lastRow=row.dataset.sidebarSessionRow;
    for(const surface of [...doc.querySelectorAll(SURFACES)].filter(n=>!n.parentElement?.closest(SURFACES)).slice(0,16))if(surfaces.has(surface)||surface.contains(target))cache(surface,true);
  }
  function onClick(event){
    if(!allowed())return;
    const button=event.target instanceof view.Element?event.target.closest('[data-action]'):null;
    if(!button||!button.closest('.sidebar-floating-menu'))return;
    const action=button.dataset.action;if(!ACTIONS.has(action))return;
    if(action.includes('delete')&&button.dataset.armed!=='true')return;
    const expanded=doc.querySelector(`${ROW} [data-action="session-menu"][aria-expanded="true"]`)?.closest(ROW);
    const rows=action.startsWith('batch-')?[...doc.querySelectorAll(`${ROW}.selected`)]:[expanded||(lastRow&&rowFor(lastRow))].filter(Boolean);
    for(const row of rows.slice(0,8)){
      if(action.includes('archive')&&row.classList.contains('archived'))continue;
      const snapshot=captureSurface(row,{maxNodes:80,maxArea:160000}),group=row.closest('[data-sidebar-project-group],.sidebar-session-group');
      if(snapshot&&group){const id=row.dataset.sidebarSessionRow;if(!pending.has(id)&&pending.size>=8)pending.delete(pending.keys().next().value);pending.set(id,{snapshot,group,created:view.performance.now()});}
    }
    armExpiry();
  }
  function onKey(event){if(event.key==='Escape')for(const node of surfaces.keys())cache(node,true);}
  function onViewport(){reset();suppressUntil=view.performance.now()+300;schedule();}
  const observer=new view.MutationObserver(records=>{
    if(disposed)return;
    let relevant=false;
    for(const record of records){
      const target=record.target.nodeType===1?record.target:record.target.parentElement;
      if(target?.id==='pi-plugin-layers'&&record.attributeName==='hidden'){reset();schedule();continue;}
      if(target?.closest('[data-sax-dissolve-layer],#pi-plugin-layers'))continue;
      if(target?.matches('.app-shell,.sidebar')&&record.type==='attributes'){reset();suppressUntil=view.performance.now()+300;continue;}
      if(record.attributeName==='open'&&target?.matches('dialog[open]'))faded.delete(target);
      if(target?.closest(`${SURFACES},${ROW},[data-sidebar-project-group]`))relevant=true;
      if([...record.addedNodes,...record.removedNodes].some(n=>n.nodeType===1&&(n.matches(`${SURFACES},${ROW},.app-shell`)||n.querySelector(`${SURFACES},${ROW},.app-shell`))))relevant=true;
    }
    if(relevant){flushExits();schedule();}
  });
  observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open','hidden','aria-hidden','data-state']});
  const themeObserver=new view.MutationObserver(()=>{reset();schedule();});
  themeObserver.observe(doc.documentElement,{attributes:true,attributeFilter:['data-plugin-theme','data-theme','data-sidebar-resizing','data-project-reordering']});
  const onAnimationStart=e=>{if(!(e.target instanceof view.Element))return;const node=e.target.closest(SURFACES);if(!node)return;if(/(?:^|[-_])(out|exit|leave)(?:[-_]|$)/i.test(e.animationName)){faded.add(node);surfaces.delete(node);}else if(/(?:^|[-_])(in|enter)(?:[-_]|$)/i.test(e.animationName)){faded.delete(node);}};
  const onAnimationEnd=e=>{if(e.target instanceof view.Element&&e.target.matches(SURFACES))schedule();};
  doc.addEventListener('pointerdown',onPointer,true);doc.addEventListener('contextmenu',onPointer,true);doc.addEventListener('click',onClick,true);doc.addEventListener('keydown',onKey,true);
  doc.addEventListener('animationstart',onAnimationStart,true);doc.addEventListener('animationend',onAnimationEnd,true);doc.addEventListener('transitionend',onAnimationEnd,true);
  doc.addEventListener('scroll',onViewport,true);view.addEventListener('resize',onViewport);doc.addEventListener('visibilitychange',onViewport);media.addEventListener('change',onViewport);
  scan();const warmTimer=view.setTimeout(scan,350);
  return {stats,dispose(){if(disposed)return;disposed=true;observer.disconnect();themeObserver.disconnect();view.clearTimeout(timer);view.clearTimeout(expiryTimer);view.clearTimeout(warmTimer);reset();engine.dispose();layer.close();doc.removeEventListener('pointerdown',onPointer,true);doc.removeEventListener('contextmenu',onPointer,true);doc.removeEventListener('click',onClick,true);doc.removeEventListener('keydown',onKey,true);doc.removeEventListener('animationstart',onAnimationStart,true);doc.removeEventListener('animationend',onAnimationEnd,true);doc.removeEventListener('transitionend',onAnimationEnd,true);doc.removeEventListener('scroll',onViewport,true);view.removeEventListener('resize',onViewport);doc.removeEventListener('visibilitychange',onViewport);media.removeEventListener('change',onViewport);}};
}

// Appended to the shared modules by scripts/build.cjs for file:// previews.
const mockPi={ui:{openLayer(){const element=document.createElement('div');element.dataset.piPlugin='local.pi-desktop-sax-theme';Object.assign(element.style,{position:'fixed',top:'0',left:'0',width:'0',height:'0',zIndex:'600'});document.body.append(element);return {element,close:()=>element.remove()};}}};
let controller=attachHostDissolve(mockPi);
const rows=document.getElementById('rows');let menu=null;
function closeMenu(){menu?.remove();menu=null;document.querySelectorAll('[data-action="session-menu"]').forEach(b=>b.setAttribute('aria-expanded','false'));}
function showMenu(row,button){
  closeMenu();button.setAttribute('aria-expanded','true');menu=document.createElement('div');menu.className='sidebar-floating-menu sidebar-row-menu';menu.setAttribute('role','menu');
  const rect=button.getBoundingClientRect();Object.assign(menu.style,{top:`${Math.min(rect.bottom+4,innerHeight-150)}px`,left:`${Math.max(8,Math.min(rect.left,innerWidth-210))}px`});
  for(const [action,label] of [['toggle-session-archive',row.classList.contains('archived')?'恢复':'归档'],['delete-session','删除']]){
    const b=document.createElement('button');b.dataset.action=action;b.setAttribute('role','menuitem');b.textContent=label;
    b.onclick=()=>{
      if(action==='delete-session'&&b.dataset.armed!=='true'){b.dataset.armed='true';b.textContent='确认删除？';return;}
      closeMenu();const outcome=document.getElementById('outcome').value;
      setTimeout(()=>{
        if(outcome==='failure')return;
        if(action==='toggle-session-archive'&&row.classList.contains('archived')){row.classList.remove('archived');return;}
        if(action==='toggle-session-archive'&&document.getElementById('show-archived').checked){row.classList.add('archived');return;}
        const parent=row.parentElement,next=row.nextSibling;row.remove();
        if(outcome==='rollback')setTimeout(()=>parent.insertBefore(row,next?.parentElement===parent?next:null),90);
      },80);
    };menu.append(b);
  }document.body.append(menu);
}
function resetRows(){closeMenu();rows.classList.remove('collapsed');rows.removeAttribute('aria-hidden');rows.replaceChildren();for(let i=1;i<=3;i++){const row=document.createElement('div');row.className='thread-item';row.dataset.sidebarSessionRow=`demo-${i}`;const main=document.createElement('button');main.className='thread-item-main';main.textContent=`任务 ${i} · 粒子消失试验`;const more=document.createElement('button');more.dataset.action='session-menu';more.setAttribute('aria-expanded','false');more.textContent='⋯';more.onclick=()=>showMenu(row,more);row.append(main,more);rows.append(row);}}
document.getElementById('reset').onclick=resetRows;resetRows();
document.getElementById('collapse').onclick=()=>{const collapsed=rows.classList.toggle('collapsed');rows.setAttribute('aria-hidden',String(collapsed));};
const modal=document.getElementById('particle-dialog');document.getElementById('dialog-open').onclick=()=>modal.showModal();document.getElementById('dialog-close').onclick=()=>modal.close();
modal.addEventListener('click',e=>{if(e.target!==modal)return;const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();});
document.getElementById('toast-show').onclick=()=>{const t=document.createElement('div');t.className='toast';t.textContent='操作完成 · 提示将在两秒后溶解';document.querySelector('.toast-viewport').append(t);setTimeout(()=>t.remove(),2000);};
document.getElementById('stop').onclick=()=>{if(controller){controller.dispose();controller=null;}else controller=attachHostDissolve(mockPi);document.getElementById('stop').textContent=controller?'停用动效扩展':'启用动效扩展';};
document.getElementById('mode').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';document.getElementById('theme').href=`../themes/sax-${dark?'dark':'light'}.css`;document.getElementById('mode').textContent=dark?'切换浅色':'切换深色';};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&!e.target.closest('[data-action="session-menu"]'))closeMenu();});
setInterval(()=>{document.getElementById('status').textContent=`扩展 ${controller?'开启':'关闭'} · ${JSON.stringify(controller?.stats||{})} · 当前副本 ${document.querySelectorAll('[data-sax-dissolve-ghost]').length} · 减少动效 ${matchMedia('(prefers-reduced-motion: reduce)').matches}`;},400);
// Preview-only test hooks. Production extension exposes no DOM/state to other plugins.
window.saxDissolveTest={captureSurface,createDissolveEngine,get controller(){return controller;},mockPi};

})();
