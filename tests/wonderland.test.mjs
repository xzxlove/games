import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync, readFileSync } from 'node:fs';
import { topics, poolFor, choicesFor, sanitizeSettings, speechFor } from '../dist/games/tiny-wonderland/content.js';
import { createRound, interact, choose, nextStep, resetStep, PlayClock } from '../dist/games/tiny-wonderland/session.js';
import { allSpeech, audioKey } from '../dist/games/tiny-wonderland/speech.js';
import { audioFiles } from '../dist/games/tiny-wonderland/audio-map.js';
const gentle = sanitizeSettings();
const curious = sanitizeSettings({level:'curious'});

test('all eight topics have distinct playable content; alphabet covers A to Z',()=>{
  assert.equal(topics.length,8);
  assert.equal(new Set(topics.map(topic=>topic.id)).size,8);
  for(const topic of topics){
    assert.ok(topic.items.length>=3);
    assert.equal(new Set(topic.items.map(item=>item.id)).size,topic.items.length);
    for(const item of topic.items) for(const key of ['zh','en','phrase','englishPhrase','art']) assert.ok(item[key],`${topic.id}/${item.id} has ${key}`);
  }
  assert.equal(topics.find(topic=>topic.id==='letters').items.map(item=>item.letter).join(''),'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.deepEqual(poolFor(topics[0],gentle).map(item=>item.value),[1,2,3]);
  assert.equal(poolFor(topics[0],curious).length,10);
});
test('choices always contain the target exactly once and honor the parent difficulty',()=>{
  for(const topic of topics)for(const settings of [gentle,curious])for(const target of poolFor(topic,settings)){
    const choices=choicesFor(poolFor(topic,settings),target,settings.level);
    assert.equal(choices.length,settings.level==='gentle'?2:3);
    assert.equal(choices.filter(item=>item.id===target.id).length,1);
    assert.equal(new Set(choices.map(item=>item.id)).size,choices.length);
  }
});
test('number activity requires one tap per object and repeated taps do not overcount',()=>{
  const round=createRound(topics[0],gentle,2);
  assert.equal(interact(round),false); assert.equal(round.count,1);
  assert.equal(interact(round),false); assert.equal(round.count,2);
  assert.equal(interact(round),true); assert.equal(round.count,3);
  assert.equal(interact(round),false); assert.equal(round.count,3); assert.equal(round.discoveries,1);
});
test('wrong answers remain playable; correct answers complete only once',()=>{
  const round=createRound(topics[1],gentle,0,'find');
  assert.equal(choose(round,'not-an-option'),'ignored');
  assert.equal(choose(round,round.choices.find(item=>item.id!==round.item.id).id),'retry');
  assert.equal(round.discoveries,0); assert.equal(round.completed,false);
  assert.equal(choose(round,round.item.id),'found');
  assert.equal(choose(round,round.item.id),'ignored'); assert.equal(round.discoveries,1);
});
test('skipping does not invent a discovery and five discoveries reach a natural ending',()=>{
  const round=createRound(topics[1],gentle);
  assert.equal(nextStep(round),true); assert.equal(round.discoveries,0);
  for(let i=0;i<5;i++) { interact(round); assert.equal(nextStep(round),i<4); }
  assert.equal(round.discoveries,5);
});
test('talk mode accepts participation without speech recognition and mode resets clear transient state',()=>{
  const round=createRound(topics[0],gentle,2,'talk');
  assert.equal(interact(round),true); assert.equal(round.discoveries,1);
  round.mode='listen'; resetStep(round);
  assert.equal(round.count,0); assert.equal(round.completed,false); assert.equal(round.discoveries,1);
});
test('active play clock excludes pauses, settings dialogs and time in background',()=>{
  let now=0;const clock=new PlayClock(()=>now);
  clock.resume(); now=500; assert.equal(clock.tick(),500);
  clock.resume(); now=1000;clock.pause(); assert.equal(clock.elapsed,1000);
  now=90000; assert.equal(clock.tick(),1000); clock.pause(); assert.equal(clock.elapsed,1000);
  clock.resume();now=92000; assert.equal(clock.tick(),3000);
});
test('invalid saved settings return safe working defaults',()=>{
  assert.deepEqual(sanitizeSettings(null),gentle);
  assert.deepEqual(sanitizeSettings({language:'xx',level:'bad',minutes:Infinity}),gentle);
  assert.equal(sanitizeSettings({sound:false,motion:false}).sound,false);
});
test('ABC letter and word narration uses English even with Chinese navigation',()=>{
  const topic=topics.find(topic=>topic.id==='letters');
  assert.deepEqual(speechFor(topic,topic.items[0],'zh','letter'),{text:'A',language:'en'});
  assert.equal(speechFor(topic,topic.items[0],'zh','phrase').language,'en');
});
test('every shipped prompt has a nonempty local MPEG-4 audio resource',()=>{
  const clips=allSpeech(); assert.equal(Object.keys(audioFiles).length,clips.size);
  for(const [key,clip]of clips){
    assert.equal(audioKey(clip.text,clip.language),key);
    const filename=audioFiles[key];assert.ok(filename,`missing audio: ${clip.text}`);
    const file=new URL(`../dist/games/tiny-wonderland/assets/audio/${filename}`,import.meta.url);
    assert.ok(statSync(file).size>700,`empty audio: ${clip.text}`);
    assert.equal(readFileSync(file).toString('ascii',4,8),'ftyp');
  }
});
