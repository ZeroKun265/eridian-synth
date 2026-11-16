// Realtime playback.

import { plan } from './planner.js';
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

export function play(text, emotionKey, speed = 1) {
  stop();
  const emo = EMOTIONS[emotionKey];
  const p = plan(text, emo, speed);
  if (!p.events.length) return;
  ac = new AudioContext();
  analyser = ac.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.6;
  render(ac, p, analyser);
}
