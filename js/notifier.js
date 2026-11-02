/* ===== Desktop / PWA notifications =====
   页面在后台且仍存活时，通过 Service Worker 发系统通知。
   完全关闭 App 后的定时推送需要服务端 Web Push，静态站点无法独立完成。 */
window.Notifier=(function(){
  function supported(){
    return typeof Notification!=='undefined' && 'serviceWorker' in navigator;
  }
  function permission(){
    if(typeof Notification==='undefined') return 'unsupported';
    return Notification.permission;
  }
  async function request(){
    if(!supported()) return {ok:false,permission:'unsupported'};
    try{
      const p=await Notification.requestPermission();
      return {ok:p==='granted',permission:p};
    }catch(e){
      return {ok:false,permission:permission(),error:e.message};
    }
  }
  function show(title,body,opt){
    opt=opt||{};
    if(!supported()||Notification.permission!=='granted') return false;
    const payload={
      type:'notify',
      title:title||'Aster',
      body:body||'',
      tag:opt.tag||'aster-message',
      convId:opt.convId||null,
      url:opt.url||(opt.convId?'./#/chat/'+opt.convId:'./')
    };
    try{
      if(navigator.serviceWorker&&navigator.serviceWorker.controller){
        navigator.serviceWorker.ready.then(reg=>{
          if(reg.active) reg.active.postMessage(payload);
        }).catch(()=>{});
      }else{
        new Notification(payload.title,{body:payload.body,icon:'./icons/icon-192.png',tag:payload.tag});
      }
      return true;
    }catch(e){
      return false;
    }
  }
  return {supported,permission,request,show};
})();
