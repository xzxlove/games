import { toddlerGames } from './shared/toddler/catalog.js';

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
  {
    id: 'tiny-wonderland',
    title: '宝宝启蒙乐园',
    englishTitle: 'TINY WONDERLAND',
    description: '数字、动物、ABC，还有五个好奇小世界。和小宝贝一起听一听、找一找、说一说。',
    category: '亲子启蒙',
    tags: ['2 岁起亲子陪玩', '中英配音', '8 个主题'],
    entry: './games/tiny-wonderland/index.html',
    cover: './games/tiny-wonderland/assets/cover.svg',
    background: './games/tiny-wonderland/assets/cover.svg',
    accent: '#a8b88b',
    recordKind: 'activity',
    modes: [
      { id: 'listen', title: '听一听', description: '点击探索，认识新朋友' },
      { id: 'find', title: '找一找', description: '听提示，找一找' },
      { id: 'talk', title: '说一说', description: '亲子轮流表达' },
    ],
  },
  ...toddlerGames,
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
