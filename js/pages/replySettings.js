/* ===== Reply Settings 回复设置页（回复引擎参数） ===== */
window.Pages=window.Pages||{};

Pages.replySettings=function(el){
  function refresh(){
    const s=Store.getReplySettings();
    el.innerHTML=buildHtml(s);
    bind();
  }

  function buildHtml(s){
    let html=UI.head('回复设置',{back:true});
    html+='<div style="padding:8px 16px 30px">';

    /* 回复延迟 */
    html+='<div class="sec-label" style="margin:10px 0 8px">回复延迟（秒）</div>';
    html+='<div class="list-card">'
      +numberRow('delayMin','最低延迟',s.delayMin,0.5,30,0.5,'秒')
      +numberRow('delayMax','最高延迟',s.delayMax,0.5,80,0.5,'秒')
      +'</div>';

    /* 问卷回复延迟 */
    html+='<div class="sec-label" style="margin:16px 0 8px">问卷回复延迟（秒）</div>';
    html+='<div class="list-card">'
      +numberRow('surveyDelayMin','最低延迟',s.surveyDelayMin,0.5,30,0.5,'秒')
      +numberRow('surveyDelayMax','最高延迟',s.surveyDelayMax,0.5,80,0.5,'秒')
      +'</div>';
    html+='<p class="tiny" style="padding:6px 4px">发出「问一问」问卷后，角色在此时间范围内作答</p>';

    /* 回复条数 */
    html+='<div class="sec-label" style="margin:16px 0 8px">回复条数</div>';
    html+='<div class="list-card">'
      +numberRow('countMin','最少条数',s.countMin,1,10,1,'条')
      +numberRow('countMax','最多条数',s.countMax,1,20,1,'条')
      +'</div>';

    /* 已读不回 */
    html+='<div class="sec-label" style="margin:16px 0 8px">已读不回</div>';
    html+='<div class="list-card">'
      +numberRow('noReplyChance','已读不回概率',s.noReplyChance,0,100,1,'%')
      +'</div>';
    html+='<p class="tiny" style="padding:6px 4px">概率越高，角色越容易看完消息不回复</p>';

    /* 引用回复 */
    html+='<div class="sec-label" style="margin:16px 0 8px">引用回复</div>';
    html+='<div class="list-card">'
      +numberRow('quoteChance','引用用户消息概率',s.quoteChance,0,100,1,'%')
      +'</div>';
    html+='<p class="tiny" style="padding:6px 4px">角色回复时可引用你最近 10 条消息中的一条；概率按每次角色回复计算，引用最多一条。</p>';

    /* 角色动态 */
    html+='<div class="sec-label" style="margin:16px 0 8px">角色动态</div>';
    html+='<div class="list-card">'
      +numberRow('dynamicChance','发送动态概率',s.dynamicChance,0,100,1,'%')
      +numberRow('dynamicMin','每条最少字卡',s.dynamicMin,1,6,1,'张')
      +numberRow('dynamicMax','每条最多字卡',s.dynamicMax,1,6,1,'张')
      +'</div>';
    html+='<p class="tiny" style="padding:6px 4px">每个角色每天有 2 次发布机会，各自按概率触发，所以每天可能是 0–2 条；每条从动态字卡里抽 1–6 张拼成文案。</p>';

    /* 报备 */
    html+='<div class="sec-label" style="margin:16px 0 8px">报备</div>';
    html+='<div class="list-card">'
      +numberRow('reportChance','发送报备概率',s.reportChance,0,100,1,'%')
      +'</div>';
    html+='<p class="tiny" style="padding:6px 4px">角色回复时有此概率改成一条报备（需先在字卡设置里添加报备字卡）</p>';

    /* 表情包 / Emoji */
    html+='<div class="sec-label" style="margin:16px 0 8px">表情包</div>';
    html+='<div class="list-card">'
      +numberRow('stickerChance','图片表情概率',s.stickerChance,0,100,1,'%')
      +numberRow('emojiChance','Emoji 概率',s.emojiChance,0,100,1,'%')
      +'</div>';
    html+='<p class="tiny" style="padding:6px 4px">每条回复按概率换成图片表情或 Emoji；Emoji 一半单独发一条，一半跟在字卡后面。需先在表情包管理里导入。</p>';

    /* 主动消息 */
    html+='<div class="sec-label" style="margin:16px 0 8px">主动消息</div>';
    html+='<div class="list-card"><div class="list-row">'
      +'<div class="grow"><div class="r-name">角色主动发送消息</div>'
      +'<div class="r-sub">开启后角色会不时主动找你聊天、拍一拍、发红包或打视频</div></div>'
      +UI.switchHtml(s.proactiveEnabled,'data-sw="proactiveEnabled"')
      +'</div></div>';

    html+='<div class="sec-label" style="margin:16px 0 8px">主动互动方式</div>';
    html+='<div class="list-card">'
      +numberRow('proactiveMsg','主动发消息',s.proactiveMsg,0,100,1,'%')
      +numberRow('proactivePoke','拍一拍',s.proactivePoke,0,100,1,'%')
      +numberRow('proactiveRedPacket','发红包',s.proactiveRedPacket,0,100,1,'%')
      +numberRow('proactiveVideo','打视频',s.proactiveVideo,0,100,1,'%')
      +'</div>';
    html+='<p class="tiny" style="padding:6px 4px">每次主动互动按权重抽一种，不必凑满 100；默认按每天约 1.5 小时、3–5 次打开调整。</p>';

    html+='<p class="tiny" style="padding:20px 4px 0;text-align:center">修改后立即生效</p>';
    html+='</div>';
    return html;
  }

  function numberRow(key,label,val,min,max,step,unit){
    return '<div class="list-row">'
      +'<div class="grow"><div class="r-name">'+label+'</div></div>'
      +'<input class="field" type="number" data-num="'+key+'" inputmode="decimal"'
      +' min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"'
      +' style="width:76px;padding:8px 10px;text-align:center;font-size:14px;flex-shrink:0">'
      +'<span class="tiny" style="margin-left:8px;min-width:20px;flex-shrink:0">'+unit+'</span>'
      +'</div>';
  }

  function bind(){
    const backBtn=U.$('[data-back]',el);
    if(backBtn) backBtn.onclick=()=>App.back();

    U.$$('[data-num]',el).forEach(input=>{
      const key=input.dataset.num;
      const min=parseFloat(input.min), max=parseFloat(input.max);
      input.onchange=()=>{
        let v=parseFloat(input.value);
        if(isNaN(v)) v=min;
        v=U.clamp(v,min,max);
        input.value=v;
        Store.setReplySetting(key,v);
        validatePair();
        UI.toast('已保存');
      };
    });

    UI.bindSwitch(el,'[data-sw]',on=>{
      Store.setReplySetting('proactiveEnabled',on);
      UI.toast(on?'已开启主动消息':'已关闭主动消息');
    });
  }

  /* 配对校验：上限不得低于对应下限 */
  function validatePair(){
    const s=Store.getReplySettings();
    if(s.delayMax<s.delayMin){
      Store.setReplySetting('delayMax',s.delayMin);
      const input=U.$('[data-num="delayMax"]',el);
      if(input) input.value=s.delayMin;
      UI.toast('最高延迟已自动调整为不低于最低延迟');
    }
    if(s.countMax<s.countMin){
      Store.setReplySetting('countMax',s.countMin);
      const input=U.$('[data-num="countMax"]',el);
      if(input) input.value=s.countMin;
      UI.toast('最多条数已自动调整为不低于最少条数');
    }
    if(s.surveyDelayMax<s.surveyDelayMin){
      Store.setReplySetting('surveyDelayMax',s.surveyDelayMin);
      const input=U.$('[data-num="surveyDelayMax"]',el);
      if(input) input.value=s.surveyDelayMin;
      UI.toast('问卷最高延迟已自动调整为不低于最低延迟');
    }
    if(s.dynamicMax<s.dynamicMin){
      Store.setReplySetting('dynamicMax',s.dynamicMin);
      const input=U.$('[data-num="dynamicMax"]',el);
      if(input) input.value=s.dynamicMin;
      UI.toast('动态最多字卡已自动调整为不低于最少字卡');
    }
  }

  refresh();
};
