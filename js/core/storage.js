// Soundboard persistence (localStorage, failure-tolerant).

import { STORAGE_KEY } from '../config.js';

export function loadBoard() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function saveBoard(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch { /* storage blocked/full: ignore */ }
}
