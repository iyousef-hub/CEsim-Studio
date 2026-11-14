/* CEsim Diagram — shape library. Each shape: name, category, default size, SVG body (w,h,o) and optional ports/text box. */
(function () {
  const r = (x, y, w, h, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" rx="${rx}" ${extra}/>`;
  const e = (cx, cy, rx, ry, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(0, rx)}" ry="${Math.max(0, ry)}" ${extra}/>`;
  const p = (d, extra = '') => `<path d="${d}" ${extra}/>`;
  const l = (x1, y1, x2, y2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" fill="none" ${extra}/>`;
  const pl = (pts, extra = '') => `<polyline points="${pts}" fill="none" ${extra}/>`;
  const pg = (pts, extra = '') => `<polygon points="${pts}" ${extra}/>`;
  const tx = (x, y, s, size = 10, anchor = 'middle', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="currentColor" stroke="none" font-family="IBM Plex Sans, Arial, sans-serif" ${extra}>${s}</text>`;
  const NF = 'fill="none"', CF = 'fill="currentColor"';
  const S = {};
  const add = (cat, key, name, w, h, draw, opt = {}) => { S[key] = Object.assign({ cat, key, name, w, h, draw }, opt); };
  const IN2 = [[0, 0.3, 'W'], [0, 0.7, 'W'], [1, 0.5, 'E']], IN1 = [[0, 0.5, 'W'], [1, 0.5, 'E']], TWO = [[0, 0.5, 'W'], [1, 0.5, 'E']];
  const below = (w, h) => [-50, h + 4, w + 100, 34];

  /* ---------- General ---------- */
  add('General', 'rect', 'Rectangle', 120, 60, (w, h) => r(0, 0, w, h));
  add('General', 'round', 'Rounded rectangle', 120, 60, (w, h, o) => r(0, 0, w, h, Math.min(o.st.radius ?? 10, h / 2, w / 2)));
  add('General', 'ellipse', 'Ellipse', 120, 70, (w, h) => e(w / 2, h / 2, w / 2, h / 2));
  add('General', 'circle', 'Circle', 70, 70, (w, h) => e(w / 2, h / 2, w / 2, h / 2));
  add('General', 'diamond', 'Diamond', 100, 80, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`), { tb: (w, h) => [w * 0.18, h * 0.2, w * 0.64, h * 0.6] });
  add('General', 'triangle', 'Triangle', 90, 80, (w, h) => pg(`${w / 2},0 ${w},${h} 0,${h}`), { tb: (w, h) => [w * 0.2, h * 0.4, w * 0.6, h * 0.55] });
  add('General', 'hexagon', 'Hexagon', 120, 70, (w, h) => { const k = Math.min(w * 0.25, h * 0.5); return pg(`${k},0 ${w - k},0 ${w},${h / 2} ${w - k},${h} ${k},${h} 0,${h / 2}`) });
  add('General', 'parallelogram', 'Parallelogram', 130, 60, (w, h) => { const k = Math.min(w * 0.2, 24); return pg(`${k},0 ${w},0 ${w - k},${h} 0,${h}`) });
  add('General', 'trapezoid', 'Trapezoid', 120, 60, (w, h) => { const k = Math.min(w * 0.2, 24); return pg(`${k},0 ${w - k},0 ${w},${h} 0,${h}`) });
  add('General', 'cylinder', 'Cylinder', 80, 90, (w, h) => { const k = Math.min(h * 0.15, 14); return p(`M0,${k} A${w / 2},${k} 0 0 1 ${w},${k} V${h - k} A${w / 2},${k} 0 0 1 0,${h - k} Z`) + p(`M0,${k} A${w / 2},${k} 0 0 0 ${w},${k}`, NF) }, { tb: (w, h) => [4, h * 0.3, w - 8, h * 0.6] });
  add('General', 'document', 'Document', 120, 70, (w, h) => { const k = h * 0.12; return p(`M0,0 H${w} V${h - k} C${w * 0.75},${h - 3 * k} ${w * 0.25},${h + k} 0,${h - k} Z`) }, { tb: (w, h) => [4, 4, w - 8, h * 0.78] });
  add('General', 'note', 'Note', 110, 80, (w, h) => { const k = Math.min(16, w / 5, h / 5); return p(`M0,0 H${w - k} L${w},${k} V${h} H0 Z`) + p(`M${w - k},0 V${k} H${w}`, NF) });
  add('General', 'cloud', 'Cloud', 130, 80, (w, h) => p(`M${w * .25},${h * .8} C${w * .02},${h * .82} ${w * .02},${h * .45} ${w * .22},${h * .42} C${w * .2},${h * .12} ${w * .52},${h * .05} ${w * .6},${h * .28} C${w * .72},${h * .12} ${w * .95},${h * .22} ${w * .88},${h * .45} C${w * 1.02},${h * .55} ${w * .98},${h * .85} ${w * .76},${h * .8} Z`), { tb: (w, h) => [w * .15, h * .3, w * .7, h * .45] });
  add('General', 'star', 'Star', 80, 80, (w, h) => { let s = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.4 : 1; s += `${w / 2 + Math.cos(a) * w / 2 * rr},${h * 0.55 + Math.sin(a) * h / 2 * rr} ` } return pg(s) }, { tb: (w, h) => [w * .3, h * .35, w * .4, h * .35] });
  add('General', 'blockarrow', 'Block arrow', 120, 60, (w, h) => { const k = Math.min(w * 0.35, h * 0.7); return pg(`0,${h * .25} ${w - k},${h * .25} ${w - k},0 ${w},${h / 2} ${w - k},${h} ${w - k},${h * .75} 0,${h * .75}`) }, { tb: (w, h) => [4, h * .25, w * .7, h * .5] });
  add('General', 'doublearrow', 'Double arrow', 140, 60, (w, h) => { const k = Math.min(w * 0.25, h * 0.7); return pg(`0,${h / 2} ${k},0 ${k},${h * .25} ${w - k},${h * .25} ${w - k},0 ${w},${h / 2} ${w - k},${h} ${w - k},${h * .75} ${k},${h * .75} ${k},${h}`) }, { tb: (w, h) => [w * .2, h * .25, w * .6, h * .5] });
  add('General', 'callout', 'Callout', 130, 80, (w, h) => { const b = h * 0.75; return p(`M0,0 H${w} V${b} H${w * .45} L${w * .25},${h} L${w * .3},${b} H0 Z`) }, { tb: (w, h) => [6, 4, w - 12, h * .7] });
  add('General', 'container', 'Container', 220, 160, (w, h) => r(0, 0, w, h) + r(0, 0, w, 26, 0, CF + ' fill-opacity="0.12"') + l(0, 26, w, 26), { tb: (w, h) => [6, 2, w - 12, 24] });
  add('General', 'text', 'Text', 120, 30, () => '', { textOnly: 1 });
  add('General', 'heading', 'Heading', 260, 44, () => '', { textOnly: 1, st: { fs: 24, bold: 1 } });
  add('General', 'sticky', 'Sticky note', 140, 110, (w, h) => r(0, 0, w, h, 2), { st: { fill: '#fff4b0', stroke: '#e0c34a' }, valign: 'top' });
  add('General', 'divider', 'Divider', 300, 6, (w, h) => l(0, h / 2, w, h / 2), { notext: 1 });
  add('General', 'table3', 'Table 3×3', 240, 96, (w, h) => r(0, 0, w, h, 0, NF) + r(0, 0, w, h / 3, 0, CF + ' fill-opacity="0.1"') + l(0, h / 3, w, h / 3) + l(0, h * 2 / 3, w, h * 2 / 3) + l(w / 3, 0, w / 3, h) + l(w * 2 / 3, 0, w * 2 / 3, h), { grid: [3, 3] });

  /* ---------- Flowchart ---------- */
  add('Flowchart', 'terminator', 'Start / end', 120, 50, (w, h) => r(0, 0, w, h, h / 2));
  add('Flowchart', 'process', 'Process', 120, 60, (w, h) => r(0, 0, w, h));
  add('Flowchart', 'decision', 'Decision', 120, 80, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`), { tb: (w, h) => [w * 0.18, h * 0.2, w * 0.64, h * 0.6] });
  add('Flowchart', 'io', 'Input / output', 130, 60, (w, h) => { const k = Math.min(w * 0.2, 22); return pg(`${k},0 ${w},0 ${w - k},${h} 0,${h}`) });
  add('Flowchart', 'predefined', 'Predefined process', 130, 60, (w, h) => r(0, 0, w, h) + l(12, 0, 12, h) + l(w - 12, 0, w - 12, h), { tb: (w, h) => [16, 4, w - 32, h - 8] });
  add('Flowchart', 'manualinput', 'Manual input', 120, 60, (w, h) => pg(`0,${h * .3} ${w},0 ${w},${h} 0,${h}`), { tb: (w, h) => [4, h * .3, w - 8, h * .66] });
  add('Flowchart', 'preparation', 'Preparation', 130, 60, (w, h) => { const k = Math.min(w * 0.2, 24); return pg(`${k},0 ${w - k},0 ${w},${h / 2} ${w - k},${h} ${k},${h} 0,${h / 2}`) });
  add('Flowchart', 'delay', 'Delay', 110, 60, (w, h) => p(`M0,0 H${w - h / 2} A${h / 2},${h / 2} 0 0 1 ${w - h / 2},${h} H0 Z`));
  add('Flowchart', 'fdocument', 'Document', 120, 70, (w, h) => S.document.draw(w, h), { tb: (w, h) => [4, 4, w - 8, h * 0.78] });
  add('Flowchart', 'database', 'Database', 80, 90, (w, h) => S.cylinder.draw(w, h), { tb: (w, h) => [4, h * 0.3, w - 8, h * 0.6] });
  add('Flowchart', 'connector', 'Connector', 40, 40, (w, h) => e(w / 2, h / 2, w / 2, h / 2));
  add('Flowchart', 'offpage', 'Off-page', 60, 60, (w, h) => pg(`0,0 ${w},0 ${w},${h * .65} ${w / 2},${h} 0,${h * .65}`), { tb: (w, h) => [2, 2, w - 4, h * .6] });
  add('Flowchart', 'manualop', 'Manual operation', 120, 60, (w, h) => { const k = Math.min(w * 0.18, 22); return pg(`0,0 ${w},0 ${w - k},${h} ${k},${h}`) });
  add('Flowchart', 'merge', 'Merge', 70, 50, (w, h) => pg(`0,0 ${w},0 ${w / 2},${h}`), { tb: (w, h) => [w * .2, 2, w * .6, h * .5] });
  add('Flowchart', 'loop', 'Loop limit', 120, 60, (w, h) => { const k = Math.min(w * .15, h * .35); return pg(`${k},0 ${w - k},0 ${w},${k} ${w},${h} 0,${h} 0,${k}`) });

  /* ---------- Logic gates ---------- */
  const gate = (body, inv, x2 = 0.82) => (w, h) => {
    let s = body(w, h);
    const ix = w * 0.18;
    if (inv) s += e(w * x2 + 5, h / 2, 4.5, 4.5) + l(w * x2 + 10, h / 2, w, h / 2); else s += l(w * x2, h / 2, w, h / 2);
    return s;
  };
  const andB = (w, h) => p(`M${w * .18},${h * .1} H${w * .5} A${w * .32},${h * .4} 0 0 1 ${w * .5},${h * .9} H${w * .18} Z`) + l(0, h * .3, w * .18, h * .3) + l(0, h * .7, w * .18, h * .7);
  const orB = (w, h, ex = 0) => p(`M${w * .14},${h * .1} Q${w * .55},${h * .1} ${w * .82},${h / 2} Q${w * .55},${h * .9} ${w * .14},${h * .9} Q${w * .3},${h / 2} ${w * .14},${h * .1} Z`) + l(0, h * .3, w * .22, h * .3) + l(0, h * .7, w * .22, h * .7) + (ex ? p(`M${w * .06},${h * .1} Q${w * .22},${h / 2} ${w * .06},${h * .9}`, NF) : '');
  const notB = (w, h) => pg(`${w * .2},${h * .15} ${w * .72},${h / 2} ${w * .2},${h * .85}`) + l(0, h / 2, w * .2, h / 2);
  add('Logic gates', 'and', 'AND', 70, 44, gate(andB, 0), { ports: IN2, notext: 1 });
  add('Logic gates', 'nand', 'NAND', 70, 44, gate(andB, 1), { ports: IN2, notext: 1 });
  add('Logic gates', 'or', 'OR', 70, 44, gate(orB, 0), { ports: IN2, notext: 1 });
  add('Logic gates', 'nor', 'NOR', 70, 44, gate(orB, 1), { ports: IN2, notext: 1 });
  add('Logic gates', 'xor', 'XOR', 70, 44, gate((w, h) => orB(w, h, 1), 0), { ports: IN2, notext: 1 });
  add('Logic gates', 'xnor', 'XNOR', 70, 44, gate((w, h) => orB(w, h, 1), 1), { ports: IN2, notext: 1 });
  add('Logic gates', 'not', 'NOT', 60, 40, gate(notB, 1, 0.72), { ports: IN1, notext: 1 });
  add('Logic gates', 'buffer', 'Buffer', 60, 40, gate(notB, 0, 0.72), { ports: IN1, notext: 1 });
  add('Logic gates', 'input', 'Input switch', 50, 30, (w, h) => r(0, 0, w * .7, h, 3) + l(w * .7, h / 2, w, h / 2), { ports: [[1, 0.5, 'E']], tb: (w, h) => [0, 0, w * .7, h] });
  add('Logic gates', 'output', 'Output probe', 50, 30, (w, h) => l(0, h / 2, w * .35, h / 2) + e(w * .65, h / 2, h * .45, h * .45), { ports: [[0, 0.5, 'W']], tb: (w, h) => [w * .3, 0, w * .7, h] });
  add('Logic gates', 'clock', 'Clock', 56, 36, (w, h) => r(0, 0, w * .72, h, 3) + pl(`${w * .1},${h * .7} ${w * .22},${h * .7} ${w * .22},${h * .3} ${w * .38},${h * .3} ${w * .38},${h * .7} ${w * .52},${h * .7} ${w * .52},${h * .3} ${w * .62},${h * .3}`) + l(w * .72, h / 2, w, h / 2), { ports: [[1, 0.5, 'E']], notext: 1 });
  add('Logic gates', 'dff', 'D flip-flop', 80, 90, (w, h) => r(10, 0, w - 20, h) + l(0, h * .25, 10, h * .25) + l(0, h * .75, 10, h * .75) + l(w - 10, h * .25, w, h * .25) + l(w - 10, h * .75, w, h * .75) + pl(`10,${h * .68} 18,${h * .75} 10,${h * .82}`) + tx(16, h * .25 + 4, 'D', 10, 'start') + tx(w - 16, h * .25 + 4, 'Q', 10, 'end') + tx(w - 16, h * .75 + 4, 'Q̅', 10, 'end') + tx(w / 2, h - 6, 'DFF', 9), { ports: [[0, .25, 'W'], [0, .75, 'W'], [1, .25, 'E'], [1, .75, 'E']], notext: 1 });
  add('Logic gates', 'jkff', 'JK flip-flop', 80, 90, (w, h) => r(10, 0, w - 20, h) + l(0, h * .2, 10, h * .2) + l(0, h * .5, 10, h * .5) + l(0, h * .8, 10, h * .8) + l(w - 10, h * .2, w, h * .2) + l(w - 10, h * .8, w, h * .8) + pl(`10,${h * .43} 18,${h * .5} 10,${h * .57}`) + tx(16, h * .2 + 4, 'J', 10, 'start') + tx(16, h * .8 + 4, 'K', 10, 'start') + tx(w - 16, h * .2 + 4, 'Q', 10, 'end') + tx(w - 16, h * .8 + 4, 'Q̅', 10, 'end'), { ports: [[0, .2, 'W'], [0, .5, 'W'], [0, .8, 'W'], [1, .2, 'E'], [1, .8, 'E']], notext: 1 });
  add('Logic gates', 'mux2', 'MUX 2:1', 50, 80, (w, h) => pg(`8,0 ${w - 8},${h * .2} ${w - 8},${h * .8} 8,${h}`) + l(0, h * .3, 8, h * .3) + l(0, h * .7, 8, h * .7) + l(w - 8, h / 2, w, h / 2) + l(w / 2, h * .9, w / 2, h) + tx(14, h * .3 + 4, '0', 9, 'start') + tx(14, h * .7 + 4, '1', 9, 'start'), { ports: [[0, .3, 'W'], [0, .7, 'W'], [1, .5, 'E'], [.5, 1, 'S']], notext: 1 });
  add('Logic gates', 'decoder', 'Decoder 2:4', 70, 100, (w, h) => r(10, 0, w - 20, h) + [.35, .65].map(f => l(0, h * f, 10, h * f)).join('') + [.2, .4, .6, .8].map(f => l(w - 10, h * f, w, h * f)).join('') + tx(w / 2, h / 2 + 4, '2:4', 10), { ports: [[0, .35, 'W'], [0, .65, 'W'], [1, .2, 'E'], [1, .4, 'E'], [1, .6, 'E'], [1, .8, 'E']], notext: 1 });
  add('Logic gates', 'fa', 'Full adder', 70, 80, (w, h) => r(10, 0, w - 20, h) + [.25, .5, .75].map(f => l(0, h * f, 10, h * f)).join('') + [.3, .7].map(f => l(w - 10, h * f, w, h * f)).join('') + tx(w / 2, h / 2 + 4, 'FA', 12) + tx(15, h * .25 + 3, 'A', 8, 'start') + tx(15, h * .5 + 3, 'B', 8, 'start') + tx(15, h * .75 + 3, 'Cin', 8, 'start') + tx(w - 15, h * .3 + 3, 'S', 8, 'end') + tx(w - 15, h * .7 + 3, 'Co', 8, 'end'), { ports: [[0, .25, 'W'], [0, .5, 'W'], [0, .75, 'W'], [1, .3, 'E'], [1, .7, 'E']], notext: 1 });
  add('Logic gates', 'register', 'Register', 90, 60, (w, h) => r(0, 0, w, h) + pl(`0,${h * .7} 8,${h * .8} 0,${h * .9}`), { tb: (w, h) => [10, 4, w - 20, h - 8] });

  /* ---------- Electrical ---------- */
  const leads = (w, h, a, b) => l(0, h / 2, a, h / 2) + l(b, h / 2, w, h / 2);
  add('Electrical', 'resistor', 'Resistor', 80, 24, (w, h) => { const a = w * .22, b = w * .78, n = 6, st = (b - a) / n; let d = `M${a},${h / 2}`; for (let i = 0; i < n; i++) d += ` L${a + st * (i + .5)},${i % 2 ? h * .9 : h * .1}`; d += ` L${b},${h / 2}`; return leads(w, h, a, b) + p(d, NF) }, { ports: TWO, tb: below, notext: 0, labelBelow: 1 });
  add('Electrical', 'capacitor', 'Capacitor', 60, 30, (w, h) => leads(w, h, w * .44, w * .56) + l(w * .44, 0, w * .44, h) + l(w * .56, 0, w * .56, h), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'inductor', 'Inductor', 80, 24, (w, h) => { const a = w * .2, b = w * .8, n = 4, st = (b - a) / n, y = h * .7; let d = `M${a},${y}`; for (let i = 0; i < n; i++) d += ` A${st / 2},${st / 2} 0 0 1 ${a + st * (i + 1)},${y}`; return l(0, y, a, y) + l(b, y, w, y) + p(d, NF) }, { ports: [[0, .7, 'W'], [1, .7, 'E']], tb: below, labelBelow: 1 });
  add('Electrical', 'diode', 'Diode', 70, 30, (w, h) => leads(w, h, w * .38, w * .62) + pg(`${w * .38},${h * .1} ${w * .38},${h * .9} ${w * .62},${h / 2}`, CF) + l(w * .62, h * .1, w * .62, h * .9), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'led', 'LED', 70, 36, (w, h) => leads(w, h, w * .38, w * .62) + pg(`${w * .38},${h * .2} ${w * .38},${h * .8} ${w * .62},${h / 2}`, NF) + l(w * .62, h * .2, w * .62, h * .8) + l(w * .5, h * .15, w * .62, 0) + l(w * .6, h * .2, w * .72, h * .05), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'battery', 'Battery', 60, 36, (w, h) => leads(w, h, w * .44, w * .56) + l(w * .44, 0, w * .44, h) + l(w * .56, h * .25, w * .56, h * .75, 'stroke-width="3"') + tx(w * .32, h * .3, '+', 10), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'vsource', 'AC source', 60, 40, (w, h) => leads(w, h, w / 2 - h * .45, w / 2 + h * .45) + e(w / 2, h / 2, h * .45, h * .45, NF) + p(`M${w / 2 - h * .25},${h / 2} q${h * .125},-${h * .25} ${h * .25},0 t${h * .25},0`, NF), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'ground', 'Ground', 40, 30, (w, h) => l(w / 2, 0, w / 2, h * .45) + l(0, h * .45, w, h * .45) + l(w * .2, h * .7, w * .8, h * .7) + l(w * .38, h * .95, w * .62, h * .95), { ports: [[.5, 0, 'N']], notext: 1 });
  add('Electrical', 'switch', 'Switch', 70, 30, (w, h) => leads(w, h, w * .3, w * .7) + e(w * .3, h / 2, 2.5, 2.5, CF) + e(w * .7, h / 2, 2.5, 2.5, CF) + l(w * .3, h / 2, w * .66, h * .05), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'lamp', 'Lamp', 60, 40, (w, h) => leads(w, h, w / 2 - h * .4, w / 2 + h * .4) + e(w / 2, h / 2, h * .4, h * .4, NF) + l(w / 2 - h * .28, h * .22, w / 2 + h * .28, h * .78) + l(w / 2 - h * .28, h * .78, w / 2 + h * .28, h * .22), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'motor', 'Motor', 60, 40, (w, h) => leads(w, h, w / 2 - h * .42, w / 2 + h * .42) + e(w / 2, h / 2, h * .42, h * .42, NF) + tx(w / 2, h / 2 + 4, 'M', 12), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'npn', 'NPN transistor', 50, 60, (w, h) => l(0, h / 2, w * .4, h / 2) + l(w * .4, h * .25, w * .4, h * .75, 'stroke-width="2.5"') + l(w * .4, h * .4, w * .8, h * .12) + l(w * .8, h * .12, w * .8, 0) + l(w * .4, h * .6, w * .8, h * .88) + l(w * .8, h * .88, w * .8, h) + pg(`${w * .8},${h * .88} ${w * .66},${h * .86} ${w * .74},${h * .76}`, CF) + e(w * .62, h / 2, w * .38, h * .4, NF), { ports: [[0, .5, 'W'], [.8, 0, 'N'], [.8, 1, 'S']], tb: (w, h) => [w + 4, h * .3, 80, 24], notext: 0 });
  add('Electrical', 'opamp', 'Op-amp', 80, 70, (w, h) => pg(`${w * .15},0 ${w * .85},${h / 2} ${w * .15},${h}`, NF) + l(0, h * .3, w * .15, h * .3) + l(0, h * .7, w * .15, h * .7) + l(w * .85, h / 2, w, h / 2) + tx(w * .24, h * .3 + 4, '−', 12) + tx(w * .24, h * .7 + 4, '+', 12), { ports: [[0, .3, 'W'], [0, .7, 'W'], [1, .5, 'E']], tb: (w, h) => [w * .3, h * .35, w * .4, h * .3] });
  add('Electrical', 'fuse', 'Fuse', 70, 24, (w, h) => leads(w, h, w * .25, w * .75) + r(w * .25, h * .2, w * .5, h * .6, 0, NF) + l(w * .25, h / 2, w * .75, h / 2), { ports: TWO, tb: below, labelBelow: 1 });
  add('Electrical', 'speaker', 'Speaker', 50, 50, (w, h) => r(0, h * .3, w * .3, h * .4, 0, NF) + pg(`${w * .3},${h * .3} ${w * .7},0 ${w * .7},${h} ${w * .3},${h * .7}`, NF), { ports: [[0, .5, 'W']], tb: below, labelBelow: 1 });

  /* ---------- Computer architecture ---------- */
  add('Architecture', 'cpu', 'CPU', 120, 120, (w, h) => { let s = r(10, 10, w - 20, h - 20, 4); for (let i = 1; i < 6; i++) { const f = i / 6; s += l(10 + (w - 20) * f, 0, 10 + (w - 20) * f, 10) + l(10 + (w - 20) * f, h - 10, 10 + (w - 20) * f, h) + l(0, 10 + (h - 20) * f, 10, 10 + (h - 20) * f) + l(w - 10, 10 + (h - 20) * f, w, 10 + (h - 20) * f) } return s + r(w * .3, h * .3, w * .4, h * .4, 2, NF) }, { tb: (w, h) => [12, h * .72, w - 24, h * .18] });
  add('Architecture', 'alu', 'ALU', 90, 120, (w, h) => pg(`0,0 ${w},${h * .3} ${w},${h * .7} 0,${h} 0,${h * .6} ${w * .25},${h / 2} 0,${h * .4}`), { tb: (w, h) => [w * .3, h * .38, w * .65, h * .24], ports: [[0, .2, 'W'], [0, .8, 'W'], [1, .5, 'E'], [.5, .15, 'N']] });
  add('Architecture', 'adder', 'Adder', 60, 80, (w, h) => pg(`0,0 ${w},${h * .3} ${w},${h * .7} 0,${h} 0,${h * .6} ${w * .25},${h / 2} 0,${h * .4}`), { tb: (w, h) => [w * .3, h * .38, w * .65, h * .24], ports: [[0, .2, 'W'], [0, .8, 'W'], [1, .5, 'E']] });
  add('Architecture', 'regfile', 'Register file', 120, 130, (w, h) => r(0, 0, w, h) + [.2, .35, .5, .65, .8].map(f => l(w * .55, h * f, w - 6, h * f)).join('') + l(w * .55, h * .2, w * .55, h * .8), { tb: (w, h) => [4, 4, w * .5, h - 8] });
  add('Architecture', 'memory', 'Memory', 110, 130, (w, h) => r(0, 0, w, h) + [1, 2, 3, 4, 5, 6, 7].map(i => l(0, h * i / 8, w * .25, h * i / 8)).join(''), { tb: (w, h) => [w * .28, 4, w * .7, h - 8] });
  add('Architecture', 'cache', 'Cache', 100, 70, (w, h) => r(6, 0, w - 6, h - 6, 0, 'fill-opacity="0.6"') + r(0, 6, w - 6, h - 6), { tb: (w, h) => [4, 10, w - 14, h - 18] });
  add('Architecture', 'mux', 'MUX', 40, 90, (w, h) => p(`M0,${w / 2} A${w / 2},${w / 2} 0 0 1 ${w},${w / 2} V${h - w / 2} A${w / 2},${w / 2} 0 0 1 0,${h - w / 2} Z`), { ports: [[0, .3, 'W'], [0, .7, 'W'], [1, .5, 'E'], [.5, 0, 'N']], tb: (w, h) => [2, h * .3, w - 4, h * .4] });
  add('Architecture', 'pc', 'PC', 50, 80, (w, h) => r(0, 0, w, h) + pl(`0,${h * .78} 8,${h * .86} 0,${h * .94}`), { ports: TWO });
  add('Architecture', 'control', 'Control unit', 90, 130, (w, h) => e(w / 2, h / 2, w / 2, h / 2));
  add('Architecture', 'signext', 'Sign extend', 60, 80, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { st: { fs: 10 } });
  add('Architecture', 'shift', 'Shift left 2', 60, 60, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { st: { fs: 10 } });
  add('Architecture', 'bus', 'Bus', 220, 40, (w, h) => { const k = Math.min(30, w * .2); return pg(`0,${h / 2} ${k},0 ${k},${h * .28} ${w - k},${h * .28} ${w - k},0 ${w},${h / 2} ${w - k},${h} ${w - k},${h * .72} ${k},${h * .72} ${k},${h}`) }, { tb: (w, h) => [30, h * .28, w - 60, h * .44] });
  add('Architecture', 'pipereg', 'Pipeline register', 26, 220, (w, h) => r(0, 0, w, h), { st: { fill: '#dbe7f6' }, tb: (w, h) => [0, 4, w, 40] });
  add('Architecture', 'iodev', 'I/O device', 100, 60, (w, h) => r(0, 0, w, h, 6) + l(w * .1, h * .8, w * .9, h * .8));
  add('Architecture', 'stack', 'Stack', 90, 120, (w, h) => [0, 1, 2, 3, 4].map(i => r(0, h * i / 5, w, h / 5)).join(''), { tb: (w, h) => [0, 0, w, h / 5] });

  /* ---------- Network ---------- */
  const icon = (w, h, inner) => inner;
  add('Network', 'computer', 'Computer', 60, 56, (w, h) => r(w * .05, 0, w * .9, h * .66, 3) + r(w * .12, h * .08, w * .76, h * .5, 1, CF + ' fill-opacity="0.15"') + l(w / 2, h * .66, w / 2, h * .82) + l(w * .25, h * .9, w * .75, h * .9, 'stroke-width="3"'), { tb: below, labelBelow: 1 });
  add('Network', 'laptop', 'Laptop', 66, 50, (w, h) => r(w * .14, 0, w * .72, h * .7, 3) + r(w * .2, h * .08, w * .6, h * .52, 1, CF + ' fill-opacity="0.15"') + pg(`0,${h} ${w},${h} ${w * .88},${h * .74} ${w * .12},${h * .74}`), { tb: below, labelBelow: 1 });
  add('Network', 'server', 'Server', 50, 70, (w, h) => r(0, 0, w, h, 3) + [.25, .5, .75].map(f => l(0, h * f, w, h * f)).join('') + [.12, .37, .62].map(f => e(w * .8, h * f, 2.5, 2.5, CF)).join(''), { tb: below, labelBelow: 1 });
  add('Network', 'router', 'Router', 70, 46, (w, h) => e(w / 2, h * .32, w / 2, h * .3) + p(`M0,${h * .32} V${h * .68} A${w / 2},${h * .3} 0 0 0 ${w},${h * .68} V${h * .32}`) + p(`M${w * .25},${h * .32} H${w * .45} M${w * .55},${h * .32} H${w * .75} M${w / 2},${h * .1} V${h * .25} M${w / 2},${h * .39} V${h * .54}`, NF + ' stroke-width="2"'), { tb: below, labelBelow: 1 });
  add('Network', 'switch', 'Switch', 80, 36, (w, h) => r(0, 0, w, h, 3) + p(`M${w * .2},${h * .35} H${w * .8} M${w * .7},${h * .22} L${w * .8},${h * .35} L${w * .7},${h * .48} M${w * .8},${h * .65} H${w * .2} M${w * .3},${h * .52} L${w * .2},${h * .65} L${w * .3},${h * .78}`, NF + ' stroke-width="1.8"'), { tb: below, labelBelow: 1 });
  add('Network', 'firewall', 'Firewall', 64, 50, (w, h) => r(0, 0, w, h, 2) + [1, 2, 3].map(i => l(0, h * i / 4, w, h * i / 4)).join('') + [0, 1, 2, 3].map(i => l(w * (i % 2 ? .33 : .66), h * i / 4, w * (i % 2 ? .33 : .66), h * (i + 1) / 4)).join(''), { st: { fill: '#f6d3c6' }, tb: below, labelBelow: 1 });
  add('Network', 'internet', 'Internet', 110, 66, (w, h) => S.cloud.draw(w, h), { tb: (w, h) => [w * .15, h * .3, w * .7, h * .45] });
  add('Network', 'wifi', 'Access point', 60, 50, (w, h) => r(w * .1, h * .62, w * .8, h * .38, 4) + p(`M${w * .3},${h * .45} A${w * .25},${w * .25} 0 0 1 ${w * .7},${h * .45} M${w * .18},${h * .3} A${w * .4},${w * .4} 0 0 1 ${w * .82},${h * .3}`, NF), { tb: below, labelBelow: 1 });
  add('Network', 'phone', 'Phone', 34, 56, (w, h) => r(0, 0, w, h, 6) + r(w * .12, h * .1, w * .76, h * .72, 1, CF + ' fill-opacity="0.15"') + e(w / 2, h * .9, 2.5, 2.5, CF), { tb: below, labelBelow: 1 });
  add('Network', 'printer', 'Printer', 64, 50, (w, h) => r(0, h * .3, w, h * .45, 4) + r(w * .2, 0, w * .6, h * .3, 0) + r(w * .2, h * .6, w * .6, h * .4, 0), { tb: below, labelBelow: 1 });

  /* ---------- UML ---------- */
  add('UML', 'class', 'Class', 160, 110, (w, h, o) => { const parts = String(o.text || '').split(/\n-{2,}\n/); const lh = (o.st.fs || 13) * 1.35; const h1 = Math.max(26, lh + 8); const n2 = (parts[1] || '').split('\n').length; const h2 = Math.max(18, n2 * lh + 8); return r(0, 0, w, h) + l(0, h1, w, h1) + l(0, Math.min(h - 8, h1 + h2), w, Math.min(h - 8, h1 + h2)) }, { classText: 1 });
  add('UML', 'interface', 'Interface', 160, 80, (w, h) => r(0, 0, w, h) + l(0, 34, w, 34), { classText: 1 });
  add('UML', 'actor', 'Actor', 36, 70, (w, h) => e(w / 2, h * .12, w * .22, h * .12, NF) + l(w / 2, h * .24, w / 2, h * .62) + l(0, h * .36, w, h * .36) + l(w / 2, h * .62, 0, h) + l(w / 2, h * .62, w, h), { tb: below, labelBelow: 1 });
  add('UML', 'usecase', 'Use case', 140, 64, (w, h) => e(w / 2, h / 2, w / 2, h / 2));
  add('UML', 'package', 'Package', 160, 100, (w, h) => r(0, 0, w * .4, 18) + r(0, 18, w, h - 18), { tb: (w, h) => [4, 22, w - 8, h - 26], valign: 'top' });
  add('UML', 'component', 'Component', 140, 70, (w, h) => r(10, 0, w - 10, h) + r(0, h * .2, 20, 12) + r(0, h * .55, 20, 12), { tb: (w, h) => [24, 4, w - 28, h - 8] });
  add('UML', 'lifeline', 'Lifeline', 100, 260, (w, h) => r(0, 0, w, 40) + l(w / 2, 40, w / 2, h, 'stroke-dasharray="6 4"'), { tb: (w, h) => [2, 2, w - 4, 36] });
  add('UML', 'activation', 'Activation', 14, 80, (w, h) => r(0, 0, w, h), { notext: 1 });
  add('UML', 'node3d', 'Node', 140, 90, (w, h) => { const k = 12; return pg(`0,${k} ${k},0 ${w},0 ${w},${h - k} ${w - k},${h} 0,${h}`) + pl(`0,${k} ${w - k},${k} ${w},0`) + l(w - k, k, w - k, h) }, { tb: (w, h) => [4, 16, w - 20, h - 20] });
  add('UML', 'umlnote', 'Comment', 130, 70, (w, h) => S.note.draw(w, h));

  /* ---------- ER ---------- */
  add('ER diagram', 'entity', 'Entity', 120, 54, (w, h) => r(0, 0, w, h));
  add('ER diagram', 'weakentity', 'Weak entity', 120, 54, (w, h) => r(0, 0, w, h) + r(4, 4, w - 8, h - 8, 0, NF));
  add('ER diagram', 'relationship', 'Relationship', 120, 70, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`), { tb: (w, h) => [w * 0.18, h * 0.2, w * 0.64, h * 0.6] });
  add('ER diagram', 'weakrel', 'Identifying relationship', 120, 70, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`) + pg(`${w / 2},7 ${w - 12},${h / 2} ${w / 2},${h - 7} 12,${h / 2}`, NF), { tb: (w, h) => [w * 0.2, h * 0.22, w * 0.6, h * 0.56] });
  add('ER diagram', 'attribute', 'Attribute', 110, 50, (w, h) => e(w / 2, h / 2, w / 2, h / 2));
  add('ER diagram', 'keyattr', 'Key attribute', 110, 50, (w, h) => e(w / 2, h / 2, w / 2, h / 2), { st: { underline: 1 } });
  add('ER diagram', 'multiattr', 'Multivalued attribute', 110, 50, (w, h) => e(w / 2, h / 2, w / 2, h / 2) + e(w / 2, h / 2, w / 2 - 4, h / 2 - 4, NF));
  add('ER diagram', 'derivedattr', 'Derived attribute', 110, 50, (w, h) => e(w / 2, h / 2, w / 2, h / 2, 'stroke-dasharray="5 4"'));

  /* ---------- State machine ---------- */
  add('State machine', 'state', 'State', 120, 54, (w, h) => r(0, 0, w, h, 14));
  add('State machine', 'initial', 'Initial', 26, 26, (w, h) => e(w / 2, h / 2, w / 2, h / 2, CF), { notext: 1 });
  add('State machine', 'final', 'Final', 30, 30, (w, h) => e(w / 2, h / 2, w / 2, h / 2, NF) + e(w / 2, h / 2, w / 2 - 5, h / 2 - 5, CF), { notext: 1 });
  add('State machine', 'choice', 'Choice', 36, 36, (w, h) => pg(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`), { notext: 1 });
  add('State machine', 'forkbar', 'Fork / join', 140, 8, (w, h) => r(0, 0, w, h, 0, CF), { notext: 1 });
  add('State machine', 'composite', 'Composite state', 240, 160, (w, h) => r(0, 0, w, h, 14) + l(0, 28, w, 28), { tb: (w, h) => [6, 2, w - 12, 26] });

  /* ---------- Timing ---------- */
  const wave = (bits, w, h) => { const n = Math.max(1, bits.length); const st = w / n; let d = ''; let prev = null; for (let i = 0; i < n; i++) { const y = bits[i] === '1' ? h * .15 : bits[i] === 'x' || bits[i] === 'X' ? h / 2 : h * .85; if (prev === null) d += `M0,${y}`; else if (prev !== y) d += ` L${st * i},${y}`; d += ` L${st * (i + 1)},${y}`; prev = y } return d };
  add('Timing', 'digital', 'Digital signal', 240, 34, (w, h, o) => p(wave(String(o.text || '01101001').replace(/[^01xX]/g, ''), w, h), NF + ' stroke-width="1.8"'), { notext: 1, hint: 'Type a bit pattern, e.g. 0110 1001' });
  add('Timing', 'clockwave', 'Clock signal', 240, 34, (w, h, o) => { const n = Math.max(1, parseInt(o.text) || 8); return p(wave('10'.repeat(n), w, h), NF + ' stroke-width="1.8"') }, { notext: 1, hint: 'Type the number of periods' });
  add('Timing', 'buswave', 'Bus values', 240, 34, (w, h, o) => { const v = String(o.text || 'A|B|C|D').split('|'); const st = w / v.length; let s = ''; v.forEach((t, i) => { const x = st * i; s += pg(`${x + 4},${h * .15} ${x + st - 4},${h * .15} ${x + st},${h / 2} ${x + st - 4},${h * .85} ${x + 4},${h * .85} ${x},${h / 2}`, NF) + tx(x + st / 2, h / 2 + 4, t.trim(), 11) }); return s }, { notext: 1, hint: 'Separate values with |' });
  add('Timing', 'siglabel', 'Signal name', 70, 34, () => '', { textOnly: 1, st: { align: 'right', bold: 1 } });

  window.CED_SHAPES = S;
  window.CED_CATS = ['General', 'Flowchart', 'Logic gates', 'Electrical', 'Architecture', 'Network', 'UML', 'ER diagram', 'State machine', 'Timing'];
})();
