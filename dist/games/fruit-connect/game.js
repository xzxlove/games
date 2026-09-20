import { createRound, findMatch, LEVELS } from './model.js';
import { FRUITS, fruitSvg } from './art.js';
import { createGameSession, library } from '../../shared/sdk.js';
import { registerOffline } from '../../shared/pwa.js';
import { bindFullscreen } from '../../shared/fullscreen.js';
import { createAudio } from '../../shared/toddler/audio.js';

const $ = id => document.getElementById(id);
const session = createGameSession('fruit-connect');
let mode = 'classic', round = createRound(mode), selected = null, hinted = [], busy = false;
let epoch = 0, pathTimer, toastTimer, sound = library.read().settings.sound, audio;
const fruitVoice = createAudio(() => sound && !document.hidden, () => toast('暂时无法播报水果名称，请检查设备的中文语音。'));
let lastFrame = performance.now(), lastPaint = 0, modalAction = null, modalCancel = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const formatTime = seconds => `${String(Math.floor(Math.ceil(seconds) / 60)).padStart(2, '0')}:${String(Math.ceil(seconds) % 60).padStart(2, '0')}`;

function tone(notes = [520, 650], duration = .1) {
  if (!sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const start = audio.currentTime + index * .075;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.065, start + .008);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start); oscillator.stop(start + duration + .02);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Sound is optional; the game also works on silent devices. */ }
}

function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3200);
}
function syncSound() {
  $('sound').setAttribute('aria-pressed', String(sound));
  $('sound').setAttribute('aria-label', sound ? '关闭声音' : '开启声音');
}
function clearPath() { clearTimeout(pathTimer); $('connections').replaceChildren(); }
function clearSelection() { selected = null; hinted = []; clearPath(); }

function renderBoard(focus = false) {
  const { board, status } = round.state;
  const oldFocus = Number(document.activeElement?.dataset?.index ?? -1);
  const first = board.cells.findIndex(value => value != null);
  const focusIndex = board.cells[oldFocus] != null ? oldFocus : first;
  $('board').style.gridTemplateColumns = `repeat(${board.cols}, minmax(0, 1fr))`;
  $('board-wrap').style.setProperty('--rows', board.rows);
  $('board').innerHTML = board.cells.map((type, index) => {
    const fruit = FRUITS[type] || FRUITS[0], empty = type == null;
    return `<button class="tile${empty ? ' removed' : ''}${index === selected ? ' selected' : ''}${hinted.includes(index) ? ' hinted' : ''}" data-index="${index}" style="--tile-color:${fruit.color}" aria-label="${empty ? '空位' : fruit.name}，第 ${Math.floor(index / board.cols) + 1} 行，第 ${index % board.cols + 1} 列" aria-pressed="${index === selected}" tabindex="${index === focusIndex ? 0 : -1}" ${empty || status !== 'playing' || busy ? 'disabled' : ''}>${empty ? '' : fruitSvg(type)}</button>`;
  }).join('');
  if (focus && status === 'playing' && !busy && focusIndex >= 0) $('board').children[focusIndex].focus({ preventScroll: true });
}

function syncHUD() {
  const state = round.state, level = LEVELS[state.level], playing = state.status === 'playing';
  $('app').dataset.state = state.status;
  $('score').textContent = state.score.toLocaleString('zh-CN');
  $('best').textContent = session.best(mode).toLocaleString('zh-CN');
  $('remaining').textContent = state.board.cells.filter(value => value != null).length / 2;
  $('level-number').textContent = String(state.level + 1).padStart(2, '0');
  $('level-title').textContent = level.title; $('level-pill').textContent = `第 ${state.level + 1} / 3 关`;
  $('hints').textContent = state.hints; $('shuffles').textContent = state.shuffles;
  $('hint').disabled = !playing || !state.hints || busy;
  $('shuffle').disabled = !playing || !state.shuffles || busy;
  $('start').hidden = state.status !== 'ready';
  $('pause').hidden = state.status === 'ready';
  $('pause').disabled = !['playing', 'paused'].includes(state.status);
  $('pause').querySelector('span').textContent = state.status === 'paused' ? '继续小小冒险' : '歇一歇';
  $('board-cover').hidden = state.status !== 'paused';
  $('timer-caption').textContent = mode === 'zen' ? '悠闲时光 · 不限时' : '本关剩余时间';
  $('time').textContent = mode === 'zen' ? '∞' : formatTime(state.seconds);
  $('time-fill').style.transform = `scaleX(${mode === 'zen' ? 1 : state.seconds / level.seconds})`;
  $('time-track').setAttribute('aria-valuemax', level.seconds);
  $('time-track').setAttribute('aria-valuenow', Math.ceil(state.seconds));
  $('time-track').setAttribute('aria-valuetext', mode === 'zen' ? '不限时' : `剩余 ${Math.ceil(state.seconds)} 秒`);
  document.querySelector('.score-card').classList.toggle('urgent', mode === 'classic' && state.seconds <= 30);
  $('combo').textContent = state.combo > 1 ? `${state.combo} 连击！` : '好事成双';
  $('board-tip').textContent = state.combo > 1 ? `${state.combo} 连击，快乐正在加倍！` : state.status === 'ready' ? '相同水果，轻轻一点就相连' : '连线可走外围，慢慢发现小惊喜';
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
}

function drawPath(path, duration = 330) {
  clearPath();
  const wrap = $('board-wrap').getBoundingClientRect(), tiles = $('board').children;
  const first = tiles[0].getBoundingClientRect(), nextCol = tiles[1].getBoundingClientRect();
  const nextRow = tiles[round.state.board.cols].getBoundingClientRect();
  const x = first.left - wrap.left + first.width / 2, y = first.top - wrap.top + first.height / 2;
  const stepX = nextCol.left - first.left, stepY = nextRow.top - first.top;
  $('connections').setAttribute('viewBox', `0 0 ${wrap.width} ${wrap.height}`);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  // Outer lanes use the board's padding, so they stay visible at every tile size.
  line.setAttribute('points', path.map(p => `${Math.max(8, Math.min(wrap.width - 8, x + p.c * stepX))},${Math.max(8, Math.min(wrap.height - 8, y + p.r * stepY))}`).join(' '));
  $('connections').append(line);
  pathTimer = setTimeout(clearPath, duration);
}

function ensureMove() {
  if (round.state.status === 'playing' && !findMatch(round.state.board)) {
    round.shuffle(true); clearSelection(); renderBoard(); syncHUD();
    toast('暂时没有可连接的水果，已为你免费洗牌。');
  }
}

function choose(index) {
  if (round.state.status !== 'playing' || busy || round.state.board.cells[index] == null) return;
  hinted = []; clearPath();
  if (selected === index) { selected = null; renderBoard(true); return; }
  if (selected == null) { selected = index; tone([420], .045); renderBoard(true); return; }
  const previous = selected, fruitName = FRUITS[round.state.board.cells[index]].name;
  const result = round.match(previous, index);
  if (!result) {
    const identical = round.state.board.cells[previous] === round.state.board.cells[index];
    selected = index; renderBoard(true); $('board').children[index].classList.add('wrong');
    tone([230], .06);
    if (identical) toast('这条路被挡住啦，试试最多拐两次弯的路线。');
    return;
  }
  const focused = $('board').contains(document.activeElement), currentEpoch = epoch;
  busy = true; selected = null;
  for (const tile of $('board').children) { tile.disabled = true; tile.classList.remove('selected', 'hinted'); }
  $('board').children[previous].classList.add('matching'); $('board').children[index].classList.add('matching');
  drawPath(result.path);
  const tileRect = $('board').children[index].getBoundingClientRect(), wrap = $('board-wrap').getBoundingClientRect();
  const points = $('floating-points');
  points.textContent = `+${result.points}`; points.style.left = `${tileRect.left - wrap.left + tileRect.width / 2}px`;
  points.style.top = `${tileRect.top - wrap.top}px`; points.classList.remove('show');
  void points.offsetWidth; points.classList.add('show');
  $('announcement').textContent = `消除${fruitName}，加 ${result.points} 分。剩余 ${round.state.board.cells.filter(value => value != null).length / 2} 对。`;
  fruitVoice.speak(fruitName);
  tone([530 + Math.min(round.state.combo, 7) * 35, 780 + Math.min(round.state.combo, 7) * 25]);
  syncHUD();
  setTimeout(() => {
    if (currentEpoch !== epoch) return;
    busy = false; clearPath(); renderBoard(focused); ensureMove(); syncHUD();
    if (['between', 'won', 'lost'].includes(round.state.status)) showResult();
  }, reducedMotion ? 60 : 300);
}

function hideModal() { $('modal').close(); modalAction = modalCancel = null; }
function showModal({ title, eyebrow, content, action, onAction, onCancel, secondary, onSecondary, fruit = 2 }) {
  $('modal-title').textContent = title; $('modal-eyebrow').textContent = eyebrow;
  $('modal-content').innerHTML = content; $('modal-art').innerHTML = fruitSvg(fruit);
  $('modal-action').textContent = action; modalAction = onAction; modalCancel = onCancel;
  $('modal-close').hidden = !onCancel;
  $('modal-secondary').hidden = !secondary; $('modal-secondary').textContent = secondary || '';
  $('modal-secondary').onclick = onSecondary || null;
  if (!$('modal').open) $('modal').showModal();
  $('modal-action').focus({ preventScroll: true });
}
function resetReady(nextMode = mode) {
  fruitVoice.stop();
  epoch++; busy = false; clearSelection(); hideModal();
  mode = nextMode; round = createRound(mode); lastFrame = performance.now();
  $('floating-points').classList.remove('show'); renderBoard(); syncHUD();
}
function start() {
  if (round.state.status !== 'ready') resetReady();
  session.start(mode); round.start(); lastFrame = performance.now();
  hideModal(); tone([392, 523, 659], .15); renderBoard(); syncHUD();
  $('board').querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
}
function resume() {
  if (document.hidden) return;
  hideModal(); round.resume(); lastFrame = performance.now();
  renderBoard(); ensureMove(); syncHUD();
  $('board').querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
}
function pause() {
  fruitVoice.stop();
  if (round.state.status !== 'playing') return;
  round.pause(); clearSelection(); clearPath(); renderBoard(); syncHUD();
  showModal({ title: '让快乐稍等一下', eyebrow: 'TAKE A LITTLE BREAK',
    content: '<p>时间已经停下，果园等你回来。</p>', action: '继续游戏', onAction: resume, onCancel: resume,
    secondary: '重新开始这一局', onSecondary: confirmRestart });
}
function confirmRestart(nextMode = mode) {
  if (typeof nextMode !== 'string') nextMode = mode;
  showModal({ title: nextMode === mode ? '开启新的小冒险？' : '换一种心情继续？', eyebrow: 'A FRESH START',
    content: '<p>这局进度会结束，新的一局从第一关开始。</p>', action: '开始新的一局',
    onAction: () => { resetReady(nextMode); start(); }, onCancel: resume,
    secondary: '继续当前游戏', onSecondary: resume });
}
function showResult() {
  const state = round.state, between = state.status === 'between', won = state.status === 'won';
  if (!between) session.finish({ mode, score: state.score, seconds: state.elapsed });
  syncHUD(); tone(won || between ? [523, 659, 784, 1047] : [440, 349], .16);
  showModal({ title: between ? '这一园，圆满啦！' : won ? '收获满满的小快乐！' : '休息一下，再来一局',
    eyebrow: between ? `CHAPTER ${state.level + 1} COMPLETE` : won ? 'A LOVELY LITTLE VICTORY' : 'UNTIL NEXT TIME',
    content: `<p>${between ? '水果都找到伙伴了，下一片果园正等着你。' : won ? '三个果园全部完成，把好心情带走吧。' : '时间到了，你已经找到好多对小伙伴。'}</p><strong>${state.score.toLocaleString('zh-CN')}</strong><p>累计得分${mode === 'classic' && (between || won) ? ' · 已计入剩余时间奖励' : ''}</p><div class="result-detail"><span>消除 ${state.matched} 对</span><span>最高 ${state.bestCombo} 连击</span><span>用时 ${formatTime(state.elapsed)}</span></div>`,
    action: between ? `出发 · ${LEVELS[state.level + 1].title}` : '再玩一局',
    onAction: () => {
      if (!between) { resetReady(); start(); return; }
      fruitVoice.stop(); hideModal(); epoch++; clearSelection(); round.next(); lastFrame = performance.now(); renderBoard(); syncHUD();
      $('board').querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
    }, secondary: between ? null : '回到准备页', onSecondary: () => resetReady(), fruit: won ? 0 : 1,
  });
}
function help() {
  if (busy || ['between', 'won', 'lost'].includes(round.state.status)) return;
  const wasPlaying = round.state.status === 'playing';
  if (wasPlaying) { fruitVoice.stop(); round.pause(); clearSelection(); renderBoard(); syncHUD(); }
  const close = () => { hideModal(); if (wasPlaying) resume(); };
  showModal({ title: '快乐，有迹可循。', eyebrow: 'A LITTLE GUIDE',
    content: '<ol><li>依次点击两个<strong style="display:inline;font-size:inherit">相同水果</strong>。</li><li>路线不能穿过其他水果，最多拐 2 次弯，可以走棋盘外围。</li><li>清空棋盘进入下一关，一共 3 关。经典模式每关有独立倒计时，悠闲模式不限时。</li><li>5 秒内连续消除可累积连击。每对 100 分，连击最高额外加 100 分；经典过关每剩 1 秒加 10 分。</li></ol><p>每关 3 次提示、3 次洗牌。无路可连会自动免费洗牌。<br>方向键移动 · Enter / 空格选中 · H 提示 · R 洗牌 · Esc 暂停</p>',
    action: '找到快乐的秘诀了', onAction: close, onCancel: close, fruit: 7 });
}

$('board').addEventListener('click', event => { const tile = event.target.closest('[data-index]'); if (tile) choose(Number(tile.dataset.index)); });
$('board').addEventListener('keydown', event => {
  const directions = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
  if (!directions[event.key] || round.state.status !== 'playing') return;
  event.preventDefault(); const index = Number(event.target.closest('[data-index]')?.dataset.index ?? 0);
  const { board } = round.state, [dr, dc] = directions[event.key];
  let r = Math.floor(index / board.cols) + dr, c = index % board.cols + dc;
  while (r >= 0 && c >= 0 && r < board.rows && c < board.cols) {
    if (board.cells[r * board.cols + c] != null) {
      for (const tile of $('board').children) tile.tabIndex = -1;
      const target = $('board').children[r * board.cols + c]; target.tabIndex = 0; target.focus({ preventScroll: true }); return;
    }
    r += dr; c += dc;
  }
});
$('hint').addEventListener('click', () => {
  if (busy) return;
  const pair = round.hint(); if (!pair) return;
  selected = null; hinted = [pair.first, pair.second]; renderBoard(); drawPath(pair.path, 2000); syncHUD();
  const first = $('board').children[pair.first], second = $('board').children[pair.second];
  toast(`试试这两个${FRUITS[round.state.board.cells[pair.first]].name}，已经为你标亮了。`);
  $('announcement').textContent = `提示：${first.getAttribute('aria-label')}与${second.getAttribute('aria-label')}可以消除。`;
  tone([659], .12);
});
$('shuffle').addEventListener('click', () => {
  if (busy || !round.shuffle()) return;
  clearSelection(); renderBoard(); syncHUD(); tone([400, 500, 600], .08); toast('水果换好了位置，重新发现一对小快乐。');
});
$('start').addEventListener('click', start);
$('pause').addEventListener('click', () => round.state.status === 'paused' ? resume() : pause());
$('help').addEventListener('click', help);
$('sound').addEventListener('click', () => { sound = !sound; library.setSound(sound); syncSound(); if (sound) tone(); else fruitVoice.stop(); });
$('modal-action').addEventListener('click', () => modalAction?.());
$('modal-close').addEventListener('click', () => modalCancel?.());
$('modal').addEventListener('cancel', event => { event.preventDefault(); modalCancel?.(); });
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode === mode || busy) return;
  if (round.state.status === 'ready') resetReady(button.dataset.mode);
  else if (round.state.status === 'playing') { fruitVoice.stop(); round.pause(); clearSelection(); renderBoard(); syncHUD(); confirmRestart(button.dataset.mode); }
}));
document.addEventListener('keydown', event => {
  if ($('modal').open || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (event.key === 'Escape') { event.preventDefault(); pause(); }
  else if (event.key.toLowerCase() === 'h') $('hint').click();
  else if (event.key.toLowerCase() === 'r') $('shuffle').click();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); void audio?.suspend().catch(() => {}); } });
window.addEventListener('pagehide', () => { pause(); void audio?.suspend().catch(() => {}); });
window.addEventListener('resize', clearPath);
bindFullscreen($('fullscreen'), { target: $('app'), notify: toast });
$('modal').setAttribute('aria-labelledby', 'modal-title');
registerOffline(); syncSound(); renderBoard(); syncHUD();
function frame(now) {
  const previousStatus = round.state.status;
  round.tick((now - lastFrame) / 1000); lastFrame = now;
  if (previousStatus === 'playing' && round.state.status === 'lost') { fruitVoice.stop(); clearSelection(); renderBoard(); if (!busy) showResult(); }
  if (now - lastPaint > 150) { syncHUD(); lastPaint = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
