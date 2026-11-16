// Plan -> Web Audio graph. Works with both AudioContext and OfflineAudioContext.
// Each emotion segment gets its own bus (tremolo / distortion / rumble are per segment).

import { mulberry } from '../util/prng.js';
import { MOD, BASE } from '../config.js';
import { playFlair } from './layers.js';

// `tap` (optional AnalyserNode etc.) also receives the final mix, for visualization.
export function render(ctx, plan, tap = null) {
  const out = makeMaster(ctx, tap);
  const noise = makeNoise(ctx);
  const noiseLoop = makeNoiseLoop(ctx);
  for (const seg of plan.segments) {
    const { bus, head } = makeSegmentBus(ctx, out, seg);
    if (seg.emo.rumble) addRumble(ctx, head, seg);
    for (const ev of seg.events) {
      for (const chord of ev.chords) playChord(ctx, bus, noise, chord, ev);
      if (ev.flair) playFlair(ctx, bus, noiseLoop, ev.flair);
    }
  }
}

// 1 s of seeded noise, looped by the grind / rattle layers
function makeNoiseLoop(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const rnd = mulberry(777);
  for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
  return buf;
}

// Limiter-style compressor (high threshold) so loudness differences (!) survive.
function makeMaster(ctx, tap) {
  const out = ctx.createDynamicsCompressor();
  out.threshold.value = -2; out.knee.value = 3; out.ratio.value = 20;
  out.attack.value = 0.002; out.release.value = 0.1;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  out.connect(master); master.connect(ctx.destination);
  if (tap) master.connect(tap);
  return out;
}

// bus (gain, optional tremolo) -> [waveshaper] -> out
function makeSegmentBus(ctx, out, seg) {
  const { emo } = seg;
  let head = out;

  if (emo.dist) {
    const ws = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 512 - 1) * 6);
    ws.curve = curve;
    const trim = ctx.createGain(); // distortion saturates to full scale, so pull the level back
    trim.gain.value = 0.33;
    ws.connect(trim); trim.connect(out);
    head = ws;
  }

  const bus = ctx.createGain();
  bus.connect(head);
  if (emo.trem) {
    bus.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = emo.trem;
    depth.gain.value = 0.4;
    lfo.connect(depth); depth.connect(bus.gain);
    lfo.start(seg.start); lfo.stop(seg.end + 0.1);
  } else {
    bus.gain.value = 1;
  }
  return { bus, head };
}

function addRumble(ctx, head, seg) {
  const a = seg.start, b = seg.end + 0.3;
  const up = Math.min(0.3, (b - a) * 0.3);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, a);
  g.gain.linearRampToValueAtTime(1, a + up);
  g.gain.setValueAtTime(1, Math.max(a + up, b - 0.4));
  g.gain.linearRampToValueAtTime(0, b);
  g.connect(head);
  // warm pad on root / fifth / octave, tracking the emotion's pitch.
  // Kept above sub-bass so it is still audible on laptop and phone speakers.
  [[0.5, 0.14], [0.75, 0.09], [1, 0.07]].forEach(([ratio, amp]) => {
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = BASE * seg.emo.pitch * ratio;
    og.gain.value = amp;
    o.connect(og); og.connect(g);
    o.start(a); o.stop(b);
  });
}

// Seeded noise burst -> deterministic rattle at each note attack.
function makeNoise(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05 | 0, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const rnd = mulberry(1234);
  for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
  return buf;
}

// one syllable chord (`ev` is the word it belongs to: loudness, wobble)
function playChord(ctx, bus, noise, chord, ev) {
  const peak = 0.28 * ev.loud / Math.sqrt(chord.notes.length);
  const end = chord.t + chord.dur;
  const stagger = Math.min(0.025, chord.dur * 0.15);
  chord.notes.forEach((f, k) =>
    playNote(ctx, bus, noise, f, chord.t + k * stagger, end, peak, chord.glide, ev.wobble));
}

function playNote(ctx, bus, noise, f, t, end, peak, glide, wobble) {
  // amplitude envelope
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  const att = Math.min(0.02, (end - t) * 0.25);
  const sus = Math.max(t + att + 0.001, end - 0.1);
  env.gain.linearRampToValueAtTime(peak, t + att);
  env.gain.linearRampToValueAtTime(peak * 0.8, sus);
  env.gain.exponentialRampToValueAtTime(0.001, end);
  env.connect(bus);

  // bandpass for the whistly body
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(Math.max(f * 4, 400), 5000);
  bp.Q.value = 0.5;
  bp.connect(env);

  // detuned pair of carriers, one FM-modulated
  const car = ctx.createOscillator(); car.type = 'triangle';
  const car2 = ctx.createOscillator(); car2.type = 'sine'; car2.detune.value = 8;
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  mod.frequency.value = f * 2.01;
  modGain.gain.value = f * 0.4;
  mod.connect(modGain); modGain.connect(car.frequency);

  for (const o of [car, car2]) {
    o.frequency.setValueAtTime(f, t);
    if (glide !== 1) o.frequency.linearRampToValueAtTime(f * glide, end);
    o.connect(env); o.connect(bp);
    o.start(t); o.stop(end + 0.05);
  }
  mod.start(t); mod.stop(end + 0.05);

  // wobble (vibrato) from ~ modifier
  if (wobble) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = MOD.wobbleHz;
    depth.gain.value = f * MOD.wobbleDepth * wobble;
    lfo.connect(depth); depth.connect(car.frequency); depth.connect(car2.frequency);
    lfo.start(t); lfo.stop(end + 0.05);
  }

  // attack rattle
  const ns = ctx.createBufferSource(); ns.buffer = noise;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
  const ng = ctx.createGain(); ng.gain.value = 0.6 * peak;
  ns.connect(hp); hp.connect(ng); ng.connect(bus);
  ns.start(t);
}
