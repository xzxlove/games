export function createAudio(enabled, onUnavailable) {
  let context, voice, notified = false;
  const nodes = new Set();
  function unavailable() { if (!notified) { notified = true; onUnavailable(); } }
  function voices() { voice = globalThis.speechSynthesis?.getVoices().find(v => /^zh[-_]CN/i.test(v.lang)) || globalThis.speechSynthesis?.getVoices().find(v => /^zh/i.test(v.lang)); }
  voices(); globalThis.speechSynthesis?.addEventListener('voiceschanged', voices);
  function unlock() {
    if (!enabled()) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (Audio) { context ||= new Audio(); context.resume().catch(() => {}); }
    } catch { /* Captions remain available without sound. */ }
  }
  function speak(text) {
    if (!enabled()) return;
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return unavailable();
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN'; utterance.rate = .82; utterance.pitch = 1.12; utterance.volume = .85;
      if (voice) utterance.voice = voice;
      utterance.onerror = event => { if (!['interrupted', 'canceled'].includes(event.error)) unavailable(); };
      speechSynthesis.speak(utterance);
    } catch { unavailable(); }
  }
  function tone(frequency, length = .3, type = 'sine', delay = 0, drop = false) {
    if (!enabled()) return;
    unlock(); if (!context) return;
    const oscillator = context.createOscillator(), gain = context.createGain(), at = context.currentTime + delay;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at);
    if (drop) oscillator.frequency.exponentialRampToValueAtTime(45, at + length);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.14, at + .012); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(at); oscillator.stop(at + length + .02); nodes.add(oscillator);
    oscillator.onended = () => { nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  }
  function instrument(id, sound, notes = [523.25,659.25,783.99]) {
    if (id === 'drum') tone(150, .25, 'sine', 0, true);
    else if (id === 'bell') { tone(784, .65); tone(1568, .35); }
    else if (id === 'piano') { tone(notes[0]); tone(notes[1], .35, 'sine', .15); tone(notes[2], .4, 'sine', .3); }
    else if (sound) speak(sound);
  }
  function stop() { globalThis.speechSynthesis?.cancel(); for (const node of nodes) { try { node.stop(); } catch { /* Already stopped. */ } } nodes.clear(); }
  return { unlock, speak, instrument, stop, success() { tone(523, .16); tone(659, .22, 'sine', .13); }, melody(notes = [523,659,784,659,523]) { notes.forEach((note,i) => tone(note,.33,'sine',i*.4)); } };
}
