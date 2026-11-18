import { DIALECTS } from '../config.js';
import { stamp } from '../util/build.js';
stamp('dialectPicker', '0.13.0');

// Chips for choosing a dialect (built-in and user-saved). Clicking a chip calls onSelect(key).
// render(selectedKey, modified) redraws all chips; the selected one gets a "*" when modified.
export function mountDialectPicker(container, onSelect) {
  function render(selected, modified) {
    container.innerHTML = '';
    for (const [key, D] of Object.entries(DIALECTS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (key === selected ? ' on' : '');
      b.title = D.desc;
      b.style.setProperty('--c', 'var(--accent)');
      b.textContent = D.label + (key === selected && modified ? '*' : '');
      b.onclick = () => onSelect(key);
      container.appendChild(b);
    }
  }
  return { render };
}
