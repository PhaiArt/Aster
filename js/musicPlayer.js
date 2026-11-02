/* ===== 全局音乐播放器：离开音乐页不中断，供悬浮窗共用 ===== */
window.MusicPlayer=(function(){
  let audio=null, current=null, loading=false;
  const listeners=[];

  function queue(){
    if(!window.Store||!Store.state||!Store.state.app) return [];
    return (Store.state.app.lifeMusic||[]).slice().sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));
  }
  function find(id){ return queue().find(t=>t.id===id)||null; }
  function fmt(s){ s=Math.max(0,Math.floor(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
  function state(){
    const fresh=current?find(current.id):null;
    if(fresh) current=fresh;
    return {
      track:current,
      playing:!!(audio&&!audio.paused),
      currentTime:audio?audio.currentTime||0:0,
      duration:audio&&isFinite(audio.duration)?audio.duration:0,
      loading:loading,
      queue:queue()
    };
  }
  function emit(){
    const s=state();
    listeners.slice().forEach(fn=>{ try{ fn(s); }catch(e){ console.warn('music listener',e); } });
  }
  function sub(fn){
    listeners.push(fn);
    try{ fn(state()); }catch(e){}
    return ()=>{ const i=listeners.indexOf(fn); if(i>=0) listeners.splice(i,1); };
  }
  async function srcOf(t){
    if(!t) return null;
    if(t.kind==='file') return DB.url(t.blobId);
    return t.url||null;
  }
  function ensureAudio(){
    if(audio) return audio;
    audio=new Audio();
    audio.preload='metadata';
    audio.addEventListener('loadedmetadata',emit);
    audio.addEventListener('durationchange',emit);
    audio.addEventListener('timeupdate',emit);
    audio.addEventListener('play',()=>{ setMedia(); emit(); });
    audio.addEventListener('pause',emit);
    audio.addEventListener('ended',()=>{ next(); });
    audio.addEventListener('error',()=>{ loading=false; UI.toast('播放失败，可能是版权或网络限制'); emit(); });
    return audio;
  }
  function setMedia(){
    if(!('mediaSession' in navigator)||!current) return;
    try{
      if(window.MediaMetadata){
        navigator.mediaSession.metadata=new MediaMetadata({
          title:current.title||'未命名',
          artist:current.artist||'',
          album:'Aster'
        });
      }
      navigator.mediaSession.setActionHandler('play',()=>toggle());
      navigator.mediaSession.setActionHandler('pause',()=>toggle());
      navigator.mediaSession.setActionHandler('previoustrack',()=>prev());
      navigator.mediaSession.setActionHandler('nexttrack',()=>next());
    }catch(e){}
  }
  async function playTrack(t){
    if(!t) return;
    if(current&&current.id===t.id&&audio){
      if(audio.paused){ try{ await audio.play(); }catch(e){ UI.toast('播放失败'); } }
      else audio.pause();
      emit();
      return;
    }
    const src=await srcOf(t);
    if(!src){ UI.toast('找不到音频文件'); return; }
    current=t;
    loading=true;
    emit();
    const a=ensureAudio();
    try{
      a.pause();
      a.src=src;
      a.currentTime=0;
      await a.play();
      setMedia();
    }catch(e){
      UI.toast('播放失败，可能是版权或网络限制');
    }finally{
      loading=false;
      emit();
    }
  }
  function toggle(){
    if(current&&audio){
      if(audio.paused) audio.play().then(()=>emit()).catch(()=>UI.toast('播放失败'));
      else audio.pause();
      return;
    }
    const q=queue();
    if(q.length) playTrack(q[0]);
  }
  function step(dir){
    const q=queue();
    if(!q.length) return;
    let i=q.findIndex(t=>current&&t.id===current.id);
    if(i<0) i=dir>0?-1:0;
    i=(i+dir+q.length)%q.length;
    playTrack(q[i]);
  }
  function next(){ step(1); }
  function prev(){ step(-1); }
  function seek(ratio){
    if(!audio||!isFinite(audio.duration)||!audio.duration) return;
    audio.currentTime=Math.max(0,Math.min(1,ratio))*audio.duration;
    emit();
  }
  function stop(){
    if(audio){ audio.pause(); try{ audio.removeAttribute('src'); audio.load(); }catch(e){} }
    current=null; loading=false; emit();
  }

  return {queue,getState:state,subscribe:sub,play:playTrack,toggle,next,prev,seek,stop,fmt};
})();
