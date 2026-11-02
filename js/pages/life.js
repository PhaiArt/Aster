/* ===== Life 第四栏：F 方案布局（功能逐步接入） ===== */
window.Pages=window.Pages||{};

Pages.life=function(el){
  const st=Store.state;
  const now=new Date();
  const wd=['周日','周一','周二','周三','周四','周五','周六'];
  const date=(now.getMonth()+1)+'月'+now.getDate()+'日 · '+wd[now.getDay()];
  const photo=st.app.lifePhoto;
  const pi=LifeUI.periodInfo(st);
  const periodPhase=!pi?'未设置':(pi.future?'日期未到':(pi.periodDay?'经期':pi.phase));
  const periodDay=!pi?'设置周期':(pi.future?'检查日期':'第 '+pi.cycleDay+' 天');
  const periodNext=pi&&!pi.future?pi.until:null;
  const periodPill=!pi?'设置':(pi.future?'设置':'周期 '+pi.cycle+' 天');
  const periodPct=pi&&!pi.future?Math.min(100,Math.max(0,Math.round(pi.cycleDay/pi.cycle*100))):0;
  let phaseW=[18,32,10,40];
  if(pi&&!pi.future){
    const a=Math.max(4,Math.round(pi.dur/pi.cycle*100));
    const b=Math.max(4,Math.round((pi.cycle-14-pi.dur)/pi.cycle*100));
    const c=Math.max(4,Math.round(3/pi.cycle*100));
    phaseW=[a,b,c,Math.max(4,100-a-b-c)];
  }

  const todos=(st.app.lifeTodos||[]).slice().sort((a,b)=>{
    if(!!a.done!==!!b.done) return a.done?1:-1;
    return (a.due||'').localeCompare(b.due||'');
  });
  const pending=todos.filter(t=>!t.done).length;
  const topTodos=todos.slice(0,3);

  const cds=(st.app.lifeCountdowns||[]).map(x=>({...x,d:LifeUI.diffDays(x.date)})).filter(x=>x.d!=null);
  const past=cds.filter(x=>x.d<0).sort((a,b)=>b.d-a.d)[0]||null;
  const future=cds.filter(x=>x.d>=0).sort((a,b)=>a.d-b.d)[0]||null;
  const single=cds.length===1?cds[0]:null;
  const cdRows=(()=>{
    if(cds.length<2) return [];
    const out=[];
    if(future) out.push(future);
    if(past) out.push(past);
    const rest=cds.slice().sort((a,b)=>Math.abs(a.d)-Math.abs(b.d));
    for(const x of rest){ if(out.length>=4) break; if(!out.includes(x)) out.push(x); }
    return out.slice(0,4);
  })();

  const month=LifeUI.monthKey();
  const monthMoney=(st.app.lifeMoney||[]).filter(x=>(x.date||'').slice(0,7)===month);
  const income=monthMoney.filter(x=>x.type==='income').reduce((s,x)=>s+(+x.amount||0),0);
  const expense=monthMoney.filter(x=>x.type==='expense').reduce((s,s2)=>s+(+s2.amount||0),0);

  const track=(st.app.lifeMusic||[]).slice().sort((a,b)=>(a.addedAt||0)-(b.addedAt||0)).pop()||null;

  function shortMoney(n){
    n=Math.round((+n||0)*100)/100;
    if(Math.abs(n)>=10000) return '¥'+(n/10000).toFixed(1).replace(/\.0$/,'')+'万';
    return '¥'+(Number.isInteger(n)?n:n.toFixed(2).replace(/0$/,''));
  }

  const musicCard=
    '<article class="life-tile life-music" id="life-music" data-life-open="life-music">'
      +'<div class="life-music-top"><span class="life-music-label">'+I.music(13)+' 正在播放</span><button class="life-heart" id="life-heart" title="收藏" style="opacity:'+(track?'.9':'.35')+'">'+I.heartFill(14)+'</button></div>'
      +'<div class="life-m-title">'+(track?U.esc(track.title):'还没有在听')+'</div>'
      +'<div class="life-m-sub">'+(track?U.esc(track.artist||'点击进入播放'):'点一下选首歌')+'</div>'
      +'<div class="life-music-wave"'+(track?'':' style="opacity:.22"')+'><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'
      +'<div class="life-m-controls">'+I.prev(16)+'<span class="play">'+I.play(13)+'</span>'+I.next(16)+'</div>'
      +'<div class="life-progress"><i style="width:'+(track?'31%':'0')+'"></i></div>'
    +'</article>';

  const countClass=!cds.length?'':(single?(single.d<0?'count-past':'count-future'):'count-multi');
  const countCard=
    '<article class="life-tile life-count '+countClass+'" id="life-count" data-life-open="life-countdown">'
      +'<div class="life-row life-between"><span class="life-cap">'+I.hourglass(14)+' 倒数日</span><span class="life-pill">'+cds.length+' 个</span></div>'
      +(single
        ?(()=>{
            const isPast=single.d<0, n=Math.abs(single.d);
            return '<div class="life-cd-hero'+(isPast?' past':'')+'">'
              +'<div class="life-cd-name">'+U.esc(single.title)+'</div>'
              +'<div class="life-cd-date">'+LifeUI.fmtShort(single.date)+' · '+(isPast?'过去':'未来')+'</div>'
              +'<div class="life-cd-big"><small>'+(isPast?'已经':'还有')+'</small><b>'+n+'</b><i>天</i></div>'
              +'<div class="life-cd-foot"><i></i>'+(isPast?'一起走过':'正在倒数')+'</div>'
            +'</div>';
          })()
        :(cdRows.length
          ?'<div class="life-cd-list'+(cdRows.length>=3?' dense':'')+'">'+cdRows.map(x=>{
              const isPast=x.d<0, n=Math.abs(x.d);
              return '<div class="life-cd-item'+(isPast?' past':'')+'">'
                +'<div class="life-cd-meta"><b>'+U.esc(x.title)+'</b><span>'+LifeUI.fmtShort(x.date)+'</span></div>'
                +'<div class="life-cd-mini"><em>'+(isPast?'已经':'还有')+'</em><b>'+n+'</b><i>天</i></div>'
              +'</div>';
            }).join('')+'</div>'
          :'<div class="life-empty"><span class="le-ico">'+I.hourglass(15)+'</span><b>还没有倒数日</b><span>添加重要的日子</span><button id="life-add-count">添加</button></div>'))
    +'</article>';

  const todoCard=
    '<article class="life-tile life-todo" id="life-todo" data-life-open="life-todo">'
      +'<div class="life-row life-between"><span class="life-cap">'+I.check(14)+' 待办</span><span class="life-pill">'+pending+' / '+todos.length+'</span></div>'
      +(topTodos.length
        ?'<div class="life-todo-wrap">'+topTodos.map(t=>
            '<div class="life-todo-row'+(t.done?' done':'')+'">'
            +'<button class="life-todo-check'+(t.done?' on':'')+'" data-life-check="'+t.id+'">'+I.check(10)+'</button>'
            +'<span class="life-todo-text">'+U.esc(t.text)+'</span>'
            +'<span class="life-todo-due">'+(t.due?U.esc(t.due.slice(5).replace('-','.')):'')+'</span>'
            +'</div>').join('')+'</div>'
        :'<div class="life-empty"><span class="le-ico">'+I.check(15)+'</span><b>今天还没有待办</b><span>点 + 添加第一条</span><button id="life-add-todo">添加</button></div>')
    +'</article>';

  el.innerHTML=
    '<div class="life-page">'
    +'<header class="life-hdr">'
      +'<div><div class="life-date">'+U.esc(date)+'</div><h1>Life</h1></div>'
      +'<button class="life-add-btn" id="life-add" title="添加小组件">'+I.plus(21)+'</button>'
    +'</header>'
    +'<div class="life-grid">'
    +'<article class="life-tile life-photo-wide'+(photo?' has-photo':'')+'" id="life-photo">'
      +'<div class="lp-art"><i class="lp-sun"></i><i class="lp-hill a"></i><i class="lp-hill b"></i></div>'
      +(photo?'<img class="lp-img" data-blob="'+U.esc(photo)+'" alt="">':'')
      +'<div class="lp-top"><span class="lp-pill">照片</span><button class="lp-edit" id="life-photo-edit">'+(photo?'更换':'导入')+'</button></div>'
      +'<div class="lp-cap">'+(photo?'我的照片':'导入一张照片')+'</div>'
    +'</article>'
    +'<article class="life-tile life-focus" id="life-focus" data-life-open="life-pomodoro">'
      +'<div class="life-row life-between"><span class="life-cap">'+I.clock(14)+' 番茄钟</span><span class="life-pill">今天 0/4</span></div>'
      +'<div class="life-focus-mid"><div class="life-ring"><div class="life-ring-in"><b>25:00</b><span>专注</span></div></div></div>'
      +'<div class="life-focus-foot"><span>准备好就开始</span><button class="life-start" id="life-start">开始</button></div>'
    +'</article>'
    +musicCard
    +countCard
    +todoCard
    +'<article class="life-tile life-mini-wide" id="life-period" data-life-open="life-period">'
      +'<div class="life-row life-between"><span class="life-cap">'+I.drop(14)+' 经期</span><span class="life-pill">'+U.esc(periodPill)+'</span></div>'
      +'<div class="life-period-main"><div><div class="life-period-phase'+(pi&&pi.periodDay?' perioding':'')+'">'+U.esc(periodPhase)+'</div><div class="life-period-day">'+U.esc(periodDay)+'</div></div>'
      +'<div class="life-period-next"><b>'+(periodNext!=null?periodNext+'<em>天</em>':'—')+'</b><span>'+(periodNext!=null?'距下次':'设置周期')+'</span></div></div>'
      +'<div class="life-phase-bar'+(periodNext!=null?'':' no-data')+'"><i class="pb1" style="width:'+phaseW[0]+'%"></i><i class="pb2" style="width:'+phaseW[1]+'%"></i><i class="pb3" style="width:'+phaseW[2]+'%"></i><i class="pb4" style="width:'+phaseW[3]+'%"></i></div>'
    +'</article>'
    +'<article class="life-tile life-mini-wide" id="life-money" data-life-open="life-money">'
      +'<div class="life-row life-between"><span class="life-cap">'+I.wallet(14)+' 记账</span><span class="life-pill">本月</span></div>'
      +'<div class="life-money-row"><span>收入 <b>'+shortMoney(income)+'</b></span><span>支出 <b>'+shortMoney(expense)+'</b></span></div>'
    +'</article>'
    +'</div></div>';

  UI.mountBlobs(el);

  let zooming=false;
  function zoom(card,hash){
    if(zooming) return;
    if(st.app.reduceMotion||!card){ location.hash=hash; return; }
    zooming=true;
    const r=card.getBoundingClientRect();
    const clone=card.cloneNode(true);
    clone.removeAttribute('data-life-open');
    clone.classList.add('life-zoom-clone');
    clone.style.left=r.left+'px'; clone.style.top=r.top+'px';
    clone.style.width=r.width+'px'; clone.style.height=r.height+'px';
    document.body.appendChild(clone);
    const bg=document.createElement('div');
    bg.className='life-zoom-bg';
    document.body.appendChild(bg);
    const tw=Math.min(window.innerWidth,430), th=window.innerHeight;
    const left=(window.innerWidth-tw)/2;
    void clone.offsetWidth;
    requestAnimationFrame(()=>{
      clone.style.left=left+'px'; clone.style.top='0px';
      clone.style.width=tw+'px'; clone.style.height=th+'px';
      clone.style.borderRadius='0px';
      bg.style.opacity='1';
    });
    setTimeout(()=>{
      location.hash=hash;
      setTimeout(()=>{ clone.remove(); bg.remove(); zooming=false; },90);
    },260);
  }

  function pickPhoto(){
    U.pickFile('image/*',async f=>{
      try{
        const id=await DB.storeImage(f,{max:1600,q:.85});
        Store.setApp({lifePhoto:id});
        UI.toast('照片已更新');
      }catch(e){ UI.toast('图片读取失败：'+e.message); }
    });
  }
  const photoTile=U.$('#life-photo',el);
  if(photoTile){
    photoTile.onclick=e=>{
      if(e.target.closest('#life-photo-edit')) return;
      pickPhoto();
    };
    U.$('#life-photo-edit',el).onclick=e=>{ e.stopPropagation(); pickPhoto(); };
  }

  U.$$('[data-life-open]',el).forEach(card=>{
    card.onclick=e=>{
      if(e.target.closest('button,input')) return;
      zoom(card,'#/'+card.dataset.lifeOpen);
    };
  });
  U.$('#life-add',el).onclick=()=>UI.toast('小组件管理下一步接入');
  U.$('#life-start',el).onclick=e=>{ e.stopPropagation(); const c=U.$('#life-focus',el); zoom(c,'#/life-pomodoro'); };
  U.$('#life-heart',el).onclick=e=>{ e.stopPropagation(); UI.toast('收藏功能下一步接入'); };
  const addCount=U.$('#life-add-count',el);
  if(addCount) addCount.onclick=e=>{ e.stopPropagation(); const c=U.$('#life-count',el); zoom(c,'#/life-countdown'); };
  const addTodo=U.$('#life-add-todo',el);
  if(addTodo) addTodo.onclick=e=>{ e.stopPropagation(); const c=U.$('#life-todo',el); zoom(c,'#/life-todo'); };
  U.$$('[data-life-check]',el).forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const id=b.dataset.lifeCheck;
    Store.setApp({lifeTodos:(st.app.lifeTodos||[]).map(t=>t.id===id?{...t,done:!t.done}:t)});
  });
};
