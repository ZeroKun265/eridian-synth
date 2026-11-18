// All tunable constants live here.

// Scale: semitone offsets. Each chord note picks from 2 octaves of this.
export const PENT = [0, 2, 4, 7, 9];
export const BASE = 196; // root frequency (Hz)

// Emotion modifiers.
//   pitch: frequency multiplier   speed: time multiplier (higher = slower)
//   trem: tremolo rate (Hz)       rumble: warm low pad underneath, lilt: upward glide on every word   dist: waveshaper distortion
//   tags: names usable inline in text, e.g. [happy] or [h]
//   color: UI accent for this emotion
//   bias: multipliers on LAYERS[...].weight (which flair sounds this emotion favors)
export const EMOTIONS = {
  neutral: { label: 'Neutral',   pitch: 1,    speed: 1,    tags: ['neutral', 'n'], color: '#67e8f9' },
  happy:   { label: 'Happy',     pitch: 1.26, speed: 0.85, rumble: 1, lilt: 1.07, bias: { whistle: 2.2, chirp: 2 }, tags: ['happy', 'h'], color: '#fbbf24' },
  sad:     { label: 'Sad',       pitch: 0.5,  speed: 1.4,  bias: { growl: 1.6 }, tags: ['sad', 's'], color: '#818cf8' },
  vsad:    { label: 'Very sad',  pitch: 0.25, speed: 1.8,  bias: { growl: 2.2 }, tags: ['very sad', 'verysad', 'vs'], color: '#a78bfa' },
  scared:  { label: 'Scared',    pitch: 1,    speed: 0.85, trem: 10, bias: { rattle: 2.5, whistle: 1.8 }, tags: ['scared', 'sc'], color: '#34d399' },
  excited: { label: 'Excited',   pitch: 2,    speed: 0.7,  bias: { chirp: 2.5, whistle: 1.6, rattle: 1.5 }, tags: ['excited', 'e'], color: '#fb7185' },
  angry:   { label: 'Angry',     pitch: 0.75, speed: 0.9,  dist: 1, bias: { growl: 3, grind: 3 }, tags: ['angry', 'a'], color: '#ef4444' },
};
export const DEFAULT_EMOTION = 'neutral';

// tag text -> emotion key (built from the tags above)
export const EMOTION_TAGS = {};
for (const [key, e] of Object.entries(EMOTIONS)) for (const t of e.tags) EMOTION_TAGS[t] = key;

// Background pad of the Happy tone: [frequency ratio to the tone's base pitch, level].
// Was [[0.5, 0.14], [0.75, 0.09], [1, 0.07]]; now half the frequency and about half as loud
// (-10 dB = half the perceived loudness).
// Level of the short noise tick at each syllable attack, relative to the chord's peak (0 = none).
export const CLICK = 0.25;

export const HUM = [[0.25, 0.044], [0.375, 0.028], [0.5, 0.022]];

// Timing. All durations/gaps are multiplied by emotion.speed * TEMPO / userSpeed.
export const TEMPO = 0.8;        // global time scale (lower = faster); 0.8 = the pace once shown as 0.75x
export const WORD_GAP = 0.015;   // silence between words (s, before scaling)
export const PAUSE = { ',': 0.06, ';': 0.08, ':': 0.08 };
export const PAUSE_END = 0.14;   // . ! ?
export const SPEED_MIN = 0.5, SPEED_MAX = 4, SPEED_DEFAULT = 1; // speech-speed slider

// Word modifiers (typed right after a word, stackable):
//   !  louder (+ slight pitch lift)   ?  glide up      _  glide down
//   *  stretch longer                 ~  wobble (vibrato)
export const MOD = {
  maxBang: 3, bangLoud: 1, bangLift: 0.03,   // loudness = 1 + bangLoud * count
  maxGlide: 3, askGlide: 1.19, downGlide: 0.84, // per-symbol frequency ratio
  maxStars: 8, starStretch: 0.8,             // duration x (1 + starStretch * count)
  maxWobble: 3, wobbleHz: 6.5, wobbleDepth: 0.02, // fraction of pitch per level
};

// Words are split into syllables; each syllable gets its own chord (seeded by the syllable text,
// so words sharing a syllable share that chord: a language-like feel). Long words = chord sequences.
export const SYLLABLE = {
  max: 5,            // syllables beyond this are merged into the last one
  dur: 0.17,         // base syllable length (s, before time scale)
  perLetter: 0.03,   // extra length per letter (up to 4 letters)
};

// Flair = occasional extra sound layer that starts on a word and runs over the next few words.
// The "Flair amount" slider (0..1) scales how often it starts and how short the gap after it is:
//   chance per word = amount * maxP (decided by the word's text, so it is repeatable)
//   gap after a flair = cooldown * (1 - amount) words     rate: default amount
//   span = minFrac*maxWords .. maxWords words (maxWords is the "Flair length" slider)
export const FLAIR = { rate: 0.07, maxP: 0.5, minFrac: 0.5, maxWords: 4, cooldown: 4 };

// The flair sounds. weight: how often it is picked (x EMOTIONS[...].bias)   amp: level
// whistle = high gliding tone   growl = rough low buzz   grind = two toothed rocks scraping
// rattle = fast clicking        chirp = short sweep on each word
export const LAYERS = {
  // amps are set so each flair adds ~0.6x the chords' RMS at 100% volume (grind is noise that is
  // filtered hard, hence the big number)
  whistle: { weight: 3, amp: 0.17 },
  growl:   { weight: 2, amp: 0.36 },
  grind:   { weight: 2, amp: 1.45 },
  rattle:  { weight: 2, amp: 0.40 },
  chirp:   { weight: 2, amp: 0.32 },
};

// Dialects: how much, and what kind of, flair a speaker uses. Picking one moves the Flair amount
// and Flair length sliders to its values (you can tweak them afterwards) and selects its sounds.
//   flair: Flair amount slider value (0 = no flair at all)   flairLen: Flair length slider value
//   weights: multipliers on LAYERS[...].weight (which sounds it favors)
export const DIALECTS = {
  proper: { label: 'Proper', desc: 'Clean chords, no flair at all.', flair: 0, flairLen: 4 },
  common: { label: 'Common', desc: 'A bit of everything, used sparingly.', flair: 0.07, flairLen: 4 },
  airy:   { label: 'Airy',   desc: 'Whistles and chirps.', flair: 0.1, flairLen: 4,
            weights: { whistle: 4, chirp: 3, growl: 0.2, grind: 0.2, rattle: 0.5 } },
  rocky:  { label: 'Rocky',  desc: 'Growls and stone grinding.', flair: 0.1, flairLen: 4,
            weights: { growl: 3, grind: 5, whistle: 0.3, chirp: 0.3 } },
  chatty: { label: 'Chatty', desc: 'Frequent rattles and chirps, short bursts.', flair: 0.18, flairLen: 3,
            weights: { rattle: 4, chirp: 4, whistle: 1, growl: 0.3, grind: 0.3 } },
  wild:   { label: 'Wild',   desc: 'Flair everywhere, long runs.', flair: 0.28, flairLen: 5 },
};
export const DEFAULT_DIALECT = 'common';

// Sliders in the UI (built by ui/knobs.js). The key is the option name passed to plan().
//   def: default   fmt: how the value is displayed   group: which panel it is shown in
//   ('voice' = speed/pitch, independent of the dialect; 'flair' = dialect & flair)
const pct = v => +(v * 100).toFixed(1) + '%';
export const KNOBS = {
  speed:      { group: 'voice', label: 'Speed',        min: SPEED_MIN, max: SPEED_MAX, step: 0.05, def: SPEED_DEFAULT, fmt: v => v.toFixed(2) + '×' },
  pitch:      { group: 'voice', label: 'Pitch',        min: -12, max: 12, step: 1, def: 0, fmt: v => (v > 0 ? '+' : '') + v + ' st' },
  flair:      { group: 'flair', label: 'Flair amount', min: 0, max: 1, step: 0.01, def: FLAIR.rate, fmt: pct },
  flairLen:   { group: 'flair', label: 'Flair length', min: 1, max: 8, step: 1, def: FLAIR.maxWords, fmt: v => v + (v === 1 ? ' word' : ' words') },
  flairLevel: { group: 'flair', label: 'Flair volume', min: 0, max: 3, step: 0.05, def: 1, fmt: pct },
};
export const defaultOpts = () => ({
  ...Object.fromEntries(Object.entries(KNOBS).map(([k, v]) => [k, v.def])),
  dialect: DEFAULT_DIALECT,
});
// default of one slider: the dialect's preset if it has one, else the global default
export const knobDefault = (k, dialect) => DIALECTS[dialect]?.[k] ?? KNOBS[k].def;

// Shown in the page footer. If it does not match the zip you just deployed, the browser is
// serving cached files: hard-reload (Ctrl+Shift+R).
export const VERSION = '0.13.0';

export const STORAGE_KEY = 'eridian-board';
export const SETTINGS_KEY = 'eridian-settings-3'; // bumped when the speed scale changed
export const DIALECTS_KEY = 'eridian-dialects';    // user-saved dialects
