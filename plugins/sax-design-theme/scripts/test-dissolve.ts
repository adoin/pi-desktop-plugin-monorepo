import assert from 'node:assert/strict';
import path from 'node:path';
import url from 'node:url';
import { launchBrowser } from '@pi-plugins/test-utils';
import { buildDirectory } from '../../../scripts/workspace.ts';
import type {} from '../runtime-types.ts';
type GhostEvent = { text: string; inert: boolean; hidden: string | null; pointer: string };
type TestWindow = Window & typeof globalThis & {
 seen: GhostEvent[];
 rasterCleanup(): void;
};
const sleep=(ms: number)=>new Promise<void>(r=>setTimeout(r,ms));
(async()=>{
 const browser=await launchBrowser();
 try{
  const page=await browser.newPage();await page.setViewport({width:1100,height:1000});const errors:string[]=[];page.on('pageerror',e=>errors.push(e instanceof Error ? e.message : String(e)));
  // tsx preserves nested function names with this helper when callbacks are serialized.
  await page.evaluateOnNewDocument('globalThis.__name = (fn, name) => Object.defineProperty(fn, "name", { value: name, configurable: true });');
  await page.goto(url.pathToFileURL(path.join(buildDirectory(path.resolve(__dirname, '..')), 'renderer/dissolve.html')).href);await page.waitForFunction(()=>!!(window as TestWindow).saxDissolveTest);await sleep(450);
  await page.evaluate(()=>{const w=window as TestWindow;w.seen=[];const logged=new WeakSet<Node>();const record=(n:Node)=>{if(n instanceof HTMLElement&&n.hasAttribute('data-sax-dissolve-ghost')&&n.dataset.saxDissolvePhase==='playing'&&!logged.has(n)){logged.add(n);w.seen.push({text:n.textContent!,inert:n.inert,hidden:n.getAttribute('aria-hidden'),pointer:getComputedStyle(n).pointerEvents});}};new MutationObserver(records=>{for(const r of records){if(r.type==='attributes')record(r.target);for(const n of r.addedNodes)record(n);}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-sax-dissolve-phase']});});
  const clear=()=>page.evaluate(()=>(window as TestWindow).seen=[]);
  const rowEvents=()=>page.evaluate(()=>(window as TestWindow).seen.filter(e=>e.text.includes('粒子消失试验')).length);
  const clean=async()=>{await sleep(600);assert.equal(await page.$$eval('[data-sax-dissolve-ghost]',a=>a.length),0,'ghost cleanup');};
  const menu=async()=>{await page.click('[data-sidebar-session-row="demo-1"] [data-action="session-menu"]');await sleep(300);};
  const reset=async()=>{await page.click('#reset');await sleep(400);await clear();};
  // Native top-layer dialog closes immediately; only the clone remains.
  await page.click('#dialog-open');await sleep(350);
  const handoff=await page.evaluate(()=>new Promise<{ghost:boolean;veil:boolean;closed:boolean}>(resolve=>{document.getElementById('dialog-close')!.click();requestAnimationFrame(()=>resolve({ghost:!!document.querySelector('[data-sax-dissolve-ghost]'),veil:!!document.querySelector('[data-sax-dissolve-veil]'),closed:!(document.getElementById('particle-dialog') as HTMLDialogElement).open}));}));
  assert.deepEqual(handoff,{ghost:true,veil:true,closed:true},'first paint must already contain the ghost and backdrop');
  await page.waitForFunction(()=>(window as TestWindow).seen.some(e=>e.text.includes('关闭后溶解')));
  const safe=await page.evaluate(()=>{const g=document.querySelector('[data-sax-dissolve-ghost]');return {privateCopied:g?.textContent!.includes('PRIVATE-FIELD-TEST'),interactive:g?.querySelectorAll('input,textarea,button,a,script,iframe,[onclick]').length,ids:g?[...g.querySelectorAll('[id]')].map(e=>e.localName):[],nativeClosed:!(document.getElementById('particle-dialog') as HTMLDialogElement).open};});
  assert.equal(safe.privateCopied,false);assert.equal(safe.interactive,0);assert.ok(safe.ids.every(t=>t==='filter'));assert.equal(safe.nativeClosed,true);await clean();
  // First click only arms Delete, second confirms. Failure does not remove row.
  await menu();await page.click('[data-action="delete-session"]');await sleep(350);assert.equal(await rowEvents(),0);assert.ok(await page.$('[data-sidebar-session-row="demo-1"]'));
  await page.click('[data-action="delete-session"]');await page.waitForFunction(()=>(window as TestWindow).seen.some(e=>e.text.includes('任务 1 · 粒子消失试验')));assert.equal(await rowEvents(),1);await clean();
  await reset();await page.select('#outcome','failure');await menu();await page.click('[data-action="delete-session"]');await page.click('[data-action="delete-session"]');await clean();assert.equal(await rowEvents(),0);
  // Archive rollback must cancel a pending visual exit.
  await reset();await page.select('#outcome','rollback');await menu();await page.click('[data-action="toggle-session-archive"]');await clean();assert.equal(await rowEvents(),0);assert.ok(await page.$('[data-sidebar-session-row="demo-1"]'));
  // Archive visible rows remain visible; no exit when only class changes.
  await reset();await page.select('#outcome','success');await page.click('#show-archived');await menu();await page.click('[data-action="toggle-session-archive"]');await clean();assert.equal(await rowEvents(),0);assert.ok(await page.$('[data-sidebar-session-row="demo-1"].archived'));
  await reset();await page.click('#show-archived');await menu();await page.click('[data-action="toggle-session-archive"]');await page.waitForFunction(()=>(window as TestWindow).seen.some(e=>e.text.includes('任务 1 · 粒子消失试验')));await clean();
  // Collapse, DOM replacement/reorder, and unprompted removals must not dissolve tasks.
  await reset();await page.click('#collapse');await clean();assert.equal(await rowEvents(),0);await page.click('#collapse');await sleep(400);await page.evaluate(()=>{const row=document.querySelector('[data-sidebar-session-row="demo-1"]')!;row.parentElement!.append(row);});await clean();assert.equal(await rowEvents(),0);
  await page.evaluate(()=>document.querySelector('[data-sidebar-session-row="demo-1"]')!.remove());await clean();assert.equal(await rowEvents(),0);
  // Toast auto-removal uses the same observer.
  await clear();await page.click('#toast-show');await page.waitForFunction(()=>(window as TestWindow).seen.some(e=>e.text.includes('操作完成')), {timeout:5000});await clean();
  // Dark-mode capture and task adapter.
  await page.click('#mode');await sleep(450);await reset();await menu();await page.click('[data-action="delete-session"]');await page.click('[data-action="delete-session"]');await page.waitForFunction(()=>(window as TestWindow).seen.some(e=>e.text.includes('任务 1 · 粒子消失试验')));await clean();
  // Reduced motion and inactive themes never create snapshots on removal.
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await sleep(400);await clear();await page.click('#dialog-open');await sleep(100);await page.click('#dialog-close');await clean();assert.equal(await page.evaluate(()=>(window as TestWindow).seen.length),0);
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);await page.evaluate(()=>document.documentElement.dataset.pluginTheme='builtin');await sleep(400);await clear();await page.click('#dialog-open');await sleep(300);await page.click('#dialog-close');await clean();assert.equal(await page.evaluate(()=>(window as TestWindow).seen.length),0);
  await page.evaluate(()=>document.documentElement.dataset.pluginTheme='plugin:local.pi-desktop-sax-theme:sax-dark');await sleep(400);
  await reset();await page.evaluate(()=>document.querySelector('[data-sidebar-session-row="demo-1"]')!.classList.add('active'));await menu();
  await page.evaluate(()=>{const b=document.querySelector<HTMLElement>('[data-action="toggle-session-archive"]')!;b.onclick=()=>{const row=document.querySelector('[data-sidebar-session-row="demo-1"]')!,parent=row.parentElement!;document.querySelector('.sidebar-floating-menu')!.remove();row.remove();setTimeout(()=>parent.append(row),750);};b.click();});
  await sleep(1000);assert.equal(await rowEvents(),0,'active task slow rollback must not dissolve');
  await reset();
  const safety=await page.evaluate(()=>{const {captureSurface}=(window as TestWindow).saxDissolveTest;const parent=document.createElement('div'),child=document.createElement('div');Object.assign(parent.style,{position:'fixed',left:'10px',top:'10px',width:'200px',height:'100px'});Object.assign(child.style,{width:'150px',height:'60px'});child.textContent='test';parent.append(child);document.body.append(parent);const sensitive=document.createElement('span');sensitive.dataset.sensitive='true';sensitive.textContent='sensitive';child.append(sensitive);const redacted=captureSurface(child)===null;sensitive.remove();parent.style.opacity='0';const invisible=captureSurface(child)===null;parent.style.opacity='1';parent.style.overflow='hidden';parent.style.width='10px';const clipped=captureSurface(child)===null;parent.remove();return {redacted,invisible,clipped};});assert.deepEqual(safety,{redacted:true,invisible:true,clipped:true});
  // Resource limits, redaction, independent filters, unload cleanup.
  const limits=await page.evaluate(()=>{
   const {captureSurface,createDissolveEngine,mockPi}=(window as TestWindow).saxDissolveTest;
   const source=document.querySelector('[data-sidebar-session-row]');const layer=mockPi.ui.openLayer(),engine=createDissolveEngine(layer.element,{duration:800});
   const limited=captureSurface(source,{maxNodes:1})===null;
   for(let i=0;i<6;i++)engine.play(captureSurface(source));
   const count=engine.activeCount,filters=[...layer.element.querySelectorAll('filter')].map(n=>n.id),inert=[...layer.element.querySelectorAll<HTMLElement>('[data-sax-dissolve-ghost]')].every(n=>n.inert&&getComputedStyle(n).pointerEvents==='none');
   engine.dispose();const remains=layer.element.childElementCount;layer.close();return {limited,count,unique:new Set(filters).size===filters.length,inert,remains};
  });assert.deepEqual(limits,{limited:true,count:3,unique:true,inert:true,remains:0});
  // Raster regression: the source is gone, so screenshots measure only the real SVG ghost.
  await page.evaluate(()=>{const {captureSurface,createDissolveEngine,mockPi}=(window as TestWindow).saxDissolveTest;const n=document.createElement('div');n.textContent='SVG 粒子 · Visual dissolve';Object.assign(n.style,{position:'fixed',left:'300px',top:'150px',width:'300px',height:'100px',padding:'20px',background:'hsl(252 85% 60%)',color:'white',fontSize:'22px'});document.body.append(n);const snapshot=captureSurface(n);n.remove();const layer=mockPi.ui.openLayer();const engine=createDissolveEngine(layer.element,{duration:1500});(window as TestWindow).rasterCleanup=()=>{engine.dispose();layer.close();};engine.play(snapshot);});
  const before=await page.screenshot({captureBeyondViewport:false,clip:{x:300,y:150,width:300,height:100}});await sleep(650);
  const during=await page.screenshot({captureBeyondViewport:false,clip:{x:300,y:150,width:300,height:100}});
  assert.ok(!Buffer.from(before).equals(Buffer.from(during)), 'SVG raster must change while dissolving');
  await page.evaluate(()=>(window as TestWindow).rasterCleanup());
  await page.click('#stop');assert.equal(await page.$$eval('[data-sax-dissolve-layer]',a=>a.length),0);await clear();await page.click('#dialog-open');await sleep(300);await page.click('#dialog-close');await clean();assert.equal(await page.evaluate(()=>(window as TestWindow).seen.length),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: dialog clone, sanitized snapshots, confirmed delete/archive, failed actions, rollback, archived visibility, collapse/reorder, Toast, dark mode, reduced motion, inactive theme, concurrency and unload.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
