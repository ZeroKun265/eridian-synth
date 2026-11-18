// Soundboard persistence (localStorage, failure-tolerant).

import {
  STORAGE_KEY, SETTINGS_KEY, DIALECTS_KEY, KNOBS, LAYERS, DIALECTS, EMOTIONS, defaultOpts,
} from '../config.js';
import { stamp } from '../util/build.js';
stamp('storage', '0.13.0');

// Pads saved before the speed scale change have no opts.v: their speed 0.75 is 1.00 on the
// current scale, so divide by 0.75. (Pads saved from now on carry v: 2.)
// Board = { tabs: [{ id, name, pads: [{ text, emo, opts }] }], active: tabId }.
// Old saves (a flat array of pads) become one tab "Main". Pads saved before the speed scale
// change have no opts.v: their speed 0.75 is 1.00 now, so divide by 0.75 (new pads carry v: 2).
export const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export function cleanPad(it) {
  if (!it || typeof it.text !== 'string' || !it.text || !EMOTIONS[it.emo]) return null;
  return it.opts?.v ? it
    : { ...it, opts: { ...it.opts, speed: (it.opts?.speed ?? it.speed ?? 1) / 0.75, v: 2 } };
}

export function cleanBoard(raw) {
  let tabs = Array.isArray(raw) ? [{ name: 'Main', pads: raw }] : (Array.isArray(raw?.tabs) ? raw.tabs : []);
  const seen = new Set();
  tabs = tabs.filter(t => t && typeof t.name === 'string').map(t => {
    let id = typeof t.id === 'string' && t.id && !seen.has(t.id) ? t.id : newId();
    seen.add(id);
    return { id, name: t.name.trim().slice(0, 24) || 'Tab', pads: (Array.isArray(t.pads) ? t.pads : []).map(cleanPad).filter(Boolean) };
  });
  if (!tabs.length) tabs = [{ id: newId(), name: 'Main', pads: [] }];
  return { tabs, active: tabs.some(t => t.id === raw?.active) ? raw.active : tabs[0].id };
}
export function loadBoard() {
  try { return cleanBoard(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { return cleanBoard(null); }
}

export function saveBoard(board) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(board)); }
  catch { /* storage blocked/full: ignore */ }
}

// Knob values; anything missing or out of range falls back to the default.
export function cleanSettings(s, dialects = DIALECTS) {
  const out = defaultOpts();
  if (!s || typeof s !== 'object') return out;
  for (const [k, K] of Object.entries(KNOBS)) {
    if (Number.isFinite(s[k])) out[k] = Math.min(K.max, Math.max(K.min, s[k]));
  }
  if (typeof s.dialect === 'string' && dialects[s.dialect]) out.dialect = s.dialect;
  return out;
}
export function loadSettings() {
  try { return cleanSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch { return defaultOpts(); }
}

export function saveSettings(opts) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(opts)); }
  catch { /* ignore */ }
}

// User-saved dialects ({ 'custom-xyz': {label, flair, flairLen, weights} }), sanitized.
export function cleanDialects(s) {
  const out = {};
  if (!s || typeof s !== 'object') return out;
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
  return out;
}
export function loadDialects() {
  try { return cleanDialects(JSON.parse(localStorage.getItem(DIALECTS_KEY) || '{}')); }
  catch { return {}; }
}

export function saveDialects(all) { // only the custom ones are stored
  const custom = Object.fromEntries(Object.entries(all).filter(([, d]) => d.custom));
  try { localStorage.setItem(DIALECTS_KEY, JSON.stringify(custom)); }
  catch { /* ignore */ }
}
