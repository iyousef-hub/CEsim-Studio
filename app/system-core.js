/* CEsim System model: one project (a board, its parts and how they join) turned into
   a breadboard, a schematic, a block diagram, a 3D layout, a sketch and a CMOS layout. */
(function (root) {
  'use strict';
  const BB = root.BB || require('./bb-core.js');
  const LIB = BB.LIB, BBX = BB.BBX || { LIST: [], BY: {} };

  /* ---------- catalog ---------- */
  const BOARDS = ['uno', 'nano', 'mega', 'leonardo', 'micro', 'promini', 'nanoevery', 'esp32', 'esp32s3', 'pico', 'picow', 'pico2'].filter(k => LIB[k] && BB.MCU[k]);
  const GATES = {
    'gate:inv': { name: 'NOT gate (inverter)', ins: ['A'], ic: 'ic7404', fn: a => !a[0], short: 'NOT' },
    'gate:nand2': { name: 'NAND gate', ins: ['A', 'B'], ic: 'ic7400', fn: a => !(a[0] && a[1]), short: 'NAND' },
    'gate:nor2': { name: 'NOR gate', ins: ['A', 'B'], ic: 'ic7402', fn: a => !(a[0] || a[1]), short: 'NOR' },
    'gate:and2': { name: 'AND gate', ins: ['A', 'B'], ic: 'ic7408', fn: a => a[0] && a[1], short: 'AND' },
    'gate:or2': { name: 'OR gate', ins: ['A', 'B'], ic: 'ic7432', fn: a => a[0] || a[1], short: 'OR' },
    'gate:xor2': { name: 'XOR gate', ins: ['A', 'B'], ic: 'ic7486', fn: a => a[0] !== a[1], short: 'XOR' }
  };
  const BUILTIN = {
    Sensors: ['ultrasonic', 'pir', 'tempsensor', 'sht31', 'mpu6050', 'lidar', 'mlx90640', 'mic', 'vibration', 'joystick', 'ldr', 'pot', 'button', 'tilt', 'piezo'],
    'Motors and outputs': ['led', 'buzzer', 'servo', 'motor', 'stepper', 'nema17', 'relay', 'l298n', 'solenoid', 'lcd', 'oled'],
    Drone: ['lipo', 'esc', 'bldc', 'fc'],
    Power: ['battery', 'supply']
  };
  const GROUPS = ['Sensors', 'Motors and outputs', 'Communication', 'Drone', 'Power', 'Logic gates (VLSI)'];
  const COMM = new Set(['gps6m', 'gpsm8n', 'hc05', 'nrf24', 'rfid', 'sdcard', 'rtc', 'elrs', 'telem', 'rcrx', 'vtx', 'fpvcam', 'ws2812', 'keypad']);
  function catalog() {
    const out = [];
    for (const [g, ks] of Object.entries(BUILTIN)) for (const k of ks) if (LIB[k]) out.push({ key: k, group: g, name: LIB[k].name });
    for (const e of BBX.LIST) { if (!LIB[e.key]) continue; const g = COMM.has(e.key) ? 'Communication' : e.group; out.push({ key: e.key, group: g, name: e.name, kw: e.kw || '' }); }
    for (const [k, g] of Object.entries(GATES)) out.push({ key: k, group: 'Logic gates (VLSI)', name: g.name + ' (CMOS layout in VLSI)' });
    return out;
  }
  function info(key) { if (GATES[key]) { const g = GATES[key]; return { name: g.name, pins: [...g.ins, 'Y'], gate: g }; } const L = LIB[key]; return L ? { name: L.name, pins: L.pins || [], L } : null; }
  const base = key => { const L = LIB[key]; return L && L.alias ? L.alias : key; };
  const shortName = n => { let s = String(n).replace(/\s*\(.*$/, '').replace(/\s*·.*$/, '').trim(); if (s.length > 30) s = s.slice(0, 30).replace(/\s+\S*$/, ''); return s; };
  const cleanPin = p => String(p).replace(/\s*\(.*\)\s*$/, '').trim();

  /* ---------- what each pin does ---------- */
  const BAT = new Set(['battery', 'supply', 'lipo']);
  const LOADS = new Set(['motor', 'solenoid', 'linact', 'pump12', 'peltier']);
  const DRIVERS = { l298n: [['OUT1', 'OUT2'], ['OUT3', 'OUT4']], drv8833: [['AOUT1', 'AOUT2'], ['BOUT1', 'BOUT2']], tb6612: [['AO1', 'AO2'], ['BO1', 'BO2']] };
  const HI_V = new Set(['servo', 'relay', 'stepper', 'ws2812', 'l298n', 'esc', 'fc', 'pca9685', 'motor', 'solenoid']);
  /* role: what a pin is. emits = the signal leaves the part on this pin */
  function role(key, pinName) {
    const b = base(key), p = cleanPin(pinName), P = p.toUpperCase();
    if (GATES[key]) return P === 'Y' ? 'din' : 'dout';
    if (BAT.has(b)) return p === '+' ? 'src+' : 'src-';
    if (b === 'xt60') return p === '+' ? 'vbat' : 'vbatn';
    if (b === 'pdb') { if (P === 'BAT +') return 'vbat'; if (P === 'BAT −') return 'vbatn'; return /\+$/.test(p) ? 'pdb+' : 'pdb-'; }
    if (b === 'esc') { if (P === 'BAT +') return 'vbat'; if (P === 'BAT −') return 'vbatn'; if (P === 'SIGNAL') return 'pwm'; if (P === 'SIGNAL GND') return 'gnd'; return 'phase'; }
    if (b === 'bldc') return 'phase_in';
    if (LOADS.has(b) || b === 'dronebuzz') return p === '+' ? 'drive+' : 'drive-';
    if (DRIVERS[b]) { if (/^(OUT\d|AOUT\d|BOUT\d|AO\d|BO\d)$/.test(P)) return 'drvout'; if (/^(\+12V|VM)$/.test(P)) return 'vbat'; if (P === '+5V') return 'nc'; if (/^(ENA|ENB|PWMA|PWMB|AIN1|BIN1)$/.test(P)) return 'pwm'; }
    if (b === 'fc') { if (P === 'VBAT') return 'vbat'; if (/^M\d$/.test(P)) return +P.slice(1) <= 4 ? 'escsig' : 'nc'; if (/ IN$/.test(P)) return /AUX/.test(P) ? 'nc' : 'fc_in'; }
    if (b === 'relay') { if (P === 'COM') return 'relay_com'; if (P === 'NO') return 'relay_no'; if (P === 'NC') return 'nc'; }
    if (b === 'rcrx' && /^CH\d$/.test(P)) return +P.slice(2) <= 4 ? 'rc_ch' : 'nc';
    if (b === 'vtx' && P === 'VIDEO') return 'video_in';
    if (b === 'fpvcam' && P === 'VIDEO') return 'video';
    if (b === 'vtx' && P === 'VBAT') return 'vbat';
    if (b === 'nema17' && P === 'VMOT') return 'vbat';
    if (b === 'pca9685' && P === 'V+') return 'vcc';
    if (/^(BUCKCONV|BOOSTCONV|TP4056)$/i.test(b)) { if (/^V?IN\+$/.test(P)) return 'vbat'; if (/^V?IN−$/.test(P)) return 'gnd'; return 'nc'; }
    if (b === 'bms3s' || b === 'ina219' && /^VIN/.test(P)) return 'nc';
    if (b === 'led' || b === 'pled') return /^anode/.test(p) ? 'dout' : 'gnd';
    if (b === 'buzzer' || b === 'piezo') return p === '+' ? (b === 'piezo' ? 'ain' : 'dout') : 'gnd';
    if (b === 'button' || b === 'tilt') return p === '1' ? 'din_pu' : 'gnd';
    if (b === 'pot') return P === 'WIPER' ? 'ain' : P === 'END 1' ? 'vcc' : 'gnd';
    if (b === 'ldr') return p === '1' ? 'vcc' : 'ain';
    if (b === 'motor' && p === '+') return 'pwm';
    if (b === 'servo' && P === 'SIGNAL') return 'pwm';
    if (b === 'keypad') return /^R/.test(P) ? 'dout' : 'din_pu';
    if (b === 'mic' && P === 'OUT') return 'ain';
    if (/^(GND|VSS|AGND|−)$/.test(P)) return 'gnd';
    if (/^(3V3|3\.3V)$/.test(P)) return 'v33';
    if (/^(VCC|VIN|VDD|\+5V|5V|V\+|\+VS|VBUS)$/.test(P)) return 'vcc';
    if (/^(SDA|SCL|SIOD|SIOC)$/.test(P)) return 'i2c';
    if (/^(TX|TXD)$/.test(P)) return 'uart_tx';
    if (/^(RX|RXD)$/.test(P)) return 'uart_rx';
    if (P === 'MISO') return 'spi_in';
    if (/^(SCK|MOSI|CS|CSN|CE|SS)$/.test(P)) return 'spi_out';
    if (/^(AO|VOUT|VRX|VRY|WIPER)$/.test(P)) return 'ain';
    if (P === 'DATA') return 'data';
    if (/^(DO|OUT|ECHO|SW|DT|STATE|IRQ|DRDY|SQW|32K)$/.test(P)) return 'din';
    if (/^(TRIG|IN|IN\d|EN|STEP|DIR|DIN|S|RST|OE|SA|ADDR|STBY|AIN\d|BIN\d)$/.test(P)) return 'dout';
    return 'nc';
  }
  const EMITS = new Set(['din', 'din_pu', 'ain', 'uart_tx', 'spi_in', 'phase', 'drvout', 'relay_no', 'escsig', 'video', 'rc_ch', 'src+', 'pdb+']);
  const TAKES = new Set(['dout', 'pwm', 'uart_rx', 'spi_out', 'phase_in', 'drive+', 'drive-', 'fc_in', 'video_in', 'vcc', 'v33', 'vbat', 'relay_com']);
  const BOTH = new Set(['i2c', 'data']);
  const POWER = new Set(['vcc', 'v33', 'vbat', 'src+', 'pdb+', 'relay_com']);
  const GNDR = new Set(['gnd', 'src-', 'vbatn', 'pdb-', 'drive-']);

  /* ---------- the board ---------- */
  function boardInfo(type) {
    const L = LIB[type], M = BB.MCU[type]; const pins = L.pins; const avr = BB.AVR8 && BB.AVR8.has(type);
    const legOf = new Map(M.gpio); const nameOf = g => pins[legOf.get(g)];
    const i2c = M.i2c || {}; const uart = avr ? [0, 1] : type.startsWith('esp32') ? [1, 3] : [0, 1];
    const adc = ((M.adc && M.adc.pins) || []).filter(g => legOf.has(g) && g !== i2c.sda && g !== i2c.scl);
    const ro = type === 'esp32' ? new Set([34, 35, 36, 39]) : new Set();
    const all = [...legOf.keys()].filter(g => !uart.includes(g) && g !== i2c.sda && g !== i2c.scl && !(M.led === g && avr && false));
    const dig = all.filter(g => !adc.includes(g) && !ro.has(g)).sort((a, b) => a - b);
    const pwm = M.pwm ? dig.filter(g => M.pwm.has(g)) : dig.slice();
    const gnd = M.gnd[0];
    return { type, L, M, pins, avr, legOf, nameOf, i2c, adc, dig, pwm, ro, gnd, v5: M.v5, v33: M.v33 >= 0 ? M.v33 : M.v5, vl: M.vl || 5, adcMax: M.adc && M.adc.bits ? (1 << M.adc.bits) - 1 : 1023, name: L.name };
  }
  function codeName(bi, g) { if (bi.avr) { const i = (bi.M.adc && bi.M.adc.pins || []).indexOf(g); if (i >= 0) return 'A' + i; } return String(g); }

  /* ---------- a project ---------- */
  function newProject(name, board) { return { format: 'CEsimSystem', version: 1, name: name || 'My project', board: board || 'uno', parts: [], map: {}, user: {}, code: '', codeEdited: false }; }
  function addPart(pr, key) { const I = info(key); if (!I) throw new Error('Unknown part ' + key); const n = pr.parts.filter(p => p.key === key).length + 1; const id = 'q' + Math.random().toString(36).slice(2, 7); const label = shortName(I.name) + (n > 1 || pr.parts.some(p => p.key === key) ? ' ' + n : ''); pr.parts.push({ id, key, label }); return id; }
  const pinKey = (id, i) => id + ':' + i;

  /* fill every pin that has no link yet */
  function autoMap(pr, keepUser) {
    const bi = boardInfo(pr.board); const user = pr.user || {}; const map = {}; if (keepUser) for (const k of Object.keys(user)) if (k in pr.map) map[k] = pr.map[k]; if (!keepUser) pr.user = {};
    const filled = new Set(); const usedG = new Set();
    for (const [k, v] of Object.entries(map)) { filled.add(k); if (v && v.startsWith('P:')) filled.add(v.slice(2)); if (v && v.startsWith('B:')) { const leg = +v.slice(2); for (const [g, l] of bi.legOf) if (l === leg) usedG.add(g); } }
    const parts = pr.parts.map(p => ({ ...p, I: info(p.key), b: base(p.key) }));
    const pins = p => p.I.pins.map((n, i) => ({ n: cleanPin(n), i, r: role(p.key, n), k: pinKey(p.id, i) }));
    const set = (k, v) => { if (filled.has(k) || (v.startsWith('P:') && map[v.slice(2)] === '')) return false; map[k] = v; filled.add(k); if (v.startsWith('P:')) filled.add(v.slice(2)); return true; };
    const B = leg => 'B:' + leg;
    const bat = parts.find(p => p.b === 'lipo') || parts.find(p => BAT.has(p.b));
    const pdb = parts.find(p => p.b === 'pdb');
    const take = (list) => { const g = list.find(x => !usedG.has(x)); if (g == null) return null; usedG.add(g); return g; };
    const outAdc = bi.adc.filter(g => !bi.ro.has(g)); const digital = () => take(bi.dig) ?? take(outAdc);
    const pwmPin = () => take(bi.pwm) ?? digital();
    const analog = () => take(bi.adc);
    const inPin = () => take(bi.dig) ?? take([...bi.ro]) ?? take(bi.adc);
    /* part to part first */
    const bldcs = parts.filter(p => p.b === 'bldc'), escs = parts.filter(p => p.b === 'esc');
    escs.forEach((e, j) => { const m = bldcs[j]; if (!m) return; for (const q of pins(e)) if (q.r === 'phase') { const mi = m.I.pins.findIndex(n => cleanPin(n) === q.n); if (mi >= 0) set(q.k, 'P:' + pinKey(m.id, mi)); } });
    const loads = parts.filter(p => LOADS.has(p.b) || p.b === 'dronebuzz');
    let li = 0;
    for (const d of parts.filter(p => DRIVERS[p.b])) for (const [a, c] of DRIVERS[d.b]) { const m = loads[li]; if (!m) break; li++; const ia = d.I.pins.indexOf(a), ic = d.I.pins.indexOf(c); set(pinKey(d.id, ia), 'P:' + pinKey(m.id, 0)); set(pinKey(d.id, ic), 'P:' + pinKey(m.id, 1)); }
    for (const r of parts.filter(p => p.b === 'relay')) { const m = loads[li]; const no = r.I.pins.indexOf('NO'), com = r.I.pins.indexOf('COM'); if (m) { li++; set(pinKey(r.id, no), 'P:' + pinKey(m.id, 0)); set(pinKey(m.id, 1), bat ? 'P:' + pinKey(bat.id, 1) : B(bi.gnd)); } set(pinKey(r.id, com), bat ? 'P:' + pinKey(bat.id, 0) : B(bi.v5)); }
    const fc = parts.find(p => p.b === 'fc');
    if (fc) { let j = 0; for (const q of pins(fc)) if (q.r === 'escsig') { const e = escs[j++]; if (e) set(q.k, 'P:' + pinKey(e.id, e.I.pins.indexOf('Signal'))); } const rx = parts.find(p => p.b === 'rcrx'); if (rx) { let c = 1; for (const q of pins(fc)) if (q.r === 'fc_in') { set(q.k, 'P:' + pinKey(rx.id, rx.I.pins.indexOf('CH' + c))); c++; } } }
    const cam = parts.find(p => p.b === 'fpvcam'), vtx = parts.find(p => p.b === 'vtx');
    if (cam && vtx) set(pinKey(cam.id, cam.I.pins.indexOf('VIDEO')), 'P:' + pinKey(vtx.id, vtx.I.pins.indexOf('VIDEO')));
    if (pdb && bat) { set(pinKey(pdb.id, 0), 'P:' + pinKey(bat.id, 0)); set(pinKey(pdb.id, 1), 'P:' + pinKey(bat.id, 1)); let o = 0; for (const e of escs) { if (o >= 4) break; set(pinKey(e.id, 0), 'P:' + pinKey(pdb.id, 2 + o * 2)); set(pinKey(e.id, 1), 'P:' + pinKey(pdb.id, 3 + o * 2)); o++; } }
    /* then the board */
    for (const p of parts) for (const q of pins(p)) {
      if (filled.has(q.k) && !(q.r === 'src-' && p === bat && !(q.k in map))) continue; let v = null;
      switch (q.r) {
        case 'gnd': case 'drive-': v = B(bi.gnd); break;
        case 'src-': if (p === bat) { map[q.k] = B(bi.gnd); filled.add(q.k); } break;
        case 'vbatn': v = bat ? 'P:' + pinKey(bat.id, 1) : B(bi.gnd); break;
        case 'vbat': v = bat ? 'P:' + pinKey(bat.id, 0) : B(bi.v5); break;
        case 'v33': v = B(bi.v33); break;
        case 'vcc': v = B(bi.vl >= 5 || HI_V.has(p.b) || /^\+?5V$/i.test(q.n) ? bi.v5 : bi.v33); break;
        case 'i2c': { const g = /^(SDA|SIOD)$/i.test(q.n) ? bi.i2c.sda : bi.i2c.scl; if (g != null && bi.legOf.has(g)) v = B(bi.legOf.get(g)); break; }
        case 'ain': { const g = analog(); if (g != null) v = B(bi.legOf.get(g)); break; }
        case 'pwm': case 'drive+': { const g = pwmPin(); if (g != null) v = B(bi.legOf.get(g)); break; }
        case 'din': case 'din_pu': case 'uart_tx': case 'spi_in': { const g = inPin(); if (g != null) v = B(bi.legOf.get(g)); break; }
        case 'dout': case 'uart_rx': case 'spi_out': case 'data': case 'fc_in': { const g = digital(); if (g != null) v = B(bi.legOf.get(g)); break; }
      }
      if (v) set(q.k, v);
    }
    pr.map = map; return pr;
  }
  /* effective links of a pin, both ways */
  function linksOf(pr, k) { const out = []; const v = pr.map[k]; if (v) out.push(v); for (const [a, b] of Object.entries(pr.map)) if (b === 'P:' + k) out.push('P:' + a); return out; }
  function setLink(pr, k, v) { for (const [a, b] of Object.entries(pr.map)) if (b === 'P:' + k) delete pr.map[a]; if (v) pr.map[k] = v; else pr.map[k] = ''; }

  /* ---------- nets ---------- */
  function nets(pr) {
    const bi = boardInfo(pr.board); const par = new Map(); const f = k => { if (!par.has(k)) par.set(k, k); let r = k; while (par.get(r) !== r) r = par.get(r); par.set(k, r); return r; }; const u = (a, b) => par.set(f(a), f(b));
    const norm = v => { if (v.startsWith('B:')) { const leg = +v.slice(2); if (bi.M.gnd.includes(leg)) return 'B:' + bi.gnd; return 'B:' + leg; } return v; };
    for (const [k, v] of Object.entries(pr.map)) { if (!v) continue; u('P:' + k, norm(v)); }
    const groups = new Map(); for (const k of par.keys()) { const r = f(k); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(k); }
    const byPart = id => pr.parts.find(p => p.id === id);
    const list = []; let auto = 0;
    for (const ms of groups.values()) {
      const board = ms.filter(m => m.startsWith('B:')).map(m => +m.slice(2)); const pp = ms.filter(m => m.startsWith('P:')).map(m => { const [id, i] = m.slice(2).split(':'); return { id, i: +i, part: byPart(id) }; }).filter(x => x.part);
      let name; const isG = board.includes(bi.gnd) || pp.some(x => { const r = role(x.part.key, info(x.part.key).pins[x.i]); return r === 'src-' && !board.length && false; });
      if (board.length) { const nm = bi.pins[board[0]]; name = isG ? 'GND' : nm === '3.3V' ? '3V3' : nm; }
      else { const src = pp.find(x => { const r = role(x.part.key, info(x.part.key).pins[x.i]); return r === 'src+' || r === 'src-'; }); if (src) name = role(src.part.key, info(src.part.key).pins[src.i]) === 'src+' ? 'VBAT' : 'VBAT_N'; else { const a = pp[0]; name = (a.part.label + '_' + cleanPin(info(a.part.key).pins[a.i])).replace(/[^A-Za-z0-9_+]+/g, '_').toUpperCase(); } }
      list.push({ name, board, parts: pp, gnd: isG || name === 'VBAT_N' && false });
    }
    /* unique names */
    const seen = {}; for (const n of list) { if (seen[n.name]) n.name += '_' + (++seen[n.name]); else seen[n.name] = 1; }
    return { bi, list };
  }

  /* ---------- sketch ---------- */
  function sketch(pr) {
    const bi = boardInfo(pr.board); const P = pr.parts.map(p => ({ ...p, I: info(p.key), b: base(p.key) }));
    const pinOf = (p, i) => { const v = pr.map[pinKey(p.id, i)]; if (!v || !v.startsWith('B:')) return null; const leg = +v.slice(2); for (const [g, l] of bi.legOf) if (l === leg) return g; return null; };
    const ident = s => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase().replace(/^(\d)/, '_$1');
    const defs = [], setup = [], loop = [], glob = []; let servo = false, wire = false; const names = new Set();
    const uniq = n => { let s = n, k = 2; while (names.has(s)) s = n + '_' + k++; names.add(s); return s; };
    const mid = Math.round(bi.adcMax / 2);
    const inputs = [], outputs = [];
    for (const p of P) {
      const id = ident(p.label);
      p.I.pins.forEach((pn, i) => {
        const r = role(p.key, pn); const g = pinOf(p, i); if (g == null) return; const cp = cleanPin(pn); const c = ident(cp === '+' ? 'POS' : /^\d+$/.test(cp) ? 'PIN' + cp : cp) || 'P' + i; const nm = uniq(id + '_' + c);
        if (r === 'i2c') { wire = true; return; }
        if (['ain', 'din', 'din_pu', 'dout', 'pwm', 'drive+', 'uart_tx', 'uart_rx', 'spi_in', 'spi_out', 'data', 'fc_in'].includes(r)) defs.push(`const int ${nm} = ${codeName(bi, g)};`);
        if (r === 'ain') { inputs.push({ kind: 'a', nm, p }); }
        else if (r === 'din' || r === 'din_pu') { setup.push(`  pinMode(${nm}, ${r === 'din_pu' ? 'INPUT_PULLUP' : 'INPUT'});`); if (!(p.b === 'ultrasonic') && !GATES[p.key]) inputs.push({ kind: r === 'din_pu' ? 'b' : 'd', nm, p }); }
        else if (r === 'dout' && p.b === 'ultrasonic') { setup.push(`  pinMode(${nm}, OUTPUT);`); }
        else if (p.b === 'servo' && r === 'pwm' || p.b === 'esc' && r === 'pwm' || p.b === 'fc' && r === 'fc_in') { servo = true; const sv = uniq(id.toLowerCase().replace(/_+$/, '') + '_out'); glob.push(`Servo ${sv};`); setup.push(`  ${sv}.attach(${nm});`); if (p.b !== 'servo') setup.push(`  ${sv}.writeMicroseconds(1000); // arm at zero throttle`); outputs.push({ kind: p.b === 'servo' ? 'servo' : 'esc', sv, p }); }
        else if (GATES[p.key]) { setup.push(`  pinMode(${nm}, OUTPUT);`); outputs.push({ kind: 'gin', nm, p, i }); }
        else if (r === 'dout' || r === 'pwm' || r === 'drive+' || r === 'uart_rx' || r === 'spi_out' || r === 'data') { setup.push(`  pinMode(${nm}, OUTPUT);`); outputs.push({ kind: r === 'pwm' || r === 'drive+' ? 'pwm' : p.b === 'buzzer' ? 'tone' : 'd', nm, p }); }
      });
      if (p.b === 'ultrasonic') { const t = defs.find(d => d.startsWith('const int ' + id + '_TRIG')), e = defs.find(d => d.startsWith('const int ' + id + '_ECHO')); if (t && e) { const tn = t.split(' ')[2], en = e.split(' ')[2]; loop.push(`  digitalWrite(${tn}, LOW);\n  delayMicroseconds(2);\n  digitalWrite(${tn}, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(${tn}, LOW);\n  long ${id.toLowerCase()}_cm = pulseIn(${en}, HIGH) / 58;\n  Serial.print("${p.label} (cm): ");\n  Serial.println(${id.toLowerCase()}_cm);`); inputs.push({ kind: 'cm', nm: id.toLowerCase() + '_cm', p, ready: true }); } }
    }
    /* read every input once */
    for (const s of inputs) { if (s.ready) continue; const v = s.nm.toLowerCase(); s.v = v; loop.push(`  int ${v} = ${s.kind === 'a' ? 'analogRead' : 'digitalRead'}(${s.nm});\n  Serial.print("${s.p.label} ${s.nm.split('_').pop()}: ");\n  Serial.println(${v});`); }
    for (const s of inputs) if (s.ready) s.v = s.nm;
    /* the first input drives the outputs */
    const src = inputs[0]; let level = 'level';
    if (src) {
      if (src.kind === 'a') loop.push(`  int level = ${src.v};             // 0 to ${bi.adcMax}\n  bool active = level > ${mid};`);
      else if (src.kind === 'cm') loop.push(`  int level = constrain(${src.v}, 0, 200) * ${bi.adcMax} / 200;\n  bool active = ${src.v} < 30;    // closer than 30 cm`);
      else loop.push(`  bool active = ${src.v} == ${src.kind === 'b' ? 'LOW' : 'HIGH'};${src.kind === 'b' ? '   // pressed pulls the pin LOW' : ''}\n  int level = active ? ${bi.adcMax} : 0;`);
    } else loop.push(`  static int level = 0;\n  level = (level + ${Math.max(1, Math.round(bi.adcMax / 20))}) % ${bi.adcMax + 1};   // a slow ramp\n  bool active = level > ${mid};`);
    const gates = P.filter(p => GATES[p.key]);
    for (const o of outputs) {
      if (o.kind === 'servo') loop.push(`  ${o.sv}.write(map(level, 0, ${bi.adcMax}, 0, 180));`);
      else if (o.kind === 'esc') loop.push(`  ${o.sv}.writeMicroseconds(map(level, 0, ${bi.adcMax}, 1000, 2000));`);
      else if (o.kind === 'pwm') loop.push(`  analogWrite(${o.nm}, map(level, 0, ${bi.adcMax}, 0, 255));`);
      else if (o.kind === 'tone') loop.push(`  if (active) tone(${o.nm}, 1000); else noTone(${o.nm});`);
      else if (o.kind === 'd') loop.push(`  digitalWrite(${o.nm}, active ? HIGH : LOW);`);
    }
    if (gates.length) {
      glob.push('int step = 0;');
      loop.push('  // logic gates: try each input pattern and read the output');
      loop.push('  int a = step & 1;\n  int b = (step >> 1) & 1;\n  step = (step + 1) % 4;');
      for (const g of gates) { const id = ident(g.label); const ins = GATES[g.key].ins; const has = n => defs.some(d => d.startsWith('const int ' + id + '_' + n + ' ')); if (has('A')) loop.push(`  digitalWrite(${id}_A, a);`); if (ins.length > 1 && has('B')) loop.push(`  digitalWrite(${id}_B, b);`); if (has('Y')) loop.push(`  delay(5);\n  Serial.print("${g.label}: A=");\n  Serial.print(a);${ins.length > 1 ? `\n  Serial.print(" B=");\n  Serial.print(b);` : ''}\n  Serial.print(" Y=");\n  Serial.println(digitalRead(${id}_Y));`); }
    }
    const comms = P.filter(p => p.I.pins.some(n => ['i2c', 'uart_tx', 'spi_in'].includes(role(p.key, n))));
    const head = [`// ${pr.name}`, `// Board: ${bi.name}. Made by the System model tool, edit it freely.`, ...P.map(p => `//   ${p.label}: ${p.I.name}`)];
    if (comms.length) head.push('// Parts on I2C, serial or SPI are wired; add the library for each one to read it:', ...comms.map(p => '//   ' + p.label));
    const inc = [servo ? '#include <Servo.h>' : '', wire ? '#include <Wire.h>' : ''].filter(Boolean);
    const baud = bi.avr ? 9600 : 115200;
    return [...head, '', ...inc, ...(inc.length ? [''] : []), ...defs, ...(glob.length ? ['', ...glob] : []), '', 'void setup() {', `  Serial.begin(${baud});`, ...(wire ? ['  Wire.begin();'] : []), ...setup, '}', '', 'void loop() {', ...loop, '  delay(200);', '}', ''].join('\n');
  }

  /* ---------- breadboard ---------- */
  const COLORS = ['yellow', 'green', 'blue', 'orange', 'white', 'purple'];
  function toBreadboard(pr) {
    const bi = boardInfo(pr.board); const parts = [], wires = [];
    const bpart = BB.newPart(pr.board, [0, 0]); const bl0 = BB.legsOf(bpart); const minX = Math.min(...bl0.map(l => l[0])), minY = Math.min(...bl0.map(l => l[1])), maxX = Math.max(...bl0.map(l => l[0])), maxY = Math.max(...bl0.map(l => l[1]));
    bpart.pos = [-90 - maxX, 105 - (minY + maxY) / 2]; bpart.id = 'board'; bpart.props.code = pr.code || sketch(pr); parts.push(bpart);
    const BL = BB.legsOf(bpart); const boardLeg = leg => BL[leg];
    const railX = x0 => { const x = Math.min(620, Math.max(40, x0)); return (x - 30) % 60 === 0 ? x + 10 : x; };
    let ci = 0; const W = (a, b, color) => wires.push({ a: a.slice(), b: b.slice(), color: color || COLORS[ci++ % COLORS.length] });
    const colorFor = r => POWER.has(r) ? 'red' : GNDR.has(r) ? 'black' : null;
    /* rails: bottom + and − from the board, joined to the top rails */
    let usedBoard = false; const pwr = bi.vl >= 5 ? bi.v5 : bi.v33;
    const railOn = () => { if (usedBoard) return; usedBoard = true; W(boardLeg(pwr), [40, BB.RAILS.bp], 'red'); W(boardLeg(bi.gnd), [50, BB.RAILS.bn], 'black'); if (bi.vl < 5 && bi.v5 >= 0) W(boardLeg(bi.v5), [620, BB.RAILS.tp], 'red'); else W([620, BB.RAILS.bp], [620, BB.RAILS.tp], 'red'); W([610, BB.RAILS.bn], [610, BB.RAILS.tn], 'black'); };
    const Pm = pr.parts.map(p => ({ ...p, I: info(p.key), b: base(p.key) }));
    const legPos = {}; /* pinKey -> [x,y] point to wire to */
    const OX0 = 40; let ox = OX0, oy = 330, rowH = 0;
    const LOW = { part: 150, sig: 120, rail: 160, res: 130, rp: BB.RAILS.bp, rn: BB.RAILS.bn }, UP = { part: 70, sig: 50, rail: 90, res: 80, rp: BB.RAILS.tp, rn: BB.RAILS.tn };
    const occ = { low: new Set(), up: new Set() };
    const free = (half, x, span) => { if (x < 40 || x + span > 640) return false; for (let c = x; c <= x + span; c += 10) if (occ[half].has(c)) return false; return true; };
    const take2 = (half, x, span) => { for (let c = x - 10; c <= x + span + 10; c += 10) occ[half].add(c); };
    const findSpot = span => { for (const [half, H] of [['low', LOW], ['up', UP]]) for (let x = 40; x + span <= 640; x += 10) if (free(half, x, span)) { take2(half, x, span); return { x, H }; } return null; };
    const chipSpot = () => { for (let x = 40; x + 60 <= 640; x += 10) if (free('low', x, 60) && free('up', x, 60)) { take2('low', x, 60); take2('up', x, 60); return x; } return null; };
    for (const p of [...Pm.filter(q => GATES[q.key]), ...Pm.filter(q => !GATES[q.key])]) {
      if (GATES[p.key]) {
        const g = GATES[p.key]; const x = chipSpot(); if (x == null) continue; const chip = BB.newPart(g.ic, [x, 90]); chip.id = p.id; parts.push(chip); const L = BB.legsOf(chip); railOn();
        W([L[13][0], 50], [railX(L[13][0]), BB.RAILS.tp], 'red'); W([L[6][0], 160], [railX(L[6][0]), BB.RAILS.bn], 'black');
        const gp = BB.gatePins(g.ic.slice(2))[0]; const pinsN = g.ins.length === 1 ? [gp[0], gp[2]] : gp; /* 1-based */
        const far = leg => leg[1] === 120 ? [leg[0], 140] : [leg[0], 60];
        p.I.pins.forEach((n, i) => { legPos[pinKey(p.id, i)] = far(L[pinsN[i] - 1]); });
        continue;
      }
      const L = p.I.L;
      if (L.offboard || L.module) {
        const np = BB.newPart(p.key, [0, 0]); np.id = p.id; const lg0 = BB.legsOf(np); const w = Math.max(...lg0.map(l => l[0])) - Math.min(...lg0.map(l => l[0])) + 80;
        if (ox > OX0 && ox + w > 700) { ox = OX0; oy += rowH + 130; rowH = 0; }
        np.pos = [ox, oy]; ox += w + 40; rowH = Math.max(rowH, Math.max(...lg0.map(l => l[1])) - Math.min(...lg0.map(l => l[1])) + 40);
        parts.push(np); BB.legsOf(np).forEach((l, i) => legPos[pinKey(p.id, i)] = l); continue;
      }
      /* small parts go on the breadboard: the lower half first, then the upper half */
      railOn();
      const flex = !!L.flex; const span = flex ? 40 : (Math.max(...L.legs.map(l => l[0])) * 10);
      const spot = findSpot(span); if (!spot) { const np = BB.newPart(p.key, [ox, oy]); np.id = p.id; if (np.legs) np.legs = [[ox, oy], [ox + 10, oy]]; parts.push(np); (np.legs || BB.legsOf(np)).forEach((l, i) => legPos[pinKey(p.id, i)] = l); ox += span + 60; continue; }
      const { x, H } = spot;
      if (flex) {
        const np = BB.newPart(p.key, [x, H.part]); np.id = p.id; np.legs = [[x, H.part], [x + 10, H.part]]; parts.push(np);
        const r = BB.newPart('resistor', [x + 10, H.res]); r.legs = [[x + 10, H.res], [x + 40, H.res]]; r.id = p.id + 'r'; parts.push(r); W([x + 40, H.rail], [railX(x + 40), H.rn], 'black');
        if (p.b === 'led' || p.b === 'pled') { r.props.ohms = 220; legPos[pinKey(p.id, 0)] = [x, H.sig]; legPos[pinKey(p.id, 1)] = null; }
        else { r.props.ohms = 10000; W([x, H.rail], [railX(x), H.rp], 'red'); legPos[pinKey(p.id, 0)] = null; legPos[pinKey(p.id, 1)] = [x + 10, H.sig]; }
        continue;
      }
      const np = BB.newPart(p.key, [x, H.part]); np.id = p.id; parts.push(np); const lg = BB.legsOf(np);
      lg.forEach((l, i) => { const r = role(p.key, p.I.pins[i]); if (r === 'gnd') { W([l[0], H.rail], [railX(l[0]), H.rn], 'black'); legPos[pinKey(p.id, i)] = null; } else if (r === 'vcc' || r === 'v33') { W([l[0], H.rail], [railX(l[0]), H.rp], 'red'); legPos[pinKey(p.id, i)] = null; } else legPos[pinKey(p.id, i)] = [l[0], H.sig]; });
    }
    /* links */
    for (const [k, v] of Object.entries(pr.map)) {
      if (!v) continue; const a = legPos[k]; if (!a) continue; const [id, i] = k.split(':'); const p = Pm.find(q => q.id === id); const r = role(p.key, p.I.pins[+i]);
      let b = null; if (v.startsWith('B:')) { const leg = +v.slice(2); const offb = p.I.L && (p.I.L.offboard || p.I.L.module);
        if (offb && (leg === pwr || bi.M.gnd.includes(leg))) { railOn(); const rx = railX(a[0]); W(a, [rx, leg === pwr ? BB.RAILS.bp : BB.RAILS.bn], leg === pwr ? 'red' : 'black'); continue; }
        b = boardLeg(leg); } else b = legPos[v.slice(2)]; if (!b) continue; W(a, b, colorFor(r));
    }
    const note = `${pr.name}: made by the System model tool. Parts with a long row of pins sit off the breadboard and are wired to the board directly.${bi.vl < 5 ? ' The lower + rail is 3.3 V; the upper + rail is 5 V for the logic chips.' : ''} Press Run to start the sketch.`;
    return { format: 'cesim-breadboard', version: 1, name: pr.name, parts, wires, note };
  }

  /* ---------- block diagram ---------- */
  const GROUP_OF = key => { if (GATES[key]) return 'logic'; const b = base(key); if (BAT.has(b) || ['pdb', 'xt60', 'buckconv', 'boostconv', 'tp4056', 'bms3s'].includes(b)) return 'power'; if (COMM.has(b)) return 'comm'; for (const [g, ks] of Object.entries(BUILTIN)) if (ks.includes(b)) return g === 'Sensors' ? 'sensor' : g === 'Drone' ? 'drone' : g === 'Power' ? 'power' : 'out'; const e = BBX.BY[key] || BBX.BY[b]; if (e) return e.group === 'Sensors' ? 'sensor' : e.group === 'Drone' ? 'drone' : e.group === 'Power' ? 'power' : 'out'; return 'out'; };
  const FILL = { board: ['#1f3a5f', '#1f3a5f', '#ffffff'], sensor: ['#e3f2fd', '#1565c0', '#0d2a4a'], out: ['#fff3e0', '#e65100', '#4a2500'], comm: ['#f3e5f5', '#6a1b9a', '#3a0f55'], power: ['#ffebee', '#c62828', '#5a1010'], drone: ['#e8f5e9', '#2e7d32', '#173d1a'], logic: ['#ede7f6', '#4527a0', '#24124f'] };
  function toDiagram(pr) {
    const { bi, list } = nets(pr); let uidn = 0; const uid = () => 'd' + (++uidn).toString(36) + Math.random().toString(36).slice(2, 6);
    const DEF_ST = { fill: '#ffffff', stroke: '#1f3a5f', sw: 1.5, dash: '', op: 1, fc: '#1b2230', fs: 13, bold: 0, italic: 0, underline: 0, align: 'center', valign: 'middle', radius: 10, shadow: 0 };
    const DEF_EST = { stroke: '#1f3a5f', sw: 1.5, dash: '', arrowS: 'none', arrowE: 'arrow', route: 'ortho', fc: '#1b2230', fs: 12, rounded: 1 };
    const P = pr.parts.map(p => ({ ...p, I: info(p.key) }));
    /* pairs: node a - node b with directions and labels */
    const pairs = new Map(); const nodeOfPin = x => x.part.id;
    const addPair = (a, b, dir, label, kind) => { const k = a < b ? a + '|' + b : b + '|' + a; if (!pairs.has(k)) pairs.set(k, { a: a < b ? a : b, b: a < b ? b : a, f: false, r: false, labels: new Set(), kind }); const e = pairs.get(k); const fwd = a < b; if (dir === 'ab' || dir === 'both') { if (fwd) e.f = true; else e.r = true; } if (dir === 'ba' || dir === 'both') { if (fwd) e.r = true; else e.f = true; } if (label) e.labels.add(label); if (kind === 'sig') e.kind = 'sig'; else if (kind === 'bus' && e.kind !== 'sig') e.kind = 'bus'; };
    const dirOf = r => BOTH.has(r) ? 'both' : EMITS.has(r) ? 'out' : TAKES.has(r) ? 'in' : 'both';
    for (const n of list) {
      if (n.name === 'GND' || n.name === 'VBAT_N') continue;
      const ends = n.parts.map(x => ({ id: x.part.id, r: role(x.part.key, x.part.I ? x.part.I.pins[x.i] : info(x.part.key).pins[x.i]), pin: cleanPin(info(x.part.key).pins[x.i]) }));
      if (GNDR.has(ends[0] && ends[0].r) && !n.board.length && ends.every(e => GNDR.has(e.r))) continue;
      const power = ends.some(e => POWER.has(e.r)) && (n.board.some(l => l === bi.v5 || l === bi.v33) || ends.some(e => e.r === 'src+' || e.r === 'pdb+' || e.r === 'relay_com'));
      if (power) {
        const src = n.board.length ? 'board' : (ends.find(e => e.r === 'src+') || ends.find(e => e.r === 'pdb+') || ends[0]).id;
        if (src !== 'board') for (const e of ends) if (e.id !== src && !(e.r === 'src+')) addPair(src, e.id, 'ab', n.board.length ? n.name : (e.r === 'relay_com' ? 'COM' : 'VBAT'), 'pwr');
        continue;
      }
      if (n.board.length) { const bl = bi.pins[n.board[0]]; for (const e of ends) { const d = dirOf(e.r); addPair(e.id, 'board', d === 'out' ? 'ab' : d === 'in' ? 'ba' : 'both', e.r === 'i2c' ? 'I2C' : bl, BOTH.has(e.r) ? 'bus' : 'sig'); } }
      else if (ends.length >= 2) { const s = ends.find(e => EMITS.has(e.r)) || ends[0]; for (const e of ends) if (e !== s) { const d = BOTH.has(s.r) || BOTH.has(e.r) ? 'both' : EMITS.has(s.r) ? 'ab' : 'ba'; addPair(s.id, e.id, d, s.pin === e.pin ? s.pin : s.pin + '→' + e.pin, 'sig'); } }
    }
    /* sides */
    const side = {}; const peer = {};
    for (const p of P) {
      const g = GROUP_OF(p.key); const toB = [...pairs.values()].filter(e => (e.a === p.id && e.b === 'board') || (e.b === p.id && e.a === 'board'));
      const sig = toB.filter(e => e.kind !== 'pwr');
      if (g === 'power' && !sig.length) { side[p.id] = 'top'; continue; }
      if (!toB.length) { const os = [...pairs.values()].filter(e => e.a === p.id || e.b === p.id).sort((x, y) => (x.kind === 'pwr') - (y.kind === 'pwr')); if (os.length) { peer[p.id] = os.map(o => o.a === p.id ? o.b : o.a); side[p.id] = 'peer'; continue; } side[p.id] = g === 'power' ? 'top' : 'right'; continue; }
      let toBoard = false, fromBoard = false; for (const e of sig) { const pFirst = e.a === p.id; if (e.f) { if (pFirst) toBoard = true; else fromBoard = true; } if (e.r) { if (pFirst) fromBoard = true; else toBoard = true; } }
      side[p.id] = toBoard && fromBoard ? 'bottom' : toBoard ? 'left' : fromBoard || sig.length === 0 && toB.length ? 'right' : 'right';
    }
    /* a part fed only by another part sits next to it */
    for (const p of P) if (side[p.id] === 'peer') { const ns = peer[p.id]; peer[p.id] = ns.find(q => side[q] && side[q] !== 'peer') || ns[0]; }
    for (const p of P) if (side[p.id] === 'peer') { const seen = new Set([p.id]); let q = peer[p.id]; while (side[q] === 'peer' && !seen.has(q)) { seen.add(q); q = peer[q]; } if (q === 'board' || !side[q] || side[q] === 'peer') side[p.id] = 'right'; }
    const W0 = 190, H0 = 56, GAP = 34;
    const cols = { left: P.filter(p => side[p.id] === 'left'), right: P.filter(p => side[p.id] === 'right'), bottom: P.filter(p => side[p.id] === 'bottom'), top: P.filter(p => side[p.id] === 'top') };
    const nSide = Math.max(cols.left.length, cols.right.length, 1);
    const bh = Math.max(140, nSide * (H0 + GAP) - GAP), bw = 240;
    const bx = 520, by = 260; const pos = {}; pos.board = { x: bx, y: by, w: bw, h: bh };
    const stack = (arr, x) => { const tot = arr.length * (H0 + GAP) - GAP; let y = by + bh / 2 - tot / 2; for (const p of arr) { pos[p.id] = { x, y, w: W0, h: H0 }; y += H0 + GAP; } };
    stack(cols.left, bx - 200 - W0); stack(cols.right, bx + bw + 200);
    const row = (arr, y) => { const tot = arr.length * (W0 + 40) - 40; let x = bx + bw / 2 - tot / 2; for (const p of arr) { pos[p.id] = { x, y, w: W0, h: H0 }; x += W0 + 40; } };
    row(cols.bottom, by + bh + 150); row(cols.top, by - 170);
    /* peers chain outward from their parent */
    let guard = 0; let pend = P.filter(p => side[p.id] === 'peer');
    while (pend.length && guard++ < 10) { const next = []; const used = {}; for (const p of pend) { const q = peer[p.id]; const qp = pos[q]; if (!qp) { next.push(p); continue; } const sd = side[q] === 'peer' ? side[q + '_s'] || 'right' : side[q]; const dir = sd === 'left' ? -1 : 1; const k = q; used[k] = (used[k] || 0); const vertical = sd === 'top' || sd === 'bottom'; if (vertical) pos[p.id] = { x: qp.x + used[k] * (W0 + 30), y: qp.y + (sd === 'top' ? -(H0 + 90) : H0 + 90), w: W0, h: H0 }; else pos[p.id] = { x: qp.x + dir * (W0 + 150), y: qp.y + used[k] * (H0 + 24), w: W0, h: H0 }; side[p.id + '_s'] = sd; used[k]++; } pend = next; }
    if (pend.length) { let y = Math.max(by + bh, ...Object.values(pos).map(b => b.y + b.h)) + 40; for (const p of pend) { pos[p.id] = { x: bx + bw + 200, y, w: W0, h: H0 }; y += H0 + GAP; } }
    /* push apart anything that overlaps */
    const boxes = Object.entries(pos); for (let it = 0; it < 30; it++) { let moved = false; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i][1], Bx = boxes[j][1]; if (A.x < Bx.x + Bx.w + 12 && Bx.x < A.x + A.w + 12 && A.y < Bx.y + Bx.h + 12 && Bx.y < A.y + A.h + 12) { Bx.y = A.y + A.h + 16; moved = true; } } if (!moved) break; }
    const items = []; const ids = {};
    const minX = Math.min(...Object.values(pos).map(b => b.x)), minY = Math.min(...Object.values(pos).map(b => b.y)), maxX = Math.max(...Object.values(pos).map(b => b.x + b.w));
    const dx = 60 - minX, dy = 120 - minY;
    items.push({ id: uid(), k: 'shape', t: 'heading', x: 60, y: 30, w: Math.max(420, maxX - minX), h: 44, rot: 0, text: pr.name + ' - System diagram', st: Object.assign({}, DEF_ST, { fs: 24, bold: 1, align: 'left' }) });
    const shape = (key, b, text, grp) => { const [fill, stroke, fc] = FILL[grp]; const id = uid(); ids[key] = id; items.push({ id, k: 'shape', t: 'round', x: Math.round(b.x + dx), y: Math.round(b.y + dy), w: b.w, h: b.h, rot: 0, text, st: Object.assign({}, DEF_ST, { fill, stroke, fc, fs: key === 'board' ? 15 : 12, bold: key === 'board' ? 1 : 0, sw: key === 'board' ? 2 : 1.5 }) }); };
    shape('board', pos.board, bi.name.replace(/ board$/i, ''), 'board');
    for (const p of P) shape(p.id, pos[p.id], p.label, GROUP_OF(p.key));
    for (const e of pairs.values()) {
      if (!ids[e.a] || !ids[e.b]) continue; const st = Object.assign({}, DEF_EST);
      if (e.kind === 'pwr') { st.stroke = '#c62828'; st.dash = '6 4'; } else if (e.kind === 'bus') st.stroke = '#6a1b9a';
      st.arrowE = e.f ? 'arrow' : 'none'; st.arrowS = e.r ? 'arrow' : 'none'; if (!e.f && !e.r) st.arrowE = 'arrow';
      const lab = [...e.labels]; items.push({ id: uid(), k: 'edge', s: { id: ids[e.a] }, e: { id: ids[e.b] }, text: lab.length > 4 ? lab.slice(0, 4).join(', ') + '…' : lab.join(', '), st });
    }
    const maxY = Math.max(...items.filter(i => i.k === 'shape').map(i => i.y + i.h));
    items.push({ id: uid(), k: 'shape', t: 'text', x: 60, y: maxY + 40, w: 760, h: 40, rot: 0, text: 'Arrows show which way the signal goes; two heads mean the part sends and receives. Dashed red lines carry battery power; the other parts take power from the board. All grounds are joined.', st: Object.assign({}, DEF_ST, { fs: 12, align: 'left', fc: '#55606e' }) });
    return { format: 'CEsimDiagram', version: 1, name: pr.name, pages: [{ id: 'pg1', name: pr.name, items, bg: '' }], cur: 0 };
  }

  /* ---------- schematic ---------- */
  function toCircuit(pr) {
    const { bi, list } = nets(pr); const P = pr.parts.map(p => ({ ...p, I: info(p.key) }));
    const netOf = {}; for (const n of list) { for (const x of n.parts) netOf[pinKey(x.part.id, x.i)] = n.name; for (const l of n.board) netOf['B:' + l] = n.name; }
    const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) || 'part';
    const uniqPins = arr => { const seen = {}; return arr.map(n => { let s = cleanPin(n).replace(/\s+/g, '_') || 'P'; if (seen[s]) { seen[s]++; s += '_' + seen[s]; } else seen[s] = 1; return s; }); };
    const blocks = []; const comps = []; let k = 0; const uid = () => 's' + (++k).toString(36) + Math.random().toString(36).slice(2, 6);
    /* board: only the pins in use */
    const bLegs = [...new Set(list.flatMap(n => n.board))].sort((a, b) => a - b);
    const bpins = uniqPins(bLegs.map(l => bi.pins[l]));
    const geom = np => { const nl = Math.ceil(np / 2), nr = np - nl, rows = Math.max(nl, nr, 1); return { h: Math.max(40, rows * 20 + 20), nl }; };
    const hwOf = name => Math.max(40, Math.ceil((Math.min(String(name).length, 28) * 3.6 + 8) / 10) * 10);
    const place = (id, name, pins, x, y, label, nets) => {
      blocks.push({ id, name, prefix: 'U', pins }); comps.push({ id: uid(), t: 'sys_' + id, x, y, r: 0, f: 0, label, p: {} });
      const g = geom(pins.length), hw = hwOf(name);
      pins.forEach((pn, i) => { const left = i < g.nl; const py = y - g.h / 2 + 20 + (left ? i : i - g.nl) * 20; const px = x + (left ? -hw - 10 : hw + 10); const nm = nets[i]; if (!nm) return; const ex = px + (left ? -20 : 20); wires.push({ pts: [[px, py], [ex, py]] }); if (nm === 'GND') comps.push({ id: uid(), t: 'netlabel', x: ex, y: py, r: left ? 2 : 0, f: 0, label: '', p: { name: 'GND' } }); else comps.push({ id: uid(), t: 'netlabel', x: ex, y: py, r: left ? 2 : 0, f: 0, label: '', p: { name: nm } }); });
      return g.h;
    };
    const wires = [];
    const bname = bi.name.replace(/ board$/i, '');
    const bh = place('sys_' + slug(bi.type) + '_' + bLegs.length, bname, bpins, 520, 320, 'U1', bLegs.map(l => netOf['B:' + l]));
    let yl = 140, yr = 140, n = 2;
    for (const p of P) {
      const pins = uniqPins(p.I.pins); const g = geom(pins.length); const left = GROUP_OF(p.key) === 'sensor' || GROUP_OF(p.key) === 'power';
      const nets = p.I.pins.map((_, i) => netOf[pinKey(p.id, i)] || null);
      const x = left ? 160 : 900; const y = (left ? yl : yr) + g.h / 2;
      place('sys_' + slug(p.key), p.I.name.length > 34 ? shortName(p.I.name) : p.I.name, pins, x, y, 'U' + (n++) + ' ' + p.label, nets);
      if (left) yl += g.h + 60; else yr += g.h + 60;
    }
    comps.push({ id: uid(), t: 'text', x: 60, y: 60, r: 0, f: 0, label: '', p: { text: pr.name + ' - schematic', size: '24', bold: 'yes', color: '#1b2230', frame: 'no' } });
    comps.push({ id: uid(), t: 'text', x: 60, y: Math.max(yl, yr, 320 + bh / 2) + 40, r: 0, f: 0, label: '', p: { text: 'Pins with the same net label are joined. Blocks come from the System model tool and are for wiring only.', size: '12', bold: 'no', color: '#55606e', frame: 'no' } });
    const uniqB = []; const seenB = new Set(); for (const b of blocks) if (!seenB.has(b.id)) { seenB.add(b.id); uniqB.push(b); }
    /* two blocks of one kind must have the same pins: they do, since the pins come from the part */
    return { format: 'CEsim', version: 2, name: pr.name, sysblocks: uniqB, meta: { author: '', rev: '1', date: '', desc: 'Made by the System model tool' }, cnt: {}, comps, wires };
  }

  /* ---------- 3D ---------- */
  const M3D = { uno: ['Arduino Uno R3', 68.6, 53.3], nano: ['Arduino Nano', 43.2, 17.8], mega: ['Arduino Mega 2560', 101.6, 53.3], esp32: ['ESP32 DevKit V1', 51.5, 28.3], esp32s3: ['ESP32-S3 DevKitC-1', 62.7, 25.4], ultrasonic: ['HC-SR04 ultrasonic', 45, 20], servo: ['SG90 micro servo', 23, 12.2], lcd: ['LCD 16x2 module', 80, 36], mlx90640: ['MLX90640 thermal camera', 25.7, 17.7], sht31: ['SHT31-D temperature and humidity', 18, 13], lidar: ['VL53L0X LiDAR (GY-530)', 25, 10.7], camera: ['OV2640 camera module', 24, 24], mpu6050: ['MPU6050 gyro (GY-521)', 21, 16], piezo: ['Piezo disc 27 mm', 27, 27], vibration: ['SW-420 vibration sensor', 32, 14], mic: ['MAX4466 microphone', 24, 14], lipo: ['LiPo 4S 1500 mAh', 75, 35], esc: ['ESC 35 A', 45, 24], fc: ['Flight controller F405 30 × 30', 36, 36], bldc: ['Brushless motor 2207', 28, 28], l298n: ['L298N motor driver', 43, 43], motor: ['DC motor 130', 20, 25], nema17: ['NEMA 17 stepper motor', 42.3, 42.3], solenoid: ['Push solenoid 12 V', 20, 30], supply: ['Bench power supply', 120, 60] };
  const BOX = { pir: [32, 24, 18, '#f5f5f5'], tempsensor: [5, 5, 5, '#222'], joystick: [34, 26, 30, '#1565c0'], ldr: [5, 5, 3, '#c62828'], pot: [10, 10, 15, '#1565c0'], button: [6, 6, 5, '#222'], tilt: [5, 5, 12, '#222'], led: [5, 5, 8, '#e53935'], buzzer: [12, 12, 9, '#222'], stepper: [28, 28, 19, '#90a4ae'], relay: [50, 26, 19, '#1565c0'], oled: [27, 27, 4, '#0d47a1'], battery: [26, 17, 48, '#333'] };
  function to3D(pr) {
    const bi = boardInfo(pr.board); const objs = []; let n = 0; const id = () => 'o' + (++n) + Math.random().toString(36).slice(2, 5);
    const items = [];
    const mb = M3D[pr.board]; items.push(mb ? { model: mb[0], w: mb[1], d: mb[2], name: pr.board === 'uno' ? 'Arduino Uno R3' : mb[0] } : { box: [55, 25, 5, '#0b7fa3'], name: bi.name, w: 55, d: 25 });
    for (const p of pr.parts) {
      const b = base(p.key); const e = BBX.BY[p.key]; const m3 = e && e.m3d && e.m3d.name ? e.m3d : null;
      if (GATES[p.key]) items.push({ box: [19.3, 6.4, 3.3, '#222'], name: p.label + ' (' + GATES[p.key].ic.replace('ic', '74LS') + ')', w: 19.3, d: 6.4 });
      else if (m3) items.push({ model: m3.name, w: m3.w || 30, d: m3.d || 20, name: p.label });
      else if (M3D[b]) items.push({ model: M3D[b][0], w: M3D[b][1], d: M3D[b][2], name: p.label });
      else { const bx = BOX[b] || [30, 20, 8, '#455a64']; items.push({ box: bx, name: p.label, w: bx[0], d: bx[1] }); }
    }
    /* shelf packing on a 280 mm wide area */
    const maxW = 280; let x = 0, y = 0, rowD = 0; const placed = [];
    for (const it of items) { const w = Math.min(it.w, 260), d = Math.min(it.d, 260); if (x > 0 && x + w > maxW) { x = 0; y += rowD + 12; rowD = 0; } placed.push({ it, cx: x + w / 2, cy: y + d / 2 }); x += w + 12; rowD = Math.max(rowD, d); }
    const totW = Math.max(...placed.map(p => p.cx + Math.min(p.it.w, 260) / 2)), totD = y + rowD;
    for (const { it, cx, cy } of placed) {
      const pos = [+(cx - totW / 2).toFixed(2), +(totD / 2 - cy).toFixed(2), 0];
      if (it.model) objs.push({ id: id(), kind: 'board', name: it.name, color: '#0b7fa3', hole: false, pos, rot: [0, 0, 0], size: null, natural: null, params: { model: it.model }, exportable: false });
      else objs.push({ id: id(), kind: 'box', name: it.name, color: it.box[3], hole: false, pos: [pos[0], pos[1], +(it.box[2] / 2).toFixed(2)], rot: [0, 0, 0], size: it.box.slice(0, 3), params: {}, exportable: true });
    }
    return { format: 'CEsim3D', version: 1, name: pr.name, objs, measures: [], pack: 260 };
  }

  /* ---------- CMOS netlist for the gates ---------- */
  function toSpice(pr) {
    const gs = pr.parts.filter(p => GATES[p.key]); if (!gs.length) return null;
    const L = [`* ${pr.name}: logic gates from the System model tool`, '.model NMOS NMOS', '.model PMOS PMOS']; let m = 0; const ports = [];
    const id = s => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '').toUpperCase();
    const M = (d, g, s, b, t) => L.push(`M${++m} ${d} ${g} ${s} ${b} ${t} W=2u L=0.12u`);
    const inv = (a, y) => { M(y, a, 'VDD', 'VDD', 'PMOS'); M(y, a, 'GND', 'GND', 'NMOS'); };
    const nand = (a, b, y, t) => { M(y, a, 'VDD', 'VDD', 'PMOS'); M(y, b, 'VDD', 'VDD', 'PMOS'); M(y, a, t, 'GND', 'NMOS'); M(t, b, 'GND', 'GND', 'NMOS'); };
    const nor = (a, b, y, t) => { M(t, a, 'VDD', 'VDD', 'PMOS'); M(y, b, t, 'VDD', 'PMOS'); M(y, a, 'GND', 'GND', 'NMOS'); M(y, b, 'GND', 'GND', 'NMOS'); };
    for (const g of gs) {
      const p = id(g.label); const A = p + '_A', Bn = p + '_B', Y = p + '_Y'; const n = s => p + '_N' + s;
      switch (g.key) {
        case 'gate:inv': inv(A, Y); ports.push(A, Y); continue;
        case 'gate:nand2': nand(A, Bn, Y, n(1)); break;
        case 'gate:nor2': nor(A, Bn, Y, n(1)); break;
        case 'gate:and2': nand(A, Bn, n(2), n(1)); inv(n(2), Y); break;
        case 'gate:or2': nor(A, Bn, n(2), n(1)); inv(n(2), Y); break;
        case 'gate:xor2': nand(A, Bn, n(1), n(2)); nand(A, n(1), n(3), n(4)); nand(Bn, n(1), n(5), n(6)); nand(n(3), n(5), Y, n(7)); break;
      }
      ports.push(A, Bn, Y);
    }
    L.splice(1, 0, `.subckt ${id(pr.name) || 'SYSTEM'} ${ports.join(' ')} VDD GND`); L.push('.ends', '.end');
    return L.join('\n') + '\n';
  }

  const api = { BOARDS, GATES, GROUPS, catalog, info, base, role, boardInfo, newProject, addPart, autoMap, linksOf, setLink, nets, sketch, toBreadboard, toDiagram, toCircuit, to3D, toSpice, cleanPin, shortName, pinKey, GROUP_OF, EMITS, TAKES, BOTH, POWER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SYS = api;
})(typeof window !== 'undefined' ? window : globalThis);
