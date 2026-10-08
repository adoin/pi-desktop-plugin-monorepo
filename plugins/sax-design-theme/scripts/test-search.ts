import assert from 'node:assert/strict';
import path from 'node:path';
import url from 'node:url';
import { launchBrowser } from '@pi-plugins/test-utils';
import { buildDirectory } from '../../../scripts/workspace.ts';
(async()=>{
 const browser=await launchBrowser();
 try{
  const page=await browser.newPage();await page.setViewport({width:1200,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e instanceof Error ? e.message : String(e)));
  await page.goto(url.pathToFileURL(path.join(buildDirectory(path.resolve(__dirname, '..')), 'renderer/search.html')).href);const results=[];
  for(const mode of ['light','dark']){
   if(mode==='dark'){await page.click('#mode');await page.waitForFunction(()=>getComputedStyle(document.documentElement).colorScheme==='dark');}
   await page.click('#query');
   const styles=await page.evaluate(()=>{const p=getComputedStyle(document.querySelector('.search-dialog')!),o=getComputedStyle(document.querySelector('.search-overlay')!),i=getComputedStyle(document.querySelector('.search-input')!),s=getComputedStyle(document.querySelector('.search-item.active')!);return {panel:p.backgroundColor,veil:o.backgroundColor,blur:o.backdropFilter,radius:p.borderRadius,inputShadow:i.boxShadow,inputBackground:i.backgroundColor,active:s.backgroundColor};});
   assert.ok(styles.panel.startsWith('rgb('),'panel must be opaque');assert.equal(styles.radius,'8px');assert.equal(styles.inputShadow,'none');assert.equal(styles.inputBackground,'rgba(0, 0, 0, 0)');assert.ok(styles.veil.endsWith(mode==='light'?'0.1)':'0.24)'));assert.equal(styles.blur,'blur(10px)');
   await page.keyboard.press('ArrowDown');assert.ok(await page.$eval('.search-item.active',e=>e.textContent!.includes('创建 Pi-Desktop')));
   await page.type('#query','不存在的内容');assert.ok(await page.$('.search-empty'));await page.focus('#query');await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await page.type('#query','粒子');assert.equal(await page.$$eval('.search-item',a=>a.length),1);
   await page.keyboard.press('Enter');assert.equal(await page.$eval('#overlay',e=>(e as HTMLElement).hidden),true);assert.equal(await page.evaluate(()=>document.activeElement!.id),'reopen');await page.click('#reopen');await page.focus('#query');await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');
   results.push({mode,...styles});
  }
  await page.setViewport({width:480,height:700});const layout=await page.evaluate(()=>{const r=document.querySelector('.search-dialog')!.getBoundingClientRect();return {inside:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};});assert.equal(layout.inside,true);assert.equal(layout.overflow,false);
  await page.keyboard.press('Escape');assert.equal(await page.$eval('#overlay',e=>(e as HTMLElement).hidden),true);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:results,narrowLayout:layout,keyboard:true,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
