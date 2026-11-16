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

// Timing. All durations/gaps are multiplied by emotion.speed * TEMPO / userSpeed.
export const TEMPO = 0.6;        // global time scale (lower = faster)
export const WORD_GAP = 0.015;   // silence between words (s, before scaling)
export const PAUSE = { ',': 0.06, ';': 0.08, ':': 0.08 };
export const PAUSE_END = 0.14;   // . ! ?
export const SPEED_MIN = 0.5, SPEED_MAX = 3, SPEED_DEFAULT = 1; // speech-speed slider

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
//   p: chance that a given word starts one (decided by the word's text, so it is repeatable)
//   minWords/maxWords: how many words it spans   cooldown: words skipped afterwards
export const FLAIR = { p: 0.09, minWords: 2, maxWords: 4, cooldown: 2 };

// The flair sounds. weight: how often it is picked (x EMOTIONS[...].bias)   amp: level
// whistle = high gliding tone   growl = rough low buzz   grind = two toothed rocks scraping
// rattle = fast clicking        chirp = short sweep on each word
export const LAYERS = {
  whistle: { weight: 3, amp: 0.09 },
  growl:   { weight: 2, amp: 0.18 },
  grind:   { weight: 2, amp: 0.40 }, // noise is filtered hard, so it needs a high amp
  rattle:  { weight: 2, amp: 0.18 },
  chirp:   { weight: 2, amp: 0.14 },
};

export const STORAGE_KEY = 'eridian-board';
