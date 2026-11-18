// Offline render -> 16-bit mono WAV download.

import { plan } from './planner.js';
import { stamp } from '../util/build.js';
stamp('wav', '0.13.0');
import { render } from './synth.js';
import { EMOTIONS } from '../config.js';

const SR = 44100;

export async function exportWav(text, emotionKey, opts = {}, filename = 'eridian.wav') {
  const emo = EMOTIONS[emotionKey];
  const p = plan(text, emo, opts);
  if (!p.events.length) return;

  const oc = new OfflineAudioContext(1, Math.ceil(SR * p.total), SR);
  render(oc, p);
  const samples = (await oc.startRendering()).getChannelData(0);

  const blob = new Blob([encodeWav(samples, SR)], { type: 'audio/wav' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function encodeWav(d, sr) {
  const n = d.length;
  const v = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  return v;
}
