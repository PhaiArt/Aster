/* ===== Reply Engine 回复引擎：延迟 / 条数 / 已读不回 / 主动消息 ===== */
window.ReplyEngine=(()=>{

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  /* 组装字卡池：通用 + 该角色专属 */
  function getCardPool(roleId){
    const pool=[];
    Store.getUniversalCards().forEach(c=>{
      if(c && c.content) pool.push({card:c, content:c.content});
    });
    if(roleId){
      Store.getExclusiveCards(roleId).forEach(c=>{
        if(c && c.content) pool.push({card:c, content:c.content});
      });
    }
    return pool;
  }

  /* 规划一次回复：{ noReply, replies:[{content, card, delay}], empty }，delay 为累计毫秒
     empty=true 表示字卡池为空（不是随机已读不回），调用方可据此给用户提示 */
  function planReply(roleId){
    const s=Store.getReplySettings();
    /* 报备：有概率把这一轮回复换成一条报备（没配报备字卡时自动跳过） */
    const reportChance=Math.max(0,Math.min(100,s.reportChance||0));
    if(reportChance>0&&Math.random()*100<reportChance){
      const rep=Store.pickReport();
      if(rep) return {report:rep, noReply:false, replies:[], empty:false};
    }
    const noReply=Math.random()*100 < (s.noReplyChance||0);
    if(noReply) return {noReply:true, replies:[], empty:false};

    const pool=getCardPool(roleId);
    if(pool.length===0) return {noReply:true, replies:[], empty:true};

    const stickers=(Store.state.app.stickerImgs||[]).slice();
    const emojis=(Store.state.app.stickerEmojis||[]).slice();
    const stickerChance=Math.max(0,Math.min(100,s.stickerChance||0));
    const emojiChance=Math.max(0,Math.min(100,s.emojiChance||0));

    const countMin=Math.max(1, s.countMin||1);
    const countMax=Math.max(countMin, s.countMax||countMin);
    const count=countMin+Math.floor(Math.random()*(countMax-countMin+1));

    const delayMin=Math.max(0.5, s.delayMin||4);
    const delayMax=Math.max(delayMin, s.delayMax||15);

    const replies=[];
    let accumulatedDelay=0;
    for(let i=0;i<count;i++){
      const stepDelay=delayMin+Math.random()*(delayMax-delayMin);
      accumulatedDelay+=stepDelay;
      const delay=accumulatedDelay*1000;
      /* 图片表情：直接发一张导入的表情 */
      if(stickerChance>0&&stickers.length&&Math.random()*100<stickerChance){
        replies.push({type:'sticker', imgKey:pick(stickers), delay});
        continue;
      }
      /* Emoji：一半单独发一条，一半跟在字卡后面 */
      if(emojiChance>0&&emojis.length&&Math.random()*100<emojiChance){
        const emo=pick(emojis);
        if(Math.random()<0.5){
          replies.push({type:'emoji', text:emo, delay});
          continue;
        }
        const item=pick(pool);
        replies.push({type:'text', content:item.content+emo, card:item.card, delay});
        continue;
      }
      const item=pick(pool);
      replies.push({type:'text', content:item.content, card:item.card, delay});
    }
    return {noReply:false, replies};
  }

  /* 从当前会话里取用户最近 10 条消息，随机一条作为引用 */
  function pickQuote(convId){
    if(!convId) return null;
    const recent=Store.msgsOf(convId).filter(m=>m.from==='me'&&m.type!=='system').slice(-10);
    if(!recent.length) return null;
    const m=recent[Math.floor(Math.random()*recent.length)];
    const text=(Store.previewOf(m)||'').trim();
    if(!text) return null;
    return {name:Store.displayName('me'),text:text.slice(0,60)};
  }

  /* 角色每天动态：每个角色每天 2 次发布机会，各自按概率触发 → 0–2 条 */
  let dynamicBusy=false;
  function dayKey(){
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function shuffleCopy(list){
    const a=list.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }
  function ensureDailyDynamics(){
    if(dynamicBusy) return;
    const s=Store.getReplySettings();
    const pool=Store.getDynamicCards().filter(c=>c&&c.content);
    if(!pool.length||!(s.dynamicChance>0)) return;
    const app=Store.state.app;
    const today=dayKey();
    if(app.dynamicDay!==today){ app.dynamicDay=today; app.dynamicCounts={}; Store.save(); }
    const counts=app.dynamicCounts||(app.dynamicCounts={});
    const roles=(Store.state.contacts||[]).filter(c=>c&&c.id);
    const chance=Math.max(0,Math.min(100,s.dynamicChance||0));
    const min=Math.max(1,Math.min(6,s.dynamicMin||1));
    const max=Math.max(min,Math.min(6,s.dynamicMax||min));
    let touched=false;
    dynamicBusy=true;
    try{
      roles.forEach(role=>{
        if(Object.prototype.hasOwnProperty.call(counts,role.id)) return;
        counts[role.id]=0;          /* 先占位，避免 addPost 触发重渲染时重复生成 */
        touched=true;
        for(let slot=0;slot<2;slot++){
          if(Math.random()*100>=chance) continue;
          const n=Math.min(pool.length,min+Math.floor(Math.random()*(max-min+1)));
          if(n<1) continue;
          const picked=shuffleCopy(pool).slice(0,n);
          const text=picked.map(c=>c.content).join('\n');
          if(!text) continue;
          Store.addPost({author:role.id,cat:'life',text,at:Date.now()+slot});
          picked.forEach(c=>Store.bumpCardUsage(c));
          counts[role.id]++;
        }
      });
    }finally{ dynamicBusy=false; }
    if(touched){ Store.save(); Store.emit(); }
  }

  /* ---------- 主动消息：每 30 秒检查一次 ---------- */
  let proactiveTimer=null;
  function startProactive(){
    if(proactiveTimer) clearInterval(proactiveTimer);
    proactiveTimer=setInterval(checkProactive,30000);
  }

  function checkProactive(){
    const s=Store.getReplySettings();
    if(!s.proactiveEnabled) return;
    /* 通话中不打扰 */
    if(typeof Call!=='undefined' && Call.state!=='idle') return;

    const now=Date.now();
    /* 距上次主动消息 ≥ 60 分钟 */
    if(now-Store.getLastProactiveAt() < 60*60*1000) return;
    /* 距用户最后发言 ≥ 5 分钟 */
    const lastUser=Store.state._lastMyMsgTime||0;
    if(now-lastUser < 5*60*1000) return;

    /* 3% 概率触发 */
    if(Math.random()*100>=3) return;

    doProactive();
  }

  function doProactive(){
    const convs=Store.state.convs.filter(v=>!v.isGroup && !v.dissolved && v.contactId);
    if(!convs.length) return;
    const cv=pick(convs);
    const s=Store.getReplySettings();
    const pool=getCardPool(cv.contactId);
    /* 每次主动互动按权重抽一种：发消息 / 拍一拍 / 红包 / 视频邀请 */
    const acts=[
      ['msg', Math.max(0, s.proactiveMsg!==undefined?s.proactiveMsg:60)],
      ['poke',Math.max(0, s.proactivePoke!==undefined?s.proactivePoke:20)],
      ['rp',  Math.max(0, s.proactiveRedPacket!==undefined?s.proactiveRedPacket:12)],
      ['call',Math.max(0, s.proactiveVideo!==undefined?s.proactiveVideo:8)]
    ];
    let total=acts.reduce((n,a)=>n+a[1],0);
    let act='msg';
    if(total>0){
      let roll=Math.random()*total;
      for(const a of acts){ if(roll<a[1]){ act=a[0]; break; } roll-=a[1]; }
    }

    if(act==='poke'){
      Store.sysMsg(cv.id, Store.displayName(cv.contactId)+' 拍了拍你 ✦');
      setTimeout(()=>{
        if(Call.state!=='idle') return;
        const it=pool.length?pick(pool):null;
        if(it&&it.card) Store.bumpCardUsage(it.card);
        const txt=it?it.content:'在忙吗？刚刚戳了你一下 ✦';
        Store.incoming(cv.id,{from:cv.contactId,type:'text',text:txt});
      },2200);
    }else if(act==='rp'){
      const amounts=[6.66,8.88,18.88,28.88,52.00];
      Store.incoming(cv.id,{
        from:cv.contactId, type:'redpacket',
        packetId:'rp_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
        amount:pick(amounts), kind:'normal', exclusiveTo:null,
        note:'给你发了个小红包', claims:[], refunded:false
      });
    }else if(act==='call'){
      const msg=Store.incoming(cv.id,{from:cv.contactId,type:'call',answered:false});
      if(window.Call&&Call.showIncoming){
        Call.showIncoming(cv.id,cv.contactId,{
          onAccept:()=>{
            Store.updateMessage(msg.id,{answered:true});
            Call.connect(cv.id);
            if(location.hash!=='#/chat/'+cv.id) location.hash='#/chat/'+cv.id;
          },
          onDecline:()=>Store.updateMessage(msg.id,{declined:true})
        });
      }
    }else{
      if(pool.length===0) return;
      const item=pick(pool);
      if(item.card) Store.bumpCardUsage(item.card);
      Store.incoming(cv.id,{
        from:cv.contactId,
        type:'text',
        text:item.content,
        proactive:true    /* 主动消息标记：气泡右上角 ✦ 由 CSS 渲染 */
      });
    }
    Store.markProactiveSent();
  }

  /* ---------- 角色主动发群红包（仅拼手气）---------- */
  let groupRpTimer = null;
  function startGroupRedPacket(){
    if(groupRpTimer) clearInterval(groupRpTimer);
    groupRpTimer = setInterval(checkGroupRedPacket, 60000);
  }

  function checkGroupRedPacket(){
    const s = Store.getReplySettings();
    if(!s.proactiveEnabled) return;
    if(typeof Call !== 'undefined' && Call.state !== 'idle') return;

    /* 每 60 秒检查一次，1% 概率触发（平均 100 分钟 1 次） */
    if(Math.random() * 100 >= 1) return;

    const groups = Store.state.convs.filter(v => v.isGroup && !v.dissolved && (v.members||[]).length > 0);
    if(!groups.length) return;

    const cv = pick(groups);
    const members = (cv.members||[]).map(id => Store.contact(id)).filter(Boolean);
    if(!members.length) return;

    const role = pick(members);
    const amounts = [8.88, 18.88, 28.88, 52.00, 66.60];
    const amount = pick(amounts);

    const payload = {
      type: 'redpacket',
      packetId: 'rp_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
      amount,
      kind: 'lucky',
      exclusiveTo: null,
      note: '群红包来了，抢个手气~',
      claims: [],
      refunded: false
    };
    Store.incoming(cv.id, Object.assign({from:role.id}, payload));
    autoClaimGroupPacket(cv, role.id);
  }

  function autoClaimGroupPacket(cv, senderId){
    const msg = Store.msgsOf(cv.id).filter(m=>m.type==='redpacket' && m.from===senderId).pop();
    if(!msg) return;
    const eligible = (cv.members||[])
      .filter(id => id !== senderId)
      .map(id => Store.contact(id))
      .filter(Boolean);
    if(!eligible.length) return;

    /* 与用户发红包一致：人均 × [0.75,1.25] 浮动，给后面的人留 0.01，最后一位拿剩余 */
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    let slotsLeft = shuffled.length;
    let delay = 3000;
    shuffled.forEach(r=>{
      const d = delay;
      const others = slotsLeft - 1;
      slotsLeft--;
      setTimeout(()=>{
        const m = Store.state.msgs.find(x=>x.id===msg.id);
        if(!m || m.refunded) return;
        if(Math.random() >= 0.5) return;
        m.claims = m.claims || [];
        if(m.claims.some(c=>c.id===r.id)) return;

        const claimed = m.claims.reduce((s,c)=>s+(+c.amount||0),0);
        const remaining = Math.round((m.amount - claimed) * 100) / 100;
        if(remaining < 0.01) return;

        let share;
        if(others <= 0){
          share = remaining;
        }else{
          const fair = remaining / (others + 1);
          share = fair * (0.75 + Math.random() * 0.5);
          const cap = remaining - 0.01 * others;
          share = Math.min(share, cap);
          share = Math.max(0.01, Math.round(share * 100) / 100);
        }
        share = Math.min(share, remaining);

        m.claims.push({id:r.id, amount:share, at:Date.now()});
        Store.save(); Store.emit();
        Store.sysMsg(cv.id, (r.remark||r.name) + ' 领取了红包 ¥' + share.toFixed(2));
      }, d);
      delay += 2000 + Math.random()*3000;
    });

    setTimeout(()=>{
      const m = Store.state.msgs.find(x=>x.id===msg.id);
      if(!m || m.refunded) return;
      if(!m.claims || m.claims.length === 0){
        m.refunded = true;
        Store.save(); Store.emit();
        Store.sysMsg(cv.id, '红包无人领取，已退回');
      }
    }, 15000);
  }

  /* checkGroupRedPacket 一并导出：供验收手动触发（与 checkProactive 同模式） */
  return {planReply, pickQuote, ensureDailyDynamics, startProactive, checkProactive, startGroupRedPacket, checkGroupRedPacket};
})();
