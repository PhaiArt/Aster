/* ===== 角色资料页：单独浏览该角色的动态，并可「以该角色身份」发动态 ===== */
window.Pages=window.Pages||{};

Pages.roleProfile=function(el,roleId){
  if(!roleId) roleId='me';
  const isMe=roleId==='me';
  const c=isMe?null:Store.contact(roleId);
  if(!isMe && !c){ location.hash='#/chats'; return; }
  const u=Store.state.user;
  const cv=isMe?null:Store.convOfContact(roleId);
  const cs=cv?Store.getCS(cv.id):Store.DEF_CS();
  const name=isMe?u.name:(c.remark||c.name);
  const handle=Store.handleOf(roleId);
  const sig=isMe?(u.sig||''):(c.sig||'');

  function imgSrc(key){ return key&&key.indexOf('data:')===0?key:null; }
  function postsOf(){ return Store.state.posts.filter(p=>p.author===roleId).sort((a,b)=>b.at-a.at); }

  function coverHtml(){
    if(isMe){
      if(u.coverId) return '<img data-blob="'+U.esc(u.coverId)+'" alt="">';
      return '<div class="rc-quote">「 '+(sig?U.esc(sig):'两颗星需要多久才能靠近')+' 」</div>';
    }
    if(cs.roleBg) return '<img data-blob="'+U.esc(cs.roleBg)+'" alt="">';
    return '<div class="rc-quote">「 '+(sig?U.esc(sig):'两颗星需要多久才能靠近')+' 」</div>';
  }

  function postCard(p){
    const liked=p.likes.indexOf('me')>-1;
    return '<div class="post-card anim-in" data-post="'+p.id+'">'
      +'<div class="pc-head">'+UI.avatar(p.author,40)
      +'<div class="grow"><div class="pc-name">'+U.esc(Store.displayName(p.author))+' <span class="pc-uid">'+U.esc(handle)+'</span></div></div>'
      +'<button class="pc-more" data-more="'+p.id+'">'+I.moreV(18)+'</button></div>'
      +(p.text?'<div class="pc-text">'+U.esc(p.text)+'</div>':'')
      +(p.imgs&&p.imgs.length?('<div class="post-imgs">'+p.imgs.map(k=>{
          const src=imgSrc(k);
          return '<div class="pi '+(p.imgs.length===1?'solo':'')+'" data-pimg="'+p.id+':'+U.esc(k)+'">'
            +(src?'<img src="'+src+'">':'<img data-blob="'+U.esc(k)+'">')+'</div>';
        }).join('')+'</div>'):'')
      +'<div class="pc-foot"><span class="pc-time">'+U.fmtPost(p.at)+'</span>'
      +'<div class="pc-acts">'
      +'<button class="act '+(liked?'liked':'')+'" data-like="'+p.id+'">'+(liked?I.heartFill(17):I.heart(17))+(p.likes.length?' '+p.likes.length:'')+'</button>'
      +'<button class="act" data-cmt="'+p.id+'">'+I.comment(17)+(p.comments.length?' '+p.comments.length:'')+'</button>'
      +'</div></div>'
      +(p.likes.length?'<div class="pc-likes">'+I.heartFill(13)+' '+U.esc(p.likes.map(Store.displayName).join('、'))+' 觉得很赞</div>':'')
      +(p.comments.length?'<div class="pc-cmts">'+p.comments.map(cm=>
          '<div class="pc-cmt"><span class="cc-name">@'+U.esc(Store.displayName(cm.author))+'</span> '
          +U.esc(cm.text)+'<span class="cc-time">'+U.ago(cm.at)+'</span>'
          +(cm.author==='me'?'<button class="cc-del tiny" data-cdel="'+p.id+':'+cm.id+'" style="margin-left:6px">删除</button>':'')
          +'</div>').join('')+'</div>':'')
      +'<div class="cmt-slot" data-cslot="'+p.id+'"></div>'
      +'</div>';
  }

  function render(){
    const posts=postsOf();
    /* 我的动态页不再重复 social media 概览；角色资料页保留 */
    const social=isMe?'':'<div class="discover-row"><span class="dr-title">social media</span>'
      +'<span class="dr-count">'+posts.length+' posts '+I.chevronRight(13)+'</span></div>'
      +'<div class="thumbs-row">'+(posts.slice(0,3).map(p=>{
          const src=p.imgs&&p.imgs.length?imgSrc(p.imgs[0]):null;
          return '<button class="thumb-card" data-thumb="'+p.id+'">'
            +(src?'<img src="'+src+'">':(p.imgs&&p.imgs.length?'<img data-blob="'+U.esc(p.imgs[0])+'">'
            :'<div class="th-text">'+U.esc(p.text||'')+'</div>'))+'</button>';
        }).join('')||'<div class="tiny" style="padding:8px 2px">以 '+U.esc(name)+' 的身份发第一条动态吧</div>')+'</div>';
    el.innerHTML=UI.head(isMe?'我的动态':name,{back:true})
      +'<div class="role-cover">'+coverHtml()+'</div>'
      +'<div class="role-avwrap">'+UI.avatar(roleId,72)+'</div>'
      +'<div class="role-name">'+U.esc(name)+'</div>'
      +'<div class="role-handle">'+U.esc(handle)+'</div>'
      +'<div class="role-sig">'+U.esc(sig)+'</div>'
      +social
      +'<div class="discover-row" style="padding-bottom:2px"><span class="dr-title">moments</span></div>'
      +'<div id="role-post-list">'+(posts.length
          ?posts.map(postCard).join('')
          :'<div class="empty"><div class="empty-ico">☾</div>还没有动态<br>点右下角 + '+(isMe?'发布第一条动态':'以 '+U.esc(name)+' 的身份发布')+'</div>')+'</div>';

    U.$('[data-back]',el).onclick=()=>App.back();
    UI.mountBlobs(el);
    bindPosts();
    mountFab();
    U.$$('[data-thumb]',el).forEach(b=>b.onclick=()=>{
      const card=U.$('[data-post="'+b.dataset.thumb+'"]',el);
      if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  function bindPosts(){
    const box=U.$('#role-post-list',el);
    if(!box) return;
    UI.mountBlobs(box);
    U.$$('[data-like]',box).forEach(b=>b.onclick=()=>{ Store.toggleLike(b.dataset.like); U.vibrate(6); });
    U.$$('[data-cmt]',box).forEach(b=>b.onclick=()=>{
      const pid=b.dataset.cmt;
      const slot=U.$('[data-cslot="'+pid+'"]',box);
      if(slot.innerHTML){ slot.innerHTML=''; return; }
      slot.innerHTML='<div class="cmt-bar"><input placeholder="评论一下..." maxlength="80"><button class="cmt-send">'+I.send(15)+'</button></div>';
      const inp=slot.querySelector('input');
      const doSend=()=>{ const v=inp.value.trim(); if(!v){ UI.toast('评论不能为空'); return; } Store.addComment(pid,v); };
      slot.querySelector('.cmt-send').onclick=doSend;
      inp.onkeydown=e=>{ if(e.key==='Enter') doSend(); };
      setTimeout(()=>inp.focus(),60);
    });
    U.$$('[data-more]',box).forEach(b=>b.onclick=()=>{
      const p=Store.state.posts.find(x=>x.id===b.dataset.more); if(!p) return;
      UI.menuAt([
        {icon:'pencil',label:'编辑动态',onClick:()=>openComposer(p)},
        {icon:'trash',label:'删除动态',danger:true,onClick:async()=>{
          if(await UI.confirm('确定删除这条动态吗？',{title:'删除动态',ok:'删除'})){ Store.deletePost(p.id); UI.toast('已删除'); }
        }},
        {icon:'bookmark',label:p.collected?'取消收藏':'收藏',onClick:()=>{
          Store.toggleCollect(p.id); UI.toast(p.collected?'已取消收藏':'已收藏');
        }},
        {icon:'share',label:isMe?'分享到聊天':'分享到与「'+name+'」的聊天',onClick:()=>Pages.sharePost(p)}
      ],b);
    });
    U.$$('[data-pimg]',box).forEach(d=>d.onclick=()=>{
      const img=d.querySelector('img'); if(img&&img.src) UI.lightbox(img.src);
    });
    U.$$('[data-cdel]',box).forEach(b=>b.onclick=async e=>{
      e.stopPropagation();
      const [pid,cid]=b.dataset.cdel.split(':');
      if(await UI.confirm('删除这条评论？',{title:'删除评论',ok:'删除'})) Store.delComment(pid,cid);
    });
  }

  function mountFab(){
    let fb=document.getElementById('compose-fab');
    if(fb) fb.remove();
    fb=document.createElement('button');
    fb.id='compose-fab'; fb.className='fab';
    fb.innerHTML=I.plus(24);
    fb.onclick=()=>openComposer();
    document.body.appendChild(fb);
  }

  function cardPool(){
    const list=[];
    if(!isMe) (Store.getExclusiveCards(roleId)||[]).forEach(x=>list.push({label:x.content, from:'专属'}));
    (Store.getUniversalCards()||[]).forEach(x=>list.push({label:x.content, from:'通用'}));
    return list;
  }

  function openComposer(editPost){
    const isEdit=!!editPost;
    let imgs=isEdit?editPost.imgs.slice():[];
    function slotsHtml(){
      let h=imgs.map((k,i)=>{
        const src=imgSrc(k);
        return '<div class="thumb-card" style="width:86px;height:86px;position:relative">'
          +(src?'<img src="'+src+'">':'<img data-blob="'+U.esc(k)+'">')
          +'<button data-rm="'+i+'" style="position:absolute;top:5px;right:5px;width:22px;height:22px;border-radius:50%;background:rgba(42,42,46,.7);color:#fff;display:flex;align-items:center;justify-content:center">'+I.x(12)+'</button></div>';
      }).join('');
      if(imgs.length<3) h+='<button id="role-add-slot" class="thumb-card" style="width:86px;height:86px;display:flex;align-items:center;justify-content:center;color:var(--text-3)">'+I.plus(22)+'</button>';
      return '<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:12px">'+h+'</div>';
    }
    UI.openModal({
      sheet:true,
      html:
        '<div class="row" style="justify-content:space-between;margin-bottom:12px">'
        +'<button class="tiny" data-a="cancel" style="font-size:13.5px;color:var(--text-2)">取消</button>'
        +'<b style="font-size:15px">'+(isEdit?'编辑动态':(isMe?'发布动态':'以 '+U.esc(name)+' 发布'))+'</b>'
        +'<button data-a="send" style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:4px">send '+I.send(16)+'</button></div>'
        +'<div class="row" style="gap:10px">'+UI.avatar(isMe?'me':roleId,40)
        +'<div><div style="font-size:14px;font-weight:700">'+U.esc(name)+'</div>'
        +'<div class="tiny">'+U.esc(handle)+' · '+(isMe?'发布到我的动态':'以该角色身份发布')+'</div></div></div>'
        +'<textarea class="field" id="role-po-text" style="margin-top:12px;border:0;background:transparent;padding:6px 2px;min-height:90px" placeholder="这一刻在想什么..." maxlength="500">'+(isEdit?U.esc(editPost.text):'')+'</textarea>'
        +'<div id="role-po-slots">'+slotsHtml()+'</div>'
        +'<div class="row" style="margin-top:12px;gap:8px">'
        +'<button class="btn light sm" data-a="card">'+I.sparkles(15)+' 从字卡选择</button>'
        +'<span class="tiny">用该角色的字卡代写</span></div>',
      after(ov,api){
        function reSlots(){
          U.$('#role-po-slots',ov).innerHTML=slotsHtml();
          U.$('#role-add-slot',ov).onclick=()=>{
            if(imgs.length>=3){ UI.toast('最多 3 张图片'); return; }
            U.pickFile('image/*',async f=>{
              try{ imgs.push(await DB.storeImage(f,{max:1280,q:.82})); reSlots(); }
              catch(e){ UI.toast('图片读取失败：'+e.message); }
            });
          };
          U.$$('[data-rm]',ov).forEach(b=>b.onclick=()=>{ imgs.splice(+b.dataset.rm,1); reSlots(); });
          UI.mountBlobs(ov);
        }
        reSlots();
        U.$('[data-a=cancel]',ov).onclick=()=>api.close();
        U.$('[data-a=card]',ov).onclick=()=>{
          const pool=cardPool();
          if(!pool.length){ UI.toast('还没有字卡，去 Me → 字卡设置 添加'); return; }
          const list=UI.openModal({
            sheet:true,
            title:'从字卡选择',
            html:'<div style="max-height:52dvh;overflow:auto;display:flex;flex-direction:column;gap:8px">'
              +pool.map((x,i)=>'<button class="list-row" data-pick="'+i+'" style="border-radius:12px;text-align:left">'
                +'<span class="grow" style="font-size:13.5px;line-height:1.5">'+U.esc(x.label)+'</span>'
                +'<span class="tiny">'+x.from+'</span></button>').join('')+'</div>',
            after(ov2,api2){
              U.$$('[data-pick]',ov2).forEach(b=>b.onclick=()=>{
                const t=U.$('#role-po-text',ov);
                t.value=(t.value?t.value+'\n':'')+pool[+b.dataset.pick].label;
                api2.close(); t.focus();
              });
            }
          });
        };
        U.$('[data-a=send]',ov).onclick=()=>{
          const text=U.$('#role-po-text',ov).value.trim();
          if(!text&&!imgs.length){ UI.toast('写点什么或添加图片吧'); return; }
          if(isEdit) Store.updatePost(editPost.id,{text,imgs});
          else Store.addPost({author:roleId,text,imgs});
          api.close(); UI.toast(isEdit?'已保存':'已发布 ✦');
        };
      }
    });
  }

  render();
};
