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
- To add a layer: write a function in layers.js, register it in `PLAYERS`, add it to `LAYERS`.

## Determinism
Word → chord comes only from `fnv(word)` seeding `mulberry`. Changing `PENT`,
`BASE` or the planner changes every word's sound (saved board entries stay as
text, so they re-render with the new mapping).
