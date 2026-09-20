import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createRound, nextRound, animals, careSteps, shapes, colors, pictures } from '../dist/shared/toddler/model.js';
import { createProgression } from '../dist/shared/toddler/progression.js';
import { drawing, puzzleArt } from '../dist/shared/toddler/art.js';
import { activities, toddlerGames } from '../dist/shared/toddler/catalog.js';

test('all eight activities can finish in both modes; repeated actions cannot add progress', () => {
  for (const activity of activities) for (const mode of ['gentle', 'curious']) {
    const state = createRound(activity.id, mode, () => .4);
    if (state.items.length) for (const item of state.items) {
      const before = state.progress;
      assert.equal(act(state, { type:'place', item:item.id, target:'wrong' }).accepted, false);
      assert.equal(state.progress, before);
      assert.equal(act(state, { type:'place', item:item.id, target:item.target }).accepted, true);
      assert.equal(act(state, { type:'place', item:item.id, target:item.target }).accepted, false);
    }
    else if (activity.id === 'animal-sounds') for (const question of state.questions) {
      assert.equal(new Set(question.choices.map(a => a.id)).size, state.count);
      assert.equal(question.choices.filter(a => a.id === question.target.id).length, 1);
      assert.equal(act(state, {type:'choose',item:animals.find(a=>a.id!==question.target.id).id}).accepted, false);
      act(state, {type:'choose',item:question.target.id});
    }
    else if (activity.id === 'bear-hide') {
      assert.equal(act(state,{type:'choose',item:String(state.hiding)}).accepted,false);
      assert.equal(act(state,{type:'hide'}).hidden,true);
      assert.equal(state.progress,0);
      assert.equal(act(state,{type:'choose',item:String((state.hiding+1)%state.count)}).accepted,false);
      act(state,{type:'choose',item:String(state.hiding)});
    }
    else if (activity.id === 'bear-care') {
      assert.equal(act(state,{type:'choose',item:'blanket'}).accepted,false);
      for (const step of careSteps) act(state,{type:'choose',item:step.id});
    }
    else if (activity.id === 'flower-water') for (let i=0;i<3;i++) act(state,{type:'water'});
    else for (let i=0;i<state.total;i++) act(state,{type:'play',item:'drum'});
    assert.equal(state.done,true,`${activity.id} ${mode}`);
    const completed = structuredClone(state);
    assert.equal(act(state,{type:'water'}).accepted,false);
    assert.deepEqual(state,completed);
  }
});

test('generated rounds remain solvable across randomized layouts', () => {
  for (let attempt=0;attempt<100;attempt++) for (const mode of ['gentle','curious']) {
    for (const id of ['shape-home','color-sort','little-puzzle']) {
      const state=createRound(id,mode);
      assert.equal(new Set(state.items.map(item=>item.id)).size,state.total);
      assert.equal(state.total,id === 'color-sort' ? state.count*2 : id === 'little-puzzle' ? mode === 'gentle' ? 2 : 4 : state.count);
      for (const item of state.items) assert.equal(act(state,{type:'place',item:item.id,target:item.target}).accepted,true);
      assert.equal(state.done,true);
    }
    const bear=createRound('bear-hide',mode);
    assert.ok(bear.hiding>=0 && bear.hiding<bear.count);
  }
});

test('invalid and out-of-order actions cannot complete an activity', () => {
  for (const activity of activities) {
    const state=createRound(activity.id), before=structuredClone(state);
    for (const action of [{type:'unknown'}, {type:'place',item:'missing',target:'circle'}, {type:'choose',item:'missing'}, {type:'play',item:'missing'}]) {
      assert.equal(act(state,action).accepted,false);
    }
    assert.deepEqual(state,before);
  }
  assert.equal(toddlerGames.length,8);
  assert.ok(toddlerGames.every(game=>game.recordKind==='activity' && game.modes.some(mode=>mode.id==='gentle')));
});

function complete(state) {
  if (state.items.length) for (const item of state.items) act(state,{type:'place',item:item.id,target:item.target});
  else if (state.id==='animal-sounds') for (const question of state.questions) act(state,{type:'choose',item:question.target.id});
  else if (state.id==='bear-hide') { act(state,{type:'hide'}); act(state,{type:'choose',item:String(state.hiding)}); }
  else if (state.id==='bear-care') for (const step of state.steps) act(state,{type:'choose',item:step.id});
  else if (state.id==='flower-water') for (let i=0;i<state.total;i++) act(state,{type:'water'});
  else for (let i=0;i<state.total;i++) act(state,{type:'play',item:state.instruments[i%state.instruments.length].id});
  assert.equal(state.done,true,`${state.id}: stage ${state.stage}`);
}

test('all activities have 30 consecutive solvable stages without changing the chosen difficulty', () => {
  for (const activity of activities) for (const mode of ['gentle','curious']) {
    let state=createRound(activity.id,mode,()=>.4);
    for (let stage=1;stage<=30;stage++) {
      assert.equal(state.stage,stage);
      assert.equal(state.mode,mode);
      assert.equal(state.count,mode==='gentle'?2:3);
      assert.throws(()=>nextRound(state));
      for (const question of state.questions||[]) {
        assert.equal(question.choices.length,state.count);
        assert.equal(new Set(question.choices.map(a=>a.id)).size,state.count);
        assert.ok(question.choices.some(a=>a.id===question.target.id));
      }
      for (const item of state.items) if (state.id!=='little-puzzle') assert.ok(state.targets.some(target=>target.id===item.target));
      complete(state);
      const before=structuredClone(state), next=nextRound(state,()=>.4);
      assert.deepEqual(state,before);
      assert.equal(next.progress,0);
      assert.equal(next.done,false);
      assert.notEqual(next.stageTitle,state.stageTitle);
      if (state.id==='bear-hide') assert.notEqual(next.hiding,state.hiding);
      state=next;
    }
  }
});

test('later stages introduce all nine shapes, six colors and eight puzzle pictures', () => {
  for (const [id,content,key] of [['shape-home',shapes,'targets'],['color-sort',colors,'targets'],['little-puzzle',pictures,'picture']]) {
    const seen=new Set();
    for (let stage=1;stage<=9;stage++) {
      const state=createRound(id,'gentle',()=>.5,stage);
      for (const entry of Array.isArray(state[key])?state[key]:[state[key]]) seen.add(entry.id);
    }
    assert.deepEqual([...seen].sort(),content.map(entry=>entry.id).sort());
  }
  assert.equal(new Set(shapes.map(shape=>drawing(shape.id,shape.color))).size,9);
  assert.equal(new Set(pictures.map(picture=>puzzleArt(0,2,picture.id))).size,8);
});

test('stage progress survives reopening, isolates game and mode, and does not advance incomplete rounds', () => {
  const values=new Map(), storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const progress=createProgression(storage);
  const first=createRound('shape-home');
  progress.complete(first);
  assert.equal(progress.current('shape-home','gentle'),1);
  complete(first); progress.complete(first); progress.complete(first);
  assert.equal(createProgression(storage).current('shape-home','gentle'),2);
  assert.equal(progress.current('shape-home','curious'),1);
  assert.equal(progress.current('color-sort','gentle'),1);
  progress.selectMode('shape-home','curious');
  assert.equal(createProgression(storage).mode('shape-home'),'curious');
  assert.equal(progress.mode('color-sort'),'gentle');
  const second=nextRound(first); complete(second); progress.complete(second);
  progress.complete(first);
  assert.equal(progress.current('shape-home','gentle'),3);
});

test('blocked, missing, malformed or full storage cannot break continuing to the next stage', () => {
  const first=createRound('shape-home'); complete(first);
  for (const storage of [undefined,{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}, {getItem(){return '{}';},setItem(){throw Error('full');}}]) {
    const progress=createProgression(storage); progress.complete(first);
    assert.equal(progress.current('shape-home','gentle'),2);
  }
  for (const raw of ['oops','null','[]','{"shape-home:gentle":-2}','{"shape-home:gentle":"100"}']) {
    assert.equal(createProgression({getItem:()=>raw}).current('shape-home','gentle'),1);
  }
});
