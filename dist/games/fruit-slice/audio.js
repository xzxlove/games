const textures = {
  apple: 'crisp', pear: 'crisp', pineapple: 'crisp',
  watermelon: 'juicy', orange: 'juicy', lemon: 'juicy',
  kiwi: 'soft', strawberry: 'soft', peach: 'soft', mango: 'soft', dragonfruit: 'soft', blueberry: 'soft',
};

// Edited CC0 recordings, bundled locally for low latency and offline play.
// Source authors and processing notes are in assets/audio/SOURCES.md.
export const FRUIT_AUDIO_FILES = Object.freeze({
  crisp: ['slice-crisp-1.wav', 'slice-crisp-2.wav', 'slice-crisp-3.wav'],
  juicy: ['slice-juicy-1.wav', 'slice-juicy-2.wav', 'slice-juicy-3.wav'],
  soft: ['slice-soft-1.wav', 'slice-soft-2.wav', 'slice-soft-3.wav'],
  bomb: ['bomb.wav'],
});

// Only the short menu/reward melody is synthesized; every fruit hit and bomb
// uses a recording. Keep the melody out of the repeated slicing feedback.
export function synthesizeCue(kind, sampleRate = 44100) {
  const notes = kind === 'reward' ? [523.25, 659.25, 783.99, 1046.5] : [392, 523.25, 659.25];
  const samples = new Float32Array(Math.ceil((kind === 'reward' ? .72 : .48) * sampleRate));
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    for (let note = 0; note < notes.length; note++) {
      const d = t - note * .085;
      if (d >= 0) samples[i] += (.25 * Math.sin(Math.PI * 2 * notes[note] * d) + .04 * Math.sin(Math.PI * 4 * notes[note] * d)) * Math.min(1, d / .006) * Math.exp(-d * 17);
    }
    samples[i] *= Math.min(1, (samples.length - 1 - i) / (sampleRate * .02));
  }
  return samples;
}

export function createFruitAudio({
  enabled = true,
  contextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)({ latencyHint: 'interactive' }),
  fetchSample = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load fruit sound: ${response.status}`);
    return response.arrayBuffer();
  },
  now = () => performance.now(),
} = {}) {
  let context, master, resumePromise, generation = 0, sequence = 0;
  const bytes = new Map(), buffers = new Map(), decoding = new Map(), voices = new Set();
  const files = Object.values(FRUIT_AUDIO_FILES).flat();

  function loadFile(file) {
    if (!bytes.has(file)) {
      bytes.set(file, Promise.resolve().then(() => fetchSample(new URL(`./assets/audio/${file}`, import.meta.url))).catch(() => null));
    }
    return bytes.get(file);
  }
  function decodeFile(file) {
    if (!decoding.has(file)) {
      const owner = context;
      decoding.set(file, loadFile(file).then(data => data && owner.decodeAudioData(data.slice(0))).then(buffer => {
        if (buffer && context === owner) buffers.set(file, buffer);
        return context === owner ? buffer : null;
      }).catch(() => null));
    }
    return decoding.get(file);
  }
  function preload() { return Promise.all(files.map(file => context ? decodeFile(file) : loadFile(file))); }
  function prepare() {
    if (context?.state === 'closed') { context = null; buffers.clear(); decoding.clear(); }
    if (!context) {
      context = contextFactory();
      master = context.createGain(); master.gain.value = .85;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -12; compressor.knee.value = 12; compressor.ratio.value = 8;
      compressor.attack.value = .003; compressor.release.value = .12;
      master.connect(compressor); compressor.connect(context.destination);
      for (const kind of ['start', 'reward']) {
        const pcm = synthesizeCue(kind, context.sampleRate);
        const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
        buffer.getChannelData(0).set(pcm); buffers.set(kind, buffer);
      }
      void preload();
    }
  }
  function unlock() {
    if (!enabled) return Promise.resolve(false);
    try {
      prepare();
      if (context.state === 'running') return Promise.resolve(true);
      if (!resumePromise) resumePromise = Promise.resolve(context.resume()).then(() => context.state === 'running', () => false).finally(() => { resumePromise = null; });
      return resumePromise;
    } catch { return Promise.resolve(false); }
  }
  function stop() {
    generation++;
    for (const voice of [...voices]) voice.cancel();
  }
  function schedule(buffer, kind, { combo = 1, pan = 0 } = {}) {
    if (!enabled || !buffer || context?.state !== 'running') return;
    while (voices.size >= 12) voices.values().next().value.cancel();
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    const pitched = kind === 'cut' || kind === 'victory';
    source.playbackRate.value = pitched ? 1 + Math.min(10, Math.max(0, combo - 1)) * .012 : 1;
    gain.gain.value = (kind === 'bomb' ? .95 : kind === 'victory' ? 1 : .88) / Math.sqrt(1 + voices.size * .35);
    source.connect(gain);
    const panner = context.createStereoPanner?.();
    if (panner) { panner.pan.value = Math.max(-.65, Math.min(.65, pan)); gain.connect(panner); panner.connect(master); }
    else gain.connect(master);
    let cleaned = false;
    const voice = { cancel() { try { source.stop(); } catch { /* Already ended. */ } cleanup(); } };
    function cleanup() {
      if (cleaned) return;
      cleaned = true; voices.delete(voice); source.disconnect(); gain.disconnect(); panner?.disconnect();
    }
    source.onended = cleanup; voices.add(voice);
    source.start(context.currentTime);
  }
  function play(kind, options = {}) {
    if (!enabled) return;
    const effect = kind === 'cut' ? textures[options.fruitKind] || 'juicy' : kind === 'victory' ? 'juicy' : kind;
    const variants = FRUIT_AUDIO_FILES[effect];
    if (!variants && effect !== 'start' && effect !== 'reward') return;
    const file = variants ? variants[sequence++ % variants.length] : effect;
    if (kind === 'bomb') stop();
    const current = generation, requestedAt = now();
    const emit = buffer => {
      // Slow downloads/resume must not queue old hits after a pause or a swipe.
      if (current !== generation || now() - requestedAt > 120) return;
      try { schedule(buffer, kind, options); } catch { /* Sound must not block play. */ }
    };
    if (context?.state === 'running' && buffers.has(file)) emit(buffers.get(file));
    else unlock().then(async ready => {
      if (ready && current === generation) emit(buffers.get(file) || await decodeFile(file));
    });
  }
  // Download on the home screen; create/resume the audio context on a gesture.
  if (enabled) void preload();
  return {
    unlock, preload, play, stop,
    setEnabled(value) { enabled = Boolean(value); if (!enabled) stop(); else void preload(); },
  };
}

export function createBombHaptics(device = globalThis.navigator) {
  const vibrate = pattern => { try { return device?.vibrate?.(pattern) === true; } catch { return false; } };
  return { hit: () => vibrate([100, 45, 150]), stop: () => vibrate(0) };
}
