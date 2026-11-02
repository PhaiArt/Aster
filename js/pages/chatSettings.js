/* ===== Chat Settings 聊天设置 =====
   分类：聊天显示 / 互动行为 / 角色资料与互动文案 / 记忆备忘录 / 聊天数据 */
window.Pages=window.Pages||{};

Pages.chatSettings=function(el,convId){
  const cv=Store.conv(convId);
  if(!cv){ location.hash='#/chats'; return; }
  const st=Store.state;
  const contact=cv.isGroup?null:Store.contact(cv.contactId);
  const title=cv.isGroup?cv.name:(contact.remark||contact.name);
  /* 跨重渲染保留当前分类与子页：
     设置项保存会触发数据层广播 → 整页重渲染，若不保留会"自动跳回主页面"。
     只有用户点返回按钮才逐级退出。 */
  if(!Pages._csNav||Pages._csNav.conv!==convId) Pages._csNav={conv:convId,tab:'display',sub:null};
  let tab=Pages._csNav.tab||'display', sub=Pages._csNav.sub||null;

  el.innerHTML=
    '<div class="app-head">'
    +'<div class="head-side"><button class="icon-btn" id="cs-back">'+I.chevronLeft(22)+'</button></div>'
    +'<div class="head-title" style="letter-spacing:3px;font-size:15px" id="cs-title">CHAT SETTINGS</div>'
    +'<div class="head-side right"></div>'
    +'</div>'
    +'<div id="cs-content"></div>';

  U.$('#cs-back',el).onclick=()=>{
    if(sub){ sub=null; render(); } else App.back();
  };

  function tabsHtml(){
    const tabs=[['display','聊天显示'],['act','互动行为'],['role','角色资料'],['mem','记忆备忘录'],['data','聊天数据']];
    return '<div class="cs-tabs cs-tabs-5">'+tabs.map(t=>'<button class="ct '+(tab===t[0]?'active':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>';
  }
  function backRow(title){
    return '<div class="row" style="padding:12px 2px 2px">'
      +'<button class="icon-btn sm" id="cs-subback">'+I.chevronLeft(19)+'</button>'
      +'<b style="font-size:15px;margin-left:2px">'+U.esc(title)+'</b></div>';
  }
  function bindSubBack(){
    const b=U.$('#cs-subback',el);
    if(b) b.onclick=()=>{ sub=null; render(); };
  }
  function slider(id,min,max,val,fmt){
    return '<div style="display:flex;align-items:center;gap:12px;margin-top:6px">'
      +'<input type="range" class="slider grow" id="'+id+'" min="'+min+'" max="'+max+'" value="'+val+'">'
      +'<span class="slider-val" id="'+id+'-val">'+fmt(val)+'</span></div>';
  }
  function bindSlider(id,fmt,onchange){
    const inp=U.$('#'+id,el), out=U.$('#'+id+'-val',el);
    const paint=()=>{ inp.style.setProperty('--p',((inp.value-inp.min)/(inp.max-inp.min)*100)+'%'); out.textContent=fmt(+inp.value); };
    paint();
    inp.oninput=()=>{ paint(); onchange(+inp.value); };
  }

  /* ================= 头部（头像改为文档流居中，修复偏移） ================= */
  function headHtml(){
    const cs=Store.getCS(convId);
    return '<div class="cs-head">'
      +'<div class="cs-cover">'
      +(cs.roleBg?'<img data-blob="'+U.esc(cs.roleBg)+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'')
      +'<div class="cs-quote">「 Rainy season<br>is no longer coming 」</div></div>'
      +'<div class="cs-av-wrap">'+(cv.isGroup?Pages.groupAvatarHTML(cv,66):UI.avatar(cv.contactId,66))+'</div></div>'
      +'<div class="cs-id"><div class="ci-n">'+U.esc(title)+'</div>'
      +'<div class="ci-s">'+U.esc(contact?contact.sig:'群聊 · '+((cv.members||[]).length+1)+' 位成员')+'</div></div>';
  }

  /* ================= 渲染 ================= */
  function render(){
    Pages._csNav.tab=tab; Pages._csNav.sub=sub;   /* 记录当前位置，重渲染后恢复 */
    const box=U.$('#cs-content',el);
    if(sub==='bg') return renderBg(box);
    if(sub==='rolebg') return renderRoleBg(box);
    if(sub==='members') return renderMembers(box);
    const csNow=Store.getCS(convId);
    let html=headHtml()+tabsHtml()+'<div class="cs-body">';

    if(tab==='display'){
      /* A. 聊天显示 */
      html+='<div class="cs-sec sec-label">背景</div>'
        +'<button class="set-card" data-sub="bg"><span class="set-ico">'+I.camera(18)+'</span>'
        +'<span class="grow"><span class="set-title">聊天背景</span><br><span class="set-sub">图案背景与自定义背景图</span></span>'
        +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></button>'
        +'<button class="set-card" data-sub="rolebg"><span class="set-ico">'+I.image(18)+'</span>'
        +'<span class="grow"><span class="set-title">角色背景图</span><br><span class="set-sub">角色头像后方的封面背景（可导入图片）</span></span>'
        +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></button>'
        +'<div class="cs-sec sec-label" style="margin-top:6px">消息显示</div>'
        +'<div class="set-card" style="cursor:default"><span class="set-ico">'+I.clock(17)+'</span>'
        +'<span class="grow"><span class="set-title">显示时间戳</span><br><span class="set-sub">日期分隔与气泡时间</span></span>'
        +UI.switchHtml(csNow.showTs,'data-sw="showTs"')+'</div>'
        +'<div class="set-card" style="cursor:default"><span class="set-ico">'+I.check(17)+'</span>'
        +'<span class="grow"><span class="set-title">显示已读状态</span><br><span class="set-sub">自己消息下方展示 Read</span></span>'
        +UI.switchHtml(csNow.showRead,'data-sw="showRead"')+'</div>';
    }
    else if(tab==='act'){
      /* B. 互动行为 */
      html+='<div class="cs-sec sec-label">戳一戳</div>'
        +'<div class="set-card" style="cursor:default"><span class="set-ico">'+I.sparkles(18)+'</span>'
        +'<span class="grow"><span class="set-title">启用戳一戳特效</span><br><span class="set-sub">关闭后隐藏聊天页的戳一戳按钮</span></span>'
        +UI.switchHtml(csNow.poke,'data-sw="poke"')+'</div>'
        /* 三行布局：标题 / 小字 / 选项条（缩进 50px 与标题对齐 = 38px 图标 + 12px 间距） */
        +'<div class="set-card poke3row" style="cursor:default;display:block"><span class="row" style="gap:12px"><span class="set-ico">'+I.bell(18)+'</span><span class="set-title">戳一戳反馈方式</span></span>'
        +'<div class="set-sub" style="margin-left:50px;margin-top:2px">触发时的互动反馈</div>'
        +'<div style="margin-left:50px;margin-top:9px"><span class="seg light">'
        +'<button class="sg '+(csNow.pokeMode==='both'?'active':'')+'" data-pm="both">特效+消息</button>'
        +'<button class="sg '+(csNow.pokeMode==='fx'?'active':'')+'" data-pm="fx">仅特效</button>'
        +'<button class="sg '+(csNow.pokeMode==='msg'?'active':'')+'" data-pm="msg">仅消息</button></span></div></div>'
        +'<div class="cs-sec sec-label" style="margin-top:6px">其他行为</div>'
        +'<div class="set-card" style="cursor:default"><span class="set-ico">'+I.chevronDown(18)+'</span>'
        +'<span class="grow"><span class="set-title">自动滚动到最新消息</span><br><span class="set-sub">发送后自动定位到底部</span></span>'
        +UI.switchHtml(csNow.autoScroll,'data-sw="autoScroll"')+'</div>'
        +'<div class="set-card" style="cursor:default"><span class="set-ico">'+I.bell(18)+'</span>'
        +'<span class="grow"><span class="set-title">轻量互动反馈</span><br><span class="set-sub">支持振动的设备上的触感反馈</span></span>'
        +UI.switchHtml(csNow.haptics,'data-sw="haptics"')+'</div>'
        +'<p class="tiny" style="padding:2px 6px">以上选项立即生效并保存在本地。</p>';
    }
    else if(tab==='role'){
      /* C. 角色资料与互动文案 */
      if(cv.isGroup){
        html+='<div class="cs-sec sec-label">群聊资料</div>'
          +'<button class="set-card" id="role-avbtn" style="text-align:left"><span class="set-ico" style="width:52px;height:52px;border-radius:16px;overflow:hidden">'+Pages.groupAvatarHTML(cv,44)+'</span>'
          +'<span class="grow"><span class="set-title">群聊头像</span><br><span class="set-sub">点击上传新头像，同步到所有页面</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></button>'
          +'<div class="set-card" id="role-name" style="cursor:pointer"><span class="set-ico">'+I.pencil(17)+'</span>'
          +'<span class="grow"><span class="set-title">群聊名称</span><br><span class="set-sub">'+U.esc(cv.name)+'</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></div>'
          +'<button class="set-card" data-sub="members"><span class="set-ico">'+I.users(18)+'</span>'
          +'<span class="grow"><span class="set-title">群成员</span><br><span class="set-sub">'+((cv.members||[]).length+1)+' 位成员 · 查看、添加或移除</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></button>';
      }else{
        html+='<div class="cs-sec sec-label">角色资料</div>'
          +'<button class="set-card" id="role-avbtn" style="text-align:left"><span class="set-ico" style="width:52px;height:52px;border-radius:50%;overflow:hidden">'+UI.avatar(cv.contactId,44)+'</span>'
          +'<span class="grow"><span class="set-title">角色头像</span><br><span class="set-sub">点击上传，同步到聊天列表与资料页</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></button>'
          +'<div class="set-card" id="role-remark" style="cursor:pointer"><span class="set-ico">'+I.pencil(17)+'</span>'
          +'<span class="grow"><span class="set-title">昵称与备注</span><br><span class="set-sub">'+U.esc(contact.name)+(contact.remark?' · 备注 '+U.esc(contact.remark):'')+'</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></div>'
          +'<div class="set-card" id="role-handle" style="cursor:pointer"><span class="set-ico">'+I.at(17)+'</span>'
          +'<span class="grow"><span class="set-title">角色 Handle</span><br><span class="set-sub">'+U.esc(Store.handleOf(cv.contactId))+'</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></div>'
          +'<div class="set-card" id="role-sig" style="cursor:pointer"><span class="set-ico">'+I.edit3(17)+'</span>'
          +'<span class="grow"><span class="set-title">个性签名</span><br><span class="set-sub">'+U.esc(contact.sig||'未设置')+'</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></div>'
          +'<div class="set-card" id="role-group" style="cursor:pointer"><span class="set-ico">'+I.folder(17)+'</span>'
          +'<span class="grow"><span class="set-title">聊天分组</span><br><span class="set-sub">当前：'+U.esc((Store.getChatGroups().find(g=>g.id===cv.groupKey)||{}).name||'未分组')+'</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></div>'
          +'<div class="cs-sec sec-label" style="margin-top:6px">互动文案</div>'
          +'<div class="set-card" id="role-poke" style="cursor:pointer"><span class="set-ico">'+I.sparkles(18)+'</span>'
          +'<span class="grow"><span class="set-title">拍一拍文案</span><br><span class="set-sub">'+U.esc(Store.pokeTextOf(cv.contactId))+'（戳一戳时使用）</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></div>'
          +(contact.privateNote?'<div class="set-card" id="role-note" style="cursor:pointer"><span class="set-ico">'+I.lock(17)+'</span>'
            +'<span class="grow"><span class="set-title">私密备注</span><br><span class="set-sub">仅自己可见</span></span>'
            +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></div>':'')
          +'<div class="cs-sec sec-label" style="margin-top:6px">更多</div>'
          +'<div class="set-card" id="role-ck" style="cursor:pointer"><span class="set-ico">'+I.clipboard(18)+'</span>'
          +'<span class="grow"><span class="set-title">报备记录</span><br><span class="set-sub">'+U.esc(contact.name)+' 的历史报备一览</span></span>'
          +'<span class="chev" style="color:#C9C9CF">'+I.chevronRight(17)+'</span></div>'
          +'<button class="btn danger block" id="role-del" style="margin-top:2px">'+I.trash(16)+' 删除联系人</button>';
      }
    }
    else if(tab==='mem'){
      html+=renderMemHtml();
    }
    else{
      /* E. 聊天数据 */
      const msgs=Store.msgsOf(convId);
      const cks=st.checkins.filter(k=>k.conv===convId);
      html+='<div class="stat-card"><span class="set-ico" style="width:44px;height:44px">'+I.database(19)+'</span>'
        +'<div class="grow"><div class="sc-num" style="font-size:22px">'+msgs.length+' 条消息</div>'
        +'<div class="sc-label">含 '+cks.length+' 条报备记录 · 仅保存在本机</div></div></div>'
        +'<button class="btn light block" data-act="export">'+I.download(16)+' 导出当前聊天记录 JSON</button>'
        +'<button class="btn light block" data-act="clear">'+I.trash(16)+' 清空当前聊天记录</button>'
        +'<button class="btn light block" data-act="reset">'+I.refresh(16)+' 恢复当前聊天默认设置</button>';
    }
    html+='</div>';
    box.innerHTML=html;
    UI.mountBlobs(box);
    bindCommon(box);
    if(tab==='mem') bindMem(box);
    if(tab==='data') bindData(box);
    if(tab==='role') bindRole(box);
  }

  function bindCommon(box){
    U.$$('[data-tab]',box).forEach(b=>b.onclick=()=>{ tab=b.dataset.tab; sub=null; render(); });
    U.$$('[data-sub]',box).forEach(b=>b.onclick=()=>{ sub=b.dataset.sub; render(); });
    /* 选项类设置：静默保存 + 就地更新选中态，不触发整页重渲染（避免丢滚动/回上级） */
    UI.bindSwitch(box,'[data-sw]',(on,btn)=>{ Store.setCS(convId,{[btn.dataset.sw]:on},true); U.vibrate(6); });
    U.$$('[data-pm]',box).forEach(b=>b.onclick=()=>{
      Store.setCS(convId,{pokeMode:b.dataset.pm},true);
      U.$$('[data-pm]',box).forEach(x=>x.classList.toggle('active',x===b));
    });
  }

  /* ---------- 聊天显示 · 聊天背景 ---------- */
  function renderBg(box){
    const csNow=Store.getCS(convId);
    let html=headHtml()+backRow('聊天背景')+'<div class="cs-body">';
    html+='<div class="cs-sec sec-label">CHAT BACKGROUND</div>'
      +'<div class="row" style="justify-content:space-between"><b style="font-size:14.5px">聊天背景</b><span class="badge-pill">'+(csNow.bgImg?'CUSTOM':({stars:'STARS',dots:'DOTS',grid:'GRID',plain:'PLAIN'})[csNow.bg]||'DEFAULT')+'</span></div>'
      +'<div class="bg-preview '+(csNow.bgImg?'':'p-'+csNow.bg)+'" id="bg-pv" style="margin-top:10px">'
      +(csNow.bgImg?'<img data-blob="'+U.esc(csNow.bgImg)+'" style="width:100%;height:100%;object-fit:cover">':'')+'</div>'
      +'<div class="bg-choices" style="margin-top:10px">'
      +[['stars','星星'],['dots','点阵'],['grid','格子'],['plain','纯净']].map(b=>
        '<button class="bgc p-'+b[0]+' '+(csNow.bg===b[0]&&!csNow.bgImg?'sel':'')+'" data-bg="'+b[0]+'"><span>'+b[1]+'</span></button>').join('')
      +(csNow.bgImg?'<button class="bgc p-custom sel" data-bg="custom"><img data-blob="'+U.esc(csNow.bgImg)+'" style="width:100%;height:100%;object-fit:cover"><span>自定义</span></button>':'')
      +'</div>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="btn light grow" data-bact="import">'+I.camera(16)+' 导入背景</button>'
      +'<button class="btn light grow" data-bact="resetbg">'+I.refresh(16)+' 恢复默认</button></div>'
      +'<p class="tiny" style="margin-top:10px">语音背景入口已预留（voiceBgImg），将同步到将来的语音通话场景。</p></div>';
    box.innerHTML=html;
    UI.mountBlobs(box);
    bindSubBack();
    /* 预设/导入/恢复：静默保存后仅局部重渲染本子页，保持在当前页面 */
    U.$$('[data-bg]',box).forEach(b=>b.onclick=()=>{
      if(b.dataset.bg==='custom') return;
      Store.setCS(convId,{bg:b.dataset.bg,bgImg:null},true);
      renderBg(box);
    });
    U.$$('[data-bact]',box).forEach(b=>b.onclick=async()=>{
      const k=b.dataset.bact;
      if(k==='import'){
        U.pickFile('image/*',async f=>{
          try{
            const id=await DB.storeImage(f,{max:1440,q:.85});
            Store.setCS(convId,{bgImg:id,bg:'plain'},true);
            UI.toast('背景已导入');
            renderBg(box);
          }catch(e){ UI.toast('图片读取失败：'+e.message); }
        });
      }else if(k==='resetbg'){
        if(await UI.confirm('恢复默认聊天背景？',{title:'恢复默认',ok:'恢复'})){
          Store.setCS(convId,{bg:'stars',bgImg:null},true);
          renderBg(box);
        }
      }
    });
  }

  /* ---------- 聊天显示 · 角色背景图（设置页头像后方封面，与聊天背景相互独立） ---------- */
  function renderRoleBg(box){
    const csNow=Store.getCS(convId);
    let html=headHtml()+backRow('角色背景图')+'<div class="cs-body">';
    html+='<div class="cs-sec sec-label">ROLE COVER</div>'
      +'<div class="cs-cover" id="rb-pv" style="height:110px;border-radius:14px;margin-top:10px">'
      +(csNow.roleBg?'<img data-blob="'+U.esc(csNow.roleBg)+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'')
      +'<div class="cs-quote">「 Rainy season<br>is no longer coming 」</div></div>'
      +'<p class="tiny" style="margin-top:8px">背景图显示在角色头像后方，仅当前'+(cv.isGroup?'群聊':'角色')+'生效；图片经压缩后保存在本机（IndexedDB），刷新后仍保留。</p>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="btn light grow" data-rbact="import">'+I.camera(16)+' '+(csNow.roleBg?'更换图片':'导入图片')+'</button>'
      +'<button class="btn light grow" data-rbact="clear"'+(csNow.roleBg?'':' disabled style="opacity:.45"')+'>'+I.refresh(16)+' 清除背景</button></div></div>';
    box.innerHTML=html;
    UI.mountBlobs(box);
    bindSubBack();
    U.$$('[data-rbact]',box).forEach(b=>b.onclick=async()=>{
      const k=b.dataset.rbact;
      if(k==='import'){
        U.pickFile('image/*',async f=>{
          try{
            const id=await DB.storeImage(f,{max:1440,q:.85});
            Store.setCS(convId,{roleBg:id},true);
            UI.toast('角色背景已更新');
            renderRoleBg(box);
          }catch(e){ UI.toast('图片读取失败：'+e.message); }
        });
      }else if(k==='clear'){
        if(await UI.confirm('清除角色背景图，恢复默认封面？',{title:'清除背景',ok:'清除'})){
          Store.setCS(convId,{roleBg:null},true);
          renderRoleBg(box);
        }
      }
    });
  }

  /* ---------- 群聊资料 · 群成员管理 ---------- */
  function renderMembers(box){
    const cvNow=Store.conv(convId);
    /* 权限：创建者即群主；旧数据无 ownerId 视为当前用户创建；已解散群仅可查看 */
    const canMgr=!cvNow.dissolved&&(cvNow.ownerId||'me')==='me';
    const mems=cvNow.members||[];
    const rows=[];
    rows.push('<div class="mm-row">'+UI.avatar('me',40)
      +'<div class="grow" style="margin-left:10px;min-width:0"><div class="mm-name">'+U.esc(st.user.name)+'（我）</div></div>'
      +'<span class="mm-badge">群主</span></div>');
    mems.forEach(id=>{
      const c=Store.contact(id); if(!c) return;
      rows.push('<div class="mm-row">'+UI.avatar(id,40)
        +'<div class="grow" style="margin-left:10px;min-width:0"><div class="mm-name">'+U.esc(c.remark||c.name)+'</div>'
        +(c.remark?'<div class="tiny">'+U.esc(c.name)+'</div>':'')+'</div>'
        +(canMgr?'<button class="mm-kick" data-kick="'+id+'">移除</button>':'<span class="mm-badge">成员</span>')+'</div>');
    });
    let html=headHtml()+backRow('群成员 · '+(mems.length+1))+'<div class="cs-body">';
    if(canMgr) html+='<button class="btn light block" id="mm-add">'+I.plus(16)+' 添加成员</button>';
    html+='<div class="mem-list" style="margin-top:10px">'+rows.join('')+'</div>';
    if(cvNow.dissolved) html+='<p class="tiny" style="margin-top:10px">群聊已解散，成员列表仅供查看。</p>';
    html+='</div>';
    box.innerHTML=html;
    UI.mountBlobs(box);
    bindSubBack();
    if(!canMgr) return;
    const addBtn=U.$('#mm-add',box);
    if(addBtn) addBtn.onclick=openAddMembers;
    U.$$('[data-kick]',box).forEach(b=>b.onclick=async()=>{
      const c=Store.contact(b.dataset.kick);
      if(c&&await UI.confirm('将「'+U.esc(c.remark||c.name)+'」移出群聊？移出后会向群内发送系统提示。',{title:'移除成员',ok:'移除',danger:true}))
        Store.removeGroupMember(convId,b.dataset.kick);   /* emit → 重渲染，_csNav 保持本子页 */
    });
  }
  function openAddMembers(){
    const cvNow=Store.conv(convId);
    const cand=st.contacts.filter(c=>!(cvNow.members||[]).includes(c.id));
    if(!cand.length){ UI.toast('所有联系人都已在群聊中'); return; }
    let picked=[];
    const markOff='width:20px;height:20px;border-radius:50%;border:1.5px solid var(--border);display:inline-flex;align-items:center;justify-content:center';
    const rows=cand.map(c=>
      '<button class="mem-pick" data-pick="'+c.id+'" style="display:flex;align-items:center;gap:10px;width:100%;padding:9px 8px;border-radius:12px;text-align:left">'
      +UI.avatar(c.id,36)+'<span style="font-size:13.5px;font-weight:500;flex:1">'+U.esc(c.remark||c.name)+'</span>'
      +'<span class="pick-mark" style="'+markOff+'"></span></button>').join('');
    UI.openModal({
      title:'添加成员',
      html:'<p class="tiny" style="margin-bottom:8px">从现有联系人中选择（已在群内的不会出现）</p>'
        +'<div style="max-height:260px;overflow:auto">'+rows+'</div>'
        +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
        +'<button class="btn dark" data-a="ok">添加</button></div>',
      after(ov,api){
        U.$$('[data-pick]',ov).forEach(b=>{
          b.onclick=()=>{
            const id=b.dataset.pick, mark=b.querySelector('.pick-mark');
            if(picked.includes(id)){
              picked=picked.filter(x=>x!==id);
              mark.style.cssText=markOff; mark.innerHTML='';
            }else{
              picked.push(id);
              mark.style.cssText=markOff+';background:var(--dark);border-color:var(--dark)';
              mark.innerHTML='<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
            }
          };
        });
        ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
        ov.querySelector('[data-a=ok]').onclick=()=>{
          if(!picked.length){ UI.toast('请先选择要添加的联系人'); return; }
          Store.addGroupMembers(convId,picked);   /* emit → 重渲染，_csNav 保持本子页 */
          api.close(); UI.toast('已添加 '+picked.length+' 位成员');
        };
      }
    });
  }

  /* ---------- 聊天显示 · 头像与气泡布局 ---------- */
  function renderLayout(box){
    const csNow=Store.getCS(convId);
    function avPreview(){
      const show=csNow.showAvatars&&csNow.avatarWho!=='none';
      const showThem=show&&csNow.avatarWho!=='me';
      const showMe=show&&csNow.avatarWho!=='them';
      const sz=csNow.avatarSize;
      return '<div class="avp" id="avp">'
        +'<div class="avp-row">'+(showThem?UI.avatar(cv.contactId,sz):'')
        +'<div class="avp-b">今晚一起看星星吗 ✦</div></div>'
        +'<div class="avp-row me"><div class="avp-b">好呀，几点？</div>'
        +(showMe?UI.avatar('me',sz):'')+'</div>'
        +'</div>';
    }
    let html=headHtml()+backRow('头像与气泡布局')+'<div class="cs-body">';
    html+='<div class="set-card" style="cursor:default"><span class="grow"><span class="set-title">显示头像</span><br><span class="set-sub">控制聊天气泡旁的头像显示</span></span>'
      +UI.switchHtml(csNow.showAvatars,'data-sw="showAvatars"')+'</div>';
    html+='<div class="cs-sec sec-label">WHO TO DISPLAY</div>'
      +'<div class="seg light" id="av-who">'
      +[['both','双方'],['them','仅对方'],['me','仅我'],['none','都不']].map(w=>
        '<button class="sg '+(csNow.avatarWho===w[0]?'active':'')+'" data-w="'+w[0]+'">'+w[1]+'</button>').join('')+'</div>';
    html+='<div class="cs-sec sec-label" style="margin-top:14px">预览</div>'
      +'<div id="avp-wrap">'+avPreview()+'</div>';
    html+='<div class="cs-sec sec-label" style="margin-top:14px">AVATAR SIZE</div>'
      +slider('sl-av',28,46,csNow.avatarSize,v=>v+'px')
      +'<p class="tiny" style="padding:8px 6px 0">布局仅影响当前聊天，立即生效。</p></div>';
    box.innerHTML=html;
    UI.mountBlobs(box);
    bindSubBack();
    function paintAvp(){
      const wrap=U.$('#avp-wrap',box);
      if(!wrap) return;
      wrap.innerHTML=avPreview();
      UI.mountBlobs(wrap);
    }
    UI.bindSwitch(box,'[data-sw]',(on,btn)=>{
      csNow[btn.dataset.sw]=on;
      Store.setCS(convId,{[btn.dataset.sw]:on},true);
      paintAvp();
    });
    U.$$('#av-who .sg',box).forEach(b=>b.onclick=()=>{
      csNow.avatarWho=b.dataset.w;
      Store.setCS(convId,{avatarWho:b.dataset.w},true);
      U.$$('#av-who .sg',box).forEach(x=>x.classList.toggle('active',x===b));
      paintAvp();
    });
    bindSlider('sl-av',v=>v+'px',v=>{
      csNow.avatarSize=v;
      Store.setCS(convId,{avatarSize:v},true);
      paintAvp();
    });
  }

  /* ---------- 角色资料 ---------- */
  function bindRole(box){
    const groupBtn=U.$('#role-group',box);
    if(groupBtn) groupBtn.onclick=()=>{
      const groups=Store.getChatGroups();
      UI.menuAt(groups.map(g=>({
        icon:'folder',
        label:g.name+(g.id===cv.groupKey?'（当前）':''),
        onClick:()=>{
          if(Store.moveConvToGroup(convId,g.id)) UI.toast('已移到「'+g.name+'」');
        }
      })),groupBtn);
    };
    const avBtn=U.$('#role-avbtn',box);
    if(avBtn) avBtn.onclick=()=>{
      U.pickFile('image/*',async f=>{
        try{
          const id=await DB.storeImage(f,{max:400,q:.85});
          if(cv.isGroup){ Store.conv(convId).avatarId=id; Store.save(); Store.emit(); }
          else Store.updateContact(cv.contactId,{avatarId:id});
          UI.toast('头像已更新'); render();
        }catch(e){ UI.toast('图片读取失败：'+e.message); }
      });
    };
    const remark=U.$('#role-remark',box);
    if(remark) remark.onclick=()=>{
      UI.openModal({
        title:'昵称与备注',
        html:'<div class="sec-label" style="margin-bottom:6px">角色昵称</div>'
          +'<input class="field" id="rl-name" maxlength="24" value="'+U.esc(contact.name)+'">'
          +'<div class="sec-label" style="margin:12px 0 6px">备注名（聊天中优先显示）</div>'
          +'<input class="field" id="rl-remark" maxlength="20" placeholder="留空则显示昵称" value="'+U.esc(contact.remark)+'">'
          +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
          +'<button class="btn dark" data-a="ok">保存</button></div>',
        after(ov,api){
          ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
          ov.querySelector('[data-a=ok]').onclick=()=>{
            const name=U.$('#rl-name',ov).value.trim();
            if(!name){ UI.toast('昵称不能为空'); return; }
            Store.updateContact(cv.contactId,{name,remark:U.$('#rl-remark',ov).value.trim()});
            api.close(); UI.toast('已保存'); render();
          };
        }
      });
    };
    const handleRow=U.$('#role-handle',box);
    if(handleRow) handleRow.onclick=()=>{
      const cur=Store.handleOf(cv.contactId).replace(/^@/,'');
      UI.openModal({
        title:'角色 Handle',
        html:'<div class="sec-label" style="margin-bottom:6px">Handle</div>'
          +'<input class="field" id="rl-handle" maxlength="23" value="'+U.esc(cur)+'" placeholder="例如 test">'
          +'<p class="tiny" style="margin-top:8px">会显示为 @'+U.esc(cur||'test')+'，用于角色资料和动态作者。</p>'
          +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
          +'<button class="btn dark" data-a="ok">保存</button></div>',
        after(ov,api){
          ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
          ov.querySelector('[data-a=ok]').onclick=()=>{
            let v=U.$('#rl-handle',ov).value.trim().replace(/^@+/,'').replace(/\s+/g,'_');
            if(!v){ UI.toast('Handle 不能为空'); return; }
            Store.updateContact(cv.contactId,{handle:'@'+v});
            api.close(); UI.toast('Handle 已更新'); render();
          };
        }
      });
    };
    const sig=U.$('#role-sig',box);
    if(sig) sig.onclick=()=>{
      UI.openModal({
        title:'个性签名',
        html:'<textarea class="field" id="rl-sig" maxlength="60" placeholder="TA 的个性签名">'+U.esc(contact.sig)+'</textarea>'
          +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
          +'<button class="btn dark" data-a="ok">保存</button></div>',
        after(ov,api){
          ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
          ov.querySelector('[data-a=ok]').onclick=()=>{
            Store.updateContact(cv.contactId,{sig:U.$('#rl-sig',ov).value.trim()});
            api.close(); UI.toast('已保存'); render();
          };
        }
      });
    };
    const note=U.$('#role-note',box);
    if(note) note.onclick=()=>{
      UI.openModal({
        title:'私密备注',
        html:'<textarea class="field" id="rl-note" maxlength="60" placeholder="仅自己可见">'+U.esc(contact.privateNote)+'</textarea>'
          +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
          +'<button class="btn dark" data-a="ok">保存</button></div>',
        after(ov,api){
          ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
          ov.querySelector('[data-a=ok]').onclick=()=>{
            Store.updateContact(cv.contactId,{privateNote:U.$('#rl-note',ov).value.trim()});
            api.close(); UI.toast('已保存'); render();
          };
        }
      });
    };
    /* 拍一拍文案（每角色独立，保存立即生效） */
    const poke=U.$('#role-poke',box);
    if(poke) poke.onclick=()=>{
      const cur=contact.pokeText||'';
      UI.openModal({
        title:'拍一拍文案',
        html:'<div class="sec-label" style="margin-bottom:6px">当前文案</div>'
          +'<div class="mem-item" style="padding:10px 14px"><div class="mem-text">'+U.esc('你'+Store.pokeTextOf(cv.contactId)+'「'+title+'」')+'</div></div>'
          +'<div class="sec-label" style="margin:12px 0 6px">自定义文案</div>'
          +'<input class="field" id="rl-poke" maxlength="16" placeholder="示例：拍了拍 / 轻轻戳了戳" value="'+U.esc(cur)+'">'
          +'<p class="tiny" style="margin-top:8px">留空则使用默认文案「'+U.esc(Store.DEFAULT_POKE)+'」。触发戳一戳时生效。</p>'
          +'<div class="modal-actions" style="flex-wrap:wrap">'
          +'<button class="btn light" data-a="reset" style="flex:0 0 auto">恢复默认</button>'
          +'<button class="btn light" data-a="cancel" style="flex:1">取消</button>'
          +'<button class="btn dark" data-a="ok" style="flex:1">保存</button></div>',
        after(ov,api){
          ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
          ov.querySelector('[data-a=reset]').onclick=()=>{
            Store.updateContact(cv.contactId,{pokeText:''});
            api.close(); UI.toast('已恢复默认文案（仅当前角色）'); render();
          };
          ov.querySelector('[data-a=ok]').onclick=()=>{
            Store.updateContact(cv.contactId,{pokeText:U.$('#rl-poke',ov).value.trim()});
            api.close(); UI.toast('拍一拍文案已保存'); render();
          };
        }
      });
    };
    /* 群聊名称 */
    const gname=U.$('#role-name',box);
    if(gname) gname.onclick=()=>{
      UI.openModal({
        title:'群聊名称',
        html:'<input class="field" id="rl-gname" maxlength="24" value="'+U.esc(cv.name)+'">'
          +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
          +'<button class="btn dark" data-a="ok">保存</button></div>',
        after(ov,api){
          ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
          ov.querySelector('[data-a=ok]').onclick=()=>{
            const v=U.$('#rl-gname',ov).value.trim();
            if(!v){ UI.toast('群聊名称不能为空'); return; }
            cv.name=v; Store.save(); Store.emit();
            api.close(); UI.toast('群聊名称已更新');
          };
        }
      });
    };
    /* 报备记录（原资料页入口，整合到统一管理入口） */
    const ckRow=U.$('#role-ck',box);
    if(ckRow) ckRow.onclick=()=>{
      Pages.showCheckinList(Store.checkinsOfContact(cv.contactId),(contact.remark||contact.name)+' 的报备记录');
    };
    /* 删除联系人（原资料页入口，整合到统一管理入口） */
    const delRow=U.$('#role-del',box);
    if(delRow) delRow.onclick=async()=>{
      if(await UI.confirm('确定删除联系人「'+(contact.remark||contact.name)+'」吗？\n相关聊天记录也会一并删除。',{title:'删除联系人',ok:'删除'})){
        Store.deleteContact(cv.contactId);
        UI.toast('已删除');
        location.hash='#/chats';
      }
    };
  }

  /* ---------- 记忆备忘录 ---------- */
  function renderMemHtml(){
    if(cv.isGroup){
      return '<div class="empty"><div class="empty-ico">☾</div>群聊暂不支持联系人记忆</div>';
    }
    return '<div class="cs-sec sec-label">CONTACT MEMORY</div>'
      +'<div class="searchbar" style="height:36px">'+I.search(15)+'<input id="mem-q" placeholder="搜索记忆..." value="'+U.esc(st.ui.memSearch||'')+'"></div>'
      +'<div class="inline-input" style="margin-top:10px"><input id="mem-new" placeholder="记一条关于 TA 的小事..." maxlength="80"><button class="ii-btn" data-mem="add">添加</button></div>'
      +'<div id="mem-list" style="display:flex;flex-direction:column;gap:10px;margin-top:6px"></div>'
      +'<p class="tiny" style="padding:4px 6px">仅保存你主动记录的内容，不会推测对方的想法。</p>';
  }
  function renderMemList(box){
    const q=(st.ui.memSearch||'').trim().toLowerCase();
    let list=Store.memsOf(cv.contactId);
    if(q) list=list.filter(m=>m.text.toLowerCase().includes(q));
    list=list.slice().sort((a,b)=>b.at-a.at);
    const wrap=U.$('#mem-list',box);
    if(!wrap) return;
    wrap.innerHTML= list.length?list.map(m=>
      '<div class="mem-item"><div class="grow"><div class="mem-text">'+U.esc(m.text)+'</div>'
      +'<div class="mem-time">'+U.ago(m.at)+'</div></div>'
      +'<div class="mem-acts"><button class="icon-btn sm" data-mem="edit:'+m.id+'">'+I.pencil(15)+'</button>'
      +'<button class="icon-btn sm" data-mem="del:'+m.id+'">'+I.trash(15)+'</button></div></div>').join('')
      :'<div class="empty" style="padding:22px">还没有记忆条目</div>';
    bindMemRows(box);
  }
  function bindMem(box){
    if(cv.isGroup) return;
    renderMemList(box);
    const q=U.$('#mem-q',box);
    if(q) q.oninput=()=>{ st.ui.memSearch=q.value; renderMemList(box); };
    const addBtn=U.$('[data-mem=add]',box);
    if(addBtn) addBtn.onclick=()=>{
      const v=U.$('#mem-new',box).value.trim();
      if(!v){ UI.toast('先写点什么吧'); return; }
      Store.addMem(cv.contactId,v);
      U.$('#mem-new',box).value='';
      st.ui.memSearch='';
      const qs=U.$('#mem-q',box); if(qs) qs.value='';
      renderMemList(box); UI.toast('已记下 ✦');
    };
  }
  /* 列表每次重建后都要重新绑定（搜索过滤/新增都会重建 #mem-list） */
  function bindMemRows(box){
    U.$$('#mem-list [data-mem]',box).forEach(b=>{
      b.onclick=async()=>{
        const [act,id]=b.dataset.mem.split(':');
        const m=Store.memsOf(cv.contactId).find(x=>x.id===id);
        if(act==='edit'){
          UI.openModal({
            title:'编辑记忆',
            html:'<textarea class="field" id="mem-edit" maxlength="80">'+U.esc(m?m.text:'')+'</textarea>'
              +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
              +'<button class="btn dark" data-a="ok">保存</button></div>',
            after(ov,api){
              ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
              ov.querySelector('[data-a=ok]').onclick=()=>{
                const v=U.$('#mem-edit',ov).value.trim();
                if(v) Store.updateMem(cv.contactId,id,v);
                api.close(); render(); UI.toast('已更新');
              };
            }
          });
        }else if(act==='del'){
          if(await UI.confirm('删除这条记忆？',{title:'删除记忆',ok:'删除'})){ Store.delMem(cv.contactId,id); render(); }
        }
      };
    });
  }

  /* ---------- 聊天数据 ---------- */
  function bindData(box){
    U.$$('[data-act]',box).forEach(b=>b.onclick=async()=>{
      const act=b.dataset.act;
      if(act==='export'){
        const msgs=Store.msgsOf(convId);
        const data=JSON.stringify({chat:title, contact:contact?{name:contact.name,remark:contact.remark||''}:null, exportedAt:new Date().toISOString(), messages:msgs},null,2);
        U.download((contact?contact.name:'群聊')+'-chat.json',data);
        UI.toast('已导出 '+msgs.length+' 条消息');
      }else if(act==='clear'){
        if(await UI.confirm('确定清空与「'+title+'」的全部聊天记录吗？',{title:'清空聊天记录',ok:'清空'})){
          Store.clearMsgs(convId); UI.toast('已清空'); render();
        }
      }else if(act==='reset'){
        if(await UI.confirm('恢复当前聊天的默认设置？背景、布局、密度、互动设置将被重置（消息与角色资料不受影响）。',{title:'恢复默认设置',ok:'恢复'})){
          Store.resetCSAppearance(convId); UI.toast('已恢复默认设置'); render();
        }
      }
    });
  }

  render();
};
