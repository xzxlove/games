import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createRound, animals, careSteps } from '../dist/shared/toddler/model.js';
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
