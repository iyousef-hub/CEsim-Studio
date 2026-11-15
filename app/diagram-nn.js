/* CEsim Diagram — neural network framework: draws a network as neurons, as layer blocks, or trains a small network on a 2D
   problem and shows what every neuron learned. The drawing stays editable: select it to change the settings and redraw. */
(function () {
  'use strict';
  const C = window.CED; if (!C) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
  const subs = s => String(s).replace(/^([a-zA-Z]+)(\d+)$/, (m, a, b) => a + [...b].map(d => SUB[d]).join(''));
  const DEF = {
    style: 'neurons', title: 'Neural network', layers: '3, 5, 5, 2', inLabels: 'x1, x2, x3', outLabels: 'y1, y2', act: 'ReLU', outAct: 'Softmax', bias: 0, weights: 'random', orient: 'LR', arrows: 0, titles: 1, maxShow: 8, size: 40, scheme: 'blue', seed: 7,
    blocks: 'Input 28×28×1\nConv2D 32 3×3 ReLU\nMaxPool 2×2\nConv2D 64 3×3 ReLU\nMaxPool 2×2\nFlatten\nDense 128 ReLU\nDropout 0.5\nDense 10 Softmax',
    data: 'circle', feats: 'x1,x2', hidden: '4, 2', pact: 'tanh', lr: 0.03, epochs: 300, noise: 0, ratio: 50,
  };
  const SCHEMES = { blue: { in: ['#d5f0e3', '#1e8e5a'], hid: ['#dbe7f6', '#185fa5'], out: ['#fde2c8', '#c27c0e'] }, mono: { in: ['#ffffff', '#1b2230'], hid: ['#ffffff', '#1b2230'], out: ['#ffffff', '#1b2230'] }, warm: { in: ['#fff4b0', '#c9a400'], hid: ['#f9d6d5', '#c0392b'], out: ['#e7dcf7', '#7d3cbd'] } };
  const POS = '#2f7fd8', NEG = '#f59322';
  const list = s => String(s).split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
  function rng(seed) { let a = (seed | 0) || 1; return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return ((a >>> 0) % 1e6) / 1e6; }; }

  /* ---------- drawing helpers ---------- */
  function shape(t, x, y, w, h, text, st, extra) { const s = C.mkShape(t, Math.round(x), Math.round(y), { text: text == null ? '' : text }); if (w) s.w = w; if (h) s.h = h; if (st) Object.assign(s.st, st); return Object.assign(s, extra || {}); }
  function edge(a, b, st, pa, pb) { return { id: C.uid(), k: 'edge', s: { id: a.id, p: pa }, e: { id: b.id, p: pb }, text: '', st: Object.assign({}, C.DEF_EST, { route: 'straight', arrowE: 'none', arrowS: 'none' }, st) }; }
  function wcolor(w, mx) { return { stroke: w >= 0 ? POS : NEG, sw: +(0.6 + 3 * Math.min(1, Math.abs(w) / (mx || 1))).toFixed(2) }; }

  /* ---------- style 1: neurons ---------- */
  function buildNeurons(p, ox, oy) {
    const L = list(p.layers).map(x => Math.max(1, Math.min(512, parseInt(x) || 1))); if (L.length < 2) L.push(1);
    const LR = p.orient !== 'TB'; const sz = +p.size || 40; const gapL = sz * 3.4, gapN = sz * 0.45; const maxShow = Math.max(3, +p.maxShow || 8);
    const sc = SCHEMES[p.scheme] || SCHEMES.blue; const ins = list(p.inLabels), outs = list(p.outLabels); const R = rng(p.seed);
    const out = []; const cols = []; const maxShown = Math.max(...L.map(n => Math.min(n, maxShow))) + (p.bias ? 1 : 0); const span = maxShown * sz + (maxShown - 1) * gapN;
    const at = (li, j, cnt) => { const off = (span - (cnt * sz + (cnt - 1) * gapN)) / 2 + j * (sz + gapN); return LR ? [ox + li * gapL, oy + 36 + off] : [ox + off, oy + 36 + li * gapL]; };
    L.forEach((n, li) => {
      const kind = li === 0 ? 'in' : li === L.length - 1 ? 'out' : 'hid'; const [fill, stroke] = sc[kind]; const show = n > maxShow ? maxShow : n; const slots = show + (p.bias && li < L.length - 1 ? 1 : 0); const col = [];
      for (let j = 0; j < show; j++) {
        const collapsed = n > maxShow && j === show - 2; const idx = n > maxShow && j === show - 1 ? n - 1 : j; const [x, y] = at(li, j, slots);
        if (collapsed) { out.push(shape('text', x - 10, y, sz + 20, sz, '⋮', { fs: Math.round(sz * .6), fc: stroke, bold: 1 })); continue; }
        const lab = kind === 'in' ? subs(ins[idx] || 'x' + (idx + 1)) : kind === 'out' ? subs(outs[idx] || 'y' + (idx + 1)) : '';
        const s = shape('neuron', x, y, sz, sz, lab, { fill, stroke, fs: Math.round(sz * .32), sw: 1.6 }); out.push(s); col.push(s);
      }
      if (p.bias && li < L.length - 1) { const [x, y] = at(li, slots - 1, slots); const b = shape('nbias', x + sz * .1, y + sz * .1, sz * .8, sz * .8, '+1', { fs: Math.round(sz * .28) }); b.isBias = 1; out.push(b); col.push(b); }
      if (p.titles) { const [x] = at(li, 0, 1); const t = li === 0 ? 'Input layer' : li === L.length - 1 ? 'Output layer' : (L.length > 3 ? `Hidden layer ${li}` : 'Hidden layer'); const sub = li === 0 ? `${n} input${n > 1 ? 's' : ''}` : `${n} neuron${n > 1 ? 's' : ''}${li === L.length - 1 ? (p.outAct ? ' · ' + p.outAct : '') : p.act ? ' · ' + p.act : ''}`; if (LR) { const tw = Math.min(170, gapL - 10); out.push(shape('nnlayerlabel', x + sz / 2 - tw / 2, oy - 6, tw, 40, t + '\n' + sub, { fs: 11, align: 'center' })); } else out.push(shape('nnlayerlabel', ox - 190, at(li, 0, 1)[1] + sz / 2 - 20, 170, 40, t + '\n' + sub, { fs: 12, align: 'right' })); }
      cols.push(col);
    });
    const W = []; for (let li = 0; li < cols.length - 1; li++) for (const a of cols[li]) for (const b of cols[li + 1]) { if (b.isBias) continue; W.push([a, b, (R() * 2 - 1) * (a.isBias ? .6 : 1)]); }
    const mx = Math.max(...W.map(w => Math.abs(w[2])), .01);
    for (const [a, b, w] of W) { const st = p.weights === 'random' ? wcolor(w, mx) : { stroke: '#9aa6b5', sw: 1 }; if (a.isBias) st.dash = '4 3'; if (p.arrows) st.arrowE = 'arrow'; out.push(edge(a, b, st, LR ? 1 : 2, LR ? 3 : 0)); }
    return out;
  }

  /* ---------- style 2: layer blocks ---------- */
  function blockFor(line) {
    const l = line.trim(); const w = l.toLowerCase(); const num = (l.match(/\b(\d+)\b/) || [])[1];
    if (/^input/.test(w)) return /×.*×|x.*x/.test(l) ? ['tensor', 70, 90] : ['imagein', 80, 80];
    if (/conv/.test(w)) { const f = +num || 32; const k = Math.min(1.6, .8 + Math.log2(f) / 10); return ['conv', 80 * k, 100 / k + 20]; }
    if (/pool/.test(w)) return ['pool', 60, 76];
    if (/flatten/.test(w)) return ['flatten', 22, 150];
    if (/dropout/.test(w)) return ['dropout', 40, 140];
    if (/batch ?norm|layer ?norm/.test(w)) return ['batchnorm', 44, 120];
    if (/lstm/.test(w)) return ['lstm', 150, 96];
    if (/gru/.test(w)) return ['gru', 130, 88];
    if (/rnn/.test(w)) return ['rnnloop', 100, 74];
    if (/embed/.test(w)) return ['embedding', 120, 56];
    if (/attention/.test(w)) return ['attention', 150, 86];
    if (/transformer/.test(w)) return ['transformer', 150, 180];
    if (/softmax|output/.test(w) && !/dense/.test(w)) return ['softmax', 56, 110];
    if (/dense|linear|fc\b/.test(w)) { const u = +num || 64; return ['dense', 34, Math.round(Math.max(60, Math.min(220, 30 + Math.log2(u) * 22)))]; }
    return ['round', 120, 50];
  }
  function buildBlocks(p, ox, oy) {
    const lines = String(p.blocks || '').split('\n').map(x => x.trim()).filter(Boolean); const out = []; let x = ox; const cy = oy + 150; let prev = null;
    for (const ln of lines) { const [t, w, h] = blockFor(ln); const s = shape(t, x, cy - h / 2, w, h, ln.replace(/ ([A-Z][a-z]+)$/, '\n$1'), {}); if (['dense', 'flatten', 'dropout', 'batchnorm', 'softmax'].includes(t)) Object.assign(s.st, { tpos: 'bottom', fs: 11 }); else s.st.fs = 11; out.push(s); if (prev) out.push(edge(prev, s, { arrowE: 'arrow', stroke: '#5e6979', sw: 1.4 }, 1, 3)); prev = s; x += w + (w < 50 ? 64 : 52); }
    return out;
  }

  /* ---------- style 3: train and show what each neuron learned ---------- */
  const FEATS = { x1: ['X₁', (a, b) => a], x2: ['X₂', (a, b) => b], x1sq: ['X₁²', (a, b) => a * a], x2sq: ['X₂²', (a, b) => b * b], x1x2: ['X₁X₂', (a, b) => a * b], sinx1: ['sin(X₁)', (a, b) => Math.sin(a)], sinx2: ['sin(X₂)', (a, b) => Math.sin(b)] };
  const ACT = { tanh: [Math.tanh, y => 1 - y * y], relu: [x => Math.max(0, x), y => y > 0 ? 1 : 0], sigmoid: [x => 1 / (1 + Math.exp(-x)), y => y * (1 - y)], linear: [x => x, () => 1] };
  function dataset(kind, n, noise, R) {
    const pts = []; const nz = () => (R() * 2 - 1) * noise / 100 * 3;
    for (let i = 0; i < n; i++) {
      if (kind === 'xor') { const a = R() * 10 - 5, b = R() * 10 - 5; const pad = a > 0 ? .3 : -.3, pb = b > 0 ? .3 : -.3; pts.push([a + pad + nz(), b + pb + nz(), a * b >= 0 ? 1 : -1]); }
      else if (kind === 'gauss') { const c = i % 2 ? 1 : -1; pts.push([c * 2 + (R() + R() + R() - 1.5) * 1.6 + nz(), c * 2 + (R() + R() + R() - 1.5) * 1.6 + nz(), c]); }
      else if (kind === 'spiral') { const c = i % 2 ? 1 : -1; const r = (i / 2) / (n / 2) * 5; const t = 1.75 * (i / 2) / (n / 2) * 2 * Math.PI + (c > 0 ? 0 : Math.PI); pts.push([r * Math.sin(t) + nz(), r * Math.cos(t) + nz(), c]); }
      else { const inner = i % 2 === 0; const r = inner ? R() * 2.5 : 3.5 + R() * 1.5; const a = R() * 2 * Math.PI; pts.push([r * Math.sin(a) + nz(), r * Math.cos(a) + nz(), inner ? 1 : -1]); }
    } return pts;
  }
  function train(p) {
    const R = rng(p.seed); const feats = list(p.feats).filter(f => FEATS[f]); if (!feats.length) feats.push('x1', 'x2');
    const hid = list(p.hidden).map(x => Math.max(1, Math.min(8, parseInt(x) || 1))).slice(0, 6); const sizes = [feats.length, ...hid, 1]; const [f, df] = ACT[p.pact] || ACT.tanh;
    const W = [], B = []; for (let l = 1; l < sizes.length; l++) { W.push(Array.from({ length: sizes[l] }, () => Array.from({ length: sizes[l - 1] }, () => R() - .5))); B.push(Array.from({ length: sizes[l] }, () => .1)); }
    const all = dataset(p.data, 400, +p.noise || 0, R); const nTr = Math.round(all.length * (+p.ratio || 50) / 100); const tr = all.slice(0, nTr), te = all.slice(nTr);
    const input = (a, b) => feats.map(k => FEATS[k][1](a, b));
    const fwd = x => { const A = [x]; for (let l = 0; l < W.length; l++) { const last = l === W.length - 1; A.push(W[l].map((row, j) => { let z = B[l][j]; for (let i = 0; i < row.length; i++) z += row[i] * A[l][i]; return last ? Math.tanh(z) : f(z); })); } return A; };
    const loss = set => set.reduce((s, [a, b, y]) => { const o = fwd(input(a, b)); return s + (o[o.length - 1][0] - y) ** 2 / 2; }, 0) / (set.length || 1);
    const lr = +p.lr || .03, epochs = Math.max(1, Math.min(3000, +p.epochs || 300)), bs = 10;
    for (let ep = 0; ep < epochs; ep++) { for (let s0 = 0; s0 < tr.length; s0 += bs) { const gW = W.map(m => m.map(r => r.map(() => 0))), gB = B.map(v => v.map(() => 0)); const batch = tr.slice(s0, s0 + bs);
      for (const [a, b, y] of batch) { const A = fwd(input(a, b)); let d = [(A[A.length - 1][0] - y) * (1 - A[A.length - 1][0] ** 2)]; for (let l = W.length - 1; l >= 0; l--) { for (let j = 0; j < W[l].length; j++) { gB[l][j] += d[j]; for (let i = 0; i < W[l][j].length; i++) gW[l][j][i] += d[j] * A[l][i]; } if (l > 0) { const nd = A[l].map((v, i) => { let s = 0; for (let j = 0; j < W[l].length; j++) s += W[l][j][i] * d[j]; return s * df(v); }); d = nd; } } }
      for (let l = 0; l < W.length; l++) for (let j = 0; j < W[l].length; j++) { B[l][j] -= lr * gB[l][j] / batch.length; for (let i = 0; i < W[l][j].length; i++) W[l][j][i] -= lr * gW[l][j][i] / batch.length; } } }
    // every neuron's output over the plane, as a small picture
    const G = 30, pics = sizes.map(n => Array.from({ length: n }, () => new Float32Array(G * G)));
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) { const a = -6 + 12 * (gx + .5) / G, b = 6 - 12 * (gy + .5) / G; const A = fwd(input(a, b)); A.forEach((layer, l) => layer.forEach((v, j) => pics[l][j][gy * G + gx] = v)); }
    return { feats, sizes, W, B, pics, G, trainLoss: loss(tr), testLoss: loss(te), tr, te, epochs };
  }
  const colAt = v => { v = Math.max(-1, Math.min(1, v)); const t = Math.abs(v); const c = v >= 0 ? [47, 127, 216] : [245, 147, 34]; return [255 + (c[0] - 255) * t, 255 + (c[1] - 255) * t, 255 + (c[2] - 255) * t].map(Math.round); };
  function picUrl(arr, G, size, points) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d'); const img = g.createImageData(G, G); let mx = 0; for (const v of arr) mx = Math.max(mx, Math.abs(v)); const k = mx > 1 ? 1 / mx : 1;
    for (let i = 0; i < G * G; i++) { const [r, gg, b] = colAt(arr[i] * k); img.data.set([r, gg, b, 255], i * 4); }
    const t = document.createElement('canvas'); t.width = t.height = G; t.getContext('2d').putImageData(img, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(t, 0, 0, size, size);
    if (points) for (const [a, b, y, test] of points) { const x = (a + 6) / 12 * size, yy = (6 - b) / 12 * size; g.beginPath(); g.arc(x, yy, size / 70 + 1.5, 0, 7); g.fillStyle = y > 0 ? POS : NEG; g.fill(); g.lineWidth = test ? 1.6 : 1; g.strokeStyle = test ? '#000' : '#fff'; g.stroke(); }
    return cv.toDataURL('image/png');
  }
  function buildPlay(p, ox, oy) {
    const T = train(p); const out = []; const sz = 44, gapL = 170; const sizes = T.sizes; const maxN = Math.max(...sizes.slice(0, -1)); const span = maxN * sz + (maxN - 1) * 18; const cols = [];
    sizes.forEach((n, l) => { if (l === sizes.length - 1) return; const col = []; for (let j = 0; j < n; j++) { const y = oy + 40 + (span - (n * sz + (n - 1) * 18)) / 2 + j * (sz + 18); const s = shape('rect', ox + l * gapL, y, sz, sz, '', {}); s.t = 'image'; s.img = picUrl(T.pics[l][j], T.G, 64); s.st.stroke = '#1b2230'; s.st.sw = 1; if (l === 0) { out.push(shape('text', s.x - 74, y + 8, 68, 28, FEATS[T.feats[j]][0], { align: 'right', fs: 13 })); } out.push(s); col.push(s); }
      out.push(shape('nnlayerlabel', ox + l * gapL + sz / 2 - 70, oy - 10, 140, 40, l === 0 ? 'Features' : `Hidden layer ${l}\n${n} neuron${n > 1 ? 's' : ''} · ${p.pact}`, { fs: 12, align: 'center' })); cols.push(col); });
    const ox2 = ox + (sizes.length - 1) * gapL + 10, osz = 220; const o = shape('rect', ox2, oy + 40 + span / 2 - osz / 2, osz, osz, ''); o.t = 'image'; o.img = picUrl(T.pics[sizes.length - 1][0], T.G, 360, T.tr.map(q => q.concat([0])).concat(T.te.map(q => q.concat([1])))); o.st.stroke = '#1b2230'; o.st.sw = 1; out.push(o);
    out.push(shape('nnlayerlabel', ox2, oy - 10, osz, 40, 'Output', { fs: 12, align: 'left' }));
    out.push(shape('text', ox2, o.y + osz + 6, osz + 40, 48, `Epoch ${T.epochs} · test loss ${T.testLoss.toFixed(3)} · training loss ${T.trainLoss.toFixed(3)}\nBlue is +1, orange is −1. Circled points are test data.`, { align: 'left', fs: 11, fc: '#5e6979', valign: 'top' }));
    let mx = .01; T.W.forEach(m => m.forEach(r => r.forEach(v => mx = Math.max(mx, Math.abs(v)))));
    for (let l = 0; l < cols.length; l++) { const next = l + 1 < cols.length ? cols[l + 1] : [o]; const Wl = T.W[l]; cols[l].forEach((a, i) => next.forEach((b, j) => { const w = Wl[j][i]; out.push(edge(a, b, Object.assign(wcolor(w, mx), { route: 'curve' }), 1, 3)); })); }
    return { items: out, info: T };
  }

  /* ---------- building into the page ---------- */
  function build(p, ox, oy, fid) {
    let items, info = null; if (p.style === 'blocks') items = buildBlocks(p, ox, oy); else if (p.style === 'play') { const r = buildPlay(p, ox, oy); items = r.items; info = r.info; } else items = buildNeurons(p, ox, oy);
    const sh = items.filter(i => i.k === 'shape'); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const s of sh) { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x + s.w); y1 = Math.max(y1, s.y + s.h + (s.st.tpos === 'bottom' ? 40 : 0)); }
    const pad = 24; const fr = C.mkShape('rect', x0 - pad, y0 - pad - 26, { text: p.title || '' }); fr.id = fid || fr.id; fr.w = x1 - x0 + 2 * pad; fr.h = y1 - y0 + 2 * pad + 26; Object.assign(fr.st, { fill: '#ffffff', stroke: '#c3cbd6', dash: '6 4', sw: 1, valign: 'top', align: 'left', bold: 1, fs: 13, fc: '#5e6979', padL: 6, padT: 4 }); fr.fwp = p; fr.fwRoot = 1;
    for (const it of items) { it.fwg = fr.id; if (it.k === 'shape') it.group = fr.id; } fr.fwg = fr.id; fr.group = fr.id;
    return { items: [fr].concat(items), frame: fr, info };
  }
  function insert(p) { const c = C.viewCenter(); C.pushUndo(); const tmp = build(p, 0, 0); const fr = tmp.frame; let dx = C.snapV(c.x - fr.w / 2) - fr.x, dy = C.snapV(c.y - fr.h / 2) - fr.y;
    const others = C.P().items.filter(i => i.k === 'shape'); const hit = () => others.some(o => o.x < fr.x + dx + fr.w + 20 && fr.x + dx < o.x + o.w + 20 && o.y < fr.y + dy + fr.h + 20 && fr.y + dy < o.y + o.h + 20);
    if (hit()) { const right = Math.max(...others.map(o => o.x + o.w)); const top = Math.min(...others.map(o => o.y)); dx = C.snapV(right + 60) - fr.x; dy = C.snapV(top) - fr.y; } const r = build(p, dx, dy); C.P().items.push(...r.items); C.select(r.items.filter(i => i.k === 'shape').map(i => i.id)); C.toast(p.style === 'play' ? `Trained for ${r.info.epochs} epochs: test loss ${r.info.testLoss.toFixed(3)}.` : 'Network drawn. Select it to change it.'); }
  function rebuild(fid, p) { const P = C.P(); const fr = P.items.find(i => i.id === fid); if (!fr) return; C.pushUndo(); const tmp = build(p, 0, 0, fid); const dx = fr.x - tmp.frame.x, dy = fr.y - tmp.frame.y; const r = build(p, dx, dy, fid); const idx = P.items.indexOf(fr); P.items = P.items.filter(i => i.fwg !== fid); P.items.splice(Math.min(idx, P.items.length), 0, ...r.items); C.select(r.items.filter(i => i.k === 'shape').map(i => i.id)); if (r.info) C.toast(`Trained for ${r.info.epochs} epochs: test loss ${r.info.testLoss.toFixed(3)}.`); }

  /* ---------- the form ---------- */
  function form(p, editing) {
    const sel = (id, opts, cur) => `<select id="nn-${id}">${opts.map(([v, n]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    const inp = (id, v, ph) => `<input id="nn-${id}" class="pin" value="${esc(v)}" placeholder="${esc(ph || '')}">`;
    let h = `<h3>Drawing style</h3><div class="bgrp wide">${[['neurons', 'Neurons'], ['blocks', 'Layer blocks'], ['play', 'Train and show']].map(([v, n]) => `<button data-nnstyle="${v}" class="${p.style === v ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    h += `<div class="frow"><label>Title</label>${inp('title', p.title)}</div>`;
    if (p.style === 'neurons') h += `<h3>Layers</h3><div class="muted">Neurons in each layer, from input to output.</div>${inp('layers', p.layers, '3, 5, 5, 2')}<div class="frow"><label>Input names</label>${inp('inLabels', p.inLabels, 'x1, x2, x3')}</div><div class="frow"><label>Output names</label>${inp('outLabels', p.outLabels, 'y1, y2')}</div>
      <div class="frow"><label>Hidden activation</label>${sel('act', [['ReLU', 'ReLU'], ['Sigmoid', 'Sigmoid'], ['Tanh', 'Tanh'], ['Leaky ReLU', 'Leaky ReLU'], ['', 'None shown']], p.act)}</div><div class="frow"><label>Output activation</label>${sel('outAct', [['Softmax', 'Softmax'], ['Sigmoid', 'Sigmoid'], ['Linear', 'Linear'], ['', 'None shown']], p.outAct)}</div>
      <h3>Look</h3><div class="frow"><label>Weights</label>${sel('weights', [['random', 'Coloured by sign and size'], ['none', 'Plain lines']], p.weights)}</div><div class="frow"><label>Direction</label>${sel('orient', [['LR', 'Left to right'], ['TB', 'Top to bottom']], p.orient)}</div><div class="frow"><label>Colours</label>${sel('scheme', [['blue', 'Green, blue, orange'], ['warm', 'Yellow, red, purple'], ['mono', 'Black and white']], p.scheme)}</div>
      <div class="frow"><label>Neuron size</label><input id="nn-size" type="number" min="20" max="90" value="${p.size}"><label>Show at most</label><input id="nn-maxShow" type="number" min="3" max="30" value="${p.maxShow}"></div>
      <label class="chk"><input type="checkbox" id="nn-bias" ${p.bias ? 'checked' : ''}> Bias neurons (+1)</label><label class="chk"><input type="checkbox" id="nn-arrows" ${p.arrows ? 'checked' : ''}> Arrows on connections</label><label class="chk"><input type="checkbox" id="nn-titles" ${p.titles ? 'checked' : ''}> Layer titles</label>`;
    else if (p.style === 'blocks') h += `<h3>Layers</h3><div class="muted">One layer per line, for example Conv2D 32 3×3 ReLU, MaxPool 2×2, LSTM 64, Embedding, Attention, Dense 10 Softmax.</div><textarea id="nn-blocks" spellcheck="false" style="width:100%;height:170px;font:12px/1.5 var(--mono);border:1px solid var(--line);border-radius:4px;padding:6px">${esc(p.blocks)}</textarea><div class="bgrp wide" style="margin-top:4px">${[['cnn', 'CNN'], ['rnn', 'RNN'], ['tr', 'Transformer'], ['mlp', 'MLP']].map(([v, n]) => `<button data-nnpre="${v}">${n}</button>`).join('')}</div>`;
    else h += `<h3>Problem</h3><div class="frow"><label>Data</label>${sel('data', [['circle', 'Circle'], ['xor', 'Exclusive or'], ['gauss', 'Two clusters'], ['spiral', 'Spiral']], p.data)}</div><div class="frow"><label>Noise %</label><input id="nn-noise" type="number" min="0" max="50" value="${p.noise}"><label>Training %</label><input id="nn-ratio" type="number" min="10" max="90" value="${p.ratio}"></div>
      <h3>Features</h3><div class="g2">${Object.entries(FEATS).map(([k, [n]]) => `<label class="chk"><input type="checkbox" data-nnfeat="${k}" ${list(p.feats).includes(k) ? 'checked' : ''}> ${n}</label>`).join('')}</div>
      <h3>Network</h3><div class="frow"><label>Hidden layers</label>${inp('hidden', p.hidden, '4, 2')}</div><div class="frow"><label>Activation</label>${sel('pact', [['tanh', 'Tanh'], ['relu', 'ReLU'], ['sigmoid', 'Sigmoid'], ['linear', 'Linear']], p.pact)}</div><div class="frow"><label>Learning rate</label>${sel('lr', [['0.001', '0.001'], ['0.003', '0.003'], ['0.01', '0.01'], ['0.03', '0.03'], ['0.1', '0.1'], ['0.3', '0.3'], ['1', '1']], String(p.lr))}</div><div class="frow"><label>Epochs</label><input id="nn-epochs" type="number" min="1" max="3000" value="${p.epochs}"><label>Seed</label><input id="nn-seed" type="number" value="${p.seed}"></div>
      <div class="muted">Each neuron shows its output over the plane: blue is positive, orange negative. Line colour and thickness show each weight.</div>`;
    h += `<div class="bgrp wide col" style="margin-top:12px">${editing ? `<button data-nnact="update" class="prim">${p.style === 'play' ? 'Train again' : 'Update drawing'}</button>${p.style === 'play' ? '<button data-nnact="more">Train 100 more epochs</button>' : ''}<button data-nnact="plain">Keep as plain shapes</button><button data-nnact="delete">Delete network</button>` : `<button data-nnact="insert" class="prim">${p.style === 'play' ? 'Train and insert' : 'Insert network'}</button>`}</div>`;
    return h;
  }
  const PRE = { cnn: DEF.blocks, rnn: 'Input text\nEmbedding 128\nLSTM 64\nLSTM 64\nDropout 0.3\nDense 1 Sigmoid', tr: 'Input tokens\nEmbedding 512\nTransformer ×6\nDense 512 ReLU\nSoftmax', mlp: 'Input 784\nDense 256 ReLU\nDropout 0.2\nDense 128 ReLU\nDense 10 Softmax' };
  function read(el, p) { const q = Object.assign({}, p); el.querySelectorAll('[id^="nn-"]').forEach(i => { const k = i.id.slice(3); q[k] = i.type === 'checkbox' ? (i.checked ? 1 : 0) : i.type === 'number' ? +i.value : i.value; }); const fs = [...el.querySelectorAll('[data-nnfeat]')]; if (fs.length) q.feats = fs.filter(i => i.checked).map(i => i.dataset.nnfeat).join(','); q.lr = +q.lr; return q; }
  let draft = Object.assign({}, DEF); try { Object.assign(draft, JSON.parse(localStorage.getItem('cesimdiag.nn') || '{}')); } catch (e) { }
  const keep = () => { try { localStorage.setItem('cesimdiag.nn', JSON.stringify(draft)); } catch (e) { } };
  function bindCommon(el, get, set, onAct) {
    el.querySelectorAll('[data-nnstyle]').forEach(b => b.onclick = () => { const q = read(el, get()); q.style = b.dataset.nnstyle; if (q.style === 'play' && q.title === 'Neural network') q.title = 'Trained network'; set(q); });
    el.querySelectorAll('[data-nnpre]').forEach(b => b.onclick = () => { const q = read(el, get()); q.blocks = PRE[b.dataset.nnpre]; set(q); });
    el.querySelectorAll('[data-nnact]').forEach(b => b.onclick = () => onAct(b.dataset.nnact, read(el, get())));
    el.querySelectorAll('input,textarea,select').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
  }
  window.CED_NN = {
    build, train, dataset,
    insertHtml: () => `<div class="muted" style="margin-top:6px">Draw a neural network, change it any time by selecting it.</div>` + form(draft, false),
    bindInsert(el) { bindCommon(el, () => draft, q => { draft = q; keep(); C.refreshPanel(); }, (a, q) => { draft = q; keep(); if (a === 'insert') insert(q); }); },
    editHtml(fid) { const fr = C.byId(fid); if (!fr || !fr.fwp) return '<div class="muted">This network has no settings.</div>'; return `<div class="ptitle">${esc(fr.fwp.title || 'Neural network')}</div>` + form(Object.assign({}, DEF, fr.fwp), true); },
    bindEdit(el, fid) { const fr = C.byId(fid); if (!fr) return; bindCommon(el, () => Object.assign({}, DEF, fr.fwp), q => { fr.fwp = q; C.refreshPanel(); }, (a, q) => {
      if (a === 'update') rebuild(fid, q);
      else if (a === 'more') { q.epochs = (+q.epochs || 0) + 100; rebuild(fid, q); }
      else if (a === 'plain') { C.pushUndo(); C.P().items.forEach(i => { if (i.fwg === fid) { delete i.fwg; } }); delete fr.fwp; delete fr.fwRoot; C.refreshPanel(); C.toast('The network is now ordinary shapes.'); }
      else if (a === 'delete') { C.pushUndo(); const P = C.P(); P.items = P.items.filter(i => i.fwg !== fid); C.select([]); } }); },
  };
})();
