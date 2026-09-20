export const shapes = [
  { id: 'circle', name: '圆形', color: '#dc8964' }, { id: 'square', name: '方形', color: '#7799bd' },
  { id: 'triangle', name: '三角形', color: '#d6b652' }, { id: 'star', name: '星星', color: '#d8b45b' },
  { id: 'heart', name: '爱心', color: '#d48a99' }, { id: 'oval', name: '椭圆形', color: '#9a92b9' },
  { id: 'diamond', name: '菱形', color: '#80a699' }, { id: 'rectangle', name: '长方形', color: '#ce9f71' },
  { id: 'semicircle', name: '半圆形', color: '#80a8b4' },
];
export const colors = [
  { id: 'red', name: '红色', color: '#de8176' }, { id: 'blue', name: '蓝色', color: '#729aba' },
  { id: 'yellow', name: '黄色', color: '#d8b34e' }, { id: 'green', name: '绿色', color: '#85a473' },
  { id: 'purple', name: '紫色', color: '#a28abb' }, { id: 'orange', name: '橙色', color: '#de9d65' },
];
export const animals = [
  { id: 'cat', name: '小猫', sound: '喵，喵，喵' }, { id: 'dog', name: '小狗', sound: '汪，汪，汪' },
  { id: 'duck', name: '小鸭', sound: '嘎，嘎，嘎' }, { id: 'cow', name: '奶牛', sound: '哞，哞' },
  { id: 'sheep', name: '小羊', sound: '咩，咩，咩' }, { id: 'pig', name: '小猪', sound: '哼，哼，哼' },
  { id: 'frog', name: '青蛙', sound: '呱，呱，呱' }, { id: 'bird', name: '小鸟', sound: '叽，叽，叽' },
];
export const careSteps = [
  { id: 'food', name: '小点心', prompt: '小熊饿了，喂它吃点心吧', feedback: '吃饱啦，谢谢你！', pose: 1 },
  { id: 'cloth', name: '小毛巾', prompt: '帮小熊擦擦脸吧', feedback: '小脸干净啦！', pose: 2 },
  { id: 'blanket', name: '小被子', prompt: '小熊困了，给它盖被子吧', feedback: '晚安，小熊。', pose: 3 },
  { id: 'cup', name: '小水杯', prompt: '小熊渴了，给它喝点水吧', feedback: '喝到水啦，谢谢你！', pose: 0 },
  { id: 'book', name: '故事书', prompt: '小熊想听故事，找找故事书吧', feedback: '一起读故事，真开心！', pose: 0 },
  { id: 'ball', name: '小皮球', prompt: '小熊想玩球，把皮球给它吧', feedback: '小熊接到球啦！', pose: 0 },
];
const shapeLessons = [
  ['circle','square','triangle'], ['triangle','circle','star'], ['star','square','heart'],
  ['heart','oval','circle'], ['diamond','rectangle','triangle'], ['semicircle','star','oval'],
  ['rectangle','heart','square'], ['oval','diamond','semicircle'], ['square','semicircle','heart'],
];
const colorLessons = [[0,1,2],[2,3,0],[4,5,1],[0,3,4],[1,2,5],[3,4,2],[5,0,3],[2,4,1],[1,5,4]];
export const pictures = [
  { id:'car', name:'小汽车' }, { id:'duck', name:'小鸭子' }, { id:'bear', name:'小熊' },
  { id:'flower', name:'小花' }, { id:'cat', name:'小猫' }, { id:'house', name:'小房子' },
  { id:'fish', name:'小鱼' }, { id:'train', name:'小火车' },
];
const careLessons = [
  { name:'香香点心时间', steps:['food','cloth','blanket'] },
  { name:'小熊去野餐', steps:['ball','food','cup'] },
  { name:'故事时间到', steps:['cup','book','blanket'] },
  { name:'玩累了歇一歇', steps:['ball','cup','cloth'] },
  { name:'干净的小熊', steps:['cloth','food','book'] },
];
export const flowers = [
  { name:'金色太阳花', color:'#e6b968', variant:0 }, { name:'粉色小雏菊', color:'#d98d9b', variant:1 },
  { name:'紫色小铃花', color:'#a18abd', variant:2 }, { name:'橙色太阳花', color:'#df9864', variant:0 },
  { name:'蓝色小雏菊', color:'#82adc6', variant:1 }, { name:'红色小铃花', color:'#d97c77', variant:2 },
];
const songs = [
  { name:'阳光音乐会', notes:[523,659,784,659,523] }, { name:'小雨滴音乐会', notes:[659,587,523,587,659] },
  { name:'星星音乐会', notes:[784,784,659,659,587,523] }, { name:'森林音乐会', notes:[523,587,659,784,659,523] },
];
const hidePlaces = ['客厅里的盒子', '花园里的盒子', '星空下的盒子', '野餐时的盒子'];
export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function validStage(stage) { return Number.isSafeInteger(stage) && stage > 0 ? stage : 1; }
export function createRound(id, mode = 'gentle', random = Math.random, stage = 1, previous = null) {
  stage = validStage(stage);
  const count = mode === 'curious' ? 3 : 2, index = stage - 1;
  const state = { id, mode, stage, count, items: [], targets: [], placed: [], progress: 0, total: 1, done: false };
  if (id === 'shape-home') {
    state.targets = shapeLessons[index % shapeLessons.length].slice(0,count).map(id => shapes.find(shape => shape.id === id));
    state.items = shuffled(state.targets,random).map(item => ({ ...item, target:item.id }));
    state.stageTitle = state.targets.map(item=>item.name).join('和');
  }
  if (id === 'color-sort') {
    state.targets = colorLessons[index % colorLessons.length].slice(0,count).map(i=>colors[i]);
    state.items = shuffled(state.targets.flatMap(item => [0,1].map(n=>({...item,id:`${item.id}-${n}`,target:item.id}))),random);
    state.stageTitle = state.targets.map(item=>item.name).join('、')+'的小球';
  }
  if (id === 'little-puzzle') {
    state.picture = pictures[index % pictures.length];
    state.items = shuffled(Array.from({length:mode === 'curious' ? 4 : 2},(_,i)=>({id:String(i),target:String(i),name:`第${i+1}块图片`})),random);
    state.stageTitle = `拼一拼${state.picture.name}`;
  }
  if (state.items.length) state.total = state.items.length;
  if (id === 'animal-sounds') {
    const friends = Array.from({length:3},(_,i)=>animals[(index*3+i)%animals.length]);
    state.questions = shuffled(friends,random).map(target => ({ target, choices:shuffled([target,...shuffled(animals.filter(a=>a.id!==target.id),random).slice(0,count-1)],random) }));
    state.total = 3; state.stageTitle = friends.map(a=>a.name).join('、');
  }
  if (id === 'bear-hide') {
    state.hiding = Math.floor(random()*count);
    if (previous && state.hiding === previous.hiding) state.hiding = (state.hiding+1)%count;
    state.hidden = false; state.setting = index%hidePlaces.length; state.stageTitle = hidePlaces[state.setting];
  }
  if (id === 'bear-care') {
    const lesson = careLessons[index%careLessons.length];
    state.steps = lesson.steps.map(id=>careSteps.find(step=>step.id===id));
    state.tools = shuffled(state.steps,random); state.stageTitle = lesson.name; state.total = state.steps.length;
  }
  if (id === 'flower-water') { state.total = 3; state.flower = flowers[index%flowers.length]; state.stageTitle = `种一朵${state.flower.name}`; }
  if (id === 'animal-music') {
    state.total = mode === 'curious' ? 12 : 8; state.song = songs[index%songs.length]; state.stageTitle = state.song.name;
    state.instruments = [
      {id:'drum',name:'咚咚鼓',color:'#f2e4d7'}, {id:'bell',name:'叮叮铃',color:'#f5ecd2'}, {id:'piano',name:'小钢琴',color:'#e9e4f0'},
      ...Array.from({length:3},(_,i)=>({...animals[(index*3+i)%animals.length],color:'#e8eddf'})),
    ];
  }
  return state;
}
export function nextRound(state, random = Math.random) {
  if (!state.done) throw new Error('Complete the current stage before continuing');
  return createRound(state.id,state.mode,random,state.stage+1,state);
}
// Drag, tap and keyboard all use the same rules. Completed rounds are immutable.
export function act(state, action) {
  if (state.done) return { accepted: false };
  let accepted = false;
  if (state.items.length && action.type === 'place') {
    const item = state.items.find(item => item.id === action.item);
    accepted = Boolean(item && item.target === action.target && !state.placed.includes(item.id));
    if (accepted) state.placed.push(item.id);
  } else if (state.id === 'animal-sounds' && action.type === 'choose') accepted = action.item === state.questions[state.progress].target.id;
  else if (state.id === 'bear-hide') {
    if (action.type === 'hide' && !state.hidden) { state.hidden = true; return { accepted: true, hidden: true }; }
    accepted = action.type === 'choose' && state.hidden && String(action.item) === String(state.hiding);
  } else if (state.id === 'bear-care' && action.type === 'choose') accepted = action.item === state.steps[state.progress].id;
  else if (state.id === 'flower-water' && action.type === 'water') accepted = true;
  else if (state.id === 'animal-music' && action.type === 'play') accepted = state.instruments.some(instrument=>instrument.id===action.item);
  if (accepted) { state.progress++; state.done = state.progress >= state.total; }
  return { accepted, done: state.done };
}
