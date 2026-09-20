import { topics, modes, defaults, sanitizeSettings, speechFor, labelFor, talkPrompt } from './content.js';
import { art, heroArt, icon } from './art.js';
import { createNarrator } from './audio.js';
import { line } from './speech.js';
import { PlayClock, createRound, resetStep, interact, choose, nextStep } from './session.js';
import { createGameSession } from '../../shared/sdk.js';
import { registerOffline } from '../../shared/pwa.js';

const $ = id => document.getElementById(id);
const KEY = 'tiny-wonderland-v1';
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* Playing does not require storage. */ }
let settings = sanitizeSettings(saved.settings || defaults);
const progress = Object.fromEntries(topics.map(topic => [topic.id, {
  cursor: Number.isSafeInteger(saved.progress?.[topic.id]?.cursor) && saved.progress[topic.id].cursor >= 0 ? saved.progress[topic.id].cursor % topic.items.length : 0,
  seen: Array.isArray(saved.progress?.[topic.id]?.seen) ? [...new Set(saved.progress[topic.id].seen.filter(id => topic.items.some(entry=>entry.id===id)))] : [],
}]));
let round = null, clock = null, segment = null, view = 'home', noticeTimer, gateAnswer, promptClip;
let sessionMode = null;
const narrator = createNarrator(notify);
function save() { try { localStorage.setItem(KEY,JSON.stringify({settings,progress})); } catch { /* Keep changes for this visit. */ } }
function notify(message) { $('audio-notice').textContent=message; $('audio-notice').hidden=false; clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>$('audio-notice').hidden=true,4500); }
function applySettings() {
  narrator.setEnabled(settings.sound);
  document.body.classList.toggle('reduce-motion',!settings.motion);
  $('sound-toggle').innerHTML=icon(settings.sound?'sound':'mute');
  $('sound-toggle').setAttribute('aria-label',settings.sound?'关闭声音':'打开声音');
  $('sound-toggle').setAttribute('aria-pressed',String(settings.sound));
}
function speak(clip) { narrator.play(clip); }
function say(id) { speak(line(id,settings.language)); }
function startSegment(mode) { segment=createGameSession('tiny-wonderland'); segment.start(mode); sessionMode=mode; }
function finishSegment() {
  if (!segment || !round) return;
  const elapsed=clock.tick()/1000;
  segment.finish({mode:sessionMode,score:0,seconds:elapsed});
  segment=null;
}
function markSeen() { if (!progress[round.topic.id].seen.includes(round.item.id)) progress[round.topic.id].seen.push(round.item.id); save(); }
function setPrompt() {
  promptClip = round.mode === 'talk' ? {text:talkPrompt(round.topic,settings.language),language:settings.language} : speechFor(round.topic,round.item,settings.language,round.mode==='find'?'find':'name');
}
function begin(topicId) {
  clock?.pause();
  const topic=topics.find(topic=>topic.id===topicId); if (!topic) return;
  round=createRound(topic,settings,progress[topicId].cursor);
  clock=new PlayClock(); clock.resume(); startSegment(round.mode);
  view='play'; setPrompt(); renderPlay(); speak(promptClip); window.scrollTo({top:0,behavior:'instant'});
}
function home() {
  if (round) clock.pause();
  narrator.stop(); round=null; clock=null; segment=null; view='home'; renderHome(); window.scrollTo({top:0,behavior:'instant'});
}
function renderHome() {
  const seen=topics.filter(topic=>progress[topic.id].seen.length).length;
  $('main').innerHTML=`<section class="hero"><div class="hero-copy"><p class="eyebrow"><i></i> 和你一起，好奇每一天</p><h1>小小世界，<br><em>大大发现。</em></h1><p class="hero-description">听一听，点一点，说一说。<br>陪小宝贝，把世界一点点装进口袋。</p><div class="hero-actions"><button class="primary" data-action="begin" data-topic="animals">一起去发现 ${icon('arrow')}</button><span>每次一小会儿，快乐刚刚好</span></div></div><div class="hero-art">${heroArt()}<span class="floating-label">${icon('heart')} MADE FOR LITTLE WONDERS</span></div></section><section aria-labelledby="topics-title"><div class="section-head"><div><h2 id="topics-title">今天想去哪里玩？<span>✳</span></h2><p>8 个小世界，藏着好多新朋友</p></div><span>${seen ? `已经去过 ${seen} 个小世界` : '跟着好奇心出发'}</span></div><div class="topic-grid">${topics.map((topic,index)=>`<button class="topic-card" data-action="begin" data-topic="${topic.id}" style="--card-bg:${topic.bg};--card-color:${topic.color}" aria-label="进入${topic.name}"><div class="card-art"><span class="card-index">0${index+1} / EXPLORE</span>${art(topic.icon)}${progress[topic.id].seen.length?`<span class="card-seen">${icon('leaf')}来玩过啦</span>`:''}</div><div class="card-body"><span class="card-arrow">${icon('arrow')}</span><h3>${topic.name}</h3><p>${topic.subtitle}</p></div></button>`).join('')}</div></section><aside class="together-strip"><span class="strip-icon">${icon('chat')}</span><div><h3>最好的探索，是和你一起。</h3><p>孩子说“小猫”，你可以接“小猫喵喵叫”。不着急，让表达慢慢发生。</p></div><span class="strip-right">${icon('clock')}${settings.minutes} 分钟亲子小时光</span></aside>`;
}
function scene() {
  const {topic,item,completed,count}=round;
  if (topic.id==='numbers') return `<div class="scene number-scene"><div class="number-badge">${item.value}</div><div class="train-stage ${completed?'vehicle-moving':''}">${art('train')}<div class="wagon ${item.value>5?'many':''}">${Array.from({length:count},()=>art('apple')).join('')||'<span class="count-placeholder">等苹果上车</span>'}</div></div></div>`;
  if (topic.id==='animals') return `<div class="scene animals"><span class="scene-spark">${round.fed?'♡':'✧'}</span><button class="scene-main ${round.hidden?'animal-hidden':completed?'wave':''}" data-action="interact" aria-label="${round.hidden?'找到躲起来的小动物':escape(topic.action)}">${art(item.art)}${round.hidden?'<span class="peekaboo-bush">?</span>':''}</button>${round.fed?'<span class="snack-bowl"><i></i><i></i><i></i></span>':''}<div class="scene-side">${art('flower')}</div></div>`;
  if (topic.id==='letters') return `<div class="scene"><div class="letter-stage ${completed?'':'closed'}"><button class="letter-tile" data-action="letter" aria-label="听字母 ${item.letter}">${item.letter}</button><button class="scene-main letter-object" data-action="interact" aria-label="打开 ${item.letter} 的字母礼物">${art(item.art)}<small>${item.en}</small></button></div></div>`;
  if (topic.id==='shapes') return `<div class="scene"><div class="shape-hole">${art(item.art)}</div><button class="scene-main shape-piece ${completed?'placed':''}" data-action="interact" aria-label="把${item.zh}积木放进去">${art(item.art)}</button></div>`;
  if (topic.id==='fruit') return `<div class="scene"><div class="fruit-bear">${art('bear')}</div><button class="scene-main fruit-piece ${completed?'fed':''}" data-action="interact" aria-label="把${item.zh}喂给小熊" ${completed?'disabled':''}>${art(item.art)}</button>${completed?'<span class="scene-spark">♡</span>':''}</div>`;
  if (topic.id==='life') return `<div class="scene life-scene ${completed&&item.id==='sleep'?'sleeping':''} ${completed&&['hello','bye'].includes(item.id)?'goodbye':''}"><div class="fruit-bear">${art('bear')}</div><button class="scene-main ${completed?'pop':''}" data-action="interact" aria-label="${item.zh}">${art(item.art)}</button>${completed&&item.id==='wash'?'<span class="scene-spark">◌ ◦ ◌</span>':''}</div>`;
  return `<div class="scene ${topic.id} ${completed&&topic.id==='colors'?'flowers-bloom':''}"><span class="scene-spark">✧</span><span class="scene-spark small">✦</span><button class="scene-main ${completed?(topic.id==='vehicles'?'vehicle-moving':'wave'):''}" data-action="interact" aria-label="${escape(topic.action)}">${art(item.art,{color:topic.id==='colors'&&!completed?'#d5d5bf':item.color})}</button><div class="scene-side">${art(topic.id==='animals'?'flower':topic.id==='colors'?'cup':'house')}</div></div>`;
}
function choiceArt(entry) {
  if(round.topic.id==='letters') return `<span class="choice-letter">${entry.letter}</span>`;
  if(round.topic.id==='numbers') return `<span class="number-items ${entry.value>5?'many':''}">${Array.from({length:entry.value},()=>art('apple')).join('')}</span>`;
  return art(entry.art,{color:entry.color});
}
function renderPlay(focusId) {
  if(!round||view!=='play')return;
  const {topic,item,mode,completed}=round, english=settings.language==='en';
  const label=labelFor(topic,item,settings.language);
  const title=mode==='find' ? (topic.id==='numbers'?(english?`Find ${item.englishPhrase}`:`找找${item.phrase}`):english?`Where is ${label}?`:`${label}在哪里？`) : mode==='talk' ? talkPrompt(topic,settings.language) : topic.id==='letters' ? `${item.letter} · ${item.en}` : label;
  let content;
  if(mode==='find') content=`${topic.id==='letters'?`<div class="target-hint" aria-label="目标字母 ${item.letter}">${item.letter}</div>`:''}<div class="find-choices ${round.choices.length===3?'three':''}">${round.choices.map(entry=>`<button class="choice ${completed&&entry.id===item.id?'correct':''}" data-action="choose" data-choice="${entry.id}" aria-label="选择${escape(labelFor(topic,entry,settings.language))}" ${completed?'disabled':''}>${choiceArt(entry)}<span class="choice-label">${topic.id==='letters'?'':escape(labelFor(topic,entry,settings.language))}</span>${completed&&entry.id===item.id?`<span class="success-mark">${icon('check')}</span>`:''}</button>`).join('')}</div>`;
  else if(mode==='talk') content=`<div class="scene"><button class="scene-main" data-action="model" aria-label="听说话示范">${topic.id==='letters'?`<span class="letter-tile">${item.letter}</span>`:topic.id==='numbers'?`<span class="number-items">${Array.from({length:item.value},()=>art('apple',{className:'talk-apple'})).join('')}</span>`:art(item.art,{color:item.color})}</button></div><div class="scene-caption"><button class="talk-model" data-action="model" aria-label="听说话示范：${escape(english||topic.id==='letters'?item.englishPhrase:item.phrase)}">${icon('sound')}${escape(english||topic.id==='letters'?item.englishPhrase:item.phrase)}</button></div>`;
  else content=scene();
  const caption=round.feedback || (mode==='talk'?(english?'Say it, point to it, or listen together.':'说一说、指一指，爸爸妈妈示范也可以。'):mode==='find'?(english?'Tap the one you find.':'点一点，把它找出来。'):topic.id==='numbers'?(english?`${round.count} / ${item.value} apples aboard`:`已经装了 ${round.count} / ${item.value} 个苹果`):english?topic.actionEn:topic.action);
  let primaryAction=mode==='listen'?`<button class="secondary" id="scene-action" data-action="interact">${icon(completed?'sound':'play')}${completed?(english?'Hear it again':'再听一遍'):(english?topic.actionEn:topic.action)}</button>`:mode==='talk'?`<button class="secondary" id="scene-action" data-action="interact">${icon(completed?'heart':'chat')}${completed?(english?'We did it together':'一起表达过啦'):(english?'We tried together':'我们一起试过啦')}</button>`:'';
  if(mode==='listen'&&topic.id==='animals'){
    if(round.hidden)primaryAction=`<button class="secondary" id="scene-action" data-action="interact">${icon('search')}${english?'Find our friend':'找到小伙伴'}</button>`;
    primaryAction+=`<button class="secondary" data-action="animal-feed">${english?'Snack time':'喂点心'}</button><button class="secondary" data-action="animal-hide">${english?'Peekaboo':'捉迷藏'}</button>`;
  }
  $('main').innerHTML=`<div class="activity-header"><div class="activity-heading"><button class="icon-button" data-action="pause" aria-label="暂停并返回">${icon('back')}</button><div><h1>${topic.name}</h1><p>${topic.en.toUpperCase()}</p></div></div><div class="session-tools"><span class="session-counter">${icon('clock')}${settings.minutes} 分钟小探索</span><button class="icon-button" data-action="pause" aria-label="暂停游戏">${icon('pause')}</button></div></div><nav class="mode-tabs" aria-label="选择玩法">${modes.map(entry=>`<button class="mode-tab ${mode===entry.id?'active':''}" data-action="mode" data-mode="${entry.id}" aria-pressed="${mode===entry.id}">${icon(entry.icon)}${entry.name}</button>`).join('')}</nav><section class="play-panel" style="--scene-bg:${topic.bg}" aria-labelledby="activity-title"><div class="play-heading"><div class="step-label">LITTLE DISCOVERY · ${String(round.discoveries+ (completed?0:1)).padStart(2,'0')}</div><h2 id="activity-title">${escape(title)}</h2><p>${mode==='listen'?(english?'A little tap, a little discovery.':'每点一下，都有一个小发现。'):mode==='find'?(english?'Listen, look, and take your time.':'听一听，慢慢找，不着急。'):(english?'A little chat with your family.':'和爸爸妈妈一起，轮流说一说。')}</p></div><button class="icon-button replay" data-action="replay" aria-label="重听提示">${icon('sound')}</button>${content}<p class="scene-caption" role="status">${escape(caption)}</p><div class="play-actions">${primaryAction}<button class="primary next-button" id="next-step" data-action="next">${round.discoveries>=5?(english?'Say goodbye':'和朋友说拜拜'):completed?(english?'Next discovery':'下一个发现'):(english?'Try another':'换一个看看')}${icon('arrow')}</button></div><div class="progress-row" aria-label="已完成 ${round.discoveries} 个小发现，共五个">${Array.from({length:5},(_,i)=>`<span class="progress-dot ${i<round.discoveries?'done':''}"></span>`).join('')}<span>每个小小的尝试，都值得被看见</span></div></section>${topic.id==='letters'?`<nav class="alphabet-picker" aria-label="选择字母">${topic.items.map(entry=>`<button class="word-chip ${entry.id===item.id?'active':''}" data-action="pick" data-item="${entry.id}" aria-label="探索字母 ${entry.letter}" aria-pressed="${entry.id===item.id}">${entry.letter}</button>`).join('')}</nav>`:`<nav class="word-strip" aria-label="选择探索内容">${round.pool.map(entry=>`<button class="word-chip ${entry.id===item.id?'active':''}" data-action="pick" data-item="${entry.id}" aria-pressed="${entry.id===item.id}">${escape(labelFor(topic,entry,settings.language))}</button>`).join('')}</nav>`}<aside class="parent-whisper">${icon('heart')}<p><b>陪玩小提示</b> · ${topic.tip}</p></aside>`;
  if(focusId)$(focusId)?.focus({preventScroll:true});
}
function action() {
  if(!round||view!=='play')return;
  if(round.hidden){round.hidden=false;if(interact(round))markSeen();round.feedback=settings.language==='en'?'Peekaboo! You found me!':'找到啦，原来你在这里！';say('found');renderPlay();return;}
  if(round.completed){speak(speechFor(round.topic,round.item,settings.language,'phrase'));return;}
  const done=interact(round);
  if(done)markSeen();
  const {topic,item}=round;
  if(topic.id==='numbers'&&round.mode==='listen') speak(speechFor(topic,topic.items[round.count-1],settings.language));
  else speak(speechFor(topic,item,settings.language,'phrase'));
  if(done)round.feedback=topic.id==='fruit'?(settings.language==='en'?'Yummy! Thank you.':'小熊吃到了，谢谢你。'):topic.id==='shapes'?(settings.language==='en'?'The block found a home.':'积木找到家啦。'):settings.language==='en'?'A lovely little discovery!':'又有一个小发现啦！';
  renderPlay(done?'next-step':'scene-action');
}
function answer(id) {
  const result=choose(round,id);
  if(result==='ignored')return;
  if(result==='retry'){round.feedback=settings.language==='en'?"Let's look together. You can listen again.":'我们一起再找找，也可以再听一次。';say('again');}
  else {round.feedback=settings.language==='en'?'You found it!':'找到啦！';markSeen();speak(speechFor(round.topic,round.item,settings.language,'phrase'));}
  renderPlay(result==='found'?'next-step':undefined);
}
function animalAction(kind) {
  if(kind==='hide'){round.hidden=true;round.fed=false;round.feedback=settings.language==='en'?'Tap the bush. Who is hiding?':'点点小树丛，谁藏在里面呀？';speak(speechFor(round.topic,round.item,settings.language,'find'));}
  else {round.hidden=false;round.fed=true;if(interact(round))markSeen();round.feedback=settings.language==='en'?'Yummy! Thank you for the snack.':'小动物吃到了，谢谢你的点心。';speak(speechFor(round.topic,round.item,settings.language,'phrase'));}
  renderPlay();
}
function advance() {
  if(!nextStep(round)){finish('done');return;}
  progress[round.topic.id].cursor=round.cursor;save();setPrompt();renderPlay();speak(promptClip);
}
function pick(id) {
  const index=round.pool.findIndex(item=>item.id===id);if(index<0||index===round.cursor)return;
  if(round.discoveries>=5){finish('done');return;}
  round.cursor=index;resetStep(round);progress[round.topic.id].cursor=index;save();setPrompt();renderPlay();speak(promptClip);
}
function changeMode(mode) {
  if(round.mode===mode||!modes.some(entry=>entry.id===mode))return;
  if(round.discoveries>=5){finish('done');return;}
  round.mode=mode;resetStep(round);setPrompt();renderPlay();speak(promptClip);
}
function finish(reason) {
  if(view!=='play')return;
  clock.pause();finishSegment();view='done';
  progress[round.topic.id].cursor=(round.cursor+1)%round.pool.length;save();
  const topic=round.topic;
  $('main').innerHTML=`<section class="completion"><div class="completion-art">${art('bear')}</div><p class="eyebrow">${icon('leaf')} EVERY LITTLE WONDER COUNTS</p><h1>${reason==='rest'?'小世界要休息啦':'今天也有好多小发现'}</h1><p>谢谢你，陪小伙伴度过了开心的时光。<br>现在，去真实的世界里继续发现吧。</p><div class="real-world"><b>把小发现带回生活里</b>${topic.tip}</div><button class="primary" data-action="home">${icon('home')}和朋友说拜拜，回到乐园</button></section>`;
  say(reason);window.scrollTo({top:0,behavior:'instant'});
}
function syncClock() { if(!clock||view!=='play')return; if(document.hidden||$('parent-dialog').open||$('pause-dialog').open)clock.pause();else clock.resume(); }
function pause() { if(view!=='play'){home();return;} narrator.stop();clock.pause();$('pause-dialog').showModal(); }
function openParent() {
  narrator.stop();clock?.pause();
  const a=6+Math.floor(Math.random()*4),b=3+Math.floor(Math.random()*5);gateAnswer=a+b;
  $('parent-gate').hidden=false;$('settings-form').hidden=true;$('gate-question').textContent=`${a} + ${b} = ?`;$('gate-answer').value='';$('gate-error').textContent='';
  $('parent-dialog').showModal();
}
$('main').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
  const kind=button.dataset.action;
  if(kind==='begin'){begin(button.dataset.topic);return;}
  if(kind==='home'){home();return;}
  if(!round||view!=='play')return;
  if(clock.tick()>=settings.minutes*60000){finish('rest');return;}
  ({pause,interact:action,'animal-feed':()=>animalAction('feed'),'animal-hide':()=>animalAction('hide'),choose:()=>answer(button.dataset.choice),next:advance,pick:()=>pick(button.dataset.item),mode:()=>changeMode(button.dataset.mode),replay:()=>speak(promptClip),model:()=>speak(speechFor(round.topic,round.item,settings.language,'phrase')),letter:()=>speak(speechFor(round.topic,round.item,settings.language,'letter'))})[kind]?.();
});
$('brand-icon').innerHTML=art('sun');$('footer-leaf').innerHTML=icon('leaf');$('parent-open').innerHTML=`${icon('lock')}家长设置`;$('pause-art').innerHTML=art('moon');
$('brand-home').addEventListener('click',()=>view==='play'?pause():home());
$('sound-toggle').addEventListener('click',()=>{settings.sound=!settings.sound;applySettings();save();if(settings.sound)speak(view==='play'?promptClip:line('welcome',settings.language));});
$('parent-open').addEventListener('click',openParent);
$('parent-close').addEventListener('click',()=>$('parent-dialog').close());
$('parent-dialog').addEventListener('close',syncClock);
$('gate-form').addEventListener('submit',event=>{event.preventDefault();if(Number($('gate-answer').value.trim())!==gateAnswer){$('gate-error').textContent='再算一次，或请爸爸妈妈来帮忙。';return;}$('parent-gate').hidden=true;$('settings-form').hidden=false;for(const [key,value]of Object.entries(settings)){const input=$('settings-form').elements.namedItem(key);if(input.type==='checkbox')input.checked=value;else input.value=value;}$('settings-form').elements.namedItem('language').focus();});
$('settings-form').addEventListener('submit',event=>{
  event.preventDefault();const form=$('settings-form').elements;
  const next=sanitizeSettings({language:form.language.value,level:form.level.value,minutes:Number(form.minutes.value),sound:form.sound.checked,motion:form.motion.checked});
  const levelChanged=next.level!==settings.level;
  settings=next;applySettings();save();
  if(view==='play'){
    if(levelChanged){const discoveries=round.discoveries;round=createRound(round.topic,settings,round.cursor,round.mode);round.discoveries=discoveries;}else round.settings={...settings};
    setPrompt();renderPlay();
  }else if(view==='home')renderHome();
  $('parent-dialog').close();notify('设置已保存，按自己的节奏慢慢玩。');
  if(view==='play'&&clock.tick()>=settings.minutes*60000)finish('rest');
});
$('resume').addEventListener('click',()=>{$('pause-dialog').close();speak(promptClip);});
$('leave-round').addEventListener('click',()=>{$('pause-dialog').close();home();});
$('pause-dialog').addEventListener('close',syncClock);
document.addEventListener('visibilitychange',()=>{if(document.hidden)narrator.stop();syncClock();});
window.addEventListener('pagehide',()=>{narrator.stop();clock?.pause();});
window.addEventListener('pageshow',event=>{if(event.persisted&&view==='play')syncClock();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&view==='play'&&!$('pause-dialog').open&&!$('parent-dialog').open){event.preventDefault();pause();}});
setInterval(()=>{if(view==='play'&&clock&&clock.last!==null&&clock.tick()>=settings.minutes*60000)finish('rest');},1000);
applySettings();renderHome();registerOffline();
