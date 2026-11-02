/* ===== 应用外观：主题 / 气泡 / 其他 ===== */
window.Pages=window.Pages||{};

Pages.appearance=function(el){
  const app=Store.state.app;

  function isDark(){ return App.resolvedTheme()==='dark'; }
  function schemeOf(key){ return App.BUBBLE_SCHEMES[key]||App.BUBBLE_SCHEMES.mist; }

  function paintTheme(){
    U.$$('[data-theme-opt]',el).forEach(b=>{
      b.classList.toggle('active', b.dataset.themeOpt===(app.theme||'light'));
    });
    const hint=U.$('#ap-theme-hint',el);
    if(hint){
      hint.textContent = app.theme==='system'
        ? '跟随手机系统（当前：'+(isDark()?'深色':'浅色')+'）'
        : (app.theme==='dark'?'始终使用深色主题':'始终使用浅色主题');
    }
  }

  function paintShapes(){
    U.$$('[data-shape]',el).forEach(b=>{
      b.classList.toggle('on', b.dataset.shape===app.bubbleShape);
    });
  }

  function paintSwatches(){
    const dark=isDark();
    U.$$('[data-color]',el).forEach(b=>{
      const s=schemeOf(b.dataset.color);
      b.style.setProperty('--c', s[dark?'dark':'light'][0]);
      b.classList.toggle('on', b.dataset.color===app.bubbleColor);
    });
  }
  function paintOtherSwatches(){
    const dark=isDark();
    U.$$('[data-other-color]',el).forEach(b=>{
      const key=b.dataset.otherColor;
      const s=key==='theme'?null:schemeOf(key);
      b.style.setProperty('--c', s?s[dark?'dark':'light'][0]:(dark?'#2E2E34':'#E9EAEE'));
      b.classList.toggle('on', key===(app.otherBubbleColor||'theme'));
    });
  }

  const themeOpts=[['light','浅色'],['dark','深色'],['system','跟随系统']];
  const shapeKeys=Object.keys(App.BUBBLE_SHAPES);
  const colorKeys=Object.keys(App.BUBBLE_SCHEMES);
  let wallTab='chats';

  function wallData(){
    if(!app.wallpaper||typeof app.wallpaper!=='object'){
      app.wallpaper={mode:'unified',type:'none',img:null,pages:{}};
    }
    const w=app.wallpaper;
    if(!w.pages) w.pages={};
    ['chats','discover','life','me'].forEach(k=>{ if(!w.pages[k]) w.pages[k]={type:'none',img:null}; });
    return w;
  }
  function currentWallSpec(){
    const w=wallData();
    return w.mode==='per'?w.pages[wallTab]:w;
  }
  function saveWall(){
    const w=wallData();
    Store.setApp({wallpaper:w},true);
    App.applyAppPrefs();
  }
  function renderWallCard(){
    const w=wallData();
    const spec=currentWallSpec();
    const type=spec.type||'none';
    const box=U.$('#ap-wall-card',el);
    if(!box) return;
    const tabs=[['chats','Chats'],['discover','Discover'],['life','Life'],['me','Me']];
    const types=[['none','无'],['dawn','晨雾'],['cream','奶油'],['mist','雾蓝'],['local','本地']];
    const opacity=Math.round((app.wallOpacity==null?1:app.wallOpacity)*100);
    const wallX=Math.round(Number(app.wallX)||0);
    const wallY=Math.round(Number(app.wallY)||0);
    const wallZoom=Math.round((Number(app.wallZoom)||1)*100);
    box.innerHTML=
      '<div class="seg light ap-wall-mode" id="ap-wall-mode">'
      +'<button class="sg '+(w.mode==='unified'?'active':'')+'" data-wallmode="unified">四个页面一样</button>'
      +'<button class="sg '+(w.mode==='per'?'active':'')+'" data-wallmode="per">每页单独</button></div>'
      +(w.mode==='per'?'<div class="scope ap-wall-pages" id="ap-wall-pages">'+tabs.map(t=>'<button data-walltab="'+t[0]+'" class="'+(wallTab===t[0]?'on':'')+'">'+t[1]+'</button>').join('')+'</div>':'')
      +'<div class="ap-wall-opts" id="ap-wall-types">'+types.map(t=>
        '<button class="ap-wall-opt '+(type===t[0]?'on':'')+'" data-walltype="'+t[0]+'"><i class="w-'+t[0]+'">'+(t[0]==='local'?'+':'')+'</i><span>'+t[1]+'</span></button>'
      ).join('')+'</div>'
      +'<p class="ap-hint">'+(w.mode==='unified'?'四个页面共用一张壁纸；聊天详情跟随 Chats。':'当前编辑：'+({chats:'Chats',discover:'Discover',life:'Life',me:'Me'})[wallTab]+'。聊天详情跟随 Chats。')+'</p>'
      +'<div class="ap-mrow" style="margin-top:6px"><b>壁纸透明度</b><em><span id="ap-wall-opacity-val">'+opacity+'</span>%</em></div>'
      +'<input class="ap-range" id="ap-wall-opacity" type="range" min="20" max="100" step="5" value="'+opacity+'">'
      +'<div class="ap-mrow" style="margin-top:6px"><b>壁纸缩放</b><em><span id="ap-wall-zoom-val">'+wallZoom+'</span>%</em></div>'
      +'<input class="ap-range" id="ap-wall-zoom" type="range" min="100" max="180" step="5" value="'+wallZoom+'">'
      +'<div class="ap-mrow" style="margin-top:6px"><b>水平位置</b><em><span id="ap-wall-x-val">'+wallX+'</span>px</em></div>'
      +'<input class="ap-range" id="ap-wall-x" type="range" min="-80" max="80" step="1" value="'+wallX+'">'
      +'<div class="ap-mrow" style="margin-top:6px"><b>垂直位置</b><em><span id="ap-wall-y-val">'+wallY+'</span>px</em></div>'
      +'<input class="ap-range" id="ap-wall-y" type="range" min="-80" max="80" step="1" value="'+wallY+'">';

    U.$$('#ap-wall-mode [data-wallmode]',box).forEach(b=>{
      b.onclick=()=>{
        w.mode=b.dataset.wallmode;
        if(w.mode==='per'&&Object.keys(w.pages).every(k=>!w.pages[k]||w.pages[k].type==='none')&&w.type&&w.type!=='none'){
          Object.keys(w.pages).forEach(k=>{ w.pages[k]={type:w.type,img:w.img||null}; });
        }
        if(w.mode==='unified'&&(!w.type||w.type==='none')){
          const first=Object.values(w.pages).find(p=>p&&p.type&&p.type!=='none');
          if(first){ w.type=first.type; w.img=first.img||null; }
        }
        saveWall(); renderWallCard();
      };
    });
    U.$$('#ap-wall-pages [data-walltab]',box).forEach(b=>{
      b.onclick=()=>{ wallTab=b.dataset.walltab; renderWallCard(); };
    });
    U.$$('#ap-wall-types [data-walltype]',box).forEach(b=>{
      b.onclick=()=>{
        const t=b.dataset.walltype;
        const target=currentWallSpec();
        if(t==='local'){
          U.pickFile('image/*',async f=>{
            try{
              const id=await DB.storeImage(f,{max:1600,q:.84});
              target.type='local'; target.img=id;
              saveWall(); renderWallCard(); UI.toast('壁纸已更新');
            }catch(e){ UI.toast('壁纸读取失败：'+e.message); }
          });
          return;
        }
        target.type=t; target.img=null;
        saveWall(); renderWallCard();
      };
    });
    const op=U.$('#ap-wall-opacity',box);
    if(op){
      op.oninput=()=>{
        app.wallOpacity=+op.value/100;
        const label=U.$('#ap-wall-opacity-val',box);
        if(label) label.textContent=op.value;
        Store.setApp({wallOpacity:app.wallOpacity},true);
        App.applyAppPrefs();
      };
    }
    function bindWallRange(id,key,labelId,percent){
      const input=U.$('#'+id,box);
      if(!input) return;
      input.oninput=()=>{
        const v=+input.value;
        app[key]=percent?v/100:v;
        const label=U.$('#'+labelId,box);
        if(label) label.textContent=input.value;
        if((key==='wallX'||key==='wallY')&&v!==0&&(Number(app.wallZoom)||1)<=1.01){
          app.wallZoom=1.1;
          const zi=U.$('#ap-wall-zoom',box);
          if(zi) zi.value='110';
          const zl=U.$('#ap-wall-zoom-val',box);
          if(zl) zl.textContent='110';
        }
        Store.setApp({[key]:app[key],wallZoom:app.wallZoom},true);
        App.applyAppPrefs();
      };
    }
    bindWallRange('ap-wall-zoom','wallZoom','ap-wall-zoom-val',true);
    bindWallRange('ap-wall-x','wallX','ap-wall-x-val',false);
    bindWallRange('ap-wall-y','wallY','ap-wall-y-val',false);
  }

  el.innerHTML=UI.head('应用外观',{back:true})
    +'<div class="ap-body">'
    +'<div class="cs-sec sec-label">主题</div>'
    +'<div class="set-card ap-theme-card">'
    +'<div class="seg light ap-theme-seg" id="ap-theme">'
    +themeOpts.map(t=>'<button class="sg" data-theme-opt="'+t[0]+'">'+t[1]+'</button>').join('')
    +'</div>'
    +'<p class="tiny" id="ap-theme-hint" style="margin-top:9px"></p>'
    +'</div>'

    +'<div class="cs-sec sec-label">壁纸</div>'
    +'<div class="set-card ap-wall-card" id="ap-wall-card"></div>'

    +'<div class="cs-sec sec-label">毛玻璃</div>'
    +'<div class="set-card ap-glass-card">'
    +'<div class="ap-mrow"><div><b>毛玻璃主题</b><span>卡片 / 导航 / 气泡半透明</span></div>'+UI.switchHtml(!!app.glassTheme,'id="ap-glass-toggle"')+'</div>'
    +'<div class="seg light ap-glass-seg" id="ap-glass-intensity">'
    +'<button class="sg" data-gi="soft">轻</button><button class="sg" data-gi="mid">中</button><button class="sg" data-gi="strong">强</button>'
    +'</div>'
    +'<p class="ap-hint">开启后卡片和顶栏会半透明并带背景模糊；壁纸透明度越高，文字越依赖玻璃层。</p>'
    +'</div>'

    +'<div class="cs-sec sec-label">气泡预览</div>'
    +'<div class="ap-preview" id="ap-preview">'
    +'<div class="ap-row them"><div class="ap-bubble">今晚一起看星星吗 ✦</div></div>'
    +'<div class="ap-row me"><div class="ap-bubble">好呀，几点？</div></div>'
    +'<div class="ap-row them"><div class="ap-bubble">九点，老地方见</div></div>'
    +'<div class="ap-time">14:20</div>'
    +'<div class="ap-row me"><div class="ap-bubble">收到 ✦</div></div>'
    +'</div>'

    +'<div class="cs-sec sec-label">气泡尺寸</div>'
    +'<div class="set-card ap-measure">'
    +'<div class="ap-mrow"><b>左右内边距</b><em><span id="ap-padx-val">'+(app.bubblePadX==null?17:app.bubblePadX)+'</span> px</em></div>'
    +'<input class="ap-range" id="ap-padx" type="range" min="10" max="24" step="1" value="'+(app.bubblePadX==null?17:app.bubblePadX)+'">'
    +'<div class="ap-mrow"><b>上下内边距</b><em><span id="ap-pady-val">'+(app.bubblePadY==null?13:app.bubblePadY)+'</span> px</em></div>'
    +'<input class="ap-range" id="ap-pady" type="range" min="8" max="20" step="1" value="'+(app.bubblePadY==null?13:app.bubblePadY)+'">'
    +'<div class="ap-mrow"><b>气泡间距</b><em><span id="ap-gap-val">'+(app.bubbleGap==null?18:app.bubbleGap)+'</span> px</em></div>'
    +'<input class="ap-range" id="ap-gap" type="range" min="8" max="28" step="1" value="'+(app.bubbleGap==null?18:app.bubbleGap)+'">'
    +'</div>'

    +'<div class="cs-sec sec-label">时间戳</div>'
    +'<div class="set-card ap-ts-card">'
    +'<div class="ap-mrow"><b>居中时间戳间隔</b><em>跨天始终显示</em></div>'
    +'<div class="seg light ap-ts-seg" id="ap-tsgap">'
    +[[5,'5 分钟'],[15,'15 分钟'],[30,'30 分钟'],[60,'60 分钟'],[9999,'仅跨天']].map(o=>'<button class="sg" data-tsgap="'+o[0]+'">'+o[1]+'</button>').join('')
    +'</div>'
    +'<p class="ap-hint">只在超过这个间隔时出现一条居中时间，不再每条消息都显示。</p>'
    +'</div>'

    +'<div class="cs-sec sec-label">气泡形状</div>'
    +'<div class="ap-chips" id="ap-shapes">'
    +shapeKeys.map(k=>'<button class="ap-chip" data-shape="'+k+'">'+App.BUBBLE_SHAPES[k].name+'</button>').join('')
    +'</div>'

    +'<div class="cs-sec sec-label">我的气泡颜色</div>'
    +'<div class="ap-swatches" id="ap-colors">'
    +colorKeys.map(k=>'<button class="ap-sw" data-color="'+k+'"><i></i><em>'+App.BUBBLE_SCHEMES[k].name+'</em></button>').join('')
    +'</div>'
    +'<div class="cs-sec sec-label" style="margin-top:16px">对方气泡颜色</div>'
    +'<div class="ap-swatches" id="ap-other-colors">'
    +'<button class="ap-sw" data-other-color="theme"><i></i><em>跟随主题</em></button>'
    +colorKeys.map(k=>'<button class="ap-sw" data-other-color="'+k+'"><i></i><em>'+App.BUBBLE_SCHEMES[k].name+'</em></button>').join('')
    +'</div>'
    +'<p class="tiny">只影响别人发给你的气泡；「跟随主题」保持原来的浅灰 / 深灰。</p>'

    +'<div class="cs-sec sec-label" style="margin-top:16px">气泡自定义 CSS</div>'
    +'<div class="set-card ap-css-card">'
    +'<textarea class="field" id="ap-bubble-css" maxlength="6000" rows="5" placeholder=".bubble { border: 1px solid rgba(255,255,255,.4); }&#10;或者直接写声明：border-radius: 20px; box-shadow: 0 4px 18px rgba(0,0,0,.08);">'+U.esc(app.bubbleCss||'')+'</textarea>'
    +'<div class="ap-css-actions"><button class="btn light" id="ap-bubble-css-reset">恢复默认</button><button class="btn dark" id="ap-bubble-css-apply">应用 CSS</button></div>'
    +'<p class="tiny ap-css-hint">支持完整 CSS 选择器；如果只写声明，会自动套到 <code>.msg-row .bubble</code>。样式会立即作用于所有聊天气泡。</p>'
    +'</div>'

    +'<div class="cs-sec sec-label" style="margin-top:16px">其他</div>'
    +'<div class="list-card">'
    +'<div class="list-row"><div class="grow"><div class="r-name">字号大小</div><div class="r-sub">标准 / 大号</div></div>'
    +'<div class="seg light" id="ap-font" style="flex-shrink:0">'
    +'<button class="sg" data-font="md">标准</button><button class="sg" data-font="lg">大号</button></div></div>'
    +'<div class="list-row"><div class="grow"><div class="r-name">减少动画效果</div><div class="r-sub">关闭过渡与开屏动画</div></div>'
    +UI.switchHtml(!!app.reduceMotion,'id="ap-motion"')+'</div>'
    +'<div class="list-row"><div class="grow"><div class="r-name">触感反馈</div><div class="r-sub">支持振动反馈的设备</div></div>'
    +UI.switchHtml(app.haptics!==false,'id="ap-haptic"')+'</div>'
    +'</div>'

    +'<p class="tiny" style="text-align:center;margin-top:18px">设置立即生效，自动保存在本机</p>'
    +'</div>';

  U.$('[data-back]',el).onclick=()=>App.back();

  /* 壁纸 / 毛玻璃 */
  renderWallCard();
  UI.bindSwitch(el,'#ap-glass-toggle',on=>{
    app.glassTheme=on;
    Store.setApp({glassTheme:on},true);
    App.applyAppPrefs();
  });
  function paintGlassIntensity(){
    U.$$('#ap-glass-intensity [data-gi]',el).forEach(b=>{
      b.classList.toggle('active',(app.glassIntensity||'mid')===b.dataset.gi);
    });
  }
  U.$$('#ap-glass-intensity [data-gi]',el).forEach(b=>{
    b.onclick=()=>{
      app.glassIntensity=b.dataset.gi;
      Store.setApp({glassIntensity:app.glassIntensity},true);
      App.applyAppPrefs(); paintGlassIntensity();
    };
  });
  paintGlassIntensity();

  /* 主题 */
  U.$$('[data-theme-opt]',el).forEach(b=>{
    b.onclick=()=>{
      app.theme=b.dataset.themeOpt;
      Store.setApp({theme:app.theme},true);
      App.applyAppPrefs();
      paintTheme(); paintSwatches(); paintOtherSwatches();
    };
  });

  /* 气泡形状 */
  U.$$('[data-shape]',el).forEach(b=>{
    b.onclick=()=>{
      app.bubbleShape=b.dataset.shape;
      Store.setApp({bubbleShape:app.bubbleShape},true);
      App.applyAppPrefs();
      paintShapes();
    };
  });

  /* 气泡颜色 */
  U.$$('[data-color]',el).forEach(b=>{
    b.onclick=()=>{
      app.bubbleColor=b.dataset.color;
      Store.setApp({bubbleColor:app.bubbleColor},true);
      App.applyAppPrefs();
      paintSwatches();
    };
  });

  /* 对方气泡颜色 */
  U.$$('[data-other-color]',el).forEach(b=>{
    b.onclick=()=>{
      app.otherBubbleColor=b.dataset.otherColor;
      Store.setApp({otherBubbleColor:app.otherBubbleColor},true);
      App.applyAppPrefs();
      paintOtherSwatches();
    };
  });

  /* 气泡自定义 CSS */
  const cssInput=U.$('#ap-bubble-css',el);
  function applyCss(){
    app.bubbleCss=cssInput?cssInput.value:'';
    Store.setApp({bubbleCss:app.bubbleCss},true);
    App.applyAppPrefs();
    UI.toast(app.bubbleCss.trim()?'已应用气泡 CSS':'已清除气泡 CSS');
  }
  const cssApply=U.$('#ap-bubble-css-apply',el);
  if(cssApply) cssApply.onclick=applyCss;
  const cssReset=U.$('#ap-bubble-css-reset',el);
  if(cssReset) cssReset.onclick=()=>{ if(cssInput) cssInput.value=''; applyCss(); };
  U.$$('#ap-font [data-font]',el).forEach(b=>{
    b.onclick=()=>{
      app.fontScale=b.dataset.font;
      Store.setApp({fontScale:app.fontScale},true);
      App.applyAppPrefs();
      U.$$('#ap-font [data-font]',el).forEach(x=>x.classList.toggle('on',x===b));
    };
  });

  /* 气泡尺寸 */
  function bindRange(id,key){
    const inp=U.$('#'+id,el), out=U.$('#'+id+'-val',el);
    if(!inp) return;
    inp.oninput=()=>{
      app[key]=+inp.value;
      if(out) out.textContent=inp.value;
      const patch={}; patch[key]=app[key];
      Store.setApp(patch,true);
      App.applyAppPrefs();
    };
  }
  bindRange('ap-padx','bubblePadX');
  bindRange('ap-pady','bubblePadY');
  bindRange('ap-gap','bubbleGap');

  /* 时间戳间隔 */
  function paintTsGap(){
    U.$$('#ap-tsgap [data-tsgap]',el).forEach(b=>{
      b.classList.toggle('active', +b.dataset.tsgap===(app.tsGap||30));
    });
  }
  U.$$('#ap-tsgap [data-tsgap]',el).forEach(b=>{
    b.onclick=()=>{
      app.tsGap=+b.dataset.tsgap;
      Store.setApp({tsGap:app.tsGap},true);
      paintTsGap();
    };
  });

  /* 减少动画 / 触感 */
  UI.bindSwitch(el,'#ap-motion',on=>{
    app.reduceMotion=on;
    Store.setApp({reduceMotion:on},true);
    App.applyAppPrefs();
  });
  UI.bindSwitch(el,'#ap-haptic',on=>{
    app.haptics=on;
    Store.setApp({haptics:on},true);
    if(on) U.vibrate(8);
  });

  /* 初始化选中态 */
  paintTheme(); paintShapes(); paintSwatches(); paintOtherSwatches(); paintTsGap();
  U.$$('#ap-font [data-font]',el).forEach(b=>b.classList.toggle('on', (app.fontScale||'md')===b.dataset.font));
};
