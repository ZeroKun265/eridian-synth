import { EMOTIONS } from '../config.js';

// Renders colored emotion chips into `container`. Calls onChange(key) on selection.
export function mountEmotionPicker(container, initial, onChange) {
  for (const key in EMOTIONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (key === initial ? ' on' : '');
    b.style.setProperty('--c', EMOTIONS[key].color);
    b.append(document.createElement('i'), EMOTIONS[key].label);
    b.onclick = () => {
      [...container.children].forEach(c => c.classList.toggle('on', c === b));
      onChange(key);
    };
    container.appendChild(b);
  }
}
