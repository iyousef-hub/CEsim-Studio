/* CEsim Software design: UML (all 14 diagram types), data flow, C4, BPMN and database diagrams
   (Chen, crow's foot, IDEF1X and relational tables), with SQL and source code in both directions. */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const tw = (s, sz = 12) => String(s || '').length * sz * 0.56;
  const lines = s => String(s || '').split('\n').map(x => x.replace(/\s+$/, '')).filter(x => x.trim() !== '');
  const C = { line: '#1f2937', fill: '#ffffff', head: '#eef3fa', note: '#fff8c5', dim: '#64748b', accent: '#185fa5', sel: '#2563eb' };
  /* drawing styles: colour (tinted by kind, rounded, soft shadow), classic and print (black on white) */
  const STYLES = {
    colour: { name: 'Colour', line: '#334155', head: '#e6eef8', note: '#fff6c9', r: 6, shadow: true,
      heads: { class: '#dbe8fb', abstract: '#e3e3fb', interface: '#d5f2e8', enum: '#fdf0cd', datatype: '#efe4fb', object: '#fbe3ee', stereotype: '#ece6fb', metaclass: '#e5e9ef', entity: '#dbe8fb', weak: '#efe4fb', lifeline: '#dbe8fb' },
      fills: { usecase: '#f3f8ff', action: '#f1faf4', state: '#f2f8fe', objnode: '#fbfcfe', component: '#f3f8ff', artifact: '#fdfbf3', part: '#f3f8ff', interaction: '#ffffff', iref: '#f7f9fc', task: '#ffffff', subprocess: '#ffffff', extent: '#f7f9fc', sendsig: '#f1faf4', recvsig: '#f1faf4', database: '#f3f8ff' } },
    classic: { name: 'Classic', line: '#1f2937', head: '#eef3fa', note: '#fff8c5', r: 0, shadow: false, heads: {}, fills: {} },
    print: { name: 'Print', line: '#000000', head: '#ffffff', note: '#ffffff', r: 0, shadow: false, heads: {}, fills: {} },
  };
  let TH = STYLES.colour, ROUND = 6;
  function useStyle(dg) { TH = STYLES[dg.style] || STYLES.colour; ROUND = TH.r; C.line = TH.line; C.head = TH.head; C.note = TH.note; C.fill = '#ffffff'; C.dim = dg.style === 'print' ? '#333' : '#64748b'; }
  const DEFS = '<defs><filter id="sdSh" x="-10%" y="-10%" width="125%" height="135%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#0f172a" flood-opacity=".14"/></filter></defs>';
  const headPath = (x, y, w, h, r, f) => r ? `<path d="M${x + 0.7} ${y + h}V${y + r}Q${x + 0.7} ${y + 0.7} ${x + r} ${y + 0.7}H${x + w - r}Q${x + w - 0.7} ${y + 0.7} ${x + w - 0.7} ${y + r}V${y + h}Z" fill="${f}"/>` : `<rect x="${x + 0.7}" y="${y + 0.7}" width="${w - 1.4}" height="${h - 0.7}" fill="${f}"/>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.sz || 12}"${o.b ? ' font-weight="600"' : ''}${o.i ? ' font-style="italic"' : ''}${o.u ? ' text-decoration="underline"' : ''} text-anchor="${o.a || 'middle'}" fill="${o.c || C.line}"${o.mono ? ' font-family="IBM Plex Mono,monospace"' : ''}>${esc(s)}</text>`;
  const R = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${o.r ? ` rx="${o.r}"` : ''} fill="${o.f || C.fill}" stroke="${o.s || C.line}" stroke-width="${o.sw || 1.3}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}/>`;
  const Lp = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.s || C.line}" stroke-width="${o.sw || 1.3}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}/>`;
  const P = (pts, o = {}) => `<path d="${pts}" fill="${o.f || 'none'}" stroke="${o.s || C.line}" stroke-width="${o.sw || 1.3}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}/>`;
  const E = (cx, cy, rx, ry, o = {}) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${o.f || C.fill}" stroke="${o.s || C.line}" stroke-width="${o.sw || 1.3}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}/>`;
  const wrap = (s, max) => { const out = []; for (const para of String(s || '').split('\n')) { let cur = ''; for (const w of para.split(/\s+/)) { if (!w) continue; if (cur && tw(cur + ' ' + w, 11) > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } return out; };

  /* ---------------- diagram types ---------------- */
  const TYPES = {
    class: { name: 'Class diagram', grp: 'UML structure', nodes: ['class', 'abstract', 'interface', 'enum', 'datatype', 'package', 'note'], edges: ['association', 'directed', 'aggregation', 'composition', 'inheritance', 'realization', 'dependency', 'anchor'], ortho: true },
    object: { name: 'Object diagram', grp: 'UML structure', nodes: ['object', 'package', 'note'], edges: ['link', 'directed', 'anchor'] },
    component: { name: 'Component diagram', grp: 'UML structure', nodes: ['component', 'provided', 'port', 'artifact', 'package', 'note'], edges: ['assembly', 'dependency', 'realization', 'association', 'delegation', 'anchor'] },
    deployment: { name: 'Deployment diagram', grp: 'UML structure', nodes: ['node3d', 'device', 'execenv', 'artifact', 'database', 'component', 'note'], edges: ['commpath', 'deploy', 'dependency', 'anchor'] },
    package: { name: 'Package diagram', grp: 'UML structure', nodes: ['package', 'class', 'note'], edges: ['import', 'merge', 'access', 'dependency', 'nesting', 'anchor'] },
    composite: { name: 'Composite structure diagram', grp: 'UML structure', nodes: ['structured', 'part', 'port', 'collaboration', 'note'], edges: ['connector', 'delegation', 'rolebinding', 'anchor'] },
    profile: { name: 'Profile diagram', grp: 'UML structure', nodes: ['profilepkg', 'stereotype', 'metaclass', 'note'], edges: ['extension', 'inheritance', 'dependency', 'anchor'] },
    usecase: { name: 'Use case diagram', grp: 'UML behaviour', nodes: ['actor', 'usecase', 'boundary', 'note'], edges: ['association', 'include', 'extend', 'inheritance', 'anchor'] },
    activity: { name: 'Activity diagram', grp: 'UML behaviour', nodes: ['initial', 'action', 'decision', 'forkbar', 'objnode', 'sendsig', 'recvsig', 'timeevent', 'final', 'flowfinal', 'partition', 'note'], edges: ['flow', 'objflow', 'anchor'] },
    state: { name: 'State machine diagram', grp: 'UML behaviour', nodes: ['initial', 'state', 'composite', 'choice', 'junction', 'history', 'deephistory', 'forkbar', 'final', 'terminate', 'note'], edges: ['transition', 'anchor'] },
    sequence: { name: 'Sequence diagram', grp: 'UML interaction', nodes: ['lifeline', 'lactor', 'lboundary', 'lcontrol', 'lentity', 'ldatabase', 'fragment', 'note'], edges: ['sync', 'async', 'reply', 'create', 'destroy'], special: 'sequence' },
    communication: { name: 'Communication diagram', grp: 'UML interaction', nodes: ['object', 'actor', 'note'], edges: ['link', 'anchor'] },
    timing: { name: 'Timing diagram', grp: 'UML interaction', nodes: ['tline', 'note'], edges: ['tmsg'], special: 'timing' },
    overview: { name: 'Interaction overview diagram', grp: 'UML interaction', nodes: ['initial', 'interaction', 'iref', 'decision', 'forkbar', 'final', 'note'], edges: ['flow', 'anchor'] },
    er: { name: 'Entity relationship diagram', grp: 'Database', nodes: ['entity', 'note'], edges: ['rel', 'anchor'], notations: ['crowsfoot', 'chen', 'idef1x', 'uml'], ortho: true },
    dfd: { name: 'Data flow diagram', grp: 'Software analysis', nodes: ['extent', 'process', 'store', 'note'], edges: ['dataflow', 'anchor'], notations: ['yourdon', 'gane'] },
    c4: { name: 'C4 architecture diagram', grp: 'Software analysis', nodes: ['person', 'system', 'extsystem', 'container', 'c4db', 'c4comp', 'c4boundary', 'note'], edges: ['c4rel', 'anchor'] },
    bpmn: { name: 'Business process (BPMN)', grp: 'Software analysis', nodes: ['start', 'intermediate', 'end', 'task', 'subprocess', 'xgateway', 'pgateway', 'igateway', 'egateway', 'dataobj', 'datastore', 'pool', 'lane', 'group', 'annotation'], edges: ['seqflow', 'msgflow', 'assoc'] },
  };
  const NOTATION_NAME = { crowsfoot: "Crow's foot", chen: 'Chen', idef1x: 'IDEF1X', uml: 'Relational tables', yourdon: 'Yourdon and DeMarco', gane: 'Gane and Sarson' };

  /* ---------------- node kinds ---------------- */
  // f: field list [key,label,kind,options]; container: drawn first, holds what is inside it; shape: for line clipping
  const F = {
    name: ['name', 'Name', 'text'], stereo: ['stereo', 'Stereotype', 'text'], attrs: ['attrs', 'Attributes (one per line, e.g. - id: int)', 'lines'],
    ops: ['ops', 'Operations (one per line, e.g. + save(): void)', 'lines'], text: ['text', 'Text', 'lines'], desc: ['desc', 'Description', 'lines'], tech: ['tech', 'Technology', 'text'],
  };
  const NK = {};
  const nk = (k, o) => { NK[k] = Object.assign({ w: 120, h: 50, shape: 'rect', f: [F.name] }, o); };
  const members = s => lines(s).map(x => { const st = /\bstatic\b|\{static\}/.test(x); const ab = /\babstract\b|\{abstract\}/.test(x); return { t: x.replace(/\{static\}|\{abstract\}/g, '').replace(/\bstatic\s+/, '').trim(), st, ab }; });
  function classSize(n, extra) {
    const head = [(n.props.stereo ? '«' + n.props.stereo + '»' : ''), n.name || ''].concat(extra || []);
    const A = members(n.props.attrs), O = members(n.props.ops), V = lines(n.props.values);
    const w = Math.max(110, ...head.map(s => tw(s, 13) + 24), ...A.concat(O).map(m => tw(m.t, 12) + 18), ...V.map(v => tw(v, 12) + 18));
    const hh = 10 + head.filter(Boolean).length * 16 + 4;
    const sec = [n.props.values != null ? V : null, n.props.attrs != null ? A : null, n.props.ops != null ? O : null].filter(x => x !== null);
    const h = hh + sec.reduce((a, s) => a + Math.max(14, s.length * 16 + 8), 0);
    return [Math.ceil(w / 10) * 10, Math.ceil(h / 2) * 2];
  }
  function classDraw(n, b, extra, opt = {}) {
    let s = R(b.x, b.y, b.w, b.h, { f: opt.fill || C.fill, r: ROUND }); let y = b.y + 6;
    const head = [n.props.stereo ? '«' + n.props.stereo + '»' : null].concat(extra || []).filter(Boolean);
    s += headPath(b.x, b.y, b.w, 10 + (head.length + 1) * 16 + 4 - 0.7, ROUND, opt.head || C.head);
    for (const t of head) { y += 16; s += T(b.x + b.w / 2, y - 3, t, { sz: 11 }); }
    y += 16; s += T(b.x + b.w / 2, y - 2, n.name, { sz: 13, b: 1, i: !!(n.props.abstract || opt.italic), u: !!opt.under }); y += 8;
    const sec = [n.props.values != null ? lines(n.props.values).map(t => ({ t })) : null, n.props.attrs != null ? members(n.props.attrs) : null, n.props.ops != null ? members(n.props.ops) : null].filter(x => x !== null);
    for (const ms of sec) { s += Lp(b.x, y, b.x + b.w, y); y += 4; for (const m of ms) { y += 16; s += T(b.x + 8, y - 4, m.t, { a: 'start', u: m.st, i: m.ab }); } y += ms.length ? 4 : 10; }
    return s;
  }
  const noteDraw = (n, b) => { const c = 12; let s = P(`M${b.x} ${b.y}H${b.x + b.w - c}L${b.x + b.w} ${b.y + c}V${b.y + b.h}H${b.x}Z`, { f: C.note }) + P(`M${b.x + b.w - c} ${b.y}V${b.y + c}H${b.x + b.w}`); wrap(n.name, b.w - 16).forEach((t, i) => s += T(b.x + 8, b.y + 18 + i * 15, t, { a: 'start', sz: 11.5 })); return s; };
  const noteSize = n => { const ls = wrap(n.name, 200); return [Math.max(100, Math.min(220, Math.max(...ls.map(l => tw(l, 11.5))) + 24)), Math.max(40, ls.length * 15 + 16)]; };
  const centered = (n, b, sz = 12, bold) => { const ls = wrap(n.name, b.w - 14); const y0 = b.y + b.h / 2 - (ls.length - 1) * 7.5 + 4; return ls.map((t, i) => T(b.x + b.w / 2, y0 + i * 15, t, { sz, b: bold })).join(''); };
  const folder = (n, b, label, o = {}) => { const tw0 = Math.min(b.w * 0.6, Math.max(60, tw(label || n.name, 12) + 20)); let s = R(b.x, b.y, tw0, 18, { f: o.f || C.head }) + R(b.x, b.y + 18, b.w, b.h - 18, { f: o.f2 || 'rgba(255,255,255,.6)' }); s += T(b.x + 8, b.y + 13, label || n.name, { a: 'start', b: 1 }); return s; };
  const stick = (cx, y, sc = 1, col = C.line) => `<g stroke="${col}" stroke-width="1.5" fill="none"><circle cx="${cx}" cy="${y + 8 * sc}" r="${7 * sc}" fill="#fff"/><path d="M${cx} ${y + 15 * sc}V${y + 36 * sc}M${cx - 13 * sc} ${y + 22 * sc}H${cx + 13 * sc}M${cx} ${y + 36 * sc}L${cx - 11 * sc} ${y + 52 * sc}M${cx} ${y + 36 * sc}L${cx + 11 * sc} ${y + 52 * sc}"/></g>`;

  nk('note', { f: [['name', 'Text', 'lines']], auto: noteSize, draw: noteDraw });
  // class family
  const full_ = n => ({ name: n.name, props: Object.assign({ attrs: '', ops: '' }, n.props) });
  nk('class', { f: [F.name, F.stereo, ['abstract', 'Abstract', 'check'], F.attrs, F.ops], auto: n => classSize(full_(n)), draw: (n, b) => classDraw(full_(n), b), props: { attrs: '- id: int', ops: '+ toString(): String' } });
  nk('abstract', { label: 'Abstract class', base: 'class', props: { abstract: true, attrs: '# id: int', ops: '+ area(): double {abstract}' } });
  nk('interface', { f: [F.name, F.ops], auto: n => classSize(Object.assign({}, n, { props: Object.assign({ ops: '' }, n.props) }), ['«interface»']), draw: (n, b) => classDraw(Object.assign({}, n, { props: Object.assign({ ops: '' }, n.props) }), b, ['«interface»'], { italic: 1 }), props: { ops: '+ run(): void' } });
  nk('enum', { label: 'Enumeration', f: [F.name, ['values', 'Values (one per line)', 'lines']], auto: n => classSize(n, ['«enumeration»']), draw: (n, b) => classDraw(n, b, ['«enumeration»']), props: { values: 'RED\nGREEN\nBLUE' } });
  nk('datatype', { label: 'Data type', f: [F.name, F.attrs], auto: n => classSize(n, ['«dataType»']), draw: (n, b) => classDraw(n, b, ['«dataType»']), props: { attrs: 'value: double' } });
  nk('package', { container: 1, w: 200, h: 130, f: [F.name], draw: (n, b) => folder(n, b) });
  nk('object', { f: [['name', 'Name (object : Class)', 'text'], ['attrs', 'Slots (one per line, e.g. id = 7)', 'lines']], auto: n => classSize({ name: n.name, props: { attrs: n.props.attrs } }), draw: (n, b) => classDraw({ name: n.name, props: { attrs: n.props.attrs } }, b, null, { under: 1 }), props: { attrs: 'id = 1' } });
  // use case
  nk('actor', { w: 60, h: 80, shape: 'rect', auto: n => [Math.max(60, tw(n.name, 12) + 10), 78], draw: (n, b) => stick(b.x + b.w / 2, b.y, 1) + T(b.x + b.w / 2, b.y + 72, n.name) });
  nk('usecase', { label: 'Use case', shape: 'ellipse', auto: n => [Math.max(120, tw(n.name, 12) + 50), 54], draw: (n, b) => E(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2) + centered(n, b) });
  nk('boundary', { label: 'System boundary', container: 1, w: 300, h: 320, draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: 'rgba(248,250,252,.7)' }) + T(b.x + b.w / 2, b.y + 18, n.name, { b: 1 }) });
  // activity and state
  nk('initial', { w: 24, h: 24, shape: 'circle', f: [], draw: (n, b) => `<circle cx="${b.x + 12}" cy="${b.y + 12}" r="11" fill="${C.line}"/>` });
  nk('final', { w: 28, h: 28, shape: 'circle', f: [], draw: (n, b) => `<circle cx="${b.x + 14}" cy="${b.y + 14}" r="13" fill="#fff" stroke="${C.line}" stroke-width="1.5"/><circle cx="${b.x + 14}" cy="${b.y + 14}" r="8" fill="${C.line}"/>` });
  nk('flowfinal', { label: 'Flow final', w: 26, h: 26, shape: 'circle', f: [], draw: (n, b) => `<circle cx="${b.x + 13}" cy="${b.y + 13}" r="12" fill="#fff" stroke="${C.line}" stroke-width="1.5"/>` + P(`M${b.x + 5} ${b.y + 5}L${b.x + 21} ${b.y + 21}M${b.x + 21} ${b.y + 5}L${b.x + 5} ${b.y + 21}`) });
  nk('action', { auto: n => [Math.max(110, tw(n.name, 12) + 30), 46], draw: (n, b) => R(b.x, b.y, b.w, b.h, { r: 12 }) + centered(n, b) });
  nk('decision', { label: 'Decision / merge', w: 44, h: 44, shape: 'diamond', f: [['name', 'Note (optional)', 'text']], draw: (n, b) => P(`M${b.x + b.w / 2} ${b.y}L${b.x + b.w} ${b.y + b.h / 2}L${b.x + b.w / 2} ${b.y + b.h}L${b.x} ${b.y + b.h / 2}Z`, { f: '#fff' }) + (n.name ? T(b.x + b.w + 4, b.y - 2, n.name, { a: 'start', sz: 11, c: C.dim }) : '') });
  nk('forkbar', { label: 'Fork / join', w: 140, h: 8, resize: 1, f: [], draw: (n, b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2" fill="${C.line}"/>` });
  nk('objnode', { label: 'Object node', auto: n => [Math.max(100, tw(n.name, 12) + 24), 40], draw: (n, b) => R(b.x, b.y, b.w, b.h) + centered(n, b) });
  nk('sendsig', { label: 'Send signal', auto: n => [Math.max(110, tw(n.name, 12) + 40), 40], draw: (n, b) => P(`M${b.x} ${b.y}H${b.x + b.w - 16}L${b.x + b.w} ${b.y + b.h / 2}L${b.x + b.w - 16} ${b.y + b.h}H${b.x}Z`, { f: '#fff' }) + centered({ name: n.name }, { x: b.x, y: b.y, w: b.w - 12, h: b.h }) });
  nk('recvsig', { label: 'Accept event', auto: n => [Math.max(110, tw(n.name, 12) + 40), 40], draw: (n, b) => P(`M${b.x} ${b.y}H${b.x + b.w}V${b.y + b.h}H${b.x}L${b.x + 16} ${b.y + b.h / 2}Z`, { f: '#fff' }) + centered({ name: n.name }, { x: b.x + 12, y: b.y, w: b.w - 12, h: b.h }) });
  nk('timeevent', { label: 'Time event', w: 30, h: 36, f: [F.name], draw: (n, b) => P(`M${b.x + 3} ${b.y}H${b.x + 27}L${b.x + 3} ${b.y + 36}H${b.x + 27}Z`, { f: '#fff' }) + (n.name ? T(b.x + 36, b.y + 22, n.name, { a: 'start', sz: 11 }) : '') });
  nk('partition', { label: 'Swimlane', container: 1, w: 220, h: 420, draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: 'rgba(248,250,252,.6)' }) + R(b.x, b.y, b.w, 26, { f: C.head }) + T(b.x + b.w / 2, b.y + 17, n.name, { b: 1 }) });
  nk('state', { f: [F.name, ['acts', 'Inside (entry / do / exit, one per line)', 'lines']], shape: 'rect', auto: n => { const a = lines(n.props.acts); return [Math.max(110, tw(n.name, 13) + 30, ...a.map(x => tw(x, 11.5) + 20)), a.length ? 36 + a.length * 15 + 6 : 44]; }, draw: (n, b) => { const a = lines(n.props.acts); let s = R(b.x, b.y, b.w, b.h, { r: 12 }); if (!a.length) return s + centered(n, b, 12, 1); s += T(b.x + b.w / 2, b.y + 20, n.name, { b: 1 }) + Lp(b.x, b.y + 28, b.x + b.w, b.y + 28); a.forEach((t, i) => s += T(b.x + 10, b.y + 44 + i * 15, t, { a: 'start', sz: 11.5 })); return s; } });
  nk('composite', { label: 'Composite state', container: 1, w: 280, h: 200, draw: (n, b) => R(b.x, b.y, b.w, b.h, { r: 14, f: 'rgba(255,255,255,.7)' }) + T(b.x + 12, b.y + 18, n.name, { a: 'start', b: 1 }) + Lp(b.x, b.y + 26, b.x + b.w, b.y + 26) });
  nk('choice', { w: 30, h: 30, shape: 'diamond', f: [['name', 'Note (optional)', 'text']], draw: (n, b) => P(`M${b.x + 15} ${b.y}L${b.x + 30} ${b.y + 15}L${b.x + 15} ${b.y + 30}L${b.x} ${b.y + 15}Z`, { f: '#fff' }) });
  nk('junction', { w: 16, h: 16, shape: 'circle', f: [], draw: (n, b) => `<circle cx="${b.x + 8}" cy="${b.y + 8}" r="7" fill="${C.line}"/>` });
  nk('history', { label: 'Shallow history', w: 28, h: 28, shape: 'circle', f: [], draw: (n, b) => `<circle cx="${b.x + 14}" cy="${b.y + 14}" r="13" fill="#fff" stroke="${C.line}" stroke-width="1.3"/>` + T(b.x + 14, b.y + 18.5, 'H', { b: 1 }) });
  nk('deephistory', { label: 'Deep history', w: 28, h: 28, shape: 'circle', f: [], draw: (n, b) => `<circle cx="${b.x + 14}" cy="${b.y + 14}" r="13" fill="#fff" stroke="${C.line}" stroke-width="1.3"/>` + T(b.x + 14, b.y + 18.5, 'H*', { b: 1, sz: 11 }) });
  nk('terminate', { w: 22, h: 22, f: [], draw: (n, b) => P(`M${b.x} ${b.y}L${b.x + 22} ${b.y + 22}M${b.x + 22} ${b.y}L${b.x} ${b.y + 22}`, { sw: 2 }) });
  // component, deployment, package, composite, profile
  const compIcon = (x, y) => R(x, y, 14, 18, { f: '#fff', sw: 1 }) + R(x - 4, y + 3, 8, 4, { f: '#fff', sw: 1 }) + R(x - 4, y + 10, 8, 4, { f: '#fff', sw: 1 });
  nk('component', { f: [F.name, F.stereo], auto: n => [Math.max(140, tw(n.name, 13) + 50), 64], draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: '#f6f9fd' }) + compIcon(b.x + b.w - 24, b.y + 8) + T(b.x + b.w / 2 - 6, b.y + b.h / 2 - (n.props.stereo ? 2 : -4), n.props.stereo ? '«' + n.props.stereo + '»' : '', { sz: 11 }) + T(b.x + b.w / 2 - 6, b.y + b.h / 2 + (n.props.stereo ? 14 : 4), n.name, { b: 1 }) });
  nk('provided', { label: 'Interface (lollipop)', w: 22, h: 22, shape: 'circle', draw: (n, b) => `<circle cx="${b.x + 11}" cy="${b.y + 11}" r="10" fill="#fff" stroke="${C.line}" stroke-width="1.4"/>` + T(b.x + 11, b.y + 36, n.name, { sz: 11 }) });
  nk('port', { w: 14, h: 14, draw: (n, b) => R(b.x, b.y, 14, 14, { f: '#fff' }) + (n.name ? T(b.x + 7, b.y - 4, n.name, { sz: 10.5 }) : '') });
  nk('artifact', { auto: n => [Math.max(130, tw(n.name, 12) + 40), 54], draw: (n, b) => R(b.x, b.y, b.w, b.h) + P(`M${b.x + b.w - 22} ${b.y + 6}h10l5 5v14h-15z M${b.x + b.w - 12} ${b.y + 6}v5h5`, { sw: 1, f: '#fff' }) + T(b.x + b.w / 2, b.y + 22, '«artifact»', { sz: 11 }) + T(b.x + b.w / 2, b.y + 40, n.name, { b: 1 }) });
  nk('node3d', { label: 'Node', container: 1, w: 240, h: 150, f: [F.name, F.stereo], draw: (n, b) => { const d = 12; return P(`M${b.x} ${b.y + d}L${b.x + d} ${b.y}H${b.x + b.w}V${b.y + b.h - d}L${b.x + b.w - d} ${b.y + b.h}`, { f: '#e8eef6' }) + P(`M${b.x + b.w - d} ${b.y + d}L${b.x + b.w} ${b.y}`) + R(b.x, b.y + d, b.w - d, b.h - d, { f: 'rgba(246,249,253,.9)' }) + T(b.x + 10, b.y + d + 18, (n.props.stereo ? '«' + n.props.stereo + '» ' : '') + n.name, { a: 'start', b: 1 }); } });
  nk('device', { label: 'Device', base: 'node3d', props: { stereo: 'device' } });
  nk('execenv', { label: 'Execution environment', base: 'node3d', props: { stereo: 'executionEnvironment' } });
  const cylinder = (b, f = '#fff') => { const e = 8; return P(`M${b.x} ${b.y + e}V${b.y + b.h - e}A${b.w / 2} ${e} 0 0 0 ${b.x + b.w} ${b.y + b.h - e}V${b.y + e}`, { f }) + E(b.x + b.w / 2, b.y + e, b.w / 2, e, { f }); };
  nk('database', { auto: n => [Math.max(90, tw(n.name, 12) + 24), 70], draw: (n, b) => cylinder(b) + centered(n, { x: b.x, y: b.y + 10, w: b.w, h: b.h - 10 }) });
  nk('structured', { label: 'Structured class', container: 1, w: 300, h: 200, draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: 'rgba(255,255,255,.8)' }) + T(b.x + b.w / 2, b.y + 18, n.name, { b: 1 }) + Lp(b.x, b.y + 26, b.x + b.w, b.y + 26) });
  nk('part', { f: [['name', 'Name (role : Type)', 'text'], ['mult', 'Multiplicity', 'text']], auto: n => [Math.max(100, tw(n.name, 12) + 30), 44], draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: '#f6f9fd' }) + centered(n, b) + (n.props.mult ? T(b.x + b.w - 6, b.y + 12, '[' + n.props.mult + ']', { a: 'end', sz: 10.5, c: C.dim }) : '') });
  nk('collaboration', { shape: 'ellipse', auto: n => [Math.max(140, tw(n.name, 12) + 60), 60], draw: (n, b) => E(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, { d: '6 4' }) + centered(n, b) });
  nk('profilepkg', { label: 'Profile', container: 1, w: 300, h: 200, draw: (n, b) => folder(n, b, '«profile» ' + n.name) });
  nk('stereotype', { f: [F.name, F.attrs], auto: n => classSize(n, ['«stereotype»']), draw: (n, b) => classDraw(n, b, ['«stereotype»']), props: { attrs: 'version: String' } });
  nk('metaclass', { f: [F.name], auto: n => classSize(n, ['«metaclass»']), draw: (n, b) => classDraw(n, b, ['«metaclass»']) });
  // sequence (drawn by the sequence layout, sizes used for the heads)
  for (const [k, role, label] of [['lifeline', 'object', 'Lifeline'], ['lactor', 'actor', 'Actor lifeline'], ['lboundary', 'boundary', 'Boundary'], ['lcontrol', 'control', 'Control'], ['lentity', 'entity', 'Entity'], ['ldatabase', 'database', 'Database lifeline']])
    nk(k, { label, seq: role, auto: n => [Math.max(role === 'object' ? 100 : 70, tw(n.name, 12) + 24), role === 'object' ? 36 : 60] });
  nk('fragment', { label: 'Combined fragment', f: [['op', 'Operator', 'select', ['alt', 'opt', 'loop', 'par', 'break', 'critical', 'neg', 'ref', 'seq', 'strict']], ['name', 'Guard, e.g. [x > 0]', 'text'], ['first', 'From message no.', 'num'], ['last', 'To message no.', 'num'], ['elseAt', 'Else starts at message no. (alt)', 'num'], ['guard2', 'Else guard', 'text']], props: { op: 'alt', first: 1, last: 2 } });
  // communication, timing, overview
  nk('tline', { label: 'Timing lifeline', f: [F.name, ['states', 'States, top to bottom (comma separated)', 'text'], ['changes', 'Changes (time:state, comma separated)', 'text'], ['tmax', 'End time', 'num'], ['unit', 'Time unit', 'text']], props: { states: 'Idle,Busy', changes: '0:Idle,10:Busy,30:Idle', tmax: 50, unit: 'ms' } });
  nk('interaction', { label: 'Interaction', f: [F.name, F.text], auto: n => { const t = lines(n.props.text); return [Math.max(160, tw(n.name, 12) + 60, ...t.map(x => tw(x, 11.5) + 24)), Math.max(70, 36 + t.length * 15)]; }, draw: (n, b) => { const lab = 'sd ' + n.name; const w0 = tw(lab, 11) + 16; let s = R(b.x, b.y, b.w, b.h) + P(`M${b.x} ${b.y + 18}H${b.x + w0}L${b.x + w0 + 8} ${b.y + 10}V${b.y}`, { f: C.head }) + T(b.x + 6, b.y + 13, lab, { a: 'start', sz: 11, b: 1 }); lines(n.props.text).forEach((t, i) => s += T(b.x + 12, b.y + 36 + i * 15, t, { a: 'start', sz: 11.5, mono: 1 })); return s; }, props: { text: 'A -> B: request()' } });
  nk('iref', { label: 'Interaction use (ref)', auto: n => [Math.max(150, tw(n.name, 12) + 60), 56], draw: (n, b) => R(b.x, b.y, b.w, b.h) + P(`M${b.x} ${b.y + 18}H${b.x + 30}L${b.x + 38} ${b.y + 10}V${b.y}`, { f: C.head }) + T(b.x + 6, b.y + 13, 'ref', { a: 'start', sz: 11, b: 1 }) + centered(n, { x: b.x, y: b.y + 8, w: b.w, h: b.h - 8 }) });
  // ER
  nk('entity', { f: [F.name, ['weak', 'Weak entity (depends on another for its key)', 'check'], ['cols', 'Columns', 'cols']], props: { cols: [{ name: 'id', type: 'INT', pk: 1, nn: 1, ai: 1 }] } });
  // DFD
  nk('extent', { label: 'External entity', auto: n => [Math.max(110, tw(n.name, 12) + 30), 50] });
  nk('process', { f: [F.name, ['num', 'Number', 'text']], auto: n => [Math.max(96, tw(n.name, 12) * 0.8 + 40), Math.max(96, tw(n.name, 12) * 0.8 + 40)] });
  nk('store', { label: 'Data store', f: [F.name, ['num', 'Id, e.g. D1', 'text']], auto: n => [Math.max(130, tw(n.name, 12) + 60), 36] });
  // C4
  const c4box = (n, b, f, dark, kind, round) => { let s = R(b.x, b.y, b.w, b.h, { f, s: dark, r: round ? 10 : 4, sw: 1.2 }); const desc = wrap(n.props.desc, b.w - 20); const y0 = b.y + 22; s += T(b.x + b.w / 2, y0, n.name, { b: 1, c: '#fff', sz: 13 }) + T(b.x + b.w / 2, y0 + 15, '[' + kind + (n.props.tech ? ': ' + n.props.tech : '') + ']', { sz: 10.5, c: '#eaf1fb' }); desc.forEach((t, i) => s += T(b.x + b.w / 2, y0 + 36 + i * 14, t, { sz: 11, c: '#fff' })); return s; };
  const c4size = n => { const d = wrap(n.props.desc, 170); return [Math.max(180, tw(n.name, 13) + 30), Math.max(90, 56 + d.length * 14 + 10)]; };
  nk('person', { f: [F.name, F.desc], auto: n => { const [w, h] = c4size(n); return [w, h + 34]; }, draw: (n, b) => `<circle cx="${b.x + b.w / 2}" cy="${b.y + 20}" r="20" fill="#08427b" stroke="#052e56"/>` + c4box(n, { x: b.x, y: b.y + 34, w: b.w, h: b.h - 34 }, '#08427b', '#052e56', 'Person', 1), props: { desc: 'A user of the system' } });
  nk('system', { label: 'Software system', f: [F.name, F.desc], auto: c4size, draw: (n, b) => c4box(n, b, '#1168bd', '#0b4884', 'Software System'), props: { desc: 'What it does' } });
  nk('extsystem', { label: 'External system', f: [F.name, F.desc], auto: c4size, draw: (n, b) => c4box(n, b, '#8a8a8a', '#6b6b6b', 'Software System'), props: { desc: 'Outside the scope' } });
  nk('container', { f: [F.name, F.tech, F.desc], auto: c4size, draw: (n, b) => c4box(n, b, '#438dd5', '#2e6295', 'Container'), props: { tech: 'Web app', desc: 'Serves the pages' } });
  nk('c4db', { label: 'Database container', f: [F.name, F.tech, F.desc], auto: c4size, draw: (n, b) => { const e = 10; let s = P(`M${b.x} ${b.y + e}V${b.y + b.h - e}A${b.w / 2} ${e} 0 0 0 ${b.x + b.w} ${b.y + b.h - e}V${b.y + e}`, { f: '#438dd5', s: '#2e6295' }) + E(b.x + b.w / 2, b.y + e, b.w / 2, e, { f: '#5a9be0', s: '#2e6295' }); const nn = Object.assign({}, n); return s + c4box(nn, { x: b.x, y: b.y + 8, w: b.w, h: b.h - 8 }, 'none', 'none', 'Container'); }, props: { tech: 'Relational database', desc: 'Stores the data' } });
  nk('c4comp', { label: 'Component', f: [F.name, F.tech, F.desc], auto: c4size, draw: (n, b) => c4box(n, b, '#85bbf0', '#5d82a8', 'Component').replace(/fill="#fff"/g, 'fill="#0b2545"').replace(/fill="#eaf1fb"/g, 'fill="#23415f"'), props: { tech: 'Module', desc: 'One part of the container' } });
  nk('c4boundary', { label: 'Boundary', container: 1, w: 420, h: 300, f: [F.name, ['kind', 'Kind', 'text']], draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: 'none', s: '#444', d: '7 5', r: 6 }) + T(b.x + 10, b.y + b.h - 22, n.name, { a: 'start', b: 1 }) + T(b.x + 10, b.y + b.h - 8, '[' + (n.props.kind || 'Software System') + ']', { a: 'start', sz: 10.5, c: C.dim }) });
  // BPMN
  const evIcon = (cx, cy, t) => { switch (t) { case 'message': return R(cx - 8, cy - 5.5, 16, 11, { f: '#fff', sw: 1.1 }) + P(`M${cx - 8} ${cy - 5.5}L${cx} ${cy + 1}L${cx + 8} ${cy - 5.5}`, { sw: 1.1 }); case 'timer': return `<circle cx="${cx}" cy="${cy}" r="8" fill="#fff" stroke="${C.line}"/>` + P(`M${cx} ${cy}V${cy - 6}M${cx} ${cy}L${cx + 4} ${cy + 2}`, { sw: 1.1 }); case 'error': return P(`M${cx - 7} ${cy + 7}L${cx - 3} ${cy - 6}L${cx + 2} ${cy + 2}L${cx + 7} ${cy - 7}L${cx + 3} ${cy + 6}L${cx - 2} ${cy - 2}Z`, { f: '#fff', sw: 1.1 }); case 'signal': return P(`M${cx} ${cy - 8}L${cx + 8} ${cy + 6}H${cx - 8}Z`, { f: '#fff', sw: 1.1 }); case 'terminate': return `<circle cx="${cx}" cy="${cy}" r="8" fill="${C.line}"/>`; default: return ''; } };
  const evF = ['ev', 'Event type', 'select', ['none', 'message', 'timer', 'error', 'signal', 'terminate']];
  nk('start', { label: 'Start event', w: 36, h: 36, shape: 'circle', f: [F.name, evF], draw: (n, b) => `<circle cx="${b.x + 18}" cy="${b.y + 18}" r="17" fill="#f1fbf3" stroke="#2e7d32" stroke-width="1.6"/>` + evIcon(b.x + 18, b.y + 18, n.props.ev) + (n.name ? T(b.x + 18, b.y + 52, n.name, { sz: 11 }) : '') });
  nk('intermediate', { label: 'Intermediate event', w: 36, h: 36, shape: 'circle', f: [F.name, evF], draw: (n, b) => `<circle cx="${b.x + 18}" cy="${b.y + 18}" r="17" fill="#fffbe6" stroke="#9a6b00" stroke-width="1.3"/><circle cx="${b.x + 18}" cy="${b.y + 18}" r="13.5" fill="none" stroke="#9a6b00" stroke-width="1.3"/>` + evIcon(b.x + 18, b.y + 18, n.props.ev) + (n.name ? T(b.x + 18, b.y + 52, n.name, { sz: 11 }) : ''), props: { ev: 'timer' } });
  nk('end', { label: 'End event', w: 36, h: 36, shape: 'circle', f: [F.name, evF], draw: (n, b) => `<circle cx="${b.x + 18}" cy="${b.y + 18}" r="16" fill="#fdecec" stroke="#b3261e" stroke-width="3.2"/>` + evIcon(b.x + 18, b.y + 18, n.props.ev) + (n.name ? T(b.x + 18, b.y + 52, n.name, { sz: 11 }) : '') });
  const taskIcon = (x, y, t) => { switch (t) { case 'user': return `<circle cx="${x + 7}" cy="${y + 5}" r="4" fill="#fff" stroke="${C.line}"/>` + P(`M${x} ${y + 16}Q${x + 7} ${y + 6} ${x + 14} ${y + 16}Z`, { f: '#fff', sw: 1 }); case 'service': return `<circle cx="${x + 7}" cy="${y + 8}" r="6" fill="#fff" stroke="${C.line}" stroke-dasharray="2 1.5" stroke-width="2.4"/><circle cx="${x + 7}" cy="${y + 8}" r="2.5" fill="#fff" stroke="${C.line}"/>`; case 'script': return R(x, y, 12, 15, { f: '#fff', sw: 1 }) + P(`M${x + 3} ${y + 5}h6M${x + 3} ${y + 8}h6M${x + 3} ${y + 11}h6`, { sw: 0.9 }); case 'manual': return P(`M${x} ${y + 6}h9a2 2 0 0 1 0 4h-2h5a2 2 0 0 1 0 4h-12z`, { f: '#fff', sw: 1 }); case 'send': return R(x, y + 2, 15, 10, { f: C.line, s: C.line }) + P(`M${x} ${y + 2}L${x + 7.5} ${y + 8}L${x + 15} ${y + 2}`, { s: '#fff', sw: 1 }); case 'receive': return R(x, y + 2, 15, 10, { f: '#fff', sw: 1 }) + P(`M${x} ${y + 2}L${x + 7.5} ${y + 8}L${x + 15} ${y + 2}`, { sw: 1 }); case 'rule': return R(x, y + 2, 15, 12, { f: '#fff', sw: 1 }) + R(x, y + 2, 15, 4, { f: '#ddd', sw: 1 }); default: return ''; } };
  nk('task', { f: [F.name, ['tt', 'Task type', 'select', ['none', 'user', 'service', 'script', 'manual', 'send', 'receive', 'rule']]], auto: n => [Math.max(120, tw(n.name, 12) + 30), 64], draw: (n, b) => R(b.x, b.y, b.w, b.h, { r: 10, f: '#fff' }) + taskIcon(b.x + 8, b.y + 6, n.props.tt) + centered(n, { x: b.x, y: b.y + 4, w: b.w, h: b.h - 4 }) });
  nk('subprocess', { label: 'Sub-process', auto: n => [Math.max(130, tw(n.name, 12) + 30), 70], draw: (n, b) => R(b.x, b.y, b.w, b.h, { r: 10, f: '#fff' }) + centered(n, { x: b.x, y: b.y, w: b.w, h: b.h - 12 }) + R(b.x + b.w / 2 - 7, b.y + b.h - 16, 14, 14, { f: '#fff', sw: 1 }) + P(`M${b.x + b.w / 2 - 4} ${b.y + b.h - 9}h8M${b.x + b.w / 2} ${b.y + b.h - 13}v8`, { sw: 1.2 }) });
  const gw = (n, b, inner) => P(`M${b.x + 22} ${b.y}L${b.x + 44} ${b.y + 22}L${b.x + 22} ${b.y + 44}L${b.x} ${b.y + 22}Z`, { f: '#fffbe6', s: '#9a6b00', sw: 1.4 }) + inner + (n.name ? T(b.x + 22, b.y + 60, n.name, { sz: 11 }) : '');
  nk('xgateway', { label: 'Exclusive gateway', w: 44, h: 44, shape: 'diamond', draw: (n, b) => gw(n, b, P(`M${b.x + 15} ${b.y + 15}L${b.x + 29} ${b.y + 29}M${b.x + 29} ${b.y + 15}L${b.x + 15} ${b.y + 29}`, { sw: 3 })) });
  nk('pgateway', { label: 'Parallel gateway', w: 44, h: 44, shape: 'diamond', draw: (n, b) => gw(n, b, P(`M${b.x + 22} ${b.y + 12}V${b.y + 32}M${b.x + 12} ${b.y + 22}H${b.x + 32}`, { sw: 3 })) });
  nk('igateway', { label: 'Inclusive gateway', w: 44, h: 44, shape: 'diamond', draw: (n, b) => gw(n, b, `<circle cx="${b.x + 22}" cy="${b.y + 22}" r="9" fill="none" stroke="${C.line}" stroke-width="2.6"/>`) });
  nk('egateway', { label: 'Event-based gateway', w: 44, h: 44, shape: 'diamond', draw: (n, b) => gw(n, b, `<circle cx="${b.x + 22}" cy="${b.y + 22}" r="11" fill="none" stroke="${C.line}"/><circle cx="${b.x + 22}" cy="${b.y + 22}" r="8.5" fill="none" stroke="${C.line}"/>` + P(`M${b.x + 22} ${b.y + 16}L${b.x + 27} ${b.y + 20}L${b.x + 25} ${b.y + 26}H${b.x + 19}L${b.x + 17} ${b.y + 20}Z`, { sw: 1 })) });
  nk('dataobj', { label: 'Data object', w: 36, h: 48, draw: (n, b) => P(`M${b.x} ${b.y}H${b.x + 26}L${b.x + 36} ${b.y + 10}V${b.y + 48}H${b.x}Z`, { f: '#fff' }) + P(`M${b.x + 26} ${b.y}V${b.y + 10}H${b.x + 36}`) + (n.name ? T(b.x + 18, b.y + 64, n.name, { sz: 11 }) : '') });
  nk('datastore', { label: 'Data store', w: 54, h: 50, draw: (n, b) => cylinder(b) + (n.name ? T(b.x + b.w / 2, b.y + 66, n.name, { sz: 11 }) : '') });
  nk('pool', { container: 1, w: 640, h: 220, draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: 'rgba(255,255,255,.6)' }) + R(b.x, b.y, 30, b.h, { f: C.head }) + `<text transform="translate(${b.x + 20} ${b.y + b.h / 2}) rotate(-90)" font-size="12" font-weight="600" text-anchor="middle" fill="${C.line}">${esc(n.name)}</text>` });
  nk('lane', { container: 1, w: 610, h: 110, draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: 'rgba(255,255,255,.4)' }) + R(b.x, b.y, 26, b.h, { f: '#f4f7fb' }) + `<text transform="translate(${b.x + 17} ${b.y + b.h / 2}) rotate(-90)" font-size="11.5" text-anchor="middle" fill="${C.line}">${esc(n.name)}</text>` });
  nk('group', { container: 1, w: 260, h: 160, draw: (n, b) => R(b.x, b.y, b.w, b.h, { f: 'none', d: '8 3 2 3', r: 10 }) + T(b.x + b.w / 2, b.y + 16, n.name, { sz: 11, c: C.dim }) });
  nk('annotation', { label: 'Text annotation', f: [['name', 'Text', 'lines']], auto: n => { const ls = wrap(n.name, 180); return [Math.max(90, Math.max(...ls.map(l => tw(l, 11.5))) + 20), Math.max(36, ls.length * 15 + 14)]; }, draw: (n, b) => P(`M${b.x + 12} ${b.y}H${b.x}V${b.y + b.h}H${b.x + 12}`, { sw: 1.4 }) + wrap(n.name, b.w - 16).map((t, i) => T(b.x + 8, b.y + 17 + i * 15, t, { a: 'start', sz: 11.5 })).join('') });
  // fill in aliases (a kind built on another kind)
  for (const k in NK) { const o = NK[k]; if (o.base) { const b = NK[o.base]; NK[k] = Object.assign({}, b, o, { props: Object.assign({}, b.props || {}, o.props || {}), base: o.base }); } }

  /* ---------------- edge kinds ---------------- */
  // s/e: marker at the start/end; d: dash; tag: text shown on the line
  const EK = {
    association: { label: 'Association', f: ['m1', 'm2', 'role1', 'role2'] }, directed: { label: 'Directed association', e: 'arrow', f: ['m1', 'm2'] },
    aggregation: { label: 'Aggregation', s: 'dia', f: ['m1', 'm2'] }, composition: { label: 'Composition', s: 'fdia', f: ['m1', 'm2'] },
    inheritance: { label: 'Generalization (inherits)', e: 'tri' }, realization: { label: 'Realization (implements)', e: 'tri', d: '6 4' },
    dependency: { label: 'Dependency', e: 'arrow', d: '6 4' }, anchor: { label: 'Note link', d: '2 3' }, link: { label: 'Link' },
    assembly: { label: 'Assembly (needs / gives)', e: 'socket' }, delegation: { label: 'Delegation', e: 'arrow' },
    commpath: { label: 'Communication path' }, deploy: { label: 'Deploy', e: 'arrow', d: '6 4', tag: '«deploy»' },
    import: { label: 'Import', e: 'arrow', d: '6 4', tag: '«import»' }, merge: { label: 'Merge', e: 'arrow', d: '6 4', tag: '«merge»' }, access: { label: 'Access', e: 'arrow', d: '6 4', tag: '«access»' },
    nesting: { label: 'Nesting (owns)', s: 'plus' }, connector: { label: 'Connector' }, rolebinding: { label: 'Role binding', d: '6 4' }, extension: { label: 'Extension', e: 'ftri' },
    include: { label: 'Include', e: 'arrow', d: '6 4', tag: '«include»' }, extend: { label: 'Extend', e: 'arrow', d: '6 4', tag: '«extend»' },
    flow: { label: 'Control flow', e: 'arrow', guard: 1 }, objflow: { label: 'Object flow', e: 'arrow', d: '4 3', guard: 1 }, transition: { label: 'Transition', e: 'arrow', guard: 1 },
    sync: { label: 'Message (synchronous)', e: 'filled' }, async: { label: 'Message (asynchronous)', e: 'arrow' }, reply: { label: 'Reply', e: 'arrow', d: '6 4' }, create: { label: 'Create', e: 'arrow', d: '6 4', tag: '«create»' }, destroy: { label: 'Destroy', e: 'filled', tag: '«destroy»' },
    tmsg: { label: 'Timed message', e: 'arrow', f: ['t1', 't2'] },
    rel: { label: 'Relationship', f: ['c1', 'c2'] }, dataflow: { label: 'Data flow', e: 'filled' }, c4rel: { label: 'Relationship', e: 'filled', d: '6 4', f: ['tech'] },
    seqflow: { label: 'Sequence flow', e: 'filled', guard: 1 }, msgflow: { label: 'Message flow', s: 'circle', e: 'tri', d: '7 4' }, assoc: { label: 'Association', d: '2 3' },
  };
  const CARD = { '1': 'Exactly one', '0..1': 'Zero or one', '1..*': 'One or many', '0..*': 'Zero or many' };

  /* ---------------- documents ---------------- */
  let seq = 0; const uid = p => (p || 'n') + Date.now().toString(36).slice(-4) + (seq++).toString(36);
  function newNode(kind, x, y, name) { const K = NK[kind]; const n = { id: uid('n'), kind, x: Math.round(x || 0), y: Math.round(y || 0), name: name != null ? name : (K.label || kind.replace(/^\w/, c => c.toUpperCase())), props: JSON.parse(JSON.stringify(K.props || {})) }; if (K.container || K.resize) { n.w = K.w; n.h = K.h; } if (K.f.length === 0) n.name = ''; return n; }
  function newEdge(kind, from, to) { return { id: uid('e'), kind, from, to, name: '', props: kind === 'rel' ? { c1: '1', c2: '0..*' } : {} }; }
  function newDiagram(type, name) { const t = TYPES[type]; return { id: uid('d'), type, name: name || t.name, notation: t.notations ? t.notations[0] : undefined, ortho: !!t.ortho, nodes: [], edges: [] }; }
  function newDoc(name) { const d = newDiagram('class'); return { format: 'CEsimSoft', version: 1, name: name || 'Untitled', diagrams: [d], active: d.id }; }

  /* ---------------- sizes ---------------- */
  function erCols(n) { return (n.props.cols || []).filter(c => c && c.name); }
  function colText(c, nt) { const ty = c.type ? (nt === 'uml' ? ': ' + c.type : ' ' + c.type) : ''; return c.name + ty; }
  function erSize(n, nt) {
    if (nt === 'chen') return [Math.max(110, tw(n.name, 13) + 30), 46];
    const cols = erCols(n); const w = Math.max(140, tw(n.name, 13) + 30, ...cols.map(c => tw(colText(c, nt), 12) + (cols.some(q => q.pk && q.fk) ? 78 : 64))); const keys = cols.filter(c => c.pk).length;
    return [Math.ceil(w / 10) * 10, 30 + Math.max(1, cols.length) * 18 + 8 + (nt === 'idef1x' && keys && keys < cols.length ? 6 : 0)];
  }
  function size(n, dg) {
    const K = NK[n.kind] || NK.note; if (n.kind === 'entity') return erSize(n, dg.notation || 'crowsfoot');
    if (dg.type === 'dfd') { if (n.kind === 'process' && dg.notation === 'gane') return [Math.max(120, tw(n.name, 12) + 30), 80]; }
    if (n.kind === 'tline') return [timingW(n), timingH(n)];
    if (K.container || K.resize) return [n.w || K.w, n.h || K.h];
    if (K.auto) return K.auto(n); return [K.w, K.h];
  }
  function box(n, dg) { const [w, h] = size(n, dg); return { x: n.x, y: n.y, w, h }; }

  /* ---------------- markers ---------------- */
  // tip: end point, (ux,uy): unit vector pointing out of the line at the tip. returns [svg, back] (back: how far the line stops short)
  function marker(t, x, y, ux, uy, col) {
    col = col || C.line; const px = -uy, py = ux; const pt = (a, b) => `${(x - ux * a + px * b).toFixed(1)} ${(y - uy * a + py * b).toFixed(1)}`;
    switch (t) {
      case 'arrow': return [`<path d="M${pt(11, -6)}L${x} ${y}L${pt(11, 6)}" fill="none" stroke="${col}" stroke-width="1.4"/>`, 0];
      case 'filled': return [`<path d="M${pt(11, -5)}L${x} ${y}L${pt(11, 5)}Z" fill="${col}" stroke="${col}"/>`, 9];
      case 'tri': return [`<path d="M${pt(14, -8)}L${x} ${y}L${pt(14, 8)}Z" fill="#fff" stroke="${col}" stroke-width="1.3"/>`, 14];
      case 'ftri': return [`<path d="M${pt(14, -8)}L${x} ${y}L${pt(14, 8)}Z" fill="${col}" stroke="${col}"/>`, 14];
      case 'dia': return [`<path d="M${x} ${y}L${pt(9, -6)}L${pt(18, 0)}L${pt(9, 6)}Z" fill="#fff" stroke="${col}" stroke-width="1.3"/>`, 18];
      case 'fdia': return [`<path d="M${x} ${y}L${pt(9, -6)}L${pt(18, 0)}L${pt(9, 6)}Z" fill="${col}" stroke="${col}"/>`, 18];
      case 'circle': return [`<circle cx="${(x - ux * 5).toFixed(1)}" cy="${(y - uy * 5).toFixed(1)}" r="4.5" fill="#fff" stroke="${col}" stroke-width="1.3"/>`, 9.5];
      case 'dot': return [`<circle cx="${(x - ux * 4).toFixed(1)}" cy="${(y - uy * 4).toFixed(1)}" r="4" fill="${col}"/>`, 4];
      case 'plus': return [`<circle cx="${(x - ux * 7).toFixed(1)}" cy="${(y - uy * 7).toFixed(1)}" r="7" fill="#fff" stroke="${col}" stroke-width="1.3"/><path d="M${pt(1, 0)}L${pt(13, 0)}M${pt(7, -6)}L${pt(7, 6)}" stroke="${col}" stroke-width="1.2"/>`, 14];
      case 'socket': return [`<path d="M${pt(2, -8)}A8 8 0 0 0 ${pt(2, 8)}" fill="none" stroke="${col}" stroke-width="1.4"/><circle cx="${(x - ux * 2 + ux * 2).toFixed(1)}" cy="${(y - uy * 2 + uy * 2).toFixed(1)}" r="0" />`, 2];
      // crow's foot
      case 'cf:1': return [`<path d="M${pt(10, -7)}L${pt(10, 7)}M${pt(16, -7)}L${pt(16, 7)}" stroke="${col}" stroke-width="1.4"/>`, 0];
      case 'cf:0..1': return [`<path d="M${pt(10, -7)}L${pt(10, 7)}" stroke="${col}" stroke-width="1.4"/><circle cx="${(x - ux * 21).toFixed(1)}" cy="${(y - uy * 21).toFixed(1)}" r="5" fill="#fff" stroke="${col}" stroke-width="1.3"/>`, 0];
      case 'cf:1..*': return [`<path d="M${pt(0, -8)}L${pt(13, 0)}L${pt(0, 8)}M${pt(0, 0)}L${pt(13, 0)}M${pt(17, -7)}L${pt(17, 7)}" fill="none" stroke="${col}" stroke-width="1.4"/>`, 0];
      case 'cf:0..*': return [`<path d="M${pt(0, -8)}L${pt(13, 0)}L${pt(0, 8)}M${pt(0, 0)}L${pt(13, 0)}" fill="none" stroke="${col}" stroke-width="1.4"/><circle cx="${(x - ux * 19).toFixed(1)}" cy="${(y - uy * 19).toFixed(1)}" r="5" fill="#fff" stroke="${col}" stroke-width="1.3"/>`, 0];
      default: return ['', 0];
    }
  }

  /* ---------------- geometry ---------------- */
  function clip(b, shape, tx, ty) { // the point where a line from the centre toward (tx,ty) leaves the shape
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2; let dx = tx - cx, dy = ty - cy; if (!dx && !dy) return [cx, cy];
    if (shape === 'circle' || shape === 'ellipse') { const a = b.w / 2, c = b.h / 2; const k = 1 / Math.sqrt(dx * dx / (a * a) + dy * dy / (c * c)); return [cx + dx * k, cy + dy * k]; }
    if (shape === 'diamond') { const k = 1 / (Math.abs(dx) / (b.w / 2) + Math.abs(dy) / (b.h / 2)); return [cx + dx * k, cy + dy * k]; }
    const k = Math.min(Math.abs((b.w / 2) / (dx || 1e-9)), Math.abs((b.h / 2) / (dy || 1e-9))); return [cx + dx * k, cy + dy * k];
  }
  function route(a, b, sa, sb, ortho, via) {
    const ca = [a.x + a.w / 2, a.y + a.h / 2], cb = [b.x + b.w / 2, b.y + b.h / 2];
    if (a === b) { const x = a.x + a.w, y = a.y; return [[x - 16, y], [x - 16, y - 28], [x + 28, y - 28], [x + 28, y + 16], [x, y + 16]]; }
    if (via && via.length) { const p0 = clip(a, sa, via[0][0], via[0][1]), p1 = clip(b, sb, via[via.length - 1][0], via[via.length - 1][1]); return [p0, ...via, p1]; }
    if (ortho) {
      const ox = Math.max(a.x, b.x) < Math.min(a.x + a.w, b.x + b.w), oy = Math.max(a.y, b.y) < Math.min(a.y + a.h, b.y + b.h);
      if (ox && !oy) { const x = (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2; return a.y < b.y ? [[x, a.y + a.h], [x, b.y]] : [[x, a.y], [x, b.y + b.h]]; }
      if (oy && !ox) { const y = (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2; return a.x < b.x ? [[a.x + a.w, y], [b.x, y]] : [[a.x, y], [b.x + b.w, y]]; }
      if (!ox && !oy) { const dx = cb[0] - ca[0], dy = cb[1] - ca[1];
        if (Math.abs(dx) >= Math.abs(dy)) { const x1 = dx > 0 ? a.x + a.w : a.x, x2 = dx > 0 ? b.x : b.x + b.w, mx = (x1 + x2) / 2; return [[x1, ca[1]], [mx, ca[1]], [mx, cb[1]], [x2, cb[1]]]; }
        const y1 = dy > 0 ? a.y + a.h : a.y, y2 = dy > 0 ? b.y : b.y + b.h, my = (y1 + y2) / 2; return [[ca[0], y1], [ca[0], my], [cb[0], my], [cb[0], y2]]; }
    }
    return [clip(a, sa, cb[0], cb[1]), clip(b, sb, ca[0], ca[1])];
  }
  const ptsPath = p => 'M' + p.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L');
  function midOf(p) { let L = 0; const seg = []; for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); seg.push(l); L += l; } let h = L / 2; for (let i = 1; i < p.length; i++) { if (h <= seg[i - 1]) { const t = seg[i - 1] ? h / seg[i - 1] : 0; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t, Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0])]; } h -= seg[i - 1]; } return [p[0][0], p[0][1], 0]; }
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  function trimEnd(p, back, atStart) { if (!back) return p; p = p.map(q => q.slice()); const i = atStart ? 0 : p.length - 1, j = atStart ? 1 : p.length - 2; const [ux, uy] = unit(p[j], p[i]); p[i][0] -= ux * back; p[i][1] -= uy * back; return p; }
  function textAt(x, y, s, o = {}) { if (!s) return ''; const w = tw(s, o.sz || 11) + 8; return `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - 9).toFixed(1)}" width="${w.toFixed(1)}" height="15" rx="3" fill="#fff" fill-opacity=".92"/>` + T(x.toFixed(1), (y + 2.5).toFixed(1), s, { sz: o.sz || 11, c: o.c || C.line, i: o.i }); }
  function endLabel(p, atStart, s, side) { if (!s) return ''; const i = atStart ? 0 : p.length - 1, j = atStart ? 1 : p.length - 2; const [ux, uy] = unit(p[i], p[j]); const px = -uy * (side || 1), py = ux * (side || 1); const a = px > 0.5 ? 'start' : px < -0.5 ? 'end' : 'middle'; const along = Math.abs(uy) > 0.5 ? 14 : 18 + (a === 'middle' ? tw(s, 11) / 2 : 0); return T((p[i][0] + ux * along + px * 7).toFixed(1), (p[i][1] + uy * along + py * 9 + 4).toFixed(1), s, { sz: 11, c: C.line, a }); }

  /* ---------------- ER drawing ---------------- */
  function drawEntity(n, b, nt) {
    const cols = erCols(n);
    if (nt === 'chen') { let s = R(b.x, b.y, b.w, b.h, { f: '#fff' }); if (n.props.weak) s += R(b.x + 4, b.y + 4, b.w - 8, b.h - 8, { f: 'none' }); return s + centered(n, b, 12.5, 1); }
    const keys = cols.filter(c => c.pk), rest = cols.filter(c => !c.pk);
    if (nt === 'idef1x') {
      const dep = !!n.props.weak || cols.some(c => c.pk && c.fk); let s = T(b.x + 2, b.y + 13, n.name, { a: 'start', b: 1, sz: 12.5 }); const top = b.y + 18; s += R(b.x, top, b.w, b.h - 18, { r: dep ? 10 : 0 });
      let y = top + 4; for (const c of keys) { y += 18; s += T(b.x + 10, y - 5, colText(c, nt) + (c.fk ? ' (FK)' : ''), { a: 'start' }); }
      y += 4; s += Lp(b.x, y, b.x + b.w, y); for (const c of rest) { y += 18; s += T(b.x + 10, y - 5, colText(c, nt) + (c.fk ? ' (FK)' : ''), { a: 'start' }); } return s;
    }
    const er = nt === 'uml' ? Math.min(ROUND, 3) : Math.max(3, ROUND); let s = R(b.x, b.y, b.w, b.h, { f: '#fff', r: er }) + headPath(b.x, b.y, b.w, 28.3, er, n.props.weak ? (TH.heads.weak || '#f3ecf9') : C.head) + Lp(b.x, b.y + 29, b.x + b.w, b.y + 29);
    if (nt === 'uml') s += T(b.x + b.w / 2, b.y + 19, n.name, { b: 1, sz: 12.5 }); else s += T(b.x + b.w / 2, b.y + 19, n.name, { b: 1, sz: 12.5 });
    const tx0 = cols.some(c => c.pk && c.fk) ? 46 : 34; let y = b.y + 33; for (const c of cols) { y += 18; const tag = [c.pk ? 'PK' : '', c.fk ? 'FK' : ''].filter(Boolean).join(','); s += T(b.x + 8, y - 5, tag, { a: 'start', sz: 9.5, b: 1, c: c.pk ? '#9a6b00' : '#185fa5' }); s += T(b.x + tx0, y - 5, c.name, { a: 'start', u: nt === 'uml' ? false : !!c.pk, b: !!c.pk && nt === 'uml' }); if (c.type) s += T(b.x + b.w - 8, y - 5, c.type + (c.nn && !c.pk ? '' : ''), { a: 'end', sz: 11, c: C.dim }); }
    return s;
  }
  function chenAttrs(n, b) { // attribute ovals around a Chen entity; foreign keys are shown by the relationship
    const cols = erCols(n).filter(c => !c.fk); if (!cols.length) return ''; let s = ''; const R0 = Math.max(b.w, b.h) / 2 + 46; const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    cols.forEach((c, i) => { const a = -Math.PI / 2 + (i - (cols.length - 1) / 2) * Math.min(0.62, Math.PI * 1.5 / Math.max(1, cols.length)); const w = Math.max(60, tw(c.name, 11.5) + 22) / 2; const x = cx + Math.cos(a) * (R0 + w * 0.4), y = cy + Math.sin(a) * R0 * 0.75 - 6;
      const [ex, ey] = clip(b, 'rect', x, y); s += Lp(ex, ey, x, y + 12 * (y > cy ? -1 : 1) * 0); s += E(x, y, w, 13, { f: '#fff', d: c.derived ? '4 3' : null }); if (c.multi) s += E(x, y, w - 3.5, 9.5, { f: 'none' }); s += T(x, y + 4, c.name, { sz: 11.5, u: !!c.pk }); });
    return s;
  }

  /* ---------------- render ---------------- */
  function render(dg, opt = {}) {
    const t = TYPES[dg.type]; if (t.special === 'sequence') return renderSequence(dg, opt); if (t.special === 'timing') return renderTiming(dg, opt);
    useStyle(dg); const sel = opt.sel || new Set(); const B = {}; for (const n of dg.nodes) B[n.id] = box(n, dg);
    const nt = dg.notation; let back = TH.shadow ? DEFS : '', front = '', edges = ''; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    const cont = dg.nodes.filter(n => NK[n.kind] && NK[n.kind].container).sort((a, b) => B[b.id].w * B[b.id].h - B[a.id].w * B[a.id].h);
    const ord = cont.concat(dg.nodes.filter(n => !(NK[n.kind] && NK[n.kind].container)));
    for (const n of ord) {
      const K = NK[n.kind] || NK.note; const b = B[n.id]; grow(b.x, b.y); grow(b.x + b.w, b.y + b.h + 16);
      let s; C.fill = TH.fills[n.kind] || '#ffffff'; C.head = TH.heads[n.kind] || TH.head;
      if (n.kind === 'entity') { s = drawEntity(n, b, nt || 'crowsfoot'); if (nt === 'chen') { s += chenAttrs(n, b); grow(b.x - 110, b.y - 90); grow(b.x + b.w + 110, b.y + b.h); } }
      else if (dg.type === 'dfd' && ['extent', 'process', 'store'].includes(n.kind)) s = drawDfd(n, b, nt);
      else s = K.draw ? K.draw(n, b, dg) : R(b.x, b.y, b.w, b.h) + centered(n, b);
      C.fill = '#ffffff'; C.head = TH.head; const sh = TH.shadow && !K.container && !['initial', 'final', 'junction', 'forkbar', 'flowfinal', 'terminate', 'actor', 'decision', 'choice', 'annotation'].includes(n.kind) && !(n.kind === 'entity' && nt === 'chen');
      const on = sel.has(n.id); const g = `<g data-n="${n.id}" class="nd${on ? ' on' : ''}"${sh ? ' filter="url(#sdSh)"' : ''}>${s}${on ? `<rect x="${b.x - 4}" y="${b.y - 4}" width="${b.w + 8}" height="${b.h + 8}" fill="none" stroke="${C.sel}" stroke-width="1.4" stroke-dasharray="4 3" rx="3"/>` + (K.container || K.resize ? `<rect data-rs="${n.id}" x="${b.x + b.w - 5}" y="${b.y + b.h - 5}" width="10" height="10" fill="${C.sel}" style="cursor:nwse-resize"/>` : '') : ''}</g>`;
      if (K.container) back += g; else front += g;
    }
    const PAR = {}; for (const e of dg.edges) { const key = [e.from, e.to].sort().join('|'); (PAR[key] = PAR[key] || []).push(e.id); }
    for (const e of dg.edges) {
      const a = B[e.from], b = B[e.to]; if (!a || !b) continue; const na = dg.nodes.find(n => n.id === e.from), nb = dg.nodes.find(n => n.id === e.to);
      const K = EK[e.kind] || EK.association; const sa = shapeOf(na, dg), sb = shapeOf(nb, dg);
      let p = route(a, b, sa, sb, dg.ortho && e.kind !== 'anchor', e.via); if (p.length < 2) continue;
      if (e.from !== e.to && !e.via) { const key = [e.from, e.to].sort().join('|'); const grp = PAR[key]; if (grp.length > 1) { const k = grp.indexOf(e.id) - (grp.length - 1) / 2; const flip = e.from > e.to ? -1 : 1; const [ux, uy] = unit([a.x + a.w / 2, a.y + a.h / 2], [b.x + b.w / 2, b.y + b.h / 2]); const off = k * 18 * flip; p = p.map(q => [q[0] - uy * off, q[1] + ux * off]); } }
      let mS = K.s, mE = K.e; const col = sel.has(e.id) ? C.sel : C.line; let extra = '';
      if (e.kind === 'rel') {
        if (nt === 'crowsfoot') { mS = 'cf:' + (e.props.c1 || '1'); mE = 'cf:' + (e.props.c2 || '0..*'); }
        else if (nt === 'idef1x') { mE = /\*/.test(e.props.c2 || '') ? 'dot' : (e.props.c2 === '0..1' ? 'dot' : 'dot'); mS = e.props.c1 === '0..1' ? 'dia' : null; if (e.props.c2 === '0..1') extra += endLabel(p, false, 'Z', -1); else if (e.props.c2 === '1..*') extra += endLabel(p, false, 'P', -1); else if (e.props.c2 === '1') extra += endLabel(p, false, '1', -1); }
        else if (nt === 'uml') { extra += endLabel(p, true, e.props.c1 || '1', 1) + endLabel(p, false, e.props.c2 || '0..*', 1); }
      }
      if (e.kind === 'rel' && nt === 'chen') { // diamond in the middle
        const [mx, my] = midOf(p); const lab = e.name || 'has'; const w = Math.max(70, tw(lab, 11.5) + 36) / 2, h = 24; const idf = !!e.props.identifying;
        const c1 = chenCard(e.props.c1), c2 = chenCard(e.props.c2);
        edges += `<g data-e="${e.id}">` + P(ptsPath(p), { s: col, sw: 1.3 }) + `<path d="${ptsPath(p)}" stroke="transparent" stroke-width="12" fill="none"/>` + P(`M${mx - w} ${my}L${mx} ${my - h}L${mx + w} ${my}L${mx} ${my + h}Z`, { f: '#fff', s: col }) + (idf ? P(`M${mx - w + 6} ${my}L${mx} ${my - h + 4}L${mx + w - 6} ${my}L${mx} ${my + h - 4}Z`, { s: col }) : '') + T(mx, my + 4, lab, { sz: 11.5 }) + endLabel(p, true, c1, 1) + endLabel(p, false, c2, 1) + '</g>';
        continue;
      }
      let dash = K.d; if (e.kind === 'rel' && (nt === 'idef1x' || nt === 'crowsfoot') && !e.props.identifying) dash = '6 4';
      let ms = '', me = '', bs = 0, be = 0;
      if (mS) { const [ux, uy] = unit(p[1], p[0]); [ms, bs] = marker(mS, p[0][0], p[0][1], ux, uy, col); }
      if (mE) { const n2 = p.length; const [ux, uy] = unit(p[n2 - 2], p[n2 - 1]); [me, be] = marker(mE, p[n2 - 1][0], p[n2 - 1][1], ux, uy, col); }
      const pl = trimEnd(trimEnd(p, bs, true), be, false); const [mx, my] = midOf(p);
      let lab = ''; const tag = K.tag || ''; const nm = e.name || ''; const tech = e.kind === 'c4rel' && e.props.tech ? '[' + e.props.tech + ']' : '';
      if (tag && nm) lab = textAt(mx, my - 8, tag, { i: 1 }) + textAt(mx, my + 8, nm); else if (tag) lab = textAt(mx, my, tag, { i: 1 }); else if (nm) lab = textAt(mx, my - (tech ? 7 : 0), nm);
      if (tech) lab += textAt(mx, my + (nm ? 9 : 0), tech, { sz: 10, c: C.dim });
      if (K.f && K.f.includes('m1')) extra += endLabel(p, true, e.props.m1, 1) + endLabel(p, false, e.props.m2, 1) + endLabel(p, true, e.props.role1, -1) + endLabel(p, false, e.props.role2, -1);
      if (dg.type === 'communication' && e.props.msgs) { lines(e.props.msgs).forEach((m, i) => { const back2 = /^</.test(m); extra += textAt(mx, my + 16 + i * 15, (back2 ? '← ' : '→ ') + m.replace(/^[<>]\s*/, ''), { sz: 10.5 }); }); }
      edges += `<g data-e="${e.id}"><path d="${ptsPath(p)}" stroke="transparent" stroke-width="12" fill="none"/>${P(ptsPath(pl), { s: col, d: dash, sw: sel.has(e.id) ? 2 : 1.3 })}${ms}${me}${lab}${extra}${sel.has(e.id) ? `<circle data-via="${e.id}" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" fill="${C.sel}" style="cursor:move"/>` : ''}</g>`;
      for (const q of p) grow(q[0], q[1]);
    }
    if (!isFinite(x0)) { x0 = 0; y0 = 0; x1 = 400; y1 = 300; }
    const pad = 30; const vb = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
    return { svg: back + edges + front, vb, boxes: B };
  }
  function chenCard(c) { return { '1': '1', '0..1': '1', '1..*': 'N', '0..*': 'N' }[c || '1'] || 'N'; }
  function shapeOf(n, dg) { if (!n) return 'rect'; if (n.kind === 'process' && dg.type === 'dfd' && dg.notation !== 'gane') return 'circle'; return (NK[n.kind] || {}).shape || 'rect'; }
  function drawDfd(n, b, nt) {
    const g = nt === 'gane';
    if (n.kind === 'extent') return g ? R(b.x + 5, b.y + 5, b.w, b.h, { f: '#d7dde6', s: '#d7dde6' }) + R(b.x, b.y, b.w, b.h, { f: '#fff' }) + centered(n, b, 12, 1) : R(b.x, b.y, b.w, b.h, { f: '#fff' }) + centered(n, b, 12, 1);
    if (n.kind === 'process') { if (g) { let s = R(b.x, b.y, b.w, b.h, { r: 10, f: '#fff' }) + Lp(b.x, b.y + 22, b.x + b.w, b.y + 22) + T(b.x + b.w / 2, b.y + 15, n.props.num || '', { sz: 11 }); return s + centered(n, { x: b.x, y: b.y + 22, w: b.w, h: b.h - 22 }); } return E(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, { f: '#fff' }) + (n.props.num ? T(b.x + b.w / 2, b.y + 22, n.props.num, { sz: 10.5, c: C.dim }) : '') + centered(n, b); }
    if (n.kind === 'store') { if (g) return P(`M${b.x + b.w} ${b.y}H${b.x}V${b.y + b.h}H${b.x + b.w}`, { f: '#fff' }) + R(b.x, b.y, 34, b.h, { f: C.head }) + T(b.x + 17, b.y + b.h / 2 + 4, n.props.num || 'D', { sz: 11 }) + T(b.x + 34 + (b.w - 34) / 2, b.y + b.h / 2 + 4, n.name); return Lp(b.x, b.y, b.x + b.w, b.y) + Lp(b.x, b.y + b.h, b.x + b.w, b.y + b.h) + `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="transparent"/>` + T(b.x + b.w / 2, b.y + b.h / 2 + 4, (n.props.num ? n.props.num + '  ' : '') + n.name); }
    return '';
  }

  /* ---------------- sequence ---------------- */
  const SEQ_TOP = 70, SEQ_ROW = 44;
  function seqHead(n, b, lav) {
    const role = NK[n.kind].seq; const cx = b.x + b.w / 2; let s = ''; const LC = lav ? '#9370db' : C.line;
    switch (role) {
      case 'actor': s = stick(cx, b.y - 6, 0.85, LC) + T(cx, b.y + 56, n.name); break;
      case 'boundary': s = `<circle cx="${cx + 6}" cy="${b.y + 18}" r="14" fill="#fff" stroke="${C.line}" stroke-width="1.3"/>` + Lp(cx - 16, b.y + 6, cx - 16, b.y + 30) + Lp(cx - 16, b.y + 18, cx - 8, b.y + 18) + T(cx, b.y + 52, n.name); break;
      case 'control': s = `<circle cx="${cx}" cy="${b.y + 18}" r="14" fill="#fff" stroke="${C.line}" stroke-width="1.3"/>` + P(`M${cx + 2} ${b.y + 1}L${cx - 4} ${b.y + 4}L${cx + 2} ${b.y + 8}`, { sw: 1.3 }) + T(cx, b.y + 52, n.name); break;
      case 'entity': s = `<circle cx="${cx}" cy="${b.y + 16}" r="14" fill="#fff" stroke="${C.line}" stroke-width="1.3"/>` + Lp(cx - 14, b.y + 32, cx + 14, b.y + 32) + T(cx, b.y + 52, n.name); break;
      case 'database': s = cylinder({ x: cx - 18, y: b.y, w: 36, h: 38 }) + T(cx, b.y + 52, n.name); break;
      default: s = R(b.x, b.y, b.w, b.h, { f: lav ? '#ececff' : C.head, s: LC, r: lav ? 3 : 0 }) + T(cx, b.y + b.h / 2 + 4, n.name, { u: /:/.test(n.name) });
    }
    return s;
  }
  function renderSequence(dg, opt = {}) {
    useStyle(dg); const sel = opt.sel || new Set(); const L = dg.nodes.filter(n => NK[n.kind] && NK[n.kind].seq).sort((a, b) => a.x - b.x); const B = {};
    for (const n of L) { const [w, h] = size(n, dg); B[n.id] = { x: n.x, y: 0, w, h }; n.y = 0; }
    const msgs = dg.edges.filter(e => B[e.from] && B[e.to]); const rows = msgs.length;
    const gap = new Array(rows + 1).fill(0); for (const f of dg.nodes.filter(n => n.kind === 'fragment')) { const a = (+f.props.first || 1) - 1, ea = +f.props.elseAt; if (a >= 0 && a < rows) gap[a] += 24; if (f.props.op === 'alt' && ea > a + 1 && ea <= rows) gap[ea - 1] += 24; if (+f.props.last >= 1 && +f.props.last < rows) gap[+f.props.last] += 12; }
    const cum = []; let acc = 0; for (let i = 0; i <= rows; i++) { acc += gap[i]; cum.push(acc); }
    const bottom = SEQ_TOP + 30 + rows * SEQ_ROW + 20 + acc;
    const num = dg.seqNum || 'text', lav = dg.theme === 'lavender', mirror = !!dg.mirror, showAct = !dg.noAct; const LC = lav ? '#9370db' : C.line;
    const cx = id => B[id].x + B[id].w / 2; const rowY = i => SEQ_TOP + 40 + i * SEQ_ROW + (cum[Math.max(0, Math.min(rows, Math.floor(i)))] || 0);
    // lifetimes: created by a create message, ended by destroy
    const born = {}, dead = {}; msgs.forEach((m, i) => { if (m.kind === 'create' && born[m.to] == null) born[m.to] = i; if (m.kind === 'destroy' && dead[m.to] == null) dead[m.to] = i; });
    // activations: a synchronous call opens a bar on the receiver until the receiver replies to the caller
    const acts = []; const open = []; msgs.forEach((m, i) => { if (m.kind === 'sync' || m.kind === 'create') { if (m.from !== m.to) open.push({ id: m.to, from: m.from, i, depth: open.filter(o => o.id === m.to).length }); else acts.push({ id: m.to, a: i, b: i + 0.6, depth: open.filter(o => o.id === m.to).length + 1 }); } if (m.kind === 'reply') { for (let k = open.length - 1; k >= 0; k--) if (open[k].id === m.from && open[k].from === m.to) { acts.push({ id: open[k].id, a: open[k].i, b: i, depth: open[k].depth }); open.splice(k, 1); break; } } });
    for (const o of open) acts.push({ id: o.id, a: o.i, b: Math.min(rows - 1, o.i + 0.6), depth: o.depth });
    let s = ''; let x1 = 0;
    // fragments (behind)
    for (const f of dg.nodes.filter(n => n.kind === 'fragment')) {
      const a = Math.max(1, +f.props.first || 1) - 1, b = Math.min(rows, +f.props.last || rows) - 1; if (b < a || !rows) continue;
      const inv = new Set(); for (let i = a; i <= b; i++) { inv.add(msgs[i].from); inv.add(msgs[i].to); } const xs = [...inv].filter(id => B[id]).map(cx); if (!xs.length) continue;
      const fx0 = Math.min(...xs) - 70, fx1 = Math.max(...xs) + 70, fy0 = rowY(a) - 46, fy1 = rowY(b) + 18; const op = f.props.op || 'alt'; const lw = tw(op, 11) + 18;
      s += `<g data-n="${f.id}" class="nd${sel.has(f.id) ? ' on' : ''}">` + R(fx0, fy0, fx1 - fx0, fy1 - fy0, { f: 'rgba(238,243,250,.35)', s: sel.has(f.id) ? C.sel : C.line }) + P(`M${fx0} ${fy0 + 18}H${fx0 + lw}L${fx0 + lw + 8} ${fy0 + 10}V${fy0}`, { f: C.head }) + T(fx0 + 6, fy0 + 13, op, { a: 'start', b: 1, sz: 11 }) + (f.name ? T((fx0 + fx1) / 2, fy0 + 14, /^\[.*\]$/.test(f.name.trim()) ? f.name : '[' + f.name + ']', { sz: 11 }) : '');
      const ea = +f.props.elseAt; if (op === 'alt' && ea > a + 1 && ea <= b + 1) { const yy = rowY(ea - 1) - 42; s += Lp(fx0, yy, fx1, yy, { d: '6 4' }) + T((fx0 + fx1) / 2, yy + 14, f.props.guard2 ? (/^\[.*\]$/.test(f.props.guard2.trim()) ? f.props.guard2 : '[' + f.props.guard2 + ']') : '[else]', { sz: 11 }); }
      s += '</g>'; x1 = Math.max(x1, fx1);
    }
    // lifelines
    for (const n of L) {
      const b = B[n.id]; const y0 = born[n.id] != null ? rowY(born[n.id]) - b.h / 2 : 0; const bb = { x: b.x, y: y0, w: b.w, h: b.h }; const end = dead[n.id] != null ? rowY(dead[n.id]) : bottom + (mirror ? 10 : 0); const c = cx(n.id);
      s += `<g data-n="${n.id}" class="nd${sel.has(n.id) ? ' on' : ''}">` + Lp(c, y0 + (NK[n.kind].seq === 'object' ? b.h : 58), c, end, lav ? { s: LC, sw: 1.2 } : { d: '6 4', sw: 1 }) + seqHead(n, bb, lav) + (mirror && dead[n.id] == null ? seqHead(n, { x: b.x, y: end, w: b.w, h: b.h }, lav) : '') + (dead[n.id] != null ? P(`M${c - 9} ${end - 9}L${c + 9} ${end + 9}M${c + 9} ${end - 9}L${c - 9} ${end + 9}`, { sw: 2 }) : '') + (sel.has(n.id) ? R(b.x - 4, y0 - 4, b.w + 8, b.h + 8, { f: 'none', s: C.sel, d: '4 3' }) : '') + `<rect x="${c - 8}" y="${y0 + b.h}" width="16" height="${Math.max(0, end - y0 - b.h)}" fill="transparent"/></g>`;
      x1 = Math.max(x1, b.x + b.w);
    }
    if (!showAct) acts.length = 0;
    for (const a of acts) { const c = cx(a.id) + (a.depth || 0) * 5; const yEnd = a.b % 1 ? rowY(Math.floor(a.b)) + (a.b % 1) * SEQ_ROW : rowY(a.b); s += R(c - 5, rowY(a.a) - 6, 10, yEnd - rowY(a.a) + 14, { f: '#fff' }); }
    // messages
    msgs.forEach((m, i) => {
      const K = EK[m.kind] || EK.sync; const y = rowY(i); const col = sel.has(m.id) ? C.sel : C.line; const act = id => acts.some(a => a.id === id && a.a <= i && i <= a.b) ? 5 : 0; const no = num === 'text' ? (i + 1) + '. ' : ''; const badge = (x, y) => num === 'badge' ? `<circle cx="${x}" cy="${y}" r="8" fill="#222" stroke="#fff" stroke-width="1"/>` + T(x, y + 3.5, String(i + 1), { sz: i >= 9 ? 8 : 9.5, c: '#fff', b: 1 }) : '';
      let g = `<g data-e="${m.id}">`;
      if (m.from === m.to) { const c = cx(m.from) + 5; g += P(`M${c} ${y - 8}H${c + 40}V${y + 8}H${c + 8}`, { s: col, d: K.d }) + marker(K.e, c + 6, y + 8, -1, 0, col)[0] + T(c + 46, y - 2, no + (K.tag ? K.tag + ' ' : '') + (m.name || ''), { a: 'start', sz: 11.5, c: col }) + `<rect x="${c}" y="${y - 14}" width="60" height="28" fill="transparent"/>` + badge(c - 5, y - 8); }
      else {
        const xa = cx(m.from), xb0 = cx(m.to); const dir = xb0 > xa ? 1 : -1; const xs = xa + dir * act(m.from); let xb = xb0 - dir * act(m.to); if (m.kind === 'create') xb = B[m.to].x + (dir > 0 ? 0 : B[m.to].w);
        const [mk, back] = marker(K.e, xb, y, dir, 0, col); g += Lp(xs, y, xb - dir * back, y, { s: col, d: K.d, sw: sel.has(m.id) ? 2 : 1.3 }) + mk + `<line x1="${xs}" y1="${y}" x2="${xb}" y2="${y}" stroke="transparent" stroke-width="12"/>` + textAt((xs + xb) / 2, y - 10, no + (K.tag ? K.tag + ' ' : '') + (m.name || ''), { sz: 11.5, c: col }) + badge(xs, y);
      }
      s += g + '</g>';
    });
    // notes and other free nodes
    for (const n of dg.nodes.filter(n => n.kind === 'note')) { const b = box(n, dg); s += `<g data-n="${n.id}" class="nd">${noteDraw(n, b)}${sel.has(n.id) ? R(b.x - 4, b.y - 4, b.w + 8, b.h + 8, { f: 'none', s: C.sel, d: '4 3' }) : ''}</g>`; x1 = Math.max(x1, b.x + b.w); }
    const xmin = Math.min(0, ...L.map(n => B[n.id].x - 80), ...dg.nodes.filter(n => n.kind === 'note').map(n => n.x));
    return { svg: s, vb: [xmin - 20, -30, Math.max(400, x1 - xmin + 120), bottom + 60 + (mirror ? 80 : 0)], boxes: B, seq: { rowY, rows, msgs } };
  }

  /* ---------------- timing ---------------- */
  const TSC = 8; // pixels per time unit
  const tStates = n => String(n.props.states || '').split(',').map(s => s.trim()).filter(Boolean);
  const tChanges = n => String(n.props.changes || '').split(',').map(s => s.trim()).filter(Boolean).map(s => { const [t, v] = s.split(':'); return [+t || 0, (v || '').trim()]; }).sort((a, b) => a[0] - b[0]);
  const timingW = n => 120 + (+n.props.tmax || 50) * TSC + 20; const timingH = n => Math.max(1, tStates(n).length) * 24 + 26;
  function renderTiming(dg, opt = {}) {
    useStyle(dg); const sel = opt.sel || new Set(); let s = ''; const B = {}; let x1 = 400, y1 = 200; const rows = dg.nodes.filter(n => n.kind === 'tline').sort((a, b) => a.y - b.y);
    let y = 0; for (const n of rows) { n.x = 0; n.y = y; const b = box(n, dg); B[n.id] = b; y += b.h + 4; }
    const tmax = Math.max(10, ...rows.map(n => +n.props.tmax || 50)); const X = t => 120 + t * TSC;
    for (const n of rows) {
      const b = B[n.id]; const st = tStates(n); const yOf = v => b.y + 20 + Math.max(0, st.indexOf(v)) * 24; const ch = tChanges(n);
      let g = R(b.x, b.y, b.w, b.h, { f: '#fff', s: sel.has(n.id) ? C.sel : C.line }) + Lp(b.x + 110, b.y, b.x + 110, b.y + b.h) + T(b.x + 8, b.y + 16, n.name, { a: 'start', b: 1 });
      st.forEach((v, i) => g += T(b.x + 104, b.y + 24 + i * 24, v, { a: 'end', sz: 11, c: C.dim }));
      if (ch.length) { let d = `M${X(ch[0][0])} ${yOf(ch[0][1])}`; for (let i = 1; i < ch.length; i++) d += `H${X(ch[i][0])}V${yOf(ch[i][1])}`; d += `H${X(+n.props.tmax || 50)}`; g += P(d, { s: '#185fa5', sw: 2 }); }
      s += `<g data-n="${n.id}" class="nd">${g}</g>`; x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    // time axis
    const step = tmax > 100 ? 20 : tmax > 40 ? 10 : 5; let ax = Lp(X(0), y1 + 10, X(tmax), y1 + 10); for (let t = 0; t <= tmax; t += step) ax += Lp(X(t), y1 + 6, X(t), y1 + 14) + T(X(t), y1 + 28, String(t), { sz: 10.5, c: C.dim }); const unit = (rows[0] && rows[0].props.unit) || '';
    s += ax + T(X(tmax) + 6, y1 + 14, unit, { a: 'start', sz: 10.5, c: C.dim });
    for (const e of dg.edges) { const a = B[e.from], b = B[e.to]; if (!a || !b) continue; const t1 = +e.props.t1 || 0, t2 = +e.props.t2 || t1; const ya = a.y + a.h / 2, yb = b.y + b.h / 2; const [mk, bk] = marker('arrow', X(t2), yb, 0, Math.sign(yb - ya) || 1); s += `<g data-e="${e.id}">${Lp(X(t1), ya, X(t2), yb - bk, { s: sel.has(e.id) ? C.sel : C.line })}${mk}<line x1="${X(t1)}" y1="${ya}" x2="${X(t2)}" y2="${yb}" stroke="transparent" stroke-width="10"/>${textAt((X(t1) + X(t2)) / 2 + 30, (ya + yb) / 2, e.name)}</g>`; }
    for (const n of dg.nodes.filter(n => n.kind === 'note')) { const b = box(n, dg); s += `<g data-n="${n.id}" class="nd">${noteDraw(n, b)}</g>`; x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
    return { svg: s, vb: [-20, -20, x1 + 60, y1 + 60], boxes: B };
  }

  function toSVG(dg, opt = {}) { const r = render(dg, opt); const [x, y, w, h] = r.vb; const bg = opt.bg === undefined ? '#ffffff' : opt.bg; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w)}" height="${Math.round(h)}" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif">${bg && bg !== 'transparent' ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>` : ''}${r.svg}</svg>`; }

  /* ---------------- SQL ---------------- */
  const DIALECTS = { mysql: 'MySQL / MariaDB', postgres: 'PostgreSQL', sqlite: 'SQLite', sqlserver: 'SQL Server', oracle: 'Oracle' };
  function qid(n, d) { const plain = /^[A-Za-z_][A-Za-z0-9_]*$/.test(n) && !/^(order|user|group|select|table|key|index|from|where|check|default|primary|references|desc|asc|date|time|value|values|column|role|level|comment|size|number)$/i.test(n); if (plain) return n; return d === 'mysql' ? '`' + n + '`' : d === 'sqlserver' ? '[' + n + ']' : '"' + n + '"'; }
  function mapType(t, d, c) {
    t = String(t || 'VARCHAR(255)').trim(); const u = t.toUpperCase(); const m = u.match(/^(\w+)(\s*\(.*\))?/); const base = m ? m[1] : u, arg = m && m[2] ? m[2].replace(/\s/g, '') : '';
    const pick = o => o[d] != null ? o[d] : o.def;
    switch (base) {
      case 'INT': case 'INTEGER': return d === 'oracle' ? 'NUMBER(10)' : d === 'sqlite' ? 'INTEGER' : 'INT';
      case 'BIGINT': return d === 'oracle' ? 'NUMBER(19)' : d === 'sqlite' ? 'INTEGER' : 'BIGINT';
      case 'SMALLINT': case 'TINYINT': return d === 'oracle' ? 'NUMBER(5)' : d === 'sqlite' ? 'INTEGER' : base === 'TINYINT' && d === 'postgres' ? 'SMALLINT' : base;
      case 'SERIAL': return d === 'postgres' ? 'SERIAL' : mapType('INT', d);
      case 'BOOL': case 'BOOLEAN': case 'BIT': return pick({ sqlserver: 'BIT', oracle: 'NUMBER(1)', sqlite: 'INTEGER', mysql: 'BOOLEAN', def: 'BOOLEAN' });
      case 'VARCHAR': case 'NVARCHAR': case 'VARCHAR2': case 'CHARACTER': return (d === 'oracle' ? 'VARCHAR2' : d === 'sqlserver' ? 'NVARCHAR' : d === 'sqlite' ? 'TEXT' : 'VARCHAR') + (d === 'sqlite' ? '' : (arg || '(255)'));
      case 'CHAR': return d === 'sqlite' ? 'TEXT' : 'CHAR' + (arg || '(1)');
      case 'TEXT': case 'CLOB': case 'LONGTEXT': case 'MEDIUMTEXT': return pick({ oracle: 'CLOB', sqlserver: 'NVARCHAR(MAX)', def: 'TEXT' });
      case 'DATE': return 'DATE';
      case 'DATETIME': case 'TIMESTAMP': case 'DATETIME2': return pick({ postgres: 'TIMESTAMP', oracle: 'TIMESTAMP', sqlserver: 'DATETIME2', sqlite: 'TEXT', def: 'DATETIME' });
      case 'TIME': return d === 'oracle' ? 'VARCHAR2(8)' : d === 'sqlite' ? 'TEXT' : 'TIME';
      case 'DECIMAL': case 'NUMERIC': case 'NUMBER': return d === 'oracle' ? 'NUMBER' + arg : d === 'sqlite' ? 'NUMERIC' : 'DECIMAL' + (arg || '(10,2)');
      case 'FLOAT': case 'REAL': case 'DOUBLE': return pick({ postgres: 'DOUBLE PRECISION', oracle: 'BINARY_DOUBLE', sqlite: 'REAL', sqlserver: 'FLOAT', def: 'DOUBLE' });
      case 'BLOB': case 'BYTEA': case 'VARBINARY': case 'BINARY': return pick({ postgres: 'BYTEA', sqlserver: 'VARBINARY(MAX)', def: 'BLOB' });
      case 'UUID': case 'UNIQUEIDENTIFIER': return pick({ postgres: 'UUID', sqlserver: 'UNIQUEIDENTIFIER', mysql: 'CHAR(36)', oracle: 'RAW(16)', def: 'TEXT' });
      case 'JSON': case 'JSONB': return pick({ postgres: 'JSONB', mysql: 'JSON', sqlserver: 'NVARCHAR(MAX)', oracle: 'CLOB', def: 'TEXT' });
      default: return t;
    }
  }
  function erModel(dg) { // tables with their foreign keys, including the ones only drawn as lines
    const ents = dg.nodes.filter(n => n.kind === 'entity'); const byId = {}; const T0 = ents.map(n => { const t = { id: n.id, name: n.name.replace(/\s+/g, '_'), weak: !!n.props.weak, cols: erCols(n).map(c => Object.assign({}, c)) }; byId[n.id] = t; return t; });
    const extra = []; const notes = [];
    for (const e of dg.edges.filter(e => e.kind === 'rel')) {
      const a = byId[e.from], b = byId[e.to]; if (!a || !b) continue; const c1 = e.props.c1 || '1', c2 = e.props.c2 || '0..*'; const many1 = /\*/.test(c1), many2 = /\*/.test(c2);
      if (many1 && many2) { // many-to-many: a joining table
        const jn = (e.name ? e.name.replace(/\s+/g, '_') : a.name + '_' + b.name); if (T0.concat(extra).some(t => t.name.toLowerCase() === jn.toLowerCase())) continue;
        const pa = a.cols.filter(c => c.pk), pb = b.cols.filter(c => c.pk); const cols = [];
        for (const c of pa) cols.push({ name: a.name.toLowerCase() + '_' + c.name, type: c.type, pk: 1, nn: 1, fk: a.name + '.' + c.name });
        for (const c of pb) cols.push({ name: b.name.toLowerCase() + '_' + c.name, type: c.type, pk: 1, nn: 1, fk: b.name + '.' + c.name });
        extra.push({ name: jn, cols, joining: true }); notes.push(`${jn} joins ${a.name} and ${b.name} (many-to-many)`); continue;
      }
      // one side is the parent: the child gets a foreign key unless it already has one to the parent
      let parent = a, child = b, pc = c1, cc = c2; if (many1 && !many2) { parent = b; child = a; pc = c2; cc = c1; } else if (!many1 && !many2 && c1 === '0..1' && c2 === '1') { parent = b; child = a; pc = c2; cc = c1; }
      if (child.cols.some(c => c.fk && c.fk.split('.')[0].toLowerCase() === parent.name.toLowerCase())) continue;
      for (const c of parent.cols.filter(c => c.pk)) { const nm = parent.name.toLowerCase() + '_' + c.name; if (child.cols.some(x => x.name.toLowerCase() === nm.toLowerCase())) { child.cols.find(x => x.name.toLowerCase() === nm.toLowerCase()).fk = parent.name + '.' + c.name; continue; } child.cols.push({ name: nm, type: /SERIAL/i.test(c.type || '') ? 'INT' : c.type, nn: pc === '1' ? 1 : 0, uq: !/\*/.test(cc) ? 1 : 0, pk: e.props.identifying ? 1 : 0, fk: parent.name + '.' + c.name, added: 1 }); }
    }
    return { tables: T0.concat(extra), notes };
  }
  function toSQL(dg, d = 'mysql') {
    const { tables, notes } = erModel(dg); const out = [`-- ${dg.name}`, `-- ${DIALECTS[d]} schema written by CEsim`, '']; if (notes.length) out.push(...notes.map(n => '-- ' + n), '');
    const order = []; const seen = new Set(); const visit = (t, stack = new Set()) => { if (seen.has(t.name) || stack.has(t.name)) return; stack.add(t.name); for (const c of t.cols) if (c.fk) { const p = tables.find(x => x.name.toLowerCase() === c.fk.split('.')[0].toLowerCase()); if (p && p !== t) visit(p, stack); } seen.add(t.name); order.push(t); }; tables.forEach(t => visit(t));
    const later = [];
    for (const t of order) {
      const pks = t.cols.filter(c => c.pk); const L0 = [];
      for (const c of t.cols) {
        let ty = mapType(c.type, d, c); let s = '  ' + qid(c.name, d) + ' ';
        if (c.ai) { if (d === 'postgres') ty = /BIGINT/i.test(c.type || '') ? 'BIGSERIAL' : 'SERIAL'; if (d === 'sqlite' && pks.length === 1 && c.pk) { L0.push('  ' + qid(c.name, d) + ' INTEGER PRIMARY KEY AUTOINCREMENT'); continue; } }
        s += ty; if (c.ai) s += d === 'mysql' ? ' AUTO_INCREMENT' : d === 'sqlserver' ? ' IDENTITY(1,1)' : d === 'oracle' ? ' GENERATED BY DEFAULT AS IDENTITY' : '';
        if (c.nn || c.pk) s += ' NOT NULL'; if (c.uq && !c.pk) s += ' UNIQUE'; if (c.def !== undefined && c.def !== '') s += ' DEFAULT ' + c.def; L0.push(s);
      }
      const sqliteAuto = d === 'sqlite' && pks.length === 1 && pks[0].ai;
      if (pks.length && !sqliteAuto) L0.push(`  CONSTRAINT ${qid('pk_' + t.name.toLowerCase(), d)} PRIMARY KEY (${pks.map(c => qid(c.name, d)).join(', ')})`);
      const fkGroups = {}; for (const c of t.cols) if (c.fk) { const [pt, pc] = c.fk.split('.'); (fkGroups[pt] = fkGroups[pt] || []).push([c.name, pc || 'id']); }
      for (const pt in fkGroups) { const p = tables.find(x => x.name.toLowerCase() === pt.toLowerCase()); const nm = 'fk_' + t.name.toLowerCase() + '_' + pt.toLowerCase(); const s = `CONSTRAINT ${qid(nm, d)} FOREIGN KEY (${fkGroups[pt].map(x => qid(x[0], d)).join(', ')}) REFERENCES ${qid(p ? p.name : pt, d)} (${fkGroups[pt].map(x => qid(x[1], d)).join(', ')})`; if (p && order.indexOf(p) > order.indexOf(t) && d !== 'sqlite') later.push(`ALTER TABLE ${qid(t.name, d)} ADD ${s};`); else L0.push('  ' + s); }
      out.push(`CREATE TABLE ${qid(t.name, d)} (`, L0.join(',\n'), d === 'mysql' ? ') ENGINE=InnoDB;' : ');', '');
      for (const c of t.cols) if (c.fk && !c.pk) out.push(`CREATE INDEX ${qid('ix_' + t.name.toLowerCase() + '_' + c.name.toLowerCase(), d)} ON ${qid(t.name, d)} (${qid(c.name, d)});`);
      if (t.cols.some(c => c.fk && !c.pk)) out.push('');
    }
    if (later.length) out.push(...later, '');
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }
  function splitTop(s) { const out = []; let depth = 0, cur = '', q = null; for (const ch of s) { if (q) { cur += ch; if (ch === q) q = null; continue; } if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; } if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
  const unq = s => String(s || '').trim().replace(/^[`"\[]|[`"\]]$/g, '').replace(/^.*\./, n => n).split('.').pop().replace(/^[`"\[]|[`"\]]$/g, '');
  const idList = s => String(s || '').replace(/^\(|\)$/g, '').split(',').map(x => unq(x.trim().split(/\s+/)[0])).filter(Boolean);
  function fromSQL(text) {
    const src = String(text || '').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/#[^\n]*/g, ''); const tables = []; const warn = [];
    const re = /create\s+(?:temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?([`"\[\]\w.]+)\s*\(/ig; let m;
    while ((m = re.exec(src))) {
      let i = re.lastIndex, depth = 1, q = null; for (; i < src.length && depth; i++) { const ch = src[i]; if (q) { if (ch === q) q = null; continue; } if (ch === "'" || ch === '"' || ch === '`') q = ch; else if (ch === '(') depth++; else if (ch === ')') depth--; }
      const body = src.slice(re.lastIndex, i - 1); const t = { name: unq(m[1]), cols: [] }; tables.push(t);
      for (let part of splitTop(body)) {
        part = part.replace(/\s+/g, ' ').trim(); if (!part) continue; let cm;
        const pre = part.replace(/^constraint\s+[`"\[\]\w]+\s+/i, '');
        if ((cm = pre.match(/^primary\s+key\s*(?:\w+\s*)?\(([^)]*)\)/i))) { for (const c of idList(cm[1])) { const col = t.cols.find(x => x.name.toLowerCase() === c.toLowerCase()); if (col) { col.pk = 1; col.nn = 1; } } continue; }
        if ((cm = pre.match(/^foreign\s+key\s*\(([^)]*)\)\s*references\s+([`"\[\]\w.]+)\s*(?:\(([^)]*)\))?/i))) { const cs = idList(cm[1]), ps = cm[3] ? idList(cm[3]) : []; cs.forEach((c, k) => { const col = t.cols.find(x => x.name.toLowerCase() === c.toLowerCase()); if (col) col.fk = unq(cm[2]) + '.' + (ps[k] || ps[0] || 'id'); }); continue; }
        if ((cm = pre.match(/^unique\s*(?:key|index)?\s*(?:[`"\[\]\w]+\s*)?\(([^)]*)\)/i))) { const cs = idList(cm[1]); if (cs.length === 1) { const col = t.cols.find(x => x.name.toLowerCase() === cs[0].toLowerCase()); if (col) col.uq = 1; } continue; }
        if (/^(key|index|check|constraint|fulltext|spatial|exclude|period)\b/i.test(pre)) continue;
        const cm2 = part.match(/^([`"\[][^`"\]]+[`"\]]|[\w$]+)\s+(.*)$/); if (!cm2) continue; const name = unq(cm2[1]); let rest = cm2[2];
        const tm = rest.match(/^([a-zA-Z_][\w ]*?(?:\s*\([^)]*\))?)(?=\s+(?:not|null|primary|unique|default|references|auto_increment|autoincrement|identity|generated|check|constraint|collate|character|comment|unsigned|on)\b|\s*$)/i);
        let type = tm ? tm[1].trim() : rest.split(' ')[0]; rest = rest.slice(type.length); type = type.replace(/\s+unsigned$/i, '').replace(/^character varying/i, 'VARCHAR').replace(/^double precision/i, 'DOUBLE');
        const col = { name, type: type.toUpperCase() };
        if (/\bprimary\s+key\b/i.test(rest)) { col.pk = 1; col.nn = 1; } if (/\bnot\s+null\b/i.test(rest)) col.nn = 1; if (/\bunique\b/i.test(rest)) col.uq = 1;
        if (/auto_increment|autoincrement|identity|generated\s+(?:always|by\s+default)\s+as\s+identity/i.test(rest) || /^(big)?serial$/i.test(type)) { col.ai = 1; if (/^serial$/i.test(type)) col.type = 'INT'; if (/^bigserial$/i.test(type)) col.type = 'BIGINT'; }
        const dm = rest.match(/\bdefault\s+('(?:[^']|'')*'|\([^)]*\)|[\w.+-]+(?:\(\))?)/i); if (dm) col.def = dm[1];
        const rm = rest.match(/\breferences\s+([`"\[\]\w.]+)\s*(?:\(([^)]*)\))?/i); if (rm) col.fk = unq(rm[1]) + '.' + (rm[2] ? idList(rm[2])[0] : 'id');
        t.cols.push(col);
      }
    }
    const ar = /alter\s+table\s+(?:only\s+)?([`"\[\]\w.]+)\s+add\s+(?:constraint\s+[`"\[\]\w]+\s+)?foreign\s+key\s*\(([^)]*)\)\s*references\s+([`"\[\]\w.]+)\s*(?:\(([^)]*)\))?/ig;
    while ((m = ar.exec(src))) { const t = tables.find(x => x.name.toLowerCase() === unq(m[1]).toLowerCase()); if (!t) continue; const cs = idList(m[2]), ps = m[4] ? idList(m[4]) : []; cs.forEach((c, k) => { const col = t.cols.find(x => x.name.toLowerCase() === c.toLowerCase()); if (col) col.fk = unq(m[3]) + '.' + (ps[k] || 'id'); }); }
    const ap = /alter\s+table\s+(?:only\s+)?([`"\[\]\w.]+)\s+add\s+(?:constraint\s+[`"\[\]\w]+\s+)?primary\s+key\s*\(([^)]*)\)/ig;
    while ((m = ap.exec(src))) { const t = tables.find(x => x.name.toLowerCase() === unq(m[1]).toLowerCase()); if (!t) continue; for (const c of idList(m[2])) { const col = t.cols.find(x => x.name.toLowerCase() === c.toLowerCase()); if (col) { col.pk = 1; col.nn = 1; } } }
    if (!tables.length) warn.push('No CREATE TABLE statements were found.');
    // diagram
    const dg = newDiagram('er', 'Database'); const ids = {};
    for (const t of tables) { const n = newNode('entity', 0, 0, t.name); n.props.cols = t.cols; ids[t.name.toLowerCase()] = n.id; dg.nodes.push(n); }
    for (const t of tables) {
      const groups = {}; for (const c of t.cols) if (c.fk) { const p = c.fk.split('.')[0].toLowerCase(); (groups[p] = groups[p] || []).push(c); }
      for (const p in groups) { if (!ids[p]) { warn.push(`${t.name} refers to ${p}, which is not in the script.`); continue; } const cs = groups[p]; const e = newEdge('rel', ids[p], ids[t.name.toLowerCase()]); const nn = cs.every(c => c.nn), uq = cs.length === 1 && cs[0].uq; const idf = cs.every(c => c.pk);
        e.props = { c1: nn ? '1' : '0..1', c2: uq ? '0..1' : '0..*', identifying: idf ? 1 : 0 }; if (idf && t.cols.filter(c => c.pk).length === cs.length) e.props.c2 = '0..1'; dg.edges.push(e); }
      if (t.cols.length && t.cols.every(c => c.pk) && Object.keys(groups).length >= 2) { const n = dg.nodes.find(n => n.id === ids[t.name.toLowerCase()]); n.props.weak = 0; }
    }
    layout(dg); return { diagram: dg, warn, tables: tables.length };
  }

  /* ---------------- code ---------------- */
  const LANGS = { java: 'Java', csharp: 'C#', cpp: 'C++', python: 'Python', typescript: 'TypeScript' };
  function parseMember(s) { // "+ name: Type = v" / "+ op(a: int, b: T): Ret"
    s = s.trim(); const vis = { '+': 'public', '-': 'private', '#': 'protected', '~': 'package' }[s[0]] || null; if (vis) s = s.slice(1).trim();
    const st = /\{static\}|\bstatic\b/.test(s), ab = /\{abstract\}|\babstract\b/.test(s); s = s.replace(/\{static\}|\{abstract\}|\bstatic\b|\babstract\b/g, '').trim();
    const op = s.match(/^([\w$<>]+)\s*\(([^)]*)\)\s*(?::\s*(.+))?$/); if (op) { const params = op[2].split(',').map(x => x.trim()).filter(Boolean).map(p => { const [n, t] = p.split(':').map(y => y.trim()); return { name: t ? n : n.split(/\s+/).pop(), type: t || (n.split(/\s+/).length > 1 ? n.split(/\s+/).slice(0, -1).join(' ') : '') }; }); return { op: 1, vis, st, ab, name: op[1], params, type: (op[3] || '').trim() }; }
    const at = s.match(/^([\w$]+)\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/); if (at) return { vis, st, name: at[1], type: (at[2] || '').trim(), def: at[3] ? at[3].trim() : undefined };
    return null;
  }
  const typeMap = (t, L) => { if (!t) return L === 'python' ? '' : L === 'typescript' ? 'any' : L === 'cpp' ? 'void' : 'void'; const m = t.match(/^(?:List|Set|Collection)<(.+)>$|^(.+)\[\]$/); const tt = t.toLowerCase();
    if (m) { const inner = typeMap(m[1] || m[2], L); return L === 'java' ? `List<${box_(inner)}>` : L === 'csharp' ? `List<${inner}>` : L === 'cpp' ? `std::vector<${inner}>` : L === 'python' ? `list[${inner}]` : `${inner}[]`; }
    const P0 = { int: { java: 'int', csharp: 'int', cpp: 'int', python: 'int', typescript: 'number' }, integer: { java: 'int', csharp: 'int', cpp: 'int', python: 'int', typescript: 'number' }, long: { java: 'long', csharp: 'long', cpp: 'long', python: 'int', typescript: 'number' }, double: { java: 'double', csharp: 'double', cpp: 'double', python: 'float', typescript: 'number' }, float: { java: 'float', csharp: 'float', cpp: 'float', python: 'float', typescript: 'number' }, bool: { java: 'boolean', csharp: 'bool', cpp: 'bool', python: 'bool', typescript: 'boolean' }, boolean: { java: 'boolean', csharp: 'bool', cpp: 'bool', python: 'bool', typescript: 'boolean' }, string: { java: 'String', csharp: 'string', cpp: 'std::string', python: 'str', typescript: 'string' }, void: { java: 'void', csharp: 'void', cpp: 'void', python: 'None', typescript: 'void' }, date: { java: 'LocalDate', csharp: 'DateTime', cpp: 'std::string', python: 'date', typescript: 'Date' }, char: { java: 'char', csharp: 'char', cpp: 'char', python: 'str', typescript: 'string' } };
    return P0[tt] ? P0[tt][L] : t; };
  const box_ = t => ({ int: 'Integer', long: 'Long', double: 'Double', float: 'Float', boolean: 'Boolean', char: 'Character' }[t] || t);
  function classModel(dg) {
    const cls = dg.nodes.filter(n => ['class', 'abstract', 'interface', 'enum', 'datatype'].includes(n.kind)).map(n => ({ id: n.id, kind: n.kind === 'abstract' ? 'class' : n.kind, abstract: n.kind === 'abstract' || !!n.props.abstract, name: n.name.replace(/\s+/g, ''), attrs: lines(n.props.attrs).map(parseMember).filter(Boolean), ops: lines(n.props.ops).map(parseMember).filter(Boolean), values: lines(n.props.values), ext: [], impl: [], rel: [] }));
    const by = {}; cls.forEach(c => by[c.id] = c);
    for (const e of dg.edges) { const a = by[e.from], b = by[e.to]; if (!a || !b) continue;
      if (e.kind === 'inheritance') (b.kind === 'interface' && a.kind === 'interface' ? a.ext : b.kind === 'interface' ? a.impl : a.ext).push(b.name);
      else if (e.kind === 'realization') a.impl.push(b.name);
      else if (['association', 'directed', 'aggregation', 'composition'].includes(e.kind)) { const owner = e.kind === 'aggregation' || e.kind === 'composition' ? a : a, target = owner === a ? b : a; const m = e.kind === 'aggregation' || e.kind === 'composition' ? e.props.m2 : e.props.m2; const many = /\*|\.\.[2-9n]/.test(m || ''); const nm = (e.props.role2 || (target.name[0].toLowerCase() + target.name.slice(1) + (many ? 's' : ''))).replace(/\W/g, ''); if (!owner.attrs.some(x => x.name === nm)) owner.rel.push({ name: nm, type: many ? `List<${target.name}>` : target.name, vis: 'private', comp: e.kind === 'composition' });
        if (e.kind === 'association' && /\*|1/.test(e.props.m1 || '') && e.props.role1) { const nm2 = e.props.role1.replace(/\W/g, ''); if (!b.attrs.some(x => x.name === nm2)) b.rel.push({ name: nm2, type: /\*/.test(e.props.m1) ? `List<${a.name}>` : a.name, vis: 'private' }); } } }
    return cls;
  }
  function toCode(dg, L = 'java') {
    const cls = classModel(dg); if (!cls.length) return '// There are no classes in this diagram.';
    const out = []; const V = v => v || 'public';
    for (const c of cls) {
      const fields = c.attrs.concat(c.rel); const t = x => typeMap(x, L);
      if (L === 'java' || L === 'csharp') {
        const cs = L === 'csharp'; const kw = c.kind === 'interface' ? 'interface' : c.kind === 'enum' ? 'enum' : (c.abstract ? 'abstract class' : 'class');
        let head = `public ${kw} ${c.name}`; if (cs) { const sup = c.ext.concat(c.impl.map(i => i)); if (sup.length) head += ' : ' + sup.join(', '); } else { if (c.ext.length) head += ' extends ' + c.ext.join(', '); if (c.impl.length) head += ' implements ' + c.impl.join(', '); }
        out.push(head + ' {'); if (c.kind === 'enum') { out.push('    ' + c.values.join(', ') + (cs ? '' : ';')); out.push('}', ''); continue; }
        for (const f of fields) { const vis = f.vis === 'package' ? (cs ? 'internal' : '') : V(f.vis); out.push(`    ${[vis, f.st ? 'static' : ''].filter(Boolean).join(' ')} ${t(f.type || 'String')} ${f.name}${f.def !== undefined ? ' = ' + f.def : f.comp && !cs ? ' ' : ''}${f.comp && /List</.test(f.type) ? ' = new ArrayList<>()' : ''};`.replace(/ {2,}/g, ' ').replace(/^ /, '    ')); }
        if (fields.length && c.ops.length) out.push('');
        for (const o of c.ops) { const ps = o.params.map(p => `${t(p.type || 'Object')} ${p.name}`).join(', '); const iface = c.kind === 'interface'; const ab = o.ab || iface; const sig = `${iface ? '' : V(o.vis) + ' '}${o.st ? 'static ' : ''}${ab && !iface ? 'abstract ' : ''}${t(o.type || 'void')} ${cs ? o.name[0].toUpperCase() + o.name.slice(1) : o.name}(${ps})`; out.push('    ' + sig + (ab ? ';' : ' {\n        ' + (/(^|\s)void$/.test(t(o.type || 'void')) ? '// TODO' : 'throw new ' + (cs ? 'NotImplementedException()' : 'UnsupportedOperationException("Not written yet")') + ';') + '\n    }')); }
        out.push('}', '');
      } else if (L === 'typescript') {
        const kw = c.kind === 'interface' ? 'export interface' : c.kind === 'enum' ? 'export enum' : (c.abstract ? 'export abstract class' : 'export class');
        let head = `${kw} ${c.name}`; if (c.ext.length) head += ' extends ' + c.ext.join(', '); if (c.impl.length && c.kind !== 'interface') head += ' implements ' + c.impl.join(', ');
        out.push(head + ' {'); if (c.kind === 'enum') { out.push('  ' + c.values.join(',\n  ')); out.push('}', ''); continue; }
        for (const f of fields) out.push(`  ${c.kind === 'interface' ? '' : (f.vis && f.vis !== 'package' ? f.vis + ' ' : '')}${f.st ? 'static ' : ''}${f.name}: ${t(f.type || 'string')}${f.def !== undefined ? ' = ' + f.def : ''};`);
        for (const o of c.ops) { const ps = o.params.map(p => `${p.name}: ${t(p.type || 'any')}`).join(', '); if (c.kind === 'interface') out.push(`  ${o.name}(${ps}): ${t(o.type || 'void')};`); else out.push(`  ${o.vis && o.vis !== 'package' ? o.vis + ' ' : ''}${o.st ? 'static ' : ''}${o.ab ? 'abstract ' : ''}${o.name}(${ps}): ${t(o.type || 'void')}${o.ab ? ';' : ' {\n    throw new Error("Not written yet");\n  }'}`); }
        out.push('}', '');
      } else if (L === 'python') {
        if (c.kind === 'enum') { out.push(`class ${c.name}(Enum):`); c.values.forEach((v, i) => out.push(`    ${v} = ${i + 1}`)); out.push('', ''); continue; }
        const bases = c.ext.concat(c.impl); if (c.abstract || c.kind === 'interface') bases.push('ABC'); out.push(`class ${c.name}${bases.length ? '(' + bases.join(', ') + ')' : ''}:`);
        const inst = fields.filter(f => !f.st), stat = fields.filter(f => f.st); for (const f of stat) out.push(`    ${f.name}: ${t(f.type) || 'object'} = ${f.def !== undefined ? f.def : 'None'}`);
        if (inst.length) { out.push(`    def __init__(self${inst.map(f => `, ${f.name}: ${t(f.type) || 'object'} = None`).join('')}):`); if (c.ext.length) out.push('        super().__init__()'); for (const f of inst) { const pv = f.vis === 'private' ? '__' : f.vis === 'protected' ? '_' : ''; out.push(`        self.${pv}${f.name} = ${/List</.test(f.type) ? `${f.name} if ${f.name} is not None else []` : f.name}`); } }
        for (const o of c.ops) { if (inst.length || o !== c.ops[0]) out.push(''); const pv = o.vis === 'private' ? '__' : o.vis === 'protected' ? '_' : ''; const ps = o.params.map(p => `, ${p.name}${p.type ? ': ' + t(p.type) : ''}`).join(''); if (o.ab || c.kind === 'interface') out.push('    @abstractmethod'); if (o.st) out.push('    @staticmethod'); out.push(`    def ${pv}${o.name}(${o.st ? ps.replace(/^, /, '') : 'self' + ps})${o.type ? ' -> ' + t(o.type) : ''}:`); out.push(`        ${o.ab || c.kind === 'interface' ? '...' : 'raise NotImplementedError'}`); }
        if (!inst.length && !c.ops.length && !stat.length) out.push('    pass'); out.push('', '');
      } else if (L === 'cpp') {
        if (c.kind === 'enum') { out.push(`enum class ${c.name} {`, '    ' + c.values.join(',\n    '), '};', ''); continue; }
        const sup = c.ext.concat(c.impl).map(s => 'public ' + s); out.push(`class ${c.name}${sup.length ? ' : ' + sup.join(', ') : ''} {`);
        for (const vis of ['public', 'protected', 'private']) {
          const fs = fields.filter(f => (f.vis || 'private') === vis || (vis === 'private' && f.vis === 'package')), os = c.ops.filter(o => (o.vis || 'public') === vis || (vis === 'public' && o.vis === 'package')); const ctor = vis === 'public' && c.kind !== 'interface'; if (!fs.length && !os.length && !ctor) continue; out.push(vis + ':');
          if (ctor) out.push(`    ${c.name}();`, `    virtual ~${c.name}()${c.kind === 'interface' ? ' = default' : ''};`);
          for (const f of fs) out.push(`    ${f.st ? 'static ' : ''}${t(f.type || 'int')} ${f.name}${f.def !== undefined && !f.st ? ' = ' + f.def : ''};`);
          for (const o of os) out.push(`    ${o.st ? 'static ' : (o.ab || c.kind === 'interface' ? 'virtual ' : '')}${t(o.type || 'void')} ${o.name}(${o.params.map(p => `${t(p.type || 'int')} ${p.name}`).join(', ')})${o.ab || c.kind === 'interface' ? ' = 0' : ''};`);
        }
        out.push('};', '');
      }
    }
    let head = ''; const all = out.join('\n');
    if (L === 'java' && /List</.test(all)) head = 'import java.util.ArrayList;\nimport java.util.List;\n' + (/LocalDate/.test(all) ? 'import java.time.LocalDate;\n' : '') + '\n';
    if (L === 'csharp') head = 'using System;\nusing System.Collections.Generic;\n\n';
    if (L === 'python') head = [/Enum\)/.test(all) ? 'from enum import Enum' : '', /ABC\)|ABC,/.test(all) || /abstractmethod/.test(all) ? 'from abc import ABC, abstractmethod' : '', /\bdate\b/.test(all) ? 'from datetime import date' : '', 'from __future__ import annotations'].filter(Boolean).reverse().join('\n') + '\n\n\n';
    if (L === 'cpp') head = '#pragma once\n#include <string>\n#include <vector>\n\n';
    return (head + all).replace(/\n{4,}/g, '\n\n\n').trim() + '\n';
  }
  function fromCode(text, L) {
    const src = String(text || ''); const cls = [];
    if (!L) L = /^\s*(class|def)\s+\w+.*:\s*$/m.test(src) && !/[{;]\s*$/m.test(src) ? 'python' : /\binterface\s+\w+\s*\{[^}]*:\s*\w/.test(src) || /\bexport\s+(class|interface)/.test(src) ? 'typescript' : /^\s*(public\s+)?(partial\s+)?class\s+\w+\s*:\s*\w/m.test(src) || /\bnamespace\s+\w+/.test(src) ? 'csharp' : 'java';
    if (L === 'python') {
      const ls = src.split('\n'); let cur = null;
      for (let i = 0; i < ls.length; i++) { const l = ls[i]; let m;
        if ((m = l.match(/^class\s+(\w+)\s*(?:\(([^)]*)\))?\s*:/))) { const bases = (m[2] || '').split(',').map(s => s.trim()).filter(s => s && !/^(object|ABC|Enum|metaclass=.*)$/.test(s)); cur = { name: m[1], kind: /\bEnum\b/.test(m[2] || '') ? 'enum' : 'class', ext: bases, impl: [], attrs: [], ops: [], values: [], abstract: /\bABC\b/.test(m[2] || '') }; cls.push(cur); continue; }
        if (!cur) continue; if (/^\S/.test(l) && l.trim()) { cur = null; continue; }
        if (cur.kind === 'enum' && (m = l.match(/^\s{4}(\w+)\s*=/))) { cur.values.push(m[1]); continue; }
        if ((m = l.match(/^\s{4}def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:/))) { const nm = m[1]; const ps = m[2].split(',').map(s => s.trim()).filter(s => s && s !== 'self' && s !== 'cls'); if (nm === '__init__') { for (const p of ps) { const [pn, pt] = p.split('=')[0].split(':').map(x => x.trim()); if (pn && !cur.attrs.some(a => a.name === pn.replace(/^_+/, ''))) cur.attrs.push({ vis: '-', name: pn, type: pt || '' }); } continue; } if (/^__\w+__$/.test(nm)) continue; const vis = nm.startsWith('__') ? '-' : nm.startsWith('_') ? '#' : '+'; cur.ops.push({ vis, name: nm.replace(/^_+/, ''), params: ps.map(p => { const [pn, pt] = p.split('=')[0].split(':').map(x => x.trim()); return pn + (pt ? ': ' + pt : ''); }), type: m[3] ? m[3].trim() : '', ab: /@abstractmethod/.test(ls[i - 1] || '') }); continue; }
        if ((m = l.match(/^\s{8}self\.(\w+)\s*(?::\s*([\w\[\], ]+))?\s*=/))) { const raw = m[1]; const nm = raw.replace(/^_+/, ''); const vis = raw.startsWith('__') ? '-' : raw.startsWith('_') ? '#' : '+'; const ex = cur.attrs.find(a => a.name === nm || a.name === raw); if (ex) { ex.vis = vis; ex.name = nm; if (m[2]) ex.type = m[2]; } else cur.attrs.push({ vis, name: nm, type: m[2] || '' }); continue; }
        if ((m = l.match(/^\s{4}(\w+)\s*:\s*([\w\[\], ]+?)(?:\s*=.*)?$/))) cur.attrs.push({ vis: '+', name: m[1], type: m[2], st: 1 });
      }
    } else {
      const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/^\s*(import|using|package|#include|namespace)\b[^\n]*/gm, '').replace(/^\s*@\w+(\([^)]*\))?/gm, '').replace(/\[\w+(\([^)]*\))?\]\s*\n/g, '\n');
      const re = /((?:public|private|protected|internal|export|default|abstract|sealed|static|final|partial|declare|\s)*)\b(class|interface|enum|record|struct)\s+(\w+)(?:<[^>{]*>)?\s*([^{]*)\{/g; let m;
      while ((m = re.exec(clean))) {
        let i = re.lastIndex, d = 1; const st = i; for (; i < clean.length && d; i++) { if (clean[i] === '{') d++; else if (clean[i] === '}') d--; } const body = clean.slice(st, i - 1);
        const mods = m[1] || '', kind = m[2] === 'interface' ? 'interface' : m[2] === 'enum' ? 'enum' : 'class', tail = m[4] || ''; const c = { name: m[3], kind, abstract: /abstract/.test(mods), ext: [], impl: [], attrs: [], ops: [], values: [] }; cls.push(c);
        const ext = tail.match(/extends\s+([\w<>, .]+?)(?=\s+implements|$)/), imp = tail.match(/implements\s+([\w<>, .]+)/), col = tail.match(/^\s*:\s*([\w<>, .]+)/);
        const sp = s => s.split(',').map(x => x.trim().replace(/<.*$/, '').replace(/^(public|private|protected|virtual)\s+/g, '')).filter(Boolean);
        if (ext) c.ext.push(...sp(ext[1])); if (imp) c.impl.push(...sp(imp[1])); if (col) { const all = sp(col[1]); for (const s of all) (/^I[A-Z]/.test(s) ? c.impl : c.ext).push(s); }
        // members at depth 0 of the body
        let flat = ''; d = 0; for (const ch of body) { if (ch === '{') { if (d === 0) flat += '{'; d++; continue; } if (ch === '}') { d--; if (d === 0) flat += '};'; continue; } if (d === 0) flat += ch; }
        if (kind === 'enum') { c.values = flat.split(/[;{]/)[0].split(',').map(s => s.trim().split(/[\s(=]/)[0]).filter(s => /^\w+$/.test(s)); continue; }
        for (let st0 of flat.split(/;|\}/)) {
          st0 = st0.replace(/\s+/g, ' ').trim(); if (!st0 || /^(public|private|protected):?$/.test(st0)) continue; st0 = st0.replace(/^(public|private|protected):\s*/, '');
          const vis = /\bprivate\b/.test(st0) ? '-' : /\bprotected\b/.test(st0) ? '#' : /\bpublic\b/.test(st0) || kind === 'interface' ? '+' : (L === 'typescript' ? '+' : '~'); const isSt = /\bstatic\b/.test(st0), isAb = /\babstract\b|=\s*0$/.test(st0);
          const s1 = st0.replace(/\b(public|private|protected|internal|static|final|abstract|virtual|override|readonly|async|const|sealed|synchronized|transient|volatile|explicit|inline)\b/g, '').replace(/\{$/, '').trim();
          let mm;
          if ((mm = s1.match(/^(?:([\w<>\[\],.:? ]+?)\s+)?([\w~]+)\s*\(([^)]*)\)\s*(?::\s*([\w<>\[\]| ,.]+))?/)) && !/^(if|for|while|switch|return|new)$/.test(mm[2])) {
            const nm = mm[2]; if (nm === c.name || nm === '~' + c.name || nm === 'constructor') continue; const ret = L === 'typescript' ? (mm[4] || '') : (mm[1] || '').trim();
            const ps = mm[3].split(',').map(p => p.trim()).filter(Boolean).map(p => { if (L === 'typescript') { const [pn, pt] = p.split('=')[0].split(':').map(x => x.trim()); return pn.replace(/\?$/, '') + (pt ? ': ' + pt : ''); } const w = p.split('=')[0].trim().split(/\s+/); const pn = w.pop().replace(/^[*&]+/, ''); return pn + ': ' + w.join(' ').replace(/\bconst\b|&|\*/g, '').trim(); });
            c.ops.push({ vis, name: nm, params: ps, type: ret, st: isSt, ab: isAb || kind === 'interface' }); continue; }
          if (L === 'typescript' && (mm = s1.match(/^(\w+)\??\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/))) { c.attrs.push({ vis, name: mm[1], type: (mm[2] || '').trim(), st: isSt }); continue; }
          if ((mm = s1.match(/^([\w<>\[\],.:? ]+?)\s+([\w*&]+)\s*(?:=\s*(.+))?$/))) { for (const nm of [mm[2]]) c.attrs.push({ vis, name: nm.replace(/^[*&]+/, ''), type: mm[1].replace(/\bconst\b/, '').trim(), st: isSt }); continue; }
          if ((mm = s1.match(/^([\w<>\[\],.]+)\s+(\w+)\s*\{\s*get/))) c.attrs.push({ vis, name: mm[2], type: mm[1], st: isSt });
        }
      }
    }
    const dg = newDiagram('class', 'Classes from code'); const ids = {};
    for (const c of cls) { const kind = c.kind === 'interface' ? 'interface' : c.kind === 'enum' ? 'enum' : 'class'; const n = newNode(kind, 0, 0, c.name); n.props = {}; if (kind === 'enum') n.props.values = c.values.join('\n'); else { if (kind === 'class') { n.props.attrs = c.attrs.map(a => `${a.vis || '-'} ${a.name}${a.type ? ': ' + a.type : ''}${a.st ? ' {static}' : ''}`).join('\n'); n.props.abstract = c.abstract ? true : undefined; } n.props.ops = c.ops.map(o => `${o.vis || '+'} ${o.name}(${o.params.join(', ')})${o.type ? ': ' + o.type : ''}${o.st ? ' {static}' : ''}${o.ab && kind !== 'interface' ? ' {abstract}' : ''}`).join('\n'); } ids[c.name] = n.id; dg.nodes.push(n); }
    for (const c of cls) {
      for (const b of c.ext) if (ids[b]) dg.edges.push(newEdge('inheritance', ids[c.name], ids[b]));
      for (const b of c.impl) if (ids[b]) dg.edges.push(newEdge(cls.find(x => x.name === b && x.kind === 'interface') ? 'realization' : 'inheritance', ids[c.name], ids[b]));
      for (const a of c.attrs) { const m = String(a.type || '').match(/^(?:List|ArrayList|Set|HashSet|Collection|IList|IEnumerable|ICollection|std::vector|list|set|Array)?<?\[?(\w+)[>\]]*(\[\])?$/); const tn = m && m[1]; if (tn && ids[tn] && tn !== c.name) { const many = /List|Set|Collection|vector|\[|list|set|Array|IEnumerable/.test(a.type); const e = newEdge('directed', ids[c.name], ids[tn]); e.props = { m2: many ? '0..*' : '1', role2: a.name }; dg.edges.push(e); } }
    }
    layout(dg); return { diagram: dg, classes: cls.length, lang: L };
  }

  /* ---------------- checks ---------------- */
  function validate(dg) {
    const out = []; const add = (lvl, msg, id) => out.push({ lvl, msg, id }); const N = {}; dg.nodes.forEach(n => N[n.id] = n);
    for (const e of dg.edges) if (!N[e.from] || !N[e.to]) add('error', `A line has lost one of its ends (${EK[e.kind] ? EK[e.kind].label : e.kind}).`, e.id);
    const named = dg.nodes.filter(n => NK[n.kind] && NK[n.kind].f.some(f => f[0] === 'name' && !/optional/i.test(f[1])) && !['note', 'fragment'].includes(n.kind) && !NK[n.kind].f.every(f => f[0] !== 'name')); for (const n of named) if (!String(n.name || '').trim()) add('warn', `A ${NK[n.kind].label || n.kind} has no name.`, n.id);
    if (dg.type === 'er') {
      const ents = dg.nodes.filter(n => n.kind === 'entity'); const names = {};
      for (const n of ents) { const cols = erCols(n); const k = n.name.toLowerCase(); if (names[k]) add('error', `Two tables are called ${n.name}.`, n.id); names[k] = n;
        if (!cols.some(c => c.pk)) add('error', `${n.name} has no primary key.`, n.id);
        const cn = {}; for (const c of cols) { if (cn[c.name.toLowerCase()]) add('error', `${n.name} has two columns called ${c.name}.`, n.id); cn[c.name.toLowerCase()] = 1; if (!c.type) add('warn', `${n.name}.${c.name} has no type.`, n.id); }
        const groups = {}; for (const c of cols) { const m = c.name.match(/^(.*?)(\d+)$/); if (m) (groups[m[1].toLowerCase()] = groups[m[1].toLowerCase()] || []).push(c.name); } for (const g in groups) if (groups[g].length >= 2) add('warn', `${n.name}: ${groups[g].join(', ')} repeat the same thing. First normal form moves them into their own table.`, n.id);
        for (const c of cols) if (/,|;|\blist\b|\bitems\b/i.test(c.name) && !c.pk) add('info', `${n.name}.${c.name} may hold more than one value. One value per column keeps the table in first normal form.`, n.id);
        for (const c of cols) if (c.fk) { const [t, cc] = c.fk.split('.'); const p = ents.find(x => x.name.toLowerCase() === (t || '').toLowerCase()); if (!p) add('error', `${n.name}.${c.name} points to ${t}, which is not in the diagram.`, n.id); else { const pc = erCols(p).find(x => x.name.toLowerCase() === (cc || '').toLowerCase()); if (!pc) add('error', `${n.name}.${c.name} points to ${t}.${cc}, which does not exist.`, n.id); else if (!pc.pk && !pc.uq) add('warn', `${n.name}.${c.name} points to ${t}.${cc}, which is not a key.`, n.id); else if (pc.type && c.type && mapType(pc.type, 'mysql').replace(/\(.*/, '') !== mapType(c.type, 'mysql').replace(/\(.*/, '')) add('warn', `${n.name}.${c.name} is ${c.type} but ${t}.${cc} is ${pc.type}.`, n.id); } }
        const pks = cols.filter(c => c.pk); if (pks.length > 1) { const nonkey = cols.filter(c => !c.pk && !c.fk); if (nonkey.length && pks.some(c => c.fk)) add('info', `${n.name} has a composite key. Check that every other column depends on the whole key (second normal form).`, n.id); }
        if (!dg.edges.some(e => e.from === n.id || e.to === n.id) && ents.length > 1 && !cols.some(c => c.fk)) add('info', `${n.name} is not related to any other table.`, n.id);
      }
      for (const e of dg.edges.filter(e => e.kind === 'rel')) if (/\*/.test(e.props.c1 || '') && /\*/.test(e.props.c2 || '')) add('info', `A many-to-many relationship (${(N[e.from] || {}).name} and ${(N[e.to] || {}).name}) becomes a joining table in SQL.`, e.id);
    }
    if (dg.type === 'class') {
      const cls = dg.nodes.filter(n => ['class', 'abstract', 'interface', 'enum', 'datatype'].includes(n.kind)); const seen = {}; for (const c of cls) { if (seen[c.name]) add('error', `Two classes are called ${c.name}.`, c.id); seen[c.name] = 1; }
      const sup = {}; for (const e of dg.edges.filter(e => e.kind === 'inheritance')) (sup[e.from] = sup[e.from] || []).push(e.to);
      for (const c of cls) { const st = [c.id], vis = new Set(); while (st.length) { const x = st.pop(); for (const y of sup[x] || []) { if (y === c.id) { add('error', `${c.name} inherits from itself through a loop.`, c.id); st.length = 0; break; } if (!vis.has(y)) { vis.add(y); st.push(y); } } } }
      for (const e of dg.edges) { const a = N[e.from], b = N[e.to]; if (!a || !b) continue; if (e.kind === 'realization' && b.kind !== 'interface') add('warn', `${a.name} implements ${b.name}, which is not an interface.`, e.id); if (e.kind === 'inheritance' && a.kind === 'class' && b.kind === 'interface') add('info', `${a.name} → ${b.name}: a class implements an interface with a dashed line (realization).`, e.id); }
      for (const c of cls) if (c.kind === 'interface' && lines(c.props.attrs).length) add('warn', `${c.name} is an interface but has attributes.`, c.id);
    }
    if (['activity', 'overview'].includes(dg.type)) { if (!dg.nodes.some(n => n.kind === 'initial')) add('warn', 'There is no start (initial node).'); if (!dg.nodes.some(n => n.kind === 'final' || n.kind === 'flowfinal')) add('warn', 'There is no end (final node).'); for (const n of dg.nodes.filter(n => n.kind === 'decision')) { const outs = dg.edges.filter(e => e.from === n.id); if (outs.length > 1 && outs.some(e => !/\[.*\]/.test(e.name || ''))) add('info', 'Every line leaving a decision should carry a guard such as [yes].', n.id); } }
    if (dg.type === 'state') { const ini = dg.nodes.filter(n => n.kind === 'initial'); if (!ini.length) add('warn', 'There is no initial state.'); const reach = new Set(ini.map(n => n.id)); let ch = true; while (ch) { ch = false; for (const e of dg.edges) if (reach.has(e.from) && !reach.has(e.to)) { reach.add(e.to); ch = true; } } for (const n of dg.nodes.filter(n => n.kind === 'state')) if (ini.length && !reach.has(n.id) && !dg.nodes.some(c => c.kind === 'composite' && inside(n, c, dg))) add('warn', `${n.name} cannot be reached from the initial state.`, n.id); }
    if (dg.type === 'bpmn') { if (!dg.nodes.some(n => n.kind === 'start')) add('warn', 'The process has no start event.'); if (!dg.nodes.some(n => n.kind === 'end')) add('warn', 'The process has no end event.'); for (const e of dg.edges.filter(e => e.kind === 'seqflow')) { const pa = dg.nodes.find(p => p.kind === 'pool' && inside(N[e.from], p, dg)), pb = dg.nodes.find(p => p.kind === 'pool' && inside(N[e.to], p, dg)); if (pa && pb && pa !== pb) add('error', 'A sequence flow crosses from one pool to another. Use a message flow between pools.', e.id); } }
    if (dg.type === 'dfd') { for (const e of dg.edges.filter(e => e.kind === 'dataflow')) { const a = N[e.from], b = N[e.to]; if (!a || !b) continue; if (a.kind !== 'process' && b.kind !== 'process') add('error', `Data cannot flow from ${a.name} to ${b.name} without a process between them.`, e.id); if (!e.name) add('warn', 'Every data flow should be named after the data it carries.', e.id); } for (const n of dg.nodes.filter(n => n.kind === 'process')) { if (!dg.edges.some(e => e.to === n.id)) add('warn', `${n.name} has no input (a miracle).`, n.id); if (!dg.edges.some(e => e.from === n.id)) add('warn', `${n.name} has no output (a black hole).`, n.id); } }
    if (dg.type === 'usecase') for (const u of dg.nodes.filter(n => n.kind === 'usecase')) if (!dg.edges.some(e => e.from === u.id || e.to === u.id)) add('info', `${u.name} is not tied to any actor.`, u.id);
    if (dg.type === 'sequence') { const L = dg.nodes.filter(n => NK[n.kind].seq); if (L.length < 2) add('info', 'A sequence needs at least two lifelines.'); const rows = dg.edges.length; for (const f of dg.nodes.filter(n => n.kind === 'fragment')) if ((+f.props.first || 1) > rows || (+f.props.last || 1) < (+f.props.first || 1)) add('warn', `The ${f.props.op} fragment covers messages that do not exist.`, f.id); }
    if (!out.length) add('ok', 'No problems found.');
    return out;
  }
  function inside(n, c, dg) { if (!n || !c) return false; const a = box(n, dg), b = box(c, dg); const cx = a.x + a.w / 2, cy = a.y + a.h / 2; return n !== c && cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h; }

  /* ---------------- layout ---------------- */
  function layout(dg, opt = {}) {
    const t = TYPES[dg.type]; const holds = c => dg.nodes.some(q => q !== c && inside(q, c, dg)); const nodes = dg.nodes.filter(n => (!(NK[n.kind] || {}).container || (!['boundary', 'pool', 'lane', 'partition', 'group', 'c4boundary'].includes(n.kind) && (opt.all || !holds(n)))) && n.kind !== 'note' && n.kind !== 'fragment');
    if (t.special === 'sequence') { let x = 40; for (const n of dg.nodes.filter(n => NK[n.kind].seq).sort((a, b) => a.x - b.x)) { n.x = x; x += Math.max(150, size(n, dg)[0] + 60); } return; }
    if (t.special === 'timing') { let y = 0; for (const n of dg.nodes.filter(n => n.kind === 'tline').sort((a, b) => a.y - b.y)) { n.y = y; y += timingH(n) + 4; } return; }
    if (!nodes.length) return; const ids = new Set(nodes.map(n => n.id)); const by = {}; nodes.forEach(n => by[n.id] = n);
    // edges point from parent to child: inheritance goes up, foreign keys hang under their parent
    const E0 = dg.edges.filter(e => ids.has(e.from) && ids.has(e.to) && e.from !== e.to && e.kind !== 'anchor').map(e => ['inheritance', 'realization', 'extension'].includes(e.kind) ? [e.to, e.from] : [e.from, e.to]);
    const out = {}, inc = {}; nodes.forEach(n => { out[n.id] = []; inc[n.id] = []; }); for (const [a, b] of E0) { out[a].push(b); inc[b].push(a); }
    // layers by longest path, ignoring back edges (DFS)
    const state = {}, order = [], back = new Set(); const dfs = v => { state[v] = 1; for (const w of out[v]) { if (state[w] === 1) back.add(v + '>' + w); else if (!state[w]) dfs(w); } state[v] = 2; order.push(v); };
    const roots = nodes.filter(n => !inc[n.id].length || n.kind === 'initial' || n.kind === 'start').map(n => n.id); roots.forEach(r => { if (!state[r]) dfs(r); }); nodes.forEach(n => { if (!state[n.id]) dfs(n.id); });
    const layer = {}; for (const v of order.slice().reverse()) { layer[v] = layer[v] || 0; for (const w of out[v]) if (!back.has(v + '>' + w)) layer[w] = Math.max(layer[w] || 0, layer[v] + 1); }
    const L = []; nodes.forEach(n => { (L[layer[n.id]] = L[layer[n.id]] || []).push(n.id); });
    // a layer much wider than the rest wraps
    const maxPer = Math.max(4, Math.ceil(Math.sqrt(nodes.length) * 1.6)); const L2 = []; for (const l of L) { if (!l) continue; for (let i = 0; i < l.length; i += maxPer) L2.push(l.slice(i, i + maxPer)); }
    // order inside layers by the mean position of their neighbours
    const pos = {}; L2.forEach(l => l.forEach((v, i) => pos[v] = i));
    for (let it = 0; it < 4; it++) for (let k = 1; k < L2.length; k++) { L2[k].sort((a, b) => { const m = v => { const ns = inc[v].concat(out[v]).filter(u => pos[u] != null && L2[k - 1].includes(u)); return ns.length ? ns.reduce((s, u) => s + pos[u], 0) / ns.length : pos[v]; }; return m(a) - m(b); }); L2[k].forEach((v, i) => pos[v] = i); }
    const vertical = !['usecase'].includes(dg.type); const gapX = dg.type === 'er' && dg.notation === 'chen' ? 260 : 70, gapY = dg.type === 'er' && dg.notation === 'chen' ? 220 : ['state', 'activity'].includes(dg.type) ? 100 : 80;
    if (dg.type === 'usecase') { // actors on the left, use cases in a column
      const actors = nodes.filter(n => n.kind === 'actor'), ucs = nodes.filter(n => n.kind !== 'actor'); const near = u => dg.edges.some(e => (e.from === u.id || e.to === u.id) && actors.some(a => a.id === e.from || a.id === e.to));
      const colA = ucs.filter(near), colB = ucs.filter(u => !near(u)); let y = 60; const pos = {}; for (const u of colA) { u.x = 270; u.y = y; pos[u.id] = y; y += 100; }
      let yb = 60; for (const u of colB) { const rel = dg.edges.find(e => (e.from === u.id && pos[e.to] != null) || (e.to === u.id && pos[e.from] != null)); const want = rel ? pos[rel.from === u.id ? rel.to : rel.from] : yb; u.y = Math.max(yb, want - 10); u.x = 270 + 230; yb = u.y + 90; }
      const ys = []; for (const a of actors) { const e = dg.edges.find(e => e.from === a.id || e.to === a.id); const u = e && ucs.find(q => q.id === (e.from === a.id ? e.to : e.from)); let yy = u ? u.y - 12 : 60; while (ys.some(v => Math.abs(v - yy) < 100)) yy += 100; ys.push(yy); a.x = 40; a.y = yy; }
      const bd = dg.nodes.find(n => n.kind === 'boundary'); if (bd) { const all = ucs.map(u => box(u, dg)); bd.x = 230; bd.y = 10; bd.w = Math.max(280, Math.max(...all.map(b => b.x + b.w)) - 230 + 40); bd.h = Math.max(200, Math.max(...all.map(b => b.y + b.h)) + 40); } return;
    }
    let y = 40; const widths = L2.map(l => l.reduce((s, v) => s + size(by[v], dg)[0], 0) + (l.length - 1) * gapX); const W = Math.max(...widths);
    L2.forEach((l, k) => { let x = 40 + (W - widths[k]) / 2; const h = Math.max(...l.map(v => size(by[v], dg)[1])); for (const v of l) { const [w, hh] = size(by[v], dg); by[v].x = Math.round(x / 10) * 10; by[v].y = Math.round((y + (h - hh) / 2) / 10) * 10; x += w + gapX; } y += h + gapY; });
    if (!vertical) return;
  }

  /* ---------------- examples ---------------- */
  function ex(type, build) { const d = newDiagram(type); const N = {}; const n = (k, x, y, name, props) => { const o = newNode(k, x, y, name); if (props) Object.assign(o.props, props); d.nodes.push(o); return N[name] = o; }; const e = (k, a, b, name, props) => { const o = newEdge(k, (a.id ? a : N[a]).id, (b.id ? b : N[b]).id); if (name) o.name = name; if (props) Object.assign(o.props, props); d.edges.push(o); return o; }; build(n, e, d); return d; }
  const EXAMPLES = {
    class: () => ex('class', (n, e) => { n('interface', 0, 0, 'Shape', { ops: '+ area(): double\n+ perimeter(): double' }); n('abstract', 0, 0, 'Polygon', { abstract: true, attrs: '# sides: int', ops: '+ perimeter(): double' }); n('class', 0, 0, 'Circle', { attrs: '- radius: double', ops: '+ area(): double\n+ perimeter(): double' }); n('class', 0, 0, 'Rectangle', { attrs: '- width: double\n- height: double', ops: '+ area(): double' }); n('class', 0, 0, 'Drawing', { attrs: '- title: String', ops: '+ add(s: Shape): void\n+ totalArea(): double' }); n('enum', 0, 0, 'Color', { values: 'RED\nGREEN\nBLUE' });
      e('realization', 'Circle', 'Shape'); e('realization', 'Polygon', 'Shape'); e('inheritance', 'Rectangle', 'Polygon'); e('aggregation', 'Drawing', 'Shape', '', { m1: '1', m2: '0..*', role2: 'shapes' }); e('directed', 'Drawing', 'Color', '', { m2: '1', role2: 'background' }); }),
    object: () => ex('object', (n, e) => { n('object', 0, 0, 'd1 : Drawing', { attrs: 'title = "Plan"' }); n('object', 0, 0, 'c1 : Circle', { attrs: 'radius = 2.0' }); n('object', 0, 0, 'r1 : Rectangle', { attrs: 'width = 3\nheight = 4' }); e('link', 'd1 : Drawing', 'c1 : Circle'); e('link', 'd1 : Drawing', 'r1 : Rectangle'); }),
    usecase: () => ex('usecase', (n, e) => { n('boundary', 0, 0, 'Library system'); n('actor', 0, 0, 'Member'); n('actor', 0, 0, 'Librarian'); n('usecase', 0, 0, 'Borrow a book'); n('usecase', 0, 0, 'Check membership'); n('usecase', 0, 0, 'Pay a fine'); n('usecase', 0, 0, 'Add a book'); e('association', 'Member', 'Borrow a book'); e('include', 'Borrow a book', 'Check membership'); e('extend', 'Pay a fine', 'Borrow a book'); e('association', 'Librarian', 'Add a book'); }),
    activity: () => ex('activity', (n, e) => { n('initial', 0, 0, ''); n('action', 0, 0, 'Enter the PIN'); n('decision', 0, 0, ''); n('action', 0, 0, 'Choose an amount'); n('forkbar', 0, 0, ''); n('action', 0, 0, 'Give the cash'); n('action', 0, 0, 'Print a receipt'); n('final', 0, 0, ''); n('action', 0, 0, 'Keep the card');
      const ns = []; e('flow', 'Enter the PIN', 'Enter the PIN'); }),
    sequence: () => ex('sequence', (n, e) => { n('lactor', 40, 0, 'User'); n('lboundary', 200, 0, 'LoginPage'); n('lcontrol', 360, 0, 'AuthService'); n('ldatabase', 520, 0, 'Users'); e('sync', 'User', 'LoginPage', 'login(name, password)'); e('sync', 'LoginPage', 'AuthService', 'check(name, password)'); e('sync', 'AuthService', 'Users', 'find(name)'); e('reply', 'Users', 'AuthService', 'user'); e('sync', 'AuthService', 'AuthService', 'compareHash()'); e('reply', 'AuthService', 'LoginPage', 'ok'); e('reply', 'LoginPage', 'User', 'home page'); n('fragment', 0, 0, '[user found]', { op: 'opt', first: 4, last: 6 }); }),
    booking: () => ex('sequence', (n, e, d) => { d.name = 'Booking'; d.seqNum = 'badge'; d.mirror = true; d.noAct = true; d.theme = 'lavender';
      n('lactor', 40, 0, 'Client'); n('lifeline', 190, 0, 'Booking UI'); n('lifeline', 340, 0, 'Platform System'); n('lifeline', 500, 0, 'Payment Gateway'); n('lifeline', 650, 0, 'Notification Service'); n('lactor', 820, 0, 'Specialist');
      e('sync', 'Client', 'Booking UI', 'Select specialist, slot & request booking'); e('sync', 'Booking UI', 'Platform System', 'Send booking request'); e('sync', 'Platform System', 'Platform System', 'Check availability & prevent conflict');
      e('sync', 'Platform System', 'Payment Gateway', 'Process payment (amount & details)'); e('reply', 'Payment Gateway', 'Platform System', 'Payment approved'); e('sync', 'Platform System', 'Platform System', 'Confirm booking & update schedule');
      e('reply', 'Platform System', 'Booking UI', 'Show booking confirmation'); e('sync', 'Platform System', 'Notification Service', 'Trigger confirmation & reminder'); e('reply', 'Notification Service', 'Client', 'Send booking confirmation'); e('reply', 'Notification Service', 'Specialist', 'Send new booking alert');
      e('reply', 'Payment Gateway', 'Platform System', 'Payment declined or slot taken'); e('reply', 'Platform System', 'Booking UI', 'Show error & suggest another slot');
      n('fragment', 0, 0, 'Slot available', { op: 'alt', first: 4, last: 12, elseAt: 11, guard2: 'Slot unavailable or payment failed' }); }),
    state: () => ex('state', (n, e) => { n('initial', 0, 0, ''); n('state', 0, 0, 'Idle', { acts: 'entry / show time' }); n('state', 0, 0, 'Selecting'); n('state', 0, 0, 'Paying', { acts: 'do / wait for coins' }); n('state', 0, 0, 'Serving', { acts: 'entry / drop the drink' }); n('final', 0, 0, ''); e('transition', '', 'Idle'); }),
    er: () => ex('er', (n, e) => { n('entity', 0, 0, 'Customer', { cols: [{ name: 'id', type: 'INT', pk: 1, nn: 1, ai: 1 }, { name: 'name', type: 'VARCHAR(100)', nn: 1 }, { name: 'email', type: 'VARCHAR(255)', uq: 1 }] }); n('entity', 0, 0, 'Order', { cols: [{ name: 'id', type: 'INT', pk: 1, nn: 1, ai: 1 }, { name: 'customer_id', type: 'INT', nn: 1, fk: 'Customer.id' }, { name: 'placed_at', type: 'DATETIME', nn: 1 }] }); n('entity', 0, 0, 'Product', { cols: [{ name: 'id', type: 'INT', pk: 1, nn: 1, ai: 1 }, { name: 'title', type: 'VARCHAR(200)', nn: 1 }, { name: 'price', type: 'DECIMAL(10,2)', nn: 1 }] }); n('entity', 0, 0, 'OrderLine', { weak: 1, cols: [{ name: 'order_id', type: 'INT', pk: 1, nn: 1, fk: 'Order.id' }, { name: 'product_id', type: 'INT', pk: 1, nn: 1, fk: 'Product.id' }, { name: 'quantity', type: 'INT', nn: 1 }] });
      e('rel', 'Customer', 'Order', 'places', { c1: '1', c2: '0..*' }); e('rel', 'Order', 'OrderLine', 'contains', { c1: '1', c2: '1..*', identifying: 1 }); e('rel', 'Product', 'OrderLine', 'appears in', { c1: '1', c2: '0..*', identifying: 1 }); }),
    component: () => ex('component', (n, e) => { n('component', 0, 0, 'Web shop'); n('provided', 0, 0, 'IPayment'); n('component', 0, 0, 'Payments'); n('component', 0, 0, 'Catalog'); n('artifact', 0, 0, 'shop.war'); e('assembly', 'Web shop', 'IPayment'); e('association', 'Payments', 'IPayment'); e('dependency', 'Web shop', 'Catalog'); e('realization', 'shop.war', 'Web shop'); }),
    deployment: () => ex('deployment', (n, e) => { n('device', 0, 0, 'Phone'); n('node3d', 0, 0, 'Web server', { stereo: 'server' }); n('database', 0, 0, 'Orders DB'); n('artifact', 0, 0, 'app.apk'); e('commpath', 'Phone', 'Web server', 'HTTPS'); e('commpath', 'Web server', 'Orders DB', 'TCP 5432'); e('deploy', 'app.apk', 'Phone'); }),
    package: () => ex('package', (n, e) => { n('package', 0, 0, 'ui'); n('package', 0, 0, 'domain'); n('package', 0, 0, 'data'); e('import', 'ui', 'domain'); e('import', 'domain', 'data'); }),
    composite: () => ex('composite', (n, e, d) => { const s = n('structured', 20, 20, 'Car'); s.w = 420; s.h = 200; n('part', 50, 90, 'engine : Engine'); n('part', 260, 90, 'wheels : Wheel', { mult: '4' }); n('port', 13, 100, 'p'); e('connector', 'engine : Engine', 'wheels : Wheel', 'axle'); e('delegation', 'p', 'engine : Engine'); }),
    profile: () => ex('profile', (n, e) => { const p = n('profilepkg', 0, 0, 'Web'); p.w = 420; p.h = 220; n('metaclass', 40, 60, 'Class'); n('stereotype', 240, 60, 'Controller', { attrs: 'route: String' }); e('extension', 'Controller', 'Class'); }),
    communication: () => ex('communication', (n, e) => { n('actor', 0, 0, 'Clerk'); n('object', 0, 0, ':Register', { attrs: '' }); n('object', 0, 0, ':Sale', { attrs: '' }); e('link', 'Clerk', ':Register', '', { msgs: '1: enterItem(id)' }); e('link', ':Register', ':Sale', '', { msgs: '1.1: addLine(id)\n< 1.2: total' }); }),
    timing: () => ex('timing', (n, e) => { n('tline', 0, 0, 'Sensor', { states: 'Measuring,Idle,Off', changes: '0:Off,5:Idle,15:Measuring,30:Idle', tmax: 50, unit: 'ms' }); n('tline', 0, 80, 'Controller', { states: 'Busy,Waiting', changes: '0:Waiting,18:Busy,34:Waiting', tmax: 50, unit: 'ms' }); e('tmsg', 'Sensor', 'Controller', 'data ready', { t1: 16, t2: 18 }); }),
    overview: () => ex('overview', (n, e) => { n('initial', 0, 0, ''); n('iref', 0, 0, 'Log in'); n('decision', 0, 0, ''); n('interaction', 0, 0, 'Browse', { text: 'User -> Shop: search(text)\nShop --> User: results' }); n('iref', 0, 0, 'Show error'); n('final', 0, 0, ''); }),
    dfd: () => ex('dfd', (n, e) => { n('extent', 0, 0, 'Customer'); n('process', 0, 0, 'Take order', { num: '1.0' }); n('store', 0, 0, 'Orders', { num: 'D1' }); n('process', 0, 0, 'Ship order', { num: '2.0' }); n('extent', 0, 0, 'Courier'); e('dataflow', 'Customer', 'Take order', 'order details'); e('dataflow', 'Take order', 'Orders', 'new order'); e('dataflow', 'Orders', 'Ship order', 'order to ship'); e('dataflow', 'Ship order', 'Courier', 'parcel'); }),
    c4: () => ex('c4', (n, e) => { n('person', 0, 0, 'Customer', { desc: 'Buys things online' }); n('system', 0, 0, 'Online shop', { desc: 'Lets customers order products' }); n('extsystem', 0, 0, 'Payment gateway', { desc: 'Takes card payments' }); n('extsystem', 0, 0, 'Email service', { desc: 'Sends order emails' }); e('c4rel', 'Customer', 'Online shop', 'Orders from', { tech: 'HTTPS' }); e('c4rel', 'Online shop', 'Payment gateway', 'Charges cards with', { tech: 'REST' }); e('c4rel', 'Online shop', 'Email service', 'Sends email with', { tech: 'SMTP' }); }),
    bpmn: () => ex('bpmn', (n, e) => { n('start', 0, 0, 'Order received', { ev: 'message' }); n('task', 0, 0, 'Check stock', { tt: 'service' }); n('xgateway', 0, 0, 'In stock?'); n('task', 0, 0, 'Pack the order', { tt: 'manual' }); n('task', 0, 0, 'Tell the customer', { tt: 'send' }); n('end', 0, 0, 'Done'); }),
  };
  // flows for the examples that need ordered edges
  const FLOW = {
    activity: [['initial', 'Enter the PIN'], ['Enter the PIN', 'decision', ''], ['decision', 'Choose an amount', '[PIN right]'], ['decision', 'Keep the card', '[3 wrong tries]'], ['Choose an amount', 'forkbar'], ['forkbar', 'Give the cash'], ['forkbar', 'Print a receipt'], ['Give the cash', 'final'], ['Keep the card', 'final']],
    state: [['initial', 'Idle'], ['Idle', 'Selecting', 'button pressed'], ['Selecting', 'Paying', 'drink chosen'], ['Paying', 'Paying', 'coin [total < price]'], ['Paying', 'Serving', 'coin [total >= price] / give change'], ['Serving', 'Idle', 'drink taken'], ['Selecting', 'Idle', 'cancel'], ['Idle', 'final', 'switch off']],
    overview: [['initial', 'Log in'], ['Log in', 'decision'], ['decision', 'Browse', '[ok]'], ['decision', 'Show error', '[failed]'], ['Browse', 'final'], ['Show error', 'final']],
    bpmn: [['Order received', 'Check stock'], ['Check stock', 'In stock?'], ['In stock?', 'Pack the order', 'yes'], ['In stock?', 'Tell the customer', 'no'], ['Pack the order', 'Done'], ['Tell the customer', 'Done']],
  };
  function example(type) {
    const d = EXAMPLES[type](); const kind = { activity: 'flow', state: 'transition', overview: 'flow', bpmn: 'seqflow' }[type];
    if (FLOW[type]) { d.edges = []; const find = k => d.nodes.find(n => n.name === k) || d.nodes.find(n => n.kind === k); for (const [a, b, g] of FLOW[type]) { const A = find(a), B0 = find(b); if (A && B0) { const ed = newEdge(kind, A.id, B0.id); if (g) ed.name = g; d.edges.push(ed); } } }
    if (type === 'composite' || type === 'profile' || type === 'booking') return d; layout(d, { all: true }); if (type === 'usecase') return d; return d;
  }

  const api = { STYLES, marker, TYPES, NK, EK, CARD, NOTATION_NAME, DIALECTS, LANGS, newDoc, newDiagram, newNode, newEdge, size, box, render, toSVG, toSQL, fromSQL, toCode, fromCode, validate, layout, example, inside, erModel, mapType, parseMember, SEQ_TOP, SEQ_ROW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SOFT = api;
})(typeof window !== 'undefined' ? window : globalThis);
