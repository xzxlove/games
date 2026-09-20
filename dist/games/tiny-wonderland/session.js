import { poolFor, choicesFor } from './content.js';

export class PlayClock {
  constructor(now = () => performance.now()) { this.now = now; this.elapsed = 0; this.last = null; }
  resume() { if (this.last === null) this.last = this.now(); }
  pause() { this.tick(); this.last = null; }
  tick() { if (this.last !== null) { const time = this.now(); this.elapsed += Math.max(0,time-this.last); this.last = time; } return this.elapsed; }
}

export function createRound(topic, settings, cursor = 0, mode = 'listen') {
  const pool = poolFor(topic,settings);
  const round = { topic, settings: {...settings}, pool, cursor: cursor % pool.length, mode, discoveries: 0, completed: false, steps: 0, count: 0, feedback: '', choices: [] };
  resetStep(round);
  return round;
}
export function resetStep(round) {
  round.item = round.pool[round.cursor]; round.completed = false; round.count = 0; round.feedback = ''; round.hidden = false; round.fed = false;
  round.choices = choicesFor(round.pool,round.item,round.settings.level);
}
export function completeStep(round) {
  if (round.completed) return false;
  round.completed = true; round.discoveries++; return true;
}
export function interact(round) {
  if (round.completed) return false;
  if (round.topic.id === 'numbers' && round.mode === 'listen') {
    round.count = Math.min(round.item.value,round.count + 1);
    if (round.count < round.item.value) return false;
  }
  return completeStep(round);
}
export function choose(round, id) {
  if (round.completed || !round.choices.some(entry => entry.id === id)) return 'ignored';
  if (id !== round.item.id) return 'retry';
  completeStep(round); return 'found';
}
export function nextStep(round) {
  round.steps++;
  if (round.discoveries >= 5) return false;
  round.cursor = (round.cursor + 1) % round.pool.length;
  resetStep(round); return true;
}
