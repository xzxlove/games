import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryStore } from '../dist/shared/storage.js';
import { games, selectGames } from '../dist/games.js';
const storage = (initial = {}) => {
  const items = new Map(Object.entries(initial));
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
};
test('migrates fruit scores and sound without inventing play history', () => {
  const store = createLibraryStore(storage({ 'melon-best-classic': '1200', 'melon-best-zen': '500', 'melon-sound': 'off' }));
  const state = store.read();
  assert.equal(state.games['fruit-slice'].bestByMode.classic, 1200);
  assert.equal(state.games['fruit-slice'].lastPlayedAt, 0);
  assert.equal(state.settings.sound, false);
});
test('records survive navigation and stay isolated by game and mode', () => {
  const backend = storage(), store = createLibraryStore(backend, () => 1234);
  store.beginGame('fruit-slice');
  store.completeGame('fruit-slice', { mode: 'classic', score: 90, seconds: 60 });
  store.completeGame('fruit-slice', { mode: 'classic', score: 20, seconds: 40 });
  store.completeGame('fruit-slice', { mode: 'zen', score: 240, seconds: 120 });
  store.beginGame('test-game');
  store.completeGame('test-game', { mode: 'classic', score: 42, seconds: 10 });
  const reopened = createLibraryStore(backend).read();
  assert.equal(reopened.games['fruit-slice'].plays, 1);
  assert.equal(reopened.games['fruit-slice'].completed, 3);
  assert.deepEqual(reopened.games['fruit-slice'].bestByMode, { classic: 90, zen: 240 });
  assert.equal(reopened.games['test-game'].bestByMode.classic, 42);
  assert.equal(reopened.games['fruit-slice'].totalSeconds, 220);
});
test('new catalog entries participate in search, favorites and recency without UI changes', () => {
  const second = { ...games[0], id: 'blocks', title: '方块', englishTitle: 'BLOCKS', tags: ['益智'], description: '拼图' };
  const catalog = [...games, second], store = createLibraryStore(storage(), () => 99);
  store.toggleFavorite('blocks'); store.beginGame('blocks');
  assert.deepEqual(selectGames(catalog, store.read(), { view: 'favorites' }).map(g => g.id), ['blocks']);
  assert.deepEqual(selectGames(catalog, store.read(), { view: 'recent' }).map(g => g.id), ['blocks']);
  assert.equal(selectGames(catalog, store.read(), { query: '方块' })[0].id, 'blocks');
  assert.equal(selectGames(catalog, store.read(), { query: 'no-match' }).length, 0);
  store.toggleFavorite('blocks'); assert.equal(selectGames(catalog, store.read(), { view: 'favorites' }).length, 0);
});
test('blocked and corrupt browser storage do not prevent playing or favorites', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const store = createLibraryStore(blocked);
  store.toggleFavorite('fruit-slice'); store.beginGame('fruit-slice');
  assert.deepEqual(store.read().favorites, ['fruit-slice']);
  assert.equal(store.read().games['fruit-slice'].plays, 1);
  const corrupt = createLibraryStore(storage({ 'playroom-library-v1': '{bad json' }));
  assert.deepEqual(corrupt.read().favorites, []);
  assert.doesNotThrow(() => corrupt.beginGame('fruit-slice'));
  const quota = { getItem: key => key === 'playroom-library-v1' ? '{"favorites":[]}' : null, setItem() { throw new Error('quota'); } };
  const limited = createLibraryStore(quota);
  limited.toggleFavorite('fruit-slice');
  assert.deepEqual(limited.read().favorites, ['fruit-slice']);
});
test('invalid game results do not modify the record', () => {
  const store = createLibraryStore(storage());
  assert.throws(() => store.completeGame('fruit-slice', { mode: 'classic', score: -1, seconds: 20 }));
  assert.throws(() => store.completeGame('fruit-slice', { mode: 'classic', score: Infinity, seconds: 20 }));
  assert.deepEqual(store.read().games, {});
});
