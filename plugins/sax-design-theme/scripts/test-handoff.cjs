const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {launchBrowser}=require('@pi-plugins/test-utils');
 const browser=await launchBrowser();
 try{
  const page=await browser.newPage();await page.setViewport({width:1100,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../renderer/dissolve.html')).href);await sleep(500);
  const modes=[];
  for(const mode of ['light','dark']){
   if(mode==='dark'){await page.click('#mode');await sleep(400);await page.click('#reset');await sleep(400);}
   await page.click('[data-sidebar-session-row="demo-1"] [data-action="session-menu"]');await sleep(300);await page.click('[data-action="delete-session"]');
   const frames=await page.evaluate(()=>new Promise(resolve=>{const frames=[],start=performance.now();document.querySelector('[data-action="delete-session"]').click();function tick(now){const row=document.querySelector('[data-sidebar-session-row="demo-1"]');const ghost=[...document.querySelectorAll('[data-sax-dissolve-ghost]')].find(n=>n.textContent.includes('任务 1 · 粒子消失试验'));frames.push({time:now-start,state:row?'live':ghost?ghost.dataset.saxDissolvePhase:'gone'});if(now-start<750)requestAnimationFrame(tick);else resolve(frames);}requestAnimationFrame(tick);}));
   const firstAbsent=frames.find(f=>f.state!=='live');assert.equal(firstAbsent.state,'holding','first absent-row paint must already contain held ghost');
   let disappeared=false;for(const frame of frames){if(frame.state==='gone')disappeared=true;else assert.ok(!disappeared,'a removed row must never flash back');}
   assert.ok(frames.some(f=>f.state==='playing'));assert.equal(frames.at(-1).state,'gone');modes.push({mode,frames:frames.length,firstExit:firstAbsent.state});
  }
  // A host fade/scale exit must not be replayed from the full-opacity cache.
  const before=await page.evaluate(()=>{const n=document.createElement('div');n.className='dialog';n.setAttribute('role','dialog');n.id='fade-fixture';n.textContent='already faded';Object.assign(n.style,{position:'fixed',top:'150px',left:'200px',width:'300px',height:'100px',background:'white'});document.body.append(n);return window.saxDissolveTest.controller.stats.played;});
  await sleep(400);await page.evaluate(()=>{const n=document.getElementById('fade-fixture');n.classList.add('closing');n.style.opacity='0';});await sleep(200);await page.evaluate(()=>document.getElementById('fade-fixture').remove());await sleep(350);
  assert.equal(await page.evaluate(()=>window.saxDissolveTest.controller.stats.played),before,'no second exit after host fade');
  // Reopening a closed native dialog cancels its previous ghost on the next frame.
  await page.click('#dialog-open');await sleep(350);
  const reopened=await page.evaluate(()=>new Promise(resolve=>{document.getElementById('dialog-close').click();requestAnimationFrame(()=>{document.getElementById('particle-dialog').showModal();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({ghosts:document.querySelectorAll('[data-sax-dissolve-ghost]').length,veils:document.querySelectorAll('[data-sax-dissolve-veil]').length,open:document.getElementById('particle-dialog').open})));});}));
  assert.deepEqual(reopened,{ghosts:0,veils:0,open:true});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:modes,noFadeReplay:true,reopenCleanup:true,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
