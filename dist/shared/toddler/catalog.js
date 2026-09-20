export const activities = [
  { id: 'shape-home', title: '形状回家', en: 'LITTLE SHAPE HOMES', color: '#d78355', background: '#f4e8d9', icon: 'shapes', description: '圆圆方方找个家。点一点、拖一拖，让积木回到相同的轮廓里。', skill: '形状 · 配对', tip: '找一个圆盘子和一块方积木，和孩子一起摸摸它们的边。', intro: '帮积木找到自己的家', instruction: '先点积木，再点它的家；也可以拖过去。', done: '积木都回家啦！' },
  { id: 'animal-sounds', title: '听声音找动物', en: 'WHO IS CALLING?', color: '#67977d', background: '#e5eedf', icon: 'cat', description: '喵喵，谁在打招呼？听一听叫声，再找到可爱的小动物。', skill: '声音 · 语言', tip: '你学一声动物叫，让孩子来猜；再交换角色试试。', intro: '听一听，谁在叫？', instruction: '点小喇叭听叫声，再点小动物。', done: '认识了动物朋友！' },
  { id: 'color-sort', title: '颜色分一分', en: 'A BASKET OF COLORS', color: '#6d98bb', background: '#e5edf3', icon: 'basket', description: '红球放红篮，蓝球放蓝篮。把小球送进同色的篮子里。', skill: '颜色 · 分类', tip: '收玩具时一起找相同的颜色，不用急着说出颜色的名字。', intro: '小球要去哪个篮子？', instruction: '点一个球，再点同色篮子；也可以拖过去。', done: '小球收拾好啦！' },
  { id: 'little-puzzle', title: '两块小拼图', en: 'PIECE BY LITTLE PIECE', color: '#b494ba', background: '#eee6ef', icon: 'car', description: '把大块图片拼在一起，小汽车就出现了。从两块慢慢开始。', skill: '观察 · 空间', tip: '一起指指车轮、车窗，再找一辆真的玩具车。', intro: '拼出一辆小汽车', instruction: '把图片放到对应位置，浅浅的底图会帮你。', done: '小汽车拼好啦！' },
  { id: 'bear-hide', title: '小熊藏哪了', en: 'PEEKABOO, LITTLE BEAR', color: '#ba9361', background: '#f0e8d9', icon: 'box', description: '看着小熊躲起来，再打开盒子找找它。盒子不乱跑，慢慢找。', skill: '观察 · 记忆', tip: '把玩偶藏到小毛巾下面，让孩子亲手揭开找一找。', intro: '记住小熊在哪里', instruction: '先看看小熊，准备好了再让它藏起来。', done: '找到小熊啦！' },
  { id: 'bear-care', title: '照顾小熊', en: 'A LITTLE LOVE FOR BEAR', color: '#ca8b8f', background: '#f5e5e3', icon: 'bear', description: '吃点心、擦擦脸、盖被子。和小熊一起度过温柔的一天。', skill: '生活 · 表达', tip: '拿起家里的玩偶，和孩子轮流给它喂饭、说晚安。', intro: '小熊饿了，喂它吃点心吧', instruction: '听听小熊需要什么，再选一个东西。', done: '谢谢你照顾小熊！' },
  { id: 'flower-water', title: '小花喝水', en: 'GROW, LITTLE FLOWER', color: '#819a68', background: '#e9efdf', icon: 'flower', description: '给种子一点水。看它发芽、长叶，再开出一朵笑脸小花。', skill: '因果 · 观察', tip: '一起照顾一盆真植物，观察它在几天里慢慢长大的变化。', intro: '给小种子一点水吧', instruction: '点一下水壶，看看有什么变化。', done: '你的小花开了！' },
  { id: 'animal-music', title: '动物音乐屋', en: 'OUR LITTLE ORCHESTRA', color: '#d1a24e', background: '#f5edda', icon: 'drum', description: '敲敲鼓、摇摇铃，和动物一起唱歌。每一下都有自己的声音。', skill: '声音 · 轮流', tip: '你拍一下手，等孩子回应；轮流敲出属于你们的小节奏。', intro: '一起开一场小小音乐会', instruction: '点乐器或小动物，听听不同的声音。', done: '小小音乐会结束啦！' },
];

export const toddlerGames = activities.map(activity => ({
  id: activity.id, title: activity.title, englishTitle: activity.en,
  description: activity.description, category: '亲子益智',
  tags: ['2岁起亲子玩', '不限时', activity.skill],
  entry: `./games/${activity.id}/index.html`, cover: `./games/${activity.id}/cover.svg`,
  background: `./games/${activity.id}/background.svg`, accent: activity.color,
  recordKind: 'activity',
  modes: [{ id: 'gentle', title: '轻松玩', description: '少一点选择，慢慢探索' }, ...(['bear-care','flower-water'].includes(activity.id) ? [] : [{ id: 'curious', title: '多试一点', description: '增加选择或重复机会' }])],
}));
