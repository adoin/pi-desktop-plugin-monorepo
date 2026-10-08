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
