import { toddlerGames } from './shared/toddler/catalog.js';

// Add one entry here after placing a new game in dist/games/<id>/.
// Entry and cover URLs are relative to the platform root, including subpath hosting.
export const games = [
  {
    id: 'fruit-connect',
    title: '果园连连看',
    englishTitle: 'LITTLE CONNECTIONS',
    description: '把快乐，一对一对连起来。穿过清晨、午后与落日，收获一整个小果园。',
    category: '休闲益智',
    tags: ['水果配对', '3 关挑战', '不限时模式', '离线可玩'],
    entry: './games/fruit-connect/index.html',
    cover: './games/fruit-connect/cover.svg',
    background: './games/fruit-connect/background.svg',
    accent: '#cdddac',
    modes: [
      { id: 'classic', title: '经典闯关', description: '限时三关，挑战连击' },
      { id: 'zen', title: '悠闲时光', description: '没有倒计时，慢慢连' },
    ],
  },
  {
    id: 'fruit-slice',
    title: '切水果',
    englishTitle: 'FRUIT SLICE',
    description: '12 种新鲜水果，畅快连切。挑战最后的胜利果实，来回狂切赢加分。',
    category: '休闲街机',
    tags: ['触屏友好', '单人', '离线可玩'],
    entry: './games/fruit-slice/index.html',
    cover: './games/fruit-slice/assets/cover.png',
    background: './games/fruit-slice/assets/arena.png',
    accent: '#d0f77a',
    modes: [
      { id: 'classic', title: '经典挑战', description: '60 秒挑战 + 10 秒胜利奖励' },
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
