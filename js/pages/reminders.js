/* ===== Reminder Settings 待办 / 经期提醒设置 ===== */
window.Pages=window.Pages||{};

Pages.reminders=function(el){
  const st=Store.state;
  const rs=st.app.reminderSettings||{};
  const contacts=(st.contacts||[]).slice();

  function save(){
    Store.setApp({reminderSettings:rs},true);
  }
  function defaultPrompt(kind){
    if(window.ReminderEngine&&ReminderEngine.defaultPrompt) return ReminderEngine.defaultPrompt(kind);
    return kind==='todo'?'「{title}」还有 {left} 截止，记得安排一下~':'生理期预计还有 {left} 到达，记得提前做准备~';
  }
  function roleName(c){ return c.remark||c.name||'角色'; }
  function chips(kind){
    const selected=rs[kind+'Roles']||[];
    return contacts.length?contacts.map(c=>{
      const on=selected.indexOf(c.id)>=0;
      return '<button class="sg rem-chip'+(on?' active':'')+'" data-rem-role="'+c.id+'" data-rem-kind="'+kind
        +'" style="height:30px;padding:0 12px;border-radius:999px;font-size:12px;white-space:nowrap;'
        +(on?'background:var(--dark);color:var(--dark-fg)':'background:var(--card);color:var(--text-2)')+'">'
        +U.esc(roleName(c))+'</button>';
    }).join(''):'<span class="tiny">暂无角色</span>';
  }
  function promptEditors(kind){
    const roles=rs[kind+'Roles']||[];
    const prompts=rs[kind+'Prompts']||{};
    if(!roles.length) return '<p class="tiny rem-none">选择角色后，可以为每个角色单独写提醒话术。</p>';
    return roles.map(id=>{
      const c=contacts.find(x=>x.id===id);
      if(!c) return '';
      const val=prompts[id]||defaultPrompt(kind);
      return '<div class="rem-prompt">'
        +'<div class="rem-prompt-head"><span class="rem-dot"></span><b>'+U.esc(roleName(c))+'</b><span class="tiny">独立话术</span></div>'
        +'<textarea class="field rem-prompt-input" rows="2" data-rem-prompt="'+kind+'" data-rem-role-prompt="'+id+'">'+U.esc(val)+'</textarea>'
        +'</div>';
    }).join('');
  }

  function build(){
    let html=UI.head('提醒设置',{back:true});
    html+='<div class="rem-page">';
    html+='<p class="tiny rem-intro">待办按截止日 23:59、经期按预计开始日 00:00 计算。只有网站打开时才提醒；错过的时间点会合并成打开时的一条，已经过去的截止节点不会再补发。</p>';

    const notifSupported=window.Notifier?Notifier.supported():false;
    const notifPerm=notifSupported?Notifier.permission():'unsupported';
    const notifStatus=notifPerm==='granted'
      ?'已开启。网页在后台但仍存活时，消息会发到手机通知中心。'
      :(notifPerm==='denied'
        ?'权限已被拒绝，请到浏览器或系统设置中允许通知。'
        :(notifSupported?'未开启。建议先添加到桌面，再从桌面图标打开后开启。':'当前环境不支持通知；iOS 需要先添加到主屏幕，Safari 普通标签页无法开启。'));
    html+='<div class="cs-sec sec-label">桌面通知</div>';
    html+='<div class="set-card rem-notify-card">'
      +'<div class="rem-notify-row"><span class="rem-notify-dot '+(notifPerm==='granted'?'on':'')+'"></span><div class="grow"><b>桌面通知</b><span>'+U.esc(notifStatus)+'</span></div></div>'
      +(notifPerm==='granted'
        ?'<button class="btn dark block" id="notif-test">发送测试通知</button>'
        :'<button class="btn dark block" id="notif-enable" '+(notifPerm==='unsupported'?'disabled':'')+'>开启桌面通知</button>')
      +'<p class="tiny rem-notify-hint">Android Chrome：菜单 → 安装应用 / 添加到主屏幕。iOS Safari：分享 → 添加到主屏幕，必须从桌面图标打开后再开启。完全关闭 App 后仍要定时推送，需要服务端 Web Push；静态网页无法独立保活。</p>'
      +'</div>';

    html+='<div class="cs-sec sec-label">提醒时间点</div>';
    html+='<div class="set-card rem-th-card">'
      +'<div class="rem-th-grid">'
      +(rs.thresholds||[48,36,24,8]).map((h,i)=>
        '<label class="rem-th"><span>第 '+(i+1)+' 档</span><input class="field" type="number" min="1" max="720" step="1" data-rem-th="'+i+'" value="'+h+'"><em>小时</em></label>'
      ).join('')
      +'</div>'
      +'<p class="tiny" style="margin-top:9px;line-height:1.55">默认 48 / 36 / 24 / 8 小时，可以改成你想要的提前量；超过截止时间不再提醒。</p>'
      +'</div>';

    ['todo','period'].forEach(kind=>{
      const isTodo=kind==='todo';
      const enabled=rs[kind+'Enabled']!==false;
      html+='<div class="cs-sec sec-label">'+(isTodo?'待办提醒':'经期提醒')+'</div>';
      html+='<div class="set-card rem-section">'
        +'<div class="rem-toggle-row"><div><b>'+(isTodo?'待办截止提醒':'生理期预计提醒')+'</b>'
        +'<span>'+(isTodo?'所选角色会在待办截止前提醒你':'所选角色会在预计开始前提醒你')+'</span></div>'
        +'<button class="switch '+(enabled?'on':'')+'" data-rem-toggle="'+kind+'" role="switch" aria-checked="'+enabled+'"></button>'
        +'</div>'
        +'<div class="sec-label" style="margin:12px 1px 7px">提醒角色 <span class="tiny">可多选，角色各自独立发送</span></div>'
        +'<div class="rem-roles">'+chips(kind)+'</div>'
        +'<div class="sec-label" style="margin:14px 1px 7px">提醒话术</div>'
        +'<div class="rem-prompts">'+promptEditors(kind)+'</div>'
        +'<p class="tiny rem-placeholder">可用占位符：{left} 剩余时间 · {hours} 剩余小时数 · {title} 待办名 · {role} 角色名</p>'
        +'</div>';
    });

    html+='<p class="tiny" style="padding:16px 4px 26px;text-align:center">修改后立即生效</p>';
    html+='</div>';
    return html;
  }

  function bind(){
    const back=U.$('[data-back]',el);
    if(back) back.onclick=()=>App.back();

    const enableNotif=U.$('#notif-enable',el);
    if(enableNotif){
      enableNotif.onclick=async()=>{
        if(!window.Notifier){ UI.toast('当前浏览器不支持通知'); return; }
        const r=await Notifier.request();
        if(r.ok){
          UI.toast('桌面通知已开启');
          refresh();
        }else{
          UI.toast(r.permission==='denied'?'通知权限被拒绝':'当前环境无法开启通知');
        }
      };
    }
    const testNotif=U.$('#notif-test',el);
    if(testNotif){
      testNotif.onclick=()=>{
        const ok=Notifier.show('Aster 测试通知','桌面通知连接正常',{tag:'aster-test',url:'./#/reminders'});
        UI.toast(ok?'已发送测试通知':'发送失败，请检查系统通知权限');
      };
    }

    U.$$('[data-rem-toggle]',el).forEach(b=>{
      b.onclick=()=>{
        const kind=b.dataset.remToggle;
        rs[kind+'Enabled']=!(rs[kind+'Enabled']!==false);
        save();
        refresh();
      };
    });
    U.$$('[data-rem-th]',el).forEach(input=>{
      input.onchange=()=>{
        let v=Math.round(Number(input.value));
        if(!isFinite(v)) v=1;
        v=Math.max(1,Math.min(720,v));
        input.value=v;
        const i=Number(input.dataset.remTh);
        if(!Array.isArray(rs.thresholds)) rs.thresholds=[48,36,24,8];
        rs.thresholds[i]=v;
        save();
        UI.toast('提醒时间已保存');
      };
    });
    U.$$('[data-rem-role]',el).forEach(b=>{
      b.onclick=()=>{
        const kind=b.dataset.remKind;
        const id=b.dataset.remRole;
        const key=kind+'Roles';
        if(!Array.isArray(rs[key])) rs[key]=[];
        const i=rs[key].indexOf(id);
        if(i>=0) rs[key].splice(i,1); else rs[key].push(id);
        save();
        refresh();
      };
    });
    U.$$('[data-rem-prompt]',el).forEach(t=>{
      t.oninput=()=>{
        const kind=t.dataset.remPrompt;
        const id=t.dataset.remRolePrompt;
        if(!rs[kind+'Prompts']||typeof rs[kind+'Prompts']!=='object') rs[kind+'Prompts']={};
        rs[kind+'Prompts'][id]=t.value;
        save();
      };
    });
  }

  function refresh(){
    el.innerHTML=build();
    bind();
  }

  refresh();
};
