'use strict';
// Synthetic page-memory only. No fetch, persistence, analytics, notifications or AI.
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let language = 'zh';
const t = (zh, en) => language === 'zh' ? zh : en;
const initial = () => ({view:'home',mode:'C',topic:'follow',draftText:'',phase:'ready',query:'',historyScope:'follow',refs:[],excluded:[],sourceState:'current',sourceId:'follow',processing:'local',enabled:false,paused:false,categories:{follow:false},zone:'Asia/Singapore',quietStart:'22:00',quietEnd:'08:00',lockscreen:'generic',push:false,unread:true,proactiveState:'valid',feedback:'',deletedTopics:[],replyTarget:false,referenceReturn:'home',sentText:'',resultChecked:false,consentDemo:false,followTime:'2026-10-26T16:30',followConfirmed:false,zoneConfirmed:false,followStage:'form',intentReadback:false,settingsRevision:0,quietEnabled:true,provider:'disabled',readState:'unread',readObserved:false,sourceContext:'draft',selectionReviewed:true,selectionConflict:false,historyDependent:false,historyExcluded:false});
let state = initial();
const icons = {back:'<path d="m14 5-7 7 7 7"/>',arrow:'<path d="M12 19V5m-6 6 6-6 6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',history:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>',search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',leaf:'<path d="M5 19C1 9 9 4 21 3c-1 12-6 20-16 16Zm0 0L16 8"/>',check:'<path d="m5 12 4 4L19 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',bell:'<path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4Zm5 4h4"/>'};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const button = (action,label,style='',attrs='') => `<button type="button" data-action="${action}" class="${style}" ${attrs}>${label}</button>`;
const notice = (copy,kind='') => `<div class="notice ${kind}">${copy}</div>`;
const pill = (copy,kind='') => `<span class="status-pill ${kind}">${copy}</span>`;
const topicName = () => state.topic === 'fresh' ? t('新话题','New topic') : state.topic === 'walk' ? t('周末散步','Weekend walk') : t('明天的节奏','Tomorrow’s pace');
const draft = () => state.draftText;
const scalarCount = (text) => Array.from(text).length;
const validText = (text) => Boolean(text.trim())&&scalarCount(text)<=2400&&Array.from(text).every(c=>c.codePointAt(0)<0xd800||c.codePointAt(0)>0xdfff);
const busy = () => ['pending','unknown','cancelUnknown','deleteUnknown'].includes(state.phase);
const followBusy = () => ['settings-pending','settings-unknown','creating','unknown','cancelling','cancel-unknown','dispatch-unknown'].includes(state.followStage);
const sources = {
  follow: {kind:()=>t('你的要求','Your request'),title:()=>t('明天下午再问我一次','Check in tomorrow afternoon'),time:()=>t('10月24日 16:30 · 新加坡','24 Oct, 16:30 · Singapore'),body:()=>t('“明天下午四点半问问我，是否想给下周留一点休息时间。”','“Tomorrow at 4:30 pm, ask whether I’d like to make a little room for rest next week.”'),facts:()=>t('来自本话题中的明确要求。不是根据心情推断的需要。','An explicit request in this topic. Not an inference from a mood.'),id:'synthetic-user-message-01'},
  checkin: {kind:()=>t('自己的签到','Your Check-in'),title:()=>t('散步后的片刻','A moment after a walk'),time:()=>t('10月24日 18:20 · 新加坡','24 Oct, 18:20 · Singapore'),body:()=>t('傍晚走了一小段，觉得轻松了一些。','I took a short walk in the evening and felt a little lighter.'),facts:()=>t('记录时的心情：平静。活动标签：散步。未附位置、天气。不是现在的心情或位置。','Recorded mood: calm. Activity tag: walking. No location or weather attached. This is not your current mood or location.'),id:'synthetic-checkin-01',eligible:true}
};
// Authored fixtures, not a source reader or production time-zone resolver.
sources.schedule={...sources.follow,time:()=>t('10月25日 16:35 · Asia/Singapore','25 Oct, 16:35 · Asia/Singapore'),id:'synthetic-user-message-02'};
const checkInFixtures=[
  ['checkin2','10月23日 12:10','23 Oct, 12:10','午休时安静坐了一会儿。','I sat quietly during lunch.','平静 · 休息','Calm · Rest'],
  ['checkin3','10月22日 19:00','22 Oct, 19:00','晚饭后读了几页书。','I read a few pages after dinner.','放松 · 阅读','Relaxed · Reading'],
  ['checkin4','10月21日 09:15','21 Oct, 09:15','今天先把事情放慢一点。','I took things more slowly today.','平静 · 休息','Calm · Rest'],
  ['checkin5','10月20日 18:00','20 Oct, 18:00','走了十分钟，停下来休息。','I walked for ten minutes, then rested.','放松 · 散步','Relaxed · Walking'],
  ['checkin6','10月18日 16:40','18 Oct, 16:40','给自己留了一点空闲。','I left myself some free time.','平静 · 休息','Calm · Rest'],
  ['checkinOld','10月18日 16:39','18 Oct, 16:39','这是时间窗口外的合成记录。','This synthetic record is outside the time window.','平静 · 休息','Calm · Rest']
];
for(const [id,zhDate,enDate,zhNote,enNote,zhLabels,enLabels] of checkInFixtures){
  sources[id]={kind:()=>t('自己的签到','Your Check-in'),title:()=>t('签到 · '+zhDate,'Check-in · '+enDate),time:()=>t(zhDate,enDate)+' · Asia/Singapore',body:()=>t(zhNote,enNote),facts:()=>t('记录时：'+zhLabels,'Recorded: '+enLabels),id:'synthetic-'+id,eligible:id!=='checkinOld'};
}
const checkInIds=['checkin',...checkInFixtures.map(row=>row[0])];
const fixtureNow=Date.parse('2026-10-25T16:40:00+08:00');
const fixtureCutoff=Date.parse('2026-10-25T16:35:00+08:00')+90*86400000;
function followValidation(){
  if(state.topic!=='follow'||state.deletedTopics.includes('follow')||state.sourceState!=='current')return 'source';
  if(state.zone!=='Asia/Singapore')return 'zone';
  const due=Date.parse(state.followTime+':00+08:00');
  if(!Number.isFinite(due)||due<=fixtureNow||due>=fixtureCutoff)return 'time';
  if(state.quietEnabled){const minutes=v=>{const [h,m]=v.split(':').map(Number);return h*60+m;};const start=minutes(state.quietStart),end=minutes(state.quietEnd),at=minutes(state.followTime.slice(11));if(start===end)return 'quiet-invalid';if(start<end?at>=start&&at<end:at>=start||at<end)return 'quiet';}
  return null;
}
function selectionBlocked(){return state.selectionConflict||!state.selectionReviewed||state.sourceState!=='current'&&activeRefs().length>0;}
let readObserver,readSizeObserver;
function observeRead(){
  readObserver?.disconnect();readSizeObserver?.disconnect();
  const target=document.querySelector('[data-read-target]');if(!target)return;
  const observer=new IntersectionObserver(entries=>{
    // The implicit root clips through #screen and #phone to the browser viewport.
    // A phone preview entirely below the window has no readable intersection.
    for(const e of entries)if(document.visibilityState==='visible'&&e.target.isConnected&&e.target===document.querySelector('[data-read-target]')&&e.isIntersecting&&e.boundingClientRect.height>0&&e.intersectionRect.width>0&&e.intersectionRect.height>=Math.min(40,e.boundingClientRect.height)&&state.view==='proactive'&&state.proactiveState==='valid'){
      state.readObserved=true;if(state.readState==='unread')state.readState='pending';
      const status=$('read-status');if(status)status.textContent=readCopy();
      const ack=document.querySelector('[data-action="ack-read"]');if(ack)ack.disabled=false;
    }
  },{root:null,threshold:[0,.1,.5,1]});readObserver=observer;observer.observe(target);
  // A zero-area and a fully visible positive-area entry can both have ratio 1.
  // Reobserve a resized message even when no intersection threshold changes.
  readSizeObserver=new ResizeObserver(()=>{
    if(readObserver!==observer||!target.isConnected)return;
    observer.unobserve(target);observer.observe(target);
  });readSizeObserver.observe(target);
}
// Returning to a visible document must recheck unchanged geometry too.
document.addEventListener('visibilitychange',observeRead);
function readCopy(){return state.readState==='synced'?t('已读 · 已同步（模拟）','Read · Synced (demo)'):state.readObserved?t('已打开，阅读状态尚未同步。','Opened. Read status has not synced yet.'):t('未读 · 等待消息实际显示','Unread · Waiting for the message to become visible');}

function go(view, changes={}) {
  state.feedback=''; Object.assign(state,changes,{view});
  history.pushState({view},'',`#${view}`); render(true);
}
function home() { if(state.deletedTopics.includes(state.topic))state.topic='fresh'; go('home'); }
function feedback(copy) {state.feedback=copy;render();}
function back() { if(history.state?.view && history.state.view!=='home') history.back(); else home(); }
window.addEventListener('popstate', (event) => {state.view=event.state?.view || 'home';state.feedback='';render(true);});
function setScenario(value) {
  state.phase='ready';state.feedback='';state.proactiveState='valid';state.sourceState='current';state.replyTarget=false;state.resultChecked=false;state.followStage='form';state.readState='unread';state.readObserved=false;state.unread=true;state.selectionConflict=false;state.historyDependent=false;state.historyExcluded=false;
  const map={return:'home',welcome:'welcome',proactive:'proactive',notification:'notification',unknown:'home',failed:'home',stale:'references','source-unknown':'references',deleted:'proactive',revoked:'proactive',offline:'proactive','home-entry':'home-entry','checkin-entry':'checkin-entry',followup:'followup','follow-unknown':'followup','contact-off':'settings','contact-paused':'settings','provider-disabled':'settings','provider-unknown':'settings','follow-expired':'followup','selection-conflict':'references','read-unknown':'proactive','zone-unknown':'followup'};
  if(value==='unknown'){state.phase='unknown';state.draftText=t('我想聊的是休息，不是制定学习计划。','I mean rest, not a study plan.');}
  if(value==='failed'){state.phase='failed';state.processing='local';state.draftText=t('今天先聊一会儿。','Let’s just talk for a little while.');}
  if(value==='stale'||value==='source-unknown'){state.sourceState=value==='stale'?'changed':'unknown';state.refs=['checkin'];state.excluded=[];state.selectionReviewed=false;state.referenceReturn='home';}
  if(['deleted','revoked','offline'].includes(value)){state.proactiveState=value;if(value==='revoked')state.sourceState='revoked';if(value==='deleted')state.sourceState='deleted';}
  if(['followup','follow-unknown','follow-expired','zone-unknown'].includes(value)){state.topic='follow';state.followConfirmed=false;state.zoneConfirmed=false;}
  if(value==='follow-unknown'){state.enabled=true;state.categories.follow=true;state.followStage='unknown';state.intentReadback=false;}
  if(value==='follow-expired')state.followStage='expired';
  if(value==='zone-unknown')state.zone='unknown';
  if(value==='contact-off'){state.enabled=false;state.paused=false;state.categories.follow=false;}
  if(value==='contact-paused'){state.enabled=true;state.categories.follow=true;state.paused=true;}
  if(value==='provider-disabled'||value==='provider-unknown')state.provider=value==='provider-disabled'?'disabled':'unknown';
  if(value==='selection-conflict'){state.refs=['checkin'];state.excluded=['checkin'];state.historyDependent=true;state.selectionConflict=true;state.selectionReviewed=false;state.referenceReturn='home';state.draftText=t('我想聊聊怎样休息。','I would like to talk about rest.');}
  if(value==='read-unknown')state.readState='unknown';
  go(map[value]||'home');
}

function header() {
  const names={followup:t('稍后跟进','Follow up later'),'switch-confirm':t('切换会话','Switch conversation'),home:t('AI 伙伴','AI companion'),welcome:t('AI 伙伴','AI companion'),proactive:t('一条跟进','A check-in'),why:t('为什么收到','Why this message'),references:t('本次参考','References for this reply'),'saved-references':t('这条消息的来源','Sources for this message'),attach:t('附加记录','Attach a record'),source:t('来源详情','Source details'),history:t('历史与查找','History & search'),settings:t('主动联系','Proactive contact'),processing:t('处理位置','Processing location'),privacy:t('历史与隐私','History & privacy'),'new-topic':t('开始新话题','Start a new topic'),delete:t('删除整段会话','Delete conversation'),notification:t('通知预览','Notification preview'),'home-entry':t('首页','Home'),'checkin-entry':t('签到详情','Check-in details'),'event-entry':t('活动详情','Event details'),searchResult:t('查找结果','Search result')};
  const main=state.view==='home'||state.view==='welcome';
  $('app-header').innerHTML=`<div class="app-header">${main?'':button('back',icon('back'),'icon-button',`aria-label="${t('返回上一步','Go back')}"`)}<div class="title"><h2 ${main?'class="brand"':''}>${main?'ENMORI':names[state.view]||'ENMORI'}</h2><p>${main?t('AI 伙伴 · 这里可以慢慢说','AI companion · Room to talk'):t('合成演示 · 不更改真实数据','Synthetic demo · No real data changes')}</p></div>${main?button('history',icon('history'),'icon-button',`aria-label="${t('历史与查找','History and search')}"`):''}</div>`;
}
function proactiveCard() {
  if(state.deletedTopics.includes('follow'))return '';
  if(state.proactiveState!=='valid')return notice(t('有一条旧联系已不可用，请打开后查看当前状态。','A previous message is unavailable. Open it to see the current state.'),'warn')+button('proactive',t('查看状态','View status'),'full');
  return `<article class="card tint">${pill(state.unread?t('● 未读 · 你约好的跟进','● Unread · Your requested follow-up'):t('已读 · 你约好的跟进','Read · Your requested follow-up'))}<h3>${t('还想给下周留一点空白吗？','Still want to make room for next week?')}</h3><p class="small">${t('今天 16:30 · 你昨天明确约好的跟进','Today, 16:30 · A follow-up you requested yesterday')}</p>${button('proactive',t('打开这条消息','Open message'),'primary full')}</article>`;
}
function homeView() {
  let content='';
  if(state.mode==='A') {
    content=`<p class="section-eyebrow">${t('多对话 · 候选 A','Multiple conversations · Option A')}</p><h2 class="hero-title">${t('从哪一段继续？','Where shall we continue?')}</h2>${proactiveCard()}<div class="section-head"><h3>${t('你的对话','Your conversations')}</h3>${button('new-topic',t('新对话','New conversation'),'text-button',busy()?'disabled':'')}</div>${historyRows()}`;
  } else if(state.mode==='B') {
    content=`<p class="section-eyebrow">${t('连续时间线 · 候选 B','Continuous timeline · Option B')}</p>${proactiveCard()}<div class="date-separator">${t('昨天 · 两个不同的话题','Yesterday · Two different topics')}</div><div class="message user">${t('周末也许想出去走走。','Maybe I’d like to take a walk this weekend.')}</div><div class="message assistant">${t('你更喜欢安静一点，还是有一点热闹的地方？','Would you prefer somewhere quiet or a little more lively?')}</div><div class="message user">${t('先换个话题，我最近想留些休息时间。','Changing the subject — I’d like more time to rest.')}</div>${notice(t('单一入口的候选演示。历史管理、整段删除和原有记录能力仍保留；尚未合并数据。','Single-entry concept. History management, whole-conversation deletion and existing records remain available. No data is merged.'))}${button('privacy',t('历史管理与删除','History management & deletion'),'full')}`;
  } else {
    content=`<p class="section-eyebrow">${t('星期日，下午好','A quiet Sunday afternoon')}</p><h2 class="hero-title">${t('我们接着说。','Let’s pick up here.')}</h2>${proactiveCard()}<div class="topic-strip"><span>${esc(topicName())} · ${t('当前话题','Current topic')}</span>${button('new-topic',t('新话题','New topic'),'text-button',busy()?'disabled':'')}</div>${state.topic==='fresh'?notice(t('这是新的会话边界。不会自动附加旧话题；原会话仍在历史中。','A new conversation boundary. Previous topics are not attached automatically; they remain in History.')):`<div class="message user">${t('先不做复杂计划，我只想给自己一点休息时间。','No complicated plan for now. I just want a little time to rest.')}</div><div class="message assistant"><div class="message-label">ENMORI · ${t('示例回复','Sample reply')}</div>${t('可以。我们就从你现在想说的开始，不用急着把它变成任务。','Of course. We can start with what’s on your mind, without turning it into a task.')}</div>`}`;
  }
  if(state.sentText){content+=`<div class="message user">${esc(state.sentText)}</div><div class="message assistant"><div class="message-label">${t('人工编写的演示回复 · 未调用模型','Authored sample reply · No model call')}</div>${t('明白，你说的是休息。刚才的学习计划不适用于这次讨论。','Understood — you mean rest. The earlier study plan does not apply to this discussion.')}</div>`;}
  if(state.topic==='walk'&&state.mode==='C')content=`<p class="section-eyebrow">${t('当前话题','Current topic')}</p><h2>${topicName()}</h2><div class="message user">${t('周末想散步。','I would like a weekend walk.')}</div><div class="message assistant">${t('你希望走多久？','How long would you like to walk?')}</div>${button('new-topic',t('新话题','New topic'),'full',busy()?'disabled':'')}`;
  if(state.mode==='B'&&state.deletedTopics.includes('follow'))content=notice(t('原会话已删除。时间线不会重建它，其他会话仍可在历史管理中查看。','The original conversation was deleted and will not be recreated. Other conversations remain in history management.'))+button('privacy',t('历史管理与删除','History management & deletion'),'full');
  if(state.mode==='C'&&state.topic==='follow'&&!state.deletedTopics.includes('follow'))content+=`<div class="message user"><div class="message-label">${t('已保存 · 10月25日 16:35','Saved · 25 Oct, 16:35')}</div>${sources.schedule.body()}${button('followup',t('就这条消息约一次跟进','Follow up once on this message'),'full',busy()||followBusy()||state.sourceState!=='current'?'disabled':'')}</div>`;
  if(state.followStage!=='form')content+=button('intent-status',t('查看这次预约状态','Check this follow-up'),'full');
  return content+phaseView();
}
function welcomeView() {
  return `<div class="empty-mark">${icon('leaf')}</div><p class="section-eyebrow">${t('从一句话开始','One message is enough')}</p><h2 class="hero-title">${t('这里，留一点时间<br>给自己。','A little space<br>for you.')}</h2><p class="lead">${t('想说的时候写下来。你可以先了解这次会用到什么，再决定要不要开始。','Write whenever you feel ready. You can see what will be used before deciding to begin.')}</p><div class="card"><h3>${t('先由你决定','You choose first')}</h3><p>${t('当前聊天使用你发的消息、同会话有限历史及获准的人设表达。','Current chat uses your message, limited history in the same conversation, and permitted Persona presentation.')}</p><p class="small">${t('本人近 7 天的签到可手选供本次本地回复使用。明确跟进默认关闭，需另行确认。','Hand-select your own Check-ins from the last 7 days for one local reply. Requested follow-ups start off and need separate confirmation.')}</p>${button('processing',t('查看处理位置与数据范围','See processing & data scope'),'full')}</div><label class="choice-row"><input id="demo-consent" type="checkbox" ${state.consentDemo?'checked':''}><span>${t('演示：我已查看可选数据使用说明','Demo: I have reviewed optional data use')}<small>${t('只切换原型状态，不记录真实同意。','Only changes this prototype. No real consent is recorded.')}</small></span></label>${button('start',t('进入聊天演示','Enter chat demo'),'primary full',state.consentDemo?'':'disabled')}<div class="divider"></div>${button('home-entry',t('暂不开始，返回首页','Not now, return Home'),'text-button full')}`;
}
function phaseView() {
  if(state.phase==='pending')return `${notice(t('正在准备回复。没有实时流式输出。草稿保留，重复发送已停用。','Preparing a reply. This is not a live stream. Your draft is kept; duplicate sending is disabled.'))}${button('cancel',t('取消等待','Cancel waiting'),'full')}<div class="card warm"><p class="small">${t('原型控制：手动选择模拟结果','Prototype control: select a simulated outcome')}</p><div class="row">${button('finish',t('模拟完成','Complete'))}${button('unknown',t('模拟未知','Unknown'))}</div></div>`;
  if(['unknown','cancelUnknown'].includes(state.phase))return `${notice(`<strong>${t('结果尚未确认','Result not confirmed')}</strong><p>${t('这条消息可能已经保存。取消等待不等于撤回保存；不要再次发送同一请求。草稿和已有消息仍保留。','This message may already be saved. Stopping the wait does not undo a save. Do not resend the same request. Your draft and earlier messages remain.')}</p>`,'warn')}<div class="stack">${button('check-result',state.resultChecked?t('已核对，仍未确定','Checked; still unresolved'):t('核对结果','Check result'),'primary',state.resultChecked?'disabled':'')}${button('leave',t('直接离开，不重试','Leave without retrying'))}</div>`;
  if(state.phase==='failed')return `${notice(`<strong>${t('本地服务未完成请求','Local service did not complete the request')}</strong><p>${t('本例已确认没有发送效果。草稿保留。仍为本地处理，不会自动转发云端。','This fixture confirms no send effect. Your draft is kept. Processing remains local; nothing is forwarded to the cloud automatically.')}</p>`,'error')}${button('retry-confirmed',t('确认后重新发送（模拟）','Send again after confirmation (demo)'),'full')}`;
  if(state.phase==='deleteUnknown')return notice(t('删除结果尚未确认。会话内容暂不显示；再次核对原操作，不新建副本、不恢复旧消息。','Deletion is not confirmed. Conversation content stays hidden. Recheck the original operation without recreating or restoring messages.'),'warn')+button('check-delete',t('再次核对删除','Check deletion again'),'full');
  return '';
}
function proactiveView() {
  if(state.deletedTopics.includes('follow'))return notice(t('这段会话已删除，消息不再可读。不会重建会话。','This conversation was deleted. Its message is unavailable and the conversation will not be recreated.'),'warn');
  if(state.proactiveState!=='valid'){
    const copy={deleted:t('相关来源已删除，这条消息内容已不可用。','A required source was deleted. This message is unavailable.'),revoked:t('相关数据用途许可已撤回，这条消息内容已不可用。','Permission for the related data use was withdrawn. This message is unavailable.'),offline:t('离线后到达时已超过有效时间，不再继续这条旧提醒。','The message arrived after its validity window while the device was offline. This old reminder is not continued.'),expired:t('这次跟进已过期，不会补发。','This follow-up expired and will not be sent later.')};
    return `${pill(t('状态演示 · 当前不可用','State demo · Unavailable'),'warn')}<h2>${t('这条联系有变化','This message has changed')}</h2>${notice(copy[state.proactiveState],'warn')}<p class="small">${t('不重建来源或旧回复，不把点击通知当成可读取私密内容的权限。已交付到平台的通知能否移除取决于实际投递机制。','Do not reconstruct source content or old replies. A notification tap does not authorize reading private content. Removing a notification already handed to a platform depends on its delivery mechanism.')}</p>${button('home',t('回到 AI 主入口','Return to AI'),'primary full')}${button('settings',t('管理主动联系','Manage proactive contact'),'text-button full')}`;
  }
  return `<span class="status-pill" id="read-status">${readCopy()}</span><p class="meta">${t('今天 16:30 · 新加坡时间','Today, 16:30 · Singapore time')}</p><h2 class="hero-title">${t('还想给下周<br>留一点空白吗？','Still want to make<br>room for next week?')}</h2><div class="message assistant" data-read-target>${t('你昨天希望今天这个时候再聊聊休息安排。现在还想接着说吗？如果不想，也可以先放下。','Yesterday you asked to check in around this time about making room for rest. Would you like to talk about it now? It’s also fine to leave it for another time.')}</div><p class="small">${t('人工编写的合成主动消息 · 目标能力待实现','Authored synthetic proactive message · Target capability')}</p>${button('why',t('为什么收到这条消息？','Why did I receive this?'),'full')}${button('message-references',t('查看这条消息的来源','View sources for this message'),'reference-link')}${button('ack-read',t('模拟阅读状态已同步','Simulate read status synced'),'text-button full',state.readObserved?'':'disabled')}<div class="divider"></div><p class="small">${t('回复将留在“明天的节奏”。阅读不会替你发送，也不会启动新话题。','Your reply stays in “Tomorrow’s pace”. Reading does not send a reply or start another topic.')}</p>${button('reply',t('回复这条跟进','Reply to this follow-up'),'primary full')}${button('settings',t('暂停或关闭主动联系','Pause or turn off proactive contact'),'text-button full')}`;
}
function whyView() {
  if(state.proactiveState!=='valid'||state.deletedTopics.includes('follow'))return proactiveView();
  return `<p class="section-eyebrow">${t('有原因，也能控制','A reason you can inspect')}</p><h2>${t('因为你约了这个时间','Because you chose this time')}</h2><div class="card"><p>${sources.follow.body()}</p><p class="small">${sources.follow.time()}</p>${button('source-follow',t('查看原始要求','View original request'),'full')}</div><dl class="inline-facts"><dt>${t('类别','Category')}</dt><dd>${t('你明确要求的跟进','Requested follow-up')}</dd><dt>${t('时间','Time')}</dt><dd>25 Oct · 16:30 · Asia/Singapore</dd><dt>${t('归属','Topic')}</dt><dd>${t('明天的节奏','Tomorrow’s pace')}</dd></dl>${notice(t('演示假设：生成前与投递前均通过权限、时效、频率和安静时段核对。实际机制由后端实现并单独验证。','Demo assumption: permissions, validity, limits and quiet hours pass before generation and delivery. The actual backend mechanism needs separate verification.'))}${button('settings',t('调整联系时间','Adjust contact timing'),'full')}`;
}
function activeRefs(){return state.refs.filter((id)=>!state.excluded.includes(id));}
function referencesView() {
  const bad=state.sourceState!=='current';
  return `<p class="lead">${t('只用于这一次本地回复。手选本人近 7 天内最多 5 条签到；查看历史来源不会自动选择它。','For this local reply only. Hand-select up to 5 of your own Check-ins from the last 7 days. Viewing a past source does not select it.')}</p>${pill(t('本次选择 · '+state.refs.length+' / 5','Selected · '+state.refs.length+' / 5'))}${bad?notice(t('来源未通过当前核对。查看变化或明确排除，保留草稿。','A source did not pass the current check. Review or explicitly exclude it; your draft is kept.'),'warn'):''}${state.refs.length?state.refs.map(id=>sourceCard(id,bad)).join(''):notice(t('未选择签到。不会自动读取其他签到。','No Check-ins selected. Other Check-ins will not be read automatically.'))}${button('attach',`${icon('plus')} ${t('手选自己的签到','Choose your Check-ins')}`,'full')}${state.selectionConflict?`<div class="card warm"><h3>${t('先审阅关联历史','Review dependent history first')}</h3><p>${t('已选历史中的一组旧问答依赖被排除的签到，当前选择冲突。草稿和原历史保留。','A selected past question-and-answer pair depends on the excluded Check-in. The selection conflicts. Your draft and original history are kept.')}</p>${button('exclude-history',t('本次也排除这组关联问答','Also exclude this dependent pair for this reply'),'full')}</div>`:''}<div class="divider"></div>${notice(t('排除包含同一来源的所有投影与依赖历史；不能从旧回复绕回。仅本次不用，不删除记录或旧消息，也不改你主动输入的文字。','Exclusion covers all projections and dependent history of that source. It cannot return through an old reply. This affects this request only; records, old messages and your typed text remain.'))}${state.historyExcluded?pill(state.selectionReviewed?t('关联问答已明确排除 · 本次已核对','Dependent pair excluded · Scope checked'):t('关联问答已明确排除 · 仍需重新核对','Dependent pair excluded · Recheck still needed')):''}${button('review-selection',state.selectionReviewed?t('本次范围已核对（模拟）','Scope checked (demo)'):t('核对本次选择（模拟）','Check this selection (demo)'),'full',state.selectionReviewed?'disabled':'')}${button('refs-done',t('完成选择，返回草稿','Done, return to draft'),'primary full',selectionBlocked()?'disabled':'')}`;
}

function savedReferencesView(){
  if(state.proactiveState!=='valid'||state.deletedTopics.includes('follow'))return proactiveView();
  return `<p>${t('这条已保存消息使用了你当时的明确要求。查看来源不将它加入下一次请求。','This saved message used your explicit request at the time. Viewing its source does not add it to your next request.')}</p><div class="card"><h3>${t('你的原始要求','Your original request')}</h3><p class="small">${sources.follow.time()}</p>${button('saved-source-follow',t('查看受权原消息','Open authorized source message'),'full')}</div>${button('back',t('返回跟进','Back to follow-up'),'primary full')}`;
}

function sourceCard(id,bad=false) {
  const source=sources[id], excluded=state.excluded.includes(id), unavailable=bad&&['deleted','revoked','unknown'].includes(state.sourceState);
  return `<article class="card"><div class="source-heading"><div><p class="section-eyebrow">${source.kind()}</p><strong>${unavailable?(state.sourceState==='unknown'?t('来源暂时无法核对','Source check unavailable'):t('来源不可用','Source unavailable')):source.title()}</strong></div>${pill(excluded?t('本次排除','Excluded'):bad?t('需核对','Check needed'):t('本次使用','Included'),bad?'warn':'')}</div>${unavailable?'':`<p class="small">${source.time()}</p><p class="small">${source.facts()}</p>`}<div class="source-controls">${button(`source-${id}`,t('查看来源','View source'),'',unavailable&&state.sourceState!=='unknown'?'disabled':'')}${button(`exclude-${id}`,excluded?t('重新纳入','Include again'):t('本次排除','Exclude this time'),'',`aria-pressed="${excluded}"`)}</div></article>`;
}
function attachView() {
  return `<h2>${t('这次想聊哪几条？','Which records would you like to discuss?')}</h2><p class="small">${t('自己的签到 · 10月18日 16:40 至 10月25日 16:40，含边界 · Asia/Singapore。最多选择 5 条；没有默认选择。','Your Check-ins · 18 Oct, 16:40 through 25 Oct, 16:40, inclusive · Asia/Singapore. Select up to 5; none are preselected.')}</p>${pill(state.refs.length+' / 5')}${checkInIds.map(id=>{const x=sources[id],selected=state.refs.includes(id);return `<article class="card"><h3>${x.title()}</h3><p class="small">${x.time()}</p><blockquote>${x.body()}</blockquote><p class="small">${x.facts()}</p>${button('attach-'+id,!x.eligible?t('超出 7 天范围','Outside the 7-day window'):selected?t('取消选择','Remove selection'):t('选择这条签到','Select this Check-in'),'full',`aria-pressed="${selected}" ${!x.eligible||!selected&&state.refs.length>=5?'disabled':''}`)}</article>`;}).join('')}${notice(t('仅使用 Note 引文、记录时的 Mood / Activity 和发生时间。没有天气、地点或坐标；不会用于之后的回复或自动跟进。','Only the Note quotation, recorded Mood / Activity and occurrence time are used. No weather, place or coordinates; no later reply or automatic follow-up reuse.'))}${button('review-attachments',t('审阅本次选择','Review selected records'),'primary full')}`;
}

function sourceView() {
  const source=sources[state.sourceId]||sources.follow;
  const sourceStatus=state.sourceContext==='saved'?(state.proactiveState==='valid'?'current':state.sourceState):state.sourceState;
  if(sourceStatus==='unknown')return notice(t('未能确认来源当前是否仍有效。这不等于记录不存在；不展示旧内容，也不会将它加入发送。','The source’s current validity could not be confirmed. This does not mean the record is missing. Old content is not displayed or sent.'),'warn')+button('retry-source',t('重新核对（模拟仍失败）','Check again (simulate failure)'),'full');
  if(state.sourceId==='follow'&&state.deletedTopics.includes('follow'))return notice(t('原会话已删除，不能重新读取这条要求。','The source conversation was deleted. Its request cannot be read again.'),'warn');
  if(['deleted','revoked'].includes(sourceStatus))return notice(t('来源不可用，未展示缓存内容。','The source is unavailable. Cached content is not displayed.'),'warn');
  return `${pill(t('受信 fixture 定位 · 合成来源','Trusted fixture target · Synthetic'))}<h2>${source.title()}</h2><p class="small">${source.kind()} · ${source.time()}</p>${sourceStatus==='changed'?notice(t('这条记录刚更新。下方是模拟当前版本，旧版本不得继续进入请求。','This record was updated. The simulated current version is shown below; the old version must not enter the request.'),'warn'):''}<div class="card"><p>${sourceStatus==='changed'&&state.sourceId==='checkin'?t('更新后的记录：散步后想休息，暂时不想安排活动。','Updated record: I wanted to rest after the walk, without planning an activity.'):source.body()}</p><p class="small">${source.facts()}</p></div><p class="small">${t('此入口由固定合成来源映射打开；没有读取或接受模型生成的 URL / ID。真实版必须重新核对 owner、用途与来源版本。','This entry uses a fixed synthetic source map, never a model-generated URL or ID. The real version must recheck ownership, purpose and version.')}</p>${sourceStatus==='changed'?button('accept-current',t('使用已核对的当前版本（模拟）','Use checked current version (demo)'),'primary full'):button('back',t('返回上一页','Return'),'full')}`;
}
function historyRows(){return (state.deletedTopics.length?notice(t('已删除的合成会话不会恢复；其他会话保留。','Deleted synthetic conversations cannot be restored; other conversations remain.')):'')+['follow','walk'].filter(id=>!state.deletedTopics.includes(id)).map((id)=>button(`history-${id}`,`<span class="list-body"><strong>${id==='follow'?t('对话 · 10月25日','Conversation · 25 Oct'):t('对话 · 10月23日','Conversation · 23 Oct')}</strong><small>${id==='follow'?t('当前会话 · 明天的节奏（演示标签）','Current · Tomorrow’s pace (demo label)'):t('周末散步（演示标签）','Weekend walk (demo label)')}</small></span>${icon('chevron')}`,'list-card',busy()?'disabled':'')).join('');}
function historyView() {
  const sample=state.topic==='follow'&&!state.deletedTopics.includes('follow')?t('我想给自己一点休息时间。','I want a little time to rest.'):state.topic==='walk'&&!state.deletedTopics.includes('walk')?t('周末想散步。','I would like a weekend walk.'):'';
  const match=Boolean(sample)&&(!state.query||sample.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()));
  return `<h2>${t('找回一段对话','Find your way back')}</h2>${notice(t('搜索当前话题中已加载、仍可用的消息。跨会话全文搜索待合同确认。历史标签为演示，不是已有服务端标题。','Search loaded, available messages in the current topic. Cross-conversation full-text search needs a contract. Labels here are demonstrations, not existing server titles.'))}<label for="search-query">${t('在当前话题中查找','Find in current topic')}</label><input id="search-query" type="search" value="${esc(state.query)}" placeholder="${t('试试「休息」','Try “rest”')}" ${busy()?'disabled':''}><div id="search-results">${state.query?(match?button('search-result',`<span class="list-body"><strong>${esc(sample)}</strong><small>${t('1 个匹配 · 当前已加载范围','1 match · Currently loaded range')}</small></span>`,'list-card'):notice(t('已加载消息中没有匹配。更早的消息尚未全部查找。','No match in loaded messages. Earlier messages have not all been searched.'))):''}</div>${button('load-earlier',t('加载更早消息（模拟失败）','Load earlier (simulate failure)'),'text-button full',busy()?'disabled':'')}<div class="section-head"><h3>${t('历史会话','Conversation history')}</h3></div>${historyRows()}${button('new-topic',t('重新开始一个话题','Start a new topic'),'full',busy()?'disabled':'')}${button('privacy',t('管理历史与删除','Manage history & deletion'),'text-button full')}`;
}
function newTopicView() {
  return `<h2>${t('给新话题一个边界','Give the new topic a boundary')}</h2><p>${t('原会话保留在历史中。新的回复不会自动带入旧话题；你可以之后主动附加需要的记录。','The original conversation remains in History. New replies will not automatically carry over the old topic. You can attach relevant records explicitly.')}</p>${draft()?notice(t('当前未发送草稿会保留在输入框，供你修改后再发送。原型不会把它自动保存到服务器。','The unsent draft stays in the composer for you to edit before sending. This prototype does not save it to a server.')):''}${notice(t('“新话题”不是删除，也不是撤回已获许可的其他数据用途。本例按既有新会话边界演示。','A new topic is not deletion or withdrawal of other authorized data uses. This example follows the existing new-conversation boundary.'))}${button('confirm-new',t('开始新话题','Start new topic'),'primary full',busy()?'disabled':'')}${button('back',t('继续当前话题','Stay in current topic'),'text-button full')}`;
}

function followupView() {
  const stage=state.followStage,when=esc(state.followTime.replace('T',' '))+' · '+esc(state.zone);
  const status={
    'settings-pending':[t('正在确认联系设置…','Confirming contact settings…'),t('设置确认后，才会创建这次预约。不会开启系统推送。','This follow-up will be created only after settings are confirmed. Push stays off.')],
    'settings-unknown':[t('设置结果尚未确认','Settings are not confirmed'),t('先核对设置，再创建预约。输入和聊天草稿仍保留。','Check settings before creating the follow-up. Your inputs and chat draft are kept.')],
    creating:[t('设置已确认，正在确认预约…','Settings confirmed. Confirming the follow-up…'),t('不要重复提交。创建时不会立即调用模型。','Do not submit again. Creating the follow-up does not call the model immediately.')],
    unknown:[t('预约结果尚未确认','Follow-up status is not confirmed'),t('可能已保存。只核对原预约，不换一个新请求再创建。','It may have been saved. Check the original follow-up; do not create another request.')],
    scheduled:[t('已预约一次（模拟）','Scheduled once (demo)'),t('到时重新核对来源、许可、安静时段和频率；过期不补发。','Source, permission, quiet hours and limits will be rechecked. Expired work is not replayed.')],
    cancelling:[t('正在取消这次预约…','Cancelling this follow-up…'),t('等待明确结果，当前仍不能显示为已取消。','Wait for a confirmed result before treating it as cancelled.')],
    'cancel-unknown':[t('取消结果尚未确认','Cancellation is not confirmed'),t('保留原预约状态，核对结果；不要重复提交。','Keep the original follow-up state and check the result; do not submit again.')],
    'dispatch-unknown':[t('可能已提交，无法保证撤回','Submission may have begun; recall is not guaranteed'),t('不删除会话，也不把未知当成未发送。','The conversation stays. An unknown outcome is not a confirmed no-send.')],
    cancelled:[t('这次预约已取消（模拟）','This follow-up was cancelled (demo)'),t('重新开启联系也不会恢复这次预约。','Turning contact on again will not restore this follow-up.')],
    expired:[t('这次跟进已过期','This follow-up expired'),t('不会补发，也不会重新打开已过期话题。','It will not be sent later or reopen an expired topic.')]
  };
  if(stage!=='form'){
    const copy=status[stage];let controls='';
    if(stage==='settings-pending')controls=button('settings-confirmed',t('模拟设置已保存','Simulate settings saved'),'primary full')+button('settings-unknown',t('模拟设置结果未知','Simulate unknown settings result'),'full');
    if(stage==='settings-unknown')controls=button('check-settings',t('核对设置（模拟仍未知）','Check settings (still unknown)'),'full')+button('settings-confirmed',t('模拟核对到已保存设置','Simulate readback of saved settings'),'full');
    if(stage==='creating')controls=button('intent-saved',t('模拟已预约','Simulate scheduled'),'primary full')+button('intent-unknown',t('模拟预约结果未知','Simulate unknown follow-up result'),'full');
    if(['unknown','cancel-unknown','dispatch-unknown'].includes(stage))controls=button('check-intent',t('核对这次预约','Check this follow-up'),'primary full')+(stage==='unknown'?button('intent-saved',t('模拟核对到原预约已保存','Simulate original receipt found'),'full'):'');
    if(stage==='scheduled')controls=button('cancel-intent',t('取消这次预约','Cancel this follow-up'),'full')+button('settings',t('暂停或关闭联系','Pause or turn off contact'),'text-button full');
    if(stage==='cancelling')controls=button('intent-cancelled',t('模拟明确已取消','Simulate confirmed cancellation'),'full')+button('intent-cancel-unknown',t('模拟取消结果未知','Simulate unknown cancellation'),'full')+button('intent-dispatch-unknown',t('模拟投递可能已开始','Simulate dispatch may have begun'),'full');
    return `${pill(t('合成操作状态 · 没有真实写入','Synthetic operation · No real write'))}<h2>${copy[0]}</h2>${notice(copy[1],stage.includes('unknown')?'warn':'')}<p>${when}</p>${state.intentReadback?notice(t('已核对原预约，结果仍未确认。未重发。','The original follow-up was checked. Its outcome remains unknown. Nothing was resent.'),'warn'):''}${controls}${button('home',t('回到 AI 伙伴','Return to AI'),'text-button full')}`;
  }
  const invalid=followValidation();
  if(invalid==='source')return notice(t('已保存的原消息当前不可用。保留草稿，不展示旧正文。','The saved source message is currently unavailable. Your draft is kept; old content is not displayed.'),'warn')+button('home',t('返回','Return'),'full');
  const errors={source:t('无法核对已保存的原消息。先恢复当前受权来源。','The saved source message could not be verified. Restore an authorized current source first.'),zone:t('时区尚未确认。保留输入，暂不预约。','The time zone is not confirmed. Inputs are kept; scheduling is paused.'),time:t('请选择未来、且在原话题有效期内的时间。','Choose a future time within the original topic’s validity.'),quiet:t('所选时间在安静时段内。请另选时间，再次确认。','This time falls within quiet hours. Choose another time and confirm it.'),'quiet-invalid':t('安静时段开始与结束不能相同。请先核对设置。','Quiet hours cannot start and end at the same time. Review settings first.')};
  return `${pill(t('一次本地跟进 · 合成演示','One local follow-up · Synthetic demo'))}<h2>${t('约一个你愿意的时间','Choose a time that suits you')}</h2><div class="card"><p class="small">${t('已保存的本人消息 · ','Your saved message · ')}${sources.schedule.time()}</p><p>${sources.schedule.body()}</p><p class="small">${t('原话题：','Original topic: ')}${esc(topicName())}</p></div><label for="follow-time">${t('日期与当地时间','Date and local time')}</label><input id="follow-time" type="datetime-local" value="${state.followTime}"><p>${t('IANA 时区：','IANA time zone: ')}<strong>${esc(state.zone)}</strong></p>${state.zone==='Asia/Singapore'?`<p class="small">UTC+08:00 · ${Number.isFinite(Date.parse(state.followTime+':00+08:00'))?new Date(state.followTime+':00+08:00').toISOString():t('时间无效','Invalid time')}</p>`:button('keep-zone',t('明确保留 Asia/Singapore','Keep Asia/Singapore explicitly'),'full')}${invalid?notice(errors[invalid],'warn'):''}${invalid==='quiet'?button('propose-morning',t('改选安静时段结束时刻，再确认','Choose the end of quiet hours, then confirm'),'full'):''}${state.paused?notice(t('联系已暂停。先审阅设置并恢复，才能预约。','Contact is paused. Review settings and resume before scheduling.'),'warn')+button('settings',t('查看暂停设置','Review pause settings'),'full'):''}<label class="choice-row"><input id="zone-confirm" type="checkbox" ${state.zoneConfirmed?'checked':''}><span>${t('我已确认这个时区与 UTC 时刻','I confirm this time zone and UTC instant')}</span></label><label class="choice-row"><input id="follow-confirm" type="checkbox" ${state.followConfirmed?'checked':''}><span>${t('允许就这条要求，在此时间联系一次','Allow one follow-up on this request at this time')}<small>${state.enabled?t('使用现有明确跟进设置。','Use the current requested-follow-up settings.'):t('先按当前设置开启明确跟进：24 小时最多 1 次、间隔至少 8 小时；系统推送仍关闭。','First enable requested follow-ups with current settings: at most 1 per 24 hours, at least 8 hours apart. Push stays off.')}</small></span></label>${button('confirm-followup',state.enabled?t('确认预约（模拟）','Confirm follow-up (demo)'):t('开启明确跟进并预约（模拟）','Enable requested follow-ups and schedule (demo)'),'primary full',!invalid&&state.followConfirmed&&state.zoneConfirmed&&!state.paused?'':'disabled')}<p class="small">${t('此演示使用 Asia/Singapore。修改时间或时区后，请重新确认。','This demo uses Asia/Singapore. Confirm again after changing the time or zone.')}</p>${button('back',t('先不安排，保留聊天草稿','Not now; keep chat draft'),'text-button full')}`;
}

function switchConfirmView() {
  return `<h2>${t('切换前保留当前草稿？','Keep editing your draft?')}</h2><p>${t('打开另一段会话会放弃当前未发送草稿，包括从通知进入或回复其他话题。','Opening another conversation discards the unsent draft, including notification entry or replying in another topic.')}</p><div class="stack">${button('home',t('继续编辑','Keep editing'),'primary')}${button('confirm-switch',t('放弃草稿并继续','Discard draft and continue'),'danger')}</div>`;
}

function processingView() {
  return `<h2>${t('本次使用本地服务','This reply uses the local service')}</h2><div class="card tint"><h3>${t('本地模型 · 经 ENMORI 后端','Local model · Via ENMORI backend')}</h3><p>${t('不等于手机端计算或离线可用。失败不会自动转发云端。','This does not mean on-device or offline processing. Failure does not forward your content to the cloud.')}</p></div>${notice(t('本次范围：你发送的文字、当前获准人设，以及经过核对的同话题历史与本次手选签到。签到的本次许可仅限准确选中的来源，不能由旧回复再次引入其他记录。','Scope: your message, currently permitted Persona, checked same-topic history and Check-ins selected for this request. Check-in permission covers only those exact sources; old replies cannot bring other records back in.'))}<div class="card"><h3>${t('云端个人回复未启用','Cloud personal replies are not enabled')}</h3><p>${t('本轮明确跟进与手选签到仅供本地处理。没有云端切换或自动回退。','Requested follow-ups and selected Check-ins use local processing in this round. There is no cloud switch or automatic fallback.')}</p></div>${button('references',t('查看本次参考','Review this reply’s references'),'full')}${button('home',t('返回草稿','Return to draft'),'primary full')}`;
}

function settingsView() {
  return `${pill(t('已批准范围 · 仅合成设置','Approved scope · Synthetic settings only'))}<h2>${t('只在你愿意时联系','Only when you want it')}</h2><label class="choice-row"><input id="enabled" type="checkbox" ${state.enabled?'checked':''}><span><strong>${t('我明确要求的跟进','Follow-ups I request')}</strong><small>${state.enabled?t('已开启；每次仍要确认事项、时间与时区','On; each request still needs a confirmed source, time and zone'):t('当前关闭 · 不生成新的跟进','Off · No new follow-ups')}</small></span></label>${state.enabled?`<div class="row">${button('pause',state.paused?t('核对并恢复（模拟）','Review and resume (demo)'):t('暂停至明天 08:00','Pause until tomorrow at 08:00'))}${button('turn-off',t('关闭','Turn off'))}</div>${state.paused?notice(t('已暂停至 10月26日 08:00 · Asia/Singapore。恢复只重新核对仍有效的项，不补发过期积压。','Paused until 26 Oct, 08:00 · Asia/Singapore. Resume rechecks only still-valid work; expired backlog is not replayed.')):''}`:''}<div class="card"><h3>${t('本轮联系范围','Contact scope in this round')}</h3><p>${t('滚动 24 小时最多 1 次，间隔至少 8 小时，最多 3 个有效预约。','At most 1 contact in a rolling 24 hours, at least 8 hours apart, and at most 3 active follow-ups.')}</p><p class="small">${t('仅限你明确要求的跟进。签到、Going 活动不会自动触发联系。','Only follow-ups you explicitly request. Check-ins and Going events do not trigger contact automatically.')}</p></div><label class="choice-row"><input id="quiet-enabled" type="checkbox" ${state.quietEnabled?'checked':''}><span>${t('使用安静时段','Use quiet hours')}</span></label><div class="row"><div><label for="quiet-start">${t('开始','Start')}</label><input id="quiet-start" type="time" value="${state.quietStart}" ${state.quietEnabled?'':'disabled'}></div><div><label for="quiet-end">${t('结束','End')}</label><input id="quiet-end" type="time" value="${state.quietEnd}" ${state.quietEnabled?'':'disabled'}></div></div><label for="zone">${t('时间解析状态（合成）','Time-zone resolution (synthetic)')}</label><select id="zone"><option value="Asia/Singapore" ${state.zone==='Asia/Singapore'?'selected':''}>Asia/Singapore</option><option value="unknown" ${state.zone==='unknown'?'selected':''}>${t('设备时区变化，等待确认','Device zone changed; confirmation needed')}</option></select>${state.zone==='unknown'?notice(t('时区变化尚未解决，暂停创建和执行。不会按手机时区偷偷改期。','The time-zone change is unresolved. Creation and execution are held; no silent rescheduling to the device zone.'),'warn'):''}<div class="divider"></div><label class="choice-row"><input id="push" type="checkbox" ${state.push?'checked':''}><span><strong>${t('另行选择系统推送（模拟）','Opt into system push separately (demo)')}</strong><small>${t('默认关闭。选择只影响此演示，不会请求系统权限或发送通知。','Off by default. This choice affects only the demo; no permission request or notification is sent.')}</small></span></label>${notice(state.provider==='unknown'?t('暂时无法核对推送状态。不能当作已关闭或已启用。','Push status could not be checked. It is neither confirmed off nor confirmed on.'):t('系统推送当前不可用。请在 App 内查看实际保存的消息。','Push notifications are currently unavailable. Check the app for messages actually saved.'),state.provider==='unknown'?'warn':'')}<p class="small">${t('App 内同意、设备登记、系统权限与服务商状态分别核对。服务商接受不等于送达或已读。','Check in-app consent, device registration, OS permission and provider state separately. Provider acceptance is not delivery or reading.')}</p><label for="lockscreen">${t('锁屏内容','Lock-screen content')}</label><select id="lockscreen"><option value="generic" ${state.lockscreen==='generic'?'selected':''}>${t('仅显示“ENMORI 有一条新消息”','Only “A new message from ENMORI”')}</option><option value="hidden" ${state.lockscreen==='hidden'?'selected':''}>${t('不在锁屏显示','Hide on lock screen')}</option></select>${button('notification',t('查看模拟通知','Preview simulated notification'),'full')}<div class="divider"></div>${notice(t('关闭会取消未开始的工作；再开启不恢复旧预约。已保存会话保留。已经提交或结果未知的投递无法保证撤回。','Turning off cancels unstarted work; turning on again does not restore it. Saved conversations remain. Submitted or uncertain deliveries cannot be guaranteed recalled.'))}${button('save-settings',t('确认演示设置','Confirm demo settings'),'primary full',state.zone==='unknown'||state.quietEnabled&&state.quietStart===state.quietEnd?'disabled':'')}`;
}

function privacyView() {
  return `<h2>${t('历史仍由你控制','Your history, your control')}</h2><div class="card"><h3>${t('整段会话删除','Whole-conversation deletion')}</h3><p>${t('永久删除这段会话及其中所有消息。不会删除签到、活动或 Persona；没有回收站或恢复。','Permanently deletes this conversation and its messages. Check-ins, events and Persona remain. There is no Trash or Restore.')}</p>${button('delete',t('删除当前会话…','Delete current conversation…'),'danger full',busy()?'disabled':'')}</div><div class="card"><h3>${t('保留期保持现行规则','Existing retention rules remain')}</h3><p>${t('会话在最后一次成功保存消息后的 90 天到期，或在你先行删除时不可再访问。阅读不会延长保留期。','A conversation expires 90 days after its last successfully persisted message, or becomes inaccessible earlier when you delete it. Reading does not extend retention.')}</p><p class="small">${t('主动跟进与阅读均不推进旧话题的 90 天锚点。正常用户消息与已接受回复继续适用现行规则。','Proactive messages and reading do not advance the original 90-day anchor. Normal user messages and accepted replies keep the existing rule.')}</p></div>${button('history',t('查看历史会话','View conversation history'),'full')}${button('new-topic',t('只开新话题，保留原会话','Start new topic, keep old conversation'),'text-button full',busy()?'disabled':'')}`;
}
function deleteView() {
  return `<h2>${esc(t('删除整段当前会话：','Delete the current conversation: ')+topicName()+'？')}</h2>${notice(t('将删除整段合成会话和所有消息，无法撤销。其他签到、活动、意向和人设仍保留。','Deletes the whole synthetic conversation and every message, without undo. Other Check-ins, events, participation and Persona remain.'),'warn')}<p>${t('删除后相关跟进不可继续。已提交的通知无法保证追回。本原型不发出任何删除请求。','Related follow-ups cannot continue after deletion. Submitted notifications cannot be guaranteed recalled. This prototype makes no deletion request.')}</p><div class="stack">${button('confirm-delete',t('确认删除合成会话','Delete synthetic conversation'),'danger')}${button('unknown-delete',t('模拟删除结果未知','Simulate unknown deletion result'))}${button('back',t('保留会话','Keep conversation'))}</div>`;
}
function notificationView() {
  return `${pill(t('平台通知模拟 · 非送达证据','Simulated OS notification · Not delivery evidence'),'warn')}<h2>${t('点击会去哪里？','Where does a tap lead?')}</h2><div class="card"><p class="meta">${icon('bell')} ENMORI · 16:30</p><h3>${state.lockscreen==='hidden'?t('锁屏不显示内容','Hidden on lock screen'):t('你有一条新消息','You have a new message')}</h3><p class="small">${t('没有签到、心情、位置或生成正文。','No Check-in, mood, location or generated text.')}</p>${button('notification-open',t('模拟点击通知','Simulate notification tap'),'primary full')}</div><p>${t('打开后重新确认账号、消息归属、数据许可和有效性。无法读取时显示不可用；不落到错误话题，也不自动发送。','Opening rechecks the account, message ownership, permissions and validity. Unreadable content shows as unavailable, without landing in a wrong topic or sending a reply.')}</p>${notice(t('分别待验证：App 前台出现、后台系统通知、应用关闭后实际机制。这里的按钮不证明任何后台投递能力。','Separate evidence is needed for foreground appearance, background notification, and delivery after the app closes. This button proves none of those delivery capabilities.'))}${button('simulate-expired',t('模拟点击时来源已撤回','Simulate source revoked at tap'),'full')}`;
}
function entryView(kind) {
  if(kind==='home')return `<p class="section-eyebrow">${t('首页入口示意','Home entry concept')}</p><h2 class="hero-title">${t('今天，慢慢来。','Take today at your pace.')}</h2><div class="card"><h3>${t('给自己留一点空间','A little space for yourself')}</h3><p>${t('进入 AI 伙伴。打开首页不会把签到发送给 AI。','Open AI companion. Opening Home does not send Check-ins to AI.')}</p>${button('home',t('去聊聊','Open AI'),'primary full')}</div>`;
  const source=sources.checkin;
  return `${pill(t('本人签到 · 当前受权详情（合成）','Your Check-in · Authorized detail (synthetic)'))}<h2>${source.title()}</h2><p class="small">${source.time()}</p><div class="card"><p>${source.body()}</p><p>${source.facts()}</p></div>${button('discuss-checkin',t('选择这条签到，先审阅','Select this Check-in and review'),'primary full')}<p class="small">${t('仅用于本次本地回复；仍需审阅和明确发送。','For one local reply only; review and explicit Send are still required.')}</p>`;
}

function composer() {
  if(state.view!=='home'){ $('composer').innerHTML='';return; }
  const blocked=busy()||state.phase==='failed'||selectionBlocked();
  $('composer').innerHTML=`<div class="composer-wrap">${state.replyTarget?`<div class="composer-target">${t('回复：今天 16:30 的主动跟进 · 明天的节奏','Replying to: today’s 16:30 follow-up · Tomorrow’s pace')}</div>`:''}<div class="composer-top">${button('references',`${t('本次参考','References')} · ${activeRefs().length}`, '',busy()?'disabled':'')}${button('processing',state.processing==='local'?t('本地服务','Local service'):t('云端演示','Cloud demo'),'',busy()?'disabled':'')}</div><label for="draft">${t('写下你想说的','Your message')}</label><div class="compose-row"><textarea id="draft" rows="1" placeholder="${t('不必急着整理好…','Whenever you’re ready…')}" ${busy()?'readonly':''}>${esc(draft())}</textarea>${button('send',icon('arrow'),'primary icon-button',`aria-label="${t('发送合成消息','Send synthetic message')}" ${blocked||!validText(draft())?'disabled':''}`)}</div><div class="count">${scalarCount(draft())} / 2400${scalarCount(draft())>2400?t(' · 超过上限',' · Over limit'):''}</div></div>`;
}
function render(scroll=false) {
  header();
  const views={followup:followupView,'switch-confirm':switchConfirmView,home:homeView,welcome:welcomeView,proactive:proactiveView,why:whyView,references:referencesView,'saved-references':savedReferencesView,attach:attachView,source:sourceView,history:historyView,'new-topic':newTopicView,processing:processingView,settings:settingsView,privacy:privacyView,delete:deleteView,notification:notificationView,'home-entry':()=>entryView('home'),'checkin-entry':()=>entryView('checkin'),searchResult:()=>state.topic==='fresh'||state.deletedTopics.includes(state.topic)?notice(t('这段消息不再可用。','This message is no longer available.')):`<p class="section-eyebrow">${t('当前会话 · 附近消息','Current conversation · Nearby messages')}</p><div class="message user">${state.topic==='walk'?t('周末想散步。','I would like a weekend walk.'):t('我想给自己一点休息时间。','I want a little time to rest.')}</div><div class="message assistant">${state.topic==='walk'?t('你希望走多久？','How long would you like to walk?'):t('你希望怎样安排这段时间？','How would you like to spend that time?')}</div>${button('home',t('回到同一草稿','Return to the same draft'),'primary full')}`};
  const hidden=state.phase==='deleteUnknown'&&['home','history','searchResult','proactive','why','source'].includes(state.view);
  if(state.deletedTopics.includes(state.topic))state.topic='fresh';
  $('screen').innerHTML=(state.feedback?`<div class="feedback" role="status">${state.feedback}</div>`:'')+(hidden?phaseView():(views[state.view]||homeView)());
  composer();
  $('app-nav').innerHTML=`<div class="app-nav">${button('home-entry',t('首页','Home'),state.view==='home-entry'?'active':'')}${button('home',t('AI 伙伴','AI'),state.view==='home'?'active':'')}${button(state.mode==='B'?'privacy':'history',state.mode==='B'?t('历史管理','Manage history'):t('历史','History'),['history','privacy'].includes(state.view)?'active':'',busy()?'disabled':'')}${button('settings',t('联系设置','Contact'),state.view==='settings'?'active':'')}</div>`;
  $('mode-note').textContent={A:'A 为选择前历史对照，未采用。',B:'B 为选择前历史对照，未采用。',C:'已选 C：连续主入口＋历史／新话题；本轮为 F0＋F1a 合成设计。'}[state.mode];
  if(scroll){$('screen').scrollTop=0;$('screen').focus({preventScroll:true});}
  observeRead();
}

function requestTopic(id, view, reply=false, discard=false) {
  if(busy())return;
  if(state.deletedTopics.includes(id)){go('proactive');return;}
  if(state.topic!==id&&draft().trim()&&!discard){state.pendingSwitch={id,view,reply};go('switch-confirm');return;}
  const changed=state.topic!==id;
  if(discard)state.draftText='';
  if(changed){state.refs=[];state.selectionReviewed=true;state.selectionConflict=false;state.historyDependent=false;state.historyExcluded=false;state.excluded=[];state.sentText='';state.query='';}
  state.topic=id;state.replyTarget=reply;
  // Opening or tapping does not acknowledge reading.
  go(view);
}

function preserveScrollRender(){const top=$('screen').scrollTop;render();$('screen').scrollTop=top;}
document.addEventListener('input',(event)=>{
  const el=event.target;
  if(el.id==='draft'){state.draftText=el.value;const send=document.querySelector('[data-action="send"]');send.disabled=busy()||state.phase==='failed'||selectionBlocked()||!validText(el.value);document.querySelector('.count').textContent=`${scalarCount(el.value)} / 2400${scalarCount(el.value)>2400?t(' · 超过上限',' · Over limit'):''}`;}
  if(el.id==='search-query'){const pos=el.selectionStart;state.query=el.value;const top=$('screen').scrollTop;render();const input=$('search-query');input.focus({preventScroll:true});if(input.type!=='search')input.setSelectionRange(pos,pos);$('screen').scrollTop=top;}
});
document.addEventListener('change',(event)=>{
  const el=event.target;
  // Draft blur must not replace the next click target before its click arrives.
  if(!['follow-confirm','zone-confirm','follow-time','demo-consent','enabled','quiet-enabled','zone','quiet-start','quiet-end','lockscreen','push'].includes(el.id))return;
  if(el.id==='follow-confirm')state.followConfirmed=el.checked;
  if(el.id==='zone-confirm')state.zoneConfirmed=el.checked;
  if(el.id==='follow-time'){state.followTime=el.value;state.followConfirmed=false;state.zoneConfirmed=false;}
  if(el.id==='demo-consent')state.consentDemo=el.checked;
  if(el.id==='enabled'){state.enabled=el.checked;state.paused=false;state.categories.follow=el.checked;if(!el.checked&&state.followStage==='scheduled')state.followStage='cancelled';}
  if(el.id==='quiet-enabled')state.quietEnabled=el.checked;
  const keys={'zone':'zone','quiet-start':'quietStart','quiet-end':'quietEnd','lockscreen':'lockscreen'};
  if(keys[el.id]){state[keys[el.id]]=el.value;state.followConfirmed=false;state.zoneConfirmed=false;}
  if(el.id==='push')state.push=el.checked;
  preserveScrollRender();
});
document.addEventListener('click',(event)=>{
  const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
  const action=target.dataset.action;
  if(action==='followup'&&followBusy()){feedback(t('先核对原预约，不能重复创建。','Check the original follow-up before creating another.'));return;}
  if(busy()&&(['new-topic','confirm-new','confirm-switch','history','references','processing','reply','notification-open','discuss-checkin','delete','confirm-delete','followup','send'].includes(action)||action.startsWith('history-')||action.startsWith('attach-')||action.startsWith('exclude-'))){feedback(t('先核对当前操作；不会切换话题或重复发送。','Resolve the current operation first; no topic switch or resend.'));return;}
  if(action.startsWith('saved-source-')){const id=action.slice(13);if(sources[id])go('source',{sourceId:id,sourceContext:'saved'});return;}
  if(action.startsWith('source-')){const id=action.slice(7);if(sources[id])go('source',{sourceId:id,sourceContext:state.view==='why'?'saved':'draft'});return;}
  if(action==='exclude-history'){state.historyExcluded=true;state.selectionConflict=false;state.selectionReviewed=false;preserveScrollRender();return;}
  if(action.startsWith('exclude-')){const id=action.slice(8);if(!sources[id])return;state.excluded=state.excluded.includes(id)?state.excluded.filter(x=>x!==id):[...state.excluded,id];state.selectionReviewed=false;state.selectionConflict=state.historyDependent&&!state.historyExcluded&&state.excluded.length>0;preserveScrollRender();return;}
  if(action.startsWith('attach-')){const id=action.slice(7);if(!checkInIds.includes(id)||!sources[id].eligible)return;if(state.refs.includes(id)){state.refs=state.refs.filter(x=>x!==id);state.excluded=state.excluded.filter(x=>x!==id);}else if(state.refs.length<5)state.refs.push(id);state.selectionReviewed=false;preserveScrollRender();return;}
  if(action.startsWith('history-')){requestTopic(action.slice(8),'home');return;}
  switch(action){
    case 'back':back();break;
    case 'home':home();break;
    case 'start':if(state.consentDemo)home();break;
    case 'proactive':requestTopic('follow','proactive');break;
    case 'why':go('why');break;
    case 'message-references':go('saved-references');break;
    case 'ack-read':if(state.readObserved){state.readState='synced';state.unread=false;preserveScrollRender();}break;
    case 'references':state.referenceReturn='home';go('references');break;
    case 'refs-done':if(!selectionBlocked())home();break;
    case 'attach':go('attach');break;
    case 'review-attachments':go('references');break;
    case 'review-selection':if(state.historyDependent&&!state.historyExcluded&&state.excluded.length){state.selectionConflict=true;render();break;}if(state.sourceState!=='current'&&activeRefs().length){feedback(t('来源仍需核对，草稿与选择保留。','Sources still need checking. Draft and choices are kept.'));break;}state.selectionConflict=false;state.selectionReviewed=true;feedback(t('合成核对完成。只有你点击发送，才会使用本次选择。','Synthetic check complete. This selection is used only after you press Send.'));break;
    case 'history':if(!busy())go('history');break;
    case 'settings':go('settings');break;
    case 'followup':if(state.topic!=='follow')return;state.followStage='form';state.followConfirmed=false;state.zoneConfirmed=false;go('followup');break;
    case 'intent-status':go('followup');break;
    case 'keep-zone':state.zone='Asia/Singapore';state.zoneConfirmed=false;state.followConfirmed=false;render();break;
    case 'propose-morning':{const day=new Date(state.followTime.slice(0,10)+'T00:00:00Z');if(state.quietStart>state.quietEnd&&state.followTime.slice(11)>=state.quietStart)day.setUTCDate(day.getUTCDate()+1);state.followTime=day.toISOString().slice(0,10)+'T'+state.quietEnd;state.followConfirmed=false;state.zoneConfirmed=false;render();break;}
    case 'confirm-followup':if(!state.followConfirmed||!state.zoneConfirmed||followValidation()||state.paused)return;state.followStage=state.enabled?'creating':'settings-pending';state.intentReadback=false;render(true);break;
    case 'settings-confirmed':state.enabled=true;state.categories.follow=true;state.settingsRevision++;state.followStage='creating';render(true);break;
    case 'settings-unknown':state.followStage='settings-unknown';render(true);break;
    case 'check-settings':feedback(t('设置读取仍未知，未创建预约。','Settings readback remains unknown. No follow-up was created.'));break;
    case 'intent-saved':state.followStage='scheduled';state.intentReadback=false;render(true);break;
    case 'intent-unknown':state.followStage='unknown';render(true);break;
    case 'check-intent':state.intentReadback=true;render();break;
    case 'cancel-intent':state.followStage='cancelling';render(true);break;
    case 'intent-cancelled':state.followStage='cancelled';render(true);break;
    case 'intent-cancel-unknown':state.followStage='cancel-unknown';state.intentReadback=false;render(true);break;
    case 'intent-dispatch-unknown':state.followStage='dispatch-unknown';state.intentReadback=false;render(true);break;
    case 'processing':if(!busy())go('processing');break;
    case 'privacy':go('privacy');break;
    case 'new-topic':if(!busy())go('new-topic');break;
    case 'confirm-new':if(busy())return;state.topic='fresh';state.refs=[];state.excluded=[];state.selectionReviewed=true;state.selectionConflict=false;state.historyDependent=false;state.sentText='';state.replyTarget=false;home();break;
    case 'confirm-switch':if(state.pendingSwitch){const x=state.pendingSwitch;state.pendingSwitch=null;requestTopic(x.id,x.view,x.reply,true);}break;
    case 'reply':if(state.proactiveState!=='valid'||state.deletedTopics.includes('follow'))return;requestTopic('follow','home',true);break;
    case 'send':if(busy()||!validText(draft())||state.phase==='failed')return;if(selectionBlocked()){go('references');return;}state.phase='pending';render();$('screen').scrollTop=$('screen').scrollHeight;break;
    case 'cancel':state.phase='cancelUnknown';render();break;
    case 'unknown':state.phase='unknown';render();break;
    case 'finish':state.sentText=draft();state.draftText='';state.phase='ready';state.refs=[];state.excluded=[];state.selectionReviewed=true;state.selectionConflict=false;state.historyDependent=false;state.historyExcluded=false;render();break;
    case 'check-result':state.resultChecked=true;render();break;
    case 'leave':go('home-entry');break;
    case 'retry-confirmed':if(selectionBlocked()){go('references');return;}state.phase='pending';render();break;
    case 'load-earlier':feedback(t('更早页读取失败。保留查找词、当前结果与游标，未将失败当成空结果。','Earlier-page read failed. Query, current results and cursor remain; failure is not an empty result.'));break;
    case 'search-result':go('searchResult');break;
    case 'retry-source':feedback(t('核对仍失败，保留未知状态。可返回明确排除此项。','Check still failed; the state remains unknown. You can go back and explicitly exclude it.'));break;
    case 'accept-current':state.sourceState='current';state.selectionReviewed=false;go('references');break;
    case 'pause':state.paused=!state.paused;preserveScrollRender();break;
    case 'turn-off':state.enabled=false;state.categories.follow=false;state.paused=false;if(state.followStage==='scheduled')state.followStage='cancelled';feedback(t('演示中已关闭：停止新生成并取消未开始的预约。未知投递仍需核对，已有会话保留。','Off in this demo: generation stops and unstarted follow-ups are cancelled. Uncertain dispatch still needs checking. Saved conversations remain.'));break;
    case 'save-settings':state.settingsRevision++;feedback(t('设置仅保存在本页内存，未启用 SDK 或改变系统权限。','Settings stay in page memory. No SDK or OS permission changed.'));break;
    case 'notification':go('notification');break;
    case 'notification-open':requestTopic('follow','proactive');break;
    case 'simulate-expired':state.proactiveState='revoked';state.sourceState='revoked';go('proactive');break;
    case 'delete':go('delete');break;
    case 'confirm-delete':if(busy())return;state.deletedTopics.push(state.topic);state.draftText='';state.sentText='';state.refs=[];state.excluded=[];state.selectionReviewed=true;state.selectionConflict=false;state.phase='ready';state.topic='fresh';go('history');break;
    case 'unknown-delete':state.phase='deleteUnknown';home();break;
    case 'check-delete':feedback(t('仍未确认，不显示旧内容，也没有重建会话。','Still unconfirmed. Old content remains hidden and no conversation is recreated.'));break;
    case 'home-entry':go('home-entry');break;
    case 'discuss-checkin':if(!state.refs.includes('checkin')&&state.refs.length>=5){feedback(t('已有 5 条选择，请先审阅。','There are already 5 selections. Review them first.'));break;}if(!state.refs.includes('checkin'))state.refs.push('checkin');state.excluded=state.excluded.filter(x=>x!=='checkin');state.selectionReviewed=false;state.referenceReturn='home';go('references');break;
  }
});
$('mode').addEventListener('change',event=>{state.mode=event.target.value;home();});
$('scenario').addEventListener('change',event=>setScenario(event.target.value));
$('language').addEventListener('click',()=>{language=language==='zh'?'en':'zh';document.documentElement.lang=language==='zh'?'zh-CN':'en';$('language').textContent=language==='zh'?'English UI':'中文界面';$('ribbon').textContent=t('交互原型 · 新能力待实现 · 仅合成数据','Interactive prototype · Target capabilities · Synthetic only');render();});
$('large-text').addEventListener('click',()=>{const on=document.body.classList.toggle('large-text');$('large-text').setAttribute('aria-pressed',String(on));});
$('reset').addEventListener('click',()=>{state=initial();$('mode').value='C';$('scenario').value='return';history.replaceState({view:'home'},'','#home');render(true);});
if(window.matchMedia('(max-width:700px)').matches)document.querySelector('.lab').open=false;
history.replaceState({view:'home'},'','#home');
render();
