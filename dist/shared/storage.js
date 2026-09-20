const KEY = 'playroom-library-v1';
const validId = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const number = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
const empty = () => ({ version: 1, favorites: [], games: {}, settings: { sound: true } });
const emptyGame = () => ({ plays: 0, completed: 0, lastPlayedAt: 0, totalSeconds: 0, bestByMode: {}, lastResult: null });
const own = (object, key) => Object.hasOwn(object, key);

function sanitize(raw) {
  const state = empty();
  if (!raw || typeof raw !== 'object') return state;
  state.favorites = Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter(validId))] : [];
  state.settings.sound = raw.settings?.sound !== false;
  for (const [id, data] of Object.entries(raw.games || {})) {
    if (!validId(id) || !data || typeof data !== 'object') continue;
    const record = emptyGame();
    for (const key of ['plays', 'completed', 'lastPlayedAt', 'totalSeconds']) record[key] = number(data[key]);
    record.bestByMode = Object.fromEntries(Object.entries(data.bestByMode || {}).filter(([mode]) => validId(mode)).map(([mode, score]) => [mode, number(score)]));
    if (data.lastResult && validId(data.lastResult.mode)) record.lastResult = { mode: data.lastResult.mode, score: number(data.lastResult.score), at: number(data.lastResult.at) };
    Object.defineProperty(state.games, id, { value: record, enumerable: true, writable: true, configurable: true });
  }
  return state;
}

export function createLibraryStore(storage, now = Date.now) {
  let memory = empty();
  let volatile = false;
  function persist(state) {
    memory = state;
    try { storage?.setItem(KEY, JSON.stringify(state)); } catch { volatile = true; }
    return structuredClone(state);
  }
  function read() {
    try {
      const raw = volatile ? null : storage?.getItem(KEY);
      if (raw) memory = sanitize(JSON.parse(raw));
    } catch { /* Corrupt or blocked storage must not prevent playing. */ }
    return structuredClone(memory);
  }
  // Preserve scores and sound from the original standalone fruit game.
  try {
    if (!storage?.getItem(KEY)) {
      const classic = number(storage?.getItem('melon-best-classic'));
      const zen = number(storage?.getItem('melon-best-zen'));
      if (classic || zen) memory.games['fruit-slice'] = { ...emptyGame(), bestByMode: { classic, zen } };
      memory.settings.sound = storage?.getItem('melon-sound') !== 'off';
      persist(memory);
    }
  } catch { /* Storage is optional. */ }
  function withGame(id, update) {
    if (!validId(id)) throw new Error('Invalid game id');
    const state = read();
    const game = own(state.games, id) ? state.games[id] : emptyGame();
    update(game);
    Object.defineProperty(state.games, id, { value: game, enumerable: true, writable: true, configurable: true });
    return persist(state);
  }
  return {
    read,
    toggleFavorite(id) {
      if (!validId(id)) throw new Error('Invalid game id');
      const state = read();
      state.favorites = state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id];
      return persist(state);
    },
    setSound(enabled) { const state = read(); state.settings.sound = Boolean(enabled); return persist(state); },
    beginGame(id) { return withGame(id, game => { game.plays++; game.lastPlayedAt = now(); }); },
    completeGame(id, result) {
      if (!result || !validId(result.mode) || !Number.isFinite(result.score) || result.score < 0 || !Number.isFinite(result.seconds) || result.seconds < 0) throw new Error('Invalid game result');
      return withGame(id, game => {
        game.completed++; game.totalSeconds += result.seconds;
        const previous = own(game.bestByMode, result.mode) ? game.bestByMode[result.mode] : 0;
        Object.defineProperty(game.bestByMode, result.mode, { value: Math.max(previous, result.score), enumerable: true, writable: true, configurable: true });
        game.lastResult = { mode: result.mode, score: result.score, at: now() };
      });
    },
  };
}
