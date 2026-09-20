import { games, selectGames } from './games.js';
import { library } from './shared/sdk.js';
import { registerOffline } from './shared/pwa.js';

const $ = id => document.getElementById(id);
const views = {
  all: { title: '游戏大厅', description: '留一点时间，玩点喜欢的。', section: '全部游戏' },
  favorites: { title: '我的收藏', description: '把喜欢的游戏，留在顺手的地方。', section: '收藏的游戏' },
  recent: { title: '最近游玩', description: '再来一局，快乐接着上次。', section: '最近打开' },
};
let view = views[location.hash.slice(1)] ? location.hash.slice(1) : 'all';
let toastTimer;
const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.3-5.7-3-5.7 3 1.1-6.3L3.2 9.6l6-.9z"/></svg>';
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 2400); }
function timeAgo(timestamp) {
  const minutes = Math.max(0, (Date.now() - timestamp) / 60000);
  if (minutes < 1) return '刚刚玩过';
  if (minutes < 60) return `${Math.floor(minutes)} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  return `${Math.floor(minutes / 1440)} 天前`;
}
function render() {
  const records = library.read(), query = $('search').value;
  const list = selectGames(games, records, { view, query });
  const favorites = games.filter(game => records.favorites.includes(game.id));
  const recent = selectGames(games, records, { view: 'recent' });
  const descriptor = views[view];
  $('breadcrumb').textContent = descriptor.title;
  $('view-title').replaceChildren(document.createTextNode(descriptor.title), Object.assign(document.createElement('span'), { textContent: '↗' }));
  $('view-description').textContent = descriptor.description;
  $('section-title').textContent = query.trim() ? '搜索结果' : descriptor.section;
  $('result-count').textContent = `${list.length} 款游戏`;
  $('all-count').textContent = games.length; $('favorite-count').textContent = favorites.length; $('recent-count').textContent = recent.length;
  $('stat-games').textContent = String(games.length).padStart(2, '0');
  $('stat-plays').textContent = String(games.reduce((sum, game) => sum + (records.games[game.id]?.plays || 0), 0)).padStart(2, '0');
  $('stat-favorites').textContent = String(favorites.length).padStart(2, '0');
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view; button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $('game-grid').innerHTML = list.map(game => {
    const favorite = records.favorites.includes(game.id), record = records.games[game.id];
    const hasBest = Object.values(record?.bestByMode || {}).some(score => score > 0);
    return `<article class="game-card ${game.recordKind === 'activity' ? 'activity-card' : ''}" data-game-id="${escape(game.id)}"><div class="game-art"><a href="${escape(game.entry)}" aria-label="打开${escape(game.title)}"><img src="${escape(game.cover)}" alt="${escape(game.title)}游戏封面" width="960" height="600"></a><span class="card-genre">${escape(game.category)}</span><button class="favorite-button" data-favorite="${escape(game.id)}" aria-pressed="${favorite}" aria-label="${favorite ? '取消收藏' : '收藏'}${escape(game.title)}">${star}</button><span class="art-wordmark">${escape(game.englishTitle)}</span></div><div class="card-info"><div class="card-title-row"><h3>${escape(game.title)}</h3><span>${game.modes.length} 种玩法</span></div><p class="card-description">${escape(game.description)}</p><div class="card-tags">${game.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div><div class="card-bottom"><a class="play-button" href="${escape(game.entry)}" aria-label="开始玩${escape(game.title)}">开始游戏 ${arrow}</a><span class="card-record">${record?.lastPlayedAt ? timeAgo(record.lastPlayedAt) : game.recordKind === 'activity' ? '一起慢慢探索' : hasBest ? '已有个人纪录' : '等你来挑战'}</span></div></div></article>`;
  }).join('');
  for (const card of $('game-grid').children) {
    const game = games.find(item => item.id === card.dataset.gameId);
    card.style.setProperty('--game-background', `url("${new URL(game.background, location.href).href}")`);
  }
  $('empty-state').hidden = list.length > 0;
  if (!list.length) {
    $('empty-title').textContent = query.trim() ? '没有找到这款游戏' : view === 'favorites' ? '还没有收藏' : '第一局，从这里开始';
    $('empty-description').textContent = query.trim() ? '换个关键词试试，或看看全部游戏。' : view === 'favorites' ? '点一下游戏卡片上的星星，把喜欢的留在这里。' : '开始玩一款游戏，它就会出现在最近游玩中。';
  }
  $('personal-records').innerHTML = games.filter(game => game.recordKind !== 'activity').map(game => `<div class="game-record"><h3>${escape(game.title)}</h3>${game.modes.map(mode => {
    const best = records.games[game.id]?.bestByMode?.[mode.id];
    return `<div class="mode-record"><span>${escape(mode.title)}</span>${best > 0 ? `<b>${best.toLocaleString()}<small>分</small></b>` : '<b class="no-record">等你创下纪录</b>'}</div>`;
  }).join('')}</div>`).join('');
  const activities = games.filter(game => game.recordKind === 'activity');
  if (activities.length) {
    const completed = activities.reduce((sum, game) => sum + (records.games[game.id]?.completed || 0), 0);
    const explored = activities.filter(game => records.games[game.id]?.completed > 0).length;
    $('personal-records').innerHTML += `<div class="game-record activity-record"><h3>小小探索家</h3><p>已探索 ${explored} / ${activities.length} 个小游戏</p><p>一起完成 ${completed} 小轮</p><small>慢慢玩，每次发现都值得开心。</small></div>`;
  }
  $('recent-games').innerHTML = recent.length ? recent.slice(0, 3).map(game => `<a class="recent-item" href="${escape(game.entry)}"><img src="${escape(game.cover)}" alt="" width="49" height="43"><span><b>${escape(game.title)}</b><small>${timeAgo(records.games[game.id].lastPlayedAt)}</small></span>${arrow}</a>`).join('') : '<p class="recent-empty">玩过的游戏会出现在这里。<br>先挑一款，开始第一局吧。</p>';
  $('sound-setting').checked = records.settings.sound;
}
function changeView(next) {
  view = next; $('search').value = ''; history.replaceState(null, '', `#${next}`); render();
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
$('see-recent').addEventListener('click', () => changeView('recent'));
$('reset-view').addEventListener('click', () => changeView('all'));
$('search').addEventListener('input', render);
$('game-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-favorite]'); if (!button) return;
  const id = button.dataset.favorite, game = games.find(item => item.id === id); if (!game) return;
  const updated = library.toggleFavorite(id), active = updated.favorites.includes(id); render();
  const replacement = $('game-grid').querySelector(`[data-favorite="${id}"]`);
  (replacement || document.querySelector('[data-view="favorites"]')).focus({ preventScroll: true });
  toast(active ? `已收藏「${game.title}」` : `已取消收藏「${game.title}」`);
});
$('open-guide').addEventListener('click', () => $('guide').showModal());
$('close-guide').addEventListener('click', () => $('guide').close());
$('sound-setting').addEventListener('change', event => library.setSound(event.target.checked));
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (!request) return toast('用 Safari 添加到主屏幕，即可沉浸游玩');
      await request.call(document.documentElement);
    }
  } catch { toast('可用 Safari 的「添加到主屏幕」打开游戏室'); }
});
function syncFullscreen() { $('fullscreen').querySelector('span').textContent = document.fullscreenElement || document.webkitFullscreenElement ? '退出全屏' : '全屏'; }
document.addEventListener('fullscreenchange', syncFullscreen); document.addEventListener('webkitfullscreenchange', syncFullscreen);
document.addEventListener('keydown', event => { if (event.key === '/' && !event.metaKey && !event.ctrlKey && !$('guide').open && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('search').focus(); } });
window.addEventListener('hashchange', () => { view = views[location.hash.slice(1)] ? location.hash.slice(1) : 'all'; render(); });
window.addEventListener('pageshow', render);
window.addEventListener('storage', render);
render(); registerOffline({ activateUpdate: true });
