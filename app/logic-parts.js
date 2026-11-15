/* CEsim Logic - part definitions.
   Coordinates follow the common 10-unit logic grid. Every part is defined facing east;
   the editor rotates it for other facings. Values: integer (bits), null = floating, 'E' = conflict. */
'use strict';
(function () {
  const mask = w => (w >= 32 ? 0xFFFFFFFF : ((1 << w) >>> 0) - 1) >>> 0;
  const isNum = v => typeof v === 'number';
  const P = (x, y, dir, w, name) => ({ x, y, dir, w: w || 1, name: name || '' });

  /* gate input positions (size 50 gates, 30 for NOT/buffer) */
  function gateInputDy(n, i, size) {
    let start, dist, lower;
    if (n <= 3) { if (size < 40) { start = -5; dist = 10; lower = 10; } else if (size < 60 || n <= 2) { start = -10; dist = 20; lower = 20; } else { start = -15; dist = 30; lower = 30; } }
    else if (n === 4 && size >= 60) { start = -5; dist = 20; lower = 0; }
    else { start = -5; dist = 10; lower = 10; }
    if (n & 1) return start * (n - 1) + dist * i;
    let dy = start * n + dist * i; if (i >= n / 2) dy += lower; return dy;
  }
  function gateHalf(n) { return Math.max(25, Math.abs(gateInputDy(n, 0, 50)) + 5); }

  function bitOp(op, ins, w) {
    const m = mask(w);
    if (ins.some(v => v === 'E')) return 'E';
    const known = ins.filter(isNum);
    if (w === 1 && known.length !== ins.length) {
      if ((op === 'and' || op === 'nand') && known.some(v => v === 0)) return op === 'and' ? 0 : 1;
      if ((op === 'or' || op === 'nor') && known.some(v => v === 1)) return op === 'or' ? 1 : 0;
      return null;
    }
    if (known.length !== ins.length) return null;
    let r;
    if (op === 'and' || op === 'nand') { r = m; for (const v of ins) r &= v; }
    else if (op === 'or' || op === 'nor') { r = 0; for (const v of ins) r |= v; }
    else { r = 0; for (const v of ins) r ^= v; }
    if (op === 'nand' || op === 'nor' || op === 'xnor') r = ~r;
    return (r & m) >>> 0;
  }

  /* drawing helpers (g is a 2D context already transformed to the part, facing east) */
  const C = { body: '#ffffff', line: '#1b2230', dim: '#5e6979' };
  function andShape(g, half, x0) { g.beginPath(); g.moveTo(x0, -half); g.lineTo(-25, -half); g.arc(-25, 0, half, -Math.PI / 2, Math.PI / 2); g.lineTo(x0, half); g.closePath(); }
  function orShape(g, half, x0) { g.beginPath(); g.moveTo(x0, -half); g.quadraticCurveTo(-18, -half, 0, 0); g.quadraticCurveTo(-18, half, x0, half); g.quadraticCurveTo(x0 + 12, 0, x0, -half); g.closePath(); }
  function bubble(g, x) { g.beginPath(); g.arc(x, 0, 4, 0, Math.PI * 2); g.fillStyle = C.body; g.fill(); g.stroke(); }
  function box(g, x1, y1, x2, y2) { g.beginPath(); g.rect(x1, y1, x2 - x1, y2 - y1); g.fillStyle = C.body; g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke(); }
  function txt(g, s, x, y, size, align, color, bold) { g.save(); g.font = (bold ? '600 ' : '') + (size || 10) + 'px "IBM Plex Sans", sans-serif'; g.fillStyle = color || C.line; g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore(); }
  function clockMark(g, x, y) { g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 6, y); g.lineTo(x, y + 5); g.stroke(); }
  const hex = (v, w) => v === null || v === undefined ? 'x'.repeat(Math.max(1, Math.ceil(w / 4))) : v === 'E' ? 'E' : (w <= 1 ? String(v) : (v >>> 0).toString(16).toUpperCase().padStart(Math.ceil(w / 4), '0'));

  const gate = (op, label, shape) => ({
    name: label, cat: 'Gates', attrs: { inputs: 2, width: 1, label: '' },
    pins(a) { const n = +a.inputs, x = op === 'xor' || op === 'xnor' ? -60 : -50; const p = []; for (let i = 0; i < n; i++) p.push(P(x, gateInputDy(n, i, 50), 'in', +a.width, 'in' + i)); p.push(P(0, 0, 'out', +a.width, 'out')); return p; },
    box(a) { const h = gateHalf(+a.inputs); return [op === 'xor' || op === 'xnor' ? -60 : -50, -h, 0, h]; },
    eval(a, ins) { return [bitOp(op, ins, +a.width)]; },
    draw(g, a) {
      const n = +a.inputs, h = gateHalf(n), neg = /^n|xnor/.test(op); const right = neg ? -8 : 0; g.save(); g.translate(right, 0);
      g.lineWidth = 2; g.strokeStyle = C.line; g.fillStyle = C.body;
      if (shape === 'and') andShape(g, h, -50); else orShape(g, h, -50);
      g.fill(); g.stroke();
      if (op === 'xor' || op === 'xnor') { g.beginPath(); g.moveTo(-58, -h); g.quadraticCurveTo(-46, 0, -58, h); g.stroke(); }
      g.restore();
      if (neg) { g.strokeStyle = C.line; g.lineWidth = 2; bubble(g, -4); }
      g.strokeStyle = C.line; g.lineWidth = 2; const xs = op === 'xor' || op === 'xnor' ? -60 : -50;
      for (let i = 0; i < n; i++) { const dy = gateInputDy(n, i, 50); const edge = shape === 'and' ? -50 : -50 + 12 * (1 - (dy * dy) / (h * h)) * 0.9; g.beginPath(); g.moveTo(xs, dy); g.lineTo(op === 'xor' || op === 'xnor' ? -56 : edge, dy); g.stroke(); }
    }
  });

  const T = {};
  /* ---------- Wiring and I/O ---------- */
  T.pin = {
    name: 'Input pin', cat: 'Inputs and outputs', attrs: { width: 1, label: '' }, input: true,
    pins(a) { return [P(0, 0, 'out', +a.width, 'out')]; },
    box(a) { const w = +a.width; const bw = w === 1 ? 20 : Math.min(8, w) * 10 + 4; const rows = Math.ceil(w / 8); return [-bw, -10 - (rows - 1) * 10, 0, 10 + (rows - 1) * 10]; },
    eval(a, ins, st) { return [st.v === undefined ? 0 : st.v & mask(+a.width)]; },
    draw(g, a, st, vals) {
      const b = this.box(a), w = +a.width; g.lineWidth = 2; g.strokeStyle = C.line; g.fillStyle = C.body;
      g.beginPath(); g.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); g.fill(); g.stroke();
      const v = st.v || 0;
      if (w === 1) { g.beginPath(); g.arc(-10, 0, 6, 0, Math.PI * 2); g.fillStyle = v ? '#2fb344' : '#1f5c2e'; g.fill(); txt(g, String(v), -10, 0.5, 9, 'center', '#fff', true); }
      else for (let i = 0; i < w; i++) { const r = Math.floor(i / 8), c = i % 8, bit = (v >>> (w - 1 - i)) & 1; txt(g, String(bit), b[0] + 7 + c * 10, b[1] + 10 + r * 20 - (Math.ceil(w / 8) > 1 ? 0 : 0), 11, 'center', bit ? '#1f8a3a' : C.line, true); }
    },
    click(a, st, lx, ly) { const w = +a.width; if (w === 1) { st.v = st.v ? 0 : 1; return; } const b = this.box(a); const c = Math.floor((lx - b[0] - 2) / 10), r = Math.floor((ly - b[1]) / 20); const i = r * 8 + c; if (i >= 0 && i < w) st.v = ((st.v || 0) ^ (1 << (w - 1 - i))) >>> 0; }
  };
  T.outpin = {
    name: 'Output pin', cat: 'Inputs and outputs', attrs: { width: 1, label: '' }, output: true,
    pins(a) { return [P(0, 0, 'in', +a.width, 'in')]; },
    box(a) { const w = +a.width; const bw = w === 1 ? 20 : Math.min(8, w) * 10 + 4; const rows = Math.ceil(w / 8); return [0, -10 - (rows - 1) * 10, bw, 10 + (rows - 1) * 10]; },
    eval() { return []; },
    draw(g, a, st, vals) {
      const b = this.box(a), w = +a.width, v = vals[0]; g.lineWidth = 2; g.strokeStyle = C.line; g.fillStyle = C.body;
      g.beginPath(); if (w === 1) { g.arc(10, 0, 10, 0, Math.PI * 2); } else g.roundRect ? g.roundRect(b[0], b[1], b[2] - b[0], b[3] - b[1], 8) : g.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); g.fill(); g.stroke();
      if (w === 1) txt(g, v === null || v === undefined ? 'x' : v === 'E' ? 'E' : String(v), 10, 0.5, 11, 'center', v === 1 ? '#1f8a3a' : v === 'E' ? '#c62828' : C.line, true);
      else for (let i = 0; i < w; i++) { const r = Math.floor(i / 8), c = i % 8; const bit = isNum(v) ? (v >>> (w - 1 - i)) & 1 : 'x'; txt(g, String(bit), b[0] + 7 + c * 10, b[1] + 10 + r * 20, 11, 'center', bit === 1 ? '#1f8a3a' : C.line, true); }
    }
  };
  T.constant = {
    name: 'Constant', cat: 'Inputs and outputs', attrs: { width: 1, value: '1' },
    pins(a) { return [P(0, 0, 'out', +a.width, 'out')]; },
    box(a) { const s = hex(parseVal(a.value) & mask(+a.width), +a.width); return [-Math.max(10, s.length * 7 + 4), -8, 0, 8]; },
    eval(a) { return [(parseVal(a.value) & mask(+a.width)) >>> 0]; },
    draw(g, a) { const b = this.box(a); txt(g, (+a.width > 1 ? '' : '') + hex(parseVal(a.value) & mask(+a.width), +a.width), (b[0] + b[2]) / 2, 0.5, 12, 'center', C.line, true); }
  };
  T.clock = {
    name: 'Clock', cat: 'Inputs and outputs', attrs: { label: '', hz: 1 }, input: true, clock: true,
    pins() { return [P(0, 0, 'out', 1, 'out')]; },
    box() { return [-20, -10, 0, 10]; },
    eval(a, ins, st) { return [st.v ? 1 : 0]; },
    draw(g, a, st) { box(g, -20, -10, 0, 10); g.strokeStyle = st.v ? '#2fb344' : C.line; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-16, 4); g.lineTo(-13, 4); g.lineTo(-13, -4); g.lineTo(-8, -4); g.lineTo(-8, 4); g.lineTo(-3, 4); g.stroke(); },
    click(a, st) { st.v = st.v ? 0 : 1; }
  };
  T.button = {
    name: 'Button', cat: 'Inputs and outputs', attrs: { label: '' }, input: true, momentary: true,
    pins() { return [P(0, 0, 'out', 1, 'out')]; },
    box() { return [-20, -10, 0, 10]; },
    eval(a, ins, st) { return [st.v ? 1 : 0]; },
    draw(g, a, st) { box(g, -20, -10, 0, 10); g.beginPath(); g.rect(-17 + (st.v ? 1 : 0), -7 + (st.v ? 1 : 0), 14, 14); g.fillStyle = st.v ? '#9aa7b8' : '#dfe5ee'; g.fill(); g.strokeStyle = C.line; g.lineWidth = 1; g.stroke(); }
  };
  T.led = {
    name: 'LED', cat: 'Inputs and outputs', attrs: { label: '', color: '#e53935' },
    pins() { return [P(0, 0, 'in', 1, 'in')]; },
    box() { return [0, -10, 20, 10]; },
    eval() { return []; },
    draw(g, a, st, vals) { g.beginPath(); g.arc(10, 0, 10, 0, Math.PI * 2); g.fillStyle = vals[0] === 1 ? a.color : '#3a2a2a'; g.fill(); g.lineWidth = 2; g.strokeStyle = C.line; g.stroke(); if (vals[0] === 1) { g.beginPath(); g.arc(6, -4, 3, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); } }
  };
  T.probe = {
    name: 'Probe', cat: 'Inputs and outputs', attrs: { width: 1, label: '' },
    pins(a) { return [P(0, 0, 'in', +a.width, 'in')]; },
    box(a) { return [0, -9, Math.max(20, Math.ceil(+a.width / 4) * 8 + 10), 9]; },
    eval() { return []; },
    draw(g, a, st, vals) { const b = this.box(a); g.beginPath(); g.rect(b[0], b[1], b[2], 18); g.fillStyle = '#f3f6fa'; g.fill(); g.lineWidth = 1; g.strokeStyle = '#9aa7b8'; g.stroke(); txt(g, hex(vals[0], +a.width), b[2] / 2, 0.5, 11, 'center', vals[0] === 1 && +a.width === 1 ? '#1f8a3a' : C.line, true); }
  };
  T.tunnel = {
    name: 'Tunnel', cat: 'Wiring', attrs: { label: 'A', width: 1 }, tunnel: true,
    pins(a) { return [P(0, 0, 'io', +a.width, 'io')]; },
    box(a) { const L = Math.max(14, String(a.label).length * 7 + 10); return [-L - 8, -9, 0, 9]; },
    eval() { return []; },
    draw(g, a) { const b = this.box(a); g.beginPath(); g.moveTo(0, 0); g.lineTo(-8, -9); g.lineTo(b[0], -9); g.lineTo(b[0], 9); g.lineTo(-8, 9); g.closePath(); g.fillStyle = '#fffbe6'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#8a6d00'; g.stroke(); },
    labelInside: true
  };
  T.text = {
    name: 'Text', cat: 'Wiring', attrs: { text: 'Text', size: 12 }, noPins: true,
    pins() { return []; },
    box(a) { const w = Math.max(20, String(a.text).length * (+a.size) * 0.56); return [-w / 2, -(+a.size) * 0.7, w / 2, (+a.size) * 0.7]; },
    eval() { return []; },
    draw(g, a) { txt(g, String(a.text), 0, 0, +a.size, 'center', C.line, false); }
  };
  T.splitter = {
    name: 'Splitter', cat: 'Wiring', attrs: { width: 4 },
    pins(a) { const w = +a.width; const p = [P(0, 0, 'io', w, 'bus')]; for (let i = 0; i < w; i++) p.push(P(20, 10 + i * 10, 'io', 1, 'b' + i)); return p; },
    box(a) { return [0, 0, 20, 10 + (+a.width) * 10]; },
    eval() { return []; },
    draw(g, a) { const w = +a.width; g.strokeStyle = C.line; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(10, 10); g.lineTo(10, w * 10); g.stroke(); g.lineWidth = 1.5; for (let i = 0; i < w; i++) { g.beginPath(); g.moveTo(10, 10 + i * 10); g.lineTo(20, 10 + i * 10); g.stroke(); txt(g, String(i), 15, 6 + i * 10, 7, 'center', C.dim); } },
    splitter: true
  };

  /* ---------- Gates ---------- */
  T.and = gate('and', 'AND', 'and'); T.nand = gate('nand', 'NAND', 'and');
  T.or = gate('or', 'OR', 'or'); T.nor = gate('nor', 'NOR', 'or');
  T.xor = gate('xor', 'XOR', 'or'); T.xnor = gate('xnor', 'XNOR', 'or');
  T.not = {
    name: 'NOT', cat: 'Gates', attrs: { width: 1, label: '' },
    pins(a) { return [P(-30, 0, 'in', +a.width, 'in'), P(0, 0, 'out', +a.width, 'out')]; },
    box() { return [-30, -10, 0, 10]; },
    eval(a, ins) { const v = ins[0]; return [isNum(v) ? (~v & mask(+a.width)) >>> 0 : v === 'E' ? 'E' : null]; },
    draw(g) { g.lineWidth = 2; g.strokeStyle = C.line; g.fillStyle = C.body; g.beginPath(); g.moveTo(-28, -10); g.lineTo(-9, 0); g.lineTo(-28, 10); g.closePath(); g.fill(); g.stroke(); bubble(g, -5); g.beginPath(); g.moveTo(-30, 0); g.lineTo(-28, 0); g.stroke(); }
  };
  T.buffer = {
    name: 'Buffer', cat: 'Gates', attrs: { width: 1, label: '' },
    pins(a) { return [P(-20, 0, 'in', +a.width, 'in'), P(0, 0, 'out', +a.width, 'out')]; },
    box() { return [-20, -10, 0, 10]; },
    eval(a, ins) { return [ins[0] === undefined ? null : ins[0]]; },
    draw(g) { g.lineWidth = 2; g.strokeStyle = C.line; g.fillStyle = C.body; g.beginPath(); g.moveTo(-20, -10); g.lineTo(0, 0); g.lineTo(-20, 10); g.closePath(); g.fill(); g.stroke(); }
  };
  T.tristate = {
    name: 'Tri-state buffer', cat: 'Gates', attrs: { width: 1, label: '' },
    pins(a) { return [P(-20, 0, 'in', +a.width, 'in'), P(-10, -10, 'in', 1, 'en'), P(0, 0, 'out', +a.width, 'out')]; },
    box() { return [-20, -10, 0, 10]; },
    eval(a, ins) { return [ins[1] === 1 ? ins[0] : null]; }, weak: true,
    draw(g) { g.lineWidth = 2; g.strokeStyle = C.line; g.fillStyle = C.body; g.beginPath(); g.moveTo(-20, -10); g.lineTo(0, 0); g.lineTo(-20, 10); g.closePath(); g.fill(); g.stroke(); }
  };

  /* ---------- Plexers ---------- */
  const plexY = (n, i) => -(n - 1) * 10 + i * 20, plexH = n => n === 2 ? 20 : n * 10;
  T.mux = {
    name: 'Multiplexer', cat: 'Plexers', attrs: { select: 1, width: 1, label: '' },
    pins(a) { const s = +a.select, n = 1 << s, w = +a.width; const p = []; for (let i = 0; i < n; i++) p.push(P(-30, plexY(n, i), 'in', w, 'd' + i)); p.push(P(-20, plexH(n), 'in', s, 'sel')); p.push(P(0, 0, 'out', w, 'out')); return p; },
    box(a) { const h = plexH(1 << +a.select); return [-30, -h, -10, h]; },
    eval(a, ins) { const n = 1 << +a.select; const s = ins[n]; if (!isNum(s)) return [null]; const v = ins[s]; return [v === undefined ? null : v]; },
    draw(g, a) { const n = 1 << +a.select, h = plexH(n); g.lineWidth = 2; g.strokeStyle = C.line; g.fillStyle = C.body; g.beginPath(); g.moveTo(-30, -h); g.lineTo(-10, -h + 10); g.lineTo(-10, h - 10); g.lineTo(-30, h); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-10, 0); g.lineTo(0, 0); g.stroke(); for (let i = 0; i < n; i++) txt(g, String(i), -24, plexY(n, i), 8, 'center', C.dim); }
  };
  T.demux = {
    name: 'Demultiplexer', cat: 'Plexers', attrs: { select: 1, width: 1, label: '' },
    pins(a) { const s = +a.select, n = 1 << s, w = +a.width; const p = [P(-30, 0, 'in', w, 'in'), P(-20, plexH(n), 'in', s, 'sel')]; for (let i = 0; i < n; i++) p.push(P(0, plexY(n, i), 'out', w, 'o' + i)); return p; },
    box(a) { const h = plexH(1 << +a.select); return [-30, -h, 0, h]; },
    eval(a, ins) { const n = 1 << +a.select; const s = ins[1]; const o = []; for (let i = 0; i < n; i++) o.push(isNum(s) ? (i === s ? ins[0] : 0) : null); return o; },
    draw(g, a) { const n = 1 << +a.select, h = plexH(n); g.lineWidth = 2; g.strokeStyle = C.line; g.fillStyle = C.body; g.beginPath(); g.moveTo(-20, -h + 10); g.lineTo(0, -h); g.lineTo(0, h); g.lineTo(-20, h - 10); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-30, 0); g.lineTo(-20, 0); g.stroke(); for (let i = 0; i < n; i++) txt(g, String(i), -6, plexY(n, i), 8, 'center', C.dim); }
  };
  T.decoder = {
    name: 'Decoder', cat: 'Plexers', attrs: { select: 2, label: '' },
    pins(a) { const s = +a.select, n = 1 << s; const h = n * 10; const p = [P(-30, 0, 'in', s, 'sel')]; for (let i = 0; i < n; i++) p.push(P(0, -h + 10 + i * 20, 'out', 1, 'o' + i)); return p; },
    box(a) { const n = 1 << +a.select; return [-30, -n * 10, 0, n * 10]; },
    eval(a, ins) { const n = 1 << +a.select; const s = ins[0]; const o = []; for (let i = 0; i < n; i++) o.push(isNum(s) ? (i === s ? 1 : 0) : null); return o; },
    draw(g, a) { const n = 1 << +a.select; box(g, -20, -n * 10, 0, n * 10); g.beginPath(); g.moveTo(-30, 0); g.lineTo(-20, 0); g.stroke(); for (let i = 0; i < n; i++) txt(g, String(i), -6, -n * 10 + 10 + i * 20, 8, 'center', C.dim); txt(g, 'DEC', -10, n * 10 - 8, 7, 'center', C.dim); }
  };
  T.encoder = {
    name: 'Priority encoder', cat: 'Plexers', attrs: { select: 2, label: '' },
    pins(a) { const s = +a.select, n = 1 << s; const h = n * 10; const p = []; for (let i = 0; i < n; i++) p.push(P(-30, -h + 10 + i * 20, 'in', 1, 'i' + i)); p.push(P(0, 0, 'out', s, 'out')); p.push(P(0, 10, 'out', 1, 'valid')); return p; },
    box(a) { const n = 1 << +a.select; return [-30, -n * 10, 0, n * 10]; },
    eval(a, ins) { const n = 1 << +a.select; for (let i = n - 1; i >= 0; i--) if (ins[i] === 1) return [i, 1]; return [null, 0]; },
    draw(g, a) { const n = 1 << +a.select; box(g, -20, -n * 10, 0, n * 10); for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(-30, -n * 10 + 10 + i * 20); g.lineTo(-20, -n * 10 + 10 + i * 20); g.stroke(); txt(g, String(i), -15, -n * 10 + 10 + i * 20, 8, 'center', C.dim); } txt(g, 'PRI', -10, n * 10 - 8, 7, 'center', C.dim); }
  };

  /* ---------- Arithmetic ---------- */
  const arith = (name, fn, cin, cout, sym) => ({
    name, cat: 'Arithmetic', attrs: { width: 4, label: '' },
    pins(a) { const w = +a.width; return [P(-40, -10, 'in', w, 'A'), P(-40, 10, 'in', w, 'B'), P(-20, -20, 'in', 1, cin), P(0, 0, 'out', w, 'out'), P(-20, 20, 'out', 1, cout)]; },
    box() { return [-40, -20, 0, 20]; },
    eval(a, ins) { const w = +a.width, m = mask(w); const [A, B] = ins; let c = ins[2]; if (!isNum(A) || !isNum(B)) return [null, null]; if (!isNum(c)) c = 0; return fn(A, B, c, w, m); },
    draw(g) { box(g, -40, -20, 0, 20); txt(g, sym, -20, 0, 16, 'center', C.line, true); }
  });
  T.adder = arith('Adder', (A, B, c, w, m) => { const s = A + B + c; return [(s & m) >>> 0, s > m ? 1 : 0]; }, 'cin', 'cout', '+');
  T.subtractor = arith('Subtractor', (A, B, c, w, m) => { const s = A - B - c; return [(s & m) >>> 0, s < 0 ? 1 : 0]; }, 'bin', 'bout', '−');
  T.comparator = {
    name: 'Comparator', cat: 'Arithmetic', attrs: { width: 4, label: '' },
    pins(a) { const w = +a.width; return [P(-40, -10, 'in', w, 'A'), P(-40, 10, 'in', w, 'B'), P(0, -10, 'out', 1, '>'), P(0, 0, 'out', 1, '='), P(0, 10, 'out', 1, '<')]; },
    box() { return [-40, -20, 0, 20]; },
    eval(a, ins) { const [A, B] = ins; if (!isNum(A) || !isNum(B)) return [null, null, null]; return [A > B ? 1 : 0, A === B ? 1 : 0, A < B ? 1 : 0]; },
    draw(g) { box(g, -40, -20, 0, 20); txt(g, '>', -7, -10, 9, 'center', C.dim); txt(g, '=', -7, 0, 9, 'center', C.dim); txt(g, '<', -7, 10, 9, 'center', C.dim); txt(g, 'CMP', -24, 0, 8, 'center', C.line, true); }
  };
  T.halfadder = {
    name: 'Half adder', cat: 'Arithmetic', attrs: { label: '' },
    pins() { return [P(-40, -10, 'in', 1, 'A'), P(-40, 10, 'in', 1, 'B'), P(0, -10, 'out', 1, 'S'), P(0, 10, 'out', 1, 'C')]; },
    box() { return [-40, -20, 0, 20]; },
    eval(a, ins) { const [A, B] = ins; if (!isNum(A) || !isNum(B)) return [null, null]; return [A ^ B, A & B]; },
    draw(g) { box(g, -40, -20, 0, 20); txt(g, 'HA', -20, 0, 11, 'center', C.line, true); txt(g, 'S', -6, -10, 8, 'center', C.dim); txt(g, 'C', -6, 10, 8, 'center', C.dim); }
  };
  T.fulladder = {
    name: 'Full adder', cat: 'Arithmetic', attrs: { label: '' },
    pins() { return [P(-40, -10, 'in', 1, 'A'), P(-40, 10, 'in', 1, 'B'), P(-20, -20, 'in', 1, 'Cin'), P(0, -10, 'out', 1, 'S'), P(0, 10, 'out', 1, 'Cout')]; },
    box() { return [-40, -20, 0, 20]; },
    eval(a, ins) { const [A, B, c] = ins; if (!isNum(A) || !isNum(B) || !isNum(c)) return [null, null]; const s = A + B + c; return [s & 1, s >> 1]; },
    draw(g) { box(g, -40, -20, 0, 20); txt(g, 'FA', -20, 2, 11, 'center', C.line, true); txt(g, 'S', -6, -10, 8, 'center', C.dim); txt(g, 'Co', -7, 10, 8, 'center', C.dim); }
  };

  /* ---------- Memory (positions: box top-left at the part's location) ---------- */
  const ff = (name, inputs, next) => ({
    name, cat: 'Memory', attrs: { label: '' }, seq: true,
    pins() { const p = []; inputs.forEach((n, i) => p.push(P(0, inputs.length === 1 ? 10 : 10 + i * 40 / (inputs.length - 1 || 1), 'in', 1, n))); p.push(P(0, 30, 'in', 1, 'clk')); p.push(P(40, 10, 'out', 1, 'Q')); p.push(P(40, 50, 'out', 1, 'nQ')); p.push(P(20, 60, 'in', 1, 'clr')); p.push(P(20, 0, 'in', 1, 'pre')); return p; },
    box() { return [0, 0, 40, 60]; },
    clockPin: inputs.length, dataPins: inputs.map((_, i) => i),
    eval(a, ins, st) { if (ins[inputs.length + 1] === 1) st.q = 0; else if (ins[inputs.length + 2] === 1) st.q = 1; const q = st.q === undefined ? 0 : st.q; return [q, q ? 0 : 1]; },
    capture(a, ins, st) { if (ins[inputs.length + 1] === 1 || ins[inputs.length + 2] === 1) return; st.q = next(ins.slice(0, inputs.length), st.q || 0); },
    draw(g, a, st) {
      box(g, 0, 0, 40, 60); const ps = this.pins(a); g.strokeStyle = C.line; g.lineWidth = 1.5; clockMark(g, 0, 30);
      inputs.forEach((n, i) => txt(g, n, 9, ps[i].y, 9, 'left', C.dim));
      txt(g, 'Q', 31, 10, 9, 'center', C.dim); txt(g, "Q'", 31, 50, 9, 'center', C.dim); txt(g, name.split(' ')[0], 20, 48, 8, 'center', C.line, true);
      txt(g, 'R', 20, 54, 7, 'center', '#9aa7b8'); txt(g, 'S', 20, 6, 7, 'center', '#9aa7b8');
    }
  });
  T.dff = ff('D flip-flop', ['D'], (i, q) => isNum(i[0]) ? i[0] : q);
  T.tff = ff('T flip-flop', ['T'], (i, q) => i[0] === 1 ? (q ? 0 : 1) : q);
  T.jkff = ff('JK flip-flop', ['J', 'K'], (i, q) => { const j = i[0] === 1, k = i[1] === 1; return j && k ? (q ? 0 : 1) : j ? 1 : k ? 0 : q; });
  T.srff = ff('SR flip-flop', ['S', 'R'], (i, q) => { const s1 = i[0] === 1, r = i[1] === 1; return s1 && !r ? 1 : r && !s1 ? 0 : q; });
  T.srlatch = {
    name: 'SR latch', cat: 'Memory', attrs: { label: '' },
    pins() { return [P(0, 10, 'in', 1, 'S'), P(0, 50, 'in', 1, 'R'), P(40, 10, 'out', 1, 'Q'), P(40, 50, 'out', 1, 'nQ')]; },
    box() { return [0, 0, 40, 60]; },
    eval(a, ins, st) { const s1 = ins[0] === 1, r = ins[1] === 1; if (s1 && !r) st.q = 1; else if (r && !s1) st.q = 0; const q = st.q || 0; return [q, q ? 0 : 1]; },
    draw(g) { box(g, 0, 0, 40, 60); txt(g, 'S', 8, 10, 9, 'center', C.dim); txt(g, 'R', 8, 50, 9, 'center', C.dim); txt(g, 'Q', 31, 10, 9, 'center', C.dim); txt(g, "Q'", 31, 50, 9, 'center', C.dim); txt(g, 'SR', 20, 30, 9, 'center', C.line, true); }
  };
  T.register = {
    name: 'Register', cat: 'Memory', attrs: { width: 4, label: '' }, seq: true,
    pins(a) { const w = +a.width; return [P(0, 30, 'in', w, 'D'), P(0, 50, 'in', 1, 'en'), P(0, 70, 'in', 1, 'clk'), P(30, 90, 'in', 1, 'clr'), P(60, 30, 'out', w, 'Q')]; },
    box() { return [0, 0, 60, 90]; },
    clockPin: 2,
    eval(a, ins, st) { if (ins[3] === 1) st.q = 0; return [st.q === undefined ? 0 : st.q]; },
    capture(a, ins, st) { if (ins[3] === 1) return; if (ins[1] === 0) return; if (isNum(ins[0])) st.q = ins[0] & mask(+a.width); },
    draw(g, a, st) { box(g, 0, 0, 60, 90); g.strokeStyle = C.line; g.lineWidth = 1.5; clockMark(g, 0, 70); txt(g, 'D', 8, 30, 9, 'center', C.dim); txt(g, 'en', 10, 50, 8, 'center', C.dim); txt(g, 'Q', 52, 30, 9, 'center', C.dim); txt(g, 'REG', 30, 12, 9, 'center', C.line, true); txt(g, hex(st.q || 0, +a.width), 34, 52, 11, 'center', '#1f5fae', true); txt(g, 'clr', 30, 84, 7, 'center', '#9aa7b8'); }
  };
  T.counter = {
    name: 'Counter', cat: 'Memory', attrs: { width: 4, label: '' }, seq: true,
    pins(a) { const w = +a.width; return [P(0, 30, 'in', w, 'D'), P(0, 40, 'in', 1, 'load'), P(0, 50, 'in', 1, 'en'), P(0, 70, 'in', 1, 'clk'), P(30, 90, 'in', 1, 'clr'), P(60, 30, 'out', w, 'Q'), P(60, 50, 'out', 1, 'carry')]; },
    box() { return [0, 0, 60, 90]; },
    clockPin: 3,
    eval(a, ins, st) { if (ins[4] === 1) st.q = 0; const q = st.q || 0; const m = mask(+a.width); return [q, q === m && ins[2] !== 0 ? 1 : 0]; },
    capture(a, ins, st) { if (ins[4] === 1) return; const m = mask(+a.width); if (ins[1] === 1) { if (isNum(ins[0])) st.q = ins[0] & m; return; } if (ins[2] === 0) return; st.q = (((st.q || 0) + 1) & m) >>> 0; },
    draw(g, a, st) { box(g, 0, 0, 60, 90); g.strokeStyle = C.line; g.lineWidth = 1.5; clockMark(g, 0, 70); txt(g, 'D', 8, 30, 8, 'center', C.dim); txt(g, 'ld', 9, 40, 7, 'center', C.dim); txt(g, 'en', 9, 50, 7, 'center', C.dim); txt(g, 'Q', 52, 30, 9, 'center', C.dim); txt(g, 'C', 52, 50, 8, 'center', C.dim); txt(g, 'CTR', 30, 12, 9, 'center', C.line, true); txt(g, hex(st.q || 0, +a.width), 32, 64, 11, 'center', '#1f5fae', true); txt(g, 'clr', 30, 84, 7, 'center', '#9aa7b8'); }
  };

  /* ---------- Displays ---------- */
  const SEG = { a: [[3, 0], [17, 0]], b: [[20, 3], [20, 27]], c: [[20, 33], [20, 57]], d: [[3, 60], [17, 60]], e: [[0, 33], [0, 57]], f: [[0, 3], [0, 27]], g: [[3, 30], [17, 30]] };
  const HEXSEG = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71];
  function drawDigit(g, on, x0, y0) { const ks = 'abcdefg'; for (let i = 0; i < 7; i++) { const s = SEG[ks[i]]; g.beginPath(); g.moveTo(x0 + s[0][0], y0 + s[0][1]); g.lineTo(x0 + s[1][0], y0 + s[1][1]); g.lineWidth = 4; g.lineCap = 'round'; g.strokeStyle = on >> i & 1 ? '#ff3b30' : '#3a2626'; g.stroke(); } g.lineCap = 'butt'; }
  T.hexdisplay = {
    name: 'Hex digit display', cat: 'Displays', attrs: { label: '' },
    pins() { return [P(0, 0, 'in', 4, 'in')]; },
    box() { return [-10, -70, 30, 0]; },
    eval() { return []; },
    draw(g, a, st, vals) { g.beginPath(); g.rect(-10, -70, 40, 70); g.fillStyle = '#1a1414'; g.fill(); g.lineWidth = 2; g.strokeStyle = C.line; g.stroke(); const v = vals[0]; drawDigit(g, isNum(v) ? HEXSEG[v & 15] : 0, 0, -65); }
  };
  T.sevenseg = {
    name: '7-segment display', cat: 'Displays', attrs: { label: '' },
    pins() { return 'abcdefg'.split('').map((n, i) => P(-30 + i * 10, 0, 'in', 1, n)); },
    box() { return [-35, -80, 35, 0]; },
    eval() { return []; },
    draw(g, a, st, vals) { g.beginPath(); g.rect(-35, -80, 70, 80); g.fillStyle = '#1a1414'; g.fill(); g.lineWidth = 2; g.strokeStyle = C.line; g.stroke(); let on = 0; vals.forEach((v, i) => { if (v === 1) on |= 1 << i; }); drawDigit(g, on, -10, -72); 'abcdefg'.split('').forEach((n, i) => txt(g, n, -30 + i * 10, -6, 7, 'center', '#c9b8b8')); }
  };

  function parseVal(s) { s = String(s == null ? '0' : s).trim(); if (/^0x/i.test(s)) return parseInt(s, 16) >>> 0; if (/^0b/i.test(s)) return parseInt(s.slice(2), 2) >>> 0; const n = parseInt(s, 10); return isNaN(n) ? 0 : n >>> 0; }

  window.LOGIC = { T, mask, hex, parseVal, gateInputDy, isNum, CATS: ['Inputs and outputs', 'Gates', 'Plexers', 'Arithmetic', 'Memory', 'Displays', 'Wiring'] };
})();
