import { activities } from './catalog.js';
import { act, createRound, nextRound, animals } from './model.js';
import { createProgression } from './progression.js';
import { art, drawing, puzzleArt } from './art.js';
import { createAudio } from './audio.js';
import { createGameSession, library } from '../sdk.js';
import { registerOffline } from '../pwa.js';
import { bindFullscreen } from '../fullscreen.js';

const $ = id => document.getElementById(id);
const activity = activities.find(item => item.id === document.body.dataset.game);
const session = createGameSession(activity.id);
let stageStorage;
try { stageStorage = globalThis.localStorage; } catch { /* Stage progress also works in memory. */ }
const progression = createProgression(stageStorage);
let state, mode = ['bear-care','flower-water'].includes(activity.id) ? 'gentle' : progression.mode(activity.id), active = false, paused = false, selected = null, locked = false, recorded = false;
let elapsed = 0, activeSince = 0, sound = library.read().settings.sound, pointer = null, ghost = null, suppressClickUntil = 0;
const timers = new Set();
const audio = createAudio(() => sound, () => { $('audio-note').hidden = false; });
document.documentElement.style.setProperty('--accent', activity.color);
document.documentElement.style.setProperty('--tint', activity.background);
document.title = `${activity.title} · 玩物亲子游戏`;
$('game-name').textContent = activity.title; $('english-name').textContent = activity.en;
$('parent-tip').textContent = activity.tip; $('skill').textContent = activity.skill;
$('level').closest('label').hidden = ['bear-care', 'flower-water'].includes(activity.id);
$('level').value = mode;
const soundIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4zM15 8q4 4 0 8m3-11q7 7 0 14"/></svg>';
function syncSound() {
  $('sound').innerHTML = `${soundIcon}<span class="button-label">${sound ? '声音开' : '声音关'}</span>`;
  $('sound').setAttribute('aria-label', sound ? '关闭声音' : '开启声音');
  $('sound').setAttribute('aria-pressed', String(sound));
}
function later(fn, ms) { const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); return timer; }
function clearTimers() { for (const timer of timers) clearTimeout(timer); timers.clear(); }
function stopTime() { if (activeSince) elapsed += performance.now() - activeSince; activeSince = 0; }
function cancelPointer() {
  ghost?.remove(); ghost = null; pointer = null;
  document.querySelectorAll('.drop-hover').forEach(node => node.classList.remove('drop-hover'));
}
function feedback(message, speak = false) { $('feedback').textContent = message; if (speak) audio.speak(message); }
function prompt() {
  if (state.id === 'bear-care') return state.steps[Math.min(state.progress, state.total - 1)].prompt;
  if (state.id === 'little-puzzle') return `拼出${state.picture.name}`;
  if (state.id === 'flower-water') return ['给小种子一点水吧', '发芽啦，再喝一点水吧', '长叶子啦，快要开花了'][Math.min(state.progress, 2)];
  if (state.id === 'bear-hide' && state.hidden) return '小熊藏在哪个盒子里？';
  if (state.id === 'animal-music') return state.song.name;
  return activity.intro;
}
function doneMessage() {
  if (state.id === 'little-puzzle') return `${state.picture.name}拼好啦！`;
  if (state.id === 'flower-water') return `${state.flower.name}开啦！`;
  return activity.done;
}
function speakPrompt() {
  if (state.id === 'animal-sounds' && !state.done) audio.speak(state.questions[state.progress].target.sound + '，谁在叫？');
  else audio.speak(prompt());
}
function dots() { $('progress').innerHTML = Array.from({ length: state.total }, (_, i) => `<i class="${i < state.progress ? 'filled' : ''}"></i>`).join(''); $('progress').setAttribute('aria-label', `已探索 ${state.progress}，共 ${state.total}`); }
function piece(item, markup, classes = '') { return `<button class="piece ${classes} ${state.placed.includes(item.id) ? 'placed' : ''} ${selected === item.id ? 'selected' : ''}" data-piece="${item.id}" aria-label="选择${item.name}" aria-pressed="${selected === item.id}" ${state.placed.includes(item.id) ? 'disabled' : ''}>${markup}</button>`; }
function render() {
  $('prompt').textContent = state.done ? doneMessage() : prompt();
  $('skill').innerHTML = `<b class="stage-chip">第 ${state.stage} 关</b><span>${state.stageTitle}</span>`;
  $('parent-tip').textContent = state.id === 'little-puzzle' ? `一起说说${state.picture.name}的样子，再找找家里的玩具或绘本。` : activity.tip;
  $('instructions').textContent = activity.instruction;
  dots();
  let content = '';
  if (state.id === 'shape-home') {
    content = `<div class="slots">${state.targets.map(shape => `<button class="slot ${state.placed.includes(shape.id) ? 'filled' : ''}" data-target="${shape.id}" aria-label="${shape.name}的家" ${state.placed.includes(shape.id) ? 'disabled' : ''}><span class="slot-label">${shape.name}</span>${art(shape.id, shape.color)}</button>`).join('')}</div><p class="scene-caption">每一块积木，都有自己的小家</p><div class="tray pieces">${state.items.map(item => piece(item, art(item.id, item.color))).join('')}</div>`;
  } else if (state.id === 'color-sort') {
    content = `<div class="slots">${state.targets.map(color => `<button class="basket slot" data-target="${color.id}" aria-label="${color.name}篮子">${art('basket', color.color)}<span class="basket-count">${state.items.filter(item => item.target === color.id && state.placed.includes(item.id)).map(() => '<i></i>').join('')}</span><span class="slot-label">${color.name}篮子</span></button>`).join('')}</div><div class="tray pieces color-pieces">${state.items.map(item => piece(item, art('circle', item.color))).join('')}</div>`;
  } else if (state.id === 'little-puzzle') {
    content = `<div class="puzzle-layout"><div class="puzzle-board" aria-label="${state.picture.name}拼图底板">${Array.from({ length: state.total }, (_, i) => `<button class="puzzle-slot ${state.placed.includes(String(i)) ? 'filled' : ''}" data-target="${i}" aria-label="${state.total === 2 ? ['左边', '右边'][i] : ['左上', '右上', '左下', '右下'][i]}的拼图位置" ${state.placed.includes(String(i)) ? 'disabled' : ''}>${puzzleArt(i, state.total, state.picture.id)}</button>`).join('')}</div><div class="puzzle-pieces">${state.items.map(item => piece(item, puzzleArt(Number(item.id), state.total, state.picture.id), `puzzle-piece ${state.total === 4 ? 'quarter' : ''}`)).join('')}</div></div>`;
  } else if (state.id === 'animal-sounds') {
    const question = state.questions[Math.min(state.progress, state.questions.length - 1)];
    content = `<button class="listen" data-action="listen">♪ 再听一遍</button><p class="sound-caption">“${question.target.sound}”</p><div class="animal-choices ${state.count === 3 ? 'three' : ''}">${question.choices.map(animal => `<button class="animal-choice" data-choice="${animal.id}" aria-label="${animal.name}">${art(animal.id)}<span>${animal.name}</span></button>`).join('')}</div>`;
  } else if (state.id === 'bear-hide') {
    content = `<div class="boxes hide-setting-${state.setting} ${state.count === 3 ? 'three' : ''}">${Array.from({ length: state.count }, (_, i) => {
      const visible = (!state.hidden || state.done) && i === state.hiding;
      return `<button class="box-button" data-choice="${i}" aria-label="打开${['左边', state.count === 2 ? '右边' : '中间', '右边'][i]}的盒子" ${!state.hidden ? 'disabled' : ''}>${visible ? art('box') : `<svg viewBox="0 0 200 200" class="illustration" aria-hidden="true"><rect x="33" y="83" width="134" height="98" rx="8" fill="#cda779"/><rect x="24" y="75" width="152" height="23" rx="7" fill="#e1c094"/><path d="M100 98v80" stroke="#fff" opacity=".25" stroke-width="6"/><circle cx="100" cy="138" r="16" fill="#fff" opacity=".2"/></svg>`}<span>${['左边', state.count === 2 ? '右边' : '中间', '右边'][i]}</span></button>`;
    }).join('')}</div>${!state.hidden ? '<button class="primary" data-action="hide">我看好啦，藏起来</button>' : '<p class="scene-caption">盒子没有换位置，慢慢想一想</p>'}`;
  } else if (state.id === 'bear-care') {
    const lastStep = state.steps[state.progress - 1], completedSteps = state.steps.slice(0,state.progress).map(step=>step.id);
    content = `<div class="care-bear">${art('bear', undefined, lastStep?.pose || 0)}<span class="care-status">${lastStep?.feedback || '小熊等着你'}</span>${lastStep && ['cup','book','ball'].includes(lastStep.id) ? `<span class="care-prop">${art(lastStep.id)}</span>` : ''}</div><div class="care-tools">${state.tools.map(step => `<button class="care-tool ${completedSteps.includes(step.id) ? 'done-tool' : ''}" data-choice="${step.id}" aria-label="${step.name}" ${completedSteps.includes(step.id) ? 'disabled' : ''}>${art(step.id)}<span>${step.name}</span></button>`).join('')}</div>`;
  } else if (state.id === 'flower-water') {
    const stage = state.progress;
    let plant = stage === 0 ? '<ellipse cx="100" cy="148" rx="12" ry="8" fill="#937451"/>' : `<path d="M100 160V${stage === 1 ? 124 : 87}" stroke="#789465" stroke-width="7" stroke-linecap="round"/><path d="M100 143q-37 0-33-25 27-3 33 25m0-12q30 0 27-23-23-1-27 23" fill="#95ae7d"/>${stage === 2 ? '<path d="M100 116q-39-8-31-33 26 0 31 33m0-12q36-4 30-26-23-2-30 26" fill="#83a06c"/>' : ''}`;
    if (stage === 3) plant = drawing('flower', state.flower.color, state.flower.variant);
    else plant += '<path d="M61 162h78l-10 31H71Z" fill="#c58f70"/><rect x="55" y="154" width="90" height="15" rx="6" fill="#d5a283"/>';
    content = `<div class="garden" style="--flower-color:${state.flower.color}"><span class="garden-sign">${state.flower.name}</span><svg viewBox="0 0 200 200" class="plant" aria-label="${['种子','嫩芽','长出叶子的小苗','盛开的花'][stage]}" role="img">${plant}</svg></div><button class="primary water-button" data-action="water">${art('watering')}<span>给小花喝水</span></button>`;
  } else if (state.id === 'animal-music') {
    content = `<div class="music-grid">${state.instruments.map(item => `<button class="music-key" style="--key-bg:${item.color}" data-instrument="${item.id}" aria-label="演奏${item.name}">${art(item.id)}<span>${item.name}</span><span class="note" aria-hidden="true">♪</span></button>`).join('')}</div><button class="text-button" data-action="melody">♪ 听一小段旋律</button>`;
  }
  $('scene').innerHTML = content;
  if (locked) $('scene').querySelectorAll('button').forEach(button => { button.disabled = true; });
}
function gate(kind) {
  const isComplete = kind === 'complete', isPaused = kind === 'pause';
  const preview = isComplete ? nextRound(state, () => .5) : null;
  $('gate').classList.toggle('stage-complete', isComplete);
  const description = isComplete ? `下一关：${preview.stageTitle}。${state.stage % 5 === 0 ? '已经玩了好几关，也可以先休息一下。' : '准备好，就和小伙伴继续探索吧。'}` : isPaused ? '这一关的发现都还在，准备好了再继续。' : `第 ${state.stage} 关 · ${state.stageTitle}`;
  $('gate').hidden = false; $('pause').disabled = !active; $('scene').inert = true;
  $('gate').innerHTML = `<span class="badge">${isComplete ? `第 ${state.stage} 关 · 完成啦` : isPaused ? 'TAKE YOUR TIME' : 'LITTLE PLAY · BIG DISCOVERIES'}</span>${art(isComplete ? state.id === 'little-puzzle' ? state.picture.id : 'flower' : activity.icon, state.flower?.color, state.flower?.variant)}<h2 id="gate-title">${isComplete ? doneMessage() : isPaused ? '歇一歇，等你回来' : activity.title}</h2><p>${description}</p><div class="gate-actions">${isComplete ? '<a class="secondary" href="../../index.html">回大厅休息</a><button class="primary" data-gate="next">下一关 →</button>' : `<button class="primary" data-gate="${isPaused ? 'resume' : 'start'}">${isPaused ? '接着玩' : state.stage > 1 ? `继续第 ${state.stage} 关` : '一起开始吧'} ↗</button>`}</div>${isComplete ? '<button class="text-button replay-stage" data-gate="replay">再玩本关</button>' : ''}${isComplete ? '' : '<p class="tiny">每关都有新发现 · 不限时 · 随时可以休息</p>'}`;
  if (isComplete) {
    const confetti = document.createElement('div'); confetti.className = 'confetti'; confetti.setAttribute('aria-hidden','true');
    confetti.innerHTML = Array.from({ length: 15 },(_,i)=>`<i style="left:${5+i*6.4}%;animation-delay:${(i%4)*.11}s;background:${['#d8b56a','#8ca989','#d99c85','#92b1bf'][i%4]}"></i>`).join(''); $('gate').append(confetti);
  }
  if (isComplete || isPaused) $('gate').querySelector('button')?.focus({ preventScroll: true });
}
function prepare(round = createRound(activity.id, mode, Math.random, progression.current(activity.id,mode))) {
  clearTimers(); audio.stop(); cancelPointer(); stopTime(); active = false; paused = false; selected = null; locked = false;
  state = round; elapsed = 0; recorded = false;
  render(); feedback(`第 ${state.stage} 关，${state.stageTitle}。`); gate('start');
}
function start() {
  active = true; paused = false; locked = false; activeSince = performance.now(); session.start(mode);
  $('gate').hidden = true; $('pause').disabled = false;
  $('scene').inert = false; audio.unlock(); speakPrompt();
  $('scene').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  feedback(activity.instruction);
}
function finish() {
  if (recorded) return;
  stopTime(); active = false; recorded = true; locked = false; clearTimers(); audio.stop();
  session.finish({ mode, score: 1, seconds: elapsed / 1000 });
  progression.complete(state);
  audio.speak(doneMessage() + '，可以去下一关啦。'); $('scene').inert = true; gate('complete');
}
function pause() {
  if (!active || paused) return;
  stopTime(); paused = true; clearTimers(); audio.stop(); cancelPointer(); locked = false;
  $('scene').inert = true; gate('pause');
}
function resume() {
  paused = false; $('gate').hidden = true; $('scene').inert = false; audio.unlock(); activeSince = performance.now();
  if (state.done) return finish();
  render(); feedback(activity.instruction); speakPrompt();
  $('scene').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}
function success(message, wait = 750) {
  selected = null; locked = true; audio.success(); feedback(message, true);
  render();
  $('scene').classList.remove('bounce'); void $('scene').offsetWidth; $('scene').classList.add('bounce');
  if (state.done) { later(finish, 1100); return; }
  later(() => {
    locked = false; render();
    $('scene').querySelector('[data-piece]:not(:disabled), [data-choice]:not(:disabled), [data-action]:not(:disabled)')?.focus({ preventScroll: true });
    if (state.id === 'animal-sounds' || state.id === 'bear-care' || state.id === 'flower-water') speakPrompt();
  }, wait);
}
function tryPlace(itemId, target) {
  if (!active || paused || locked) return;
  const item = state.items.find(item => item.id === itemId);
  const result = act(state, { type: 'place', item: itemId, target });
  if (result.accepted) success(state.id === 'little-puzzle' ? '这块拼好啦！' : `${item.name}，找到家啦！`, 350);
  else gentleHint('再看看，找一样的试试。', `[data-target="${target}"]`);
}
function gentleHint(text, selector) { feedback(text, true); const node = $('scene').querySelector(selector); if (node) { node.classList.remove('soft-hint'); void node.offsetWidth; node.classList.add('soft-hint'); } }
function choose(id) {
  const result = act(state, { type: 'choose', item: id });
  if (result.accepted) success(state.id === 'animal-sounds' ? `是${animals.find(a => a.id === id).name}，找到啦！` : state.id === 'bear-hide' ? '找到你啦，小熊！' : state.steps[state.progress-1].feedback, 1200);
  else if (state.id === 'bear-hide') {
    const node = $('scene').querySelector(`[data-choice="${id}"]`);
    feedback('这个盒子里没有，再找找吧。', true);
    if (node) { node.querySelector('span').textContent = '这里没有哦'; node.classList.add('soft-hint'); }
  } else gentleHint(state.id === 'bear-care' ? prompt() : '再听一听，慢慢找。', `[data-choice="${id}"]`);
}
$('scene').addEventListener('click', event => {
  if (!active || paused || locked || performance.now() < suppressClickUntil) return;
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  audio.unlock();
  if (button.dataset.piece !== undefined) {
    selected = selected === button.dataset.piece ? null : button.dataset.piece;
    const id = button.dataset.piece; render(); $('scene').querySelector(`[data-piece="${id}"]`)?.focus({ preventScroll:true });
    if (selected !== null) feedback(`选好啦，给${state.items.find(i => i.id === selected).name}找个位置。`, true);
  } else if (button.dataset.target !== undefined) {
    if (selected !== null) tryPlace(selected, button.dataset.target);
    else feedback('先点下面的一块，再点这里。', true);
  } else if (button.dataset.choice !== undefined) choose(button.dataset.choice);
  else if (button.dataset.instrument) {
    const result = act(state, { type: 'play', item: button.dataset.instrument }); if (!result.accepted) return;
    audio.instrument(button.dataset.instrument, state.instruments.find(item=>item.id===button.dataset.instrument)?.sound, state.song.notes); dots(); button.classList.add('active'); later(() => button.classList.remove('active'), 210);
    feedback(`${button.textContent.replace('♪','').trim()}，轮到你啦！`);
    if (result.done) { locked = true; later(finish, 1200); }
  } else if (button.dataset.action === 'listen') speakPrompt();
  else if (button.dataset.action === 'hide') { act(state, { type: 'hide' }); render(); feedback('藏好啦，小熊在哪个盒子？', true); }
  else if (button.dataset.action === 'water') {
    if (act(state, { type: 'water' }).accepted) {
      success(['喝到水啦，小芽冒出来了！', '叶子长出来啦！', '小花开啦，谢谢你！'][state.progress-1], 900);
      const drops = document.createElement('div'); drops.className = 'drops'; drops.innerHTML = '<i></i><i></i><i></i>';
      $('scene').querySelector('.garden').append(drops); later(() => drops.remove(), 850);
    }
  } else if (button.dataset.action === 'melody') { audio.melody(state.song.notes); feedback('叮，叮，叮。和爸爸妈妈轮流试试。'); }
});
function dropAt(x,y) {
  let target = document.elementFromPoint(x,y)?.closest('[data-target]');
  if (target && !target.disabled) return target;
  let nearest = null, distance = Infinity;
  for (const node of $('scene').querySelectorAll('[data-target]:not(:disabled)')) {
    const rect = node.getBoundingClientRect();
    const dx = Math.max(rect.left-x, 0, x-rect.right), dy = Math.max(rect.top-y, 0, y-rect.bottom);
    const d = Math.hypot(dx,dy); if (d < 26 && d < distance) { nearest = node; distance = d; }
  }
  return nearest;
}
$('scene').addEventListener('pointerdown', event => {
  const button = event.target.closest('[data-piece]');
  if (!button || button.disabled || !active || paused || locked || pointer || event.button !== 0) return;
  pointer = { id: event.pointerId, item: button.dataset.piece, x: event.clientX, y: event.clientY, button, dragging: false };
  button.setPointerCapture(event.pointerId);
});
$('scene').addEventListener('pointermove', event => {
  if (!pointer || event.pointerId !== pointer.id) return;
  if (!pointer.dragging && Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y) < 9) return;
  if (!pointer.dragging) {
    pointer.dragging = true; selected = pointer.item;
    ghost = pointer.button.cloneNode(true); ghost.classList.add('drag-ghost'); ghost.setAttribute('aria-hidden','true'); ghost.tabIndex = -1;
    const rect = pointer.button.getBoundingClientRect(); ghost.style.width = `${rect.width}px`; ghost.style.height = `${rect.height}px`; document.body.append(ghost);
  }
  ghost.style.left = `${event.clientX}px`; ghost.style.top = `${event.clientY}px`;
  document.querySelectorAll('.drop-hover').forEach(node => node.classList.remove('drop-hover'));
  dropAt(event.clientX,event.clientY)?.classList.add('drop-hover');
  event.preventDefault();
});
$('scene').addEventListener('pointerup', event => {
  if (!pointer || event.pointerId !== pointer.id) return;
  const { dragging, item } = pointer;
  const target = dragging ? dropAt(event.clientX,event.clientY)?.dataset.target : null;
  cancelPointer();
  if (dragging) {
    event.preventDefault(); suppressClickUntil = performance.now()+350;
    if (target !== null && target !== undefined) tryPlace(item,target);
    else { selected = item; render(); feedback('放到上面的位置，或点一下它的家。'); }
  }
});
$('scene').addEventListener('pointercancel', cancelPointer);
window.addEventListener('resize', cancelPointer);
$('gate').addEventListener('click', event => {
  const action = event.target.closest('[data-gate]')?.dataset.gate;
  if (action === 'start') start();
  if (action === 'resume') resume();
  if (action === 'next' && state.done && recorded) { const upcoming = nextRound(state); prepare(upcoming); start(); }
  if (action === 'replay' && state.done && recorded) { prepare(createRound(activity.id,mode,Math.random,state.stage)); start(); }
});
$('sound').addEventListener('click', () => { sound = !sound; library.setSound(sound); syncSound(); if (sound) { audio.unlock(); audio.speak('声音打开啦'); } else audio.stop(); });
$('repeat').addEventListener('click', () => { if (active && !paused) speakPrompt(); else audio.speak(activity.description); });
$('pause').addEventListener('click', pause);
$('level').addEventListener('change', event => { mode = event.target.value === 'curious' ? 'curious' : 'gentle'; progression.selectMode(activity.id,mode); prepare(); });
bindFullscreen($('fullscreen'), { notify: feedback });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (paused) resume(); else pause(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', () => { pause(); audio.stop(); });
window.addEventListener('pageshow', () => { sound = library.read().settings.sound; syncSound(); });
syncSound(); prepare(); $('scene').inert = true; registerOffline();
