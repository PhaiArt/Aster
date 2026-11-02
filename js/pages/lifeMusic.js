/* ===== 听音乐：精装播放页 ===== */
window.Pages=window.Pages||{};

/* 聊天 / 动态里的音乐卡只带快照；点击时回到本地音乐库播放。 */
Pages.playSharedMusic=function(trackId){
  const t=(Store.state.app.lifeMusic||[]).find(x=>x.id===trackId);
  if(!t){ UI.toast('这首歌已从音乐库移除'); return; }
  try{ if(window.MusicPlayer) MusicPlayer.play(t); }catch(e){}
  if(location.hash!=='#/life-music') location.hash='#/life-music';
};

/* 动态 / 聊天共用的音乐卡 */
Pages.musicCardHTML=function(m,extra){
  m=m||{};
  const cover=m.cover?'<img src="'+U.esc(m.cover)+'" alt="">':'<span class="msc-note">'+I.music(18)+'</span>';
  return '<div class="music-share-card '+(extra||'')+'" data-music-open="'+U.esc(m.trackId||'')+'">'
    +'<div class="msc-cover">'+cover+'</div>'
    +'<div class="msc-meta"><span class="msc-kicker">SHARED TRACK</span>'
    +'<b>'+U.esc(m.title||'未命名')+'</b><span>'+U.esc(m.artist||'音乐')+'</span></div>'
    +'<span class="msc-play">'+I.play(13)+'</span></div>';
};

Pages.lifeMusic=function(el){
  const st=Store.state;
  const tracks=(st.app.lifeMusic||[]).slice().sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));
  let unsub=null, lastPaintId=null;

  const root=LifeUI.shell(el,'听音乐');
  root.innerHTML=
    '<div class="music-page">'
    +'<div class="music-cover" id="music-cover">'
      +'<span class="music-tag">NOW PLAYING</span>'
      +'<div class="music-cover-art" id="music-cover-art"><i class="mc-moon"></i><i class="mc-hill a"></i><i class="mc-hill b"></i></div>'
      +'<span class="music-cover-name" id="music-cover-name">还没有歌曲</span>'
      +'<span class="music-cover-note" id="music-cover-note">YOUR LIBRARY</span>'
    +'</div>'
    +'<div class="music-meta">'
      +'<div><h2 id="mu-title">还没有歌曲</h2><p id="mu-artist">导入一首歌开始听</p></div>'
      +'<div class="music-actions"><button class="music-heart" id="mu-share" title="分享这首歌">'+I.share(16)+'</button>'
      +'<button class="music-heart" id="mu-heart">'+I.heartFill(17)+'</button></div>'
    +'</div>'
    +'<div class="music-progress">'
      +'<div class="music-bar" id="mu-bar"><i id="mu-prog"></i></div>'
      +'<div class="music-time"><span id="mu-cur">0:00</span><span id="mu-dur">0:00</span></div>'
    +'</div>'
    +'<div class="music-controls">'
      +'<button class="mc-side" id="mu-prev">'+I.prev(18)+'</button>'
      +'<button class="mc-play" id="mu-play">'+I.play(20)+'</button>'
      +'<button class="mc-side" id="mu-next">'+I.next(18)+'</button>'
    +'</div>'
    +'<div class="music-import">'
      +'<button id="mu-local">'+I.plus(14)+' 本地文件</button>'
      +'<button id="mu-link">'+I.share(14)+' 网易云链接</button>'
    +'</div>'
    +'<div class="music-together" id="mu-together">'
      +'<div class="mt-avatars">'+UI.avatar('me',28)+'<span class="mt-plus">'+I.plus(12)+'</span></div>'
      +'<div class="mt-txt"><b>邀请角色一起听</b><span>同步播放，只记录一起听了几分钟</span></div>'
      +'<button id="mu-open-together">邀请</button>'
    +'</div>'
    +'<div class="ld-sec">我的音乐 <span class="ld-count">'+tracks.length+' 首</span></div>'
    +(tracks.length?'<div class="music-list" id="music-list">'+tracks.map(t=>
        '<div class="music-track" data-track="'+t.id+'">'
        +'<div class="mt-cover">'+(t.cover?'<img src="'+U.esc(t.cover)+'" alt="">':'')+'</div>'
        +'<button class="mt-play" data-play="'+t.id+'">'+I.play(13)+'</button>'
        +'<div class="mt-meta"><b>'+U.esc(t.title)+'</b><span>'+U.esc(t.artist||(t.kind==='file'?'本地文件':'网易云'))+'</span></div>'
        +'<button class="mt-share" data-share-track="'+t.id+'" title="分享这首歌">'+I.share(15)+'</button>'
        +'<button class="mt-del" data-del-track="'+t.id+'">'+I.trash(15)+'</button>'
        +'</div>').join('')+'</div>'
      :'<div class="ld-empty">还没有导入音乐</div>')
    +'</div>';

  UI.mountBlobs(el);

  const $title=U.$('#mu-title',el), $artist=U.$('#mu-artist',el);
  const $prog=U.$('#mu-prog',el), $cur=U.$('#mu-cur',el), $dur=U.$('#mu-dur',el);
  const $play=U.$('#mu-play',el), $cover=U.$('#music-cover',el);
  const $coverName=U.$('#music-cover-name',el), $coverNote=U.$('#music-cover-note',el);

  function fmt(sec){
    sec=Math.max(0,Math.floor(sec||0));
    return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
  }
  function coverHTML(t){
    if(t&&t.cover) return '<img src="'+U.esc(t.cover)+'" alt="">';
    return '<div class="music-cover-art" id="music-cover-art"><i class="mc-moon"></i><i class="mc-hill a"></i><i class="mc-hill b"></i></div>';
  }
  function paintPlay(playing){
    $play.innerHTML=playing?I.pause(20):I.play(20);
  }
  function setNow(t){
    if(!t) return;
    $title.textContent=t.title||'未命名';
    $artist.textContent=t.artist||(t.kind==='file'?'本地文件':'网易云');
    $coverName.textContent=t.title||'未命名';
    $coverNote.textContent=t.kind==='file'?'LOCAL FILE':'NETEASE';
    const art=$cover.querySelector('.music-cover-art');
    if(art) art.outerHTML=coverHTML(t);
    else{
      const old=$cover.querySelector('img');
      if(old&&t.cover) old.src=t.cover;
      else if(!t.cover){ if(old) old.outerHTML=coverHTML(t); }
    }
    U.$$('.music-track',el).forEach(x=>x.classList.toggle('active',x.dataset.track===t.id));
  }
  function clearNow(){
    $title.textContent='还没有歌曲'; $artist.textContent='导入一首歌开始听';
    $coverName.textContent='还没有歌曲'; $coverNote.textContent='YOUR LIBRARY';
    const old=$cover.querySelector('img, .music-cover-art');
    if(old) old.outerHTML=coverHTML(null);
    $prog.style.width='0%'; $cur.textContent='0:00'; $dur.textContent='0:00';
    paintPlay(false);
  }
  function paintState(s){
    const t=s.track||tracks[0]||null;
    if(t){
      if(t.id!==lastPaintId){ setNow(t); lastPaintId=t.id; }
    }else if(lastPaintId!==null){ clearNow(); lastPaintId=null; }
    $prog.style.width=(s.duration?Math.max(0,Math.min(1,s.currentTime/s.duration))*100:0)+'%';
    $cur.textContent=fmt(s.currentTime); $dur.textContent=fmt(s.duration);
    paintPlay(!!s.playing);
  }
  function playTrack(t){ if(t) MusicPlayer.play(t); }
  function stopAudio(){ MusicPlayer.stop(); }

  $play.onclick=()=>{
    if(MusicPlayer.getState().track){ MusicPlayer.toggle(); return; }
    if(tracks.length) MusicPlayer.play(tracks[0]); else UI.toast('先导入一首歌');
  };
  U.$('#mu-prev',el).onclick=()=>MusicPlayer.prev();
  U.$('#mu-next',el).onclick=()=>MusicPlayer.next();
  U.$('#mu-bar',el).onclick=e=>{
    const r=e.currentTarget.getBoundingClientRect();
    MusicPlayer.seek((e.clientX-r.left)/r.width);
  };
  U.$('#mu-heart',el).onclick=()=>UI.toast('收藏功能下一步接入');
  U.$$('[data-play]',el).forEach(b=>b.onclick=e=>{ e.stopPropagation(); const t=tracks.find(x=>x.id===b.dataset.play); if(t) playTrack(t); });

  U.$('#mu-local',el).onclick=()=>{
    U.pickFile('audio/*',f=>{
      const base=f.name.replace(/\.[^.]+$/,'')||'本地音乐';
      UI.openModal({
        title:'本地音乐信息',
        html:'<div class="tiny" style="margin-bottom:9px;overflow:hidden;text-overflow:ellipsis">已选择：'+U.esc(f.name)+'</div>'
          +'<input class="field" id="mu-local-title" maxlength="60" value="'+U.esc(base)+'" placeholder="歌曲名" style="margin-bottom:8px">'
          +'<input class="field" id="mu-local-artist" maxlength="40" placeholder="歌手（可选）" style="margin-bottom:8px">'
          +'<p class="tiny" style="line-height:1.6">名字和歌手会显示在播放页、列表和悬浮窗；留空时名字用文件名，歌手显示「本地文件」。</p>'
          +'<div class="modal-actions"><button class="btn light" data-a="c">取消</button><button class="btn dark" data-a="ok">导入</button></div>',
        after(ov,api){
          ov.querySelector('[data-a=c]').onclick=()=>api.close();
          const ok=ov.querySelector('[data-a=ok]');
          ok.onclick=async()=>{
            const title=U.$('#mu-local-title',ov).value.trim()||base||'本地音乐';
            const artist=U.$('#mu-local-artist',ov).value.trim()||'本地文件';
            ok.disabled=true; ok.textContent='导入中…';
            try{
              const blobId='aud_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
              await DB.put(blobId,f);
              Store.setApp({lifeMusic:(st.app.lifeMusic||[]).concat({
                id:U.uid('mu'),title,artist,kind:'file',blobId,addedAt:Date.now()
              })});
              api.close(); UI.toast('已导入 '+title+(artist?' · '+artist:''));
            }catch(e){
              ok.disabled=false; ok.textContent='导入';
              UI.toast('导入失败：'+e.message);
            }
          };
        }
      });
    });
  };

  async function neteaseMeta(id){
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),8000);
    try{
      const r=await fetch('https://api.injahow.cn/meting/?server=netease&type=song&id='+encodeURIComponent(id),{signal:ctrl.signal,cache:'no-store'});
      if(!r.ok) return null;
      const data=await r.json();
      return Array.isArray(data)&&data[0]?data[0]:null;
    }catch(e){ return null; }
    finally{ clearTimeout(timer); }
  }
  U.$('#mu-link',el).onclick=()=>{
    UI.openModal({
      title:'导入网易云链接',
      html:'<input class="field" id="mu-url" placeholder="粘贴歌曲分享链接" style="margin-bottom:8px">'
        +'<input class="field" id="mu-name" placeholder="歌曲名（留空自动获取）" style="margin-bottom:8px">'
        +'<input class="field" id="mu-artist" placeholder="歌手（留空自动获取）">'
        +'<p class="tiny" style="margin-top:8px;line-height:1.6">自动读取歌名和歌手；播放使用网易云外链，受版权/网络影响可能失败。</p>'
        +'<div class="modal-actions"><button class="btn light" data-a="c">取消</button><button class="btn dark" data-a="ok">导入</button></div>',
      after(ov,api){
        ov.querySelector('[data-a=c]').onclick=()=>api.close();
        const ok=ov.querySelector('[data-a=ok]');
        ok.onclick=async()=>{
          const raw=U.$('#mu-url',ov).value.trim();
          if(!raw){ UI.toast('请粘贴链接'); return; }
          const m=raw.match(/[?&]id=(\d+)/)||raw.match(/\/song\/(\d+)/);
          const isNetease=/music\.163\.com/.test(raw);
          if(isNetease&&!m){ UI.toast('链接里没有歌曲 id'); return; }
          let src=raw;
          if(isNetease) src='https://music.163.com/song/media/outer/url?id='+m[1]+'.mp3';
          if(!/^https?:\/\//.test(src)){ UI.toast('链接格式不对'); return; }
          ok.disabled=true; ok.textContent='获取中…';
          const meta=m?await neteaseMeta(m[1]):null;
          const manualName=U.$('#mu-name',ov).value.trim();
          const manualArtist=U.$('#mu-artist',ov).value.trim();
          const title=manualName||(meta&&meta.name)||'网易云音乐';
          const artist=manualArtist||(meta&&meta.artist)||'网易云';
          if(meta&&meta.url) src=meta.url;
          Store.setApp({lifeMusic:(st.app.lifeMusic||[]).concat({
            id:U.uid('mu'),title,artist,kind:'url',url:src,
            cover:(meta&&meta.pic)||null,neteaseId:(m&&m[1])||null,
            metaAt:meta?Date.now():null,addedAt:Date.now()
          })});
          api.close(); UI.toast('已导入 '+title+(artist?' · '+artist:''));
        };
      }
    });
  };

  U.$('#mu-open-together',el).onclick=()=>{
    if(!tracks.length){ UI.toast('先导入一首歌'); return; }
    location.hash='#/life-together';
  };

  function musicSnap(t){
    return {trackId:t.id,title:t.title||'未命名',artist:t.artist||'',cover:t.cover||null,kind:t.kind||''};
  }
  function convName(cv){ return cv.isGroup?cv.name:Store.displayName(cv.contactId); }
  function convAvatar(cv){
    if(cv.isGroup) return '<span class="conv-ico">'+I.users(18)+'</span>';
    return UI.avatar(cv.contactId,38);
  }
  function shareToPost(t){
    UI.openModal({
      title:'分享到动态',
      html:'<div class="music-share-preview">'+Pages.musicCardHTML(musicSnap(t))+'</div>'
        +'<textarea class="field" id="ms-post-text" maxlength="140" placeholder="说点什么…（可选）" style="min-height:76px;margin-top:10px"></textarea>'
        +'<div class="modal-actions"><button class="btn light" data-a="c">取消</button><button class="btn dark" data-a="ok">发布</button></div>',
      after(ov,api){
        ov.querySelector('[data-a=c]').onclick=()=>api.close();
        ov.querySelector('[data-a=ok]').onclick=()=>{
          const text=U.$('#ms-post-text',ov).value.trim();
          Store.addPost({text,music:musicSnap(t)});
          api.close(); UI.toast('已分享到动态');
        };
      }
    });
  }
  function shareToChat(t){
    const convs=Store.state.convs.filter(v=>!v.dissolved).sort((a,b)=>(b.lastAt||0)-(a.lastAt||0));
    if(!convs.length){ UI.toast('还没有聊天窗口'); return; }
    UI.openModal({
      sheet:true,
      title:'分享到聊天',
      html:'<div class="pick-list">'+convs.map(cv=>
        '<button class="pick-row" data-music-cv="'+cv.id+'">'+convAvatar(cv)
        +'<span class="grow">'+U.esc(convName(cv))+'</span>'
        +'<span class="tiny">'+(cv.isGroup?'群聊':'单聊')+'</span></button>').join('')+'</div>'
        +'<p class="tiny" style="padding:10px 4px 0">分享后，歌曲会以卡片形式出现在聊天里</p>',
      after(ov,api){
        U.$$('[data-music-cv]',ov).forEach(b=>b.onclick=()=>{
          const cv=convs.find(x=>x.id===b.dataset.musicCv);
          if(!cv) return;
          Store.send(cv.id,{type:'music',music:musicSnap(t)});
          api.close(); UI.toast('已分享到「'+convName(cv)+'」');
        });
      }
    });
  }
  function openMusicShareMenu(t,anchor){
    UI.menuAt([
      {icon:'music',label:'分享到动态',onClick:()=>shareToPost(t)},
      {icon:'share',label:'分享到聊天',onClick:()=>shareToChat(t)}
    ],anchor);
  }
  const muShare=U.$('#mu-share',el);
  if(muShare) muShare.onclick=()=>{
    const t=MusicPlayer.getState().track||tracks[0];
    if(!t){ UI.toast('先导入一首歌'); return; }
    openMusicShareMenu(t,muShare);
  };
  U.$$('[data-share-track]',el).forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const t=tracks.find(x=>x.id===b.dataset.shareTrack);
    if(t) openMusicShareMenu(t,b);
  });

  U.$$('[data-del-track]',el).forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    const t=tracks.find(x=>x.id===b.dataset.delTrack);
    if(!t) return;
    if(!await UI.confirm('删除这首歌？',{title:'删除音乐',ok:'删除'})) return;
    const ps=MusicPlayer.getState();
    if(ps.track&&ps.track.id===t.id) stopAudio();
    if(t.kind==='file'&&t.blobId) await DB.del(t.blobId);
    Store.setApp({lifeMusic:(st.app.lifeMusic||[]).filter(x=>x.id!==t.id)});
    UI.toast('已删除');
  });

  unsub=MusicPlayer.subscribe(paintState);
  if(tracks.length) setNow(tracks[0]);

  /* 补全以前导入、只有“网易云音乐”占位名的链接曲目 */
  const needMeta=tracks.filter(t=>t.kind==='url'&&!t.metaAt&&(
    !t.title||!t.artist||t.title==='网易云音乐'||t.artist==='网易云'
  )).slice(0,3);
  if(needMeta.length){
    setTimeout(async()=>{
      let changed=false;
      for(const t of needMeta){
        const id=t.neteaseId||((t.url||'').match(/[?&]id=(\d+)/)||[])[1];
        if(!id) continue;
        const meta=await neteaseMeta(id);
        if(!meta||!meta.name) continue;
        const cur=(Store.state.app.lifeMusic||[]).find(x=>x.id===t.id);
        if(!cur) continue;
        cur.title=meta.name;
        cur.artist=meta.artist||cur.artist;
        cur.url=meta.url||cur.url;
        cur.cover=meta.pic||cur.cover||null;
        cur.neteaseId=id;
        cur.metaAt=Date.now();
        changed=true;
      }
      if(changed){ Store.save(); App.rerender(); }
    },60);
  }

  Pages._cleanup=()=>{ if(unsub){ unsub(); unsub=null; } };
};
