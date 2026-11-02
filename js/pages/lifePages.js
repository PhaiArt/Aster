/* ===== Life 子页面：经期 / 记账 / 待办 / 倒数日 ===== */
window.Pages=window.Pages||{};

window.LifeUI=(function(){
  function pad(n){ return String(n).padStart(2,'0'); }
  function iso(d){
    d=d||new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }
  function parseDay(s){
    if(!s) return null;
    const d=new Date(s+'T00:00:00');
    return isNaN(d.getTime())?null:d;
  }
  function today0(){
    const d=new Date();
    return new Date(d.getFullYear(),d.getMonth(),d.getDate());
  }
  function diffDays(s){
    const d=parseDay(s);
    if(!d) return null;
    return Math.round((d.getTime()-today0().getTime())/86400000);
  }
  function monthKey(d){
    d=d||new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1);
  }
  function fmtShort(s){
    const d=parseDay(s);
    return d?(d.getMonth()+1)+'月'+d.getDate()+'日':'—';
  }
  function money(n){ return '¥'+(+n||0).toFixed(2); }
  function shell(el,title){
    el.innerHTML=UI.head(title,{back:true})+'<div class="life-detail" id="ld"></div>';
    const back=U.$('[data-back]',el);
    if(back) back.onclick=()=>App.back();
    return U.$('#ld',el);
  }
  function periodInfo(st,now){
    const p=st.app.lifePeriod;
    if(!p||!p.lastStart) return null;
    const start=parseDay(p.lastStart);
    if(!start) return null;
    const n=now||new Date();
    const t0=new Date(n.getFullYear(),n.getMonth(),n.getDate());
    const days=Math.floor((t0-start.getTime())/86400000);
    if(days<0) return {future:true};
    const cycle=Math.max(20,Math.min(45,Number(p.cycle)||28));
    const dur=Math.max(2,Math.min(10,Number(p.duration)||5));
    const cycleDay=(days%cycle)+1;
    const ovu=cycle-14;
    let phase='黄体期';
    if(cycleDay<=dur) phase='经期';
    else if(cycleDay<ovu-1) phase='卵泡期';
    else if(cycleDay<=ovu+1) phase='排卵期';
    return {phase,cycleDay,until:cycle-cycleDay+1,cycle,dur,periodDay:cycleDay<=dur?cycleDay:0};
  }
  return {iso,parseDay,today0,diffDays,monthKey,fmtShort,money,shell,periodInfo};
})();

/* ---------- 经期 ---------- */
Pages.lifePeriod=function(el){
  const st=Store.state;
  const p=st.app.lifePeriod||{};
  const pi=LifeUI.periodInfo(st);
  const now=new Date();
  const y=now.getFullYear(), m=now.getMonth();
  const today=LifeUI.iso(now);
  const logs=(st.app.lifePeriodLogs||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  let actualDays=(st.app.lifePeriodActual||[]).filter(Boolean).slice();
  const todayLog=logs.find(x=>x.date===today);
  let flow=(todayLog&&todayLog.flow)||'无';
  let pain=(todayLog&&todayLog.pain)||'无';
  let syms=(todayLog&&Array.isArray(todayLog.symptoms))?todayLog.symptoms.slice():[];

  function addDays(s,n){
    const d=LifeUI.parseDay(s);
    if(!d) return null;
    d.setDate(d.getDate()+n);
    return LifeUI.iso(d);
  }
  function between(date,a,b){ return a&&b&&date>=a&&date<=b; }

  const cycle=Math.max(20,Math.min(45,Number(p.cycle)||28));
  const duration=Math.max(2,Math.min(10,Number(p.duration)||5));
  let cycleStart=null,nextStart=null,ovu=null,fertileA=null,fertileB=null;
  if(p.lastStart&&LifeUI.parseDay(p.lastStart)){
    const last=LifeUI.parseDay(p.lastStart);
    const t0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const since=Math.floor((t0-last.getTime())/86400000);
    if(since>=0){
      const idx=Math.floor(since/cycle);
      cycleStart=addDays(p.lastStart,idx*cycle);
      nextStart=addDays(cycleStart,cycle);
      ovu=addDays(nextStart,-14);
      fertileA=addDays(ovu,-4);
      fertileB=addDays(ovu,3);
    }
  }

  const phase=!pi?'未设置':(pi.future?'日期未到':(pi.periodDay?'经期':pi.phase));
  const phaseSub=!pi?'设置最近一次开始日和周期，就能看到阶段、日历和距下次天数':(pi.future?'最近开始日不能晚于今天':'周期第 '+pi.cycleDay+' 天');
  const until=pi&&!pi.future?pi.until:null;
  let angle=0, p1=0, p2=0, p3=0;
  if(pi&&!pi.future){
    angle=Math.round(pi.cycleDay/pi.cycle*360);
    p1=Math.min(90,Math.max(10,Math.round(duration/cycle*100)));
    p2=Math.max(p1+2,Math.min(96,Math.round((cycle-15)/cycle*100)));
    p3=Math.max(p2+2,Math.min(99,Math.round((cycle-12)/cycle*100)));
  }
  const ringBg=pi&&!pi.future
    ? 'conic-gradient(var(--rose) 0 '+p1+'%,var(--rose-soft) '+p1+'% '+(p1+1)+'%,var(--life-blue) '+(p1+1)+'% '+p2+'%,var(--green) '+p2+'% '+p3+'%,var(--amber) '+p3+'% 100%)'
    : 'conic-gradient(var(--bg-soft) 0 100%)';

  /* 可翻 5 个月的日历：前两个月 + 本月 + 后两个月 */
  const todayDate=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const addD=(d,n)=>{ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()+n); return x; };
  const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const sameMonth=(d,yy,mm)=>d.getFullYear()===yy&&d.getMonth()===mm;
  const md=d=>(d.getMonth()+1)+'.'+String(d.getDate()).padStart(2,'0');
  const calMonths=[];
  for(let i=-2;i<=2;i++){ const d=new Date(y,m+i,1); calMonths.push({y:d.getFullYear(),m:d.getMonth(),label:(d.getMonth()+1)+'月'}); }
  let calIdx=2;
  const cycleDates=[];
  if(p.lastStart&&LifeUI.parseDay(p.lastStart)){
    const ls=LifeUI.parseDay(p.lastStart);
    for(let i=-6;i<=6;i++) cycleDates.push(addD(ls,i*cycle));
  }

  const root=LifeUI.shell(el,'经期');
  root.innerHTML=
    '<div class="period-page">'
    +'<div class="period-hero">'
      +'<div class="period-hero-top"><b>周期总览</b><span>'+(m+1)+'月 · '+(y)+'</span></div>'
      +'<div class="period-ring-wrap">'
        +'<div class="period-ring" style="background:'+ringBg+'"><div class="period-ring-in"><b>'+(pi&&!pi.future?pi.cycleDay:'—')+'</b><em>天</em><span>'+U.esc(phase)+'</span><i>'+U.esc(phaseSub)+'</i></div></div>'
        +(pi&&!pi.future?'<i class="period-ring-dot" style="transform:rotate('+angle+'deg) translateY(-91px) translate(-50%,-50%)"></i>':'')
      +'</div>'
      +(pi&&!pi.future
        ?'<div class="period-next"><span>预计下次月经</span><b>'+LifeUI.fmtShort(nextStart)+' · 还有 '+until+' 天</b></div>'
        :'<div class="period-next"><span>还没有设置周期</span><b>填写下方信息</b></div>')
      +'<div class="period-stats">'
        +'<div><b>'+cycle+'</b><span>周期天数</span></div>'
        +'<div><b>'+duration+'</b><span>经期长度</span></div>'
        +'<div><b>'+actualDays.length+'</b><span>实际经期</span></div>'
      +'</div>'
    +'</div>'

    +'<div class="period-cal">'
      +'<div class="period-cal-head">'
        +'<div><b id="periodCalTitle">'+(m+1)+'月</b><span id="periodCalYear">'+y+'年</span></div>'
        +'<div class="period-cal-nav"><button id="periodCalPrev" aria-label="上个月">'+I.chevronLeft(15)+'</button><button id="periodCalNext" aria-label="下个月">'+I.chevronRight(15)+'</button></div>'
      +'</div>'
      +'<div class="period-cal-tabs" id="periodCalTabs"></div>'
      +'<div class="period-grid" id="periodCalGrid"></div>'
      +'<div class="period-legend"><span><i class="pl-period"></i>经期</span><span><i class="pl-actual"></i>实际</span><span><i class="pl-pred"></i>预测</span><span><i class="pl-ovu"></i>排卵期</span><span><i class="pl-today"></i>今天</span></div>'
      +'<div class="period-cal-sum"><span id="periodCalSumLabel">本月</span><b id="periodCalSum"></b></div>'
      +'<p class="tiny" style="margin:7px 1px 0;line-height:1.5">点日历日期可标记或取消实际经期；预测只作参考。</p>'
    +'</div>'

    +'<div class="period-log">'
      +'<div class="period-log-head"><b>今天感觉怎么样</b><span>只记录在本机</span></div>'
      +'<div class="period-log-row"><span class="pl-lab">量</span><div class="period-chips" data-group="flow">'
        +['无','少','中','多'].map(v=>'<button class="pchip'+(flow===v?' on':'')+'" data-flow="'+v+'">'+v+'</button>').join('')
      +'</div></div>'
      +'<div class="period-log-row"><span class="pl-lab">痛</span><div class="period-chips" data-group="pain">'
        +['无','轻','中','重'].map(v=>'<button class="pchip'+(pain===v?' on':'')+'" data-pain="'+v+'">'+v+'</button>').join('')
      +'</div></div>'
      +'<div class="period-log-row"><span class="pl-lab">症状</span><div class="period-chips">'
        +['腰酸','腹痛','乳胀','头痛'].map(v=>'<button class="pchip'+(syms.includes(v)?' on':'')+'" data-sym="'+v+'">'+v+'</button>').join('')
      +'</div></div>'
      +'<button class="period-save" id="period-save">保存今天的记录</button>'
    +'</div>'

    +'<div class="period-sec">最近记录 <span>'+logs.length+' 天</span></div>'
    +(logs.length?'<div class="period-logs">'+logs.slice(0,4).map(x=>
        '<div class="period-log-item"><b>'+LifeUI.fmtShort(x.date)+'</b><span>'+U.esc(x.flow||'无')+' · '+U.esc(x.pain||'无')+(x.symptoms&&x.symptoms.length?' · '+x.symptoms.map(U.esc).join(' / '):'')+'</span></div>'
      ).join('')+'</div>'
      :'<div class="period-empty">还没有记录</div>')

    +'<div class="period-sec">设置</div>'
    +'<div class="period-settings">'
      +'<div class="ld-field"><span>最近一次开始日</span><input class="field" type="date" id="pd-start" value="'+U.esc(p.lastStart||today)+'"></div>'
      +'<div class="ld-field"><span>周期天数</span><input class="field" type="number" min="20" max="45" id="pd-cycle" value="'+cycle+'"></div>'
      +'<div class="ld-field"><span>经期长度</span><input class="field" type="number" min="2" max="10" id="pd-duration" value="'+duration+'"></div>'
      +'<button class="btn dark block" id="pd-save" style="margin-top:12px">保存设置</button>'
      +(p.lastStart?'<button class="btn light block" id="pd-clear" style="margin-top:8px;color:#B45757">清除设置</button>':'')
      +'<p class="tiny" style="margin-top:9px;line-height:1.6">用于估算阶段和日历，只保存在本机，不做医疗建议。</p>'
    +'</div>'
    +'</div>';

  function renderCal(){
    const mo=calMonths[calIdx];
    const title=U.$('#periodCalTitle',el), yearEl=U.$('#periodCalYear',el);
    if(title) title.textContent=(mo.m+1)+'月';
    if(yearEl) yearEl.textContent=mo.y+'年';
    const tabs=U.$('#periodCalTabs',el);
    if(tabs){
      tabs.innerHTML=calMonths.map((x,i)=>'<button class="pcal-tab'+(i===calIdx?' on':'')+'" data-cal="'+i+'">'+x.label+'</button>').join('');
      U.$$('[data-cal]',el).forEach(b=>b.onclick=()=>{ calIdx=Number(b.dataset.cal); renderCal(); });
    }
    const prev=U.$('#periodCalPrev',el), next=U.$('#periodCalNext',el);
    if(prev) prev.disabled=calIdx===0;
    if(next) next.disabled=calIdx===calMonths.length-1;

    const first=new Date(mo.y,mo.m,1);
    const offset=(first.getDay()+6)%7;
    const daysInMonth=new Date(mo.y,mo.m+1,0).getDate();
    const cells=[];
    for(let i=0;i<offset;i++) cells.push('<span class="day muted"></span>');
    for(let d=1;d<=daysInMonth;d++){
      const ds=new Date(mo.y,mo.m,d);
      const iso=LifeUI.iso(ds);
      const recorded=actualDays.indexOf(iso)>=0;
      let actual=false,pred=false,ovu=false,fertile=false;
      for(const s of cycleDates){
        const end=addD(s,duration-1);
        if(ds>=s&&ds<=end){ if(s>todayDate) pred=true; else actual=true; }
        const ov=addD(s,cycle-14);
        if(sameDay(ds,ov)) ovu=true;
        if(ds>=addD(ov,-4)&&ds<=addD(ov,3)&&!(ds>=s&&ds<=end)) fertile=true;
      }
      const cls=['day'];
      if(recorded) cls.push('period','actual');
      else if(actual) cls.push('period');
      else if(pred) cls.push('predicted');
      if(ovu) cls.push('ovu');
      else if(fertile) cls.push('fertile');
      if(sameDay(ds,todayDate)) cls.push('today');
      cells.push('<span class="'+cls.join(' ')+'" data-date="'+iso+'" role="button" title="'+(recorded?'取消实际经期':'标记实际经期')+'">'+d+'</span>');
    }
    while(cells.length<42) cells.push('<span class="day muted"></span>');
    const grid=U.$('#periodCalGrid',el);
    if(grid) grid.innerHTML=['一','二','三','四','五','六','日'].map(w=>'<span class="wd">'+w+'</span>').join('')+cells.join('');

    const inMonth=cycleDates.filter(s=>sameMonth(s,mo.y,mo.m)).sort((a,b)=>a-b);
    const actualInMonth=actualDays.filter(x=>x.slice(0,7)===mo.y+'-'+String(mo.m+1).padStart(2,'0'));
    let summary='点日期标记实际经期';
    if(inMonth.length){
      const s=inMonth[0], e=addD(s,duration-1);
      summary=(s>todayDate?'预计经期 ':'经期 ')+md(s)+'–'+md(e);
    }else if(actualInMonth.length){
      summary='实际经期 '+actualInMonth.length+' 天';
    }else if(cycleDates.length){
      summary='本月无预计经期';
    }
    if(actualInMonth.length&&inMonth.length) summary+=' · 实际 '+actualInMonth.length+' 天';
    const ovs=cycleDates.map(s=>addD(s,cycle-14)).filter(d=>sameMonth(d,mo.y,mo.m)).sort((a,b)=>a-b);
    if(ovs.length) summary+=' · 排卵日 '+md(ovs[0]);
    const sumLabel=U.$('#periodCalSumLabel',el), sum=U.$('#periodCalSum',el);
    if(sumLabel) sumLabel.textContent=calIdx===2?'本月':mo.label;
    if(sum) sum.textContent=summary;
    bindCalDays();
  }
  function bindCalDays(){
    U.$$('#periodCalGrid [data-date]',el).forEach(cell=>{
      cell.onclick=()=>{
        const date=cell.dataset.date;
        if(date>today){ UI.toast('还不能记录未来日期'); return; }
        const exists=actualDays.indexOf(date)>=0;
        actualDays=exists?actualDays.filter(x=>x!==date):actualDays.concat(date);
        Store.setApp({lifePeriodActual:actualDays},true);
        renderCal();
        UI.toast(exists?'已取消实际经期':'已标记实际经期');
      };
    });
  }
  U.$('#periodCalPrev',el).onclick=()=>{ if(calIdx>0){ calIdx--; renderCal(); } };
  U.$('#periodCalNext',el).onclick=()=>{ if(calIdx<calMonths.length-1){ calIdx++; renderCal(); } };
  renderCal();

  U.$$('[data-flow]',el).forEach(b=>b.onclick=()=>{ flow=b.dataset.flow; U.$$('[data-flow]',el).forEach(x=>x.classList.toggle('on',x===b)); });
  U.$$('[data-pain]',el).forEach(b=>b.onclick=()=>{ pain=b.dataset.pain; U.$$('[data-pain]',el).forEach(x=>x.classList.toggle('on',x===b)); });
  U.$$('[data-sym]',el).forEach(b=>b.onclick=()=>{
    const v=b.dataset.sym;
    syms=syms.includes(v)?syms.filter(x=>x!==v):syms.concat(v);
    b.classList.toggle('on',syms.includes(v));
  });
  U.$('#period-save',el).onclick=()=>{
    const next=logs.filter(x=>x.date!==today).concat({date:today,flow,pain,symptoms:syms});
    Store.setApp({lifePeriodLogs:next});
    UI.toast('已记录今天');
  };
  U.$('#pd-save',el).onclick=()=>{
    const lastStart=U.$('#pd-start',el).value;
    const cyc=Number(U.$('#pd-cycle',el).value);
    const dur=Number(U.$('#pd-duration',el).value);
    if(!lastStart){ UI.toast('请选择最近一次开始日'); return; }
    if(!(cyc>=20&&cyc<=45)){ UI.toast('周期天数需在 20–45 天'); return; }
    if(!(dur>=2&&dur<=10)){ UI.toast('经期长度需在 2–10 天'); return; }
    Store.setApp({lifePeriod:{lastStart,cycle:cyc,duration:dur}});
    UI.toast('已保存');
  };
  const clr=U.$('#pd-clear',el);
  if(clr) clr.onclick=()=>{ Store.setApp({lifePeriod:null}); UI.toast('已清除经期设置'); };
};

/* ---------- 记账 ---------- */
Pages.lifeMoney=function(el){
  const st=Store.state;
  const list=(st.app.lifeMoney||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const month=LifeUI.monthKey();
  const monthList=list.filter(x=>(x.date||'').slice(0,7)===month);
  const income=monthList.filter(x=>x.type==='income').reduce((s,x)=>s+(+x.amount||0),0);
  const expense=monthList.filter(x=>x.type==='expense').reduce((s,x)=>s+(+x.amount||0),0);
  let type='expense';

  const root=LifeUI.shell(el,'记账');
  root.innerHTML=
    '<div class="ld-card ld-money-sum">'
      +'<div class="ld-cap">'+month.replace('-',' 年 ')+' 月</div>'
      +'<div class="ld-money-cols">'
        +'<div><span>收入</span><b class="in">'+LifeUI.money(income)+'</b></div>'
        +'<div><span>支出</span><b>'+LifeUI.money(expense)+'</b></div>'
        +'<div><span>结余</span><b>'+LifeUI.money(income-expense)+'</b></div>'
      +'</div>'
    +'</div>'
    +'<div class="ld-sec">记一笔</div>'
    +'<div class="ld-card">'
      +'<div class="seg light" id="lm-type" style="margin-bottom:10px">'
        +'<button class="sg active" data-type="expense">支出</button><button class="sg" data-type="income">收入</button></div>'
      +'<div class="ld-field"><span>金额</span><input class="field" type="number" min="0.01" step="0.01" id="lm-amount" placeholder="0.00"></div>'
      +'<div class="ld-field"><span>备注</span><input class="field" type="text" id="lm-note" maxlength="30" placeholder="可选"></div>'
      +'<div class="ld-field"><span>日期</span><input class="field" type="date" id="lm-date" value="'+LifeUI.iso()+'"></div>'
      +'<button class="btn dark block" id="lm-add" style="margin-top:12px">添加</button>'
    +'</div>'
    +'<div class="ld-sec">记录 <span class="ld-count">'+list.length+'</span></div>'
    +(list.length?'<div class="ld-list">'+list.map(x=>
        '<div class="ld-item" data-mid="'+x.id+'">'
        +'<div class="grow"><div class="ld-item-title">'+U.esc(x.note||(x.type==='income'?'收入':'支出'))+'</div>'
        +'<div class="ld-item-sub">'+U.esc(LifeUI.fmtShort(x.date))+'</div></div>'
        +'<div class="ld-amt '+(x.type==='income'?'in':'')+'">'+(x.type==='income'?'+':'-')+LifeUI.money(x.amount).replace('¥','')+'</div>'
        +'<button class="icon-btn sm" data-del-money="'+x.id+'" style="color:#B45757">'+I.trash(15)+'</button>'
        +'</div>').join('')+'</div>'
      :'<div class="ld-empty">还没有记账记录</div>');

  U.$$('#lm-type .sg',el).forEach(b=>b.onclick=()=>{
    type=b.dataset.type;
    U.$$('#lm-type .sg',el).forEach(x=>x.classList.toggle('active',x===b));
  });
  U.$('#lm-add',el).onclick=()=>{
    const amount=Number(U.$('#lm-amount',el).value);
    const note=U.$('#lm-note',el).value.trim();
    const date=U.$('#lm-date',el).value||LifeUI.iso();
    if(!(amount>0)){ UI.toast('请输入金额'); return; }
    const next=(st.app.lifeMoney||[]).concat({id:U.uid('lm'),type,amount,note,date,createdAt:Date.now()});
    Store.setApp({lifeMoney:next});
    UI.toast('已记录');
  };
  U.$$('[data-del-money]',el).forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    if(!await UI.confirm('删除这条记录？',{title:'删除记录',ok:'删除'})) return;
    Store.setApp({lifeMoney:(st.app.lifeMoney||[]).filter(x=>x.id!==b.dataset.delMoney)});
    UI.toast('已删除');
  });
};

/* ---------- 待办 ---------- */
Pages.lifeTodo=function(el){
  const st=Store.state;
  const list=(st.app.lifeTodos||[]).slice().sort((a,b)=>{
    if(!!a.done!==!!b.done) return a.done?1:-1;
    return (a.due||'').localeCompare(b.due||'');
  });
  const root=LifeUI.shell(el,'待办');
  root.innerHTML=
    '<div class="ld-card">'
      +'<input class="field" id="td-text" maxlength="60" placeholder="要做什么？" style="margin-bottom:8px">'
      +'<div class="ld-field"><span>截止日期</span><input class="field" type="date" id="td-due" value="'+LifeUI.iso()+'"></div>'
      +'<button class="btn dark block" id="td-add" style="margin-top:10px">添加待办</button>'
      +'<p class="tiny" style="margin-top:8px">截止日期是必填项，桌面小组件会按截止日期排序。</p>'
    +'</div>'
    +'<div class="ld-sec">清单 <span class="ld-count">'+list.filter(x=>!x.done).length+' 项未完成</span></div>'
    +(list.length?'<div class="ld-list">'+list.map(t=>{
        const d=LifeUI.diffDays(t.due);
        const due=d==null?'':(d<0?'已逾期 '+(-d)+' 天':d===0?'今天截止':'还有 '+d+' 天');
        return '<div class="ld-item'+(t.done?' done':'')+'" data-tid="'+t.id+'">'
          +'<button class="ld-check'+(t.done?' on':'')+'" data-toggle-todo="'+t.id+'">'+I.check(12)+'</button>'
          +'<div class="grow"><div class="ld-item-title">'+U.esc(t.text)+'</div>'
          +'<div class="ld-item-sub">'+U.esc(LifeUI.fmtShort(t.due))+(due?' · '+due:'')+'</div></div>'
          +'<button class="icon-btn sm" data-del-todo="'+t.id+'" style="color:#B45757">'+I.trash(15)+'</button>'
          +'</div>';
      }).join('')+'</div>'
      :'<div class="ld-empty">还没有待办</div>');

  U.$('#td-add',el).onclick=()=>{
    const text=U.$('#td-text',el).value.trim();
    const due=U.$('#td-due',el).value;
    if(!text){ UI.toast('写下要做的事'); return; }
    if(!due){ UI.toast('请选择截止日期'); return; }
    Store.setApp({lifeTodos:(st.app.lifeTodos||[]).concat({id:U.uid('td'),text,due,done:false,createdAt:Date.now()})});
    UI.toast('已添加');
  };
  U.$$('[data-toggle-todo]',el).forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const id=b.dataset.toggleTodo;
    Store.setApp({lifeTodos:(st.app.lifeTodos||[]).map(t=>t.id===id?{...t,done:!t.done}:t)});
  });
  U.$$('[data-del-todo]',el).forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    if(!await UI.confirm('删除这条待办？',{title:'删除待办',ok:'删除'})) return;
    Store.setApp({lifeTodos:(st.app.lifeTodos||[]).filter(t=>t.id!==b.dataset.delTodo)});
    UI.toast('已删除');
  });
};

/* ---------- 倒数日 ---------- */
Pages.lifeCountdown=function(el){
  const st=Store.state;
  const list=(st.app.lifeCountdowns||[]).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const root=LifeUI.shell(el,'倒数日');
  root.innerHTML=
    '<div class="ld-card">'
      +'<input class="field" id="cd-title" maxlength="30" placeholder="纪念日 / 生日 / 旅行..." style="margin-bottom:8px">'
      +'<div class="ld-field"><span>日期</span><input class="field" type="date" id="cd-date" value="'+LifeUI.iso()+'"></div>'
      +'<button class="btn dark block" id="cd-add" style="margin-top:10px">添加倒数日</button>'
    +'</div>'
    +'<div class="ld-sec">全部 <span class="ld-count">'+list.length+' 个</span></div>'
    +(list.length?'<div class="ld-list">'+list.map(x=>{
        const d=LifeUI.diffDays(x.date);
        const label=d==null?'':(d>0?'还有 '+d+' 天':d===0?'就是今天':'已经 '+(-d)+' 天');
        return '<div class="ld-item" data-cid="'+x.id+'">'
          +'<div class="grow"><div class="ld-item-title">'+U.esc(x.title)+'</div>'
          +'<div class="ld-item-sub">'+U.esc(LifeUI.fmtShort(x.date))+'</div></div>'
          +'<span class="ld-days '+(d>0?'future':d<0?'past':'')+'">'+label+'</span>'
          +'<button class="icon-btn sm" data-del-cd="'+x.id+'" style="color:#B45757">'+I.trash(15)+'</button>'
          +'</div>';
      }).join('')+'</div>'
      :'<div class="ld-empty">还没有倒数日</div>');

  U.$('#cd-add',el).onclick=()=>{
    const title=U.$('#cd-title',el).value.trim();
    const date=U.$('#cd-date',el).value;
    if(!title){ UI.toast('给这个日子起个名字'); return; }
    if(!date){ UI.toast('请选择日期'); return; }
    Store.setApp({lifeCountdowns:(st.app.lifeCountdowns||[]).concat({id:U.uid('cd'),title,date,createdAt:Date.now()})});
    UI.toast('已添加');
  };
  U.$$('[data-del-cd]',el).forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    if(!await UI.confirm('删除这个倒数日？',{title:'删除倒数日',ok:'删除'})) return;
    Store.setApp({lifeCountdowns:(st.app.lifeCountdowns||[]).filter(x=>x.id!==b.dataset.delCd)});
    UI.toast('已删除');
  });
};
