import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as model from '../dist/games/fruit-connect/model.js';
import { FRUITS, fruitSvg } from '../dist/games/fruit-connect/art.js';

function harness({ enabled = true, supported = true } = {}) {
  const nodes = new Map(), documentEvents = new Map(), windowEvents = new Map();
  const spoken = [], pending = [], timers = new Map();
  let timer = 0, canceled = 0;
  function node(id) {
    const attributes = {}, classes = new Set(), events = new Map();
    let html = '';
    return {
      id, dataset: {}, style: { setProperty() {} }, children: [], events, textContent: '',
      classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), toggle() {} },
      setAttribute: (name, value) => { attributes[name] = value; }, getAttribute: name => attributes[name],
      get innerHTML() { return html; },
      set innerHTML(value) {
        html = value;
        if (id === 'board') this.children = [...value.matchAll(/data-index="(\d+)"/g)].map(([, index]) => {
          const tile = node(`tile-${index}`); tile.dataset.index = index; return tile;
        });
      },
      querySelector: () => element(`${id}-child`),
      contains(child) { return this.children.includes(child); },
      getBoundingClientRect: () => ({ left: 10, top: 10, width: 80, height: 80 }),
      addEventListener: (name, listener) => events.set(name, listener),
      focus() { document.activeElement = this; },
      append() {}, replaceChildren() {}, close() { this.open = false; }, showModal() { this.open = true; },
    };
  }
  function element(id) { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); }
  const document = {
    hidden: false, activeElement: element('body'), getElementById: element,
    querySelector: element, querySelectorAll: () => [], createElementNS: () => node('line'),
    addEventListener: (name, listener) => documentEvents.set(name, listener),
  };
  const context = vm.createContext({
    ...model, FRUITS, fruitSvg, document,
    window: { addEventListener: (name, listener) => windowEvents.set(name, listener) },
    performance: { now: () => 0 }, requestAnimationFrame() {}, matchMedia: () => ({ matches: true }),
    setTimeout: callback => { timers.set(++timer, callback); return timer; }, clearTimeout: id => timers.delete(id),
    registerOffline() {}, bindFullscreen() {},
    library: { read: () => ({ settings: { sound: enabled } }), setSound() {} },
    createGameSession: () => ({ start() {}, finish() {}, best: () => 0 }),
    speechSynthesis: supported ? {
      getVoices: () => [{ lang: 'zh-CN', name: '中文' }], addEventListener() {},
      cancel() { canceled++; pending.length = 0; },
      speak(utterance) { spoken.push(utterance); pending.push(utterance); },
    } : undefined,
    SpeechSynthesisUtterance: supported ? class { constructor(text) { this.text = text; } } : undefined,
  });
  // Exercise the shipped voice helper and game event handlers together.
  vm.runInContext(readFileSync(new URL('../dist/shared/toddler/audio.js', import.meta.url), 'utf8').replace('export function', 'function'), context);
  vm.runInContext(readFileSync(new URL('../dist/games/fruit-connect/game.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, ''), context);
  const run = code => vm.runInContext(code, context);
  run('round.start(); round.state.board = { rows: 2, cols: 3, cells: [0, 0, 1, 1, 2, 2] }; renderBoard();');
  return { run, element, document, documentEvents, windowEvents, spoken, pending, canceled: () => canceled,
    flush() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
  };
}

test('only a successful pair speaks its captured fruit name, including the last pair', () => {
  const game = harness();
  game.run('choose(0)'); assert.equal(game.spoken.length, 0);
  game.run('choose(2)'); assert.equal(game.spoken.length, 0, 'mismatched fruit stays silent');
  game.run('choose(0); choose(1)');
  assert.equal(game.spoken[0].text, '草莓'); assert.equal(game.spoken[0].lang, 'zh-CN');
  assert.equal(game.run('round.state.board.cells[0]'), null);
  assert.match(game.element('announcement').textContent, /消除草莓/);
  game.flush(); game.run('choose(2); choose(3)');
  assert.deepEqual(game.pending.map(utterance => utterance.text), ['橘子'], 'rapid matches replace queued speech');
  game.flush(); game.run('choose(4); choose(5)'); game.flush();
  assert.equal(game.run('round.state.status'), 'between');
  assert.deepEqual(game.pending.map(utterance => utterance.text), ['雪梨'], 'result modal must not cut off the last name');
});

test('muting, pausing, help, restarting and leaving the page stop narration', () => {
  for (const action of ['mute', 'pause', 'help', 'restart', 'hidden', 'pagehide']) {
    const game = harness(); game.run('choose(0); choose(1)'); game.flush();
    const before = game.canceled();
    if (action === 'mute') game.element('sound').events.get('click')();
    if (action === 'pause') game.run('pause()');
    if (action === 'help') game.run('help()');
    if (action === 'restart') game.run('resetReady()');
    if (action === 'hidden') { game.document.hidden = true; game.documentEvents.get('visibilitychange')(); }
    if (action === 'pagehide') game.windowEvents.get('pagehide')();
    assert.ok(game.canceled() > before, action); assert.equal(game.pending.length, 0, action);
  }
  const muted = harness({ enabled: false }); muted.run('choose(0); choose(1)');
  assert.equal(muted.spoken.length, 0); assert.equal(muted.run('round.state.score'), 100);
});

test('unavailable speech never blocks a match or removes its text announcement', () => {
  const game = harness({ supported: false });
  assert.doesNotThrow(() => game.run('choose(0); choose(1)'));
  assert.equal(game.run('round.state.score'), 100);
  assert.match(game.element('announcement').textContent, /消除草莓/);
  assert.match(game.element('toast').textContent, /中文语音/);
});
