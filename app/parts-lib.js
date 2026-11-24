/* CEsim parts catalog: one list of real parts, each with its package, pins and size.
   From it every tool builds its own view: a schematic symbol (Circuit), a breadboard view (Breadboard),
   a footprint (PCB) and a 3D model (3D). Parts that a tool can simulate are tied to that tool's model. */
(function (root) {
  'use strict';
  const LIST = [], BY = {};
  /* ---------------- packages ---------------- */
  // kind: dip | sip | gull (2 rows, SMD) | quad (4 sides, SMD) | qfn | bga | pga | to92 | to220 | to247 | tocan | sot | chip | axial | radial | disc | box | coil | module | can4
  const CHIP = { '0201': [0.6, 0.3, 0.3], '0402': [1.0, 0.5, 0.5], '0603': [1.6, 0.8, 0.8], '0805': [2.0, 1.25, 0.8], '1206': [3.2, 1.6, 0.9], '1210': [3.2, 2.5, 1.2], '1812': [4.5, 3.2, 1.5], '2010': [5.0, 2.5, 0.6], '2512': [6.4, 3.2, 0.6] };
  function pkgSpec(id) {
    let m;
    const S = (o) => Object.assign({ id, label: id }, o);
    if ((m = /^DIP-(\d+)(W?)$/.exec(id))) { const n = +m[1], wide = !!m[2]; return S({ kind: 'dip', n, pitch: 2.54, row: wide ? 15.24 : 7.62, dims: [n / 2 * 2.54 + 1.2, wide ? 13.9 : 6.35, 3.3] }); }
    if ((m = /^SIP-(\d+)$/.exec(id))) { const n = +m[1]; return S({ kind: 'sip', n, pitch: 2.54, dims: [n * 2.54, 2.6, 6] }); }
    if ((m = /^PGA-(\d+)$/.exec(id))) { const n = +m[1], k = Math.ceil(Math.sqrt(n)) + 1; return S({ kind: 'pga', n, pitch: 2.54, dims: [k * 2.54 + 2, k * 2.54 + 2, 2.8] }); }
    if ((m = /^(SOIC|SOP|SSOP|TSSOP|MSOP|SO|TSOP)-(\d+)(W?)$/.exec(id))) {
      const t = m[1], n = +m[2], wide = !!m[3]; const p = { SOIC: 1.27, SOP: 1.27, SO: 1.27, SSOP: 0.65, TSSOP: 0.65, MSOP: 0.5, TSOP: 0.5 }[t]; const bw = t === 'TSOP' ? 18.4 : wide ? 7.5 : { SOIC: 3.9, SOP: 5.3, SO: 3.9, SSOP: 5.3, TSSOP: 4.4, MSOP: 3.0 }[t];
      const h = { SOIC: 1.75, SOP: 1.9, SO: 1.75, SSOP: 1.85, TSSOP: 1.1, MSOP: 1.1, TSOP: 1.2 }[t];
      return S({ kind: 'gull', n, pitch: t === 'MSOP' && n <= 8 ? 0.65 : p, span: bw + (t === 'TSOP' ? 1.6 : 2.1), dims: [n / 2 * (t === 'MSOP' && n <= 8 ? 0.65 : p) + 0.9, bw, h] });
    }
    if ((m = /^(LQFP|TQFP|QFP)-(\d+)$/.exec(id))) { const n = +m[2], side = n / 4; const p = m[1] === 'TQFP' && n <= 44 ? 0.8 : m[1] === 'QFP' ? 0.65 : 0.5; const b = Math.round((side * p + 1.5) * 2) / 2; return S({ kind: 'quad', n, pitch: p, body: b, dims: [b + 2, b + 2, 1.6] }); }
    if ((m = /^(QFN|VQFN|LFCSP|DFN|WSON|UDFN|aQFN)-(\d+)$/.exec(id))) {
      const n = +m[2]; if (/DFN|WSON/.test(m[1])) { const p = n <= 8 ? 0.5 : 0.4; return S({ kind: 'dfn', n, pitch: p, dims: [3, Math.max(2, n / 2 * p + 0.6), 0.8] }); }
      const side = Math.ceil(n / 4), p = n > 64 ? 0.4 : 0.5; const b = Math.max(3, Math.round((side * p + 1) * 2) / 2); return S({ kind: 'qfn', n, pitch: p, body: b, dims: [b, b, 0.9] });
    }
    if ((m = /^(BGA|FBGA|LGA|WLCSP)-(\d+)(?:@([\d.]+)x([\d.]+))?$/.exec(id))) {
      const n = +m[2]; const k = Math.ceil(Math.sqrt(n)); const p = m[1] === 'WLCSP' ? 0.4 : m[1] === 'LGA' ? 0.5 : n > 300 ? 0.8 : 1.0;
      const w = m[3] ? +m[3] : k * p + 1.2, d = m[4] ? +m[4] : w; return S({ kind: m[1] === 'LGA' ? 'lga' : 'bga', n, pitch: p, cols: k, dims: [w, d, m[1] === 'WLCSP' ? 0.5 : m[1] === 'LGA' ? 0.9 : 1.4] });
    }
    switch (id) {
      case 'TO-92': return S({ kind: 'to92', n: 3, pitch: 2.54, dims: [4.8, 3.8, 4.8] });
      case 'TO-92-2': return S({ kind: 'to92', n: 2, pitch: 2.54, dims: [4.8, 3.8, 4.8] });
      case 'TO-220': return S({ kind: 'to220', n: 3, pitch: 2.54, dims: [10.2, 4.6, 15.5] });
      case 'TO-220-5': return S({ kind: 'to220', n: 5, pitch: 1.7, dims: [10.2, 4.6, 15.5] });
      case 'TO-247': return S({ kind: 'to247', n: 3, pitch: 5.45, dims: [15.9, 5.0, 21] });
      case 'TO-18': return S({ kind: 'tocan', n: 3, pitch: 2.54, dims: [5.6, 5.6, 4.8] });
      case 'TO-39': return S({ kind: 'tocan', n: 3, pitch: 2.54, dims: [9.2, 9.2, 6.6] });
      case 'SOT-23': return S({ kind: 'sot', n: 3, pitch: 0.95, dims: [2.9, 1.3, 1.1] });
      case 'SOT-23-5': return S({ kind: 'sot', n: 5, pitch: 0.95, dims: [2.9, 1.6, 1.2] });
      case 'SOT-23-6': return S({ kind: 'sot', n: 6, pitch: 0.95, dims: [2.9, 1.6, 1.2] });
      case 'SOT-143': return S({ kind: 'sot', n: 4, pitch: 1.9, dims: [2.9, 1.3, 1.1] });
      case 'SC-70-5': return S({ kind: 'sot', n: 5, pitch: 0.65, dims: [2.0, 1.25, 0.95] });
      case 'SOT-223': return S({ kind: 'sot223', n: 3, pitch: 2.3, dims: [6.5, 3.5, 1.6] });
      case 'DPAK': return S({ kind: 'dpak', n: 3, pitch: 2.28, dims: [6.6, 6.1, 2.3] });
      case 'D2PAK': return S({ kind: 'dpak', n: 3, pitch: 2.54, dims: [10.2, 9.2, 4.4] });
      case 'SOD-123': return S({ kind: 'chip2', n: 2, dims: [2.7, 1.6, 1.1] });
      case 'SOD-323': return S({ kind: 'chip2', n: 2, dims: [1.7, 1.25, 0.95] });
      case 'SMA': return S({ kind: 'chip2', n: 2, dims: [4.3, 2.6, 2.3], band: 1 });
      case 'SMB': return S({ kind: 'chip2', n: 2, dims: [4.6, 3.6, 2.3], band: 1 });
      case 'SMC': return S({ kind: 'chip2', n: 2, dims: [7.0, 6.0, 2.3], band: 1 });
      case 'DO-35': return S({ kind: 'axial', n: 2, body: [4.0, 1.9], lead: 7.62, glass: 1, dims: [4.0, 1.9, 1.9] });
      case 'DO-41': return S({ kind: 'axial', n: 2, body: [5.2, 2.7], lead: 10.16, band: 1, dims: [5.2, 2.7, 2.7] });
      case 'DO-15': return S({ kind: 'axial', n: 2, body: [7.6, 3.5], lead: 12.7, band: 1, dims: [7.6, 3.5, 3.5] });
      case 'DO-201': return S({ kind: 'axial', n: 2, body: [9.5, 5.3], lead: 15.24, band: 1, dims: [9.5, 5.3, 5.3] });
      case 'AX-0.25W': return S({ kind: 'axial', n: 2, body: [6.3, 2.5], lead: 10.16, dims: [6.3, 2.5, 2.5] });
      case 'AX-0.5W': return S({ kind: 'axial', n: 2, body: [9.0, 3.2], lead: 12.7, dims: [9.0, 3.2, 3.2] });
      case 'AX-1W': return S({ kind: 'axial', n: 2, body: [11.0, 4.5], lead: 15.24, dims: [11.0, 4.5, 4.5] });
      case 'AX-2W': return S({ kind: 'axial', n: 2, body: [15.0, 5.0], lead: 20.32, dims: [15.0, 5.0, 5.0] });
      case 'AX-L': return S({ kind: 'axial', n: 2, body: [9.0, 4.0], lead: 12.7, dims: [9.0, 4.0, 4.0] });
      case 'AX-BEAD': return S({ kind: 'axial', n: 2, body: [6.0, 3.5], lead: 10.16, dims: [6.0, 3.5, 3.5] });
      case 'CEMENT-5W': return S({ kind: 'box', n: 2, axialLeads: 1, pitch: 25.4, dims: [22, 10, 9] });
      case 'CEMENT-10W': return S({ kind: 'box', n: 2, axialLeads: 1, pitch: 50.8, dims: [48, 10, 9] });
      case 'ALU-25W': return S({ kind: 'box', n: 2, chassis: 1, pitch: 30, dims: [40, 27, 14] });
      case 'DISC-5': return S({ kind: 'disc', n: 2, pitch: 5.08, dims: [5, 2.5, 6] });
      case 'DISC-10': return S({ kind: 'disc', n: 2, pitch: 7.5, dims: [10, 4, 12] });
      case 'DISC-14': return S({ kind: 'disc', n: 2, pitch: 7.5, dims: [16, 5, 18] });
      case 'RAD-5x11': return S({ kind: 'radial', n: 2, pitch: 2.0, dims: [5, 5, 11] });
      case 'RAD-6x11': return S({ kind: 'radial', n: 2, pitch: 2.5, dims: [6.3, 6.3, 11] });
      case 'RAD-8x12': return S({ kind: 'radial', n: 2, pitch: 3.5, dims: [8, 8, 12] });
      case 'RAD-10x16': return S({ kind: 'radial', n: 2, pitch: 5.0, dims: [10, 10, 16] });
      case 'RAD-13x25': return S({ kind: 'radial', n: 2, pitch: 5.0, dims: [13, 13, 25] });
      case 'RAD-22x40': return S({ kind: 'radial', n: 2, pitch: 10.0, dims: [22, 22, 40], snap: 1 });
      case 'RAD-10x30': return S({ kind: 'radial', n: 2, pitch: 5.0, dims: [10, 10, 30] });
      case 'RAD-22x45': return S({ kind: 'radial', n: 2, pitch: 10.0, dims: [22, 22, 45] });
      case 'CAN-SMD-6': return S({ kind: 'cansmd', n: 2, dims: [6.6, 6.6, 5.4] });
      case 'COIN-21': return S({ kind: 'coincap', n: 2, pitch: 20, dims: [21.5, 21.5, 7.5] });
      case 'TANT-RAD': return S({ kind: 'drop', n: 2, pitch: 2.54, dims: [4.5, 3.0, 7.5] });
      case 'TANT-A': return S({ kind: 'chip2', n: 2, dims: [3.2, 1.6, 1.6], band: 2 });
      case 'TANT-B': return S({ kind: 'chip2', n: 2, dims: [3.5, 2.8, 1.9], band: 2 });
      case 'TANT-C': return S({ kind: 'chip2', n: 2, dims: [6.0, 3.2, 2.6], band: 2 });
      case 'TANT-D': return S({ kind: 'chip2', n: 2, dims: [7.3, 4.3, 2.9], band: 2 });
      case 'BOX-P5': return S({ kind: 'box', n: 2, pitch: 5.08, dims: [7.2, 2.5, 6.5] });
      case 'BOX-P7.5': return S({ kind: 'box', n: 2, pitch: 7.62, dims: [10, 4, 9] });
      case 'BOX-P15': return S({ kind: 'box', n: 2, pitch: 15.24, dims: [18, 8.5, 14] });
      case 'MICA': return S({ kind: 'disc', n: 2, pitch: 5.08, dims: [9, 4, 9] });
      case 'TRIMCAP': return S({ kind: 'box', n: 2, pitch: 5.08, dims: [5, 4.5, 3] });
      case 'VARCAP-AIR': return S({ kind: 'box', n: 3, pitch: 5.08, dims: [20, 20, 12] });
      case 'POT-16': return S({ kind: 'pot', n: 3, pitch: 5.08, dims: [16, 16, 25] });
      case 'POT-24': return S({ kind: 'pot', n: 3, pitch: 5.08, dims: [24, 24, 30] });
      case 'POT-DUAL': return S({ kind: 'pot', n: 6, pitch: 5.08, dims: [16, 20, 25] });
      case 'SLIDE-45': return S({ kind: 'box', n: 3, pitch: 5.08, dims: [58, 9, 7] });
      case 'TRIM-3296': return S({ kind: 'box', n: 3, pitch: 2.54, dims: [9.5, 4.8, 10] });
      case 'TRIM-3362': return S({ kind: 'box', n: 3, pitch: 2.54, dims: [6.6, 7, 4.5] });
      case 'HC-49': return S({ kind: 'xtal', n: 2, pitch: 4.88, dims: [11, 4.6, 3.5] });
      case 'HC-49SMD': return S({ kind: 'xtalsmd', n: 2, dims: [11.4, 4.7, 4.2] });
      case 'XTAL-FORK': return S({ kind: 'axialv', n: 2, pitch: 1.0, dims: [2, 2, 6] });
      case 'XTAL-3225': return S({ kind: 'can4', n: 4, dims: [3.2, 2.5, 0.8] });
      case 'XO-5032': return S({ kind: 'can4', n: 4, dims: [5, 3.2, 1.2] });
      case 'XO-7050': return S({ kind: 'can4', n: 4, dims: [7, 5, 1.6] });
      case 'XO-DIP14': return S({ kind: 'xodip', n: 4, row: 15.24, len: 7.62 * 2, dims: [20.2, 13, 6] });
      case 'XO-DIP8': return S({ kind: 'xodip', n: 4, row: 7.62, len: 7.62, dims: [13, 13, 5] });
      case 'RES-3': return S({ kind: 'box', n: 3, pitch: 2.54, dims: [7, 3, 6.5] });
      case 'IND-RAD': return S({ kind: 'drum', n: 2, pitch: 5.0, dims: [8, 8, 10] });
      case 'IND-CD54': return S({ kind: 'smdind', n: 2, dims: [5.8, 5.2, 4.5] });
      case 'IND-1210': return S({ kind: 'chip2', n: 2, dims: [3.2, 2.5, 2.0] });
      case 'TOROID-20': return S({ kind: 'toroid', n: 2, pitch: 10, dims: [20, 20, 10] });
      case 'CMC-4': return S({ kind: 'box', n: 4, grid: [2, 2], pitch: 7.5, dims: [12, 12, 13] });
      case 'COUPLED-SMD': return S({ kind: 'smdind', n: 4, dims: [12.5, 12.5, 8] });
      case 'AIRCOIL': return S({ kind: 'aircoil', n: 2, pitch: 10.16, dims: [10, 6, 6] });
      case 'EI-30': return S({ kind: 'xfmr', n: 4, dims: [30, 25, 27] });
      case 'EI-48': return S({ kind: 'xfmr', n: 4, dims: [48, 40, 42] });
      case 'EI-14': return S({ kind: 'xfmr', n: 5, dims: [14, 12, 11] });
      case 'PULSE-XF': return S({ kind: 'box', n: 4, grid: [2, 2], pitch: 7.62, dims: [12, 10, 9] });
      case 'CT-RING': return S({ kind: 'toroid', n: 2, pitch: 5, dims: [25, 25, 12] });
      case 'VARIAC': return S({ kind: 'toroid', n: 3, pitch: 20, dims: [110, 110, 80] });
      case 'RELAY-SRD': return S({ kind: 'relay', n: 5, dims: [19, 15.5, 15.5] });
      case 'RELAY-DIP': return S({ kind: 'dip', n: 8, pitch: 2.54, row: 7.62, dims: [20, 10, 10], tall: 1 });
      case 'FUSE-5x20': return S({ kind: 'fuse', n: 2, pitch: 22.6, dims: [26, 8, 10] });
      case 'FUSE-BLADE': return S({ kind: 'box', n: 2, pitch: 5.08, dims: [19, 5, 18.5] });
      case 'BREAKER-DIN': return S({ kind: 'din', n: 2, dims: [18, 70, 85] });
      case 'CONTACTOR-DIN': return S({ kind: 'din', n: 8, dims: [45, 75, 80] });
      case 'SSR-CHASSIS': return S({ kind: 'chassis', n: 4, dims: [58, 45, 23] });
      case 'GDT-2': return S({ kind: 'axial', n: 2, body: [6, 8], lead: 10.16, dims: [6, 8, 8] });
      case 'BRIDGE-DIP4': return S({ kind: 'dip', n: 4, pitch: 2.54, row: 7.62, dims: [8.3, 6.3, 3.3] });
      case 'BRIDGE-KBP': return S({ kind: 'sip', n: 4, pitch: 3.81, dims: [14.5, 3.6, 10.2] });
      case 'BRIDGE-GBU': return S({ kind: 'sip', n: 4, pitch: 5.08, dims: [22, 3.6, 18] });
      case 'BRIDGE-KBPC': return S({ kind: 'chassis', n: 4, dims: [28.6, 28.6, 11] });
      case 'LASER-5.6': return S({ kind: 'tocan', n: 3, pitch: 2.0, dims: [5.6, 5.6, 4] });
      case 'PHOTO-2': return S({ kind: 'box', n: 2, pitch: 5.08, dims: [5.4, 4.3, 3.2] });
      case 'GaNPX': return S({ kind: 'qfn', n: 4, pitch: 3, body: 7, dims: [7.6, 4.6, 0.5] });
      case 'SD': return S({ kind: 'card', n: 9, dims: [32, 24, 2.1] });
      case 'MICROSD': return S({ kind: 'card', n: 8, dims: [15, 11, 1] });
      case 'USB-STICK': return S({ kind: 'box', n: 4, dims: [45, 15, 7] });
      case 'M.2-2280': return S({ kind: 'module', n: 4, dims: [80, 22, 2.4], pcb: '#1d1d1d' });
      case 'SSD-2.5': return S({ kind: 'box', n: 4, dims: [100, 70, 7] });
    }
    if ((m = /^MOD-([\d.]+)x([\d.]+)(?:x([\d.]+))?$/.exec(id))) return S({ kind: 'module', dims: [+m[1], +m[2], m[3] ? +m[3] : 1.6 + 8.5] });
    if ((m = /^CHIP-(\d{4})$/.exec(id))) return S({ kind: 'chip2', n: 2, dims: CHIP[m[1]] || [2, 1.25, 0.8] });
    if ((m = /^CHIP4-(\d{4})$/.exec(id))) return S({ kind: 'chip2', n: 4, dims: CHIP[m[1]] || [6.4, 3.2, 0.6] });
    return S({ kind: 'module', dims: [20, 15, 5] });
  }
  /* ---------------- the catalog ---------------- */
  const SEC = { P: 'Passive components', D: 'Discretes and protection', A: 'Analog and mixed-signal ICs', L: 'Logic, timing and memory', M: 'Processors and boards', K: 'Packages' };
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  function P(sec, grp, name, pkg, pins, o) {
    o = o || {}; const key = 'pl:' + slug(o.id || name);
    if (BY[key]) throw new Error('Duplicate part ' + key + ' (' + name + ')');
    const spec = pkgSpec(pkg); let pn = Array.isArray(pins) ? pins : typeof pins === 'string' ? pins.split(/\s+/).filter(Boolean) : null;
    if (!pn) { const n = typeof pins === 'number' ? pins : spec.n || 2; pn = Array.from({ length: n }, (_, i) => String(i + 1)); }
    const oo = Object.assign({}, o); delete oo.pins; delete oo.id;
    const e = Object.assign({ key, name, sec: SEC[sec], grp, pkg, spec, pins: pn, dims: o.dims || spec.dims }, oo);
    e.color = o.color || defColor(spec, grp); e.mark = o.mark || shortMark(name);
    LIST.push(e); BY[key] = e; return e;
  }
  function shortMark(n) { const m = /^([A-Z0-9][A-Z0-9\-./+]{2,})/.exec(n); return m ? m[1] : n.split(/[ ,(]/)[0]; }
  function defColor(s, g) {
    switch (s.kind) {
      case 'axial': return /Resistor|resistor/.test(g) ? '#d8c49a' : s.glass ? '#e9a03b' : '#1b1b1b';
      case 'radial': return '#1f3f8c'; case 'disc': return '#d9822b'; case 'box': return '#c9b23a';
      case 'module': return '#1f5fae'; case 'toroid': return '#3d3d3d'; case 'xtal': case 'xtalsmd': case 'can4': case 'xodip': case 'tocan': return '#c9ccd1';
      default: return '#1d1d1d';
    }
  }
  const pinsOf = (s) => s;
  /* ---- 1. passive components ---- */
  const R = (name, pkg, o) => P('P', 'Resistors', name, pkg, '1 2', Object.assign({ bb: ['resistor', { ohms: o && o.ohms || 1000 }], cir: ['res', { resistance: o && o.r || '1k' }] }, o));
  R('Carbon film resistor, 1/4 W', 'AX-0.25W', { color: '#d8c49a' });
  R('Metal film resistor 1 %, 1/4 W', 'AX-0.25W', { color: '#4f86c6', cir: ['res', { resistance: '1k', tol: '1%' }] });
  R('Precision resistor 0.1 %, 1/4 W', 'AX-0.25W', { color: '#2e8b57', cir: ['res', { resistance: '10k', tol: '0.1%' }], ohms: 10000 });
  R('Carbon composition resistor, 1/2 W', 'AX-0.5W', { color: '#8b5a2b', cir: ['res', { resistance: '1k', power: '0.5W' }] });
  R('Metal oxide resistor, 1 W', 'AX-1W', { color: '#4a90d9', cir: ['res', { resistance: '100', power: '1W' }], ohms: 100 });
  R('Metal oxide resistor, 2 W', 'AX-2W', { color: '#4a90d9', cir: ['res', { resistance: '47', power: '2W' }], ohms: 47 });
  R('Cement power resistor, 5 W', 'CEMENT-5W', { color: '#efefe6', cir: ['res', { resistance: '10', power: '5W' }], ohms: 10 });
  R('Cement power resistor, 10 W', 'CEMENT-10W', { color: '#efefe6', cir: ['res', { resistance: '4.7', power: '10W' }], ohms: 4.7 });
  R('Aluminium-housed power resistor, 25 W', 'ALU-25W', { color: '#d4af37', cir: ['res', { resistance: '1', power: '10W' }], ohms: 1 });
  for (const c of ['0201', '0402', '0603', '0805', '1206', '2512']) R('Chip resistor ' + c, 'CHIP-' + c, { color: '#1d1d1d' });
  R('Current-sense shunt 2512, 10 mΩ', 'CHIP-2512', { id: 'shunt 2512', r: '10m', ohms: 0.01, color: '#2b2b2b' });
  P('P', 'Resistors', 'Kelvin current-sense shunt 2512, 4 terminals', 'CHIP4-2512', 'I+ S+ S- I-', { color: '#2b2b2b' });
  P('P', 'Resistors', 'Panel shunt 75 mV, 50 A', 'MOD-60x15x12', 'I+ S+ S- I-', { color: '#b8a77a' });
  P('P', 'Resistors', 'Resistor network SIP-9, bussed (4609X)', 'SIP-9', 'COM R1 R2 R3 R4 R5 R6 R7 R8', { color: '#e3c060' });
  P('P', 'Resistors', 'Resistor array DIP-16, isolated (4116R)', 'DIP-16', 16, { color: '#1d1d1d' });
  P('P', 'Resistors', 'Rotary potentiometer 16 mm', 'POT-16', 'END1 WIPER END2', { bb: ['pot', { ohms: 10000 }], cir: ['pot', { resistance: '10k' }], color: '#2b3a55' });
  P('P', 'Resistors', 'Panel potentiometer 24 mm', 'POT-24', 'END1 WIPER END2', { bb: ['pot', { ohms: 100000 }], cir: ['pot', { resistance: '100k' }], color: '#2b3a55' });
  P('P', 'Resistors', 'Dual-gang stereo potentiometer', 'POT-DUAL', 'A1 AW A2 B1 BW B2', { color: '#2b3a55' });
  P('P', 'Resistors', 'Slide potentiometer 45 mm', 'SLIDE-45', 'END1 WIPER END2', { bb: ['pot', { ohms: 10000 }], cir: ['pot', { resistance: '10k' }], color: '#333' });
  P('P', 'Resistors', 'Multi-turn trimmer 3296W', 'TRIM-3296', 'END1 WIPER END2', { bb: ['pot', { ohms: 10000 }], cir: ['pot', { resistance: '10k' }], color: '#1f5fae' });
  P('P', 'Resistors', 'Single-turn trimmer 3362P', 'TRIM-3362', 'END1 WIPER END2', { bb: ['pot', { ohms: 10000 }], cir: ['pot', { resistance: '10k' }], color: '#1f5fae' });
  P('P', 'Resistors', 'MCP4131 digital potentiometer (SPI)', 'DIP-8', 'CS SCK SDI/SDO VSS P0A P0W P0B VDD');
  P('P', 'Resistors', 'X9C103 digital potentiometer (up/down)', 'DIP-8', 'INC U/D VH VSS VW VL CS VCC');
  P('P', 'Resistors', 'MCP41010 digital potentiometer (SPI)', 'SOIC-8', 'CS SCK SI VSS PA0 PW0 PB0 VDD');
  P('P', 'Resistors', 'AD5241 digital potentiometer (I2C)', 'SOIC-14', 14);
  // special-purpose resistors
  P('P', 'Special resistors', 'GL5528 photoresistor (LDR), 5 mm', 'PHOTO-2', '1 2', { bb: ['ldr', {}], cir: ['ldr', {}], color: '#e9d7b0' });
  P('P', 'Special resistors', 'GL12537 photoresistor (LDR), 12 mm', 'DISC-14', '1 2', { bb: ['ldr', { dark: 2e6, bright: 3e3 }], cir: ['ldr', { rdark: '2M', rlight: '3k' }], color: '#e9d7b0' });
  P('P', 'Special resistors', 'NTC thermistor 10 kΩ, bead', 'DISC-5', '1 2', { bb: ['resistor', { ohms: 10000 }], cir: ['res', { resistance: '10k' }], color: '#222' });
  P('P', 'Special resistors', 'NTC thermistor 100 kΩ, glass (3D printer)', 'DO-35', '1 2', { id: 'ntc 100k glass', bb: ['resistor', { ohms: 100000 }], cir: ['res', { resistance: '100k' }] });
  P('P', 'Special resistors', 'NTC inrush current limiter 5D-15', 'DISC-14', '1 2', { bb: ['resistor', { ohms: 5 }], cir: ['res', { resistance: '5' }], color: '#2a2a2a' });
  P('P', 'Special resistors', 'PTC thermistor, disc', 'DISC-10', '1 2', { bb: ['resistor', { ohms: 100 }], cir: ['res', { resistance: '100' }], color: '#2f6b2f' });
  P('P', 'Special resistors', 'FSR 402 force-sensitive resistor (round)', 'MOD-18x56x0.5', '1 2', { color: '#b88a1d' });
  P('P', 'Special resistors', 'FSR 406 force-sensitive resistor (square)', 'MOD-44x82x0.5', '1 2', { color: '#b88a1d' });
  P('P', 'Special resistors', 'Varistor (MOV) 14D471', 'DISC-14', '1 2', { color: '#1f4fa3' });
  P('P', 'Special resistors', 'Varistor (MOV) 7D221', 'DISC-10', '1 2', { color: '#1f4fa3' });
  // capacitors
  const C = (name, pkg, o) => P('P', 'Capacitors', name, pkg, o && o.pins || '1 2', Object.assign({ bb: ['capacitor', { farads: 1e-7 }], cir: ['cap', { capacitance: '100n' }] }, o));
  const EC = (name, pkg, f, o) => P('P', 'Capacitors', name, pkg, '+ −', Object.assign({ bb: ['ecap', { farads: f }], cir: ['ecap', { capacitance: fmtF(f) }] }, o));
  C('Ceramic disc capacitor', 'DISC-5');
  C('High-voltage ceramic disc capacitor 2 kV', 'DISC-10', { color: '#2f6fd6', bb: ['capacitor', { farads: 1e-9 }], cir: ['cap', { capacitance: '1n' }] });
  C('Multilayer ceramic capacitor, radial', 'BOX-P5', { color: '#d9a63b' });
  for (const c of ['0402', '0603', '0805', '1206', '1210']) C('MLCC chip capacitor ' + c, 'CHIP-' + c, { color: '#b88a56' });
  EC('Aluminium electrolytic 5 × 11 mm', 'RAD-5x11', 10e-6);
  EC('Aluminium electrolytic 6.3 × 11 mm', 'RAD-6x11', 100e-6);
  EC('Aluminium electrolytic 8 × 12 mm', 'RAD-8x12', 220e-6);
  EC('Aluminium electrolytic 10 × 16 mm', 'RAD-10x16', 1000e-6);
  EC('Aluminium electrolytic 13 × 25 mm', 'RAD-13x25', 4700e-6);
  EC('Snap-in electrolytic 22 × 40 mm', 'RAD-22x40', 10000e-6, { color: '#2b2b2b' });
  EC('SMD aluminium electrolytic (can)', 'CAN-SMD-6', 47e-6, { color: '#c9ccd1' });
  EC('Tantalum capacitor, dipped radial', 'TANT-RAD', 10e-6, { color: '#e1a21b' });
  for (const k of ['A', 'B', 'C', 'D']) EC('Tantalum chip capacitor, case ' + k, 'TANT-' + k, 10e-6, { color: '#d6a21b' });
  EC('Polymer capacitor, SMD', 'CAN-SMD-6', 330e-6, { id: 'polymer smd', color: '#5a2d82' });
  EC('Polymer capacitor, radial', 'RAD-8x12', 470e-6, { id: 'polymer radial', color: '#5a2d82' });
  C('Polyester film capacitor (MKT), 5 mm', 'BOX-P5', { color: '#c9b23a' });
  C('Polypropylene film capacitor (MKP), 7.5 mm', 'BOX-P7.5', { color: '#c94a3a', bb: ['capacitor', { farads: 1e-6 }], cir: ['cap', { capacitance: '1u' }] });
  C('X2 safety capacitor, 15 mm', 'BOX-P15', { color: '#c9b23a', bb: ['capacitor', { farads: 470e-9 }], cir: ['cap', { capacitance: '470n' }] });
  C('Silver mica capacitor', 'MICA', { color: '#a0522d', bb: ['capacitor', { farads: 100e-12 }], cir: ['cap', { capacitance: '100p' }] });
  C('Air variable capacitor (tuning)', 'VARCAP-AIR', { pins: 'STATOR ROTOR FRAME', bb: null, cir: ['cap', { capacitance: '365p' }], color: '#c9ccd1' });
  C('Ceramic trimmer capacitor', 'TRIMCAP', { color: '#e0c030', bb: ['capacitor', { farads: 20e-12 }], cir: ['cap', { capacitance: '20p' }] });
  EC('Supercapacitor 1 F, 5.5 V (coin)', 'COIN-21', 1, { color: '#1d1d1d' });
  EC('Supercapacitor 10 F, 2.7 V', 'RAD-10x30', 10, { color: '#2b62c9' });
  EC('Supercapacitor 100 F, 2.7 V', 'RAD-22x45', 100, { color: '#2b62c9' });
  // inductors
  const L = (name, pkg, h, o) => P('P', 'Inductors', name, pkg, o && o.pins || '1 2', Object.assign({ cir: ['ind', { inductance: h }] }, o));
  L('Air-core coil', 'AIRCOIL', '1u', { color: '#b87333' });
  L('Ferrite axial inductor (colour code)', 'AX-L', '100u', { color: '#4a8f4a' });
  L('Radial drum inductor', 'IND-RAD', '470u', { color: '#2b2b2b' });
  L('Shielded power inductor CD54', 'IND-CD54', '22u');
  L('Shielded power inductor 1210', 'IND-1210', '4.7u');
  L('Toroidal power inductor', 'TOROID-20', '100u', { color: '#e0c030' });
  L('RF chip inductor 0603', 'CHIP-0603', '10n', { color: '#e8e1d0' });
  L('Ferrite bead 0805', 'CHIP-0805', '1u', { id: 'ferrite bead smd', color: '#333' });
  L('Ferrite bead on lead (axial)', 'AX-BEAD', '1u', { color: '#333' });
  P('P', 'Inductors', 'Common-mode choke, 4 pins', 'CMC-4', 'L1A L1B L2A L2B', { cir: ['xfmr', { ratio: '1' }] });
  P('P', 'Inductors', 'Coupled inductor, SMD', 'COUPLED-SMD', '1 2 3 4', { cir: ['xfmr', { ratio: '1' }] });
  // transformers
  P('P', 'Transformers', 'Power transformer 230 V to 12 V, EI-30', 'EI-30', 'P1 P2 S1 S2', { cir: ['xfmr', { ratio: '19' }], color: '#5a5a5a' });
  P('P', 'Transformers', 'Isolation transformer 1:1, EI-48', 'EI-48', 'P1 P2 S1 S2', { cir: ['xfmr', { ratio: '1' }], color: '#5a5a5a' });
  P('P', 'Transformers', 'Pulse transformer (gate drive) 1:1', 'PULSE-XF', 'P1 P2 S1 S2', { cir: ['xfmr', { ratio: '1' }] });
  P('P', 'Transformers', 'Audio transformer 600 Ω, EI-14', 'EI-14', 'P1 P2 CT S1 S2', { color: '#6a6a6a' });
  P('P', 'Transformers', 'RF transformer 1:1 (ADT1-1)', 'MOD-7.6x8.6x4', 'PRI+ GND PRI- SEC+ NC SEC-', { color: '#e8e8e8' });
  P('P', 'Transformers', 'Current transformer, ring (SCT-013)', 'CT-RING', 'S1 S2', { color: '#1d1d1d' });
  P('P', 'Transformers', 'Autotransformer (variac)', 'VARIAC', 'IN COM OUT', { color: '#8a8a8a' });
  // frequency components
  const X = (name, pkg, o) => P('P', 'Frequency', name, pkg, o && o.pins != null ? o.pins : (pkgSpec(pkg).n || 2) > 2 ? null : '1 2', o);
  X('Quartz crystal HC-49/US, 16 MHz', 'HC-49', { cir: ['xtal', { freq: '16M' }] });
  X('Quartz crystal HC-49/SMD, 8 MHz', 'HC-49SMD', { cir: ['xtal', { freq: '8M' }] });
  X('Watch crystal 32.768 kHz (tuning fork)', 'XTAL-FORK', { cir: ['xtal', { freq: '32.768k', esr: '35k', q: '5000', c0: '1.5p' }] });
  X('SMD crystal 3225, 25 MHz', 'XTAL-3225', { pins: '1 GND 2 GND', cir: null });
  X('Ceramic resonator 3 pins, 16 MHz', 'RES-3', { pins: '1 GND 2', cir: ['resonator', { freq: '16M' }], color: '#3a7bd5' });
  X('Crystal oscillator DIP-14 can, 20 MHz', 'XO-DIP14', { pins: 'EN GND OUT VCC', cir: ['xo', { freq: '20M' }] });
  X('Crystal oscillator DIP-8 half can, 8 MHz', 'XO-DIP8', { pins: 'EN GND OUT VCC', cir: ['xo', { freq: '8M' }] });
  X('SMD crystal oscillator 5032, 50 MHz', 'XO-5032', { pins: 'EN GND OUT VCC', cir: ['xo', { freq: '50M' }] });
  X('TCXO 26 MHz, 3225', 'XTAL-3225', { id: 'tcxo 26', pins: 'VC GND OUT VCC', cir: ['xo', { freq: '26M' }] });
  X('VCXO 27 MHz, 7050', 'XO-7050', { pins: 'VC GND OUT VCC', cir: ['vco', {}] });
  X('VCO module 2.4 GHz (ROS-2500)', 'MOD-12x12x3.5', { pins: 'VTUNE GND RF VCC', cir: ['vco', {}], color: '#2a6b3f' });
  X('ADF4351 wideband PLL synthesizer', 'LFCSP-32', {});
  X('Si5351A clock generator', 'MSOP-10', { pins: 'VDD XA XB SCL SDA CLK2 VDDO GND CLK1 CLK0' });
  X('Si5351A clock generator module', 'MOD-26x20', { id: 'si5351 module', pins: 'VIN GND SCL SDA CLK0 CLK1 CLK2' });
  X('CDCE913 programmable clock generator', 'TSSOP-14', {});
  X('CD4046 phase-locked loop', 'DIP-16', { pins: 16 });

  /* ---- 2. discretes and protection ---- */
  const DD = (grp, name, pkg, pins, cirT, model, o) => P('D', grp, name, pkg, pins, Object.assign({ cir: cirT ? [cirT, model ? { model } : {}] : null }, o));
  DD('Diodes', '1N4007 rectifier diode', 'DO-41', 'A K', 'diode', '1N4007', { bb: ['diode', { model: '1N4007' }] });
  DD('Diodes', '1N5408 rectifier diode 3 A', 'DO-201', 'A K', 'diode', '1N5408', { bb: ['diode', { model: '1N4007' }] });
  DD('Diodes', '1N4148 signal diode', 'DO-35', 'A K', 'diode', '1N4148', { bb: ['diode', { model: '1N4148' }] });
  DD('Diodes', 'M7 rectifier diode (SMA)', 'SMA', 'K A', 'diode', '1N4007');
  DD('Diodes', '1N4148W signal diode (SOD-123)', 'SOD-123', 'K A', 'diode', '1N4148');
  DD('Diodes', 'UF4007 ultra-fast diode', 'DO-41', 'A K', 'diode', 'UF4007', { bb: ['diode', { model: '1N4007' }] });
  DD('Diodes', '1N5819 Schottky diode', 'DO-41', 'A K', 'schottky', '1N5819', { bb: ['diode', { model: '1N5819' }] });
  DD('Diodes', 'SS34 Schottky diode (SMA)', 'SMA', 'K A', 'schottky', 'SS14');
  DD('Diodes', 'BAT54 Schottky diode (SOT-23)', 'SOT-23', 'A NC K', 'schottky', 'BAT54');
  DD('Diodes', 'SB560 Schottky diode 5 A', 'DO-201', 'A K', 'schottky', 'SB560');
  DD('Diodes', '1N4733A Zener 5.1 V', 'DO-41', 'A K', 'zener', '1N4733A');
  DD('Diodes', '1N4742A Zener 12 V', 'DO-41', 'A K', 'zener', '1N4742A');
  DD('Diodes', 'BZX84C5V1 Zener (SOT-23)', 'SOT-23', 'A NC K', 'zener', '1N4733A');
  DD('Diodes', 'P6KE6.8A TVS diode', 'DO-15', 'A K', 'zener', '1N4736A', { color: '#1d1d1d' });
  DD('Diodes', 'SMBJ5.0A TVS diode (SMB)', 'SMB', 'K A', 'zener', '1N4733A');
  DD('Diodes', 'SMBJ24CA bidirectional TVS (SMB)', 'SMB', '1 2', null, null);
  DD('Diodes', 'BAP64 PIN diode (SOD-323)', 'SOD-323', 'K A', 'diode', 'Generic');
  DD('Diodes', 'BB910 varactor diode', 'DO-35', 'A K', 'diode', 'Generic');
  DD('Diodes', 'SMV1233 varactor (SOD-323)', 'SOD-323', 'K A', 'diode', 'Generic');
  DD('Diodes', 'BPW34 photodiode', 'PHOTO-2', 'A K', 'diode', 'Generic', { color: '#2a2a2a' });
  DD('Diodes', 'Laser diode 650 nm, 5.6 mm', 'LASER-5.6', 'LD COM PD', null, null);
  P('D', 'Diodes', 'Laser module 650 nm, 5 V (KY-008)', 'MOD-18.5x15', 'S VCC GND', { color: '#1d1d1d' });
  DD('Diodes', 'DB107 bridge rectifier (DIP-4)', 'BRIDGE-DIP4', '+ ~1 ~2 −', 'bridge', '1N4007');
  DD('Diodes', 'KBP307 bridge rectifier 3 A', 'BRIDGE-KBP', '+ ~1 ~2 −', 'bridge', '1N4007');
  DD('Diodes', 'GBU8K bridge rectifier 8 A', 'BRIDGE-GBU', '+ ~1 ~2 −', 'bridge', '1N5408');
  DD('Diodes', 'KBPC3510 bridge rectifier 35 A', 'BRIDGE-KBPC', '+ ~1 ~2 −', 'bridge', '1N5408');
  // transistors
  const TR = (name, pkg, pins, t, model, o) => P('D', 'Transistors', name, pkg, pins, Object.assign({ cir: t ? [t, model ? { model } : {}] : null }, o));
  TR('2N3904 NPN transistor', 'TO-92', 'E B C', 'npn', '2N3904', { bb: ['npn', {}] });
  TR('2N2222A NPN transistor (TO-92)', 'TO-92', 'E B C', 'npn', '2N2222A', { bb: ['npn', {}] });
  TR('BC547B NPN transistor', 'TO-92', 'C B E', 'npn', 'BC547B');
  TR('MMBT3904 NPN transistor (SOT-23)', 'SOT-23', 'B E C', 'npn', '2N3904');
  TR('2N2222 NPN transistor (TO-18 metal can)', 'TO-18', 'E B C', 'npn', '2N2222A');
  TR('2N3906 PNP transistor', 'TO-92', 'E B C', 'pnp', '2N3906');
  TR('BC557B PNP transistor', 'TO-92', 'C B E', 'pnp', 'BC557B');
  TR('MMBT3906 PNP transistor (SOT-23)', 'SOT-23', 'B E C', 'pnp', '2N3906');
  TR('TIP31C NPN power transistor', 'TO-220', 'B C E', 'npn', 'TIP31C');
  TR('TIP41C NPN power transistor', 'TO-220', 'B C E', 'npn', 'TIP41C');
  TR('TIP42C PNP power transistor', 'TO-220', 'B C E', 'pnp', 'TIP42C');
  TR('TIP120 NPN Darlington', 'TO-220', 'B C E', 'npn', 'TIP120');
  TR('TIP127 PNP Darlington', 'TO-220', 'B C E', 'pnp', 'TIP127');
  TR('MPSA13 NPN Darlington (TO-92)', 'TO-92', 'E B C', 'npn', 'MPSA13');
  TR('ULN2003A Darlington array', 'DIP-16', 'IN1 IN2 IN3 IN4 IN5 IN6 IN7 GND COM OUT7 OUT6 OUT5 OUT4 OUT3 OUT2 OUT1', null, null);
  TR('ULN2803A Darlington array (8 channels)', 'DIP-18', 'IN1 IN2 IN3 IN4 IN5 IN6 IN7 IN8 GND COM OUT8 OUT7 OUT6 OUT5 OUT4 OUT3 OUT2 OUT1', null, null);
  TR('2N7000 N-MOSFET (TO-92)', 'TO-92', 'S G D', 'nmos', '2N7000');
  TR('BS170 N-MOSFET (TO-92)', 'TO-92', 'D G S', 'nmos', 'BS170');
  TR('2N7002 N-MOSFET (SOT-23)', 'SOT-23', 'G S D', 'nmos', '2N7002');
  TR('AO3400 N-MOSFET (SOT-23)', 'SOT-23', 'G S D', 'nmos', 'AO3400', { id: 'ao3400 n-mosfet' });
  TR('IRF540N N-MOSFET', 'TO-220', 'G D S', 'nmos', 'IRF540N');
  TR('IRLZ44N logic-level N-MOSFET', 'TO-220', 'G D S', 'nmos', 'IRLZ44N (logic)');
  TR('IRLR7843 N-MOSFET (DPAK)', 'DPAK', 'G D S', 'nmos', 'IRF3205');
  TR('IRF1404 N-MOSFET (D2PAK)', 'D2PAK', 'G D S', 'nmos', 'IRF3205');
  TR('IRF9540N P-MOSFET', 'TO-220', 'G D S', 'pmos', 'IRF9540N');
  TR('AO3401 P-MOSFET (SOT-23)', 'SOT-23', 'G S D', 'pmos', 'AO3401', { id: 'ao3401 p-mosfet' });
  TR('BS250 P-MOSFET (TO-92)', 'TO-92', 'D G S', 'pmos', 'BS250');
  TR('2N5457 N-JFET', 'TO-92', 'D S G', 'njfet', '2N5457');
  TR('J310 N-JFET (RF)', 'TO-92', 'D S G', 'njfet', 'J310');
  TR('2N5460 P-JFET', 'TO-92', 'D S G', 'pjfet', '2N5460');
  TR('FGH40N60 IGBT', 'TO-247', 'G C E', null, null);
  TR('IRGB4062 IGBT (TO-220)', 'TO-220', 'G C E', null, null);
  TR('C3M0065090D SiC MOSFET 900 V', 'TO-247', 'G D S', 'nmos', 'SiC 900V');
  TR('SCT3080KL SiC MOSFET 1200 V', 'TO-247', 'G D S', 'nmos', 'SiC 1200V');
  TR('GS66508T GaN transistor 650 V', 'GaNPX', 'G S D S2', null, null);
  TR('EPC2045 GaN FET 100 V', 'LGA-6@2.5x1.5', 'G S D D2 S2 S3', null, null);
  // switching devices
  const SW = (name, pkg, pins, t, model, o) => P('D', 'Switching', name, pkg, pins, Object.assign({ cir: t ? [t, model ? { model } : {}] : null }, o));
  SW('2N5060 SCR (TO-92)', 'TO-92', 'K G A', 'scr', '2N5060');
  SW('BT151-500R SCR', 'TO-220', 'K A G', 'scr', 'BT151-500R');
  SW('C106B SCR', 'TO-220', 'K A G', 'scr', 'C106B');
  SW('BT136-600 TRIAC', 'TO-220', 'MT1 MT2 G', 'triac', 'BT136-600');
  SW('BTA16-600B TRIAC', 'TO-220', 'MT1 MT2 G', 'triac', 'BTA16-600B');
  SW('DB3 DIAC', 'DO-35', '1 2', 'diac', 'DB3');
  SW('SRD-05VDC relay (sugar cube)', 'RELAY-SRD', 'COIL1 COIL2 COM NO NC', 'relay', null, { color: '#1f5fae' });
  SW('HFD2 latching relay (DIP)', 'RELAY-DIP', 'S+ S− R+ R− COM NO NC COM2', null, null, { color: '#1d1d1d' });
  SW('SIL05-1A reed relay (SIP-4)', 'SIP-4', 'COIL+ NO NO2 COIL−', null, null, { color: '#1d1d1d' });
  SW('G3MB-202P solid-state relay', 'SIP-4', 'LOAD1 LOAD2 IN+ IN−', null, null, { color: '#2b2b2b' });
  SW('SSR-25DA solid-state relay (chassis)', 'SSR-CHASSIS', 'IN+ IN− L1 L2', null, null, { color: '#efefef' });
  SW('3-pole contactor, 24 V coil (DIN)', 'CONTACTOR-DIN', 'A1 A2 L1 L2 L3 T1 T2 T3', null, null, { color: '#e8e8e8' });
  // isolation
  const ISO = (name, pkg, pins, o) => P('D', 'Isolation', name, pkg, pins, o);
  ISO('PC817 optocoupler', 'DIP-4', 'A K E C', { cir: ['opto', { model: 'PC817' }] });
  ISO('4N35 optocoupler', 'DIP-6', 'A K NC E C B', { cir: ['opto', { model: '4N35' }] });
  ISO('6N137 high-speed optocoupler', 'DIP-8', 'NC A K NC GND VO VE VCC');
  ISO('MOC3021 triac-driver optocoupler', 'DIP-6', 'A K NC MT1 NC MT2');
  ISO('ISO7721 digital isolator (2 channels)', 'SOIC-8', 'VCC1 OUTA INB GND1 GND2 INA OUTB VCC2');
  ISO('ADuM1201 digital isolator', 'SOIC-8', 'VDD1 VOA VIB GND1 GND2 VIA VOB VDD2');
  ISO('UCC5350 isolated gate driver', 'SOIC-8', 'VCC1 IN+ IN− GND1 VCC2 OUTH OUTL VEE2');
  ISO('Si8271 isolated gate driver', 'SOIC-8', 8);
  ISO('AMC1301 isolation amplifier', 'SOIC-8W', 'AVDD AINP AINN AGND DGND OUTN OUTP DVDD');
  ISO('ACPL-790 isolation amplifier', 'SOIC-8W', 'VDD1 VIN+ VIN− GND1 GND2 VOUT− VOUT+ VDD2');
  ISO('Ethernet signal transformer HX1188', 'SOIC-16', 16);
  // protection
  const PR = (name, pkg, pins, o) => P('D', 'Protection', name, pkg, pins || '1 2', o);
  PR('Glass fuse 5 × 20 mm in holder', 'FUSE-5x20', null, { cir: ['fuse', { rating: '1' }], color: '#d9dde2' });
  PR('Blade fuse (ATO)', 'FUSE-BLADE', null, { cir: ['fuse', { rating: '10' }], color: '#2f80ed' });
  PR('SMD fuse 1206', 'CHIP-1206', null, { cir: ['fuse', { rating: '0.5' }], color: '#e8e1d0', id: 'fuse smd 1206' });
  PR('Resettable fuse (PTC), radial', 'DISC-10', null, { cir: ['fuse', { rating: '0.5' }], color: '#e0c030', id: 'ptc fuse radial' });
  PR('Resettable fuse (PTC), SMD 1812', 'CHIP-1812', null, { cir: ['fuse', { rating: '0.5' }], color: '#1d6b2e', id: 'ptc fuse 1812' });
  PR('Miniature circuit breaker 1-pole (DIN)', 'BREAKER-DIN', 'LINE LOAD', { cir: ['fuse', { rating: '10' }], color: '#efefef' });
  PR('Thermal circuit breaker (push reset)', 'MOD-20x12x25', 'LINE LOAD', { cir: ['fuse', { rating: '5' }], color: '#1d1d1d' });
  PR('USBLC6-2 ESD protection array', 'SOT-23-6', 'IO1 GND IO2 IO2b VBUS IO1b');
  PR('TPD4E05 ESD protection array', 'DFN-6', 6);
  PR('LM74700 ideal-diode controller (reverse polarity)', 'SOT-23-6', 'VCAP SOURCE GATE ANODE EN GND');
  PR('Gas discharge tube (surge arrester)', 'GDT-2', '1 2', { color: '#c9ccd1' });
  PR('Surge suppressor TVS array SP0503', 'SOT-143', 4);
  PR('Inrush current limiter NTC 10D-9', 'DISC-10', '1 2', { cir: ['res', { resistance: '10' }], color: '#2a2a2a' });

  /* ---- 3. analog and mixed-signal ICs ---- */
  const OA1 = 'NULL1 IN− IN+ V− NULL2 OUT V+ NC', OA2 = 'OUTA INA− INA+ V− INB+ INB− OUTB V+', OA4 = 'OUT1 IN1− IN1+ V+ IN2+ IN2− OUT2 OUT3 IN3− IN3+ V− IN4+ IN4− OUT4', OA5 = 'OUT V− IN+ IN− V+';
  const OP = (name, pkg, pins, model, params, o) => P('A', 'Op-amps', name, pkg, pins, Object.assign({ cir: ['opamp', { model }], model: { kind: 'opamp', name: model, params } }, o));
  OP('LM741 single op-amp', 'DIP-8', OA1, 'LM741');
  OP('OP07 precision op-amp', 'DIP-8', 'TRIM IN− IN+ V− NC OUT V+ TRIM2', 'OP07', { a: 4e5, gbw: 0.6e6, sr: 0.3e6, drop: 1.5 });
  OP('TL071 JFET op-amp', 'DIP-8', OA1, 'TL071');
  OP('LM358 dual op-amp', 'DIP-8', OA2, 'LM358');
  OP('LM358 dual op-amp (SOIC)', 'SOIC-8', OA2, 'LM358', null, { id: 'lm358 soic' });
  OP('TL072 dual JFET op-amp', 'DIP-8', OA2, 'TL072');
  OP('NE5532 low-noise dual op-amp', 'DIP-8', OA2, 'NE5532', { a: 1e5, gbw: 10e6, sr: 9e6, drop: 1.5 });
  OP('MCP6002 low-power dual op-amp (rail-to-rail)', 'DIP-8', OA2, 'MCP6002', { a: 1.1e5, gbw: 1e6, sr: 0.6e6, drop: 0.025 });
  OP('MCP6022 dual operational amplifier (rail-to-rail, 10 MHz)', 'DIP-8', OA2, 'MCP6022', { a: 1.1e5, gbw: 10e6, sr: 7e6, drop: 0.02 });
  OP('MCP6022 dual operational amplifier (SOIC)', 'SOIC-8', OA2, 'MCP6022', null, { id: 'mcp6022 soic' });
  OP('OPA2134 audio dual op-amp', 'DIP-8', OA2, 'OPA2134', { a: 1e6, gbw: 8e6, sr: 20e6, drop: 1 });
  OP('LM324 quad op-amp', 'DIP-14', OA4, 'LM324');
  OP('TL074 quad JFET op-amp', 'DIP-14', OA4, 'TL074', { a: 2e5, gbw: 3e6, sr: 13e6, drop: 1.5 });
  OP('MCP6004 quad op-amp (rail-to-rail)', 'DIP-14', OA4, 'MCP6004', { a: 1.1e5, gbw: 1e6, sr: 0.6e6, drop: 0.025 });
  OP('OPA333 zero-drift op-amp', 'SOT-23-5', OA5, 'OPA333', { a: 1.5e6, gbw: 0.35e6, sr: 0.16e6, drop: 0.05 });
  OP('AD8065 high-speed op-amp 145 MHz', 'SOT-23-5', OA5, 'AD8065', { a: 1e5, gbw: 145e6, sr: 180e6, drop: 1.2 });
  OP('OPA2350 high-speed dual op-amp (rail-to-rail)', 'SOIC-8', OA2, 'OPA2350', { a: 3e5, gbw: 38e6, sr: 22e6, drop: 0.01 });
  OP('AD8628 zero-drift op-amp', 'SOIC-8', 'NC IN− IN+ V− NC OUT V+ NC', 'AD8628', { a: 1.4e6, gbw: 2.5e6, sr: 1e6, drop: 0.03 });
  OP('LT1028 ultra-low-noise op-amp', 'DIP-8', OA1, 'LT1028', { a: 2e7, gbw: 75e6, sr: 15e6, drop: 1.5 });
  OP('LMV358 low-voltage dual op-amp (SOIC)', 'SOIC-8', OA2, 'LMV358', { a: 1e5, gbw: 1e6, sr: 1e6, drop: 0.05 });
  // other amplifiers
  const AM = (name, pkg, pins, o) => P('A', 'Amplifiers', name, pkg, pins, o);
  AM('INA128 instrumentation amplifier', 'DIP-8', 'RG IN− IN+ V− REF OUT V+ RG2');
  AM('AD620 instrumentation amplifier', 'DIP-8', 'RG IN− IN+ V− REF OUT V+ RG2');
  AM('INA333 low-power instrumentation amplifier', 'MSOP-8', 'RG IN− IN+ V− REF OUT V+ RG2');
  AM('AD8221 instrumentation amplifier', 'SOIC-8', 'IN− RG RG2 IN+ V− REF OUT V+');
  AM('INA105 differential amplifier', 'DIP-8', 8);
  AM('AD8476 fully differential amplifier', 'MSOP-10', 10);
  AM('OPA380 transimpedance amplifier', 'MSOP-8', 8);
  AM('PGA113 programmable-gain amplifier', 'MSOP-10', 10);
  AM('MCP6S21 programmable-gain amplifier', 'DIP-8', 'VOUT CH0 VREF VSS CS SI SCK VDD');
  AM('INA180 current-sense amplifier', 'SOT-23-5', 'OUT GND IN+ IN− VS');
  AM('INA240 current-sense amplifier (PWM rejection)', 'TSSOP-8', 8);
  AM('MAX4080 current-sense amplifier', 'SOIC-8', 8);
  AM('MAX9814 microphone amplifier with AGC (module)', 'MOD-26x16', 'AR OUT GAIN VDD GND');
  AM('SSM2167 microphone preamplifier', 'MSOP-10', 10);
  AM('LM386 audio power amplifier', 'DIP-8', 'GAIN IN− IN+ GND VOUT VS BYPASS GAIN2');
  AM('TDA2030A audio amplifier 14 W', 'TO-220-5', 'IN+ IN− V− OUT V+');
  AM('LM1875 audio amplifier 20 W', 'TO-220-5', 'IN+ IN− V− OUT V+');
  AM('PAM8403 stereo class-D amplifier (module)', 'MOD-21x18', 'L GND R VCC GND2 LOUT+ LOUT− ROUT+ ROUT−');
  AM('TPA3116D2 class-D amplifier 2 × 50 W (module)', 'MOD-60x45x20', 'VIN GND INL INR GND2 L+ L− R+ R−');
  // comparators and references
  const CR = (name, pkg, pins, o) => P('A', 'Comparators and references', name, pkg, pins, o);
  CR('LM311 comparator', 'DIP-8', 'GND IN+ IN− V− BAL STROBE OUT V+', { cir: ['comparator', { model: 'LM311' }] });
  CR('LM393 dual comparator', 'DIP-8', 'OUTA INA− INA+ GND INB+ INB− OUTB VCC', { cir: ['comparator', { model: 'LM393' }] });
  CR('LM339 quad comparator', 'DIP-14', 'OUT2 OUT1 VCC IN1− IN1+ IN2− IN2+ IN3− IN3+ IN4− IN4+ GND OUT4 OUT3', { cir: ['comparator', { model: 'LM339' }] });
  CR('TLV3501 high-speed comparator', 'SOT-23-6', 6, { cir: ['comparator', { model: 'LM319' }] });
  CR('TPS3700 window comparator', 'SOT-23-6', 6);
  CR('74HC14 hex Schmitt-trigger inverter', 'DIP-14', '1A 1Y 2A 2Y 3A 3Y GND 4Y 4A 5Y 5A 6Y 6A VCC', { cir: ['not', { family: '74HC' }] });
  CR('CD40106 hex Schmitt-trigger inverter', 'DIP-14', '1A 1Y 2A 2Y 3A 3Y VSS 4Y 4A 5Y 5A 6Y 6A VDD', { cir: ['not', { family: 'CD4000' }] });
  CR('TL431 adjustable shunt reference', 'TO-92', 'REF A K');
  CR('LM4040 2.5 V shunt reference', 'SOT-23', 'K A NC', { cir: ['zener', { model: 'BZX55C2V7' }] });
  CR('REF5025 2.5 V precision reference', 'SOIC-8', 'DNC VIN TEMP GND TRIM VOUT NC DNC2');
  CR('LM336-2.5 reference', 'TO-92', 'ADJ V+ V−');
  CR('LM334 adjustable current source', 'TO-92', 'V+ R V−');
  CR('REF200 dual 100 µA current source', 'DIP-8', 8);
  // converters
  const CV = (name, pkg, pins, o) => P('A', 'Converters', name, pkg, pins, o);
  CV('ADS1115 16-bit ADC (I2C)', 'MSOP-10', 'ADDR ALERT GND AIN0 AIN1 AIN2 AIN3 VDD SDA SCL');
  CV('ADS1115 ADC module', 'MOD-28x17', 'VDD GND SCL SDA ADDR ALRT A0 A1 A2 A3', { id: 'ads1115 module' });
  CV('MCP3008 10-bit SAR ADC (8 channels, SPI)', 'DIP-16', 'CH0 CH1 CH2 CH3 CH4 CH5 CH6 CH7 DGND CS DIN DOUT CLK AGND VREF VDD');
  CV('MCP3201 12-bit SAR ADC', 'DIP-8', 'VREF IN+ IN− VSS CS DOUT CLK VDD');
  CV('ADS7042 12-bit SAR ADC', 'DFN-8', 8);
  CV('ADS1256 24-bit delta-sigma ADC', 'SSOP-28', 28);
  CV('MCP3421 18-bit delta-sigma ADC', 'SOT-23-6', 'VIN+ VSS SCL SDA VDD VIN−');
  CV('NAU7802 24-bit load-cell ADC', 'SOIC-16', 16);
  CV('ADC0820 8-bit half-flash ADC', 'DIP-20', 20);
  CV('TLC5510 8-bit flash ADC 20 MSPS', 'SOP-24', 24);
  CV('MCP4725 12-bit DAC (I2C)', 'SOT-23-6', 'VOUT VSS VDD SDA SCL A0');
  CV('MCP4725 DAC module', 'MOD-21x18', 'VCC GND SCL SDA OUT A0', { id: 'mcp4725 module' });
  CV('MCP4921 12-bit DAC (SPI)', 'DIP-8', 'VDD CS SCK SDI LDAC VREF AVSS VOUT');
  CV('DAC0808 8-bit multiplying DAC', 'DIP-16', 16);
  CV('PCM5102A audio DAC (module)', 'MOD-32x20', 'VIN GND LCK DIN BCK SCK');
  CV('WM8960 audio codec', 'QFN-32', 32);
  CV('PCM3060 audio codec', 'TSSOP-28', 28);
  CV('LM331 voltage-to-frequency converter', 'DIP-8', 'IOUT IREF FOUT GND RC THR CMP VS');
  CV('AD654 voltage-to-frequency converter', 'DIP-8', 8);
  CV('LM2907 frequency-to-voltage converter', 'DIP-14', 14);
  // signal routing
  const SR = (name, pkg, pins, o) => P('A', 'Signal routing', name, pkg, pins, o);
  SR('CD4066 quad analog switch', 'DIP-14', 'A1 B1 B2 A2 C2 C3 VSS A3 B3 B4 A4 C4 C1 VDD');
  SR('TS5A3157 SPDT analog switch', 'SOT-23-6', 'NO GND NC COM V+ IN');
  SR('ADG419 SPDT analog switch', 'SOIC-8', 8);
  SR('CD4051 8-channel analog multiplexer', 'DIP-16', 'X4 X6 X X7 X5 INH VEE VSS C B A X3 X0 X1 X2 VDD');
  SR('CD4052 dual 4-channel analog multiplexer', 'DIP-16', 'Y0 Y2 Y Y3 Y1 INH VEE VSS B A X3 X0 X X1 X2 VDD');
  SR('CD4053 triple 2-channel analog multiplexer', 'DIP-16', 'BY BX CY C CX INH VEE VSS SC SB SA AX AY A B VDD');
  SR('CD74HC4067 16-channel multiplexer (module)', 'MOD-40x18', 'SIG S0 S1 S2 S3 EN VCC GND C0 C1 C2 C3 C4 C5 C6 C7 C8 C9 C10 C11 C12 C13 C14 C15');
  SR('ADG1606 16-channel multiplexer', 'TSSOP-28', 28);
  SR('MT8816 8 × 16 crosspoint switch', 'DIP-40W', 40);
  SR('LF398 sample-and-hold amplifier', 'DIP-8', 'V+ OFFSET IN V− OUT CH LOGICREF LOGIC');
  SR('BUF634 high-speed buffer', 'TO-220-5', 'BW V+ IN V− OUT');
  // signal conditioning
  const SC = (name, pkg, pins, o) => P('A', 'Signal conditioning', name, pkg, pins, o);
  SC('MAX7400 8th-order low-pass filter (switched capacitor)', 'DIP-8', 'COM IN GND VDD SHDN OS OUT CLK');
  SC('UAF42 universal active filter', 'DIP-14', 14);
  SC('LTC1068 quad universal filter', 'SSOP-28', 28);
  SC('MAX274 continuous-time filter', 'DIP-24W', 24);
  SC('Wheatstone bridge strain module', 'MOD-30x20', 'E+ E− S+ S− ');
  SC('MAX31855 thermocouple interface (module)', 'MOD-25x18', 'VIN GND DO CS CLK T+ T−');
  SC('MAX6675 K-type thermocouple interface (module)', 'MOD-25x16', 'GND VCC SCK CS SO T+ T−');
  SC('MAX31865 RTD (PT100/PT1000) interface (module)', 'MOD-28x25', 'VIN GND 3V3 CLK SDO SDI CS RDY F+ RTD+ RTD− F−');
  SC('HX711 load-cell interface (bare IC)', 'SOP-16', 16);
  // industrial analog
  const IA = (name, pkg, pins, o) => P('A', 'Industrial analog', name, pkg, pins, o);
  IA('XTR115 4–20 mA current-loop transmitter', 'SOIC-8', 8);
  IA('XTR116 4–20 mA transmitter with reference', 'SOIC-8', 8);
  IA('RCV420 4–20 mA current-loop receiver', 'DIP-16', 16);
  IA('AD5422 4–20 mA / ±10 V output DAC', 'TSSOP-24', 24);
  IA('4–20 mA to 0–5 V converter module', 'MOD-35x22', 'I+ I− VCC GND VOUT');
  IA('0–10 V to 4–20 mA signal isolator (DIN)', 'MOD-23x100x80', 'V+ V− IN+ IN− OUT+ OUT−', { color: '#2b2f36' });
  IA('±10 V signal isolator (DIN)', 'MOD-23x100x80', 'V+ V− IN+ IN− OUT+ OUT−', { id: 'signal isolator 10v', color: '#2b2f36' });

  /* ---- 4. logic, timing and memory ---- */
  const G2 = '1A 1B 1Y 2A 2B 2Y GND 3Y 3A 3B 4Y 4A 4B VCC', G02 = '1Y 1A 1B 2Y 2A 2B GND 3A 3B 3Y 4A 4B 4Y VCC', G04 = '1A 1Y 2A 2Y 3A 3Y GND 4Y 4A 5Y 5A 6Y 6A VCC';
  const GX = '1A 1B 1Y 2Y 2A 2B GND 3A 3B 3Y 4Y 4A 4B VCC', GC = '1A 1B 1Y 2Y 2A 2B VSS 3A 3B 3Y 4Y 4A 4B VDD', GC6 = '1A 1Y 2A 2Y 3A 3Y VSS 4Y 4A 5Y 5A 6Y 6A VDD';
  const gates = [['00', 'NAND', 'nand', G2, 'ic7400'], ['02', 'NOR', 'nor', G02, 'ic7402'], ['04', 'NOT (hex inverter)', 'not', G04, 'ic7404'], ['08', 'AND', 'and', G2, 'ic7408'], ['32', 'OR', 'or', G2, 'ic7432'], ['86', 'XOR', 'xor', G2, 'ic7486'], ['7266', 'XNOR', 'xnor', GX, null], ['125', 'tri-state buffer', 'buf', '1OE 1A 1Y 2OE 2A 2Y GND 3Y 3A 3OE 4Y 4A 4OE VCC', null], ['07', 'open-drain buffer', 'buf', G04, null]];
  for (const fam of ['74HC', '74HCT', '74LS', '74LVC']) for (const [n, fn, t, pins, bb] of gates) {
    if (fam === '74LVC' && !['00', '08', '32', '86', '04', '125', '07'].includes(n)) continue; if (fam === '74LS' && n === '7266') continue;
    const num = fam === '74LS' && n === '7266' ? '266' : n; const pkg = fam === '74LVC' ? 'SOIC-14' : 'DIP-14';
    P('L', 'Logic gates', `${fam}${num} quad ${fn}`.replace('quad NOT (hex inverter)', 'hex inverter').replace('quad open-drain buffer', 'hex open-drain buffer'), pkg, pins, { cir: [t, { family: fam === '74LVC' ? '74HC' : fam }], bb: bb && fam !== '74LVC' ? [bb, {}] : null });
  }
  for (const [n, fn, t] of [['00', 'NAND', 'nand'], ['08', 'AND', 'and'], ['32', 'OR', 'or'], ['86', 'XOR', 'xor'], ['04', 'inverter', 'not']]) P('L', 'Logic gates', `74LVC1G${n} single ${fn} gate`, 'SOT-23-5', t === 'not' ? 'NC A GND Y VCC' : 'A B GND Y VCC', { cir: [t, { family: '74HC' }] });
  for (const [n, fn, t, pins] of [['4001', 'quad NOR', 'nor', GC], ['4011', 'quad NAND', 'nand', GC], ['4081', 'quad AND', 'and', GC], ['4071', 'quad OR', 'or', GC], ['4070', 'quad XOR', 'xor', GC], ['4077', 'quad XNOR', 'xnor', GC], ['4069', 'hex inverter', 'not', GC6], ['4050', 'hex buffer', 'buf', 'VDD 1Y 1A 2Y 2A 3Y 3A VSS 4A 4Y 5A 5Y NC 6A 6Y NC2']]) P('L', 'Logic gates', `CD${n} ${fn}`, 'DIP-14', pins.split(' ').length === 16 ? pins : pins, { cir: [t, { family: 'CD4000' }], ...(pins.split(' ').length === 16 ? { pkg: 'DIP-16', spec: pkgSpec('DIP-16'), dims: pkgSpec('DIP-16').dims } : {}) });
  const SQ = (name, pkg, pins, o) => P('L', 'Sequential logic', name, pkg, pins, o);
  SQ('74HC74 dual D flip-flop', 'DIP-14', '1CLR 1D 1CLK 1PRE 1Q 1Q\' GND 2Q\' 2Q 2PRE 2CLK 2D 2CLR VCC', { cir: ['dff', {}] });
  SQ('74HC112 dual JK flip-flop', 'DIP-16', 16, { cir: ['jkff', {}] });
  SQ('74HC75 quad bistable latch', 'DIP-16', 16);
  SQ('74HC373 octal transparent latch', 'DIP-20', 'OE Q0 D0 D1 Q1 Q2 D2 D3 Q3 GND LE Q4 D4 D5 Q5 Q6 D6 D7 Q7 VCC');
  SQ('74HC374 octal D flip-flop', 'DIP-20', 'OE Q0 D0 D1 Q1 Q2 D2 D3 Q3 GND CLK Q4 D4 D5 Q5 Q6 D6 D7 Q7 VCC');
  SQ('74HC161 4-bit binary counter', 'DIP-16', 'MR CP D0 D1 D2 D3 CEP GND PE CET Q3 Q2 Q1 Q0 TC VCC', { cir: ['counter', {}] });
  SQ('74HC193 4-bit up/down counter', 'DIP-16', 'D1 Q1 Q0 CPD CPU Q2 Q3 GND D3 D2 PL TCU TCD MR D0 VCC');
  SQ('CD4017 decade counter', 'DIP-16', 'Q5 Q1 Q0 Q2 Q6 Q7 Q3 VSS Q8 Q4 Q9 CO CLKEN CLK RST VDD');
  SQ('CD4040 12-stage binary counter', 'DIP-16', 'Q12 Q6 Q5 Q7 Q4 Q3 Q2 VSS Q1 CLK RST Q9 Q8 Q10 Q11 VDD');
  SQ('74HC595 8-bit shift register (SIPO)', 'DIP-16', 'QB QC QD QE QF QG QH GND QH\' SRCLR SRCLK RCLK OE SER QA VCC');
  SQ('74HC165 8-bit shift register (PISO)', 'DIP-16', 'SH/LD CLK E F G H QH\' GND QH SER A B C D CLKINH VCC');
  SQ('CD4094 8-bit shift-and-store register', 'DIP-16', 'STR D CLK Q1 Q2 Q3 Q4 VSS QS QS\' Q8 Q7 Q6 Q5 OE VDD');
  SQ('74HC390 dual decade counter (divider)', 'DIP-16', 16);
  SQ('CD4060 14-stage counter with oscillator', 'DIP-16', 'Q12 Q13 Q14 Q6 Q5 Q7 Q4 VSS Q10 Q8 Q9 RST CLK CLKOUT CLKOUT2 VDD', { cir: ['cd4060', {}] });
  SQ('MAX6816 switch debouncer', 'SOT-143', 'GND IN OUT VCC');
  SQ('MC14490 hex contact-bounce eliminator', 'DIP-16', 16);
  const CB = (name, pkg, pins, o) => P('L', 'Combinational logic', name, pkg, pins, o);
  CB('74HC151 8-to-1 multiplexer', 'DIP-16', 'D3 D2 D1 D0 Y W G\' GND C B A D7 D6 D5 D4 VCC');
  CB('74HC157 quad 2-to-1 multiplexer', 'DIP-16', 'S 1I0 1I1 1Y 2I0 2I1 2Y GND 3Y 3I1 3I0 4Y 4I1 4I0 E\' VCC');
  CB('74HC153 dual 4-to-1 multiplexer', 'DIP-16', 16);
  CB('74HC138 3-to-8 decoder / demultiplexer', 'DIP-16', 'A0 A1 A2 E1\' E2\' E3 Y7 GND Y6 Y5 Y4 Y3 Y2 Y1 Y0 VCC');
  CB('74HC139 dual 2-to-4 decoder', 'DIP-16', '1E\' 1A0 1A1 1Y0 1Y1 1Y2 1Y3 GND 2Y3 2Y2 2Y1 2Y0 2A1 2A0 2E\' VCC');
  CB('74HC154 4-to-16 decoder', 'DIP-24W', 24);
  CB('74HC148 8-to-3 priority encoder', 'DIP-16', 'I4 I5 I6 I7 EI\' A2\' A1\' GND A0\' I0 I1 I2 I3 GS\' EO\' VCC');
  CB('74HC147 10-to-4 BCD priority encoder', 'DIP-16', 16);
  CB('74HC283 4-bit full adder', 'DIP-16', 'S2 B2 A2 S1 A1 B1 CIN GND COUT S4 B4 A4 S3 A3 B3 VCC');
  CB('74HC85 4-bit magnitude comparator', 'DIP-16', 'B3 IA<B IA=B IA>B A>B A=B A<B GND B0 A0 B1 A1 A2 B2 A3 VCC');
  CB('74HC4511 BCD to 7-segment decoder', 'DIP-16', 'B C LT\' BI\' LE D A VSS e d c b a g f VDD');
  CB('74LS47 BCD to 7-segment decoder (open collector)', 'DIP-16', 'B C LT\' BI\'/RBO\' RBI\' D A GND e d c b a g f VCC');
  CB('CD4511 BCD to 7-segment latch decoder', 'DIP-16', 'B C LT\' BI\' LE D A VSS e d c b a g f VDD');
  const IO = (name, pkg, pins, o) => P('L', 'I/O expansion', name, pkg, pins, o);
  IO('MCP23017 16-bit I/O expander (I2C)', 'DIP-28', 'GPB0 GPB1 GPB2 GPB3 GPB4 GPB5 GPB6 GPB7 VDD VSS NC SCL SDA NC2 A0 A1 A2 RESET INTB INTA GPA0 GPA1 GPA2 GPA3 GPA4 GPA5 GPA6 GPA7');
  IO('MCP23S17 16-bit I/O expander (SPI)', 'DIP-28', 28);
  IO('PCF8574 8-bit I/O expander (I2C)', 'DIP-16', 'A0 A1 A2 P0 P1 P2 P3 VSS P4 P5 P6 P7 INT SCL SDA VDD');
  IO('PCF8574 I2C backpack for LCD', 'MOD-42x19', 'GND VCC SDA SCL', { id: 'pcf8574 lcd backpack' });
  IO('PCA9685 16-channel PWM controller (bare IC)', 'TSSOP-28', 28);
  IO('TXS0108E 8-bit level shifter (module)', 'MOD-25x16', 'VA A1 A2 A3 A4 A5 A6 A7 A8 OE GND VB B1 B2 B3 B4 B5 B6 B7 B8 GND2');
  IO('BSS138 4-channel level shifter (module)', 'MOD-16x13', 'HV LV GND GND2 HV1 LV1 HV2 LV2 HV3 LV3 HV4 LV4');
  IO('74LVC245 octal bus transceiver', 'SOIC-20W', 'DIR A1 A2 A3 A4 A5 A6 A7 A8 GND B8 B7 B6 B5 B4 B3 B2 B1 OE VCC');
  IO('74CBT3245 octal bus switch', 'SOIC-20W', 20);
  IO('TCA9548A I2C multiplexer (module)', 'MOD-33x18', 'VIN GND SDA SCL RST A0 A1 A2 SD0 SC0 SD1 SC1 SD2 SC2 SD3 SC3 SD4 SC4 SD5 SC5 SD6 SC6 SD7 SC7');
  IO('PCA9548A I2C multiplexer (bare IC)', 'TSSOP-24', 24);
  const TM = (name, pkg, pins, o) => P('L', 'Timing and supervision', name, pkg, pins, o);
  TM('NE555 timer', 'DIP-8', 'GND TRIG OUT RESET CTRL THRES DISCH VCC', { cir: ['timer555', { model: 'NE555' }], bb: ['ne555', {}] });
  TM('NE555 timer (SOIC)', 'SOIC-8', 'GND TRIG OUT RESET CTRL THRES DISCH VCC', { id: 'ne555 soic', cir: ['timer555', { model: 'NE555' }] });
  TM('TLC555 CMOS timer', 'DIP-8', 'GND TRIG OUT RESET CTRL THRES DISCH VCC', { cir: ['timer555', { model: 'TLC555 (CMOS)' }], bb: ['ne555', {}] });
  TM('ICM7555 CMOS timer', 'DIP-8', 'GND TRIG OUT RESET CTRL THRES DISCH VCC', { cir: ['timer555', { model: 'ICM7555' }], bb: ['ne555', {}] });
  TM('NE556 dual timer', 'DIP-14', 'DIS1 THR1 CTRL1 RST1 OUT1 TRIG1 GND TRIG2 OUT2 RST2 CTRL2 THR2 DIS2 VCC');
  TM('DS1307 real-time clock (I2C)', 'DIP-8', 'X1 X2 VBAT GND SDA SCL SQW VCC');
  TM('DS3231 precision real-time clock (bare IC)', 'SOIC-16W', 16);
  TM('PCF8563 real-time clock', 'SOIC-8', 'OSCI OSCO INT VSS SDA SCL CLKOUT VDD');
  TM('TPS3823 watchdog with reset', 'SOT-23-5', 'RESET GND MR WDI VDD');
  TM('MAX6369 watchdog timer', 'SOT-23-6', 6);
  TM('MCP100 reset supervisor', 'TO-92', 'RST VDD VSS');
  TM('TL7705 reset supervisor', 'DIP-8', 8);
  TM('APX803 brownout detector', 'SOT-23', 'GND RESET VCC');
  TM('TPS3808 voltage supervisor with delay (sequencer)', 'SOT-23-6', 6);
  TM('LTC2924 power-supply sequencer', 'SSOP-16', 16);
  const ME = (name, pkg, pins, o) => P('L', 'Memory', name, pkg, pins, o);
  const SRAM28 = 'A14 A12 A7 A6 A5 A4 A3 A2 A1 A0 IO0 IO1 IO2 GND IO3 IO4 IO5 IO6 IO7 CE A10 OE A11 A9 A8 A13 WE VCC';
  ME('62256 32 KB static RAM', 'DIP-28W', SRAM28);
  ME('IS62WV5128 512 KB static RAM', 'TSOP-32', 32);
  ME('23LC1024 1 Mbit SPI SRAM', 'DIP-8', 'CS SO SIO2 VSS SI SCK HOLD VCC');
  ME('41256 256 Kbit DRAM', 'DIP-16', 16);
  ME('IS42S16400 64 Mbit SDRAM', 'TSOP-54', 54);
  ME('MT41K256M16 DDR3L SDRAM 4 Gbit', 'FBGA-96@9x14', 96);
  ME('MT40A512M16 DDR4 SDRAM 8 Gbit', 'FBGA-96@7.5x13.5', 96, { id: 'ddr4 8gbit' });
  ME('24LC256 256 Kbit I2C EEPROM', 'DIP-8', 'A0 A1 A2 VSS SDA SCL WP VCC');
  ME('AT24C02 2 Kbit I2C EEPROM', 'SOIC-8', 'A0 A1 A2 GND SDA SCL WP VCC');
  ME('93C46 1 Kbit Microwire EEPROM', 'DIP-8', 'CS CLK DI DO VSS ORG NC VCC');
  ME('28C256 32 KB parallel EEPROM', 'DIP-28W', SRAM28);
  ME('W25Q32 32 Mbit SPI NOR flash', 'SOIC-8', 'CS DO WP GND DI CLK HOLD VCC');
  ME('W25Q128 128 Mbit SPI NOR flash', 'SOIC-8W', 'CS DO WP GND DI CLK HOLD VCC');
  ME('SST39SF010 1 Mbit parallel NOR flash', 'DIP-32W', 32);
  ME('W25N01GV 1 Gbit SPI NAND flash', 'WSON-8', 'CS DO WP GND DI CLK HOLD VCC');
  ME('MT29F4G08 4 Gbit NAND flash', 'TSOP-48', 48);
  ME('FM24CL64 64 Kbit FRAM (I2C)', 'SOIC-8', 'A0 A1 A2 VSS SDA SCL WP VDD');
  ME('MB85RC256V FRAM module (I2C)', 'MOD-20x18', 'VCC GND WP SCL SDA A2 A1 A0');
  ME('MR25H40 4 Mbit MRAM (SPI)', 'DFN-8', 'CS SO WP VSS SI SCK HOLD VDD');
  ME('ESP-PSRAM64H 64 Mbit PSRAM', 'SOP-8', 'CE SO SIO2 VSS SI SCLK SIO3 VCC');
  ME('APS6404L 64 Mbit QSPI PSRAM', 'SOP-8', 'CE SO/SIO1 SIO2 VSS SI/SIO0 SCLK SIO3 VCC', { id: 'aps6404' });
  const ST = (name, pkg, pins, o) => P('L', 'Storage', name, pkg, pins, o);
  ST('microSD card', 'MICROSD', 'DAT2 CD/DAT3 CMD VDD CLK VSS DAT0 DAT1', { color: '#1d1d1d' });
  ST('SD card', 'SD', 'CD/DAT3 CMD VSS VDD CLK VSS2 DAT0 DAT1 DAT2', { color: '#1f5fae' });
  ST('eMMC 32 GB', 'FBGA-153@11.5x13', 153);
  ST('USB flash drive', 'USB-STICK', 'VBUS D− D+ GND', { color: '#2b2b2b' });
  ST('M.2 2280 NVMe SSD', 'M.2-2280', 'PCIe+ PCIe− 3V3 GND');
  ST('2.5-inch SATA SSD', 'SSD-2.5', 'SATA+ SATA− 5V GND', { color: '#2b2f36' });
  ST('OpenLog serial data logger', 'MOD-19x16', 'BLK GND VCC TXO RXI DTR');
  ST('SD card shield (data logger with RTC)', 'MOD-68x53x12', 'VCC GND SCK MISO MOSI CS SDA SCL');

  /* ---- 5. processors and boards ---- */
  const MC = (grp, name, pkg, pins, o) => P('M', grp, name, pkg, pins, o);
  MC('8-bit microcontrollers', 'ATmega328P microcontroller', 'DIP-28', 'PC6/RESET PD0/RX PD1/TX PD2 PD3 PD4 VCC GND PB6/XTAL1 PB7/XTAL2 PD5 PD6 PD7 PB0 PB1 PB2 PB3/MOSI PB4/MISO PB5/SCK AVCC AREF GND2 PC0/A0 PC1/A1 PC2/A2 PC3/A3 PC4/SDA PC5/SCL');
  MC('8-bit microcontrollers', 'ATmega328P microcontroller (TQFP-32)', 'TQFP-32', 32, { id: 'atmega328p tqfp' });
  MC('8-bit microcontrollers', 'ATmega2560 microcontroller', 'TQFP-100', 100);
  MC('8-bit microcontrollers', 'ATtiny85 microcontroller', 'DIP-8', 'PB5/RESET PB3 PB4 GND PB0/MOSI PB1/MISO PB2/SCK VCC');
  MC('8-bit microcontrollers', 'ATtiny13A microcontroller', 'DIP-8', 'PB5/RESET PB3 PB4 GND PB0/MOSI PB1/MISO PB2/SCK VCC');
  MC('8-bit microcontrollers', 'ATtiny2313 microcontroller', 'DIP-20', 'PA2/RESET PD0/RX PD1/TX PA1 PA0 PD2 PD3 PD4 PD5 GND PD6 PB0 PB1 PB2 PB3 PB4 PB5/MOSI PB6/MISO PB7/SCK VCC');
  MC('8-bit microcontrollers', 'ATtiny1614 microcontroller (UPDI)', 'SOIC-14', 'VDD PA4 PA5 PA6 PA7 PB3 PB2 PB1 PB0 PA0/UPDI PA1 PA2 PA3 GND');
  MC('8-bit microcontrollers', 'PIC10F200 microcontroller', 'SOT-23-6', 'GP0 VSS GP1 GP2 VDD GP3/MCLR');
  MC('8-bit microcontrollers', 'PIC12F675 microcontroller', 'DIP-8', 'VDD GP5 GP4 GP3/MCLR GP2 GP1 GP0 VSS');
  MC('8-bit microcontrollers', 'PIC16F84A microcontroller', 'DIP-18', 'RA2 RA3 RA4 MCLR VSS RB0 RB1 RB2 RB3 RB4 RB5 RB6 RB7 VDD OSC2 OSC1 RA0 RA1');
  const PIC40 = 'MCLR RA0 RA1 RA2 RA3 RA4 RA5 RE0 RE1 RE2 VDD VSS OSC1 OSC2 RC0 RC1 RC2 RC3 RD0 RD1 RD2 RD3 RC4 RC5 RC6 RC7 RD4 RD5 RD6 RD7 VSS2 VDD2 RB0 RB1 RB2 RB3 RB4 RB5 RB6 RB7';
  MC('8-bit microcontrollers', 'PIC16F877A microcontroller', 'DIP-40W', PIC40);
  MC('8-bit microcontrollers', 'PIC18F4550 microcontroller (USB)', 'DIP-40W', PIC40.replace('RC3', 'VUSB'));
  MC('8-bit microcontrollers', 'AT89S52 8051 microcontroller', 'DIP-40W', 'P1.0 P1.1 P1.2 P1.3 P1.4 P1.5 P1.6 P1.7 RST P3.0/RXD P3.1/TXD P3.2 P3.3 P3.4 P3.5 P3.6/WR P3.7/RD XTAL2 XTAL1 GND P2.0 P2.1 P2.2 P2.3 P2.4 P2.5 P2.6 P2.7 PSEN ALE EA P0.7 P0.6 P0.5 P0.4 P0.3 P0.2 P0.1 P0.0 VCC');
  MC('8-bit microcontrollers', 'STC89C52 8051 microcontroller', 'DIP-40W', 'P1.0 P1.1 P1.2 P1.3 P1.4 P1.5 P1.6 P1.7 RST P3.0/RXD P3.1/TXD P3.2 P3.3 P3.4 P3.5 P3.6/WR P3.7/RD XTAL2 XTAL1 GND P2.0 P2.1 P2.2 P2.3 P2.4 P2.5 P2.6 P2.7 PSEN ALE EA P0.7 P0.6 P0.5 P0.4 P0.3 P0.2 P0.1 P0.0 VCC');
  MC('8-bit microcontrollers', 'STM8S103F3 microcontroller', 'TSSOP-20', 'PD4 PD5/TX PD6/RX NRST PA1 PA2 VSS VCAP VDD PA3 PB5/SDA PB4/SCL PC3 PC4 PC5 PC6 PC7 PD1/SWIM PD2 PD3');
  MC('16-bit microcontrollers', 'MSP430G2553 microcontroller', 'DIP-20', 'DVCC P1.0 P1.1/RX P1.2/TX P1.3 P1.4 P1.5 P2.0 P2.1 P2.2 P2.3 P2.4 P2.5 P1.6 P1.7 RST TEST XOUT XIN DVSS');
  MC('16-bit microcontrollers', 'MSP430FR2433 microcontroller (FRAM)', 'VQFN-24', 24);
  MC('16-bit microcontrollers', 'PIC24FJ64GA002 microcontroller', 'DIP-28', 28);
  MC('16-bit microcontrollers', 'dsPIC33FJ128MC802 digital signal controller', 'DIP-28', 28);
  MC('16-bit microcontrollers', 'Renesas RL78/G13 microcontroller', 'LQFP-48', 48);
  for (const [n, pkg] of [['STM32F103C8T6', 'LQFP-48'], ['STM32F411CEU6', 'QFN-48'], ['STM32G431KB', 'LQFP-32'], ['STM32H743VIT6', 'LQFP-100'], ['RP2040', 'QFN-56'], ['RP2350A', 'QFN-60'], ['ATSAMD21G18A', 'TQFP-48'], ['nRF52840', 'aQFN-73'], ['nRF5340', 'aQFN-94'], ['i.MX RT1062', 'BGA-196@12x12'], ['Renesas RA4M1', 'LQFP-64'], ['TM4C123GH6PM', 'LQFP-64'], ['GD32VF103 (RISC-V)', 'LQFP-48'], ['CH32V003 (RISC-V)', 'SOP-8'], ['ESP32-C3 (RISC-V)', 'QFN-32'], ['ESP32-S3 SoC', 'QFN-56']])
    MC('32-bit microcontrollers', n + ' microcontroller', pkg, n === 'CH32V003 (RISC-V)' ? 'PD6 GND PA1 VDD PC1/SDA PC2/SCL PC4 PD1/SWIO' : null);
  const mods = [['ESP32-WROOM-32 module', '18x25.5x3.1', 'GND 3V3 EN SENSOR_VP SENSOR_VN IO34 IO35 IO32 IO33 IO25 IO26 IO27 IO14 IO12 GND2 IO13 SD2 SD3 CMD CLK SD0 SD1 IO15 IO2 IO0 IO4 IO16 IO17 IO5 IO18 IO19 NC IO21 RXD0 TXD0 IO22 IO23 GND3'],
    ['ESP32-C3-MINI-1 module', '13.2x16.6x2.4', 21], ['ESP32-S3-WROOM-1 module', '18x25.5x3.1', 41], ['nRF52840 module (MDBT50Q)', '10x15x2.2', 30], ['Generic ARM Cortex-M0+ microcontroller', '7x7x1.6', 32], ['Generic RISC-V microcontroller', '5x5x0.9', 32]];
  for (const [n, d, p] of mods) MC('32-bit microcontrollers', n, 'MOD-' + d, typeof p === 'string' ? p : p, { color: /Generic/.test(n) ? '#1d1d1d' : '#c9ccd1' });
  const BD = (grp, name, dims, pins, o) => P('M', grp, name, 'MOD-' + dims, pins, Object.assign({ color: '#1f5fae' }, o));
  BD('Development boards', 'Arduino Nano ESP32', '45x18', 'D13 3V3 B0 A0 A1 A2 A3 A4 A5 A6 A7 VBUS B1 VIN GND RST TX RX D2 D3 D4 D5 D6 D7 D8 D9 D10 D11 D12', { color: '#0f7c8c' });
  BD('Development boards', 'STM32 Nucleo-F401RE', '70x82', 'PA0 PA1 PA4 PB0 PC1 PC0 PA3 PA2 PA10 PB3 PB5 PB4 PB10 PA8 PA9 PC7 PB6 PA7 PA6 PA5 PB9 PB8 3V3 5V GND VIN', { color: '#f5f5f5' });
  BD('Development boards', 'STM32F4 Discovery', '97x66', 50, { color: '#3a6fb0' });
  BD('Development boards', 'Blue Pill (STM32F103C8T6)', '53x22.5', 'B12 B13 B14 B15 A8 A9 A10 A11 A12 A15 B3 B4 B5 B6 B7 B8 B9 5V GND 3V3 VB C13 C14 C15 A0 A1 A2 A3 A4 A5 A6 A7 B0 B1 B10 B11 R GND2 3V3b', { color: '#1f4fa3' });
  BD('Development boards', 'Black Pill (STM32F411)', '53x21', 40, { color: '#1d1d1d' });
  BD('Development boards', 'Teensy 4.1', '61x18', 'GND 0 1 2 3 4 5 6 7 8 9 10 11 12 3V3 24 25 26 27 28 29 30 31 32 VIN GND2 3V3b 23 22 21 20 19 18 17 16 15 14 13 41 40 39 38 37 36 35 34 33', { color: '#2e7d32' });
  BD('Development boards', 'Teensy 4.0', '36x18', 28, { color: '#2e7d32' });
  BD('Development boards', 'BBC micro:bit V2', '52x42', 'P0 P1 P2 3V GND', { color: '#1d1d1d' });
  BD('Development boards', 'Seeed XIAO ESP32C3', '21x17.5', 'D0 D1 D2 D3 D4/SDA D5/SCL D6/TX D7/RX D8/SCK D9/MISO D10/MOSI 3V3 GND 5V', { color: '#1d1d1d' });
  BD('Development boards', 'Seeed XIAO RP2040', '21x17.5', 'D0 D1 D2 D3 D4/SDA D5/SCL D6/TX D7/RX D8/SCK D9/MISO D10/MOSI 3V3 GND 5V', { color: '#1d1d1d' });
  BD('Development boards', 'Seeed XIAO SAMD21', '21x17.5', 'D0 D1 D2 D3 D4/SDA D5/SCL D6/TX D7/RX D8/SCK D9/MISO D10/MOSI 3V3 GND 5V', { color: '#1d1d1d' });
  BD('Development boards', 'Adafruit Feather RP2040', '51x23', 28, { color: '#1d1d1d' });
  BD('Development boards', 'Adafruit Feather ESP32-S3', '51x23', 28, { color: '#1d1d1d' });
  BD('Development boards', 'Adafruit Feather M4 Express', '51x23', 28, { color: '#1d1d1d' });
  const SBC40 = Array.from({ length: 40 }, (_, i) => 'P' + (i + 1)).join(' ');
  BD('Single-board computers', 'NVIDIA Jetson Nano Developer Kit', '100x80x29', SBC40, { color: '#2b2b2b' });
  BD('Single-board computers', 'NVIDIA Jetson Orin Nano Developer Kit', '100x79x21', SBC40, { color: '#2b2b2b' });
  BD('Single-board computers', 'BeagleBone Black', '86x54', 46, { color: '#1d1d1d' });
  BD('Single-board computers', 'Orange Pi 5', '100x62', SBC40, { color: '#1d6b2e' });
  BD('Single-board computers', 'Radxa ROCK 5B', '100x72', SBC40, { color: '#1d1d1d' });
  BD('Single-board computers', 'ODROID-N2+', '90x90x17', SBC40, { color: '#1f5fae' });
  BD('System-on-modules', 'Raspberry Pi Compute Module 4', '55x40x4.7', 'GND 5V 3V3 GPIO2 GPIO3 PCIe USB HDMI ETH', { color: '#1d6b2e' });
  BD('System-on-modules', 'Raspberry Pi Compute Module 5', '55x40x4.7', 'GND 5V 3V3 GPIO2 GPIO3 PCIe USB HDMI ETH', { color: '#1d6b2e' });
  BD('System-on-modules', 'Raspberry Pi CM4 IO board (carrier)', '160x90x20', SBC40, { color: '#1d6b2e' });
  BD('System-on-modules', 'NVIDIA Jetson Orin NX module', '69.6x45x5', 'VIN GND PCIe USB CSI DSI ETH', { color: '#1d1d1d' });
  BD('System-on-modules', 'Jetson carrier board', '100x80x21', SBC40, { color: '#2b2b2b' });
  BD('System-on-modules', 'NXP i.MX 8M Mini system-on-module', '38x38x4', 'VIN GND USB MIPI ETH GPIO', { color: '#1f5fae' });
  BD('System-on-modules', 'Rockchip RK3588 system-on-module', '69.6x45x5', 'VIN GND PCIe USB HDMI MIPI', { color: '#1d1d1d' });
  const FPGA = (name, pkg, pins) => MC('Programmable logic', name, pkg, pins);
  FPGA('Altera EPM240 MAX II CPLD', 'TQFP-100', 100); FPGA('Xilinx XC9572XL CPLD', 'TQFP-44', 44);
  FPGA('Lattice iCE40UP5K FPGA', 'QFN-48', 48); FPGA('Lattice ECP5 LFE5U-25F FPGA', 'BGA-256@14x14', 256);
  FPGA('Xilinx Artix-7 XC7A35T FPGA', 'BGA-256@17x17', 256); FPGA('Intel Cyclone IV EP4CE6 FPGA', 'TQFP-144', 144);
  FPGA('Xilinx Zynq-7020 FPGA SoC', 'BGA-400@17x17', 400);
  for (const [n, d] of [['iCEBreaker (iCE40UP5K) board', '76x50'], ['Digilent Arty A7 (Artix-7) board', '110x87'], ['Terasic DE10-Lite (MAX 10) board', '89x58'], ['Sipeed Tang Nano 9K board', '58x22'], ['Radiona ULX3S (ECP5) board', '94x51'], ['TUL PYNQ-Z2 (Zynq) board', '140x87'], ['Cyclone IV EP4CE6 starter board', '75x60']]) BD('Programmable logic', n, d, 40, { color: '#1d1d1d' });
  MC('Specialized processors', 'TMS320F28379D digital signal processor', 'LQFP-176', 176);
  MC('Specialized processors', 'ADSP-BF706 Blackfin DSP', 'LFCSP-88', 88);
  MC('Specialized processors', 'Kendryte K210 NPU module (Sipeed Maix)', 'MOD-26x26x3', 48, { color: '#1d1d1d' });
  MC('Specialized processors', 'Embedded GPU module (Jetson-class)', 'MOD-69.6x45x5', 'VIN GND PCIe USB', { color: '#1d1d1d' });
  MC('Specialized processors', 'Image signal processor (camera ISP)', 'BGA-121@8x8', 121);
  MC('Specialized processors', 'ATECC608A crypto accelerator (secure element)', 'SOIC-8', 'NC NC2 NC3 GND SDA SCL NC4 VCC');
  MC('Specialized processors', 'ATSHA204A crypto authentication', 'SOT-23', 'SDA GND VCC');
  for (const [n, d, pins] of [['Google Coral USB Accelerator', '65x30x8', 'VBUS D− D+ GND'], ['Google Coral M.2 Accelerator', '22x30x2.8', 'PCIe+ PCIe− 3V3 GND'], ['Google Coral Dev Board Mini', '64x48x15', SBC40], ['Hailo-8 M.2 AI accelerator', '22x80x2.6', 'PCIe+ PCIe− 3V3 GND'], ['Hailo-8L AI Kit for Raspberry Pi', '65x56x12', 'PCIe+ PCIe− 3V3 GND'], ['Generic edge inference accelerator', '30x30x5', 'VIN GND SPI USB']])
    BD('AI accelerators', n, d, pins, { color: '#2b2f36' });
  for (const [n, d, pins] of [['ST-LINK/V2 (SWD) programmer', '53x14x8', 'RST SWCLK SWDIO GND 3V3 5V'], ['SEGGER J-Link EDU Mini', '33x25x8', 'VTREF SWDIO SWCLK SWO RESET GND'], ['USBasp ISP programmer', '70x20x8', 'MOSI VCC NC RST SCK MISO GND'], ['AVRISP mkII programmer', '60x40x15', 'MISO VCC SCK MOSI RST GND'], ['SerialUPDI programmer', '25x15x5', 'UPDI VCC GND'], ['CH340G USB-UART adapter', '35x18x5', 'GND CTS VCC TXD RXD DTR'], ['CP2102 USB-UART adapter', '25x15x5', 'DTR RXD TXD 5V 3V3 GND'], ['FT232RL USB-UART adapter', '37x18x5', 'DTR RXD TXD VCC CTS GND'], ['Raspberry Pi Debug Probe (SWD)', '30x20x10', 'SC GND SD TX RX GND2'], ['Black Magic Probe (JTAG/SWD)', '40x20x8', 'VREF SWDIO SWCLK SWO RST GND'], ['ESP-Prog (JTAG and UART)', '60x30x10', 'TMS TCK TDO TDI GND VCC TX RX EN IO0']])
    BD('Programmers and debuggers', n, d, pins, { color: '#1d1d1d' });

  /* ---- 18. generic packages (one of each, for drawing and PCB layout) ---- */
  for (const pk of ['DIP-8', 'DIP-14', 'DIP-16', 'DIP-28W', 'DIP-40W', 'SIP-8', 'PGA-68', 'SOIC-8', 'SOIC-16', 'SOP-8', 'SSOP-20', 'TSSOP-16', 'MSOP-8', 'TQFP-44', 'LQFP-64', 'QFP-80', 'QFN-32', 'DFN-8', 'LGA-14', 'BGA-64', 'WLCSP-9', 'TO-92', 'TO-220', 'TO-247', 'SOT-23', 'SOT-223', 'DPAK', 'D2PAK', 'AX-0.25W', 'RAD-6x11', 'CHIP-0201', 'CHIP-0402', 'CHIP-0603', 'CHIP-0805', 'CHIP-1206', 'CHIP-1210', 'CHIP-2512'])
    P('K', /^(DIP|SIP|PGA)/.test(pk) ? 'Through-hole IC packages' : /^(TO|SOT|DPAK|D2PAK)/.test(pk) ? 'Discrete packages' : /^(AX|RAD|CHIP)/.test(pk) ? 'Passive packages' : 'Surface-mount IC packages', 'Generic ' + pk + ' package', pk, null, { id: 'pkg ' + pk, mark: pk });
  const FORM = [['Sensor form factors', ['Bare sensor IC (LGA)', 'LGA-8'], ['Surface-mount sensor module', 'MOD-12x12x2'], ['Sensor breakout board', 'MOD-25x18'], ['Cabled sensor probe', 'MOD-60x6x6'], ['Threaded sensor probe (M12)', 'MOD-45x12x12'], ['Immersion probe', 'MOD-120x8x8'], ['Flexible sensor (film)', 'MOD-60x10x0.3'], ['Enclosed industrial transmitter', 'MOD-60x60x90']],
    ['Board form factors', ['Plug-in module', 'MOD-30x20'], ['Development board (generic)', 'MOD-70x50'], ['Arduino shield (generic)', 'MOD-68.6x53.3'], ['Raspberry Pi HAT (generic)', 'MOD-65x56.5'], ['System-on-module (generic)', 'MOD-50x40x4'], ['Carrier board (generic)', 'MOD-100x80'], ['DIN-rail module (generic)', 'MOD-18x90x60'], ['19-inch rack module (1U)', 'MOD-483x300x44.5']]];
  for (const [grp, ...items] of FORM) for (const [n, pk] of items) P('K', grp, n, pk, /^(LGA|BGA|QFN)/.test(pk) ? null : 4, { color: grp === 'Sensor form factors' ? '#455a64' : '#1f5fae' });

  /* ---------------- helpers for the tools ---------------- */
  function fmtF(f) { const u = [[1, ''], [1e-3, 'm'], [1e-6, 'u'], [1e-9, 'n'], [1e-12, 'p']]; for (const [s, p] of u) if (f >= s) return +(f / s).toPrecision(3) + p; return String(f); }
  const dimText = e => e.dims.map(v => +(+v).toFixed(2)).join(' × ') + ' mm';
  /* footprint (mm, Y down) for the PCB tool */
  function fp(e) {
    const s = e.spec, n = e.pins.length, pads = [], silk = []; let body = null;
    const th = (nm, x, y, sh, w, h, dr) => pads.push({ n: String(nm), x: +x.toFixed(3), y: +y.toFixed(3), shape: sh, w, h: h == null ? w : h, drill: dr });
    const smd = (nm, x, y, w, h) => pads.push({ n: String(nm), x: +x.toFixed(3), y: +y.toFixed(3), shape: 'rect', w, h, drill: 0 });
    const [W, D] = e.dims; const nm = i => e.pins[i] || String(i + 1);
    switch (s.kind) {
      case 'dip': case 'xodip': { const h = s.kind === 'xodip' ? 2 : n / 2, row = s.row; const len = s.kind === 'xodip' ? s.len : (h - 1) * 2.54;
        for (let i = 0; i < h; i++) th(nm(i), 0, s.kind === 'xodip' ? i * len : i * 2.54, i === 0 ? 'rect' : 'oval', 2.0, 1.6, 0.8);
        for (let i = 0; i < h; i++) th(nm(h + i), row, s.kind === 'xodip' ? (h - 1 - i) * len : (h - 1 - i) * 2.54, 'oval', 2.0, 1.6, 0.8);
        silk.push(['rect', 1.1, -1.4, row - 2.2, len + 2.8]); body = [1.1, -1.4, row - 2.2, len + 2.8, e.color]; break; }
      case 'sip': case 'to92': case 'to220': case 'to247': case 'pot': case 'tocan':
        for (let i = 0; i < n; i++) th(nm(i), i * (s.pitch || 2.54), 0, i === 0 ? 'rect' : 'oval', 1.5, 2.0, s.kind === 'to247' ? 1.4 : s.kind === 'to220' ? 1.1 : 0.8);
        silk.push(['rect', -1.5, -D / 2 - 0.5, (n - 1) * (s.pitch || 2.54) + 3, D + 1]); break;
      case 'gull': { const h = n / 2, p = s.pitch, sp = s.span; for (let i = 0; i < h; i++) smd(nm(i), 0, i * p, 1.5, p * 0.55); for (let i = 0; i < h; i++) smd(nm(h + i), sp, (h - 1 - i) * p, 1.5, p * 0.55);
        silk.push(['rect', 0.9, -0.6, sp - 1.8, (h - 1) * p + 1.2]); break; }
      case 'quad': case 'qfn': { const side = Math.ceil(n / 4), p = s.pitch, b = s.body; const off = (side - 1) * p / 2, R = b / 2 + (s.kind === 'quad' ? 1.0 : 0.15); let k = 0;
        for (let i = 0; i < side && k < n; i++, k++) smd(nm(k), -R, -off + i * p, s.kind === 'quad' ? 1.5 : 0.8, p * 0.55);
        for (let i = 0; i < side && k < n; i++, k++) smd(nm(k), -off + i * p, R, p * 0.55, s.kind === 'quad' ? 1.5 : 0.8);
        for (let i = 0; i < side && k < n; i++, k++) smd(nm(k), R, off - i * p, s.kind === 'quad' ? 1.5 : 0.8, p * 0.55);
        for (let i = 0; i < side && k < n; i++, k++) smd(nm(k), off - i * p, -R, p * 0.55, s.kind === 'quad' ? 1.5 : 0.8);
        silk.push(['rect', -b / 2, -b / 2, b, b]); break; }
      case 'dfn': { const h = n / 2, p = s.pitch; for (let i = 0; i < h; i++) smd(nm(i), -W / 2 + 0.2, -(h - 1) * p / 2 + i * p, 0.8, p * 0.5); for (let i = 0; i < h; i++) smd(nm(h + i), W / 2 - 0.2, (h - 1) * p / 2 - i * p, 0.8, p * 0.5); silk.push(['rect', -W / 2, -D / 2, W, D]); break; }
      case 'bga': case 'lga': { const k = s.cols, p = s.pitch; let c = 0; for (let r = 0; r < k && c < n; r++) for (let q = 0; q < k && c < n; q++, c++) { const x = (q - (k - 1) / 2) * p, y = (r - (k - 1) / 2) * p; if (s.kind === 'bga') pads.push({ n: nm(c), x: +x.toFixed(3), y: +y.toFixed(3), shape: 'round', w: p * 0.5, h: p * 0.5, drill: 0 }); else smd(nm(c), x, y, p * 0.45, p * 0.45); } silk.push(['rect', -W / 2, -D / 2, W, D]); break; }
      case 'pga': { let k = 4; while (4 * (k - 1) + Math.max(0, 4 * (k - 3)) < n) k++; const p = 2.54; let c = 0; for (let r = 0; r < k && c < n; r++) for (let q = 0; q < k && c < n; q++) { if (r > 1 && r < k - 2 && q > 1 && q < k - 2) continue; th(nm(c++), q * p, r * p, 'round', 1.6, 1.6, 0.9); } silk.push(['rect', -1.5, -1.5, (k - 1) * p + 3, (k - 1) * p + 3]); break; }
      case 'sot': case 'sot223': case 'dpak': {
        if (s.kind === 'sot' && n === 3) { smd(nm(0), -0.95, 1.1, 0.6, 0.8); smd(nm(1), 0.95, 1.1, 0.6, 0.8); smd(nm(2), 0, -1.1, 0.6, 0.8); }
        else if (s.kind === 'sot') { const bot = Math.ceil(n / 2), top = n - bot; for (let i = 0; i < bot; i++) smd(nm(i), (i - (bot - 1) / 2) * s.pitch, 1.15, 0.6, 0.9); for (let i = 0; i < top; i++) smd(nm(bot + i), ((top - 1) / 2 - i) * s.pitch * (top === 2 ? 2 : 1), -1.15, 0.6, 0.9); }
        else { for (let i = 0; i < 3; i++) if (!(s.kind === 'dpak' && i === 1)) smd(nm(i), (i - 1) * s.pitch, D / 2 + 1, 1.0, 1.8); smd(nm(1) + '_TAB', 0, -D / 2 + 0.5, W * 0.8, D * 0.45); }
        silk.push(['rect', -W / 2, -D / 2, W, D]); break; }
      case 'chip2': if (n === 4) { const pw = W * 0.18; smd(nm(0), -W / 2 + pw / 2, -D / 4, pw, D * 0.4); smd(nm(1), -W / 2 + pw / 2, D / 4, pw, D * 0.4); smd(nm(2), W / 2 - pw / 2, D / 4, pw, D * 0.4); smd(nm(3), W / 2 - pw / 2, -D / 4, pw, D * 0.4); }
        else { const pw = Math.max(0.3, W * 0.3); smd(nm(0), -W / 2 + pw / 3, 0, pw, D * 1.1); smd(nm(1), W / 2 - pw / 3, 0, pw, D * 1.1); } break;
      case 'can4': smd(nm(0), -W / 2 + 0.4, D / 4, 0.9, 0.8); smd(nm(1), W / 2 - 0.4, D / 4, 0.9, 0.8); smd(nm(2), W / 2 - 0.4, -D / 4, 0.9, 0.8); smd(nm(3), -W / 2 + 0.4, -D / 4, 0.9, 0.8); silk.push(['rect', -W / 2, -D / 2, W, D]); break;
      case 'cansmd': case 'smdind': case 'xtalsmd': if (n === 4) { smd(nm(0), -W / 3, -D / 3, 2, 2); smd(nm(1), -W / 3, D / 3, 2, 2); smd(nm(2), W / 3, D / 3, 2, 2); smd(nm(3), W / 3, -D / 3, 2, 2); } else { smd(nm(0), -W / 2 + 0.6, 0, 1.6, Math.min(3, D * 0.5)); smd(nm(1), W / 2 - 0.6, 0, 1.6, Math.min(3, D * 0.5)); } silk.push(['rect', -W / 2, -D / 2, W, D]); break;
      case 'axial': case 'fuse': { const L = s.lead || s.pitch || 10.16; th(nm(0), 0, 0, 'round', 1.8, 1.8, 0.9); th(nm(1), L, 0, 'round', 1.8, 1.8, 0.9); const bw = (s.body || [W])[0], bh = (s.body || [W, D])[1]; silk.push(['rect', (L - bw) / 2, -bh / 2, bw, bh]); body = [(L - bw) / 2, -bh / 2, bw, bh, e.color]; break; }
      case 'radial': case 'drop': case 'disc': case 'drum': case 'xtal': case 'axialv': case 'coincap': { const p = s.pitch || 2.54; for (let i = 0; i < n; i++) th(nm(i), i * p, 0, i === 0 ? 'rect' : 'round', 1.7, 1.7, 0.85); if (s.kind === 'radial' || s.kind === 'drum' || s.kind === 'coincap') silk.push(['circle', p / 2, 0, W / 2]); else silk.push(['rect', p / 2 - W / 2, -D / 2, W, D]); break; }
      case 'toroid': { const p = s.pitch || 10; for (let i = 0; i < n; i++) th(nm(i), i * p, 0, 'round', 2.2, 2.2, 1.1); silk.push(['circle', (n - 1) * p / 2, 0, W / 2]); break; }
      case 'card': for (let i = 0; i < n; i++) smd(nm(i), (i - (n - 1) / 2) * (W / (n + 1)), -D / 2 + 1, W / (n + 2), 2); silk.push(['rect', -W / 2, -D / 2, W, D]); break;
      case 'module': if (n > 12 && !s.grid) { const h = Math.ceil(n / 2); const row = Math.max(7.62, Math.round((W - 1.6) / 2.54) * 2.54); const len = (h - 1) * 2.54;
          for (let i = 0; i < h; i++) th(nm(i), 0, i * 2.54, i === 0 ? 'rect' : 'round', 1.7, 1.7, 1.0);
          for (let i = 0; i < n - h; i++) th(nm(h + i), row, (h - 1 - i) * 2.54, 'round', 1.7, 1.7, 1.0);
          const bh = Math.max(D, len + 3), by = len / 2 - bh / 2, bx = row / 2 - Math.max(W, row + 2) / 2, bw = Math.max(W, row + 2);
          silk.push(['rect', bx, by, bw, bh]); body = [bx, by, bw, bh, e.color]; break; }
        // fall through for small modules
      default: { // box, relay, xfmr, din, chassis, module: one or two rows of 2.54 mm pins
        const per = n > 20 ? Math.ceil(n / 2) : n; const g = s.grid; const p = s.pitch && s.pitch <= 10 ? s.pitch : 2.54;
        if (g) { for (let i = 0; i < n; i++) th(nm(i), (i % g[0]) * p, Math.floor(i / g[0]) * p, i === 0 ? 'rect' : 'round', 1.8, 1.8, 1.0); }
        else for (let i = 0; i < n; i++) th(nm(i), (i % per) * 2.54, Math.floor(i / per) * 2.54, i === 0 ? 'rect' : 'round', 1.7, 1.7, 1.0);
        const span = (Math.min(n, per) - 1) * 2.54; silk.push(['rect', span / 2 - W / 2, -D / 2 + (n > per ? 1.27 : 0), W, D]); body = s.kind === 'module' ? [span / 2 - W / 2, -D / 2 + (n > per ? 1.27 : 0), W, D, e.color] : null; }
    }
    return { name: e.name + ', ' + s.label, pads, silk, body };
  }
  /* breadboard legs (pitch units) and whether the part sits on the breadboard */
  function bbLegs(e) {
    const s = e.spec, n = e.pins.length;
    switch (s.kind) {
      case 'dip': if (s.tall) break; { const h = n / 2; const row = Math.round(s.row / 2.54); const legs = []; for (let i = 0; i < h; i++) legs.push([i, row]); for (let i = 0; i < h; i++) legs.push([h - 1 - i, 0]); if (row === 3 || row === 6) return { legs, on: row === 3 }; return { legs, on: false }; }
      case 'sip': case 'to92': case 'to220': case 'pot': case 'tocan': return { legs: e.pins.map((_, i) => [i * (s.kind === 'to247' ? 2 : 1), 0]), on: true };
      case 'to247': return { legs: e.pins.map((_, i) => [i * 2, 0]), on: true };
      case 'axial': case 'fuse': return { flex: true, span: Math.max(2, Math.round((s.lead || 10.16) / 2.54)), on: true };
      case 'radial': case 'disc': case 'drop': case 'xtal': case 'axialv': case 'drum': return n === 2 ? { flex: true, span: Math.max(1, Math.round((s.pitch || 2.54) / 2.54)), on: true } : { legs: e.pins.map((_, i) => [i, 0]), on: true };
      case 'box': if (n <= 3 && !s.grid && !s.chassis) return { legs: e.pins.map((_, i) => [i * Math.max(1, Math.round((s.pitch || 2.54) / 2.54 / Math.max(1, n - 1))), 0]), on: true }; break;
    }
    // everything else sits beside the breadboard on its own board, its pins in rows of up to 24
    const per = n > 24 ? Math.ceil(n / Math.ceil(n / 24)) : n; return { legs: e.pins.map((_, i) => [i % per, Math.floor(i / per)]), on: false };
  }
  const PFX = { Resistors: 'R', 'Special resistors': 'R', Capacitors: 'C', Inductors: 'L', Transformers: 'T', Frequency: 'Y', Diodes: 'D', Transistors: 'Q', Switching: 'K', Protection: 'F', Isolation: 'U' };
  function refPfx(e) { if (e.grp === 'Special resistors' && /thermistor|ntc|ptc/i.test(e.name)) return 'TH'; if (e.grp === 'Special resistors' && /pot|trim|rheostat/i.test(e.name)) return 'RV'; return PFX[e.grp] || (/board|module|computer/i.test(e.grp) ? 'A' : 'U'); }
  const api = { LIST, BY, SEC, pkgSpec, fp, bbLegs, dimText, fmtF, refPfx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PLIB = api;
})(typeof window !== 'undefined' ? window : globalThis);
