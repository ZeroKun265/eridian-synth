// Export / import of the soundboard (tabs + pads) and of custom dialects. Pure data functions.
// Files are JSON: { app: 'eridian-synth', kind: 'soundboard' | 'dialects', format: 1, version, ... }.
// Imports always MERGE into the current session:
//  - tabs with the same name (case-insensitive) are written into; others are created
//  - pads are identified by text + tone + settings, so an identical pad is simply overwritten
//  - dialects with the same name: the imported one wins (the current one is overwritten)

import { VERSION, DIALECTS } from '../config.js';
import { cleanBoard, cleanDialects, newId } from './storage.js';
import { stamp } from '../util/build.js';
stamp('backup', '0.13.0');

const head = kind => ({ app: 'eridian-synth', kind, format: 1, version: VERSION });
const lower = s => s.toLowerCase();

function parse(text, kind) {
  let j;
  try { j = JSON.parse(text); } catch { throw new Error('Not a valid JSON file.'); }
  if (!j || j.app !== 'eridian-synth') throw new Error('This is not an Eridian Synth file.');
  if (j.kind !== kind) throw new Error(`This is a ${j.kind} file: use the ${kind} import instead.`);
  return j;
}

// ---- dialects ----
export const buildDialectsFile = dialects =>
  JSON.stringify({ ...head('dialects'), dialects: Object.fromEntries(Object.entries(dialects).filter(([, d]) => d.custom)) }, null, 2);

export const parseDialectsFile = text => ({ dialects: cleanDialects(parse(text, 'dialects').dialects) });

// current / imported: { 'custom-x': dialect }. -> { dialects, keyMap (imported key -> key used), skipped }
export function mergeDialects(current, imported) {
  const dialects = { ...current }, keyMap = {};
  let skipped = 0;
  const builtin = new Set(Object.values(DIALECTS).filter(d => !d.custom).map(d => lower(d.label)));
  for (const [k, d] of Object.entries(imported)) {
    if (builtin.has(lower(d.label))) { skipped++; continue; } // can't shadow a built-in
    const hit = Object.entries(dialects).find(([, e]) => lower(e.label) === lower(d.label));
    const key = hit ? hit[0] : (dialects[k] ? 'custom-' + newId() : k);
    dialects[key] = d; keyMap[k] = key;
  }
  return { dialects, keyMap, skipped };
}

// ---- soundboard ----
const canon = p => JSON.stringify([p.text, p.emo, Object.entries(p.opts ?? {}).sort()]);

export function buildSoundboardFile(board, dialects) {
  const used = new Set(board.tabs.flatMap(t => t.pads.map(p => p.opts?.dialect)));
  const custom = Object.fromEntries(Object.entries(dialects).filter(([k, d]) => d.custom && used.has(k)));
  const tabs = board.tabs.map(({ name, pads }) => ({ name, pads }));
  return JSON.stringify({ ...head('soundboard'), tabs, dialects: custom }, null, 2);
}

export function parseSoundboardFile(text) {
  const j = parse(text, 'soundboard');
  return { tabs: cleanBoard({ tabs: j.tabs }).tabs, dialects: cleanDialects(j.dialects) };
}

// Mutates `board`. Returns { dialects (custom, to store), changedKeys, added, tabsCreated }.
export function mergeSoundboard(board, imp, currentDialects) {
  const { dialects, keyMap } = mergeDialects(currentDialects, imp.dialects);
  let added = 0, tabsCreated = 0;
  for (const t of imp.tabs) {
    let tab = board.tabs.find(x => lower(x.name) === lower(t.name));
    if (!tab) { tab = { id: newId(), name: t.name, pads: [] }; board.tabs.push(tab); tabsCreated++; }
    for (const p of t.pads) {
      const d = p.opts?.dialect;
      const q = keyMap[d] ? { ...p, opts: { ...p.opts, dialect: keyMap[d] } } : p;
      const i = tab.pads.findIndex(x => canon(x) === canon(q));
      if (i >= 0) tab.pads[i] = q; else { tab.pads.push(q); added++; }
    }
  }
  return { dialects, changedKeys: Object.values(keyMap), added, tabsCreated };
}
