/* ===== 音乐悬浮窗：全局显示，可收成只滚动歌名的小胶囊 ===== */
window.MusicDock=(function(){
  let root=null, unsub=null, collapsed=false, lastId=null, marqueeRaf=null;
  let drag=null, suppressClick=false;
  const POS_KEY='aster_music_dock_pos_v1';

  function readPos(){
    try{
      const p=JSON.parse(localStorage.getItem(POS_KEY)||'null');
      return p&&isFinite(p.x)&&isFinite(p.y)?p:null;
    }catch(e){ return null; }
  }
  function savePos(){
    if(!root||!root.classList.contains('positioned')) return;
    try{ localStorage.setItem(POS_KEY,JSON.stringify({x:parseFloat(root.style.left)||0,y:parseFloat(root.style.top)||0})); }catch(e){}
  }
  function applyPos(x,y){
    if(!root) return;
    const r=root.getBoundingClientRect();
    const maxX=Math.max(6,innerWidth-r.width-6);
    const maxY=Math.max(6,innerHeight-r.height-6);
    const nx=Math.max(6,Math.min(maxX,x));
    const ny=Math.max(6,Math.min(maxY,y));
    root.style.left=nx+'px';
    root.style.top=ny+'px';
    root.style.bottom='auto';
    root.style.transform='none';
    root.classList.add('positioned');
  }
  function clampPos(){
    if(!root||!root.classList.contains('positioned')) return;
    const r=root.getBoundingClientRect();
    applyPos(parseFloat(root.style.left)||r.left,parseFloat(root.style.top)||r.top);
  }
  function restorePos(){
    const p=readPos();
    if(!p||!root) return;
    requestAnimationFrame(()=>applyPos(p.x,p.y));
  }
  function dragStart(e){
    if(!root) return;
    if(e.button!==undefined&&e.button!==0) return;
    if(e.target.closest&&e.target.closest('button,#mdProgress')) return;
    const r=root.getBoundingClientRect();
    drag={sx:e.clientX,sy:e.clientY,ox:r.left,oy:r.top,moved:false,id:e.pointerId};
    root.classList.add('dragging');
    try{ root.setPointerCapture(e.pointerId); }catch(err){}
    e.preventDefault();
  }
  function dragMove(e){
    if(!drag) return;
    const dx=e.clientX-drag.sx, dy=e.clientY-drag.sy;
    if(Math.abs(dx)>3||Math.abs(dy)>3) drag.moved=true;
    applyPos(drag.ox+dx,drag.oy+dy);
  }
  function dragEnd(e){
    if(!drag) return;
    const moved=drag.moved;
    const id=drag.id;
    drag=null;
    if(root) root.classList.remove('dragging');
    try{ if(root) root.releasePointerCapture(id); }catch(err){}
    if(moved){
      savePos();
      suppressClick=true;
      setTimeout(()=>{ suppressClick=false; },350);
    }
  }

  function routeName(){
    const h=location.hash.replace(/^#\/?/,'');
    return h.split('/')[0]||'chats';
  }
  function splashOpen(){
    const s=document.getElementById('splash');
    return !!(s&&!s.classList.contains('out'));
  }
  function ensure(){
    if(root) return root;
    root=document.createElement('div');
    root.className='music-dock';
    root.innerHTML=
      '<div class="md-main">'
      +'<div class="md-info">'
      +'<div class="md-title-mask"><div class="md-title-track" id="mdTrack"><span id="mdT1"></span><span id="mdT2" aria-hidden="true"></span></div></div>'
      +'<div class="md-sub" id="mdArtist"></div>'
      +'</div>'
      +'<button class="md-close-collapsed" id="mdCloseCollapsed" aria-label="关闭播放">'+I.x(12)+'</button>'
      +'<div class="md-actions">'
        +'<button class="md-prev" id="mdPrev" aria-label="上一首">'+I.prev(15)+'</button>'
        +'<button class="md-play" id="mdPlay" aria-label="播放/暂停">'+I.play(13)+'</button>'
        +'<button class="md-next" id="mdNext" aria-label="下一首">'+I.next(15)+'</button>'
        +'<button class="md-close" id="mdClose" aria-label="关闭播放">'+I.x(13)+'</button>'
        +'<button class="md-collapse" id="mdMin" aria-label="收起">'+I.chevronDown(14)+'</button>'
      +'</div></div>'
      +'<div class="md-progress" id="mdProgress"><i id="mdProg"></i></div>';
    document.body.appendChild(root);
    root.addEventListener('pointerdown',dragStart);
    window.addEventListener('pointermove',dragMove);
    window.addEventListener('pointerup',dragEnd);
    window.addEventListener('pointercancel',dragEnd);
    root.querySelector('#mdPrev').onclick=e=>{ e.stopPropagation(); MusicPlayer.prev(); };
    root.querySelector('#mdPlay').onclick=e=>{ e.stopPropagation(); MusicPlayer.toggle(); };
    root.querySelector('#mdNext').onclick=e=>{ e.stopPropagation(); MusicPlayer.next(); };
    root.querySelector('#mdClose').onclick=e=>{ e.stopPropagation(); MusicPlayer.stop(); hide(); };
    root.querySelector('#mdCloseCollapsed').onclick=e=>{ e.stopPropagation(); MusicPlayer.stop(); hide(); };
    root.querySelector('#mdMin').onclick=e=>{ e.stopPropagation(); collapsed=true; paintCollapsed(); };
    root.querySelector('#mdProgress').onclick=e=>{
      e.stopPropagation();
      const r=e.currentTarget.getBoundingClientRect();
      MusicPlayer.seek((e.clientX-r.left)/r.width);
    };
    root.addEventListener('click',e=>{
      if(suppressClick){ suppressClick=false; e.stopPropagation(); return; }
      if(e.target.closest('button')) return;
      if(e.target.closest('#mdProgress')) return;
      if(collapsed){ collapsed=false; paintCollapsed(); return; }
      location.hash='#/life-music';
    });
    restorePos();
    return root;
  }
  function paintCollapsed(){
    if(!root) return;
    root.classList.toggle('collapsed',collapsed);
    requestAnimationFrame(()=>{ clampPos(); measureMarquee(); });
    setTimeout(clampPos,260);
  }
  function measureMarquee(){
    if(!root) return;
    const mask=root.querySelector('.md-title-mask');
    const track=root.querySelector('.md-title-track');
    if(!mask||!track) return;
    track.classList.remove('scroll');
    if(!collapsed) return;
    const t=track.querySelector('span');
    if(!t) return;
    const over=t.scrollWidth>mask.clientWidth+2;
    if(over){
      const dur=Math.max(9,Math.min(18,t.scrollWidth/22));
      track.style.setProperty('--md-dur',dur.toFixed(1)+'s');
      void track.offsetWidth;
      track.classList.add('scroll');
    }
  }
  function hide(){
    if(root){ root.classList.remove('show'); }
  }
  function update(){
    if(!window.Store||!Store.state) return;
    if(splashOpen()||routeName()==='life-music'){ hide(); return; }
    const s=MusicPlayer.getState();
    if(!s.track){ hide(); return; }
    const box=ensure();
    const changed=lastId!==s.track.id;
    lastId=s.track.id;
    if(changed){
      const title=s.track.title||'未命名';
      const artist=s.track.artist||'';
      box.querySelector('#mdT1').textContent=title;
      box.querySelector('#mdT2').textContent=title;
      box.querySelector('#mdArtist').textContent=artist;
      paintCollapsed();
      requestAnimationFrame(measureMarquee);
    }
    box.querySelector('#mdPlay').innerHTML=s.playing?I.pause(13):I.play(13);
    box.querySelector('#mdProg').style.width=(s.duration?Math.max(0,Math.min(1,s.currentTime/s.duration))*100:0)+'%';
    box.classList.add('show');
  }

  window.addEventListener('hashchange',()=>setTimeout(update,20));
  window.addEventListener('resize',()=>{ clampPos(); requestAnimationFrame(measureMarquee); });
  function start(){
    if(!window.Store||!Store.state){ setTimeout(start,80); return; }
    if(!unsub) unsub=MusicPlayer.subscribe(update);
    setTimeout(update,400);
  }
  start();
  return {refresh:update,get collapsed(){return collapsed;}};
})();
