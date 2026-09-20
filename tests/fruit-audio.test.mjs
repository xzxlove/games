import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createFruitAudio, createBombHaptics, FRUIT_AUDIO_FILES } from '../dist/games/fruit-slice/audio.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
const sampleBytes = () => Promise.resolve(new ArrayBuffer(8));
function audioContext(state = 'running') {
  const sources = [], buffers = [], nodes = [];
  const node = extra => { const value = { connections: [], connect(to) { this.connections.push(to); }, disconnect() { this.connections = []; }, ...extra }; nodes.push(value); return value; };
  const context = {
    state, currentTime: 2, sampleRate: 44100, destination: {},
    createGain: () => node({ gain: { value: 1 } }),
    createDynamicsCompressor: () => node(Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map(key => [key, { value: 0 }]))),
    createStereoPanner: () => node({ pan: { value: 0 } }),
    createBuffer(_channels, length) { const pcm = new Float32Array(length); return { getChannelData: () => pcm }; },
    async decodeAudioData(data) { assert.ok(data instanceof ArrayBuffer); const buffer = { recorded: true }; buffers.push(buffer); return buffer; },
    createBufferSource() {
      const source = node({ playbackRate: { value: 1 }, started: false, stopped: false,
        start() { this.started = true; }, stop() { this.stopped = true; this.onended?.(); } });
      sources.push(source); return source;
    },
    async resume() { context.state = 'running'; },
  };
  return { context, sources, buffers, nodes };
}
const makeAudio = (fake, options = {}) => createFruitAudio({ contextFactory: () => fake.context, fetchSample: sampleBytes, ...options });
async function ready(audio) { await audio.unlock(); await audio.preload(); }

test('recorded assets are distinct playable PCM WAVs with prompt attacks, faded endings and headroom', () => {
  const hashes = new Set(); let size = 0;
  for (const [group, files] of Object.entries(FRUIT_AUDIO_FILES)) {
    assert.equal(files.length, group === 'bomb' ? 1 : 3);
    for (const file of files) {
      const wav = readFileSync(new URL(`../dist/games/fruit-slice/assets/audio/${file}`, import.meta.url));
      size += wav.length; hashes.add(createHash('sha256').update(wav).digest('hex'));
      assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
      assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
      assert.equal(wav.readUInt16LE(20), 1, 'uncompressed PCM');
      assert.equal(wav.readUInt16LE(22), 1, 'mono');
      assert.equal(wav.readUInt32LE(24), 44100);
      assert.equal(wav.readUInt16LE(34), 16);
      assert.equal(wav.toString('ascii', 36, 40), 'data');
      assert.equal(wav.readUInt32LE(40), wav.length - 44);
      const samples = Array.from({ length: (wav.length - 44) / 2 }, (_, i) => wav.readInt16LE(44 + i * 2) / 32768);
      const peak = samples.reduce((p, x) => Math.max(p, Math.abs(x)), 0);
      const rms = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
      assert.ok(peak > .4 && peak < .9, file);
      assert.ok(rms > .08 && rms < .2, file);
      assert.ok(samples.slice(0, 1323).some(x => Math.abs(x) > .1), `audible in first 30 ms: ${file}`);
      assert.equal(samples[0], 0); assert.equal(samples.at(-1), 0);
      assert.ok(samples.length / 44100 < (group === 'bomb' ? 1.5 : .4));
    }
  }
  assert.equal(hashes.size, 10);
  assert.ok(size < 400 * 1024, 'small enough to preload on the home screen');
});

test('downloads preload without autoplay; muted audio stays lazy until enabled by the user', async () => {
  const fake = audioContext(); let created = 0, fetched = 0;
  const audio = makeAudio(fake, { enabled: false, contextFactory() { created++; return fake.context; }, fetchSample() { fetched++; return sampleBytes(); } });
  audio.play('cut'); await audio.unlock(); await settle();
  assert.equal(created, 0); assert.equal(fetched, 0);
  audio.setEnabled(true); await audio.preload();
  assert.equal(fetched, 10); assert.equal(created, 0);
  audio.play('start'); await settle();
  assert.equal(created, 1); assert.equal(fake.sources.length, 1);
  assert.equal(fake.sources[0].started, true);
});

test('all fruits and victory hits use recordings; rapid cuts reuse buffers and limit overlapping voices', async () => {
  const fake = audioContext(), audio = makeAudio(fake); await ready(audio);
  for (const fruitKind of ['apple', 'pear', 'pineapple', 'watermelon', 'orange', 'lemon', 'kiwi', 'strawberry', 'peach', 'mango', 'dragonfruit', 'blueberry']) audio.play('cut', { fruitKind });
  audio.play('victory');
  assert.ok(fake.sources.every(source => source.buffer.recorded));
  audio.stop();
  const before = fake.sources.length;
  for (let i = 0; i < 100; i++) audio.play('cut', { combo: i, fruitKind: 'apple', pan: 99 });
  assert.equal(fake.buffers.length, 10, 'decode once per recording');
  assert.equal(new Set(fake.sources.slice(before).map(source => source.buffer)).size, 3);
  assert.equal(fake.sources.filter(source => !source.stopped).length, 12);
  assert.ok(fake.sources.every(source => source.playbackRate.value >= 1 && source.playbackRate.value <= 1.12));
  assert.ok(fake.nodes.filter(node => node.pan).every(node => node.pan.value <= .65));
  audio.setEnabled(false);
  assert.ok(fake.sources.every(source => source.stopped && source.connections.length === 0));
  audio.play('bomb'); assert.equal(fake.sources.length, before + 100);
});

test('mute or pause during a pending browser resume cannot play a stale effect', async () => {
  for (const cancel of ['stop', 'mute']) {
    const fake = audioContext('suspended'); let resume;
    fake.context.resume = () => new Promise(resolve => { resume = () => { fake.context.state = 'running'; resolve(); }; });
    const audio = makeAudio(fake);
    audio.play('cut');
    if (cancel === 'mute') audio.setEnabled(false); else audio.stop();
    resume(); await settle();
    assert.equal(fake.sources.length, 0);
  }
});

test('late downloads never replay old hits after a pause, mute, or expired input', async () => {
  for (const cancel of ['stop', 'mute', 'timeout']) {
    const fake = audioContext(); let clock = 0, finish;
    const download = new Promise(resolve => { finish = () => resolve(new ArrayBuffer(8)); });
    const audio = makeAudio(fake, { fetchSample: () => download, now: () => clock });
    await audio.unlock(); audio.play('cut'); await settle();
    if (cancel === 'mute') audio.setEnabled(false);
    else if (cancel === 'stop') audio.stop();
    else clock = 200;
    finish(); await audio.preload(); await settle();
    assert.equal(fake.sources.length, 0);
    audio.setEnabled(true); audio.play('cut');
    assert.equal(fake.sources.length, 1, 'next fresh hit uses the cached recording');
  }
});

test('a bomb interrupts cuts; missing panning and interrupted audio still work', async () => {
  const fake = audioContext('interrupted'); delete fake.context.createStereoPanner;
  const audio = makeAudio(fake); await ready(audio);
  audio.play('cut'); const cut = fake.sources[0];
  audio.play('bomb');
  assert.equal(cut.stopped, true);
  assert.equal(fake.sources.at(-1).started, true);
  assert.equal(fake.sources.at(-1).buffer.recorded, true);
  audio.stop(); assert.ok(fake.sources.every(source => source.stopped));
});

test('missing files, bad decoding, or denied audio never prevents game interaction', async () => {
  const missing = createFruitAudio({ fetchSample: sampleBytes, contextFactory() { throw new Error('unsupported'); } });
  assert.equal(await missing.unlock(), false);
  assert.doesNotThrow(() => { missing.play('cut'); missing.stop(); });
  for (const failure of ['resume', 'download', 'decode']) {
    const fake = audioContext('suspended');
    if (failure === 'resume') fake.context.resume = async () => { throw new Error('denied'); };
    if (failure === 'decode') fake.context.decodeAudioData = async () => { throw new Error('corrupt'); };
    const audio = makeAudio(fake, failure === 'download' ? { fetchSample: async () => { throw new Error('offline'); } } : {});
    audio.play('bomb'); await settle();
    assert.equal(fake.sources.length, 0, failure);
    audio.stop();
  }
});

test('bomb haptics use two brief pulses, cancel on stop and tolerate unavailable hardware', () => {
  const calls = [], device = { vibrate(pattern) { assert.equal(this, device); calls.push(pattern); return true; } };
  const haptics = createBombHaptics(device);
  assert.equal(haptics.hit(), true); haptics.stop();
  assert.deepEqual(calls, [[100, 45, 150], 0]);
  for (const device of [undefined, {}, { vibrate: () => false }, { vibrate() { throw new Error('blocked'); } }]) {
    const unsupported = createBombHaptics(device);
    assert.equal(unsupported.hit(), false);
    assert.equal(unsupported.stop(), false);
  }
});
