/* ===== 一起听：双人同步页 ===== */
window.Pages=window.Pages||{};

Pages.lifeTogether=function(el){
  const st=Store.state;
  const tracks=(st.app.lifeMusic||[]).slice().sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));
  const contacts=st.contacts||[];
  let roleId=null, sec=0, timer=null, audio=null, currentId=null;
  let sessionStarted=false;

  const root=LifeUI.shell(el,'一起听');

  function fmt(sec){
    sec=Math.max(0,Math.floor(sec||0));
    const h=Math.floor(sec/3600);
    const m=Math.floor((sec%3600)/60);
    const s=sec%60;
    return (h?h+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  function coverHTML(t){
    if(t&&t.cover) return '<img src="'+U.esc(t.cover)+'" alt="">';
    return '<i class="tg-cover-art"></i>';
  }
  function render(){
    const hist=(st.app.lifeTogetherHistory||[]).slice(-5).reverse();
    root.innerHTML=
      '<div class="together-page">'
      +(tracks.length
        ?'<div id="tg-picker">'
          +'<div class="together-invite">'
            +'<div class="together-invite-av">'+UI.avatar('me',54)+'<span>+</span>'+UI.avatar('__empty',54)+'</div>'
            +'<h2>邀请一个角色<br>一起听一会儿</h2>'
            +'<p>同步播放，只记录一起听了几分钟，不显示位置距离。</p>'
          +'</div>'
          +'<div class="ld-sec">选择角色</div>'
          +'<div class="ld-list" id="tg-roles">'+contacts.map(c=>
              '<button class="ld-item" data-tg-role="'+c.id+'">'+UI.avatar(c.id,38)
              +'<div class="grow"><div class="ld-item-title">'+U.esc(c.remark||c.name)+'</div><div class="ld-item-sub">邀请 TA 一起听</div></div>'
              +'<span class="chev" style="color:var(--text-3)">'+I.chevronRight(16)+'</span></button>').join('')+'</div>'
        +'</div>'
        :'<div class="ld-empty" style="margin-top:10px">音乐库还是空的<br><span class="tiny">先去听音乐页导入一首歌</span></div>')

      +'<div id="tg-session" hidden>'
        +'<div class="together-hero">'
          +'<div class="together-pair"><div class="together-av" id="tg-av-me">'+UI.avatar('me',58)+'</div><div class="together-wave"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="together-av role" id="tg-av-role"></div></div>'
          +'<div class="together-with" id="tg-with">和角色一起听</div>'
          +'<div class="together-timer"><b id="tg-time">00:00</b><span>已经一起听</span></div>'
          +'<div class="together-sync"><i></i>同步播放中</div>'
        +'</div>'
        +'<div class="together-now">'
          +'<div class="together-cover" id="tg-cover"></div>'
          +'<div class="tg-now-meta"><b id="tg-title">—</b><span id="tg-artist">—</span></div>'
          +'<button class="tg-play" id="tg-play">'+I.play(15)+'</button>'
        +'</div>'
        +'<div class="together-bar"><i id="tg-prog"></i></div>'
        +'<div class="ld-sec">一起听歌单 <span class="ld-count">'+tracks.length+' 首</span></div>'
        +'<div class="ld-list" id="tg-queue">'+tracks.map(t=>
            '<div class="ld-item" data-tg-track="'+t.id+'">'
            +'<div class="tg-thumb">'+(t.cover?'<img src="'+U.esc(t.cover)+'" alt="">':'')+'</div>'
            +'<div class="grow"><div class="ld-item-title">'+U.esc(t.title)+'</div><div class="ld-item-sub">'+U.esc(t.artist||'')+'</div></div>'
            +'<span class="tg-eq">'+I.play(12)+'</span></div>').join('')+'</div>'
        +'<button class="together-end" id="tg-end">结束一起听</button>'
        +'</div>'

      +'<div class="ld-sec">一起听记录 <span class="ld-count">'+hist.length+' 次</span></div>'
      +(hist.length?'<div class="ld-list" id="tg-history">'+hist.map(x=>
          '<div class="ld-item"><div class="tg-hist-av">'+UI.avatar(x.roleId,32)+'</div>'
          +'<div class="grow"><div class="ld-item-title">'+U.esc(Store.displayName(x.roleId))+'</div>'
          +'<div class="ld-item-sub">'+U.esc(x.trackTitle||'一起听')+' · '+fmt(x.seconds)+'</div></div>'
          +'<span class="ld-item-sub">'+LifeUI.fmtShort(LifeUI.iso(new Date(x.endedAt)))+'</span></div>').join('')+'</div>'
        :'<div class="ld-empty" id="tg-history">还没有一起听记录</div>')
      +'</div>';

    UI.mountBlobs(el);
    bind();
    if(!tracks.length){ Pages._cleanup=()=>{}; return; }
    if(sessionStarted&&roleId) showSession(false);
  }

  function bind(){
    U.$$('[data-tg-role]',el).forEach(b=>b.onclick=()=>start(b.dataset.tgRole));
    if(U.$('#tg-play',el)) U.$('#tg-play',el).onclick=()=>toggleAudio();
    if(U.$('#tg-end',el)) U.$('#tg-end',el).onclick=()=>end();
    U.$$('[data-tg-track]',el).forEach(b=>b.onclick=()=>{
      const t=tracks.find(x=>x.id===b.dataset.tgTrack);
      if(t) playTrack(t);
    });
  }

  function paintSession(){
    if(!roleId) return;
    const av=U.$('#tg-av-role',el);
    if(av){ av.innerHTML=UI.avatar(roleId,58); UI.mountBlobs(av); }
    U.$('#tg-with',el).textContent='和 '+Store.displayName(roleId)+' 一起听';
    U.$('#tg-time',el).textContent=fmt(sec);
  }
  function showSession(start){
    const picker=U.$('#tg-picker',el), box=U.$('#tg-session',el);
    if(picker) picker.hidden=true;
    if(box) box.hidden=false;
    if(start){ sec=0; sessionStarted=true; paintSession(); clearInterval(timer); timer=setInterval(()=>{ sec++; const e=U.$('#tg-time',el); if(e) e.textContent=fmt(sec); },1000); if(tracks.length) playTrack(tracks[0]); }
    else paintSession();
  }
  function start(id){
    roleId=id;
    showSession(true);
  }
  async function srcOf(t){
    if(!t) return null;
    if(t.kind==='file') return DB.url(t.blobId);
    return t.url||null;
  }
  async function playTrack(t){
    if(!t) return;
    if(audio){ audio.pause(); audio.src=''; audio=null; }
    const src=await srcOf(t);
    currentId=t.id;
    const cover=U.$('#tg-cover',el);
    if(cover) cover.innerHTML=coverHTML(t);
    U.$('#tg-title',el).textContent=t.title||'—';
    U.$('#tg-artist',el).textContent=t.artist||'';
    U.$$('[data-tg-track]',el).forEach(x=>x.classList.toggle('active',x.dataset.tgTrack===t.id));
    if(!src){ UI.toast('找不到音频文件'); return; }
    audio=new Audio(src);
    audio.onplay=()=>{ const b=U.$('#tg-play',el); if(b) b.innerHTML=I.pause(15); };
    audio.onpause=()=>{ const b=U.$('#tg-play',el); if(b) b.innerHTML=I.play(15); };
    audio.ontimeupdate=()=>{ if(!audio) return; const bar=U.$('#tg-prog',el); if(bar&&audio.duration) bar.style.width=(audio.currentTime/audio.duration*100)+'%'; };
    audio.onerror=()=>UI.toast('播放失败，可能是版权或网络限制');
    try{ await audio.play(); }catch(e){ UI.toast('播放失败，可能是版权或网络限制'); }
  }
  function toggleAudio(){
    if(!audio){ if(tracks.length) playTrack(tracks[0]); return; }
    if(audio.paused) audio.play().catch(()=>UI.toast('播放失败'));
    else audio.pause();
  }
  function end(){
    if(roleId&&sec>0){
      const h=Store.state.app.lifeTogetherHistory||[];
      h.push({roleId,seconds:sec,trackTitle:(tracks.find(t=>t.id===currentId)||{}).title||'一起听',endedAt:Date.now()});
      if(h.length>30) h.splice(0,h.length-30);
      Store.save();
    }
    clearInterval(timer); timer=null;
    if(audio){ audio.pause(); audio.src=''; audio=null; }
    roleId=null; currentId=null; sec=0; sessionStarted=false;
    render();
    UI.toast('已结束一起听');
  }

  render();
  Pages._cleanup=()=>{ clearInterval(timer); timer=null; if(audio){ audio.pause(); audio.src=''; audio=null; } };
};
