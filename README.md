# Eridian Synth

Text → Eridian-style chords (Web Audio, no dependencies, fully static).

## Run locally
ES modules need http, not `file://`:

    python3 -m http.server 8000   # then open http://localhost:8000

## Deploy
Push to GitHub → Settings → Pages → branch `main`, root.

## Layout
    index.html            page shell
    css/style.css         styles
    js/main.js            entry; wires UI to core
    js/config.js          scale, base pitch, emotions, storage key (tune here)
    js/util/prng.js       fnv hash + seeded RNG (determinism)
    js/core/planner.js    text -> chord events (pure, no audio)
    js/core/synth.js      events -> Web Audio graph (live + offline)
    js/core/layers.js     extra sounds: whistle, growl, grind, rattle, chirp
    js/core/player.js     realtime play/stop
    js/core/wav.js        offline render + WAV export
    js/core/storage.js    soundboard localStorage
    js/ui/emotionPicker.js
    js/ui/soundboard.js
    js/ui/visualizer.js   live spectrum canvas (reads analyser from player.js)
    js/ui/knobs.js        sliders built from KNOBS in config.js (to add a knob: add it to KNOBS
                          and read it in plan(); settings persist and are saved with pads)

## Modifiers (after a word, stackable; limits/values in `MOD` in config.js)
    !  louder (+ small pitch lift)    ?  glide up    _  glide down
    *  longer                         ~  wobble
    e.g.  no***!!   hello_   what?   oh~~

## Tone tags (inline, change all following words; names/aliases in `EMOTIONS[...].tags`)
    [n] neutral  [h] happy  [s] sad  [vs]/[very sad]  [sc] scared  [e] excited  [a] angry
    e.g.  hello [vs] why [h] just kidding!
The emotion buttons set the starting tone. Tremolo/rumble/distortion apply per segment.

## Words as language
- Each word is split into syllables (`syllables()` in planner.js); each syllable plays its own
  chord, seeded by the syllable text. Longer words = longer chord sequences, and words sharing a
  syllable (amaze / amazing) share that chord. `?` `_` glides and `*` stretch hit the last syllable.
- Syllables: vowel groups (Latin incl. accents, Cyrillic, Greek); other scripts are cut every
  3 letters. Only used to build chords, so it needs to be consistent, not linguistically perfect.
- Flair (js/core/layers.js): occasionally a word starts an extra layer (whistle, growl, grind =
  two toothed rocks, rattle, chirp) that runs over the next 2-4 words, then a cooldown. Start,
  layer and length come from the word's text; emotions reweight which layer (`bias` in config.js).
  Tune `FLAIR` (rate, span, cooldown), `LAYERS` (weights, levels), `SYLLABLE` (timing).
- Dialects (`DIALECTS` in config.js): presets. Picking one moves the Flair amount/length sliders to
  its values and selects which sounds it favors. Proper = amount 0. A "*" after the name means the
  sliders were moved off its values (click the chip to restore). "Save as dialect…" stores your own
  (kept in localStorage, inherits the sounds of the dialect it was made from). Every slider has a
  ↺ button (flair amount/length: back to the dialect's value).
- Stale-cache guard: modules call `stamp(name, version)`; main.js shows a red banner if a stamp
  differs from `VERSION`. On release update both: `grep -rn "stamp('" js`.
- To add a layer: write a function in layers.js, register it in `PLAYERS`, add it to `LAYERS`.

## Determinism
Word → chord comes only from `fnv(word)` seeding `mulberry`. Changing `PENT`,
`BASE` or the planner changes every word's sound (saved board entries stay as
text, so they re-render with the new mapping).

## Voice vs. dialect (v0.12)
- **Voice** panel: Speed (1.00× default; range 0.5–4×) and Pitch. Not part of any dialect.
- **Dialect & flair** panel: dialect chips + flair sliders. Each panel has its own reset.
- `TEMPO` in `js/config.js` sets what 1× means; `HUM` sets Happy's background pad (freq ratio, level).
- Pads saved before v0.12 are converted automatically (speed ÷ 0.75).

## Soundboard tabs, import/export, clearing (v0.13)
- Board = tabs of pads (`js/ui/soundboard.js`, data shape in `js/core/storage.js`). Reorder tabs by drag or ◀ ▶.
- `js/core/backup.js`: soundboard / dialects files (JSON). Imports always merge: same-named tab = written into,
  identical pad (text + tone + settings) = overwritten, same-named dialect = imported one wins.
- Soundboard files carry the custom dialects their pads use, so pads sound the same elsewhere.
- "Data" card: clear soundboard / custom dialects / everything.
- Attack click level: `CLICK` in config.js.
