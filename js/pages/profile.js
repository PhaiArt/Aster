/* ===== Profile：我的资料编辑 + 联系人资料页 ===== */
window.Pages=window.Pages||{};

/* ---------- 我的资料编辑 ---------- */
Pages.myProfile=function(el){
  const st=Store.state, user=st.user;
  el.innerHTML=UI.head('Edit Profile',{back:true})
    +'<div class="pf-cover" id="pf-cover" role="button">'
    +(user.coverId?'<img data-blob="'+U.esc(user.coverId)+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'')
    +'<span class="pfc-hint">更换封面</span></div>'
    +'<div class="pf-av-wrap"><button id="pf-av" style="border-radius:50%" title="更换头像">'+UI.avatar('me',76)+'</button></div>'
    +'<div class="pf-fields">'
    +'<div><div class="fl">NICKNAME · 昵称</div><input class="field" id="pf-name" maxlength="16" value="'+U.esc(user.name)+'"></div>'
    +'<div><div class="fl">BADGE · 小标签</div><input class="field" id="pf-badge" maxlength="10" value="'+U.esc(user.badge)+'"></div>'
    +'<div><div class="fl">HANDLE · 账号</div><input class="field" id="pf-handle" maxlength="24" value="'+U.esc(user.handle)+'" placeholder="@your_handle"></div>'
    +'<div><div class="fl">SIGNATURE · 个性签名</div><textarea class="field" id="pf-sig" maxlength="60">'+U.esc(user.sig)+'</textarea></div>'
    +'<button class="btn dark block" id="pf-save">save</button>'
    +'<p class="tiny" style="text-align:center">保存后，聊天列表、联系人、动态与打卡会同步更新。</p></div>';
  UI.mountBlobs(el);
  U.$('[data-back]',el).onclick=()=>App.back();

  U.$('#pf-av',el).onclick=e=>{
    UI.menuAt([
      {icon:'camera',label:'上传头像',onClick:()=>{
        U.pickFile('image/*',async f=>{
          try{ const id=await DB.storeImage(f,{max:400,q:.85}); Store.updateUser({avatarId:id}); UI.toast('头像已更新 ✦'); }
          catch(err){ UI.toast('图片读取失败：'+err.message); }
        });
      }},
      {icon:'refresh',label:'恢复默认头像',onClick:()=>{
        /* 统一使用灰白人像默认头像（U.DEFAULT_AVATAR），不再回退到 emoji 头像 */
        Store.updateUser({avatarId:null,avatar:{}});
        UI.toast('已恢复默认头像');
      }}
    ],e.currentTarget);
  };
  U.$('#pf-cover',el).onclick=e=>{
    UI.menuAt([
      {icon:'camera',label:'上传封面',onClick:()=>{
        U.pickFile('image/*',async f=>{
          try{ const id=await DB.storeImage(f,{max:1600,q:.85}); Store.updateUser({coverId:id}); UI.toast('封面已更新'); }
          catch(err){ UI.toast('图片读取失败：'+err.message); }
        });
      }},
      {icon:'refresh',label:'恢复默认窗帘封面',onClick:()=>{
        Store.updateUser({coverId:null}); UI.toast('已恢复默认封面');
      }}
    ],e.currentTarget);
  };
  U.$('#pf-save',el).onclick=()=>{
    const name=U.$('#pf-name',el).value.trim();
    if(!name){ UI.toast('昵称不能为空'); return; }
    let handle=U.$('#pf-handle',el).value.trim();
    if(!handle){ UI.toast('Handle 不能为空'); return; }
    if(!handle.startsWith('@')) handle='@'+handle;
    Store.updateUser({
      name,
      badge:U.$('#pf-badge',el).value.trim()||'つ♡c',
      sig:U.$('#pf-sig',el).value.trim(),
      handle
    });
    UI.toast('资料已保存，所有页面同步更新 ✦');
    setTimeout(()=>{ if(location.hash.indexOf('#/profile')===0) App.back(); },500);
  };
};

/* 联系人资料页已按「聊天设置 = 角色与聊天统一管理入口」整合移除：
   备注名/签名/头像/拍一拍等在 聊天设置 → 角色资料 管理，
   报备记录与删除联系人移至 聊天设置 → 角色资料 页内。 */
