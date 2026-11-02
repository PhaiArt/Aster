/* ===== IndexedDB 媒体存储（图片 Blob 不进 localStorage） ===== */
window.DB = (()=>{
  const NAME='sq-chat-db', STORE='blobs';
  let idb=null, idbOK=false;
  const urlCache=new Map();   // id -> objectURL

  function open(){
    return new Promise(res=>{
      let done=false;
      const finish=v=>{ if(!done){done=true;res(v);} };
      try{
        const req=indexedDB.open(NAME,1);
        req.onupgradeneeded=e=>{
          const d=e.target.result;
          if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:'id'});
        };
        req.onsuccess=e=>{ idb=e.target.result; idbOK=true; finish(true); };
        req.onerror=()=>{ idbOK=false; finish(false); };
        setTimeout(()=>finish(idbOK),2500);
      }catch(e){ idbOK=false; finish(false); }
    });
  }

  function tx(mode){
    return idb.transaction(STORE,mode).objectStore(STORE);
  }
  function put(id,blob){
    if(!idbOK) return Promise.resolve(false);
    return new Promise((res,rej)=>{
      const r=tx('readwrite').put({id,blob,at:Date.now()});
      r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error);
    });
  }
  function get(id){
    if(!idbOK) return Promise.resolve(null);
    return new Promise(res=>{
      const r=tx('readonly').get(id);
      r.onsuccess=()=>res(r.result?r.result.blob:null);
      r.onerror=()=>res(null);
    });
  }
  function del(id){
    if(urlCache.has(id)){ URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }
    if(!idbOK) return Promise.resolve();
    return new Promise(res=>{ const r=tx('readwrite').delete(id); r.onsuccess=()=>res(); r.onerror=()=>res(); });
  }
  async function url(id){
    if(!id) return null;
    if(urlCache.has(id)) return urlCache.get(id);
    const blob=await get(id);
    if(!blob) return null;
    const u=URL.createObjectURL(blob);
    urlCache.set(id,u);
    return u;
  }

  /* 存一张图片（先压缩），返回 key；失败抛错 */
  async function storeImage(file,opt){
    opt=opt||{};
    const blob=await U.compressImage(file,opt.max||1280,opt.q||0.82);
    const id='img_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
    await put(id,blob);
    urlCache.set(id,URL.createObjectURL(blob));
    return id;
  }

  async function count(){
    if(!idbOK) return urlCache.size;
    return new Promise(res=>{ const r=tx('readonly').count(); r.onsuccess=()=>res(r.result); r.onerror=()=>res(0); });
  }
  async function usage(){
    let bytes=0;
    if(navigator.storage&&navigator.storage.estimate){
      try{ const e=await navigator.storage.estimate(); bytes=e.usage||0; }catch(e){}
    }
    return bytes;
  }

  /* 清空全部媒体（清空并重置演示数据时调用，避免旧图片残留在 IndexedDB） */
  async function clearAll(){
    urlCache.forEach(u=>{ try{ URL.revokeObjectURL(u); }catch(e){} });
    urlCache.clear();
    if(!idbOK) return false;
    return new Promise(res=>{ const r=tx('readwrite').clear(); r.onsuccess=()=>res(true); r.onerror=()=>res(false); });
  }

  return {open,put,get,del,url,storeImage,count,usage,clearAll};
})();
