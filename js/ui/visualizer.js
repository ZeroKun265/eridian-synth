// Live spectrum bars on a canvas; idles with a gentle shimmer.

import { getAnalyser } from '../core/player.js';

const N = 48;

export function mountVisualizer(canvas) {
  const g = canvas.getContext('2d');
  const levels = new Float32Array(N);
  let color = '#67e8f9';
  let buf = null, w = 0, h = 0, dpr = 1;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    w = canvas.width; h = canvas.height;
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const loop = now => {
    const an = getAnalyser();
    if (an) {
      if (!buf || buf.length !== an.frequencyBinCount) buf = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(buf);
    }
    g.clearRect(0, 0, w, h);
    g.shadowColor = color;
    g.shadowBlur = 10 * dpr;
    g.fillStyle = color;

    const slot = w / N, bw = slot * 0.6, mid = h / 2;
    for (let i = 0; i < N; i++) {
      let target = 0.04 + 0.025 * Math.sin(now / 500 + i * 0.5);
      if (an) {
        const bin = 1 + Math.floor((i / N) ** 1.4 * buf.length * 0.5);
        target = Math.max(target, buf[bin] / 255);
      }
      levels[i] = Math.max(target, levels[i] * 0.88);
      const bh = Math.max(3 * dpr, levels[i] * h * 0.95);
      g.globalAlpha = 0.35 + levels[i] * 0.65;
      g.beginPath();
      if (g.roundRect) g.roundRect(i * slot + (slot - bw) / 2, mid - bh / 2, bw, bh, bw / 2);
      else g.rect(i * slot + (slot - bw) / 2, mid - bh / 2, bw, bh);
      g.fill();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return { setColor: c => { color = c; } };
}
