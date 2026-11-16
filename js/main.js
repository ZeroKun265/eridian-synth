// Entry point: wires UI to core.

import { DEFAULT_EMOTION, EMOTIONS, SPEED_MIN, SPEED_MAX, SPEED_DEFAULT } from './config.js';
import { play, stop } from './core/player.js';
import { exportWav } from './core/wav.js';
import { loadBoard, saveBoard } from './core/storage.js';
import { mountEmotionPicker } from './ui/emotionPicker.js';
import { renderBoard } from './ui/soundboard.js';
import { mountVisualizer } from './ui/visualizer.js';

const $ = id => document.getElementById(id);
let emotion = DEFAULT_EMOTION;
let speed = SPEED_DEFAULT;
let board = loadBoard();

// accent color follows the selected emotion
const viz = mountVisualizer($('viz'));
function applyAccent(key) {
  const c = EMOTIONS[key].color;
  document.documentElement.style.setProperty('--accent', c);
  viz.setColor(c);
}
mountEmotionPicker($('emos'), emotion, k => { emotion = k; applyAccent(k); });
applyAccent(emotion);

// speed slider
const sp = $('speed');
sp.min = SPEED_MIN; sp.max = SPEED_MAX; sp.value = speed;
const showSpeed = () => {
  $('speedval').textContent = speed.toFixed(2) + '×';
  sp.style.setProperty('--fill', ((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN) * 100) + '%');
};
sp.oninput = () => { speed = +sp.value; showSpeed(); };
showSpeed();

// actions
const doPlay = () => play($('txt').value, emotion, speed);
$('play').onclick = doPlay;
$('stop').onclick = stop;
$('wav').onclick = () => exportWav($('txt').value, emotion, speed);

$('txt').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); doPlay(); }
});
// Esc stops from anywhere on the page, whichever element has focus
document.addEventListener('keydown', e => { if (e.key === 'Escape') stop(); });

// soundboard
function drawBoard() {
  renderBoard($('board'), board, {
    onPlay: it => play(it.text, it.emo, it.speed ?? 1),
    onRemove: i => { board.splice(i, 1); saveBoard(board); drawBoard(); },
  });
}

$('save').onclick = () => {
  const text = $('txt').value.trim();
  if (!text) return;
  board.push({ text, emo: emotion, speed });
  saveBoard(board);
  drawBoard();
};

drawBoard();
$('txt').focus();
$('txt').select();
