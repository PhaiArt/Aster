/* ===== 报备系统（原打卡/报备，统一为「报备」） ===== */
window.Pages=window.Pages||{};

/* 报备编辑弹窗 */
Pages.openCheckinComposer=function(conv, onSent){
  let imgKey=null;
  const nowTxt=U.fmtFull(Date.now());
  UI.openModal({
    title:'报备',
    html:
      '<div class="ck-time-row" style="display:flex;align-items:center;gap:7px;justify-content:center;font-size:11.5px;color:var(--text-3);margin-bottom:12px">'
      +I.clock(14)+'<span>'+U.esc(nowTxt)+'</span></div>'
      +'<div id="ck-imgbox"></div>'
      +'<textarea class="field" id="ck-text" placeholder="记下此刻…（示例：下大暴雨了）" maxlength="120" style="margin-top:12px"></textarea>'
      +'<div class="modal-actions">'
      +'<button class="btn light" data-a="cancel">取消</button>'
      +'<button class="btn dark" data-a="ok">提交报备</button></div>',
    after(ov,api){
      const box=U.$('#ck-imgbox',ov);
      function renderImg(){
        box.innerHTML= imgKey
          ?'<div style="position:relative"><div class="img-msg" style="width:100%;border-style:solid" data-lightbox>'
          +'<img data-blob="'+U.esc(imgKey)+'"></div>'
          +'<button class="ck-rm" style="position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:50%;background:rgba(42,42,46,.75);color:#fff;display:flex;align-items:center;justify-content:center">'+I.x(14)+'</button></div>'
          :'<button id="ck-pick" style="width:100%;height:110px;border:1.5px dashed var(--border);border-radius:14px;color:var(--text-3);font-size:12.5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:var(--bg-soft)">'
          +I.image(20)+'<span>选择图片（可选）</span></button>';
        UI.mountBlobs(box);
        const pick=U.$('#ck-pick',box);
        if(pick) pick.onclick=()=>{
          U.pickFile('image/*',async f=>{
            try{ imgKey=await DB.storeImage(f,{max:1280,q:.82}); renderImg(); }
            catch(e){ UI.toast('图片读取失败：'+e.message); }
          });
        };
        const rm=U.$('.ck-rm',box);
        if(rm) rm.onclick=()=>{ imgKey=null; renderImg(); };
        const pv=U.$('[data-lightbox]',box);
        if(pv) pv.onclick=e=>{ if(e.target.closest('.ck-rm'))return;
          const img=pv.querySelector('img'); if(img&&img.src) UI.lightbox(img.src); };
      }
      renderImg();
      ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
      ov.querySelector('[data-a=ok]').onclick=()=>{
        const text=U.$('#ck-text',ov).value.trim();
        if(!text&&!imgKey){ UI.toast('写点什么或选一张图片吧'); return; }
        Store.addCheckin({conv:conv.id, by:'me', text, imgKey});
        api.close();
        UI.toast('报备已发送到聊天');
        if(typeof onSent === 'function'){ try{ onSent(); }catch(e){} }
      };
      setTimeout(()=>U.$('#ck-text',ov).focus(),150);
    }
  });
};

/* 报备详情弹窗 */
Pages.showCheckinDetail=function(ck){
  const author=Store.displayName(ck.by);
  UI.openModal({
    title:'报备详情',
    html:
      '<div style="text-align:center;font-size:11px;color:var(--text-3);margin-bottom:10px;letter-spacing:1px">CHECK-IN RECORD</div>'
      +(ck.imgKey?'<div class="img-msg" data-lightbox style="width:100%;border-style:solid"><img data-blob="'+U.esc(ck.imgKey)+'"></div>':'')
      +(ck.text?'<div style="font-size:16px;line-height:1.65;margin-top:14px;word-break:break-word">'+U.esc(ck.text)+'</div>':'')
      +'<div style="margin-top:14px;font-size:11px;color:var(--text-3);line-height:1.9">'
      +'来自 '+U.esc(author)+'<br>'+U.esc(U.fmtFull(ck.at))+'</div>'
      +'<div class="modal-actions"><button class="btn light block" data-a="close">关闭</button></div>',
    after(ov,api){
      ov.querySelector('[data-a=close]').onclick=()=>api.close();
      const pv=U.$('[data-lightbox]',ov);
      if(pv) pv.onclick=()=>{ const img=pv.querySelector('img'); if(img&&img.src) UI.lightbox(img.src); };
    }
  });
};

/* 报备记录列表弹窗 */
Pages.showCheckinList=function(list,title){
  const items=list.slice().sort((a,b)=>b.at-a.at);
  UI.openModal({
    title:title||'报备记录',
    html: items.length
      ?'<div style="max-height:60dvh;overflow:auto;display:flex;flex-direction:column;gap:10px">'
      +items.map(k=>'<button class="mem-item" data-ck="'+k.id+'" style="width:100%;text-align:left">'
        +(k.imgKey?'<img data-blob="'+U.esc(k.imgKey)+'" style="width:46px;height:46px;border-radius:10px;object-fit:cover;flex-shrink:0">':'')
        +'<div class="grow"><div class="mem-text">'+(U.esc(k.text)||'<span style="color:var(--text-3)">（图片报备）</span>')+'</div>'
        +'<div class="mem-time">'+U.esc(Store.displayName(k.by))+' · '+U.esc(U.ago(k.at))+'</div></div></button>').join('')
      +'</div>'
      :'<div class="empty"><div class="empty-ico">📌</div>还没有报备记录</div>'
      +'<div class="modal-actions"><button class="btn light block" data-a="close">关闭</button></div>',
    after(ov,api){
      ov.querySelector('[data-a=close]')&&(ov.querySelector('[data-a=close]').onclick=()=>api.close());
      U.$$('[data-ck]',ov).forEach(b=>{
        b.onclick=()=>{ const k=Store.state.checkins.find(x=>x.id===b.dataset.ck); if(k){ api.close(); Pages.showCheckinDetail(k); } };
      });
    }
  });
};
