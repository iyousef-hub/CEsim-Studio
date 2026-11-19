const { app, BrowserWindow, Menu, dialog, ipcMain, shell, nativeTheme, protocol } = require('electron');
/* cesim://app/... serves the app's own files (the DOS machine loads its WebAssembly through it) */
protocol.registerSchemesAsPrivileged([{ scheme: 'cesim', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const path = require('path'); const fs = require('fs');
nativeTheme.themeSource = 'light';
let studio = null; const pendingPaths = [];
const TOOL_FILE = { breadboard: 'bb.html', pcb: 'pcb.html', vlsi: 'vlsi.html', arch: 'arch.html', hdl: 'hdl.html', asm: 'asm.html', arduino: 'ino.html', logic: 'logic.html', bool: 'bool.html', imgcircuit: 'circuit.html', codecircuit: 'circuit.html', circuit: 'circuit.html', diagram: 'diagram.html', '3d': '3d.html' };
const TOOL_TITLE = { breadboard: 'CEsim Breadboard', pcb: 'CEsim PCB', vlsi: 'CEsim VLSI', arch: 'CEsim Architecture', hdl: 'CEsim Verilog', asm: 'CEsim 8086', arduino: 'CEsim Arduino', logic: 'CEsim Logic', bool: 'CEsim Boolean tools', imgcircuit: 'CEsim Circuit', codecircuit: 'CEsim Circuit', circuit: 'CEsim Circuit', diagram: 'CEsim Diagram', '3d': 'CEsim 3D' };
const EXT_TOOL = { cebb: 'breadboard', cepcb: 'pcb', cevlsi: 'vlsi', msk: 'vlsi', s: 'arch', v: 'hdl', vcd: 'hdl', asm: 'asm', ino: 'arduino', cedig: 'logic', circ: 'logic', cesim: 'circuit', cir: 'circuit', net: 'circuit', sp: 'circuit', cediag: 'diagram', drawio: 'diagram', dio: 'diagram', xml: 'diagram', mmd: 'diagram', mermaid: 'diagram', svg: 'diagram', png: 'diagram', jpg: 'diagram', jpeg: 'diagram', ce3d: '3d', stl: '3d', obj: '3d', '3mf': '3d' };
const BINARY = new Set(['stl', '3mf', 'png', 'jpg', 'jpeg']);
const recentFile = () => path.join(app.getPath('userData'), 'recent.json');
function readRecent() { try { return JSON.parse(fs.readFileSync(recentFile(), 'utf8')) } catch (e) { return [] } }
function addRecent(p, tool) { let r = readRecent().filter(x => x.path !== p); r.unshift({ path: p, tool, t: Date.now() }); r = r.slice(0, 30); try { fs.mkdirSync(path.dirname(recentFile()), { recursive: true }); fs.writeFileSync(recentFile(), JSON.stringify(r)) } catch (e) { } try { app.addRecentDocument(p) } catch (e) { } }
const winOpts = (w, h) => ({ width: w, height: h, ...(process.platform !== 'darwin' ? { icon: path.join(__dirname, 'icon.png') } : {}), minWidth: 900, minHeight: 600, backgroundColor: '#f3f5f8', show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
function wire(win) { win.once('ready-to-show', () => win.show()); win.webContents.setWindowOpenHandler(({ url }) => { if (/^(https?|mailto):/.test(url)) shell.openExternal(url); return { action: 'deny' }; }); }
function createStudio() {
  if (studio && !studio.isDestroyed()) { studio.show(); studio.focus(); return studio; }
  studio = new BrowserWindow(Object.assign(winOpts(1180, 780), { title: 'CEsim Studio' }));
  wire(studio); studio.loadFile(path.join(__dirname, 'studio.html'));
  studio.on('closed', () => { studio = null; });
  return studio;
}
function openTool(tool, filePath) {
  const f = TOOL_FILE[tool]; if (!f) return;
  const win = new BrowserWindow(Object.assign(winOpts(1440, 900), { title: TOOL_TITLE[tool] }));
  wire(win);
  win.loadFile(path.join(__dirname, f), { query: { nosplash: '1', ...(filePath ? { blank: '1' } : {}), ...(tool === 'imgcircuit' ? { fromimage: '1' } : {}), ...(tool === 'codecircuit' ? { fromcode: '1' } : {}) } });
  if (filePath) win.webContents.once('did-finish-load', () => sendFile(win, filePath));
  return win;
}
function sendFile(win, p) {
  const ext = path.extname(p).slice(1).toLowerCase(); const name = path.basename(p);
  try {
    if (BINARY.has(ext)) { const b64 = fs.readFileSync(p).toString('base64'); win.webContents.executeJavaScript(`window.cesimOpenBinary(${JSON.stringify(name)}, ${JSON.stringify(b64)})`); }
    else { const text = fs.readFileSync(p, 'utf8'); win.webContents.executeJavaScript(`window.cesimOpenText(${JSON.stringify(name)}, ${JSON.stringify(text)}, ${JSON.stringify(p)})`); }
  } catch (e) { dialog.showErrorBox('CEsim Studio', 'Could not open ' + name + '\n' + e.message); }
}
function openPath(p) {
  const ext = path.extname(p).slice(1).toLowerCase();
  if (/^ms\d+$/.test(ext)) { dialog.showMessageBox({ type: 'info', title: 'CEsim Studio', message: 'This design format is not supported yet.', detail: 'Export the circuit as a SPICE netlist (.cir) from the program that made it, then open the .cir file here.' }); return; }
  let tool = EXT_TOOL[ext];
  if (ext === 'asm') { try { const t = fs.readFileSync(p, 'utf8').slice(0, 20000); if (/\$(t[0-9]|s[0-7]|a[0-3]|v[01]|zero|ra|sp)\b|\bsyscall\b|\becall\b|^\s*\.text\b/m.test(t)) tool = 'arch'; } catch (e) { } }
  if (!tool) { dialog.showMessageBox({ type: 'info', title: 'CEsim Studio', message: 'CEsim cannot open .' + ext + ' files yet.' }); return; }
  addRecent(p, tool); openTool(tool, p);
}
async function openDialog(parent) {
  const r = await dialog.showOpenDialog(parent || studio, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'CEsim and supported files', extensions: Object.keys(EXT_TOOL) }, { name: 'All files', extensions: ['*'] }] });
  if (!r.canceled) r.filePaths.forEach(openPath);
}
ipcMain.handle('cesim-open-tool', (e, { tool }) => { openTool(tool); });
ipcMain.handle('cesim-open-dialog', (e) => openDialog(BrowserWindow.fromWebContents(e.sender)));
ipcMain.handle('cesim-open-path', (e, { p }) => { if (fs.existsSync(p)) openPath(p); else dialog.showMessageBox({ type: 'warning', message: 'The file was moved or deleted.', detail: p }); });
ipcMain.handle('cesim-recent', () => readRecent().filter(r => fs.existsSync(r.path)));
const toolOf = (wc) => { const u = wc.getURL(); const t = Object.keys(TOOL_FILE).find(k => !/circuit$/.test(k) && u.includes('/' + TOOL_FILE[k])); return t || 'circuit'; };
ipcMain.handle('cesim-save', async (e, { name, text }) => { const w = BrowserWindow.fromWebContents(e.sender); const r = await dialog.showSaveDialog(w, { defaultPath: name }); if (!r.canceled && r.filePath) { fs.writeFileSync(r.filePath, text, 'utf8'); if (EXT_TOOL[path.extname(r.filePath).slice(1).toLowerCase()]) addRecent(r.filePath, toolOf(e.sender)); return r.filePath; } return null; });
ipcMain.handle('cesim-write', async (e, { path: p, text }) => { try { fs.writeFileSync(p, text, 'utf8'); addRecent(p, toolOf(e.sender)); return p; } catch (err) { return null; } });
ipcMain.handle('cesim-save-bin', async (e, { name, b64 }) => { const w = BrowserWindow.fromWebContents(e.sender); const r = await dialog.showSaveDialog(w, { defaultPath: name }); if (!r.canceled && r.filePath) { fs.writeFileSync(r.filePath, Buffer.from(b64, 'base64')); return r.filePath; } return null; });
/* ---- local AI (Ollama) ---- */
const OLLAMA_JOBS = new Map();
ipcMain.handle('cesim-ollama', async (e, req) => {
  const host = (req.host || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  if (req.op === 'cancel') { const c = OLLAMA_JOBS.get(req.job); if (c) c.abort(); return { ok: true }; }
  const ctl = new AbortController(); if (req.job) OLLAMA_JOBS.set(req.job, ctl);
  const tm = setTimeout(() => ctl.abort(), req.op === 'pull' ? 6 * 3600e3 : (req.timeout || 900e3));
  try {
    if (req.op === 'tags') { const r = await fetch(host + '/api/tags', { signal: ctl.signal }); return { ok: r.ok, data: await r.json() }; }
    if (req.op === 'version') { const r = await fetch(host + '/api/version', { signal: ctl.signal }); return { ok: r.ok, data: await r.json() }; }
    if (req.op === 'pull') {
      const r = await fetch(host + '/api/pull', { method: 'POST', body: JSON.stringify({ model: req.model, stream: true }), signal: ctl.signal, headers: { 'Content-Type': 'application/json' } });
      if (!r.ok) return { ok: false, error: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0, 300) };
      const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '', last = null;
      for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { last = JSON.parse(line); if (last.error) return { ok: false, error: last.error }; e.sender.send('cesim-ollama-progress', { job: req.job, ...last }); } catch (x) { } } }
      return { ok: true, data: last };
    }
    if (req.op === 'chat') {
      const body = { model: req.model, stream: true, messages: [{ role: 'user', content: req.prompt, images: req.images || [] }], options: Object.assign({ temperature: 0 }, req.options || {}) };
      if (req.format) body.format = req.format;
      const r = await fetch(host + '/api/chat', { method: 'POST', body: JSON.stringify(body), signal: ctl.signal, headers: { 'Content-Type': 'application/json' } });
      if (!r.ok) return { ok: false, error: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0, 400) };
      const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '', out = '', n = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { const j = JSON.parse(line); if (j.error) return { ok: false, error: j.error }; if (j.message && j.message.content) { out += j.message.content; n++; if (n % 8 === 0) e.sender.send('cesim-ollama-progress', { job: req.job, tokens: n }); } } catch (x) { } } }
      return { ok: true, text: out, tokens: n };
    }
    return { ok: false, error: 'unknown op' };
  } catch (err) { return { ok: false, error: err.name === 'AbortError' ? 'cancelled' : (err.cause && err.cause.code === 'ECONNREFUSED' ? 'not-running' : String(err.message || err)) }; }
  finally { clearTimeout(tm); if (req.job) OLLAMA_JOBS.delete(req.job); }
});
ipcMain.handle('cesim-capture', async (e, { name }) => { const w = BrowserWindow.fromWebContents(e.sender); const img = await w.webContents.capturePage(); if (process.env.CESIM_SELFTEST) { const fp = path.join(process.env.CESIM_SELFTEST, name || 'cap.png'); fs.writeFileSync(fp, img.toPNG()); return fp; } const r = await dialog.showSaveDialog(w, { defaultPath: name || 'CEsim_window.png' }); if (!r.canceled && r.filePath) { fs.writeFileSync(r.filePath, img.toPNG()); return r.filePath; } return null; });
ipcMain.handle('cesim-pdf', async (e, { name, svg }) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  const m = svg.match(/width="(\d+)" height="(\d+)"/); const W = m ? +m[1] : 800, H = m ? +m[2] : 600;
  const hidden = new BrowserWindow({ show: false, width: W, height: H, webPreferences: { offscreen: true } });
  await hidden.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<html><body style="margin:0">${svg}</body></html>`));
  const pdf = await hidden.webContents.printToPDF({ printBackground: true, pageSize: { width: Math.max(1, W / 96), height: Math.max(1, H / 96) }, margins: { marginType: 'none' } });
  hidden.destroy();
  const r = await dialog.showSaveDialog(w, { defaultPath: name }); if (!r.canceled && r.filePath) { fs.writeFileSync(r.filePath, pdf); return r.filePath; } return null;
});
ipcMain.handle('cesim-pdf-html', async (e, { name, html }) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  const tmp = path.join(app.getPath('temp'), 'cesim-report-' + Date.now() + '.html'); fs.writeFileSync(tmp, html);
  const hidden = new BrowserWindow({ show: false, width: 900, height: 1200, webPreferences: { offscreen: true } });
  try { await hidden.loadFile(tmp); const pdf = await hidden.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { marginType: 'default' } });
    if (process.env.CESIM_SELFTEST) { const fp = path.join(process.env.CESIM_SELFTEST, name); fs.writeFileSync(fp, pdf); return fp; }
    const r = await dialog.showSaveDialog(w, { defaultPath: name }); if (!r.canceled && r.filePath) { fs.writeFileSync(r.filePath, pdf); return r.filePath; } return null;
  } finally { hidden.destroy(); try { fs.unlinkSync(tmp); } catch (_) {} }
});
app.on('open-file', (e, p) => { e.preventDefault(); if (app.isReady()) openPath(p); else pendingPaths.push(p); });
/* Windows / Linux: files arrive as command-line arguments; keep a single instance */
const OPENABLE = /\.(cebb|cepcb|cevlsi|msk|s|v|vcd|asm|ino|cesim|cir|net|sp|cedig|circ|cediag|drawio|dio|mmd|mermaid|ce3d|stl|obj|3mf|ms\d+|msm)$/i;
const argFiles = argv => argv.slice(1).filter(a => a && !a.startsWith('-') && OPENABLE.test(a) && (() => { try { return fs.statSync(a).isFile(); } catch (e) { return false; } })());
if (process.platform !== 'darwin' && !process.env.CESIM_SELFTEST) {
  if (!app.requestSingleInstanceLock()) app.quit();
  else app.on('second-instance', (e, argv) => { const f = argFiles(argv); if (f.length) f.forEach(openPath); else createStudio(); });
  argFiles(process.argv).forEach(p => pendingPaths.push(p));
}
if (process.platform === 'win32') app.setAppUserModelId('com.yousef.cesim');
const isMac = process.platform === 'darwin';
const template = [
  ...(isMac ? [{ label: 'CEsim Studio', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] }] : []),
  { label: 'File', submenu: [{ label: 'CEsim Studio', accelerator: 'CmdOrCtrl+Shift+0', click: () => createStudio() }, { label: 'New Circuit window', click: () => openTool('circuit') }, { label: 'New Diagram window', click: () => openTool('diagram') }, { label: 'New 3D window', click: () => openTool('3d') }, { type: 'separator' }, { label: 'Open in new window…', click: () => openDialog(BrowserWindow.getFocusedWindow()) }, { type: 'separator' }, { role: 'close' }] },
  { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
  { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'toggleDevTools' }] },
  { role: 'windowMenu' }
];
if (!isMac) template.push({ label: 'Help', submenu: [{ label: 'About CEsim Studio', click: () => dialog.showMessageBox({ type: 'info', title: 'CEsim Studio', message: 'CEsim Studio', detail: 'Version 1.30.0\nBY. YOUSEF A.ALGHAMDI' }) }] });
app.setAboutPanelOptions({ applicationName: 'CEsim Studio', applicationVersion: '1.30.0', credits: 'BY. YOUSEF A.ALGHAMDI' });
app.whenReady().then(() => { protocol.handle('cesim', req => { const u = new URL(req.url); const rel = decodeURIComponent(u.pathname).replace(/^\/+/, ''); const fp = path.normalize(path.join(__dirname, rel)); if (!fp.startsWith(__dirname + path.sep) || !fs.existsSync(fp)) return new Response('not found', { status: 404 }); const type = fp.endsWith('.wasm') ? 'application/wasm' : fp.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'; return new Response(fs.readFileSync(fp), { headers: { 'content-type': type, 'access-control-allow-origin': '*' } }); }); });
app.whenReady().then(() => { Menu.setApplicationMenu(Menu.buildFromTemplate(template)); createStudio(); pendingPaths.splice(0).forEach(openPath); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createStudio(); }); });
app.on('window-all-closed', () => { if (!isMac) app.quit(); });
/* self-test hook (only runs when CESIM_SELFTEST is set) */
if (process.env.CESIM_SELFTEST) app.whenReady().then(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)); const out = process.env.CESIM_SELFTEST;
  const log = []; const errs = [];
  app.on('web-contents-created', (e, wc) => wc.on('console-message', (ev, level, msg) => { if (level >= 3) errs.push(msg) }));
  await sleep(2600); const cap = async (w, n) => { const img = await w.webContents.capturePage(); fs.writeFileSync(path.join(out, n + '.png'), img.toPNG()); };
  await cap(studio, 'studio');
  for (const f of (process.env.CESIM_FILES || '').split(',').filter(Boolean)) openPath(f);
  await sleep(3500);
  const wins = BrowserWindow.getAllWindows(); let i = 0;
  for (const w of wins) { if (w === studio) continue; const title = await w.webContents.executeJavaScript('document.title'); log.push(title); await cap(w, 'win' + (i++)); }
  // native write + pdf from a diagram window
  const dw = wins.find(w => w.webContents.getURL().includes('diagram.html'));
  if (dw) { const tgt = path.join(out, 'saved.cediag'); const r1 = await dw.webContents.executeJavaScript(`window.cesimNative.write(${JSON.stringify(tgt)}, '{"format":"CEsimDiagram"}')`); log.push('write=' + (r1 && fs.existsSync(tgt)));
    const svg = await dw.webContents.executeJavaScript('CED.exportSvgString()'); const m = svg.match(/width="(\d+)" height="(\d+)"/); const hidden = new BrowserWindow({ show: false, width: +m[1], height: +m[2], webPreferences: { offscreen: true } }); await hidden.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<html><body style="margin:0">' + svg + '</body></html>')); const pdf = await hidden.webContents.printToPDF({ printBackground: true, pageSize: { width: +m[1] / 96, height: +m[2] / 96 }, margins: { marginType: 'none' } }); hidden.destroy(); fs.writeFileSync(path.join(out, 'diagram.pdf'), pdf); log.push('pdf=' + pdf.length); }
  for (const w of BrowserWindow.getAllWindows()) { if (w === studio) continue; const u = w.webContents.getURL(); const k = u.includes('circuit') ? 'circuit' : u.includes('diagram') ? 'diagram' : u.includes('3d') ? 'd3' : u.includes('logic') ? 'logic' : u.includes('bool') ? 'bool' : u.includes('asm.html') ? 'asm' : u.includes('ino.html') ? 'ino' : u.includes('hdl.html') ? 'hdl' : u.includes('arch.html') ? 'arch' : u.includes('bb.html') ? 'bb' : u.includes('pcb.html') ? 'pcb' : u.includes('vlsi.html') ? 'vlsi' : 'other'; const fp = await w.webContents.executeJavaScript(`window.cesimNative && window.cesimNative.capture ? window.cesimNative.capture('cap_${k}.png') : 'nocapture'`); log.push('capture_' + k + '=' + (fp && fs.existsSync(fp) ? fs.statSync(fp).size : fp)); }
  const cw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('circuit.html'));
  if (cw) log.push('ollama=' + await cw.webContents.executeJavaScript(`(async()=>{let prog=0;const off=cesimNative.onOllamaProgress(d=>prog++);const t=await cesimNative.ollama({op:'tags'});const p=await cesimNative.ollama({op:'pull',model:'qwen2.5vl:7b',job:'pp'});const c=await cesimNative.ollama({op:'chat',model:'qwen2.5vl:7b',prompt:'x',images:['iVBOR'],job:'cc',format:{type:'object'}});off();let net='';try{net=CE.aiToSpice(CE.parseAiJson(c.text)).text.split('\\n').length}catch(e){net='ERR '+e.message}return JSON.stringify({tags:t.ok&&t.data.models.length,pull:p.ok,chat:c.ok,tokens:c.tokens,prog,netLines:net})})()`));
  const lw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('logic.html'));
  if (lw) log.push('logic=' + await lw.webContents.executeJavaScript(`(()=>{const d=CEL.doc;const pin=l=>d.comps.find(c=>c.t==='pin'&&c.a.label===l);const reg=d.comps.find(c=>c.t==='register');if(!reg)return 'no register';pin('B').st.v=9;pin('Load').st.v=1;CEL.propagate();CEL.clockStep();CEL.clockStep();return d.name+' parts='+d.comps.length+' PC='+reg.st.q})()`));
  const hw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('hdl.html'));
  if (hw) log.push('hdl=' + await hw.webContents.executeJavaScript(`new Promise(r=>{CEV.simulate();setTimeout(()=>r(CEV.ST.name+' top='+(CEV.ST.result&&CEV.ST.result.top)+' t='+(CEV.sim&&CEV.sim.t)+' rows='+CEV.ST.shown.length+' out='+JSON.stringify((CEV.sim&&CEV.sim.out||'').split('\\n')[1])),800)})`));
  const bw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('bb.html'));
  if (bw) log.push('bb=' + await bw.webContents.executeJavaScript(`new Promise(r=>{CEB.toggleRun();setTimeout(()=>{const s=CEB.sim;const leds=CEB.ST.doc.parts.filter(p=>p.type==='led').map(p=>+(s.state[p.id].i*1000).toFixed(1));r(CEB.ST.name+' parts='+CEB.ST.doc.parts.length+' t='+s.t.toFixed(2)+' ledmA='+leds.join('/')+' warn='+s.warn.size)},900)})`));
  const pw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('pcb.html'));
  if (pw) log.push('pcb=' + await pw.webContents.executeJavaScript(`(()=>{const d=CEP.drc;const st=CEP.ST;return st.name+' comps='+st.doc.comps.length+' traces='+st.doc.traces.length+' errors='+d.errors+' unrouted='+d.ratsnest.length+' gerber='+Object.keys(PCB.gerberFiles(st.doc,'t')).length})()`));
  const vw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('vlsi.html'));
  if (vw) log.push('vlsi=' + await vw.webContents.executeJavaScript(`(()=>{const st=CEX2.ST;return st.name+' tr='+CEX2.ex.tr.length+' drc='+CEX2.drc.length+' func='+(st.tt?st.tt.func.map(f=>f.name).join('/'):'none')+' gds='+VL.toGDS(st.L,st.name).length})()`));
  const xw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('arch.html'));
  if (xw) log.push('arch=' + await xw.webContents.executeJavaScript(`(()=>{CEX.assemble(true);const c=CEX.cpu;let n=0;while(c.step()==='ok'&&n++<1e5);CEX.showTab('pipe');return CEX.ST.isa+' '+CEX.ST.name+' '+c.state+' '+JSON.stringify(c.out)+' '+document.querySelector('#pinfo').textContent})()`));
  const aw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('asm.html'));
  if (aw) log.push('asm=' + await aw.webContents.executeJavaScript(`(()=>{CEA.assemble(true);const c=CEA.cpu;let n=0;while(c.step()==='ok'&&n++<1e5);return CEA.ST.name+' '+c.state+' '+JSON.stringify(c.text)})()`));
  const iw = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('ino.html'));
  if (iw) log.push('ino=' + await iw.webContents.executeJavaScript(`(()=>{CEI.run();return new Promise(r=>setTimeout(()=>{const s=CEI.sim;r(CEI.ST.name+' parts='+CEI.ST.parts.length+' t='+(CEI.ST.T/1e6).toFixed(1)+' serial='+JSON.stringify(s.serial.slice(0,40))+' p13='+s.pins[13].v)},1500))})()`));
  const d3w = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('3d.html')); if (d3w) log.push('d3settings=' + await d3w.webContents.executeJavaScript('JSON.stringify([CE3D.controls.zoomSpeed, !!CE3D.csvReport().length, CE3D.exportSVG3().length > 500])'));
  log.push('recent=' + JSON.stringify(readRecent().map(r => [path.basename(r.path), r.tool])));
  fs.writeFileSync(path.join(out, 'log.txt'), log.join('\n') + '\nERRORS:\n' + errs.join('\n'));
  app.exit(0);
});
