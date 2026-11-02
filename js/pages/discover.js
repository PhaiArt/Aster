/* ===== Discover 动态广场 ===== */
window.Pages=window.Pages||{};

(function(){
  const STARS_SVG='<svg class="mc-stars" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 390 196">'
    +'<g fill="#ffffff" fill-opacity=".55">'
    +'<path d="M60 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>'
    +'<path d="M300 30l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z"/>'
    +'<path d="M200 90l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z"/>'
    +'<path d="M120 130l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z"/>'
    +'<path d="M340 120l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z"/>'
    +'<circle cx="40" cy="110" r="2.2"/><circle cx="160" cy="30" r="2"/><circle cx="250" cy="150" r="2.4"/>'
    +'<circle cx="365" cy="70" r="2"/><circle cx="90" cy="170" r="1.8"/><circle cx="210" cy="170" r="2"/>'
    +'</g></svg>';

  function imgSrc(key){ return key&&key.startsWith('data:')?key:null; }

  Pages.discover=function(el){
    if(window.ReplyEngine&&ReplyEngine.ensureDailyDynamics) ReplyEngine.ensureDailyDynamics();
    const st=Store.state, user=st.user;
    let html='<div class="moments-cover" id="mc-cover">'
      +(user.coverId?'<img data-blob="'+U.esc(user.coverId)+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'')
      +STARS_SVG
      +'<div class="mc-title">MOMENTS</div></div>';
    /* 头像移出 cover 容器（cover overflow:hidden 会裁切下沉的头像），改为文档流上移叠放 */
    html+='<div class="mc-av-wrap">'+UI.avatar('me',68)+'</div>';
    html+='<div class="moments-head"><div class="mh-name">'+U.esc(user.name)+'</div>'
      +'<div class="mh-sig">✧･ײַ ⊹ ° '+U.esc(user.sig)+' ･ײַ✧</div></div>';

    const all=st.posts.slice().sort((a,b)=>b.at-a.at);
    /* social media 只展示「我」的动态；moments 展示所有人 */
    const mine=all.filter(p=>p.author==='me');
    html+='<div class="discover-row"><span class="dr-title">social media</span>'
      +'<button class="dr-count" id="sm-count">'+mine.length+' posts '+I.chevronRight(13)+'</button></div>';
    html+='<div class="thumbs-row">'+(mine.slice(0,3).map(p=>{
      const src=imgSrc(p.imgs[0]);
      return '<button class="thumb-card" data-thumb="'+p.id+'">'
        +(src?'<img src="'+src+'">':(p.imgs[0]?'<img data-blob="'+U.esc(p.imgs[0])+'">':'<div class="th-text">'+U.esc(p.text)+'</div>'))
        +'</button>';
    }).join('')||'<div class="tiny" style="padding:8px 2px">还没有发布动态，点右下角 + 发一条吧</div>')+'</div>';

    html+='<div class="discover-row" style="padding-bottom:2px"><span class="dr-title">moments</span></div>';
    html+='<div id="post-list"></div>';
    el.innerHTML=html;
    /* 加号悬浮按钮挂在 body 上：页面容器 .anim-in 的 transform 会劫持内部 fixed 定位 */
    mountComposeFab();

    U.$('#sm-count',el).onclick=()=>{
      location.hash='#/moments';
    };
    U.$$('[data-thumb]',el).forEach(b=>{
      b.onclick=()=>{
        const card=U.$('[data-post="'+b.dataset.thumb+'"]',el);
        if(card){ card.scrollIntoView({behavior:st.app.reduceMotion?'auto':'smooth',block:'center'});
          card.style.transition='background .3s'; card.style.background='var(--card)';
          setTimeout(()=>card.style.background='',600); }
      };
    });
    UI.mountBlobs(el);
    renderPosts();

    function renderPosts(){
      const posts=st.posts.slice().sort((a,b)=>b.at-a.at);
      const box=U.$('#post-list',el);
      box.innerHTML= posts.length?posts.map(postCard).join('')
        :'<div class="empty"><div class="empty-ico">☾</div>还没有动态<br>点右下角 + 发布第一条吧</div>';
      UI.mountBlobs(box);
      bindPosts(box);
    }

    function nameOf(p){ return Store.displayName(p.author); }
    function handleOf(p){
      return Store.handleOf(p.author);
    }

    function postCard(p){
      const liked=p.likes.includes('me');
      return '<div class="post-card anim-in" data-post="'+p.id+'">'
        +'<div class="pc-head">'+UI.avatar(p.author,40)
        +'<div class="grow"><div class="pc-name">'+U.esc(nameOf(p))+' <span class="pc-uid">'+U.esc(handleOf(p))+'</span></div></div>'
        +'<button class="pc-more" data-more="'+p.id+'">'+I.moreV(18)+'</button></div>'
        +(p.text?'<div class="pc-text">'+U.esc(p.text)+'</div>':'')
        +(p.music?Pages.musicCardHTML(p.music,'pc-music'):'')
        +(p.imgs.length?('<div class="post-imgs">'+p.imgs.map(k=>{
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
        +(p.comments.length?'<div class="pc-cmts">'+p.comments.map(c=>
            '<div class="pc-cmt" data-cid="'+c.id+'" data-cauthor="'+c.author+'"><span class="cc-name">@'+U.esc(Store.displayName(c.author))+'</span> '
            +U.esc(c.text)+'<span class="cc-time">'+U.ago(c.at)+'</span>'
            +(c.author==='me'?'<button class="cc-del tiny" data-cdel="'+p.id+':'+c.id+'" style="margin-left:6px">删除</button>':'')
            +'</div>').join('')+'</div>':'')
        +'<div class="cmt-slot" data-cslot="'+p.id+'"></div>'
        +'</div>';
    }

    function bindPosts(box){
      UI.mountBlobs(box);
      U.$$('[data-music-open]',box).forEach(b=>b.onclick=e=>{ e.stopPropagation(); Pages.playSharedMusic(b.dataset.musicOpen); });
      U.$$('[data-like]',box).forEach(b=>b.onclick=()=>{ Store.toggleLike(b.dataset.like); U.vibrate(6); });
      U.$$('[data-cmt]',box).forEach(b=>b.onclick=()=>{
        const pid=b.dataset.cmt;
        const slot=U.$('[data-cslot="'+pid+'"]',box);
        if(slot.innerHTML){ slot.innerHTML=''; return; }
        slot.innerHTML='<div class="cmt-bar"><input placeholder="评论一下..." maxlength="80"><button class="cmt-send">'+I.send(15)+'</button></div>';
        const inp=slot.querySelector('input');
        const doSend=()=>{ const v=inp.value.trim(); if(!v){UI.toast('评论不能为空');return;} Store.addComment(pid,v); };
        slot.querySelector('.cmt-send').onclick=doSend;
        inp.onkeydown=e=>{ if(e.key==='Enter') doSend(); };
        setTimeout(()=>inp.focus(),60);
      });
      U.$$('[data-more]',box).forEach(b=>b.onclick=e=>{
        const p=st.posts.find(x=>x.id===b.dataset.more);
        const mine=p.author==='me';
        const items=[];
        if(mine){
          items.push({icon:'pencil',label:'编辑动态',onClick:()=>openCompose(p)});
          items.push({icon:'trash',label:'删除动态',danger:true,onClick:async()=>{
            if(await UI.confirm('确定删除这条动态吗？',{title:'删除动态',ok:'删除'})){ Store.deletePost(p.id); UI.toast('已删除'); }
          }});
        }
        items.push({icon:'bookmark',label:p.collected?'取消收藏':'收藏',onClick:()=>{
          Store.toggleCollect(p.id); UI.toast(p.collected?'已取消收藏':'已收藏，可在「我的收藏」查看');
        }});
        items.push({icon:'share',label:p.author==='me'?'分享到聊天':'分享到与「'+nameOf(p)+'」的聊天',onClick:()=>{
          Pages.sharePost(p);
        }});
        if(!mine) items.push({icon:'bell',label:'举报',onClick:()=>UI.toast('已收到反馈')});
        UI.menuAt(items,b);
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

    /* 发布 / 编辑动态 */
    /* 加号按钮挂 body（脱离页面容器的 transform 影响），discover 每次渲染时重建 */
    function mountComposeFab(){
      let fb=document.getElementById('compose-fab');
      if(fb) fb.remove();
      fb=document.createElement('button');
      fb.id='compose-fab'; fb.className='fab';
      fb.innerHTML=I.plus(24);
      fb.onclick=()=>openCompose();
      document.body.appendChild(fb);
    }

    function openCompose(editPost){
      const isEdit=!!editPost;
      let imgs=isEdit?editPost.imgs.slice():[];
      function slotsHtml(){
        let h=imgs.map((k,i)=>{
          const src=imgSrc(k);
          return '<div class="thumb-card" style="width:86px;height:86px;position:relative">'
            +(src?'<img src="'+src+'">':'<img data-blob="'+U.esc(k)+'">')
            +'<button data-rm="'+i+'" style="position:absolute;top:5px;right:5px;width:22px;height:22px;border-radius:50%;background:rgba(42,42,46,.7);color:#fff;display:flex;align-items:center;justify-content:center">'+I.x(12)+'</button></div>';
        }).join('');
        if(imgs.length<3) h+='<button id="add-slot" class="thumb-card" style="width:86px;height:86px;display:flex;align-items:center;justify-content:center;color:var(--text-3)">'+I.plus(22)+'</button>';
        return '<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:12px">'+h+'</div>';
      }
      const m=UI.openModal({
        sheet:true,
        html:
          '<div class="row" style="justify-content:space-between;margin-bottom:12px">'
          +'<button class="tiny" data-a="cancel" style="font-size:13.5px;color:var(--text-2)">取消</button>'
          +'<b style="font-size:15px">'+(isEdit?'编辑动态':'发布动态')+'</b>'
          +'<button data-a="send" style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:4px">send '+I.send(16)+'</button></div>'
          +'<div class="row" style="gap:10px">'+UI.avatar('me',40)
          +'<div><div style="font-size:14px;font-weight:700">'+U.esc(user.name)+'</div>'
          +'<div class="tiny" style="font-style:italic">⊹ ° '+U.esc(user.sig)+'</div></div></div>'
          +'<textarea class="field" id="po-text" style="margin-top:12px;border:0;background:transparent;padding:6px 2px;min-height:90px" placeholder="分享此刻..." maxlength="500">'+(isEdit?U.esc(editPost.text):'')+'</textarea>'
          +'<div id="po-slots">'+slotsHtml()+'</div>',
        after(ov,api){
          function reSlots(){
            U.$('#po-slots',ov).innerHTML=slotsHtml();
            UI.mountBlobs(U.$('#po-slots',ov));
            U.$$('[data-rm]',ov).forEach(b=>b.onclick=()=>{ imgs.splice(+b.dataset.rm,1); reSlots(); });
            const add=U.$('#add-slot',ov);
            if(add) add.onclick=()=>pickImg();
          }
          function pickImg(){
            if(imgs.length>=3){ UI.toast('最多 3 张图片'); return; }
            U.pickFiles('image/*',async fs=>{
              const remain=3-imgs.length;
              let n=0;
              for(const f of fs.slice(0,remain)){
                try{ imgs.push(await DB.storeImage(f,{max:1280,q:.82})); n++; }catch(e){}
              }
              reSlots();
              if(n) UI.toast(n>1?'已添加 '+n+' 张图片':'图片已添加');
              else UI.toast('图片读取失败');
              if(fs.length>remain) UI.toast('最多 3 张图片');
            });
          }
          reSlots();
          U.$('[data-a=cancel]',ov).onclick=()=>api.close();
          U.$('[data-a=send]',ov).onclick=()=>{
            const text=U.$('#po-text',ov).value.trim();
            if(!text&&!imgs.length){ UI.toast('写点什么或添加图片吧'); return; }
            if(isEdit) Store.updatePost(editPost.id,{text,imgs});
            else Store.addPost({text,imgs});
            api.close(); UI.toast(isEdit?'已保存':'已发布 ✦');
          };
        }
      });
      return m;
    }
    Pages._openCompose=openCompose;
  };
})();

/* ===== 动态分享 / 动态详情（Discover、角色资料、聊天共享） ===== */
(function(){
  function imgSrc(key){ return key && String(key).indexOf('data:')===0 ? key : null; }
  function handleOf(author){
    return Store.handleOf(author);
  }
  function convName(cv){ return cv.isGroup?cv.name:Store.displayName(cv.contactId); }
  function convAvatar(cv){
    if(cv.isGroup) return '<span class="conv-ico">'+I.users(18)+'</span>';
    return UI.avatar(cv.contactId,38);
  }

  Pages.openPostDetail=function(pid){
    const p=Store.state.posts.find(x=>x.id===pid);
    if(!p){ UI.toast('这条动态已被删除'); return; }
    const liked=p.likes.includes('me');
    UI.openModal({
      sheet:true,
      html:'<div class="pd">'
        +'<div class="pd-head">'+UI.avatar(p.author,40)
        +'<div class="grow"><div class="pc-name">'+U.esc(Store.displayName(p.author))+' <span class="pc-uid">'+U.esc(handleOf(p.author))+'</span></div>'
        +'<div class="tiny">'+U.fmtPost(p.at)+'</div></div></div>'
        +(p.text?'<div class="pd-text">'+U.esc(p.text)+'</div>':'')
        +(p.music?Pages.musicCardHTML(p.music,'pd-music'):'')
        +(p.imgs&&p.imgs.length?'<div class="pd-imgs">'+p.imgs.map(k=>{
            const src=imgSrc(k);
            return '<div class="pd-img" data-pdimg="'+U.esc(k)+'">'
              +(src?'<img src="'+src+'">':'<img data-blob="'+U.esc(k)+'">')+'</div>';
          }).join('')+'</div>':'')
        +'<div class="pd-stats">'+I.heartFill(13)+' '+(p.likes.length||0)+' 赞 · '+I.comment(13)+' '+(p.comments.length||0)+' 评论</div>'
        +(p.comments.length?'<div class="pd-cmts">'+p.comments.map(cm=>
            '<div class="pc-cmt"><span class="cc-name">@'+U.esc(Store.displayName(cm.author))+'</span> '+U.esc(cm.text)
            +'<span class="cc-time">'+U.ago(cm.at)+'</span></div>').join('')+'</div>':'')
        +'</div>'
        +'<div class="modal-actions"><button class="btn light block" data-a="close">关闭</button></div>',
      after(ov,api){
        UI.mountBlobs(ov);
        U.$$('[data-music-open]',ov).forEach(b=>b.onclick=e=>{ e.stopPropagation(); api.close(); Pages.playSharedMusic(b.dataset.musicOpen); });
        U.$$('[data-pdimg]',ov).forEach(d=>d.onclick=()=>{
          const im=d.querySelector('img'); if(im&&im.src) UI.lightbox(im.src);
        });
        U.$('[data-a=close]',ov).onclick=()=>api.close();
      }
    });
  };

  Pages.sharePost=function(p){
    if(!p) return;
    if(p.author!=='me'){
      const cv=Store.convOfContact(p.author);
      if(!cv){ UI.toast('找不到该角色的聊天'); return; }
      Store.send(cv.id,{type:'share',postId:p.id});
      UI.toast('已分享到「'+convName(cv)+'」');
      return;
    }
    const convs=Store.state.convs.filter(v=>!v.dissolved);
    if(!convs.length){ UI.toast('还没有聊天窗口'); return; }
    convs.sort((a,b)=>(b.lastAt||0)-(a.lastAt||0));
    UI.openModal({
      sheet:true,
      title:'分享到聊天',
      html:'<div class="pick-list">'+convs.map(cv=>
        '<button class="pick-row" data-share-cv="'+cv.id+'">'+convAvatar(cv)
        +'<span class="grow">'+U.esc(convName(cv))+'</span>'
        +'<span class="tiny">'+(cv.isGroup?'群聊':'单聊')+'</span></button>').join('')+'</div>'
        +'<p class="tiny" style="padding:10px 4px 0">分享后，动态会以卡片形式出现在聊天里</p>',
      after(ov,api){
        UI.mountBlobs(ov);
        U.$$('[data-share-cv]',ov).forEach(b=>b.onclick=()=>{
          const cv=Store.conv(b.dataset.shareCv);
          if(!cv) return;
          Store.send(cv.id,{type:'share',postId:p.id});
          api.close();
          UI.toast('已分享到「'+convName(cv)+'」');
        });
      }
    });
  };
})();
