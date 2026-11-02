/* ===== 表情包管理页：图片表情 + Emoji（都会进入角色回复池） ===== */
window.Pages=window.Pages||{};

Pages.stickerSettings=function(el){
  const st=Store.state;
  const QUICK=['😊','🥺','😭','😍','🥰','😘','😴','🤔','😅','😂','❤️','✨','🌙','⭐️','🍰','☕️'];

  function render(){
    const imgs=st.app.stickerImgs||[];
    const emojis=st.app.stickerEmojis||[];
    el.innerHTML=UI.head('表情包管理',{back:true})
      +'<div class="stk-page">'
      +'<p class="tiny stk-lead">导入的图片表情和 Emoji 会加入角色回复池；角色会按回复设置里的概率发送。</p>'

      +'<div class="cs-sec sec-label">图片表情</div>'
      +'<div class="stk-grid">'+imgs.map((id,i)=>
          '<div class="stk-cell" data-img="'+i+'">'
          +'<img data-blob="'+U.esc(id)+'" alt="表情包">'
          +'<button class="stk-del" data-del-img="'+i+'" title="删除">'+I.x(11)+'</button></div>').join('')
        +'<button class="stk-add" data-add-img title="添加图片表情">'+I.plus(22)+'</button>'
        +'</div>'
      +(imgs.length?'':'<p class="tiny" style="padding:8px 2px 0">还没有图片表情，点上面的 + 从本地导入</p>')

      +'<div class="cs-sec sec-label" style="margin-top:20px">Emoji</div>'
      +'<div class="emoji-grid">'+emojis.map((e,i)=>
          '<div class="emoji-chip" data-emoji="'+i+'">'+U.esc(e)
          +'<button class="ex" data-del-emoji="'+i+'" title="删除">'+I.x(9)+'</button></div>').join('')
        +'</div>'
      +(emojis.length?'':'<p class="tiny" style="padding:2px 2px 0">还没有 Emoji，从下面输入或点一个常用 Emoji 添加</p>')
      +'<div class="emoji-add">'
        +'<input class="field" id="emoji-input" maxlength="8" placeholder="输入或粘贴 Emoji，例如 😊">'
        +'<button class="btn dark" id="emoji-add">添加</button></div>'
      +'<div class="emoji-quick">'+QUICK.map(q=>'<button data-quick="'+q+'" title="添加 '+q+'">'+q+'</button>').join('')+'</div>'

      +'<p class="tiny" style="padding:18px 2px 0;line-height:1.7">聊天输入栏的表情面板只发送图片表情；Emoji 主要用于角色回复，也会按概率单独发送或跟在字卡后面。</p>'
      +'</div>';

    U.$('[data-back]',el).onclick=()=>App.back();
    UI.mountBlobs(el);

    U.$('[data-add-img]',el).onclick=()=>{
      U.pickFiles('image/*',async fs=>{
        let n=0;
        for(const f of fs){
          try{ Store.addSticker(await DB.storeImage(f,{max:512,q:.85})); n++; }
          catch(e){}
        }
        if(n) UI.toast(n>1?'已添加 '+n+' 个表情':'表情已添加');
        else UI.toast('图片读取失败');
      });
    };
    U.$$('[data-img]',el).forEach(c=>{
      c.onclick=e=>{
        if(e.target.closest('[data-del-img]')) return;
        const img=c.querySelector('img');
        if(img&&img.src) UI.lightbox(img.src);
      };
    });
    U.$$('[data-del-img]',el).forEach(b=>b.onclick=async e=>{
      e.stopPropagation();
      const id=(st.app.stickerImgs||[])[+b.dataset.delImg];
      if(await UI.confirm('删除这个图片表情？已发送的消息不受影响。',{title:'删除表情',ok:'删除'})){
        Store.removeSticker(id); UI.toast('已删除');
      }
    });

    U.$('#emoji-add',el).onclick=()=>{
      const inp=U.$('#emoji-input',el);
      const v=inp.value.trim();
      if(!v){ UI.toast('先输入一个 Emoji'); return; }
      if((st.app.stickerEmojis||[]).includes(v)){ UI.toast('这个 Emoji 已经在列表里'); return; }
      Store.addStickerEmoji(v); UI.toast('Emoji 已添加');
    };
    U.$('#emoji-input',el).onkeydown=e=>{
      if(e.key==='Enter'){ e.preventDefault(); U.$('#emoji-add',el).click(); }
    };
    U.$$('[data-quick]',el).forEach(b=>b.onclick=()=>{
      const q=b.dataset.quick;
      if((st.app.stickerEmojis||[]).includes(q)){ UI.toast('这个 Emoji 已经在列表里'); return; }
      Store.addStickerEmoji(q); UI.toast('Emoji 已添加');
    });
    U.$$('[data-del-emoji]',el).forEach(b=>b.onclick=e=>{
      e.stopPropagation();
      const e2=(st.app.stickerEmojis||[])[+b.dataset.delEmoji];
      Store.removeStickerEmoji(e2); UI.toast('已删除');
    });
  }

  render();
};
