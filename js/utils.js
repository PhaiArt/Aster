/* ===== 工具函数 ===== */

window.U = {
  $:(s,el)=> (el||document).querySelector(s),
  $$:(s,el)=> Array.from((el||document).querySelectorAll(s)),
  esc:s=> String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  uid:p=> (p||'id')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
  clamp:(v,a,b)=> Math.min(b,Math.max(a,v)),
  pad:n=> String(n).padStart(2,'0'),
  /* 语音/录音时长：75 → 1:15（原来固定 "0:mm" 会在超过 60 秒时显示成 0:75） */
  fmtDur(sec){ sec=Math.max(0,Math.round(+sec||0)); return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'); },

  fmtClock(ts){ const d=new Date(ts); let h=d.getHours(); const ap=h>=12?'PM':'AM'; h=h%12||12; return ap+' '+h+':'+U.pad(d.getMinutes()); },
  fmtClock24(ts){ const d=new Date(ts); return U.pad(d.getHours())+':'+U.pad(d.getMinutes()); },
  weekday(ts){ return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(ts).getDay()]; },
  sameDay(a,b){ const x=new Date(a),y=new Date(b); return x.getFullYear()===y.getFullYear()&&x.getMonth()===y.getMonth()&&x.getDate()===y.getDate(); },
  dayStart(ts){ const d=new Date(ts); d.setHours(0,0,0,0); return d.getTime(); },
  fmtList(ts){
    const now=Date.now();
    if(U.sameDay(ts,now)) return U.fmtClock(ts);
    if(U.sameDay(ts,now-86400000)) return '昨天';
    if(now-ts < 6*86400000) return U.weekday(ts).slice(0,3);
    const d=new Date(ts); return (d.getMonth()+1)+'/'+d.getDate();
  },
  fmtDayChip(ts){
    const now=Date.now();
    if(U.sameDay(ts,now)) return '今天';
    if(U.sameDay(ts,now-86400000)) return '昨天 '+U.fmtClock(ts);
    const d=new Date(ts);
    return (d.getMonth()+1)+'月'+d.getDate()+'日 '+U.fmtClock(ts);
  },
  fmtPost(ts){
    if(U.sameDay(ts,Date.now())) return U.fmtClock24(ts);
    return U.weekday(ts)+' · '+U.fmtClock24(ts);
  },
  ago(ts){
    const s=Math.floor((Date.now()-ts)/1000);
    if(s<60) return '刚刚';
    if(s<3600) return Math.floor(s/60)+'分钟前';
    if(s<86400) return Math.floor(s/3600)+'小时前';
    if(s<7*86400) return Math.floor(s/86400)+'天前';
    const d=new Date(ts); return (d.getMonth()+1)+'月'+d.getDate()+'日';
  },
  fmtFull(ts){ const d=new Date(ts); return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日 '+U.fmtClock(ts); },

  /* 图片压缩：file -> blob（控制尺寸与质量，避免存储爆炸） */
  compressImage(file,max,q){
    max=max||1280; q=q||0.82;
    return new Promise((res,rej)=>{
      if(!file || !/^image\//.test(file.type)) return rej(new Error('不是图片文件'));
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{
        let {width:w,height:h}=img;
        const scale=Math.min(1,max/Math.max(w,h));
        w=Math.round(w*scale); h=Math.round(h*scale);
        const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        cv.getContext('2d').drawImage(img,0,0,w,h);
        cv.toBlob(b=>{ URL.revokeObjectURL(url); b?res(b):rej(new Error('图片处理失败')); },'image/jpeg',q);
      };
      img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('图片读取失败')); };
      img.src=url;
    });
  },

  /* 生成 SVG 渐变 + emoji 头像 data-uri（种子数据用） */
  svgAvatar(emoji,c1,c2){
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">'
      +'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
      +'<stop offset="0" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></linearGradient></defs>'
      +'<rect width="96" height="96" fill="url(#g)"/>'
      +'<circle cx="70" cy="22" r="14" fill="rgba(255,255,255,.35)"/>'
      +'<text x="48" y="60" font-size="40" text-anchor="middle">'+emoji+'</text></svg>';
    return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
  },
  /* 种子“照片”：柔和灰调静物/天气插画 */
  svgPhoto(kind){
    let inner='';
    if(kind==='apples'){ inner='<ellipse cx="48" cy="74" rx="34" ry="10" fill="#DDDFE4"/>'
      +'<circle cx="36" cy="56" r="15" fill="#C9CCD3"/><circle cx="60" cy="58" r="15" fill="#D3D6DC"/>'
      +'<path d="M36 41q1-7 6-9" stroke="#AEB2BA" stroke-width="2" fill="none"/><path d="M60 43q-1-6-5-9" stroke="#AEB2BA" stroke-width="2" fill="none"/>'
      +'<circle cx="31" cy="51" r="4" fill="rgba(255,255,255,.5)"/><circle cx="55" cy="53" r="4" fill="rgba(255,255,255,.5)"/>'; }
    else if(kind==='desk'){ inner='<rect x="14" y="52" width="34" height="26" rx="4" fill="#D8DAE0"/>'
      +'<rect x="52" y="42" width="30" height="36" rx="4" fill="#E4E5EA"/>'
      +'<circle cx="67" cy="60" r="9" fill="#CFD2D9"/><circle cx="67" cy="60" r="4" fill="#B9BDC6"/>'
      +'<rect x="20" y="58" width="22" height="3" rx="1.5" fill="#B9BDC6"/><rect x="20" y="65" width="16" height="3" rx="1.5" fill="#C6C9D0"/>'; }
    else if(kind==='rain'){ inner='<rect width="96" height="96" fill="#E8EAEE"/>'
      +'<ellipse cx="34" cy="30" rx="18" ry="11" fill="#C4C9D2"/><ellipse cx="56" cy="26" rx="16" ry="10" fill="#CFD3DB"/>'
      +'<g stroke="#AAB0BB" stroke-width="2.5" stroke-linecap="round">'
      +'<path d="M28 48v12"/><path d="M42 46v14"/><path d="M56 48v12"/><path d="M70 46v14"/></g>'
      +'<path d="M12 76h72" stroke="#D5D8DE" stroke-width="3" stroke-linecap="round"/>'; }
    else { /* stars: 夜星插画 */ inner='<rect width="96" height="96" fill="#E3E6EC"/>'
      +'<g fill="#9FA5B1"><path d="M30 26l2.4 5.8 6 2.4-6 2.4-2.4 5.8-2.4-5.8-6-2.4 6-2.4z"/>'
      +'<path d="M66 44l1.8 4.4 4.6 1.8-4.6 1.8-1.8 4.4-1.8-4.4-4.6-1.8 4.6-1.8z"/>'
      +'<circle cx="52" cy="70" r="2"/><circle cx="24" cy="62" r="1.6"/><circle cx="78" cy="22" r="1.6"/></g>'
      +'<path d="M70 20a12 12 0 1 1-14-14 10 10 0 1 0 14 14z" fill="#B7BCC6"/>'; }
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">'+inner+'</svg>';
    return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
  },

  vibrate(ms,convId){
    try{
      let on=!!Store.state.app.haptics;
      /* 传入会话时同时尊重「聊天设置 → 轻量互动反馈」的开关 */
      if(on&&convId&&Store.conv(convId)) on=Store.getCS(convId).haptics!==false;
      if(on&&navigator.vibrate) navigator.vibrate(ms||8);
    }catch(e){}
  },
  download(name,text,mime){
    const b=new Blob([text],{type:mime||'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  },
  pickFile(accept,cb){
    const inp=document.createElement('input');
    inp.type='file'; if(accept) inp.accept=accept;
    inp.onchange=()=>{ if(inp.files&&inp.files[0]) cb(inp.files[0]); };
    inp.click();
  },
  pickFiles(accept,cb){
    const inp=document.createElement('input');
    inp.type='file'; inp.multiple=true; if(accept) inp.accept=accept;
    inp.onchange=()=>{ const fs=inp.files?Array.from(inp.files):[]; if(fs.length) cb(fs); };
    inp.click();
  }
};

/* 统一的中性灰白默认头像（圆形人像占位，本地 SVG，所有默认角色共用） */
U.DEFAULT_AVATAR=(()=>{
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">'
    +'<rect width="96" height="96" fill="#ECEEF1"/>'
    +'<circle cx="48" cy="37" r="15.5" fill="#C7CCD4"/>'
    +'<path d="M48 57c-15.5 0-26.5 9.5-28.5 23v16h57V80c-2-13.5-13-23-28.5-23z" fill="#C7CCD4"/>'
    +'</svg>';
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
})();
