import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentHitsCircle, pointsForCut, bombPenalty, launchVelocity } from '../dist/games/fruit-slice/physics.js';

test('a fast swipe hits a fruit even when both sampled endpoints are outside it', () => {
  assert.equal(segmentHitsCircle({ x: 0, y: 100 }, { x: 1000, y: 100 }, { x: 500, y: 100, r: 35 }), true);
  assert.equal(segmentHitsCircle({ x: 0, y: 140 }, { x: 1000, y: 140 }, { x: 500, y: 100, r: 35 }), false);
});
test('collision uses finite segments and handles zero length without division by zero', () => {
  assert.equal(segmentHitsCircle({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 50, y: 0, r: 10 }), false);
  assert.equal(segmentHitsCircle({ x: 50, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 0, r: 10 }), true);
});
test('bombs cannot create negative scores or remaining time', () => {
  assert.deepEqual(bombPenalty(5, 2), { score: 0, time: 0 });
  assert.deepEqual(bombPenalty(120, 40), { score: 100, time: 37 });
});
test('combo rewards rise then cap without an unbounded multiplier', () => {
  assert.equal(pointsForCut(1), 10); assert.equal(pointsForCut(3), 20);
  assert.equal(pointsForCut(6), 35); assert.equal(pointsForCut(100), 35);
});
test('fruit launches reach a tappable apex on portrait and landscape screens', () => {
  for (const height of [390, 768, 1024, 1366]) {
    const gravity = Math.max(700, height * 1.55), y = height + 50, apex = height * .35;
    const vy = launchVelocity(y, apex, gravity);
    assert.ok(vy < 0);
    assert.ok(Math.abs(y - vy * vy / (2 * gravity) - apex) < 1e-8);
  }
});
