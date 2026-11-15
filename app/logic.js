/* CEsim Logic - editor, simulator, timing diagram, truth table, .circ import. */
'use strict';
const { T, mask, hex, parseVal, isNum, CATS } = window.LOGIC;
const $ = s => document.querySelector(s);
const cv = $('#cv'), ctx = cv.getContext('2d');
const N = window.cesimNative;
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GRID = 10, snap = v => Math.round(v / GRID) * GRID;
const FACINGS = ['east', 'south', 'west', 'north'];

/* ---------------- document ---------------- */
let doc = newDoc(), filePath = null;
function newDoc(name) { return { format: 'CEsim-Logic', version: 1, name: name || 'Untitled', comps: [], wires: [] }; }
function mkComp(t, x, y, attrs, f) { const d = T[t]; return { id: uid(), t, x, y, f: f || 'east', a: Object.assign({}, d.attrs, attrs || {}), st: {} }; }

/* ---------------- geometry ---------------- */
function rot(f, x, y) { return f === 'south' ? [-y, x] : f === 'west' ? [-x, -y] : f === 'north' ? [y, -x] : [x, y]; }
function pinsOf(c) { return T[c.t].pins(c.a).map((p, i) => { const [dx, dy] = rot(c.f, p.x, p.y); return Object.assign({}, p, { i, x: c.x + dx, y: c.y + dy }); }); }
function bboxOf(c) { const b = T[c.t].box(c.a); const pts = [rot(c.f, b[0], b[1]), rot(c.f, b[2], b[3]), rot(c.f, b[0], b[3]), rot(c.f, b[2], b[1])]; const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [c.x + Math.min(...xs), c.y + Math.min(...ys), c.x + Math.max(...xs), c.y + Math.max(...ys)]; }
function toLocal(c, x, y) { const dx = x - c.x, dy = y - c.y; return c.f === 'south' ? [dy, -dx] : c.f === 'west' ? [-dx, -dy] : c.f === 'north' ? [-dy, dx] : [dx, dy]; }
const key = (x, y) => x + ',' + y;
const onSeg = (w, x, y) => (w.x1 === w.x2 && x === w.x1 && y > Math.min(w.y1, w.y2) && y < Math.max(w.y1, w.y2)) || (w.y1 === w.y2 && y === w.y1 && x > Math.min(w.x1, w.x2) && x < Math.max(w.x1, w.x2));

/* ---------------- nets ---------------- */
let netCache = null;
function buildNets() {
  const par = new Map(); const find = k => { let r = k; while (par.has(r) && par.get(r) !== r) r = par.get(r); let x = k; while (par.has(x) && par.get(x) !== r) { const n = par.get(x); par.set(x, r); x = n; } if (!par.has(r)) par.set(r, r); return r; };
  const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); };
  const pts = new Set();
  for (const w of doc.wires) { const a = key(w.x1, w.y1), b = key(w.x2, w.y2); pts.add(a); pts.add(b); uni(a, b); }
  const pinRec = new Map();
  for (const c of doc.comps) pinRec.set(c.id, pinsOf(c).map(p => { const k = key(p.x, p.y); pts.add(k); find(k); return Object.assign(p, { k }); }));
  for (const k of pts) { const [x, y] = k.split(',').map(Number); for (const w of doc.wires) if (onSeg(w, x, y)) uni(k, key(w.x1, w.y1)); }
  const tun = {}; for (const c of doc.comps) if (T[c.t].tunnel) { const k = pinRec.get(c.id)[0].k; const L = String(c.a.label); if (tun[L]) uni(k, tun[L]); else tun[L] = k; }
  const ids = new Map(); let n = 0; const netOf = k => { const r = find(k); if (!ids.has(r)) ids.set(r, n++); return ids.get(r); };
  const conn = new Map(); const widths = []; const users = [];
  for (const c of doc.comps) { const ps = pinRec.get(c.id); conn.set(c.id, ps.map(p => netOf(p.k))); ps.forEach(p => { const ni = netOf(p.k); widths[ni] = Math.max(widths[ni] || 0, p.w); (users[ni] = users[ni] || []).push({ c, p }); }); }
  const wireNet = doc.wires.map(w => netOf(key(w.x1, w.y1)));
  const bad = new Set(); users.forEach((u, ni) => { if (!u) return; const ws = new Set(u.filter(x => !T[x.c.t].tunnel || u.length > 1).map(x => x.p.w)); if (ws.size > 1) bad.add(ni); });
  // point degree (for junction dots)
  const deg = new Map(); const inc = k => deg.set(k, (deg.get(k) || 0) + 1);
  for (const w of doc.wires) { inc(key(w.x1, w.y1)); inc(key(w.x2, w.y2)); }
  for (const [, ps] of pinRec) ps.forEach(p => inc(p.k));
  for (const k of pts) { const [x, y] = k.split(',').map(Number); for (const w of doc.wires) if (onSeg(w, x, y)) { inc(k); inc(k); } }
  return { n, conn, widths, wireNet, bad, deg, pinRec };
}
function nets() { if (!netCache) netCache = buildNets(); return netCache; }

/* ---------------- simulation ---------------- */
let vals = [], oscillating = false;
function inputsOf(c, v) { const ps = T[c.t].pins(c.a), cn = nets().conn.get(c.id); const r = []; ps.forEach((p, i) => { if (p.dir !== 'out') r.push(v[cn[i]]); }); return r; }
function computeNets(outs) {
  const nt = nets(); const nv = new Array(nt.n).fill(undefined); const drv = new Array(nt.n).fill(0);
  for (const c of doc.comps) { const o = outs.get(c.id); if (!o) continue; const ps = T[c.t].pins(c.a), cn = nt.conn.get(c.id); let k = 0; ps.forEach((p, i) => { if (p.dir !== 'out') return; const v = o[k++]; if (v === null || v === undefined) return; const ni = cn[i]; if (nv[ni] === undefined) { nv[ni] = v; drv[ni]++; } else if (nv[ni] !== v) nv[ni] = 'E'; }); }
  // splitters
  for (let pass = 0; pass < 3; pass++) for (const c of doc.comps) { if (!T[c.t].splitter) continue; const cn = nt.conn.get(c.id), w = +c.a.width; const bus = cn[0];
    if (nv[bus] !== undefined && nv[bus] !== 'E' && nv[bus] !== null) { for (let i = 0; i < w; i++) { const b = cn[1 + i]; if (nv[b] === undefined) nv[b] = (nv[bus] >>> i) & 1; } }
    else if (nv[bus] === undefined) { let v = 0, ok = true; for (let i = 0; i < w; i++) { const b = nv[cn[1 + i]]; if (!isNum(b)) { ok = false; break; } v |= (b & 1) << i; } if (ok) nv[bus] = v >>> 0; } }
  for (let i = 0; i < nv.length; i++) { if (nv[i] === undefined) nv[i] = null; if (nt.bad.has(i)) nv[i] = 'E'; }
  return nv;
}
function settle() {
  oscillating = false; let prev = JSON.stringify(vals);
  for (let it = 0; it < 300; it++) {
    const outs = new Map(); for (const c of doc.comps) { const d = T[c.t]; if (d.noPins) continue; outs.set(c.id, d.eval(c.a, inputsOf(c, vals), c.st)); }
    vals = computeNets(outs); const now = JSON.stringify(vals); if (now === prev) return; prev = now;
  }
  oscillating = true;
}
function propagate() {
  let snap = vals.slice(); settle();
  for (let round = 0; round < 64; round++) {
    const edges = [];
    for (const c of doc.comps) { const d = T[c.t]; if (!d.seq) continue; const clk = inputsOf(c, vals)[d.clockPin]; const last = c.st.lastClk; c.st.lastClk = clk; if (last === 0 && clk === 1) edges.push(c); }
    if (!edges.length) break;
    for (const c of edges) T[c.t].capture(c.a, inputsOf(c, snap), c.st);
    snap = vals.slice(); settle();
  }
  record(); dirty = true;
}
function resetSim() { for (const c of doc.comps) { const d = T[c.t]; if (d.seq || c.t === 'srlatch') c.st = {}; if (d.clock) c.st.v = 0; } vals = []; netCache = null; settle(); for (const c of doc.comps) if (T[c.t].seq) c.st.lastClk = inputsOf(c, vals)[T[c.t].clockPin]; trace.length = 0; tick = 0; record(); dirty = true; }
function structureChanged() { netCache = null; refreshTimingList(); vals = []; settle(); for (const c of doc.comps) if (T[c.t].seq && c.st.lastClk === undefined) c.st.lastClk = inputsOf(c, vals)[T[c.t].clockPin]; dirty = true; refreshTimingList(); save(); }

/* clock */
let running = false, timer = null, tick = 0;
function clockStep() { for (const c of doc.comps) if (T[c.t].clock) c.st.v = c.st.v ? 0 : 1; tick++; propagate(); }
function setRunning(r) { running = r; clearInterval(timer); if (r) timer = setInterval(clockStep, 1000 / (2 * +$('#speed').value)); $('#bRun').textContent = r ? 'Pause clock' : 'Run clock'; $('#bRun').classList.toggle('on', r); }

/* ---------------- timing diagram ---------------- */
const trace = []; let traceSigs = [];
function sigName(c) { return c.a.label || (T[c.t].name + ' ' + (doc.comps.filter(x => x.t === c.t).indexOf(c) + 1)); }
function refreshTimingList() { traceSigs = doc.comps.filter(c => ['pin', 'clock', 'button', 'outpin', 'probe', 'led'].includes(c.t)).map(c => c.id); }
function sigValue(c) { if (T[c.t].input) return T[c.t].eval(c.a, [], c.st)[0]; const cn = nets().conn.get(c.id); return vals[cn[0]]; }
function record() { const s = {}; for (const id of traceSigs) { const c = doc.comps.find(x => x.id === id); if (c) s[id] = sigValue(c); } trace.push(s); if (trace.length > 400) trace.shift(); drawTiming(); }
function drawTiming() {
  const tc = $('#tcv'); if (!tc || $('#timing').hidden) return; const r = tc.getBoundingClientRect(); const dpr = devicePixelRatio || 1; tc.width = r.width * dpr; tc.height = r.height * dpr; const g = tc.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
  const sigs = traceSigs.map(id => doc.comps.find(c => c.id === id)).filter(Boolean); const rowH = 26, left = 110; const n = Math.max(1, trace.length); const step = Math.max(6, Math.min(28, (r.width - left - 10) / Math.min(n, 120))); const start = Math.max(0, trace.length - Math.floor((r.width - left - 10) / step));
  g.font = '12px "IBM Plex Sans", sans-serif'; g.textBaseline = 'middle';
  for (let t = start; t < trace.length; t++) { const x = left + (t - start) * step; if ((t - start) % 2 === 0) { g.fillStyle = '#f5f7fa'; g.fillRect(x, 0, step, sigs.length * rowH); } }
  sigs.forEach((c, i) => {
    const y0 = i * rowH + 5, y1 = y0 + rowH - 10, w = +(c.a.width || 1);
    g.fillStyle = '#1b2230'; g.fillText(sigName(c), 8, y0 + (rowH - 10) / 2); g.strokeStyle = '#e3e7ec'; g.beginPath(); g.moveTo(0, i * rowH + rowH); g.lineTo(r.width, i * rowH + rowH); g.stroke();
    g.lineWidth = 2; let prev;
    for (let t = start; t < trace.length; t++) { const v = trace[t][c.id]; const x = left + (t - start) * step;
      if (w === 1) { const y = v === 1 ? y0 : v === 0 ? y1 : (y0 + y1) / 2; g.strokeStyle = v === 'E' ? '#c62828' : v === null || v === undefined ? '#2f6fdd' : '#1f8a3a'; g.beginPath(); if (prev !== undefined) { g.moveTo(x, prev); g.lineTo(x, y); } else g.moveTo(x, y); g.lineTo(x + step, y); g.stroke(); prev = y; }
      else { const same = t > start && trace[t - 1][c.id] === v; g.strokeStyle = '#1b2230'; g.lineWidth = 1.3; g.beginPath(); if (!same) { g.moveTo(x, (y0 + y1) / 2); g.lineTo(x + 3, y0); g.lineTo(x + step, y0); g.moveTo(x, (y0 + y1) / 2); g.lineTo(x + 3, y1); g.lineTo(x + step, y1); } else { g.moveTo(x, y0); g.lineTo(x + step, y0); g.moveTo(x, y1); g.lineTo(x + step, y1); } g.stroke(); if (!same && step > 14) { g.fillStyle = '#1b2230'; g.font = '10px "IBM Plex Mono", monospace'; g.fillText(hex(v, w), x + 5, (y0 + y1) / 2); g.font = '12px "IBM Plex Sans", sans-serif'; } }
    }
  });
  if (!sigs.length) { g.fillStyle = '#5e6979'; g.fillText('Add input pins, clocks, output pins or probes to see their waveforms here.', 12, 18); }
}

/* ---------------- view ---------------- */
let view = { x: 80, y: 60, z: 1 }, dirty = true, sel = new Set(), selW = new Set(), hover = null;
const s2w = (sx, sy) => [(sx - view.x) / view.z, (sy - view.y) / view.z];
function resize() { const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; dirty = true; }
window.addEventListener('resize', () => { resize(); drawTiming(); });
const COL = { one: '#22a447', zero: '#14532d', flt: '#2f6fdd', err: '#d32f2f', bus: '#1b2230', sel: '#1a8cff' };
function wireColor(v, w) { if (v === 'E') return COL.err; if (v === null || v === undefined) return COL.flt; if (w > 1) return COL.bus; return v ? COL.one : COL.zero; }
function render(g, opts) {
  opts = opts || {}; const nt = nets();
  for (let i = 0; i < doc.wires.length; i++) { const w = doc.wires[i]; const ni = nt.wireNet[i]; const v = vals[ni], wd = nt.widths[ni] || 1; g.strokeStyle = !opts.plain && selW.has(i) ? COL.sel : wireColor(v, wd); g.lineWidth = wd > 1 ? 4 : 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(w.x1, w.y1); g.lineTo(w.x2, w.y2); g.stroke(); }
  for (const [k, d] of nt.deg) if (d >= 3) { const [x, y] = k.split(',').map(Number); let ni = null; for (const [cid, ps] of nt.pinRec) { const p = ps.find(p => p.k === k); if (p) { ni = nt.conn.get(cid)[p.i]; break; } } if (ni === null) { const wi = doc.wires.findIndex(w => (w.x1 === x && w.y1 === y) || (w.x2 === x && w.y2 === y) || onSeg(w, x, y)); if (wi >= 0) ni = nt.wireNet[wi]; } g.fillStyle = ni !== null ? wireColor(vals[ni], nt.widths[ni] || 1) : COL.bus; g.beginPath(); g.arc(x, y, 3.6, 0, Math.PI * 2); g.fill(); }
  for (const c of doc.comps) {
    const d = T[c.t]; const cn = nt.conn.get(c.id) || []; const ps = d.pins(c.a); const pv = []; ps.forEach((p, i) => { if (p.dir !== 'out') pv.push(vals[cn[i]]); });
    g.save(); g.translate(c.x, c.y); const ang = { east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 }[c.f]; if (!d.noPins && !(c.t === 'text')) g.rotate(ang);
    try { d.draw(g, c.a, c.st, pv); } catch (e) { }
    g.restore();
    const b = bboxOf(c);
    if (c.a.label && c.t !== 'text') { g.save(); g.font = '600 11px "IBM Plex Sans", sans-serif'; g.fillStyle = '#1b2230'; g.textBaseline = 'middle'; if (d.labelInside) { const [mx, my] = rot(c.f, (d.box(c.a)[0] - 8) / 2, 0); g.textAlign = 'center'; g.font = '600 10px "IBM Plex Sans", sans-serif'; g.fillText(String(c.a.label), c.x + mx, c.y + my + 0.5); } else { g.textAlign = 'center'; g.fillText(String(c.a.label), (b[0] + b[2]) / 2, b[1] - 9); } g.restore(); }
    // pin dots for unconnected pins
    if (!opts.plain) pinsOf(c).forEach(p => { if ((nt.deg.get(key(p.x, p.y)) || 0) < 2 && !T[c.t].noPins) { g.fillStyle = p.dir === 'out' ? '#1b2230' : '#7c8796'; g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI * 2); g.fill(); } });
    if (!opts.plain && sel.has(c.id)) { g.save(); g.setLineDash([4, 3]); g.strokeStyle = COL.sel; g.lineWidth = 1.2; g.strokeRect(b[0] - 4, b[1] - 4, b[2] - b[0] + 8, b[3] - b[1] + 8); g.restore(); }
  }
}
function frame() {
  if (dirty) {
    dirty = false; const d = devicePixelRatio || 1, W = cv.width, H = cv.height; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.setTransform(d * view.z, 0, 0, d * view.z, d * view.x, d * view.y);
    if (view.z > 0.45) { const [x0, y0] = s2w(0, 0), [x1, y1] = s2w(W / d, H / d); ctx.fillStyle = '#d0d7e1'; for (let x = Math.floor(x0 / 10) * 10; x <= x1; x += 10) for (let y = Math.floor(y0 / 10) * 10; y <= y1; y += 10) ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }
    render(ctx);
    if (ghost) { ctx.save(); ctx.globalAlpha = 0.55; const c = ghost; ctx.translate(c.x, c.y); ctx.rotate({ east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 }[c.f]); try { T[c.t].draw(ctx, c.a, c.st, []); } catch (e) { } ctx.restore(); }
    if (drag && drag.kind === 'wire') { ctx.strokeStyle = COL.sel; ctx.lineWidth = 2.4; ctx.beginPath(); const p = wirePath(drag); ctx.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => ctx.lineTo(q[0], q[1])); ctx.stroke(); }
    if (drag && drag.kind === 'band') { const [a, b] = [drag.x0, drag.y0], [c2, d2] = [drag.x1, drag.y1]; ctx.fillStyle = 'rgba(26,140,255,.08)'; ctx.strokeStyle = COL.sel; ctx.lineWidth = 1 / view.z; ctx.fillRect(Math.min(a, c2), Math.min(b, d2), Math.abs(c2 - a), Math.abs(d2 - b)); ctx.strokeRect(Math.min(a, c2), Math.min(b, d2), Math.abs(c2 - a), Math.abs(d2 - b)); }
    if (hover && hover.pin) { ctx.strokeStyle = COL.sel; ctx.lineWidth = 2 / view.z; ctx.beginPath(); ctx.arc(hover.pin.x, hover.pin.y, 6, 0, Math.PI * 2); ctx.stroke(); }
    $('#zoomv').textContent = Math.round(view.z * 100) + '%';
    status();
  }
  requestAnimationFrame(frame);
}
function status() { const nt = nets(); const conf = vals.some(v => v === 'E'); let s = `${doc.comps.length} parts · ${doc.wires.length} wires`; if (oscillating) s += ' · The circuit oscillates and does not settle'; else if (conf) s += ' · Conflict: two outputs drive one wire, or bus widths do not match (red)'; $('#status').textContent = s; $('#status').classList.toggle('warn', oscillating || conf); }

/* ---------------- undo ---------------- */
const undoS = [], redoS = [];
const snapDoc = () => JSON.stringify({ comps: doc.comps, wires: doc.wires });
function pushUndo() { undoS.push(snapDoc()); if (undoS.length > 200) undoS.shift(); redoS.length = 0; }
function restore(s) { const o = JSON.parse(s); doc.comps = o.comps; doc.wires = o.wires; sel.clear(); selW.clear(); structureChanged(); refreshPanel(); }
function undo() { if (!undoS.length) return; redoS.push(snapDoc()); restore(undoS.pop()); }
function redo() { if (!redoS.length) return; undoS.push(snapDoc()); restore(redoS.pop()); }

/* ---------------- hit testing ---------------- */
function hitComp(x, y) { for (let i = doc.comps.length - 1; i >= 0; i--) { const c = doc.comps[i]; const b = bboxOf(c); if (x >= b[0] - 2 && x <= b[2] + 2 && y >= b[1] - 2 && y <= b[3] + 2) return c; } return null; }
function hitPin(x, y) { for (const c of doc.comps) for (const p of pinsOf(c)) if (Math.hypot(p.x - x, p.y - y) <= 6 / Math.min(1, view.z) && Math.hypot(p.x - x, p.y - y) <= 7) return { c, p }; return null; }
function hitWire(x, y) { for (let i = doc.wires.length - 1; i >= 0; i--) { const w = doc.wires[i]; const tol = 5; if (w.x1 === w.x2) { if (Math.abs(x - w.x1) <= tol && y >= Math.min(w.y1, w.y2) - tol && y <= Math.max(w.y1, w.y2) + tol) return i; } else if (Math.abs(y - w.y1) <= tol && x >= Math.min(w.x1, w.x2) - tol && x <= Math.max(w.x1, w.x2) + tol) return i; } return null; }

/* ---------------- wires ---------------- */
function wirePath(d) { const { x0, y0 } = d; const x1 = snap(d.x1), y1 = snap(d.y1); if (x1 === x0 || y1 === y0) return [[x0, y0], [x1, y1]]; return d.hfirst ? [[x0, y0], [x1, y0], [x1, y1]] : [[x0, y0], [x0, y1], [x1, y1]]; }
function addWire(x1, y1, x2, y2) { if (x1 === x2 && y1 === y2) return; if (x1 !== x2 && y1 !== y2) { addWire(x1, y1, x2, y1); addWire(x2, y1, x2, y2); return; } if (doc.wires.some(w => (w.x1 === x1 && w.y1 === y1 && w.x2 === x2 && w.y2 === y2) || (w.x1 === x2 && w.y1 === y2 && w.x2 === x1 && w.y2 === y1))) return; doc.wires.push({ x1, y1, x2, y2 }); }
function mergeWires() { // split wires at endpoints that land on their interior, remove zero-length
  let changed = true; let guard = 0;
  while (changed && guard++ < 20) { changed = false; const ends = new Set(); doc.wires.forEach(w => { ends.add(key(w.x1, w.y1)); ends.add(key(w.x2, w.y2)); }); doc.comps.forEach(c => pinsOf(c).forEach(p => ends.add(key(p.x, p.y))));
    for (let i = 0; i < doc.wires.length; i++) { const w = doc.wires[i]; for (const k of ends) { const [x, y] = k.split(',').map(Number); if (onSeg(w, x, y)) { doc.wires.splice(i, 1, { x1: w.x1, y1: w.y1, x2: x, y2: y }, { x1: x, y1: y, x2: w.x2, y2: w.y2 }); changed = true; break; } } if (changed) break; } }
  doc.wires = doc.wires.filter(w => !(w.x1 === w.x2 && w.y1 === w.y2));
}

/* ---------------- mouse ---------------- */
let drag = null, ghost = null, space = false;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top; const [x, y] = s2w(sx, sy);
  if (e.button === 1 || e.button === 2 || space) { drag = { kind: 'pan', sx, sy, vx: view.x, vy: view.y }; return; }
  if (ghost) { pushUndo(); const c = mkComp(ghost.t, snap(x), snap(y), ghost.a, ghost.f); doc.comps.push(c); mergeWires(); sel = new Set([c.id]); selW.clear(); if (!e.shiftKey) { ghost = null; setHint(''); } structureChanged(); refreshPanel(); return; }
  const hp = hitPin(x, y);
  if (hp) { drag = { kind: 'wire', x0: hp.p.x, y0: hp.p.y, x1: hp.p.x, y1: hp.p.y, hfirst: null }; dirty = true; return; }
  const c = hitComp(x, y);
  if (c) {
    const d = T[c.t]; const [lx, ly] = toLocal(c, x, y);
    if ((d.input || d.click) && !e.shiftKey && !sel.has(c.id) || (d.momentary)) { drag = { kind: 'poke', c, lx, ly, sx, sy, moved: false, x0: x, y0: y }; if (d.momentary) { c.st.v = 1; propagate(); } return; }
    if (!sel.has(c.id)) { if (!e.shiftKey) { sel.clear(); selW.clear(); } sel.add(c.id); refreshPanel(); } else if (e.shiftKey) { sel.delete(c.id); refreshPanel(); dirty = true; return; }
    drag = { kind: 'move', x0: x, y0: y, snap: snapDoc(), moved: false, orig: doc.comps.filter(q => sel.has(q.id)).map(q => [q, q.x, q.y]) }; dirty = true; return;
  }
  const wi = hitWire(x, y);
  if (wi !== null) {
    if (e.altKey || e.detail >= 2) { if (!e.shiftKey) { sel.clear(); selW.clear(); } selW.add(wi); dirty = true; refreshPanel(); return; }
    drag = { kind: 'wire', x0: snap(x), y0: snap(y), x1: snap(x), y1: snap(y), hfirst: null, fromWire: wi }; dirty = true; return;
  }
  if (!e.shiftKey) { sel.clear(); selW.clear(); refreshPanel(); }
  drag = { kind: 'band', x0: x, y0: y, x1: x, y1: y }; dirty = true;
});
cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top; const [x, y] = s2w(sx, sy);
  $('#coord').textContent = snap(x) + ', ' + snap(y);
  if (ghost) { ghost.x = snap(x); ghost.y = snap(y); dirty = true; return; }
  if (!drag) { const hp = hitPin(x, y); const nh = hp ? { pin: hp.p } : null; if (JSON.stringify(nh && nh.pin && [nh.pin.x, nh.pin.y]) !== JSON.stringify(hover && hover.pin && [hover.pin.x, hover.pin.y])) { hover = nh; dirty = true; } cv.style.cursor = hp ? 'crosshair' : hitComp(x, y) ? 'move' : hitWire(x, y) !== null ? 'crosshair' : 'default'; return; }
  if (drag.kind === 'pan') { view.x = drag.vx + sx - drag.sx; view.y = drag.vy + sy - drag.sy; dirty = true; return; }
  if (drag.kind === 'wire') { drag.x1 = x; drag.y1 = y; if (drag.hfirst === null && (Math.abs(x - drag.x0) > 4 || Math.abs(y - drag.y0) > 4)) drag.hfirst = Math.abs(x - drag.x0) >= Math.abs(y - drag.y0); dirty = true; return; }
  if (drag.kind === 'band') { drag.x1 = x; drag.y1 = y; dirty = true; return; }
  if (drag.kind === 'poke') { if (Math.hypot(sx - drag.sx, sy - drag.sy) > 5 && !T[drag.c.t].momentary) { sel = new Set([drag.c.id]); selW.clear(); refreshPanel(); drag = { kind: 'move', x0: drag.x0, y0: drag.y0, snap: snapDoc(), moved: false, orig: [[drag.c, drag.c.x, drag.c.y]] }; } return; }
  if (drag.kind === 'move') { const dx = snap(x - drag.x0), dy = snap(y - drag.y0); if (dx || dy || drag.moved) { drag.moved = true; for (const [c, ox, oy] of drag.orig) { c.x = ox + dx; c.y = oy + dy; } netCache = null; dirty = true; } }
});
cv.addEventListener('pointerup', e => {
  if (!drag) return; const d = drag; drag = null;
  if (d.kind === 'wire') { const p = wirePath(d); if (p.length > 1 && !(p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1])) { pushUndo(); for (let i = 1; i < p.length; i++) addWire(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]); mergeWires(); structureChanged(); } else if (d.fromWire !== undefined) { if (!e.shiftKey) { sel.clear(); selW.clear(); } selW.add(d.fromWire); refreshPanel(); } dirty = true; }
  else if (d.kind === 'band') { const x1 = Math.min(d.x0, d.x1), x2 = Math.max(d.x0, d.x1), y1 = Math.min(d.y0, d.y1), y2 = Math.max(d.y0, d.y1); if (x2 - x1 > 3 || y2 - y1 > 3) { doc.comps.forEach(c => { const b = bboxOf(c); if (b[0] >= x1 && b[2] <= x2 && b[1] >= y1 && b[3] <= y2) sel.add(c.id); }); doc.wires.forEach((w, i) => { if (Math.min(w.x1, w.x2) >= x1 && Math.max(w.x1, w.x2) <= x2 && Math.min(w.y1, w.y2) >= y1 && Math.max(w.y1, w.y2) <= y2) selW.add(i); }); } refreshPanel(); dirty = true; }
  else if (d.kind === 'poke') { const t = T[d.c.t]; if (t.momentary) { d.c.st.v = 0; propagate(); } else { t.click(d.c.a, d.c.st, d.lx, d.ly); propagate(); save(); } }
  else if (d.kind === 'move' && d.moved) { undoS.push(d.snap); redoS.length = 0; mergeWires(); structureChanged(); }
});
cv.addEventListener('dblclick', e => { const r = cv.getBoundingClientRect(); const [x, y] = s2w(e.clientX - r.left, e.clientY - r.top); const c = hitComp(x, y); if (c) { sel = new Set([c.id]); selW.clear(); refreshPanel(); const f = $('#props input, #props select'); if (f) f.focus(); } });
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top; if (e.ctrlKey || e.metaKey || !e.shiftKey && Math.abs(e.deltaX) < 1) { const k = Math.exp(-e.deltaY * 0.0015); zoomAt(sx, sy, k); } else { view.x -= e.deltaX; view.y -= e.deltaY; dirty = true; } }, { passive: false });
function zoomAt(sx, sy, k) { const nz = Math.max(0.2, Math.min(4, view.z * k)); view.x = sx - (sx - view.x) * nz / view.z; view.y = sy - (sy - view.y) * nz / view.z; view.z = nz; dirty = true; }
function fit() { if (!doc.comps.length && !doc.wires.length) { view = { x: 80, y: 60, z: 1 }; dirty = true; return; } let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9; doc.comps.forEach(c => { const b = bboxOf(c); x1 = Math.min(x1, b[0]); y1 = Math.min(y1, b[1] - 16); x2 = Math.max(x2, b[2]); y2 = Math.max(y2, b[3]); }); doc.wires.forEach(w => { x1 = Math.min(x1, w.x1, w.x2); x2 = Math.max(x2, w.x1, w.x2); y1 = Math.min(y1, w.y1, w.y2); y2 = Math.max(y2, w.y1, w.y2); }); const r = cv.getBoundingClientRect(); const z = Math.max(0.25, Math.min(2, Math.min((r.width - 80) / (x2 - x1 || 1), (r.height - 80) / (y2 - y1 || 1)))); view = { z, x: r.width / 2 - (x1 + x2) / 2 * z, y: r.height / 2 - (y1 + y2) / 2 * z }; dirty = true; }

/* ---------------- keyboard ---------------- */
let clip = null;
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea,select,[contenteditable]')) return;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (k === ' ') { space = true; return; }
  if (k === 'escape') { ghost = null; drag = null; sel.clear(); selW.clear(); setHint(''); refreshPanel(); dirty = true; closeMenus(); return; }
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (ctrl && k === 'y') { e.preventDefault(); redo(); return; }
  if (ctrl && k === 's') { e.preventDefault(); saveFile(e.shiftKey); return; }
  if (ctrl && k === 'o') { e.preventDefault(); openDialog(); return; }
  if (ctrl && k === 'a') { e.preventDefault(); doc.comps.forEach(c => sel.add(c.id)); doc.wires.forEach((w, i) => selW.add(i)); dirty = true; refreshPanel(); return; }
  if (ctrl && k === 'c') { e.preventDefault(); copySel(); return; }
  if (ctrl && k === 'v') { e.preventDefault(); paste(); return; }
  if (ctrl && k === 'd') { e.preventDefault(); copySel(); paste(); return; }
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSel(); return; }
  if (k === 'r' && !ctrl) { if (ghost) { ghost.f = FACINGS[(FACINGS.indexOf(ghost.f) + 1) % 4]; dirty = true; } else rotateSel(); return; }
  if (k === 'f' && !ctrl) { fit(); return; }
  if (k === 't' && !ctrl) { clockStep(); return; }
  if (k.startsWith('arrow') && sel.size) { e.preventDefault(); pushUndo(); const d = 10; doc.comps.forEach(c => { if (!sel.has(c.id)) return; if (k === 'arrowleft') c.x -= d; if (k === 'arrowright') c.x += d; if (k === 'arrowup') c.y -= d; if (k === 'arrowdown') c.y += d; }); structureChanged(); }
});
document.addEventListener('keyup', e => { if (e.key === ' ') space = false; });
function deleteSel() { if (!sel.size && !selW.size) return; pushUndo(); doc.comps = doc.comps.filter(c => !sel.has(c.id)); doc.wires = doc.wires.filter((w, i) => !selW.has(i)); sel.clear(); selW.clear(); structureChanged(); refreshPanel(); }
function rotateSel() { if (!sel.size) return; pushUndo(); doc.comps.forEach(c => { if (sel.has(c.id) && !T[c.t].noPins) c.f = FACINGS[(FACINGS.indexOf(c.f) + 1) % 4]; }); structureChanged(); refreshPanel(); }
function copySel() { const cs = doc.comps.filter(c => sel.has(c.id)); const ws = doc.wires.filter((w, i) => selW.has(i)); if (!cs.length && !ws.length) return; clip = JSON.stringify({ comps: cs, wires: ws }); try { localStorage.setItem('cesim.logic.clip', clip); } catch (e) { } }
function paste() { const s = clip || (() => { try { return localStorage.getItem('cesim.logic.clip'); } catch (e) { return null; } })(); if (!s) return; pushUndo(); const o = JSON.parse(s); sel.clear(); selW.clear(); o.comps.forEach(c => { c.id = uid(); c.x += 20; c.y += 20; doc.comps.push(c); sel.add(c.id); }); o.wires.forEach(w => { doc.wires.push({ x1: w.x1 + 20, y1: w.y1 + 20, x2: w.x2 + 20, y2: w.y2 + 20 }); selW.add(doc.wires.length - 1); }); clip = JSON.stringify({ comps: o.comps, wires: o.wires }); mergeWires(); structureChanged(); refreshPanel(); }

/* ---------------- library ---------------- */
function thumb(t) { const c = document.createElement('canvas'); c.width = 96; c.height = 72; const g = c.getContext('2d'); g.scale(2, 2); const d = T[t]; const a = Object.assign({}, d.attrs); const b = d.box(a); const w = b[2] - b[0], h = b[3] - b[1]; const s = Math.min(1, 38 / w, 28 / h); g.translate(24 - (b[0] + w / 2) * s, 18 - (b[1] + h / 2) * s); g.scale(s, s); try { d.draw(g, a, { v: 0 }, []); } catch (e) { } return c.toDataURL(); }
function buildLibrary(f) {
  f = (f || '').toLowerCase(); let h = '';
  for (const cat of CATS) { const items = Object.keys(T).filter(k => T[k].cat === cat && (!f || T[k].name.toLowerCase().includes(f))); if (!items.length) continue;
    h += `<div class="cat"><div class="cath">${cat}</div><div class="grid">` + items.map(k => `<button class="it" data-t="${k}" title="${esc(T[k].name)}"><img src="${thumb(k)}" alt=""><span>${esc(T[k].name)}</span></button>`).join('') + '</div></div>'; }
  $('#lib').innerHTML = h || '<p class="dim" style="padding:10px">No parts match.</p>';
}
$('#lib').addEventListener('click', e => { const b = e.target.closest('.it'); if (!b) return; const t = b.dataset.t; ghost = mkComp(t, -1000, -1000); setHint(`Click to place the ${T[t].name}. R rotates. Shift+click places several. Esc cancels.`); dirty = true; });
$('#libq').addEventListener('input', e => buildLibrary(e.target.value));

/* ---------------- properties ---------------- */
const ATTR_UI = {
  width: { l: 'Bits', t: 'num', min: 1, max: 32 }, inputs: { l: 'Inputs', t: 'num', min: 2, max: 16 }, select: { l: 'Select bits', t: 'num', min: 1, max: 4 },
  label: { l: 'Label', t: 'text' }, value: { l: 'Value (e.g. 1, 0x0F, 0b101)', t: 'text' }, hz: { l: 'Clock (Hz)', t: 'num', min: 0.1, max: 50 }, color: { l: 'Color', t: 'color' }, text: { l: 'Text', t: 'text' }, size: { l: 'Size', t: 'num', min: 8, max: 48 }
};
function refreshPanel() {
  const P_ = $('#props'); dirty = true;
  if (sel.size === 1 && !selW.size) {
    const c = doc.comps.find(x => sel.has(x.id)); if (!c) { P_.innerHTML = ''; return; } const d = T[c.t];
    let h = `<h3>${esc(d.name)}</h3>`;
    if (!d.noPins) h += `<label>Facing<select data-f="1">${FACINGS.map(f => `<option ${f === c.f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>`;
    for (const k of Object.keys(d.attrs)) { const u = ATTR_UI[k]; if (!u) continue; const v = c.a[k]; h += `<label>${u.l}${u.t === 'num' ? `<input type="number" data-k="${k}" min="${u.min}" max="${u.max}" step="${k === 'hz' ? 0.1 : 1}" value="${esc(v)}">` : u.t === 'color' ? `<input type="color" data-k="${k}" value="${esc(v)}">` : `<input data-k="${k}" value="${esc(v)}">`}</label>`; }
    if (d.input && c.t === 'pin') h += `<p class="dim">Click the pin to change its value${+c.a.width > 1 ? ' (click a bit to flip it)' : ''}. Drag it to move it.</p>`;
    if (d.seq) h += `<p class="dim">Changes on the rising edge of the clock. clr and pre (if connected) act immediately.</p>`;
    h += `<div class="row"><button class="btn" id="pRot">Rotate (R)</button><button class="btn" id="pDel">Delete</button></div>`;
    P_.innerHTML = h;
    P_.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('change', () => { pushUndo(); let v = inp.value; const u = ATTR_UI[inp.dataset.k]; if (u.t === 'num') { v = Math.max(u.min, Math.min(u.max, +v || u.min)); if (inp.dataset.k !== 'hz') v = Math.round(v); } c.a[inp.dataset.k] = v; if (inp.dataset.k === 'width' && c.st.v !== undefined) c.st.v &= mask(+v); structureChanged(); refreshPanel(); }));
    const fs = P_.querySelector('[data-f]'); if (fs) fs.addEventListener('change', () => { pushUndo(); c.f = fs.value; structureChanged(); });
    $('#pRot') && ($('#pRot').onclick = rotateSel); $('#pDel').onclick = deleteSel;
  } else if (sel.size || selW.size) { P_.innerHTML = `<h3>${sel.size} part${sel.size === 1 ? '' : 's'}, ${selW.size} wire${selW.size === 1 ? '' : 's'}</h3><div class="row"><button class="btn" id="pDel">Delete</button></div><p class="dim">Drag to move. Ctrl+D duplicates. R rotates.</p>`; $('#pDel').onclick = deleteSel; }
  else P_.innerHTML = `<h3>How to use</h3><ul class="tips"><li>Click a part on the left, then click on the sheet to place it.</li><li>Drag from a pin (or a wire) to draw a wire.</li><li>Click an input pin to switch it between 0 and 1. Bright green is 1, dark green is 0, blue is not connected, red is a conflict.</li><li>Run clock (or T) drives every clock. The timing diagram below records the signals.</li><li>Truth table lists every input combination and opens it in Boolean tools.</li><li>Opens .cedig and .circ files.</li></ul>`;
}
function setHint(s) { $('#hint').textContent = s; }

/* ---------------- truth table ---------------- */
function truthTable() {
  const ins = doc.comps.filter(c => c.t === 'pin').sort((a, b) => a.y - b.y || a.x - b.x), outs = doc.comps.filter(c => c.t === 'outpin').sort((a, b) => a.y - b.y || a.x - b.x);
  if (!ins.length || !outs.length) return { err: 'Add at least one input pin and one output pin.' };
  const bits = ins.reduce((s, c) => s + +c.a.width, 0); if (bits > 12) return { err: 'Too many input bits (' + bits + '). The truth table supports up to 12.' };
  const saved = ins.map(c => c.st.v), savedSt = doc.comps.map(c => JSON.stringify(c.st)); const rows = [];
  for (let m = 0; m < (1 << bits); m++) { let sh = bits; ins.forEach(c => { const w = +c.a.width; sh -= w; c.st.v = (m >>> sh) & mask(w); }); vals = []; settle(); rows.push({ m, ins: ins.map(c => c.st.v), outs: outs.map(c => vals[nets().conn.get(c.id)[0]]) }); }
  doc.comps.forEach((c, i) => c.st = JSON.parse(savedSt[i])); ins.forEach((c, i) => c.st.v = saved[i]); vals = []; settle(); dirty = true;
  const seq = doc.comps.some(c => T[c.t].seq || c.t === 'srlatch');
  return { ins, outs, rows, bits, seq };
}
function nameOf(c, i, pre) { return c.a.label ? String(c.a.label).replace(/\s+/g, '_') : pre + (i + 1); }
function showTruthTable() {
  const r = truthTable(); if (r.err) { toast(r.err, true); return; }
  const inN = r.ins.map((c, i) => nameOf(c, i, 'I')), outN = r.outs.map((c, i) => nameOf(c, i, 'O'));
  const fmt = (v, w) => v === null || v === undefined ? 'x' : v === 'E' ? 'E' : w > 1 ? (v >>> 0).toString(2).padStart(w, '0') : String(v);
  let h = `<div class="tt-wrap"><table class="tt"><thead><tr>${inN.map(n => `<th>${esc(n)}</th>`).join('')}<th class="sep"></th>${outN.map(n => `<th class="o">${esc(n)}</th>`).join('')}</tr></thead><tbody>`;
  r.rows.forEach(row => { h += '<tr>' + row.ins.map((v, i) => `<td>${fmt(v, +r.ins[i].a.width)}</td>`).join('') + '<td class="sep"></td>' + row.outs.map((v, i) => `<td class="o ${v === 1 ? 'one' : ''}">${fmt(v, +r.outs[i].a.width)}</td>`).join('') + '</tr>'; });
  h += '</tbody></table></div>';
  if (r.seq) h += '<p class="dim">This circuit has memory, so the table shows the outputs for the current stored state.</p>';
  const oneBit = r.ins.every(c => +c.a.width === 1) && r.outs.every(c => +c.a.width === 1) && r.bits <= 6;
  h += `<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" id="ttCsv">Copy as CSV</button>${oneBit ? '<button class="btn pri" id="ttBool">Open in Boolean tools</button>' : ''}</div>${oneBit ? '' : '<p class="dim">Boolean tools accepts up to 6 one-bit inputs and one-bit outputs.</p>'}`;
  const m = modal('Truth table', h);
  m.querySelector('#ttCsv').onclick = () => { const csv = [inN.concat(outN).join(',')].concat(r.rows.map(row => row.ins.map((v, i) => fmt(v, +r.ins[i].a.width)).concat(row.outs.map((v, i) => fmt(v, +r.outs[i].a.width))).join(','))).join('\n'); copyText(csv, 'Truth table copied.'); };
  const bb = m.querySelector('#ttBool'); if (bb) bb.onclick = () => { const payload = { kind: 'truthtable', vars: inN, outs: outN.map((n, j) => ({ name: n, values: r.rows.map(row => row.outs[j] === 1 ? 1 : row.outs[j] === 0 ? 0 : 'x') })) }; try { localStorage.setItem('cesim.handoff.bool', JSON.stringify(payload)); } catch (e) { } if (N && N.openTool) N.openTool('bool'); else window.open('bool.html?handoff=1', '_blank'); };
}

/* ---------------- build circuit from equations (from Boolean tools) ---------------- */
function buildFromSop(p) {
  // p: { vars:[names], outs:[{name, terms:[[{v,neg}]]}] }  (no terms => 0, one empty term => 1)
  const d = newDoc(p.title || 'from_boolean'); doc = d; filePath = null;
  const nv = p.vars.length, top = 80;
  const railX = (i, neg) => 100 + i * 50 + (neg ? 20 : 0);
  const usedNeg = new Set(); p.outs.forEach(o => o.terms.forEach(t => t.forEach(l => { if (l.neg) usedNeg.add(l.v); })));
  const andX = railX(nv, false) + 60; // AND output x is andX + 10, its inputs at andX - 40
  let y = top + 60; const rows = [];
  p.outs.forEach((o, oi) => { const start = y; const list = o.terms.length ? o.terms : [null]; list.forEach(t => { rows.push({ oi, t, y }); y += Math.max(50, ((t ? t.length : 1) + 1) * 20); }); o._y0 = start; o._y1 = y - 50; y += 40; });
  const bottom = y;
  // inputs, rails and complement rails
  const fsmBits = p.fsm ? p.fsm.bits : 0;
  p.vars.forEach((n, i) => { const rx = railX(i, false); if (i >= fsmBits) d.comps.push(mkComp('pin', rx, top - 40, { label: n }, 'south')); addWire(rx, top - 40, rx, bottom);
    if (usedNeg.has(i)) { const nx = railX(i, true); addWire(rx, top - 20, nx, top - 20); d.comps.push(mkComp('not', nx, top + 10, {}, 'south')); addWire(nx, top + 10, nx, bottom); } });
  // product terms
  const orIns = p.outs.map(() => []);
  for (const r of rows) {
    const qx = andX + 10;
    if (!r.t || r.t.length === 0) { d.comps.push(mkComp('constant', qx, r.y, { value: r.t ? '1' : '0' })); orIns[r.oi].push({ x: qx, y: r.y }); continue; }
    if (r.t.length === 1) { const l = r.t[0]; addWire(railX(l.v, l.neg), r.y, qx, r.y); orIns[r.oi].push({ x: qx, y: r.y }); continue; }
    const g = mkComp('and', qx, r.y, { inputs: r.t.length }); d.comps.push(g);
    pinsOf(g).filter(q => q.dir === 'in').forEach((q, i) => { const l = r.t[i]; addWire(railX(l.v, l.neg), q.y, q.x, q.y); });
    orIns[r.oi].push({ x: qx, y: r.y });
  }
  // sums
  const totalCols = orIns.reduce((s, a) => s + (a.length > 1 ? a.length : 0), 0);
  const orX = andX + 40 + totalCols * 10 + 60, outX = orX + 60; const dEnds = [];
  const endOut = (oi, x, y, name) => { if (oi < fsmBits) dEnds.push({ oi, x, y }); else d.comps.push(mkComp('outpin', x, y, { label: name })); }; const termYs = new Set(rows.map(r => r.y)); let col = andX + 30;
  p.outs.forEach((o, oi) => {
    const ins = orIns[oi];
    if (ins.length === 1) { const q = ins[0]; addWire(q.x, q.y, outX, q.y); endOut(oi, outX, q.y, o.name); return; }
    const ys = ins.map(q => q.y); let cy = snap((Math.min(...ys) + Math.max(...ys)) / 2);
    const tmp = mkComp('or', orX, cy, { inputs: ins.length });
    for (let k = 0; k < 40; k++) { tmp.y = cy + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 10; if (!pinsOf(tmp).some(q => q.dir === 'in' && termYs.has(q.y))) break; }
    d.comps.push(tmp); const gp = pinsOf(tmp).filter(q => q.dir === 'in');
    ins.forEach((q, i) => { const cx = col; col += 10; addWire(q.x, q.y, cx, q.y); addWire(cx, q.y, cx, gp[i].y); addWire(cx, gp[i].y, gp[i].x, gp[i].y); });
    addWire(tmp.x, tmp.y, outX, tmp.y); endOut(oi, outX, tmp.y, o.name);
  });
  if (fsmBits) {
    const ffX = outX + 40; const ffs = [];
    dEnds.forEach(e => { const ff = mkComp('dff', ffX, e.y - 10, { label: 'Q' + (fsmBits - 1 - e.oi) }); d.comps.push(ff); ffs.push({ ff, oi: e.oi }); addWire(e.x, e.y, ffX, e.y); });
    const clkY = bottom + 40; const busX = ffX - 20; d.comps.push(mkComp('clock', busX - 40, clkY, { label: 'CLK' })); addWire(busX - 40, clkY, busX, clkY);
    const clkYs = ffs.map(f => f.ff.y + 30); addWire(busX, clkY, busX, Math.min(...clkYs)); clkYs.forEach(y => addWire(busX, y, ffX, y));
    ffs.forEach(({ ff, oi }) => { const qy = ff.y + 10, vx = ffX + 60 + oi * 10, laneY = top - 80 - oi * 10, rx = railX(oi, false); addWire(ffX + 40, qy, vx, qy); addWire(vx, qy, vx, laneY); addWire(vx, laneY, rx, laneY); addWire(rx, laneY, rx, top - 40); });
  }
  mergeWires(); undoS.length = 0; redoS.length = 0; loadDoc(d); }

/* ---------------- .circ import ---------------- */
const OPP = { east: 'west', west: 'east', north: 'south', south: 'north' };
function importCirc(text, name) {
  const xml = new DOMParser().parseFromString(text, 'application/xml'); if (xml.querySelector('parsererror')) throw new Error('This .circ file could not be read.');
  const mainName = (xml.querySelector('main') || {}).getAttribute ? xml.querySelector('main').getAttribute('name') : null;
  const circuits = [...xml.querySelectorAll('circuit')]; const circ = circuits.find(c => c.getAttribute('name') === mainName) || circuits[0]; if (!circ) throw new Error('No circuit was found in this file.');
  const d = newDoc(name); const skipped = {};
  const pt = s => { const m = /\((-?\d+),\s*(-?\d+)\)/.exec(s || ''); return m ? [+m[1], +m[2]] : [0, 0]; };
  for (const w of circ.querySelectorAll(':scope > wire')) { const [x1, y1] = pt(w.getAttribute('from')), [x2, y2] = pt(w.getAttribute('to')); if (x1 === x2 || y1 === y2) d.wires.push({ x1, y1, x2, y2 }); }
  for (const c of circ.querySelectorAll(':scope > comp')) {
    const nm = c.getAttribute('name'); const [x, y] = pt(c.getAttribute('loc')); const A = {}; c.querySelectorAll('a').forEach(a => A[a.getAttribute('name')] = a.getAttribute('val') ?? a.textContent);
    const facing = A.facing || null; const width = +(A.width || 1); const label = A.label || '';
    let t = null, at = {}, f = 'east';
    const gateMap = { 'AND Gate': 'and', 'OR Gate': 'or', 'NAND Gate': 'nand', 'NOR Gate': 'nor', 'XOR Gate': 'xor', 'XNOR Gate': 'xnor', 'Odd Parity': 'xor', 'Even Parity': 'xnor' };
    if (nm === 'Pin') { const out = A.type === 'output' || A.output === 'true'; t = out ? 'outpin' : 'pin'; at = { width, label }; f = out ? OPP[facing || 'west'] : (facing || 'east'); }
    else if (nm === 'Constant') { t = 'constant'; at = { width, value: A.value || '0x1' }; f = facing || 'east'; }
    else if (nm === 'Power' || nm === 'Ground') { t = 'constant'; at = { width, value: nm === 'Power' ? '1' : '0' }; f = facing === 'north' || nm === 'Power' ? 'north' : 'south'; f = nm === 'Power' ? 'north' : 'south'; at.value = nm === 'Power' ? String(mask(width)) : '0'; }
    else if (nm === 'Clock') { t = 'clock'; at = { label }; f = facing || 'east'; }
    else if (nm === 'Tunnel') { t = 'tunnel'; at = { label, width }; f = OPP[facing || 'west']; }
    else if (nm === 'Probe') { t = 'probe'; at = { width, label }; f = OPP[facing || 'east']; }
    else if (nm === 'Button') { t = 'button'; at = { label }; f = facing || 'east'; }
    else if (nm === 'LED') { t = 'led'; at = { label }; f = OPP[facing || 'west']; }
    else if (gateMap[nm]) { t = gateMap[nm]; at = { inputs: +(A.inputs || 2), width, label }; f = facing || 'east'; }
    else if (nm === 'NOT Gate') { t = 'not'; at = { width, label }; f = facing || 'east'; }
    else if (nm === 'Buffer') { t = 'buffer'; at = { width, label }; f = facing || 'east'; }
    else if (nm === 'Controlled Buffer') { t = 'tristate'; at = { width, label }; f = facing || 'east'; }
    else if (nm === 'Multiplexer') { t = 'mux'; at = { select: +(A.select || 1), width, label }; f = facing || 'east'; }
    else if (nm === 'Demultiplexer') { t = 'demux'; at = { select: +(A.select || 1), width, label }; f = facing || 'east'; }
    else if (nm === 'Decoder') { t = 'decoder'; at = { select: +(A.select || 1), label }; f = facing || 'east'; }
    else if (nm === 'Priority Encoder') { t = 'encoder'; at = { select: +(A.select || 3), label }; f = facing || 'east'; }
    else if (nm === 'Adder') { t = 'adder'; at = { width: +(A.width || 8), label }; }
    else if (nm === 'Subtractor') { t = 'subtractor'; at = { width: +(A.width || 8), label }; }
    else if (nm === 'Comparator') { t = 'comparator'; at = { width: +(A.width || 8), label }; }
    else if (nm === 'D Flip-Flop') { t = 'dff'; at = { label }; }
    else if (nm === 'T Flip-Flop') { t = 'tff'; at = { label }; }
    else if (nm === 'J-K Flip-Flop') { t = 'jkff'; at = { label }; }
    else if (nm === 'S-R Flip-Flop') { t = 'srff'; at = { label }; }
    else if (nm === 'Register') { t = 'register'; at = { width: +(A.width || 8), label }; }
    else if (nm === 'Counter') { t = 'counter'; at = { width: +(A.width || 8), label }; }
    else if (nm === 'Hex Digit Display') { t = 'hexdisplay'; at = { label }; }
    else if (nm === '7-Segment Display') { t = 'sevenseg'; at = { label }; }
    else if (nm === 'Text') { t = 'text'; at = { text: A.text || '', size: 12 }; }
    else if (nm === 'Splitter') { t = 'splitter'; at = { width: +(A.incoming || A.fanout || 2) }; f = facing || 'east'; }
    if (!t) { skipped[nm] = (skipped[nm] || 0) + 1; continue; }
    const comp = mkComp(t, x, y, at, f); if (t === 'text') comp.y = y; d.comps.push(comp);
  }
  // connect pins that sit a little off the wire ends (small geometry differences between programs)
  const prevDoc = doc; doc = d;
  const ends = () => { const m = new Map(); d.wires.forEach(w => { [[w.x1, w.y1], [w.x2, w.y2]].forEach(([x, y]) => { const k = key(x, y); m.set(k, (m.get(k) || 0) + 1); }); }); d.comps.forEach(c => pinsOf(c).forEach(p => { const k = key(p.x, p.y); m.set(k, (m.get(k) || 0) + 1); })); return m; };
  let deg = ends(); let fixed = 0;
  for (const c of d.comps) for (const p of pinsOf(c)) { if (T[c.t].noPins) continue; const k = key(p.x, p.y); if ((deg.get(k) || 0) >= 2 || d.wires.some(w => onSeg(w, p.x, p.y))) continue;
    let best = null; for (const w of d.wires) for (const [ex, ey] of [[w.x1, w.y1], [w.x2, w.y2]]) { if ((deg.get(key(ex, ey)) || 0) !== 1) continue; const dd = Math.abs(ex - p.x) + Math.abs(ey - p.y); if (dd > 0 && dd <= 20 && (!best || dd < best.dd)) best = { ex, ey, dd }; }
    if (best) { addWire(best.ex, best.ey, p.x, p.y); fixed++; deg = ends(); } }
  mergeWires(); doc = prevDoc;
  return { d, skipped, fixed };
}

/* ---------------- files ---------------- */
function serialize() { return JSON.stringify({ format: 'CEsim-Logic', version: 1, name: doc.name, comps: doc.comps.map(c => ({ id: c.id, t: c.t, x: c.x, y: c.y, f: c.f, a: c.a, st: T[c.t].input ? { v: c.st.v || 0 } : {} })), wires: doc.wires }, null, 0); }
function loadDoc(d, path) { doc = d; mergeWires(); filePath = path || null; doc.comps.forEach(c => { c.a = Object.assign({}, T[c.t] ? T[c.t].attrs : {}, c.a); c.st = c.st || {}; }); doc.comps = doc.comps.filter(c => T[c.t]); undoS.length = 0; redoS.length = 0; sel.clear(); selW.clear(); netCache = null; refreshTimingList(); resetSim(); setName(doc.name); fit(); refreshPanel(); save(); }
function openText(name, text, path) {
  const base = name.replace(/\.[^.]+$/, '');
  try {
    if (/\.circ$/i.test(name) || /^\s*<\?xml|<project/.test(text)) { const r = importCirc(text, base); loadDoc(r.d, null); const sk = Object.entries(r.skipped).map(([k, v]) => v + '× ' + k); toast('Opened ' + name + (sk.length ? '. Not supported yet: ' + sk.join(', ') : '') + (r.fixed ? '. Connected ' + r.fixed + ' pin' + (r.fixed > 1 ? 's' : '') + ' that sat next to a wire end.' : ''), !!sk.length); return; }
    const o = JSON.parse(text); if (o.format !== 'CEsim-Logic') throw new Error('This is not a CEsim Logic file.'); o.name = o.name || base; loadDoc(o, path && /\.cedig$/i.test(path) ? path : null); toast('Opened ' + name);
  } catch (e) { toast('Could not open ' + name + ': ' + e.message, true); }
}
window.cesimOpenText = openText;
function openDialog() { $('#fileIn').click(); }
$('#fileIn').addEventListener('change', async e => { for (const f of e.target.files) openText(f.name, await f.text(), N && N.pathFor ? N.pathFor(f) : null); e.target.value = ''; });
async function saveFile(asNew) { const text = serialize(); const nm = (doc.name || 'circuit').replace(/[^\w.-]+/g, '_') + '.cedig';
  if (N && N.write && filePath && !asNew) { await N.write(filePath, text); toast('Saved ' + filePath.split(/[\\/]/).pop()); return; }
  if (N && N.save) { const r = await N.save(nm, text); if (r) { filePath = r; toast('Saved ' + r.split(/[\\/]/).pop()); } return; }
  download(nm, text, 'application/json'); }
function download(name, data, type) { const a = document.createElement('a'); a.href = typeof data === 'string' && data.startsWith('data:') ? data : URL.createObjectURL(new Blob([data], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
function exportImage(kind) {
  let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9; doc.comps.forEach(c => { const b = bboxOf(c); x1 = Math.min(x1, b[0]); y1 = Math.min(y1, b[1] - 18); x2 = Math.max(x2, b[2]); y2 = Math.max(y2, b[3]); }); doc.wires.forEach(w => { x1 = Math.min(x1, w.x1, w.x2); x2 = Math.max(x2, w.x1, w.x2); y1 = Math.min(y1, w.y1, w.y2); y2 = Math.max(y2, w.y1, w.y2); });
  if (x1 > x2) { toast('The sheet is empty.', true); return; } x1 -= 20; y1 -= 20; x2 += 20; y2 += 20; const W = x2 - x1, H = y2 - y1; const nm = (doc.name || 'circuit').replace(/[^\w.-]+/g, '_');
  if (kind === 'svg' && window.C2S) { const g = new C2S(W, H); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.translate(-x1, -y1); render(g, { plain: true }); download(nm + '.svg', g.getSerializedSvg(true), 'image/svg+xml'); return; }
  const sc = 2, c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.setTransform(sc, 0, 0, sc, -x1 * sc, -y1 * sc); render(g, { plain: true }); const url = c.toDataURL('image/png');
  if (N && N.saveBinary) N.saveBinary(nm + '.png', url.split(',')[1]); else download(nm + '.png', url);
}

/* ---------------- examples ---------------- */
const EXAMPLES = {
  'Half adder': () => { const d = newDoc('half_adder'); const c = (t, x, y, a, f) => { const k = mkComp(t, x, y, a, f); d.comps.push(k); return k; };
    c('pin', 100, 100, { label: 'A' }); c('pin', 100, 140, { label: 'B' }); c('xor', 270, 120); c('and', 270, 200); c('outpin', 330, 120, { label: 'S' }); c('outpin', 330, 200, { label: 'C' });
    d.wires.push({ x1: 100, y1: 100, x2: 210, y2: 100 }, { x1: 160, y1: 100, x2: 160, y2: 180 }, { x1: 160, y1: 180, x2: 220, y2: 180 }, { x1: 100, y1: 140, x2: 210, y2: 140 }, { x1: 140, y1: 140, x2: 140, y2: 220 }, { x1: 140, y1: 220, x2: 220, y2: 220 }, { x1: 270, y1: 120, x2: 330, y2: 120 }, { x1: 270, y1: 200, x2: 330, y2: 200 });
    return d; },
  'SR latch (NOR)': () => { const d = newDoc('sr_latch'); const c = (t, x, y, a, f) => { const k = mkComp(t, x, y, a, f); d.comps.push(k); return k; };
    c('pin', 100, 90, { label: 'R' }); c('pin', 100, 230, { label: 'S' }); c('nor', 250, 110); c('nor', 250, 210); c('outpin', 340, 110, { label: 'Q' }); c('outpin', 340, 210, { label: "Q'" });
    d.wires.push({ x1: 100, y1: 90, x2: 200, y2: 90 }, { x1: 100, y1: 230, x2: 200, y2: 230 }, { x1: 250, y1: 110, x2: 340, y2: 110 }, { x1: 250, y1: 210, x2: 340, y2: 210 }, { x1: 280, y1: 110, x2: 280, y2: 150 }, { x1: 280, y1: 150, x2: 180, y2: 150 }, { x1: 180, y1: 150, x2: 180, y2: 190 }, { x1: 180, y1: 190, x2: 200, y2: 190 }, { x1: 290, y1: 210, x2: 290, y2: 170 }, { x1: 290, y1: 170, x2: 170, y2: 170 }, { x1: 170, y1: 170, x2: 170, y2: 130 }, { x1: 170, y1: 130, x2: 200, y2: 130 });
    return d; },
  '4-bit counter with display': () => { const d = newDoc('counter_4bit'); const c = (t, x, y, a, f) => { const k = mkComp(t, x, y, a, f); d.comps.push(k); return k; };
    c('clock', 100, 220, { label: 'CLK' }); c('constant', 100, 200, { value: '1' }); c('counter', 160, 150, { width: 4, label: 'CTR' }); c('hexdisplay', 300, 260); c('outpin', 340, 180, { width: 4, label: 'Q' });
    d.wires.push({ x1: 100, y1: 220, x2: 160, y2: 220 }, { x1: 100, y1: 200, x2: 160, y2: 200 }, { x1: 220, y1: 180, x2: 300, y2: 180 }, { x1: 300, y1: 180, x2: 340, y2: 180 }, { x1: 300, y1: 180, x2: 300, y2: 260 });
    return d; },
  'Ripple counter (T flip-flops)': () => { const d = newDoc('ripple_counter'); const c = (t, x, y, a, f) => { const k = mkComp(t, x, y, a, f); d.comps.push(k); return k; };
    c('clock', 60, 200, { label: 'CLK' }); c('constant', 80, 140, { value: '1' });
    for (let i = 0; i < 3; i++) { const x = 140 + i * 120; c('tff', x, 170, { label: 'FF' + i }); d.wires.push({ x1: x, y1: 140, x2: x, y2: 180 }); if (i) { d.wires.push({ x1: x - 80, y1: 220, x2: x - 40, y2: 220 }, { x1: x - 40, y1: 220, x2: x - 40, y2: 200 }, { x1: x - 40, y1: 200, x2: x, y2: 200 }); } c('led', x + 70, 120, { label: 'Q' + i }); d.wires.push({ x1: x + 40, y1: 180, x2: x + 60, y2: 180 }, { x1: x + 60, y1: 180, x2: x + 60, y2: 120 }, { x1: x + 60, y1: 120, x2: x + 70, y2: 120 }); }
    d.wires.push({ x1: 80, y1: 140, x2: 380, y2: 140 }, { x1: 60, y1: 200, x2: 140, y2: 200 });
    return d; },
  '2-to-1 multiplexer': () => { const d = newDoc('mux2'); const c = (t, x, y, a, f) => { const k = mkComp(t, x, y, a, f); d.comps.push(k); return k; };
    c('pin', 100, 100, { label: 'D0' }); c('pin', 100, 140, { label: 'D1' }); c('pin', 160, 240, { label: 'S' }, 'north'); c('mux', 250, 120); c('outpin', 320, 120, { label: 'Y' });
    d.wires.push({ x1: 100, y1: 100, x2: 200, y2: 100 }, { x1: 200, y1: 100, x2: 200, y2: 110 }, { x1: 200, y1: 110, x2: 220, y2: 110 }, { x1: 100, y1: 140, x2: 200, y2: 140 }, { x1: 200, y1: 140, x2: 200, y2: 130 }, { x1: 200, y1: 130, x2: 220, y2: 130 }, { x1: 160, y1: 240, x2: 160, y2: 160 }, { x1: 160, y1: 160, x2: 230, y2: 160 }, { x1: 230, y1: 160, x2: 230, y2: 140 }, { x1: 250, y1: 120, x2: 320, y2: 120 });
    return d; }
};

/* ---------------- menus, UI glue ---------------- */
function toast(m, warn) { const t = document.createElement('div'); t.className = 'toast' + (warn ? ' warn' : ''); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), warn ? 6500 : 3200); }
function copyText(t, ok) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(ok)).catch(() => { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); document.execCommand('copy'); x.remove(); toast(ok); }); }
function modal(title, html) { const o = document.createElement('div'); o.className = 'ov'; o.innerHTML = `<div class="mdl" role="dialog" aria-label="${esc(title)}"><div class="mh"><b>${esc(title)}</b><button class="btn" aria-label="Close">×</button></div><div class="mb">${html}</div></div>`; document.body.appendChild(o); const close = () => o.remove(); o.querySelector('.mh .btn').onclick = close; o.addEventListener('pointerdown', e => { if (e.target === o) close(); }); o.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }); return o; }
function closeMenus() { document.querySelectorAll('.menu').forEach(m => m.remove()); }
function menu(btn, items) { closeMenus(); const r = btn.getBoundingClientRect(); const m = document.createElement('div'); m.className = 'menu'; m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : `<button data-i="${i}">${esc(it[0])}<span>${esc(it[1] || '')}</span></button>`).join(''); m.style.left = r.left + 'px'; m.style.top = r.bottom + 4 + 'px'; document.body.appendChild(m); m.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; closeMenus(); items[+b.dataset.i][2](); }; setTimeout(() => document.addEventListener('pointerdown', function h(e) { if (!e.target.closest('.menu')) { closeMenus(); document.removeEventListener('pointerdown', h); } }), 0); }
function setName(n) { doc.name = n; $('#docname').textContent = n; document.title = n + ' — CEsim Logic'; }
$('#docname').addEventListener('click', () => { const n = prompt('Name', doc.name); if (n) { setName(n.trim()); save(); } });
const on = (s, f) => { const e = $(s); if (e) e.addEventListener('click', f); };
on('#bFile', e => menu(e.currentTarget, [['New', 'Ctrl+N', () => { if (doc.comps.length && !confirm('Start a new circuit? The current one is not saved to a file.')) return; loadDoc(newDoc('Untitled')); }], ['Open…', 'Ctrl+O', openDialog], ['Save', 'Ctrl+S', () => saveFile(false)], ['Save as…', 'Ctrl+Shift+S', () => saveFile(true)], '-', ['Export PNG image', '', () => exportImage('png')], ['Export SVG drawing', '', () => exportImage('svg')], '-'].concat(Object.keys(EXAMPLES).map(k => ['Example: ' + k, '', () => { loadDoc(EXAMPLES[k]()); }]))));
on('#bUndo', undo); on('#bRedo', redo); on('#bDel', deleteSel); on('#bRot', rotateSel);
on('#bZin', () => { const r = cv.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.2); }); on('#bZout', () => { const r = cv.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.2); }); on('#bFit', fit);
on('#bRun', () => setRunning(!running)); on('#bStep', clockStep); on('#bReset', () => { setRunning(false); resetSim(); toast('Simulation reset.'); });
$('#speed').addEventListener('change', () => { if (running) setRunning(true); });
on('#bTT', showTruthTable);
on('#bTiming', () => { const t = $('#timing'); t.hidden = !t.hidden; $('#bTiming').classList.toggle('on', !t.hidden); requestAnimationFrame(() => { resize(); drawTiming(); }); });
on('#tClear', () => { trace.length = 0; record(); });
on('#bBool', () => { if (N && N.openTool) N.openTool('bool'); else window.open('bool.html', '_blank'); });

/* ---------------- autosave and start ---------------- */
let saveT = null; function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem('cesim.logic.doc', serialize()); } catch (e) { } }, 300); }
function start() {
  resize(); buildLibrary(); refreshPanel();
  let h = null; try { h = JSON.parse(localStorage.getItem('cesim.handoff.logic') || 'null'); localStorage.removeItem('cesim.handoff.logic'); } catch (e) { }
  if (h && h.kind === 'sop') { buildFromSop(h); toast('Circuit built from Boolean tools.'); }
  else if (/blank/.test(location.search)) loadDoc(newDoc('Untitled'));
  else { let s = null; try { s = localStorage.getItem('cesim.logic.doc'); } catch (e) { } if (s) { try { const o = JSON.parse(s); loadDoc(o); } catch (e) { loadDoc(EXAMPLES['Half adder']()); } } else loadDoc(EXAMPLES['Half adder']()); }
  requestAnimationFrame(frame);
}
window.CEL = { get doc() { return doc; }, T, nets, vals: () => vals, propagate, clockStep, resetSim, truthTable, importCirc, openText, loadDoc, buildFromSop, serialize, pinsOf, EXAMPLES, fit, settle, mergeWires, setRunning, get view() { return view; } };
start();
