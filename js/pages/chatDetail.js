/* ===== Chat Detail 聊天详情 ===== */
window.Pages=window.Pages||{};

Pages.chatDetail=function(el,convId){
  const cv=Store.conv(convId);
  if(!cv){ location.hash='#/chats'; return; }
  const st=Store.state;
  const contact=cv.isGroup?null:Store.contact(cv.contactId);
  const cs=Store.getCS(convId);
  const title=cv.isGroup?cv.name:(contact.remark||contact.name);
  const dissolved=!!cv.dissolved;   /* 群聊已解散：仅可查看历史，禁止发送 */

  /* 聊天排版：头像大小由「聊天设置」控制；气泡圆角/配色走全局外观设置 */
  const vars='--chat-avatar:'+cs.avatarSize+'px;';

  el.innerHTML=
    '<div class="chat-page'+(dissolved?' dissolved':'')+'" data-conv="'+U.esc(cv.id)+'">'
    +'<div class="chat-head">'
    +'<button class="icon-btn" id="cd-back">'+I.chevronLeft(22)+'</button>'
    +'<span id="cd-av" role="button" style="display:inline-flex">'+(cv.isGroup?Pages.groupAvatarHTML(cv,38):UI.avatar(cv.contactId,38))+'</span>'
    +'<div class="grow" id="cd-titlerow" role="button"><div class="ch-name">'+U.esc(title)+'</div></div>'
    +'<button class="icon-btn" id="cd-more">'+I.moreH(20)+'</button>'
    +'</div>'
    +(dissolved?'<div class="gd-banner">该群聊已解散 · 仅可查看历史消息</div>':'')
    +'<div class="chat-body bg-'+cs.bg+'" id="cd-body" style="'+vars+'">'
    +(cs.bgImg?'<img data-blob="'+U.esc(cs.bgImg)+'" style="position:fixed;inset:0;width:100%;max-width:430px;margin:0 auto;height:100dvh;object-fit:cover;opacity:.16;pointer-events:none;z-index:0">':'')
    +'<div id="cd-msgs" style="position:relative;z-index:1"></div>'
    +'</div>'
    /* 角色「正在输入…」：贴在底部工具栏上方，默认隐藏（不占高度） */
    +'<div class="typing-row" id="cd-typing" hidden aria-live="polite"></div>'
    /* 第一行：快捷功能栏（语音 / 通话 / 图片 / 报备 / 红包） */
    +'<div class="chat-toolbar" id="cd-tools">'
    +['mic','phone','image','clipboard','survey','gift'].map(k=>{
        const ico = k==='survey' ? I.list(20) : I[k](20);
        const tip = ({mic:'语音',phone:'通话',image:'图片',clipboard:'报备',survey:'问一问',gift:'红包'})[k];
        return '<button class="icon-btn" data-tool="'+k+'" title="'+tip+'">'+ico+'</button>';
      }).join('')
    +'</div>'
    /* 第二行：消息输入栏（表情 / 输入框 / 戳一戳 / 发送） */
    +'<div class="chat-inputbar" id="cd-inputbar">'
    +'<button class="poke-btn" id="cd-sticker" title="表情">'+I.smile(21)+'</button>'
    +'<div id="cd-compose" style="flex:1;display:flex;flex-direction:column;gap:6px">'
    +'<div id="cd-replybox"></div>'
    +'<textarea id="cd-text" rows="1" placeholder="say something..."></textarea>'
    +'</div>'
    +(cs.poke?'<button class="poke-btn" id="cd-poke" title="戳一戳">'+I.sparkles(20)+'</button>':'')
    +'<button class="send-btn" id="cd-send">'+I.send(17)+'</button>'
    +'</div>'
    +'</div>';

  const body=U.$('#cd-body',el), msgsBox=U.$('#cd-msgs',el);
  const ta=U.$('#cd-text',el);
  let replyTo=null, recording=null, firstRender=true, emptyHintShown=false;
  let typingPending={};   /* 角色 id -> 该角色尚未到达的回复条数（群聊各自独立计数） */
  Store.readConv(convId);

  /* ---------- 消息渲染 ----------
     布局：消息组之间用居中独立时间标签（day-chip）分隔；
     每条消息一行，头像与气泡顶部对齐（flex-start）；
     msg-meta 仅承载 Read 回执，不再嵌入时间戳。 */
  function readMetaHtml(m){
    if(!(cs.showRead&&m.from==='me'&&m.read)) return '';
    return '<div class="msg-meta"><span class="rd">Read</span></div>';
  }
  function bubbleHtml(m,g){
    const mine=m.from==='me';
    const showAv=cs.showAvatars&&cs.avatarWho!=='none'
      &&!(mine&&cs.avatarWho==='them')&&!(!mine&&cs.avatarWho==='me');
    let inner='';
    /* 问卷：居中独立卡片，不带头像、不带气泡 */
    if(m.type === 'survey'){
      const isAnswered = m.answer !== null && m.answer !== undefined;
      const role = Store.contact(cv.contactId);
      const roleName = role ? (role.remark||role.name) : '对方';
      const answerText = isAnswered ? m.options[m.answer] : '';
      const svHtml = '<div class="survey-card" data-sv="'+m.id+'">'
        + '<div class="sv-question">'+U.esc(m.question)+'</div>'
        + '<div class="sv-preview">'
        +   (isAnswered
              ? U.esc(roleName)+' 选择了：'+U.esc(answerText)
              : U.esc(roleName)+' 回复：待回答...')
        + '</div>'
        + '<div class="sv-options">'
        +   m.options.map((opt, i)=>{
              const sel = isAnswered && i === m.answer;
              return '<div class="sv-option'+(sel?' selected':'')+'">'+U.esc(opt)+'</div>';
            }).join('')
        + '</div>'
        + '</div>';
      return '<div class="msg-row sys survey-row" data-msg="'+m.id+'">' + svHtml + '</div>';
    }
    if(m.replyTo) inner+='<div class="reply-quote"><div class="rq-name">回复 '+U.esc(m.replyTo.name)+'</div>'+U.esc(m.replyTo.text)+'</div>';
    if(m.type==='text') inner+=U.esc(m.text);
    else if(m.type==='no-reply') inner+=U.esc('已读不回');
    else if(m.type==='image') inner+='<div class="img-msg'+(m.stk?' stk':'')+'" data-imgopen="'+m.id+'">'+(m.imgKey&&m.imgKey.startsWith('data:')?'<img src="'+m.imgKey+'">':'<img data-blob="'+U.esc(m.imgKey||'')+'">')+'</div>';
    else if(m.type==='voice'){
      const bars=Array.from({length:12},()=>3+Math.round(Math.random()*10));
      inner+='<div class="voice-bubble" data-voice="'+m.id+'">'
        +'<span class="v-play">'+I.play(11)+'</span>'
        +'<span class="v-wave">'+bars.map(h=>'<i style="height:'+h+'px"></i>').join('')+'</span>'
        +'<span class="v-dur">'+U.fmtDur(m.dur||5)+'</span>'
        +I.quote(12).replace('<svg','<svg style="opacity:.4"')
        +'</div>';
    }
    else if(m.type==='checkin'){
      const ck=st.checkins.find(k=>k.id===m.ckId)||{text:m.text,imgKey:m.imgKey,at:m.at,by:m.from};
      inner+='<div class="checkin-card" data-ck="'+(ck.id||'')+'">'
        +'<div class="ck-head">'+I.clipboard(13)+' 报备<span class="ck-time">'+U.fmtClock(ck.at)+'</span></div>'
        +(ck.imgKey?'<div class="ck-img">'+(ck.imgKey.startsWith('data:')?'<img src="'+ck.imgKey+'">':'<img data-blob="'+U.esc(ck.imgKey)+'">')+'</div>':'')
        +(ck.text?'<div class="ck-text">'+U.esc(ck.text)+'</div>':'')
        +'<div class="ck-foot"><span>来自 '+U.esc(Store.displayName(ck.by))+'</span><span class="ck-open">查看详情</span></div>'
        +'</div>';
    }
    else if(m.type==='transfer'){
      const tfNote=(m.note&&m.note!=='模拟支付 · 无真实交易')?m.note:'';
      inner+='<div class="transfer-card" data-tf="1"><div class="tf-kind">'+U.esc(m.kind||'转账')+'</div>'
        +'<div class="tf-amt">¥ '+(+m.amount||0).toFixed(2)+'</div>'
        +(tfNote?'<div class="tf-note">'+U.esc(tfNote)+'</div>':'')+'</div>';
    }
    else if(m.type==='share'){
      const sp=st.posts.find(x=>x.id===m.postId);
      if(!sp){
        inner+='<div class="share-card"><div class="sh-foot">这条动态已被删除</div></div>';
      }else{
        const first=sp.imgs&&sp.imgs.length?sp.imgs[0]:null;
        const src=first&&String(first).indexOf('data:')===0?first:null;
        inner+='<div class="share-card" data-share="'+sp.id+'">'
          +'<div class="sh-head">'+UI.avatar(sp.author,22)+'<span>'+U.esc(Store.displayName(sp.author))+'</span></div>'
          +'<div class="sh-text">'+U.esc((sp.text||'').slice(0,90))+'</div>'
          +(first?'<div class="sh-img">'+(src?'<img src="'+src+'">':'<img data-blob="'+U.esc(first)+'">')+'</div>':'')
          +'<div class="sh-foot">✦ 动态 · 点击查看</div></div>';
      }
    }
    else if(m.type==='call'){
      const sub=m.answered?'已接听':m.declined?'已拒绝':'对方想和你视频';
      inner+='<div class="call-card">'
        +'<div class="cc-ico">'+I.phone(17)+'</div>'
        +'<div class="grow"><div class="cc-title">视频通话邀请</div>'
        +'<div class="cc-sub">'+sub+'</div></div>'
        +(m.answered?'<span class="tiny">已接听</span>':(m.declined?'<span class="tiny">已拒绝</span>':'<button class="btn dark sm" data-answer="'+m.id+'">接听</button>'))
        +'</div>';
    }
    else if(m.type==='redpacket'){
      const fromName = m.from === 'me' ? '我' : Store.displayName(m.from);
      const isMine = m.from === 'me';
      const kindLabel = m.kind === 'lucky' ? '拼手气' : m.kind === 'exclusive' ? '专属' : '普通';
      const claims = m.claims || [];
      const totalTargets = isMine ? (cv.isGroup ? (cv.members||[]).length : 1) : 1;
      const myClaim = claims.find(c => c.id === 'me');
      let statusText = '';
      const claimedTotal = claims.reduce((s,c)=>s+(+c.amount||0), 0);
      if(isMine){
        if(m.refunded){ statusText = '已退回'; }
        else if(m.kind === 'lucky'){
          statusText = claims.length > 0
            ? '已抢 ¥'+claimedTotal.toFixed(2)+' / ¥'+(+m.amount).toFixed(2)
            : '等待领取';
        }
        else if(claims.length > 0){ statusText = '已领取 ' + claims.length + '/' + totalTargets; }
        else { statusText = '等待领取'; }
      } else {
        if(myClaim){ statusText = '已领取 ¥' + (+myClaim.amount).toFixed(2); }
        else if(m.refunded){ statusText = '已退回'; }
        else if(m.kind === 'lucky'){
          const remain = Math.round((m.amount - claimedTotal) * 100) / 100;
          statusText = remain > 0.01 ? '点击领取' : '已领完';
        }
        else { statusText = '点击领取'; }
      }
      inner += '<div class="redpacket-card" data-rp="'+m.id+'">'
        + '<div class="rp-head"><span class="rp-ico">¥</span>'
        + '<span class="rp-from">'+U.esc(fromName)+' 的红包</span></div>'
        + '<div class="rp-note">'+U.esc(m.note||'恭喜发财，大吉大利')+'</div>'
        + '<div class="rp-amt">¥ '+(+m.amount).toFixed(2)+'</div>'
        + '<div class="rp-foot"><span class="rp-kind">'+kindLabel+'</span>'
        + '<span class="rp-status">'+statusText+'</span></div>'
        + '</div>';
    }
    /* wrapper 内联尺寸跟随设置中的头像大小，避免内层头像溢出被气泡压住
       群聊同样按「显示谁的头像」设置渲染每行头像（他人=成员头像，自己=我的头像） */
    const av=(showAv&&(cs.avatarWho==='both'||(mine&&cs.avatarWho==='me')||(!mine&&cs.avatarWho==='them')))
      ?('<span class="m-av" style="width:'+cs.avatarSize+'px;height:'+cs.avatarSize+'px">'+(mine?UI.avatar('me',cs.avatarSize):UI.avatar(m.from,cs.avatarSize))+'</span>')
      :'';
    /* 群聊里对方消息的昵称只在消息组第一条上方显示一次 */
    const groupName=(!mine&&cv.isGroup&&g.first)?'<div class="tiny" style="margin:0 4px 2px">'+U.esc(Store.displayName(m.from))+'</div>':'';
    /* 报备消息：气泡定宽（ck-bubble），卡片 100% 填充，不再超出气泡
       主动消息：✦ 装饰完全由 CSS ::after 渲染，inner 不拼接
       已读不回：正常气泡结构 + bubble-muted 弱化样式 */
    const bubCls='bubble'
      +(m.type==='checkin'?' ck-bubble':'')
      +(m.type==='image'&&m.stk?' stk-bubble':'')
      +(m.type==='share'?' share-bubble':'')
      +(m.type==='call'?' call-bubble':'')
      +(m.proactive?' has-proactive':'')
      +(m.type==='no-reply'?' bubble-muted':'');
    return '<div class="msg-row '+(mine?'mine':'')+(g.cont?' cont':'')+(m.type==='system'?' sys':'')+'" data-msg="'+m.id+'">'
      +(m.type==='system'?('<div class="sys-tip">'+U.esc(m.text)+'</div>')
        :(av+ '<div class="grow">'+groupName+'<div class="'+bubCls+'" style="cursor:pointer" data-act="'+m.id+'">'+inner+'</div>'+readMetaHtml(m)+'</div>'))
      +'</div>';
  }

  function renderMsgs(forceBottom){
    /* 记录滚动位置：局部刷新时不要打断正在翻看历史的人 */
    const prevTop=body.scrollTop;
    const wasBottom=body.scrollHeight-body.scrollTop-body.clientHeight<=32;
    const list=Store.msgsOf(convId);
    let html='', lastDay=null, prev=null, lastTsAt=null;
    list.forEach(m=>{
      const day=U.dayStart(m.at);
      const isSys=m.type==='system';
      if(day!==lastDay){
        const dayLabel=U.fmtDayChip(m.at);
        html+='<div class="day-chip">'+dayLabel+(cs.showTs&&dayLabel==='今天'?' '+U.fmtClock(m.at):'')+'</div>';
        lastDay=day; prev=null; lastTsAt=m.at;
      }
      /* 消息分组：换人 / 系统消息 / 间隔超过 5 分钟 → 新组 */
      const newGroup=!prev||prev.from!==m.from||prev.type==='system'||isSys||(m.at-prev.at)>5*60*1000;
      /* 居中时间戳：跨天显示在上面的日期行；同一自然日内只在超过设定间隔时出现一次 */
      const gapMin=Number((Store.state.app||{}).tsGap);
      if(cs.showTs&&!isSys&&lastTsAt!=null&&m.at-lastTsAt>(isFinite(gapMin)?gapMin:30)*60*1000){
        html+='<div class="day-chip ts-chip">'+U.fmtClock(m.at)+'</div>';
        lastTsAt=m.at;
      }
      html+=bubbleHtml(m,{first:newGroup,cont:!newGroup&&!isSys});
      prev=m;
    });
    if(!list.length) html='<div class="empty" style="padding-top:120px"><div class="empty-ico">✦</div>还没有消息<br>说点什么吧</div>';
    msgsBox.innerHTML=html;
    UI.mountBlobs(msgsBox);
    bindMsgs();
    /* 首次进入 / 显式要求 / 原本就在底部时才跟随到底部，否则保持阅读位置 */
    if(firstRender||forceBottom===true||(forceBottom!==false&&wasBottom)) scrollBottomFn();
    else body.scrollTop=prevTop;
    firstRender=false;
  }
  function scrollBottomFn(){
    requestAnimationFrame(()=>{ body.scrollTop=body.scrollHeight; });
  }

  /* 数据变更时由 App 调用的局部刷新：只重建消息区，
     保留输入框草稿/焦点、滚动位置与正在进行的录音 */
  function refreshLive(){
    const cvNow=Store.conv(convId);
    if(!cvNow||cvNow.isGroup!==cv.isGroup||(!!cvNow.dissolved)!==dissolved){ App.rerender(); return; }
    Store.readConv(convId);
    renderMsgs();
    /* 备注名/群名可能在别处改过，顺便同步标题 */
    const c=cvNow.isGroup?null:Store.contact(cvNow.contactId);
    const newest=cvNow.isGroup?cvNow.name:((c&&(c.remark||c.name))||'');
    const tEl=U.$('.ch-name',el);
    if(tEl&&newest&&tEl.textContent!==newest) tEl.textContent=newest;
  }

  function bindMsgs(){
    /* 消息操作菜单 */
    U.$$('[data-act]',msgsBox).forEach(d=>{
      d.onclick=e=>{
        const m=st.msgs.find(x=>x.id===d.dataset.act);
        if(!m) return;
        /* 卡片类消息有自己的点击行为，不弹操作菜单 */
        if(e.target.closest('.checkin-card,.voice-bubble,.transfer-card,.redpacket-card,.survey-card,.share-card,.call-card')) return;
        /* 图片区域直接看大图 */
        const imgEl=e.target.closest('.img-msg');
        if(m.type==='image'&&imgEl){ const im=imgEl.querySelector('img'); if(im&&im.src){ UI.lightbox(im.src); return; } }
        const items=[];
        items.push({icon:'reply',label:'回复',onClick:()=>{ replyTo={name:Store.displayName(m.from),text:(m.text||previewOf(m)).slice(0,40)}; renderReply(); ta.focus(); }});
        if(m.type==='text') items.push({icon:'copy',label:'复制',onClick:()=>{ try{navigator.clipboard.writeText(m.text);}catch(err){} UI.toast('已复制'); }});
        if(m.type==='image'){ const img=d.querySelector('img'); if(img&&img.src) items.push({icon:'image',label:'查看大图',onClick:()=>UI.lightbox(img.src)}); }
        items.push({icon:'trash',label:'删除',danger:true,onClick:async()=>{
          if(await UI.confirm('删除这条消息？',{title:'删除消息',ok:'删除'})) Store.deleteMsg(convId,m.id);
        }});
        UI.menu(items,e.clientX,e.clientY);
      };
    });
    U.$$('.img-msg',msgsBox).forEach(d=>{
      d.onclick=e=>{
        if(d.closest('[data-act]')) return; /* 由消息菜单统一处理 */
        const img=d.querySelector('img'); if(img&&img.src) UI.lightbox(img.src);
      };
    });
    /* 语音播放（模拟） */
    U.$$('[data-voice]',msgsBox).forEach(d=>{
      d.onclick=()=>{
        if(d.classList.contains('playing')) return;
        d.classList.add('playing');
        const dur=+((st.msgs.find(x=>x.id===d.dataset.voice)||{}).dur||5);
        UI.toast('语音播放中');
        setTimeout(()=>d.classList.remove('playing'),Math.min(dur,6)*1000);
      };
    });
    /* 报备卡片 */
    U.$$('[data-ck]',msgsBox).forEach(d=>{
      d.onclick=()=>{
        const ck=st.checkins.find(k=>k.id===d.dataset.ck);
        if(ck) Pages.showCheckinDetail(ck);
        else UI.toast('该报备记录不存在');
      };
    });
    /* 转账卡 */
    U.$$('[data-tf]',msgsBox).forEach(d=>d.onclick=()=>UI.toast('转账已记录'));
    /* 分享动态卡：点开完整动态 */
    U.$$('[data-share]',msgsBox).forEach(d=>d.onclick=e=>{
      e.stopPropagation();
      Pages.openPostDetail(d.dataset.share);
    });
    /* 视频通话邀请：接听后进入模拟通话，结束后角色回一条字卡 */
    U.$$('[data-answer]',msgsBox).forEach(b=>b.onclick=e=>{
      e.stopPropagation();
      const m=st.msgs.find(x=>x.id===b.dataset.answer);
      if(!m||m.answered) return;
      Store.updateMessage(m.id,{answered:true});
      Call.connect(convId);
    });
    /* 红包卡片点击 */
    U.$$('[data-rp]',msgsBox).forEach(d=>{
      d.onclick = ()=>{
        const id = d.dataset.rp;
        const m = st.msgs.find(x=>x.id===id);
        if(!m) return;
        if(m.from === 'me'){
          openRedPacketDetail(m);
        } else {
          claimUserRedPacket(m);
        }
      };
    });
    /* 问卷卡片：点击 toggle 展开/收起 */
    U.$$('[data-sv]',msgsBox).forEach(card=>{
      card.onclick = (e)=>{
        e.stopPropagation();
        card.classList.toggle('expanded');
      };
    });
  }
  function openRedPacketDetail(m){
    const claims = m.claims || [];
    let html = '<div style="text-align:center;padding:16px 0 8px">'
      + '<div style="font-size:24px;font-weight:700;color:#B45757">¥ '+(+m.amount).toFixed(2)+'</div>'
      + '<div class="tiny" style="margin-top:6px">'+U.esc(m.note||'恭喜发财，大吉大利')+'</div>'
      + '<div class="tiny" style="margin-top:4px;opacity:.7">'+({normal:'普通红包',exclusive:'专属红包',lucky:'拼手气红包'}[m.kind]||'红包')+(m.refunded?' · 已退回':'')+'</div>'
      + '</div>';
    if(claims.length === 0){
      html += '<div class="empty" style="padding:24px 12px">'+(m.refunded?'红包已退回':'暂无领取记录')+'</div>';
    } else {
      const total = claims.reduce((s,c)=>s+(+c.amount||0), 0);
      html += '<div class="list-card" style="margin-top:8px">'
        + claims.map(c=>'<div class="list-row">'
          + UI.avatar(c.id,32)
          + '<div class="grow" style="margin-left:10px"><div class="r-name">'+U.esc(Store.displayName(c.id))+'</div></div>'
          + '<span style="font-size:13px;color:#B45757">¥'+(+c.amount).toFixed(2)+'</span>'
          + '</div>').join('')
        + '</div>';
      if(m.kind === 'lucky'){
        html += '<div style="text-align:right;padding:8px 4px 0;font-size:11.5px;color:var(--text-3)">'
          + '共领 ¥'+total.toFixed(2)+' / ¥'+(+m.amount).toFixed(2)
          + '</div>';
      }
    }
    UI.openModal({
      title:'红包详情',
      html: html + '<div class="modal-actions"><button class="btn light block" data-a="close">关闭</button></div>',
      after(ov,api){ ov.querySelector('[data-a="close"]').onclick = ()=>api.close(); }
    });
  }

  function claimUserRedPacket(m){
    m.claims = m.claims || [];
    if(m.claims.some(c=>c.id==='me')){ UI.toast('你已经领过了'); return; }
    if(m.refunded){ UI.toast('红包已退回'); return; }

    let share;
    if(m.kind === 'lucky'){
      const claimed = m.claims.reduce((s,c)=>s+(+c.amount||0), 0);
      const remaining = Math.round((m.amount - claimed) * 100) / 100;
      if(remaining <= 0.01){ UI.toast('红包已领完'); return; }
      share = remaining;
    } else if(m.kind === 'exclusive'){
      if(m.exclusiveTo && m.exclusiveTo !== 'me'){
        UI.toast('这是给「'+Store.displayName(m.exclusiveTo)+'」的专属红包');
        return;
      }
      share = +m.amount;
    } else {
      share = +m.amount;
    }

    m.claims.push({id:'me', amount:share, at:Date.now()});
    Store.save(); Store.emit();
    Store.sysMsg(convId, '我领取了红包');
    UI.toast('已领取 ¥'+share.toFixed(2));
    /* 回复机制：领了角色发的红包，角色回一条字卡 */
    if(m.from!=='me' && !cv.isGroup){
      const roleId=cv.contactId;
      const pool=[...Store.getUniversalCards(),...(Store.getExclusiveCards(roleId)||[])];
      const txt=pool.length?pool[Math.floor(Math.random()*pool.length)].content:'收到啦，谢谢 ✦';
      setTimeout(()=>Store.incoming(convId,{from:roleId,type:'text',text:txt}),1200);
    }
  }
  function previewOf(m){
    if(m.type==='share') return '[动态]';
    if(m.type==='call') return '[视频通话]';
    return m.type==='image'?(m.stk?'[表情]':'[图片]'):m.type==='voice'?'[语音]':m.type==='checkin'?'[报备]':m.type==='no-reply'?'已读不回':'['+(m.kind||'转账')+']';
  }
  function renderReply(){
    U.$('#cd-replybox',el).innerHTML= replyTo
      ?'<div class="reply-quote" style="background:var(--card);display:flex;align-items:center;gap:8px;margin:0">'
      +'<div class="grow"><div class="rq-name">回复 '+U.esc(replyTo.name)+'</div><div>'+U.esc(replyTo.text)+'</div></div>'
      +'<button id="cd-reply-rm" style="color:var(--text-3);display:flex">'+I.x(15)+'</button></div>'
      :'';
    const rm=U.$('#cd-reply-rm',el);
    if(rm) rm.onclick=()=>{ replyTo=null; renderReply(); };
  }

  /* ---------- 发送 ---------- */
  function doSend(){
    if(dissolved){ UI.toast('群聊已解散，无法发送消息'); return; }
    const text=ta.value.trim();
    if(!text){ UI.toast('不能发送空消息'); return; }
    const m=Store.send(convId,Object.assign({type:'text',text},replyTo?{replyTo}:{}));
    replyTo=null; renderReply();
    ta.value=''; autosize();
    if(cs.autoScroll!==false) scrollBottomFn();
    simulateRead(m.id);
    /* 记录用户最后发言时间（主动消息节流用） */
    Store.state._lastMyMsgTime=Date.now();
    Store.save();
    /* 触发角色回复（群聊里每个成员各自独立判定） */
    planRoleReply();
  }
  /* ---------- 角色正在输入提示 ----------
     按角色独立计数：群聊里可能同时有几个人在「打字」。
     只在真正会回复时出现（已读不回不显示）；底部工具栏上方一行浅灰小字。
     显示/隐藏会让消息区高度变化 22px，若原本停在底部则自动贴底。 */
  function renderTyping(){
    /* 定时器可能来自上一个会话：只更新当前这个会话的提示行 */
    const page=U.$('.chat-page',el);
    if(!page||page.dataset.conv!==convId) return;
    const row=U.$('#cd-typing',el);
    if(!row) return;
    const ids=Object.keys(typingPending).filter(id=>typingPending[id]>0);
    const atBottom=body.scrollHeight-body.scrollTop-body.clientHeight<=40;
    const wasHidden=row.hidden;
    if(!ids.length){
      row.hidden=true;
    }else{
      row.textContent=ids.map(id=>Store.displayName(id)).join('、')+' 正在输入...';
      row.hidden=false;
    }
    if(wasHidden!==row.hidden&&atBottom&&cs.autoScroll!==false) scrollBottomFn();
  }
  function addTyping(roleId,n){
    typingPending[roleId]=(typingPending[roleId]||0)+n;
    renderTyping();
  }
  function doneTyping(roleId){
    typingPending[roleId]=Math.max(0,(typingPending[roleId]||0)-1);
    renderTyping();
  }

  /* 回复引擎接入：单聊 = 一个角色；群聊 = 每个成员各自独立扭一次扭蛋机
     （各自判定回不回、各自抽条数与延迟，互不影响） */
  function planRoleReply(){
    if(!window.ReplyEngine) return;
    const roles=cv.isGroup
      ?(cv.members||[]).map(id=>Store.contact(id)).filter(Boolean)
      :[Store.contact(cv.contactId)].filter(Boolean);
    if(!roles.length) return;
    /* 群聊且所有人一条字卡都没有时，提示一次（否则会安静得让人以为坏了） */
    if(cv.isGroup&&!emptyHintShown){
      const anyCards=Store.getUniversalCards().length>0
        ||roles.some(r=>Store.getExclusiveCards(r.id).length>0);
      if(!anyCards){
        emptyHintShown=true;
        UI.toast('还没有字卡：去 Me → 字卡设置 加几条，角色才会回复');
      }
    }
    roles.forEach(role=>scheduleRoleReply(role));
  }
  function scheduleRoleReply(role){
    const plan=ReplyEngine.planReply(role.id);
    if(plan.report){
      addTyping(role.id,1);
      const delay=1500+Math.random()*2500;
      setTimeout(()=>{
        Store.addCheckin({conv:convId, by:role.id, text:plan.report.text, imgKey:plan.report.imgKey});
        doneTyping(role.id);
      },delay);
      return;
    }
    if(plan.noReply){
      if(cv.isGroup) return;   /* 群聊里「不回」就是安静，不刷已读不回 */
      if(plan.empty&&!emptyHintShown){
        emptyHintShown=true;
        UI.toast('还没有字卡：去 Me → 字卡设置 加几条，角色才会回复');
      }
      /* 已读不回：延迟 2.5–4.5 秒显示一条浅灰小字气泡 */
      const delay=2500+Math.random()*2000;
      setTimeout(()=>{
        Store.incoming(convId,{from:role.id, type:'no-reply', text:'已读不回'});
      },delay);
      return;
    }
    addTyping(role.id,plan.replies.length);
    /* 引用回复：每次角色回复最多挑一条文字回复，引用用户最近 10 条消息之一 */
    const quoteChance=Math.max(0,Math.min(100,Store.getReplySettings().quoteChance||0));
    const textReplies=plan.replies.filter(x=>x.type==='text');
    let quoteTarget=null, quote=null;
    if(textReplies.length&&quoteChance>0&&Math.random()*100<quoteChance){
      const candidate=textReplies[Math.floor(Math.random()*textReplies.length)];
      const picked=ReplyEngine.pickQuote(convId);
      if(picked){ quoteTarget=candidate; quote=picked; }
    }
    plan.replies.forEach(r=>{
      setTimeout(()=>{
        if(r.type==='sticker'){
          Store.incoming(convId,{from:role.id, type:'image', imgKey:r.imgKey, stk:true});
        }else{
          if(r.card) Store.bumpCardUsage(r.card);
          const payload={from:role.id, type:'text', text:r.content||r.text||''};
          if(r===quoteTarget&&quote) payload.replyTo=quote;
          Store.incoming(convId,payload);
        }
        doneTyping(role.id);
      },r.delay);
    });
  }
  function simulateRead(msgId){
    setTimeout(()=>{
      Store.markReadSilent(msgId);
      const row=U.$('[data-msg="'+msgId+'"]',msgsBox);
      if(row&&cs.showRead){
        const grow=row.querySelector('.grow');
        let mm=row.querySelector('.msg-meta');
        if(!mm&&grow){ mm=document.createElement('div'); mm.className='msg-meta'; grow.appendChild(mm); }
        if(mm&&!mm.querySelector('.rd')) mm.innerHTML='<span class="rd">Read</span>'+mm.innerHTML;
      }
    },1400);
  }

  U.$('#cd-send',el).onclick=doSend;
  ta.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); doSend(); }
  });
  function autosize(){ ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,96)+'px'; }
  ta.addEventListener('input',autosize);
  ta.addEventListener('focus',()=>setTimeout(scrollBottomFn,350));

  /* ---------- 顶部按钮 ---------- */
  U.$('#cd-back',el).onclick=()=>App.back();
  /* 头像 / 标题 → 聊天设置（角色与聊天的统一管理入口，资料页已整合移除） */
  const openCS=()=>{ location.hash='#/cs/'+convId; };
  U.$('#cd-av',el).onclick=openCS;
  U.$('#cd-titlerow',el).onclick=openCS;
  U.$('#cd-more',el).onclick=e=>{
    const items=[];
    if(!cv.isGroup) items.push({icon:'user',label:'角色资料',onClick:()=>{ location.hash='#/role/'+cv.contactId; }});
    items.push({icon:'sliders',label:'聊天设置',onClick:()=>{ location.hash='#/cs/'+convId; }});
    items.push({icon:'pin',label:cv.groupKey==='pin'?'取消置顶':'置顶聊天',onClick:()=>{
      Store.setPinned(convId,cv.groupKey!=='pin'); UI.toast(cv.groupKey==='pin'?'已取消置顶':'已置顶');
    }});
    if(cv.isGroup&&!dissolved) items.push({icon:'users',label:'解散群聊',danger:true,onClick:async()=>{
      if(await UI.confirm('确定解散群聊「'+title+'」吗？\n解散后该群聊将无法继续发送消息。',{title:'解散群聊',ok:'解散'})){
        if(Store.dissolveGroup(convId)){ UI.toast('群聊已解散'); location.hash='#/chats'; }
      }
    }});
    items.push({icon:'trash',label:'清空聊天记录',danger:true,onClick:async()=>{
      if(await UI.confirm('确定清空与「'+title+'」的全部聊天记录吗？此操作不可撤销。',{title:'清空聊天记录',ok:'清空'})){
        Store.clearMsgs(convId); UI.toast('聊天记录已清空');
      }
    }});
    UI.menuAt(items,e.currentTarget);
  };

  /* ---------- 快捷功能栏 ---------- */
  function openStickerPanel(){
    const imgs=st.app.stickerImgs||[];
    UI.openModal({
      sheet:true,
      html:(imgs.length
        ?'<div class="stk-grid">'
          +imgs.map(id=>'<button class="stk-cell" data-stk="'+U.esc(id)+'"><img data-blob="'+U.esc(id)+'"></button>').join('')
          +'</div>'
        :'<div class="empty" style="padding:26px 20px"><div class="empty-ico">☺</div>还没有图片表情包<br>先去「Me → 表情包管理」导入几张吧</div>')
        +'<div class="modal-actions">'
        +'<button class="btn light block" data-a="manage">'+I.image(16)+' 管理表情包</button></div>'
        +'<p class="tiny" style="text-align:center;margin-top:2px">点击表情包会作为图片表情消息直接发送</p>',
      after(ov,api){
        U.$$('[data-stk]',ov).forEach(b=>b.onclick=()=>{
          const m=Store.send(convId,{type:'image',imgKey:b.dataset.stk,stk:true});
          api.close(); if(cs.autoScroll!==false) scrollBottomFn(); simulateRead(m.id);
          Store.state._lastMyMsgTime=Date.now(); Store.save();
          planRoleReply();
        });
        ov.querySelector('[data-a=manage]').onclick=()=>{ api.close(); location.hash='#/me'; };
      }
    });
  }
  function openTransferModal(kind){
    UI.openModal({
      title:kind,
      html:'<div class="sec-label" style="margin-bottom:8px">金额</div>'
        +'<input class="field" id="tf-amt" type="number" min="0.01" step="0.01" value="8.80">'
        +'<div style="display:flex;gap:8px;margin-top:10px">'
        +[8.80,52.00,66.60,520.00].map(v=>'<button class="sg seg" data-q="'+v+'" style="flex:1;justify-content:center;border-radius:12px;background:var(--card);height:32px;font-size:12.5px">¥'+v.toFixed(2)+'</button>').join('')
        +'</div>'
        +'<input class="field" id="tf-note" placeholder="附言（可选）" maxlength="30" style="margin-top:10px">'
        +'<div class="modal-actions"><button class="btn light" data-a="cancel">取消</button>'
        +'<button class="btn dark" data-a="ok">发送</button></div>',
      after(ov,api){
        U.$$('[data-q]',ov).forEach(b=>b.onclick=()=>{ U.$('#tf-amt',ov).value=(+b.dataset.q).toFixed(2); });
        ov.querySelector('[data-a=cancel]').onclick=()=>api.close();
        ov.querySelector('[data-a=ok]').onclick=()=>{
          const amt=parseFloat(U.$('#tf-amt',ov).value);
          if(!(amt>0)){ UI.toast('请输入有效金额'); return; }
          Store.send(convId,{type:'transfer',kind,amount:amt,note:U.$('#tf-note',ov).value.trim()});
          api.close(); if(cs.autoScroll!==false) scrollBottomFn(); UI.toast(kind+'已发送');
          planRoleReply();
        };
      }
    });
  }
  /* ============ 问一问问卷 ============ */
  function openSurveyModal(){
    if(dissolved){ UI.toast('群聊已解散，无法发起问卷'); return; }
    if(cv.isGroup){ UI.toast('问卷功能仅支持单聊'); return; }

    UI.openModal({
      title:'发起问卷',
      html:'<div class="sec-label" style="margin-bottom:6px">问题</div>'
        + '<input class="field" id="sv-q" maxlength="60" placeholder="你想问 ta 的问题...">'
        + '<div class="sec-label" style="margin:12px 0 6px">选项（每行一个，至少 2 个）</div>'
        + '<textarea class="field" id="sv-opts" style="min-height:120px;resize:vertical" placeholder="选项1&#10;选项2&#10;选项3"></textarea>'
        + '<div class="modal-actions">'
        + '<button class="btn light" data-a="c">取消</button>'
        + '<button class="btn dark" data-a="ok">发送</button></div>',
      after(ov,api){
        ov.querySelector('[data-a=c]').onclick = ()=>api.close();
        ov.querySelector('[data-a=ok]').onclick = ()=>{
          const q = (U.$('#sv-q',ov)||{}).value?.trim() || '';
          if(!q){ UI.toast('请先填写问题'); return; }
          const optsRaw = (U.$('#sv-opts',ov)||{}).value || '';
          const options = optsRaw.split('\n').map(s=>s.trim()).filter(Boolean);
          if(options.length < 2){ UI.toast('至少需要 2 个选项'); return; }
          if(options.length > 8){ UI.toast('最多 8 个选项'); return; }
          api.close();
          sendSurvey(q, options);
        };
        setTimeout(()=>{ const t=U.$('#sv-q',ov); if(t) t.focus(); }, 120);
      }
    });
  }

  function sendSurvey(question, options){
    const m = Store.send(convId, {
      type: 'survey',
      question,
      options,
      answer: null,
      answerAt: null
    });
    if(cs.autoScroll!==false) scrollBottomFn();
    simulateRead(m.id);
    Store.state._lastMyMsgTime = Date.now();
    Store.save();
    scheduleSurveyAnswer(m.id);
  }

  function scheduleSurveyAnswer(msgId){
    const m0 = st.msgs.find(x=>x.id===msgId);
    if(!m0) return;
    const role = Store.contact(cv.contactId);
    if(!role) return;

    const s = Store.getReplySettings();
    const delayMin = Math.max(0.5, s.surveyDelayMin || 3);
    const delayMax = Math.max(delayMin, s.surveyDelayMax || 8);
    const delay = (delayMin + Math.random() * (delayMax - delayMin)) * 1000;

    setTimeout(()=>{
      const m = st.msgs.find(x=>x.id===msgId);
      if(!m || m.answer !== null) return;
      const idx = Math.floor(Math.random() * m.options.length);
      Store.updateMessage(msgId, { answer: idx, answerAt: Date.now() });
    }, delay);
  }
  /* ============ 红包功能 ============ */
  function openRedPacketModal(){
    if(dissolved){ UI.toast('群聊已解散，无法发送红包'); return; }
    const roles = cv.isGroup
      ? (cv.members||[]).map(id=>Store.contact(id)).filter(Boolean)
      : [Store.contact(cv.contactId)].filter(Boolean);
    if(!roles.length){ UI.toast('暂无角色'); return; }

    let sender = 'me';
    let kind = cv.isGroup ? 'lucky' : 'normal';
    let exclusiveTo = cv.isGroup ? roles[0].id : null;

    function senderOptions(){
      const opts = [{id:'me', label:'自己发送'}];
      if(!cv.isGroup){
        opts.push({id:cv.contactId, label:(contact.remark||contact.name)+'发送'});
      } else {
        roles.forEach(r=>{ opts.push({id:r.id, label:(r.remark||r.name)+'发送'}); });
      }
      return opts;
    }

    function buildBody(amt, note){
      let html = '<div class="sec-label" style="margin-bottom:8px">发送方</div>'
        + '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;-webkit-overflow-scrolling:touch" id="rp-sender-bar">'
        + senderOptions().map(o=>{
            const act = o.id === sender;
            return '<button data-sender="'+o.id+'" style="white-space:nowrap;flex-shrink:0;height:30px;padding:0 14px;border-radius:999px;font-size:12.5px;'
              + (act ? 'background:var(--dark);color:#fff;font-weight:500' : 'background:var(--card);color:var(--text-2)')
              + '">'+U.esc(o.label)+'</button>';
          }).join('')
        + '</div>';

      // 私聊不显示类型选择器（固定普通）；群聊才有专属/拼手气
      if(cv.isGroup){
        html += '<div class="sec-label" style="margin-bottom:8px">红包类型</div>'
          + '<div class="seg" style="margin-bottom:12px" id="rp-kind-bar">'
          + '<button class="sg '+(kind==='exclusive'?'active':'')+'" data-kind="exclusive">专属</button>'
          + '<button class="sg '+(kind==='lucky'?'active':'')+'" data-kind="lucky">拼手气</button>'
          + '</div>';
        if(kind === 'exclusive'){
          html += '<div class="sec-label" style="margin-bottom:6px">专属对象</div>'
            + '<select class="field" id="rp-target" style="padding:10px 12px;font-size:14px;appearance:none">'
            + roles.map(r=>'<option value="'+r.id+'"'+(exclusiveTo===r.id?' selected':'')+'>'+U.esc(r.remark||r.name)+'</option>').join('')
            + '</select>';
        }
      }

      html += '<div class="sec-label" style="margin:10px 0 6px">金额（元）</div>'
        + '<input class="field" id="rp-amount" type="number" min="0.01" step="0.01" value="'+(amt||'8.88')+'" inputmode="decimal">'
        + '<div class="sec-label" style="margin:10px 0 6px">祝福语（可选）</div>'
        + '<input class="field" id="rp-note" maxlength="20" placeholder="恭喜发财，大吉大利" value="'+U.esc(note||'')+'">';
      return html;
    }

    function bindBody(ov){
      U.$$('[data-sender]',ov).forEach(b=>b.onclick=()=>{ sender = b.dataset.sender; reRenderBody(ov); });
      U.$$('[data-kind]',ov).forEach(b=>b.onclick=()=>{ kind = b.dataset.kind; reRenderBody(ov); });
      const t = U.$('#rp-target',ov);
      if(t) t.onchange = ()=>{ exclusiveTo = t.value; };
    }

    function reRenderBody(ov){
      const amt = (U.$('#rp-amount',ov)||{}).value || '8.88';
      const note = (U.$('#rp-note',ov)||{}).value || '';
      U.$('#rp-body',ov).innerHTML = buildBody(amt, note);
      bindBody(ov);
    }

    UI.openModal({
      title:'发红包',
      html:'<div id="rp-body">'+buildBody('8.88','')+'</div>'
        + '<div class="modal-actions" style="margin-top:18px">'
        + '<button class="btn light" data-a="c">取消</button>'
        + '<button class="btn dark" data-a="ok">发红包</button></div>',
      after(ov,api){
        bindBody(ov);
        ov.querySelector('[data-a=c]').onclick = ()=>api.close();
        ov.querySelector('[data-a=ok]').onclick = ()=>{
          const amount = parseFloat((U.$('#rp-amount',ov)||{}).value || '0');
          if(!(amount > 0)){ UI.toast('请输入有效金额'); return; }
          const note = ((U.$('#rp-note',ov)||{}).value || '').trim() || '恭喜发财，大吉大利';
          const target = kind==='exclusive' ? exclusiveTo : null;
          api.close();
          sendRedPacket({ sender, kind, amount, note, exclusiveTo: target });
        };
      }
    });
  }

  function sendRedPacket({sender, kind, amount, note, exclusiveTo}){
    const packetId = 'rp_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

    const payload = {
      type: 'redpacket',
      packetId,
      amount,
      kind,
      exclusiveTo: kind==='exclusive' ? exclusiveTo : null,
      note,
      claims: [],
      refunded: false
    };

    let msg;
    if(sender === 'me'){
      msg = Store.send(convId, payload);
      if(cs.autoScroll!==false) scrollBottomFn();
      simulateRead(msg.id);
      Store.state._lastMyMsgTime = Date.now();
      Store.save();
      autoClaimRedPacket(msg.id);
    } else {
      msg = Store.incoming(convId, Object.assign({from:sender}, payload));
      // 角色发的红包：其他角色也能抢（群聊拼手气）
      autoClaimRedPacket(msg.id);
    }
  }

  /* 角色自动抢红包（用户发的 + 其他角色发的都走这里）
     普通/专属：每人平分（各自 50% 概率领）
     拼手气：动态从剩余池分配（各自 50% 概率领，金额随机） */
  function autoClaimRedPacket(msgId){
    const m0 = st.msgs.find(x=>x.id===msgId);
    if(!m0) return;

    const senderId = m0.from;
    const isUserSender = senderId === 'me';

    let others = [];
    if(cv.isGroup){
      others = (cv.members||[])
        .filter(id => id !== senderId)
        .map(id => Store.contact(id))
        .filter(Boolean);
    } else {
      if(isUserSender){
        others = [Store.contact(cv.contactId)].filter(Boolean);
      }
    }

    const eligible = m0.kind === 'exclusive'
      ? others.filter(r => r.id === m0.exclusiveTo)
      : others;

    if(!eligible.length) return;

    if(m0.kind === 'lucky'){
      /* 拼手气分配：人均份额 × [0.75, 1.25] 的随机浮动（期望仍等于人均），
         并给后面的人留至少 0.01；最后一位拿剩余。
         这样第一个人最多约 42%（3 人）/ 62%（2 人），不会再出现一个人拿走 98% 的情况。
         每次都以当前已领金额重新算余额，避免用户先领后重复分配。 */
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      let slotsLeft = shuffled.length;
      let delay = 3000;
      shuffled.forEach(r=>{
        const d = delay;
        const others = slotsLeft - 1;   /* 这一位之后还有几个名额 */
        slotsLeft--;
        setTimeout(()=>{
          const m = st.msgs.find(x=>x.id===msgId);
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
          Store.sysMsg(convId, (r.remark||r.name) + ' 领取了红包 ¥' + share.toFixed(2));
        }, d);
        delay += 2000 + Math.random()*3000;
      });
    } else {
      const per = Math.round((m0.amount / eligible.length) * 100) / 100;
      let delay = 3000;
      eligible.forEach(r=>{
        const d = delay;
        setTimeout(()=>{
          const m = st.msgs.find(x=>x.id===msgId);
          if(!m || m.refunded) return;
          if(Math.random() < 0.5){
            m.claims = m.claims || [];
            if(m.claims.some(c=>c.id===r.id)) return;
            m.claims.push({id:r.id, amount:per, at:Date.now()});
            Store.save(); Store.emit();
            Store.sysMsg(convId, (r.remark||r.name) + ' 领取了红包');
          }
        }, d);
        delay += 2000 + Math.random()*3000;
      });
    }

    setTimeout(()=>{
      const m = st.msgs.find(x=>x.id===msgId);
      if(!m || m.refunded) return;
      if(!m.claims || m.claims.length === 0){
        m.refunded = true;
        Store.save(); Store.emit();
        Store.sysMsg(convId, '红包无人领取，已退回');
      }
    }, 15000);
  }
  function startRecording(){
    if(recording) return;
    const rec={sec:0,timer:null};
    const bar=document.createElement('div');
    bar.className='recording-bar';
    bar.innerHTML='<span class="rec-dot"></span><span class="rec-t">0:00</span><span style="margin-left:auto;font-size:11px;color:var(--text-3)">再次点击语音结束</span>';
    ta.style.display='none';
    U.$('#cd-compose',el).prepend(bar);
    rec.timer=setInterval(()=>{
      rec.sec++; const t=bar.querySelector('.rec-t'); if(t) t.textContent=U.fmtDur(rec.sec);
    },1000);
    recording=rec;
    U.$('[data-tool=mic]',el).classList.add('active');
  }
  function stopRecording(cancel){
    if(!recording) return;
    const sec=recording.sec;
    clearInterval(recording.timer); recording=null;
    const bar=U.$('.recording-bar',el); if(bar) bar.remove();
    ta.style.display='';
    U.$('[data-tool=mic]',el).classList.remove('active');
    if(!cancel&&sec>0){
      Store.send(convId,{type:'voice',dur:sec});
      Store.state._lastMyMsgTime=Date.now(); Store.save();
      planRoleReply();
    }
    else if(cancel) UI.toast('已取消');
    if(!cancel&&sec>0&&cs.autoScroll!==false) scrollBottomFn();
  }
  function sendImage(){
    U.pickFile('image/*',async f=>{
      try{
        const key=await DB.storeImage(f,{max:1280,q:.82});
        Store.send(convId,{type:'image',imgKey:key});
        if(cs.autoScroll!==false) scrollBottomFn(); UI.toast('图片已发送');
        Store.state._lastMyMsgTime=Date.now(); Store.save();
        planRoleReply();
      }catch(e){ UI.toast('图片发送失败：'+e.message); }
    });
  }

  U.$$('[data-tool]',el).forEach(b=>{
    b.onclick=()=>{
      if(dissolved){ UI.toast('群聊已解散，无法使用该功能'); return; }
      const k=b.dataset.tool;
      if(k==='mic'){ recording?stopRecording(false):startRecording(); }
      else if(k==='phone') Call.start(convId);
      else if(k==='image') sendImage();
      else if(k==='clipboard') Pages.openCheckinComposer(cv, ()=>{
        planRoleReply();
      });
      else if(k==='survey') openSurveyModal();
      else if(k==='gift') openRedPacketModal();
    };
  });
  /* 第二行 · 表情按钮：图片表情包面板（与 Me 页共用一份数据） */
  U.$('#cd-sticker',el).onclick=openStickerPanel;

  /* ---------- 戳一戳（单聊直接拍；群聊先选人，再按该角色的拍一拍文案） ---------- */
  function doPoke(contactId,name){
    const who=name||title;
    const txt='你'+Store.pokeTextOf(contactId)+'「'+who+'」 ✦';
    if(cs.pokeMode!=='msg') UI.pokeFx(txt);
    if(cs.pokeMode!=='fx') Store.sysMsg(convId,txt);
    U.vibrate(15,convId);
  }
  const pokeBtn=U.$('#cd-poke',el);
  if(pokeBtn) pokeBtn.onclick=()=>{
    if(!cs.poke) return;
    if(dissolved){ UI.toast('群聊已解散'); return; }
    if(!cv.isGroup){ doPoke(cv.contactId,title); return; }
    const members=(cv.members||[]).map(id=>Store.contact(id)).filter(Boolean);
    if(!members.length){ UI.toast('群里还没有可拍的角色'); return; }
    UI.menuAt(members.map(c=>({
      icon:'sparkles',
      label:'拍一拍 '+(c.remark||c.name),
      onClick:()=>doPoke(c.id,(c.remark||c.name))
    })),pokeBtn);
  };

  /* 渲染 */
  renderMsgs();

  /* 交给 App：数据变更时只局部刷新消息区（见 app.js storeChanged） */
  return {update:refreshLive};
};
