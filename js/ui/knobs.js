import { KNOBS, defaultOpts, knobDefault } from '../config.js';
import { stamp } from '../util/build.js';
stamp('knobs', '0.12.1');

// Builds one slider row per entry in KNOBS (label, slider, value, and a ↺ button that goes back to
// that slider's default; for flair amount/length the default is the current dialect's preset).
// Rows go into containerFor(K.group) ('voice' or 'flair').
// `opts` is mutated in place; onChange(opts) is called after every change.
// Returns { reset(group?) (defaults for one group, or everything), refresh() (re-read opts) }.
export function mountKnobs(containerFor, opts, onChange) {
  const rows = {};
  const same = (a, b) => Math.abs(a - b) < 1e-9;

  const sync = k => {
    const K = KNOBS[k], r = rows[k];
    r.input.value = opts[k];
    r.val.textContent = K.fmt(opts[k]);
    r.input.style.setProperty('--fill', ((opts[k] - K.min) / (K.max - K.min) * 100) + '%');
    r.reset.disabled = same(opts[k], knobDefault(k, opts.dialect));
  };
  const refresh = () => Object.keys(KNOBS).forEach(sync);

  for (const [k, K] of Object.entries(KNOBS)) {
    const row = document.createElement('div');
    row.className = 'knob';

    const label = document.createElement('label');
    label.textContent = K.label;
    label.htmlFor = 'knob-' + k;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = 'knob-' + k;
    input.min = K.min; input.max = K.max; input.step = K.step;

    const val = document.createElement('span');
    val.className = 'knob-val';

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'knob-reset';
    reset.textContent = '↺';
    reset.title = 'Back to default';
    reset.setAttribute('aria-label', `Reset ${K.label}`);

    rows[k] = { input, val, reset };
    input.oninput = () => { opts[k] = +input.value; sync(k); onChange(opts); };
    reset.onclick = () => { opts[k] = knobDefault(k, opts.dialect); sync(k); onChange(opts); };

    row.append(label, input, val, reset);
    containerFor(K.group).appendChild(row);
    sync(k);
  }

  return {
    reset(group) { // the flair group also owns the dialect
      const d = defaultOpts();
      for (const [k, K] of Object.entries(KNOBS)) if (!group || K.group === group) opts[k] = d[k];
      if (!group || group === 'flair') opts.dialect = d.dialect;
      refresh();
      onChange(opts);
    },
    refresh,
  };
}
