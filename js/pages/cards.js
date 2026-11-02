/* ===== Cards 字卡设置页（通用 / 专属 / 报备） ===== */
window.Pages=window.Pages||{};

Pages.cards=function(el){
  const st=Store.state;
  let tab='universal';   // universal | exclusive | report | dynamic
  let roleId=null;

  const TAB_NAME={universal:'通用', exclusive:'专属', report:'报备', dynamic:'动态'};

  function refresh(){
    el.innerHTML=buildHtml();
    UI.mountBlobs(el);
    bind();
  }

  function buildHtml(){
    const roles=st.contacts;
    if(!roleId && roles.length) roleId=roles[0].id;

    let html=UI.head('字卡设置',{back:true});

    html+='<div style="padding:4px 16px 10px"><div class="pillbar">'
      +[['universal','通用'],['exclusive','专属'],['report','报备'],['dynamic','动态']].map(t=>
        '<button class="pp '+(tab===t[0]?'active':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('')
      +'<button class="pp icon-only" data-add title="添加字卡">'+I.plus(17)+'</button>'
      +'</div></div>';

    /* 专属字卡：横向角色选择器 */
    if(tab==='exclusive'){
      if(!roles.length){
        return html+'<div class="empty"><div class="empty-ico">✦</div>暂无角色</div>';
      }
      html+='<div style="padding:0 16px 10px;display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch">'
        +roles.map(r=>{
          const act=roleId===r.id;
          return '<button class="sg'+(act?' active':'')+'" data-role="'+r.id
            +'" style="white-space:nowrap;flex-shrink:0;height:30px;padding:0 14px;border-radius:999px;font-size:12.5px;'
            +(act?'background:var(--dark);color:#fff;font-weight:500':'background:var(--card);color:var(--text-2)')
            +'">'+U.esc(r.remark||r.name)+'</button>';
        }).join('')
        +'</div>';
    }

    let cards=[];
    if(tab==='universal') cards=Store.getUniversalCards();
    else if(tab==='exclusive') cards=Store.getExclusiveCards(roleId);
    else if(tab==='dynamic') cards=Store.getDynamicCards();
    else cards=Store.getReportCards();

    if(!cards.length){
      const tips={universal:'暂无通用字卡', exclusive:'该角色暂无专属字卡', report:'暂无报备字卡', dynamic:'暂无动态字卡'};
      html+='<div class="empty"><div class="empty-ico">✦</div>'+tips[tab]+'<br>点上方 + 添加</div>';
    }else if(tab==='dynamic'){
      html+='<div style="padding:0 16px 20px">'
        +'<p class="tiny" style="margin:2px 2px 10px;line-height:1.6">动态字卡：角色每天会按概率发 0–2 条动态，每条从这些字卡里抽 1–6 张拼成一条文案。</p>'
        +'<div class="list-card">'+cards.map(c=>
          '<div class="list-row">'
          +'<span class="grow" style="font-size:14px;line-height:1.5;white-space:normal">'+U.esc(c.content)+'</span>'
          +(c.usage?'<span class="tiny" style="margin:0 8px;flex-shrink:0">'+c.usage+'次</span>':'')
          +'<button class="icon-btn sm" data-del="'+c.id+'" style="color:#B45757;flex-shrink:0" title="删除">'+I.trash(15)+'</button>'
          +'</div>').join('')+'</div></div>';
    }else if(tab==='universal'){
      /* 通用字卡：按分组分区展示（空分组也展示，未分组殿后），点击卡片移入分组 */
      const groups=Store.getCardGroups();
      const row=c=>'<div class="list-row" data-card="'+c.id+'" style="cursor:pointer">'
        +'<span class="grow" style="font-size:14px;line-height:1.5;white-space:normal">'+U.esc(c.content)+'</span>'
        +(c.usage?'<span class="tiny" style="margin:0 8px;flex-shrink:0">'+c.usage+'次</span>':'')
        +'<button class="icon-btn sm" data-del="'+c.id+'" style="color:#B45757;flex-shrink:0" title="删除">'+I.trash(15)+'</button>'
        +'</div>';
      html+='<div style="padding:0 16px 20px">';
      groups.forEach(g=>{
        const list=cards.filter(c=>c.groupId===g.id);
        html+='<div class="sec-label" style="display:flex;align-items:center;gap:6px;margin:10px 2px 6px">'
          +'<span style="flex-shrink:0">'+I.folder(14)+'</span>'+U.esc(g.name)
          +'<span class="tiny">'+list.length+'</span></div>'
          +'<div class="list-card">'+(list.length?list.map(row).join('')
            :'<div class="tiny" style="padding:10px 14px;opacity:.55">点击卡片可移入</div>')+'</div>';
      });
      const rest=cards.filter(c=>!c.groupId||!groups.some(g=>g.id===c.groupId));
      html+='<div class="sec-label" style="display:flex;align-items:center;gap:6px;margin:12px 2px 6px">未分组'
        +'<span class="tiny">'+rest.length+'</span></div>'
        +'<div class="list-card">'+(rest.length?rest.map(row).join('')
          :'<div class="tiny" style="padding:10px 14px;opacity:.55">点击卡片可移入</div>')+'</div>'
        +'<button class="btn light" data-gmgr style="width:100%;margin-top:14px">管理分组</button>';
      html+='</div>';
    }else{
      /* 报备字卡：一组 = 多句文字 + 多张图；发送时随机一句 + 50% 概率一张图 */
      html+='<div style="padding:0 16px 20px;display:flex;flex-direction:column;gap:12px">';
      if(!cards.length){
        html+='<div class="empty"><div class="empty-ico">📌</div>暂无报备字卡<br>点上方 + 新建一组</div>';
      }
      cards.forEach(g=>{
        const texts=g.texts||[], imgs=g.imgs||[];
        html+='<div class="rc-group" data-card="'+g.id+'">'
          +'<div class="rc-head"><span class="rc-title">报备字卡</span>'
          +(g.usage?'<span class="tiny">'+g.usage+' 次</span>':'')
          +'<button class="icon-btn sm" data-del="'+g.id+'" style="color:var(--danger);margin-left:auto" title="删除这一组">'+I.trash(15)+'</button></div>'
          +'<div class="rc-texts">'
          +texts.map((t,i)=>'<div class="rc-line"><span class="grow">'+U.esc(t)+'</span>'
            +'<button class="icon-btn sm" data-edittext="'+g.id+':'+i+'" title="修改">'+I.pencil(14)+'</button>'
            +'<button class="icon-btn sm" data-deltext="'+g.id+':'+i+'" title="删除这句">'+I.x(14)+'</button></div>').join('')
          +'<div class="rc-add"><input class="field" data-newtext="'+g.id+'" placeholder="添加一句报备..." maxlength="60">'
          +'<button class="btn light sm" data-addtext="'+g.id+'">添加</button></div>'
          +'</div>'
          +'<div class="rc-imgs">'
          +imgs.map((k,i)=>'<div class="rc-img"><img data-blob="'+U.esc(k)+'" alt="">'
            +'<button data-delimg="'+g.id+':'+i+'" title="删除图片">'+I.x(12)+'</button></div>').join('')
          +'<button class="rc-img rc-add-img" data-addimg="'+g.id+'" title="添加图片">'+I.plus(20)+'</button>'
          +'</div>'
          +'</div>';
      });
      html+='</div>';
    }
    return html;
  }

  function bind(){
    const backBtn=U.$('[data-back]',el);
    if(backBtn) backBtn.onclick=()=>App.back();

    const addBtn=U.$('[data-add]',el);
    if(addBtn) addBtn.onclick=openAdd;

    U.$$('[data-tab]',el).forEach(b=>{
      b.onclick=()=>{ tab=b.dataset.tab; refresh(); };
    });

    U.$$('[data-role]',el).forEach(b=>{
      b.onclick=()=>{ roleId=b.dataset.role; refresh(); };
    });

    U.$$('[data-del]',el).forEach(b=>{
      b.onclick=async e=>{
        e.stopPropagation();
        if(!await UI.confirm('删除这张字卡？',{title:'删除字卡',ok:'删除',danger:true})) return;
        const id=b.dataset.del;
        if(tab==='universal') Store.delUniversalCard(id);
        else if(tab==='exclusive') Store.delExclusiveCard(roleId,id);
        else if(tab==='dynamic') Store.delDynamicCard(id);
        else Store.delReportCard(id);
        refresh();
        UI.toast('已删除');
      };
    });

    /* 通用字卡：点击卡片行 → 移入分组菜单（仅行体，删除按钮已 stopPropagation） */
    if(tab==='universal'){
      U.$$('[data-card]',el).forEach(row=>{
        row.onclick=e=>{
          if(e.target.closest('[data-del]')) return;
          const cid=row.dataset.card;
          const c=Store.getUniversalCards().find(x=>x.id===cid);
          if(!c) return;
          const items=[{icon:'x',label:'未分组'+(c.groupId?'':' ✓'),onClick:()=>{
            Store.setCardGroup(cid,null); refresh(); UI.toast('已移至未分组');
          }}];
          Store.getCardGroups().forEach(g=>{
            items.push({icon:'folder',label:g.name+(c.groupId===g.id?' ✓':''),onClick:()=>{
              Store.setCardGroup(cid,g.id); refresh(); UI.toast('已移入「'+g.name+'」');
            }});
          });
          UI.menuAt(items,row);
        };
      });
    }

    const gmBtn=U.$('[data-gmgr]',el);
    if(gmBtn) gmBtn.onclick=openGroupManage;

    /* 报备字卡组：改句子 / 删句子 / 加句子 / 加图片 / 删图片 */
    if(tab==='report'){
      U.$$('[data-edittext]',el).forEach(b=>b.onclick=()=>{
        const [gid,idx]=b.dataset.edittext.split(':');
        const g=Store.getReportCards().find(x=>x.id===gid);
        if(!g) return;
        UI.openModal({
          title:'修改报备文字',
          html:'<textarea class="field" id="rc-edit" maxlength="60" style="min-height:90px">'+U.esc(g.texts[+idx]||'')+'</textarea>'
            +'<div class="modal-actions"><button class="btn light" data-a="c">取消</button>'
            +'<button class="btn dark" data-a="ok">保存</button></div>',
          after(ov,api){
            ov.querySelector('[data-a=c]').onclick=()=>api.close();
            ov.querySelector('[data-a=ok]').onclick=()=>{
              const v=U.$('#rc-edit',ov).value.trim();
              if(!v){ UI.toast('文字不能为空'); return; }
              const texts=(g.texts||[]).slice(); texts[+idx]=v;
              Store.updateReportGroup(gid,{texts});
              api.close(); refresh(); UI.toast('已保存');
            };
            setTimeout(()=>U.$('#rc-edit',ov).focus(),120);
          }
        });
      });
      U.$$('[data-deltext]',el).forEach(b=>b.onclick=()=>{
        const [gid,idx]=b.dataset.deltext.split(':');
        const g=Store.getReportCards().find(x=>x.id===gid);
        if(!g) return;
        const texts=g.texts.slice(); texts.splice(+idx,1);
        Store.updateReportGroup(gid,{texts});
        refresh();
      });
      U.$$('[data-addtext]',el).forEach(b=>b.onclick=()=>{
        const gid=b.dataset.addtext;
        const inp=U.$('[data-newtext="'+gid+'"]',el);
        const v=inp.value.trim();
        if(!v){ UI.toast('先写一句报备'); return; }
        const g=Store.getReportCards().find(x=>x.id===gid);
        if(!g) return;
        Store.updateReportGroup(gid,{texts:(g.texts||[]).concat(v)});
        inp.value='';
        refresh();
      });
      U.$$('[data-delimg]',el).forEach(b=>b.onclick=()=>{
        const [gid,idx]=b.dataset.delimg.split(':');
        const g=Store.getReportCards().find(x=>x.id===gid);
        if(!g) return;
        const imgs=g.imgs.slice(); imgs.splice(+idx,1);
        Store.updateReportGroup(gid,{imgs});
        refresh();
      });
      U.$$('[data-addimg]',el).forEach(b=>b.onclick=()=>{
        const gid=b.dataset.addimg;
        U.pickFiles('image/*',async fs=>{
          const ids=[];
          for(const f of fs){
            try{ ids.push(await DB.storeImage(f,{max:800,q:.85})); }catch(e){}
          }
          if(!ids.length){ UI.toast('图片读取失败'); return; }
          const g=Store.getReportCards().find(x=>x.id===gid);
          if(!g) return;
          Store.updateReportGroup(gid,{imgs:(g.imgs||[]).concat(ids)});
          refresh(); UI.toast(ids.length>1?'已添加 '+ids.length+' 张图片':'图片已添加');
        });
      });
    }
  }

  /* 管理分组弹窗：新建 / 重命名 / 删除通用字卡分组 */
  function openGroupManage(){
    function bodyHtml(){
      const gs=Store.getCardGroups();
      return (gs.length?gs.map(g=>
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        +'<span style="flex-shrink:0;width:22px;text-align:center;color:var(--text-2)">'+I.folder(16)+'</span>'
        +'<input class="field grow" data-name="'+g.id+'" value="'+U.esc(g.name)+'" maxlength="16">'
        +'<button class="icon-btn sm" data-save="'+g.id+'" title="保存">'+I.check(16)+'</button>'
        +'<button class="icon-btn sm" data-del="'+g.id+'" style="color:#B45757" title="删除分组">'+I.trash(15)+'</button>'
        +'</div>').join('')
        :'<p class="tiny" style="opacity:.6;margin-bottom:4px">还没有分组，在下方新建一个</p>')
        +'<div style="display:flex;gap:8px;margin-top:12px">'
        +'<input class="field grow" id="cg-new" placeholder="新分组名称" maxlength="16">'
        +'<button class="btn dark" data-a="add" style="flex-shrink:0">新建</button></div>';
    }
    function bind(scope){
      U.$$('[data-save]',scope).forEach(b=>b.onclick=()=>{
        const inp=U.$('[data-name="'+b.dataset.save+'"]',scope);
        if(!inp.value.trim()){ UI.toast('分组名不能为空'); return; }
        if(Store.renameCardGroup(b.dataset.save,inp.value)) UI.toast('已保存');
      });
      U.$$('[data-del]',scope).forEach(b=>b.onclick=async()=>{
        const g=Store.getCardGroups().find(x=>x.id===b.dataset.del);
        const ok=await UI.confirm('删除分组「'+(g?g.name:'')+'」？组内字卡将移回未分组。',
          {title:'删除分组',ok:'删除',danger:true});
        if(!ok) return;
        if(!Store.delCardGroup(b.dataset.del)){ UI.toast('删除失败'); return; }
        UI.toast('已删除分组');
        const body=U.$('#gm-body',m.el);   /* 原地刷新弹窗（列表已由 emit 重渲染） */
        if(body){ body.innerHTML=bodyHtml(); bind(body); }
      });
      const addBtn=U.$('[data-a=add]',scope);
      if(addBtn) addBtn.onclick=()=>{
        const inp=U.$('#cg-new',scope);
        if(!inp.value.trim()){ UI.toast('请填写分组名'); return; }
        Store.addCardGroup(inp.value);
        UI.toast('已新建分组');
        const body=U.$('#gm-body',m.el);
        if(body){ body.innerHTML=bodyHtml(); bind(body); }
      };
    }
    const m=UI.openModal({
      title:'管理分组',
      html:'<div id="gm-body">'+bodyHtml()+'</div>'
        +'<div class="modal-actions"><button class="btn dark" data-a="ok">完成</button></div>',
      after(ov,api){
        bind(ov);
        ov.querySelector('[data-a=ok]').onclick=()=>api.close();
        setTimeout(()=>{ const t=U.$('#cg-new',ov); if(t&&t.offsetParent) t.focus(); },120);
      }
    });
    return m;
  }

  function openAdd(){
    if(tab==='exclusive' && !roleId){ UI.toast('请先选择角色'); return; }
    if(tab==='report'){
      UI.openModal({
        title:'新建报备字卡',
        html:'<p class="tiny" style="margin-bottom:8px">每行一句，之后可以在这一组里添加图片</p>'
          +'<textarea class="field" id="card-new" style="min-height:140px;resize:vertical" placeholder="我在工作&#10;工作的时候很想你"></textarea>'
          +'<div class="modal-actions">'
          +'<button class="btn light" data-a="c">取消</button>'
          +'<button class="btn dark" data-a="ok">新建</button></div>',
        after(ov,api){
          ov.querySelector('[data-a=c]').onclick=()=>api.close();
          ov.querySelector('[data-a=ok]').onclick=()=>{
            const lines=U.$('#card-new',ov).value.split('\n').map(l=>l.trim()).filter(Boolean);
            if(!lines.length){ UI.toast('至少写一句'); return; }
            Store.addReportGroup(lines,[]);
            api.close(); refresh(); UI.toast('已新建一组');
          };
          setTimeout(()=>{ const t=U.$('#card-new',ov); if(t) t.focus(); },120);
        }
      });
      return;
    }
    UI.openModal({
      title:'添加'+TAB_NAME[tab]+'字卡',
      html:'<p class="tiny" style="margin-bottom:8px">每行一条，可一次输入多条</p>'
        +'<textarea class="field" id="card-new" style="min-height:140px;resize:vertical" placeholder="第一行&#10;第二行&#10;第三行"></textarea>'
        +'<div class="modal-actions">'
        +'<button class="btn light" data-a="c">取消</button>'
        +'<button class="btn dark" data-a="ok">添加</button></div>',
      after(ov,api){
        ov.querySelector('[data-a=c]').onclick=()=>api.close();
        ov.querySelector('[data-a=ok]').onclick=()=>{
          const text=U.$('#card-new',ov).value.trim();
          if(!text){ UI.toast('内容不能为空'); return; }
          const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
          lines.forEach(line=>{
            if(tab==='universal') Store.addUniversalCard(line);
            else if(tab==='exclusive') Store.addExclusiveCard(roleId,line);
            else if(tab==='dynamic') Store.addDynamicCard(line);
            else Store.addReportCard(line);
          });
          api.close();
          UI.toast('已添加 '+lines.length+' 条');
          refresh();
        };
        setTimeout(()=>{ const t=U.$('#card-new',ov); if(t) t.focus(); },120);
      }
    });
  }

  refresh();
};
