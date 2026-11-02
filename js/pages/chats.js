/* ===== Chats 聊天列表 ===== */
window.Pages=window.Pages||{};

/* 分组定义：动态读取 Store.state.chatGroups（[id,显示名,图标]，顺序即展示顺序） */
const FALLBACK_GROUPS=[
  ['pin','置顶','📌'],
  ['star','☆→⟩ × <₊、⁺','⭐'],
  ['four','4ever🤍','🤍']
];
Object.defineProperty(Pages,'GROUP_DEFS',{
  get(){
    try{
      const gs=Store.state.chatGroups;
      if(Array.isArray(gs)&&gs.length) return gs.map(g=>[g.id,g.name,g.icon||'📁']);
    }catch(e){}
    return FALLBACK_GROUPS;
  }
});
Pages.groupNameOf=function(key){
  const d=Pages.GROUP_DEFS.find(g=>g[0]===key);
  return d?d[1]:(key||'未分组');
};

Pages.groupAvatarHTML=function(conv,size){
  return UI.avatarRaw(conv.avatar||null,conv.avatarId||null,size);
};

/* 圆形头像选择按钮（新增联系人 / 新建群聊共用）
   btn：预览按钮元素；初始为统一默认头像；点击后从本地选图并立即预览。 */
Pages.bindAvatarPick=function(btn,onChange){
  btn.innerHTML='<img src="'+U.DEFAULT_AVATAR+'" alt="">';
  btn.onclick=()=>{
    U.pickFile('image/*',async f=>{
      try{
        const id=await DB.storeImage(f,{max:400,q:.85});
        btn.innerHTML='<img data-blob="'+id+'" alt="">';
        UI.mountBlobs(btn.parentElement||document.body);
        btn.classList.add('has-img');
        onChange(id);
      }catch(e){ UI.toast('图片读取失败：'+e.message); }
    });
  };
};

/* 添加联系人弹窗（Chats 页 Add 菜单入口） */
Pages.openAddContact=function(){
  let avatarId=null, group='star';
  const m=UI.openModal({
    title:'新增联系人',
    html:
      '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin:4px 0 14px">'
      +'<button id="ac-av" class="av-pick" title="上传头像"></button>'
      +'<span class="tiny">点击上传头像（可选，默认为统一头像）</span></div>'
      +'<div class="sec-label" style="margin-bottom:8px">昵称</div>'
      +'<input class="field" id="ac-name" placeholder="给 TA 一个昵称（必填）" maxlength="24">'
      +'<div style="margin-top:12px"><div class="sec-label" style="margin-bottom:8px">个性签名</div>'
      +'<input class="field" id="ac-sig" placeholder="TA 的个性签名（可选）" maxlength="40"></div>'
      +'<div style="margin-top:12px"><div class="sec-label" style="margin-bottom:8px">分组</div>'
      +'<div class="seg" id="ac-group">'
      +Pages.GROUP_DEFS.map(g=>'<button class="sg'+(g[0]===group?' active':'')+'" data-g="'+g[0]+'">'+U.esc(g[1])+'</button>').join('')
      +'</div></div>'
      +'<div class="modal-actions">'
      +'<button class="btn light" data-a="cancel">取消</button>'
      +'<button class="btn dark" data-a="ok">保存</button></div>',
    after(ov,api){
      Pages.bindAvatarPick(U.$('#ac-av',ov),id=>{ avatarId=id; });
      U.$$('#ac-group .sg',ov).forEach(b=>{
        b.onclick=()=>{ group=b.dataset.g; U.$$('#ac-group .sg',ov).forEach(x=>x.classList.remove('active')); b.classList.add('active'); };
      });
      ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
      ov.querySelector('[data-a=ok]').onclick=()=>{
        const name=U.$('#ac-name',ov).value.trim();
        if(!name){ UI.toast('请先填写昵称'); return; }
        Store.addContact({name, sig:U.$('#ac-sig',ov).value.trim(), group, avatarId});
        api.close(); UI.toast('已添加「'+name+'」');
      };
      setTimeout(()=>U.$('#ac-name',ov).focus(),120);
    }
  });
  return m;
};

/* 新增群聊弹窗（Chats 页 Add 菜单入口） */
Pages.openCreateGroup=function(){
  let picked=[], avatarId=null;
  const rows=Store.state.contacts.map(c=>
    '<button class="mem-pick" data-pick="'+c.id+'" style="display:flex;align-items:center;gap:10px;width:100%;padding:9px 8px;border-radius:12px;text-align:left">'
    +UI.avatar(c.id,36)+'<span style="font-size:13.5px;font-weight:500;flex:1">'+U.esc(c.remark||c.name)+'</span>'
    +'<span class="pick-mark" style="width:20px;height:20px;border-radius:50%;border:1.5px solid var(--border);display:inline-flex;align-items:center;justify-content:center"></span></button>').join('');
  UI.openModal({
    title:'新增群聊',
    html:
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">'
      +'<button id="gp-av" class="av-pick" title="设置群头像（可选）"></button>'
      +'<div class="grow"><div class="sec-label" style="margin-bottom:8px">群聊名称</div>'
      +'<input class="field" id="gp-name" placeholder="群聊名称（必填）" maxlength="24"></div></div>'
      +'<div class="sec-label" style="margin:4px 0 4px">选择成员（从现有联系人中勾选）</div>'
      +'<div style="max-height:220px;overflow:auto" id="gp-list">'+rows+'</div>'
      +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
      +'<button class="btn dark" data-a="ok">创建群聊</button></div>',
    after(ov,api){
      Pages.bindAvatarPick(U.$('#gp-av',ov),id=>{ avatarId=id; });
      U.$$('[data-pick]',ov).forEach(b=>{
        b.onclick=()=>{
          const id=b.dataset.pick;
          const mark=b.querySelector('.pick-mark');
          if(picked.includes(id)){
            picked=picked.filter(x=>x!==id);
            mark.style.cssText='width:20px;height:20px;border-radius:50%;border:1.5px solid var(--border);display:inline-flex;align-items:center;justify-content:center';
            mark.innerHTML='';
          }else{
            picked.push(id);
            mark.style.cssText='width:20px;height:20px;border-radius:50%;background:var(--dark);border:1.5px solid var(--dark);display:inline-flex;align-items:center;justify-content:center;color:#fff';
            mark.innerHTML=I.check(12);
          }
        };
      });
      ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
      ov.querySelector('[data-a=ok]').onclick=()=>{
        const name=U.$('#gp-name',ov).value.trim();
        if(!name){ UI.toast('请填写群聊名称'); return; }
        if(picked.length<1){ UI.toast('请至少选择 1 位成员'); return; }
        const g=Store.createGroup(name,picked,avatarId?{avatarId}:null);
        api.close(); UI.toast('群聊「'+name+'」已创建');
        location.hash='#/chat/'+g.id;
      };
    }
  });
};

/* 分组设置弹窗（Chats 页 Add 菜单入口）：重命名 / 删除聊天分组，至少保留一个 */
Pages.openChatGroupSettings=function(){
  function bodyHtml(){
    return '<p class="tiny" style="margin-bottom:10px">修改名称后点 ✓ 保存；删除分组时组内会话移入其余分组。</p>'
      +Pages.GROUP_DEFS.map(g=>
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        +'<span style="font-size:18px;flex-shrink:0;width:26px;text-align:center">'+g[2]+'</span>'
        +'<input class="field grow" data-name="'+g[0]+'" value="'+U.esc(g[1])+'" maxlength="16">'
        +'<button class="icon-btn sm" data-save="'+g[0]+'" title="保存">'+I.check(16)+'</button>'
        +'<button class="icon-btn sm" data-del="'+g[0]+'" style="color:#B45757" title="删除分组">'+I.trash(15)+'</button>'
        +'</div>').join('');
  }
  function bind(scope){
    U.$$('[data-save]',scope).forEach(b=>b.onclick=()=>{
      const id=b.dataset.save;
      const inp=U.$('[data-name="'+id+'"]',scope);
      if(!inp.value.trim()){ UI.toast('分组名不能为空'); return; }
      if(Store.renameChatGroup(id,inp.value)) UI.toast('已保存');
    });
    U.$$('[data-del]',scope).forEach(b=>b.onclick=async()=>{
      const id=b.dataset.del;
      const g=Pages.GROUP_DEFS.find(x=>x[0]===id);
      const ok=await UI.confirm('删除分组「'+(g?g[1]:'')+'」？组内会话将移入其余分组。',
        {title:'删除分组',ok:'删除',danger:true});
      if(!ok) return;
      if(!Store.delChatGroup(id)){ UI.toast('至少保留一个分组'); return; }
      UI.toast('已删除分组');
      const body=U.$('#gs-body',m.el);   /* 原地刷新弹窗（会话列表已由 emit 重渲染） */
      if(body){ body.innerHTML=bodyHtml(); bind(body); }
    });
  }
  const m=UI.openModal({
    title:'分组设置',
    html:'<div id="gs-body">'+bodyHtml()+'</div>'
      +'<div class="modal-actions"><button class="btn dark" data-a="ok">完成</button></div>',
    after(ov,api){
      bind(ov);
      ov.querySelector('[data-a=ok]').onclick=()=>api.close();
    }
  });
  return m;
};

Pages.chats=function(el){
  const st=Store.state, ui=st.ui;
  let html=UI.head('Chat');
  html+='<div class="user-strip">'
    +UI.avatar('me',52)
    +'<div class="grow"><div class="us-name">'+U.esc(st.user.name)
    +' <span class="badge-pill">'+U.esc(st.user.badge)+'</span></div>'
    +'<div class="us-sig">'+U.esc(st.user.sig)+'</div></div></div>';
  if(ui.searchOpen){
    html+='<div style="padding:0 16px 12px"><div class="searchbar">'+I.search(16)
      +'<input id="chats-search" placeholder="搜索会话..." value="'+U.esc(ui.chatsSearch)+'"></div></div>';
  }
  const tabs=[['chats','Chats'],['group','Group']];
  html+='<div style="padding:2px 16px 8px"><div class="pillbar">'
    +tabs.map(t=>'<button class="pp '+(ui.chatsTab===t[0]?'active':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('')
    +'<button class="pp add" data-tab="add">+Add</button>'
    +'<button class="pp icon-only'+(ui.searchOpen?' active':'')+'" data-tab="search">'+I.search(17)+'</button>'
    +'</div>';
  /* 分组筛选：'all' 为独立的"全部"状态，不会与普通分组 ID 混淆 */
  if(ui.chatsTab==='chats'){
    const gf=ui.groupFilter||'all';
    html+='<div class="utabs" style="margin:0 2px 10px">'
      +'<button class="ut '+(gf==='all'?'active':'')+'" data-gf="all">All</button>'
      +Pages.GROUP_DEFS.map(g=>'<button class="ut '+(gf===g[0]?'active':'')+'" data-gf="'+g[0]+'">'+U.esc(g[1])+'</button>').join('')
      +'</div>';
  }
  html+='</div><div id="chats-list"></div>';
  el.innerHTML=html;

  /* 分类栏：Chats=单聊 Group=群聊 Add=菜单 Search=搜索 */
  U.$$('[data-tab]',el).forEach(b=>{
    b.onclick=()=>{
      const t=b.dataset.tab;
      if(t==='add'){
        UI.menuAt([
          {icon:'user',label:'新增联系人',onClick:()=>Pages.openAddContact()},
          {icon:'users',label:'新增群聊',onClick:()=>Pages.openCreateGroup()},
          {icon:'folder',label:'分组设置',onClick:()=>Pages.openChatGroupSettings()}
        ],b);
        return;
      }
      if(t==='search'){
        Store.setUi({searchOpen:!ui.searchOpen});
        App.rerender(); return;
      }
      Store.setUi({chatsTab:t}); App.rerender();
    };
  });
  /* 分组筛选切换（全部 / 各分组） */
  U.$$('[data-gf]',el).forEach(b=>b.onclick=()=>{
    Store.setUi({groupFilter:b.dataset.gf}); App.rerender();
  });
  const sInp=U.$('#chats-search',el);
  if(sInp){
    sInp.oninput=()=>{ Store.setUi({chatsSearch:sInp.value}); renderList(); };
    if(!ui.chatsSearch) setTimeout(()=>sInp.focus(),80);
  }

  function chatRow(cv,cls){
    const isGroup=cv.isGroup;
    const c=isGroup?null:Store.contact(cv.contactId);
    if(!isGroup&&!c) return '';
    const name=isGroup?cv.name:(c.remark||c.name);
    const av=isGroup?Pages.groupAvatarHTML(cv,48):UI.avatar(cv.contactId,48);
    const time=cv.lastAt?U.fmtList(cv.lastAt):'';
    return '<button class="chat-item '+(cls||'')+'" data-conv="'+cv.id+'">'
      +av
      +'<div class="grow"><div class="ci-name">'+U.esc(name)+'</div>'
      +'<div class="ci-msg">'+U.esc(cv.lastPreview||'暂无消息')+'</div></div>'
      +'<div class="ci-side"><span class="ci-time">'+time+'</span>'
      +(cv.unread?'<span class="unread-dot">'+(cv.unread>99?'99+':cv.unread)+'</span>':'')
      +'</div></button>';
  }

  function sectionHead(key,icon,label){
    const folded=st.ui.folded[key];
    return '<button class="chat-sec-head" data-fold="'+key+'">'
      +'<span class="sec-ico">'+icon+'</span>'+U.esc(label)
      +'<span class="fold '+(folded?'folded':'')+'">'+I.chevronUp(15)+'</span></button>';
  }

  function renderList(){
    const box=U.$('#chats-list',el);
    const q=(st.ui.chatsSearch||'').trim().toLowerCase();
    let html='';
    if(st.ui.chatsTab==='chats'){
      /* 仅单聊会话 */
      let convs=st.convs.filter(v=>!v.isGroup);
      if(q){
        convs=convs.filter(v=>{
          const n=Store.contact(v.contactId)||{name:'',remark:''};
          const nm=((n.remark||'')+' '+n.name).toLowerCase();
          return nm.includes(q)||(v.lastPreview||'').toLowerCase().includes(q);
        });
        html+=convs.length
          ?'<div class="list-card" style="margin:6px 16px">'+convs.map(v=>chatRow(v)).join('')+'</div>'
          :'<div class="empty"><div class="empty-ico">✦</div>没有匹配的会话</div>';
      }else{
        /* 按分组筛选展示；'all'=查看全部分组；空分组不渲染，避免空卡片 */
        const gf=st.ui.groupFilter||'all';
        const defs=gf==='all'?Pages.GROUP_DEFS:Pages.GROUP_DEFS.filter(s=>s[0]===gf);
        let shown=0;
        defs.forEach(s=>{
          const list=st.convs.filter(v=>!v.isGroup&&v.groupKey===s[0]).sort((a,b)=>b.lastAt-a.lastAt);
          if(!list.length) return;
          shown+=list.length;
          html+=sectionHead(s[0],s[2],s[1]);
          if(!st.ui.folded[s[0]]){
            html+= s[0]==='pin'
              ?'<div class="pinned-wrap" style="padding:0 16px"><div class="list-card">'+list.map(v=>chatRow(v)).join('')+'</div></div>'
              :'<div style="padding:0 16px 4px"><div class="list-card">'+list.map(v=>chatRow(v)).join('')+'</div></div>';
          }
        });
        if(!st.convs.some(v=>!v.isGroup))
          html+='<div class="empty"><div class="empty-ico">✦</div>还没有会话<br>点上方「+Add → 新增联系人」开始</div>';
        else if(!shown)
          html+='<div class="empty"><div class="empty-ico">✦</div>该分组暂无会话</div>';
      }
    }
    else{ /* group：仅群聊会话（已解散的群聊不再作为活跃群聊展示） */
      const gs=st.convs.filter(v=>v.isGroup&&!v.dissolved).filter(v=>!q||v.name.toLowerCase().includes(q));
      html+= gs.length
        ?'<div class="list-card" style="margin:6px 16px">'+gs.map(v=>chatRow(v)).join('')+'</div>'
        :'<div class="empty"><div class="empty-ico">⭐</div>还没有群聊<br>点上方「+Add → 新增群聊」创建</div>';
    }
    box.innerHTML=html;

    U.$$('[data-conv]',box).forEach(b=>b.onclick=()=>{ location.hash='#/chat/'+b.dataset.conv; });
    U.$$('[data-fold]',box).forEach(b=>b.onclick=()=>{
      const k=b.dataset.fold;
      Store.setUi({folded:Object.assign({},st.ui.folded,{[k]:!st.ui.folded[k]})});
      renderList();
    });
  }
  renderList();
};
