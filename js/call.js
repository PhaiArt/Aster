/* ===== 模拟通话（前端原型：呼叫 → 拨通 → 计时 → 悬浮球 → 挂断） =====
   状态机：idle → calling → connected ⇄ minimized → ended → idle
   拨通机制：每个被叫成员 1~25 秒随机拨通等待；结果三等概率——接听 / 拒接 / 无人接听。
   群聊通话：微信式多成员头像小窗，各成员拨通计时与结果相互独立
   （如角色一 5 秒接通、角色二 25 秒无人接听退出、角色三 14 秒拒接退出，头像随之消失）；
   小窗提供「邀请成员」按钮，可邀请未加入通话的成员（含被拒/超时的成员再次邀请）。
   仅前端模拟，不请求麦克风权限，不接入真实通信服务。 */
window.Call=(function(){
  let state='idle';
  let onEnd=null;
  let convId=null, title='', avBig='', avSmall='';
  let timer=null, endTimer=null, sec=0;
  let isGroup=false, anyOn=false;
  let mems=[];   /* 成员：{id,name,av,st:'waiting'|'on'|'gone',joinSec,tm} */
  let win=null, ball=null, inWin=null;
  let ballPos=null, ballDragSuppress=false;

  function fmt(s){ return Math.floor(s/60)+':'+U.pad(s%60); }
  /* 拨通等待 1~25 秒随机；结果三等概率（r<1/3 拒接、<2/3 无人接听、否则接听） */
  function dialDelay(){ return 1000+Math.floor(Math.random()*24000); }
  function dialOutcome(){ const r=Math.random(); return r<1/3?'reject':r<2/3?'timeout':'answer'; }

  function clearTimers(){
    clearInterval(timer); timer=null;
    clearTimeout(endTimer); endTimer=null;
    mems.forEach(m=>clearTimeout(m.tm));
  }
  function closeIncoming(){
    if(inWin){ inWin.remove(); inWin=null; }
  }
  function closeAll(){
    closeIncoming();
    if(win){ win.remove(); win=null; }
    if(ball){ ball.remove(); ball=null; }
  }
  function shortName(){ return title.length>6?title.slice(0,6)+'…':title; }

  /* ---------- 通话窗口 ---------- */
  /* 位置基于实际 viewport 计算（left/top，居中在打开/重开时重算），
     不再用 CSS translate 居中，便于 Pointer Events 自由拖动并限制在屏幕内。 */
  function clampPos(x,y,w,h){
    const m=8;   /* 四边至少留 8px，保证小窗始终可见、可再次抓取 */
    return {
      x:U.clamp(x,m,Math.max(m,window.innerWidth-w-m)),
      y:U.clamp(y,m,Math.max(m,window.innerHeight-h-m))
    };
  }
  function centerWin(){
    if(!win) return;
    const x=Math.round((window.innerWidth-win.offsetWidth)/2);
    const y=Math.round((window.innerHeight-win.offsetHeight)/2);
    const p=clampPos(x,y,win.offsetWidth,win.offsetHeight);
    win.style.left=p.x+'px'; win.style.top=p.y+'px';
  }
  function buildWindow(){
    closeAll();
    win=document.createElement('div');
    win.className='call-win'+(isGroup?' group':'');
    win.innerHTML=
      '<div class="call-drag" id="call-drag">'
      +(isGroup
        ?'<div class="call-name">'+U.esc(title)+'</div>'
          +'<div class="call-status" id="call-status"></div>'
          +'<div class="call-grid" id="call-grid"></div>'
        :'<div class="call-av">'+avBig+'</div>'
          +'<div class="call-name">'+U.esc(title)+'</div>'
          +'<div class="call-status" id="call-status"></div>')
      +'</div>'
      +'<div class="call-actions">'
      +(isGroup?'<button class="call-btn invite" id="call-invite" title="邀请成员">'+I.plus(22)+'</button>':'')
      /* 缩小按钮始终渲染：呼叫中隐藏，有成员接通后显示（避免中途重建窗口导致位置重置） */
      +'<button class="call-btn" id="call-min" title="缩小为悬浮球" style="'+(state==='connected'?'':'display:none')+'">'+I.chevronDown(22)+'</button>'
      +'<button class="call-btn hangup" id="call-end" title="挂断">'+I.phone(22)+'</button>'
      +'</div>';
    document.body.appendChild(win);
    UI.mountBlobs(win);
    renderGrid();
    centerWin();
    bindWinDrag();
    const min=U.$('#call-min',win);
    if(min) min.onclick=()=>minimize();
    const inv=U.$('#call-invite',win);
    if(inv) inv.onclick=openInvite;
    U.$('#call-end',win).onclick=()=>hangup();
  }

  /* 拖动：Pointer Events 统一鼠标/触屏；拖动区为顶部标题区（头像/名称/状态/成员网格），
     不含操作按钮，拖动中不会误触按钮，也不会选中文本。 */
  function bindWinDrag(){
    const dz=U.$('#call-drag',win);
    if(!dz) return;
    let sx=0,sy=0,ox=0,oy=0,dragging=false;
    dz.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0) return;
      dragging=true;
      sx=e.clientX; sy=e.clientY;
      ox=parseFloat(win.style.left)||0; oy=parseFloat(win.style.top)||0;
      try{ dz.setPointerCapture(e.pointerId); }catch(err){}
      document.body.classList.add('call-dragging');
      e.preventDefault();
    });
    dz.addEventListener('pointermove',e=>{
      if(!dragging) return;
      const p=clampPos(ox+(e.clientX-sx),oy+(e.clientY-sy),win.offsetWidth,win.offsetHeight);
      win.style.left=p.x+'px'; win.style.top=p.y+'px';
    });
    const stop=()=>{ dragging=false; document.body.classList.remove('call-dragging'); };
    dz.addEventListener('pointerup',stop);
    dz.addEventListener('pointercancel',stop);
  }

  /* 屏幕尺寸变化时把小窗/悬浮球拉回可视区域，避免拖出屏幕后找不回 */
  window.addEventListener('resize',()=>{
    if(win){
      const p=clampPos(parseFloat(win.style.left)||0,parseFloat(win.style.top)||0,win.offsetWidth,win.offsetHeight);
      win.style.left=p.x+'px'; win.style.top=p.y+'px';
    }
    if(ball){
      const r=ball.getBoundingClientRect();
      const p=clampPos(r.left,r.top,ball.offsetWidth,ball.offsetHeight);
      ball.style.left=p.x+'px'; ball.style.top=p.y+'px';
      ball.style.right='auto'; ball.style.bottom='auto';
      ballPos={x:p.x,y:p.y};
    }
  });

  function setStatus(txt){
    const s=U.$('#call-status',win); if(s) s.textContent=txt;
  }

  /* ---------- 群聊成员网格（微信式多头像，各成员独立状态） ---------- */
  function renderGrid(){
    if(!isGroup||!win) return;
    const g=U.$('#call-grid',win); if(!g) return;
    g.innerHTML=mems.filter(m=>m.st!=='gone').map(m=>{
      const sub=m.st==='on'
        ?'<span class="cm-on" data-dur="'+U.esc(m.id)+'">通话中 '+fmt(sec-(m.joinSec||0))+'</span>'
        :'<span class="cm-wait">等待接听…</span>';
      return '<div class="call-mem" data-mem="'+U.esc(m.id)+'">'+m.av
        +'<b>'+U.esc(m.name)+'</b>'+sub+'</div>';
    }).join('');
    UI.mountBlobs(win);
  }
  /* 每秒只更新已接通成员的独立计时文本，不重建网格（避免头像闪烁） */
  function updateGridTimes(){
    if(!isGroup||!win) return;
    mems.forEach(m=>{
      if(m.st!=='on') return;
      const el=U.$('[data-dur="'+m.id+'"]',win);
      if(el) el.textContent='通话中 '+fmt(sec-(m.joinSec||0));
    });
  }

  /* ---------- 悬浮球 ---------- */
  function buildBall(){
    if(ball) ball.remove();
    ball=document.createElement('div');
    ball.className='call-ball';
    ball.innerHTML='<span class="cb-av">'+avSmall+'</span>'
      +'<span class="cb-txt"><b>'+U.esc(shortName())+'</b><i id="cb-time">'+fmt(sec)+'</i></span>'
      +'<button class="cb-end" title="挂断">'+I.x(14)+'</button>';
    document.body.appendChild(ball);
    UI.mountBlobs(ball);
    if(ballPos){
      ball.style.left=ballPos.x+'px'; ball.style.top=ballPos.y+'px';
      ball.style.right='auto'; ball.style.bottom='auto';
    }
    ball.onclick=e=>{
      if(e.target.closest('.cb-end')) return;
      if(ballDragSuppress){ ballDragSuppress=false; return; }
      restore();
    };
    ball.querySelector('.cb-end').onclick=()=>hangup();
    bindBallDrag(ball);
  }

  /* 悬浮球拖动：与通话窗口同一套边界限制；拖动后不会触发 restore */
  function bindBallDrag(el){
    let sx=0,sy=0,ox=0,oy=0,dragging=false,moved=false;
    el.addEventListener('pointerdown',e=>{
      if(e.target.closest('.cb-end')) return;
      const r=el.getBoundingClientRect();
      sx=e.clientX; sy=e.clientY; ox=r.left; oy=r.top;
      dragging=true; moved=false;
      try{ el.setPointerCapture(e.pointerId); }catch(err){}
      el.classList.add('dragging');
    });
    el.addEventListener('pointermove',e=>{
      if(!dragging) return;
      const dx=e.clientX-sx, dy=e.clientY-sy;
      if(!moved&&Math.hypot(dx,dy)>4){ moved=true; ballDragSuppress=true; }
      if(!moved) return;
      const p=clampPos(ox+dx,oy+dy,el.offsetWidth,el.offsetHeight);
      el.style.left=p.x+'px'; el.style.top=p.y+'px';
      el.style.right='auto'; el.style.bottom='auto';
      e.preventDefault();
    });
    const end=()=>{
      if(!dragging) return;
      dragging=false; el.classList.remove('dragging');
      if(moved){
        const r=el.getBoundingClientRect();
        ballPos={x:r.left,y:r.top};
        setTimeout(()=>{ ballDragSuppress=false; },80);
      }else{
        ballDragSuppress=false;
      }
    };
    el.addEventListener('pointerup',end);
    el.addEventListener('pointercancel',end);
  }

  function updateTimer(){
    if(state==='idle'||state==='ended') return;
    const t=fmt(sec);
    if(win){
      if(state==='connected') setStatus('通话中 '+t);
      else setStatus(isGroup?'等待成员加入…':'呼叫中…');
    }
    if(ball){ const el=U.$('#cb-time',ball); if(el) el.textContent=t; }
    updateGridTimes();
  }

  /* ---------- 成员拨通排程 ----------
     排程时即确定拨通时长（1~25s）与结果（接听/拒接/无人接听，三等概率），
     各成员互不影响；拒接与超时的成员头像从网格消失。 */
  function schedule(m){
    clearTimeout(m.tm);
    m.st='waiting';
    const delay=dialDelay(), oc=dialOutcome();
    m.tm=setTimeout(()=>{
      m.tm=null;
      if(state==='idle') return;
      if(oc==='answer'){ m.st='on'; m.joinSec=sec; }
      else { m.st='gone'; }
      if(state!=='ended') renderGrid();
      refreshConnect();
      if(state==='calling'){
        if(!isGroup&&oc!=='answer'){
          /* 单聊：拒接 / 无人接听 → 自动结束 */
          autoEnd(oc,false);
        }else if(isGroup){
          /* 群聊：所有成员都未接通（拒接/超时）→ 自动结束 */
          const others=mems.filter(x=>x.id!=='me');
          if(others.length&&others.every(x=>x.st==='gone')) autoEnd('timeout',true);
        }
      }
    },delay);
  }

  /* 有成员接通：首次接通时进入 connected，显示「缩小悬浮球」按钮 */
  function refreshConnect(){
    if(anyOn) return;
    if(mems.some(m=>m.id!=='me'&&m.st==='on')){
      anyOn=true;
      if(state==='calling'){
        state='connected';
        sec=0;                 /* 从真正接通的这一刻开始计时 */
        startTimer();
        const mb=U.$('#call-min',win);
        if(mb) mb.style.display='';
        updateTimer();
      }
    }
  }

  function startTimer(){
    if(timer) return;
    timer=setInterval(()=>{ sec++; updateTimer(); },1000);
  }

  /* 拒接 / 无人接听自动结束（单聊与全未接通的群聊） */
  function autoEnd(kind,group){
    state='ended';
    const cv=convId?Store.conv(convId):null;
    if(win) setStatus(group?'无人接听':(kind==='reject'?'对方已拒绝':'无人接听'));
    if(cv){
      Store.sysMsg(convId,group?'群聊通话未接通'
        :(kind==='reject'?'对方已拒绝':'对方未接听'));
    }
    endTimer=setTimeout(finish,900);
  }

  function finish(){
    clearTimers();
    closeAll();
    state='idle'; convId=null; sec=0;
    isGroup=false; anyOn=false; mems=[];
    title=''; avBig=''; avSmall='';
    const cb=onEnd; onEnd=null;
    if(cb) setTimeout(cb,600);
  }

  /* ---------- 状态流转 ---------- */
  /* 接听角色主动打来的视频：直接进入已接通状态，不再走「回拨」的随机等待 */
  function connect(cid,opts){
    if(state!=='idle'){
      if(state==='minimized') restore();
      return;
    }
    const cv=Store.conv(cid);
    if(!cv){ UI.toast('会话不存在'); return; }
    onEnd=(opts&&opts.onEnd)||null;
    convId=cid; sec=0; isGroup=!!cv.isGroup; anyOn=true; mems=[];
    const c=cv.isGroup?null:Store.contact(cv.contactId);
    title=cv.isGroup?cv.name:(c.remark||c.name);
    if(isGroup){
      avBig='';
      avSmall=Pages.groupAvatarHTML(cv,34);
      mems.push({id:'me',name:'我',av:UI.avatar('me',56),st:'on',joinSec:0});
      cv.members.forEach(id=>{
        const cc=Store.contact(id);
        mems.push({id,name:(cc?(cc.remark||cc.name):'成员'),av:UI.avatar(id,56),st:'on',joinSec:0});
      });
    }else{
      avBig=UI.avatar(cv.contactId,72);
      avSmall=UI.avatar(cv.contactId,34);
      mems.push({id:cv.contactId,name:title,av:avBig,st:'on',joinSec:0});
    }
    state='connected';
    buildWindow();
    startTimer();
    updateTimer();
  }

  function start(cid,opts){
    if(state!=='idle'){
      UI.toast('已有通话进行中');
      if(state==='minimized') restore();
      return;
    }
    onEnd=(opts&&opts.onEnd)||null;
    const cv=Store.conv(cid);
    if(!cv){ UI.toast('会话不存在'); return; }
    const c=cv.isGroup?null:Store.contact(cv.contactId);
    convId=cid; sec=0; isGroup=!!cv.isGroup; anyOn=false; mems=[];
    title=cv.isGroup?cv.name:(c.remark||c.name);
    if(isGroup){
      avBig='';
      avSmall=Pages.groupAvatarHTML(cv,34);
      /* 我 + 全部群成员（各自独立拨通计时），网格内展示 */
      mems.push({id:'me',name:'我',av:UI.avatar('me',56),st:'on',joinSec:0});
      cv.members.forEach(id=>{
        const cc=Store.contact(id);
        mems.push({id,name:(cc?(cc.remark||cc.name):'成员'),av:UI.avatar(id,56)});
      });
    }else{
      avBig=UI.avatar(cv.contactId,72);
      avSmall=UI.avatar(cv.contactId,34);
      mems.push({id:cv.contactId,name:title,av:avBig});
    }
    state='calling';
    buildWindow();
    updateTimer();
    /* 每个被叫成员独立排程：1~25 秒随机，接听/拒接/无人接听三等概率 */
    mems.forEach(m=>{ if(m.id!=='me') schedule(m); });
    /* 计时器在 refreshConnect 首次接通时才启动，呼叫等待时间不计入通话时长 */
  }
  function minimize(){
    if(state!=='connected') return;
    state='minimized';
    if(win){ win.remove(); win=null; }
    buildBall();
    updateTimer();
  }
  function restore(){
    if(state!=='minimized') return;
    state='connected';
    buildWindow();
    updateTimer();
  }
  function hangup(){
    if(state==='idle') return;
    const connected=state==='connected'||state==='minimized';
    const cv=convId?Store.conv(convId):null;
    clearTimers();
    /* 系统消息：接通过留时长；呼叫中挂断视为未接通；拒接/超时自动结束时已写过，不重复 */
    if(cv){
      if(connected) Store.sysMsg(convId,(isGroup?'群聊通话已结束':'通话已结束')+' · 时长 '+fmt(sec));
      else if(state==='calling') Store.sysMsg(convId,isGroup?'群聊通话未接通':'对方未接听');
    }
    if(win) setStatus('通话已结束');
    state='ended';
    endTimer=setTimeout(finish,700);
  }

  /* ---------- 邀请未加入通话的成员 ----------
     可选对象：群内当前不在通话中的成员（未入会 / 拒接 / 无人接听）；
     邀请后按相同机制独立排程（1~25s 随机 + 三等概率结果）。 */
  function openInvite(){
    if(!isGroup||!win) return;
    const cv=Store.conv(convId);
    if(!cv) return;
    const inCall=id=>mems.some(m=>m.id===id&&m.st!=='gone');
    const avail=cv.members.filter(id=>!inCall(id));
    if(!avail.length){ UI.toast('群成员都已加入通话'); return; }
    UI.openModal({
      sheet:true,
      title:'邀请成员',
      html:'<div style="display:flex;flex-direction:column;gap:4px">'
        +avail.map(id=>{
          const c=Store.contact(id);
          return '<button class="mem-item" data-inv="'+U.esc(id)+'" style="width:100%;text-align:left">'+UI.avatar(id,40)
            +'<div class="grow" style="margin-left:10px"><div class="r-name">'+U.esc(c?(c.remark||c.name):id)+'</div>'
            +'<div class="r-sub">等待对方接受邀请…</div></div></button>';
        }).join('')+'</div>',
      after(ov,api){
        U.$$('[data-inv]',ov).forEach(b=>{
          b.onclick=()=>{ const id=b.dataset.inv; api.close(); invite(id); };
        });
      }
    });
  }
  function invite(id){
    if(state==='idle'||state==='ended') return;
    const c=Store.contact(id);
    let m=mems.find(x=>x.id===id);
    if(!m){ m={id}; mems.push(m); }
    m.name=c?(c.remark||c.name):'成员';
    m.av=UI.avatar(id,56);
    schedule(m);
    if(win){ renderGrid(); UI.toast('已向 '+m.name+' 发起通话邀请'); }
  }

  /* 页面卸载时清理，避免计时器泄漏 */
  window.addEventListener('beforeunload',clearTimers);

  /* 角色发起视频邀请：等待接听的小窗（4:3，宽于旧版方形小窗） */
  function showIncoming(convId,contactId,opt){
    if(state!=='idle') return false;
    const c=Store.contact(contactId);
    if(!c) return false;
    opt=opt||{};
    closeIncoming();
    const name=c.remark||c.name;
    inWin=document.createElement('div');
    inWin.className='call-win incoming';
    inWin.innerHTML=
      '<div class="call-drag">'
      +'<div class="call-av">'+UI.avatar(contactId,52)+'</div>'
      +'<div class="call-name">'+U.esc(name)+'</div>'
      +'<div class="call-status">邀请你视频通话</div>'
      +'<div class="call-hint">等待接听…</div>'
      +'</div>'
      +'<div class="call-actions">'
      +'<button class="call-btn hangup" id="in-decline" title="拒绝">'+I.phone(22)+'</button>'
      +'<button class="call-btn accept" id="in-accept" title="接听">'+I.phone(22)+'</button>'
      +'</div>';
    document.body.appendChild(inWin);
    UI.mountBlobs(inWin);
    const x=Math.round((window.innerWidth-inWin.offsetWidth)/2);
    const y=Math.round((window.innerHeight-inWin.offsetHeight)/2);
    const p=clampPos(x,y,inWin.offsetWidth,inWin.offsetHeight);
    inWin.style.left=p.x+'px'; inWin.style.top=p.y+'px';
    U.$('#in-accept',inWin).onclick=()=>{
      closeIncoming();
      if(opt.onAccept) opt.onAccept(); else connect(convId,{});
    };
    U.$('#in-decline',inWin).onclick=()=>{
      closeIncoming();
      if(opt.onDecline) opt.onDecline();
    };
    return true;
  }

  return {start, connect, showIncoming, minimize, restore, hangup, get state(){return state;}};
})();
