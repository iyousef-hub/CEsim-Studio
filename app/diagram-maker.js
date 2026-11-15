/* CEsim Diagram — shape maker: draw an outline point by point or freehand, smooth it, extrude it to 3D, and keep it in My shapes. */
(function () {
  'use strict';
  const C = window.CED; if (!C) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const N = 320, M = 20; // drawing area and margin
  const START = {
    square: [[0, 0], [1, 0], [1, 1], [0, 1]], triangle: [[.5, 0], [1, 1], [0, 1]], star: (() => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .4 : 1; p.push([.5 + Math.cos(a) * .5 * r, .55 + Math.sin(a) * .5 * r]); } return p; })(),
    arrow: [[0, .3], [.6, .3], [.6, 0], [1, .5], [.6, 1], [.6, .7], [0, .7]], house: [[.5, 0], [1, .45], [.85, .45], [.85, 1], [.15, 1], [.15, .45], [0, .45]], blob: [[.2, .1], [.7, 0], [1, .35], [.85, .85], [.4, 1], [0, .6]], gear: (() => { const p = []; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? .38 : .5; p.push([.5 + Math.cos(a) * r, .5 + Math.sin(a) * r]); } return p; })(),
  };
  let st = null;
  function open() {
    st = { pts: START.house.map(([x, y]) => [x * N * .7 + N * .15, y * N * .7 + N * .15]), closed: true, curved: false, d3: false, depth: 18, mode: 'points', drag: -1, free: null, name: 'My shape' };
    const ov = document.createElement('div'); ov.id = 'maker'; ov.innerHTML = `<div class="mk" role="dialog" aria-label="Shape maker"><div class="row"><b style="font-size:15px">Shape maker</b><span style="flex:1"></span><button class="btn" id="mkX">Cancel</button><button class="btn pri" id="mkOk">Save to My shapes</button></div>
    <div class="mkb"><div><div class="bgrp wide"><button data-mm="points" class="on">Points</button><button data-mm="free">Freehand</button><button data-mm="clear">Clear</button></div><svg id="mkc" width="${N + 2 * M}" height="${N + 2 * M}" viewBox="${-M} ${-M} ${N + 2 * M} ${N + 2 * M}"></svg><div class="muted" id="mkHint"></div></div>
    <div class="mkr"><label class="lab">Name</label><input id="mkName" class="pin" value="My shape"><label class="lab">Start from</label><div class="mkst">${Object.keys(START).map(k => `<button data-start="${k}" title="${k}"><svg viewBox="-2 -2 28 28" width="26" height="26"><path d="${window.CED_CUSTOM.polyPath(START[k], 24, 24, true, k === 'blob')}" fill="#dbe7f6" stroke="#185fa5" stroke-width="1.4"/></svg></button>`).join('')}</div>
    <label class="chk"><input type="checkbox" id="mkClosed" checked> Closed outline</label><label class="chk"><input type="checkbox" id="mkCurve"> Smooth curves</label><label class="chk"><input type="checkbox" id="mk3d"> Make it 3D (extrude)</label><div class="frow" id="mkDepthRow" style="display:none"><label>Depth</label><input type="range" id="mkDepth" min="4" max="60" value="18"></div>
    <label class="lab">Preview</label><div id="mkPrev"></div></div></div></div>`;
    document.body.appendChild(ov);
    const q = s => ov.querySelector(s); const svg = q('#mkc');
    const toP = ev => { const r = svg.getBoundingClientRect(); const k = (N + 2 * M) / r.width; const x = (ev.clientX - r.left) * k - M, y = (ev.clientY - r.top) * k - M; const g = 10; return [Math.round(Math.max(0, Math.min(N, x)) / (ev.altKey ? 1 : g)) * (ev.altKey ? 1 : g), Math.round(Math.max(0, Math.min(N, y)) / (ev.altKey ? 1 : g)) * (ev.altKey ? 1 : g)]; };
    const norm = () => { const xs = st.pts.map(p => p[0]), ys = st.pts.map(p => p[1]); const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(1, Math.max(...xs) - x0), h = Math.max(1, Math.max(...ys) - y0); return { pts: st.pts.map(([x, y]) => [+((x - x0) / w).toFixed(4), +((y - y0) / h).toFixed(4)]), w, h }; };
    function draw() {
      let g = ''; for (let i = 0; i <= N; i += 20) g += `<line x1="${i}" y1="0" x2="${i}" y2="${N}" stroke="#e6ebf2"/><line x1="0" y1="${i}" x2="${N}" y2="${i}" stroke="#e6ebf2"/>`;
      const n = st.pts.length; const d = n ? window.CED_CUSTOM.polyPath(st.pts.map(([x, y]) => [x / N, y / N]), N, N, st.closed && n > 2, st.curved) : '';
      g += `<path d="${d}" fill="${st.closed && n > 2 ? '#dbe7f6' : 'none'}" fill-opacity="0.7" stroke="#185fa5" stroke-width="2"/>`;
      if (st.free) g += `<path d="M${st.free.map(p => p.join(',')).join(' L')}" fill="none" stroke="#c27c0e" stroke-width="2"/>`;
      st.pts.forEach(([x, y], i) => g += `<circle data-pi="${i}" cx="${x}" cy="${y}" r="${i === 0 ? 7 : 5.5}" fill="${i === 0 ? '#185fa5' : '#fff'}" stroke="#185fa5" stroke-width="2" style="cursor:move"/>`);
      svg.innerHTML = g;
      q('#mkHint').textContent = st.mode === 'points' ? 'Click to add a point, drag a point to move it, double-click a point to remove it. Hold Alt to place off the grid.' : 'Draw the outline in one stroke. It is tidied into points you can then move.';
      // preview in the size it will have
      const nm = norm(); if (nm.pts.length >= 2) { const def = { id: 'preview', name: 'Preview', kind: 'poly', pts: nm.pts, closed: st.closed, curved: st.curved, d3: st.d3 ? { depth: st.depth } : null, w: 120, h: Math.round(120 * nm.h / nm.w) || 80 }; window.CED_CUSTOM.register(def); const s = C.mkShape('my_preview', 0, 0); s.w = def.w; s.h = Math.max(20, Math.min(160, def.h)); s.st.fill = '#dbe7f6'; s.st.stroke = '#185fa5'; q('#mkPrev').innerHTML = `<svg viewBox="-6 -6 ${s.w + 12} ${s.h + 12}" width="${s.w + 12}" height="${s.h + 12}">${C.shapeSvg(s, true)}</svg>`; }
    }
    svg.addEventListener('pointerdown', ev => { svg.setPointerCapture(ev.pointerId); const t = ev.target; if (t.dataset.pi != null) { st.drag = +t.dataset.pi; if (ev.detail >= 2 && st.pts.length > 2) { st.pts.splice(st.drag, 1); st.drag = -1; draw(); } return; } const p = toP(ev); if (st.mode === 'free') { st.free = [p]; return; } st.pts.push(p); draw(); });
    svg.addEventListener('pointermove', ev => { if (st.drag >= 0) { st.pts[st.drag] = toP(ev); draw(); } else if (st.free) { st.free.push(toP(Object.assign({}, { clientX: ev.clientX, clientY: ev.clientY, altKey: true }))); draw(); } });
    svg.addEventListener('pointerup', () => { st.drag = -1; if (st.free) { const pts = st.free.map(([x, y]) => ({ x, y })); st.free = null; if (pts.length > 4) { const simp = rdp(pts, 6); st.pts = simp.map(p => [Math.round(p.x), Math.round(p.y)]); const a = st.pts[0], z = st.pts[st.pts.length - 1]; if (Math.hypot(a[0] - z[0], a[1] - z[1]) < 30 && st.pts.length > 3) st.pts.pop(); st.mode = 'points'; ov.querySelectorAll('[data-mm]').forEach(b => b.classList.toggle('on', b.dataset.mm === 'points')); } draw(); } });
    ov.querySelectorAll('[data-mm]').forEach(b => b.onclick = () => { if (b.dataset.mm === 'clear') { st.pts = []; draw(); return; } st.mode = b.dataset.mm; ov.querySelectorAll('[data-mm]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    ov.querySelectorAll('[data-start]').forEach(b => b.onclick = () => { const k = b.dataset.start; st.pts = START[k].map(([x, y]) => [Math.round(x * N * .8 + N * .1), Math.round(y * N * .8 + N * .1)]); st.curved = k === 'blob'; q('#mkCurve').checked = st.curved; q('#mkName').value = k[0].toUpperCase() + k.slice(1); draw(); });
    q('#mkClosed').onchange = e => { st.closed = e.target.checked; draw(); }; q('#mkCurve').onchange = e => { st.curved = e.target.checked; draw(); };
    q('#mk3d').onchange = e => { st.d3 = e.target.checked; if (st.d3) { st.closed = true; q('#mkClosed').checked = true; } q('#mkDepthRow').style.display = st.d3 ? 'flex' : 'none'; draw(); }; q('#mkDepth').oninput = e => { st.depth = +e.target.value; draw(); };
    q('#mkName').addEventListener('keydown', e => e.stopPropagation());
    const close = () => { ov.remove(); delete C.S['my_preview']; };
    q('#mkX').onclick = close; ov.addEventListener('keydown', e => { if (e.key === 'Escape') close(); e.stopPropagation(); });
    q('#mkOk').onclick = () => { if (st.pts.length < (st.closed ? 3 : 2)) { C.toast('Add at least three points.', true); return; } const nm = norm(); const w = 120, h = Math.max(30, Math.min(200, Math.round(120 * nm.h / nm.w))); const def = { id: C.uid(), name: q('#mkName').value.trim() || 'My shape', kind: 'poly', pts: nm.pts, closed: st.closed, curved: st.curved, d3: st.d3 ? { depth: st.depth } : null, w, h };
      const key = C.addMyShape(def); close(); C.pushUndo(); const c = C.viewCenter(); const s = C.mkShape(key, C.snapV(c.x - w / 2), C.snapV(c.y - h / 2)); C.P().items.push(s); C.select([s.id]); C.toast(`Saved "${def.name}" in My shapes.`); };
    draw();
  }
  function rdp(pts, eps) { if (pts.length < 3) return pts; let dm = 0, ix = 0; const a = pts[0], b = pts[pts.length - 1]; for (let i = 1; i < pts.length - 1; i++) { const p = pts[i]; const d = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x) / (Math.hypot(b.y - a.y, b.x - a.x) || 1); if (d > dm) { dm = d; ix = i; } } if (dm > eps) { const l = rdp(pts.slice(0, ix + 1), eps), r = rdp(pts.slice(ix), eps); return l.slice(0, -1).concat(r); } return [a, b]; }
  const css = document.createElement('style'); css.textContent = `#maker{position:fixed;inset:0;z-index:80;background:rgba(15,20,30,.35);display:grid;place-items:center}#maker .mk{background:#fff;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,.3);padding:14px 16px;display:flex;flex-direction:column;gap:10px}#maker .mkb{display:flex;gap:16px}#maker svg#mkc{display:block;margin-top:6px;border:1px solid var(--line);border-radius:6px;background:#fbfcfe;touch-action:none;cursor:crosshair}#maker .mkr{width:230px;display:flex;flex-direction:column;gap:6px}#maker .lab{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);margin-top:6px}#maker .mkst{display:flex;flex-wrap:wrap;gap:4px}#maker .mkst button{border:1px solid var(--line);background:#fff;border-radius:5px;cursor:pointer;padding:2px}#maker .mkst button:hover{border-color:var(--sel)}#maker #mkPrev{min-height:120px;border:1px dashed var(--line);border-radius:6px;display:grid;place-items:center;padding:6px}#maker #mkHint{max-width:${N + 2 * M}px;margin-top:6px}`;
  document.head.appendChild(css);
  window.CED_MAKER = { open };
})();
