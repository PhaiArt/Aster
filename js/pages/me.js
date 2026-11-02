/* ===== Me 个人中心 ===== */
window.Pages=window.Pages||{};

Pages.me=function(el){
  const st=Store.state, user=st.user;

  /* Handle 编辑弹窗（统一数据源 Store.state.user.handle，保存后全页面同步） */
  function openHandleEditor(){
    UI.openModal({
      title:'修改 Handle',
      html:'<div class="sec-label" style="margin-bottom:8px">HANDLE · 账号</div>'
        +'<input class="field" id="hd-in" maxlength="24" value="'+U.esc(user.handle)+'" placeholder="@your_handle">'
        +'<p class="tiny" style="margin-top:8px">以 @ 开头，保存后聊天列表、动态等页面会同步更新。</p>'
        +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
        +'<button class="btn dark" data-a="ok">保存</button></div>',
      after(ov,api){
        ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
        ov.querySelector('[data-a=ok]').onclick=()=>{
          let v=U.$('#hd-in',ov).value.trim();
          if(!v){ UI.toast('Handle 不能为空'); return; }
          if(!v.startsWith('@')) v='@'+v;
          Store.updateUser({handle:v});
          api.close(); UI.toast('Handle 已更新 ✦');
        };
        setTimeout(()=>{ const i=U.$('#hd-in',ov); i.focus(); i.setSelectionRange(i.value.length,i.value.length); },120);
      }
    });
  }

  let html='<div class="me-title">Personal Profile</div>';
  html+='<div class="me-top">'+UI.avatar('me',66)
    +'<div class="grow"><div class="mi-name">'+U.esc(user.name)+' <span class="badge-pill">'+U.esc(user.badge)+'</span></div>'
    +'<div class="mi-handle" id="me-handle" role="button" title="点击修改 Handle">'+U.esc(user.handle)
    +' <span class="mh-edit">'+I.pencil(11)+'</span></div></div></div>';
  html+='<div class="me-sig">'+U.esc(user.sig)+'</div>';

  /* 封面预览 */
  html+='<div class="me-cover-preview" id="me-cover" role="button">'
    +(user.coverId?'<img data-blob="'+U.esc(user.coverId)+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'')
    +'<span class="cp-tag">'+I.pencil(11)+' 封面 · 点此编辑</span></div>';

  /* 菜单 */
  function mmRow(id,icon,label){
    return '<button class="mm-row" id="'+id+'"><span class="mm-ico">'+I[icon](19)+'</span>'
      +'<span class="grow" style="text-align:left">'+label+'</span>'
      +'<span class="chev">'+I.chevronRight(17)+'</span></button>';
  }
  html+='<div class="me-menu">'
    +mmRow('mm-fav','bookmark','我的收藏')
    +mmRow('mm-sticker','image','表情包管理')
    +mmRow('mm-card','sparkles','字卡设置')
    +mmRow('mm-checkins','clipboard','我的报备')
    +mmRow('mm-chatset','sliders','回复设置')
    +mmRow('mm-reminders','bell','提醒设置')
    +mmRow('mm-appearance','palette','应用外观')
    +mmRow('mm-data','database','本地数据管理')
    +'</div>';
  el.innerHTML=html;

  UI.mountBlobs(el);

  /* ---- Handle 编辑（保存到用户资料，全页面同步） ---- */
  U.$('#me-handle',el).onclick=()=>openHandleEditor();

  U.$('#me-cover',el).onclick=()=>{ location.hash='#/profile'; };

  /* ---- 字卡设置 ---- */
  U.$('#mm-card',el).onclick=()=>{ location.hash='#/cards'; };
  U.$('#mm-reminders',el).onclick=()=>{ location.hash='#/reminders'; };

  /* ---- 我的收藏 ---- */
  U.$('#mm-fav',el).onclick=()=>openCollected();

  function openCollected(){
    const list=Store.collectedPosts();
    UI.openModal({
      title:'我的收藏',
      html: ( list.length
        ?'<div style="max-height:56dvh;overflow:auto;display:flex;flex-direction:column;gap:10px">'
        +list.map(p=>'<div class="mem-item"><div class="grow"><div class="mem-text">'+U.esc(p.text||'（图片动态）')+'</div>'
          +'<div class="mem-time">'+U.ago(p.at)+' · '+((p.imgs||[]).length?p.imgs.length+' 张图':'纯文字')+'</div></div></div>').join('')
        +'</div>'
        :'<div class="empty"><div class="empty-ico">☆</div>还没有收藏任何动态<br>在动态的「更多」菜单里可以收藏</div>' )
        +'<div class="modal-actions"><button class="btn light block" data-a="close">关闭</button></div>',
      after(ov,api){ const b=ov.querySelector('[data-a=close]'); if(b) b.onclick=()=>api.close(); }
    });
  }

  /* ---- 表情包管理页 ---- */
  U.$('#mm-sticker',el).onclick=()=>{ location.hash='#/stickers'; };

  /* ---- 我的报备 ---- */
  U.$('#mm-checkins',el).onclick=()=>Pages.showCheckinList(Store.myCheckins(),'我的报备');

  /* ---- 回复设置入口 ---- */
  U.$('#mm-chatset',el).onclick=()=>{ location.hash='#/reply-settings'; };

  /* ---- 应用外观（独立子页） ---- */
  U.$('#mm-appearance',el).onclick=()=>{ location.hash='#/appearance'; };

  /* ---- 本地数据 ---- */
  U.$('#mm-data',el).onclick=()=>{
    UI.openModal({
      title:'本地数据管理',
      html:
        '<div class="stat-card"><div class="grow">'
        +'<div class="sc-label">本机占用</div>'
        +'<div style="font-size:13px;margin-top:4px">'+U.esc(Store.storageText())+'</div>'
        +'<div class="tiny" id="db-count" style="margin-top:4px">媒体文件统计中…</div></div></div>'
        +'<p class="tiny" style="margin-top:10px;line-height:1.6">JSON 备份包含联系人、聊天、动态、报备与设置，<b>不含图片</b>（图片只保存在本机 IndexedDB）。</p>'
        +'<div class="modal-actions" style="flex-direction:column">'
        +'<button class="btn light block" data-a="export">'+I.download(16)+' 导出全部数据 (JSON)</button>'
        +'<button class="btn light block" data-a="import">'+I.share(16)+' 导入备份 (JSON)</button>'
        +'<button class="btn danger block" data-a="wipe">'+I.trash(16)+' 清空并重置数据</button>'
        +'<button class="btn dark block" data-a="close">关闭</button></div>',
      after(ov,api){
        const cnt=ov.querySelector('#db-count');
        DB.count().then(n=>{ if(cnt) cnt.textContent='媒体文件：'+n+' 个'; });
        function readText(f){
          return new Promise((res,rej)=>{
            const r=new FileReader();
            r.onload=()=>res(String(r.result||''));
            r.onerror=()=>rej(r.error||new Error('文件读取失败'));
            r.readAsText(f);
          });
        }
        ov.querySelector('[data-a=export]').onclick=()=>{
          U.download('sq-backup-'+Date.now()+'.json',Store.exportAll());
          UI.toast('已导出备份文件（不含图片）');
        };
        ov.querySelector('[data-a=import]').onclick=()=>{
          U.pickFile('application/json,.json',async f=>{
            try{
              const text=await readText(f);
              const ok=await UI.confirm('导入将覆盖当前全部数据（联系人、聊天、动态、设置）。确定继续吗？',{title:'导入备份',ok:'导入'});
              if(!ok) return;
              Store.importAll(text);
              api.close();
              UI.toast('备份已导入 ✦');
            }catch(e){ UI.toast('导入失败：'+(e.message||'文件格式不正确')); }
          });
        };
        ov.querySelector('[data-a=wipe]').onclick=async()=>{
          const ok1=await UI.confirm('将清空全部本地数据（联系人、聊天、动态、报备、设置与图片），并恢复初始数据。确定继续吗？',{title:'清空数据',ok:'继续'});
          if(!ok1) return;
          const ok2=await UI.confirm('再次确认：此操作不可撤销。',{title:'最终确认',ok:'清空'});
          if(ok2){ await DB.clearAll(); Store.wipe(); location.reload(); }
        };
        ov.querySelector('[data-a=close]').onclick=()=>api.close();
      }
    });
  };
};
