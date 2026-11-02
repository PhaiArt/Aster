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
  async function show(title,body,opt){
    opt=opt||{};
    if(!supported()||Notification.permission!=='granted') return false;
    const payload={
      title:title||'Aster',
      body:body||'',
      tag:opt.tag||'aster-message',
      convId:opt.convId||null,
      url:opt.url||(opt.convId?'./#/chat/'+opt.convId:'./')
    };
    try{
      /* 不依赖 navigator.serviceWorker.controller：首次打开/刚刷新时它可能为 null，
         但 ready 仍能拿到已激活的 SW；手机上 new Notification 往往不可用。 */
      const reg=await navigator.serviceWorker.ready;
      if(reg&&typeof reg.showNotification==='function'){
        try{
          await reg.showNotification(payload.title,{
            body:payload.body,
            icon:'./icons/icon-192.png',
            badge:'./icons/icon-192.png',
            tag:payload.tag,
            data:{url:payload.url,convId:payload.convId}
          });
          return true;
        }catch(e){
          /* 个别 iOS 版本对页面侧 showNotification 更严格，交给 SW 再试一次 */
          if(reg.active){
            reg.active.postMessage({type:'notify',...payload});
            return true;
          }
          return false;
        }
      }
      if(reg&&reg.active){
        reg.active.postMessage({type:'notify',...payload});
        return true;
      }
      return false;
    }catch(e){
      return false;
    }
  }
  return {supported,permission,request,show};
})();
