/* ===== App Shell：路由 / 导航 / 启动 / 主题 / 开屏 ===== */
window.App=(function(){
  const ROUTES={
    chats:{render:()=>Pages.chats,nav:true},
    discover:{render:()=>Pages.discover,nav:true},
    life:{render:()=>Pages.life,nav:true},
    'life-pomodoro':{render:()=>Pages.lifePomodoro,nav:false},
    'life-period':{render:()=>Pages.lifePeriod,nav:false},
    'life-money':{render:()=>Pages.lifeMoney,nav:false},
    'life-todo':{render:()=>Pages.lifeTodo,nav:false},
    'life-music':{render:()=>Pages.lifeMusic,nav:false},
    'life-together':{render:()=>Pages.lifeTogether,nav:false},
    'life-countdown':{render:()=>Pages.lifeCountdown,nav:false},
    me:{render:()=>Pages.me,nav:true},
    chat:{render:()=>Pages.chatDetail,nav:false},
    cs:{render:()=>Pages.chatSettings,nav:false},
    profile:{render:()=>Pages.myProfile,nav:false},
    role:{render:()=>Pages.roleProfile,nav:false},
    moments:{render:()=>Pages.roleProfile,nav:false},
    stickers:{render:()=>Pages.stickerSettings,nav:false},
    cards:{render:()=>Pages.cards,nav:false},
    appearance:{render:()=>Pages.appearance,nav:false},
    'reply-settings':{render:()=>Pages.replySettings,nav:false},
    reminders:{render:()=>Pages.reminders,nav:false}
  };

  /* 气泡配色：浅色 / 深色两套，深色下用更深、更干净的色相 */
  const BUBBLE_SCHEMES={
    mist:   {name:'雾灰', light:['#E9EAEE','#29292C'], dark:['#2E2E34','#F2F2F4']},
    ink:    {name:'墨黑', light:['#2A2A2E','#FFFFFF'], dark:['#E9E9ED','#1A1A1C']},
    apricot:{name:'暖杏', light:['#F1E4D6','#3A2C20'], dark:['#4E3724','#F7E6D4']},
    blue:   {name:'雾蓝', light:['#E1EAF4','#223447'], dark:['#27455F','#DCEAF8']},
    violet: {name:'淡紫', light:['#EAE4F2','#30263E'], dark:['#3E3057','#EEE5FA']},
    sakura: {name:'樱粉', light:['#F6E5E9','#472A32'], dark:['#52303B','#FBE4EB']},
    mint:   {name:'薄荷', light:['#E0EFE8','#1F3A30'], dark:['#24463C','#DDF3EA']}
  };
  const BUBBLE_SHAPES={
    classic:{name:'经典', radius:16, corner:6},
    pill:{name:'胶囊', radius:22, corner:22},
    square:{name:'方正', radius:9, corner:9},
    corner:{name:'尖角', radius:16, corner:2}
  };

  let currentName='chats';
  const scrollMem={};
  let navDepth=0;
  /* 当前页面提供的局部更新器（聊天页用）：数据变更时只刷消息区，
     不再整页 innerHTML 重建，从而保留输入框草稿、滚动位置与录音状态 */
  let livePage=null;

  function parse(){
    const h=location.hash.replace(/^#\/?/,'');
    const i=h.indexOf('/');
    const name=i<0?h:h.slice(0,i);
    const param=i<0?null:decodeURIComponent(h.slice(i+1));
    return {name:name||'chats',param};
  }

  function render(){
    UI.closeMenu();
    if(Pages._cleanup){ try{ Pages._cleanup(); }catch(e){} Pages._cleanup=null; }
    /* discover 页的加号悬浮按钮挂在 body 上（页面容器 transform 会劫持内部 fixed），
       路由离开 discover 或页面重渲染前先清理，discover 页自行重新挂载 */
    const oldFab=document.getElementById('compose-fab');
    if(oldFab) oldFab.remove();
    const r=parse();
    const def=ROUTES[r.name]||ROUTES.chats;
    const prevName=currentName;
    const prevScroll=window.scrollY;
    if(ROUTES[prevName]&&ROUTES[prevName].nav) scrollMem[prevName]=prevScroll;
    currentName=r.name;
    const screen=U.$('#screen');
    document.documentElement.classList.toggle('no-scroll',r.name==='chat');
    screen.className='page '+(def.nav?'page-with-nav ':'')+'anim-in';
    livePage=null;
    try{
      const out=def.render()(screen,r.param);
      if(out&&typeof out.update==='function') livePage={name:r.name,update:out.update};
    }
    catch(e){
      console.error('页面渲染错误：',e);
      screen.innerHTML='<div class="empty"><div class="empty-ico">✦</div>页面出现错误<br>'+U.esc(e.message)+'</div>';
    }
    UI.mountBlobs(screen);
    renderNav(def.nav?r.name:null);
    applyWallpaper();
    requestAnimationFrame(()=>{
      let y=0;
      if(def.nav) y=scrollMem[r.name]||0;
      /* 同一路由因数据变更重渲染时保持滚动位置（如设置页保存资料后） */
      else if(prevName===r.name) y=prevScroll;
      window.scrollTo(0,y);
    });
  }

  function renderNav(active){
    const nav=U.$('#nav');
    if(!active){ nav.style.display='none'; return; }
    nav.style.display='flex';
    const items=[['chats','Chats',I.chat],['discover','Discover',I.compass],['life','Life',I.grid],['me','Me',I.gear]];
    nav.innerHTML=items.map(it=>
      '<button class="nav-item '+(active===it[0]?'active':'')+'" data-nav="'+it[0]+'">'+it[2](22)+'<span>'+it[1]+'</span></button>').join('');
    U.$$('[data-nav]',nav).forEach(b=>b.onclick=()=>{ location.hash='#/'+b.dataset.nav; });
  }

  function back(){
    if(navDepth>0){ navDepth--; history.back(); }
    else location.hash='#/chats';
  }

  /* ---------- 主题 ---------- */
  function resolvedTheme(){
    const t=(Store.state.app&&Store.state.app.theme)||'light';
    if(t==='system') return (window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';
    return t==='dark'?'dark':'light';
  }
  function applyTheme(){
    const t=resolvedTheme();
    const root=document.documentElement;
    const prev=root.dataset.theme;
    root.dataset.theme=t;
    root.style.colorScheme=t;
    const color=t==='dark'?'#101012':'#FFFFFF';
    /* iOS Safari 对 setAttribute 的 theme-color 有时不立即刷新状态栏，
       替换 meta 节点能触发重新读取；同时同步根背景，避免刘海区域闪白。 */
    const old=document.querySelector('meta[name="theme-color"]');
    if(old){
      if(old.getAttribute('content')!==color){
        const meta=old.cloneNode(false);
        meta.setAttribute('content',color);
        old.replaceWith(meta);
      }
    }else{
      const meta=document.createElement('meta');
      meta.name='theme-color';
      meta.setAttribute('content',color);
      document.head.appendChild(meta);
    }
    root.style.backgroundColor=color;
    /* iOS 有时会缓存带 backdrop-filter 的顶栏图层，切主题后要强制重绘一次 */
    if(prev!==t){
      root.classList.add('theme-repaint');
      requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('theme-repaint')));
    }
  }
  function applyBubble(){
    const app=Store.state.app||{};
    const dark=resolvedTheme()==='dark';
    const scheme=BUBBLE_SCHEMES[app.bubbleColor]||BUBBLE_SCHEMES.mist;
    const shape=BUBBLE_SHAPES[app.bubbleShape]||BUBBLE_SHAPES.classic;
    const st=document.documentElement.style;
    st.setProperty('--bubble-me',scheme[dark?'dark':'light'][0]);
    st.setProperty('--bubble-me-fg',scheme[dark?'dark':'light'][1]);
    const otherKey=app.otherBubbleColor||'theme';
    if(otherKey!=='theme'&&BUBBLE_SCHEMES[otherKey]){
      const os=BUBBLE_SCHEMES[otherKey][dark?'dark':'light'];
      st.setProperty('--bubble-other-custom',os[0]);
      st.setProperty('--bubble-other-custom-fg',os[1]);
    }else{
      st.removeProperty('--bubble-other-custom');
      st.removeProperty('--bubble-other-custom-fg');
    }
    st.setProperty('--bubble-radius',shape.radius+'px');
    st.setProperty('--bubble-corner',shape.corner+'px');
    st.setProperty('--bubble-pad-x',(app.bubblePadX==null?17:app.bubblePadX)+'px');
    st.setProperty('--bubble-pad-y',(app.bubblePadY==null?13:app.bubblePadY)+'px');
    st.setProperty('--bubble-gap',(app.bubbleGap==null?18:app.bubbleGap)+'px');
    applyCustomBubbleCss(app.bubbleCss);
  }
  function applyCustomBubbleCss(css){
    let style=document.getElementById('asterBubbleCss');
    if(!style){
      style=document.createElement('style');
      style.id='asterBubbleCss';
      document.head.appendChild(style);
    }
    const text=String(css||'').trim();
    style.textContent=text?(text.indexOf('{')>=0?text:'.msg-row .bubble{'+text+'}'):'';
  }
  function applyAppPrefs(){
    const app=Store.state.app;
    document.body.dataset.font=app.fontScale==='lg'?'lg':'md';
    document.body.classList.toggle('no-motion',!!app.reduceMotion);
    applyTheme();
    applyBubble();
    applyGlass();
    applyWallpaper();
  }

  /* ---------- 毛玻璃 / 分页壁纸 ---------- */
  function pageWallKey(){
    const n=parse().name;
    if(n==='discover'||n==='moments'||n==='role') return 'discover';
    if(n==='life'||String(n).indexOf('life-')===0) return 'life';
    if(n==='me'||['appearance','profile','stickers','cards','reply-settings','replySettings','reminders'].indexOf(n)>=0) return 'me';
    return 'chats';
  }
  function applyGlass(){
    const app=Store.state.app||{};
    const b=document.body;
    b.classList.toggle('theme-glass',!!app.glassTheme);
    const i=app.glassIntensity||'mid';
    b.classList.remove('glass-soft','glass-mid','glass-strong');
    b.classList.add('glass-'+i);
  }
  let wallSeq=0;
  function applyWallpaper(){
    const app=Store.state.app||{};
    const wp=app.wallpaper||{};
    const key=pageWallKey();
    const spec=(wp.mode==='per'?((wp.pages||{})[key]||{type:'none',img:null}):wp)||{type:'none',img:null};
    const type=spec.type||'none';
    const b=document.body;
    b.classList.toggle('wall-on',type!=='none');
    const op=Number(app.wallOpacity);
    b.style.setProperty('--wall-opacity',isFinite(op)?Math.max(0,Math.min(1,op)):1);
    b.style.setProperty('--wall-zoom',String(Math.max(1,Math.min(1.8,Number(app.wallZoom)||1))));
    b.style.setProperty('--wall-x',(Number(app.wallX)||0)+'px');
    b.style.setProperty('--wall-y',(Number(app.wallY)||0)+'px');
    b.classList.remove('wall-dawn','wall-cream','wall-mist','wall-local');
    if(type!=='none') b.classList.add('wall-'+type);
    const wall=document.getElementById('appWall');
    if(wall) wall.className='app-wall'+(type!=='none'?' wall-'+type:'');
    const seq=++wallSeq;
    const st=document.documentElement.style;
    if(type==='local'&&spec.img){
      const set=url=>{
        if(seq!==wallSeq) return;
        if(url) st.setProperty('--wall-img','url("'+url+'")');
        else st.removeProperty('--wall-img');
      };
      if(String(spec.img).indexOf('data:')===0) set(spec.img);
      else DB.url(spec.img).then(set).catch(()=>set(null));
    }else{
      st.removeProperty('--wall-img');
    }
  }

  /* ---------- 键盘高度 ---------- */
  function updateKB(){
    const vv=window.visualViewport;
    if(!vv){ document.documentElement.style.setProperty('--kb','0px'); return; }
    const kb=Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop));
    document.documentElement.style.setProperty('--kb',kb+'px');
  }

  /* ---------- 开屏（仅 index.html 有 #splash；user.html 无，测试不受影响） ---------- */
  function createSplash(){
    const el=document.getElementById('splash');
    if(!el) return null;
    let reduce=false;
    try{
      const raw=localStorage.getItem('sq_state_v1');
      const s=raw?JSON.parse(raw):null;
      reduce=!!(s&&s.app&&s.app.reduceMotion);
    }catch(e){}
    const box=document.getElementById('splashParticles');
    if(box&&!box.childElementCount&&!reduce){
      for(let i=0;i<14;i++){
        const a=(Math.PI*2*i/14)+(i%3)*0.14;
        const r=72+((i*37)%86);
        const d=document.createElement('i');
        d.style.setProperty('--dx',(Math.cos(a)*r).toFixed(1)+'px');
        d.style.setProperty('--dy',(Math.sin(a)*r).toFixed(1)+'px');
        d.style.setProperty('--dl',(i*26)+'ms');
        d.style.setProperty('--sz',(2+(i%3))+'px');
        box.appendChild(d);
      }
    }
    if(reduce) el.classList.add('splash-static');

    let hidden=false, timeDone=false, bootDone=false;
    const hide=()=>{
      if(hidden) return;
      hidden=true;
      el.classList.add('out');
      setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); },380);
    };
    el.addEventListener('click',hide);
    const minMs=reduce?400:1900;
    setTimeout(()=>{ timeDone=true; if(bootDone) hide(); },minMs);
    setTimeout(hide,6500);   /* 兜底，避免启动异常时一直卡住 */
    return ()=>{ bootDone=true; if(timeDone) hide(); };
  }

  /* 数据层广播：聊天页优先局部更新（保住草稿/滚动/录音），其它页面整页重渲染 */
  function storeChanged(){
    if(livePage&&livePage.name===currentName){
      try{ livePage.update(); applyAppPrefs(); return; }
      catch(e){ console.error('局部更新失败，回退整页重渲染：',e); }
    }
    render(); applyAppPrefs();
  }

  function registerSW(){
    if(!('serviceWorker' in navigator)) return;
    if(location.protocol!=='http:'&&location.protocol!=='https:') return;
    navigator.serviceWorker.addEventListener('message',e=>{
      if(e.data&&e.data.type==='open-chat'&&e.data.convId){
        location.hash='#/chat/'+e.data.convId;
      }
    });
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>{
      console.warn('Service Worker 注册失败：',e);
    });
  }

  async function boot(){
    await DB.open();
    Store.init();    applyAppPrefs();
    Store.sub(storeChanged);
    if(window.ReplyEngine){
      ReplyEngine.startProactive();
      ReplyEngine.startGroupRedPacket();
      ReplyEngine.ensureDailyDynamics();
    }
    if(window.ReminderEngine) ReminderEngine.start();
    window.addEventListener('hashchange',()=>{ navDepth++; render(); });
    if(window.visualViewport){
      visualViewport.addEventListener('resize',updateKB);
      visualViewport.addEventListener('scroll',updateKB);
    }
    window.addEventListener('resize',updateKB);
    if(window.matchMedia){
      const mq=matchMedia('(prefers-color-scheme: dark)');
      const onSys=()=>{ if((Store.state.app.theme||'light')==='system') applyAppPrefs(); };
      if(mq.addEventListener) mq.addEventListener('change',onSys);
      else if(mq.addListener) mq.addListener(onSys);
    }
    if(!location.hash) history.replaceState(null,'','#/chats');
    render();
    updateKB();
    registerSW();
    if(splashDone) splashDone();
    console.log('%c✦ Aster 已启动','color:#999');
  }

  const splashDone=createSplash();

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();

  return {rerender:render,back,applyAppPrefs,resolvedTheme,
    BUBBLE_SCHEMES,BUBBLE_SHAPES,SPLASH:!!document.getElementById('splash')};
})();
