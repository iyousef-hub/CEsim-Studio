/* CEsim Diagram — more shapes: basic, arrows, 3D, neural networks, data structures, charts, icons, BPMN, control, electronics, math, UML and network.
   Also the registry for the user's own shapes. */
(function () {
  const S = window.CED_SHAPES;
  const r = (x, y, w, h, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" rx="${rx}" ${extra}/>`;
  const e = (cx, cy, rx, ry, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(0, rx)}" ry="${Math.max(0, ry)}" ${extra}/>`;
  const p = (d, extra = '') => `<path d="${d}" ${extra}/>`;
  const l = (x1, y1, x2, y2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" fill="none" ${extra}/>`;
  const pl = (pts, extra = '') => `<polyline points="${pts}" fill="none" ${extra}/>`;
  const pg = (pts, extra = '') => `<polygon points="${pts}" ${extra}/>`;
  const tx = (x, y, s, size = 10, anchor = 'middle', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}"${/\bfill=/.test(extra) ? '' : ' fill="currentColor"'} stroke="none"${/font-family=/.test(extra) ? '' : ' font-family="IBM Plex Sans, Arial, sans-serif"'} ${extra}>${s}</text>`;
  const NF = 'fill="none"', CF = 'fill="currentColor"';
  const DARK = 'fill="#000" fill-opacity="0.14" stroke="none"', LIGHT = 'fill="#fff" fill-opacity="0.35" stroke="none"';
  const add = (cat, key, name, w, h, draw, opt = {}) => { S[key] = Object.assign({ cat, key, name, w, h, draw }, opt); };
  const below = (w, h) => [-50, h + 4, w + 100, 34];
  const poly = (n, w, h, rot = -90) => { let s = ''; for (let i = 0; i < n; i++) { const a = (rot + i * 360 / n) * Math.PI / 180; s += `${(w / 2 + Math.cos(a) * w / 2).toFixed(2)},${(h / 2 + Math.sin(a) * h / 2).toFixed(2)} ` } return s };
  const star = (n, w, h, k) => { let s = ''; for (let i = 0; i < 2 * n; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? k : 1; s += `${(w / 2 + Math.cos(a) * w / 2 * rr).toFixed(2)},${(h / 2 + Math.sin(a) * h / 2 * rr).toFixed(2)} ` } return s };
  const nums = (o, def) => String(o.text == null || o.text === '' ? def : o.text).split(/[,;\s|]+/).map(Number).filter(v => isFinite(v));
  // icons are drawn on a 24×24 grid with strokes that do not scale
  const icon = (d, extra = '') => (w, h) => `<g transform="scale(${w / 24},${h / 24})" fill="none" stroke-linecap="round" stroke-linejoin="round">${d.split('|').map(x => x.startsWith('<') ? x.replace('/>', ' vector-effect="non-scaling-stroke"/>') : `<path d="${x}" vector-effect="non-scaling-stroke"/>`).join('')}</g>${extra}`;
  const ICON = { labelBelow: 1, tb: below, st: { fill: 'none', sw: 1.8 } };

  /* ---------- Basic ---------- */
  add('Basic', 'pentagon', 'Pentagon', 90, 86, (w, h) => pg(poly(5, w, h)));
  add('Basic', 'heptagon', 'Heptagon', 90, 88, (w, h) => pg(poly(7, w, h)));
  add('Basic', 'octagon', 'Octagon', 90, 90, (w, h) => pg(poly(8, w, h, -67.5)));
  add('Basic', 'rtriangle', 'Right triangle', 90, 80, (w, h) => pg(`0,0 0,${h} ${w},${h}`), { tb: (w, h) => [4, h * .45, w * .55, h * .5] });
  add('Basic', 'cross', 'Cross', 80, 80, (w, h) => { const a = w / 3, b = h / 3; return pg(`${a},0 ${2 * a},0 ${2 * a},${b} ${w},${b} ${w},${2 * b} ${2 * a},${2 * b} ${2 * a},${h} ${a},${h} ${a},${2 * b} 0,${2 * b} 0,${b} ${a},${b}`) });
  add('Basic', 'xshape', 'X mark', 70, 70, (w, h) => { const k = Math.min(w, h) * .18; return pg(`${k},0 ${w / 2},${h / 2 - k} ${w - k},0 ${w},${k} ${w / 2 + k},${h / 2} ${w},${h - k} ${w - k},${h} ${w / 2},${h / 2 + k} ${k},${h} 0,${h - k} ${w / 2 - k},${h / 2} 0,${k}`) }, { notext: 1 });
  add('Basic', 'frame', 'Frame', 120, 80, (w, h) => { const k = Math.min(w, h) * .14; return p(`M0,0 H${w} V${h} H0 Z M${k},${k} V${h - k} H${w - k} V${k} Z`, 'fill-rule="evenodd"') });
  add('Basic', 'lshape', 'L-shape', 100, 100, (w, h) => pg(`0,0 ${w * .4},0 ${w * .4},${h * .6} ${w},${h * .6} ${w},${h} 0,${h}`), { tb: (w, h) => [0, h * .6, w, h * .4] });
  add('Basic', 'donut', 'Ring', 90, 90, (w, h) => p(`M0,${h / 2} A${w / 2},${h / 2} 0 1 1 ${w},${h / 2} A${w / 2},${h / 2} 0 1 1 0,${h / 2} Z M${w * .25},${h / 2} A${w / 4},${h / 4} 0 1 0 ${w * .75},${h / 2} A${w / 4},${h / 4} 0 1 0 ${w * .25},${h / 2} Z`, 'fill-rule="evenodd"'));
  add('Basic', 'pie3q', 'Pie', 90, 90, (w, h) => p(`M${w / 2},${h / 2} L${w / 2},0 A${w / 2},${h / 2} 0 1 1 0,${h / 2} Z`));
  add('Basic', 'halfcircle', 'Half circle', 100, 50, (w, h) => p(`M0,${h} A${w / 2},${h} 0 0 1 ${w},${h} Z`), { tb: (w, h) => [w * .15, h * .3, w * .7, h * .7] });
  add('Basic', 'arc', 'Arc', 100, 60, (w, h) => p(`M0,${h} A${w / 2},${h} 0 0 1 ${w},${h}`, NF), { notext: 1 });
  add('Basic', 'chevron', 'Chevron', 120, 60, (w, h) => { const k = Math.min(w * .3, h * .5); return pg(`0,0 ${w - k},0 ${w},${h / 2} ${w - k},${h} 0,${h} ${k},${h / 2}`) }, { tb: (w, h) => [w * .2, 0, w * .6, h] });
  add('Basic', 'step', 'Step', 120, 60, (w, h) => { const k = Math.min(w * .25, h * .5); return pg(`0,0 ${w - k},0 ${w},${h / 2} ${w - k},${h} 0,${h}`) });
  add('Basic', 'card', 'Card', 110, 70, (w, h) => { const k = Math.min(w, h) * .22; return pg(`${k},0 ${w},0 ${w},${h} 0,${h} 0,${k}`) });
  add('Basic', 'cutcorners', 'Cut corners', 120, 70, (w, h) => { const k = Math.min(w, h) * .18; return pg(`${k},0 ${w - k},0 ${w},${k} ${w},${h - k} ${w - k},${h} ${k},${h} 0,${h - k} 0,${k}`) });
  add('Basic', 'tape', 'Tape', 120, 60, (w, h) => { const k = h * .12; return p(`M0,${k} Q${w / 4},${-k} ${w / 2},${k} T${w},${k} V${h - k} Q${w * .75},${h + k} ${w / 2},${h - k} T0,${h - k} Z`) });
  add('Basic', 'plaque', 'Plaque', 120, 60, (w, h) => { const k = Math.min(w, h) * .18; return p(`M${k},0 H${w - k} A${k},${k} 0 0 0 ${w},${k} V${h - k} A${k},${k} 0 0 0 ${w - k},${h} H${k} A${k},${k} 0 0 0 0,${h - k} V${k} A${k},${k} 0 0 0 ${k},0 Z`) });
  add('Basic', 'tag', 'Tag', 120, 50, (w, h) => { const k = Math.min(w * .25, h * .5); return p(`M${k},0 H${w} V${h} H${k} L0,${h / 2} Z`) + e(k * .8, h / 2, 3, 3, CF) }, { tb: (w, h) => [w * .22, 0, w * .76, h] });
  add('Basic', 'heart', 'Heart', 90, 80, (w, h) => p(`M${w / 2},${h} C${w * .1},${h * .7} 0,${h * .45} 0,${h * .28} C0,${h * .1} ${w * .15},0 ${w * .28},0 C${w * .4},0 ${w * .48},${h * .1} ${w / 2},${h * .2} C${w * .52},${h * .1} ${w * .6},0 ${w * .72},0 C${w * .85},0 ${w},${h * .1} ${w},${h * .28} C${w},${h * .45} ${w * .9},${h * .7} ${w / 2},${h} Z`), { tb: (w, h) => [w * .2, h * .15, w * .6, h * .5] });
  add('Basic', 'moon', 'Moon', 70, 80, (w, h) => p(`M${w * .75},0 A${w * .75},${h / 2} 0 1 0 ${w * .75},${h} A${w * .5},${h * .5} 0 1 1 ${w * .75},0 Z`), { notext: 1 });
  add('Basic', 'sun', 'Sun', 80, 80, (w, h) => { let s = e(w / 2, h / 2, w * .25, h * .25); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += l(w / 2 + Math.cos(a) * w * .33, h / 2 + Math.sin(a) * h * .33, w / 2 + Math.cos(a) * w * .48, h / 2 + Math.sin(a) * h * .48) } return s }, { notext: 1 });
  add('Basic', 'lightning', 'Lightning', 60, 90, (w, h) => pg(`${w * .55},0 0,${h * .55} ${w * .45},${h * .55} ${w * .3},${h} ${w},${h * .4} ${w * .55},${h * .4} ${w * .75},0`), { notext: 1 });
  add('Basic', 'teardrop', 'Teardrop', 70, 90, (w, h) => p(`M${w / 2},0 C${w / 2},0 ${w},${h * .45} ${w},${h * .65} A${w / 2},${h * .35} 0 0 1 0,${h * .65} C0,${h * .45} ${w / 2},0 ${w / 2},0 Z`), { tb: (w, h) => [w * .15, h * .45, w * .7, h * .45] });
  add('Basic', 'star4', 'Star (4 points)', 80, 80, (w, h) => pg(star(4, w, h, .38)), { notext: 1 });
  add('Basic', 'star6', 'Star (6 points)', 80, 80, (w, h) => pg(star(6, w, h, .55)), { tb: (w, h) => [w * .25, h * .3, w * .5, h * .4] });
  add('Basic', 'burst', 'Burst', 110, 110, (w, h) => pg(star(12, w, h, .78)), { tb: (w, h) => [w * .2, h * .25, w * .6, h * .5] });
  add('Basic', 'bracel', 'Brace left', 24, 100, (w, h) => p(`M${w},0 Q${w * .3},0 ${w * .3},${h * .2} V${h * .4} Q${w * .3},${h / 2} 0,${h / 2} Q${w * .3},${h / 2} ${w * .3},${h * .6} V${h * .8} Q${w * .3},${h} ${w},${h}`, NF), { notext: 1 });
  add('Basic', 'bracer', 'Brace right', 24, 100, (w, h) => p(`M0,0 Q${w * .7},0 ${w * .7},${h * .2} V${h * .4} Q${w * .7},${h / 2} ${w},${h / 2} Q${w * .7},${h / 2} ${w * .7},${h * .6} V${h * .8} Q${w * .7},${h} 0,${h}`, NF), { notext: 1 });
  add('Basic', 'bracket', 'Bracket', 20, 100, (w, h) => pl(`${w},0 0,0 0,${h} ${w},${h}`), { notext: 1 });
  add('Basic', 'rcallout', 'Round callout', 130, 90, (w, h) => p(`M${w * .5},0 A${w / 2},${h * .4} 0 1 1 ${w * .35},${h * .78} L${w * .15},${h} L${w * .22},${h * .7} A${w / 2},${h * .4} 0 0 1 ${w * .5},0 Z`), { tb: (w, h) => [w * .12, h * .1, w * .76, h * .6] });
  add('Basic', 'thoughtbubble', 'Thought bubble', 140, 100, (w, h) => p(`M${w * .25},${h * .7} C${w * .02},${h * .72} ${w * .02},${h * .35} ${w * .22},${h * .32} C${w * .2},${h * .05} ${w * .52},0 ${w * .6},${h * .2} C${w * .72},${h * .05} ${w * .95},${h * .15} ${w * .88},${h * .38} C${w * 1.02},${h * .48} ${w * .98},${h * .75} ${w * .76},${h * .7} Z`) + e(w * .2, h * .84, w * .05, h * .05) + e(w * .1, h * .95, w * .03, h * .03), { tb: (w, h) => [w * .15, h * .2, w * .7, h * .45] });

  /* ---------- Arrows ---------- */
  const arr = (w, h, k, t) => pg(`0,${h * t} ${w - k},${h * t} ${w - k},0 ${w},${h / 2} ${w - k},${h} ${w - k},${h * (1 - t)} 0,${h * (1 - t)}`);
  add('Arrows', 'arrowr', 'Arrow right', 120, 60, (w, h) => arr(w, h, Math.min(w * .4, h * .8), .28), { tb: (w, h) => [2, h * .28, w * .65, h * .44] });
  add('Arrows', 'arrowl', 'Arrow left', 120, 60, (w, h) => `<g transform="translate(${w},0) scale(-1,1)">${arr(w, h, Math.min(w * .4, h * .8), .28)}</g>`, { tb: (w, h) => [w * .33, h * .28, w * .65, h * .44] });
  add('Arrows', 'arrowu', 'Arrow up', 60, 120, (w, h) => { const k = Math.min(h * .4, w * .8); return pg(`${w * .28},${h} ${w * .28},${k} 0,${k} ${w / 2},0 ${w},${k} ${w * .72},${k} ${w * .72},${h}`) }, { notext: 1 });
  add('Arrows', 'arrowd', 'Arrow down', 60, 120, (w, h) => { const k = Math.min(h * .4, w * .8); return pg(`${w * .28},0 ${w * .72},0 ${w * .72},${h - k} ${w},${h - k} ${w / 2},${h} 0,${h - k} ${w * .28},${h - k}`) }, { notext: 1 });
  add('Arrows', 'arrowud', 'Arrow up-down', 60, 130, (w, h) => { const k = Math.min(h * .3, w * .8); return pg(`${w / 2},0 ${w},${k} ${w * .72},${k} ${w * .72},${h - k} ${w},${h - k} ${w / 2},${h} 0,${h - k} ${w * .28},${h - k} ${w * .28},${k} 0,${k}`) }, { notext: 1 });
  add('Arrows', 'arrowquad', 'Four-way arrow', 100, 100, (w, h) => { const a = w * .12, b = h * .12, c = w * .25, d = h * .25; return pg(`${w / 2},0 ${w / 2 + c},${d} ${w / 2 + a},${d} ${w / 2 + a},${h / 2 - b} ${w - c},${h / 2 - b} ${w - c},${h / 2 - d} ${w},${h / 2} ${w - c},${h / 2 + d} ${w - c},${h / 2 + b} ${w / 2 + a},${h / 2 + b} ${w / 2 + a},${h - d} ${w / 2 + c},${h - d} ${w / 2},${h} ${w / 2 - c},${h - d} ${w / 2 - a},${h - d} ${w / 2 - a},${h / 2 + b} ${c},${h / 2 + b} ${c},${h / 2 + d} 0,${h / 2} ${c},${h / 2 - d} ${c},${h / 2 - b} ${w / 2 - a},${h / 2 - b} ${w / 2 - a},${d} ${w / 2 - c},${d}`) }, { notext: 1 });
  add('Arrows', 'notched', 'Notched arrow', 130, 60, (w, h) => { const k = Math.min(w * .35, h * .8); return pg(`0,${h * .28} ${w - k},${h * .28} ${w - k},0 ${w},${h / 2} ${w - k},${h} ${w - k},${h * .72} 0,${h * .72} ${h * .22},${h / 2}`) }, { tb: (w, h) => [h * .25, h * .28, w * .6, h * .44] });
  add('Arrows', 'striped', 'Striped arrow', 140, 60, (w, h) => { const k = Math.min(w * .35, h * .8); return r(0, h * .28, w * .05, h * .44) + r(w * .08, h * .28, w * .05, h * .44) + pg(`${w * .16},${h * .28} ${w - k},${h * .28} ${w - k},0 ${w},${h / 2} ${w - k},${h} ${w - k},${h * .72} ${w * .16},${h * .72}`) }, { tb: (w, h) => [w * .17, h * .28, w * .5, h * .44] });
  add('Arrows', 'homeplate', 'Pentagon arrow', 130, 60, (w, h) => { const k = Math.min(w * .3, h * .6); return pg(`0,0 ${w - k},0 ${w},${h / 2} ${w - k},${h} 0,${h}`) });
  add('Arrows', 'dchevron', 'Double chevron', 100, 60, (w, h) => { const k = Math.min(w * .3, h * .5), m = w * .45; return pg(`0,0 ${m - k},0 ${m},${h / 2} ${m - k},${h} 0,${h} ${k},${h / 2}`) + pg(`${w - m},0 ${w - k},0 ${w},${h / 2} ${w - k},${h} ${w - m},${h} ${w - m + k},${h / 2}`) }, { notext: 1 });
  add('Arrows', 'uturn', 'U-turn arrow', 100, 100, (w, h) => { const t = w * .18, k = w * .22; return p(`M0,${h} V${h * .35} A${w * .35},${h * .35} 0 0 1 ${w * .7},${h * .35} V${h * .55} H${w * .7 + k} L${w * .7 - t / 2},${h * .8} L${w * .7 - t - k},${h * .55} H${w * .7 - t} V${h * .35} A${w * .35 - t},${h * .35 - t} 0 0 0 ${t},${h * .35} V${h} Z`) }, { notext: 1 });
  add('Arrows', 'bent', 'Bent arrow', 100, 100, (w, h) => { const t = h * .2, k = h * .3; return pg(`0,${h} 0,${h * .3} ${w - k},${h * .3} ${w - k},${h * .3 - k * .65} ${w},${h * .3 + t / 2} ${w - k},${h * .3 + t + k * .65} ${w - k},${h * .3 + t} ${t},${h * .3 + t} ${t},${h}`) }, { notext: 1 });
  add('Arrows', 'curvedr', 'Curved arrow', 120, 70, (w, h) => p(`M0,${h} C0,${h * .2} ${w * .5},${h * .15} ${w * .78},${h * .3} L${w * .74},${h * .1} L${w},${h * .45} L${w * .68},${h * .62} L${w * .72},${h * .45} C${w * .45},${h * .35} ${w * .18},${h * .4} ${w * .18},${h} Z`), { notext: 1 });
  add('Arrows', 'circarrow', 'Circular arrow', 90, 90, (w, h) => p(`M${w * .15},${h * .5} A${w * .35},${h * .35} 0 1 1 ${w * .5},${h * .85}`, NF + ' stroke-width="6"') + pg(`${w * .5},${h * .73} ${w * .32},${h * .87} ${w * .5},${h} `, CF), { notext: 1 });
  add('Arrows', 'calloutr', 'Callout arrow', 140, 70, (w, h) => { const k = Math.min(w * .25, h * .6); return pg(`0,0 ${w * .6},0 ${w * .6},${h * .3} ${w - k},${h * .3} ${w - k},${h * .12} ${w},${h / 2} ${w - k},${h * .88} ${w - k},${h * .7} ${w * .6},${h * .7} ${w * .6},${h} 0,${h}`) }, { tb: (w, h) => [4, 4, w * .6 - 8, h - 8] });
  add('Arrows', 'linearrow', 'Line arrow', 140, 20, (w, h) => l(0, h / 2, w - 2, h / 2) + pg(`${w - 12},${h / 2 - 6} ${w},${h / 2} ${w - 12},${h / 2 + 6}`, CF), { notext: 1 });
  add('Arrows', 'dlinearrow', 'Line arrow (both ends)', 140, 20, (w, h) => l(2, h / 2, w - 2, h / 2) + pg(`${w - 12},${h / 2 - 6} ${w},${h / 2} ${w - 12},${h / 2 + 6}`, CF) + pg(`12,${h / 2 - 6} 0,${h / 2} 12,${h / 2 + 6}`, CF), { notext: 1 });
  add('Arrows', 'cycle3', 'Cycle', 110, 110, (w, h) => { let s = ''; for (let i = 0; i < 3; i++) { const a0 = (-90 + i * 120 + 12) * Math.PI / 180, a1 = (-90 + i * 120 + 100) * Math.PI / 180; const R = w * .4; const x0 = w / 2 + R * Math.cos(a0), y0 = h / 2 + R * Math.sin(a0), x1 = w / 2 + R * Math.cos(a1), y1 = h / 2 + R * Math.sin(a1); s += p(`M${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1}`, NF + ' stroke-width="5"'); const ta = a1 + Math.PI / 2; s += pg(`${x1 + 9 * Math.cos(ta)},${y1 + 9 * Math.sin(ta)} ${x1 + 7 * Math.cos(a1)},${y1 + 7 * Math.sin(a1)} ${x1 - 7 * Math.cos(a1)},${y1 - 7 * Math.sin(a1)}`, CF) } return s }, { tb: (w, h) => [w * .25, h * .3, w * .5, h * .4] });

  /* ---------- 3D ---------- */
  const dep = (o, w, h) => Math.max(4, Math.min(+(o.st.depth ?? Math.min(w, h) * .22), w * .6, h * .6));
  const D3 = (cat = '3D') => ({ tb: (w, h) => [2, h * .25, w * .75, h * .7] });
  add('3D', 'cube', 'Cube', 100, 100, (w, h, o) => { const k = dep(o, w, h); return r(0, k, w - k, h - k) + pg(`0,${k} ${k},0 ${w},0 ${w - k},${k}`) + pg(`0,${k} ${k},0 ${w},0 ${w - k},${k}`, LIGHT) + pg(`${w - k},${k} ${w},0 ${w},${h - k} ${w - k},${h}`) + pg(`${w - k},${k} ${w},0 ${w},${h - k} ${w - k},${h}`, DARK) }, { tb: (w, h) => [2, h * .25, w * .74, h * .72], st3d: 1 });
  add('3D', 'cuboid', 'Box', 150, 90, (w, h, o) => { const k = dep(o, w, h); return r(0, k, w - k, h - k) + pg(`0,${k} ${k},0 ${w},0 ${w - k},${k}`) + pg(`0,${k} ${k},0 ${w},0 ${w - k},${k}`, LIGHT) + pg(`${w - k},${k} ${w},0 ${w},${h - k} ${w - k},${h}`) + pg(`${w - k},${k} ${w},0 ${w},${h - k} ${w - k},${h}`, DARK) }, { tb: (w, h) => [2, h * .25, w * .82, h * .72], st3d: 1 });
  add('3D', 'cyl3d', 'Cylinder (3D)', 90, 110, (w, h, o) => { const k = Math.min(+(o.st.depth ?? h * .14), h * .4); return p(`M0,${k} V${h - k} A${w / 2},${k} 0 0 0 ${w},${h - k} V${k}`) + p(`M${w * .62},${k * 1.8} V${h - k * .6} A${w / 2},${k} 0 0 0 ${w},${h - k} V${k}`, DARK) + e(w / 2, k, w / 2, k) + e(w / 2, k, w / 2, k, LIGHT) }, { tb: (w, h) => [4, h * .3, w - 8, h * .6], st3d: 1 });
  add('3D', 'cone', 'Cone', 90, 110, (w, h) => { const k = h * .12; return p(`M${w / 2},0 L${w},${h - k} A${w / 2},${k} 0 0 1 0,${h - k} Z`) + p(`M${w / 2},0 L${w},${h - k} A${w / 2},${k} 0 0 1 ${w * .7},${h - k * .1} Z`, DARK) }, { tb: (w, h) => [w * .2, h * .5, w * .6, h * .4] });
  add('3D', 'pyramid', 'Pyramid', 110, 100, (w, h) => { const k = h * .22; return pg(`${w / 2},0 0,${h - k * .4} ${w * .55},${h}`) + pg(`${w / 2},0 ${w * .55},${h} ${w},${h - k}`) + pg(`${w / 2},0 ${w * .55},${h} ${w},${h - k}`, DARK) }, { tb: (w, h) => [w * .1, h * .55, w * .45, h * .4] });
  add('3D', 'sphere', 'Sphere', 90, 90, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + p(`M${w * .58},${h * .02} A${w / 2},${h / 2} 0 0 1 ${w * .58},${h * .98} A${w * .32},${h / 2} 0 0 0 ${w * .58},${h * .02} Z`, DARK) + e(w * .34, h * .3, w * .14, h * .09, LIGHT) + e(w / 2, h / 2, w / 2, h * .14, NF + ' stroke-opacity="0.35"'));
  add('3D', 'prism3', 'Triangular prism', 130, 90, (w, h, o) => { const k = dep(o, w, h); return pg(`0,${h} ${(w - k) / 2},${k} ${w - k},${h}`) + pg(`${(w - k) / 2},${k} ${(w + k) / 2},0 ${w},${h - k} ${w - k},${h}`) + pg(`${(w - k) / 2},${k} ${(w + k) / 2},0 ${w},${h - k} ${w - k},${h}`, DARK) }, { tb: (w, h) => [w * .15, h * .55, w * .55, h * .4], st3d: 1 });
  add('3D', 'prism6', 'Hexagonal prism', 110, 110, (w, h, o) => { const k = Math.min(+(o.st.depth ?? h * .18), h * .4); const top = `${w * .25},0 ${w * .75},0 ${w},${k} ${w * .75},${2 * k} ${w * .25},${2 * k} 0,${k}`; return p(`M0,${k} V${h - k} L${w * .25},${h} H${w * .75} L${w},${h - k} V${k}`) + p(`M${w * .75},${2 * k} L${w},${k} V${h - k} L${w * .75},${h} Z`, DARK) + pg(top) + pg(top, LIGHT) }, { tb: (w, h) => [w * .1, h * .4, w * .65, h * .5], st3d: 1 });
  add('3D', 'plate', 'Plate', 140, 70, (w, h, o) => { const k = Math.min(+(o.st.depth ?? 8), h * .5); const s = w * .3; return pg(`${s},0 ${w},0 ${w - s},${h - k} 0,${h - k}`) + pg(`${s},0 ${w},0 ${w - s},${h - k} 0,${h - k}`, LIGHT) + pg(`0,${h - k} ${w - s},${h - k} ${w - s},${h} 0,${h}`) + pg(`${w - s},${h - k} ${w},0 ${w},${k} ${w - s},${h}`) + pg(`${w - s},${h - k} ${w},0 ${w},${k} ${w - s},${h}`, DARK) }, { st3d: 1, tb: (w, h) => [w * .15, 0, w * .7, h * .8] });
  add('3D', 'stack3d', 'Stack', 120, 110, (w, h, o) => { const k = Math.min(w, h) * .12; let s = ''; for (let i = 2; i >= 0; i--) { const y = i * k * 1.4; s += pg(`${k},${y} ${w},${y} ${w - k},${y + k} 0,${y + k}`) + p(`M0,${y + k} H${w - k} V${y + h - 2.8 * k - k} H0 Z`) + pg(`${w - k},${y + k} ${w},${y} ${w},${y + h - 2.8 * k - 2 * k} ${w - k},${y + h - 2.8 * k - k}`, DARK) } return s }, { tb: (w, h) => [2, h * .4, w * .8, h * .5] });
  add('3D', 'isostep', 'Isometric step', 120, 100, (w, h) => { const a = w / 2, b = h * .25; return pg(`${a},0 ${w},${b} ${a},${2 * b} 0,${b}`) + pg(`${a},0 ${w},${b} ${a},${2 * b} 0,${b}`, LIGHT) + pg(`0,${b} ${a},${2 * b} ${a},${h} 0,${h - b}`) + pg(`${a},${2 * b} ${w},${b} ${w},${h - b} ${a},${h}`) + pg(`${a},${2 * b} ${w},${b} ${w},${h - b} ${a},${h}`, DARK) }, { tb: (w, h) => [w * .2, 0, w * .6, h * .5] });
  add('3D', 'cylh', 'Cylinder (lying)', 140, 70, (w, h) => { const k = Math.min(w * .12, 20); return p(`M${k},0 H${w - k} A${k},${h / 2} 0 0 1 ${w - k},${h} H${k}`) + e(k, h / 2, k, h / 2) + e(k, h / 2, k, h / 2, LIGHT) + p(`M${k},${h * .62} H${w - k} A${k},${h / 2} 0 0 1 ${w - k * .1},${h * .7} L${w - k},${h} H${k} Z`, DARK) }, { tb: (w, h) => [w * .2, 4, w * .7, h - 8] });

  /* ---------- Neural networks ---------- */
  const NN = 'Neural networks';
  add(NN, 'neuron', 'Neuron', 44, 44, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { st: { fill: '#dbe7f6', stroke: '#185fa5' } });
  add(NN, 'nin', 'Input neuron', 44, 44, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { st: { fill: '#d5f0e3', stroke: '#1e8e5a' } });
  add(NN, 'nout', 'Output neuron', 44, 44, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { st: { fill: '#fde2c8', stroke: '#c27c0e' } });
  add(NN, 'nbias', 'Bias (+1)', 36, 36, (w, h) => e(w / 2, h / 2, w / 2, h / 2, 'stroke-dasharray="4 3"'), { deftext: '+1', st: { fill: '#fff4b0', stroke: '#c27c0e' } });
  add(NN, 'perceptron', 'Perceptron (Σ | f)', 90, 56, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + l(w / 2, 2, w / 2, h - 2) + tx(w * .28, h / 2 + 6, 'Σ', 17) + tx(w * .72, h / 2 + 6, 'f', 17, 'middle', 'font-style="italic"'), { notext: 1 });
  add(NN, 'sumnode', 'Sum Σ', 50, 50, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + tx(w / 2, h / 2 + 7, 'Σ', 20), { notext: 1 });
  const actIcon = (fn) => (w, h) => r(0, 0, w, h, 6) + l(w * .12, h / 2, w * .88, h / 2, 'stroke-opacity="0.3"') + l(w / 2, h * .15, w / 2, h * .85, 'stroke-opacity="0.3"') + p(fn(w, h), NF + ' stroke-width="2.2"');
  add(NN, 'relu', 'ReLU', 54, 46, actIcon((w, h) => `M${w * .12},${h * .62} L${w / 2},${h * .62} L${w * .86},${h * .18}`), { notext: 1 });
  add(NN, 'sigmoid', 'Sigmoid', 54, 46, actIcon((w, h) => `M${w * .1},${h * .78} C${w * .42},${h * .78} ${w * .58},${h * .2} ${w * .9},${h * .2}`), { notext: 1 });
  add(NN, 'tanh', 'Tanh', 54, 46, actIcon((w, h) => `M${w * .1},${h * .85} C${w * .45},${h * .85} ${w * .55},${h * .15} ${w * .9},${h * .15}`), { notext: 1 });
  add(NN, 'stepfn', 'Step', 54, 46, actIcon((w, h) => `M${w * .1},${h * .75} H${w / 2} V${h * .22} H${w * .9}`), { notext: 1 });
  add(NN, 'dense', 'Dense layer', 46, 150, (w, h) => r(0, 0, w, h, 8), { deftext: 'Dense', st: { fill: '#dbe7f6', stroke: '#185fa5' } });
  add(NN, 'conv', 'Convolution', 110, 120, (w, h) => { const k = w * .14; let s = ''; for (let i = 3; i >= 0; i--) { const o = i * k * .55; s += r(o, o, w - 1.65 * k, h - 1.65 * k, 2, 'fill-opacity="0.9"') } return s }, { deftext: 'Conv 3×3', st: { fill: '#e7dcf7', stroke: '#7d3cbd' }, tb: (w, h) => [-20, h + 2, w + 40, 30] });
  add(NN, 'pool', 'Pooling', 80, 90, (w, h) => { const k = w * .14; let s = ''; for (let i = 2; i >= 0; i--) { const o = i * k * .55; s += r(o, o, w - 1.1 * k, h - 1.1 * k, 2) } return s }, { deftext: 'Max pool', st: { fill: '#f9d6d5', stroke: '#c0392b' }, tb: (w, h) => [-20, h + 2, w + 40, 30] });
  add(NN, 'flatten', 'Flatten', 26, 150, (w, h) => { let s = r(0, 0, w, h, 3); for (let i = 1; i < 10; i++) s += l(0, h * i / 10, w, h * i / 10, 'stroke-opacity="0.5"'); return s }, { deftext: 'Flatten', st: { fill: '#fff4b0', stroke: '#c27c0e' }, tb: (w, h) => [-30, h + 2, w + 60, 30] });
  add(NN, 'dropout', 'Dropout', 50, 150, (w, h) => { let s = r(0, 0, w, h, 8, 'stroke-dasharray="5 3"'); for (let i = 0; i < 4; i++) { const y = h * (i + .5) / 4; s += e(w / 2, y, w * .22, w * .22) + (i % 2 ? l(w * .3, y - w * .15, w * .7, y + w * .15) : '') } return s }, { deftext: 'Dropout', tb: (w, h) => [-30, h + 2, w + 60, 30] });
  add(NN, 'batchnorm', 'Batch norm', 60, 120, (w, h) => r(0, 0, w, h, 6), { deftext: 'Batch\nnorm', st: { fill: '#f5f7fa' } });
  add(NN, 'softmax', 'Softmax', 70, 120, (w, h) => r(0, 0, w, h, 6), { deftext: 'Softmax', st: { fill: '#fde2c8', stroke: '#c27c0e' } });
  add(NN, 'lstm', 'LSTM cell', 170, 110, (w, h) => { let s = r(0, 0, w, h, 10); const g = ['σ', 'σ', 'tanh', 'σ']; g.forEach((t, i) => { const x = w * (.14 + i * .22); s += r(x - w * .08, h * .58, w * .16, h * .22, 3, CF + ' fill-opacity="0.12"') + tx(x, h * .74, t, 11) }); s += l(w * .05, h * .25, w * .95, h * .25) + e(w * .36, h * .25, 7, 7, 'fill="#fff"') + tx(w * .36, h * .25 + 4, '×', 11) + e(w * .58, h * .25, 7, 7, 'fill="#fff"') + tx(w * .58, h * .25 + 4, '+', 11); return s }, { notext: 1, st: { fill: '#dbe7f6', stroke: '#185fa5' } });
  add(NN, 'gru', 'GRU cell', 150, 100, (w, h) => { let s = r(0, 0, w, h, 10); ['r', 'z', 'h̃'].forEach((t, i) => { const x = w * (.22 + i * .28); s += e(x, h * .62, w * .09, w * .09, CF + ' fill-opacity="0.12"') + tx(x, h * .62 + 4, t, 11) }); return s + tx(w / 2, h * .28, 'GRU', 13, 'middle', 'font-weight="600"') }, { notext: 1, st: { fill: '#d5f0e3', stroke: '#1e8e5a' } });
  add(NN, 'rnnloop', 'RNN cell (loop)', 110, 80, (w, h) => r(0, h * .25, w, h * .75, 8) + p(`M${w * .7},${h * .25} C${w * .7},${-h * .1} ${w * .3},${-h * .1} ${w * .3},${h * .22}`, NF) + pg(`${w * .3 - 5},${h * .14} ${w * .3},${h * .25} ${w * .3 + 5},${h * .14}`, CF), { deftext: 'RNN', tb: (w, h) => [4, h * .25, w - 8, h * .75] });
  add(NN, 'embedding', 'Embedding', 120, 60, (w, h) => { let s = r(0, 0, w, h, 6); for (let i = 1; i < 6; i++) s += l(w * i / 6, 0, w * i / 6, h, 'stroke-opacity="0.35"'); return s }, { deftext: 'Embedding', st: { fill: '#e7dcf7', stroke: '#7d3cbd' } });
  add(NN, 'attention', 'Attention (Q K V)', 160, 90, (w, h) => { let s = r(0, 0, w, h, 8); ['Q', 'K', 'V'].forEach((t, i) => { const x = w * (.2 + i * .3); s += r(x - 14, h - 26, 28, 20, 4, CF + ' fill-opacity="0.12"') + tx(x, h - 12, t, 12, 'middle', 'font-weight="600"') }); return s }, { deftext: 'Multi-head attention', tb: (w, h) => [4, 4, w - 8, h - 34], st: { fill: '#fde2c8', stroke: '#c27c0e' } });
  add(NN, 'transformer', 'Transformer block', 160, 190, (w, h) => { const b = (y, hh, t, f) => r(w * .1, y, w * .8, hh, 6, `fill="${f}"`) + tx(w / 2, y + hh / 2 + 4, t, 11); return r(0, 0, w, h, 10, 'fill-opacity="0.35"') + b(h * .06, h * .2, 'Multi-head attention', '#fde2c8') + b(h * .3, h * .1, 'Add & norm', '#fff4b0') + b(h * .46, h * .2, 'Feed forward', '#dbe7f6') + b(h * .7, h * .1, 'Add & norm', '#fff4b0') + tx(w / 2, h * .96, '× N', 12, 'middle', 'font-weight="600"') }, { notext: 1, st: { fill: '#f5f7fa' } });
  add(NN, 'encdec', 'Encoder / decoder', 200, 100, (w, h) => pg(`0,0 ${w * .45},${h * .3} ${w * .45},${h * .7} 0,${h}`) + pg(`${w},0 ${w * .55},${h * .3} ${w * .55},${h * .7} ${w},${h}`) + r(w * .45, h * .3, w * .1, h * .4) + tx(w * .2, h / 2 + 4, 'Encoder', 11) + tx(w * .8, h / 2 + 4, 'Decoder', 11), { notext: 1, st: { fill: '#dbe7f6' } });
  add(NN, 'imagein', 'Image input', 90, 90, (w, h) => { let s = r(0, 0, w, h, 2); const n = 6; for (let i = 0; i < n; i++)for (let j = 0; j < n; j++) { const v = (Math.sin(i * 1.7 + j * 2.3) + 1) / 2; s += r(i * w / n, j * h / n, w / n, h / n, 0, `fill="currentColor" fill-opacity="${(v * .55).toFixed(2)}" stroke="none"`) } for (let i = 1; i < n; i++) s += l(i * w / n, 0, i * w / n, h, 'stroke-opacity="0.25"') + l(0, i * h / n, w, i * h / n, 'stroke-opacity="0.25"'); return s }, { deftext: '28×28', tb: below, labelBelow: 1 });
  add(NN, 'kernel', 'Kernel 3×3', 60, 60, (w, h) => { let s = r(0, 0, w, h); for (let i = 1; i < 3; i++) s += l(i * w / 3, 0, i * w / 3, h) + l(0, i * h / 3, w, i * h / 3); return s }, { notext: 1, st: { fill: '#fff4b0', stroke: '#c27c0e' } });
  add(NN, 'tensor', 'Tensor (3D)', 110, 90, (w, h, o) => { const k = dep(o, w, h); let s = r(0, k, w - k, h - k) + pg(`0,${k} ${k},0 ${w},0 ${w - k},${k}`) + pg(`0,${k} ${k},0 ${w},0 ${w - k},${k}`, LIGHT) + pg(`${w - k},${k} ${w},0 ${w},${h - k} ${w - k},${h}`) + pg(`${w - k},${k} ${w},0 ${w},${h - k} ${w - k},${h}`, DARK); for (let i = 1; i < 4; i++) s += l(i * (w - k) / 4, k, i * (w - k) / 4, h, 'stroke-opacity="0.3"'); return s }, { deftext: '28×28×32', tb: (w, h) => [-20, h + 2, w + 40, 30], st: { fill: '#e7dcf7', stroke: '#7d3cbd' }, st3d: 1 });
  add(NN, 'weightmat', 'Weight matrix', 80, 80, (w, h) => { let s = r(0, 0, w, h); for (let i = 1; i < 4; i++) s += l(i * w / 4, 0, i * w / 4, h, 'stroke-opacity="0.35"') + l(0, i * h / 4, w, i * h / 4, 'stroke-opacity="0.35"'); return s }, { deftext: 'W', st: { fill: '#f5f7fa' } });
  add(NN, 'loss', 'Loss', 90, 60, (w, h) => p(`M0,0 H${w} L${w * .85},${h} H${w * .15} Z`), { deftext: 'Loss', st: { fill: '#f9d6d5', stroke: '#c0392b' } });
  add(NN, 'concat', 'Concatenate ⊕', 44, 44, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + l(w / 2, h * .2, w / 2, h * .8) + l(w * .2, h / 2, w * .8, h / 2), { notext: 1 });
  add(NN, 'mult', 'Multiply ⊗', 44, 44, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + l(w * .29, h * .29, w * .71, h * .71) + l(w * .71, h * .29, w * .29, h * .71), { notext: 1 });
  add(NN, 'nnlayerlabel', 'Layer title', 140, 26, () => '', { textOnly: 1, st: { bold: 1, fs: 13 } });

  /* ---------- Data structures ---------- */
  const DS = 'Data structures';
  add(DS, 'array', 'Array', 240, 40, (w, h, o) => { const v = String(o.text || '5|3|8|1|9|2').split('|'); const c = w / v.length; let s = r(0, 0, w, h); v.forEach((t, i) => { if (i) s += l(i * c, 0, i * c, h); s += tx(i * c + c / 2, h / 2 + 5, t.trim(), 13) + tx(i * c + c / 2, h + 13, i, 9, 'middle', 'fill-opacity="0.6"') }); return s }, { notext: 1, hint: 'Separate values with |' });
  add(DS, 'llnode', 'Linked list node', 110, 44, (w, h) => r(0, 0, w, h, 4) + l(w * .68, 0, w * .68, h) + e(w * .84, h / 2, 4, 4, CF), { tb: (w, h) => [0, 0, w * .68, h] });
  add(DS, 'dlnode', 'Doubly linked node', 140, 44, (w, h) => r(0, 0, w, h, 4) + l(w * .22, 0, w * .22, h) + l(w * .78, 0, w * .78, h) + e(w * .11, h / 2, 4, 4, CF) + e(w * .89, h / 2, 4, 4, CF), { tb: (w, h) => [w * .22, 0, w * .56, h] });
  add(DS, 'stackds', 'Stack', 90, 150, (w, h, o) => { const v = String(o.text || 'top|b|c|d').split('|'); const c = h / Math.max(4, v.length); let s = pl(`0,0 0,${h} ${w},${h} ${w},0`); v.forEach((t, i) => { const y = h - (v.length - i) * c; s += r(4, y + 2, w - 8, c - 4, 3, CF + ' fill-opacity="0.1"') + tx(w / 2, y + c / 2 + 4, t.trim(), 12) }); return s }, { notext: 1, hint: 'Items from top to bottom, separated by |' });
  add(DS, 'queueds', 'Queue', 240, 50, (w, h, o) => { const v = String(o.text || 'a|b|c|d').split('|'); const c = (w - 40) / Math.max(4, v.length); let s = l(0, 0, w, 0) + l(0, h, w, h); v.forEach((t, i) => { const x = 20 + i * c; s += r(x + 2, 5, c - 4, h - 10, 3, CF + ' fill-opacity="0.1"') + tx(x + c / 2, h / 2 + 4, t.trim(), 12) }); return s + tx(10, h / 2 + 4, '←', 12) + tx(w - 10, h / 2 + 4, '←', 12) }, { notext: 1, hint: 'Items separated by |, front first' });
  add(DS, 'treenode', 'Tree node', 56, 56, (w, h) => e(w / 2, h / 2, w / 2, h / 2));
  add(DS, 'bstnode', 'Binary tree node', 120, 50, (w, h) => r(0, 0, w, h, 6) + l(w * .25, 0, w * .25, h) + l(w * .75, 0, w * .75, h) + e(w * .125, h / 2, 4, 4, CF) + e(w * .875, h / 2, 4, 4, CF), { tb: (w, h) => [w * .25, 0, w * .5, h] });
  add(DS, 'hashtable', 'Hash table', 120, 160, (w, h) => { let s = r(0, 0, w * .35, h); for (let i = 1; i < 5; i++) s += l(0, h * i / 5, w * .35, h * i / 5); for (let i = 0; i < 5; i++) s += tx(w * .17, h * (i + .5) / 5 + 4, i, 11) + (i % 2 ? '' : l(w * .35, h * (i + .5) / 5, w * .55, h * (i + .5) / 5) + r(w * .55, h * (i + .5) / 5 - 10, w * .45, 20, 3)); return s }, { notext: 1 });
  add(DS, 'matrix', 'Matrix', 120, 100, (w, h, o) => { const rows = String(o.text || '1 0 0;0 1 0;0 0 1').split(';').map(x => x.trim().split(/\s+/)); const nr = rows.length, nc = Math.max(...rows.map(x => x.length)); let s = p(`M8,0 H0 V${h} H8`, NF) + p(`M${w - 8},0 H${w} V${h} H${w - 8}`, NF); rows.forEach((row, i) => row.forEach((t, j) => s += tx(w * (j + .5) / nc, h * (i + .5) / nr + 5, t, 13))); return s }, { notext: 1, hint: 'Rows separated by ; values by spaces' });
  add(DS, 'vertex', 'Graph vertex', 44, 44, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { deftext: 'A' });
  add(DS, 'memblock', 'Memory cells', 120, 160, (w, h, o) => { const n = 6; let s = r(w * .3, 0, w * .7, h); for (let i = 1; i < n; i++) s += l(w * .3, h * i / n, w, h * i / n); for (let i = 0; i < n; i++) s += tx(w * .26, h * (i + .5) / n + 4, '0x' + (i * 4).toString(16).padStart(2, '0'), 9, 'end', 'font-family="IBM Plex Mono"'); return s }, { notext: 1 });

  /* ---------- Charts and infographics ---------- */
  const CH = 'Charts and infographics'; const PAL = ['#185fa5', '#1e8e5a', '#c27c0e', '#c0392b', '#7d3cbd', '#0f8f9a', '#9a6b2f', '#5e6979'];
  add(CH, 'piechart', 'Pie chart', 120, 120, (w, h, o) => { const v = nums(o, '40,25,20,15'); const t = v.reduce((a, b) => a + Math.abs(b), 0) || 1; let a0 = -Math.PI / 2, s = ''; v.forEach((x, i) => { const a1 = a0 + Math.abs(x) / t * 2 * Math.PI; const big = a1 - a0 > Math.PI ? 1 : 0; s += p(`M${w / 2},${h / 2} L${w / 2 + w / 2 * Math.cos(a0)},${h / 2 + h / 2 * Math.sin(a0)} A${w / 2},${h / 2} 0 ${big} 1 ${w / 2 + w / 2 * Math.cos(a1)},${h / 2 + h / 2 * Math.sin(a1)} Z`, `fill="${PAL[i % PAL.length]}" stroke="#fff" stroke-width="1.5"`); const am = (a0 + a1) / 2; s += tx(w / 2 + w * .32 * Math.cos(am), h / 2 + h * .32 * Math.sin(am) + 4, Math.round(Math.abs(x) / t * 100) + '%', 10, 'middle', 'fill="#fff" font-weight="600"'); a0 = a1 }); return s }, { notext: 1, hint: 'Type the values, e.g. 40, 25, 20, 15' });
  add(CH, 'donutchart', 'Donut chart', 120, 120, (w, h, o) => { const v = nums(o, '60,25,15'); const t = v.reduce((a, b) => a + Math.abs(b), 0) || 1; let a0 = -Math.PI / 2, s = ''; const R = w / 2 - 9; v.forEach((x, i) => { const a1 = a0 + Math.abs(x) / t * 2 * Math.PI - .01; const big = a1 - a0 > Math.PI ? 1 : 0; s += p(`M${w / 2 + R * Math.cos(a0)},${h / 2 + R * Math.sin(a0)} A${R},${R} 0 ${big} 1 ${w / 2 + R * Math.cos(a1)},${h / 2 + R * Math.sin(a1)}`, `fill="none" stroke="${PAL[i % PAL.length]}" stroke-width="16"`); a0 = a1 + .01 }); return s + tx(w / 2, h / 2 + 6, Math.round(Math.abs(v[0] || 0) / t * 100) + '%', 18, 'middle', 'font-weight="600"') }, { notext: 1, hint: 'Type the values, e.g. 60, 25, 15' });
  add(CH, 'barchart', 'Bar chart', 200, 130, (w, h, o) => { const v = nums(o, '3,7,5,9,4'); const mx = Math.max(...v.map(Math.abs), 1); const bw = (w - 20) / v.length; let s = l(16, 0, 16, h - 14) + l(16, h - 14, w, h - 14); v.forEach((x, i) => { const bh = Math.abs(x) / mx * (h - 30); s += r(20 + i * bw + bw * .15, h - 14 - bh, bw * .7, bh, 1, `fill="${PAL[i % PAL.length]}" stroke="none"`) + tx(20 + i * bw + bw / 2, h - 18 - bh, x, 9) }); return s }, { notext: 1, hint: 'Type the values, e.g. 3, 7, 5, 9' });
  add(CH, 'linechart', 'Line chart', 200, 130, (w, h, o) => { const v = nums(o, '2,4,3,6,5,8'); const mx = Math.max(...v), mn = Math.min(...v, 0); const sx = (w - 26) / Math.max(1, v.length - 1); const Y = x => h - 14 - (x - mn) / ((mx - mn) || 1) * (h - 26); let s = l(16, 0, 16, h - 14) + l(16, h - 14, w, h - 14); s += pl(v.map((x, i) => `${20 + i * sx},${Y(x)}`).join(' '), 'stroke-width="2.2" stroke="#185fa5"'); v.forEach((x, i) => s += e(20 + i * sx, Y(x), 3, 3, 'fill="#185fa5" stroke="none"')); return s }, { notext: 1, hint: 'Type the values, e.g. 2, 4, 3, 6' });
  add(CH, 'progress', 'Progress bar', 200, 24, (w, h, o) => { const v = Math.max(0, Math.min(100, nums(o, '65')[0] || 0)); return r(0, 0, w, h, h / 2, 'fill="#e6ebf2"') + r(0, 0, w * v / 100, h, h / 2, 'fill="currentColor" stroke="none"') + tx(w / 2, h / 2 + 4, v + '%', 11, 'middle', 'font-weight="600" fill="#1b2230"') }, { notext: 1, hint: 'Type a percentage' });
  add(CH, 'gauge', 'Gauge', 140, 84, (w, h, o) => { const v = Math.max(0, Math.min(100, nums(o, '70')[0] || 0)); const R = Math.min(w / 2, h) - 8, cx = w / 2, cy = h - 4; const a = Math.PI * (1 - v / 100); return p(`M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}`, 'fill="none" stroke="#e6ebf2" stroke-width="12"') + p(`M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R * Math.cos(a)},${cy - R * Math.sin(a)}`, 'fill="none" stroke-width="12"') + tx(cx, cy - 8, v + '%', 16, 'middle', 'font-weight="600"') }, { notext: 1, hint: 'Type a percentage' });
  add(CH, 'centraltopic', 'Central topic', 160, 70, (w, h) => r(0, 0, w, h, h / 2), { st: { fill: '#185fa5', stroke: '#185fa5', fc: '#ffffff', fs: 16, bold: 1 } });
  add(CH, 'branch', 'Branch topic', 130, 44, (w, h) => r(0, 0, w, h, 8), { st: { fill: '#dbe7f6', stroke: '#185fa5' } });
  add(CH, 'subtopic', 'Subtopic', 110, 30, (w, h) => l(0, h, w, h, 'stroke-width="2"'), { st: { fill: 'none' } });
  add(CH, 'pill', 'Pill', 120, 36, (w, h) => r(0, 0, w, h, h / 2));
  add(CH, 'banner', 'Banner', 180, 60, (w, h) => { const k = w * .1; return pg(`0,${h * .2} ${k},${h * .2} ${k},0 ${w - k},0 ${w - k},${h * .2} ${w},${h * .2} ${w - k * .5},${h * .55} ${w},${h * .9} ${w - k},${h * .9} ${w - k},${h * .7} ${k},${h * .7} ${k},${h * .9} 0,${h * .9} ${k * .5},${h * .55}`) + r(k, 0, w - 2 * k, h * .7) }, { tb: (w, h) => [w * .1, 0, w * .8, h * .7] });
  add(CH, 'ribbon', 'Ribbon', 160, 50, (w, h) => { const k = h * .4; return pg(`0,0 ${w},0 ${w - k},${h / 2} ${w},${h} 0,${h} ${k},${h / 2}`) });
  add(CH, 'numstep', 'Numbered step', 56, 56, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { deftext: '1', st: { fill: '#185fa5', stroke: '#185fa5', fc: '#ffffff', fs: 20, bold: 1 } });
  add(CH, 'milestone', 'Milestone', 50, 50, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`), { labelBelow: 1, tb: below, st: { fill: '#c27c0e', stroke: '#c27c0e' } });
  add(CH, 'timelinedot', 'Timeline point', 30, 30, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + e(w / 2, h / 2, w / 4, h / 4, CF), { labelBelow: 1, tb: below });
  add(CH, 'kvcard', 'Number card', 150, 90, (w, h) => r(0, 0, w, h, 10) + r(0, 0, 6, h, 3, CF), { deftext: '1,250\nUsers', st: { fs: 18, bold: 1 } });
  add(CH, 'quote', 'Quote', 220, 90, (w, h) => r(0, 0, w, h, 6) + tx(16, 34, '“', 42, 'start', 'fill-opacity="0.35"'), { tb: (w, h) => [26, 8, w - 36, h - 16], st: { italic: 1, align: 'left' } });
  add(CH, 'checkitem', 'Checklist item', 180, 30, (w, h) => r(2, h / 2 - 8, 16, 16, 3) + pl(`5,${h / 2} 9,${h / 2 + 4} 15,${h / 2 - 5}`, 'stroke-width="2"'), { tb: (w, h) => [24, 0, w - 24, h], st: { align: 'left', fill: 'none' } });

  /* ---------- Icons ---------- */
  const IC = 'Icons';
  const icons = {
    user: ['User', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21c0-4 3.6-7 8-7s8 3 8 7'], users: ['Users', 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M2 20c0-3.5 3-6 7-6s7 2.5 7 6|M16 4.2a3.5 3.5 0 0 1 0 6.6|M18 14c2.4.6 4 2.8 4 6'],
    lock: ['Lock', 'M5 11h14v10H5z|M8 11V7a4 4 0 0 1 8 0v4|M12 15v2'], unlock: ['Unlock', 'M5 11h14v10H5z|M8 11V7a4 4 0 0 1 7.5-2'], key: ['Key', 'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M11 11h10|M18 11v3|M21 11v2'],
    gear: ['Settings', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M12 2v3|M12 19v3|M2 12h3|M19 12h3|M4.9 4.9l2.1 2.1|M17 17l2.1 2.1|M4.9 19.1L7 17|M17 7l2.1-2.1'], mail: ['Mail', 'M3 5h18v14H3z|M3 6l9 7 9-7'], globe: ['Globe', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M3 12h18|M12 3c3 3 3 15 0 18|M12 3c-3 3-3 15 0 18'],
    file: ['File', 'M6 2h8l5 5v15H6z|M14 2v5h5'], folder: ['Folder', 'M3 6h6l2 2h10v11H3z'], clock: ['Clock', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3 3'], warning: ['Warning', 'M12 3L2 20h20z|M12 9v5|M12 17v.5'],
    info: ['Info', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 11v6|M12 7.5v.5'], check: ['Check', 'M4 12l5 5L20 6'], close: ['Cross', 'M5 5l14 14|M19 5L5 19'], bulb: ['Idea', 'M9 18h6|M10 21h4|M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z'],
    battery: ['Battery', 'M2 8h17v8H2z|M21 11v2|M5 11h6v2H5z'], wifi: ['Wi-Fi', 'M2 9a15 15 0 0 1 20 0|M5 12.5a10 10 0 0 1 14 0|M8.5 16a5 5 0 0 1 7 0|M12 19.5v.5'], bt: ['Bluetooth', 'M7 7l10 10-5 4V3l5 4L7 17'],
    chip: ['Chip', 'M7 7h10v10H7z|M9 2v3|M15 2v3|M9 19v3|M15 19v3|M2 9h3|M2 15h3|M19 9h3|M19 15h3'], dbi: ['Database', 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z|M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6|M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
    upload: ['Upload', 'M12 16V4|M7 9l5-5 5 5|M4 20h16'], download: ['Download', 'M12 4v12|M7 11l5 5 5-5|M4 20h16'], search: ['Search', 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z|M15.5 15.5L21 21'], home: ['Home', 'M3 11l9-8 9 8|M5 10v11h14V10|M10 21v-6h4v6'],
    bell: ['Bell', 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4z|M10 21h4'], calendar: ['Calendar', 'M3 5h18v16H3z|M3 10h18|M8 3v4|M16 3v4'], camera: ['Camera', 'M3 7h4l2-3h6l2 3h4v13H3z|M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'], code: ['Code', 'M8 6l-6 6 6 6|M16 6l6 6-6 6|M14 4l-4 16'],
    terminal: ['Terminal', 'M3 4h18v16H3z|M7 9l3 3-3 3|M12 15h5'], cloudi: ['Cloud', 'M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z'], robot: ['Robot', 'M5 8h14v11H5z|M12 4v4|M9 13v1|M15 13v1|M9 17h6|M2 12v3|M22 12v3'], chart: ['Chart', 'M4 20V10|M10 20V4|M16 20v-7|M22 20H2'],
    heart2: ['Like', 'M12 20s-8-4.5-8-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 10-8 10z'], star2: ['Favourite', 'M12 3l2.8 5.8 6.2.9-4.5 4.3 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.7l6.2-.9z'], pin: ['Location', 'M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'], phone2: ['Call', 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z'],
    monitor: ['Monitor', 'M3 4h18v12H3z|M8 21h8|M12 16v5'], printer2: ['Print', 'M6 9V3h12v6|M4 9h16v8H4z|M7 14h10v7H7z'], shield: ['Shield', 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'], power: ['Power', 'M12 3v9|M6.3 6.3a8 8 0 1 0 11.4 0'],
  };
  for (const [k, [name, d]] of Object.entries(icons)) add(IC, 'ic_' + k, name, 48, 48, icon(d), ICON);

  /* ---------- BPMN ---------- */
  const BP = 'BPMN';
  add(BP, 'bstart', 'Start event', 40, 40, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { labelBelow: 1, tb: below, st: { fill: '#d5f0e3', stroke: '#1e8e5a' } });
  add(BP, 'binter', 'Intermediate event', 40, 40, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + e(w / 2, h / 2, w / 2 - 4, h / 2 - 4, NF), { labelBelow: 1, tb: below });
  add(BP, 'bend', 'End event', 40, 40, (w, h) => e(w / 2, h / 2, w / 2, h / 2, 'stroke-width="4"'), { labelBelow: 1, tb: below, st: { fill: '#f9d6d5', stroke: '#c0392b' } });
  add(BP, 'btimer', 'Timer event', 40, 40, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + e(w / 2, h / 2, w / 2 - 4, h / 2 - 4, NF) + l(w / 2, h / 2, w / 2, h * .25) + l(w / 2, h / 2, w * .68, h / 2), { labelBelow: 1, tb: below });
  add(BP, 'bmsg', 'Message event', 40, 40, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + r(w * .25, h * .32, w * .5, h * .36, 0, NF) + pl(`${w * .25},${h * .32} ${w / 2},${h * .52} ${w * .75},${h * .32}`), { labelBelow: 1, tb: below });
  add(BP, 'btask', 'Task', 120, 70, (w, h) => r(0, 0, w, h, 10));
  add(BP, 'bsub', 'Sub-process', 130, 80, (w, h) => r(0, 0, w, h, 10) + r(w / 2 - 7, h - 16, 14, 14, 0, NF) + l(w / 2, h - 13, w / 2, h - 5) + l(w / 2 - 4, h - 9, w / 2 + 4, h - 9), { tb: (w, h) => [4, 4, w - 8, h - 22] });
  add(BP, 'bxor', 'Exclusive gateway', 50, 50, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`) + l(w * .35, h * .35, w * .65, h * .65, 'stroke-width="3"') + l(w * .65, h * .35, w * .35, h * .65, 'stroke-width="3"'), { labelBelow: 1, tb: below, st: { fill: '#fff4b0', stroke: '#c27c0e' } });
  add(BP, 'band', 'Parallel gateway', 50, 50, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`) + l(w / 2, h * .28, w / 2, h * .72, 'stroke-width="3"') + l(w * .28, h / 2, w * .72, h / 2, 'stroke-width="3"'), { labelBelow: 1, tb: below, st: { fill: '#fff4b0', stroke: '#c27c0e' } });
  add(BP, 'bor', 'Inclusive gateway', 50, 50, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`) + e(w / 2, h / 2, w * .18, h * .18, NF + ' stroke-width="2.5"'), { labelBelow: 1, tb: below, st: { fill: '#fff4b0', stroke: '#c27c0e' } });
  add(BP, 'bdata', 'Data object', 50, 64, (w, h) => { const k = w * .3; return p(`M0,0 H${w - k} L${w},${k} V${h} H0 Z`) + pl(`${w - k},0 ${w - k},${k} ${w},${k}`) }, { labelBelow: 1, tb: below });
  add(BP, 'bstore', 'Data store', 60, 56, (w, h) => { const k = h * .14; return p(`M0,${k} A${w / 2},${k} 0 0 1 ${w},${k} V${h - k} A${w / 2},${k} 0 0 1 0,${h - k} Z`) + p(`M0,${k} A${w / 2},${k} 0 0 0 ${w},${k}`, NF) + p(`M0,${k * 2} A${w / 2},${k} 0 0 0 ${w},${k * 2}`, NF) }, { labelBelow: 1, tb: below });
  add(BP, 'bpool', 'Pool', 480, 160, (w, h) => r(0, 0, w, h) + l(30, 0, 30, h), { tb: (w, h) => [0, 0, 30, h], st: { fill: 'none' } });
  add(BP, 'blane', 'Lane', 450, 110, (w, h) => r(0, 0, w, h) + l(26, 0, 26, h, 'stroke-opacity="0.5"'), { tb: (w, h) => [0, 0, 26, h], st: { fill: 'none' } });

  /* ---------- Control and signals ---------- */
  const CS = 'Control and signals';
  add(CS, 'sumj', 'Summing junction', 46, 46, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + l(w * .15, h * .15, w * .85, h * .85, 'stroke-opacity="0.5"') + l(w * .85, h * .15, w * .15, h * .85, 'stroke-opacity="0.5"') + tx(w * .2, h / 2 + 4, '+', 10) + tx(w / 2, h * .9, '−', 11), { notext: 1 });
  add(CS, 'gain', 'Gain', 80, 60, (w, h) => pg(`0,0 ${w},${h / 2} 0,${h}`), { deftext: 'K', tb: (w, h) => [2, h * .25, w * .6, h * .5] });
  add(CS, 'tfblock', 'Transfer function', 120, 70, (w, h) => r(0, 0, w, h), { deftext: 'G(s)' });
  add(CS, 'integ', 'Integrator', 70, 60, (w, h) => r(0, 0, w, h) + tx(w / 2, h / 2 + 7, '1/s', 17), { notext: 1 });
  add(CS, 'deriv', 'Derivative', 70, 60, (w, h) => r(0, 0, w, h) + tx(w / 2, h / 2 + 7, 's', 18), { notext: 1 });
  add(CS, 'zdelay', 'Delay z⁻¹', 70, 60, (w, h) => r(0, 0, w, h) + tx(w / 2, h / 2 + 7, 'z⁻¹', 17), { notext: 1 });
  add(CS, 'satur', 'Saturation', 70, 60, (w, h) => r(0, 0, w, h) + pl(`${w * .15},${h * .75} ${w * .35},${h * .75} ${w * .65},${h * .25} ${w * .85},${h * .25}`, 'stroke-width="2"'), { notext: 1 });
  add(CS, 'pid', 'PID controller', 110, 70, (w, h) => r(0, 0, w, h, 4), { deftext: 'PID' });
  add(CS, 'plant', 'Plant', 110, 70, (w, h) => r(0, 0, w, h), { deftext: 'Plant', st: { fill: '#dbe7f6' } });
  add(CS, 'mixer', 'Mixer', 46, 46, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + l(w * .25, h * .25, w * .75, h * .75) + l(w * .75, h * .25, w * .25, h * .75), { notext: 1 });
  add(CS, 'oscill', 'Oscillator', 50, 50, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + p(`M${w * .2},${h / 2} C${w * .3},${h * .15} ${w * .4},${h * .15} ${w / 2},${h / 2} S${w * .7},${h * .85} ${w * .8},${h / 2}`, NF), { notext: 1 });
  const filt = (d) => (w, h) => r(0, 0, w, h) + p(d(w, h), NF + ' stroke-width="1.8"');
  add(CS, 'lpf', 'Low-pass filter', 70, 60, filt((w, h) => `M${w * .15},${h * .35} H${w * .5} Q${w * .65},${h * .35} ${w * .85},${h * .75}`), { notext: 1 });
  add(CS, 'hpf', 'High-pass filter', 70, 60, filt((w, h) => `M${w * .15},${h * .75} Q${w * .35},${h * .35} ${w * .5},${h * .35} H${w * .85}`), { notext: 1 });
  add(CS, 'bpf', 'Band-pass filter', 70, 60, filt((w, h) => `M${w * .12},${h * .78} Q${w * .3},${h * .3} ${w / 2},${h * .3} Q${w * .7},${h * .3} ${w * .88},${h * .78}`), { notext: 1 });
  add(CS, 'adc', 'ADC', 90, 60, (w, h) => pg(`0,0 ${w * .75},0 ${w},${h / 2} ${w * .75},${h} 0,${h}`), { deftext: 'ADC', tb: (w, h) => [2, 0, w * .75, h] });
  add(CS, 'dac', 'DAC', 90, 60, (w, h) => pg(`0,0 ${w * .75},0 ${w},${h / 2} ${w * .75},${h} 0,${h}`), { deftext: 'DAC', tb: (w, h) => [2, 0, w * .75, h] });
  add(CS, 'amp', 'Amplifier', 80, 70, (w, h) => pg(`0,0 ${w},${h / 2} 0,${h}`) + l(w * .1, h / 2, w * .4, h / 2), { notext: 1 });
  add(CS, 'antenna', 'Antenna', 50, 70, (w, h) => l(w / 2, h * .3, w / 2, h) + pl(`0,0 ${w / 2},${h * .3} ${w},0`) + l(w / 2, 0, w / 2, h * .3), { notext: 1 });
  add(CS, 'sampler', 'Sampler', 80, 40, (w, h) => l(0, h * .7, w * .35, h * .7) + l(w * .35, h * .7, w * .62, h * .2) + l(w * .65, h * .7, w, h * .7) + e(w * .35, h * .7, 2.5, 2.5, CF) + e(w * .65, h * .7, 2.5, 2.5, CF), { notext: 1 });
  add(CS, 'sensor', 'Sensor', 80, 60, (w, h) => r(0, 0, w, h, 6) + e(w / 2, h / 2, h * .25, h * .25, NF), { labelBelow: 1, tb: below });

  /* ---------- Electrical (more) ---------- */
  const EL = 'Electrical';
  const wire2 = (w, h, a, b) => l(0, h / 2, a, h / 2) + l(b, h / 2, w, h / 2);
  add(EL, 'pnp', 'PNP transistor', 60, 70, (w, h) => e(w * .55, h / 2, w * .38, h * .38, NF) + l(0, h / 2, w * .4, h / 2) + l(w * .4, h * .3, w * .4, h * .7, 'stroke-width="2.2"') + l(w * .4, h * .4, w * .75, h * .12) + l(w * .4, h * .6, w * .75, h * .88) + l(w * .75, h * .12, w * .75, 0) + l(w * .75, h * .88, w * .75, h) + pg(`${w * .42},${h * .39} ${w * .55},${h * .36} ${w * .5},${h * .27}`, CF), { labelBelow: 1, tb: below, st: { fill: 'none' } });
  add(EL, 'nmos', 'N-MOSFET', 60, 70, (w, h) => l(0, h / 2, w * .32, h / 2) + l(w * .32, h * .25, w * .32, h * .75, 'stroke-width="2"') + l(w * .42, h * .2, w * .42, h * .8, 'stroke-width="2"') + l(w * .42, h * .25, w * .8, h * .25) + l(w * .42, h * .75, w * .8, h * .75) + l(w * .8, 0, w * .8, h * .25) + l(w * .8, h * .75, w * .8, h) + l(w * .42, h / 2, w * .8, h / 2) + l(w * .8, h / 2, w * .8, h * .75) + pg(`${w * .45},${h / 2} ${w * .58},${h * .44} ${w * .58},${h * .56}`, CF), { labelBelow: 1, tb: below, st: { fill: 'none' } });
  add(EL, 'pmos', 'P-MOSFET', 60, 70, (w, h) => l(0, h / 2, w * .24, h / 2) + e(w * .28, h / 2, 3, 3, NF) + l(w * .32, h * .25, w * .32, h * .75, 'stroke-width="2"') + l(w * .42, h * .2, w * .42, h * .8, 'stroke-width="2"') + l(w * .42, h * .25, w * .8, h * .25) + l(w * .42, h * .75, w * .8, h * .75) + l(w * .8, 0, w * .8, h * .25) + l(w * .8, h * .75, w * .8, h) + l(w * .42, h / 2, w * .8, h / 2) + l(w * .8, h * .25, w * .8, h / 2) + pg(`${w * .7},${h / 2} ${w * .56},${h * .44} ${w * .56},${h * .56}`, CF), { labelBelow: 1, tb: below, st: { fill: 'none' } });
  add(EL, 'zener', 'Zener diode', 80, 30, (w, h) => wire2(w, h, w * .35, w * .62) + pg(`${w * .35},${h * .15} ${w * .62},${h / 2} ${w * .35},${h * .85}`) + pl(`${w * .57},${h * .05} ${w * .62},${h * .15} ${w * .62},${h * .85} ${w * .67},${h * .95}`), { labelBelow: 1, tb: below });
  add(EL, 'pot', 'Potentiometer', 90, 40, (w, h) => wire2(w, h * 1.2, w * .2, w * .8) + pl(`${w * .2},${h * .6} ${w * .27},${h * .35} ${w * .37},${h * .85} ${w * .47},${h * .35} ${w * .57},${h * .85} ${w * .67},${h * .35} ${w * .74},${h * .85} ${w * .8},${h * .6}`) + l(w / 2, 0, w / 2, h * .3) + pg(`${w / 2 - 4},${h * .22} ${w / 2},${h * .34} ${w / 2 + 4},${h * .22}`, CF), { labelBelow: 1, tb: below, st: { fill: 'none' } });
  add(EL, 'transformer', 'Transformer', 80, 80, (w, h) => { let s = ''; for (let i = 0; i < 4; i++) { s += p(`M${w * .3},${h * (.2 + i * .15)} a${h * .075},${h * .075} 0 0 0 0,${h * .15}`, NF) + p(`M${w * .7},${h * (.2 + i * .15)} a${h * .075},${h * .075} 0 0 1 0,${h * .15}`, NF) } return s + l(w * .46, h * .15, w * .46, h * .85) + l(w * .54, h * .15, w * .54, h * .85) + l(0, h * .2, w * .3, h * .2) + l(0, h * .8, w * .3, h * .8) + l(w * .7, h * .2, w, h * .2) + l(w * .7, h * .8, w, h * .8) }, { labelBelow: 1, tb: below, st: { fill: 'none' } });
  add(EL, 'crystal', 'Crystal', 80, 40, (w, h) => wire2(w, h, w * .3, w * .7) + l(w * .3, h * .15, w * .3, h * .85) + l(w * .7, h * .15, w * .7, h * .85) + r(w * .38, h * .1, w * .24, h * .8), { labelBelow: 1, tb: below, st: { fill: 'none' } });
  add(EL, 'relay', 'Relay', 90, 70, (w, h) => r(0, h * .15, w * .4, h * .7) + p(`M${w * .1},${h * .3} l${w * .2},${h * .1} l${-w * .2},${h * .1} l${w * .2},${h * .1}`, NF) + l(w * .55, h * .7, w * .9, h * .35) + l(w * .55, h * .7, w * .55, h) + l(w * .9, h * .3, w * .9, 0) + l(w * .4, h / 2, w * .7, h / 2, 'stroke-dasharray="3 3"'), { labelBelow: 1, tb: below, st: { fill: 'none' } });
  add(EL, 'pushbtn', 'Push button', 80, 40, (w, h) => wire2(w, h * 1.4, w * .3, w * .7) + e(w * .3, h * .7, 2.5, 2.5, CF) + e(w * .7, h * .7, 2.5, 2.5, CF) + l(w * .25, h * .4, w * .75, h * .4) + l(w / 2, h * .4, w / 2, 0), { labelBelow: 1, tb: below });
  add(EL, 'voltmeter', 'Voltmeter', 60, 60, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + tx(w / 2, h / 2 + 7, 'V', 18), { notext: 1, st: { fill: '#ffffff' } });
  add(EL, 'ammeter', 'Ammeter', 60, 60, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + tx(w / 2, h / 2 + 7, 'A', 18), { notext: 1, st: { fill: '#ffffff' } });
  add(EL, 'isource', 'Current source', 60, 60, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + l(w / 2, h * .78, w / 2, h * .3) + pg(`${w / 2 - 6},${h * .38} ${w / 2},${h * .22} ${w / 2 + 6},${h * .38}`, CF), { labelBelow: 1, tb: below });
  add(EL, 'ldr', 'Light sensor (LDR)', 80, 40, (w, h) => wire2(w, h, w * .25, w * .75) + r(w * .25, h * .3, w * .5, h * .4) + l(w * .3, 0, w * .42, h * .22) + l(w * .45, 0, w * .57, h * .22), { labelBelow: 1, tb: below });
  add(EL, 'capp', 'Polarised capacitor', 70, 40, (w, h) => wire2(w, h, w * .44, w * .56) + l(w * .44, h * .1, w * .44, h * .9) + p(`M${w * .6},${h * .1} Q${w * .54},${h / 2} ${w * .6},${h * .9}`, NF) + tx(w * .36, h * .3, '+', 10), { labelBelow: 1, tb: below });
  add(EL, 'icdip', 'IC chip', 100, 120, (w, h) => { let s = r(w * .2, 0, w * .6, h, 3) + p(`M${w * .43},0 A${w * .07},${w * .07} 0 0 0 ${w * .57},0`, NF); for (let i = 0; i < 4; i++) { const y = h * (i + .5) / 4; s += l(0, y, w * .2, y) + l(w * .8, y, w, y) } return s }, { deftext: 'IC', tb: (w, h) => [w * .2, 0, w * .6, h] });
  add(EL, 'seg7', '7-segment display', 60, 90, (w, h) => { const sg = (x1, y1, x2, y2) => l(x1, y1, x2, y2, 'stroke-width="4" stroke-linecap="round"'); return r(0, 0, w, h, 4, 'fill="#2a2d31"') + `<g stroke="#ff3b30">${sg(w * .3, h * .14, w * .7, h * .14)}${sg(w * .74, h * .18, w * .74, h * .46)}${sg(w * .74, h * .54, w * .74, h * .82)}${sg(w * .3, h * .86, w * .7, h * .86)}${sg(w * .26, h * .54, w * .26, h * .82)}${sg(w * .26, h * .18, w * .26, h * .46)}${sg(w * .3, h / 2, w * .7, h / 2)}</g>` }, { notext: 1 });

  /* ---------- Math and geometry ---------- */
  const MG = 'Math and geometry';
  add(MG, 'axes', 'Axes', 200, 150, (w, h) => l(10, h - 14, w, h - 14) + l(14, h - 10, 14, 0) + pg(`${w - 8},${h - 18} ${w},${h - 14} ${w - 8},${h - 10}`, CF) + pg(`10,8 14,0 18,8`, CF) + tx(w - 6, h - 1, 'x', 11) + tx(26, 10, 'y', 11), { notext: 1 });
  add(MG, 'plane', 'Coordinate plane', 180, 180, (w, h) => { let s = ''; for (let i = 1; i < 10; i++) s += l(w * i / 10, 0, w * i / 10, h, 'stroke-opacity="0.18"') + l(0, h * i / 10, w, h * i / 10, 'stroke-opacity="0.18"'); return s + l(0, h / 2, w, h / 2) + l(w / 2, 0, w / 2, h) }, { notext: 1 });
  add(MG, 'numberline', 'Number line', 260, 36, (w, h) => { let s = l(0, h * .4, w, h * .4); for (let i = 0; i <= 10; i++) { const x = 8 + (w - 16) * i / 10; s += l(x, h * .25, x, h * .55) + tx(x, h * .95, i - 5, 10) } return s }, { notext: 1 });
  add(MG, 'sinwave', 'Sine curve', 200, 80, (w, h) => { let d = ''; for (let i = 0; i <= 60; i++) { const x = w * i / 60, y = h / 2 - Math.sin(i / 60 * Math.PI * 4) * h * .4; d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1) } return p(d, NF + ' stroke-width="2"') }, { notext: 1 });
  add(MG, 'parabola', 'Parabola', 160, 120, (w, h) => p(`M0,0 Q${w / 2},${h * 2} ${w},0`, NF + ' stroke-width="2"'), { notext: 1 });
  add(MG, 'angle', 'Angle', 100, 80, (w, h) => pl(`${w},${h} 0,${h} ${w * .8},0`) + p(`M${w * .3},${h} A${w * .3},${w * .3} 0 0 0 ${w * .18},${h - w * .23}`, NF), { deftext: 'θ', tb: (w, h) => [w * .25, h * .55, w * .3, h * .35] });
  add(MG, 'rtrimarked', 'Right triangle (marked)', 110, 90, (w, h) => pg(`0,0 0,${h} ${w},${h}`, NF) + pl(`0,${h - 12} 12,${h - 12} 12,${h}`) + tx(-8, h / 2, 'a', 12) + tx(w / 2, h + 14, 'b', 12) + tx(w * .58, h * .42, 'c', 12), { notext: 1 });
  add(MG, 'circler', 'Circle with radius', 100, 100, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + l(w / 2, h / 2, w, h / 2) + e(w / 2, h / 2, 2, 2, CF) + tx(w * .75, h / 2 - 5, 'r', 12), { notext: 1 });
  add(MG, 'vector', 'Vector', 120, 60, (w, h) => l(0, h, w - 4, 4, 'stroke-width="2"') + pg(`${w},0 ${w - 14},${2} ${w - 6},${12}`, CF), { notext: 1 });
  add(MG, 'mathtext', 'Formula', 160, 40, () => '', { textOnly: 1, deftext: 'f(x) = ax² + bx + c', st: { italic: 1, fs: 16 } });
  add(MG, 'sigma', 'Sum Σ', 60, 70, (w, h) => tx(w / 2, h * .82, 'Σ', h * .9), { notext: 1 });
  add(MG, 'integral', 'Integral ∫', 50, 80, (w, h) => tx(w / 2, h * .82, '∫', h * .95), { notext: 1 });

  /* ---------- UML (more) ---------- */
  add('UML', 'enum', 'Enumeration', 140, 110, (w, h) => r(0, 0, w, h) + l(0, 40, w, 40), { deftext: '«enumeration»\nColor\n--\nRED\nGREEN\nBLUE', classText: 1 });
  add('UML', 'object', 'Object', 140, 60, (w, h) => r(0, 0, w, h), { deftext: 'obj : Class', st: { underline: 1 } });
  add('UML', 'action', 'Action', 130, 56, (w, h) => r(0, 0, w, h, 16));
  add('UML', 'astart', 'Activity start', 30, 30, (w, h) => e(w / 2, h / 2, w / 2, h / 2, CF), { notext: 1 });
  add('UML', 'aend', 'Activity end', 34, 34, (w, h) => e(w / 2, h / 2, w / 2, h / 2, NF) + e(w / 2, h / 2, w / 2 - 6, h / 2 - 6, CF), { notext: 1 });
  add('UML', 'lollipop', 'Provided interface', 60, 30, (w, h) => l(0, h / 2, w - h, h / 2) + e(w - h / 2, h / 2, h / 2 - 1, h / 2 - 1), { notext: 1 });
  add('UML', 'socket', 'Required interface', 60, 30, (w, h) => l(0, h / 2, w - h * .6, h / 2) + p(`M${w - 4},2 A${h / 2 - 2},${h / 2 - 2} 0 0 0 ${w - 4},${h - 2}`, NF), { notext: 1 });
  add('UML', 'boundary', 'Boundary', 70, 50, (w, h) => l(2, h * .2, 2, h * .8) + l(2, h / 2, w * .3, h / 2) + e(w * .63, h / 2, w * .33, h * .42), { labelBelow: 1, tb: below });
  add('UML', 'controlobj', 'Control', 50, 50, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + pl(`${w * .55},${-3} ${w * .42},0 ${w * .55},4`), { labelBelow: 1, tb: below });
  add('UML', 'entityobj', 'Entity', 50, 50, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + l(w * .1, h, w * .9, h), { labelBelow: 1, tb: below });
  add('UML', 'sdframe', 'Frame (sd)', 300, 200, (w, h) => r(0, 0, w, h) + pg(`0,0 ${Math.min(90, w * .4)},0 ${Math.min(90, w * .4)},14 ${Math.min(80, w * .36)},24 0,24`), { deftext: 'sd Login', tb: (w, h) => [4, 2, Math.min(80, w * .36), 22], st: { fill: 'none', align: 'left', fs: 12 } });

  /* ---------- Network (more) ---------- */
  const NW = 'Network';
  add(NW, 'tablet', 'Tablet', 60, 80, (w, h) => r(0, 0, w, h, 6) + r(w * .1, h * .08, w * .8, h * .76, 1) + e(w / 2, h * .92, 2.5, 2.5, NF), { labelBelow: 1, tb: below, st: { fill: '#f5f7fa' } });
  add(NW, 'rack', 'Server rack', 70, 110, (w, h) => { let s = r(0, 0, w, h, 3); for (let i = 0; i < 5; i++) { const y = 6 + i * (h - 12) / 5; s += r(6, y, w - 12, (h - 12) / 5 - 4, 1) + e(w - 14, y + (h - 12) / 10 - 2, 2, 2, 'fill="#1e8e5a" stroke="none"') } return s }, { labelBelow: 1, tb: below, st: { fill: '#f5f7fa' } });
  add(NW, 'lb', 'Load balancer', 70, 60, (w, h) => r(0, 0, w, h, 6) + l(w * .2, h / 2, w * .45, h / 2) + l(w * .45, h / 2, w * .8, h * .22) + l(w * .45, h / 2, w * .8, h / 2) + l(w * .45, h / 2, w * .8, h * .78), { labelBelow: 1, tb: below, st: { fill: '#dbe7f6' } });
  add(NW, 'tower', 'Cell tower', 60, 90, (w, h) => pl(`${w * .2},${h} ${w / 2},${h * .2} ${w * .8},${h}`) + l(w * .32, h * .65, w * .68, h * .65) + e(w / 2, h * .15, 4, 4, CF) + p(`M${w * .3},${h * .05} Q${w * .22},${h * .15} ${w * .3},${h * .25}`, NF) + p(`M${w * .7},${h * .05} Q${w * .78},${h * .15} ${w * .7},${h * .25}`, NF), { labelBelow: 1, tb: below, st: { fill: 'none' } });
  add(NW, 'satellite', 'Satellite', 90, 60, (w, h) => r(w * .38, h * .3, w * .24, h * .4, 3) + r(0, h * .35, w * .3, h * .3) + r(w * .7, h * .35, w * .3, h * .3) + l(w * .3, h / 2, w * .38, h / 2) + l(w * .62, h / 2, w * .7, h / 2), { labelBelow: 1, tb: below });
  add(NW, 'iot', 'IoT sensor', 56, 56, (w, h) => r(w * .2, h * .3, w * .6, h * .6, 6) + p(`M${w * .3},${h * .2} A${w * .25},${h * .25} 0 0 1 ${w * .7},${h * .2}`, NF) + p(`M${w * .38},${h * .26} A${w * .14},${h * .14} 0 0 1 ${w * .62},${h * .26}`, NF), { labelBelow: 1, tb: below, st: { fill: '#d5f0e3' } });
  add(NW, 'cctv', 'Camera', 80, 50, (w, h) => r(0, h * .1, w * .7, h * .5, 6) + pg(`${w * .7},${h * .2} ${w},${h * .05} ${w},${h * .65} ${w * .7},${h * .5}`) + l(w * .3, h * .6, w * .3, h), { labelBelow: 1, tb: below });
  add(NW, 'nas', 'Storage (NAS)', 70, 70, (w, h) => r(0, 0, w, h, 6) + r(6, h * .15, w - 12, h * .3, 2) + r(6, h * .55, w - 12, h * .3, 2), { labelBelow: 1, tb: below, st: { fill: '#f5f7fa' } });
  add(NW, 'dbserver', 'Database server', 70, 80, (w, h) => { const k = h * .12; return p(`M0,${k} A${w / 2},${k} 0 0 1 ${w},${k} V${h - k} A${w / 2},${k} 0 0 1 0,${h - k} Z`) + p(`M0,${k} A${w / 2},${k} 0 0 0 ${w},${k}`, NF) + p(`M0,${h * .45} A${w / 2},${k} 0 0 0 ${w},${h * .45}`, NF) }, { labelBelow: 1, tb: below, st: { fill: '#dbe7f6' } });

  window.CED_CATS = ['General', 'Basic', 'Arrows', '3D', 'Flowchart', 'Neural networks', 'Logic gates', 'Electrical', 'Architecture', 'Data structures', 'Charts and infographics', 'Icons', 'Network', 'UML', 'ER diagram', 'State machine', 'BPMN', 'Control and signals', 'Math and geometry', 'Timing', 'My shapes'];

  /* ---------- the user's own shapes ---------- */
  // def: {id, name, kind:'poly'|'svg', pts:[[x,y],...] in 0..1 (poly), closed, curved, d3:{depth}, svg, vw, vh}
  function polyPath(pts, w, h, closed, curved) {
    const P = pts.map(([x, y]) => [x * w, y * h]); if (!P.length) return '';
    if (!curved) return 'M' + P.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L') + (closed ? ' Z' : '');
    // smooth curve through the points (Catmull-Rom as cubic Bézier)
    const n = P.length; const get = i => closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
    let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`; const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) { const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2); const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]; d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}` }
    return d + (closed ? ' Z' : '');
  }
  function registerCustom(def) {
    const key = 'my_' + def.id;
    let draw;
    if (def.kind === 'svg') draw = (w, h) => `<g transform="scale(${w / def.vw},${h / def.vh})">${def.svg}</g>`;
    else if (def.d3) draw = (w, h, o) => {
      // extrude the outline: back face, side walls, front face, so it looks like a solid
      const k = Math.max(3, Math.min(+(o.st.depth ?? def.d3.depth ?? 16), w * .5, h * .5)); const fw = w - k, fh = h - k;
      const F = def.pts.map(([x, y]) => [x * fw, k + y * fh]), B = F.map(([x, y]) => [x + k, y - k]); let s = '';
      s += p(polyPath(def.pts, fw, fh, true, def.curved).replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (m, a, b) => `${(+a + k).toFixed(1)},${(+b).toFixed(1)}`), 'fill-opacity="0.85"');
      for (let i = 0; i < F.length; i++) { const j = (i + 1) % F.length; s += pg(`${F[i][0]},${F[i][1]} ${F[j][0]},${F[j][1]} ${B[j][0]},${B[j][1]} ${B[i][0]},${B[i][1]}`) + pg(`${F[i][0]},${F[i][1]} ${F[j][0]},${F[j][1]} ${B[j][0]},${B[j][1]} ${B[i][0]},${B[i][1]}`, (F[j][0] - F[i][0]) * 1 + (F[j][1] - F[i][1]) * -1 > 0 ? LIGHT : DARK) }
      s += p(polyPath(def.pts, fw, fh, true, def.curved).replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (m, a, b) => `${(+a).toFixed(1)},${(+b + k).toFixed(1)}`));
      return s
    };
    else draw = (w, h) => p(polyPath(def.pts, w, h, def.closed !== false, def.curved), def.closed === false ? NF : '');
    S[key] = { cat: 'My shapes', key, name: def.name || 'My shape', w: def.w || 100, h: def.h || 80, draw, custom: def, st3d: def.d3 ? 1 : 0, notext: def.kind === 'svg' ? 0 : 0 };
    return key;
  }
  window.CED_CUSTOM = { register: registerCustom, polyPath };
})();
