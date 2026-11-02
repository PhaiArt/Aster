/* ===== 番茄钟：普通计时 + 角色陪伴 ===== */
window.Pages=window.Pages||{};

Pages.lifePomodoro=function(el){
  const st=Store.state;
  const root=LifeUI.shell(el,'番茄钟');
  const contacts=st.contacts||[];
  let duration=25;
  let remaining=duration*60;
  let running=false, finished=false, timer=null, companion=null;

  root.innerHTML=
    '<div class="pomo-card">'
      +'<div class="pomo-comp" id="pomo-comp" hidden></div>'
      +'<div class="pomo-ring" id="pomo-ring"><div class="pomo-ring-in"><b id="pomo-time">25:00</b><span id="pomo-state">准备开始</span></div></div>'
      +'<div class="pomo-actions"><button class="btn dark" id="pomo-toggle">开始</button><button class="btn light" id="pomo-reset">重置</button></div>'
    +'</div>'
    +'<div id="pomo-setup">'
      +'<div class="ld-sec">专注时长</div>'
      +'<div class="seg light" id="pomo-duration">'
        +'<button class="sg active" data-min="25">25 分钟</button><button class="sg" data-min="45">45 分钟</button><button class="sg" data-min="60">60 分钟</button>'
      +'</div>'
      +'<div class="ld-sec">自己专注</div>'
      +'<button class="ld-item pomo-solo" id="pomo-solo">'+UI.avatar('me',38)
        +'<div class="grow"><div class="ld-item-title">自己专注</div><div class="ld-item-sub">不邀请角色，安静计时</div></div>'
        +'<span class="chev" style="color:var(--text-3)">'+I.chevronRight(16)+'</span></button>'
      +'<div class="ld-sec">选择角色陪伴</div>'
      +'<div class="ld-list" id="pomo-roles">'+contacts.map(c=>
          '<button class="ld-item" data-pomo-role="'+c.id+'">'+UI.avatar(c.id,38)
          +'<div class="grow"><div class="ld-item-title">'+U.esc(c.remark||c.name)+'</div><div class="ld-item-sub">陪你专注，隔一段时间说句话</div></div>'
          +'<span class="chev" style="color:var(--text-3)">'+I.chevronRight(16)+'</span></button>').join('')+'</div>'
      +'<p class="tiny" style="padding:8px 2px 0">陪伴时会从通用和专属字卡里抽一句话发给你。</p>'
    +'</div>'
    +'<div class="ld-sec">陪伴消息</div>'
    +'<div id="pomo-history"></div>';

  UI.mountBlobs(el);

  const $t=U.$('#pomo-time',el), $state=U.$('#pomo-state',el), $ring=U.$('#pomo-ring',el);
  const $toggle=U.$('#pomo-toggle',el), $setup=U.$('#pomo-setup',el), $comp=U.$('#pomo-comp',el);

  function paint(){
    const m=Math.floor(remaining/60), s=remaining%60;
    $t.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    const pct=Math.min(100,Math.max(0,Math.round((1-remaining/(duration*60))*100)));
    $ring.style.background='conic-gradient(var(--dark) 0 '+pct+'%, var(--bg-soft) '+pct+'% 100%)';
    $state.textContent=running?'专注中':(finished?'完成':(remaining<duration*60?'已暂停':'准备开始'));
    $toggle.textContent=running?'暂停':(finished?'再来一轮':(remaining<duration*60?'继续':'开始'));
  }
  function renderComp(){
    if(!companion){ $comp.hidden=true; $comp.innerHTML=''; return; }
    $comp.hidden=false;
    $comp.innerHTML=UI.avatar(companion,48)+'<div><b>'+U.esc(Store.displayName(companion))+'</b><span>在陪你专注</span></div>';
    UI.mountBlobs($comp);
  }
  function renderHistory(){
    const h=(st.app.lifePomoHistory||[]).slice(-30).reverse();
    const box=U.$('#pomo-history',el);
    box.innerHTML=h.length?'<div class="ld-list">'+h.map(x=>
      '<div class="ld-item"><div class="grow"><div class="ld-item-title">'+U.esc(Store.displayName(x.roleId))+'</div>'
      +'<div class="ld-item-sub" style="white-space:normal;line-height:1.55">'+U.esc(x.text)+'</div></div>'
      +'<span class="ld-item-sub">'+U.fmtClock(x.at)+'</span></div>').join('')+'</div>'
      :'<div class="ld-empty">还没有陪伴消息</div>';
  }
  function start(roleId){
    if(running) return;
    if(finished||remaining<=0) remaining=duration*60;
    finished=false;
    companion=roleId||null;
    running=true;
    $setup.style.display='none';
    renderComp();
    paint();
    clearInterval(timer);
    timer=setInterval(tick,1000);
  }
  function tick(){
    if(remaining<=0) return;
    remaining--;
    if(companion&&remaining>0&&(duration*60-remaining)%120===0) speak();
    if(remaining<=0){
      clearInterval(timer); timer=null; running=false; finished=true;
      if(companion) speak('专注完成啦');
      UI.toast('专注完成');
    }
    paint();
  }
  function speak(forced){
    if(!companion) return;
    const pool=[...Store.getUniversalCards(),...(Store.getExclusiveCards(companion)||[])];
    let text=forced;
    if(!text){
      if(!pool.length) text='我在陪你专注';
      else text=pool[Math.floor(Math.random()*pool.length)].content;
    }
    const h=st.app.lifePomoHistory||[];
    h.push({roleId:companion,text,at:Date.now()});
    if(h.length>100) h.splice(0,h.length-100);
    Store.save();
    renderHistory();
  }
  function pause(){
    clearInterval(timer); timer=null; running=false; paint();
  }
  function reset(){
    clearInterval(timer); timer=null; running=false; finished=false; companion=null;
    remaining=duration*60; $setup.style.display=''; renderComp(); paint();
  }

  $toggle.onclick=()=>{
    if(running){ pause(); return; }
    if(finished){ reset(); }
    start(companion||null);
  };
  U.$('#pomo-reset',el).onclick=()=>reset();
  U.$('#pomo-solo',el).onclick=()=>start(null);
  U.$$('[data-pomo-role]',el).forEach(b=>b.onclick=()=>start(b.dataset.pomoRole));
  U.$$('#pomo-duration .sg',el).forEach(b=>b.onclick=()=>{
    if(running) return;
    duration=Number(b.dataset.min)||25;
    remaining=duration*60; finished=false;
    U.$$('#pomo-duration .sg',el).forEach(x=>x.classList.toggle('active',x===b));
    paint();
  });

  paint(); renderHistory();
  Pages._cleanup=()=>{ clearInterval(timer); timer=null; };
};
