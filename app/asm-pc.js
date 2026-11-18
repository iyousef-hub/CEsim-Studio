/* CEsim 8086: a full DOS machine (the GPL-2.0 emulator in lib/emu) running the files of the DOS tab disk and the program in the editor. */
(function (root) {
'use strict';
const KEYS = { Enter: 257, NumpadEnter: 335, Escape: 256, Backspace: 259, Tab: 258, Space: 32, Minus: 45, Equal: 61, BracketLeft: 91, BracketRight: 93, Backslash: 92, Semicolon: 59, Quote: 39, Backquote: 96, Comma: 44, Period: 46, Slash: 47,
  ArrowLeft: 263, ArrowRight: 262, ArrowUp: 265, ArrowDown: 264, Insert: 260, Delete: 261, Home: 268, End: 269, PageUp: 266, PageDown: 267, ShiftLeft: 340, ShiftRight: 344, ControlLeft: 341, ControlRight: 345, AltLeft: 342, AltRight: 346, CapsLock: 280,
  NumpadDecimal: 330, NumpadDivide: 331, NumpadMultiply: 332, NumpadSubtract: 333, NumpadAdd: 334, IntlBackslash: 348 };
for (let i = 0; i < 26; i++) KEYS['Key' + String.fromCharCode(65 + i)] = 65 + i;
for (let i = 0; i < 10; i++) { KEYS['Digit' + i] = 48 + i; KEYS['Numpad' + i] = 320 + i; }
for (let i = 1; i <= 12; i++) KEYS['F' + i] = 289 + i;
let ci = null, el = null, cv = null, g = null, img = null, starting = false, hooks = {}, statusEl = null, down = new Set();
const say = (t, err) => { if (statusEl) { statusEl.textContent = t; statusEl.style.color = err ? '#e5534b' : ''; } };
const enc = new TextEncoder();
const b64 = s => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
/* the files of the DOS tab disk: text files and .COM programs (its .EXE files only run in the DOS tab) */
function diskFiles() {
  const out = []; const d = root.CEDOS && root.CEDOS.disk ? root.CEDOS.disk() : null; if (!d) return out;
  const walk = (node, path) => { for (const [n, f] of Object.entries(node.k || {})) { if (f.t === 'd') { walk(f, path + n + '/'); continue; } if (/\.EXE$/i.test(n)) continue; if (f.b != null) out.push({ path: path + n, contents: b64(f.b) }); else out.push({ path: path + n, contents: enc.encode(String(f.s || '')) }); } };
  walk(d, ''); return out;
}
async function start(withProgram) {
  if (starting) return; starting = true;
  try {
    await stop();
    const E = root.emulators; if (!E) throw new Error('The DOS machine files are missing.');
    E.pathPrefix = root.cesimNative ? 'cesim://app/lib/emu/' : 'lib/emu/';
    const files = diskFiles(); let auto = '';
    const prog = withProgram && hooks.program ? hooks.program() : null;
    if (prog && prog.bytes) { files.push({ path: prog.name, contents: prog.bytes }); auto = `echo.\necho ${prog.name} is on drive C. Type ${prog.name.replace(/\.COM$/i, '')} to run it.\n`; }
    else if (prog && prog.error) say(prog.error, true);
    const conf = { dosboxConf: `[sdl]\nautolock=false\n[dosbox]\nmachine=svga_s3\nmemsize=16\n[cpu]\ncore=auto\ncputype=auto\ncycles=auto\n[mixer]\nnosound=true\n[speaker]\npcspeaker=false\n[autoexec]\n@echo off\nmount c .\nc:\ncls\necho CEsim DOS machine. Drive C has the files of the DOS tab.\n${auto}`, jsdosConf: { version: '8' } };
    say('Starting…');
    ci = await E.dosboxDirect([conf, ...files]);
    ci.events().onFrameSize((w, h) => { cv.width = w; cv.height = h; img = null; });
    ci.events().onFrame((rgb, rgba) => { const w = ci.width(), h = ci.height(); if (!w || !h) return; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; img = null; } if (!img) img = g.createImageData(w, h);
      if (rgba) img.data.set(rgba.subarray(0, w * h * 4)); else if (rgb) { const d = img.data; for (let i = 0, j = 0, n = w * h; i < n; i++, j += 4) { d[j] = rgb[i * 3]; d[j + 1] = rgb[i * 3 + 1]; d[j + 2] = rgb[i * 3 + 2]; d[j + 3] = 255; } } g.putImageData(img, 0, 0); });
    ci.events().onExit(() => { ci = null; say('The DOS machine stopped. Press Start to run it again.'); });
    say(prog && prog.bytes ? `Running. ${prog.name} is on drive C. Click the screen to type.` : 'Running. Click the screen to type.');
    cv.focus();
  } catch (e) { ci = null; say('The DOS machine could not start: ' + e.message, true); }
  finally { starting = false; }
}
async function stop() { if (!ci) return; const c = ci; ci = null; for (const k of down) try { c.sendKeyEvent(k, false); } catch (e) { } down.clear(); try { await c.exit(); } catch (e) { } }
function key(e, pressed) { if (!ci) return; const k = KEYS[e.code]; if (!k) return; e.preventDefault(); e.stopPropagation(); if (pressed) { if (down.has(k) && e.repeat) { ci.sendKeyEvent(k, false); } down.add(k); } else down.delete(k); ci.sendKeyEvent(k, pressed); }
function init(container, h) {
  hooks = h || {}; el = container;
  el.innerHTML = `<div class="pcbar"><button class="btn pri" id="pcStart">Start</button><button class="btn" id="pcProg" title="Restart with the program in the editor copied to drive C as a .COM file">Run editor program</button><button class="btn" id="pcStop">Stop</button><span id="pcStat" class="pcstat">Press Start to boot the DOS machine.</span></div><div class="pcscr"><canvas id="pcCv" tabindex="0" width="640" height="400" aria-label="DOS machine screen. Click it and type"></canvas></div>`;
  cv = el.querySelector('#pcCv'); g = cv.getContext('2d'); statusEl = el.querySelector('#pcStat'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  el.querySelector('#pcStart').onclick = () => start(false); el.querySelector('#pcProg').onclick = () => start(true); el.querySelector('#pcStop').onclick = () => { stop(); say('Stopped.'); };
  cv.addEventListener('keydown', e => key(e, true)); cv.addEventListener('keyup', e => key(e, false)); cv.addEventListener('blur', () => { if (ci) for (const k of down) ci.sendKeyEvent(k, false); down.clear(); });
  cv.addEventListener('pointerdown', () => cv.focus());
}
root.CEPC = { init, start, stop, running: () => !!ci, ci: () => ci, type: async (text) => { if (!ci) return; for (const ch of text) { let k; if (ch === '\n') k = 257; else if (ch === ' ') k = 32; else if (/[a-z]/i.test(ch)) k = ch.toUpperCase().charCodeAt(0); else if (/[0-9]/.test(ch)) k = ch.charCodeAt(0); else if (ch === '.') k = 46; else if (ch === '\\') k = 92; else continue; ci.sendKeyEvent(k, true); await new Promise(r => setTimeout(r, 40)); ci.sendKeyEvent(k, false); await new Promise(r => setTimeout(r, 40)); } } };
})(typeof window !== 'undefined' ? window : globalThis);
