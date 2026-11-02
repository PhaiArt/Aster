/* ===== 共享 UI 组件 ===== */
window.UI = (()=>{
  const esc=U.esc;

  /* ---------- 头像 ---------- */
  /* 头像优先级：用户上传(avatarId) > 自定义 emoji > 统一默认头像（本地 SVG，无 emoji） */
  function avatarInner(avatar,avatarId){
    if(avatarId) return '<img data-blob="'+esc(avatarId)+'" alt="">';
    if(avatar&&avatar.emoji) return '<span class="av-emoji">'+esc(avatar.emoji)+'</span>';
    return '<img src="'+U.DEFAULT_AVATAR+'" alt="">';
  }
  function avatar(uid,size,cls){
    const {avatar,avatarId}=Store.avatarOf(uid);
    size=size||44;
    const style='width:'+size+'px;height:'+size+'px;--av:'+size+'px;'
      +(avatar&&avatar.g?'background:linear-gradient(145deg,'+avatar.g[0]+','+avatar.g[1]+')':'');
    return '<span class="avatar '+(cls||'')+'" style="'+style+'">'+avatarInner(avatar,avatarId)+'</span>';
  }
  function avatarRaw(avatarObj,avatarId,size,cls){
    size=size||44;
    const style='width:'+size+'px;height:'+size+'px;--av:'+size+'px;'
      +(avatarObj&&avatarObj.g?'background:linear-gradient(145deg,'+avatarObj.g[0]+','+avatarObj.g[1]+')':'');
    return '<span class="avatar '+(cls||'')+'" style="'+style+'">'+avatarInner(avatarObj,avatarId)+'</span>';
  }
  /* 渲染后调用：把 data-blob 换成真实 objectURL */
  async function mountBlobs(root){
    const els=U.$$('[data-blob]',root);
    for(const el of els){
      const key=el.getAttribute('data-blob');
      if(key.startsWith('data:')){ el.src=key; continue; }
      const url=await DB.url(key);
      if(url) el.src=url;
      else el.closest('.img-msg,.checkin-card')?.classList.add('img-missing');
    }
  }

  /* ---------- Toast ---------- */
  let toastEl=null,toastTimer=null;
  function toast(msg){
    if(toastEl) toastEl.remove();
    clearTimeout(toastTimer);
    toastEl=document.createElement('div');
    toastEl.className='toast'; toastEl.textContent=msg;
    document.body.appendChild(toastEl);
    toastTimer=setTimeout(()=>{ toastEl.classList.add('out'); setTimeout(()=>toastEl&&toastEl.remove(),260); },1800);
  }

  /* ---------- 弹窗系统 ---------- */
  const modalStack=[];
  function openModal(opt){
    opt=opt||{};
    const ov=document.createElement('div');
    ov.className='overlay'+(opt.sheet?' sheet-wrap':'');
    ov.innerHTML='<div class="modal" role="dialog">'+(opt.title?'<div class="modal-title">'+esc(opt.title)+'</div>':'')+(opt.html||'')+'</div>';
    document.body.appendChild(ov);
    document.body.style.overflow='hidden';
    const api={
      el:ov,
      close(){
        const i=modalStack.indexOf(api); if(i>=0) modalStack.splice(i,1);
        ov.remove();
        if(!modalStack.length) document.body.style.overflow='';
        if(opt.onClose) opt.onClose();
      }
    };
    modalStack.push(api);
    if(opt.sheet){ ov.addEventListener('click',e=>{ if(e.target===ov) api.close(); }); }
    mountBlobs(ov);
    if(opt.after) opt.after(ov,api);
    return api;
  }
  function closeTop(){ const m=modalStack[modalStack.length-1]; if(m) m.close(); }

  /* 确认框：Promise<boolean>（按钮先 settle，close 的 onClose 兜底，避免被先置为 false） */
  function confirm(msg,opt){
    opt=opt||{};
    return new Promise(res=>{
      let done=false;
      const settle=v=>{ if(!done){ done=true; res(v); } };
      const m=openModal({
        html:'<div class="modal-title">'+esc(opt.title||'请确认')+'</div>'
          +'<div class="modal-sub" style="white-space:pre-wrap">'+esc(msg)+'</div>'
          +'<div class="modal-actions">'
          +'<button class="btn light" data-a="no">取消</button>'
          +'<button class="btn '+(opt.danger?'dark':'dark')+'" data-a="yes">'+esc(opt.ok||'确定')+'</button>'
          +'</div>',
        after(ov,api){
          ov.querySelector('[data-a=no]').onclick=()=>{ settle(false); api.close(); };
          ov.querySelector('[data-a=yes]').onclick=()=>{ settle(true); api.close(); };
        },
        onClose:()=>settle(false)
      });
      if(opt.danger){ const b=m.el.querySelector('[data-a=yes]'); b.style.background='#B45757'; }
    });
  }

  /* 浮出菜单 */
  let menuEl=null;
  function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl=null; document.removeEventListener('click',onDocClick,true); } }
  function onDocClick(e){ if(menuEl&&!menuEl.contains(e.target)) closeMenu(); }
  function menu(items,x,y,anchor){
    closeMenu();
    menuEl=document.createElement('div');
    menuEl.className='menu';
    menuEl.innerHTML=items.map((it,i)=>
      '<button class="mi '+(it.danger?'danger':'')+'" data-i="'+i+'">'
      +(it.icon?I[it.icon](16):'')+'<span>'+esc(it.label)+'</span></button>').join('');
    document.body.appendChild(menuEl);
    const rect=menuEl.getBoundingClientRect();
    /* 以元素为锚点时，下方放不下就翻到上方（例如底部输入栏的拍一拍按钮） */
    let py=y;
    if(anchor&&anchor.bottom+6+rect.height>innerHeight-10) py=anchor.top-rect.height-6;
    const px=U.clamp(x,10,innerWidth-rect.width-10), py2=U.clamp(py,10,innerHeight-rect.height-10);
    menuEl.style.left=px+'px'; menuEl.style.top=py2+'px';
    menuEl.onclick=e=>{
      const b=e.target.closest('.mi'); if(!b) return;
      const it=items[+b.dataset.i]; closeMenu();
      if(it.onClick) it.onClick();
    };
    setTimeout(()=>document.addEventListener('click',onDocClick,true),0);
  }
  function menuAt(items,anchorEl){
    const r=anchorEl.getBoundingClientRect();
    menu(items,r.right-170,r.bottom+6,r);
  }

  /* 图片查看 */
  function lightbox(src){
    const ov=document.createElement('div');
    ov.className='lightbox';
    ov.innerHTML='<img src="'+src+'" alt="">';
    ov.onclick=()=>ov.remove();
    document.body.appendChild(ov);
  }

  /* 戳一戳特效 */
  function pokeFx(text){
    const fx=document.createElement('div');
    fx.className='poke-fx';
    fx.innerHTML='<div class="pf-star">✦</div><div class="pf-txt">'+esc(text||'')+'</div>';
    document.body.appendChild(fx);
    setTimeout(()=>fx.remove(),1100);
  }

  /* 开关行 */
  function switchHtml(on,attr){
    return '<button class="switch '+(on?'on':'')+'" '+(attr||'')+' role="switch" aria-checked="'+(!!on)+'"></button>';
  }
  function bindSwitch(root,sel,onChange){
    U.$$(sel,root).forEach(btn=>{
      btn.onclick=()=>{
        const on=!btn.classList.contains('on');
        btn.classList.toggle('on',on);
        btn.setAttribute('aria-checked',on);
        U.vibrate(6);
        onChange(on,btn);
      };
    });
  }

  /* 顶栏 */
  function head(title,opt){
    opt=opt||{};
    return '<div class="app-head">'
      +'<div class="head-side">'+(opt.back?'<button class="icon-btn" data-back>'+I.chevronLeft(22)+'</button>':'')+'</div>'
      +'<div class="head-title">'+esc(title)+'</div>'
      +'<div class="head-side right">'+(opt.right||'')+'</div>'
      +'</div>';
  }

  return {avatar,avatarRaw,mountBlobs,toast,openModal,closeTop,confirm,menu,menuAt,closeMenu,lightbox,pokeFx,switchHtml,bindSwitch,head,modalStack};
})();

document.addEventListener('keydown',e=>{ if(e.key==='Escape') UI.closeTop(); });
