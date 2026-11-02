/* Aster · 离线应用外壳
   策略：导航与静态资源优先走网络，失败时回退缓存；保证在线拿最新代码，离线仍能打开。 */
const CACHE='aster-shell-v3';
const ASSETS=[
  './',
  './index.html',
  './user.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/variables.css',
  './css/global.css',
  './css/components.css',
  './css/pages.css',
  './css/theme-dark.css',
  './css/glass.css',
  './css/splash.css',
  './js/utils.js',
  './js/icons.js',
  './js/db.js',
  './js/store.js',
  './js/components.js',
  './js/musicPlayer.js',
  './js/musicDock.js',
  './js/topToast.js',
  './js/call.js',
  './js/replyEngine.js',
  './js/reminders.js',
  './js/notifier.js',
  './js/app.js',
  './js/pages/chats.js',
  './js/pages/discover.js',
  './js/pages/me.js',
  './js/pages/checkin.js',
  './js/pages/cards.js',
  './js/pages/replySettings.js',
  './js/pages/reminders.js',
  './js/pages/chatDetail.js',
  './js/pages/chatSettings.js',
  './js/pages/profile.js',
  './js/pages/appearance.js',
  './js/pages/roleProfile.js',
  './js/pages/stickerSettings.js',
  './js/pages/lifePages.js',
  './js/pages/lifePomodoro.js',
  './js/pages/lifeMusic.js',
  './js/pages/lifeTogether.js',
  './js/pages/life.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k.indexOf('aster-')===0&&k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

function putSafe(request,response){
  if(!response||!response.ok||response.type==='opaque') return response;
  const copy=response.clone();
  caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
  return response;
}

self.addEventListener('message',event=>{
  const d=event.data||{};
  if(d.type!=='notify') return;
  event.waitUntil(
    self.registration.showNotification(d.title||'Aster',{
      body:d.body||'',
      icon:'./icons/icon-192.png',
      badge:'./icons/icon-192.png',
      tag:d.tag||'aster-message',
      data:{url:d.url||'./',convId:d.convId||null}
    })
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const data=event.notification.data||{};
  const convId=data.convId;
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      const hit=list.find(c=>c.url.indexOf(self.location.origin)===0);
      if(hit){
        if(convId) hit.postMessage({type:'open-chat',convId});
        return hit.focus();
      }
      return clients.openWindow(data.url||'./');
    })
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(url.pathname.indexOf('/tools/')===0||url.pathname.indexOf('/shots/')===0) return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).then(res=>putSafe(req,res)).catch(()=>{
        const fallback=url.pathname.endsWith('/user.html')?'./user.html':'./index.html';
        return caches.match(fallback).then(hit=>hit||caches.match('./index.html'));
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).then(res=>putSafe(req,res)).catch(()=>caches.match(req,{ignoreSearch:true}))
  );
});
