import { segmentHitsCircle } from './physics.js';

export const VICTORY_SECONDS = 10;

export function createVictoryFruit(x, y, r) {
  return { x, y, r, fruitKind: 'victory', hits: 0, points: 0, armed: true, lastHitAt: -Infinity, direction: null, travel: 0 };
}

// Count deliberate passes or reversals, not every pointer event inside the fruit.
// Using game time also freezes the hit cooldown while the game is paused.
export function sliceVictoryFruit(fruit, a, b, now) {
  const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
  if (distance < 2) return 0;
  fruit.travel += distance;
  const direction = { x: dx / distance, y: dy / distance };
  const reversed = fruit.direction && direction.x * fruit.direction.x + direction.y * fruit.direction.y < -.35 && fruit.travel >= fruit.r * .55;
  const intersects = segmentHitsCircle(a, b, { ...fruit, r: fruit.r * .91 }, 4);
  let points = 0;
  if (intersects && (fruit.armed || reversed) && now - fruit.lastHitAt >= .075) {
    fruit.hits++;
    points = 20 + Math.min(6, Math.floor((fruit.hits - 1) / 5)) * 5;
    fruit.points += points;
    fruit.armed = false;
    fruit.lastHitAt = now;
    fruit.direction = direction;
    fruit.travel = 0;
  }
  if (!intersects || Math.hypot(b.x - fruit.x, b.y - fruit.y) > fruit.r + 4) fruit.armed = true;
  return points;
}
