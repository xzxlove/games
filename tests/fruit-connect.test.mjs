import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, createRound, findPath, findMatch, shuffleBoard, LEVELS } from '../dist/games/fruit-connect/model.js';

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const board = rows => ({ rows: rows.length, cols: rows[0].length, cells: rows.flat() });

// Independent direction-state search to check the path enumerator against.
function oracle(b, a, z) {
  if (a === z || b.cells[a] == null || b.cells[a] !== b.cells[z]) return false;
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]], queue = [], visited = new Set();
  for (let d = 0; d < 4; d++) queue.push([Math.floor(a / b.cols), a % b.cols, d, 0]);
  for (let head = 0; head < queue.length; head++) {
    const [r, c, previous, turns] = queue[head];
    for (let d = 0; d < 4; d++) {
      const nextTurns = turns + (d === previous ? 0 : 1);
      if (nextTurns > 2) continue;
      const nr = r + directions[d][0], nc = c + directions[d][1];
      if (nr < -1 || nc < -1 || nr > b.rows || nc > b.cols) continue;
      if (nr === Math.floor(z / b.cols) && nc === z % b.cols) return true;
      if (nr >= 0 && nr < b.rows && nc >= 0 && nc < b.cols && b.cells[nr * b.cols + nc] != null) continue;
      const key = `${nr},${nc},${d},${nextTurns}`;
      if (!visited.has(key)) { visited.add(key); queue.push([nr, nc, d, nextTurns]); }
    }
  }
  return false;
}

test('straight, one-turn, two-turn and outside paths obey the same rules', () => {
  assert.equal(findPath(board([[1, 1]]), 0, 1).length, 2);
  assert.equal(findPath(board([[1, null], [2, 1]]), 0, 3).length, 3);
  const outer = findPath(board([[1, 2, 1], [2, 2, 2]]), 0, 2);
  assert.equal(outer.length, 4);
  assert.ok(outer.some(p => p.r === -1));
  assert.equal(findPath(board([[2, 2, 2, 2], [2, 1, 2, 1], [2, 2, 2, 2]]), 5, 7), null);
  assert.equal(findPath(board([[1, 2]]), 0, 1), null);
  assert.equal(findPath(board([[1, 1]]), 0, 0), null);
  assert.equal(findPath(board([[null, null]]), 0, 1), null);
});

test('path results agree with an independent search on 150 random boards', () => {
  const rng = random(76);
  for (let run = 0; run < 150; run++) {
    const b = { rows: 4, cols: 5, cells: Array.from({ length: 20 }, () => rng() < .35 ? null : Math.floor(rng() * 3)) };
    for (let a = 0; a < 20; a++) for (let z = a + 1; z < 20; z++) {
      const path = findPath(b, a, z);
      assert.equal(Boolean(path), oracle(b, a, z), JSON.stringify({ b, a, z, path }));
      if (path) {
        assert.ok(path.length <= 4);
        assert.ok(path.every(p => p.r >= -1 && p.r <= b.rows && p.c >= -1 && p.c <= b.cols));
      }
    }
  }
});

function clearBoard(b) {
  let count = 0;
  while (b.cells.some(value => value != null)) {
    const pair = findMatch(b);
    assert.ok(pair, 'generated board must have a complete removal sequence');
    b.cells[pair.first] = b.cells[pair.second] = null; count++;
  }
  return count;
}

test('all three board sizes are paired and completely solvable across seeds', () => {
  for (let level = 0; level < LEVELS.length; level++) for (let seed = 1; seed <= 25; seed++) {
    const b = createBoard(level, random(seed));
    assert.equal(b.cells.length, LEVELS[level].rows * LEVELS[level].cols);
    assert.equal(clearBoard(b), b.cells.length / 2);
  }
});

test('shuffle preserves holes and fruit counts while restoring a solvable board', () => {
  const b = createBoard(2, random(12));
  for (let i = 0; i < 11; i++) {
    const pair = findMatch(b); b.cells[pair.first] = b.cells[pair.second] = null;
  }
  const original = [...b.cells], result = shuffleBoard(b, random(123));
  assert.deepEqual(b.cells, original);
  assert.deepEqual(result.cells.map(x => x == null), original.map(x => x == null));
  assert.deepEqual(result.cells.filter(x => x != null).sort(), original.filter(x => x != null).sort());
  clearBoard(result);
  const deadlocked = board([[0, 1, 2, 3], [1, 0, 3, 2]]);
  assert.equal(findMatch(deadlocked), null);
  clearBoard(shuffleBoard(deadlocked, () => .999999));
});

test('time only advances in play, expiry is final, zen is untimed', () => {
  const round = createRound('classic', random(1));
  round.tick(20); assert.equal(round.state.seconds, 180);
  assert.equal(round.match(0, 1), null); assert.equal(round.hint(), null);
  round.start(); round.tick(5.5); assert.equal(round.state.seconds, 174.5);
  round.pause(); round.tick(100); assert.equal(round.state.elapsed, 5.5);
  assert.equal(round.shuffle(), false); round.resume(); round.tick(300);
  assert.equal(round.state.seconds, 0); assert.equal(round.state.elapsed, 180); assert.equal(round.state.status, 'lost');
  assert.equal(round.next(), false); assert.equal(round.match(0, 1), null);
  const zen = createRound('zen', random(4)); zen.start(); zen.tick(5000);
  assert.equal(zen.state.status, 'playing'); assert.equal(zen.state.seconds, 180); assert.equal(zen.state.elapsed, 5000);
});

test('hints and manual shuffles are limited, automatic recovery is free', () => {
  const round = createRound('zen', random(9)); round.start();
  for (let i = 0; i < 3; i++) { assert.ok(round.hint()); assert.ok(round.shuffle()); }
  assert.equal(round.hint(), null); assert.equal(round.shuffle(), false);
  assert.ok(round.shuffle(true)); assert.equal(round.state.shuffles, 0);
  clearBoard({ ...round.state.board, cells: [...round.state.board.cells] });
});

test('three complete levels lead to one victory, with combo and resource resets', () => {
  const round = createRound('classic', random(90)); round.start();
  let expectedPairs = 0;
  for (let level = 0; level < 3; level++) {
    round.tick(5);
    while (round.state.status === 'playing') {
      const pair = findMatch(round.state.board);
      const result = round.match(pair.first, pair.second);
      assert.ok(result); expectedPairs++;
      assert.equal(round.match(pair.first, pair.second), null, 'removed tiles never score twice');
      round.tick(.5);
    }
    const score = round.state.score;
    round.tick(200); assert.equal(round.state.score, score);
    if (level < 2) {
      assert.equal(round.state.status, 'between'); assert.ok(round.next());
      assert.equal(round.state.hints, 3); assert.equal(round.state.shuffles, 3); assert.equal(round.state.combo, 0);
    }
  }
  assert.equal(round.state.status, 'won'); assert.equal(round.state.matched, expectedPairs);
  assert.equal(expectedPairs, 84); assert.ok(round.state.bestCombo > 1); assert.equal(round.next(), false);
});

test('combos expire after five active seconds, pause does not break them', () => {
  const round = createRound('zen', random(5)); round.start();
  const match = () => { const pair = findMatch(round.state.board); return round.match(pair.first, pair.second); };
  assert.equal(match().points, 100); round.tick(1); assert.equal(match().points, 120);
  round.pause(); round.tick(20); round.resume(); assert.equal(match().points, 140);
  round.tick(5.1); assert.equal(round.state.combo, 0); assert.equal(match().points, 100);
});
