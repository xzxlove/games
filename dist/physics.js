export function segmentHitsCircle(a, b, circle, padding = 0) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((circle.x - a.x) * dx + (circle.y - a.y) * dy) / lengthSquared));
  const x = a.x + t * dx - circle.x, y = a.y + t * dy - circle.y;
  return x * x + y * y <= (circle.r + padding) ** 2;
}
export function pointsForCut(combo) { return 10 + Math.min(5, Math.max(0, combo - 1)) * 5; }
export function bombPenalty(score, time) { return { score: Math.max(0, score - 20), time: Math.max(0, time - 3) }; }
export function launchVelocity(y, apex, gravity) { return -Math.sqrt(2 * gravity * Math.max(0, y - apex)); }
