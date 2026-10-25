'use strict';
// Synthetic page-memory only. No fetch, persistence, analytics, notifications or AI.
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let language = 'zh';
const t = (zh, en) => language === 'zh' ? zh : en;
const initial = () => ({view:'home',mode:'C',topic:'follow',draftText:'',phase:'ready',query:'',historyScope:'follow',refs:['follow'],excluded:[],sourceState:'current',sourceId:'follow',processing:'local',cloudConsent:false,enabled:false,paused:false,categories:{follow:true,going:false,checkin:false},zone:'Asia/Singapore',quietStart:'22:00',quietEnd:'08:00',frequency:'1',lockscreen:'generic',push:false,unread:true,proactiveState:'valid',feedback:'',deletedTopics:[],replyTarget:false,referenceReturn:'home',sentText:'',resultChecked:false,consentDemo:false,followTime:'2026-10-26T16:30',followConfirmed:false});
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
const sources = {
  follow: {kind:()=>t('你的要求','Your request'),title:()=>t('明天下午再问我一次','Check in tomorrow afternoon'),time:()=>t('10月24日 16:30 · 新加坡','24 Oct, 16:30 · Singapore'),body:()=>t('“明天下午四点半问问我，是否想给下周留一点休息时间。”','“Tomorrow at 4:30 pm, ask whether I’d like to make a little room for rest next week.”'),facts:()=>t('来自本话题中的明确要求。不是根据心情推断的需要。','An explicit request in this topic. Not an inference from a mood.'),id:'synthetic-user-message-01'},
  checkin: {kind:()=>t('自己的签到','Your Check-in'),title:()=>t('散步后的片刻','A moment after a walk'),time:()=>t('10月24日 18:20 · 新加坡','24 Oct, 18:20 · Singapore'),body:()=>t('傍晚走了一小段，觉得轻松了一些。','I took a short walk in the evening and felt a little lighter.'),facts:()=>t('记录时的心情：平静。活动标签：散步。未附位置、天气。不是现在的心情或位置。','Recorded mood: calm. Activity tag: walking. No location or weather attached. This is not your current mood or location.'),id:'synthetic-checkin-01'},
  going: {kind:()=>t('计划参加 · Going','Going'),title:()=>t('河畔步行','Riverside walk'),time:()=>t('10月26日 18:00 · 新加坡','26 Oct, 18:00 · Singapore'),body:()=>t('河畔集合点 · 公开活动资料（合成）。','Riverside meeting point · public event details (synthetic).'),facts:()=>t('你当前选择 Going，表示计划参加；没有参加完成的证据。活动状态需发送前重新核对。','Going means you plan to attend. It is not evidence of attendance. Event status must be checked again before sending.'),id:'synthetic-event-01'},
  interested: {kind:()=>t('感兴趣 · Interested','Interested'),title:()=>t('周末陶艺','Weekend pottery'),time:()=>t('11月1日 14:00 · 新加坡','1 Nov, 14:00 · Singapore'),body:()=>t('城市工坊 · 公开活动资料（合成）。','City studio · public event details (synthetic).'),facts:()=>t('感兴趣不等于计划参加，也不等于已经参加。不会自动作为临近参加提醒。','Interested does not mean Going or attended. It does not automatically trigger a Going reminder.'),id:'synthetic-event-02'}
};
function go(view, changes={}) {
  state.feedback=''; Object.assign(state,changes,{view});
  history.pushState({view},'',`#${view}`); render(true);
}
function home() { if(state.deletedTopics.includes(state.topic))state.topic='fresh'; go('home'); }
function feedback(copy) {state.feedback=copy;render();}
function back() { if(history.state?.view && history.state.view!=='home') history.back(); else home(); }
window.addEventListener('popstate', (event) => {state.view=event.state?.view || 'home';state.feedback='';render(true);});
function setScenario(value) {
  state.phase='ready';state.feedback='';state.proactiveState='valid';state.sourceState='current';state.replyTarget=false;state.resultChecked=false;
  const map={return:'home',welcome:'welcome',proactive:'proactive',notification:'notification',unknown:'home',failed:'home',stale:'references','source-unknown':'references',deleted:'proactive',revoked:'proactive',offline:'proactive',cancelled:'proactive','home-entry':'home-entry','checkin-entry':'checkin-entry','event-entry':'event-entry'};
  if(value==='unknown'){state.phase='unknown';state.draftText=t('我想聊的是休息，不是制定学习计划。','I mean rest, not a study plan.');}
  if(value==='failed'){state.phase='failed';state.processing='local';state.draftText=t('今天先聊一会儿。','Let’s just talk for a little while.');}
  if(value==='stale'||value==='source-unknown'){state.sourceState=value==='stale'?'changed':'unknown';state.refs=['checkin'];state.excluded=[];state.referenceReturn='home';}
  if(['deleted','revoked','offline','cancelled'].includes(value)){state.proactiveState=value;if(value==='revoked')state.sourceState='revoked';if(value==='deleted')state.sourceState='deleted';}
  if(value==='proactive')state.unread=false;
  go(map[value]||'home');
}
function header() {
  const names={followup:t('稍后跟进','Follow up later'),'switch-confirm':t('切换会话','Switch conversation'),home:t('AI 伙伴','AI companion'),welcome:t('AI 伙伴','AI companion'),proactive:t('一条跟进','A check-in'),why:t('为什么收到','Why this message'),references:t('本次参考','References for this reply'),attach:t('附加记录','Attach a record'),source:t('来源详情','Source details'),history:t('历史与查找','History & search'),settings:t('主动联系','Proactive contact'),processing:t('处理位置','Processing location'),privacy:t('历史与隐私','History & privacy'),'new-topic':t('开始新话题','Start a new topic'),delete:t('删除整段会话','Delete conversation'),notification:t('通知预览','Notification preview'),'home-entry':t('首页','Home'),'checkin-entry':t('签到详情','Check-in details'),'event-entry':t('活动详情','Event details'),searchResult:t('查找结果','Search result')};
  const main=state.view==='home'||state.view==='welcome';
  $('app-header').innerHTML=`<div class="app-header">${main?'':button('back',icon('back'),'icon-button',`aria-label="${t('返回上一步','Go back')}"`)}<div class="title"><h2 ${main?'class="brand"':''}>${main?'ENMORI':names[state.view]||'ENMORI'}</h2><p>${main?t('AI 伙伴 · 这里可以慢慢说','AI companion · Room to talk'):t('合成演示 · 不更改真实数据','Synthetic demo · No real data changes')}</p></div>${main?button('history',icon('history'),'icon-button',`aria-label="${t('历史与查找','History and search')}"`):''}</div>`;
}
function proactiveCard() {
  if(state.deletedTopics.includes('follow'))return '';
  if(state.proactiveState!=='valid')return notice(t('有一条旧联系已不可用，请打开后查看当前状态。','A previous message is unavailable. Open it to see the current state.'),'warn')+button('proactive',t('查看状态','View status'),'full');
  return `<article class="card tint">${pill(state.unread?t('1 条未读 · 主动联系','1 unread · Proactive message'):t('已读 · 主动联系','Read · Proactive message'))}<h3>${t('还想给下周留一点空白吗？','Still want to make room for next week?')}</h3><p class="small">${t('今天 16:30 · 你昨天明确约好的跟进','Today, 16:30 · A follow-up you requested yesterday')}</p>${button('proactive',t('打开这条消息','Open message'),'primary full')}</article>`;
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
  if(!busy()&&state.phase==='ready')content+=button('followup',t('约个稍后跟进（演示）','Arrange a follow-up (demo)'),'text-button full');
  return content+phaseView();
}
function welcomeView() {
  return `<div class="empty-mark">${icon('leaf')}</div><p class="section-eyebrow">${t('从一句话开始','One message is enough')}</p><h2 class="hero-title">${t('这里，留一点时间<br>给自己。','A little space<br>for you.')}</h2><p class="lead">${t('想说的时候写下来。你可以先了解这次会用到什么，再决定要不要开始。','Write whenever you feel ready. You can see what will be used before deciding to begin.')}</p><div class="card"><h3>${t('先由你决定','You choose first')}</h3><p>${t('当前聊天使用你发的消息、同会话有限历史及获准的人设表达。','Current chat uses your message, limited history in the same conversation, and permitted Persona presentation.')}</p><p class="small">${t('签到、活动、位置与云端处理是本轮待确认的扩展。主动联系默认关闭是候选建议。','Check-ins, events, location and cloud processing are proposed additions. Starting with proactive contact off is a proposal.')}</p>${button('processing',t('查看处理位置与数据范围','See processing & data scope'),'full')}</div><label class="choice-row"><input id="demo-consent" type="checkbox" ${state.consentDemo?'checked':''}><span>${t('演示：我已查看可选数据使用说明','Demo: I have reviewed optional data use')}<small>${t('只切换原型状态，不记录真实同意。','Only changes this prototype. No real consent is recorded.')}</small></span></label>${button('start',t('进入聊天演示','Enter chat demo'),'primary full',state.consentDemo?'':'disabled')}<div class="divider"></div>${button('home-entry',t('暂不开始，返回首页','Not now, return Home'),'text-button full')}`;
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
    const copy={deleted:t('相关来源已删除，这条消息内容已不可用。','A required source was deleted. This message is unavailable.'),revoked:t('相关数据用途许可已撤回，这条消息内容已不可用。','Permission for the related data use was withdrawn. This message is unavailable.'),offline:t('离线后到达时已超过有效时间，不再继续这条旧提醒。','The message arrived after its validity window while the device was offline. This old reminder is not continued.'),cancelled:t('活动已取消，不再显示旧的临近参加提醒。','The event was cancelled. Its old attendance reminder is no longer shown.')};
    return `${pill(t('状态演示 · 当前不可用','State demo · Unavailable'),'warn')}<h2>${t('这条联系有变化','This message has changed')}</h2>${notice(copy[state.proactiveState],'warn')}<p class="small">${t('不重建来源或旧回复，不把点击通知当成可读取私密内容的权限。已交付到平台的通知能否移除取决于实际投递机制。','Do not reconstruct source content or old replies. A notification tap does not authorize reading private content. Removing a notification already handed to a platform depends on its delivery mechanism.')}</p>${button('home',t('回到 AI 主入口','Return to AI'),'primary full')}${button('settings',t('管理主动联系','Manage proactive contact'),'text-button full')}`;
  }
  return `${pill(t('已读 · 你要求的跟进','Read · Your requested follow-up'))}<p class="meta">${t('今天 16:30 · 新加坡时间','Today, 16:30 · Singapore time')}</p><h2 class="hero-title">${t('还想给下周<br>留一点空白吗？','Still want to make<br>room for next week?')}</h2><div class="message assistant">${t('你昨天希望今天这个时候再聊聊休息安排。现在还想接着说吗？如果不想，也可以先放下。','Yesterday you asked to check in around this time about making room for rest. Would you like to talk about it now? It’s also fine to leave it for another time.')}</div><p class="small">${t('人工编写的合成主动消息 · 目标能力待实现','Authored synthetic proactive message · Target capability')}</p>${button('why',t('为什么收到这条消息？','Why did I receive this?'),'full')}${button('references',`<span>${t('本次参考','References')}</span><span>${activeRefs().length} ${t('项','items')} ›</span>`,'reference-link')}<div class="divider"></div><p class="small">${t('回复将留在“明天的节奏”。阅读不会替你发送，也不会启动新话题。','Your reply stays in “Tomorrow’s pace”. Reading does not send a reply or start another topic.')}</p>${button('reply',t('回复这条跟进','Reply to this follow-up'),'primary full')}${button('settings',t('暂停或关闭主动联系','Pause or turn off proactive contact'),'text-button full')}`;
}
function whyView() {
  if(state.proactiveState!=='valid'||state.deletedTopics.includes('follow'))return proactiveView();
  return `<p class="section-eyebrow">${t('有原因，也能控制','A reason you can inspect')}</p><h2>${t('因为你约了这个时间','Because you chose this time')}</h2><div class="card"><p>${sources.follow.body()}</p><p class="small">${sources.follow.time()}</p>${button('source-follow',t('查看原始要求','View original request'),'full')}</div><dl class="inline-facts"><dt>${t('类别','Category')}</dt><dd>${t('你明确要求的跟进','Requested follow-up')}</dd><dt>${t('时间','Time')}</dt><dd>25 Oct · 16:30 · Asia/Singapore</dd><dt>${t('归属','Topic')}</dt><dd>${t('明天的节奏','Tomorrow’s pace')}</dd></dl>${notice(t('演示假设：生成前与投递前均通过权限、时效、频率和安静时段核对。实际机制由后端实现并单独验证。','Demo assumption: permissions, validity, limits and quiet hours pass before generation and delivery. The actual backend mechanism needs separate verification.'))}${button('settings',t('调整类别与时间','Adjust categories & timing'),'full')}`;
}
function activeRefs(){return state.refs.filter((id)=>!state.excluded.includes(id));}
function referencesView() {
  const bad=state.sourceState!=='current';
  return `<p class="lead">${t('只为这次回复选择。查看旧记录不会自动把它交给 AI。','Choose for this reply only. Reading a past record does not automatically share it with AI.')}</p>${pill(t('来源展示合同待确认','Source display contract pending'),'warn')}${bad?notice(t('有来源未通过当前核对。请先查看变化或明确排除；不会悄悄使用旧版本。','A source has not passed the current check. Review the change or explicitly exclude it; an old version will not be used silently.'),'warn'):''}${state.refs.map(id=>sourceCard(id,bad)).join('')}${button('attach',`${icon('plus')} ${t('主动附加一条记录','Attach a record')}`,'full')}<div class="divider"></div>${notice(t('当前消息与同会话有限历史仍按聊天合同处理。本次排除只作用于这里列出的来源，不等于删除记录、撤回所有用途或清除对话记忆。','The current message and limited same-conversation history still follow the chat contract. Exclusion affects only sources listed here; it is not deletion, withdrawal of all data use, or a conversation reset.'))}${button('refs-done',t('完成选择，返回草稿','Done, return to draft'),'primary full')}`;
}
function sourceCard(id,bad=false) {
  const source=sources[id], excluded=state.excluded.includes(id), unavailable=bad&&['deleted','revoked','unknown'].includes(state.sourceState);
  return `<article class="card"><div class="source-heading"><div><p class="section-eyebrow">${source.kind()}</p><strong>${unavailable?(state.sourceState==='unknown'?t('来源暂时无法核对','Source check unavailable'):t('来源不可用','Source unavailable')):source.title()}</strong></div>${pill(excluded?t('本次排除','Excluded'):bad?t('需核对','Check needed'):t('本次使用','Included'),bad?'warn':'')}</div>${unavailable?'':`<p class="small">${source.time()}</p><p class="small">${source.facts()}</p>`}<div class="source-controls">${button(`source-${id}`,t('查看来源','View source'),'',unavailable&&state.sourceState!=='unknown'?'disabled':'')}${button(`exclude-${id}`,excluded?t('重新纳入','Include again'):t('本次排除','Exclude this time'),'',`aria-pressed="${excluded}"`)}</div></article>`;
}
function attachView() {
  return `<h2>${t('你想补充哪一条？','What would you like to add?')}</h2><p class="small">${t('这里仅展示三条合成的本人记录/意向。真实列表须先获得具体用途许可并重新核对可用性。','These are three synthetic owned records or choices. A real list needs permission for its purpose and a current availability check.')}</p>${['checkin','going','interested'].map(id=>`<article class="card"><p class="section-eyebrow">${sources[id].kind()}</p><h3>${sources[id].title()}</h3><p class="small">${sources[id].time()}</p><p>${sources[id].facts()}</p>${button(`attach-${id}`,state.refs.includes(id)?t('已附加','Attached'):t('附加到本次回复','Attach to this reply'),'full',state.refs.includes(id)?'disabled':'')}</article>`).join('')}${notice(t('不自动附加 GPS 或天气。需要额外范围时应单独说明并取得选择。','GPS and weather are not attached automatically. Additional scope needs its own explanation and choice.'))}`;
}
function sourceView() {
  const source=sources[state.sourceId]||sources.follow;
  if(state.sourceState==='unknown')return notice(t('未能确认来源当前是否仍有效。这不等于记录不存在；不展示旧内容，也不会将它加入发送。','The source’s current validity could not be confirmed. This does not mean the record is missing. Old content is not displayed or sent.'),'warn')+button('retry-source',t('重新核对（模拟仍失败）','Check again (simulate failure)'),'full');
  if(state.sourceId==='follow'&&state.deletedTopics.includes('follow'))return notice(t('原会话已删除，不能重新读取这条要求。','The source conversation was deleted. Its request cannot be read again.'),'warn');
  if(['deleted','revoked'].includes(state.sourceState))return notice(t('来源不可用，未展示缓存内容。','The source is unavailable. Cached content is not displayed.'),'warn');
  return `${pill(t('受信 fixture 定位 · 合成来源','Trusted fixture target · Synthetic'))}<h2>${source.title()}</h2><p class="small">${source.kind()} · ${source.time()}</p>${state.sourceState==='changed'?notice(t('这条记录刚更新。下方是模拟当前版本，旧版本不得继续进入请求。','This record was updated. The simulated current version is shown below; the old version must not enter the request.'),'warn'):''}<div class="card"><p>${state.sourceState==='changed'&&state.sourceId==='checkin'?t('更新后的记录：散步后想休息，暂时不想安排活动。','Updated record: I wanted to rest after the walk, without planning an activity.'):source.body()}</p><p class="small">${source.facts()}</p></div><p class="small">${t('此入口由固定合成来源映射打开；没有读取或接受模型生成的 URL / ID。真实版必须重新核对 owner、用途与来源版本。','This entry uses a fixed synthetic source map, never a model-generated URL or ID. The real version must recheck ownership, purpose and version.')}</p>${state.sourceState==='changed'?button('accept-current',t('使用已核对的当前版本（模拟）','Use checked current version (demo)'),'primary full'):button('back',t('返回上一页','Return'),'full')}`;
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
  return `${pill(t('候选流程 · 不创建真实任务','Proposed flow · No real task creation'),'warn')}<h2>${t('约一个你愿意的时间','Choose a time that suits you')}</h2><div class="card"><p>${t('跟进事项：是否想为下周留出休息时间。','Follow up on: making room for rest next week.')}</p><p class="small">${t('归属话题：','Topic: ')}${esc(topicName())}</p></div><label for="follow-time">${t('本地日期与时间（合成）','Local date and time (synthetic)')}</label><input id="follow-time" type="datetime-local" value="${state.followTime}"><p class="small">${t('时区：','Time zone: ')}${esc(state.zone)} · ${t('仅这一次','One time only')}</p>${notice(t('会在生成前、投递前重新核对许可、数据、有效期、频率和安静时段。若已过时，不补发旧消息。','Recheck consent, data, validity, limits and quiet hours before generation and delivery. Do not replay an expired message.'))}<label class="choice-row"><input id="follow-confirm" type="checkbox" ${state.followConfirmed?'checked':''}><span>${t('演示：允许就这件事联系一次','Demo: allow one follow-up about this request')}<small>${t('仅 App 内演示，不自动开启系统推送。','In-app demo only; does not enable OS push.')}</small></span></label>${button('confirm-followup',t('确认这次跟进（模拟）','Confirm this follow-up (demo)'),'primary full',state.followConfirmed&&state.followTime&&state.zone!=='unknown'?'':'disabled')}${button('back',t('先不安排','Not now'),'text-button full')}`;
}
function switchConfirmView() {
  return `<h2>${t('切换前保留当前草稿？','Keep editing your draft?')}</h2><p>${t('打开另一段会话会放弃当前未发送草稿，包括从通知进入或回复其他话题。','Opening another conversation discards the unsent draft, including notification entry or replying in another topic.')}</p><div class="stack">${button('home',t('继续编辑','Keep editing'),'primary')}${button('confirm-switch',t('放弃草稿并继续','Discard draft and continue'),'danger')}</div>`;
}

function processingView() {
  return `<h2>${t('这次在哪里处理？','Where is this processed?')}</h2><div class="card ${state.processing==='local'?'tint':''}"><h3>${t('本地服务','Local service')}</h3><p>${t('由配置的本地模型服务处理，仍经过 ENMORI 后端；不等于手机端计算或离线可用。','Processed by the configured local model service through the ENMORI backend. This does not mean on-device or offline processing.')}</p>${button('choose-local',t('本次使用本地','Use local for this reply'),'full')}</div><div class="card"><h3>${t('云端候选 · 尚未启用','Cloud candidate · Not enabled')}</h3><p>${t('真实启用前需说明服务商、处理条件、数据范围和费用。签到、活动、历史和人设不应因切换模型而自动获准外传。','Real use needs a named provider, processing terms, data scope and cost approval. Switching a model does not authorize sending Check-ins, events, history or Persona to the cloud.')}</p><label class="choice-row"><input type="checkbox" id="cloud-consent" ${state.cloudConsent?'checked':''}><span>${t('仅演示：选择云端处理本次内容','Demo only: choose cloud processing for this reply')}<small>${t('不构成真实许可；页面不发起请求。','Not real consent. The page makes no requests.')}</small></span></label>${button('choose-cloud',t('切换到云端演示','Show cloud demo'),'full',state.cloudConsent?'':'disabled')}</div>${notice(t('本次包含：你发送的文字、同会话有限历史、获准人设，以及本次参考中明确纳入的记录。排除的记录不进入本次候选请求。生产合同仍待确认。','This reply includes your message, limited same-topic history, permitted Persona, and explicitly included references. Excluded records stay out of this proposed request. The production contract is still pending.'))}${button('references',t('查看本次参考范围','Review reference scope'),'full')}`;
}
function settingsView() {
  return `${pill(t('全部为候选设置 · 待 LI 确认','All proposed settings · Pending LI'),'warn')}<h2>${t('只在你愿意时联系','Only when you want it')}</h2><p class="lead">${t('你可以按类别选择，也可以随时暂停或关闭。无需为了保持连续而回复。','Choose the categories you want. Pause or turn off at any time. You never need to reply to keep a streak.')}</p><label class="choice-row"><input id="enabled" type="checkbox" ${state.enabled?'checked':''}><span><strong>${t('允许主动联系','Allow proactive contact')}</strong><small>${state.enabled?t('演示中已开启','Enabled in this demo'):t('当前关闭 · 不生成新的主动联系','Off · No new proactive contact')}</small></span></label>${state.enabled?`<div class="row">${button('pause',state.paused?t('恢复（模拟）','Resume (demo)'):t('暂停至明天（模拟）','Pause until tomorrow (demo)'))}${button('turn-off',t('关闭','Turn off'))}</div>${state.paused?notice(t('已暂停至 10月26日 08:00 · Asia/Singapore。恢复时重新核验，不补发旧积压。','Paused until 26 Oct, 08:00 · Asia/Singapore. Resume requires fresh checks; no stale backlog replay.')):''}`:''}<div class="section-head"><h3>${t('你愿意收到什么','Categories')}</h3></div>${[['follow',t('我明确要求的跟进','Follow-ups I request'),t('先确认一件事、时间和时区','Confirm the request, time and zone first')],['going',t('Going 活动临近','Upcoming Going events'),t('不把 Interested 或 Going 写成已参加','Never treat Interested or Going as attended')],['checkin',t('近期签到后的轻问','Gentle check-ins after a record'),t('需另行允许数据用途，不作诊断','Separate data-use consent; no diagnosis')]].map(([key,title,hint])=>`<label class="choice-row"><input type="checkbox" data-category="${key}" ${state.categories[key]?'checked':''} ${state.enabled?'':'disabled'}><span><strong>${title}</strong><small>${hint}</small></span></label>`).join('')}<div class="divider"></div><label for="frequency">${t('滚动 24 小时上限（候选）','Rolling 24-hour limit (proposal)')}</label><select id="frequency"><option value="1" ${state.frequency==='1'?'selected':''}>${t('最多 1 条 · 推荐候选','Up to 1 · Suggested candidate')}</option><option value="2" ${state.frequency==='2'?'selected':''}>${t('最多 2 条 · 比较候选','Up to 2 · Alternative')}</option></select><p class="small">${t('两次联系至少间隔 8 小时；模型不决定是否有权触发。','At least 8 hours between messages. A model does not decide trigger eligibility.')}</p><div class="row"><div><label for="quiet-start">${t('安静时段开始','Quiet hours start')}</label><input id="quiet-start" type="time" value="${state.quietStart}"></div><div><label for="quiet-end">${t('结束','End')}</label><input id="quiet-end" type="time" value="${state.quietEnd}"></div></div><label for="zone">${t('已确认时区','Confirmed time zone')}</label><select id="zone"><option value="Asia/Singapore" ${state.zone==='Asia/Singapore'?'selected':''}>Asia/Singapore</option><option value="Europe/London" ${state.zone==='Europe/London'?'selected':''}>Europe/London</option><option value="unknown" ${state.zone==='unknown'?'selected':''}>${t('尚未确认','Not confirmed')}</option></select>${state.zone==='unknown'?notice(t('时区未知：暂停主动联系，不能猜测当地时间。','Unknown time zone: pause contact rather than guessing local time.'),'warn'):''}<div class="divider"></div><label class="choice-row"><input id="push" type="checkbox" ${state.push?'checked':''}><span><strong>${t('系统通知（仅模拟选择）','System notifications (demo only)')}</strong><small>${t('不会请求系统权限或发送通知。App 内开关和系统通知权限是两回事；本地模型不表示推送也在本地。','No permission request or notification is sent. In-app and OS permissions are separate; local AI does not make push local.')}</small></span></label><label for="lockscreen">${t('锁屏显示（候选）','Lock-screen content (proposal)')}</label><select id="lockscreen"><option value="generic" ${state.lockscreen==='generic'?'selected':''}>${t('仅显示“ENMORI 有一条新消息”','Only “A new message from ENMORI”')}</option><option value="hidden" ${state.lockscreen==='hidden'?'selected':''}>${t('不在锁屏显示','Hide on lock screen')}</option></select>${button('notification',t('查看模拟通知','Preview simulated notification'),'full')}<div class="divider"></div>${notice(t('关闭：停止新生成并取消尚未投递的待发项；不删除已保存会话。撤回数据用途须使关联内容不可用。已交平台或已显示的通知无法保证追回。上述行为仍需生产合同与平台验证。','Turning off stops new generation and cancels undelivered items; it does not delete saved conversations. Withdrawal of data-use consent must invalidate related content. Notifications already handed to the platform or shown may not be retractable. Production contracts and platform tests remain required.'))}${button('save-settings',t('保存演示设置','Save demo settings'),'primary full')}`;
}
function privacyView() {
  return `<h2>${t('历史仍由你控制','Your history, your control')}</h2><div class="card"><h3>${t('整段会话删除','Whole-conversation deletion')}</h3><p>${t('永久删除这段会话及其中所有消息。不会删除签到、活动或 Persona；没有回收站或恢复。','Permanently deletes this conversation and its messages. Check-ins, events and Persona remain. There is no Trash or Restore.')}</p>${button('delete',t('删除当前会话…','Delete current conversation…'),'danger full',busy()?'disabled':'')}</div><div class="card"><h3>${t('保留期保持现行规则','Existing retention rules remain')}</h3><p>${t('会话在最后一次成功保存消息后的 90 天到期，或在你先行删除时不可再访问。阅读不会延长保留期。','A conversation expires 90 days after its last successfully persisted message, or becomes inaccessible earlier when you delete it. Reading does not extend retention.')}</p><p class="small">${t('主动消息是否推进该锚点需要单独决定，不能借此暗中延长旧内容留存。','Whether proactive messages advance that anchor needs a separate decision; they must not silently extend old-content retention.')}</p></div>${button('history',t('查看历史会话','View conversation history'),'full')}${button('new-topic',t('只开新话题，保留原会话','Start new topic, keep old conversation'),'text-button full',busy()?'disabled':'')}`;
}
function deleteView() {
  return `<h2>${esc(t('删除整段当前会话：','Delete the current conversation: ')+topicName()+'？')}</h2>${notice(t('将删除整段合成会话和所有消息，无法撤销。其他签到、活动、意向和人设仍保留。','Deletes the whole synthetic conversation and every message, without undo. Other Check-ins, events, participation and Persona remain.'),'warn')}<p>${t('关联待发跟进的取消及保留期处理是待确认合同。本原型不发出任何删除请求。','Cancellation of associated pending follow-ups and retention handling need a confirmed contract. This prototype makes no deletion request.')}</p><div class="stack">${button('confirm-delete',t('确认删除合成会话','Delete synthetic conversation'),'danger')}${button('unknown-delete',t('模拟删除结果未知','Simulate unknown deletion result'))}${button('back',t('保留会话','Keep conversation'))}</div>`;
}
function notificationView() {
  return `${pill(t('平台通知模拟 · 非送达证据','Simulated OS notification · Not delivery evidence'),'warn')}<h2>${t('点击会去哪里？','Where does a tap lead?')}</h2><div class="card"><p class="meta">${icon('bell')} ENMORI · 16:30</p><h3>${state.lockscreen==='hidden'?t('锁屏不显示内容','Hidden on lock screen'):t('你有一条新消息','You have a new message')}</h3><p class="small">${t('没有签到、心情、位置或生成正文。','No Check-in, mood, location or generated text.')}</p>${button('notification-open',t('模拟点击通知','Simulate notification tap'),'primary full')}</div><p>${t('打开后重新确认账号、消息归属、数据许可和有效性。无法读取时显示不可用；不落到错误话题，也不自动发送。','Opening rechecks the account, message ownership, permissions and validity. Unreadable content shows as unavailable, without landing in a wrong topic or sending a reply.')}</p>${notice(t('分别待验证：App 前台出现、后台系统通知、应用关闭后实际机制。这里的按钮不证明任何后台投递能力。','Separate evidence is needed for foreground appearance, background notification, and delivery after the app closes. This button proves none of those delivery capabilities.'))}${button('simulate-expired',t('模拟点击时来源已撤回','Simulate source revoked at tap'),'full')}`;
}
function entryView(kind) {
  if(kind==='home')return `<p class="section-eyebrow">${t('首页入口示意','Home entry concept')}</p><h2 class="hero-title">${t('今天，慢慢来。','Take today at your pace.')}</h2><div class="card"><h3>${t('给自己留一点空间','A little space for yourself')}</h3><p>${t('进入 AI 伙伴。不会因为打开首页就读取或发送你的签到。','Open AI companion. Opening Home does not read or send your Check-ins to AI.')}</p>${button('home',t('去聊聊','Open AI'),'primary full')}</div>`;
  const source=sources[kind==='checkin'?'checkin':'going'];
  return `${pill(t('其他模块入口示意 · 不改业务状态','Entry concept · No business-state change'))}<h2>${source.title()}</h2><p class="small">${source.time()}</p><div class="card"><p>${source.body()}</p><p>${source.facts()}</p></div>${button(kind==='checkin'?'discuss-checkin':'discuss-going',t('带这条记录去聊聊…','Discuss this record…'),'primary full')}<p class="small">${t('下一步先审阅本次参考；不会自动生成或改变 Interested / Going。','Review reference scope next. No automatic generation or changes to Interested / Going.')}</p>`;
}
function composer() {
  if(state.view!=='home'){ $('composer').innerHTML='';return; }
  const blocked=busy()||state.phase==='failed'||state.sourceState!=='current'&&activeRefs().length>0;
  $('composer').innerHTML=`<div class="composer-wrap">${state.replyTarget?`<div class="composer-target">${t('回复：今天 16:30 的主动跟进 · 明天的节奏','Replying to: today’s 16:30 follow-up · Tomorrow’s pace')}</div>`:''}<div class="composer-top">${button('references',`${t('本次参考','References')} · ${activeRefs().length}`, '',busy()?'disabled':'')}${button('processing',state.processing==='local'?t('本地服务','Local service'):t('云端演示','Cloud demo'),'',busy()?'disabled':'')}</div><label for="draft">${t('写下你想说的','Your message')}</label><div class="compose-row"><textarea id="draft" rows="1" placeholder="${t('不必急着整理好…','No need to have it all figured out…')}" ${busy()?'readonly':''}>${esc(draft())}</textarea>${button('send',icon('arrow'),'primary icon-button',`aria-label="${t('发送合成消息','Send synthetic message')}" ${blocked||!validText(draft())?'disabled':''}`)}</div><div class="count">${scalarCount(draft())} / 2400${scalarCount(draft())>2400?t(' · 超过上限',' · Over limit'):''}</div></div>`;
}
function render(scroll=false) {
  header();
  const views={followup:followupView,'switch-confirm':switchConfirmView,home:homeView,welcome:welcomeView,proactive:proactiveView,why:whyView,references:referencesView,attach:attachView,source:sourceView,history:historyView,'new-topic':newTopicView,processing:processingView,settings:settingsView,privacy:privacyView,delete:deleteView,notification:notificationView,'home-entry':()=>entryView('home'),'checkin-entry':()=>entryView('checkin'),'event-entry':()=>entryView('event'),searchResult:()=>state.topic==='fresh'||state.deletedTopics.includes(state.topic)?notice(t('这段消息不再可用。','This message is no longer available.')):`<p class="section-eyebrow">${t('当前会话 · 附近消息','Current conversation · Nearby messages')}</p><div class="message user">${state.topic==='walk'?t('周末想散步。','I would like a weekend walk.'):t('我想给自己一点休息时间。','I want a little time to rest.')}</div><div class="message assistant">${state.topic==='walk'?t('你希望走多久？','How long would you like to walk?'):t('你希望怎样安排这段时间？','How would you like to spend that time?')}</div>${button('home',t('回到同一草稿','Return to the same draft'),'primary full')}`};
  const hidden=state.phase==='deleteUnknown'&&['home','history','searchResult','proactive','why','source'].includes(state.view);
  if(state.deletedTopics.includes(state.topic))state.topic='fresh';
  $('screen').innerHTML=(state.feedback?`<div class="feedback" role="status">${state.feedback}</div>`:'')+(hidden?phaseView():(views[state.view]||homeView)());
  composer();
  $('app-nav').innerHTML=`<div class="app-nav">${button('home-entry',t('首页','Home'),state.view==='home-entry'?'active':'')}${button('home',t('AI 伙伴','AI'),state.view==='home'?'active':'')}${button(state.mode==='B'?'privacy':'history',state.mode==='B'?t('历史管理','Manage history'):t('历史','History'),['history','privacy'].includes(state.view)?'active':'',busy()?'disabled':'')}${button('settings',t('联系设置','Contact'),state.view==='settings'?'active':'')}</div>`;
  $('mode-note').textContent={A:'A 保留多对话入口，主动消息另开卡片；尚未选择。',B:'B 展示单一时间线；原型仍保留历史管理及删除，不合并数据。',C:'C 为推荐评估候选，尚未选择；先沿用现有会话与删除边界。'}[state.mode];
  if(scroll){$('screen').scrollTop=0;$('screen').focus({preventScroll:true});}
}

function requestTopic(id, view, reply=false, discard=false) {
  if(busy())return;
  if(state.deletedTopics.includes(id)){go('proactive');return;}
  if(state.topic!==id&&draft().trim()&&!discard){state.pendingSwitch={id,view,reply};go('switch-confirm');return;}
  const changed=state.topic!==id;
  if(discard)state.draftText='';
  if(changed){state.refs=view==='proactive'||reply?['follow']:[];state.excluded=[];state.sentText='';state.query='';}
  state.topic=id;state.replyTarget=reply;
  if(view==='proactive')state.unread=false;
  go(view);
}

function preserveScrollRender(){const top=$('screen').scrollTop;render();$('screen').scrollTop=top;}
document.addEventListener('input',(event)=>{
  const el=event.target;
  if(el.id==='draft'){state.draftText=el.value;const send=document.querySelector('[data-action="send"]');send.disabled=busy()||state.phase==='failed'||state.sourceState!=='current'&&activeRefs().length>0||!validText(el.value);document.querySelector('.count').textContent=`${scalarCount(el.value)} / 2400${scalarCount(el.value)>2400?t(' · 超过上限',' · Over limit'):''}`;}
  if(el.id==='search-query'){const pos=el.selectionStart;state.query=el.value;const top=$('screen').scrollTop;render();const input=$('search-query');input.focus({preventScroll:true});if(input.type!=='search')input.setSelectionRange(pos,pos);$('screen').scrollTop=top;}
});
document.addEventListener('change',(event)=>{
  const el=event.target;
  if(el.id==='follow-confirm'){state.followConfirmed=el.checked;preserveScrollRender();}
  if(el.id==='follow-time'){state.followTime=el.value;preserveScrollRender();}
  if(el.id==='demo-consent'){state.consentDemo=el.checked;preserveScrollRender();}
  if(el.id==='cloud-consent'){state.cloudConsent=el.checked;preserveScrollRender();}
  if(el.id==='enabled'){state.enabled=el.checked;state.paused=false;preserveScrollRender();}
  if(el.dataset.category){state.categories[el.dataset.category]=el.checked;}
  const keys={'zone':'zone','frequency':'frequency','quiet-start':'quietStart','quiet-end':'quietEnd','lockscreen':'lockscreen'};
  if(keys[el.id]){state[keys[el.id]]=el.value;preserveScrollRender();}
  if(el.id==='push')state.push=el.checked;
});
document.addEventListener('click',(event)=>{
  const target=event.target.closest('[data-action]'); if(!target||target.disabled)return;
  const action=target.dataset.action;
  if(busy()&&(['new-topic','confirm-new','confirm-switch','history','references','processing','reply','notification-open','discuss-checkin','discuss-going','delete','confirm-delete','followup'].includes(action)||action.startsWith('history-')||action.startsWith('attach-')||action.startsWith('exclude-'))){feedback(t('先核对当前操作；不会切换话题或重复发送。','Resolve the current operation first; no topic switch or resend.'));return;}
  if(action.startsWith('source-')){const id=action.slice(7);if(sources[id])go('source',{sourceId:id});return;}
  if(action.startsWith('exclude-')){const id=action.slice(8);if(!sources[id])return;state.excluded=state.excluded.includes(id)?state.excluded.filter(x=>x!==id):[...state.excluded,id];preserveScrollRender();return;}
  if(action.startsWith('attach-')){const id=action.slice(7);if(!sources[id])return;if(!state.refs.includes(id))state.refs.push(id);state.excluded=state.excluded.filter(x=>x!==id);feedback(t('已附加到本次草稿。尚未发送；发送前仍需核对。','Attached to this draft. Not sent; still needs a pre-send check.'));return;}
  if(action.startsWith('history-')){requestTopic(action.slice(8),'home');return;}
  switch(action){
    case 'back':back();break;
    case 'home':home();break;
    case 'start':if(state.consentDemo)home();break;
    case 'proactive':requestTopic('follow','proactive');break;
    case 'why':go('why');break;
    case 'references':state.referenceReturn=state.view;go('references');break;
    case 'refs-done':go(state.referenceReturn==='proactive'?'proactive':'home');break;
    case 'attach':go('attach');break;
    case 'history':if(!busy())go('history');break;
    case 'settings':go('settings');break;
    case 'followup':state.followConfirmed=false;go('followup');break;
    case 'confirm-followup':if(!state.followConfirmed||!state.followTime||state.zone==='unknown')return;state.enabled=true;state.categories.follow=true;home();feedback(t('已确认合成跟进，关联当前话题。没有建立真实调度，也未开启系统推送。','Synthetic follow-up confirmed for this topic. No real schedule was created and OS push remains unchanged.'));break;
    case 'processing':if(!busy())go('processing');break;
    case 'privacy':go('privacy');break;
    case 'new-topic':if(!busy())go('new-topic');break;
    case 'confirm-new':if(busy())return;state.topic='fresh';state.refs=[];state.excluded=[];state.sentText='';state.replyTarget=false;home();break;
    case 'confirm-switch':if(state.pendingSwitch){const p=state.pendingSwitch;state.pendingSwitch=null;requestTopic(p.id,p.view,p.reply,true);}break;
    case 'reply':if(state.proactiveState!=='valid'||state.deletedTopics.includes('follow'))return;requestTopic('follow','home',true);break;
    case 'send':if(busy()||!validText(draft())||state.phase==='failed')return;if(state.sourceState!=='current'&&activeRefs().length){go('references');return;}state.phase='pending';render();$('screen').scrollTop=$('screen').scrollHeight;break;
    case 'cancel':state.phase='cancelUnknown';render();break;
    case 'unknown':state.phase='unknown';render();break;
    case 'finish':state.sentText=draft();state.draftText='';state.phase='ready';state.refs=[];state.excluded=[];render();break;
    case 'check-result':state.resultChecked=true;render();break;
    case 'leave':go('home-entry');break;
    case 'retry-confirmed':state.phase='pending';render();break;
    case 'load-earlier':feedback(t('更早页读取失败。保留查找词、当前结果与游标，未将失败当成空结果。','Earlier-page read failed. Query, current results and cursor remain; failure is not an empty result.'));break;
    case 'search-result':go('searchResult');break;
    case 'choose-local':state.processing='local';home();break;
    case 'choose-cloud':if(state.cloudConsent){state.processing='cloud';home();}break;
    case 'retry-source':feedback(t('核对仍失败，保留未知状态。可返回明确排除此项。','Check still failed; the state remains unknown. You can go back and explicitly exclude it.'));break;
    case 'accept-current':state.sourceState='current';go('references');break;
    case 'pause':state.paused=!state.paused;preserveScrollRender();break;
    case 'turn-off':state.enabled=false;state.paused=false;feedback(t('演示中已关闭：新生成停止，未投递项取消。已有会话保留。','Off in this demo: new generation stops and undelivered items are cancelled. Saved conversations remain.'));break;
    case 'save-settings':feedback(t('演示设置保存在本页内存中，刷新重置；未改变任何真实通知设置。','Demo settings stay in page memory until refresh. No real notification settings changed.'));break;
    case 'notification':go('notification');break;
    case 'notification-open':requestTopic('follow','proactive');break;
    case 'simulate-expired':state.unread=false;state.proactiveState='revoked';state.sourceState='revoked';go('proactive');break;
    case 'delete':go('delete');break;
    case 'confirm-delete':if(busy())return;state.deletedTopics.push(state.topic);state.draftText='';state.sentText='';state.refs=[];state.excluded=[];state.phase='ready';state.topic='fresh';go('history');break;
    case 'unknown-delete':state.phase='deleteUnknown';home();break;
    case 'check-delete':feedback(t('仍未确认，不显示旧内容，也没有重建会话。','Still unconfirmed. Old content remains hidden and no conversation is recreated.'));break;
    case 'home-entry':go('home-entry');break;
    case 'discuss-checkin':state.refs=['checkin'];state.excluded=[];state.referenceReturn='home';go('references');break;
    case 'discuss-going':state.refs=['going'];state.excluded=[];state.referenceReturn='home';go('references');break;
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
