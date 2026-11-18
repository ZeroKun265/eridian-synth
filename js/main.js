// Entry point: wires UI to core.

import {
  DEFAULT_DIALECT, DEFAULT_EMOTION, DIALECTS, EMOTIONS, VERSION, STORAGE_KEY, SETTINGS_KEY, DIALECTS_KEY,
} from './config.js';
import { stamps } from './util/build.js';
import { plan } from './core/planner.js';
import { play, stop } from './core/player.js';
import { exportWav } from './core/wav.js';
import {
  buildSoundboardFile, parseSoundboardFile, mergeSoundboard,
  buildDialectsFile, parseDialectsFile, mergeDialects,
} from './core/backup.js';
import {
  loadBoard, saveBoard, loadSettings, saveSettings, loadDialects, saveDialects,
} from './core/storage.js';
import { mountEmotionPicker } from './ui/emotionPicker.js';
import { mountDialectPicker } from './ui/dialectPicker.js';
import { mountKnobs } from './ui/knobs.js';
import { mountSoundboard } from './ui/soundboard.js';
import { mountVisualizer } from './ui/visualizer.js';

const $ = id => document.getElementById(id);
let emotion = DEFAULT_EMOTION;
const board = loadBoard();
Object.assign(DIALECTS, loadDialects()); // user-saved dialects join the built-in ones
const opts = loadSettings(); // knob values (speed, pitch, flair...), persisted

// warn if the browser mixed cached old files with new ones (see util/build.js)
if (Object.values(stamps).some(v => v !== VERSION)) $('stale').hidden = false;

// live readout of which words get flair with the current text + knobs
function updateInfo() {
  const p = plan($('txt').value, EMOTIONS[emotion], opts);
  const fl = p.events.filter(e => e.flair).map(e => e.flair);
  $('flairinfo').textContent = fl.length
    ? `Flair in this text: ${fl.map(f => `${f.name} (${f.words.join(' ')})`).join(' · ')}`
    : opts.flair === 0
      ? 'Flair amount is 0%: no flair.'
      : `No flair in this text at these settings (${p.events.length} words). Raise Flair amount or use a longer text.`;
}

// accent color follows the selected emotion
const viz = mountVisualizer($('viz'));
function applyAccent(key) {
  const c = EMOTIONS[key].color;
  document.documentElement.style.setProperty('--accent', c);
  viz.setColor(c);
}
mountEmotionPicker($('emos'), emotion, k => { emotion = k; applyAccent(k); updateInfo(); });
applyAccent(emotion);

// knobs
const knobs = mountKnobs(g => $('knobs-' + g), opts, () => { saveSettings(opts); refreshDialects(); updateInfo(); });

// dialects: a dialect presets the Flair amount/length sliders. Moving them off the preset marks the
// dialect with "*" (it stays selected); clicking its chip restores it; "Save as dialect" keeps it.
const PRESET_KEYS = ['flair', 'flairLen'];
const isModified = () => {
  const D = DIALECTS[opts.dialect];
  return PRESET_KEYS.some(k => D[k] !== undefined && Math.abs(opts[k] - D[k]) > 1e-9);
};
function refreshDialects() {
  const D = DIALECTS[opts.dialect], mod = isModified();
  dialects.render(opts.dialect, mod);
  $('dialectdesc').textContent = D.desc + (mod ? ' Modified: click the chip to restore it, or save as a new dialect.' : '');
  $('dialect-delete').hidden = !D.custom;
}
function selectDialect(k) {
  opts.dialect = k;
  for (const key of PRESET_KEYS) if (DIALECTS[k][key] !== undefined) opts[key] = DIALECTS[k][key];
  knobs.refresh(); saveSettings(opts); refreshDialects(); updateInfo();
}
const dialects = mountDialectPicker($('dialects'), selectDialect);
refreshDialects();

$('dialect-save').onclick = () => {
  const cur = DIALECTS[opts.dialect];
  const name = (prompt('Name for the new dialect:', cur.custom ? cur.label : '') || '').trim().slice(0, 24);
  if (!name) return;
  const hit = Object.entries(DIALECTS).find(([, d]) => d.label.toLowerCase() === name.toLowerCase());
  if (hit && !hit[1].custom) { alert(`"${hit[1].label}" is a built-in dialect, pick another name.`); return; }
  const key = hit ? hit[0] : 'custom-' + Date.now().toString(36); // same name = overwrite
  DIALECTS[key] = {
    label: name, desc: 'Custom dialect.', custom: true,
    flair: opts.flair, flairLen: opts.flairLen, weights: cur.weights ? { ...cur.weights } : undefined,
  };
  saveDialects(DIALECTS);
  selectDialect(key);
};
$('dialect-delete').onclick = () => {
  const D = DIALECTS[opts.dialect];
  if (!D.custom || !confirm(`Delete dialect "${D.label}"? Pads saved with it fall back to the Common sounds.`)) return;
  delete DIALECTS[opts.dialect];
  saveDialects(DIALECTS);
  selectDialect(DEFAULT_DIALECT);
};
$('reset-voice').onclick = () => knobs.reset('voice');
$('reset-flair').onclick = () => knobs.reset('flair');

// actions
const doPlay = () => play($('txt').value, emotion, { ...opts });
$('play').onclick = doPlay;
$('stop').onclick = stop;
$('solo').onclick = () => {
  const text = $('txt').value, o = { ...opts, solo: true };
  if (!(o.flairLevel > 0)) { $('flairinfo').textContent = 'Flair volume is 0, so there is nothing to play.'; return; }
  if (o.dialect === 'proper' && o.flair === 0) { $('flairinfo').textContent = 'Proper has no flair: raise Flair amount or pick another dialect.'; return; }
  const none = !plan(text, EMOTIONS[emotion], o).events.length;
  if (none) o.flair = 1; // no flair at these settings: audition at 100% amount instead
  play(text, emotion, o);
  if (none) $('flairinfo').textContent += ' (Flair only: previewing at 100% amount)';
};
$('txt').addEventListener('input', updateInfo);
$('wav').onclick = () => exportWav($('txt').value, emotion, { ...opts });

$('txt').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); doPlay(); }
});
// Esc stops from anywhere on the page, whichever element has focus
document.addEventListener('keydown', e => { if (e.key === 'Escape') stop(); });

// soundboard: tabs of pads (pads remember the knob values they were saved with)
const sb = mountSoundboard({ tabsEl: $('tabs'), boardEl: $('board') }, board, {
  onPlay: it => play(it.text, it.emo, it.opts),
  onChange: saveBoard,
});
$('save').onclick = () => {
  const text = $('txt').value.trim();
  if (!text) return;
  sb.current().pads.push({ text, emo: emotion, opts: { ...opts, v: 2 } });
  saveBoard(board);
  sb.render();
};

// export / import (core/backup.js). Imports merge into the current session.
const customOnly = () => Object.fromEntries(Object.entries(DIALECTS).filter(([, d]) => d.custom));
const today = () => new Date().toISOString().slice(0, 10);
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function pickFile(inputId, handler) { // handler(text) may throw an Error to show to the user
  const input = $(inputId);
  input.onchange = async () => {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    try { alert(handler(await f.text())); } catch (e) { alert(e.message); }
  };
  input.click();
}
function setCustomDialects(custom, changedKeys) { // swap the custom dialects in the live session
  for (const k of Object.keys(customOnly())) delete DIALECTS[k];
  Object.assign(DIALECTS, custom);
  saveDialects(DIALECTS);
  if (changedKeys.includes(opts.dialect)) selectDialect(opts.dialect); else refreshDialects();
}

$('sb-export').onclick = () => download(`eridian-soundboard-${today()}.json`, buildSoundboardFile(board, DIALECTS));
$('sb-import').onclick = () => pickFile('sb-file', text => {
  const r = mergeSoundboard(board, parseSoundboardFile(text), customOnly());
  setCustomDialects(r.dialects, r.changedKeys);
  saveBoard(board); sb.render();
  return `Imported: ${r.added} new pads, ${r.tabsCreated} new tabs.`;
});
$('dl-export').onclick = () => {
  if (!Object.keys(customOnly()).length) { alert('No custom dialects to export yet.'); return; }
  download(`eridian-dialects-${today()}.json`, buildDialectsFile(DIALECTS));
};
$('dl-import').onclick = () => pickFile('dl-file', text => {
  const imp = parseDialectsFile(text).dialects;
  const r = mergeDialects(customOnly(), imp);
  setCustomDialects(r.dialects, Object.values(r.keyMap));
  return `Imported ${Object.keys(r.keyMap).length} dialects` + (r.skipped ? ` (${r.skipped} skipped: same name as a built-in dialect)` : '') + '.';
});

// clearing stored data (then reload so everything restarts from defaults)
function wipe(what, ...keys) {
  if (!confirm(`Clear ${what}? This cannot be undone.`)) return;
  try { keys.forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
  location.reload();
}
$('clear-board').onclick = () => wipe('the whole soundboard (all tabs and pads)', STORAGE_KEY);
$('clear-dialects').onclick = () => wipe('all custom dialects', DIALECTS_KEY);
$('clear-all').onclick = () => wipe('everything (soundboard, custom dialects, slider settings)', STORAGE_KEY, DIALECTS_KEY, SETTINGS_KEY);

updateInfo();
$('ver').textContent = 'v' + VERSION;
$('txt').focus();
$('txt').select();
