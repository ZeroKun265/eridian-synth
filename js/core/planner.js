// Text -> word events grouped into emotion segments. Pure function (no audio), deterministic.
// A word = a sequence of syllable chords (seeded by syllable text). Occasionally a "flair" (extra
// sound layer) starts on a word and runs over the next few words. Modifiers and [tags] only
// change expression.

import {
  PENT, BASE, TEMPO, WORD_GAP, PAUSE, PAUSE_END, MOD, SYLLABLE, LAYERS, FLAIR, DIALECTS,
  DEFAULT_DIALECT, EMOTIONS, EMOTION_TAGS,
} from '../config.js';
import { fnv, mulberry } from '../util/prng.js';
import { stamp } from '../util/build.js';
stamp('planner', '0.12.1');

// [tag] | word + trailing modifier run | pause punctuation | stray modifier run
const TOKEN = /\[([^\]]*)\]|([\p{L}\p{N}']+)([!?*~_]*)|([,.;:])|([!?*~_]+)/gu;
// Lossless syllable splitter: a syllable = consonants + vowel group (+ closing consonant when two
// consonants follow). Vowels: Latin incl. accents (Italian, French, Spanish...), Cyrillic, Greek.
// Words with no known vowels (other scripts, "hmm") are cut every 3 letters instead.
const V = 'aeiouyàáâãäåæèéêëìíîïòóôõöøùúûüœаеёиоуыэюяαεηιουωάέήίόύώ';
const SYL = new RegExp(`[^${V}]*[${V}]+(?:[^${V}]*$|[^${V}](?=[^${V}]))?|[^${V}]+$`, 'gi');
const HAS_VOWEL = new RegExp(`[${V}]`);
const count = (s, c) => s.split(c).length - 1;
const capped = (s, c, max) => Math.min(count(s, c), max);

export function syllables(word) {
  const w = word.toLowerCase();
  const parts = (HAS_VOWEL.test(w) ? w.match(SYL) : w.match(/.{1,3}/g)) || [w];
  if (parts.length <= SYLLABLE.max) return parts;
  return [...parts.slice(0, SYLLABLE.max - 1), parts.slice(SYLLABLE.max - 1).join('')];
}

// chord for one syllable: depends only on the syllable text
function chordFor(syl) {
  const rnd = mulberry(fnv(syl));
  const n = 3 + (rnd() * 2 | 0); // 3-4 notes
  const ratios = [];
  for (let k = 0; k < n; k++) {
    const idx = rnd() * 10 | 0;
    ratios.push(2 ** ((PENT[idx % 5] + 12 * (idx / 5 | 0)) / 12));
  }
  return ratios;
}

// Flair: a word may (rarely) start an extra layer that runs over the next few words, then a short
// cooldown. Whether a word starts one, which layer, and how long, all come from the word's text
// (the emotion only reweights which layer is picked). Spans never cross a tone change.
// The flair is stored on its first word: ev.flair = {name, a, b, amp, t, dur, loud, root, starts, emo}.
function planFlairs(events, { rate, maxWords, level, weights }) {
  const p = rate * FLAIR.maxP;
  const cooldown = Math.round(FLAIR.cooldown * (1 - rate));
  const minWords = Math.max(1, Math.round(maxWords * FLAIR.minFrac));
  const names = Object.keys(LAYERS);
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const rnd = mulberry(fnv(ev.word + '#flair'));
    if (rnd() >= p) continue;
    const pick = rnd(), a = rnd(), b = rnd(), lenRoll = rnd();

    const w = names.map(n => LAYERS[n].weight * (weights?.[n] ?? 1) * (ev.emo.bias?.[n] ?? 1));
    let x = pick * w.reduce((s, v) => s + v, 0), name = names[names.length - 1];
    for (let k = 0; k < names.length; k++) if ((x -= w[k]) < 0) { name = names[k]; break; }

    const n = minWords + Math.floor(lenRoll * (maxWords - minWords + 1));
    let j = i;
    while (j + 1 < events.length && j - i + 1 < n && events[j + 1].emo === ev.emo) j++;
    const last = events[j];

    ev.flair = {
      name, a, b, amp: LAYERS[name].amp * level, emo: ev.emo,
      t: ev.t, dur: last.t + last.dur - ev.t, loud: ev.loud,
      root: ev.chords[0].notes[0],
      starts: events.slice(i, j + 1).map(e => e.t),
      words: events.slice(i, j + 1).map(e => e.word),
    };
    i = j + cooldown;
  }
}

// opts (all optional, see KNOBS in config.js): speed, pitch (semitones), flair (amount 0..1),
// flairLen (max words), flairLevel (volume multiplier)
export function plan(text, baseEmo, opts = {}) {
  const {
    speed = 1, pitch = 0, flair = FLAIR.rate, flairLen = FLAIR.maxWords, flairLevel = 1,
    dialect = DEFAULT_DIALECT,
    solo = false, // debug: play only the flair layers (no chords)
  } = opts;
  const D = DIALECTS[dialect] ?? DIALECTS[DEFAULT_DIALECT];
  const pf = 2 ** (pitch / 12);
  let emo = baseEmo;
  let events = [];
  let t = 0.05;

  for (const m of text.matchAll(TOKEN)) {
    const [, tag, word, mods = '', punct, stray] = m;

    if (tag !== undefined) { // [happy], [vs], ... switches tone for following words
      const key = EMOTION_TAGS[tag.trim().toLowerCase().replace(/[\s_-]+/g, ' ')];
      if (key) emo = EMOTIONS[key];
      continue;
    }

    const ts = emo.speed * TEMPO / speed; // time scale

    if (!word) { // pause punctuation or stray modifiers
      if (punct) t += (PAUSE[punct] ?? PAUSE_END) * ts;
      else if (/[!?]/.test(stray)) t += PAUSE_END * ts;
      continue;
    }

    const bang = capped(mods, '!', MOD.maxBang);
    const ask = capped(mods, '?', MOD.maxGlide);
    const down = capped(mods, '_', MOD.maxGlide);
    const stars = capped(mods, '*', MOD.maxStars);
    const wobble = capped(mods, '~', MOD.maxWobble);
    const lift = 1 + MOD.bangLift * bang;
    const userGlide = MOD.askGlide ** ask * MOD.downGlide ** down;

    // syllable chords laid end to end; ? _ glide and * stretch apply to the last syllable
    const sylls = syllables(word);
    let wt = t;
    const chords = sylls.map((s, i) => {
      const last = i === sylls.length - 1;
      const base = SYLLABLE.dur + SYLLABLE.perLetter * Math.min(s.length, 4);
      const dur = Math.max(0.05, base * ts * (last ? 1 + MOD.starStretch * stars : 1));
      const c = {
        t: wt, dur,
        notes: chordFor(s).map(r => BASE * r * emo.pitch * lift * pf),
        glide: (emo.lilt ?? 1) * (last ? userGlide : 1),
      };
      wt += dur;
      return c;
    });
    const dur = wt - t;

    events.push({
      t, dur, chords, wobble, emo, word: word.toLowerCase(),
      loud: 1 + MOD.bangLoud * bang,
    });
    t = wt + WORD_GAP * ts;
    if (/[!?]/.test(mods)) t += PAUSE_END * ts;
  }

  // amount 0 or volume 0 => no flair events at all (identical to a build without flair)
  // (the dialect only picks which sounds are favored; amount/length come from the sliders)
  if (flair > 0 && flairLevel > 0) {
    planFlairs(events, { rate: flair, maxWords: flairLen, level: flairLevel, weights: D.weights });
  }

  if (solo) { // keep only the stretch that has flair, shifted to start at ~0 (no silent lead-in)
    const spans = events.map((e, i) => e.flair && [i, i + e.flair.words.length - 1]).filter(Boolean);
    events = spans.length ? events.slice(spans[0][0], spans[spans.length - 1][1] + 1) : [];
    if (events.length) {
      const dt = events[0].t - 0.05;
      for (const e of events) {
        e.t -= dt;
        e.chords.forEach(c => { c.t -= dt; });
        if (e.flair) { e.flair.t -= dt; e.flair.starts = e.flair.starts.map(s => s - dt); }
      }
      t = events[events.length - 1].t + events[events.length - 1].dur;
    }
  }

  // group consecutive same-emotion events (tremolo/rumble/distortion apply per segment)
  const segments = [];
  for (const ev of events) {
    const last = segments[segments.length - 1];
    if (last && last.emo === ev.emo) { last.events.push(ev); last.end = ev.t + ev.dur; }
    else segments.push({ emo: ev.emo, start: ev.t, end: ev.t + ev.dur, events: [ev] });
  }

  return { events, segments, total: t + 0.6, solo, pf };
}
