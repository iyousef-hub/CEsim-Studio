/* CEsim 8086: a DOS prompt with its own disk.
   Files live on a virtual drive C: kept in this computer's local storage. Programs written in the editor can be saved, assembled
   with ASM, and run by name; their output and keyboard input use this screen, and they return to the prompt when they end.
   BY. YOUSEF A.ALGHAMDI */
(function (root) {
'use strict';
const KEY = 'cesim.dos.disk', HKEY = 'cesim.dos.hist';
const A = () => root.ASM86;
let disk = null, cwd = [], screen = '', line = '', curPos = 0, hist = [], hpos = -1, echoOn = true, prog = null, copyCon = null, el = null, hooks = {}, batch = null;

/* ---------------- disk ---------------- */
function newDisk() {
  const d = { t: 'd', k: {} };
  const ex = root.ASM_EXAMPLES || {};
  const names = { 'Hello world (COM)': 'HELLO.ASM', 'Hello world (data and code segments)': 'HELLOEXE.ASM', 'Sum of an array': 'SUM.ASM', 'Factorial with recursion': 'FACT.ASM', 'Read your name': 'NAME.ASM', 'Bubble sort': 'BSORT.ASM', 'Reverse a string': 'REVERSE.ASM', 'Upper case typing': 'UPPER.ASM' };
  const ex1 = { t: 'd', k: {} };
  for (const [k, v] of Object.entries(names)) if (ex[k]) ex1.k[v] = { t: 'f', s: ex[k], m: Date.now() };
  d.k.EXAMPLES = ex1;
  d.k['README.TXT'] = { t: 'f', s: 'CEsim DOS\r\n\r\nType HELP for the commands.\r\nThe examples are in C:\\EXAMPLES. Try:\r\n  CD EXAMPLES\r\n  HELLO\r\n\r\nSAVE NAME.ASM saves the program in the editor here, ASM NAME.ASM\r\nassembles it to NAME.COM (or NAME.EXE), and typing NAME runs it.\r\nEDIT NAME.ASM opens a file in the editor.\r\n', m: Date.now() };
  d.k['AUTOEXEC.BAT'] = { t: 'f', s: '@ECHO OFF\r\nECHO Welcome to CEsim DOS. Type HELP for the commands.\r\n', m: Date.now() };
  return d;
}
function loadDisk() { try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d && d.t === 'd') return d; } } catch (e) { } return newDisk(); }
function saveDisk() { try { localStorage.setItem(KEY, JSON.stringify(disk)); } catch (e) { say('Disk full: the file could not be saved.'); } }
const up = s => String(s || '').toUpperCase();
function valid83(n) { return /^[A-Z0-9_$~!#%&'()@^{}\-]{1,8}(\.[A-Z0-9_$~!#%&'()@^{}\-]{0,3})?$/.test(n); }
function pathStr(p) { return 'C:\\' + p.join('\\'); }
function dirAt(p) { let d = disk; for (const n of p) { d = d.k[n]; if (!d || d.t !== 'd') return null; } return d; }
/* resolve "A\B", "..\X", "\X", "C:\X" into [dirPath, lastName] */
function resolve(arg) {
  let s = up(arg).replace(/\//g, '\\');
  if (/^[A-Z]:/.test(s)) { if (s[0] !== 'C') return { err: 'Invalid drive specification' }; s = s.slice(2); }
  let p = s.startsWith('\\') ? [] : cwd.slice();
  const parts = s.split('\\').filter((x, i, a) => x !== '' || i === a.length - 1);
  const last = parts.length ? parts.pop() : '';
  for (const q of parts) { if (q === '.' || q === '') continue; if (q === '..') { p.pop(); continue; } p.push(q); }
  if (last === '..') { p.pop(); return { p, n: '' }; }
  if (last === '.') return { p, n: '' };
  return { p, n: last };
}
function getNode(arg) { const r = resolve(arg); if (r.err) return r; const d = dirAt(r.p); if (!d) return { err: 'Path not found' }; if (!r.n) return { node: d, dir: d, p: r.p, n: '' }; return { node: d.k[r.n] || null, dir: d, p: r.p, n: r.n }; }
function matchNames(d, pat) { if (!pat || pat === '*.*' || pat === '*') return Object.keys(d.k); let p = up(pat); if (!p.includes('.')) p += '.*'; const r = new RegExp('^' + p.replace(/[+^$()|[\]{}\\]/g, '\\$&').replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'); return Object.keys(d.k).filter(n => r.test(n.includes('.') ? n : n + '.')); }
function fileText(f) { if (f.s != null) return f.s; if (f.b) { try { return atob(f.b); } catch (e) { return ''; } } return ''; }
function fileSize(f) { if (f.t === 'd') return 0; if (f.b) return Math.floor(f.b.length * 3 / 4) - (f.b.endsWith('==') ? 2 : f.b.endsWith('=') ? 1 : 0); return (f.s || '').length; }

/* ---------------- screen ---------------- */
function out(s) { screen += String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n'); if (screen.length > 80000) { const i = screen.indexOf('\n', screen.length - 60000); screen = screen.slice(i + 1); } }
function say(s) { out(s + '\n'); }
function prompt() { return pathStr(cwd) + '>'; }
function render() {
  if (!el) return;
  let tail;
  if (prog) { const c = prog.cpu; const pend = c.state === 'waiting' && c.waitKind === 'line' ? c.inQ.filter(k => k !== 13).reduce((a, k) => k === 8 ? a.slice(0, -1) : a + String.fromCharCode(k), '') : ''; tail = c.text.slice(prog.t0) + pend; }
  else if (copyCon) tail = line;
  else tail = (batch ? '' : prompt()) + line;
  const full = screen + tail;
  const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  let body;
  if (!prog && !batch) { const before = full.slice(0, full.length - (line.length - curPos)); const cur = line[curPos] || ' '; const after = line.slice(curPos + 1); body = esc(before) + '<span class="dcur">' + esc(cur) + '</span>' + esc(after); }
  else body = esc(full) + (prog && prog.cpu.state !== 'done' ? '<span class="dcur"> </span>' : '');
  el.innerHTML = body; el.scrollTop = el.scrollHeight;
}

/* ---------------- commands ---------------- */
const HELP = [
  ['CD', 'Shows or changes the current folder (CD .., CD \\)'], ['CLS', 'Clears the screen'], ['COPY', 'Copies files (COPY A.ASM B.ASM, COPY CON NOTE.TXT)'],
  ['DATE', 'Shows the date'], ['DEL', 'Deletes files (DEL *.COM)'], ['DIR', 'Lists the files in a folder (DIR /W for a wide list)'], ['ECHO', 'Shows a message, or turns command echo ON or OFF'],
  ['EDIT', 'Opens a file in the editor (EDIT HELLO.ASM)'], ['HELP', 'Shows this list'], ['MD', 'Makes a folder'], ['MEM', 'Shows the memory of the 8086'], ['RD', 'Removes an empty folder'],
  ['REN', 'Renames a file (REN OLD.ASM NEW.ASM)'], ['SAVE', 'Saves the program in the editor as a file here (SAVE HELLO.ASM)'], ['ASM', 'Assembles a file to .COM or .EXE (ASM HELLO.ASM)'],
  ['TIME', 'Shows the time'], ['TREE', 'Shows the folders and files as a tree'], ['TYPE', 'Shows a text file'], ['VER', 'Shows the version'], ['VOL', 'Shows the disk label'],
  ['FORMAT C:', 'Clears the disk and puts the examples back'], ['EXIT', 'Goes back to the Console tab'],
  ['name', 'Runs NAME.COM, NAME.EXE, NAME.BAT or NAME.ASM (type its name, with or without the extension)']];
function dir(args) {
  const wide = args.some(a => up(a) === '/W'); const arg = args.find(a => !a.startsWith('/')) || '';
  const g = arg ? getNode(arg) : { node: dirAt(cwd), dir: dirAt(cwd), p: cwd, n: '' };
  if (g.err) return say(g.err);
  let d = g.node, pat = '';
  if (!d || d.t !== 'd') { d = g.dir; pat = g.n; if (!pat) return say('File not found'); }
  const names = matchNames(d, pat).sort((a, b) => (d.k[b].t === 'd') - (d.k[a].t === 'd') || a.localeCompare(b));
  say(''); say(' Volume in drive C is CESIM'); say(' Directory of ' + pathStr(g.node && g.node.t === 'd' ? (g.n ? g.p.concat(g.n) : g.p) : g.p)); say('');
  if (!names.length) { say('File not found'); return; }
  let files = 0, dirs = 0, bytes = 0;
  if (wide) { let row = ''; for (const n of names) { const f = d.k[n]; const s = f.t === 'd' ? '[' + n + ']' : n; row += s.padEnd(16); if (row.length >= 80) { say(row.trimEnd()); row = ''; } f.t === 'd' ? dirs++ : (files++, bytes += fileSize(f)); } if (row) say(row.trimEnd()); }
  else for (const n of names) {
    const f = d.k[n]; const [b, e] = n.split('.'); const dt = new Date(f.m || Date.now());
    const ds = `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}-${String(dt.getFullYear()).slice(2)}  ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    if (f.t === 'd') { dirs++; say(`${(b || '').padEnd(8)} ${(e || '').padEnd(3)} <DIR>          ${ds}`); }
    else { files++; const sz = fileSize(f); bytes += sz; say(`${(b || '').padEnd(8)} ${(e || '').padEnd(3)} ${String(sz.toLocaleString('en-US')).padStart(14)} ${ds}`); }
  }
  say(`${String(files).padStart(9)} file(s) ${bytes.toLocaleString('en-US').padStart(14)} bytes`);
  say(`${String(dirs).padStart(9)} dir(s)  ${(1048576 - JSON.stringify(disk).length).toLocaleString('en-US').padStart(14)} bytes free`);
}
function tree(d, pre, files) { const ks = Object.keys(d.k).sort(); const ds = ks.filter(k => d.k[k].t === 'd'); if (files) for (const k of ks.filter(k => d.k[k].t !== 'd')) say(pre + (ds.length ? '│   ' : '    ') + k); ds.forEach((k, i) => { const last = i === ds.length - 1; say(pre + (last ? '└───' : '├───') + k); tree(d.k[k], pre + (last ? '    ' : '│   '), files); }); }
function copy(a, b) {
  if (!a) return say('Required parameter missing');
  if (up(a) === 'CON') { if (!b) return say('Required parameter missing'); const g = getNode(b); if (g.err) return say(g.err); if (!g.n || !valid83(g.n)) return say('Invalid file name'); copyCon = { g, text: '' }; return; }
  const s = getNode(a); if (s.err) return say(s.err);
  const names = s.node && s.node.t === 'f' ? [s.n] : matchNames(s.dir, s.n).filter(n => s.dir.k[n].t === 'f');
  if (!names.length) return say('File not found - ' + up(a));
  let target = b ? getNode(b) : { node: dirAt(cwd), dir: dirAt(cwd), p: cwd, n: '' }; if (target.err) return say(target.err);
  let n = 0;
  for (const nm of names) {
    let dd, dn;
    if (target.node && target.node.t === 'd') { dd = target.node; dn = nm; } else { dd = target.dir; dn = names.length > 1 ? nm : target.n; }
    if (!dd || !dn || !valid83(dn)) { say('Invalid file name'); continue; }
    if (dd === s.dir && dn === nm) { say('File cannot be copied onto itself'); continue; }
    dd.k[dn] = JSON.parse(JSON.stringify(s.dir.k[nm])); dd.k[dn].m = Date.now(); n++;
  }
  saveDisk(); say(`${String(n).padStart(9)} file(s) copied`);
}
function assembleFile(arg, quiet) {
  let g = getNode(arg); if (g.err) { say(g.err); return null; }
  if (!g.node && !/\./.test(g.n)) { g = getNode(arg + '.ASM'); }
  if (!g.node || g.node.t !== 'f') { say('File not found - ' + up(arg)); return null; }
  const src = fileText(g.node); const r = A().assemble(src);
  if (!r.ok) { say(`${g.n}: ${r.errors.length} error${r.errors.length > 1 ? 's' : ''}`); for (const e of r.errors.slice(0, 12)) say(`  line ${e.line}: ${e.msg}`); return null; }
  const base = g.n.split('.')[0]; const ext = r.exe ? 'EXE' : 'COM';
  let bytes = [];
  if (!r.exe) { for (const rec of r.listing) if (rec.sec === 'code' && rec.bytes.length) for (let i = 0; i < rec.bytes.length; i++) bytes[rec.addr - 0x100 + i] = rec.bytes[i]; for (let i = 0; i < bytes.length; i++) bytes[i] = bytes[i] || 0; }
  else { bytes = [0x4D, 0x5A]; for (const rec of r.listing) for (const b of rec.bytes) bytes.push(b); }
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b & 255);
  g.dir.k[base + '.' + ext] = { t: 'f', b: btoa(bin), src, m: Date.now() }; saveDisk();
  if (!quiet) say(`${g.n} assembled: ${base}.${ext}, ${bytes.length} bytes` + (r.warnings.length ? `, ${r.warnings.length} warning${r.warnings.length > 1 ? 's' : ''}` : ''));
  return { src, name: base + '.' + ext };
}
function findProgram(cmd) {
  const c = up(cmd); const tries = /\./.test(c) ? [c] : [c + '.COM', c + '.EXE', c + '.BAT', c + '.ASM'];
  for (const t of tries) { const g = getNode(t); if (g.node && g.node.t === 'f') return g; }
  return null;
}
function runProgram(g, tail) {
  const ext = g.n.split('.')[1] || '';
  if (ext === 'BAT') { const lines = fileText(g.node).split(/\r?\n/); batch = { lines, i: 0, echo: true }; return stepBatch(); }
  let src = g.node.src; if (ext === 'ASM') src = fileText(g.node);
  if (!src) { say(`${g.n} was not made in CEsim, so it cannot run here. Save its source here and assemble it with ASM.`); return; }
  const r = A().assemble(src); if (!r.ok) { say(`${g.n}: the program has errors. ASM ${g.n.split('.')[0]}.ASM lists them.`); return; }
  const cpu = new (A().CPU)(r); cpu.inPorts = {};
  /* command tail in the PSP at 80h */
  const psp = (r.seg.psp != null ? r.seg.psp : r.seg.code) << 4; const t = (tail ? ' ' + tail : '').slice(0, 126);
  cpu.mem[psp + 0x80] = t.length; for (let i = 0; i < t.length; i++) cpu.mem[psp + 0x81 + i] = t.charCodeAt(i) & 255; cpu.mem[psp + 0x81 + t.length] = 13;
  prog = { cpu, t0: 0, name: g.n, steps: 0 }; render(); requestAnimationFrame(tick);
}
function tick() {
  if (!prog) return; const c = prog.cpu; let r = 'ok'; const t0 = performance.now();
  for (let i = 0; i < 200000; i++) { if (c.state === 'waiting' && !c.inQ.length) { r = 'wait'; break; } r = c.step(); prog.steps++; if (r !== 'ok') break; if ((i & 1023) === 0 && performance.now() - t0 > 12) break; }
  if (r === 'wait' || r === 'ok') { if (prog.steps > 50e6) { finish('stopped after 50 million instructions (Ctrl+C stops a program earlier)'); return; } render(); if (r === 'ok') requestAnimationFrame(tick); return; }
  if (r === 'bp') { requestAnimationFrame(tick); return; }
  finish(r === 'error' ? 'Program stopped: ' + c.msg : '');
}
function finish(msg) { const c = prog.cpu; out(c.text.slice(prog.t0)); if (!/\n$/.test(screen)) out('\n'); if (msg) say(msg); prog = null; if (batch) { stepBatch(); return; } render(); }
function stepBatch() { while (batch && !prog) { if (batch.i >= batch.lines.length) { batch = null; break; } let l = batch.lines[batch.i++]; if (!l.trim()) continue; let silent = l.startsWith('@'); if (silent) l = l.slice(1); if (echoOn && !silent) say(prompt() + l); exec(l, true); } render(); }
function exec(cmdline, fromBatch) {
  const s = cmdline.trim(); if (!s) return;
  const m = s.match(/^([^\s\\/.]+(?:\.[^\s\\/]*)?|[A-Za-z]:|\.\.|\\)(.*)$/) || [s, s, ''];
  let cmd = up(m[1]), rest = m[2].trim();
  if (/^CD\.\.$/.test(up(s)) || /^CD\\/.test(up(s))) { cmd = 'CD'; rest = s.slice(2); }
  const args = rest ? rest.split(/\s+/) : [];
  switch (cmd) {
    case 'HELP': say('For more on a command, type it and see what it says.'); for (const [c, t] of HELP) say(c.padEnd(10) + t); return;
    case 'CLS': screen = ''; return;
    case 'VER': say(''); say('CEsim DOS version 1.0 (8086, MS-DOS style commands)'); say(''); return;
    case 'VOL': say(' Volume in drive C is CESIM'); say(' Volume Serial Number is 1CE5-2026'); return;
    case 'DATE': { const d = new Date(); say('Current date is ' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '-' + d.getFullYear()); return; }
    case 'TIME': { const d = new Date(); say('Current time is ' + d.toTimeString().slice(0, 8) + '.' + String(Math.floor(d.getMilliseconds() / 10)).padStart(2, '0')); return; }
    case 'ECHO': if (!rest) { say('ECHO is ' + (echoOn ? 'on' : 'off')); return; } if (up(rest) === 'ON') { echoOn = true; return; } if (up(rest) === 'OFF') { echoOn = false; return; } say(rest); return;
    case 'ECHO.': say(''); return;
    case 'C:': return;
    case 'A:': case 'B:': case 'D:': say('Invalid drive specification'); return;
    case 'CD': case 'CHDIR': {
      if (!rest) { say(pathStr(cwd)); return; }
      const g = getNode(rest); if (g.err) { say(g.err); return; }
      const target = g.n ? (g.node && g.node.t === 'd' ? g.p.concat(g.n) : null) : g.p;
      if (!target || !dirAt(target)) { say('Invalid directory'); return; } cwd = target; return; }
    case 'MD': case 'MKDIR': { if (!rest) { say('Required parameter missing'); return; } const g = getNode(rest); if (g.err) { say(g.err); return; } if (!g.n || !valid83(g.n)) { say('Invalid directory name'); return; } if (g.node) { say('A subdirectory or file ' + g.n + ' already exists'); return; } g.dir.k[g.n] = { t: 'd', k: {}, m: Date.now() }; saveDisk(); return; }
    case 'RD': case 'RMDIR': { const g = getNode(rest); if (g.err) { say(g.err); return; } if (!g.node || g.node.t !== 'd' || !g.n) { say('Invalid path, not directory,'); say('or directory not empty'); return; } if (Object.keys(g.node.k).length) { say('Invalid path, not directory,'); say('or directory not empty'); return; } if (g.p.concat(g.n).join('\\') === cwd.slice(0, g.p.length + 1).join('\\')) { say('Attempt to remove current directory'); return; } delete g.dir.k[g.n]; saveDisk(); return; }
    case 'TYPE': { if (!rest) { say('Required parameter missing'); return; } const g = getNode(rest); if (g.err) { say(g.err); return; } if (!g.node || g.node.t !== 'f') { say('File not found - ' + up(rest)); return; } const t = g.node.s != null ? g.node.s : (g.node.src ? '' : fileText(g.node)); if (g.node.s == null) { say(`${g.n} is a program (${fileSize(g.node)} bytes).`); return; } out(t.replace(/\x1A[\s\S]*$/, '')); if (!/\n$/.test(screen)) out('\n'); return; }
    case 'DEL': case 'ERASE': { if (!rest) { say('Required parameter missing'); return; } const g = getNode(args[0]); if (g.err) { say(g.err); return; } const names = g.node && g.node.t === 'f' ? [g.n] : g.node && g.node.t === 'd' ? Object.keys(g.node.k).filter(n => g.node.k[n].t === 'f') : matchNames(g.dir, g.n).filter(n => g.dir.k[n].t === 'f'); if (!names.length) { say('File not found'); return; } const dd = g.node && g.node.t === 'd' ? g.node : g.dir; for (const n of names) delete dd.k[n]; saveDisk(); return; }
    case 'REN': case 'RENAME': { if (args.length < 2) { say('Required parameter missing'); return; } const g = getNode(args[0]); if (g.err) { say(g.err); return; } if (!g.node || !g.n) { say('File not found'); return; } const nn = up(args[1]); if (!valid83(nn)) { say('Invalid file name'); return; } if (g.dir.k[nn]) { say('Duplicate file name or file not found'); return; } g.dir.k[nn] = g.node; delete g.dir.k[g.n]; saveDisk(); return; }
    case 'COPY': copy(args[0], args[1]); return;
    case 'TREE': say('Folder PATH listing'); say(pathStr(cwd)); tree(dirAt(cwd), '', args.some(a => up(a) === '/F')); return;
    case 'DIR': dir(args); return;
    case 'MEM': say(''); say('Memory Type        Total'); say('----------------  -------'); say('Conventional         640K'); say('Total memory        1024K'); say(''); say('The 8086 in CEsim has 1 MB of memory (00000h-FFFFFh).'); return;
    case 'FORMAT': if (up(rest).startsWith('C:')) { disk = newDisk(); cwd = []; saveDisk(); say('Format complete. The examples are back in C:\\EXAMPLES.'); } else say('Required parameter missing'); return;
    case 'EDIT': { if (!rest) { say('Required parameter missing'); return; } let g = getNode(rest); if (g.err) { say(g.err); return; } if (!g.n || !valid83(g.n)) { say('Invalid file name'); return; } const text = g.node ? (g.node.s != null ? g.node.s : g.node.src || '') : ''; if (g.node && g.node.s == null && !g.node.src) { say('This file is a program and cannot be edited.'); return; } hooks.edit && hooks.edit(g.n, text.replace(/\r\n/g, '\n'), pathStr(g.p.concat(g.n))); say(g.node ? `${g.n} is open in the editor. SAVE ${g.n} puts your changes back here.` : `New file ${g.n} is open in the editor. SAVE ${g.n} keeps it here.`); return; }
    case 'SAVE': { let nm = rest || (hooks.name ? hooks.name() : 'PROGRAM'); nm = up(nm); if (!/\./.test(nm)) nm = nm.replace(/[^A-Z0-9_]/g, '').slice(0, 8) + '.ASM'; const g = getNode(nm); if (g.err) { say(g.err); return; } if (!valid83(g.n)) { say('Invalid file name (use up to 8 letters, a dot and up to 3)'); return; } const text = (hooks.source ? hooks.source() : '').replace(/\r?\n/g, '\r\n'); g.dir.k[g.n] = { t: 'f', s: text, m: Date.now() }; saveDisk(); say(`Saved ${g.n} (${text.length} bytes)`); return; }
    case 'ASM': case 'MASM': case 'TASM': case 'NASM': { if (!rest) { say('Required parameter missing (ASM HELLO.ASM)'); return; } assembleFile(args[0]); return; }
    case 'EXIT': hooks.exit && hooks.exit(); return;
  }
  const g = findProgram(cmd);
  if (g) { runProgram(g, rest); return; }
  say('Bad command or file name');
}

/* ---------------- keyboard ---------------- */
function key(e) {
  if (e.metaKey) return;
  if (prog) {
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'Pause')) { e.preventDefault(); out(prog.cpu.text.slice(prog.t0)); say('^C'); prog = null; batch = null; render(); return; }
    if (e.ctrlKey || e.altKey) return;
    let k = null; if (e.key === 'Enter') k = 13; else if (e.key === 'Backspace') k = 8; else if (e.key === 'Escape') k = 27; else if (e.key === 'Tab') k = 9; else if (e.key.length === 1) k = e.key.charCodeAt(0);
    if (k == null) return; e.preventDefault(); const c = prog.cpu; c.key(k); if (c.state === 'waiting' && (c.waitKind === 'key' || k === 13)) requestAnimationFrame(tick); render(); return;
  }
  if (batch) return;
  if (copyCon) {
    if (e.key === 'F6' || (e.ctrlKey && (e.key === 'z' || e.key === 'Z'))) { e.preventDefault(); if (line) { copyCon.text += line + '\r\n'; out(line + '\n'); } out('^Z\n'); const { g, text } = copyCon; g.dir.k[g.n] = { t: 'f', s: text, m: Date.now() }; saveDisk(); say('        1 file(s) copied'); copyCon = null; line = ''; curPos = 0; render(); return; }
    if (e.key === 'Enter') { e.preventDefault(); copyCon.text += line + '\r\n'; out(line + '\n'); line = ''; curPos = 0; render(); return; }
  }
  if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); say(prompt() + line + '^C'); line = ''; curPos = 0; copyCon = null; render(); return; }
  if (e.ctrlKey || e.altKey) return;
  switch (e.key) {
    case 'Enter': { e.preventDefault(); const l = line; say(prompt() + l); line = ''; curPos = 0; if (l.trim()) { hist.push(l); if (hist.length > 50) hist.shift(); try { localStorage.setItem(HKEY, JSON.stringify(hist)); } catch (x) { } } hpos = -1; exec(l); render(); return; }
    case 'Backspace': e.preventDefault(); if (curPos > 0) { line = line.slice(0, curPos - 1) + line.slice(curPos); curPos--; } break;
    case 'Delete': e.preventDefault(); line = line.slice(0, curPos) + line.slice(curPos + 1); break;
    case 'ArrowLeft': e.preventDefault(); curPos = Math.max(0, curPos - 1); break;
    case 'ArrowRight': e.preventDefault(); curPos = Math.min(line.length, curPos + 1); break;
    case 'Home': e.preventDefault(); curPos = 0; break; case 'End': e.preventDefault(); curPos = line.length; break;
    case 'Escape': e.preventDefault(); line = ''; curPos = 0; break;
    case 'ArrowUp': if (copyCon) return; e.preventDefault(); if (hist.length) { hpos = hpos < 0 ? hist.length - 1 : Math.max(0, hpos - 1); line = hist[hpos]; curPos = line.length; } break;
    case 'ArrowDown': if (copyCon) return; e.preventDefault(); if (hpos >= 0) { hpos++; if (hpos >= hist.length) { hpos = -1; line = ''; } else line = hist[hpos]; curPos = line.length; } break;
    case 'F3': e.preventDefault(); if (hist.length) { line = hist[hist.length - 1]; curPos = line.length; } break;
    case 'Tab': { e.preventDefault(); const m = line.slice(0, curPos).match(/(\S*)$/); const part = up(m[1]); const r = resolve(part || ''); const d = dirAt(r.p); if (!d) break; const c = Object.keys(d.k).filter(n => n.startsWith(r.n)).sort(); if (c.length) { const add = c[0].slice(r.n.length) + (d.k[c[0]].t === 'd' ? '\\' : ''); line = line.slice(0, curPos) + add + line.slice(curPos); curPos += add.length; } break; }
    default: if (e.key.length === 1) { e.preventDefault(); if (line.length < 127) { line = line.slice(0, curPos) + e.key + line.slice(curPos); curPos++; } } else return;
  }
  render();
}

function init(host, h) {
  el = host; hooks = h || {}; disk = loadDisk(); try { hist = JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { hist = []; }
  el.addEventListener('keydown', key);
  el.addEventListener('paste', e => { const t = (e.clipboardData || window.clipboardData).getData('text'); if (!t) return; e.preventDefault(); if (prog) { for (const ch of t.replace(/\r?\n/g, '\r')) prog.cpu.key(ch.charCodeAt(0)); requestAnimationFrame(tick); render(); return; } const ls = t.split(/\r?\n/); line = line.slice(0, curPos) + ls[0] + line.slice(curPos); curPos += ls[0].length; render(); });
  say('CEsim DOS version 1.0'); say('');
  const ae = disk.k['AUTOEXEC.BAT']; if (ae && ae.t === 'f') runProgram({ node: ae, n: 'AUTOEXEC.BAT' }, ''); else render();
}
root.CEDOS = { init, exec: (l) => { say(prompt() + l); exec(l); render(); }, screen: () => screen, running: () => !!prog, cwd: () => pathStr(cwd), disk: () => disk, reset: () => { disk = newDisk(); cwd = []; saveDisk(); } };
})(typeof window !== 'undefined' ? window : globalThis);
