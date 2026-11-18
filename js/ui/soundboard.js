import { EMOTIONS } from '../config.js';
import { newId } from '../core/storage.js';
import { stamp } from '../util/build.js';
stamp('soundboard', '0.13.0');

// Tabs + pads. `board` = { tabs: [{id, name, pads}], active } is mutated in place;
// onChange(board) is called after every change (to persist), onPlay(pad) to play a pad.
// Tabs: click to open, drag (or ◀ ▶) to reorder, ✎ rename, 🗑 delete, ＋ new.
// Returns { render, current }.
export function mountSoundboard({ tabsEl, boardEl }, board, { onPlay, onChange }) {
  const current = () => board.tabs.find(t => t.id === board.active) ?? board.tabs[0];
  const change = () => { onChange(board); render(); };
  const taken = (name, except) =>
    board.tabs.some(t => t !== except && t.name.toLowerCase() === name.toLowerCase());

  function askName(def, except) {
    const name = (prompt('Tab name:', def) || '').trim().slice(0, 24);
    if (!name) return null;
    if (taken(name, except)) { alert(`A tab named "${name}" already exists.`); return null; }
    return name;
  }
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= board.tabs.length) return;
    board.tabs.splice(j, 0, board.tabs.splice(i, 1)[0]);
    change();
  };
  const mk = (cls, text, title, fn) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = text;
    if (title) { b.title = title; b.setAttribute('aria-label', title); }
    b.onclick = fn;
    return b;
  };

  function renderTabs() {
    tabsEl.innerHTML = '';
    let dragFrom = -1;
    board.tabs.forEach((t, i) => {
      const b = mk('tab' + (t.id === board.active ? ' on' : ''), t.name, null, () => { board.active = t.id; change(); });
      b.draggable = true;
      b.ondragstart = e => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; };
      b.ondragover = e => e.preventDefault();
      b.ondrop = e => {
        e.preventDefault();
        if (dragFrom >= 0 && dragFrom !== i) { board.tabs.splice(i, 0, board.tabs.splice(dragFrom, 1)[0]); change(); }
      };
      tabsEl.appendChild(b);
    });
    tabsEl.appendChild(mk('tab add', '＋', 'New tab', () => {
      const name = askName(`Tab ${board.tabs.length + 1}`);
      if (!name) return;
      const t = { id: newId(), name, pads: [] };
      board.tabs.push(t); board.active = t.id; change();
    }));
    const cur = current(), i = board.tabs.indexOf(cur);
    const tools = document.createElement('span');
    tools.className = 'tab-tools';
    tools.append(
      mk('tab-btn', '◀', 'Move tab left', () => move(i, -1)),
      mk('tab-btn', '▶', 'Move tab right', () => move(i, 1)),
      mk('tab-btn', '✎', 'Rename tab', () => { const n = askName(cur.name, cur); if (n) { cur.name = n; change(); } }),
      mk('tab-btn', '🗑', 'Delete tab', () => {
        if (board.tabs.length < 2) { alert('You need at least one tab.'); return; }
        if (cur.pads.length && !confirm(`Delete tab "${cur.name}" and its ${cur.pads.length} pads?`)) return;
        board.tabs.splice(i, 1); board.active = board.tabs[Math.max(0, i - 1)].id; change();
      }));
    tools.children[0].disabled = i === 0;
    tools.children[1].disabled = i === board.tabs.length - 1;
    tabsEl.appendChild(tools);
  }

  function renderPads() {
    boardEl.innerHTML = '';
    const pads = current().pads;
    pads.forEach((it, i) => {
      const emo = EMOTIONS[it.emo];
      const pad = document.createElement('div');
      pad.className = 'pad';
      pad.style.setProperty('--c', emo?.color ?? '#fff');

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'pad-play';
      play.onclick = () => onPlay(it);

      const text = document.createElement('span');
      text.className = 'pad-text';
      text.textContent = it.text;
      text.title = it.text;

      const meta = document.createElement('span');
      meta.className = 'pad-meta';
      const s = it.opts?.speed;
      meta.textContent = (emo?.label ?? it.emo) + (s && s !== 1 ? ` · ${s.toFixed(2)}×` : '');
      play.append(text, meta);

      const x = mk('pad-x', '×', 'Remove', () => { pads.splice(i, 1); change(); });
      pad.append(play, x);
      boardEl.appendChild(pad);
    });
  }

  function render() { board.active = current().id; renderTabs(); renderPads(); }
  render();
  return { render, current };
}
