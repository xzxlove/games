export const shapes = [{ id: 'circle', name: '圆形', color: '#dc8964' }, { id: 'square', name: '方形', color: '#7799bd' }, { id: 'triangle', name: '三角形', color: '#d6b652' }];
export const colors = [{ id: 'red', name: '红色', color: '#de8176' }, { id: 'blue', name: '蓝色', color: '#729aba' }, { id: 'yellow', name: '黄色', color: '#d8b34e' }];
export const animals = [{ id: 'cat', name: '小猫', sound: '喵，喵，喵' }, { id: 'dog', name: '小狗', sound: '汪，汪，汪' }, { id: 'duck', name: '小鸭', sound: '嘎，嘎，嘎' }, { id: 'cow', name: '奶牛', sound: '哞，哞' }];
export const careSteps = [{ id: 'food', name: '小点心', prompt: '小熊饿了，喂它吃点心吧' }, { id: 'cloth', name: '小毛巾', prompt: '吃饱啦，帮小熊擦擦脸吧' }, { id: 'blanket', name: '小被子', prompt: '小熊困了，给它盖被子吧' }];
export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function createRound(id, mode = 'gentle', random = Math.random) {
  const count = mode === 'curious' ? 3 : 2;
  const state = { id, mode, count, items: [], placed: [], progress: 0, total: 1, done: false };
  if (id === 'shape-home') state.items = shuffled(shapes.slice(0, count), random).map(item => ({ ...item, target: item.id }));
  if (id === 'color-sort') state.items = shuffled(colors.slice(0, count).flatMap(item => [0, 1].map(n => ({ ...item, id: `${item.id}-${n}`, target: item.id }))), random);
  if (id === 'little-puzzle') state.items = shuffled(Array.from({ length: count === 2 ? 2 : 4 }, (_, i) => ({ id: String(i), target: String(i), name: `第${i + 1}块图片` })), random);
  if (state.items.length) state.total = state.items.length;
  if (id === 'animal-sounds') {
    state.questions = shuffled(animals, random).slice(0, 3).map(target => ({ target, choices: shuffled([target, ...shuffled(animals.filter(a => a.id !== target.id), random).slice(0, count - 1)], random) }));
    state.total = 3;
  }
  if (id === 'bear-hide') { state.hiding = Math.floor(random() * count); state.hidden = false; }
  if (id === 'bear-care' || id === 'flower-water') state.total = 3;
  if (id === 'animal-music') state.total = mode === 'curious' ? 12 : 8;
  return state;
}
// All successful actions pass here, so drag, tap and keyboard share the same rules.
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
    accepted = action.type === 'choose' && state.hidden && Number(action.item) === state.hiding;
  } else if (state.id === 'bear-care' && action.type === 'choose') accepted = action.item === careSteps[state.progress].id;
  else if (state.id === 'flower-water' && action.type === 'water') accepted = true;
  else if (state.id === 'animal-music' && action.type === 'play') accepted = ['drum', 'bell', 'piano', 'cat', 'dog', 'duck'].includes(action.item);
  if (accepted) { state.progress++; state.done = state.progress >= state.total; }
  return { accepted, done: state.done };
}
