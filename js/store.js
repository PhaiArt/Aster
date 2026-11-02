/* ===== 统一数据层：状态 + 持久化 + 动作 ===== */
window.Store = (()=>{
  const KEY='sq_state_v1';
  const DAY=86400000;

  const DEF_CS=()=>({
    bg:'stars', bgImg:null, roleBg:null, voiceBgImg:null,
    showAvatars:true, avatarWho:'both', avatarSize:34, bubbleRadius:16,
    showTs:true, showRead:true,
    poke:true, pokeMode:'both', autoScroll:true, haptics:true
  });

  /* 预置角色的旧名称 → 统一命名（仅当用户未自定义时迁移） */
  const PRESET_ROLES={
    c_test :{old:'测试**°',   neu:'默认角色1号'},
    c_plush:{old:'ⁿ>ᴗ<ⁿ',     neu:'默认角色2号'},
    c_yiiu :{old:'Yiiu7i',    neu:'默认角色3号'},
    c_star :{old:'一颗星島。', neu:'默认角色4号'}
  };
  const DEFAULT_POKE='拍了拍';

  function seed(){
    const now=Date.now();
    const t=(h,m)=>{ const d=new Date(now-DAY); d.setHours(h,m,0,0); return d.getTime(); };
    const S={
      v:2,
      user:{
        id:'me', name:'user', badge:'つ♡c', handle:'@user_5201314',
        sig:'两颗星需要多久才能靠近、🖤🤍',
        avatar:{}, avatarId:null,
        coverId:null, followed:false,
        stats:{followers:456, following:789}
      },
      contacts:[
        {id:'c_test', name:'默认角色1号', sig:'HELLO~', group:'pin',  avatar:{}, avatarId:null, remark:'', privateNote:'', pokeText:'', exclusiveCards:[]},
        {id:'c_plush',name:'默认角色2号', sig:'或许爱需要止渴贴', group:'star', avatar:{}, avatarId:null, remark:'', privateNote:'', pokeText:'', exclusiveCards:[]},
        {id:'c_yiiu', name:'默认角色3号', sig:'—— ぢ⌒く おやすみ ——', group:'star', avatar:{}, avatarId:null, remark:'', privateNote:'', pokeText:'', exclusiveCards:[]},
        {id:'c_star', name:'默认角色4号', sig:'：直到幸福触手可及', group:'four', avatar:{}, avatarId:null, remark:'', privateNote:'', pokeText:'', exclusiveCards:[]}
      ],
      convs:[
        {id:'cv_c_test', contactId:'c_test', isGroup:false, groupKey:'pin',  prevGroup:null, lastAt:t(14,0),  lastPreview:'', unread:0},
        {id:'cv_c_plush',contactId:'c_plush',isGroup:false, groupKey:'star', prevGroup:null, lastAt:now-2*DAY, lastPreview:'', unread:0},
        {id:'cv_c_yiiu', contactId:'c_yiiu', isGroup:false, groupKey:'star', prevGroup:null, lastAt:now-2*DAY+3600e3, lastPreview:'', unread:0},
        {id:'cv_c_star', contactId:'c_star', isGroup:false, groupKey:'four', prevGroup:null, lastAt:t(14,22), lastPreview:'给你给你', unread:0},
        {id:'cv_g1', contactId:null, isGroup:true, name:'⭐ 观星小分队', members:['c_plush','c_yiiu','c_test'], groupKey:'star', prevGroup:null, lastAt:now-3*3600e3, lastPreview:'今晚一起看星星吗', unread:0, avatar:{}, avatarId:null}
      ],
      msgs:[
        {id:'sm2', conv:'cv_g1', from:'c_yiiu', type:'text', text:'今晚一起看星星吗 ✦', at:now-3*3600e3, read:false},

        {id:'m1',  conv:'cv_c_star', from:'me', type:'text', text:'hi', at:t(14,13), read:true},
        {id:'m2',  conv:'cv_c_star', from:'me', type:'text', text:'测试一下功能和回复', at:t(14,13)+30e3, read:true},
        {id:'m3',  conv:'cv_c_star', from:'c_star', type:'text', text:'收到~', at:t(14,20), read:true},
        {id:'m4',  conv:'cv_c_star', from:'c_star', type:'text', text:'所以测试结果怎么样', at:t(14,20)+20e3, read:true},
        {id:'m5',  conv:'cv_c_star', from:'c_star', type:'text', text:'我过关了没！', at:t(14,20)+40e3, read:true},
        {id:'m6',  conv:'cv_c_star', from:'me', type:'text', text:'回复一下我这条消息', at:t(14,21), read:true},
        {id:'m7',  conv:'cv_c_star', from:'me', type:'text', text:'然后发送图片和语音给我', at:t(14,21)+20e3, read:true},
        {id:'m8',  conv:'cv_c_star', from:'c_star', type:'text', text:'来啦来啦', at:t(14,22), read:true, replyTo:{name:'user', text:'回复一下我这条消息然后发送图片和语音给我'}},
        {id:'m9',  conv:'cv_c_star', from:'c_star', type:'text', text:'给你给你', at:t(14,22)+15e3, read:true},
        {id:'m10', conv:'cv_c_star', from:'c_star', type:'image', imgKey:U.svgPhoto('stars'), at:t(14,22)+30e3, read:true},
        {id:'m11', conv:'cv_c_star', from:'c_star', type:'voice', dur:7, at:t(14,22)+45e3, read:true},
        {id:'m12', conv:'cv_c_star', from:'c_star', type:'checkin', ckId:'ck1', at:t(15,2), read:true}
      ],
      posts:[
        {id:'po1', cat:'life', author:'me', text:'許願一個沒有愚傷的明天', imgs:[], at:now-3*DAY-13*3600e3, likes:['me'], collected:false,
         comments:[{id:'cm1', author:'me', text:'评论测试', at:now-26*60e3}]},
        {id:'po2', cat:'life', author:'me', text:'今天的甜品时间 ⊹°', imgs:[U.svgPhoto('apples')], at:now-2*DAY-4*3600e3, likes:['c_yiiu'], collected:false, comments:[]},
        {id:'po3', cat:'weather', author:'me', text:'下大暴雨了，记得带伞', imgs:[U.svgPhoto('rain')], at:now-DAY-2*3600e3, likes:[], collected:false, comments:[]},
        {id:'po4', cat:'mood', author:'me', text:'心情是云朵做的、软软的 ☁️', imgs:[], at:now-5*3600e3, likes:[], collected:false, comments:[]}
      ],
      checkins:[
        {id:'ck1', conv:'cv_c_star', by:'c_star', text:'下大暴雨了', imgKey:U.svgPhoto('rain'), at:t(15,2)}
      ],
      cs:{},   // convId -> 设置（getCS 时合并默认值）
      mems:{
        c_star:[{id:'mem1', text:'喜欢雨天和热牛奶，说过想一起去看一次海。', at:now-2*DAY}]
      },
      ui:{chatsTab:'chats', chatsSearch:'', searchOpen:false, groupFilter:'all', folded:{pin:false,star:false,four:false}, memSearch:''},
      app:{
        fontScale:'md', reduceMotion:false, haptics:true,
        theme:'light', bubbleShape:'classic', bubbleColor:'mist', otherBubbleColor:'theme', bubbleCss:'',
        bubblePadX:17, bubblePadY:13, bubbleGap:18, tsGap:30,
        wallpaper:{mode:'unified',type:'none',img:null,pages:{
          chats:{type:'none',img:null},discover:{type:'none',img:null},
          life:{type:'none',img:null},me:{type:'none',img:null}
        }},
        glassTheme:false, glassIntensity:'mid', wallOpacity:1, wallX:0, wallY:0, wallZoom:1,
        reminderSettings:{
          thresholds:[48,36,24,8],
          todoEnabled:true, periodEnabled:true,
          todoRoles:[], periodRoles:[],
          todoPrompts:{}, periodPrompts:{}
        },
        remindersSent:{},
        stickerImgs:[],  // 图片表情包（IndexedDB blob id），与聊天面板共享
        stickerEmojis:[],// Emoji（字符），加入角色回复池
        lifePhoto:null,  // Life 页照片小组件（IndexedDB blob id）
        lifePeriod:null, // Life 页经期设置 {lastStart,cycle,duration}
      lifePeriodActual:[], // 手动点日历记录的实际经期日期（ISO）
        lifeTodos:[],    // 待办 [{id,text,due,done}]
        lifeCountdowns:[],// 倒数日 [{id,title,date}]
        lifeMoney:[],    // 记账 [{id,type,amount,note,date}]
        lifeMusic:[],    // 音乐 [{id,title,artist,kind,blobId,url}]
        lifePomoHistory:[], // 番茄钟陪伴消息 [{roleId,text,at}]
        lifePeriodLogs:[], // 经期轻记录 [{date,flow,pain,symptoms[]}]
        lifeTogetherHistory:[] // 一起听记录 [{roleId,seconds,trackTitle,endedAt}]
      },
      universalCards: [],   // 通用字卡
      reportCards: [],      // 报备字卡
      dynamicCards: [],     // 动态字卡（角色每天发动态时抽取）
      dynamicDay: '',       // 最近生成动态的日期
      dynamicCounts: {},    // 当天各角色已生成条数
      chatGroups: [         // 聊天列表分组（可改名/删除，至少保留一个）
        {id:'pin', name:'置顶', icon:'📌'},
        {id:'star',name:'☆→⟩ × <₊、⁺', icon:'⭐'},
        {id:'four',name:'4ever🤍', icon:'🤍'}
      ],
      cardGroups: [],       // 通用字卡分组
      replySettings: {      // 回复引擎设置
        delayMin: 4, delayMax: 15,
        countMin: 1, countMax: 4,
        noReplyChance: 50,
        reportChance: 0,
        stickerChance: 12,
        emojiChance: 18,
        quoteChance: 20,
        dynamicChance: 30,
        dynamicMin: 1,
        dynamicMax: 3,
        proactiveEnabled: true,
        proactiveMsg: 60,
        proactivePoke: 20,
        proactiveRedPacket: 12,
        proactiveVideo: 8,
        surveyDelayMin: 3, surveyDelayMax: 8
      },
      lastProactiveAt: 0    // 上次主动消息时间戳
    };
    return S;
  }

  /* v1 → v2 迁移：仅处理仍为默认值的数据，不覆盖用户自定义，保留未知字段 */
  function migrate(s){
    try{
      /* 1. 默认昵称 小祁 → user */
      if(s.user){
        if(s.user.name==='小祁') s.user.name='user';
        if(s.user.handle==='@xiaoqi_5201314') s.user.handle='@user_5201314';
        /* 默认 emoji 头像 → 统一默认头像（用户上传的 avatarId 不动） */
        if(!s.user.avatarId && s.user.avatar && s.user.avatar.emoji) s.user.avatar={};
      }
      /* 2. 预置角色统一命名（仅当名字仍是旧默认值；remark 优先级更高且不动） */
      (s.contacts||[]).forEach(c=>{
        const p=PRESET_ROLES[c.id];
        if(p && c.name===p.old) c.name=p.neu;
        if(!c.avatarId && c.avatar && c.avatar.emoji) c.avatar={};
        if(c.pokeText===undefined) c.pokeText='';
      });
      /* 3. 删除预置 HELLO~ 消息，并修复对应会话摘要 */
      if(Array.isArray(s.msgs)){
        s.msgs=s.msgs.filter(m=>!(m.id==='sm1'||(m.conv==='cv_c_test'&&m.from==='c_test'&&m.text==='HELLO~')));
        s.msgs.forEach(m=>{ if(m.replyTo&&m.replyTo.name==='小祁') m.replyTo.name='user'; });
      }
      const cvt=(s.convs||[]).find(v=>v.id==='cv_c_test');
      if(cvt&&cvt.lastPreview==='HELLO~'){
        const rest=(s.msgs||[]).filter(m=>m.conv==='cv_c_test').sort((a,b)=>a.at-b.at);
        const last=rest[rest.length-1];
        cvt.lastAt=last?last.at:0; cvt.lastPreview=last?previewOf(last):'';
      }
      /* 4. 颜文字表情包 → 图片表情包（清空旧占位，等待用户导入图片） */
      if(s.app){
        if(!Array.isArray(s.app.stickerImgs)) s.app.stickerImgs=[];
        if(!Array.isArray(s.app.stickerEmojis)) s.app.stickerEmojis=[];
        if(!('lifePhoto' in s.app)) s.app.lifePhoto=null;
        if(!('lifePeriod' in s.app)) s.app.lifePeriod=null;
        if(!Array.isArray(s.app.lifePeriodActual)) s.app.lifePeriodActual=[];
        ['lifeTodos','lifeCountdowns','lifeMoney','lifeMusic','lifePomoHistory','lifePeriodLogs','lifeTogetherHistory'].forEach(k=>{ if(!Array.isArray(s.app[k])) s.app[k]=[]; });
        delete s.app.stickers;
      }else{
        s.app={};
      }
      /* 4b. 主题 / 气泡（旧存档补默认值） */
      if(s.app.theme!=='light'&&s.app.theme!=='dark'&&s.app.theme!=='system') s.app.theme='light';
      if(!s.app.bubbleShape) s.app.bubbleShape='classic';
      if(!s.app.bubbleColor) s.app.bubbleColor='mist';
      if(!s.app.otherBubbleColor) s.app.otherBubbleColor='theme';
      if(typeof s.app.bubbleCss!=='string') s.app.bubbleCss='';
      if(s.app.bubblePadX==null) s.app.bubblePadX=17;
      if(s.app.bubblePadY==null) s.app.bubblePadY=13;
      if(s.app.bubbleGap==null) s.app.bubbleGap=18;
      if(s.app.tsGap==null) s.app.tsGap=30;
      if(!s.app.wallpaper||typeof s.app.wallpaper!=='object') s.app.wallpaper={mode:'unified',type:'none',img:null,pages:{}};
      const wp=s.app.wallpaper;
      if(wp.mode!=='per'&&wp.mode!=='unified') wp.mode='unified';
      if(!wp.pages||typeof wp.pages!=='object') wp.pages={};
      ['chats','discover','life','me'].forEach(k=>{ if(!wp.pages[k]) wp.pages[k]={type:'none',img:null}; });
      if(wp.type==null) wp.type='none';
      if(s.app.glassTheme==null) s.app.glassTheme=false;
      if(!s.app.glassIntensity) s.app.glassIntensity='mid';
      if(s.app.wallOpacity==null) s.app.wallOpacity=1;
      if(typeof s.app.wallX!=='number') s.app.wallX=0;
      if(typeof s.app.wallY!=='number') s.app.wallY=0;
      if(typeof s.app.wallZoom!=='number') s.app.wallZoom=1;
      if(!s.app.reminderSettings||typeof s.app.reminderSettings!=='object'){
        s.app.reminderSettings={thresholds:[48,36,24,8],todoEnabled:true,periodEnabled:true,todoRoles:[],periodRoles:[],todoPrompts:{},periodPrompts:{}};
      }else{
        const rs=s.app.reminderSettings;
        if(!Array.isArray(rs.thresholds)||rs.thresholds.length!==4) rs.thresholds=[48,36,24,8];
        if(!Array.isArray(rs.todoRoles)) rs.todoRoles=[];
        if(!Array.isArray(rs.periodRoles)) rs.periodRoles=[];
        if(!rs.todoPrompts||typeof rs.todoPrompts!=='object') rs.todoPrompts={};
        if(!rs.periodPrompts||typeof rs.periodPrompts!=='object') rs.periodPrompts={};
        if(typeof rs.todoEnabled!=='boolean') rs.todoEnabled=true;
        if(typeof rs.periodEnabled!=='boolean') rs.periodEnabled=true;
      }
      if(!s.app.remindersSent||typeof s.app.remindersSent!=='object') s.app.remindersSent={};
      /* 5. 字卡 / 回复设置 / 主动消息状态（旧版本数据补默认值） */
      if(!Array.isArray(s.universalCards)) s.universalCards=[];
      if(!Array.isArray(s.reportCards)) s.reportCards=[];
      if(!Array.isArray(s.dynamicCards)) s.dynamicCards=[];
      if(typeof s.dynamicDay!=='string') s.dynamicDay='';
      if(!s.dynamicCounts||typeof s.dynamicCounts!=='object') s.dynamicCounts={};
      /* 旧版报备字卡是单条 content，迁移成「句子 + 图片」的组 */
      s.reportCards=s.reportCards.map(rc=>{
        if(rc&&Array.isArray(rc.texts)) return rc;
        return {id:(rc&&rc.id)||U.uid('rc'), texts:(rc&&rc.content)?[rc.content]:[], imgs:[], usage:(rc&&rc.usage)||0, createdAt:(rc&&rc.createdAt)||Date.now()};
      });
      if(!s.replySettings) s.replySettings={
        delayMin: 4, delayMax: 15,
        countMin: 1, countMax: 4,
        noReplyChance: 50,
        reportChance: 0,
        stickerChance: 12,
        emojiChance: 18,
        quoteChance: 20,
        dynamicChance: 30,
        dynamicMin: 1,
        dynamicMax: 3,
        proactiveEnabled: true,
        proactiveMsg: 60,
        proactivePoke: 20,
        proactiveRedPacket: 12,
        proactiveVideo: 8,
        surveyDelayMin: 3, surveyDelayMax: 8
      };
      else{
        if(typeof s.replySettings.surveyDelayMin!=='number') s.replySettings.surveyDelayMin=3;
        if(typeof s.replySettings.surveyDelayMax!=='number') s.replySettings.surveyDelayMax=8;
      }
      if(typeof s.replySettings.reportChance!=='number') s.replySettings.reportChance=0;
      if(typeof s.replySettings.stickerChance!=='number') s.replySettings.stickerChance=12;
      if(typeof s.replySettings.emojiChance!=='number') s.replySettings.emojiChance=18;
      if(typeof s.replySettings.quoteChance!=='number') s.replySettings.quoteChance=20;
      if(typeof s.replySettings.dynamicChance!=='number') s.replySettings.dynamicChance=30;
      if(typeof s.replySettings.dynamicMin!=='number') s.replySettings.dynamicMin=1;
      if(typeof s.replySettings.dynamicMax!=='number') s.replySettings.dynamicMax=3;
      const pdef={proactiveMsg:60,proactivePoke:20,proactiveRedPacket:12,proactiveVideo:8};
      Object.keys(pdef).forEach(k=>{ if(typeof s.replySettings[k]!=='number') s.replySettings[k]=pdef[k]; });
      if(typeof s.lastProactiveAt!=='number') s.lastProactiveAt=0;
      /* 6. 聊天分组 / 通用字卡分组（旧数据补默认值，并修正失效引用） */
      if(!Array.isArray(s.chatGroups)||!s.chatGroups.length) s.chatGroups=[
        {id:'pin', name:'置顶', icon:'📌'},
        {id:'star',name:'☆→⟩ × <₊、⁺', icon:'⭐'},
        {id:'four',name:'4ever🤍', icon:'🤍'}
      ];
      if(!Array.isArray(s.cardGroups)) s.cardGroups=[];
      const gids=s.chatGroups.map(g=>g.id);
      (s.convs||[]).forEach(v=>{
        if(v.isGroup) return;
        if(!gids.includes(v.groupKey)){ v.groupKey=gids.includes('star')?'star':gids[0]; v.prevGroup=null; }
        else if(v.prevGroup&&!gids.includes(v.prevGroup)) v.prevGroup=null;
      });
      (s.universalCards||[]).forEach(c=>{
        if(c.groupId&&!s.cardGroups.some(g=>g.id===c.groupId)) c.groupId=null;
      });
      (s.contacts||[]).forEach(c=>{
        if(!Array.isArray(c.exclusiveCards)) c.exclusiveCards=[];
      });
      s.v=2;
    }catch(e){ console.error('迁移失败',e); }
  }

  let state=null;
  const subs=new Set();
  let saveTimer=null;

  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw){
        const s=JSON.parse(raw);
        if(s&&(s.v===1||s.v===2)){
          migrate(s);   /* 幂等：每次载入都跑，补齐旧存档缺失字段（如聊天/字卡分组） */
          return s;
        }
      }
    }catch(e){}
    return null;
  }
  function save(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{
      try{ localStorage.setItem(KEY,JSON.stringify(state)); }
      catch(e){ if(window.UI) UI.toast('本地存储空间不足，部分数据可能未保存'); }
    },160);
  }
  function emit(){ subs.forEach(f=>{ try{f();}catch(e){console.error(e);} }); }
  function sub(f){ subs.add(f); return ()=>subs.delete(f); }

  /* ---------- 初始化 ---------- */
  function init(){
    const loaded=load();
    state=loaded||seed();
    if(!loaded) save();
  }

  /* ---------- 通用 ---------- */
  function contact(id){ return state.contacts.find(c=>c.id===id)||null; }
  function conv(id){ return state.convs.find(c=>c.id===id)||null; }
  function convOfContact(cid){ return state.convs.find(c=>c.contactId===cid)||null; }
  function msgsOf(convId){ return state.msgs.filter(m=>m.conv===convId).sort((a,b)=>a.at-b.at); }
  function displayName(uid){
    if(uid==='me') return state.user.name;
    const c=contact(uid); return c?(c.remark||c.name):'???';
  }
  function handleOf(uid){
    if(uid==='me') return state.user.handle||'@user';
    const c=contact(uid);
    if(c&&c.handle){
      const h=String(c.handle).trim();
      return h.charAt(0)==='@'?h:'@'+h;
    }
    const raw=String(uid||'').replace(/^c_/,'');
    return raw?'@'+raw:'@unknown';
  }
  function avatarOf(uid){
    if(uid==='me') return {avatar:state.user.avatar, avatarId:state.user.avatarId};
    const c=contact(uid)||{}; return {avatar:c.avatar, avatarId:c.avatarId};
  }
  function ensureConv(contactId){
    let cv=convOfContact(contactId);
    if(cv) return cv;
    const c=contact(contactId);
    cv={id:'cv_'+contactId, contactId, isGroup:false, groupKey:(c&&c.group==='pin'?'star':(c&&c.group||'star')), prevGroup:null, lastAt:0, lastPreview:'', unread:0};
    state.convs.push(cv); save();
    return cv;
  }
  function previewOf(m){
    if(!m) return '';
    switch(m.type){
      case 'image': return m.stk?'[表情]':'[图片]';
      case 'voice': return '[语音]';
      case 'checkin': return '[报备]';
      case 'transfer': return '['+(m.kind||'转账')+']';
      case 'redpacket': return '[红包]';
      case 'survey': return '[问卷]';
      case 'share': return '[动态]';
      case 'call': return '[视频通话]';
      case 'no-reply': return '已读不回';
      default: return m.text||'';
    }
  }
  function touchConv(convId,msg){
    const cv=conv(convId); if(!cv) return;
    cv.lastAt=msg.at;
    cv.lastPreview=previewOf(msg);
    if(msg.from!=='me' && msg.type!=='system') cv.unread=(cv.unread||0)+1;
  }

  /* ---------- 用户 ---------- */
  function updateUser(patch){ Object.assign(state.user,patch); save(); emit(); }

  /* ---------- 联系人 ---------- */
  function addContact(o){
    const c={id:U.uid('c'), name:o.name||'新朋友', sig:o.sig||'暂无个性签名', group:o.group||'star',
      avatar:o.avatar||{}, avatarId:o.avatarId||null,
      remark:'', privateNote:'', pokeText:''};
    state.contacts.push(c);
    ensureConv(c.id);
    save(); emit();
    return c;
  }
  function updateContact(id,patch){ const c=contact(id); if(c){ Object.assign(c,patch); save(); emit(); } }
  function deleteContact(id){
    state.contacts=state.contacts.filter(c=>c.id!==id);
    const cvId='cv_'+id;
    state.convs=state.convs.filter(v=>v.contactId!==id);
    state.msgs=state.msgs.filter(m=>m.conv!==cvId);
    state.checkins=state.checkins.filter(k=>k.by!==id);
    state.convs.forEach(v=>{ if(v.members) v.members=v.members.filter(m=>m!==id); });
    delete state.mems[id];
    save(); emit();
  }
  function createGroup(name,memberIds,av){
    const g={id:U.uid('cv'), contactId:null, isGroup:true, name:name||'新的群聊', members:memberIds||[],
      ownerId:'me',   /* 创建者即群主；旧数据无 ownerId 时按群主=me 处理 */
      avatar:(av&&av.avatar)||{}, avatarId:(av&&av.avatarId)||null,
      groupKey:'star', prevGroup:null, lastAt:Date.now(), lastPreview:'群聊已创建', unread:0};
    state.convs.push(g);
    state.msgs.push({id:U.uid('m'), conv:g.id, from:'system', type:'system', text:'群聊「'+g.name+'」已创建', at:g.lastAt});
    save(); emit();
    return g;
  }

  /* ---------- 消息 ---------- */
  function send(convId,payload){
    const m=Object.assign({id:U.uid('m'), conv:convId, from:'me', type:'text', at:Date.now(), read:true},payload);
    state.msgs.push(m);
    touchConv(convId,m);
    save(); emit();
    return m;
  }
  function incoming(convId,payload){ /* 模拟对方消息（本地演示用） */
    const m=Object.assign({id:U.uid('m'), conv:convId, from:(conv(convId)||{}).contactId||'system', type:'text', at:Date.now(), read:false},payload);
    state.msgs.push(m); touchConv(convId,m); save(); emit();
    try{ window.dispatchEvent(new CustomEvent('aster:incoming',{detail:{convId:convId,msg:m}})); }catch(e){}
    return m;
  }
  function sysMsg(convId,text){
    const m={id:U.uid('m'), conv:convId, from:'system', type:'system', text, at:Date.now()};
    state.msgs.push(m); save(); emit();
    return m;
  }
  function deleteMsg(convId,msgId){
    state.msgs=state.msgs.filter(m=>m.id!==msgId);
    const list=msgsOf(convId);
    const cv=conv(convId);
    if(cv){ const last=list[list.length-1]; cv.lastAt=last?last.at:0; cv.lastPreview=last?previewOf(last):''; }
    save(); emit();
  }
  function updateMessage(msgId, patch){
    const m = state.msgs.find(x=>x.id===msgId);
    if(!m) return null;
    Object.assign(m, patch);
    save(); emit();
    return m;
  }
  function clearMsgs(convId){
    state.msgs=state.msgs.filter(m=>m.conv!==convId);
    const cv=conv(convId);
    if(cv){ cv.lastAt=0; cv.lastPreview=''; cv.unread=0; }
    save(); emit();
  }
  function markReadSilent(msgId){
    const m=state.msgs.find(x=>x.id===msgId);
    if(m&&!m.read){ m.read=true; save(); }
  }
  function readConv(convId){ const cv=conv(convId); if(cv&&cv.unread){ cv.unread=0; save(); } }
  function setPinned(convId,val){
    const cv=conv(convId); if(!cv) return;
    const ids=getChatGroups().map(g=>g.id);
    if(val&&ids.includes('pin')){
      cv.prevGroup=cv.groupKey!=='pin'?cv.groupKey:null; cv.groupKey='pin';
    }
    else if(val){ cv.groupKey=ids[0]||'star'; cv.prevGroup=null; }
    else {
      cv.groupKey=(cv.prevGroup&&ids.includes(cv.prevGroup))?cv.prevGroup:(ids.includes('star')?'star':(ids[0]||'star'));
      cv.prevGroup=null;
    }
    save(); emit();
  }

  /* 移动会话到指定聊天分组（'pin' 视为置顶） */
  function moveConvToGroup(convId,groupId){
    const cv=conv(convId); if(!cv) return false;
    const ids=getChatGroups().map(g=>g.id);
    if(!ids.includes(groupId)) return false;
    if(groupId==='pin'){
      cv.prevGroup=cv.groupKey!=='pin'?cv.groupKey:null;
      cv.groupKey='pin';
    }else{
      cv.groupKey=groupId;
      cv.prevGroup=null;
    }
    save(); emit();
    return true;
  }

  /* ---------- 群聊解散（软标记，不清空历史） ---------- */
  function dissolveGroup(convId){
    const cv=conv(convId);
    if(!cv||!cv.isGroup||cv.dissolved) return false;
    /* 权限：创建者即群主；旧数据无 ownerId 视为当前用户创建 */
    if((cv.ownerId||'me')!=='me') return false;
    cv.dissolved=true;
    cv.lastPreview='群聊已解散';
    state.msgs.push({id:U.uid('m'), conv:convId, from:'system', type:'system', text:'群聊已解散', at:Date.now()});
    save(); emit();
    return true;
  }

  /* ---------- 群成员管理（添加 / 移除，已解散群禁止操作） ---------- */
  function addGroupMembers(convId,ids){
    const cv=conv(convId);
    if(!cv||!cv.isGroup||cv.dissolved||!(ids||[]).length) return false;
    const added=[];
    (ids||[]).forEach(id=>{
      if(contact(id)&&!cv.members.includes(id)){ cv.members.push(id); added.push(id); }
    });
    if(!added.length) return false;
    const now=Date.now();
    added.forEach((id,i)=>state.msgs.push({id:U.uid('m'),conv:convId,from:'system',type:'system',text:displayName(id)+' 加入了群聊',at:now+i}));
    const last=state.msgs[state.msgs.length-1];
    touchConv(convId,last);
    save(); emit();
    return true;
  }
  function removeGroupMember(convId,id){
    const cv=conv(convId);
    if(!cv||!cv.isGroup||cv.dissolved||!id) return false;
    if(!cv.members.includes(id)) return false;
    cv.members=cv.members.filter(x=>x!==id);
    const m={id:U.uid('m'),conv:convId,from:'system',type:'system',text:displayName(id)+' 被移出了群聊',at:Date.now()};
    state.msgs.push(m); touchConv(convId,m);
    save(); emit();
    return true;
  }

  /* ---------- 打卡 ---------- */
  function addCheckin(o){
    const k={id:U.uid('ck'), conv:o.conv, by:o.by||'me', text:o.text||'', imgKey:o.imgKey||null, at:o.at||Date.now()};
    state.checkins.push(k);
    const m={id:U.uid('m'), conv:o.conv, from:k.by, type:'checkin', ckId:k.id, text:k.text, imgKey:k.imgKey, at:k.at, read:k.by==='me'};
    state.msgs.push(m); touchConv(o.conv,m);
    save(); emit();
    return k;
  }
  function checkinsOfContact(cid){ return state.checkins.filter(k=>k.by===cid); }
  function myCheckins(){ return state.checkins.filter(k=>k.by==='me'); }

  /* ---------- 动态 ---------- */
  function addPost(o){
    const p={id:U.uid('po'), cat:o.cat||'life', author:o.author||'me', text:o.text||'', imgs:o.imgs||[],
      at:o.at||Date.now(), likes:[], collected:false, comments:[]};
    state.posts.push(p); save(); emit();
    return p;
  }
  function updatePost(id,patch){ const p=state.posts.find(x=>x.id===id); if(p){ Object.assign(p,patch); save(); emit(); } }
  function deletePost(id){ state.posts=state.posts.filter(p=>p.id!==id); save(); emit(); }
  function toggleLike(id){
    const p=state.posts.find(x=>x.id===id); if(!p) return;
    const i=p.likes.indexOf('me');
    if(i>=0) p.likes.splice(i,1); else p.likes.push('me');
    save(); emit();
  }
  function addComment(id,text){
    const p=state.posts.find(x=>x.id===id); if(!p) return;
    p.comments.push({id:U.uid('cm'), author:'me', text, at:Date.now()});
    save(); emit();
  }
  function delComment(pid,cid){
    const p=state.posts.find(x=>x.id===pid); if(!p) return;
    p.comments=p.comments.filter(c=>c.id!==cid); save(); emit();
  }
  function toggleCollect(id){
    const p=state.posts.find(x=>x.id===id); if(!p) return;
    p.collected=!p.collected; save(); emit();
  }
  function collectedPosts(){ return state.posts.filter(p=>p.collected).sort((a,b)=>b.at-a.at); }

  /* ---------- 聊天设置 ---------- */
  function getCS(convId){
    if(!state.cs[convId]) state.cs[convId]={};
    return Object.assign({},DEF_CS(),state.cs[convId]);
  }
  /* silent=true 时仅保存不广播（设置页内部局部刷新用，避免整页重渲染丢状态） */
  function setCS(convId,patch,silent){
    if(!state.cs[convId]) state.cs[convId]={};
    Object.assign(state.cs[convId],patch);
    save(); if(!silent) emit();
  }
  function resetCSAppearance(convId){
    const cur=state.cs[convId]||{};
    ['bg','bgImg','roleBg','voiceBgImg','showAvatars','avatarWho','avatarSize','bubbleRadius'].forEach(k=>delete cur[k]);
    save(); emit();
  }

  /* ---------- 记忆 ---------- */
  function memsOf(cid){ return state.mems[cid]||[]; }
  function addMem(cid,text){
    if(!state.mems[cid]) state.mems[cid]=[];
    state.mems[cid].push({id:U.uid('mem'), text, at:Date.now()});
    save(); emit();
  }
  function updateMem(cid,id,text){
    const l=state.mems[cid]; if(!l) return;
    const m=l.find(x=>x.id===id); if(m){ m.text=text; save(); emit(); }
  }
  function delMem(cid,id){
    if(state.mems[cid]) state.mems[cid]=state.mems[cid].filter(x=>x.id!==id);
    save(); emit();
  }

  /* ---------- 应用 / UI ---------- */
  function setApp(patch,silent){ Object.assign(state.app,patch); save(); if(!silent) emit(); }
  function setUi(patch){ Object.assign(state.ui,patch); save(); }

  /* ---------- 表情包（图片，IndexedDB blob id） ---------- */
  function addSticker(id){
    if(!id) return;
    if(!Array.isArray(state.app.stickerImgs)) state.app.stickerImgs=[];
    if(!state.app.stickerImgs.includes(id)) state.app.stickerImgs.push(id);
    save(); emit();
  }
  function removeSticker(id){
    if(!Array.isArray(state.app.stickerImgs)) state.app.stickerImgs=[];
    state.app.stickerImgs=state.app.stickerImgs.filter(x=>x!==id);
    save(); emit();
  }
  function addStickerEmoji(emoji){
    const v=String(emoji||'').trim();
    if(!v) return;
    if(!Array.isArray(state.app.stickerEmojis)) state.app.stickerEmojis=[];
    if(state.app.stickerEmojis.includes(v)) return;
    state.app.stickerEmojis.push(v);
    save(); emit();
  }
  function removeStickerEmoji(emoji){
    if(!Array.isArray(state.app.stickerEmojis)) state.app.stickerEmojis=[];
    state.app.stickerEmojis=state.app.stickerEmojis.filter(x=>x!==emoji);
    save(); emit();
  }

  /* ---------- 拍一拍文案（每角色独立） ---------- */
  function pokeTextOf(cid){
    if(!cid) return DEFAULT_POKE;
    const c=contact(cid);
    return (c&&c.pokeText&&c.pokeText.trim())||DEFAULT_POKE;
  }

  /* ---------- 数据管理 ---------- */
  function exportAll(){
    return JSON.stringify({exportedAt:new Date().toISOString(), state},null,2);
  }
  /* 导入备份：接受 exportAll() 生成的 JSON（也兼容直接传状态对象），整体替换当前数据 */
  function importAll(raw){
    const data=typeof raw==='string'?JSON.parse(raw):raw;
    const s=data&&data.state?data.state:data;
    if(!s||typeof s!=='object'||!s.user||!Array.isArray(s.contacts)||!Array.isArray(s.convs)||!Array.isArray(s.msgs)){
      throw new Error('不是有效的备份文件');
    }
    /* 补齐缺失的顶层字段，避免旧备份把页面渲染搞崩 */
    const def=seed();
    Object.keys(def).forEach(k=>{ if(s[k]===undefined) s[k]=def[k]; });
    if(!s.mems||typeof s.mems!=='object') s.mems={};
    if(!s.cs||typeof s.cs!=='object') s.cs={};
    migrate(s);
    state=s;
    save(); emit();
    return true;
  }
  function wipe(){
    try{ localStorage.removeItem(KEY); }catch(e){}
  }
  function storageText(){
    let bytes=0;
    try{ bytes=(localStorage.getItem(KEY)||'').length; }catch(e){}
    return (bytes/1024).toFixed(1)+' KB（不含图片，图片存于 IndexedDB）';
  }

  /* ---------- 字卡（通用 / 专属 / 报备） ---------- */
  function getUniversalCards(){ return state.universalCards || []; }
  function addUniversalCard(content,groupId){
    if(!Array.isArray(state.universalCards)) state.universalCards=[];
    const gid=(groupId&&getCardGroups().some(g=>g.id===groupId))?groupId:null;
    state.universalCards.push({id:U.uid('uc'), content, usage:0, groupId:gid, createdAt:Date.now()});
    save();
  }
  function delUniversalCard(id){
    if(!Array.isArray(state.universalCards)) state.universalCards=[];
    state.universalCards=state.universalCards.filter(c=>c.id!==id);
    save();
  }
  function getDynamicCards(){ return state.dynamicCards || []; }
  function addDynamicCard(content,groupId){
    if(!Array.isArray(state.dynamicCards)) state.dynamicCards=[];
    const gid=(groupId&&getCardGroups().some(g=>g.id===groupId))?groupId:null;
    state.dynamicCards.push({id:U.uid('dc'),content,usage:0,groupId:gid,createdAt:Date.now()});
    save();
  }
  function delDynamicCard(id){
    if(!Array.isArray(state.dynamicCards)) state.dynamicCards=[];
    state.dynamicCards=state.dynamicCards.filter(c=>c.id!==id);
    save();
  }
  function getExclusiveCards(roleId){
    const c=contact(roleId);
    return c ? (c.exclusiveCards || []) : [];
  }
  function addExclusiveCard(roleId,content,groupId){
    const c=contact(roleId); if(!c) return;
    if(!Array.isArray(c.exclusiveCards)) c.exclusiveCards=[];
    const gid=(groupId&&getCardGroups().some(g=>g.id===groupId))?groupId:null;
    c.exclusiveCards.push({id:U.uid('ec'), content, usage:0, groupId:gid, createdAt:Date.now()});
    save();
  }
  function delExclusiveCard(roleId,id){
    const c=contact(roleId); if(!c || !c.exclusiveCards) return;
    c.exclusiveCards=c.exclusiveCards.filter(x=>x.id!==id);
    save();
  }
  function getReportCards(){ return state.reportCards || []; }
  /* 报备字卡组：{id, texts:[...], imgs:[blobId...]}，发送时一句 + 可选一张图 */
  function addReportGroup(texts,imgs){
    if(!Array.isArray(state.reportCards)) state.reportCards=[];
    const g={id:U.uid('rc'), texts:(texts||[]).filter(Boolean), imgs:(imgs||[]).slice(), usage:0, createdAt:Date.now()};
    state.reportCards.push(g); save();
    return g;
  }
  function addReportCard(content){ return addReportGroup(content?[content]:[],[]); }
  function updateReportGroup(id,patch){
    const g=(state.reportCards||[]).find(x=>x.id===id);
    if(!g) return null;
    Object.assign(g,patch); save();
    return g;
  }
  function delReportCard(id){
    if(!Array.isArray(state.reportCards)) state.reportCards=[];
    state.reportCards=state.reportCards.filter(c=>c.id!==id);
    save();
  }
  /* 随机抽一条报备：组、句子、图片都等概率；图片有 50% 概率带上 */
  function pickReport(){
    const groups=(state.reportCards||[]).filter(g=>Array.isArray(g.texts)&&g.texts.length);
    if(!groups.length) return null;
    const g=groups[Math.floor(Math.random()*groups.length)];
    const text=g.texts[Math.floor(Math.random()*g.texts.length)];
    let imgKey=null;
    if(Array.isArray(g.imgs)&&g.imgs.length&&Math.random()<0.5){
      imgKey=g.imgs[Math.floor(Math.random()*g.imgs.length)];
    }
    g.usage=(g.usage||0)+1;
    save();
    return {text, imgKey, groupId:g.id};
  }
  function bumpCardUsage(card){
    if(!card) return;
    card.usage=(card.usage||0)+1;
    save();
  }

  /* ---------- 聊天分组（可改名 / 删除，至少保留一个） ---------- */
  function chatGroupDef(){ return [
    {id:'pin', name:'置顶', icon:'📌'},
    {id:'star',name:'☆→⟩ × <₊、⁺', icon:'⭐'},
    {id:'four',name:'4ever🤍', icon:'🤍'}
  ];}
  function getChatGroups(){
    if(!Array.isArray(state.chatGroups)||!state.chatGroups.length) state.chatGroups=chatGroupDef();
    return state.chatGroups;
  }
  function renameChatGroup(id,name){
    const g=getChatGroups().find(x=>x.id===id);
    name=(name||'').trim();
    if(!g||!name) return false;
    g.name=name; save(); emit();
    return true;
  }
  function updateChatGroup(id,patch){
    const g=getChatGroups().find(x=>x.id===id);
    if(!g) return false;
    if(patch.name!==undefined){
      const name=String(patch.name||'').trim();
      if(!name) return false;
      g.name=name;
    }
    if(patch.icon!==undefined) g.icon=String(patch.icon||'').slice(0,4);
    save(); emit();
    return true;
  }
  function delChatGroup(id){
    const gs=getChatGroups();
    if(gs.length<=1) return false;   /* 至少保留一个分组 */
    const i=gs.findIndex(x=>x.id===id);
    if(i<0) return false;
    const gone=gs.splice(i,1)[0];
    /* 组内会话迁往剩余分组：优先 star，否则第一个剩余分组；prevGroup 失效引用一并清理 */
    const fallback=gs.some(g=>g.id==='star')?'star':gs[0].id;
    state.convs.forEach(v=>{
      if(v.groupKey===gone.id){ v.groupKey=fallback; v.prevGroup=null; }
      else if(v.prevGroup===gone.id) v.prevGroup=null;
    });
    if(state.ui.groupFilter===gone.id) state.ui.groupFilter='all';
    if(state.ui.folded&&state.ui.folded[gone.id]!==undefined) delete state.ui.folded[gone.id];
    save(); emit();
    return true;
  }

  /* ---------- 通用字卡分组 ---------- */
  function getCardGroups(){
    if(!Array.isArray(state.cardGroups)) state.cardGroups=[];
    return state.cardGroups;
  }
  function addCardGroup(name){
    name=(name||'').trim();
    if(!name) return null;
    const g={id:U.uid('cg'), name};
    state.cardGroups.push(g); save(); emit();
    return g;
  }
  function renameCardGroup(id,name){
    const g=getCardGroups().find(x=>x.id===id);
    name=(name||'').trim();
    if(!g||!name) return false;
    g.name=name; save(); emit();
    return true;
  }
  function delCardGroup(id){
    const before=state.cardGroups.length;
    state.cardGroups=state.cardGroups.filter(g=>g.id!==id);
    if(state.cardGroups.length===before) return false;
    (state.universalCards||[]).forEach(c=>{ if(c.groupId===id) c.groupId=null; });
    (state.dynamicCards||[]).forEach(c=>{ if(c.groupId===id) c.groupId=null; });
    (state.contacts||[]).forEach(ct=>{ (ct.exclusiveCards||[]).forEach(c=>{ if(c.groupId===id) c.groupId=null; }); });
    save(); emit();
    return true;
  }
  function setCardGroup(cardId,groupId){
    return setCardGroupIn('universal',null,cardId,groupId);
  }
  function setCardGroupIn(type,roleId,cardId,groupId){
    let c=null;
    if(type==='dynamic') c=(state.dynamicCards||[]).find(x=>x.id===cardId);
    else if(type==='exclusive'){ const ct=contact(roleId); c=ct?(ct.exclusiveCards||[]).find(x=>x.id===cardId):null; }
    else c=(state.universalCards||[]).find(x=>x.id===cardId);
    if(!c) return false;
    c.groupId=(groupId&&getCardGroups().some(g=>g.id===groupId))?groupId:null;
    save(); emit();
    return true;
  }

  /* ---------- 回复设置 ---------- */
  const REPLY_DEF={delayMin:4, delayMax:15, countMin:1, countMax:4, noReplyChance:50, quoteChance:20, dynamicChance:30, dynamicMin:1, dynamicMax:3, proactiveEnabled:true, surveyDelayMin:3, surveyDelayMax:8};
  function getReplySettings(){
    return Object.assign({}, REPLY_DEF, state.replySettings||{});
  }
  function setReplySetting(key,val){
    if(!state.replySettings) state.replySettings={};
    state.replySettings[key]=val;
    save();
  }

  /* ---------- 主动消息状态 ---------- */
  function markProactiveSent(){
    state.lastProactiveAt=Date.now();
    save();
  }
  function getLastProactiveAt(){ return state.lastProactiveAt||0; }

  return {get state(){return state;}, init, sub, save, emit,
    contact, conv, convOfContact, msgsOf, displayName, handleOf, avatarOf, ensureConv, previewOf,
    updateUser, addContact, updateContact, deleteContact, createGroup,
    send, incoming, sysMsg, deleteMsg, updateMessage, clearMsgs, markReadSilent, readConv, setPinned, moveConvToGroup, dissolveGroup,
    addGroupMembers, removeGroupMember,
    addCheckin, checkinsOfContact, myCheckins,
    addPost, updatePost, deletePost, toggleLike, addComment, delComment, toggleCollect, collectedPosts,
    getCS, setCS, resetCSAppearance,
    memsOf, addMem, updateMem, delMem,
    setApp, setUi, addSticker, removeSticker, addStickerEmoji, removeStickerEmoji, pokeTextOf, DEFAULT_POKE,
    exportAll, importAll, wipe, storageText, DEF_CS,
    getUniversalCards, addUniversalCard, delUniversalCard,
    getDynamicCards, addDynamicCard, delDynamicCard,
    getExclusiveCards, addExclusiveCard, delExclusiveCard,
    getReportCards, addReportCard, addReportGroup, updateReportGroup, delReportCard, pickReport, bumpCardUsage,
    getChatGroups, renameChatGroup, updateChatGroup, delChatGroup,
    getCardGroups, addCardGroup, renameCardGroup, delCardGroup, setCardGroup, setCardGroupIn,
    getReplySettings, setReplySetting,
    markProactiveSent, getLastProactiveAt};
})();
