/* ===== 角色新消息顶部弹窗：4 秒自动收起，点按进聊天，无关闭按钮 ===== */
window.TopToast=(function(){
  let el=null, timer=null, convId=null;
  let startY=null, suppress=false;

  function ensure(){
    if(el) return el;
    el=document.createElement('div');
    el.className='top-toast';
    el.addEventListener('click',()=>{
      if(suppress){ suppress=false; return; }
      if(!convId) return;
      const cid=convId;
      hide();
      if(location.hash!=='#/chat/'+cid) location.hash='#/chat/'+cid;
    });
    el.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0) return;
      startY=e.clientY;
      el.classList.add('dragging');
      try{ el.setPointerCapture(e.pointerId); }catch(err){}
    });
    el.addEventListener('pointermove',e=>{
      if(startY===null) return;
      const dy=Math.min(0,e.clientY-startY);
      el.style.transform='translate(-50%,'+dy+'px) scale(1)';
      el.style.opacity=String(Math.max(.4,1+dy/140));
    });
    const endSwipe=e=>{
      if(startY===null) return;
      const dy=e.clientY-startY;
      startY=null;
      el.classList.remove('dragging');
      el.style.transform='';
      el.style.opacity='';
      if(Math.abs(dy)>6){
        suppress=true;
        setTimeout(()=>{ suppress=false; },350);
      }
      if(dy<-40) hide();
    };
    el.addEventListener('pointerup',endSwipe);
    el.addEventListener('pointercancel',endSwipe);
    document.body.appendChild(el);
    return el;
  }

  function hide(){
    if(timer){ clearTimeout(timer); timer=null; }
    if(el) el.classList.remove('show');
  }

  function show(detail){
    const msg=detail&&detail.msg;
    const cv=detail&&Store.conv(detail.convId);
    if(!msg||!cv||msg.from==='me'||msg.type==='system') return;
    if(msg.type==='call') return;
    /* 正在看这个会话、开屏还没结束、页面不可见时不弹 */
    if(document.visibilityState!=='hidden'&&location.hash==='#/chat/'+detail.convId) return;
    const splash=document.getElementById('splash');
    if(splash&&!splash.classList.contains('out')) return;

    const c=Store.contact(msg.from);
    const name=c?(c.remark||c.name):Store.displayName(msg.from);
    let text='发来一条消息';
    if(msg.type==='text') text=msg.text||'';
    else if(msg.type==='image'||msg.type==='sticker') text='[图片]';
    else if(msg.type==='checkin') text='给你发了一条报备';
    else if(msg.type==='share') text='分享了一条动态';
    else if(msg.type==='call') text='邀请你视频通话';
    text=String(text).replace(/\s+/g,' ').slice(0,52);

    if(document.visibilityState==='hidden'){
      if(window.Notifier) Notifier.show(name,text,{convId:detail.convId,tag:'msg-'+detail.convId,url:'./#/chat/'+detail.convId});
      return;
    }

    convId=detail.convId;
    const box=ensure();
    box.innerHTML='<span class="tt-av">'+UI.avatar(msg.from,38)+'</span>'
      +'<div class="tt-body"><div class="tt-name">'+U.esc(name)+'</div><div class="tt-text">'+U.esc(text)+'</div></div>'
      +'<span class="tt-now">现在</span>';
    UI.mountBlobs(box);
    box.classList.add('show');
    if(timer) clearTimeout(timer);
    timer=setTimeout(hide,4000);
  }

  window.addEventListener('aster:incoming',e=>{
    try{ show(e.detail); }catch(err){ console.warn('top toast',err); }
  });
  window.addEventListener('hashchange',()=>{
    if(convId&&location.hash==='#/chat/'+convId) hide();
  });
  return {show,hide};
})();
