// Cache-mismatch guard. Each module stamps the build it belongs to; main.js compares the stamps
// with VERSION (config.js) and shows a warning if they differ, which means the browser is mixing
// cached old files with new ones (fix: hard-reload, Ctrl+Shift+R). When releasing, update VERSION
// and the stamp(...) lines together:  grep -rn "stamp('" js
export const stamps = {};
export const stamp = (name, v) => { stamps[name] = v; };
