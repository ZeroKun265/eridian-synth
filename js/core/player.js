// Realtime playback.

import { plan } from './planner.js';
import { stamp } from '../util/build.js';
stamp('player', '0.12.1');
import { render } from './synth.js';
import { EMOTIONS } from '../config.js';

let ac = null;
let analyser = null;

export function stop() {
  if (ac) { ac.close(); ac = null; analyser = null; }
}

// Analyser of the current playback (null when stopped); used by the visualizer.
export function getAnalyser() {
  return analyser;
}

export function play(text, emotionKey, opts = {}) {
  stop();
  const emo = EMOTIONS[emotionKey];
  const p = plan(text, emo, opts);
  if (!p.events.length) return;
  ac = new AudioContext();
  analyser = ac.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.6;
  render(ac, p, analyser);
}
