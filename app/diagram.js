/* CEsim Diagram — editor */
(function () {
'use strict';
const S = window.CED_SHAPES, CATS = window.CED_CATS;
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const FONT = 'IBM Plex Sans, -apple-system, Segoe UI, Arial, sans-serif';
const uid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toast = (m, err) => { const d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), err ? 5000 : 2600); };
const DEF_ST = { fill: '#ffffff', stroke: '#1f3a5f', sw: 1.5, dash: '', op: 1, fc: '#1b2230', fs: 13, bold: 0, italic: 0, underline: 0, align: 'center', valign: 'middle', radius: 10, shadow: 0 };
const DEF_EST = { stroke: '#1f3a5f', sw: 1.5, dash: '', arrowS: 'none', arrowE: 'arrow', route: 'ortho', fc: '#1b2230', fs: 12, rounded: 1 };

/* ---------------- state ---------------- */
let doc = newDoc(); let P = doc.pages[0];
let view = { x: 80, y: 60, z: 1 };
let sel = new Set(); let undoS = [], redoS = []; let clip = null;
let tool = 'select'; let showGrid = true; let snapOn = true; let GRID = 10;
function newDoc(name) { return { format: 'CEsimDiagram', version: 1, name: name || 'Untitled diagram', pages: [{ id: uid(), name: 'Page-1', items: [], bg: '#ffffff' }], cur: 0 }; }
const items = () => P.items;
const byId = id => P.items.find(i => i.id === id);
const shapes = () => P.items.filter(i => i.k === 'shape');
const edges = () => P.items.filter(i => i.k === 'edge');
function snapshot() { return JSON.stringify(doc); }
function pushUndo() { undoS.push(snapshot()); if (undoS.length > 120) undoS.shift(); redoS = []; markDirty(); }
function restore(s) { doc = JSON.parse(s); P = doc.pages[doc.cur] || doc.pages[0]; sel = new Set([...sel].filter(id => byId(id))); renderAll(); }
function undo() { if (!undoS.length) return; redoS.push(snapshot()); restore(undoS.pop()); }
function redo() { if (!redoS.length) return; undoS.push(snapshot()); restore(redoS.pop()); }
let saveT = 0; function markDirty() { document.title = '• ' + doc.name + ' — CEsim Diagram'; clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem('cesimdiag.autosave', snapshot()) } catch (e) { } }, 800); }

/* ---------------- geometry helpers ---------------- */
function mkShape(t, x, y, extra = {}) {
  const d = S[t] || S.rect;
  const o = { id: uid(), k: 'shape', t, x, y, w: d.w, h: d.h, rot: 0, text: extra.text != null ? extra.text : (d.textOnly ? 'Text' : d.classText ? (t === 'interface' ? '«interface»\nName\n--\n+ method()' : 'ClassName\n--\n- field: int\n--\n+ method(): void') : d.key === 'digital' ? '0110 1001' : d.key === 'clockwave' ? '8' : d.key === 'buswave' ? 'A|B|C|D' : ''), st: Object.assign({}, DEF_ST, d.textOnly ? { fill: 'none', stroke: 'none' } : {}, d.st || {}, extra.st || {}) };
  if (d.valign) o.st.valign = d.valign;
  if (extra.w) o.w = extra.w; if (extra.h) o.h = extra.h;
  return o;
}
function center(s) { return { x: s.x + s.w / 2, y: s.y + s.h / 2 }; }
function rotPt(px, py, cx, cy, deg) { if (!deg) return { x: px, y: py }; const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); const dx = px - cx, dy = py - cy; return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c }; }
function ports(s) {
  const d = S[s.t] || S.rect; const list = d.ports || (d.labelBelow && s.text ? [[0.5, 0, 'N'], [1, 0.5, 'E'], [0.5, (s.h + 30) / s.h, 'S'], [0, 0.5, 'W']] : [[0.5, 0, 'N'], [1, 0.5, 'E'], [0.5, 1, 'S'], [0, 0.5, 'W']]);
  const c = center(s); const dirs = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  return list.map(([fx, fy, side]) => { const p = rotPt(s.x + fx * s.w, s.y + fy * s.h, c.x, c.y, s.rot); let [dx, dy] = dirs[side]; if (s.rot) { const q = rotPt(dx, dy, 0, 0, s.rot); dx = Math.round(q.x); dy = Math.round(q.y) } return { x: p.x, y: p.y, dx, dy }; });
}
function endPoint(end, other) {
  if (end.id) { const s = byId(end.id); if (!s) return { x: end.x || 0, y: end.y || 0, dx: 0, dy: 0 }; const ps = ports(s); if (end.p != null && ps[end.p]) return ps[end.p];
    // auto: best default port toward the other point
    const o = other; let best = ps[0], bd = 1e18; const c = center(s);
    const dps = (S[s.t].ports ? ps : ps);
    for (const q of dps) { const d = (q.x - o.x) ** 2 + (q.y - o.y) ** 2 - 0.3 * ((q.x - c.x) * (o.x - c.x) + (q.y - c.y) * (o.y - c.y)) / 1; if (d < bd) { bd = d; best = q } }
    return best; }
  return { x: end.x, y: end.y, dx: 0, dy: 0 };
}
function anchorOf(end) { if (end.id) { const s = byId(end.id); if (s) return center(s); } return { x: end.x, y: end.y }; }
function orthoRoute(a, b) {
  const g = 18; const a1 = { x: a.x + a.dx * g, y: a.y + a.dy * g }, b1 = { x: b.x + b.dx * g, y: b.y + b.dy * g };
  const pts = [{ x: a.x, y: a.y }, a1];
  const aH = a.dx !== 0, bH = b.dx !== 0;
  if (aH && bH) { if (a.dx === b.dx) { const mx = a.dx > 0 ? Math.max(a1.x, b1.x) : Math.min(a1.x, b1.x); pts.push({ x: mx, y: a1.y }, { x: mx, y: b1.y }); } else if ((b1.x - a1.x) * a.dx < 0) { const my = (a1.y + b1.y) / 2; pts.push({ x: a1.x, y: my }, { x: b1.x, y: my }); } else { const mx = (a1.x + b1.x) / 2; pts.push({ x: mx, y: a1.y }, { x: mx, y: b1.y }); } }
  else if (!aH && !bH) { if (a.dy === b.dy) { const my = a.dy > 0 ? Math.max(a1.y, b1.y) : Math.min(a1.y, b1.y); pts.push({ x: a1.x, y: my }, { x: b1.x, y: my }); } else if ((b1.y - a1.y) * a.dy < 0) { const mx = (a1.x + b1.x) / 2; pts.push({ x: mx, y: a1.y }, { x: mx, y: b1.y }); } else { const my = (a1.y + b1.y) / 2; pts.push({ x: a1.x, y: my }, { x: b1.x, y: my }); } }
  else if (aH && !bH) pts.push({ x: b1.x, y: a1.y });
  else pts.push({ x: a1.x, y: b1.y });
  pts.push(b1, { x: b.x, y: b.y });
  const out = []; for (const q of pts) { const l = out[out.length - 1]; if (l && Math.abs(l.x - q.x) < .01 && Math.abs(l.y - q.y) < .01) continue; out.push(q); }
  for (let i = 1; i < out.length - 1;) { const p0 = out[i - 1], p1 = out[i], p2 = out[i + 1]; if ((Math.abs(p0.x - p1.x) < .01 && Math.abs(p1.x - p2.x) < .01) || (Math.abs(p0.y - p1.y) < .01 && Math.abs(p1.y - p2.y) < .01)) out.splice(i, 1); else i++; }
  return out;
}
const NOBST = new Set(['container', 'composite', 'heading', 'text', 'table3', 'sticky', 'siglabel', 'divider', 'lifeline', 'pipereg']);
function segHits(p, q, r) { const x1 = r.x + 2, x2 = r.x + r.w - 2, y1 = r.y + 2, y2 = r.y + r.h - 2; if (Math.abs(p.y - q.y) < .01) { if (p.y <= y1 || p.y >= y2) return false; return Math.max(p.x, q.x) > x1 && Math.min(p.x, q.x) < x2; } if (Math.abs(p.x - q.x) < .01) { if (p.x <= x1 || p.x >= x2) return false; return Math.max(p.y, q.y) > y1 && Math.min(p.y, q.y) < y2; } return false; }
function routeCost(pts, obst, a, b, other) { let L = 0, hits = 0; for (let i = 1; i < pts.length; i++) { L += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y); for (const r of obst) if (segHits(pts[i - 1], pts[i], r)) hits++; } let pen = 0; const face = (P1, Q) => (Q.x - P1.x) * P1.dx + (Q.y - P1.y) * P1.dy; if (face(a, b) < -5) pen += 80; if (face(b, a) < -5) pen += 80; return L + (pts.length - 2) * 22 + hits * 600 + pen; }
let routeCache = null, PU = null;
function edgePoints(e) {
  if (routeCache && routeCache.has(e.id)) return routeCache.get(e.id);
  const r = edgePointsRaw(e); if (routeCache) routeCache.set(e.id, r); return r;
}
function edgePointsRaw(e) {
  const sS = e.s.id && byId(e.s.id), sE = e.e.id && byId(e.e.id);
  const free = (end, otherC) => ({ x: end.x, y: end.y, dx: 0, dy: 0 });
  const fixDir = (P1, Q) => { if (P1.dx || P1.dy) return P1; const dx = Q.x - P1.x, dy = Q.y - P1.y; return Math.abs(dx) > Math.abs(dy) ? { ...P1, dx: Math.sign(dx) || 1, dy: 0 } : { ...P1, dx: 0, dy: Math.sign(dy) || 1 }; };
  const cA = sS ? (e.s.p != null && ports(sS)[e.s.p] ? [ports(sS)[e.s.p]] : ports(sS)) : [free(e.s)];
  const cB = sE ? (e.e.p != null && ports(sE)[e.e.p] ? [ports(sE)[e.e.p]] : ports(sE)) : [free(e.e)];
  if (e.st.route !== 'ortho') { let best = null, bd = 1e18; for (const a of cA) for (const b of cB) { const d = Math.hypot(a.x - b.x, a.y - b.y) - (cA.length > 1 || cB.length > 1 ? 0.2 * (((b.x - a.x) * a.dx + (b.y - a.y) * a.dy) - ((b.x - a.x) * b.dx + (b.y - a.y) * b.dy)) : 0); if (d < bd) { bd = d; best = [fixDir(a, b), fixDir(b, a)] } } return best; }
  const obst = shapes().filter(s => !NOBST.has(s.t) && !s.rot).map(s => S[s.t] && S[s.t].labelBelow && s.text ? { x: Math.min(s.x, s.x + s.w / 2 - 45), y: s.y, w: Math.max(s.w, 90), h: s.h + 28 } : s);
  let best = null, bc = 1e18;
  let bi = null;
  for (let i = 0; i < cA.length; i++) for (let j = 0; j < cB.length; j++) { const a0 = cA[i], b0 = cB[j]; const a = fixDir(a0, b0), b = fixDir(b0, a0); const pts = orthoRoute(a, b); let c = routeCost(pts, obst, a, b); if (PU) { if (sS && cA.length > 1) c += 90 * (PU.get(sS.id + ':' + i) || 0); if (sE && cB.length > 1) c += 90 * (PU.get(sE.id + ':' + j) || 0); } if (c < bc) { bc = c; best = pts; bi = [i, j]; } }
  if (PU && bi) { if (sS && cA.length > 1) PU.set(sS.id + ':' + bi[0], (PU.get(sS.id + ':' + bi[0]) || 0) + 1); if (sE && cB.length > 1) PU.set(sE.id + ':' + bi[1], (PU.get(sE.id + ':' + bi[1]) || 0) + 1); }
  return best;
}
function edgePath(e, pts) {
  if (e.st.route === 'curve') { const [a, b] = pts; const k = Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) * 0.4); const c1 = { x: a.x + (a.dx || 0) * k, y: a.y + (a.dy || 0) * k }, c2 = { x: b.x + (b.dx || 0) * k, y: b.y + (b.dy || 0) * k }; return `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`; }
  if (e.st.route === 'ortho' && e.st.rounded && pts.length > 2) { let d = `M${pts[0].x},${pts[0].y}`; for (let i = 1; i < pts.length - 1; i++) { const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1]; const r = Math.min(6, Math.hypot(p1.x - p0.x, p1.y - p0.y) / 2, Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2); const u1 = { x: p1.x - Math.sign(p1.x - p0.x) * r, y: p1.y - Math.sign(p1.y - p0.y) * r }, u2 = { x: p1.x + Math.sign(p2.x - p1.x) * r, y: p1.y + Math.sign(p2.y - p1.y) * r }; d += ` L${u1.x},${u1.y} Q${p1.x},${p1.y} ${u2.x},${u2.y}`; } const l = pts[pts.length - 1]; return d + ` L${l.x},${l.y}`; }
  return 'M' + pts.map(p => p.x + ',' + p.y).join(' L');
}
function polyMid(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); let t = L / 2; for (let i = 1; i < pts.length; i++) { const s = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (t <= s) { const f = s ? t / s : 0; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f }; } t -= s; } return pts[0]; }

/* ---------------- text layout ---------------- */
const mctx = document.createElement('canvas').getContext('2d');
function wrapText(text, maxW, fs, bold, italic) {
  mctx.font = `${italic ? 'italic ' : ''}${bold ? '600' : '400'} ${fs}px ${FONT}`;
  const out = [];
  for (const para of String(text).split('\n')) { if (!para) { out.push(''); continue; } const words = para.split(/(\s+)/); let line = ''; for (const w of words) { const t = line + w; if (mctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = w.trimStart(); } else line = t; } out.push(line); }
  return out;
}
function textSvg(str, box, st, opts = {}) {
  if (str == null || str === '') return '';
  const [bx, by, bw, bh] = box; const fs = +st.fs || 13; const lh = fs * 1.28;
  const lines = wrapText(str, Math.max(10, bw - 4), fs, st.bold, st.italic);
  const total = lines.length * lh;
  let y0 = st.valign === 'top' ? by + fs : st.valign === 'bottom' ? by + bh - total + fs * .95 : by + (bh - total) / 2 + fs * .95;
  const anchor = st.align === 'left' ? 'start' : st.align === 'right' ? 'end' : 'middle';
  const x = st.align === 'left' ? bx + 2 : st.align === 'right' ? bx + bw - 2 : bx + bw / 2;
  const deco = st.underline ? ' text-decoration="underline"' : '';
  return `<text x="${x}" font-family="${FONT}" font-size="${fs}" font-weight="${st.bold ? 600 : 400}" ${st.italic ? 'font-style="italic"' : ''} fill="${st.fc}" text-anchor="${anchor}"${deco} ${opts.bg ? `paint-order="stroke" stroke="${opts.bg}" stroke-width="4" stroke-linejoin="round"` : 'stroke="none"'}>${lines.map((l, i) => `<tspan x="${x}" y="${(y0 + i * lh).toFixed(1)}">${esc(l) || ' '}</tspan>`).join('')}</text>`;
}
function classTextSvg(s) {
  const parts = String(s.text || '').split(/\n-{2,}\n/); const st = s.st; const fs = +st.fs || 13; const lh = fs * 1.35; const h1 = Math.max(26, lh + 8);
  let out = textSvg(parts[0] || '', [0, 0, s.w, h1], Object.assign({}, st, { bold: 1, valign: 'middle', align: 'center' }));
  const n2 = (parts[1] || '').split('\n').length; const h2 = Math.max(18, n2 * lh + 8);
  if (parts[1] != null) out += textSvg(parts[1], [6, h1 + 2, s.w - 12, h2], Object.assign({}, st, { valign: 'top', align: 'left', bold: 0 }));
  if (parts[2] != null) out += textSvg(parts[2], [6, h1 + h2 + 2, s.w - 12, s.h - h1 - h2], Object.assign({}, st, { valign: 'top', align: 'left', bold: 0 }));
  return out;
}

/* ---------------- SVG rendering ---------------- */
const svg = $('#canvas'); const vp = $('#vp'); const layerItems = $('#items'); const layerUI = $('#ui');
const MARKERS = { arrow: 'M0,0 L10,5 L0,10 Z', open: 'M0,0 L10,5 L0,10', diamond: 'M0,5 L5,0 L10,5 L5,10 Z', odiamond: 'M0,5 L5,0 L10,5 L5,10 Z', circle: 'C', ocircle: 'C', bar: 'B', triangle: 'M0,0 L10,5 L0,10 Z' };
function markerDefs(colors) {
  let s = '';
  for (const col of colors) for (const k of Object.keys(MARKERS)) for (const end of ['s', 'e']) {
    const id = `m-${k}-${end}-${col.replace('#', '')}`; const filled = !['open', 'odiamond', 'ocircle', 'triangle'].includes(k);
    const body = MARKERS[k] === 'C' ? `<circle cx="5" cy="5" r="4"/>` : MARKERS[k] === 'B' ? `<path d="M5,0 L5,10"/>` : `<path d="${MARKERS[k]}"/>`;
    s += `<marker id="${id}" viewBox="-1 -1 12 12" refX="${k === 'arrow' || k === 'open' || k === 'triangle' ? 9 : 10}" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="${end === 's' ? 'auto-start-reverse' : 'auto'}"><g fill="${filled ? col : '#ffffff'}" stroke="${col}" stroke-width="1.4" stroke-linejoin="round">${body}</g></marker>`;
  }
  return s;
}
function shapeSvg(s, forExport) {
  const d = S[s.t] || S.rect; const st = s.st;
  let body = '';
  if (s.t === 'image') body = `<image href="${s.img}" x="0" y="0" width="${s.w}" height="${s.h}" preserveAspectRatio="none"/>`;
  else if (s.t === 'free') body = `<path d="${freePath(s)}" fill="none"/>`;
  else body = d.draw(s.w, s.h, s);
  const dash = st.dash ? `stroke-dasharray="${st.dash}"` : '';
  const shadow = st.shadow ? `filter="url(#shadow)"` : '';
  let txt = '';
  if (!d.notext && s.t !== 'image') { if (d.classText) txt = classTextSvg(s); else { const box = d.tb ? d.tb(s.w, s.h) : [4, 3, s.w - 8, s.h - 6]; txt = textSvg(s.text, box, st, { bg: d.labelBelow ? null : null }); } }
  if (d.grid && s.cells) { const [cols, rows] = d.grid; txt = ''; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const v = (s.cells[r] || [])[c]; if (v) txt += textSvg(v, [c * s.w / cols, r * s.h / rows, s.w / cols, s.h / rows], Object.assign({}, st, { bold: r === 0 ? 1 : st.bold })) } }
  const tr = `translate(${s.x},${s.y})` + (s.rot ? ` rotate(${s.rot},${s.w / 2},${s.h / 2})` : '');
  return `<g ${forExport ? '' : `data-id="${s.id}"`} transform="${tr}" opacity="${st.op}"><g fill="${st.fill}" stroke="${st.stroke}" stroke-width="${st.sw}" ${dash} color="${st.stroke === 'none' ? st.fc : st.stroke}" stroke-linejoin="round" ${shadow}>${body}</g>${txt}${forExport ? '' : `<rect x="0" y="0" width="${s.w}" height="${s.h}" fill="transparent" stroke="none" class="hit"/>`}</g>`;
}
function edgeSvg(e, forExport) {
  const pts = edgePoints(e); const d = edgePath(e, pts); const col = e.st.stroke;
  const ms = e.st.arrowS && e.st.arrowS !== 'none' ? `marker-start="url(#m-${e.st.arrowS}-s-${col.replace('#', '')})"` : '';
  const me = e.st.arrowE && e.st.arrowE !== 'none' ? `marker-end="url(#m-${e.st.arrowE}-e-${col.replace('#', '')})"` : '';
  let lab = '';
  if (e.text) { const m = e.st.route === 'curve' ? (() => { const a = pts[0], b = pts[1]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } })() : polyMid(pts); const st = Object.assign({}, DEF_ST, { fs: e.st.fs || 12, fc: e.st.fc || '#1b2230', align: 'center', valign: 'middle' }); lab = textSvg(e.text, [m.x - 80, m.y - 30, 160, 60], st, { bg: P.bg || '#ffffff' }); }
  return `<g ${forExport ? '' : `data-id="${e.id}"`}>${forExport ? '' : `<path d="${d}" fill="none" stroke="transparent" stroke-width="12" class="hit"/>`}<path d="${d}" fill="none" stroke="${col}" stroke-width="${e.st.sw}" ${e.st.dash ? `stroke-dasharray="${e.st.dash}"` : ''} ${ms} ${me} stroke-linejoin="round"/>${lab}</g>`;
}
function freePath(s) { const pts = s.pts || []; if (!pts.length) return ''; return 'M' + pts.map(([fx, fy]) => (fx * s.w).toFixed(1) + ',' + (fy * s.h).toFixed(1)).join(' L'); }
function renderItems() {
  routeCache = new Map(); PU = new Map();
  const cols = new Set(edges().map(e => e.st.stroke)); cols.add('#1f3a5f');
  $('#defs').innerHTML = markerDefs(cols) + `<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="2" dy="3" stdDeviation="2.5" flood-opacity="0.22"/></filter>`;
  layerItems.innerHTML = P.items.map(i => i.k === 'shape' ? shapeSvg(i) : edgeSvg(i)).join('');
}
function applyView() {
  setTimeout(() => { updateFab(); drawMinimap(); }, 0); vp.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.z})`); const g = GRID * view.z; const wrap = $('#cwrap'); wrap.style.backgroundSize = showGrid ? `${g}px ${g}px, ${g * 5}px ${g * 5}px` : '0 0'; wrap.style.backgroundPosition = `${view.x}px ${view.y}px`; wrap.style.backgroundColor = P.bg || '#ffffff'; $('#zoomv').textContent = Math.round(view.z * 100) + '%'; renderUI(); }
let guides = [];
function renderUI() {
  setTimeout(() => { updateFab(); drawMinimap(); }, 0);
  let s = ''; const z = view.z; const hs = 7 / z;
  const sels = [...sel].map(byId).filter(Boolean);
  for (const it of sels) {
    if (it.k === 'shape') {
      const c = center(it);
      s += `<g transform="rotate(${it.rot || 0},${c.x},${c.y})"><rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="none" stroke="#1a8cff" stroke-width="${1.2 / z}" stroke-dasharray="${4 / z} ${3 / z}"/>`;
      if (sels.length === 1 && !it.locked) {
        const H = { nw: [0, 0], n: [.5, 0], ne: [1, 0], e: [1, .5], se: [1, 1], s: [.5, 1], sw: [0, 1], w: [0, .5] };
        for (const k in H) { const [fx, fy] = H[k]; s += `<rect data-h="${k}" x="${it.x + fx * it.w - hs / 2}" y="${it.y + fy * it.h - hs / 2}" width="${hs}" height="${hs}" fill="#fff" stroke="#1a8cff" stroke-width="${1.2 / z}" class="hdl"/>`; }
        s += `<line x1="${c.x}" y1="${it.y}" x2="${c.x}" y2="${it.y - 22 / z}" stroke="#1a8cff" stroke-width="${1 / z}"/><circle data-h="rot" cx="${c.x}" cy="${it.y - 22 / z}" r="${5 / z}" fill="#fff" stroke="#1a8cff" stroke-width="${1.2 / z}" class="hdl rot"/>`;
      }
      s += '</g>';
      if (sels.length === 1 && tool === 'select') { // quick clone-and-connect arrows
        const off = 26 / z, a = 7 / z; const dirs = [['E', it.x + it.w + off, c.y, 0], ['S', c.x, it.y + it.h + off, 90], ['W', it.x - off, c.y, 180], ['N', c.x, it.y - off - (14 / z), 270]];
        for (const [dname, x, y, ang] of dirs) s += `<path data-qc="${dname}" transform="translate(${x},${y}) rotate(${ang})" d="M${-a},${-a * .8} L${a},0 L${-a},${a * .8} Z" fill="#1a8cff" fill-opacity="0.35" stroke="#1a8cff" stroke-width="${1 / z}" class="qc"/>`;
      }
    } else if (it.k === 'edge') {
      const pts = edgePoints(it); const a = pts[0], b = pts[pts.length - 1];
      s += `<path d="${edgePath(it, pts)}" fill="none" stroke="#1a8cff" stroke-width="${(it.st.sw + 3) / z}" stroke-opacity="0.25"/>`;
      s += `<circle data-eh="s" cx="${a.x}" cy="${a.y}" r="${5 / z}" fill="${it.s.id ? '#1a8cff' : '#fff'}" stroke="#1a8cff" stroke-width="${1.5 / z}" class="hdl"/><circle data-eh="e" cx="${b.x}" cy="${b.y}" r="${5 / z}" fill="${it.e.id ? '#1a8cff' : '#fff'}" stroke="#1a8cff" stroke-width="${1.5 / z}" class="hdl"/>`;
    }
  }
  // port dots on hover target or when connecting
  const showPorts = hoverShape && (tool === 'select' || tool === 'connect' || drag?.type === 'edgeEnd' || drag?.type === 'newEdge');
  if (showPorts) { const sh = byId(hoverShape); if (sh) ports(sh).forEach((p, i) => { s += `<circle data-port="${sh.id}:${i}" cx="${p.x}" cy="${p.y}" r="${4.5 / z}" fill="#fff" stroke="#1a8cff" stroke-width="${1.5 / z}" class="port"/>`; }); }
  for (const g of guides) s += g.v ? `<line x1="${g.v}" y1="${g.a}" x2="${g.v}" y2="${g.b}" stroke="#ff3d7f" stroke-width="${1 / z}"/>` : `<line x1="${g.a}" y1="${g.h}" x2="${g.b}" y2="${g.h}" stroke="#ff3d7f" stroke-width="${1 / z}"/>`;
  if (drag && drag.type === 'marquee') { const r = normRect(drag.x0, drag.y0, drag.x1, drag.y1); s += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#1a8cff" fill-opacity="0.08" stroke="#1a8cff" stroke-width="${1 / z}"/>`; }
  if (drag && (drag.type === 'newEdge')) { const a = drag.from; s += `<path d="M${a.x},${a.y} L${drag.x1},${drag.y1}" stroke="#1a8cff" stroke-width="${1.5 / z}" stroke-dasharray="${5 / z} ${4 / z}" fill="none"/>`; }
  if (drag && drag.type === 'pen' && drag.pts.length > 1) s += `<path d="M${drag.pts.map(p => p.x + ',' + p.y).join(' L')}" fill="none" stroke="#1f3a5f" stroke-width="${2 / z}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (drag && drag.type === 'create') { const r = normRect(drag.x0, drag.y0, drag.x1, drag.y1); s += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="#1a8cff" stroke-dasharray="${4 / z}" stroke-width="${1 / z}"/>`; }
  layerUI.innerHTML = s;
}
function updateFab() {
  const fab = $('#fab'); const its = [...sel].map(byId).filter(Boolean);
  if (its.length !== 1 || its[0].k !== 'shape' || drag || editing || tool !== 'select') { fab.style.display = 'none'; $('#fabc').style.display = 'none'; return; }
  const it = its[0]; const r = svg.getBoundingClientRect(); const x = r.left + view.x + (it.x + it.w / 2) * view.z, y = r.top + view.y + it.y * view.z - 54;
  fab.style.display = 'flex'; fab.style.left = Math.max(r.left + 6, Math.min(r.right - fab.offsetWidth - 6, x - fab.offsetWidth / 2)) + 'px'; fab.style.top = Math.max(r.top + 6, y) + 'px';
}
function drawMinimap() {
  const mm = $('#mini'); if (!mm || mm.style.display === 'none') return; const g = mm.getContext('2d'); const W = mm.width, H = mm.height; g.clearRect(0, 0, W, H);
  const r = svg.getBoundingClientRect(); const vw = { x: -view.x / view.z, y: -view.y / view.z, w: r.width / view.z, h: r.height / view.z };
  const its = shapes(); const b = bboxOf(its.concat([vw])); const pad = 20; const k = Math.min((W - 8) / (b.w + 2 * pad), (H - 8) / (b.h + 2 * pad)); const ox = 4 - (b.x - pad) * k, oy = 4 - (b.y - pad) * k;
  g.fillStyle = '#f7f9fc'; g.fillRect(0, 0, W, H);
  for (const s2 of its) { g.fillStyle = s2.st.fill && s2.st.fill !== 'none' && s2.st.fill !== '#ffffff' ? s2.st.fill : '#cfd8e4'; g.fillRect(ox + s2.x * k, oy + s2.y * k, Math.max(2, s2.w * k), Math.max(2, s2.h * k)); }
  g.strokeStyle = '#1a8cff'; g.lineWidth = 1.5; g.strokeRect(ox + vw.x * k, oy + vw.y * k, vw.w * k, vw.h * k);
  mm._map = { k, ox, oy };
}
function normRect(x0, y0, x1, y1) { return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }; }
function renderAll() { renderItems(); applyView(); refreshPanel(); renderPages(); }

/* ---------------- coordinates ---------------- */
function toWorld(ev) { const r = svg.getBoundingClientRect(); return { x: (ev.clientX - r.left - view.x) / view.z, y: (ev.clientY - r.top - view.y) / view.z }; }
const snapV = v => snapOn ? Math.round(v / GRID) * GRID : v;

/* ---------------- interaction ---------------- */
let drag = null; let hoverShape = null; let spaceDown = false;
function itemFromTarget(t) { const g = t.closest && t.closest('[data-id]'); return g ? byId(g.dataset.id) : null; }
svg.addEventListener('pointerdown', ev => {
  closePopups(); svg.setPointerCapture(ev.pointerId); const w = toWorld(ev); const t = ev.target;
  if (ev.button === 1 || ev.button === 2 || spaceDown || tool === 'hand') { drag = { type: 'pan', sx: ev.clientX, sy: ev.clientY, vx: view.x, vy: view.y, btn: ev.button, target: t }; return; }
  if (editing) commitEdit();
  if (t.dataset.qc) { quickConnect(t.dataset.qc); return; }
  if (t.dataset.h) { const it = byId([...sel][0]); drag = { type: t.dataset.h === 'rot' ? 'rotate' : 'resize', h: t.dataset.h, it, orig: { ...it }, snap: snapshot(), start: w }; return; }
  if (t.dataset.eh) { const it = byId([...sel][0]); drag = { type: 'edgeEnd', end: t.dataset.eh, it, snap: snapshot() }; return; }
  if (t.dataset.port) { const [id, pi] = t.dataset.port.split(':'); const s = byId(id); const p = ports(s)[+pi]; drag = { type: 'newEdge', src: { id, p: +pi }, from: p, x1: w.x, y1: w.y }; return; }
  if (tool === 'pen') { drag = { type: 'pen', pts: [w] }; return; }
  if (tool === 'text') { pushUndo(); const s = mkShape('text', snapV(w.x) - 60, snapV(w.y) - 15); P.items.push(s); sel = new Set([s.id]); renderAll(); startEdit(s); setTool('select'); return; }
  if (tool.startsWith('create:')) { drag = { type: 'create', t: tool.slice(7), x0: snapV(w.x), y0: snapV(w.y), x1: snapV(w.x), y1: snapV(w.y) }; return; }
  if (tool === 'connect') { const it = itemFromTarget(t); if (it && it.k === 'shape') { drag = { type: 'newEdge', src: { id: it.id }, from: center(it), x1: w.x, y1: w.y }; return; } }
  const it = itemFromTarget(t);
  if (it) {
    let ids = [it.id]; if (it.group) ids = P.items.filter(x => x.group === it.group).map(x => x.id);
    if (ev.shiftKey || ev.metaKey || ev.ctrlKey) { const has = sel.has(it.id); ids.forEach(i => has ? sel.delete(i) : sel.add(i)); renderUI(); refreshPanel(); return; }
    if (!sel.has(it.id)) { sel = new Set(ids); }
    if (it.locked) { renderUI(); refreshPanel(); return; }
    const movers = [...sel].map(byId).filter(x => x && x.k === 'shape' && !x.locked);
    const freeEdges = [...sel].map(byId).filter(x => x && x.k === 'edge');
    drag = { type: 'move', start: w, movers: movers.map(m => ({ m, x: m.x, y: m.y })), edges: freeEdges.map(e => ({ e, s: { ...e.s }, ee: { ...e.e } })), snap: snapshot(), moved: false };
    renderUI(); refreshPanel(); return;
  }
  if (!ev.shiftKey) sel.clear();
  drag = { type: 'marquee', x0: w.x, y0: w.y, x1: w.x, y1: w.y }; renderUI(); refreshPanel();
});
svg.addEventListener('pointermove', ev => {
  const w = toWorld(ev);
  if (!drag) { const it = itemFromTarget(ev.target); const portEl = ev.target.dataset && ev.target.dataset.port; const nh = portEl ? portEl.split(':')[0] : (it && it.k === 'shape' ? it.id : null); if (nh !== hoverShape) { hoverShape = nh; renderUI(); } return; }
  if (drag.type === 'pan') { view.x = drag.vx + ev.clientX - drag.sx; view.y = drag.vy + ev.clientY - drag.sy; applyView(); return; }
  if (drag.type === 'marquee' || drag.type === 'create') { drag.x1 = drag.type === 'create' ? snapV(w.x) : w.x; drag.y1 = drag.type === 'create' ? snapV(w.y) : w.y; renderUI(); return; }
  if (drag.type === 'pen') { const l = drag.pts[drag.pts.length - 1]; if (Math.hypot(l.x - w.x, l.y - w.y) > 2 / view.z) drag.pts.push(w); renderUI(); return; }
  if (drag.type === 'move') {
    let dx = w.x - drag.start.x, dy = w.y - drag.start.y; if (!drag.moved && Math.hypot(dx, dy) * view.z < 3) return; drag.moved = true;
    // smart guides against other shapes
    guides = [];
    if (drag.movers.length) {
      const b0 = bboxOf(drag.movers.map(m => ({ x: m.x, y: m.y, w: m.m.w, h: m.m.h })));
      let nx = b0.x + dx, ny = b0.y + dy; if (snapOn) { nx = Math.round(nx / GRID) * GRID; ny = Math.round(ny / GRID) * GRID; }
      const others = shapes().filter(s => !sel.has(s.id)); const tol = 6 / view.z; let bestX = null, bestY = null;
      const xs = [[nx, 0], [nx + b0.w / 2, b0.w / 2], [nx + b0.w, b0.w]], ys = [[ny, 0], [ny + b0.h / 2, b0.h / 2], [ny + b0.h, b0.h]];
      for (const o of others) { for (const ox of [o.x, o.x + o.w / 2, o.x + o.w]) for (const [vx, off] of xs) if (Math.abs(ox - (b0.x + dx + off)) < tol && (!bestX || Math.abs(ox - (b0.x + dx + off)) < bestX.d)) bestX = { d: Math.abs(ox - (b0.x + dx + off)), x: ox - off, g: ox, o }; for (const oy of [o.y, o.y + o.h / 2, o.y + o.h]) for (const [vy, off] of ys) if (Math.abs(oy - (b0.y + dy + off)) < tol && (!bestY || Math.abs(oy - (b0.y + dy + off)) < bestY.d)) bestY = { d: Math.abs(oy - (b0.y + dy + off)), y: oy - off, g: oy, o }; }
      if (bestX) { nx = bestX.x; guides.push({ v: bestX.g, a: Math.min(bestX.o.y, ny) - 10, b: Math.max(bestX.o.y + bestX.o.h, ny + b0.h) + 10 }); }
      if (bestY) { ny = bestY.y; guides.push({ h: bestY.g, a: Math.min(bestY.o.x, nx) - 10, b: Math.max(bestY.o.x + bestY.o.w, nx + b0.w) + 10 }); }
      dx = nx - b0.x; dy = ny - b0.y;
    }
    drag.movers.forEach(({ m, x, y }) => { m.x = x + dx; m.y = y + dy; });
    drag.edges.forEach(({ e, s, ee }) => { if (!e.s.id) { e.s.x = s.x + dx; e.s.y = s.y + dy } if (!e.e.id) { e.e.x = ee.x + dx; e.e.y = ee.y + dy } });
    renderItems(); renderUI(); refreshPanel(true); return;
  }
  if (drag.type === 'resize') {
    const it = drag.it, o = drag.orig; const h = drag.h; const c = center(o);
    const lp = rotPt(w.x, w.y, c.x, c.y, -(o.rot || 0)); let x1 = o.x, y1 = o.y, x2 = o.x + o.w, y2 = o.y + o.h;
    if (h.includes('w')) x1 = snapV(lp.x); if (h.includes('e')) x2 = snapV(lp.x); if (h.includes('n')) y1 = snapV(lp.y); if (h.includes('s')) y2 = snapV(lp.y);
    if (ev.shiftKey && h.length === 2) { const ar = o.w / o.h; const nw = x2 - x1, nh = y2 - y1; if (Math.abs(nw / ar) > Math.abs(nh)) { const th = nw / ar; if (h.includes('n')) y1 = y2 - th; else y2 = y1 + th } else { const tw = nh * ar; if (h.includes('w')) x1 = x2 - tw; else x2 = x1 + tw } }
    it.x = Math.min(x1, x2); it.y = Math.min(y1, y2); it.w = Math.max(4, Math.abs(x2 - x1)); it.h = Math.max(4, Math.abs(y2 - y1));
    renderItems(); renderUI(); refreshPanel(true); return;
  }
  if (drag.type === 'rotate') { const it = drag.it; const c = center(it); let a = Math.atan2(w.y - c.y, w.x - c.x) * 180 / Math.PI + 90; if (!ev.altKey) a = Math.round(a / 15) * 15; it.rot = ((a % 360) + 360) % 360; renderItems(); renderUI(); refreshPanel(true); return; }
  if (drag.type === 'edgeEnd' || drag.type === 'newEdge') {
    drag.x1 = w.x; drag.y1 = w.y; const tg = under(ev);
    const portEl = tg.dataset && tg.dataset.port; let it = itemFromTarget(tg); if (it && drag.type === 'edgeEnd' && it.id === drag.it.id) it = null; if (!it || it.k !== 'shape') { const hs = shapes().slice().reverse().find(s2 => insideShape(s2, w, 4)); if (hs) it = hs; }
    hoverShape = portEl ? portEl.split(':')[0] : (it && it.k === 'shape' ? it.id : hoverShape && byId(hoverShape) && insideShape(byId(hoverShape), w, 20) ? hoverShape : null);
    if (drag.type === 'edgeEnd') { const e = drag.it; const tgt = portEl ? { id: portEl.split(':')[0], p: +portEl.split(':')[1] } : (it && it.k === 'shape' ? { id: it.id } : { x: w.x, y: w.y }); e[drag.end] = tgt; renderItems(); }
    renderUI(); return;
  }
});
function under(ev) { return document.elementFromPoint(ev.clientX, ev.clientY) || ev.target; }
function insideShape(s, w, pad = 0) { return w.x >= s.x - pad && w.x <= s.x + s.w + pad && w.y >= s.y - pad && w.y <= s.y + s.h + pad; }
svg.addEventListener('pointerup', ev => {
  if (!drag) return; const w = toWorld(ev); const d = drag; drag = null; guides = [];
  if (d.type === 'marquee') { const r = normRect(d.x0, d.y0, d.x1, d.y1); if (r.w > 2 || r.h > 2) for (const s of P.items) { if (s.k === 'shape' && s.x >= r.x && s.y >= r.y && s.x + s.w <= r.x + r.w && s.y + s.h <= r.y + r.h) sel.add(s.id); if (s.k === 'edge') { const pts = edgePoints(s); if (pts.every(p => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)) sel.add(s.id); } } renderUI(); refreshPanel(); return; }
  if (d.type === 'move') { if (d.moved) { undoS.push(d.snap); redoS = []; markDirty(); } renderUI(); return; }
  if (d.type === 'resize' || d.type === 'rotate' || d.type === 'edgeEnd') { undoS.push(d.snap); redoS = []; markDirty(); renderAll(); return; }
  if (d.type === 'create') { const r = normRect(d.x0, d.y0, d.x1, d.y1); pushUndo(); const s = mkShape(d.t, r.w > 8 ? r.x : snapV(d.x0 - S[d.t].w / 2), r.h > 8 ? r.y : snapV(d.y0 - S[d.t].h / 2)); if (r.w > 8 && r.h > 8) { s.w = r.w; s.h = r.h; } P.items.push(s); sel = new Set([s.id]); setTool('select'); renderAll(); return; }
  if (d.type === 'newEdge') {
    const tg = under(ev); const portEl = tg.dataset && tg.dataset.port; let it = itemFromTarget(tg); if (!it || it.k !== 'shape') { const hs = shapes().slice().reverse().find(s2 => insideShape(s2, w, 4)); if (hs) it = hs; }
    let tgt = portEl ? { id: portEl.split(':')[0], p: +portEl.split(':')[1] } : (it && it.k === 'shape' ? { id: it.id } : null);
    if (!tgt && hoverShape && byId(hoverShape) && insideShape(byId(hoverShape), w, 20)) tgt = { id: hoverShape };
    if (tgt && tgt.id === d.src.id && tgt.p === d.src.p) { renderUI(); return; }
    if (!tgt) { if (Math.hypot(w.x - d.from.x, w.y - d.from.y) < 10) { renderUI(); return; } tgt = { x: snapV(w.x), y: snapV(w.y) }; }
    pushUndo(); const e = { id: uid(), k: 'edge', s: d.src, e: tgt, text: '', st: Object.assign({}, DEF_EST, lastEdgeStyle) }; P.items.push(e); sel = new Set([e.id]); renderAll(); return;
  }
  if (d.type === 'pen') { finishPen(d.pts); return; }
  if (d.type === 'pan') { if (d.btn === 2 && Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) < 4) openCtx(ev, d.target); return; }
});
function openCtx(ev, target) {
  const it = target ? itemFromTarget(target) : null; if (it && !sel.has(it.id)) { sel = new Set([it.id]); renderUI(); refreshPanel(); }
  const m = $('#ctxm'); const has = sel.size > 0; const w = toWorld(ev);
  const items = has ? [['Edit text', 'Enter', () => startEdit(byId([...sel][0]))], ['Duplicate', 'Ctrl+D', () => { copySel(); pasteClip(20) }], ['Copy', 'Ctrl+C', copySel], ['Cut', 'Ctrl+X', () => { copySel(); deleteSel() }], '-', ['Copy style', 'Ctrl+Alt+C', copyStyle], ['Paste style', 'Ctrl+Alt+V', pasteStyle], '-', ['Bring to front', '', () => zorder('front')], ['Send to back', '', () => zorder('back')], ['Group', 'Ctrl+G', group], ['Ungroup', 'Ctrl+Shift+G', ungroup], ['Lock / unlock', '', () => { pushUndo(); [...sel].map(byId).forEach(i => { if (i) i.locked = !i.locked }); renderAll(); }], '-', ['Export selection…', '', () => { lastExp.a = 'sel'; openExport(); }], ['Delete', 'Del', deleteSel]]
    : [['Paste', 'Ctrl+V', () => pasteClip()], ['Add text here', '', () => { pushUndo(); const s2 = mkShape('text', snapV(w.x) - 60, snapV(w.y) - 15); P.items.push(s2); sel = new Set([s2.id]); renderAll(); startEdit(s2); }], ['Select all', 'Ctrl+A', () => { sel = new Set(P.items.map(i => i.id)); renderUI(); refreshPanel(); }], '-', ['Text → Diagram…', '', openDSL], ['Auto layout ↓', '', () => $('#bLayoutTB').click()], ['Fit to screen', 'F', fit], ['Export…', 'Ctrl+E', openExport]];
  m.innerHTML = items.map((x, i) => x === '-' ? '<div class="sepm"></div>' : `<button data-i="${i}">${x[0]}<span>${x[1]}</span></button>`).join('');
  m.style.display = 'flex'; m.style.left = Math.min(ev.clientX, innerWidth - 230) + 'px'; m.style.top = Math.min(ev.clientY, innerHeight - m.offsetHeight - 10) + 'px';
  m.onclick = e2 => { const b = e2.target.closest('[data-i]'); if (!b) return; m.style.display = 'none'; items[+b.dataset.i][2](); };
}
document.addEventListener('pointerdown', e => { if (!e.target.closest('#ctxm')) $('#ctxm').style.display = 'none'; }, true);
svg.addEventListener('dblclick', ev => { const it = itemFromTarget(under(ev)); if (it) { startEdit(it); return; } const w = toWorld(ev); pushUndo(); const s = mkShape('text', snapV(w.x) - 60, snapV(w.y) - 15); P.items.push(s); sel = new Set([s.id]); renderAll(); startEdit(s); });
svg.addEventListener('wheel', ev => { ev.preventDefault(); if (ev.ctrlKey || ev.metaKey || !ev.shiftKey && Math.abs(ev.deltaX) < 1 && !ev.altKey && ev.deltaMode === 0 && Math.abs(ev.deltaY) < 40 && false) { } if (ev.ctrlKey || ev.metaKey) { zoomAt(Math.exp(-ev.deltaY * 0.01), ev); } else { view.x -= ev.deltaX; view.y -= ev.deltaY; applyView(); } }, { passive: false });
svg.addEventListener('contextmenu', ev => ev.preventDefault());
function zoomAt(f, ev) { const r = svg.getBoundingClientRect(); const cx = ev ? ev.clientX - r.left : r.width / 2, cy = ev ? ev.clientY - r.top : r.height / 2; const z0 = view.z, z = clamp(z0 * f, 0.1, 5); view.x = cx - (cx - view.x) * z / z0; view.y = cy - (cy - view.y) * z / z0; view.z = z; applyView(); }
function fit() { const b = bboxOf(shapes().concat(edges().flatMap(e => edgePoints(e).map(p => ({ x: p.x, y: p.y, w: 0, h: 0 }))))); const r = svg.getBoundingClientRect(); if (!b.w && !b.h) { view = { x: 80, y: 60, z: 1 }; applyView(); return; } const z = clamp(Math.min((r.width - 80) / b.w, (r.height - 80) / b.h), 0.15, 2); view.z = z; view.x = r.width / 2 - (b.x + b.w / 2) * z; view.y = r.height / 2 - (b.y + b.h / 2) * z; applyView(); }
function bboxOf(list) { if (!list.length) return { x: 0, y: 0, w: 0, h: 0 }; let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9; for (const s of list) { x1 = Math.min(x1, s.x); y1 = Math.min(y1, s.y); x2 = Math.max(x2, s.x + (s.w || 0)); y2 = Math.max(y2, s.y + (s.h || 0)); } return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; }

/* quick clone & connect */
let lastEdgeStyle = {};
function quickConnect(dir) { const s = byId([...sel][0]); if (!s) return; pushUndo(); const gap = 60; const n = JSON.parse(JSON.stringify(s)); n.id = uid(); n.text = ''; delete n.group; if (dir === 'E') n.x = s.x + s.w + gap; if (dir === 'W') n.x = s.x - s.w - gap; if (dir === 'S') n.y = s.y + s.h + gap; if (dir === 'N') n.y = s.y - s.h - gap; P.items.push(n); const e = { id: uid(), k: 'edge', s: { id: s.id }, e: { id: n.id }, text: '', st: Object.assign({}, DEF_EST, lastEdgeStyle) }; P.items.push(e); sel = new Set([n.id]); renderAll(); startEdit(n); }

/* ---------------- freehand pen with shape recognition ---------------- */
function rdp(pts, eps) { if (pts.length < 3) return pts; let dmax = 0, idx = 0; const a = pts[0], b = pts[pts.length - 1]; for (let i = 1; i < pts.length - 1; i++) { const p = pts[i]; const d = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x) / (Math.hypot(b.y - a.y, b.x - a.x) || 1); if (d > dmax) { dmax = d; idx = i } } if (dmax > eps) { const l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps); return l.slice(0, -1).concat(r); } return [a, b]; }
function finishPen(pts) {
  if (pts.length < 3) return; const b = bboxOf(pts.map(p => ({ x: p.x, y: p.y, w: 0, h: 0 }))); const diag = Math.hypot(b.w, b.h);
  const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < diag * 0.2;
  pushUndo(); let s = null;
  if ($('#recog').checked) {
    if (!closed) { const simp = rdp(pts, diag * 0.08); if (simp.length <= 2 || (diag > 30 && simp.length <= 3 && Math.abs(Math.atan2(simp[1].y - simp[0].y, simp[1].x - simp[0].x) - Math.atan2(simp[simp.length - 1].y - simp[simp.length - 2].y, simp[simp.length - 1].x - simp[simp.length - 2].x)) < .35)) { const a = pts[0], z = pts[pts.length - 1]; const e = { id: uid(), k: 'edge', s: { x: Math.round(a.x), y: Math.round(a.y) }, e: { x: Math.round(z.x), y: Math.round(z.y) }, text: '', st: Object.assign({}, DEF_EST, { route: 'straight' }) }; P.items.push(e); sel = new Set([e.id]); renderAll(); return; } }
    else { const simp = rdp(pts.concat([pts[0]]), diag * 0.1); const n = simp.length - 1; let area = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p.x * q.y - q.x * p.y; } area = Math.abs(area / 2); const fillRatio = area / (b.w * b.h || 1);
      let t = null; if (n === 3) t = 'triangle'; else if (n === 4 || n === 5) { const midHit = simp.slice(0, 4).every(p => Math.abs(p.x - (b.x + b.w / 2)) < b.w * .2 || Math.abs(p.y - (b.y + b.h / 2)) < b.h * .2); t = midHit && fillRatio < .65 ? 'diamond' : 'rect'; } else if (fillRatio > .62 && fillRatio < .9) t = 'ellipse'; else if (fillRatio >= .9) t = 'rect';
      if (t) { s = mkShape(t, snapV(b.x), snapV(b.y)); s.w = Math.max(20, snapV(b.w)); s.h = Math.max(20, snapV(b.h)); } }
  }
  if (!s) { s = mkShape('rect', b.x, b.y); s.t = 'free'; s.w = Math.max(4, b.w); s.h = Math.max(4, b.h); s.pts = pts.map(p => [(p.x - b.x) / (b.w || 1), (p.y - b.y) / (b.h || 1)]); s.st.fill = 'none'; s.st.sw = 2; }
  P.items.push(s); sel = new Set([s.id]); renderAll();
}

/* ---------------- text editing ---------------- */
let editing = null;
function startEdit(it) {
  if (it.k === 'shape' && S[it.t] && S[it.t].notext && !S[it.t].hint) { return; }
  editing = it; const ta = $('#editor'); const r = svg.getBoundingClientRect();
  let box;
  if (it.k === 'shape') { const d = S[it.t] || S.rect; const tb = d.tb ? d.tb(it.w, it.h) : [0, 0, it.w, it.h]; box = { x: it.x + tb[0], y: it.y + tb[1], w: Math.max(tb[2], 80), h: Math.max(tb[3], 28) }; if (d.notext || d.classText) box = { x: it.x, y: it.y, w: Math.max(it.w, 140), h: Math.max(it.h, 60) }; }
  else { const m = polyMid(edgePoints(it)); box = { x: m.x - 80, y: m.y - 16, w: 160, h: 32 }; }
  ta.style.left = (r.left + view.x + box.x * view.z) + 'px'; ta.style.top = (r.top + view.y + box.y * view.z) + 'px'; ta.style.width = (box.w * view.z) + 'px'; ta.style.height = (box.h * view.z) + 'px';
  ta.style.fontSize = ((it.st.fs || 13) * view.z) + 'px'; ta.style.textAlign = it.st.align || 'center'; ta.style.fontWeight = it.st.bold ? 600 : 400;
  ta.value = it.k === 'shape' && it.t === 'table3' ? (it.cells || [[], [], []]).map(r => (r || []).join(' | ')).join('\n') : it.text || '';
  ta.placeholder = it.k === 'shape' && S[it.t].hint ? S[it.t].hint : it.t === 'table3' ? 'Cells: a | b | c (one row per line)' : '';
  ta.style.display = 'block'; ta.focus(); ta.select(); ta.dataset.snap = snapshot();
}
function commitEdit() { const ta = $('#editor'); if (!editing) return; const it = byId(editing.id); if (it) { const v = ta.value; if (it.t === 'table3') { const cells = v.split('\n').map(r => r.split('|').map(c => c.trim())); if (JSON.stringify(cells) !== JSON.stringify(it.cells)) { undoS.push(ta.dataset.snap); it.cells = cells; } } else if (v !== it.text) { undoS.push(ta.dataset.snap); it.text = v; } } editing = null; ta.style.display = 'none'; markDirty(); renderAll(); }
$('#editor').addEventListener('keydown', ev => { if (ev.key === 'Escape') { editing = null; $('#editor').style.display = 'none'; } if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) commitEdit(); ev.stopPropagation(); });
$('#editor').addEventListener('blur', () => commitEdit());

/* ---------------- keyboard ---------------- */
window.addEventListener('keydown', ev => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const k = ev.key.toLowerCase(), ctrl = ev.ctrlKey || ev.metaKey;
  if (k === ' ') { spaceDown = true; svg.style.cursor = 'grab'; ev.preventDefault(); return; }
  if (ctrl && k === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); return; }
  if (ctrl && k === 'y') { ev.preventDefault(); redo(); return; }
  if (ctrl && k === 'c') { copySel(); return; } if (ctrl && k === 'x') { copySel(); deleteSel(); return; } if (ctrl && k === 'v') { pasteClip(); return; }
  if (ctrl && ev.altKey && k === 'c') { ev.preventDefault(); copyStyle(); return; } if (ctrl && ev.altKey && k === 'v') { ev.preventDefault(); pasteStyle(); return; }
  if (ctrl && k === 'd') { ev.preventDefault(); copySel(); pasteClip(20); return; }
  if (ctrl && k === 'e') { ev.preventDefault(); openExport(); return; }
  if (ctrl && k === 'f') { ev.preventDefault(); openFind(); return; }
  if (k === 'f1' || (k === '?' )) { ev.preventDefault(); $('#helpd').style.display = 'block'; return; }
  if (k === 'tab' && sel.size === 1 && byId([...sel][0])?.k === 'shape') { ev.preventDefault(); quickConnect(ev.shiftKey ? 'S' : 'E'); return; }
  if (ctrl && ev.shiftKey && k === 's') { ev.preventDefault(); saveFile(true); return; }
  if (ctrl && k === 'a') { ev.preventDefault(); sel = new Set(P.items.map(i => i.id)); renderUI(); refreshPanel(); return; }
  if (ctrl && k === 'g') { ev.preventDefault(); ev.shiftKey ? ungroup() : group(); return; }
  if (ctrl && k === 's') { ev.preventDefault(); saveFile(); return; }
  if (ctrl && k === 'o') { ev.preventDefault(); $('#fileIn').click(); return; }
  if (ctrl && (k === '=' || k === '+')) { ev.preventDefault(); zoomAt(1.2); return; } if (ctrl && k === '-') { ev.preventDefault(); zoomAt(1 / 1.2); return; } if (ctrl && k === '0') { ev.preventDefault(); view = { x: 80, y: 60, z: 1 }; applyView(); return; }
  if (ctrl && k === ']') { ev.preventDefault(); zorder(ev.shiftKey ? 'front' : 'up'); return; } if (ctrl && k === '[') { ev.preventDefault(); zorder(ev.shiftKey ? 'back' : 'down'); return; }
  if (k === 'delete' || k === 'backspace') { ev.preventDefault(); deleteSel(); return; }
  if (k === 'escape') { sel.clear(); setTool('select'); closePopups(); renderUI(); refreshPanel(); return; }
  if (k === 'f2' || (k === 'enter' && sel.size === 1)) { ev.preventDefault(); startEdit(byId([...sel][0])); return; }
  if (!ctrl && k === 'v') setTool('select'); if (!ctrl && k === 'h') setTool('hand'); if (!ctrl && k === 't') setTool('text'); if (!ctrl && k === 'p') setTool('pen'); if (!ctrl && k === 'c') setTool('connect'); if (!ctrl && k === 'f') fit();
  if (k.startsWith('arrow') && sel.size) { ev.preventDefault(); pushUndo(); const st = ev.shiftKey ? GRID : 1; const dx = k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, dy = k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0; [...sel].map(byId).forEach(i => { if (i && i.k === 'shape') { i.x += dx; i.y += dy } }); renderItems(); renderUI(); refreshPanel(true); }
});
window.addEventListener('keyup', ev => { if (ev.key === ' ') { spaceDown = false; svg.style.cursor = ''; } });

/* ---------------- edit operations ---------------- */
function deleteSel() { if (!sel.size) return; pushUndo(); const del = new Set(sel); P.items = P.items.filter(i => !del.has(i.id) && !(i.k === 'edge' && ((i.s.id && del.has(i.s.id)) || (i.e.id && del.has(i.e.id))))); sel.clear(); renderAll(); }
function copySel() { const ids = new Set(sel); const its = P.items.filter(i => ids.has(i.id) || (i.k === 'edge' && i.s.id && i.e.id && ids.has(i.s.id) && ids.has(i.e.id))); if (!its.length) return; clip = JSON.parse(JSON.stringify(its)); }
function pasteClip(off = 30) { if (!clip) return; pushUndo(); const map = {}; const out = clip.map(i => { const n = JSON.parse(JSON.stringify(i)); map[i.id] = n.id = uid(); return n; }); const gmap = {}; out.forEach(n => { if (n.group) { gmap[n.group] = gmap[n.group] || uid(); n.group = gmap[n.group]; } if (n.k === 'shape') { n.x += off; n.y += off; } else { if (n.s.id) n.s.id = map[n.s.id] || n.s.id; else { n.s.x += off; n.s.y += off } if (n.e.id) n.e.id = map[n.e.id] || n.e.id; else { n.e.x += off; n.e.y += off } } }); P.items.push(...out); sel = new Set(out.map(o => o.id)); clip = JSON.parse(JSON.stringify(out)); renderAll(); }
function group() { const its = [...sel].map(byId).filter(Boolean); if (its.length < 2) return; pushUndo(); const g = uid(); its.forEach(i => i.group = g); renderAll(); }
function ungroup() { pushUndo(); [...sel].map(byId).forEach(i => { if (i) delete i.group }); renderAll(); }
function zorder(how) { const ids = new Set(sel); if (!ids.size) return; pushUndo(); const s = P.items.filter(i => ids.has(i.id)), o = P.items.filter(i => !ids.has(i.id)); if (how === 'front') P.items = o.concat(s); else if (how === 'back') P.items = s.concat(o); else { const arr = P.items; if (how === 'up') for (let i = arr.length - 2; i >= 0; i--) { if (ids.has(arr[i].id) && !ids.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; } else for (let i = 1; i < arr.length; i++) { if (ids.has(arr[i].id) && !ids.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; } } renderAll(); }
function align(how) { const its = [...sel].map(byId).filter(i => i && i.k === 'shape'); if (its.length < 2) return; pushUndo(); const b = bboxOf(its); its.forEach(i => { if (how === 'left') i.x = b.x; if (how === 'right') i.x = b.x + b.w - i.w; if (how === 'center') i.x = b.x + b.w / 2 - i.w / 2; if (how === 'top') i.y = b.y; if (how === 'bottom') i.y = b.y + b.h - i.h; if (how === 'middle') i.y = b.y + b.h / 2 - i.h / 2; }); renderAll(); }
function distribute(axis) { const its = [...sel].map(byId).filter(i => i && i.k === 'shape'); if (its.length < 3) return; pushUndo(); const key = axis === 'h' ? 'x' : 'y', dim = axis === 'h' ? 'w' : 'h'; its.sort((a, b) => a[key] - b[key]); const total = its.reduce((s, i) => s + i[dim], 0); const span = its[its.length - 1][key] + its[its.length - 1][dim] - its[0][key]; const gap = (span - total) / (its.length - 1); let p = its[0][key]; its.forEach(i => { i[key] = p; p += i[dim] + gap; }); renderAll(); }
function sameSize() { const its = [...sel].map(byId).filter(i => i && i.k === 'shape'); if (its.length < 2) return; pushUndo(); const f = its[0]; its.forEach(i => { i.w = f.w; i.h = f.h }); renderAll(); }

/* ---------------- auto layout (layered) ---------------- */
function autoLayout(dir = 'TB', subset) {
  const nodes = (subset || shapes()).filter(s => !['container', 'composite', 'heading', 'divider', 'sticky'].includes(s.t)); if (!nodes.length) return; const ids = new Set(nodes.map(n => n.id));
  const E = edges().filter(e => e.s.id && e.e.id && ids.has(e.s.id) && ids.has(e.e.id) && e.s.id !== e.e.id).map(e => [e.s.id, e.e.id]);
  const out = {}, inn = {}; nodes.forEach(n => { out[n.id] = []; inn[n.id] = [] });
  // break cycles with DFS
  const state = {}; const acyclic = []; const order = nodes.map(n => n.id);
  const adj = {}; nodes.forEach(n => adj[n.id] = []); E.forEach(([a, b]) => adj[a].push(b));
  const back = new Set(); const visit = u => { state[u] = 1; for (const v of adj[u]) { if (state[v] === 1) back.add(u + '>' + v); else if (!state[v]) visit(v); } state[u] = 2; };
  order.forEach(u => { if (!state[u]) visit(u) });
  E.forEach(([a, b]) => { if (back.has(a + '>' + b)) { out[b].push(a); inn[a].push(b) } else { out[a].push(b); inn[b].push(a) } });
  const rank = {}; const topo = []; const indeg = {}; nodes.forEach(n => indeg[n.id] = inn[n.id].length); const q = order.filter(u => !indeg[u]); while (q.length) { const u = q.shift(); topo.push(u); for (const v of out[u]) if (--indeg[v] === 0) q.push(v); }
  order.forEach(u => { if (!topo.includes(u)) topo.push(u) });
  topo.forEach(u => { rank[u] = inn[u].length ? Math.max(...inn[u].map(p => (rank[p] ?? 0) + 1)) : 0; });
  const layers = []; topo.forEach(u => { (layers[rank[u]] = layers[rank[u]] || []).push(u) });
  for (let it = 0; it < 6; it++) { const down = it % 2 === 0; const seq = down ? layers.map((l, i) => i).slice(1) : layers.map((l, i) => i).reverse().slice(1); for (const li of seq) { const ref = layers[down ? li - 1 : li + 1]; if (!ref) continue; const pos = {}; ref.forEach((u, i) => pos[u] = i); const bc = u => { const nb = (down ? inn[u] : out[u]).filter(v => pos[v] != null); return nb.length ? nb.reduce((s, v) => s + pos[v], 0) / nb.length : layers[li].indexOf(u); }; layers[li].sort((a, b) => bc(a) - bc(b)); } }
  const H = dir === 'LR' || dir === 'RL'; const gapR = H ? 90 : 70, gapN = H ? 40 : 50;
  const hh = s => s.h + (S[s.t] && S[s.t].labelBelow && s.text ? 30 : 0); const ww = s => Math.max(s.w, S[s.t] && S[s.t].labelBelow && s.text ? 90 : 0);
  const sizeR = l => Math.max(...l.map(u => H ? ww(byId(u)) : hh(byId(u)))); let offR = 0;
  const b0 = bboxOf(nodes);
  layers.forEach((l, li) => { const sr = sizeR(l); const total = l.reduce((s, u) => s + (H ? hh(byId(u)) : ww(byId(u))), 0) + gapN * (l.length - 1); let p = -total / 2; l.forEach(u => { const s = byId(u); if (H) { s.x = b0.x + offR + (sr - s.w) / 2; s.y = b0.y + 200 + p; p += hh(s) + gapN; } else { s.y = b0.y + offR + (sr - hh(s)) / 2; s.x = b0.x + 300 + p + (ww(s) - s.w) / 2; p += ww(s) + gapN; } }); offR += sr + gapR; });
  if (dir === 'BT' || dir === 'RL') { const bb = bboxOf(nodes); nodes.forEach(s => { if (dir === 'BT') s.y = bb.y + bb.h - (s.y - bb.y) - s.h; else s.x = bb.x + bb.w - (s.x - bb.x) - s.w; }); }
  nodes.forEach(s => { s.x = Math.round(s.x / GRID) * GRID; s.y = Math.round(s.y / GRID) * GRID; });
  // reset auto ports so routes follow the new layout
  edges().forEach(e => { if (e.s.id && !S[byId(e.s.id)?.t]?.ports) delete e.s.p; if (e.e.id && !S[byId(e.e.id)?.t]?.ports) delete e.e.p; });
}

/* ---------------- text to diagram ---------------- */
const BR = [[/^\(\[(.*)\]\)$/, 'terminator'], [/^\[\[(.*)\]\]$/, 'predefined'], [/^\[\((.*)\)\]$/, 'database'], [/^\(\((.*)\)\)$/, 'circle'], [/^\{\{(.*)\}\}$/, 'hexagon'], [/^\[\/(.*)\/\]$/, 'io'], [/^\[\\(.*)\\\]$/, 'io'], [/^\[(.*)\]$/, 'process'], [/^\((.*)\)$/, 'round'], [/^\{(.*)\}$/, 'decision'], [/^>(.*)\]$/, 'offpage']];
function parseDSL(src) {
  const lines = src.split(/\r?\n/).map(l => l.replace(/%%.*$/, '').trim()).filter(Boolean);
  let dir = 'TB', mode = 'flow'; const nodes = new Map(); const E = [];
  const nodeRe = /^(\[\*\]|[A-Za-z_؀-ۿ][\w؀-ۿ-]*)(?::([a-z0-9]+))?(\(\[.*?\]\)|\[\[.*?\]\]|\[\(.*?\)\]|\(\(.*?\)\)|\{\{.*?\}\}|\[\/.*?\/\]|\[\\.*?\\\]|\[.*?\]|\(.*?\)|\{.*?\}|>.*?\])?/;
  const edgeRe = /^\s*(?:(-->|---|-\.->|-\.-|==>|===|->|--o|--x|<-->)\s*(?:\|([^|]*)\|)?|--\s+([^-][^>]*?)\s+-->|-([^-\s>][^>]*?)->)\s*/;
  let initN = 0, finN = 0;
  const getNode = (tok, isStart) => {
    const m = tok.match(nodeRe); if (!m) return null; let id = m[1], ty = m[2], br = m[3]; let label = null, shape = null;
    if (id === '[*]') { if (isStart) { id = '__init' + (initN++); shape = 'initial'; label = ''; } else { id = '__final' + (finN++); shape = 'final'; label = ''; } }
    if (br) for (const [re, sh] of BR) { const mm = br.match(re); if (mm) { label = mm[1].replace(/^"|"$/g, ''); shape = shape || sh; break; } }
    if (ty && S[ty]) shape = ty;
    const ex = nodes.get(id); if (ex) { if (label != null) ex.label = label; if (shape) ex.shape = shape; } else nodes.set(id, { id, label: label != null ? label : id, shape: shape || (mode === 'state' ? 'state' : 'process') });
    return { id, len: m[0].length };
  };
  for (const raw of lines) {
    let m;
    if ((m = raw.match(/^(?:flowchart|graph)\s*(TD|TB|BT|LR|RL)?/i))) { dir = (m[1] || 'TB').toUpperCase().replace('TD', 'TB'); mode = 'flow'; continue; }
    if (/^stateDiagram/i.test(raw)) { mode = 'state'; dir = 'TB'; continue; }
    if ((m = raw.match(/^direction\s+(TB|TD|BT|LR|RL)/i))) { dir = m[1].toUpperCase().replace('TD', 'TB'); continue; }
    if (/^(classDef|class |style |linkStyle|subgraph|end$|click )/.test(raw)) continue;
    let rest = raw; let label = null;
    if (mode === 'state') { const ci = rest.indexOf(' : '); if (ci > 0 && /-->/.test(rest)) { label = rest.slice(ci + 3).trim(); rest = rest.slice(0, ci); } else if (/^[\w؀-ۿ]+\s*:\s*/.test(rest) && !/-->/.test(rest)) { const [id, ...t] = rest.split(':'); getNode(id.trim(), false); nodes.get(id.trim()).label = t.join(':').trim(); continue; } }
    let a = getNode(rest, true); if (!a) continue; rest = rest.slice(a.len); let prev = a.id; let first = true;
    while (rest.trim()) { const em = rest.match(edgeRe); if (!em) break; const op = em[1] || '-->'; const lab = em[2] || em[3] || em[4] || null; rest = rest.slice(em[0].length); const b = getNode(rest, false); if (!b) break; rest = rest.slice(b.len); E.push({ a: prev, b: b.id, op, label: lab != null ? lab.trim() : (first ? label : null) }); prev = b.id; first = false; }
  }
  return { dir, nodes: [...nodes.values()], edges: E };
}
function buildFromDSL(src, at) {
  const g = parseDSL(src); if (!g.nodes.length) throw new Error('No nodes found. Example: A[Start] --> B{Check?}');
  const made = []; const map = {};
  for (const n of g.nodes) { const s = mkShape(n.shape, 0, 0, { text: n.label }); if (n.shape === 'decision' || n.shape === 'diamond') { s.w = Math.max(120, Math.min(220, n.label.length * 7 + 60)); s.h = 80; } else if (!['initial', 'final', 'choice', 'circle', 'connector'].includes(n.shape) && !S[n.shape].labelBelow) { s.w = Math.max(S[n.shape].w, Math.min(240, n.label.length * 7.5 + 30)); } if (n.shape === 'circle') { s.w = s.h = Math.max(60, Math.min(120, n.label.length * 7 + 24)); } map[n.id] = s; made.push(s); }
  const ed = g.edges.map(e => ({ id: uid(), k: 'edge', s: { id: map[e.a].id }, e: { id: map[e.b].id }, text: e.label || '', st: Object.assign({}, DEF_EST, e.op.includes('.') ? { dash: '6 4' } : {}, e.op.includes('==') ? { sw: 3 } : {}, e.op === '---' || e.op === '===' ? { arrowE: 'none' } : {}, e.op === '<-->' ? { arrowS: 'arrow' } : {}, e.op === '--o' ? { arrowE: 'circle' } : {}) }));
  const before = P.items.length; P.items.push(...made, ...ed);
  autoLayout(g.dir, made);
  // place near target point
  const b = bboxOf(made); const dx = (at ? at.x : 0) - b.x, dy = (at ? at.y : 0) - b.y; made.forEach(s => { s.x += dx; s.y += dy; });
  return made.concat(ed);
}

/* ---------------- .drawio import/export ---------------- */
async function inflateDrawio(b64) { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const ds = new DecompressionStream('deflate-raw'); const txt = await new Response(new Blob([bin]).stream().pipeThrough(ds)).text(); try { return decodeURIComponent(txt); } catch (e) { return txt; } }
function parseStyle(s) { const o = { _shape: null }; (s || '').split(';').forEach(p => { if (!p) return; const i = p.indexOf('='); if (i < 0) { if (!o._shape) o._shape = p; o[p] = '1'; } else o[p.slice(0, i)] = p.slice(i + 1); }); return o; }
function stripHtml(v) { const d = document.createElement('div'); d.innerHTML = String(v || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n'); return d.textContent.replace(/\n+$/, ''); }
const DRAWIO_MAP = { ellipse: 'ellipse', rhombus: 'diamond', triangle: 'triangle', hexagon: 'hexagon', cylinder: 'cylinder', cylinder3: 'cylinder', document: 'document', parallelogram: 'parallelogram', trapezoid: 'trapezoid', note: 'note', cloud: 'cloud', umlActor: 'actor', swimlane: 'container', text: 'text', process: 'predefined', 'mxgraph.flowchart.terminator': 'terminator', 'mxgraph.flowchart.decision': 'decision', 'mxgraph.flowchart.document': 'document', 'mxgraph.flowchart.database': 'database', 'mxgraph.flowchart.data': 'io', 'mxgraph.flowchart.predefined_process': 'predefined', 'mxgraph.flowchart.manual_input': 'manualinput', 'mxgraph.flowchart.delay': 'delay', 'mxgraph.flowchart.preparation': 'preparation', 'mxgraph.flowchart.on-page_reference': 'connector', 'mxgraph.flowchart.off-page_reference': 'offpage', doubleEllipse: 'multiattr', step: 'blockarrow', singleArrow: 'blockarrow', doubleArrow: 'doublearrow', callout: 'callout', star: 'star', image: 'image' };
const ARROW_IN = { classic: 'arrow', block: 'arrow', open: 'open', openThin: 'open', diamond: 'diamond', diamondThin: 'diamond', oval: 'circle', dash: 'bar', none: 'none', classicThin: 'arrow', blockThin: 'arrow' };
async function importDrawio(text) {
  const dom = new DOMParser().parseFromString(text, 'text/xml'); if (dom.querySelector('parsererror')) throw new Error('The file is not valid XML.');
  const models = []; const diagrams = [...dom.getElementsByTagName('diagram')];
  if (!diagrams.length) { const m = dom.getElementsByTagName('mxGraphModel')[0]; if (m) models.push({ name: 'Page-1', m }); }
  for (const d of diagrams) { let m = d.getElementsByTagName('mxGraphModel')[0]; if (!m) { const t = d.textContent.trim(); if (t) { const xml = await inflateDrawio(t); m = new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagName('mxGraphModel')[0]; } } if (m) models.push({ name: d.getAttribute('name') || 'Page', m }); }
  if (!models.length) throw new Error('No diagram found in the file.');
  const pages = [];
  for (const { name, m } of models) {
    const cells = [...m.getElementsByTagName('mxCell')]; const cm = {}; cells.forEach(c => cm[c.getAttribute('id')] = c);
    const absPos = (c) => { const g = c.getElementsByTagName('mxGeometry')[0]; let x = +g?.getAttribute('x') || 0, y = +g?.getAttribute('y') || 0; let p = cm[c.getAttribute('parent')]; while (p && p.getAttribute('vertex') === '1') { const pg2 = p.getElementsByTagName('mxGeometry')[0]; x += +pg2?.getAttribute('x') || 0; y += +pg2?.getAttribute('y') || 0; p = cm[p.getAttribute('parent')]; } return { x, y }; };
    const page = { id: uid(), name, items: [], bg: m.getAttribute('background') && m.getAttribute('background') !== 'none' ? m.getAttribute('background') : '#ffffff' }; const idmap = {}; const edgeLabels = [];
    for (const c of cells) {
      const st = parseStyle(c.getAttribute('style')); const val = stripHtml(c.getAttribute('value'));
      if (c.getAttribute('vertex') === '1') {
        const par = cm[c.getAttribute('parent')]; if (par && par.getAttribute('edge') === '1') { edgeLabels.push([c.getAttribute('parent'), val]); continue; }
        const g = c.getElementsByTagName('mxGeometry')[0]; const { x, y } = absPos(c); const w = +g?.getAttribute('width') || 120, h = +g?.getAttribute('height') || 60;
        let t = DRAWIO_MAP[st.shape] || DRAWIO_MAP[st._shape] || (st.rounded === '1' ? 'round' : 'rect'); if (st.ellipse && t === 'rect') t = 'ellipse';
        if (st.shape && /logic_gate/.test(st.shape)) t = { and: 'and', or: 'or', xor: 'xor' }[st.operation] || 'and';
        const s = mkShape(t, x, y, { text: val }); s.w = w; s.h = h;
        if (st.fillColor) s.st.fill = st.fillColor === 'none' ? 'none' : st.fillColor; if (st.strokeColor) s.st.stroke = st.strokeColor === 'none' ? 'none' : st.strokeColor; if (st.fontColor) s.st.fc = st.fontColor; if (st.fontSize) s.st.fs = +st.fontSize; if (st.strokeWidth) s.st.sw = +st.strokeWidth; if (st.dashed === '1') s.st.dash = '6 4'; if (st.opacity) s.st.op = +st.opacity / 100; if (st.rotation) s.rot = +st.rotation; if (st.fontStyle) { s.st.bold = +st.fontStyle & 1; s.st.italic = (+st.fontStyle & 2) ? 1 : 0; s.st.underline = (+st.fontStyle & 4) ? 1 : 0; } if (st.align) s.st.align = st.align; if (st.verticalAlign) s.st.valign = st.verticalAlign; if (st.shadow === '1') s.st.shadow = 1;
        if (t === 'image' && st.image) { s.img = st.image.startsWith('data:image/svg+xml,') ? 'data:image/svg+xml;base64,' + st.image.slice(19) : st.image; }
        if (t === 'text') { s.st.fill = st.fillColor || 'none'; s.st.stroke = st.strokeColor || 'none'; }
        if (t === 'container') s.st.valign = 'top';
        idmap[c.getAttribute('id')] = s.id; page.items.push(s);
      }
    }
    for (const c of cells) {
      if (c.getAttribute('edge') !== '1') continue; const st = parseStyle(c.getAttribute('style')); const g = c.getElementsByTagName('mxGeometry')[0];
      const pt = as => { const p = [...(g?.getElementsByTagName('mxPoint') || [])].find(q => q.getAttribute('as') === as); return p ? { x: +p.getAttribute('x') || 0, y: +p.getAttribute('y') || 0 } : { x: 0, y: 0 }; };
      const s = c.getAttribute('source') && idmap[c.getAttribute('source')] ? { id: idmap[c.getAttribute('source')] } : pt('sourcePoint');
      const t = c.getAttribute('target') && idmap[c.getAttribute('target')] ? { id: idmap[c.getAttribute('target')] } : pt('targetPoint');
      const e = { id: uid(), k: 'edge', s, e: t, text: stripHtml(c.getAttribute('value')), st: Object.assign({}, DEF_EST) };
      e.st.route = st.edgeStyle && /orthogonal|elbow|entityRelation/.test(st.edgeStyle) ? 'ortho' : st.curved === '1' ? 'curve' : st.edgeStyle ? 'ortho' : 'straight';
      if (st.strokeColor) e.st.stroke = st.strokeColor; if (st.strokeWidth) e.st.sw = +st.strokeWidth; if (st.dashed === '1') e.st.dash = '6 4'; if (st.fontColor) e.st.fc = st.fontColor;
      e.st.arrowE = st.endArrow ? (ARROW_IN[st.endArrow] || 'arrow') : 'arrow'; e.st.arrowS = st.startArrow ? (ARROW_IN[st.startArrow] || 'none') : 'none';
      idmap[c.getAttribute('id')] = e.id; page.items.push(e);
    }
    edgeLabels.forEach(([pid, v]) => { const e = page.items.find(i => i.id === idmap[pid]); if (e && v) e.text = e.text ? e.text + '\n' + v : v; });
    pages.push(page);
  }
  return pages;
}
const DRAWIO_OUT = { rect: 'rounded=0;', round: 'rounded=1;', ellipse: 'ellipse;', circle: 'ellipse;aspect=fixed;', diamond: 'rhombus;', decision: 'rhombus;', relationship: 'rhombus;', triangle: 'triangle;', hexagon: 'shape=hexagon;perimeter=hexagonPerimeter2;fixedSize=1;', preparation: 'shape=hexagon;perimeter=hexagonPerimeter2;fixedSize=1;', cylinder: 'shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=12;', database: 'shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=12;', document: 'shape=document;boundedLbl=1;', fdocument: 'shape=document;boundedLbl=1;', parallelogram: 'shape=parallelogram;perimeter=parallelogramPerimeter;fixedSize=1;', io: 'shape=parallelogram;perimeter=parallelogramPerimeter;fixedSize=1;', trapezoid: 'shape=trapezoid;perimeter=trapezoidPerimeter;fixedSize=1;', note: 'shape=note;size=16;', umlnote: 'shape=note;size=16;', cloud: 'ellipse;shape=cloud;', internet: 'ellipse;shape=cloud;', text: 'text;', heading: 'text;', siglabel: 'text;', actor: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;', terminator: 'rounded=1;arcSize=50;', process: 'rounded=0;', predefined: 'shape=process;', entity: 'rounded=0;', state: 'rounded=1;arcSize=30;', usecase: 'ellipse;', attribute: 'ellipse;', keyattr: 'ellipse;fontStyle=4;', multiattr: 'ellipse;shape=doubleEllipse;', container: 'swimlane;startSize=26;', sticky: 'shape=note;size=0;', connector: 'ellipse;aspect=fixed;' };
const ARROW_OUT = { arrow: 'classic', open: 'open', diamond: 'diamond', odiamond: 'diamond', circle: 'oval', ocircle: 'oval', bar: 'dash', triangle: 'block', none: 'none' };
function exportDrawio() {
  const xa = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#xa;');
  const pages = doc.pages.map(pg => {
    const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
    for (const i of pg.items) {
      if (i.k === 'shape') {
        let style = DRAWIO_OUT[i.t]; const st = i.st;
        if (!style) { const one = shapeOnlySvg(i); style = `shape=image;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;image=data:image/svg+xml,${btoa(unescape(encodeURIComponent(one)))};`; }
        style += `whiteSpace=wrap;html=1;fillColor=${st.fill};strokeColor=${st.stroke};fontColor=${st.fc};fontSize=${st.fs};strokeWidth=${st.sw};` + (st.dash ? 'dashed=1;' : '') + (st.op < 1 ? `opacity=${Math.round(st.op * 100)};` : '') + (i.rot ? `rotation=${i.rot};` : '') + `fontStyle=${(st.bold ? 1 : 0) | (st.italic ? 2 : 0) | (st.underline ? 4 : 0)};align=${st.align};verticalAlign=${st.valign};` + (st.shadow ? 'shadow=1;' : '');
        const val = i.t === 'table3' ? (i.cells || []).map(r => r.join(' | ')).join('\n') : S[i.t]?.notext ? '' : i.text || '';
        cells.push(`<mxCell id="${i.id}" value="${xa(val)}" style="${xa(style)}" vertex="1" parent="1"><mxGeometry x="${i.x}" y="${i.y}" width="${i.w}" height="${i.h}" as="geometry"/></mxCell>`);
      } else {
        const st = i.st; const style = (st.route === 'ortho' ? 'edgeStyle=orthogonalEdgeStyle;rounded=' + (st.rounded ? 1 : 0) + ';' : st.route === 'curve' ? 'curved=1;' : '') + `html=1;strokeColor=${st.stroke};strokeWidth=${st.sw};endArrow=${ARROW_OUT[st.arrowE] || 'classic'};startArrow=${ARROW_OUT[st.arrowS] || 'none'};` + (st.dash ? 'dashed=1;' : '') + `fontColor=${st.fc};`;
        const src = i.s.id ? `source="${i.s.id}"` : '', tgt = i.e.id ? `target="${i.e.id}"` : '';
        const pts = (!i.s.id ? `<mxPoint x="${i.s.x}" y="${i.s.y}" as="sourcePoint"/>` : '') + (!i.e.id ? `<mxPoint x="${i.e.x}" y="${i.e.y}" as="targetPoint"/>` : '');
        cells.push(`<mxCell id="${i.id}" value="${xa(i.text || '')}" style="${xa(style)}" edge="1" parent="1" ${src} ${tgt}><mxGeometry relative="1" as="geometry">${pts}</mxGeometry></mxCell>`);
      }
    }
    return `<diagram id="${pg.id}" name="${xa(pg.name)}"><mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="1100" pageHeight="850" background="${pg.bg || '#ffffff'}" math="0" shadow="0"><root>${cells.join('')}</root></mxGraphModel></diagram>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="CEsim" version="1.1">${pages.join('')}</mxfile>`;
}
function shapeOnlySvg(s) { const c = JSON.parse(JSON.stringify(s)); c.x = 1; c.y = 1; c.rot = 0; c.text = ''; return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w + 2}" height="${s.h + 2}" viewBox="0 0 ${s.w + 2} ${s.h + 2}">${shapeSvg(c, true)}</svg>`; }

/* ---------------- export SVG / PNG / PDF ---------------- */
function exportSvgString(onlySel, opt = {}) {
  routeCache = new Map(); PU = new Map();
  const its = onlySel && sel.size ? P.items.filter(i => sel.has(i.id)) : P.items;
  const pts = []; its.forEach(i => { if (i.k === 'shape') { if (i.rot) { const c = center(i); [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([fx, fy]) => { const p = rotPt(i.x + fx * i.w, i.y + fy * i.h, c.x, c.y, i.rot); pts.push({ x: p.x, y: p.y, w: 0, h: 0 }) }) } else pts.push(i); const d = S[i.t]; if (d && d.labelBelow && i.text) pts.push({ x: i.x - 50, y: i.y + i.h, w: i.w + 100, h: 40 }); } else edgePoints(i).forEach(p => pts.push({ x: p.x, y: p.y, w: 0, h: 0 })); });
  let b = bboxOf(pts); let m = opt.margin != null ? +opt.margin : 20; if (opt.view) { const r = svg.getBoundingClientRect(); b = { x: -view.x / view.z, y: -view.y / view.z, w: r.width / view.z, h: r.height / view.z }; m = 0; } const W = Math.ceil(b.w + 2 * m), H = Math.ceil(b.h + 2 * m);
  const cols = new Set(its.filter(i => i.k === 'edge').map(e => e.st.stroke));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${b.x - m} ${b.y - m} ${W} ${H}"><defs>${markerDefs(cols)}<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="2" dy="3" stdDeviation="2.5" flood-opacity="0.22"/></filter></defs>${opt.bg === 'transparent' ? '' : `<rect x="${b.x - m}" y="${b.y - m}" width="${W}" height="${H}" fill="${opt.bg || P.bg || '#ffffff'}"/>`}${its.map(i => i.k === 'shape' ? shapeSvg(i, true) : edgeSvg(i, true)).join('')}</svg>`;
}
function svgToPng(svgStr, scale = 2, mime = 'image/png', bgFill) { return new Promise((res, rej) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.width * scale; c.height = img.height * scale; const g = c.getContext('2d'); if (bgFill) { g.fillStyle = bgFill; g.fillRect(0, 0, c.width, c.height); } g.scale(scale, scale); g.drawImage(img, 0, 0); res(c.toDataURL(mime, 0.93)); }; img.onerror = () => rej(new Error('Could not render the image.')); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr))); }); }
function saveText(name, text, mime) { if (window.cesimNative && window.cesimNative.save) { window.cesimNative.save(name, text); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 800); }
function saveDataUrl(name, url) { if (window.cesimNative && window.cesimNative.saveBinary) { window.cesimNative.saveBinary(name, url.split(',')[1]); return; } const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
const base = () => doc.name.replace(/[^\w؀-ۿ.-]+/g, '_');
function toMermaid(onlySel) {
  const its = onlySel && sel.size ? P.items.filter(i => sel.has(i.id)) : P.items; const ids = {}; let n = 0; const L = ['flowchart TD'];
  const br = { decision: ['{', '}'], diamond: ['{', '}'], relationship: ['{', '}'], round: ['(', ')'], state: ['(', ')'], terminator: ['([', '])'], database: ['[(', ')]'], cylinder: ['[(', ')]'], circle: ['((', '))'], ellipse: ['((', '))'], connector: ['((', '))'], hexagon: ['{{', '}}'], preparation: ['{{', '}}'], io: ['[/', '/]'], parallelogram: ['[/', '/]'], predefined: ['[[', ']]'] };
  for (const s of its.filter(i => i.k === 'shape')) { if (['text', 'heading', 'divider', 'container', 'sticky', 'table3'].includes(s.t)) continue; const id = 'N' + (++n); ids[s.id] = id; const [a, b] = br[s.t] || ['[', ']']; const t = String(s.text || S[s.t]?.name || s.t).replace(/\n/g, ' ').replace(/["\[\]{}()|]/g, ' ').trim() || ' '; L.push(`  ${id}${a}${t}${b}`); }
  for (const e of its.filter(i => i.k === 'edge')) { const a = ids[e.s.id], b = ids[e.e.id]; if (!a || !b) continue; const op = e.st.dash ? '-.->' : e.st.arrowE === 'none' ? '---' : '-->'; L.push(`  ${a} ${op}${e.text ? '|' + e.text.replace(/\|/g, '/').replace(/\n/g, ' ') + '|' : ''} ${b}`); }
  return L.join('\n');
}
function openExport() {
  const d = $('#expd'); const hasSel = sel.size > 0;
  d.innerHTML = `<div class="row"><b style="font-size:14px">Export</b><span style="flex:1"></span><button class="btn" id="exC">Cancel</button><button class="btn pri" id="exOk">Export</button></div>
  <div class="eg"><label for="exF">Format</label><select id="exF">${[['png', 'PNG image'], ['jpg', 'JPG image'], ['webp', 'WebP image'], ['svg', 'SVG vector'], ['pdf', 'PDF document'], ['drawio', '.drawio diagram'], ['mmd', 'Mermaid text (.mmd)'], ['cediag', 'CEsim diagram (.cediag)'], ['copy', 'Copy as image to clipboard']].map(([v, n]) => `<option value="${v}" ${v === (lastExp.f || 'png') ? 'selected' : ''}>${n}</option>`).join('')}</select>
  <label for="exA">Area</label><select id="exA"><option value="page">Whole page</option><option value="view" ${lastExp.a === 'view' ? 'selected' : ''}>Visible area</option><option value="sel" ${hasSel ? '' : 'disabled'} ${hasSel && lastExp.a === 'sel' ? 'selected' : ''}>Selection only</option></select>
  <label for="exS">Scale</label><select id="exS">${[1, 2, 3, 4].map(v => `<option value="${v}" ${v == (lastExp.s || 2) ? 'selected' : ''}>${v}× ${v === 1 ? '(screen)' : v === 2 ? '(sharp)' : v === 4 ? '(print)' : ''}</option>`).join('')}</select>
  <label for="exB">Background</label><select id="exB"><option value="page">Page color</option><option value="#ffffff" ${lastExp.b === '#ffffff' ? 'selected' : ''}>White</option><option value="transparent" ${lastExp.b === 'transparent' ? 'selected' : ''}>Transparent (PNG, SVG)</option></select>
  <label for="exM">Margin</label><input id="exM" type="number" min="0" max="200" value="${lastExp.m ?? 20}"></div>
  <div class="muted" id="exInfo"></div>`;
  d.style.display = 'flex';
  const upd = () => { const f = d.querySelector('#exF').value; const raster = ['png', 'jpg', 'copy'].includes(f); d.querySelector('#exS').disabled = !raster; d.querySelector('#exB').disabled = !['png', 'jpg', 'svg', 'pdf', 'copy'].includes(f); d.querySelector('#exM').disabled = !['png', 'jpg', 'svg', 'pdf', 'copy'].includes(f); d.querySelector('#exInfo').textContent = { png: 'Best for reports and slides.', jpg: 'Smaller files; no transparency.', svg: 'Sharp at any size; edit in vector tools.', pdf: 'Print-ready single page.', drawio: 'Opens in diagram editors that read .drawio, all pages included.', mmd: 'Text form of flowcharts and connectors; shapes become nodes.', cediag: 'Keeps everything, all pages.', copy: 'Paste straight into Word or a slide.' }[f]; };
  d.querySelector('#exF').onchange = upd; upd();
  d.querySelector('#exC').onclick = () => d.style.display = 'none';
  d.querySelector('#exOk').onclick = async () => { const o = { f: d.querySelector('#exF').value, a: d.querySelector('#exA').value, s: +d.querySelector('#exS').value, b: d.querySelector('#exB').value, m: +d.querySelector('#exM').value }; lastExp = o; d.style.display = 'none'; await doExport(o.f, o); };
}
let lastExp = {};
async function doExport(kind, o = {}) {
  const only = o.a === 'sel'; const bg = o.b === 'page' || !o.b ? undefined : o.b; const so = { bg, margin: o.m, view: o.a === 'view' };
  if (kind === 'cediag') { saveFile(); return; }
  if (kind === 'mmd') { saveText(base() + '.mmd', toMermaid(only), 'text/plain'); return; }
  if (!P.items.length) { toast('The page is empty.'); return; }
  try {
    if (kind === 'svg') { saveText(base() + '.svg', exportSvgString(only, so), 'image/svg+xml'); return; }
    if (kind === 'png') { saveDataUrl(base() + '.png', await svgToPng(exportSvgString(only, so), o.s || 2)); return; }
    if (kind === 'jpg') { saveDataUrl(base() + '.jpg', await svgToPng(exportSvgString(only, Object.assign({}, so, { bg: bg === 'transparent' ? '#ffffff' : bg })), o.s || 2, 'image/jpeg', '#ffffff')); return; }
    if (kind === 'webp') { saveDataUrl(base() + '.webp', await svgToPng(exportSvgString(only, Object.assign({}, so, { bg: bg === 'transparent' ? '#ffffff' : bg })), o.s || 2, 'image/webp', '#ffffff')); return; }
    if (kind === 'pdf') { if (window.cesimNative && window.cesimNative.pdf) window.cesimNative.pdf(base() + '.pdf', exportSvgString(only, Object.assign({}, so, { bg: bg === 'transparent' ? undefined : bg }))); else toast('PDF export works in the CEsim desktop app. Use SVG or PNG here.'); return; }
    if (kind === 'drawio') { saveText(base() + '.drawio', exportDrawio(), 'application/xml'); return; }
    if (kind === 'copy') { const url = await svgToPng(exportSvgString(only || sel.size > 0, so), o.s || 2); const blob = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Image copied. Paste it into Word or a slide.'); return; }
  } catch (e) { toast('Export failed: ' + e.message, true); }
}
async function doExportLegacy(kind) {
  if (!P.items.length) { toast('The page is empty.'); return; }
  try {
    if (kind === 'svg') saveText(base() + '.svg', exportSvgString(), 'image/svg+xml');
    else if (kind === 'png') saveDataUrl(base() + '.png', await svgToPng(exportSvgString(), 2));
    else if (kind === 'drawio') saveText(base() + '.drawio', exportDrawio(), 'application/xml');
    else if (kind === 'pdf') { if (window.cesimNative && window.cesimNative.pdf) window.cesimNative.pdf(base() + '.pdf', exportSvgString()); else toast('PDF export works in the CEsim desktop app. Use SVG or PNG here.'); }
    else if (kind === 'copy') { const url = await svgToPng(exportSvgString(true), 2); const blob = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Image copied. Paste it into Word or a report.'); }
  } catch (e) { toast('Export failed: ' + e.message, true); }
}
let filePath = null;
async function saveFile(asNew) { const N_ = window.cesimNative; const text = JSON.stringify(doc); if (N_ && N_.write && filePath && /\.cediag$/i.test(filePath) && !asNew) { await N_.write(filePath, text); toast('Saved ' + filePath.split(/[\\/]/).pop()); } else if (N_ && N_.save) { const r = await N_.save(base() + '.cediag', text); if (r) { filePath = r; doc.name = r.split(/[\\/]/).pop().replace(/\.cediag$/i, ''); renderPages(); toast('Saved ' + r.split(/[\\/]/).pop()); } } else saveText(base() + '.cediag', text, 'application/json'); document.title = doc.name + ' — CEsim Diagram'; }

/* ---------------- open files ---------------- */
async function openFile(name, data) {
  const ext = name.split('.').pop().toLowerCase(); const bn = name.replace(/\.[^.]+$/, '');
  const text = () => typeof data === 'string' ? data : new TextDecoder().decode(data);
  try {
    if (ext === 'cediag' || (ext === 'json' && /CEsimDiagram/.test(text()))) { const d = JSON.parse(text()); if (d.format !== 'CEsimDiagram') throw new Error('Not a CEsim diagram.'); pushUndo(); doc = d; P = doc.pages[doc.cur] || doc.pages[0]; sel.clear(); renderAll(); fit(); return; }
    if (ext === 'drawio' || ext === 'xml' || ext === 'dio') { const pages = await importDrawio(text()); pushUndo(); doc = newDoc(bn); doc.pages = pages; doc.cur = 0; P = pages[0]; sel.clear(); renderAll(); fit(); toast(`Opened ${pages.length} page(s) from ${name}.`); return; }
    if (ext === 'mmd' || ext === 'mermaid' || ext === 'txt') { pushUndo(); const made = buildFromDSL(text(), { x: 40, y: 40 }); sel = new Set(made.map(m => m.id)); renderAll(); fit(); return; }
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) { const mime = ext === 'svg' ? 'image/svg+xml' : 'image/' + (ext === 'jpg' ? 'jpeg' : ext); const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); const url = `data:${mime};base64,` + btoa(s); const img = new Image(); img.onload = () => { pushUndo(); const it = mkShape('rect', 40, 40); it.t = 'image'; it.img = url; const k = Math.min(1, 600 / img.width); it.w = Math.round(img.width * k) || 200; it.h = Math.round(img.height * k) || 150; it.st.stroke = 'none'; P.items.push(it); sel = new Set([it.id]); renderAll(); }; img.src = url; return; }
    throw new Error('This format is not supported here.');
  } catch (e) { console.error(e); toast('Could not open ' + name + ': ' + e.message, true); }
}
window.cesimOpenText = (n, t, p) => { filePath = p && /\.cediag$/i.test(p) ? p : null; openFile(n, t); };
window.cesimOpenBinary = (n, b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); openFile(n, u.buffer); };
$('#fileIn').addEventListener('change', async e => { for (const f of e.target.files) openFile(f.name, await f.arrayBuffer()); e.target.value = ''; });
$('#cwrap').addEventListener('dragover', e => e.preventDefault());
$('#cwrap').addEventListener('drop', async e => { e.preventDefault(); const key = e.dataTransfer.getData('text/cesim-shape'); if (key) { const w = toWorld(e); pushUndo(); const s = mkShape(key, snapV(w.x - S[key].w / 2), snapV(w.y - S[key].h / 2)); P.items.push(s); sel = new Set([s.id]); useShape(key); renderAll(); buildLibrary($('#libq').value); return; } for (const f of e.dataTransfer.files) openFile(f.name, await f.arrayBuffer()); });

/* ---------------- shape library panel ---------------- */
function thumb(key) { const d = S[key]; if (d.textOnly) return `<svg viewBox="0 0 40 28" width="40" height="28"><text x="20" y="20" text-anchor="middle" font-family="${FONT}" font-size="${key === 'heading' ? 18 : 15}" font-weight="${key === 'text' ? 400 : 600}" fill="#1f3a5f">${key === 'heading' ? 'H1' : key === 'siglabel' ? 'CLK' : 'Aa'}</text></svg>`; const s = mkShape(key, 0, 0); const sc = Math.min(34 / s.w, 30 / s.h, 1.2); s.x = 0; s.y = 0; if (d.textOnly) { s.text = key === 'heading' ? 'H1' : key === 'siglabel' ? 'CLK' : 'Text'; s.st.fs = 14; } if (S[key].labelBelow) s.text = ''; if (key === 'class' || key === 'interface') s.text = ''; return `<svg viewBox="${-2} ${-2} ${s.w + 4} ${s.h + 4}" width="${Math.max(16, s.w * sc + 4)}" height="${Math.max(14, s.h * sc + 4)}">${shapeSvg(s, true)}</svg>`; }
let recentShapes = []; try { recentShapes = JSON.parse(localStorage.getItem('cesimdiag.recent') || '[]').filter(k => S[k]); } catch (e) { }
function useShape(k) { recentShapes = [k].concat(recentShapes.filter(x => x !== k)).slice(0, 9); try { localStorage.setItem('cesimdiag.recent', JSON.stringify(recentShapes)) } catch (e) { } }
function buildLibrary(filter = '') {
  const f = filter.trim().toLowerCase(); const L = $('#lib'); let h = '';
  if (!f && recentShapes.length) h += `<div class="cat"><button class="cath" data-cat="__recent" aria-expanded="true">▾ Recently used <span>${recentShapes.length}</span></button><div class="grid">${recentShapes.map(k => `<button class="it" draggable="true" data-key="${k}" title="${S[k].name}">${thumb(k)}<span>${S[k].name}</span></button>`).join('')}</div></div>`;
  for (const cat of CATS) { const keys = Object.keys(S).filter(k => S[k].cat === cat && (!f || S[k].name.toLowerCase().includes(f) || cat.toLowerCase().includes(f) || k.includes(f))); if (!keys.length) continue; const open = f || !collapsed.has(cat); h += `<div class="cat"><button class="cath" data-cat="${cat}" aria-expanded="${open}">${open ? '▾' : '▸'} ${cat} <span>${keys.length}</span></button>${open ? `<div class="grid">${keys.map(k => `<button class="it" draggable="true" data-key="${k}" title="${S[k].name}">${thumb(k)}<span>${S[k].name}</span></button>`).join('')}</div>` : ''}</div>`; }
  L.innerHTML = h || '<div class="muted" style="padding:10px">No shapes match.</div>';
}
const collapsed = new Set(['UML', 'ER diagram', 'Timing', 'Network', 'State machine']);
$('#lib').addEventListener('click', e => { const c = e.target.closest('.cath'); if (c) { const k = c.dataset.cat; collapsed.has(k) ? collapsed.delete(k) : collapsed.add(k); buildLibrary($('#libq').value); return; } const it = e.target.closest('.it'); if (!it) return; const key = it.dataset.key; const r = svg.getBoundingClientRect(); const cx = (r.width / 2 - view.x) / view.z, cy = (r.height / 2 - view.y) / view.z; pushUndo(); let x = snapV(cx - S[key].w / 2), y = snapV(cy - S[key].h / 2); const W0 = S[key].w, H0 = S[key].h; const hit = (x, y) => shapes().some(s => x < s.x + s.w + 20 && x + W0 + 20 > s.x && y < s.y + s.h + 20 && y + H0 + 20 > s.y); let tries = 0; while (hit(x, y) && tries++ < 60) { x += Math.max(W0, 60) + 40; if (tries % 6 === 0) { x = snapV(cx - W0 / 2); y += H0 + 60; } } const s = mkShape(key, x, y); P.items.push(s); sel = new Set([s.id]); useShape(key); renderAll(); buildLibrary($('#libq').value); });
$('#lib').addEventListener('dragstart', e => { const it = e.target.closest('.it'); if (it) e.dataTransfer.setData('text/cesim-shape', it.dataset.key); });
$('#libq').addEventListener('input', e => buildLibrary(e.target.value));

/* ---------------- format panel ---------------- */
const QUICK = [{ fill: '#ffffff', stroke: '#1f3a5f', fc: '#1b2230' }, { fill: '#dbe7f6', stroke: '#185fa5', fc: '#0c447c' }, { fill: '#d5f0e3', stroke: '#1e8e5a', fc: '#0f5132' }, { fill: '#fde2c8', stroke: '#c27c0e', fc: '#6b4206' }, { fill: '#f9d6d5', stroke: '#c0392b', fc: '#7a1f17' }, { fill: '#e7dcf7', stroke: '#7d3cbd', fc: '#46207a' }, { fill: '#fff4b0', stroke: '#c9a227', fc: '#5c4a00' }, { fill: '#1f3a5f', stroke: '#1f3a5f', fc: '#ffffff' }, { fill: '#185fa5', stroke: '#185fa5', fc: '#ffffff' }, { fill: '#f1f3f6', stroke: '#9aa5b4', fc: '#3a4556' }];
let styleClip = null;
function copyStyle() { const it = [...sel].map(byId).find(i => i && i.k === 'shape'); if (it) { styleClip = JSON.parse(JSON.stringify(it.st)); toast('Style copied.'); refreshPanel(); } }
function pasteStyle() { if (!styleClip) return; pushUndo(); [...sel].map(byId).filter(i => i && i.k === 'shape').forEach(i => Object.assign(i.st, styleClip)); renderAll(); }
const COLORS = ['#ffffff', '#f5f7fa', '#dbe7f6', '#d5f0e3', '#fff4b0', '#fde2c8', '#f9d6d5', '#e7dcf7', '#1f3a5f', '#185fa5', '#1e8e5a', '#c27c0e', '#c0392b', '#7d3cbd', '#1b2230', 'none'];
function swatches(prop, cur) { return `<div class="sw">${COLORS.map(c => `<button data-set="${prop}" data-v="${c}" class="${c === cur ? 'on' : ''}" title="${c}" style="background:${c === 'none' ? 'repeating-linear-gradient(45deg,#fff 0 4px,#e33 4px 5px)' : c}"></button>`).join('')}<input type="color" data-set="${prop}" value="${/^#/.test(cur) ? cur : '#ffffff'}" aria-label="Custom color"></div>`; }
function refreshPanel(valuesOnly) {
  const el = $('#fmt'); const its = [...sel].map(byId).filter(Boolean);
  if (valuesOnly && its.length === 1 && its[0].k === 'shape') { const s = its[0]; for (const k of ['x', 'y', 'w', 'h', 'rot']) { const i = el.querySelector(`[data-num="${k}"]`); if (i && document.activeElement !== i) i.value = Math.round(s[k]); } return; }
  if (!its.length) { el.innerHTML = `<h3>Page</h3><div class="frow"><label>Background</label></div>${swatches('pagebg', P.bg || '#ffffff')}<label class="chk"><input type="checkbox" id="pgGrid" ${showGrid ? 'checked' : ''}> Show grid</label><label class="chk"><input type="checkbox" id="pgSnap" ${snapOn ? 'checked' : ''}> Snap to grid</label><h3>Tips</h3><div class="muted">Drag a shape from the library, or click it.<br>Drag from a blue port to connect.<br>Double-click to edit text. Double-click empty space for a text box.<br>Space+drag or right-drag to pan; Ctrl+scroll zooms.<br>Arrows beside a selected shape add a connected copy.</div>`; return; }
  const sh = its.filter(i => i.k === 'shape'), ed = its.filter(i => i.k === 'edge'); const f = sh[0] || null, e = ed[0] || null;
  let h = '';
  if (f) {
    const st = f.st; const d = S[f.t] || {};
    h += `<h3>${sh.length > 1 ? sh.length + ' shapes' : esc(d.name || 'Shape')}</h3>`;
    h += `<div class="qs">${QUICK.map((q, i) => `<button data-qs="${i}" title="Quick style" style="background:${q.fill};border-color:${q.stroke};color:${q.fc}">Aa</button>`).join('')}</div><div class="bgrp wide" style="margin:6px 0"><button data-act="copystyle" title="Ctrl+Alt+C">Copy style</button><button data-act="pastestyle" title="Ctrl+Alt+V" ${styleClip ? '' : 'disabled'}>Paste style</button><button data-act="dup" title="Ctrl+D">Duplicate</button></div>`;
    if (!d.textOnly) h += `<div class="frow"><label>Fill</label></div>${swatches('fill', st.fill)}<div class="frow"><label>Line</label></div>${swatches('stroke', st.stroke)}`;
    h += `<div class="frow"><label>Line width</label><input type="number" min="0" max="20" step="0.5" data-set="sw" value="${st.sw}"></div><div class="frow"><label>Opacity %</label><input type="number" min="0" max="100" step="5" data-set="op" value="${Math.round(st.op * 100)}"></div>
    <div class="frow"><label>Dash</label><select data-set="dash">${[['', 'Solid'], ['6 4', 'Dashed'], ['2 3', 'Dotted'], ['10 4 2 4', 'Dash-dot']].map(([v, n]) => `<option value="${v}" ${st.dash === v ? 'selected' : ''}>${n}</option>`).join('')}</select>${f.t === 'round' ? `<label>Radius</label><input type="number" min="0" max="60" data-set="radius" value="${st.radius}">` : ''}</div>
    <label class="chk"><input type="checkbox" data-set="shadow" ${st.shadow ? 'checked' : ''}> Shadow</label>
    <h3>Text</h3><div class="frow"><label>Size</label><input type="number" min="6" max="96" data-set="fs" value="${st.fs}"><div class="bgrp"><button data-tog="bold" class="${st.bold ? 'on' : ''}" title="Bold"><b>B</b></button><button data-tog="italic" class="${st.italic ? 'on' : ''}" title="Italic"><i>I</i></button><button data-tog="underline" class="${st.underline ? 'on' : ''}" title="Underline"><u>U</u></button></div></div>
    <div class="frow"><div class="bgrp">${['left', 'center', 'right'].map(a => `<button data-set="align" data-v="${a}" class="${st.align === a ? 'on' : ''}" title="Align ${a}">${a === 'left' ? '⇤' : a === 'center' ? '≡' : '⇥'}</button>`).join('')}</div><div class="bgrp">${['top', 'middle', 'bottom'].map(a => `<button data-set="valign" data-v="${a}" class="${st.valign === a ? 'on' : ''}" title="${a}">${a === 'top' ? '⤒' : a === 'middle' ? '↕' : '⤓'}</button>`).join('')}</div></div>
    <div class="frow"><label>Text color</label></div>${swatches('fc', st.fc)}`;
    if (sh.length === 1) h += `<h3>Arrange</h3><div class="frow g4"><label>X</label><input type="number" data-num="x" value="${Math.round(f.x)}"><label>Y</label><input type="number" data-num="y" value="${Math.round(f.y)}"><label>W</label><input type="number" data-num="w" value="${Math.round(f.w)}"><label>H</label><input type="number" data-num="h" value="${Math.round(f.h)}"><label>Angle</label><input type="number" data-num="rot" value="${Math.round(f.rot || 0)}"></div><label class="chk"><input type="checkbox" id="lockChk" ${f.locked ? 'checked' : ''}> Lock position</label>`;
  }
  if (e) {
    const st = e.st;
    h += `<h3>${ed.length > 1 ? ed.length + ' connectors' : 'Connector'}</h3><div class="frow"><label>Route</label><div class="bgrp">${[['ortho', '⌐ Elbow'], ['straight', '／ Straight'], ['curve', '∿ Curve']].map(([v, n]) => `<button data-eset="route" data-v="${v}" class="${st.route === v ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="frow"><label>Start</label><select data-eset="arrowS">${Object.keys(ARROW_OUT).map(a => `<option ${st.arrowS === a ? 'selected' : ''}>${a}</option>`).join('')}</select><label>End</label><select data-eset="arrowE">${Object.keys(ARROW_OUT).map(a => `<option ${st.arrowE === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
    <div class="frow"><label>Width</label><input type="number" min="0.5" max="12" step="0.5" data-eset="sw" value="${st.sw}"><label>Dash</label><select data-eset="dash">${[['', 'Solid'], ['6 4', 'Dashed'], ['2 3', 'Dotted']].map(([v, n]) => `<option value="${v}" ${st.dash === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="frow"><label>Color</label></div>${swatches('estroke', st.stroke)}<label class="chk"><input type="checkbox" data-eset="rounded" ${st.rounded ? 'checked' : ''}> Rounded corners</label><div class="muted">Double-click a connector to add a label.</div>`;
  }
  if (its.length > 1) h += `<h3>Align</h3><div class="bgrp wide">${[['left', '⇤'], ['center', '↔'], ['right', '⇥'], ['top', '⤒'], ['middle', '↕'], ['bottom', '⤓']].map(([a, i]) => `<button data-align="${a}" title="Align ${a}">${i}</button>`).join('')}</div><div class="bgrp wide" style="margin-top:6px"><button data-dist="h">Distribute ↔</button><button data-dist="v">Distribute ↕</button><button data-same="1">Same size</button></div>`;
  h += `<h3>Order</h3><div class="bgrp wide"><button data-z="front">To front</button><button data-z="back">To back</button><button data-act="group">Group</button><button data-act="ungroup">Ungroup</button></div>`;
  el.innerHTML = h;
}
$('#fmt').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const its = [...sel].map(byId).filter(Boolean);
  if (b.dataset.set && b.dataset.v != null) { pushUndo(); const k = b.dataset.set, v = b.dataset.v; if (k === 'pagebg') { P.bg = v === 'none' ? '#ffffff' : v; } else if (k === 'estroke') { its.filter(i => i.k === 'edge').forEach(i => i.st.stroke = v === 'none' ? '#1f3a5f' : v); lastEdgeStyle.stroke = v; } else its.filter(i => i.k === 'shape').forEach(i => i.st[k] = v); renderAll(); return; }
  if (b.dataset.tog) { pushUndo(); const k = b.dataset.tog; const nv = its.find(i => i.k === 'shape')?.st[k] ? 0 : 1; its.filter(i => i.k === 'shape').forEach(i => i.st[k] = nv); renderAll(); return; }
  if (b.dataset.eset) { pushUndo(); its.filter(i => i.k === 'edge').forEach(i => i.st[b.dataset.eset] = b.dataset.v); lastEdgeStyle[b.dataset.eset] = b.dataset.v; renderAll(); return; }
  if (b.dataset.align) { align(b.dataset.align); return; } if (b.dataset.dist) { distribute(b.dataset.dist); return; } if (b.dataset.same) { sameSize(); return; }
  if (b.dataset.qs != null) { pushUndo(); const q = QUICK[+b.dataset.qs]; its.filter(i => i.k === 'shape').forEach(i => Object.assign(i.st, q)); renderAll(); return; }
  if (b.dataset.z) { zorder(b.dataset.z); return; } if (b.dataset.act === 'group') group(); if (b.dataset.act === 'ungroup') ungroup(); if (b.dataset.act === 'copystyle') copyStyle(); if (b.dataset.act === 'pastestyle') pasteStyle(); if (b.dataset.act === 'dup') { copySel(); pasteClip(20); }
});
$('#fmt').addEventListener('change', e => {
  const t = e.target; const its = [...sel].map(byId).filter(Boolean);
  if (t.id === 'pgGrid') { showGrid = t.checked; applyView(); return; } if (t.id === 'pgSnap') { snapOn = t.checked; return; }
  if (t.id === 'lockChk') { pushUndo(); its.forEach(i => i.locked = t.checked); renderAll(); return; }
  if (t.dataset.set) { pushUndo(); const k = t.dataset.set; let v = t.type === 'checkbox' ? (t.checked ? 1 : 0) : t.type === 'number' ? +t.value : t.value; if (k === 'op') v = clamp(v / 100, 0, 1); if (k === 'pagebg') { P.bg = v; renderAll(); return; } if (k === 'estroke') { its.filter(i => i.k === 'edge').forEach(i => i.st.stroke = v); lastEdgeStyle.stroke = v; renderAll(); return; } its.filter(i => i.k === 'shape').forEach(i => i.st[k] = v); renderAll(); return; }
  if (t.dataset.eset) { pushUndo(); const k = t.dataset.eset; const v = t.type === 'checkbox' ? (t.checked ? 1 : 0) : t.type === 'number' ? +t.value : t.value; its.filter(i => i.k === 'edge').forEach(i => i.st[k] = v); lastEdgeStyle[k] = v; renderAll(); return; }
  if (t.dataset.num) { pushUndo(); const k = t.dataset.num; its.filter(i => i.k === 'shape').forEach(i => i[k] = k === 'w' || k === 'h' ? Math.max(4, +t.value) : +t.value); renderAll(); }
});

/* ---------------- pages ---------------- */
function renderPages() { $('#pages').innerHTML = doc.pages.map((p, i) => `<button class="pg ${p === P ? 'on' : ''}" data-pg="${i}">${esc(p.name)}</button>`).join('') + `<button class="pg add" id="pgAdd" title="Add page">+</button>`; document.title = doc.name + ' — CEsim Diagram'; $('#docname').textContent = doc.name; }
$('#pages').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'pgAdd') { pushUndo(); const p = { id: uid(), name: 'Page-' + (doc.pages.length + 1), items: [], bg: '#ffffff' }; doc.pages.push(p); doc.cur = doc.pages.length - 1; P = p; sel.clear(); renderAll(); return; } const i = +b.dataset.pg; doc.cur = i; P = doc.pages[i]; sel.clear(); renderAll(); });
$('#pages').addEventListener('dblclick', e => { const b = e.target.closest('[data-pg]'); if (!b) return; const p = doc.pages[+b.dataset.pg]; inlinePrompt('Page name', p.name, v => { pushUndo(); p.name = v; renderPages(); }, doc.pages.length > 1 ? () => { pushUndo(); doc.pages.splice(+b.dataset.pg, 1); doc.cur = 0; P = doc.pages[0]; renderAll(); } : null); });
$('#docname').addEventListener('click', () => inlinePrompt('Diagram name', doc.name, v => { doc.name = v; renderPages(); markDirty(); }));
function inlinePrompt(label, val, ok, del) { const d = $('#prompt'); d.innerHTML = `<label for="pv">${esc(label)}</label><input id="pv" value="${esc(val)}"><div class="row">${del ? '<button class="btn danger" id="pdel">Delete page</button>' : ''}<span style="flex:1"></span><button class="btn" id="pc">Cancel</button><button class="btn pri" id="pok">OK</button></div>`; d.style.display = 'flex'; const inp = d.querySelector('#pv'); inp.focus(); inp.select(); const close = () => d.style.display = 'none'; d.querySelector('#pc').onclick = close; d.querySelector('#pok').onclick = () => { if (inp.value.trim()) ok(inp.value.trim()); close(); }; inp.onkeydown = e => { if (e.key === 'Enter') d.querySelector('#pok').click(); if (e.key === 'Escape') close(); }; if (del) d.querySelector('#pdel').onclick = () => { del(); close(); }; }

function on(id, fn) { const el = $(id); if (el) el.addEventListener('click', fn); }
/* ---------------- floating bar, minimap, find, help, screenshot ---------------- */
$('#fab').addEventListener('pointerdown', e => e.stopPropagation());
$('#fab').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const it = byId([...sel][0]); if (!it) return;
  const a = b.dataset.fa;
  if (a === 'edit') startEdit(it); else if (a === 'right') quickConnect('E'); else if (a === 'down') quickConnect('S'); else if (a === 'dup') { copySel(); pasteClip(20); } else if (a === 'del') deleteSel();
  else if (a === 'color') { const p = $('#fabc'); const r = b.getBoundingClientRect(); p.style.left = r.left + 'px'; p.style.top = r.bottom + 6 + 'px'; p.style.display = p.style.display === 'grid' ? 'none' : 'grid'; }
  else if (a === 'more') { const r = b.getBoundingClientRect(); openCtx({ clientX: r.left, clientY: r.bottom + 4 }, null); }
});
$('#fabc').addEventListener('pointerdown', e => e.stopPropagation());
$('#fabc').addEventListener('click', e => { const b = e.target.closest('[data-qs]'); const it = byId([...sel][0]); if (!b || !it) return; pushUndo(); Object.assign(it.st, QUICK[+b.dataset.qs]); $('#fabc').style.display = 'none'; renderAll(); });
$('#fabc').innerHTML = QUICK.map((q, i) => `<button data-qs="${i}" title="Quick style" style="background:${q.fill};border-color:${q.stroke};color:${q.fc}">Aa</button>`).join('');
(function miniEvents() { const mm = $('#mini'); let down = false; const go = e => { const m = mm._map; if (!m) return; const r = mm.getBoundingClientRect(); const wx = (e.clientX - r.left - m.ox) / m.k, wy = (e.clientY - r.top - m.oy) / m.k; const rr = svg.getBoundingClientRect(); view.x = rr.width / 2 - wx * view.z; view.y = rr.height / 2 - wy * view.z; applyView(); }; mm.addEventListener('pointerdown', e => { down = true; mm.setPointerCapture(e.pointerId); go(e); }); mm.addEventListener('pointermove', e => { if (down) go(e); }); mm.addEventListener('pointerup', () => down = false); })();
on('#bMini', () => { const mm = $('#mini'); mm.style.display = mm.style.display === 'none' ? 'block' : 'none'; drawMinimap(); });
let findHits = [], findI = -1;
function openFind() { const f = $('#findbar'); f.style.display = 'flex'; const i = $('#findq'); i.focus(); i.select(); }
function doFind(next) { const q = $('#findq').value.trim().toLowerCase(); findHits = q ? P.items.filter(i => String(i.text || '').toLowerCase().includes(q) || (i.cells && JSON.stringify(i.cells).toLowerCase().includes(q))) : []; $('#findn').textContent = findHits.length ? `${(findI = next ? (findI + 1) % findHits.length : 0) + 1} / ${findHits.length}` : (q ? 'No matches' : ''); if (findHits.length) { const it = findHits[findI]; sel = new Set([it.id]); const c = it.k === 'shape' ? center(it) : polyMid(edgePoints(it)); const r = svg.getBoundingClientRect(); view.x = r.width / 2 - c.x * view.z; view.y = r.height / 2 - c.y * view.z; applyView(); refreshPanel(); } }
$('#findq').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') doFind(true); if (e.key === 'Escape') $('#findbar').style.display = 'none'; });
$('#findq').addEventListener('input', () => { findI = -1; doFind(true); });
on('#findx', () => $('#findbar').style.display = 'none'); on('#bFind', openFind);
on('#bHelp', () => $('#helpd').style.display = 'block'); on('#helpx', () => $('#helpd').style.display = 'none');
on('#bShot', e => { const r = e.currentTarget.getBoundingClientRect(); const m = $('#ctxm'); const items = [['Save visible area as PNG', '', async () => saveDataUrl(base() + '_view.png', await svgToPng(exportSvgString(false, { view: true }), 2))], ['Copy visible area to clipboard', '', async () => { try { const url = await svgToPng(exportSvgString(false, { view: true }), 2); const blob = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Copied. Paste it into Word or a slide.'); } catch (err) { toast('Copy failed: ' + err.message, true); } }], ['Save whole page as PNG', '', async () => saveDataUrl(base() + '.png', await svgToPng(exportSvgString(), 2))], ...(window.cesimNative && window.cesimNative.capture ? [['Capture the whole window…', '', () => window.cesimNative.capture(base() + '_window.png')]] : [])]; m.innerHTML = items.map((x, i) => `<button data-i="${i}">${x[0]}<span>${x[1]}</span></button>`).join(''); m.style.display = 'flex'; m.style.left = Math.min(r.left, innerWidth - 240) + 'px'; m.style.top = r.bottom + 4 + 'px'; m.onclick = e2 => { const b = e2.target.closest('[data-i]'); if (!b) return; m.style.display = 'none'; items[+b.dataset.i][2](); }; });
on('#bImage', () => $('#imgIn').click());
$('#imgIn').addEventListener('change', async e => { for (const f of e.target.files) openFile(f.name, await f.arrayBuffer()); e.target.value = ''; });

/* ---------------- tools & toolbar ---------------- */
function setTool(t) { tool = t; document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); svg.style.cursor = t === 'hand' ? 'grab' : t === 'pen' || t === 'text' || t.startsWith('create') ? 'crosshair' : ''; $('#recogWrap').style.display = t === 'pen' ? 'flex' : 'none'; renderUI(); }
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
on('#bNew', () => openTemplates()); on('#bOpen', () => $('#fileIn').click()); on('#bSave', saveFile);
on('#bUndo', undo); on('#bRedo', redo); on('#bDel', deleteSel); on('#bFront', () => zorder('front')); on('#bBack', () => zorder('back'));
on('#bZin', () => zoomAt(1.2)); on('#bZout', () => zoomAt(1 / 1.2)); on('#bFit', fit);
on('#bLayoutTB', () => { if (!shapes().length) return; pushUndo(); autoLayout('TB', sel.size > 1 ? [...sel].map(byId).filter(i => i && i.k === 'shape') : null); renderAll(); fit(); });
on('#bLayoutLR', () => { if (!shapes().length) return; pushUndo(); autoLayout('LR', sel.size > 1 ? [...sel].map(byId).filter(i => i && i.k === 'shape') : null); renderAll(); fit(); });
on('#bText2D', () => openDSL());
$('#gridSel').addEventListener('change', e => { const v = e.target.value; if (v === 'off') { snapOn = false; } else { snapOn = true; GRID = +v; } applyView(); refreshPanel(); });
on('#bExport', openExport);
function closePopups() { ['#tpl', '#dsl', '#prompt', '#expd'].forEach(s => { const el = $(s); if (el && s !== '#dsl') el.style.display = 'none'; }); }

/* ---------------- text → diagram drawer ---------------- */
const DSL_EXAMPLES = {
  'Flowchart': `flowchart TD\nS([Start]) --> I[/Read n/]\nI --> C{n > 0?}\nC -->|Yes| P[sum = sum + n]\nP --> I\nC -->|No| O[/Print sum/]\nO --> E([End])`,
  'State machine': `stateDiagram\n[*] --> Idle\nIdle --> Running : start\nRunning --> Paused : pause\nPaused --> Running : resume\nRunning --> Idle : stop\nRunning --> [*] : done`,
  'Network': `flowchart TD\nI:internet((Internet)) --> F:firewall[Firewall]\nF --> R:router[Router]\nR --> S:switch[Core switch]\nS --> P1:computer[Lab PC 1]\nS --> P2:computer[Lab PC 2]\nS --> SV:server[File server]\nS --> AP:wifi[Access point]\nAP --> L:laptop[Laptop]`,
  'ER diagram': `flowchart LR\nST:entity[Student] --- EN:relationship{Enrolls} --- CO:entity[Course]\nST --- SID:keyattr((Student_ID))\nST --- SN:attribute((Name))\nCO --- CID:keyattr((Course_ID))\nCO --- CT:attribute((Title))`,
  'Datapath': `flowchart LR\nPC:pc[PC] --> IM:memory[Instruction memory]\nIM --> RF:regfile[Registers]\nRF --> ALU:alu[ALU]\nALU --> DM:memory[Data memory]\nDM --> WB:mux[MUX]\nWB --> RF\nIM --> CU:control((Control))\nCU -.-> ALU\nPC --> ADD:adder[+4]\nADD --> PC`
};
function openDSL() { const d = $('#dsl'); d.style.display = 'flex'; if (!$('#dslText').value) $('#dslText').value = DSL_EXAMPLES['Flowchart']; previewDSL(); $('#dslText').focus(); }
$('#dslEx').innerHTML = Object.keys(DSL_EXAMPLES).map(k => `<button class="chip" data-ex="${k}">${k}</button>`).join('');
$('#dslEx').addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (b) { $('#dslText').value = DSL_EXAMPLES[b.dataset.ex]; previewDSL(); } });
let dslT = 0; $('#dslText').addEventListener('input', () => { clearTimeout(dslT); dslT = setTimeout(previewDSL, 250); });
$('#dslText').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#dslInsert').click(); });
function previewDSL() { const keepP = P, keepDoc = doc; try { const tmp = { id: 'tmp', name: 'tmp', items: [], bg: '#fff' }; P = tmp; const made = buildFromDSL($('#dslText').value, { x: 0, y: 0 }); const svgStr = exportSvgString(); $('#dslPrev').innerHTML = svgStr.replace('<svg ', '<svg style="max-width:100%;max-height:100%" '); $('#dslErr').textContent = `${made.filter(m => m.k === 'shape').length} shapes, ${made.filter(m => m.k === 'edge').length} connectors`; $('#dslErr').className = 'ok'; } catch (err) { $('#dslErr').textContent = err.message; $('#dslErr').className = 'err'; } finally { P = keepP; doc = keepDoc; } }
on('#dslInsert', () => { try { pushUndo(); const r = svg.getBoundingClientRect(); const at = shapes().length ? { x: bboxOf(shapes()).x + bboxOf(shapes()).w + 80, y: bboxOf(shapes()).y } : { x: 40, y: 40 }; const made = buildFromDSL($('#dslText').value, at); sel = new Set(made.map(m => m.id)); $('#dsl').style.display = 'none'; renderAll(); fit(); } catch (err) { undoS.pop(); $('#dslErr').textContent = err.message; $('#dslErr').className = 'err'; } });
on('#dslClose', () => $('#dsl').style.display = 'none');

/* ---------------- templates ---------------- */
const TEMPLATES = {
  'Blank': () => [],
  'Flowchart': () => { buildFromDSL(DSL_EXAMPLES['Flowchart'], { x: 60, y: 40 }); },
  'State machine (FSM)': () => { buildFromDSL(DSL_EXAMPLES['State machine'], { x: 60, y: 40 }); },
  'Half adder (logic)': () => {
    const A = mkShape('input', 60, 80, { text: 'A' }), Bn = mkShape('input', 60, 180, { text: 'B' }), X = mkShape('xor', 220, 66), N = mkShape('and', 220, 186), Sum = mkShape('output', 380, 74, { text: 'S' }), Co = mkShape('output', 380, 194, { text: 'C' });
    const t = mkShape('heading', 60, 10, { text: 'Half adder' }); P.items.push(t, A, Bn, X, N, Sum, Co);
    const E = (a, ap, b, bp) => P.items.push({ id: uid(), k: 'edge', s: { id: a.id, p: ap }, e: { id: b.id, p: bp }, text: '', st: Object.assign({}, DEF_EST, { arrowE: 'none', rounded: 0 }) });
    E(A, 0, X, 0); E(A, 0, N, 0); E(Bn, 0, X, 1); E(Bn, 0, N, 1); E(X, 2, Sum, 0); E(N, 2, Co, 0);
    const tb = mkShape('table3', 470, 66, { w: 180, h: 128 }); tb.t = 'table3'; tb.cells = [['A B', 'S', 'C'], ['0 0', '0', '0'], ['0 1 / 1 0', '1', '0']]; P.items.push(tb);
  },
  'Network topology': () => { buildFromDSL(DSL_EXAMPLES['Network'], { x: 60, y: 40 }); },
  'ER diagram': () => { buildFromDSL(DSL_EXAMPLES['ER diagram'], { x: 60, y: 40 }); },
  'CPU datapath': () => { buildFromDSL(DSL_EXAMPLES['Datapath'], { x: 60, y: 40 }); },
  'Lab report page': () => {
    P.items.push(mkShape('heading', 40, 20, { text: 'Lab 3 — RC low-pass filter', w: 500 }));
    P.items.push(Object.assign(mkShape('text', 40, 66, { text: 'Name: ____________     ID: ________     Date: ________', w: 520 }), {}));
    const obj = mkShape('container', 40, 110, { text: 'Objective', w: 540, h: 90 }); P.items.push(obj); P.items.push(mkShape('text', 52, 140, { text: 'Measure the cut-off frequency of an RC filter and compare it with fc = 1 / (2πRC).', w: 516, h: 50, st: { align: 'left', valign: 'top' } }));
    P.items.push(mkShape('container', 40, 220, { text: 'Block diagram', w: 540, h: 140 }));
    const g = mkShape('vsource', 70, 280, { text: 'Function generator' }), r = mkShape('resistor', 200, 288, { text: 'R = 1 kΩ' }), c = mkShape('capacitor', 330, 285, { text: 'C = 159 nF' }), sc = mkShape('computer', 470, 270, { text: 'Oscilloscope' });
    P.items.push(g, r, c, sc); [[g, r], [r, c], [c, sc]].forEach(([a, b]) => P.items.push({ id: uid(), k: 'edge', s: { id: a.id }, e: { id: b.id }, text: '', st: Object.assign({}, DEF_EST, { arrowE: 'none' }) }));
    const tb = mkShape('table3', 40, 380, { w: 540, h: 110 }); tb.cells = [['Frequency', 'Vin (Vpp)', 'Vout (Vpp)'], ['100 Hz', '', ''], ['1 kHz', '', '']]; P.items.push(tb);
    P.items.push(mkShape('sticky', 600, 110, { text: 'Results and conclusion:\n\n', w: 220, h: 380 }));
  }
};
function openTemplates() { const d = $('#tpl'); d.innerHTML = `<h3>New diagram</h3><div class="tgrid">${Object.keys(TEMPLATES).map(k => `<button class="tcard" data-tpl="${k}"><b>${k}</b></button>`).join('')}</div><div class="row"><span style="flex:1"></span><button class="btn" id="tplClose">Cancel</button></div>`; d.style.display = 'flex'; d.querySelector('#tplClose').onclick = () => d.style.display = 'none'; d.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => { pushUndo(); doc = newDoc(b.dataset.tpl === 'Blank' ? 'Untitled diagram' : b.dataset.tpl); P = doc.pages[0]; TEMPLATES[b.dataset.tpl](); sel.clear(); d.style.display = 'none'; renderAll(); fit(); }); }

/* ---------------- boot ---------------- */
function resize() { applyView(); }
window.addEventListener('resize', resize);
buildLibrary(); setTool('select');
try { const a = localStorage.getItem('cesimdiag.autosave'); if (a && !location.search.includes('blank')) { const d = JSON.parse(a); if (d.format === 'CEsimDiagram') { doc = d; P = doc.pages[doc.cur] || doc.pages[0]; } } } catch (e) { }
if (!P.items.length && !location.search.includes('blank')) { TEMPLATES['Flowchart'](); doc.name = 'Flowchart'; }
renderAll(); setTimeout(fit, 30);
window.CED = { doc: () => doc, P: () => P, buildFromDSL, autoLayout, exportDrawio, importDrawio, exportSvgString, renderAll, fit, openFile, TEMPLATES, setDoc: d => { doc = d; P = doc.pages[0]; renderAll(); fit(); }, sel: () => sel, newDoc };
})();
