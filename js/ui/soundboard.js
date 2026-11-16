import { EMOTIONS } from '../config.js';

// Renders saved phrases as pads. Callbacks: onPlay(item), onRemove(index).
export function renderBoard(container, items, { onPlay, onRemove }) {
  container.innerHTML = '';
  items.forEach((it, i) => {
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
    const sp = it.speed && it.speed !== 1 ? ` · ${it.speed.toFixed(2)}×` : '';
    meta.textContent = (emo?.label ?? it.emo) + sp;

    play.append(text, meta);

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'pad-x';
    x.textContent = '×';
    x.setAttribute('aria-label', 'Remove');
    x.onclick = () => onRemove(i);

    pad.append(play, x);
    container.appendChild(pad);
  });
}
