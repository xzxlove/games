import { audioFiles } from './audio-map.js';
import { audioKey } from './speech.js';

// A single player keeps rapid taps from overlapping narration. No microphone is used.
export function createNarrator(notify) {
  const player = new Audio();
  player.preload = 'auto';
  player.id = 'wonderland-narration';
  player.hidden = true;
  document.body.append(player);
  let generation = 0, fallbackGeneration = -1, enabled = true;
  const stop = () => { generation++; player.pause(); player.onended = null; player.onerror = null; globalThis.speechSynthesis?.cancel(); };
  function fallback(clip, token) {
    if (token !== generation || token === fallbackGeneration || !enabled) return;
    fallbackGeneration = token;
    const synth = globalThis.speechSynthesis;
    if (!synth || !globalThis.SpeechSynthesisUtterance) { notify('暂时无法播放声音，爸爸妈妈可以照着画面读一读。'); return; }
    const utterance = new SpeechSynthesisUtterance(clip.text);
    utterance.lang = clip.language === 'en' ? 'en-US' : 'zh-CN';
    utterance.rate = .82;
    const voice = synth.getVoices().find(voice => voice.lang.toLowerCase().startsWith(clip.language));
    if (voice) utterance.voice = voice;
    utterance.onerror = event => { if (token === generation && !['interrupted','canceled'].includes(event.error)) notify('声音暂时没有准备好，可以再点一次小喇叭。'); };
    synth.speak(utterance);
  }
  return {
    stop,
    setEnabled(value) { enabled = value; if (!enabled) stop(); },
    play(clip) {
      stop(); if (!enabled || !clip) return;
      const token = generation, file = audioFiles[audioKey(clip.text,clip.language)];
      if (!file) { fallback(clip,token); return; }
      player.src = new URL(`./assets/audio/${file}`,import.meta.url).href;
      player.onerror = () => fallback(clip,token);
      player.play().catch(error => {
        if (token !== generation || error.name === 'AbortError') return;
        if (error.name === 'NotAllowedError') notify('点一下小喇叭，就能听到声音啦。');
        else fallback(clip,token);
      });
    },
  };
}
