// Flair layers spanning several words: whistle, growl, grind (toothed rocks), rattle, chirp.
// Each takes (ctx, bus, noiseLoop, fl, fl): fl = {t, dur, loud, root, starts, emo, a, b, amp}
// from the planner; a / b (0..1, seeded) vary its parameters. To add a sound: write a function here, register it in PLAYERS,
// and add an entry to LAYERS in config.js.

import { stamp } from '../util/build.js';
stamp('layers', '0.13.0');

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// faded gain node feeding the bus
function envelope(ctx, bus, t0, t1, peak, att = 0.02, rel = 0.05) {
  const g = ctx.createGain();
  const a = Math.min(att, (t1 - t0) * 0.3);
  const r = Math.min(rel, (t1 - t0) * 0.3);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.setValueAtTime(peak, Math.max(t0 + a, t1 - r));
  g.gain.linearRampToValueAtTime(0, t1);
  g.connect(bus);
  return g;
}

function osc(ctx, type, f, t0, t1) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = f;
  o.start(t0); o.stop(t1 + 0.05);
  return o;
}

function noiseSrc(ctx, noiseLoop, t0, t1, offset) {
  const s = ctx.createBufferSource();
  s.buffer = noiseLoop; s.loop = true;
  s.start(t0, offset * noiseLoop.duration * 0.9); s.stop(t1 + 0.05);
  return s;
}

// square LFO driving a param (on/off "teeth")
function teeth(ctx, param, rate, depth, t0, t1) {
  const l = osc(ctx, 'square', rate, t0, t1);
  const d = ctx.createGain();
  d.gain.value = depth;
  l.connect(d); d.connect(param);
}

// high, slowly gliding sine with a little vibrato
function whistle(ctx, bus, _n, ev, { a, b, amp }) {
  const t0 = ev.t, t1 = ev.t + ev.dur;
  const f = clamp(ev.root * (3 + b * 2), 1100, 3800);
  const o = osc(ctx, 'sine', f, t0, t1);
  o.frequency.setValueAtTime(f, t0);
  o.frequency.linearRampToValueAtTime(f * (b < 0.5 ? 1.3 : 0.75), t1);
  const lfo = osc(ctx, 'sine', 5 + a * 3, t0, t1);
  const lg = ctx.createGain(); lg.gain.value = f * 0.015;
  lfo.connect(lg); lg.connect(o.frequency);
  o.connect(envelope(ctx, bus, t0, t1, amp * ev.loud, 0.1, 0.2));
}

// rough low buzz: saw -> lowpass, amplitude-modulated at ~30-60 Hz
function growl(ctx, bus, _n, ev, { a, b, amp }) {
  const t0 = ev.t, t1 = ev.t + ev.dur;
  const f = (55 + a * 45) * Math.sqrt(ev.emo.pitch);
  const o = osc(ctx, 'sawtooth', f, t0, t1);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 500 + b * 500; lp.Q.value = 2;
  const am = ctx.createGain(); am.gain.value = 0.55;
  teeth(ctx, am.gain, 28 + b * 30, 0.45, t0, t1);
  o.connect(lp); lp.connect(am);
  am.connect(envelope(ctx, bus, t0, t1, amp * ev.loud, 0.06, 0.12));
}

// two toothed rocks sliding over each other: resonant noise whose level is chopped by two
// square LFOs at slightly different rates (beating), with the filter sweeping up or down
function grind(ctx, bus, noiseLoop, ev, { a, b, amp }) {
  const t0 = ev.t, t1 = ev.t + ev.dur;
  const src = noiseSrc(ctx, noiseLoop, t0, t1, a);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 5;
  const f0 = 700 + a * 800;
  bp.frequency.setValueAtTime(f0, t0);
  bp.frequency.exponentialRampToValueAtTime(f0 * (b < 0.5 ? 1.7 : 0.6), t1);
  const chop = ctx.createGain(); chop.gain.value = 0.5;
  const rate = 26 + b * 22;
  teeth(ctx, chop.gain, rate, 0.3, t0, t1);
  teeth(ctx, chop.gain, rate * 1.31, 0.2, t0, t1);
  src.connect(bp); bp.connect(chop);
  chop.connect(envelope(ctx, bus, t0, t1, amp * ev.loud * 2.2, 0.08, 0.15));
}

// fast clicking: bright noise chopped at ~14-28 Hz
function rattle(ctx, bus, noiseLoop, ev, { a, b, amp }) {
  const t0 = ev.t, t1 = ev.t + ev.dur;
  const src = noiseSrc(ctx, noiseLoop, t0, t1, b);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 3500 + a * 2500; bp.Q.value = 1.5;
  const chop = ctx.createGain(); chop.gain.value = 0.5;
  teeth(ctx, chop.gain, 14 + a * 14, 0.5, t0, t1);
  src.connect(bp); bp.connect(chop);
  chop.connect(envelope(ctx, bus, t0, t1, amp * ev.loud * 2, 0.04, 0.1));
}

// quick sweep at the start of every word in the span
function chirp(ctx, bus, _n, ev, { a, b, amp }) {
  const f = clamp(ev.root * 2 * (1 + a), 400, 4000);
  for (const t0 of ev.starts) {
    const t1 = t0 + 0.09;
    const o = osc(ctx, 'sine', f, t0, t1);
    o.frequency.setValueAtTime(f, t0);
    o.frequency.exponentialRampToValueAtTime(clamp(f * (b < 0.5 ? 2 : 0.5), 200, 6000), t1);
    o.connect(envelope(ctx, bus, t0, t1, amp * ev.loud, 0.005, 0.03));
  }
}

const PLAYERS = { whistle, growl, grind, rattle, chirp };

export function playFlair(ctx, bus, noiseLoop, fl) {
  PLAYERS[fl.name]?.(ctx, bus, noiseLoop, fl, fl);
}
