// Soundboard persistence (localStorage, failure-tolerant).

import {
  STORAGE_KEY, SETTINGS_KEY, DIALECTS_KEY, KNOBS, LAYERS, DIALECTS, defaultOpts,
} from '../config.js';
import { stamp } from '../util/build.js';
stamp('storage', '0.12.1');

// Pads saved before the speed scale change have no opts.v: their speed 0.75 is 1.00 on the
// current scale, so divide by 0.75. (Pads saved from now on carry v: 2.)
export function loadBoard() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').map(it => (
      it.opts?.v ? it
        : { ...it, opts: { ...it.opts, speed: (it.opts?.speed ?? it.speed ?? 1) / 0.75, v: 2 } }));
  } catch { return []; }
}

export function saveBoard(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch { /* storage blocked/full: ignore */ }
}

// Knob values; anything missing or out of range falls back to the default.
export function loadSettings() {
  const out = defaultOpts();
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    for (const [k, K] of Object.entries(KNOBS)) {
      if (Number.isFinite(s[k])) out[k] = Math.min(K.max, Math.max(K.min, s[k]));
    }
    if (typeof s.dialect === 'string' && DIALECTS[s.dialect]) out.dialect = s.dialect;
  } catch { /* ignore */ }
  return out;
}

export function saveSettings(opts) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(opts)); }
  catch { /* ignore */ }
}

// User-saved dialects ({ 'custom-xyz': {label, flair, flairLen, weights} }), sanitized on load.
export function loadDialects() {
  const out = {};
  try {
    const s = JSON.parse(localStorage.getItem(DIALECTS_KEY) || '{}');
    for (const [k, d] of Object.entries(s)) {
      if (!k.startsWith('custom-') || !d || typeof d.label !== 'string') continue;
      const weights = Object.fromEntries(
        Object.entries(d.weights ?? {}).filter(([n, v]) => LAYERS[n] && Number.isFinite(v)));
      out[k] = {
        label: d.label.slice(0, 24), desc: 'Custom dialect.', custom: true,
        flair: Math.min(1, Math.max(0, Number(d.flair) || 0)),
        flairLen: Math.min(8, Math.max(1, Math.round(Number(d.flairLen) || 4))),
        weights: Object.keys(weights).length ? weights : undefined,
      };
    }
  } catch { /* ignore */ }
  return out;
}

export function saveDialects(all) { // only the custom ones are stored
  const custom = Object.fromEntries(Object.entries(all).filter(([, d]) => d.custom));
  try { localStorage.setItem(DIALECTS_KEY, JSON.stringify(custom)); }
  catch { /* ignore */ }
}
