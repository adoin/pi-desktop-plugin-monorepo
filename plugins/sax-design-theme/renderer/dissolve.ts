// Noise/erosion formula adapted from Sax Design Vue / Vuesax Alpha (MIT).
// See THIRD_PARTY_NOTICES.md. No source DOM mutations, network or persistence.
const NS = 'http://www.w3.org/2000/svg';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function dissolveFrame(progress: number) {
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
interface CaptureBudget { nodes: number; calls: number; deadline: number }
export interface SurfaceSnapshot {
  clone: HTMLElement | SVGElement;
  backdrop: { owner: Element; native: boolean; color: string; blur: string; opacity: string } | null;
  rect: { left: number; top: number; width: number; height: number };
  capturedAt: number;
  nodes: number;
}
export interface PlayOptions { holdMs?: number; cancelWhen?: () => boolean }
const captureBudgets = new WeakMap<Document, CaptureBudget>();
export function captureSurface(source: Element | null | undefined, { maxNodes = 240, maxArea = 850000 } = {}): SurfaceSnapshot | null {
  if (!source?.isConnected) return null;
  if (source.closest(SENSITIVE) || source.querySelector(SENSITIVE)) return null;
  // Active-session archive can roll back asynchronously; skip its visual exit.
  if(source.matches('.thread-item[data-sidebar-session-row]')&&(source.classList.contains('active')||source.querySelector('[aria-current="page"]')))return null;
  const doc = source.ownerDocument, view = doc.defaultView!, rect = source.getBoundingClientRect();
  let budget=captureBudgets.get(doc);
  if(!budget){budget={nodes:640,calls:0,deadline:view.performance.now()+16};captureBudgets.set(doc,budget);view.setTimeout(()=>{if(captureBudgets.get(doc)===budget)captureBudgets.delete(doc);},0);}
  if(++budget.calls>4||budget.nodes<=0||view.performance.now()>budget.deadline)return null;
  if (rect.width < 2 || rect.height < 2 || rect.width * rect.height > maxArea || rect.bottom <= 0 || rect.right <= 0 || rect.top >= view.innerHeight || rect.left >= view.innerWidth) return null;
  // A clone cannot safely reconstruct an ancestor's clip/opacity. Skip rather
  // than flash content that wasn't actually visible. Native dialogs are top-layer.
  let opacity = 1;
  const topLayer = source.matches('dialog[open]');
  for (let ancestor: Element | null=source; ancestor; ancestor=ancestor.parentElement) {
    const s=view.getComputedStyle(ancestor); opacity*=Number(s.opacity);
    if(s.display==='none'||s.visibility==='hidden'||opacity<.95)return null;
    if(ancestor!==source&&!topLayer) {
      const r=ancestor.getBoundingClientRect();
      if(/hidden|clip|auto|scroll/.test(s.overflowX)&&(rect.left<r.left-1||rect.right>r.right+1))return null;
      if(/hidden|clip|auto|scroll/.test(s.overflowY)&&(rect.top<r.top-1||rect.bottom>r.bottom+1))return null;
    }
  }
  let count = 0, rejected = false;
  function copy(node: Node): HTMLElement | SVGElement | Text | null {
    if (++count > maxNodes || --budget!.nodes < 0 || view.performance.now()>budget!.deadline) { rejected = true; return null; }
    if (node.nodeType === 3) return doc.createTextNode((node.textContent ?? '').slice(0, 4096));
    if (!(node instanceof view.Element) || node.matches(SKIP) || node.matches(SENSITIVE)) return null;
    const computed = view.getComputedStyle(node);
    if (computed.display === 'none' || computed.visibility === 'hidden') return null;
    const tag = node.localName;
    // Inputs/passwords/editor contents are never copied into a visual snapshot.
    const field = node.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
    const out = node.namespaceURI === NS && SVG.has(tag) ? doc.createElementNS(NS, tag) as SVGElement : doc.createElement(HTML.has(tag) && !['button','a','dialog'].includes(tag) ? tag : 'div');
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
  if (!clone || !('style' in clone) || rejected) return null;
  Object.assign(clone.style, { position:'relative', top:'auto', right:'auto', bottom:'auto', left:'auto', margin:'0', width:`${rect.width}px`, height:`${rect.height}px`, minWidth:'0', minHeight:'0', maxWidth:'none', maxHeight:'none', transform:'none', translate:'none', scale:'none', opacity:'1', overflow:'hidden' });
  let backdrop = null;
  const native = source.matches('dialog:modal');
  const overlay = native ? source : source.parentElement?.closest('.search-overlay,.overlay,.plugins-modal-backdrop');
  if(overlay){const s=view.getComputedStyle(overlay,native?'::backdrop':null);if(s.backgroundColor!=='rgba(0, 0, 0, 0)')backdrop={owner:overlay,native,color:s.backgroundColor,blur:s.backdropFilter,opacity:s.opacity};}
  return { clone, backdrop, rect: { left:rect.left, top:rect.top, width:rect.width, height:rect.height }, capturedAt:view.performance.now(), nodes:count };
}
function svgNode<K extends keyof SVGElementTagNameMap>(doc: Document, name: K, attributes: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = doc.createElementNS(NS, name);
  for (const [key,value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}
export function createDissolveEngine(layer: HTMLElement, { duration = 220, maxConcurrent = 3 } = {}) {
  const doc = layer.ownerDocument, view = doc.defaultView!, media = view.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map<HTMLElement, () => void>(); let disposed = false, serial = 0;
  const prefix = `sax-dissolve-${view.crypto.randomUUID()}`;
  layer.dataset.saxDissolveLayer = '';
  layer.setAttribute('aria-hidden','true'); layer.inert = true;
  layer.style.setProperty('pointer-events','none','important');
  function clear() { for (const stop of [...active.values()]) stop(); }
  function play(snapshot: SurfaceSnapshot | null, { holdMs = 0, cancelWhen = () => false }: PlayOptions = {}) {
    if (disposed || !snapshot || media.matches || doc.hidden || layer.closest('[hidden]') || !layer.isConnected || view.performance.now() - snapshot.capturedAt > 15000) return false;
    while (active.size >= maxConcurrent) active.values().next().value!();
    const wrapper = doc.createElement('div'), id = `${prefix}-${++serial}`;
    wrapper.dataset.saxDissolveGhost = ''; wrapper.inert = true; wrapper.setAttribute('aria-hidden','true');
    wrapper.dataset.saxDissolvePhase = holdMs > 0 ? 'holding' : 'playing';
    let veil: HTMLDivElement | null = null;
    const mask = snapshot.backdrop;
    if(mask && (mask.native ? !(mask.owner as HTMLDialogElement).open : !mask.owner.isConnected || view.getComputedStyle(mask.owner).display==='none')) {
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
    function tick(now: number) {
      if (disposed || doc.hidden || media.matches || !layer.isConnected || layer.closest('[hidden]') || cancelWhen()) return stop();
      if(now-start<holdMs){raf=view.requestAnimationFrame(tick);return;}
      if(wrapper.dataset.saxDissolvePhase!=='playing')wrapper.dataset.saxDissolvePhase='playing';
      const elapsed=clamp((now-start-holdMs)/duration), f=dissolveFrame(1-(1-elapsed)**3);
      if(veil && mask)veil.style.opacity=String(Number(mask.opacity)*(1-elapsed));
      threshold.setAttribute('slope',String(f.slope));threshold.setAttribute('intercept',String(f.intercept));displacement.setAttribute('scale',String(f.scale));offset.setAttribute('dx',String(f.dx));offset.setAttribute('dy',String(f.dy));alpha.setAttribute('slope',String(f.alpha));
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
