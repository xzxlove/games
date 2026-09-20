// Add one entry here after placing a new game in dist/games/<id>/.
// Entry and cover URLs are relative to the platform root, including subpath hosting.
export const games = [
  {
    id: 'fruit-slice',
    title: '切水果',
    englishTitle: 'FRUIT SLICE',
    description: '六种新鲜水果，一划就痛快。挑战连切纪录，或不计时间慢慢玩。',
    category: '休闲街机',
    tags: ['触屏友好', '单人', '离线可玩'],
    entry: './games/fruit-slice/index.html',
    cover: './games/fruit-slice/assets/cover.png',
    background: './games/fruit-slice/assets/arena.png',
    accent: '#d0f77a',
    modes: [
      { id: 'classic', title: '经典挑战', description: '60 秒冲分' },
      { id: 'zen', title: '随心切切', description: '不限时，无炸弹' },
    ],
  },

];

export function selectGames(catalog, records, { view = 'all', query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  let result = catalog.filter(game => {
    if (view === 'favorites' && !records.favorites.includes(game.id)) return false;
    if (view === 'recent' && !records.games[game.id]?.lastPlayedAt) return false;
    return [game.title, game.englishTitle, game.description, game.category, ...game.tags].join(' ').toLocaleLowerCase().includes(needle);
  });
  if (view === 'recent') result.sort((a, b) => records.games[b.id].lastPlayedAt - records.games[a.id].lastPlayedAt);
  return result;
}
