import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fruitCatalog, fruitKinds } from '../dist/games/fruit-slice/fruit-catalog.js';
import { VICTORY_SECONDS, createVictoryFruit, sliceVictoryFruit } from '../dist/games/fruit-slice/victory.js';
import * as physics from '../dist/games/fruit-slice/physics.js';

test('victory fruit survives repeated passes and rewards deliberate cuts with capped points', () => {
  const fruit = createVictoryFruit(0, 0, 70);
  let total = 0;
  for (let i = 0; i < 100; i++) {
    const side = i % 2 ? -1 : 1;
    const points = sliceVictoryFruit(fruit, { x: -120 * side, y: 0 }, { x: 120 * side, y: 0 }, i * .1);
    assert.equal(points, 20 + Math.min(6, Math.floor(i / 5)) * 5);
    total += points;
  }
  assert.equal(fruit.hits, 100);
  assert.equal(fruit.points, total);
  assert.equal(fruit.r, 70);
});

test('pointer event frequency, holding still and misses cannot inflate victory points', () => {
  const fruit = createVictoryFruit(0, 0, 70);
  assert.equal(sliceVictoryFruit(fruit, { x: -100, y: 0 }, { x: -50, y: 0 }, 1), 20);
  for (let x = -50; x < 100; x += 5) sliceVictoryFruit(fruit, { x, y: 0 }, { x: x + 5, y: 0 }, 1.2);
  assert.equal(fruit.hits, 1, 'one continuous pass has one award');
  for (let i = 0; i < 50; i++) {
    assert.equal(sliceVictoryFruit(fruit, { x: 0, y: 0 }, { x: 0, y: 0 }, 2), 0);
    assert.equal(sliceVictoryFruit(fruit, { x: -100, y: 100 }, { x: 100, y: 100 }, 2), 0);
  }
  assert.equal(sliceVictoryFruit(fruit, { x: 100, y: 0 }, { x: -100, y: 0 }, 3), 20);
  assert.equal(sliceVictoryFruit(fruit, { x: -100, y: 0 }, { x: 100, y: 0 }, 3.01), 0, 'coalesced duplicate events respect cooldown');
});

test('reversing across the fruit works without lifting the pointer or leaving its edge', () => {
  const fruit = createVictoryFruit(0, 0, 100);
  assert.equal(sliceVictoryFruit(fruit, { x: -60, y: 0 }, { x: 60, y: 0 }, 1), 20);
  assert.equal(sliceVictoryFruit(fruit, { x: 60, y: 0 }, { x: 55, y: 0 }, 1.1), 0);
  assert.equal(sliceVictoryFruit(fruit, { x: 55, y: 0 }, { x: -60, y: 0 }, 1.2), 20);
  assert.equal(fruit.hits, 2);
});

function gameHarness() {
  const elements = new Map(), saved = [], documentEvents = new Map();
  const draw = new Proxy({}, { get: (_target, key) => key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set(), events = new Map();
      elements.set(id, {
        id, hidden: false, dataset: {}, style: {}, textContent: '', innerHTML: '', tagName: 'DIV', events,
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, enabled) => enabled ? classes.add(c) : classes.delete(c) },
        getBoundingClientRect: () => ({ x: 0, y: 0, left: 0, top: 0, width: 1024, height: 768 }),
        setAttribute() {}, addEventListener: (name, fn) => events.set(name, fn),
        focus() { document.activeElement = this; }, getContext: () => draw,
      });
    }
    return elements.get(id);
  }
  const html = readFileSync(new URL('../dist/games/fruit-slice/index.html', import.meta.url), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const document = {
    activeElement: element('arena'), hidden: false,
    getElementById(id) { assert.ok(ids.has(id), `missing HTML element: ${id}`); return element(id); },
    querySelector: element, querySelectorAll: () => [], addEventListener: (name, fn) => documentEvents.set(name, fn),
  };
  let started = 0;
  const context = vm.createContext({
    ...physics, fruitCatalog, fruitKinds, VICTORY_SECONDS, createVictoryFruit, sliceVictoryFruit,
    document, window: { addEventListener() {} }, devicePixelRatio: 1,
    matchMedia: () => ({ matches: true }), ResizeObserver: class { observe() {} },
    localStorage: { setItem() {}, getItem() { return null; } }, performance: { now: () => 0 },
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame() {},
    makeSprite() {}, registerOffline() {}, bindFullscreen() {},
    createGameSession: () => ({ start() { started++; }, best: () => 0, finish: result => saved.push(result) }),
    library: { read: () => ({ settings: { sound: false } }), setSound() {} },
  });
  const source = readFileSync(new URL('../dist/games/fruit-slice/game.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInContext(source, context);
  return { run: code => vm.runInContext(code, context), element, saved, document, documentEvents, started: () => started };
}

test('the classic timer enters a ten-second bonus, then saves the combined score exactly once', () => {
  const game = gameHarness();
  game.run('startGame(); score = 120; timeLeft = .01; update(.02)');
  assert.equal(game.run('state'), 'playing');
  assert.equal(game.run('victoryTimeLeft'), 10);
  assert.equal(game.run('fruits.length'), 0);
  assert.equal(game.saved.length, 0);
  assert.equal(game.element('victory-banner').hidden, false);
  game.run('cutBetween({x: victory.x - 160, y: victory.y}, {x: victory.x + 160, y: victory.y})');
  game.run('update(.1); cutBetween({x: victory.x + 160, y: victory.y}, {x: victory.x - 160, y: victory.y})');
  assert.equal(game.run('score'), 160);
  game.run('update(9.9); finish()');
  assert.equal(game.run('state'), 'result');
  assert.equal(game.saved.length, 1);
  assert.equal(game.saved[0].score, 160);
  assert.equal(game.element('result-bonus').textContent, '胜利果实 2 刀 · 额外 +40 分');
});

test('bomb timeout also enters the bonus and clears remaining bombs', () => {
  const game = gameHarness();
  game.run("startGame(); score = 30; timeLeft = 2; fruits = [{ x: 500, y: 350, r: 40, type: 'bomb' }]; cutBetween({x: 430, y: 350}, {x: 570, y: 350})");
  assert.equal(game.run('score'), 10);
  assert.equal(game.run('victoryTimeLeft'), 10);
  assert.equal(game.run('fruits.length'), 0);
  assert.equal(game.saved.length, 0);
});

test('bonus pause, hidden tab, restart and zen mode keep independent lifecycle state', () => {
  const game = gameHarness();
  game.run('startGame(); timeLeft = 0; update(.01); pause(); frame(5000); cutBetween({x:0,y:400},{x:1024,y:400})');
  assert.equal(game.run('victoryTimeLeft'), 10);
  assert.equal(game.run('score'), 0);
  game.run('resume(); frame(100)');
  assert.ok(Math.abs(game.run('victoryTimeLeft') - 9.9) < 1e-9);
  game.document.hidden = true;
  game.documentEvents.get('visibilitychange')();
  game.run('frame(10000)');
  assert.equal(game.run('state'), 'paused');
  assert.ok(Math.abs(game.run('victoryTimeLeft') - 9.9) < 1e-9);
  game.run('startGame()');
  assert.equal(game.run('victory'), null);
  assert.equal(game.run('timeLeft'), 60);
  assert.equal(game.element('victory-banner').hidden, true);
  game.run("mode = 'zen'; startGame(); update(80)");
  assert.equal(game.run('victory'), null);
  assert.equal(game.run('state'), 'playing');
  assert.equal(game.saved.length, 0);
});

test('all twelve fruits participate in the shuffled bag with finite spawn geometry', () => {
  const game = gameHarness();
  assert.equal(fruitKinds.length, 12);
  const drawn = game.run('Array.from({length: 12}, () => nextFruitKind())');
  assert.deepEqual([...drawn].sort(), [...fruitKinds].sort());
  game.run('startGame(); for (let i=0; i<8; i++) spawnWave()');
  assert.equal(game.run('fruits.every(fruit => Number.isFinite(fruit.r) && Number.isFinite(fruit.vx) && Number.isFinite(fruit.vy))'), true);
});
