const item = (id, zh, en, art = id, phrase = zh, englishPhrase = en) => ({ id, zh, en, art, phrase, englishPhrase });

export const numberWords = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const englishNumbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const topics = [
  { id: 'numbers', name: '数字小火车', en: 'Number train', subtitle: '装一装，数一数', color: '#e59354', bg: '#fff0d8', icon: 'train', action: '装一个苹果', actionEn: 'Add an apple', tip: '和孩子一起点一个、数一个，再找找身边有几个玩具。', items: Array.from({ length: 10 }, (_, i) => ({ ...item(String(i + 1), numberWords[i + 1], englishNumbers[i + 1], 'apple', `${numberWords[i + 1]}个苹果`, `${englishNumbers[i + 1]} ${i ? 'apples' : 'apple'}`), value: i + 1 })) },
  { id: 'animals', name: '动物农场', en: 'Animal farm', subtitle: '和小动物打招呼', color: '#749c72', bg: '#e9f2df', icon: 'rabbit', action: '和它打招呼', actionEn: 'Say hello', tip: '学一学动物的声音。孩子说“小猫”，你可以接“小猫喵喵叫”。', items: [item('cat', '小猫', 'Cat', 'cat', '小猫，喵喵', 'Hello, cat. Meow, meow.'), item('dog', '小狗', 'Dog', 'dog', '小狗，汪汪', 'Hello, dog. Woof, woof.'), item('rabbit', '小兔', 'Rabbit', 'rabbit', '小兔，跳一跳', 'Hop, little rabbit.'), item('duck', '小鸭', 'Duck', 'duck', '小鸭，嘎嘎', 'Hello, duck. Quack, quack.'), item('cow', '奶牛', 'Cow', 'cow', '奶牛，哞哞', 'Hello, cow. Moo, moo.'), item('bear', '小熊', 'Bear', 'bear', '小熊，你好', 'Hello, little bear.')] },
  { id: 'letters', name: 'ABC 字母屋', en: 'Alphabet house', subtitle: '听字母，认识新朋友', color: '#b18ac4', bg: '#f1e8f7', icon: 'abc', action: '打开字母礼物', actionEn: 'Open the letter gift', tip: '先听字母名，再听单词。不用背诵，和孩子一起找相同的字母就好。', items: [
    ['A','Apple','苹果','apple'], ['B','Ball','皮球','ball'], ['C','Cat','小猫','cat'], ['D','Dog','小狗','dog'], ['E','Egg','鸡蛋','egg'], ['F','Fish','小鱼','fish'], ['G','Grapes','葡萄','grapes'], ['H','Hat','帽子','hat'], ['I','Ice cream','冰淇淋','icecream'], ['J','Juice','果汁','juice'], ['K','Kite','风筝','kite'], ['L','Lion','狮子','lion'], ['M','Moon','月亮','moon'], ['N','Nest','鸟窝','nest'], ['O','Orange','橙子','orange'], ['P','Pear','梨','pear'], ['Q','Queen','女王','queen'], ['R','Rabbit','小兔','rabbit'], ['S','Sun','太阳','sun'], ['T','Train','火车','train'], ['U','Umbrella','雨伞','umbrella'], ['V','Van','小货车','van'], ['W','Whale','鲸鱼','whale'], ['X','X-ray','X 光片','xray'], ['Y','Yo-yo','悠悠球','yoyo'], ['Z','Zebra','斑马','zebra'],
  ].map(([letter,en,zh,art]) => ({ ...item(letter, zh, en, art, `${letter}, ${en}`, `${letter}. ${en}.`), letter })) },
  { id: 'colors', name: '颜色花园', en: 'Color garden', subtitle: '给小花穿上彩色衣服', color: '#db8590', bg: '#fce8e9', icon: 'flower', action: '给小花浇水', actionEn: 'Water the flower', tip: '找找家里同样颜色的东西。可以说“红色，红色的花”。', items: [['red','红色','Red','#e88472'],['yellow','黄色','Yellow','#efc65c'],['blue','蓝色','Blue','#7ba9d2'],['green','绿色','Green','#88ad78'],['purple','紫色','Purple','#ad8ac5'],['pink','粉色','Pink','#e9a7b6']].map(([id,zh,en,color]) => ({ ...item(id,zh,en,'flower',`${zh}的花`, `A ${en.toLowerCase()} flower`), color })) },
  { id: 'shapes', name: '形状积木', en: 'Shape blocks', subtitle: '圆圆方方，找个家', color: '#77a6b3', bg: '#e5f2f5', icon: 'blocks', action: '把积木放进去', actionEn: 'Put the block in', tip: '用手指沿着形状走一圈，再找找圆盘子、方积木。', items: [item('circle','圆形','Circle'),item('square','正方形','Square'),item('triangle','三角形','Triangle'),item('star','星星','Star'),item('heart','爱心','Heart'),item('oval','椭圆形','Oval')] },
  { id: 'fruit', name: '水果小厨房', en: 'Fruit kitchen', subtitle: '给小熊做一份点心', color: '#dd8b65', bg: '#fff0e4', icon: 'apple', action: '喂小熊吃一口', actionEn: 'Feed the bear', tip: '问“你想吃什么？”孩子指一指也可以，你来示范“我要苹果”。', items: [item('apple','苹果','Apple','apple','我要苹果','I want an apple'),item('banana','香蕉','Banana','banana','我要香蕉','I want a banana'),item('orange','橙子','Orange','orange','我要橙子','I want an orange'),item('pear','梨','Pear','pear','我要梨','I want a pear'),item('grapes','葡萄','Grapes','grapes','我要葡萄','I want some grapes'),item('strawberry','草莓','Strawberry','strawberry','我要草莓','I want a strawberry')] },
  { id: 'vehicles', name: '交通小镇', en: 'Little town', subtitle: '嘀嘀，我们出发啦', color: '#6993c0', bg: '#e8effb', icon: 'car', action: '出发啦', actionEn: "Let's go", tip: '跟着小车一起说“开”。再把词连起来：“汽车开”“飞机飞”。', items: [item('car','汽车','Car','car','汽车开，嘀嘀','Go, little car. Beep, beep.'),item('train','火车','Train','train','火车开，呜呜','Go, little train. Choo, choo.'),item('plane','飞机','Plane','plane','飞机飞','The plane flies'),item('boat','轮船','Boat','boat','小船开','The boat sails'),item('bus','公交车','Bus','bus','坐公交车','Ride the bus'),item('van','小货车','Van','van','小货车，出发','Go, little van')] },
  { id: 'life', name: '生活小屋', en: 'My little home', subtitle: '和小熊一起过一天', color: '#b39269', bg: '#f1eadd', icon: 'house', action: '和小熊一起做', actionEn: 'Do it together', tip: '边玩边做同样的动作，结束后和孩子在生活里再试一次。', items: [item('water','喝水','Drink water','cup','宝宝喝水','Drink some water'),item('wash','洗手','Wash hands','wash','宝宝洗洗手','Wash your hands'),item('shoes','穿鞋','Put on shoes','shoes','宝宝穿鞋','Put on your shoes'),item('sleep','睡觉','Go to sleep','moon','宝宝睡觉，晚安','Time for bed. Good night.'),item('hello','你好','Hello','bear','你好，小熊','Hello, little bear'),item('bye','再见','Goodbye','bear','小熊，再见','Goodbye, little bear')] },
];

export const modes = [{ id: 'listen', name: '听一听', hint: '点一点，听听它的名字', icon: 'sound' }, { id: 'find', name: '找一找', hint: '听听看，它藏在哪里', icon: 'search' }, { id: 'talk', name: '说一说', hint: '和爸爸妈妈一起聊聊天', icon: 'chat' }];
export const defaults = { language: 'zh', level: 'gentle', minutes: 3, sound: true, motion: true };
export function sanitizeSettings(value = {}) {
  return { language: ['zh','en'].includes(value?.language) ? value.language : 'zh', level: ['gentle','curious'].includes(value?.level) ? value.level : 'gentle', minutes: [3,5].includes(value?.minutes) ? value.minutes : 3, sound: value?.sound !== false, motion: value?.motion !== false };
}
export function poolFor(topic, settings) {
  if (topic.id === 'numbers') return topic.items.slice(0, settings.level === 'gentle' ? 3 : 10);
  return topic.items;
}
export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i],result[j]] = [result[j],result[i]]; }
  return result;
}
export function choicesFor(pool, target, level, random = Math.random) {
  return shuffled([target, ...shuffled(pool.filter(entry => entry.id !== target.id), random).slice(0, level === 'gentle' ? 1 : 2)], random);
}
export function labelFor(topic, entry, language) {
  return topic.id === 'letters' ? entry.letter : language === 'en' ? entry.en : entry.zh;
}
export function speechFor(topic, entry, language, kind = 'name') {
  if (topic.id === 'letters') {
    if (kind === 'find') return { text: language === 'en' ? `Find the letter ${entry.letter}.` : `找找字母 ${entry.letter}。`, language };
    return { text: kind === 'letter' ? entry.letter : entry.englishPhrase, language: 'en' };
  }
  if (kind === 'find') return { text: language === 'en' ? `Can you find ${topic.id === 'numbers' ? entry.englishPhrase : entry.en.toLowerCase()}?` : `找找${topic.id === 'numbers' ? entry.phrase : entry.zh}。`, language };
  return { text: kind === 'phrase' ? (language === 'en' ? entry.englishPhrase : entry.phrase) : (language === 'en' ? entry.en : entry.zh), language };
}
export function talkPrompt(topic, language) {
  const prompts = { numbers:['有几个苹果呀？','How many apples?'], animals:['和它打个招呼吧。','Say hello to our friend.'], letters:['一起听听，再试着说说。','Listen and say it together.'], colors:['小花是什么颜色？','What color is the flower?'], shapes:['这是什么形状呀？','What shape is this?'], fruit:['你想吃什么呀？','What would you like to eat?'], vehicles:['它要怎么出发呀？','How does it go?'], life:['我们一起做什么呀？','What shall we do together?'] };
  return prompts[topic.id][language === 'en' ? 1 : 0];
}
