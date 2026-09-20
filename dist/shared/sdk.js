import { createLibraryStore } from './storage.js';
let storage;
try { storage = globalThis.localStorage; } catch { /* Private mode may block access. */ }
export const library = createLibraryStore(storage);

// Games keep their own rendering and rules; the platform owns shared records.
export function createGameSession(gameId) {
  let currentMode = null;
  return {
    best(mode) { return library.read().games[gameId]?.bestByMode?.[mode] || 0; },
    start(mode) { library.beginGame(gameId); currentMode = mode; },
    finish(result) {
      if (currentMode === null) return;
      if (result.mode !== currentMode) throw new Error('Result mode does not match the session');
      library.completeGame(gameId, result);
      currentMode = null;
    },
  };
}
