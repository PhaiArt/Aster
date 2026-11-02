/* ===== Reminder Engine 待办 / 经期提醒 =====
   规则：48/36/24/8h（可在设置里改）各一个节点；网站打开时检查。
   错过的节点不逐条补发，只在打开时按当前剩余时间发一条，然后继续后面的节点。
   若打开时已过截止，则不再提醒。 */
window.ReminderEngine=(function(){
  const DEFAULTS={
    todo:'「{title}」还有 {left} 截止，记得安排一下~',
    period:'生理期预计还有 {left} 到达，记得提前做准备~'
  };
  let timer=null, checking=false;

  function defaultPrompt(kind){ return DEFAULTS[kind]||DEFAULTS.todo; }
  function parseDay(s){
    const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return isNaN(d.getTime())?null:d;
  }
  function iso(d){
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function formatLeft(hours){
    const h=Math.max(0,Math.ceil(hours));
    if(h>=24){
      const d=Math.floor(h/24), r=h%24;
      const cn=['','一','两','三','四','五','六','七','八','九'];
      const day=(d<=9?(cn[d]||String(d)):String(d))+'天';
      return day+(r?r+'h':'');
    }
    return h+'h';
  }
  function fill(tpl,ctx){
    return String(tpl||'').replace(/\{(\w+)\}/g,(m,k)=>ctx[k]!==undefined?String(ctx[k]):m);
  }
  function settings(){
    const app=window.Store&&Store.state&&Store.state.app;
    return (app&&app.reminderSettings)||{thresholds:[48,36,24,8],todoEnabled:true,periodEnabled:true,todoRoles:[],periodRoles:[],todoPrompts:{},periodPrompts:{}};
  }
  function thresholds(rs){
    const list=(Array.isArray(rs.thresholds)?rs.thresholds:[48,36,24,8])
      .map(Number).filter(h=>isFinite(h)&&h>0).sort((a,b)=>b-a);
    const uniq=[];
    list.forEach(h=>{ if(uniq.indexOf(h)<0) uniq.push(h); });
    return uniq.length?uniq:[48,36,24,8];
  }
  function todoTargets(){
    const now=Date.now();
    return (Store.state.app.lifeTodos||[]).filter(t=>t&&!t.done&&t.due).map(t=>{
      const d=parseDay(t.due);
      if(!d) return null;
      d.setHours(23,59,59,999);
      if(d.getTime()<=now) return null;
      return {kind:'todo',id:t.id,due:d,title:t.text||'待办',base:'todo:'+t.id+':'+t.due};
    }).filter(Boolean);
  }
  function periodTarget(){
    const p=Store.state.app.lifePeriod;
    if(!p||!p.lastStart) return null;
    const start=parseDay(p.lastStart);
    if(!start) return null;
    const cycle=Math.max(20,Math.min(45,Number(p.cycle)||28));
    const now=new Date();
    const next=new Date(start.getFullYear(),start.getMonth(),start.getDate());
    next.setHours(0,0,0,0);
    let guard=0;
    while(next.getTime()<=now.getTime()&&guard++<120) next.setDate(next.getDate()+cycle);
    if(next.getTime()<=now.getTime()) return null;
    return {kind:'period',id:'period',due:next,title:'生理期',base:'period:'+iso(next)};
  }
  function sendTarget(target,rs,sent){
    const kind=target.kind;
    if(rs[kind+'Enabled']===false) return false;
    const roles=Array.isArray(rs[kind+'Roles'])?rs[kind+'Roles']:[];
    if(!roles.length) return false;
    const rem=(target.due.getTime()-Date.now())/3600000;
    if(!(rem>0)) return false;
    const passed=thresholds(rs).filter(h=>rem<=h);
    const fresh=passed.filter(h=>!sent[target.base+':'+h]);
    if(!fresh.length) return false;
    const prompts=rs[kind+'Prompts']||{};
    const left=formatLeft(rem);
    roles.forEach(id=>{
      const c=Store.contact(id);
      if(!c) return;
      const cv=Store.ensureConv(id);
      const tpl=prompts[id]||defaultPrompt(kind);
      const text=fill(tpl,{
        left,
        hours:Math.ceil(rem),
        title:target.title,
        role:c.remark||c.name||'角色'
      });
      Store.incoming(cv.id,{from:id,type:'text',text,reminder:true});
    });
    fresh.forEach(h=>{ sent[target.base+':'+h]=Date.now(); });
    return true;
  }
  function check(){
    if(checking) return;
    if(!window.Store||!Store.state||!Store.state.app) return;
    checking=true;
    try{
      const app=Store.state.app;
      if(!app.remindersSent||typeof app.remindersSent!=='object') app.remindersSent={};
      const sent=app.remindersSent;
      const now=Date.now();
      for(const k of Object.keys(sent)){
        if(now-Number(sent[k]||0)>60*86400000) delete sent[k];
      }
      const rs=settings();
      const targets=[...todoTargets(),periodTarget()].filter(Boolean);
      let changed=false;
      targets.forEach(t=>{ if(sendTarget(t,rs,sent)) changed=true; });
      if(changed) Store.save();
    }finally{
      checking=false;
    }
  }
  function start(){
    if(timer) return;
    setTimeout(check,1200);
    timer=setInterval(check,30000);
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
    window.addEventListener('focus',check);
  }

  return {start,check,formatLeft,defaultPrompt};
})();
