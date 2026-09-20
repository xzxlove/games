import { validStage } from './model.js';

const KEY = 'playroom-toddler-stages-v1';
export function createProgression(storage) {
  let memory = {}, volatile = !storage;
  function read() {
    if (!volatile) {
      try {
        const raw = JSON.parse(storage?.getItem(KEY) || '{}');
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) memory = raw;
      } catch { /* Blocked or corrupt storage must not stop the next stage. */ }
    }
    return memory;
  }
  function persist(data) {
    memory = data;
    try { storage?.setItem(KEY, JSON.stringify(data)); } catch { volatile = true; }
  }
  return {
    current(id, mode) { return validStage(read()[`${id}:${mode}`]); },
    mode(id) { return read()[`${id}:mode`] === 'curious' ? 'curious' : 'gentle'; },
    selectMode(id, mode) {
      const data = read(); data[`${id}:mode`] = mode === 'curious' ? 'curious' : 'gentle'; persist(data);
    },
    complete(state) {
      if (!state.done) return;
      const data = read(), key = `${state.id}:${state.mode}`;
      data[key] = Math.max(validStage(data[key]), validStage(state.stage) + 1);
      persist(data);
    },
  };
}
