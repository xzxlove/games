import { topics, speechFor, talkPrompt } from './content.js';

export const lines = {
  welcome: ['你好，小宝贝。选一个小世界，一起玩吧。', 'Hello, little friend. Choose a little world to explore.'],
  again: ['我们一起再找找。', "Let's look together."],
  found: ['找到啦！', 'You found it!'],
  done: ['今天的小发现完成啦。和爸爸妈妈一起，去生活里找找吧。', 'Our little adventure is complete. Go explore together with your family.'],
  rest: ['小世界要休息啦。我们也休息一下吧。', 'Time for a little break. See you soon.'],
  full: ['苹果装好啦。小火车，出发！', 'All aboard! Let us go!'],
  fed: ['小熊吃到了，谢谢你。', 'Yummy! Thank you.'],
  placed: ['积木找到家啦。', 'The block is home.'],
  parent: ['轮到你啦。可以说一说，也可以指一指。', 'Your turn. You can say it, or point to it.'],
  hear: ['点一点，听听它的名字。', 'Tap and listen to its name.'],
};
export const line = (id, language) => ({ text: lines[id][language === 'en' ? 1 : 0], language });
export function audioKey(text, language) {
  let value = 2166136261;
  for (const char of `${language}:${text}`) { value ^= char.codePointAt(0); value = Math.imul(value,16777619); }
  return (value >>> 0).toString(16).padStart(8,'0');
}
export function allSpeech() {
  const entries = new Map();
  const add = clip => entries.set(audioKey(clip.text,clip.language),clip);
  for (const language of ['zh','en']) {
    Object.keys(lines).forEach(id => add(line(id,language)));
    for (const topic of topics) {
      add({ text: language === 'en' ? topic.en : topic.name, language });
      add({ text: talkPrompt(topic,language), language });
      for (const entry of topic.items) for (const kind of ['name','phrase','find','letter']) add(speechFor(topic,entry,language,kind));
    }
  }
  return entries;
}
