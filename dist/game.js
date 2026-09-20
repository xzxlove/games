import { segmentHitsCircle, pointsForCut, bombPenalty, launchVelocity } from './physics.js';

const $ = id => document.getElementById(id);
const app = $('app'), canvas = $('arena'), ctx = canvas.getContext('2d', { alpha: true });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const storage = {
  get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* Play without persistence. */ } },
};
const bests = {
  classic: Math.max(0, Number(storage.get('melon-best-classic', 0)) || 0),
  zen: Math.max(0, Number(storage.get('melon-best-zen', 0)) || 0),
};
let width = 0, height = 0, dpr = 1, gravity = 900;
let state = 'home', mode = 'classic', score = 0, timeLeft = 60, elapsed = 0, cuts = 0, maxCombo = 0;
let combo = 0, lastCut = -100, comboUntil = 0, waveIn = .6, shake = 0;
let fruits = [], pieces = [], particles = [], splats = [], labels = [], trails = [];
let activePointer = null, pointer = null, keyboardBlade = null, keys = new Set();
let audio = null, soundOn = storage.get('melon-sound', 'on') !== 'off';
let lastFrame = performance.now(), toastTimer, nextFruitId = 0;
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const spriteCache = new Map();
const fruitKinds = ['watermelon', 'orange', 'lemon', 'kiwi', 'apple', 'strawberry'];
const fruitColors = {
  watermelon: ['#ff6376', '#e5f59b'], orange: ['#ffa329', '#ffd779'],
  lemon: ['#f7dc44', '#fff2a1'], kiwi: ['#a1d84d', '#e6f4b1'],
  apple: ['#ed5b68', '#ffe6b1'], strawberry: ['#f55a74', '#ffb4c0'],
};
let fruitBag = [];
function nextFruitKind() {
  if (!fruitBag.length) {
    fruitBag = [...fruitKinds];
    for (let i = fruitBag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fruitBag[i], fruitBag[j]] = [fruitBag[j], fruitBag[i]]; }
  }
  return fruitBag.pop();
}

function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3600);
}

function resize() {
  const previousWidth = width, previousHeight = height;
  const box = app.getBoundingClientRect();
  width = box.width; height = box.height; dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gravity = Math.max(700, height * 1.55);
  if (previousWidth && previousHeight) {
    const sx = width / previousWidth, sy = height / previousHeight;
    for (const list of [fruits, pieces, particles, labels, splats]) for (const item of list) {
      item.x *= sx; item.y *= sy;
      if ('vx' in item) { item.vx *= sx; item.vy *= sy; }
    }
    resetInput();
    if ((previousWidth > previousHeight) !== (width > height) && state === 'playing') pause();
  }
}
new ResizeObserver(resize).observe(app);

function unlockAudio() {
  if (!soundOn) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch { /* Audio is optional. */ }
}
function tone(kind, step = 0) {
  if (!soundOn || !audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.connect(gain); gain.connect(audio.destination); osc.start(now);
  if (kind === 'bomb') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(22, now + .24);
    gain.gain.setValueAtTime(.09, now); gain.gain.exponentialRampToValueAtTime(.001, now + .28); osc.stop(now + .29);
  } else {
    osc.type = 'sine'; osc.frequency.setValueAtTime(kind === 'start' ? 400 : 600 + Math.min(step, 8) * 95, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'start' ? 800 : 260 + step * 40, now + .12);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.075, now + .008); gain.gain.exponentialRampToValueAtTime(.001, now + .15); osc.stop(now + .16);
  }
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}
function syncSound() {
  $('sound').setAttribute('aria-pressed', String(soundOn));
  $('sound').setAttribute('aria-label', soundOn ? '关闭音效' : '开启音效');
}
function resetInput() { activePointer = null; pointer = null; trails = []; keys.clear(); keyboardBlade = null; }
function showState(next) {
  state = next; app.dataset.state = next;
  $('home').hidden = next !== 'home';
  $('hud').hidden = next === 'home';
  $('pause').hidden = next !== 'playing';
  $('pause-screen').hidden = next !== 'paused';
  $('result').hidden = next !== 'result';
  // Keep background controls out of the keyboard focus order behind dialogs.
  const modal = next === 'paused' || next === 'result';
  document.querySelector('.topbar').inert = modal;
  canvas.inert = modal || next === 'home';
  $('hint').textContent = next === 'home' ? '手指滑一滑，快乐就开花' : mode === 'zen' ? '慢慢来，每一刀都算数' : '连续切中有奖励 · 小心炸弹';
  $('bottom-note').textContent = next === 'home' ? '一刀一果 · 刚刚好' : '按 Esc 暂停';
  if (next !== 'playing') { resetInput(); $('combo').classList.remove('visible'); }
}
function syncBest() {
  $('home-best').textContent = bests[mode]; $('hud-best').textContent = bests[mode];
}
function syncHUD() {
  $('score').textContent = score;
  $('time').innerHTML = mode === 'zen' ? '∞' : `${Math.ceil(timeLeft)}<span>s</span>`;
  $('timer-label').textContent = mode === 'zen' ? '随心切切' : '剩余时间';
  $('time-fill').style.transform = `scaleX(${mode === 'zen' ? 1 : timeLeft / 60})`;
  document.querySelector('.timer-block').classList.toggle('urgent', mode === 'classic' && timeLeft <= 10);
}
function startGame() {
  unlockAudio(); tone('start');
  score = 0; cuts = 0; maxCombo = 0; combo = 0; lastCut = -100; comboUntil = 0;
  timeLeft = 60; elapsed = 0; waveIn = .35; shake = 0;
  fruits = []; pieces = []; particles = []; labels = []; splats = []; fruitBag = [];
  $('flash').classList.remove('hit'); resetInput(); syncBest(); syncHUD();
  showState('playing'); lastFrame = performance.now(); canvas.focus({ preventScroll: true });
}
function pause() {
  if (state !== 'playing') return;
  showState('paused');
  $('pause-home').textContent = mode === 'zen' ? '结束本局' : '返回首页';
  $('resume').focus({ preventScroll: true });
}
function resume() {
  if (state !== 'paused') return;
  unlockAudio(); showState('playing'); lastFrame = performance.now(); canvas.focus({ preventScroll: true });
}
function finish() {
  if (state !== 'playing' && state !== 'paused') return;
  const record = score > bests[mode];
  if (record) { bests[mode] = score; storage.set(`melon-best-${mode}`, score); }
  $('result-tag').textContent = record ? 'NEW PERSONAL BEST!' : 'NICE SLICING!';
  $('result-title').textContent = record ? '新纪录，漂亮！' : '这一局，够爽。';
  $('result-score').textContent = score; $('result-cuts').textContent = cuts;
  $('result-combo').textContent = maxCombo; $('result-best').textContent = bests[mode];
  syncBest(); showState('result'); $('again').focus({ preventScroll: true });
}
function home() { showState('home'); fruits = []; pieces = []; particles = []; labels = []; splats = []; syncBest(); $('start').focus({ preventScroll: true }); }

document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  syncBest();
}));
$('start').addEventListener('click', startGame); $('again').addEventListener('click', startGame);
$('restart').addEventListener('click', startGame); $('pause').addEventListener('click', pause);
$('resume').addEventListener('click', resume); $('result-home').addEventListener('click', home);
$('pause-home').addEventListener('click', () => mode === 'zen' ? finish() : home());
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); if (state === 'playing') pause(); else if (state === 'home') home(); });
$('sound').addEventListener('click', () => { soundOn = !soundOn; storage.set('melon-sound', soundOn ? 'on' : 'off'); syncSound(); if (soundOn) { unlockAudio(); tone('start'); } });
$('help-open').addEventListener('click', () => $('help').showModal());
$('help-close').addEventListener('click', () => $('help').close());
$('help').addEventListener('click', event => { if (event.target === $('help')) { const b = $('help').getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) $('help').close(); } });
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await exit.call(document);
    } else {
      const enter = app.requestFullscreen || app.webkitRequestFullscreen;
      if (enter) await enter.call(app);
      else toast('在 Safari 分享菜单中添加到主屏幕，即可沉浸游玩');
    }
  } catch { toast('请在 Safari 中打开，或添加到主屏幕后游玩'); }
});
function syncFullscreen() { $('fullscreen').setAttribute('aria-label', document.fullscreenElement || document.webkitFullscreenElement ? '退出全屏' : '进入全屏'); }
document.addEventListener('fullscreenchange', syncFullscreen); document.addEventListener('webkitfullscreenchange', syncFullscreen);
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); audio?.suspend().catch(() => {}); } });
window.addEventListener('blur', () => { if (state === 'playing') pause(); });

function localPoint(event) { const b = canvas.getBoundingClientRect(); return { x: event.clientX - b.left, y: event.clientY - b.top }; }
canvas.addEventListener('pointerdown', event => {
  if (state !== 'playing' || activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault(); unlockAudio(); activePointer = event.pointerId; pointer = localPoint(event); combo = 0; lastCut = -100;
  keyboardBlade = null; canvas.setPointerCapture(event.pointerId); trails.push({ ...pointer, life: .18 });
});
canvas.addEventListener('pointermove', event => {
  if (state !== 'playing' || event.pointerId !== activePointer || !pointer) return;
  event.preventDefault();
  const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
  for (const sample of events.length ? events : [event]) {
    const next = localPoint(sample);
    if (Math.hypot(next.x - pointer.x, next.y - pointer.y) > 2) {
      cutBetween(pointer, next); trails.push({ ...next, life: .19 }); pointer = next;
    }
  }
  if (trails.length > 80) trails.splice(0, trails.length - 80);
});
function endPointer(event) {
  if (event.pointerId !== activePointer) return;
  if (event.type === 'pointerup' && state === 'playing' && pointer) cutBetween(pointer, localPoint(event));
  activePointer = null; pointer = null;
}
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer); canvas.addEventListener('lostpointercapture', endPointer);
canvas.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
  if ($('help').open) return;
  if (event.code === 'Tab' && (state === 'paused' || state === 'result')) {
    const container = state === 'paused' ? $('pause-screen') : $('result');
    const items = [...container.querySelectorAll('button')];
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
  }
  if (event.code === 'Escape') { if (state === 'playing') pause(); else if (state === 'paused') resume(); return; }
  if (state !== 'playing' || /BUTTON|A/.test(document.activeElement?.tagName)) return;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(event.code)) {
    event.preventDefault(); unlockAudio(); keys.add(event.code); keyboardBlade ||= { x: width / 2, y: height / 2 };
  }
});
document.addEventListener('keyup', event => keys.delete(event.code));

function spawnWave() {
  const difficulty = mode === 'zen' ? .25 : Math.min(1, elapsed / 60);
  const count = Math.floor(rand(2, 4.2 + difficulty * 1.8));
  const radius = clamp(Math.min(width, height) * .065, 29, 53);
  const center = rand(width * .28, width * .72);
  for (let i = 0; i < count; i++) {
    const fruitKind = nextFruitKind();
    const size = { watermelon: 1.1, orange: .96, lemon: .91, kiwi: .95, apple: 1, strawberry: .91 }[fruitKind];
    const r = radius * rand(.91, 1.08) * size;
    const x = clamp(center + (i - (count - 1) / 2) * r * 1.9, r + 14, width - r - 14);
    const y = height + r + rand(10, 60);
    const apex = height * rand(.3, .52);
    const targetX = clamp(x + rand(-width * .12, width * .12), r + 10, width - r - 10);
    const vy = launchVelocity(y, apex, gravity);
    fruits.push({ id: nextFruitId++, x, y, r, vx: (targetX - x) / (-vy / gravity), vy, angle: rand(-.4, .4), spin: rand(-1.8, 1.8), type: 'fruit', fruitKind, cut: false, variety: Math.random() < .24 ? 1 : 0 });
  }
  if (mode === 'classic' && elapsed > 5 && Math.random() < .28 + difficulty * .2) {
    const r = radius * .82, y = height + r + 80, x = rand(width * .2, width * .8);
    fruits.push({ id: nextFruitId++, x, y, r, vx: rand(-60, 60), vy: launchVelocity(y, height * rand(.4, .58), gravity), angle: 0, spin: rand(-2, 2), type: 'bomb', cut: false });
  }
}
function cutBetween(a, b) {
  if (state !== 'playing' || Math.hypot(b.x - a.x, b.y - a.y) < 2) return;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  for (const fruit of fruits) {
    if (fruit.cut || fruit.y > height + fruit.r * .2 || !segmentHitsCircle(a, b, { ...fruit, r: fruit.r * .91 }, 4)) continue;
    fruit.cut = true;
    if (fruit.type === 'bomb') {
      ({ score, time: timeLeft } = bombPenalty(score, timeLeft));
      combo = 0; lastCut = -100; $('combo').classList.remove('visible'); tone('bomb');
      if (!reducedMotion) { shake = .23; $('flash').classList.remove('hit'); void $('flash').offsetWidth; $('flash').classList.add('hit'); }
      burst(fruit, true); labels.push({ x: fruit.x, y: fruit.y - fruit.r, text: '−20 分  −3 秒', color: '#ffaaa1', life: 1.2, total: 1.2 });
      syncHUD(); if (timeLeft <= 0) { finish(); break; } continue;
    }
    combo = elapsed - lastCut < .38 ? combo + 1 : 1; lastCut = elapsed;
    const points = pointsForCut(combo); score += points; cuts++; maxCombo = Math.max(maxCombo, combo);
    burst(fruit, false);
    for (const side of [-1, 1]) {
      const normal = angle + Math.PI / 2;
      pieces.push({ x: fruit.x + Math.cos(normal) * side * 7, y: fruit.y + Math.sin(normal) * side * 7, r: fruit.r, vx: fruit.vx + Math.cos(normal) * side * rand(110, 170), vy: fruit.vy * .3 + Math.sin(normal) * side * 110, angle: normal + (side === -1 ? Math.PI : 0), spin: side * rand(1, 3), life: 1.7, variety: fruit.variety, fruitKind: fruit.fruitKind });
    }
    labels.push({ x: fruit.x, y: fruit.y - fruit.r * .6, text: `+${points}`, color: '#f1ffbc', life: .85, total: .85 });
    tone('cut', combo);
    if (combo >= 3) {
      $('combo').innerHTML = `${combo} 连切！<small>${combo >= 6 ? '刀法出神入化' : '这刀，漂亮'}</small>`;
      $('combo').classList.add('visible'); comboUntil = elapsed + .8;
    }
    syncHUD();
  }
}
function burst(fruit, bomb) {
  const colors = fruitColors[fruit.fruitKind] || fruitColors.watermelon;
  const color = bomb ? '#ffba66' : colors[0];
  for (let i = 0; i < (reducedMotion ? 7 : 22); i++) {
    const angle = rand(0, Math.PI * 2), speed = rand(70, bomb ? 460 : 300);
    particles.push({ x: fruit.x, y: fruit.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, r: rand(2, 6), color: i % 4 === 0 && !bomb ? colors[1] : color, life: rand(.35, .8), total: .8 });
  }
  if (!bomb) for (let i = 0; i < 6; i++) splats.push({ x: fruit.x + rand(-55, 55), y: fruit.y + rand(-55, 55), r: rand(4, 15), life: 2.8, color });
  if (particles.length > 250) particles.splice(0, particles.length - 250);
  if (splats.length > 70) splats.splice(0, splats.length - 70);
}

function paintFruit(g, fruitKind, cut) {
  const r = 126;
  const leaf = (x, y, scale = 1, angle = 0) => {
    g.save(); g.translate(x, y); g.rotate(angle); g.scale(scale, scale);
    const green = g.createLinearGradient(0, -20, 35, 12); green.addColorStop(0, '#c0ec71'); green.addColorStop(1, '#34834b');
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(15, -35, 49, -15); g.quadraticCurveTo(29, 17, 0, 0); g.fillStyle = green; g.fill();
    g.beginPath(); g.moveTo(3, -1); g.lineTo(38, -13); g.strokeStyle = '#d8f89977'; g.lineWidth = 1.8; g.stroke(); g.restore();
  };
  const stem = (y = -119) => { g.beginPath(); g.moveTo(0, y + 8); g.quadraticCurveTo(-5, y - 10, 10, y - 25); g.strokeStyle = '#826249'; g.lineWidth = 9; g.lineCap = 'round'; g.stroke(); };
  const shape = radius => {
    g.beginPath();
    if (fruitKind === 'apple' && !cut) {
      g.moveTo(0, -radius * .76); g.bezierCurveTo(-radius * .68, -radius * 1.25, -radius * 1.26, -radius * .46, -radius * .93, radius * .3);
      g.bezierCurveTo(-radius * .68, radius * 1.09, -radius * .32, radius * 1.1, 0, radius * .92);
      g.bezierCurveTo(radius * .32, radius * 1.1, radius * .68, radius * 1.09, radius * .93, radius * .3);
      g.bezierCurveTo(radius * 1.26, -radius * .46, radius * .68, -radius * 1.25, 0, -radius * .76);
    } else if (fruitKind === 'strawberry' && !cut) {
      g.moveTo(0, radius * 1.08); g.bezierCurveTo(-radius * .3, radius, -radius * 1.23, -radius * .1, -radius * .89, -radius * .66);
      g.bezierCurveTo(-radius * .6, -radius * 1.06, radius * .6, -radius * 1.06, radius * .89, -radius * .66);
      g.bezierCurveTo(radius * 1.23, -radius * .1, radius * .3, radius, 0, radius * 1.08);
    } else {
      g.ellipse(0, 0, radius * (fruitKind === 'lemon' ? .87 : 1), radius, 0, cut ? -Math.PI / 2 : 0, cut ? Math.PI / 2 : Math.PI * 2);
    }
    g.closePath();
  };
  const schemes = {
    orange: ['#ffdb73', '#ff9c29', '#d05a10'], lemon: ['#fff89d', '#eed638', '#b8a821'],
    kiwi: ['#cba276', '#96713f', '#5a442c'], apple: ['#ffb08d', '#ef475c', '#a21f43'],
    strawberry: ['#ff9a9d', '#ef4460', '#a42246'],
  };
  const colors = schemes[fruitKind];
  if (!cut) {
    shape(r); g.save(); g.clip();
    const gradient = g.createRadialGradient(-40, -48, 0, 26, 30, 174);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.42, colors[1]); gradient.addColorStop(1, colors[2]);
    g.fillStyle = gradient; g.fillRect(-150, -150, 300, 300);
    if (fruitKind === 'strawberry') {
      for (let row = 0; row < 7; row++) {
        const y = -79 + row * 26, span = 90 * (1 - Math.max(0, row - 1) * .13);
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) * span / 2 + (row % 2 ? 8 : 0);
          g.beginPath(); g.ellipse(x, y, 3.2, 5.7, -x / 180, 0, 7); g.fillStyle = '#8a273577'; g.fill();
          g.beginPath(); g.ellipse(x - 1, y - 1, 2.1, 4.1, -x / 180, 0, 7); g.fillStyle = '#ffefa0'; g.fill();
        }
      }
    } else {
      for (let i = 0; i < 350; i++) {
        const x = Math.sin(i * 127.1) * r, y = Math.cos(i * 83.7) * r;
        if (fruitKind === 'kiwi') { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 4); g.strokeStyle = i % 2 ? '#f3d7a455' : '#42342055'; g.lineWidth = 1; g.stroke(); }
        else { g.beginPath(); g.arc(x, y, fruitKind === 'apple' ? 1.1 : 1.8, 0, 7); g.fillStyle = i % 3 ? '#ffffd22e' : '#8d3a2022'; g.fill(); }
      }
    }
    const gloss = g.createRadialGradient(-46, -57, 0, -32, -43, 73); gloss.addColorStop(0, '#fffce44d'); gloss.addColorStop(1, '#fffce400'); g.fillStyle = gloss; g.fillRect(-r, -r, r * 2, r * 2);
    g.restore();
    if (fruitKind === 'apple') { stem(-100); leaf(1, -108, 1.1, -.12); }
    else if (fruitKind === 'orange') { stem(-119); leaf(0, -123, .95, .1); }
    else if (fruitKind === 'lemon') { g.fillStyle = '#e6cd39'; for (const y of [-125, 123]) { g.beginPath(); g.ellipse(0, y, 12, 10, 0, 0, 7); g.fill(); } leaf(-2, -123, .9, -.2); }
    else if (fruitKind === 'strawberry') {
      for (let i = 0; i < 5; i++) leaf(0, -94, 1.08, -Math.PI + i * .68);
      stem(-104);
    } else {
      g.beginPath(); g.ellipse(0, -116, 15, 7, 0, 0, 7); g.fillStyle = '#705332'; g.fill();
    }
    return;
  }
  shape(r); g.fillStyle = colors[1]; g.fill();
  shape(r - 7); g.fillStyle = fruitKind === 'kiwi' ? '#cbdf89' : '#fff2b4'; g.fill();
  shape(r - 13);
  const inside = { orange: ['#ffd16a', '#f89126'], lemon: ['#fff7b0', '#e9d85a'], kiwi: ['#dcf07b', '#86bf3a'], apple: ['#fff5d2', '#ffe6b5'], strawberry: ['#ffb4b5', '#f0607e'] }[fruitKind];
  const gradient = g.createLinearGradient(0, -r, r, r); gradient.addColorStop(0, inside[0]); gradient.addColorStop(1, inside[1]); g.fillStyle = gradient; g.fill();
  g.save(); shape(r - 14); g.clip();
  if (fruitKind === 'orange' || fruitKind === 'lemon') {
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * (r - 11), Math.sin(a) * (r - 11)); g.strokeStyle = '#fff1b8cc'; g.lineWidth = 4; g.stroke();
      for (let j = 0; j < 4; j++) {
        const ray = a + .12 + j * .12;
        g.beginPath(); g.moveTo(Math.cos(ray) * 25, Math.sin(ray) * 25); g.lineTo(Math.cos(ray) * 98, Math.sin(ray) * 98); g.strokeStyle = '#fff9c744'; g.lineWidth = 2; g.stroke();
      }
    }
    g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fillStyle = '#fff4c7'; g.fill();
  } else if (fruitKind === 'kiwi') {
    for (let i = 0; i < 28; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 27;
      g.beginPath(); g.moveTo(Math.cos(a) * 25, Math.sin(a) * 38); g.lineTo(Math.cos(a) * 109, Math.sin(a) * 109); g.strokeStyle = i % 2 ? '#f0fdb459' : '#5c9c2659'; g.lineWidth = 2; g.stroke();
      if (i % 2) { g.save(); g.translate(Math.cos(a) * 66, Math.sin(a) * 70); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 4, 2.5, 0, 0, 7); g.fillStyle = '#353b2a'; g.fill(); g.restore(); }
    }
    g.beginPath(); g.ellipse(0, 0, 28, 42, 0, 0, 7); g.fillStyle = '#f7f4c1'; g.fill();
  } else if (fruitKind === 'apple') {
    g.beginPath(); g.ellipse(0, 0, 33, 62, 0, 0, 7); g.fillStyle = '#eed69c'; g.fill();
    for (const y of [-27, 27]) { g.beginPath(); g.ellipse(17, y, 5, 10, -.2, 0, 7); g.fillStyle = '#704731'; g.fill(); }
    g.beginPath(); g.moveTo(0, -110); g.lineTo(0, 110); g.strokeStyle = '#dfc88e'; g.lineWidth = 3; g.stroke();
  } else {
    g.beginPath(); g.moveTo(0, -103); g.quadraticCurveTo(55, -22, 0, 100); g.fillStyle = '#ffd4ca'; g.fill();
    for (let i = 0; i < 12; i++) { const a = -1.35 + i / 11 * 2.7; g.beginPath(); g.ellipse(Math.cos(a) * 104, Math.sin(a) * 104, 2.8, 4, -a, 0, 7); g.fillStyle = '#ffeeb5'; g.fill(); }
  }
  g.restore();
}
function makeSprite(kind, fruitKind = 'watermelon', variety = 0) {
  const key = `${kind}-${fruitKind}-${variety}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const surface = document.createElement('canvas'); surface.width = surface.height = 320;
  const g = surface.getContext('2d'); g.translate(160, 160);
  const r = 126;
  if (kind !== 'bomb' && fruitKind !== 'watermelon') {
    paintFruit(g, fruitKind, kind === 'half'); spriteCache.set(key, surface); return surface;
  }
  if (kind === 'whole') {
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.clip();
    let gradient = g.createRadialGradient(-46, -56, 4, 24, 34, r * 1.4);
    gradient.addColorStop(0, variety ? '#b5d663' : '#a5d06a'); gradient.addColorStop(.43, variety ? '#789d36' : '#4e9b42'); gradient.addColorStop(1, '#103e2e');
    g.fillStyle = gradient; g.fillRect(-r, -r, r * 2, r * 2);
    for (let i = -4; i <= 4; i++) {
      g.beginPath();
      for (let j = 0; j <= 35; j++) {
        const y = -r + j / 35 * r * 2;
        const curve = Math.sqrt(Math.max(0, 1 - (y / r) ** 2));
        const x = i * 31 * curve + Math.sin(j * .94 + i) * (3 + curve * 2) + 9 * Math.sin(y / r * 2);
        j ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = i % 2 ? '#1b632f99' : '#174c2c99'; g.lineWidth = 12 + (4 - Math.abs(i)) * 2; g.stroke();
    }
    gradient = g.createRadialGradient(-47, -59, 0, -29, -44, 112); gradient.addColorStop(0, '#ffffba55'); gradient.addColorStop(.6, '#d6ffaa0a'); gradient.addColorStop(1, '#00000000'); g.fillStyle = gradient; g.fillRect(-r, -r, r * 2, r * 2);
    // Fine rind freckles are painted once, then reused for every frame.
    for (let i = 0; i < 160; i++) {
      const x = Math.sin(i * 113.2) * r, y = Math.cos(i * 57.9) * r;
      g.fillStyle = '#efffb319'; g.beginPath(); g.arc(x, y, .8 + (i % 3) * .3, 0, 7); g.fill();
    }
    g.restore();
    g.beginPath(); g.moveTo(-1, -r + 7); g.quadraticCurveTo(-13, -r - 8, 1, -r - 17); g.strokeStyle = '#b6c677'; g.lineWidth = 7; g.lineCap = 'round'; g.stroke();
    g.beginPath(); g.moveTo(0, -r - 6); g.quadraticCurveTo(24, -r - 32, 35, -r - 7); g.quadraticCurveTo(17, -r + 7, 0, -r - 6); g.fillStyle = '#9bd35c'; g.fill();
  } else if (kind === 'half') {
    function semi(radius) { g.beginPath(); g.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2); g.closePath(); }
    semi(r); g.fillStyle = '#35924b'; g.fill();
    semi(r - 7); g.fillStyle = '#dcf8a6'; g.fill();
    semi(r - 15);
    const gradient = g.createLinearGradient(0, -r, r, r); gradient.addColorStop(0, '#ff9b9d'); gradient.addColorStop(.45, '#fa5970'); gradient.addColorStop(1, '#cf2e54'); g.fillStyle = gradient; g.fill();
    g.save(); semi(r - 16); g.clip();
    g.strokeStyle = '#ffb5b233'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(3, 0, 24 + i * 13, -1.5, 1.5); g.stroke(); }
    for (let row = 0; row < 3; row++) {
      const ring = 34 + row * 27;
      for (let i = 0; i < 3 + row; i++) {
        const angle = -1.17 + i / (2 + row) * 2.34;
        const x = Math.cos(angle) * ring, y = Math.sin(angle) * ring;
        g.save(); g.translate(x, y); g.rotate(angle); g.beginPath(); g.ellipse(0, 0, 5, 2.8, 0, 0, 7); g.fillStyle = '#502c38'; g.fill(); g.beginPath(); g.ellipse(-1, -1, 2.2, .8, 0, 0, 7); g.fillStyle = '#ba7882'; g.fill(); g.restore();
      }
    }
    g.restore();
    g.beginPath(); g.moveTo(0, -r + 15); g.lineTo(0, r - 15); g.strokeStyle = '#ffa6a9'; g.lineWidth = 3; g.stroke();
  } else {
    const gradient = g.createRadialGradient(-40, -45, 0, 22, 33, 150); gradient.addColorStop(0, '#899690'); gradient.addColorStop(.22, '#485651'); gradient.addColorStop(.7, '#17231f'); gradient.addColorStop(1, '#08110e');
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = gradient; g.fill(); g.strokeStyle = '#93a09055'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#e4e8c8'; g.font = 'bold 93px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('×', 0, 4);
    g.fillStyle = '#5e6b57'; g.fillRect(-19, -r - 11, 38, 24);
    g.beginPath(); g.moveTo(0, -r - 9); g.quadraticCurveTo(5, -r - 32, 32, -r - 25); g.lineWidth = 6; g.strokeStyle = '#d6c99a'; g.stroke();
  }
  spriteCache.set(key, surface); return surface;
}
function drawSprite(kind, item, alpha = 1) {
  ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.angle || 0); ctx.globalAlpha = alpha;
  const size = item.r * 320 / 126;
  ctx.drawImage(makeSprite(kind, item.fruitKind || 'watermelon', item.variety || 0), -size / 2, -size / 2, size, size);
  ctx.restore();
}
function drawBomb(item, clock) {
  drawSprite('bomb', item);
  const x = item.x + Math.sin(item.angle) * item.r + Math.cos(item.angle) * item.r * .25;
  const y = item.y - Math.cos(item.angle) * item.r * 1.2;
  ctx.save(); ctx.translate(x, y); ctx.rotate(clock * 3); ctx.strokeStyle = '#ffce76'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); ctx.lineTo(Math.cos(a) * (8 + Math.sin(clock * 20 + i) * 3), Math.sin(a) * 10); ctx.stroke(); }
  ctx.restore();
}
function drawHome(clock) {
  const narrow = width <= 1024 && height > width;
  const centerX = narrow ? width * .5 : width * .7;
  const centerY = narrow ? height * .463 : height * .47;
  const r = narrow ? Math.min(width * .213, height * .115) : Math.min(width * .133, height * .235);
  const bob = reducedMotion ? 0 : Math.sin(clock * 1.35) * 9;
  // Understated orbit and slash guide around the fruit.
  ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(-.42); ctx.strokeStyle = '#d9eea812'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.9, r * 1.22, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  const shade = ctx.createRadialGradient(centerX, centerY + r * 1.65, 0, centerX, centerY + r * 1.65, r * 1.6);
  shade.addColorStop(0, '#001a154d'); shade.addColorStop(1, '#001a1500'); ctx.fillStyle = shade;
  ctx.beginPath(); ctx.ellipse(centerX, centerY + r * 1.65, r * 1.7, r * .3, 0, 0, 7); ctx.fill();
  drawSprite('whole', { x: centerX + r * .79, y: centerY - r * .57 - bob * .6, r: r * .57, angle: .3, fruitKind: 'orange' });
  drawSprite('whole', { x: centerX - r * .15, y: centerY - r * .07 + bob, r: r * .87, angle: -.23 + (reducedMotion ? 0 : Math.sin(clock * .6) * .04) });
  drawSprite('whole', { x: centerX - r * 1.02, y: centerY + r * .4 - bob * .6, r: r * .44, angle: -.3, fruitKind: 'strawberry' });
  drawSprite('half', { x: centerX - r * .44, y: centerY + r * .68 - bob * .6, r: r * .77, angle: 1.24 });
  drawSprite('half', { x: centerX + r * .9, y: centerY + r * .63 + bob * .45, r: r * .61, angle: .33, fruitKind: 'kiwi' });
  ctx.save(); ctx.lineCap = 'round';
  const glow = ctx.createLinearGradient(centerX - r * 1.45, centerY + r * .75, centerX + r * 1.5, centerY - r * .5);
  glow.addColorStop(0, '#efffd900'); glow.addColorStop(.4, '#efffd944'); glow.addColorStop(.68, '#f1ffdccc'); glow.addColorStop(1, '#efffd900');
  ctx.strokeStyle = glow; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(centerX - r * 1.45, centerY + r * .75); ctx.quadraticCurveTo(centerX, centerY + r * .4, centerX + r * 1.7, centerY - r * .8); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39, radial = r * (1.25 + (i % 3) * .26);
    const x = centerX + Math.cos(a) * radial, y = centerY + Math.sin(a) * radial * .73 + bob * .5;
    ctx.fillStyle = i % 3 ? '#ef7e8777' : '#ddf59a99'; ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, 7); ctx.fill();
  }
}
function update(dt) {
  elapsed += dt;
  if (mode === 'classic') { timeLeft = Math.max(0, timeLeft - dt); if (timeLeft <= 0) { syncHUD(); finish(); return; } }
  waveIn -= dt;
  if (waveIn <= 0) { spawnWave(); waveIn = mode === 'zen' ? rand(1.3, 1.7) : rand(.95, 1.4) - Math.min(.3, elapsed * .004); }
  if (keyboardBlade) {
    const previous = { ...keyboardBlade }, speed = Math.max(450, width * .65);
    keyboardBlade.x = clamp(keyboardBlade.x + ((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) * speed * dt, 0, width);
    keyboardBlade.y = clamp(keyboardBlade.y + ((keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)) * speed * dt, 0, height);
    if (keys.has('Space')) { cutBetween(previous, keyboardBlade); trails.push({ ...keyboardBlade, life: .17 }); }
  }
  for (const item of fruits) { item.vy += gravity * dt; item.x += item.vx * dt; item.y += item.vy * dt; item.angle += item.spin * dt; }
  fruits = fruits.filter(f => !f.cut && !(f.vy > 0 && f.y > height + f.r * 2));
  for (const item of pieces) { item.vy += gravity * .8 * dt; item.x += item.vx * dt; item.y += item.vy * dt; item.angle += item.spin * dt; item.life -= dt; }
  pieces = pieces.filter(p => p.life > 0 && p.y < height + p.r * 2);
  for (const item of particles) { item.vy += gravity * .65 * dt; item.x += item.vx * dt; item.y += item.vy * dt; item.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  for (const item of splats) item.life -= dt; splats = splats.filter(p => p.life > 0);
  for (const item of labels) { item.y -= 65 * dt; item.life -= dt; } labels = labels.filter(p => p.life > 0);
  for (const item of trails) item.life -= dt; trails = trails.filter(p => p.life > 0).slice(-80);
  shake = Math.max(0, shake - dt);
  if (elapsed > comboUntil) $('combo').classList.remove('visible');
  syncHUD();
}
function draw(clock) {
  ctx.clearRect(0, 0, width, height);
  if (state === 'home') { drawHome(clock); return; }
  ctx.save();
  if (shake > 0 && !reducedMotion && state === 'playing') ctx.translate(rand(-7, 7) * shake / .23, rand(-5, 5) * shake / .23);
  for (const p of splats) { ctx.globalAlpha = Math.min(.16, p.life / 2.8 * .16); ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * .7, .3, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const p of pieces) drawSprite('half', p, Math.min(1, p.life * 2));
  for (const f of fruits) { if (f.type === 'bomb') drawBomb(f, clock); else drawSprite('whole', f); }
  for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life / .3); ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * .72, Math.atan2(p.vy, p.vx), 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const label of labels) { ctx.save(); ctx.globalAlpha = Math.min(1, label.life * 3); ctx.textAlign = 'center'; ctx.font = '800 25px system-ui'; ctx.fillStyle = label.color; ctx.shadowColor = '#082519'; ctx.shadowBlur = 9; ctx.fillText(label.text, label.x, label.y); ctx.restore(); }
  if (trails.length > 1) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = '#d8ff93'; ctx.shadowBlur = reducedMotion ? 0 : 14;
    for (let i = 1; i < trails.length; i++) {
      const p = trails[i], before = trails[i - 1];
      ctx.globalAlpha = Math.max(0, p.life / .19); ctx.lineWidth = Math.max(1, 7 * i / trails.length); ctx.strokeStyle = '#f6ffdb';
      ctx.beginPath(); ctx.moveTo(before.x, before.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    ctx.restore();
  }
  if (keyboardBlade && state === 'playing') { ctx.strokeStyle = '#e6ffc2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(keyboardBlade.x, keyboardBlade.y, 11, 0, 7); ctx.stroke(); }
  ctx.restore();
}
function frame(now) {
  const realDt = Math.max(0, (now - lastFrame) / 1000); lastFrame = now;
  // Freeze rather than advancing a hidden/suspended tab into a surprise game over.
  if (state === 'playing' && realDt > .5) pause();
  if (state === 'playing') {
    let remaining = Math.min(realDt, .5);
    while (remaining > 0 && state === 'playing') { const dt = Math.min(remaining, 1 / 60); update(dt); remaining -= dt; }
  }
  draw(now / 1000); requestAnimationFrame(frame);
}

syncSound(); syncBest(); resize(); showState('home');
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// Browsers with WebMCP support can expose the same controls as the visible UI.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const register = (name, description, action, readOnly = false) => Promise.resolve(document.modelContext.registerTool({
    name, description, inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: readOnly, untrustedContentHint: false },
    execute: async input => {
      if (input == null || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object');
      return action();
    },
  }, { signal: lifecycle.signal })).catch(() => {});
  try {
    register('melon_game_status', '读取切水果的模式、状态、得分和剩余时间。', () => ({ state, mode, score, timeLeft: mode === 'zen' ? null : timeLeft, cuts, maxCombo }), true);
    register('melon_pause', '暂停当前正在进行的切水果游戏。', () => { pause(); return { state }; });
    register('melon_resume', '继续已暂停的切水果游戏。', () => { resume(); return { state }; });
  } catch { /* Experimental API availability must not affect the game. */ }
}
