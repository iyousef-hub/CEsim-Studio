import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fontJson from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { Brush, Evaluator, ADDITION, SUBTRACTION } from 'three-bvh-csg';
import { zipSync, strToU8 } from 'three/examples/jsm/libs/fflate.module.js';

import BBXmod from '../app/parts-extra.js';
import PLIBmod from '../app/parts-lib.js';
const BBX = BBXmod || (typeof window !== 'undefined' ? window.BBX : null);
const PLIB = PLIBmod || (typeof window !== 'undefined' ? window.PLIB : null);
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
const $ = s => document.querySelector(s);
const FONT = new FontLoader().parse(fontJson);
const PALETTE = ['#2f6fdb', '#f08a24', '#2bb673', '#e8c32a', '#8e5bd6', '#19a7b5', '#e0483e', '#6b7a8f'];
let colorIdx = 0;
const uidGen = () => 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const toast = (m, err) => { const d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), err ? 5000 : 2600); };

/* ---------------- scene ---------------- */
const wrap = $('#view');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
wrap.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef2f7');
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 20000);
camera.position.set(170, -230, 190);
const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
controls.enableDamping = true; controls.dampingFactor = 0.15; controls.screenSpacePanning = true;
controls.target.set(0, 0, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(150, -200, 300); scene.add(sun);
const sun2 = new THREE.DirectionalLight(0xffffff, 0.5); sun2.position.set(-200, 150, 120); scene.add(sun2);

let WP = { w: 300, h: 200 };
let gridGroup = new THREE.Group(); scene.add(gridGroup);
function buildGrid() {
  gridGroup.clear();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(WP.w, WP.h), new THREE.MeshBasicMaterial({ color: '#dfe8f3', side: THREE.DoubleSide }));
  plate.position.z = -0.05; gridGroup.add(plate);
  const minor = [], major = [];
  for (let x = -WP.w / 2; x <= WP.w / 2 + 1e-6; x += 1) (Math.round(x) % 10 === 0 ? major : minor).push(x, -WP.h / 2, 0, x, WP.h / 2, 0);
  for (let y = -WP.h / 2; y <= WP.h / 2 + 1e-6; y += 1) (Math.round(y) % 10 === 0 ? major : minor).push(-WP.w / 2, y, 0, WP.w / 2, y, 0);
  const mk = (arr, col, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op })); };
  gridGroup.add(mk(minor, '#9db4cf', 0.35)); gridGroup.add(mk(major, '#5f84b3', 0.6));
  const ax = (a, b, c) => { const g = new THREE.BufferGeometry().setFromPoints([a, b]); return new THREE.Line(g, new THREE.LineBasicMaterial({ color: c })); };
  gridGroup.add(ax(new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(25, 0, 0.02), '#e0483e'));
  gridGroup.add(ax(new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(0, 25, 0.02), '#2bb673'));
  gridGroup.add(ax(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 25), '#2f6fdb'));
}
buildGrid();

/* ---------------- control settings (saved) ---------------- */
const SET_DEF = { zoom: 1, rotate: 1, pan: 1, invert: false, toCursor: true, damping: true, buttons: 'rmb', rotSnap: 15, gridW: 300, gridH: 200, bg: '#eef2f7', axes: true };
let SET = Object.assign({}, SET_DEF); try { Object.assign(SET, JSON.parse(localStorage.getItem('cesim3d.settings') || '{}')); } catch (e) { }
function applySettings() {
  controls.zoomSpeed = (SET.invert ? -1 : 1) * SET.zoom; controls.rotateSpeed = SET.rotate; controls.panSpeed = SET.pan;
  controls.zoomToCursor = !!SET.toCursor; controls.enableDamping = !!SET.damping;
  controls.mouseButtons = SET.buttons === 'mmb' ? { LEFT: null, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN } : { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  try { tc.setRotationSnap(SET.rotSnap > 0 ? THREE.MathUtils.degToRad(SET.rotSnap) : null); } catch (e) { }
  if (WP.w !== SET.gridW || WP.h !== SET.gridH) { WP = { w: SET.gridW, h: SET.gridH }; buildGrid(); }
  scene.background = new THREE.Color(SET.bg);
  gridGroup.children.forEach(c => { if (c.isLine && !c.isLineSegments) c.visible = !!SET.axes; });
  try { localStorage.setItem('cesim3d.settings', JSON.stringify(SET)); } catch (e) { }
}
applySettings();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const tc = new TransformControls(camera, renderer.domElement);
tc.setTranslationSnap(1); tc.setRotationSnap(SET.rotSnap > 0 ? THREE.MathUtils.degToRad(SET.rotSnap) : null); tc.setScaleSnap(0.05);
tc.setSize(0.8);
scene.add(tc.getHelper ? tc.getHelper() : tc);
tc.addEventListener('dragging-changed', e => { controls.enabled = !e.value; if (e.value) { pushUndo(); } else { syncFromRoot(); refreshInspector(); } });
tc.addEventListener('objectChange', () => { syncFromRoot(true); });
let gizmoMode = null; // null | translate | rotate | scale

/* ---------------- geometry ---------------- */
function normalizeGeom(g) {
  g.computeBoundingBox(); const b = g.boundingBox; const s = new THREE.Vector3(); b.getSize(s);
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z);
  g.scale(1 / (s.x || 1), 1 / (s.y || 1), 1 / (s.z || 1));
  ensureAttrs(g); return g;
}
function ensureAttrs(g) {
  if (g.index) { const n = g.toNonIndexed(); g.dispose(); g = n; }
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  g.clearGroups(); return g;
}
const unitCache = new Map();
function unitGeom(o) {
  const p = o.params || {};
  const key = o.kind + JSON.stringify(p);
  if (unitCache.has(key)) return unitCache.get(key);
  let g;
  const sides = Math.max(3, Math.min(128, +p.sides || 48));
  switch (o.kind) {
    case 'box': g = new THREE.BoxGeometry(1, 1, 1); break;
    case 'cylinder': g = new THREE.CylinderGeometry(0.5, 0.5, 1, sides).rotateX(Math.PI / 2); break;
    case 'cone': g = new THREE.CylinderGeometry(0, 0.5, 1, sides).rotateX(Math.PI / 2); break;
    case 'sphere': g = new THREE.SphereGeometry(0.5, Math.max(16, sides), Math.max(12, sides / 2)); break;
    case 'pyramid': g = new THREE.ConeGeometry(0.7071, 1, 4).rotateY(Math.PI / 4).rotateX(Math.PI / 2); break;
    case 'torus': g = new THREE.TorusGeometry(1, 0.32, 24, Math.max(24, sides)); break;
    case 'ring': { const sh = new THREE.Shape(); sh.absarc(0, 0, 0.5, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, 0.5 * (+p.inner || 70) / 100, 0, Math.PI * 2, true); sh.holes.push(h); g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: sides }); break; }
    case 'wedge': { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1, 0); sh.lineTo(0, 1); sh.lineTo(0, 0); g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }).rotateX(Math.PI / 2); break; }
    case 'hexprism': g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6).rotateX(Math.PI / 2); break;
    case 'roundbox': { const r = 0.12; const sh = new THREE.Shape(); sh.moveTo(-0.5 + r, -0.5); sh.lineTo(0.5 - r, -0.5); sh.quadraticCurveTo(0.5, -0.5, 0.5, -0.5 + r); sh.lineTo(0.5, 0.5 - r); sh.quadraticCurveTo(0.5, 0.5, 0.5 - r, 0.5); sh.lineTo(-0.5 + r, 0.5); sh.quadraticCurveTo(-0.5, 0.5, -0.5, 0.5 - r); sh.lineTo(-0.5, -0.5 + r); sh.quadraticCurveTo(-0.5, -0.5, -0.5 + r, -0.5); g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: 8 }); break; }
    case 'text': g = new TextGeometry(String(p.text || 'CE'), { font: FONT, size: 10, depth: 3, curveSegments: 6, bevelEnabled: false }); break;
    default: g = new THREE.BoxGeometry(1, 1, 1);
  }
  g = normalizeGeom(g);
  unitCache.set(key, g); return g;
}
/* mesh-kind geometry is stored in mm, base-normalized */
function b64FromF32(a) { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function f32FromB64(b) { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Float32Array(u.buffer); }
const meshGeomCache = new Map();
function meshGeom(o) {
  if (meshGeomCache.has(o.id + o.geom.length)) return meshGeomCache.get(o.id + o.geom.length);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(f32FromB64(o.geom), 3)); g.computeVertexNormals(); ensureAttrs(g);
  meshGeomCache.set(o.id + o.geom.length, g); return g;
}
function storeMeshGeom(g) { // returns {geom:b64, natural:[x,y,z]} with geometry base-normalized in place (mm)
  g = ensureAttrs(g); g.computeBoundingBox(); const b = g.boundingBox; const s = new THREE.Vector3(); b.getSize(s); const c = new THREE.Vector3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, b.min.z);
  g.translate(-c.x, -c.y, -c.z);
  return { geom: b64FromF32(new Float32Array(g.getAttribute('position').array)), natural: [s.x, s.y, s.z], center: c };
}

/* ---------------- boards library (dimensions in mm from published mechanical drawings) ---------------- */
const BOARDS = {
  'Arduino Uno R3': { w: 68.58, d: 53.34, holes: [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]], hr: 1.6, note: 'Holes Ø3.2 at (13.97,2.54) (15.24,50.8) (66.04,7.62) (66.04,35.56)' },
  'Arduino Nano': { w: 43.18, d: 17.78, note: 'Mini-USB on the short edge' },
  'Arduino Mega 2560': { w: 101.6, d: 53.34, holes: [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56], [90.17, 50.8], [96.52, 2.54]], hr: 1.6, note: 'Uno hole pattern plus (90.17,50.8) (96.52,2.54)' },
  'ESP32 DevKit V1': { w: 51.5, d: 28.3, note: 'Micro-USB on the short edge' },
  'Raspberry Pi 4 B': { w: 85, d: 56, holes: [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]], hr: 1.35, note: 'Holes Ø2.7 at (3.5,3.5) (61.5,3.5) (3.5,52.5) (61.5,52.5)' },
  'HC-SR04 ultrasonic': { w: 45, d: 20, g: 'Sensors', note: 'Transducers Ø16 × 12 mm' },
  'SG90 micro servo': { w: 32.2, d: 12.2, g: 'Motors', note: 'Body 22.5 × 12.2 × 22.7, tabs at 15.9 mm' },
  'LCD 16x2 module': { w: 80, d: 36, holes: [[2.5, 2.5], [77.5, 2.5], [2.5, 33.5], [77.5, 33.5]], hr: 1.5, note: 'Holes Ø3 at 2.5 mm from each corner' },
  'Breadboard 400': { w: 82.5, d: 55, note: '400 tie points' },
  'ESP32-S3 DevKitC-1': { w: 62.74, d: 25.4, g: 'Boards', note: '62.74 × 25.4 mm, two 22-pin headers 22.86 mm apart, two USB ports on the short edge' },
  'MLX90640 thermal camera': { w: 25.7, d: 17.7, g: 'Sensors', note: 'Breakout 25.7 × 17.7 mm, TO39 sensor can on top (55° version, 16 mm tall)' },
  'SHT31-D temperature and humidity': { w: 17.78, d: 12.7, g: 'Sensors', note: 'Breakout 17.78 × 12.7 mm, sensor 2.5 × 2.5 mm' },
  'VL53L0X LiDAR (GY-530)': { w: 25, d: 10.7, g: 'Sensors', note: 'Module 25 × 10.7 mm, sensor 4.4 × 2.4 mm' },
  'OV2640 camera module': { w: 32, d: 32, g: 'Sensors', note: 'Board 32 × 32 mm, M12 lens holder 14 × 14 mm' },
  'MPU6050 gyro (GY-521)': { w: 21.2, d: 16.4, g: 'Sensors', note: 'Module 21.2 × 16.4 mm, holes Ø3 at the top corners' },
  'Piezo disc 27 mm': { w: 27, d: 27, g: 'Sensors', note: 'Brass disc Ø27 mm, ceramic Ø20 mm, 0.5 mm thick' },
  'SW-420 vibration sensor': { w: 32, d: 14, g: 'Sensors', note: 'Module 32 × 14 mm with a hole Ø3' },
  'MAX4466 microphone': { w: 20, d: 13.8, g: 'Sensors', note: 'Board 20 × 13.8 mm, electret capsule Ø9.7 mm' },
  'LiPo 4S 1500 mAh': { w: 75, d: 35, g: 'Drone', note: 'Pack about 75 × 35 × 37 mm, XT60 plug and balance lead, about 180 g' },
  'ESC 35 A': { w: 50, d: 22, g: 'Drone', note: 'Shrink-wrapped ESC 50 × 22 × 7 mm' },
  'ESC 4-in-1 30 × 30': { w: 36, d: 36, g: 'Drone', note: 'Stack board 36 × 36 mm, holes 30.5 × 30.5 mm (M3)' },
  'Flight controller F405 30 × 30': { w: 36, d: 36, g: 'Drone', note: 'Stack board 36 × 36 mm, holes 30.5 × 30.5 mm (M3)' },
  'Brushless motor 0802': { w: 12, d: 12, g: 'Drone', note: 'Ø12 × 8 mm bell, 1 mm shaft' },
  'Brushless motor 1404': { w: 18, d: 18, g: 'Drone', note: 'Ø18 × 15 mm, M5 prop shaft' },
  'Brushless motor 2207': { w: 27.9, d: 27.9, g: 'Drone', note: 'Ø27.9 × 18.9 mm, M5 shaft, 4 × M3 on 16 × 16 mm' },
  'Brushless motor 2306': { w: 28.8, d: 28.8, g: 'Drone', note: 'Ø28.8 × 18.4 mm, M5 shaft, 4 × M3 on 16 × 16 mm' },
  'Brushless motor 2212': { w: 28, d: 28, g: 'Drone', note: 'Ø28 × 26 mm, prop adapter M6' },
  'Brushless motor 2814': { w: 35, d: 35, g: 'Drone', note: 'Ø35 × 30 mm' },
  'Brushless motor 4114': { w: 46, d: 46, g: 'Drone', note: 'Ø46 × 26 mm, heavy lift' },
  'Propeller 31 mm (Tiny Whoop)': { w: 31, d: 31, g: 'Drone', note: '4-blade 31 mm, 1 mm shaft' },
  'Propeller 3 inch': { w: 76.2, d: 76.2, g: 'Drone', note: '3-blade 76.2 mm' },
  'Propeller 5 inch': { w: 127, d: 127, g: 'Drone', note: '3-blade 5 × 4.3 × 3, 127 mm' },
  'Propeller 10 inch': { w: 254, d: 254, g: 'Drone', note: '2-blade 1045, 254 mm' },
  'Propeller 15 inch': { w: 381, d: 381, g: 'Drone', note: '2-blade 1550, 381 mm' },
  'Drone frame Tiny Whoop 65 mm': { w: 82, d: 82, g: 'Drone', note: '65 mm motor to motor, ducted' },
  'Drone frame 3-inch (130 mm)': { w: 110, d: 110, g: 'Drone', note: '130 mm motor to motor, 20 × 20 stack' },
  'Drone frame 5-inch (220 mm)': { w: 168, d: 168, g: 'Drone', note: '220 mm motor to motor, 5 mm carbon arms, 30.5 × 30.5 stack' },
  'Drone frame F450': { w: 345, d: 345, g: 'Drone', note: '450 mm motor to motor, plates with power distribution' },
  'Drone frame S550 hexacopter': { w: 502, d: 576, g: 'Drone', note: '550 mm motor to motor, 6 arms' },
  'Drone frame X8 octocopter': { w: 950, d: 950, g: 'Drone', note: '1000 mm motor to motor, 8 arms' },
  'L298N motor driver': { w: 43, d: 43, g: 'Motors', note: '43 × 43 × 27 mm, holes Ø3 at 3 mm from the corners', holes: [[3, 3], [40, 3], [3, 40], [40, 40]], hr: 1.5 },
  'DC motor 130': { w: 25, d: 20, g: 'Motors', note: 'Body 25 × 20 × 15 mm, Ø2 shaft' },
  'DC motor 370': { w: 30, d: 24.4, g: 'Motors', note: 'Ø24.4 × 30 mm' },
  'DC motor 775': { w: 66, d: 42, g: 'Motors', note: 'Ø42 × 66 mm, Ø5 shaft' },
  'TT gear motor 1:48': { w: 70, d: 22.5, g: 'Motors', note: '70 × 22.5 × 18.8 mm, double D shaft' },
  'N20 gear motor': { w: 34, d: 12, g: 'Motors', note: '12 × 10 × 24 mm, Ø3 D shaft 9 mm' },
  'Coreless motor 8520': { w: 20, d: 8.5, g: 'Motors', note: 'Ø8.5 × 20 mm' },
  'NEMA 17 stepper motor': { w: 42.3, d: 42.3, g: 'Motors', note: '42.3 × 42.3 × 40 mm, Ø5 D shaft 24 mm, M3 holes 31 mm apart' },
  'A4988 stepper driver': { w: 20.3, d: 15.2, g: 'Motors', note: 'Module 20.3 × 15.2 mm, two 8-pin headers' },
  'MG996R servo': { w: 54.5, d: 20, g: 'Motors', note: 'Body 40.7 × 19.7 × 42.9 mm, tabs 54.5 mm' },
  'FS90R continuous servo': { w: 32.2, d: 12.2, g: 'Motors', note: 'SG90 size, turns all the way round' },
  'Coin vibration motor': { w: 10, d: 10, g: 'Motors', note: 'Ø10 × 2.7 mm' },
  'Mini water pump 5 V': { w: 45, d: 24, g: 'Motors', note: 'Ø24 × 45 mm, Ø7.5 outlet' },
  'Fan 40 mm': { w: 40, d: 40, g: 'Motors', note: '40 × 40 × 10 mm, holes 32 mm apart', holes: [[4, 4], [36, 4], [4, 36], [36, 36]], hr: 1.7 },
  'Push solenoid 12 V': { w: 30, d: 16, g: 'Motors', note: 'Frame 30 × 16 × 14 mm, plunger Ø6' },
  'Oscilloscope': { w: 310, d: 130, g: 'Tools', note: 'Bench scope 310 × 130 × 150 mm' },
  'Function generator': { w: 230, d: 100, g: 'Tools', note: 'Bench generator 230 × 100 × 260 mm' },
  'Logic probe': { w: 150, d: 18, g: 'Tools', note: 'Pen 150 × 18 mm' },
  'Digital multimeter': { w: 90, d: 180, g: 'Tools', note: 'Handheld 90 × 180 × 45 mm' },
  'Bench power supply': { w: 160, d: 260, g: 'Tools', note: '160 × 260 × 110 mm' },
};
function buildBoard(model) {
  const G = new THREE.Group();
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1 });
  const box = (x1, y1, z1, x2, y2, z2, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1), M(c)); m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); G.add(m); return m; };
  const cyl = (x, y, z1, z2, r, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, z2 - z1, 32).rotateX(Math.PI / 2), M(c)); m.position.set(x, y, (z1 + z2) / 2); G.add(m); return m; };
  const holes = (pts, r, top) => pts.forEach(([x, y]) => cyl(x, y, top - 0.02, top + 0.06, r, '#1a1a1a'));
  const header = (x1, y, n, h, c = '#222') => box(x1, y - 1.27, 1.6, x1 + n * 2.54, y + 1.27, 1.6 + h, c);
  switch (model) {
    case 'Arduino Uno R3':
      box(0, 0, 0, 68.58, 53.34, 1.6, '#0b7fa3'); holes([[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]], 1.6, 1.6);
      box(-6.35, 31.75, 1.6, 9.9, 43.8, 12.5, '#c9ccd1'); box(-1.8, 3.3, 1.6, 12.4, 12.3, 12.6, '#151515');
      header(17.5, 50.8, 10, 8.5); header(44.5, 50.8, 8, 8.5); header(27.9, 2.54, 8, 8.5); header(50.8, 2.54, 6, 8.5);
      box(33, 13, 1.6, 68, 20.5, 5.4, '#1d1d1d'); box(9, 27, 1.6, 15, 33, 3.8, '#ddd');
      break;
    case 'Arduino Nano':
      box(0, 0, 0, 43.18, 17.78, 1.6, '#0b5fa3'); box(-1.5, 5.1, 1.6, 7.5, 12.7, 5.6, '#c9ccd1');
      header(2.6, 1.27, 15, 2.5, '#d4af37'); header(2.6, 16.51, 15, 2.5, '#d4af37'); box(17, 6, 1.6, 26, 12, 2.8, '#1d1d1d');
      break;
    case 'Arduino Mega 2560':
      box(0, 0, 0, 101.6, 53.34, 1.6, '#0b7fa3'); holes([[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56], [90.17, 50.8], [96.52, 2.54]], 1.6, 1.6);
      box(-6.35, 31.75, 1.6, 9.9, 43.8, 12.5, '#c9ccd1'); box(-1.8, 3.3, 1.6, 12.4, 12.3, 12.6, '#151515');
      header(17.5, 50.8, 10, 8.5); header(44.5, 50.8, 8, 8.5); header(27.9, 2.54, 8, 8.5); header(50.8, 2.54, 6, 8.5); box(92.5, 5, 1.6, 99.5, 50, 10.1, '#222'); box(40, 22, 1.6, 54, 36, 2.8, '#1d1d1d');
      break;
    case 'ESP32 DevKit V1':
      box(0, 0, 0, 51.5, 28.3, 1.6, '#202020'); box(-1, 10.2, 1.6, 5, 18.1, 4.6, '#c9ccd1'); box(30, 6.1, 1.6, 51.5, 22.2, 4.8, '#b9bec6');
      header(4, 1.27, 15, 2.5, '#d4af37'); header(4, 27.03, 15, 2.5, '#d4af37');
      break;
    case 'Raspberry Pi 4 B':
      box(0, 0, 0, 85, 56, 1.4, '#16834a'); holes([[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]], 1.35, 1.4);
      box(7.1, 50, 1.4, 57.9, 55, 9.9, '#222'); box(65.5, 2.5, 1.4, 87.1, 18.4, 15, '#c9ccd1'); box(69.5, 21, 1.4, 87.1, 36, 17.4, '#c9ccd1'); box(69.5, 38.5, 1.4, 87.1, 53.5, 17.4, '#c9ccd1');
      box(3.5, -1.2, 1.4, 12.5, 6.5, 4.6, '#c9ccd1'); box(22, -1.5, 1.4, 29, 6, 4.4, '#c9ccd1'); box(35.5, -1.5, 1.4, 42.5, 6, 4.4, '#c9ccd1'); box(22, 22, 1.4, 37, 37, 3.8, '#9aa1aa');
      break;
    case 'HC-SR04 ultrasonic':
      box(0, 0, 0, 45, 20, 1.2, '#1659a8'); cyl(9.5, 10, 1.2, 13.2, 8, '#b9bec6'); cyl(35.5, 10, 1.2, 13.2, 8, '#b9bec6'); box(17.4, 17, -8.5, 27.6, 19.5, 0, '#222');
      break;
    case 'SG90 micro servo':
      box(4.85, 0, 0, 27.35, 12.2, 22.7, '#2d63c9'); box(0, 0, 15.9, 32.2, 12.2, 18.4, '#2d63c9'); cyl(10.8, 6.1, 22.7, 26.7, 5.9, '#2d63c9'); cyl(10.8, 6.1, 26.7, 29.7, 2.4, '#f2f2f2');
      break;
    case 'LCD 16x2 module':
      box(0, 0, 0, 80, 36, 1.6, '#127a3a'); holes([[2.5, 2.5], [77.5, 2.5], [2.5, 33.5], [77.5, 33.5]], 1.5, 1.6); box(4.5, 6, 1.6, 75.5, 30, 8.6, '#1d1d1d'); box(10.5, 10.5, 8.6, 69.5, 25.5, 8.8, '#5fb85f'); header(9, 34, 16, 2.5, '#d4af37');
      break;
    case 'Breadboard 400': {
      box(0, 0, 0, 82.5, 55, 8.5, '#f3f3ef');
      const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.3), M('#333'), 400); let k = 0; const mtx = new THREE.Matrix4();
      for (let c = 0; c < 30; c++) for (let r = 0; r < 10; r++) { const y = 8.5 + r * 2.54 + (r >= 5 ? 2.54 * 1.5 : 0); mtx.makeTranslation(3.5 + c * 2.54, y, 8.55); dots.setMatrixAt(k++, mtx); }
      for (let c = 0; c < 25; c++) for (let r = 0; r < 4; r++) { if (k >= 400) break; const y = [2, 4.54, 50.5, 53][r]; mtx.makeTranslation(8 + c * 2.54 + Math.floor(c / 5) * 1.2, y, 8.55); dots.setMatrixAt(k++, mtx); }
      dots.count = k; G.add(dots); box(0, 26.2, 8.5, 82.5, 28.8, 8.6, '#d9d9d2');
      break; }
    default: build3dExtra(model, G, box, cyl, holes, header, M);
  }
  return G;
}
/* models of the sensors, drone parts and motors (mm, z up) */
function build3dExtra(model, G, box, cyl, holes, header, M) {
  const add = (geo, c, x, y, z, rz = 0, rx = 0, ry = 0) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); G.add(m); return m; };
  const tube = (x, y, z1, z2, r, c, open) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, z2 - z1, 48, 1, !!open).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: c, roughness: .5, side: THREE.DoubleSide })); m.position.set(x, y, (z1 + z2) / 2); G.add(m); return m; };
  const bar = (x1, y1, x2, y2, w, z1, z2, c) => { const L = Math.hypot(x2 - x1, y2 - y1); return add(new THREE.BoxGeometry(L, w, z2 - z1), c, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, Math.atan2(y2 - y1, x2 - x1)); };
  const pcbM = (w, d, c, t = 1.6) => box(0, 0, 0, w, d, t, c);
  const bldcM = (D, H, sh) => { const r = D / 2; cyl(r, r, 0, H * 0.3, r * 0.92, '#2a2d33'); cyl(r, r, H * 0.3, H, r, '#d14b3c'); cyl(r, r, H * 0.3 + H * 0.2, H * 0.3 + H * 0.45, r * 1.002, '#1b1d22'); cyl(r, r, H, H + 0.6, r * 0.55, '#c9ccd1'); cyl(r, r, H, H + sh, Math.max(0.5, D * 0.09), '#b9bec6'); for (let i = 0; i < 3; i++) bar(r, r, r + (i - 1) * 2, -12, 1, 0.5, 1.5, ['#222', '#444', '#666'][i]); };
  const prop = (D, n, chord, c) => { const R = D / 2; cyl(R, R, 0, D > 60 ? 6 : 4, D > 60 ? 6 : 2.5, c); for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n; const b = add(new THREE.BoxGeometry(R - 3, chord, 1.2), c, R + Math.cos(a) * (R / 2 + 1), R + Math.sin(a) * (R / 2 + 1), 3, a, 0.25); b.geometry.translate(0, 0, 0); } };
  const frameM = (n, arm, w, t, plate, c, ducts) => { const C = arm + 15; for (let i = 0; i < n; i++) { const a = (i + 0.5) * 2 * Math.PI / n; const x = C + Math.cos(a) * arm, y = C + Math.sin(a) * arm; bar(C, C, x, y, w, 0, t, c); cyl(x, y, 0, t + 0.4, w * 0.75, c); if (ducts) { tube(x, y, 0, 12, ducts, '#2b2b2b', true); } }
    box(C - plate / 2, C - plate / 2, 0, C + plate / 2, C + plate / 2, t, c); if (plate > 30) { [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => cyl(C + sx * plate * 0.35, C + sy * plate * 0.35, t, t + plate * 0.55, 2.5, '#d4a83c')); box(C - plate / 2, C - plate / 2, t + plate * 0.55, C + plate / 2, C + plate / 2, t + plate * 0.55 + 2, c); } };
  switch (model) {
    case 'ESP32-S3 DevKitC-1':
      pcbM(62.74, 25.4, '#1d1f24'); box(44.2, 3.6, 1.6, 63.7, 21.8, 2.4, '#1b4fa0'); box(45.5, 4.9, 2.4, 59.5, 20.5, 5.0, '#c9ccd1');
      box(-1.2, 3.2, 1.6, 4.6, 10.8, 4.4, '#c9ccd1'); box(-1.2, 14.6, 1.6, 4.6, 22.2, 4.4, '#c9ccd1'); box(8, 3, 1.6, 11.5, 6.5, 3.6, '#ddd'); box(8, 18.9, 1.6, 11.5, 22.4, 3.6, '#ddd');
      box(20, 11, 1.6, 22, 13, 2.4, '#f2f2f2'); box(14, 9, 1.6, 19, 14, 2.6, '#1d1d1d');
      header(3.2, 1.27, 22, 2.5); header(3.2, 24.13, 22, 2.5); box(3.2, 0.6, -6, 59.1, 1.9, 0, '#d4af37'); box(3.2, 23.5, -6, 59.1, 24.8, 0, '#d4af37'); break;
    case 'MLX90640 thermal camera':
      pcbM(25.7, 17.7, '#1d1f24'); holes([[2.5, 2.5], [23.2, 2.5], [2.5, 15.2], [23.2, 15.2]], 1.25, 1.6); cyl(12.85, 9.5, 1.6, 8.2, 4.6, '#c9ccd1'); cyl(12.85, 9.5, 8.2, 8.5, 2.2, '#222'); header(6.5, 1.3, 5, 2.5); box(0.5, 6, 1.6, 4, 11.5, 3, '#eee'); box(21.7, 6, 1.6, 25.2, 11.5, 3, '#eee'); break;
    case 'SHT31-D temperature and humidity':
      pcbM(17.78, 12.7, '#1a1a8c'); box(7.64, 6.1, 1.6, 10.14, 8.6, 2.5, '#e9eaec'); header(1.9, 1.27, 7, 2.5); holes([[2.54, 10.2], [15.24, 10.2]], 1.2, 1.6); break;
    case 'VL53L0X LiDAR (GY-530)':
      pcbM(25, 10.7, '#5b2a86'); box(10.3, 4.2, 1.6, 14.7, 6.6, 2.6, '#111'); cyl(11.4, 5.4, 2.6, 2.7, 0.7, '#4a1d1d'); cyl(13.6, 5.4, 2.6, 2.7, 0.7, '#26262e'); header(3.9, 1.27, 6, 2.5); holes([[2, 8.5], [23, 8.5]], 1.4, 1.6); break;
    case 'OV2640 camera module':
      pcbM(32, 32, '#0f6d3a'); holes([[2.5, 2.5], [29.5, 2.5], [2.5, 29.5], [29.5, 29.5]], 1.2, 1.6); box(9, 9, 1.6, 23, 23, 8, '#1b1b1b'); cyl(16, 16, 8, 14, 6.2, '#2b2b2b'); cyl(16, 16, 14, 14.3, 4.5, '#24406b'); header(4.6, 1.27, 9, 2.5); header(4.6, 30.73, 9, 2.5); break;
    case 'MPU6050 gyro (GY-521)':
      pcbM(21.2, 16.4, '#1f5fae'); holes([[2.5, 13.9], [18.7, 13.9]], 1.5, 1.6); box(8.6, 7, 1.6, 12.6, 11, 2.5, '#1d1d1d'); header(0.44, 1.27, 8, 2.5); break;
    case 'Piezo disc 27 mm':
      cyl(13.5, 13.5, 0, 0.2, 13.5, '#d4a83c'); cyl(13.5, 13.5, 0.2, 0.45, 10, '#e9eef3'); cyl(13.5, 13.5, 0.45, 0.5, 8.5, '#c9ccd1'); bar(13.5, 13.5, 13.5, -14, 0.8, 0.5, 1.3, '#d33'); bar(5, 13.5, 3, -14, 0.8, 0.2, 1, '#222'); break;
    case 'SW-420 vibration sensor':
      pcbM(32, 14, '#1f5fae'); holes([[28.5, 7]], 1.5, 1.6); add(new THREE.CylinderGeometry(2.5, 2.5, 9.5, 32), '#c9ccd1', 21, 7, 4.1, Math.PI / 2); box(10, 3, 1.6, 15, 7, 3, '#1d1d1d'); box(10, 8.5, 1.6, 16.5, 13, 7.5, '#2f6fd6'); header(-0.5, 4.46, 1, 2.5); header(-0.5, 7, 1, 2.5); header(-0.5, 9.54, 1, 2.5); break;
    case 'MAX4466 microphone':
      pcbM(20, 13.8, '#1d1f24'); cyl(13.5, 6.9, 1.6, 5.1, 4.85, '#c9ccd1'); cyl(13.5, 6.9, 5.1, 5.15, 4, '#222'); box(3, 8.5, 1.6, 7, 12.5, 4.2, '#2f6fd6'); header(2, 1.27, 3, 2.5); break;
    case 'LiPo 4S 1500 mAh':
      box(0, 0, 0, 75, 35, 37, '#20242a'); box(4, -0.1, 8, 71, 0.2, 29, '#ffcc00'); bar(75, 10, 95, 10, 2.4, 17, 19.5, '#d33'); bar(75, 14, 95, 14, 2.4, 17, 19.5, '#222'); box(95, 7.9, 14, 110.8, 16.1, 23, '#e3c21b'); bar(75, 25, 92, 30, 4.5, 30, 31.5, '#eee'); box(92, 26, 29, 99, 34, 33, '#f2f2f2'); break;
    case 'ESC 35 A':
      box(0, 0, 0, 50, 22, 7, '#3f68c9'); ['#d33', '#222'].forEach((c, i) => bar(0, 7 + i * 8, -25, 7 + i * 8, 3, 2, 5, c)); for (let i = 0; i < 3; i++) bar(50, 5 + i * 6, 70, 5 + i * 6, 2, 2.5, 4.5, '#3a3a3a'); bar(0, 11, -18, 11, 1.5, 4, 5, '#f2f2f2'); break;
    case 'ESC 4-in-1 30 × 30':
      pcbM(36, 36, '#1d1f24'); holes([[2.75, 2.75], [33.25, 2.75], [2.75, 33.25], [33.25, 33.25]], 1.6, 1.6); for (const [x, y] of [[8, 8], [28, 8], [8, 28], [28, 28]]) box(x - 3, y - 3, 1.6, x + 3, y + 3, 2.6, '#222'); cyl(18, 18, 1.6, 9, 4, '#3a3a3a'); box(14, -6, 0, 22, 2, 8, '#e3c21b'); break;
    case 'Flight controller F405 30 × 30':
      pcbM(36, 36, '#1d1f24'); holes([[2.75, 2.75], [33.25, 2.75], [2.75, 33.25], [33.25, 33.25]], 1.6, 1.6); box(14, 14, 1.6, 21, 21, 2.8, '#222'); box(24, 10, 1.6, 27, 13, 2.6, '#333'); box(-1, 15, 1.6, 6, 22, 4.6, '#c9ccd1'); add(new THREE.ConeGeometry(2, 3, 3), '#fff', 18, 30, 2.4); break;
    case 'Brushless motor 0802': bldcM(12, 8, 2); break;
    case 'Brushless motor 1404': bldcM(18, 15, 10); break;
    case 'Brushless motor 2207': bldcM(27.9, 18.9, 12); break;
    case 'Brushless motor 2306': bldcM(28.8, 18.4, 12); break;
    case 'Brushless motor 2212': bldcM(28, 26, 14); break;
    case 'Brushless motor 2814': bldcM(35, 30, 15); break;
    case 'Brushless motor 4114': bldcM(46, 26, 16); break;
    case 'Propeller 31 mm (Tiny Whoop)': prop(31, 4, 5, '#ff6a3d'); break;
    case 'Propeller 3 inch': prop(76.2, 3, 9, '#2f8bff'); break;
    case 'Propeller 5 inch': prop(127, 3, 13, '#ff6a3d'); break;
    case 'Propeller 10 inch': prop(254, 2, 22, '#1d1f24'); break;
    case 'Propeller 15 inch': prop(381, 2, 34, '#1d1f24'); break;
    case 'Drone frame Tiny Whoop 65 mm': frameM(4, 32.5, 6, 2, 26, '#2b2b2b', 16.5); break;
    case 'Drone frame 3-inch (130 mm)': frameM(4, 65, 9, 3, 32, '#1d1f24'); break;
    case 'Drone frame 5-inch (220 mm)': frameM(4, 110, 12, 5, 40, '#1d1f24'); break;
    case 'Drone frame F450': frameM(4, 225, 26, 6, 135, '#f2f2f2'); break;
    case 'Drone frame S550 hexacopter': frameM(6, 275, 26, 6, 160, '#1d1f24'); break;
    case 'Drone frame X8 octocopter': frameM(8, 500, 22, 6, 220, '#1d1f24'); break;
    case 'L298N motor driver':
      pcbM(43, 43, '#b3261e'); holes([[3, 3], [40, 3], [3, 40], [40, 40]], 1.5, 1.6); box(10, 22, 1.6, 33, 37, 27, '#2a2a2a'); box(13, 17, 1.6, 30, 22, 9, '#1d1d1d');
      for (const [x, y] of [[0, 8], [0, 18], [37, 8], [37, 18]]) box(x, y, 1.6, x + 6, y + 8, 12, '#2f6fd6'); box(14, 0, 1.6, 30, 6, 12, '#2f6fd6'); header(9, 40, 6, 6); cyl(8, 30, 1.6, 12, 4, '#1b1b1b'); break;
    case 'DC motor 130': box(0, 2.5, 0, 25, 17.5, 15, '#b9c0c8'); cyl(-2, 10, 6, 9, 3, '#e9ecef'); add(new THREE.CylinderGeometry(1, 1, 9, 16), '#cfd3d8', -4.5, 10, 7.5, Math.PI / 2); break;
    case 'DC motor 370': add(new THREE.CylinderGeometry(12.2, 12.2, 30, 48), '#b9c0c8', 15, 12.2, 12.2, Math.PI / 2); add(new THREE.CylinderGeometry(1, 1, 10, 16), '#cfd3d8', -5, 12.2, 12.2, Math.PI / 2); break;
    case 'DC motor 775': add(new THREE.CylinderGeometry(21, 21, 66, 48), '#b9c0c8', 33, 21, 21, Math.PI / 2); add(new THREE.CylinderGeometry(2.5, 2.5, 17, 16), '#cfd3d8', -8.5, 21, 21, Math.PI / 2); break;
    case 'TT gear motor 1:48': box(0, 0, 0, 37, 22.5, 18.8, '#f2c21b'); add(new THREE.CylinderGeometry(9.4, 9.4, 33, 40), '#e9ecef', 53.5, 11.25, 9.4, Math.PI / 2); add(new THREE.BoxGeometry(3.7, 5.4, 37), '#fff', 11, 11.25, 9.4, 0, Math.PI / 2, 0); break;
    case 'N20 gear motor': box(0, 0, 0, 15, 12, 10, '#c9ccd1'); box(15, 0, 0, 24, 12, 10, '#d4a83c'); add(new THREE.CylinderGeometry(1.5, 1.5, 9, 16), '#cfd3d8', 28.5, 6, 5, Math.PI / 2); break;
    case 'NEMA 17 stepper motor': box(0, 0, 0, 42.3, 42.3, 40, '#2a2d33'); box(0, 0, 8, 42.3, 42.3, 32, '#3a3d44'); cyl(21.15, 21.15, 40, 42, 11, '#c9ccd1'); cyl(21.15, 21.15, 42, 66, 2.5, '#d9dde2'); holes([[5.65, 5.65], [36.65, 5.65], [5.65, 36.65], [36.65, 36.65]], 1.5, 40); box(17, -6, 4, 25, 0, 10, '#f2f2f2'); break;
    case 'A4988 stepper driver': pcbM(20.3, 15.2, '#1d6b2e'); box(6.4, 4, 1.6, 13.9, 11.2, 2.5, '#222'); box(7, 4.5, 2.5, 13.3, 10.7, 3.6, '#c9ccd1'); header(0.27, 1.27, 8, 2.5); header(0.27, 13.97, 8, 2.5); cyl(4, 7.6, 1.6, 3, 1.8, '#c9a227'); break;
    case 'MG996R servo': box(6.9, 0, 0, 47.6, 19.7, 42.9, '#1d1f24'); box(0, 0, 28, 54.5, 19.7, 30.5, '#1d1f24'); cyl(16.8, 9.85, 42.9, 46, 6.2, '#1d1f24'); cyl(16.8, 9.85, 46, 50, 3, '#c9a227'); break;
    case 'FS90R continuous servo': box(4.85, 0, 0, 27.35, 12.2, 22.7, '#1d1f24'); box(0, 0, 15.9, 32.2, 12.2, 18.4, '#1d1f24'); cyl(10.8, 6.1, 22.7, 26.7, 5.9, '#1d1f24'); cyl(10.8, 6.1, 26.7, 29.7, 2.4, '#f2f2f2'); break;
    case 'Coin vibration motor': cyl(5, 5, 0, 2.7, 5, '#c9ccd1'); bar(5, 5, 5, -15, 0.6, 0.5, 1.1, '#d33'); bar(6.5, 5, 6.5, -15, 0.6, 0.5, 1.1, '#2f8bff'); break;
    case 'Mini water pump 5 V': add(new THREE.CylinderGeometry(12, 12, 38, 40), '#1d1f24', 19, 12, 12, Math.PI / 2); add(new THREE.CylinderGeometry(12, 12, 7, 40), '#f2f2f2', 41.5, 12, 12, Math.PI / 2); add(new THREE.CylinderGeometry(3.75, 3.75, 10, 20), '#f2f2f2', 41.5, 12, 26, 0, Math.PI / 2); break;
    case 'Fan 40 mm': { box(0, 0, 0, 40, 40, 1.5, '#2a2d33'); box(0, 0, 8.5, 40, 40, 10, '#2a2d33'); for (const [x, y] of [[0, 0], [37, 0], [0, 37], [37, 37]]) box(x, y, 0, x + 3, y + 3, 10, '#2a2d33'); cyl(20, 20, 1.5, 8.5, 7, '#1b1d22'); for (let i = 0; i < 7; i++) { const a = i * 2 * Math.PI / 7; add(new THREE.BoxGeometry(11, 5, 1), '#3a3d44', 20 + Math.cos(a) * 12, 20 + Math.sin(a) * 12, 5, a, 0.5); } holes([[4, 4], [36, 4], [4, 36], [36, 36]], 1.7, 10); break; }
    case 'Push solenoid 12 V': box(0, 0, 0, 30, 16, 14, '#c9ccd1'); box(4, 1.5, 1.5, 26, 14.5, 12.5, '#b87333'); add(new THREE.CylinderGeometry(3, 3, 42, 24), '#d9dde2', 15, 8, 7, Math.PI / 2); break;
    case 'Oscilloscope': box(0, 0, 0, 310, 130, 150, '#d9dde3'); box(12, -0.5, 25, 190, 0.5, 135, '#0a1a12'); for (let i = 0; i < 12; i++) cyl(210 + (i % 4) * 24, -2, 40 + Math.floor(i / 4) * 30, 45 + Math.floor(i / 4) * 30, 7, '#555').rotation.set(0, 0, 0); for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(4, 4, 10, 16), '#c9a227', 215 + i * 22, -5, 18); break;
    case 'Function generator': box(0, 0, 0, 230, 100, 260, '#d9dde3'); box(12, -0.5, 150, 140, 0.5, 220, '#132015'); for (let i = 0; i < 8; i++) box(12 + (i % 4) * 32, -3, 60 + Math.floor(i / 4) * 40, 36 + (i % 4) * 32, 0, 85 + Math.floor(i / 4) * 40, '#9aa0a7'); add(new THREE.CylinderGeometry(14, 14, 10, 32), '#555', 185, -5, 190); add(new THREE.CylinderGeometry(5, 5, 10, 16), '#c9a227', 185, -5, 60); break;
    case 'Logic probe': add(new THREE.CylinderGeometry(9, 7, 120, 32), '#1f5fae', 60, 9, 9, Math.PI / 2); add(new THREE.ConeGeometry(4, 20, 16), '#c9ccd1', 130, 9, 9, -Math.PI / 2); for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(2.4, 16, 12), ['#ff3b30', '#30d158', '#ffd60a'][i], 20 + i * 10, 9, 17.5); break;
    case 'Digital multimeter': box(0, 0, 0, 90, 180, 45, '#f2b705'); box(8, 110, 45, 82, 165, 46, '#c7d6a3'); cyl(45, 70, 45, 52, 22, '#2a2a2a'); for (let i = 0; i < 4; i++) cyl(15 + i * 20, 18, 45, 50, 4, ['#222', '#d33', '#d33', '#d33'][i]); break;
    case 'Bench power supply': box(0, 0, 0, 160, 260, 110, '#2a2d33'); box(10, -0.5, 55, 150, 0.5, 100, '#132015'); for (let i = 0; i < 2; i++) add(new THREE.CylinderGeometry(9, 9, 8, 32), '#c9ccd1', 40 + i * 80, -4, 35); for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(5, 5, 12, 16), ['#d33', '#222', '#30d158'][i], 40 + i * 40, -6, 12); break;
    case 'Coreless motor 8520': add(new THREE.CylinderGeometry(4.25, 4.25, 20, 32), '#c9ccd1', 10, 4.25, 4.25, Math.PI / 2); break;
    default: { const X = X3D[model]; if (X) buildX(X, { add, box, cyl, holes, header, bar, pcbM, tube }); else if (PL3D[model]) buildPkg(PL3D[model], { add, box, cyl, bar }); }
  }
}
/* generic models for the parts in parts-extra.js */
const X3D = {};
const X3D_GROUP = { Power: 'Power', Sensors: 'Sensors', Drone: 'Drone', 'Motors and outputs': 'Motors' };
function buildX(X, T) {
  const { add, box, cyl, holes, header, bar, pcbM, tube } = T; const w = X.w, d = X.d, c = X.col || '#1f5fae';
  const el = (e, cx, cy, z) => { switch (e) {
    case 'can': cyl(cx, cy, z, z + 9, 9.5, '#c9ccd1'); cyl(cx, cy, z + 9, z + 9.3, 7.5, '#8d949c'); break;
    case 'irled': case 'irpair': cyl(cx - 3, cy, z, z + 6, 2.5, '#e9ecef'); cyl(cx + 3, cy, z, z + 6, 2.5, '#1b1b1b'); break;
    case 'mic': cyl(cx, cy, z, z + 5, 4.9, '#c9ccd1'); cyl(cx, cy, z + 5, z + 5.1, 4, '#222'); break;
    case 'ldr': cyl(cx, cy, z, z + 2, 2.5, '#f1e3c6'); break;
    case 'to92': box(cx - 2, cy - 1.5, z, cx + 2, cy + 1.5, z + 4.5, '#1f1f1f'); break;
    case 'chip': box(cx - 2.5, cy - 2.5, z, cx + 2.5, cy + 2.5, z + 1, '#1d1d1d'); break;
    case 'bead': cyl(cx, cy, z + 3, z + 5, 1.4, '#3b2a1a'); break;
    case 'patch': box(cx - 12.5, cy - 12.5, z, cx + 12.5, cy + 12.5, z + 4, '#c9a227'); box(cx - 9, cy - 9, z + 4, cx + 9, cy + 9, z + 4.3, '#e3c86b'); break;
    case 'antenna': bar(cx - 6, cy, cx + 30, cy, 1, z, z + 1, '#222'); break;
    case 'sma': add(new THREE.CylinderGeometry(3, 3, 10, 24), '#c9a227', cx, cy - 5, z + 3); add(new THREE.CylinderGeometry(4, 4, 40, 24), '#1b1b1b', cx, cy - 30, z + 3); break;
    case 'lens': box(cx - 6, cy - 6, z, cx + 6, cy + 6, z + 5, '#1b1b1b'); cyl(cx, cy, z + 5, z + 10, 4.5, '#2b2b2b'); cyl(cx, cy, z + 10, z + 10.2, 3, '#24406b'); break;
    case 'grille': break;
    case 'leds': for (let i = 0; i < 8; i++) box(2 + i * 6.2, d / 2 - 2.5, z, 7 + i * 6.2, d / 2 + 2.5, z + 1.6, '#f6f6f6'); break;
    case 'coil': box(cx - 6, cy - 6, z, cx + 6, cy + 6, z + 7, '#3a3a3a'); break;
    case 'coin': cyl(cx, cy, z, z + 4, 10, '#1d1d1d'); cyl(cx, cy, z + 4, z + 7.2, 10, '#c9ccd1'); break;
    case 'sd': box(cx - 8, cy - 7, z, cx + 8, cy + 7, z + 2, '#c9ccd1'); break;
    case 'terminal': box(cx - 5, cy - 4, z, cx + 5, cy + 4, z + 9, '#2f6fd6'); break;
    case 'usb': box(cx - 4.5, -1, z, cx + 4.5, 6, z + 3.2, '#c9ccd1'); break;
    case 'pads': for (let i = 0; i < 4; i++) box(4 + i * 8, 2, z, 9 + i * 8, 8, z + 0.3, '#d4a83c'); break;
    case 'slider': box(cx - 30, cy - 2, z, cx + 30, cy + 2, z + 6, '#555'); box(cx - 3, cy - 5, z + 6, cx + 3, cy + 5, z + 15, '#e9ecef'); break;
    case 'bnc': cyl(cx, cy, z, z + 10, 4.5, '#c9ccd1'); break;
    case 'traces': for (let i = 0; i < 4; i++) box(3, 3 + i * 3, z, w - 3, 4 + i * 3, z + 0.1, '#d4a83c'); break;
    case 'pad': cyl(cx, cy, z, z + 0.2, 6, '#f6f6f6'); break;
    default: break; } };
  switch (X.shape) {
    case 'cell': { const r = w / 2; add(new THREE.CylinderGeometry(r, r, d - 1.5, 40), c, r, d / 2, r); add(new THREE.CylinderGeometry(r * 1.002, r * 1.002, d * 0.22, 40), X.band || '#d4a83c', r, d * 0.85, r); add(new THREE.CylinderGeometry(r * 0.35, r * 0.35, 1.5, 24), '#c9ccd1', r, d - 0.4, r); break; }
    case 'coin': cyl(w / 2, w / 2, 0, X.h || 3.2, w / 2, c); cyl(w / 2, w / 2, (X.h || 3.2), (X.h || 3.2) + 0.1, w / 2 * 0.8, '#b9bec6'); break;
    case 'pack': { const n = X.n || 2, r = Math.min(w / n, 19) / 2; for (let i = 0; i < n; i++) add(new THREE.CylinderGeometry(r, r, d - 2, 32), c, r + i * 2 * r, d / 2, r); box(0, -2, 0, n * 2 * r, 0, 2 * r, '#3a3a3a'); bar(r, -2, r, -18, 1.6, r, r + 1.6, '#d33'); bar(3 * r, -2, 3 * r, -18, 1.6, r, r + 1.6, '#222'); break; }
    case 'holder': { const n = X.n || 2; box(0, 0, 0, w, d, 2, c); for (let i = 0; i < n; i++) { box(i * w / n, 0, 0, i * w / n + 1.2, d, 15, c); add(new THREE.CylinderGeometry(7.2, 7.2, 50, 32), '#2b2f36', (i + 0.5) * w / n, d / 2, 8.5); } box(-0.5, 0, 0, 0.7, d, 15, c); bar(w / 2 - 3, 0, w / 2 - 3, -20, 1.4, 1, 2.4, '#d33'); bar(w / 2 + 3, 0, w / 2 + 3, -20, 1.4, 1, 2.4, '#222'); break; }
    case 'box': box(0, 0, 0, w, d, X.h || 20, c); if (X.top) box(0, 0, (X.h || 20), w, d, (X.h || 20) + 1, X.top); break;
    case 'solar': box(0, 0, 0, w, d, X.h || 3, '#d9dde2'); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) box(2 + i * (w - 4) / 6, 2 + j * (d - 4) / 3, X.h || 3, 1 + (i + 1) * (w - 4) / 6, 1 + (j + 1) * (d - 4) / 3, (X.h || 3) + 0.2, '#24406b'); break;
    case 'lipo': box(0, 0, 0, w, d, X.h || 20, c); box(3, -0.1, 2, w - 3, 0.2, (X.h || 20) - 2, '#ffcc00'); bar(w, d * 0.3, w + 20, d * 0.3, 2.2, 3, 5, '#d33'); bar(w, d * 0.5, w + 20, d * 0.5, 2.2, 3, 5, '#222'); box(w + 20, d * 0.2, 1, w + 36, d * 0.6, 9, '#e3c21b'); break;
    case 'fork': pcbM(w, d * 0.35, c); box(2, d * 0.35, 0, w * 0.38, d, 1.6, c); box(w * 0.62, d * 0.35, 0, w - 2, d, 1.6, c); box(3, d * 0.4, 1.6, w * 0.36, d - 2, 1.7, '#d4a83c'); box(w * 0.64, d * 0.4, 1.6, w - 3, d - 2, 1.7, '#d4a83c'); header(w / 2 - 2.5, 1.3, 2, 2.5); break;
    case 'plate': pcbM(w, d, c); for (let i = 0; i < 8; i++) box(3, 3 + i * (d - 6) / 8, 1.6, w - 3, 4.2 + i * (d - 6) / 8, 1.7, '#d4a83c'); break;
    case 'sharp': box(0, 0, 0, w, d, 13.5, c); cyl(w * 0.3, d / 2, 13.5, 16, 4.5, '#2a2a2a'); cyl(w * 0.7, d / 2, 13.5, 16, 4.5, '#2a2a2a'); box(w / 2 - 4, d - 2, 0, w / 2 + 4, d + 4, 5, '#f2f2f2'); break;
    case 'disc': cyl(w / 2, d / 2, 0, 3, w / 2, c); cyl(w / 2, d / 2, 3, 3.5, w / 2 * 0.55, '#f2f2f2'); break;
    case 'fsr': cyl(w / 2, w / 2, 0, 0.4, w / 2, c); box(w / 2 - 3, w, 0, w / 2 + 3, d, 0.4, '#d4a83c'); break;
    case 'strip': box(0, 0, 0, w, d, 0.5, c); box(w * 0.2, d - 8, 0.5, w * 0.8, d, 2, '#1d1d1d'); break;
    case 'probe': add(new THREE.CylinderGeometry(w / 2, w / 2, d, 24), '#c9ccd1', w / 2, d / 2, w / 2); bar(w / 2, d, w / 2, d + 60, 4, 0, 4, '#1d1d1d'); break;
    case 'puck': cyl(w / 2, d / 2, 0, 15, w / 2, c); cyl(w / 2, d / 2, 15, 15.5, w / 2 * 0.6, '#3a3a3a'); add(new THREE.ConeGeometry(4, 5, 3), '#f2f2f2', w / 2, d / 2, 17); break;
    case 'cam': box(0, 0, 0, w, d, 19, c); cyl(w / 2, d / 2, 19, 26, 6, '#2b2b2b'); cyl(w / 2, d / 2, 26, 26.3, 4, '#24406b'); break;
    case 'servo': box(0, 0, 0, w * 0.72, d, d * 1.85, c); box(-w * 0.14, 0, d * 1.25, w * 0.86, d, d * 1.4, c); cyl(w * 0.22, d / 2, d * 1.85, d * 2.2, d * 0.35, '#e9edf2'); break;
    case 'limit': box(0, 0, 0, w, d * 0.6, 10, c); bar(2, d * 0.3, w + 4, d * 0.3 + 6, 4, 10, 11, '#c9ccd1'); break;
    case 'actuator': add(new THREE.CylinderGeometry(d * 0.45, d * 0.45, w * 0.6, 32), c, w * 0.3, d / 2, d / 2, Math.PI / 2); add(new THREE.CylinderGeometry(d * 0.18, d * 0.18, w * 0.4, 24), '#e9ecef', w * 0.8, d / 2, d / 2, Math.PI / 2); box(0, d * 0.1, d * 0.9, w * 0.25, d * 0.9, d * 1.35, '#2a2d33'); break;
    case 'can': add(new THREE.CylinderGeometry(d / 2, d / 2, w * 0.85, 32), c, w * 0.45, d / 2, d / 2, Math.PI / 2); add(new THREE.CylinderGeometry(1.2, 1.2, w * 0.15, 16), '#b9bec6', w * 0.92, d / 2, d / 2, Math.PI / 2); break;
    case 'ttmotor': box(0, 0, 0, 37, d, 19, '#f2c21b'); add(new THREE.CylinderGeometry(9.5, 9.5, 33, 32), '#c9ccd1', 53.5, d / 2, 9.5, Math.PI / 2); add(new THREE.CylinderGeometry(2.7, 2.7, 37, 16), '#f2f2f2', 11, d / 2, 9.5); break;
    case 'gearmotor': add(new THREE.CylinderGeometry(d / 2, d / 2, w * 0.55, 32), '#c9ccd1', w * 0.45, d / 2, d / 2, Math.PI / 2); add(new THREE.CylinderGeometry(d / 2, d / 2, w * 0.3, 32), '#d4a83c', w * 0.12 + 1, d / 2, d / 2, Math.PI / 2); add(new THREE.CylinderGeometry(2, 2, 10, 16), '#b9bec6', -4, d / 2, d / 2, Math.PI / 2); break;
    default: { // module board with its main part
      pcbM(w, d, c); if (w > 20 && d > 12) holes([[2.5, d - 2.5], [w - 2.5, d - 2.5]], 1.4, 1.6); el(X.el, w / 2, d / 2 + 1, 1.6); header(w / 2 - (Math.min(8, Math.max(2, Math.round(w / 2.54) - 2)) * 2.54) / 2, 1.3, Math.min(8, Math.max(2, Math.round(w / 2.54) - 2)), 2.5); }
  }
}
if (BBX) for (const e of BBX.LIST) { const m = e.m3d; if (!m || !m.name || BOARDS[m.name]) continue; X3D[m.name] = m; BOARDS[m.name] = { w: m.w, d: m.d, g: X3D_GROUP[e.group] || 'Modules', note: e.name } }

/* 3D models of the parts catalog (parts-lib.js), drawn from each package's real size (mm, z up, seated at z = 0) */
const PL3D = {};
function buildPkg(e, T) {
  const { add, box, cyl, bar } = T; const s = e.spec, n = e.pins.length; const [W, D, H0] = e.dims; const H = H0 || 1.5; const c = e.color || '#222';
  const LEAD = '#c9ccd1', GOLD = '#d4af37', TIN = '#b9bec6', MARK = '#e9e9e9';
  const leg = (x, y, z1, z2, w = 0.5, t = 0.25) => box(x - w / 2, y - t / 2, z1, x + w / 2, y + t / 2, z2, LEAD);
  const wire = (x, y, z1, z2, r = 0.3, col = LEAD) => cyl(x, y, z1, z2, r, col);
  const dot = (x, y, z, r = 0.4) => cyl(x, y, z, z + 0.05, r, MARK);
  const hcyl = (x1, x2, y, z, r, col, seg = 32) => add(new THREE.CylinderGeometry(r, r, x2 - x1, seg), col, (x1 + x2) / 2, y, z, Math.PI / 2);
  switch (s.kind) {
    case 'dip': case 'xodip': {
      if (s.kind === 'xodip') { box(0, 0, 0.6, W, D, 0.6 + H, TIN); box(0.3, 0.3, 0.6 + H, W - 0.3, D - 0.3, 0.7 + H, '#d9dde2'); const xs = [(W - s.len) / 2, (W + s.len) / 2]; const ys = [(D - s.row) / 2, (D + s.row) / 2]; for (const x of xs) for (const y of ys) wire(x, y, -3.2, 0.6, 0.25); break; }
      const h = n / 2, x0 = (W - (h - 1) * 2.54) / 2, y1 = (D - s.row) / 2, y2 = (D + s.row) / 2; box(0, 0, 0.5, W, D, 0.5 + H, c);
      add(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 24, 1, false, 0, Math.PI), '#111', 0, D / 2, 0.45 + H, -Math.PI / 2, Math.PI / 2); dot(1.6, 1.4, 0.5 + H, 0.45);
      for (let i = 0; i < h; i++) { const x = x0 + i * 2.54; for (const y of [y1, y2]) { box(x - 0.75, Math.min(y, y === y1 ? 0 : D), 1.1, x + 0.75, Math.max(y, y === y1 ? 0 : D), 1.35, LEAD); leg(x, y, -3.2, 1.35, 0.5, 0.25); box(x - 0.75, y - 0.13, 0.2, x + 0.75, y + 0.13, 1.35, LEAD); } }
      break; }
    case 'sip': { const x0 = (W - (n - 1) * 2.54) / 2; box(0, 0, 1, W, D, 1 + H, c); for (let i = 0; i < n; i++) leg(x0 + i * 2.54, D / 2, -3.2, 1); dot(1, 0, 1 + H * 0.8, 0.5).rotation.x = Math.PI / 2; break; }
    case 'gull': { const h = n / 2, p = s.pitch, sp = s.span || D + 2; box(-W / 2, -D / 2, 0.1, W / 2, D / 2, H, c); dot(-W / 2 + 0.6, -D / 2 + 0.6, H, Math.min(0.35, D / 8));
      for (let i = 0; i < h; i++) { const x = -(h - 1) * p / 2 + i * p; for (const sg of [-1, 1]) { box(x - p * 0.2, sg < 0 ? -sp / 2 : D / 2, 0, x + p * 0.2, sg < 0 ? -D / 2 : sp / 2, 0.15, LEAD); box(x - p * 0.2, sg < 0 ? -D / 2 - 0.3 : D / 2, 0, x + p * 0.2, sg < 0 ? -D / 2 : D / 2 + 0.3, H * 0.5, LEAD); } } break; }
    case 'quad': case 'qfn': { const side = Math.ceil(n / 4), p = s.pitch, b = s.body || W; const off = (side - 1) * p / 2; const qf = s.kind === 'quad';
      box(-b / 2, -b / 2, qf ? 0.1 : 0, b / 2, b / 2, H, c); dot(-b / 2 + Math.max(0.5, b * 0.08), -b / 2 + Math.max(0.5, b * 0.08), H, Math.max(0.2, b * 0.03));
      const ext = qf ? W / 2 : b / 2 + 0.02, inn = qf ? b / 2 : b / 2 - 0.4, z2 = qf ? 0.15 : 0.2;
      for (let i = 0; i < side; i++) { const t = -off + i * p, a = p * 0.22; box(-ext, t - a, 0, -inn, t + a, z2, LEAD); box(inn, t - a, 0, ext, t + a, z2, LEAD); box(t - a, -ext, 0, t + a, -inn, z2, LEAD); box(t - a, inn, 0, t + a, ext, z2, LEAD); }
      break; }
    case 'dfn': case 'lga': { box(-W / 2, -D / 2, 0, W / 2, D / 2, H, c); dot(-W / 2 + 0.3, -D / 2 + 0.3, H, 0.15); if (s.kind === 'dfn') { const h = n / 2; for (let i = 0; i < h; i++) { const y = -(h - 1) * s.pitch / 2 + i * s.pitch; box(-W / 2 - 0.01, y - 0.12, 0, -W / 2 + 0.4, y + 0.12, 0.2, LEAD); box(W / 2 - 0.4, y - 0.12, 0, W / 2 + 0.01, y + 0.12, 0.2, LEAD); } } break; }
    case 'bga': { box(-W / 2, -D / 2, 0.35, W / 2, D / 2, 0.35 + Math.max(0.3, H - 0.65), '#2e6b3a'); box(-W / 2 + 0.4, -D / 2 + 0.4, 0.35 + Math.max(0.3, H - 0.65), W / 2 - 0.4, D / 2 - 0.4, Math.max(H, 1), c); dot(-W / 2 + 1, -D / 2 + 1, Math.max(H, 1), 0.4);
      const k = s.cols, p = s.pitch, rows = Math.ceil(n / k); const g = new THREE.SphereGeometry(p * 0.25, 10, 8); const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: TIN, roughness: 0.4, metalness: 0.5 }), n); const m4 = new THREE.Matrix4(); let q = 0;
      for (let r = 0; r < rows; r++) for (let j = 0; j < k && q < n; j++, q++) { m4.makeTranslation((j - (k - 1) / 2) * p, (r - (rows - 1) / 2) * p, p * 0.25); mesh.setMatrixAt(q, m4); } add(new THREE.BufferGeometry(), c, 0, 0, 0).parent.add(mesh); break; }
    case 'pga': { box(0, 0, 3, W, D, 3 + H, '#c8b98a'); box(W * 0.25, D * 0.25, 3 + H, W * 0.75, D * 0.75, 3.4 + H, TIN); let k = 4; while (4 * (k - 1) + Math.max(0, 4 * (k - 3)) < n) k++; const p = 2.54, o = (W - (k - 1) * p) / 2; let q = 0;
      for (let r = 0; r < k && q < n; r++) for (let j = 0; j < k && q < n; j++) { if (r > 1 && r < k - 2 && j > 1 && j < k - 2) continue; wire(o + j * p, o + r * p, 0, 3, 0.23, GOLD); q++; } break; }
    case 'sot': case 'sot223': case 'dpak': { box(-W / 2, -D / 2, 0.05, W / 2, D / 2, H, c); dot(-W / 2 + 0.35, -D / 2 + 0.35, H, Math.min(0.25, D / 6));
      if (s.kind === 'sot' && n === 3) { for (const [x, y] of [[-0.95, 1], [0.95, 1], [0, -1]]) box(x - 0.2, y > 0 ? D / 2 : -D / 2 - 0.5, 0, x + 0.2, y > 0 ? D / 2 + 0.5 : -D / 2, 0.12, LEAD); }
      else if (s.kind === 'sot') { const bot = Math.ceil(n / 2), top = n - bot; for (let i = 0; i < bot; i++) { const x = (i - (bot - 1) / 2) * s.pitch; box(x - 0.2, D / 2, 0, x + 0.2, D / 2 + 0.5, 0.12, LEAD); } for (let i = 0; i < top; i++) { const x = ((top - 1) / 2 - i) * s.pitch * (top === 2 ? 2 : 1); box(x - 0.2, -D / 2 - 0.5, 0, x + 0.2, -D / 2, 0.12, LEAD); } }
      else { for (let i = 0; i < 3; i++) if (!(s.kind === 'dpak' && i === 1)) { const x = (i - 1) * s.pitch; box(x - 0.4, D / 2, 0, x + 0.4, D / 2 + 1.6, 0.25, LEAD); } box(-W * 0.4, -D / 2 - 0.9, 0, W * 0.4, -D / 2 + 0.6, 0.5, TIN); } break; }
    case 'chip2': { const cap = Math.max(0.12, W * 0.18); box(-W / 2 + cap, -D / 2, 0, W / 2 - cap, D / 2, H, c); box(-W / 2, -D / 2, 0, -W / 2 + cap, D / 2, H, TIN); box(W / 2 - cap, -D / 2, 0, W / 2, D / 2, H, TIN); break; }
    case 'can4': { box(-W / 2, -D / 2, 0, W / 2, D / 2, H * 0.35, '#e6dcc2'); box(-W / 2 + 0.1, -D / 2 + 0.1, H * 0.35, W / 2 - 0.1, D / 2 - 0.1, H, TIN); for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(x * W / 2 - (x > 0 ? 0.8 : 0), y * D / 4 - 0.35, -0.01, x * W / 2 + (x < 0 ? 0.8 : 0), y * D / 4 + 0.35, 0.05, GOLD); break; }
    case 'cansmd': { box(-W / 2, -D / 2, 0, W / 2, D / 2, 1, '#222'); cyl(0, 0, 1, H, W * 0.47, TIN); cyl(0, 0, H, H + 0.02, W * 0.3, '#1d1d1d'); box(-W / 2 - 0.5, -0.4, 0, -W / 2 + 1, 0.4, 0.2, LEAD); box(W / 2 - 1, -0.4, 0, W / 2 + 0.5, 0.4, 0.2, LEAD); break; }
    case 'smdind': { box(-W / 2, -D / 2, 0, W / 2, D / 2, H, '#3a3a3a'); cyl(0, 0, H, H + 0.02, Math.min(W, D) * 0.38, '#b87333'); box(-W / 2 - 0.2, -1, 0, -W / 2 + 1.2, 1, 0.2, LEAD); box(W / 2 - 1.2, -1, 0, W / 2 + 0.2, 1, 0.2, LEAD); break; }
    case 'xtalsmd': { box(-W / 2, -D / 2, 0, W / 2, D / 2, 0.6, '#222'); box(-W / 2 + 0.6, -D / 2 + 0.2, 0.6, W / 2 - 0.6, D / 2 - 0.2, H, TIN); box(-W / 2 - 0.2, -0.7, 0, -W / 2 + 1.5, 0.7, 0.2, LEAD); box(W / 2 - 1.5, -0.7, 0, W / 2 + 0.2, 0.7, 0.2, LEAD); break; }
    case 'axial': case 'fuse': {
      if (s.kind === 'fuse') { box(0, 0, 0, W, D, 3, '#1d1d1d'); for (const x of [2, W - 7]) box(x, 1, 3, x + 5, D - 1, 8, LEAD); const r = 2.5; hcyl(3, W - 3, D / 2, 6, r, '#cfe3ea'); hcyl(3, 8, D / 2, 6, r + 0.1, TIN); hcyl(W - 8, W - 3, D / 2, 6, r + 0.1, TIN); hcyl(8, W - 8, D / 2, 6, 0.15, '#999'); break; }
      const L = s.lead || 10.16, [bw, bh] = s.body || [W, D]; const r = bh / 2, z = r + 0.6;
      hcyl(0, L, 0, z, 0.3, LEAD, 12); hcyl((L - bw) / 2, (L + bw) / 2, 0, z, r, c); wire(0, 0, -3.2, z, 0.3); wire(L, 0, -3.2, z, 0.3);
      if (e.grp === 'Diodes' || /diode|rectifier/i.test(e.name)) hcyl((L - bw) / 2 + bw * 0.12, (L - bw) / 2 + bw * 0.22, 0, z, r * 1.02, '#e9e9e9');
      else if (/resistor/i.test(e.name)) ['#a0522d', '#111', '#d33', '#d4af37'].forEach((b, i) => hcyl((L - bw) / 2 + bw * (0.18 + i * 0.17), (L - bw) / 2 + bw * (0.26 + i * 0.17), 0, z, r * 1.03, b));
      break; }
    case 'radial': case 'drum': { const r = W / 2, p = s.pitch || 2.54; cyl(p / 2, 0, 0.4, H, r, c); if (s.kind === 'radial') { cyl(p / 2, 0, H - 0.01, H + 0.02, r * 0.85, TIN); add(new THREE.BoxGeometry(r * 0.5, 0.05, H * 0.9), '#e9e9e9', p / 2 - r * 0.5, -r * 0.87, H / 2 + 0.3, -0.5); } else { cyl(p / 2, 0, 0.4, 1.4, r * 1.05, '#2a2a2a'); cyl(p / 2, 0, H - 1, H, r * 1.05, '#2a2a2a'); cyl(p / 2, 0, 1.4, H - 1, r * 0.8, '#b87333'); }
      wire(0, 0, -3.2, 0.4, 0.3); wire(p, 0, -3.2, 0.4, 0.3); break; }
    case 'disc': { const p = s.pitch || 5; const g = new THREE.CylinderGeometry(W / 2, W / 2, D, 40); add(g, c, p / 2, 0, H - W / 2, 0, 0, 0); wire(0, 0, -3.2, H - W * 0.6, 0.3); wire(p, 0, -3.2, H - W * 0.6, 0.3); break; }
    case 'drop': { const p = s.pitch || 2.54; const m = add(new THREE.SphereGeometry(W / 2, 24, 16), c, p / 2, 0, H - W / 2); m.scale.set(1, D / W, (H - 1) / W); wire(0, 0, -3.2, 1.5, 0.25); wire(p, 0, -3.2, 1.5, 0.25); break; }
    case 'coincap': { cyl(W / 2, D / 2, 0.5, H, W / 2, '#1d1d1d'); cyl(W / 2, D / 2, H - 0.5, H, W / 2 * 0.95, TIN); wire(0.5, D / 2, -3.2, 1, 0.4); wire(W - 0.5, D / 2, -3.2, 1, 0.4); break; }
    case 'aircoil': { const r = D / 2, turns = 6; for (let i = 0; i < turns; i++) add(new THREE.TorusGeometry(r, 0.35, 8, 24), '#b87333', 1 + i * (W - 2) / (turns - 1), 0, r + 1, 0, 0, Math.PI / 2); wire(0, 0, -3.2, r + 1, 0.35, '#b87333'); wire(W, 0, -3.2, r + 1, 0.35, '#b87333'); break; }
    case 'toroid': { const R = W / 2; add(new THREE.TorusGeometry(R * 0.7, R * 0.3, 16, 40), '#3a3a3a', R, R, R * 0.3 + 0.5); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 1.7; add(new THREE.TorusGeometry(R * 0.32, 0.25, 6, 16), '#b87333', R + Math.cos(a) * R * 0.7, R + Math.sin(a) * R * 0.7, R * 0.3 + 0.5, a, Math.PI / 2, 0); } wire(R - 5, R, -3.2, 1, 0.5, '#b87333'); wire(R + 5, R, -3.2, 1, 0.5, '#b87333'); break; }
    case 'xfmr': { box(0, D * 0.15, 0, W, D * 0.85, H, '#5a5f66'); box(W * 0.2, 0, H * 0.15, W * 0.8, D, H * 0.85, '#2a2a2a'); box(W * 0.25, -0.1, H * 0.25, W * 0.75, D + 0.1, H * 0.75, '#d9a441'); for (let i = 0; i < n; i++) wire(W * 0.25 + (i % 2) * W * 0.5, i < 2 ? 2 : D - 2, -3.5, 0.1, 0.5); break; }
    case 'xtal': { const p = s.pitch || 4.88; const m = box(-W / 2, -D / 2, 0.5, W / 2, D / 2, 0.5 + H, TIN); m.position.x += p / 2; box(-W / 2 + p / 2 - 0.3, -D / 2 - 0.3, 0.4, W / 2 + p / 2 + 0.3, D / 2 + 0.3, 0.8, '#d9dde2'); wire(0, 0, -3.2, 0.5, 0.22); wire(p, 0, -3.2, 0.5, 0.22); break; }
    case 'axialv': { cyl(0, 0, 0.5, H, W / 2, TIN); wire(-0.35, 0, -3.2, 0.5, 0.12); wire(0.35, 0, -3.2, 0.5, 0.12); break; }
    case 'pot': { const p = s.pitch || 5.08; if (W >= 12) { add(new THREE.CylinderGeometry(W / 2, W / 2, 7, 40), '#2a2d33', p, 4, W / 2 + 1, 0, Math.PI / 2, 0); add(new THREE.CylinderGeometry(3.5, 3.5, 7, 24), TIN, p, -2, W / 2 + 1, 0, Math.PI / 2, 0); add(new THREE.CylinderGeometry(3, 3, Math.max(8, H - 14), 24), '#c9ccd1', p, -6 - Math.max(8, H - 14) / 2, W / 2 + 1, 0, Math.PI / 2, 0); }
      else { box(p - W / 2, -D / 2, 0.5, p + W / 2, D / 2, H, '#2d63c9'); cyl(p, 0, H, H + 0.5, W * 0.3, '#f2f2f2'); } for (let i = 0; i < 3; i++) wire(i * p, 0, -3.2, 1.5, 0.35); break; }
    case 'to92': { const r = W / 2; const g = new THREE.CylinderGeometry(r, r, H, 32, 1, false, -Math.PI / 2, Math.PI); add(g, c, 2.54, 0.2, 2.5 + H / 2, 0, Math.PI / 2, 0); for (let i = 0; i < n; i++) leg(i * (s.pitch || 2.54), 0, -3.2, 2.5, 0.45, 0.4); break; }
    case 'tocan': { const r = W / 2; cyl(0, 0, 1, 1 + H, r * 0.92, TIN); cyl(0, 0, 1, 1.4, r * 1.05, TIN); cyl(0, 0, 1 + H, 1.05 + H, r * 0.35, '#2a2a2a'); add(new THREE.BoxGeometry(0.8, 0.8, 0.4), TIN, r, 0, 1.2); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; wire(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, -3.2, 1, 0.22); } break; }
    case 'to220': case 'to247': { const big = s.kind === 'to247'; const bodyH = big ? 20 : 9, tabH = big ? 0 : 6.5, th = big ? 5 : 4.5, p = s.pitch || 2.54; const x0 = p * (n - 1) / 2;
      box(x0 - W / 2, 0, 3, x0 + W / 2, th, 3 + bodyH, c); if (!big) { box(x0 - W / 2, th - 1.3, 3 + bodyH, x0 + W / 2, th, 3 + bodyH + tabH, TIN); add(new THREE.CylinderGeometry(1.8, 1.8, 1.4, 24), '#111', x0, th - 0.65, 3 + bodyH + 3); }
      else { add(new THREE.CylinderGeometry(1.8, 1.8, th + 0.2, 24), '#111', x0, th / 2, 3 + bodyH - 4.5); box(x0 - W / 2, th - 0.6, 3, x0 + W / 2, th, 3 + bodyH, TIN); }
      for (let i = 0; i < n; i++) leg(i * p, th / 2, -3.2, 3, big ? 1.2 : 0.8, 0.45); break; }
    case 'chassis': { box(0, 0, 0, W, D, H, c); cyl(W / 2, D / 2, H - 0.1, H + 0.02, 2.6, '#111'); for (const [x, y] of [[3, 3], [W - 3, 3], [3, D - 3], [W - 3, D - 3]]) box(x - 3.2, y - 0.4, H, x + 3.2, y + 0.4, H + 8, TIN); break; }
    case 'relay': { box(0, 0, 0.5, W, D, H, c); const pts = [[1.5, 1.5], [1.5, D - 1.5], [W - 3.5, D / 2 - 3.5], [W - 3.5, D / 2 + 3.5], [W - 1.5, D / 2]]; pts.slice(0, n).forEach(([x, y]) => leg(x, y, -3.2, 0.5, 0.7, 0.4)); break; }
    case 'din': { box(0, 0, 0, W, D, H * 0.6, c); box(W * 0.1, D * 0.2, H * 0.6, W * 0.9, D * 0.8, H, c); box(W * 0.25, D * 0.35, H, W * 0.75, D * 0.65, H + 0.3, '#f2f2f2'); for (let i = 0; i < Math.min(n, 8); i++) { const top = i < Math.ceil(n / 2), k = top ? i : i - Math.ceil(n / 2); cyl(W * (0.15 + k * 0.7 / Math.max(1, Math.ceil(n / 2) - 1)), top ? 4 : D - 4, H * 0.6, H * 0.6 + 0.4, 2, TIN); } box(-0.5, D * 0.45, 0, W + 0.5, D * 0.55, 3, '#555'); break; }
    case 'card': { const g = new THREE.Shape(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, D * 0.7); g.lineTo(W * 0.85, D * 0.8); g.lineTo(W * 0.85, D); g.lineTo(0, D); g.lineTo(0, 0); add(new THREE.ExtrudeGeometry(g, { depth: H, bevelEnabled: false }), c, 0, 0, 0); for (let i = 0; i < n; i++) box(1 + i * (W - 2) / n, D - 3.5, H, 1 + (i + 0.6) * (W - 2) / n, D - 0.8, H + 0.02, GOLD); break; }
    case 'box': { box(0, 0, 0, W, D, H, c); if (e.mark) box(W * 0.15, D * 0.3, H, W * 0.85, D * 0.7, H + 0.02, MARK);
      if (s.axialLeads) { const L = s.pitch || W + 6; hcyl((W - L) / 2, (W + L) / 2, D / 2, H / 2, 0.4, LEAD, 12); }
      else { const p = s.pitch && s.pitch <= 10 ? s.pitch : 2.54; const g2 = s.grid; for (let i = 0; i < n; i++) { const x = g2 ? (i % g2[0]) * p : i * p, y = g2 ? Math.floor(i / g2[0]) * p : 0; const ox = (W - (g2 ? (g2[0] - 1) * p : (n - 1) * p)) / 2; wire(ox + x, D / 2 + y - (g2 ? (g2[1] - 1) * p / 2 : 0), -3.2, 0.1, 0.3); } } break; }
    default: { // module: a board with its main part, pins along one or two edges
      const t = 1.6, top = Math.max(H, 2.5); box(0, 0, 0, W, D, t, c);
      const iw = Math.min(W * 0.55, Math.max(4, W - 8)), id = Math.min(D * 0.55, Math.max(4, D - 8)); box((W - iw) / 2, (D - id) / 2, t, (W + iw) / 2, (D + id) / 2, Math.min(top, t + Math.max(1, (top - t))), /sensor|camera|display/i.test(e.grp) ? '#2a2a2a' : '#1d1d1d');
      if (e.mark) dot((W - iw) / 2 + 1, (D - id) / 2 + 1, Math.min(top, t + Math.max(1, top - t)), 0.5);
      const rows = n > 12 && W >= 10 ? 2 : 1; const per = Math.ceil(n / rows); const along = W >= D; const len = along ? W : D; const p = Math.min(2.54, (len - 2) / Math.max(1, per)); const o = (len - (per - 1) * p) / 2;
      for (let i = 0; i < n; i++) { const r = Math.floor(i / per), k = i % per; const a = o + k * p, b = r === 0 ? 1.27 : (along ? D : W) - 1.27; const x = along ? a : b, y = along ? b : a; wire(x, y, -3, t + 0.05, Math.min(0.32, p * 0.2), GOLD); }
      break; }
  }
}
if (PLIB) for (const e of PLIB.LIST) { if (BOARDS[e.name]) continue; const [w, d, h] = e.dims; PL3D[e.name] = e; BOARDS[e.name] = { w: +(+w).toFixed(2), d: +(+d).toFixed(2), g: e.sec, sub: e.grp, note: `${e.pkg}, ${PLIB.dimText(e)}` }; }


/* ---------------- document ---------------- */
let objs = []; let sel = new Set(); const roots = new Map(); let undoStack = [], redoStack = []; let docName = 'Untitled';
let measures = []; let snapStep = 1; let units = 'mm'; let showGrid = true, showDims = true;
const objGroup = new THREE.Group(); scene.add(objGroup);
const holeMat = new THREE.MeshStandardMaterial({ color: '#8a96a8', transparent: true, opacity: 0.38, roughness: 0.4, depthWrite: false });
function matFor(o) { return o.hole ? holeMat : new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.55, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }); }
function naturalSize(o) { if (o.kind === 'mesh' || o.kind === 'group') return o.natural; if (o.kind === 'board') return o.natural; return [1, 1, 1]; }
function buildRoot(o) {
  let root = new THREE.Group(); root.userData.id = o.id;
  let inner;
  if (o.kind === 'board') { inner = buildBoard(o.params.model); const bb = new THREE.Box3().setFromObject(inner); const c = bb.getCenter(new THREE.Vector3()); inner.position.set(-c.x, -c.y, -bb.min.z); if (!o.natural) { const s = bb.getSize(new THREE.Vector3()); o.natural = [s.x, s.y, s.z]; o.size = o.natural.slice(); } inner.traverse(m => { if (m.isMesh) m.userData.id = o.id }); }
  else { const g = (o.kind === 'mesh' || o.kind === 'group') ? meshGeom(o) : unitGeom(o); inner = new THREE.Mesh(g, matFor(o)); inner.userData.id = o.id; }
  const scaler = new THREE.Group(); scaler.add(inner); root.add(scaler); root.userData.scaler = scaler;
  applyObj(root, o); return root;
}
function applyObj(root, o) {
  const nat = naturalSize(o);
  root.position.set(o.pos[0], o.pos[1], o.pos[2]);
  root.rotation.set(THREE.MathUtils.degToRad(o.rot[0]), THREE.MathUtils.degToRad(o.rot[1]), THREE.MathUtils.degToRad(o.rot[2]), 'XYZ');
  root.userData.scaler.scale.set(o.size[0] / nat[0], o.size[1] / nat[1], o.size[2] / nat[2]);
  root.scale.set(1, 1, 1);
}
function rebuildAll() {
  for (const [, r] of roots) objGroup.remove(r); roots.clear();
  for (const o of objs) { const r = buildRoot(o); roots.set(o.id, r); objGroup.add(r); }
  updateSelectionVis(); refreshInspector(); updateTree();
}
function rebuildOne(o) { const old = roots.get(o.id); if (old) objGroup.remove(old); const r = buildRoot(o); roots.set(o.id, r); objGroup.add(r); updateSelectionVis(); }
function syncFromRoot(live) {
  if (tc.object && tc.object.userData.id) {
    const o = objs.find(x => x.id === tc.object.userData.id); if (!o) return; const r = tc.object;
    o.pos = [r.position.x, r.position.y, r.position.z].map(v => +v.toFixed(3));
    o.rot = [r.rotation.x, r.rotation.y, r.rotation.z].map(v => +THREE.MathUtils.radToDeg(v).toFixed(2));
    if (r.scale.x !== 1 || r.scale.y !== 1 || r.scale.z !== 1) { if (o.kind !== 'board') o.size = [o.size[0] * r.scale.x, o.size[1] * r.scale.y, o.size[2] * r.scale.z].map(v => Math.max(0.1, +v.toFixed(3))); applyObj(r, o); }
    if (live) refreshInspector(true);
  }
}
const snap = v => Math.round(v / snapStep) * snapStep;
function snapshot() { return JSON.stringify({ objs, measures: measures.map(m => ({ a: m.a, b: m.b })) }); }
function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 80) undoStack.shift(); redoStack = []; dirtyTitle(true); }
function restoreSnap(s) { const o = JSON.parse(s); objs = o.objs; clearMeasures(); (o.measures || []).forEach(m => addMeasure(new THREE.Vector3(...m.a), new THREE.Vector3(...m.b))); sel = new Set([...sel].filter(id => objs.some(x => x.id === id))); rebuildAll(); }
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); restoreSnap(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restoreSnap(redoStack.pop()); }
function dirtyTitle(d) { document.title = (d ? '• ' : '') + docName + ' — CEsim 3D'; $('#docname').textContent = docName; }

function addPrimitive(kind, extra = {}) {
  pushUndo();
  const defaults = { box: [20, 20, 20], cylinder: [20, 20, 20], cone: [20, 20, 20], sphere: [20, 20, 20], pyramid: [20, 20, 20], torus: [24, 24, 7.7], ring: [20, 20, 6], wedge: [20, 20, 20], hexprism: [20, 17.32, 10], roundbox: [30, 20, 10], text: null };
  const o = { id: uidGen(), kind, name: kind[0].toUpperCase() + kind.slice(1), color: PALETTE[colorIdx++ % PALETTE.length], hole: !!extra.hole, pos: [0, 0, 0], rot: [0, 0, 0], size: (defaults[kind] || [20, 20, 20]).slice(), params: extra.params || {}, exportable: true };
  if (kind === 'text') { o.params.text = o.params.text || 'CEsim'; const g = new TextGeometry(o.params.text, { font: FONT, size: 10, depth: 3, curveSegments: 4, bevelEnabled: false }); g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s); o.size = [s.x, s.y, s.z].map(v => +v.toFixed(2)); }
  if (kind === 'cylinder' || kind === 'cone' || kind === 'ring') o.params.sides = o.params.sides || 48;
  if (kind === 'ring') o.params.inner = 70;
  const base = selected(); if (base.length && !extra.free) { const bb = base.reduce((a, x) => a.union(bboxOf(x)), bboxOf(base[0])); const c = bb.getCenter(new THREE.Vector3()); o.pos = [snap(c.x), snap(c.y), o.hole ? +bb.min.z.toFixed(2) : +bb.max.z.toFixed(2)]; } else placeFree(o);
  objs.push(o); rebuildOne(o); selectOnly(o.id); updateTree(); return o;
}
function placeFree(o) {
  // drop near camera target on the workplane, nudged so it does not overlap the last object
  const t = controls.target; let x = snap(t.x), y = snap(t.y); let tries = 0;
  const overl = () => objs.some(p => Math.abs(p.pos[0] - x) < (p.size[0] + o.size[0]) / 2 && Math.abs(p.pos[1] - y) < (p.size[1] + o.size[1]) / 2 && p.pos[2] < o.size[2]);
  while (overl() && tries++ < 30) { x += snap(Math.max(10, o.size[0] + 5)); if (x > WP.w / 2 - 10) { x = -WP.w / 2 + 20; y -= snap(o.size[1] + 10) } }
  o.pos = [x, y, 0];
}
function addBoard(model) {
  pushUndo(); const o = { id: uidGen(), kind: 'board', name: model, color: '#0b7fa3', hole: false, pos: [0, 0, 0], rot: [0, 0, 0], size: null, natural: null, params: { model }, exportable: false };
  const r = buildRoot(o); placeFree(o); objs.push(o); rebuildOne(o); selectOnly(o.id); updateTree(); toast(model + ' added. ' + BOARDS[model].note);
}

/* ---------------- selection & visuals ---------------- */
const selBoxes = new Map();
function updateSelectionVis() {
  for (const [, h] of selBoxes) scene.remove(h); selBoxes.clear();
  for (const id of sel) { const r = roots.get(id); if (!r) continue; const h = new THREE.BoxHelper(r, 0x0f9bb4); selBoxes.set(id, h); scene.add(h); }
  if (sel.size === 1 && gizmoMode) { const r = roots.get([...sel][0]); tc.attach(r); tc.setMode(gizmoMode); } else tc.detach();
  updateTree();
}
function selectOnly(id) { sel = new Set(id ? [id] : []); updateSelectionVis(); refreshInspector(); }
function selected() { return objs.filter(o => sel.has(o.id)); }

/* ---------------- inspector ---------------- */
const U = () => units === 'in' ? 25.4 : 1;
const fmt = v => (+(v / U()).toFixed(units === 'in' ? 3 : 2)).toString();
function refreshInspector(onlyValues) {
  const box = $('#insp'); const s = selected();
  if (!s.length) { box.innerHTML = '<div class="muted">Select a shape to edit its size and position. Right-drag orbits, middle-drag pans, scroll zooms.</div>'; updateDims(); return; }
  if (s.length > 1) { box.innerHTML = `<div class="ih">${s.length} shapes selected</div><div class="muted">Group (Ctrl+G) joins solids and cuts holes.</div><div class="row2" style="flex-wrap:wrap"><button class="btn" data-a="group">Group</button><button class="btn" data-a="align">Align…</button><button class="btn" data-a="array">Array…</button></div>`; updateDims(); return; }
  const o = s[0]; const isBoard = o.kind === 'board';
  if (onlyValues && box.dataset.id === o.id) { ['x', 'y', 'z'].forEach((k, i) => { const e = box.querySelector('#i-' + k); if (e && document.activeElement !== e) e.value = fmt(o.pos[i]) }); ['w', 'd', 'h'].forEach((k, i) => { const e = box.querySelector('#i-' + k); if (e && document.activeElement !== e) e.value = fmt(o.size[i]) }); ['rx', 'ry', 'rz'].forEach((k, i) => { const e = box.querySelector('#i-' + k); if (e && document.activeElement !== e) e.value = +o.rot[i].toFixed(1) }); updateDims(); return; }
  box.dataset.id = o.id; const u = units;
  box.innerHTML = `<input class="nm" id="i-name" value="${o.name.replace(/"/g, '&quot;')}" aria-label="Name">
  ${isBoard ? `<div class="muted" style="margin:4px 0 8px">${BOARDS[o.params.model]?.note || ''}</div>` : `<div class="seg2"><button class="${!o.hole ? 'on' : ''}" data-a="solid">Solid</button><button class="${o.hole ? 'on' : ''}" data-a="hole">Hole</button></div>`}
  <div class="grid3"><label>X</label><label>Y</label><label>Z</label>
   <input id="i-x" value="${fmt(o.pos[0])}"><input id="i-y" value="${fmt(o.pos[1])}"><input id="i-z" value="${fmt(o.pos[2])}"></div>
  <div class="grid3"><label>Width</label><label>Depth</label><label>Height</label>
   <input id="i-w" value="${fmt(o.size[0])}" ${isBoard ? 'disabled' : ''}><input id="i-d" value="${fmt(o.size[1])}" ${isBoard ? 'disabled' : ''}><input id="i-h" value="${fmt(o.size[2])}" ${isBoard ? 'disabled' : ''}></div>
  <div class="grid3"><label>Rot X°</label><label>Rot Y°</label><label>Rot Z°</label>
   <input id="i-rx" value="${+o.rot[0].toFixed(1)}"><input id="i-ry" value="${+o.rot[1].toFixed(1)}"><input id="i-rz" value="${+o.rot[2].toFixed(1)}"></div>
  <div class="unitnote">Units: ${u === 'in' ? 'inches' : 'millimetres'}</div>
  ${isBoard ? '' : `<div class="row2"><label class="lbl">Color</label><input type="color" id="i-color" value="${o.color}" aria-label="Color"><span class="qc3">${PALETTE.map(c => `<button data-col="${c}" style="background:${c}" title="${c}"></button>`).join('')}</span><label class="lbl" style="margin-left:auto"><input type="checkbox" id="i-lock"> Lock ratio</label></div>`}
  ${['cylinder', 'cone', 'ring'].includes(o.kind) ? `<div class="row2"><label class="lbl">Sides</label><input id="i-sides" type="number" min="3" max="128" value="${o.params.sides || 48}"></div>` : ''}
  ${o.kind === 'ring' ? `<div class="row2"><label class="lbl">Inner %</label><input id="i-inner" type="number" min="5" max="95" value="${o.params.inner || 70}"></div>` : ''}
  ${o.kind === 'text' ? `<div class="row2"><label class="lbl">Text</label><input id="i-text" value="${String(o.params.text).replace(/"/g, '&quot;')}"></div>` : ''}
  <div class="row2" style="flex-wrap:wrap">${isBoard ? '<button class="btn pri" data-a="enc">Make enclosure…</button>' : ['box', 'roundbox', 'cylinder', 'hexprism'].includes(o.kind) ? '<button class="btn" data-a="shell">Make hollow…</button>' : ''}<button class="btn" data-a="array">Array…</button></div>
  <div class="row2"><label class="lbl"><input type="checkbox" id="i-exp" ${o.exportable !== false ? 'checked' : ''}> Include in export</label></div>`;
  updateDims();
}
$('#insp').addEventListener('change', e => {
  const s = selected(); if (s.length !== 1) return; const o = s[0]; const id = e.target.id; const v = parseFloat(e.target.value);
  pushUndo();
  const n = v * U();
  if (id === 'i-name') o.name = e.target.value;
  else if (id === 'i-x' && isFinite(v)) o.pos[0] = n; else if (id === 'i-y' && isFinite(v)) o.pos[1] = n; else if (id === 'i-z' && isFinite(v)) o.pos[2] = n;
  else if (['i-w', 'i-d', 'i-h'].includes(id) && isFinite(v) && v > 0) { const i = { 'i-w': 0, 'i-d': 1, 'i-h': 2 }[id]; if ($('#i-lock')?.checked) { const f = n / o.size[i]; o.size = o.size.map(x => x * f) } else o.size[i] = n; }
  else if (['i-rx', 'i-ry', 'i-rz'].includes(id) && isFinite(v)) o.rot[{ 'i-rx': 0, 'i-ry': 1, 'i-rz': 2 }[id]] = v;
  else if (id === 'i-color') o.color = e.target.value;
  else if (id === 'i-sides') o.params.sides = Math.max(3, Math.min(128, v | 0));
  else if (id === 'i-inner') o.params.inner = Math.max(5, Math.min(95, v));
  else if (id === 'i-text') { o.params.text = e.target.value || ' '; const g = new TextGeometry(o.params.text, { font: FONT, size: 10, depth: 3, curveSegments: 4, bevelEnabled: false }); g.computeBoundingBox(); const s3 = new THREE.Vector3(); g.boundingBox.getSize(s3); const h = o.size[1] / (o._th || s3.y); o.size = [s3.x * (o.size[1] / s3.y), o.size[1], o.size[2]]; }
  else if (id === 'i-exp') o.exportable = e.target.checked;
  rebuildOne(o); refreshInspector(); updateTree();
});
$('#insp').addEventListener('click', e => { if (e.target.dataset.col) { pushUndo(); selected().forEach(o => { if (o.kind !== 'board') { o.color = e.target.dataset.col; rebuildOne(o) } }); refreshInspector(); updateTree(); return; } const a = e.target.dataset.a; if (!a) return; const s = selected(); if (a === 'solid' || a === 'hole') { pushUndo(); s.forEach(o => { if (o.kind !== 'board') { o.hole = a === 'hole'; rebuildOne(o) } }); refreshInspector(); updateTree(); } if (a === 'group') groupSel(); if (a === 'align') openAlign(); if (a === 'array') openArray(); if (a === 'shell') openShell(); if (a === 'enc') openEnclosure(); });

/* dimension labels (live W × D × H) */
const dimEls = { w: $('#dim-w'), d: $('#dim-d'), h: $('#dim-h') };
function updateDims() {
  const s = selected(); const show = s.length === 1;
  for (const k in dimEls) dimEls[k].style.display = show && showDims ? 'block' : 'none';
  if (!showDims) return;
  if (!show) return; const o = s[0]; const r = roots.get(o.id); if (!r) return;
  const bb = new THREE.Box3().setFromObject(r); const proj = v => { const p = v.clone().project(camera); const R = renderer.domElement.getBoundingClientRect(); return [(p.x + 1) / 2 * R.width, (1 - p.y) / 2 * R.height, p.z]; };
  const place = (el, v, txt) => { const [x, y, z] = proj(v); el.style.left = x + 'px'; el.style.top = y + 'px'; el.textContent = txt; el.style.display = z < 1 ? 'block' : 'none'; };
  const size = bb.getSize(new THREE.Vector3());
  place(dimEls.w, new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y - 3, bb.min.z), fmt(size.x) + (units === 'in' ? ' in' : ' mm'));
  place(dimEls.d, new THREE.Vector3(bb.max.x + 3, (bb.min.y + bb.max.y) / 2, bb.min.z), fmt(size.y) + (units === 'in' ? ' in' : ' mm'));
  place(dimEls.h, new THREE.Vector3(bb.max.x + 2, bb.min.y - 2, (bb.min.z + bb.max.z) / 2), fmt(size.z) + (units === 'in' ? ' in' : ' mm'));
}

/* ---------------- object tree ---------------- */
function updateTree() {
  const t = $('#tree'); if (!t) return;
  t.innerHTML = objs.map(o => `<div class="ti ${sel.has(o.id) ? 'on' : ''}" data-id="${o.id}"><span class="sw" style="background:${o.hole ? 'repeating-linear-gradient(45deg,#9aa6b8 0 3px,#dfe5ee 3px 6px)' : o.color}"></span>${o.name.replace(/</g, '&lt;')}<span class="k">${o.kind === 'board' ? 'board' : o.hole ? 'hole' : ''}</span></div>`).join('') || '<div class="muted" style="padding:6px">No shapes yet.</div>';
}
$('#tree').addEventListener('click', e => { const d = e.target.closest('[data-id]'); if (!d) return; if (e.shiftKey) { sel.has(d.dataset.id) ? sel.delete(d.dataset.id) : sel.add(d.dataset.id); updateSelectionVis(); refreshInspector() } else selectOnly(d.dataset.id); });

/* ---------------- CSG grouping ---------------- */
const evaluator = new Evaluator(); evaluator.attributes = ['position', 'normal', 'uv']; evaluator.useGroups = false;
function worldBrush(o) {
  const r = roots.get(o.id); r.updateMatrixWorld(true);
  const mesh = r.userData.scaler.children[0];
  const g = mesh.geometry.clone(); g.applyMatrix4(mesh.matrixWorld); ensureAttrs(g);
  const b = new Brush(g); b.updateMatrixWorld(); return b;
}
function groupSel() {
  const s = selected().filter(o => o.kind !== 'board');
  if (selected().some(o => o.kind === 'board')) toast('Boards are reference models and stay out of groups.');
  if (s.length < 2) { toast('Select two or more shapes to group.'); return; }
  const solids = s.filter(o => !o.hole), holes = s.filter(o => o.hole);
  if (!solids.length) { toast('A group needs at least one solid shape.', true); return; }
  pushUndo();
  try {
    let acc = worldBrush(solids[0]);
    for (const o of solids.slice(1)) acc = evaluator.evaluate(acc, worldBrush(o), ADDITION);
    for (const o of holes) acc = evaluator.evaluate(acc, worldBrush(o), SUBTRACTION);
    const g = acc.geometry.clone(); const st = storeMeshGeom(g);
    const o = { id: uidGen(), kind: 'group', name: 'Group', color: solids[0].color, hole: false, pos: [st.center.x, st.center.y, st.center.z], rot: [0, 0, 0], size: st.natural.slice(), natural: st.natural, geom: st.geom, children: JSON.parse(JSON.stringify(s)), exportable: true };
    objs = objs.filter(x => !sel.has(x.id) || x.kind === 'board'); objs.push(o); rebuildAll(); selectOnly(o.id);
  } catch (err) { console.error(err); undoStack.pop(); toast('Could not combine these shapes: ' + err.message, true); }
}
function ungroupSel() {
  const s = selected().filter(o => o.kind === 'group' && o.children); if (!s.length) { toast('Select a group to ungroup.'); return; }
  pushUndo(); for (const g of s) { objs = objs.filter(x => x.id !== g.id); g.children.forEach(c => { c.id = uidGen(); objs.push(c) }); }
  sel.clear(); rebuildAll();
}

/* ---------------- align / mirror / duplicate ---------------- */
function bboxOf(o) { return new THREE.Box3().setFromObject(roots.get(o.id)); }
function openAlign() {
  const s = selected(); if (s.length < 2) { toast('Select two or more shapes to align.'); return; }
  const d = $('#alignpop'); d.style.display = 'grid';
}
$('#alignpop').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const [axis, where] = b.dataset.al.split(':'); const s = selected(); if (s.length < 2) return; pushUndo();
  const ai = { x: 0, y: 1, z: 2 }[axis]; const key = ['x', 'y', 'z'][ai];
  const boxes = s.map(bboxOf); const all = boxes.reduce((a, b) => a.union(b), boxes[0].clone());
  s.forEach((o, i) => { const bb = boxes[i]; let delta; if (where === 'min') delta = all.min[key] - bb.min[key]; else if (where === 'max') delta = all.max[key] - bb.max[key]; else delta = (all.min[key] + all.max[key]) / 2 - (bb.min[key] + bb.max[key]) / 2; o.pos[ai] += delta; rebuildOne(o) });
  refreshInspector(); $('#alignpop').style.display = 'none';
});
function mirror(axis) { const s = selected(); if (!s.length) return; pushUndo(); const ai = { x: 0, y: 1, z: 2 }[axis]; s.forEach(o => { if (o.kind === 'board') return; if (o.kind === 'group' || o.kind === 'mesh') { const g = meshGeom(o).clone(); const m = new THREE.Matrix4().makeScale(ai === 0 ? -1 : 1, ai === 1 ? -1 : 1, ai === 2 ? -1 : 1); g.applyMatrix4(m); const pa = g.getAttribute('position'); for (let i = 0; i < pa.count; i += 3) { const a = [pa.getX(i), pa.getY(i), pa.getZ(i)]; pa.setXYZ(i, pa.getX(i + 1), pa.getY(i + 1), pa.getZ(i + 1)); pa.setXYZ(i + 1, ...a) } const st = storeMeshGeom(g); o.geom = st.geom; } else o.rot[ai] = (o.rot[ai] + 180) % 360; rebuildOne(o) }); }
function duplicateSel() { const s = selected(); if (!s.length) return; pushUndo(); const ns = []; s.forEach(o => { const c = JSON.parse(JSON.stringify(o)); c.id = uidGen(); c.pos[0] += 10; c.pos[1] -= 10; objs.push(c); ns.push(c.id) }); rebuildAll(); sel = new Set(ns); updateSelectionVis(); refreshInspector(); }
let clip3 = null;
function copySel3() { const s3 = selected(); if (!s3.length) return; clip3 = JSON.parse(JSON.stringify(s3)); toast(s3.length + ' shape(s) copied.'); }
function paste3() { if (!clip3) return; pushUndo(); const ns = []; clip3.forEach(o => { const c = JSON.parse(JSON.stringify(o)); c.id = uidGen(); c.pos[0] += 10; c.pos[1] -= 10; objs.push(c); ns.push(c.id); }); clip3.forEach(o => { o.pos[0] += 10; o.pos[1] -= 10; }); rebuildAll(); sel = new Set(ns); updateSelectionVis(); refreshInspector(); }
function dialog3(title, fields, onOk, note) {
  const d = $('#dlg3'); d.innerHTML = `<div class="dh">${title}</div>${note ? `<div class="muted" style="margin-bottom:6px">${note}</div>` : ''}<div class="dg">${fields.map(f => f.type === 'select' ? `<label for="d3-${f.k}">${f.l}</label><select id="d3-${f.k}">${f.opts.map(([v, n]) => `<option value="${v}" ${v == f.v ? 'selected' : ''}>${n}</option>`).join('')}</select>` : f.type === 'check' ? `<label for="d3-${f.k}">${f.l}</label><input type="checkbox" id="d3-${f.k}" ${f.v ? 'checked' : ''}>` : `<label for="d3-${f.k}">${f.l}</label><input id="d3-${f.k}" type="number" step="${f.step || 1}" value="${f.v}">`).join('')}</div><div class="row2" style="justify-content:flex-end;margin-top:10px"><button class="btn" id="d3c">Cancel</button><button class="btn pri" id="d3ok">${fields.okLabel || 'Apply'}</button></div>`;
  d.style.display = 'block'; const get = () => { const o = {}; fields.forEach(f => { const el = d.querySelector('#d3-' + f.k); o[f.k] = f.type === 'check' ? el.checked : f.type === 'select' ? el.value : parseFloat(el.value); }); return o; };
  d.querySelector('#d3c').onclick = () => d.style.display = 'none'; d.querySelector('#d3ok').onclick = () => { const v = get(); d.style.display = 'none'; onOk(v); };
  d.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') d.querySelector('#d3ok').click(); if (e.key === 'Escape') d.style.display = 'none'; };
  setTimeout(() => { const f = d.querySelector('input,select'); f && f.focus(); }, 20);
}
function openArray() {
  const s3 = selected(); if (!s3.length) { toast('Select a shape to repeat.'); return; }
  dialog3('Array / pattern', [{ k: 'type', l: 'Pattern', type: 'select', opts: [['linear', 'Linear (row)'], ['grid', 'Grid (rows × columns)'], ['circular', 'Circular']], v: 'linear' }, { k: 'n', l: 'Copies (total)', v: 4 }, { k: 'dx', l: 'Step X (mm)', v: 10, step: 0.1 }, { k: 'dy', l: 'Step Y (mm)', v: 0, step: 0.1 }, { k: 'dz', l: 'Step Z (mm)', v: 0, step: 0.1 }, { k: 'rows', l: 'Rows (grid)', v: 2 }, { k: 'r', l: 'Radius (circular)', v: 20, step: 0.1 }, { k: 'ang', l: 'Total angle °', v: 360 }],
    v => { const n = Math.max(2, Math.min(200, v.n | 0)); pushUndo(); const ns = []; const bb = s3.reduce((a, x) => a.union(bboxOf(x)), bboxOf(s3[0])); const c = bb.getCenter(new THREE.Vector3());
      for (let i = 1; i < n * (v.type === 'grid' ? Math.max(1, v.rows | 0) : 1) + (v.type === 'grid' ? 0 : 0); i++) {
        let ox = 0, oy = 0, oz = 0, rz = 0;
        if (v.type === 'linear') { if (i >= n) break; ox = v.dx * i; oy = v.dy * i; oz = v.dz * i; }
        else if (v.type === 'grid') { const rows = Math.max(1, v.rows | 0); const col = i % n, row = Math.floor(i / n); if (row >= rows) break; ox = v.dx * col; oy = -(v.dy || v.dx) * row; }
        else { if (i >= n) break; const full = Math.abs(v.ang) >= 359.9; const a = (v.ang * Math.PI / 180) * i / (full ? n : n - 1); ox = c.x + v.r * Math.cos(a) - (c.x + v.r); oy = c.y + v.r * Math.sin(a) - c.y; rz = a * 180 / Math.PI; }
        s3.forEach(o => { const k = JSON.parse(JSON.stringify(o)); k.id = uidGen(); k.pos = [o.pos[0] + ox, o.pos[1] + oy, o.pos[2] + oz]; if (rz) k.rot = [o.rot[0], o.rot[1], (o.rot[2] + rz) % 360]; objs.push(k); ns.push(k.id); }); }
      rebuildAll(); sel = new Set(s3.map(o => o.id).concat(ns)); updateSelectionVis(); refreshInspector(); toast(ns.length + ' copies added.'); }, 'Copies are placed from the current selection. Circular patterns rotate around a centre placed one radius to the left of the shape.');
}
function openShell() {
  const s3 = selected(); if (s3.length !== 1 || !['box', 'roundbox', 'cylinder', 'hexprism'].includes(s3[0].kind)) { toast('Select one box, round box, cylinder or hexagon to hollow it.'); return; }
  const o = s3[0];
  dialog3('Shell (make hollow)', [{ k: 't', l: 'Wall thickness (mm)', v: 2, step: 0.2 }, { k: 'f', l: 'Floor thickness (mm)', v: 2, step: 0.2 }, { k: 'open', l: 'Open top', type: 'check', v: true }], v => {
    if (v.t * 2 >= Math.min(o.size[0], o.size[1]) || v.f >= o.size[2]) { toast('The wall is too thick for this shape.', true); return; }
    const hole = JSON.parse(JSON.stringify(o)); hole.id = uidGen(); hole.hole = true; hole.name = 'Cavity'; hole.size = [o.size[0] - 2 * v.t, o.size[1] - 2 * v.t, v.open ? o.size[2] - v.f + 1 : o.size[2] - v.f - v.t]; hole.pos = [o.pos[0], o.pos[1], o.pos[2] + v.f];
    pushUndo(); objs.push(hole); rebuildOne(hole); sel = new Set([o.id, hole.id]); groupSel(); const g = selected()[0]; if (g) { g.name = o.name + ' (shell)'; updateTree(); } });
}
function evalCSG(solids, holes, adds = [], holes2 = []) { const toB = g => { const b = new Brush(ensureAttrs(g)); b.updateMatrixWorld(); return b; }; let acc = toB(solids[0]); for (const g of solids.slice(1)) acc = evaluator.evaluate(acc, toB(g), ADDITION); for (const g of holes) acc = evaluator.evaluate(acc, toB(g), SUBTRACTION); for (const g of adds) acc = evaluator.evaluate(acc, toB(g), ADDITION); for (const g of holes2) acc = evaluator.evaluate(acc, toB(g), SUBTRACTION); return acc.geometry.clone(); }
function rbox(w, d, h, r = 3) { const sh = new THREE.Shape(); const x = -w / 2, y = -d / 2; r = Math.min(r, w / 2 - .01, d / 2 - .01); sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + d - r); sh.quadraticCurveTo(x + w, y + d, x + w - r, y + d); sh.lineTo(x + r, y + d); sh.quadraticCurveTo(x, y + d, x, y + d - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 6 }); }
function boxG(x1, y1, z1, x2, y2, z2) { return new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1).translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); }
function cylG(x, y, z1, z2, r) { return new THREE.CylinderGeometry(r, r, z2 - z1, 32).rotateX(Math.PI / 2).translate(x, y, (z1 + z2) / 2); }
function openEnclosure() {
  const b = selected().find(o => o.kind === 'board'); if (!b) { toast('Select a board first (from Boards and modules).'); return; }
  const info = BOARDS[b.params.model];
  dialog3('Auto enclosure — ' + b.params.model, [{ k: 't', l: 'Wall (mm)', v: 2, step: 0.2 }, { k: 'c', l: 'Clearance (mm)', v: 1, step: 0.2 }, { k: 'f', l: 'Floor (mm)', v: 2, step: 0.2 }, { k: 's', l: 'Standoff height (mm)', v: 3, step: 0.5 }, { k: 'top', l: 'Space above parts (mm)', v: 3, step: 0.5 }, { k: 'r', l: 'Corner radius (mm)', v: 3, step: 0.5 }, { k: 'cut', l: 'Cut openings for connectors', type: 'check', v: true }, { k: 'lid', l: 'Make a matching lid', type: 'check', v: true }],
    v => { try { buildEnclosure(b, info, v); } catch (err) { console.error(err); toast('Could not build the enclosure: ' + err.message, true); } }, 'Builds a box around the board with openings where connectors reach the board edge' + (info.holes ? ' and standoffs under the mounting holes.' : '.'));
}
function buildEnclosure(b, info, v) {
  const root = roots.get(b.id); root.updateMatrixWorld(true); const inner = root.userData.scaler.children[0]; const Mb = inner.matrixWorld.clone();
  const W = info.w, D = info.d; let top = 0; const cuts = [];
  inner.updateMatrixWorld(true); const invInner = new THREE.Matrix4().copy(inner.matrixWorld).invert();
  inner.traverse(m => { if (!m.isMesh || m.isInstancedMesh) return; const bb = new THREE.Box3().setFromObject(m).applyMatrix4(invInner); top = Math.max(top, bb.max.z); const g = 0.6, out = v.t + v.c + 2;
    if (bb.min.x < -0.2) cuts.push(boxG(-out - v.c, bb.min.y - g, bb.min.z - g, Math.max(bb.max.x, 0) * 0 + 0.5, bb.max.y + g, bb.max.z + g));
    if (bb.max.x > W + 0.2) cuts.push(boxG(W - 0.5, bb.min.y - g, bb.min.z - g, W + out + v.c, bb.max.y + g, bb.max.z + g));
    if (bb.min.y < -0.2) cuts.push(boxG(bb.min.x - g, -out - v.c, bb.min.z - g, bb.max.x + g, 0.5, bb.max.z + g));
    if (bb.max.y > D + 0.2) cuts.push(boxG(bb.min.x - g, D - 0.5, bb.min.z - g, bb.max.x + g, D + out + v.c, bb.max.z + g)); });
  // reach of parts that overhang the PCB defines the cavity
  let minX = 0, maxX = W, minY = 0, maxY = D; inner.traverse(m => { if (!m.isMesh || m.isInstancedMesh) return; const bb = new THREE.Box3().setFromObject(m).applyMatrix4(invInner); minX = Math.min(minX, Math.max(bb.min.x, -1.5)); maxX = Math.max(maxX, Math.min(bb.max.x, W + 1.5)); minY = Math.min(minY, Math.max(bb.min.y, -1.5)); maxY = Math.max(maxY, Math.min(bb.max.y, D + 1.5)); });
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, iw = maxX - minX + 2 * v.c, id = maxY - minY + 2 * v.c, ow = iw + 2 * v.t, od = id + 2 * v.t;
  const z0 = -(v.f + v.s), H = v.f + v.s + top + v.top;
  const outer = rbox(ow, od, H, v.r).translate(cx, cy, z0); const cav = rbox(iw, id, H, Math.max(0.5, v.r - v.t)).translate(cx, cy, z0 + v.f);
  const posts = (info.holes || []).map(([x, y]) => cylG(x, y, z0 + v.f - 0.01, 0, Math.max(2.4, info.hr + 1.2))); const screw = (info.holes || []).map(([x, y]) => cylG(x, y, z0 + 0.8, 0.5, info.hr * 0.75));
  let geo = evalCSG([outer], [cav].concat(v.cut ? cuts : []), posts, screw); geo.applyMatrix4(Mb);
  pushUndo(); const st = storeMeshGeom(geo);
  const enc = { id: uidGen(), kind: 'group', name: 'Enclosure for ' + b.params.model, color: '#5a6b82', hole: false, pos: [st.center.x, st.center.y, st.center.z], rot: [0, 0, 0], size: st.natural.slice(), natural: st.natural, geom: st.geom, exportable: true };
  objs.push(enc); const made = [enc.id];
  if (v.lid) { const lip = 3, cl = 0.3; let lg = evalCSG([rbox(ow, od, v.t, v.r).translate(0, 0, 0), rbox(iw - 2 * cl, id - 2 * cl, v.t + lip, Math.max(0.5, v.r - v.t)).translate(0, 0, 0)], [rbox(iw - 2 * cl - 2 * 1.6, id - 2 * cl - 2 * 1.6, lip + 2, 0.5).translate(0, 0, v.t)]); const ls = storeMeshGeom(lg);
    const lid = { id: uidGen(), kind: 'group', name: 'Lid', color: '#8796ab', hole: false, pos: [st.center.x + st.natural[0] + 12, st.center.y, 0], rot: [0, 0, 0], size: ls.natural.slice(), natural: ls.natural, geom: ls.geom, exportable: true }; objs.push(lid); made.push(lid.id); }
  rebuildAll(); sel = new Set(made); updateSelectionVis(); refreshInspector(); fitView(objs.filter(o => made.includes(o.id) || o.id === b.id));
  toast(`Enclosure ${ow.toFixed(1)} × ${od.toFixed(1)} × ${H.toFixed(1)} mm${v.cut ? `, ${cuts.length} connector opening(s)` : ''}${info.holes ? `, ${info.holes.length} standoffs` : ''}.`);
}
function openSettings3() {
  dialog3('Control settings', [
    { k: 'zoom', l: 'Zoom speed', type: 'select', opts: [['0.3', 'Very slow'], ['0.6', 'Slow'], ['1', 'Normal'], ['1.6', 'Fast'], ['2.5', 'Very fast']], v: String(SET.zoom) },
    { k: 'rotate', l: 'Rotate speed', type: 'select', opts: [['0.4', 'Slow'], ['1', 'Normal'], ['1.8', 'Fast']], v: String(SET.rotate) },
    { k: 'pan', l: 'Pan speed', type: 'select', opts: [['0.5', 'Slow'], ['1', 'Normal'], ['2', 'Fast']], v: String(SET.pan) },
    { k: 'invert', l: 'Invert scroll zoom', type: 'check', v: SET.invert },
    { k: 'toCursor', l: 'Zoom toward the mouse', type: 'check', v: SET.toCursor },
    { k: 'damping', l: 'Smooth motion', type: 'check', v: SET.damping },
    { k: 'buttons', l: 'Mouse buttons', type: 'select', opts: [['rmb', 'Right = rotate · Middle = pan'], ['mmb', 'Middle = rotate · Right = pan']], v: SET.buttons },
    { k: 'rotSnap', l: 'Rotation snap', type: 'select', opts: [['0', 'Off'], ['5', '5°'], ['15', '15°'], ['45', '45°'], ['90', '90°']], v: String(SET.rotSnap) },
    { k: 'gridW', l: 'Grid width (mm)', v: SET.gridW, step: 10 }, { k: 'gridH', l: 'Grid depth (mm)', v: SET.gridH, step: 10 },
    { k: 'bg', l: 'Background', type: 'select', opts: [['#eef2f7', 'Light'], ['#ffffff', 'White'], ['#d9dee6', 'Grey'], ['#1b2230', 'Dark']], v: SET.bg },
    { k: 'axes', l: 'Show X/Y/Z axes', type: 'check', v: SET.axes }
  ], v => { Object.assign(SET, { zoom: +v.zoom, rotate: +v.rotate, pan: +v.pan, invert: v.invert, toCursor: v.toCursor, damping: v.damping, buttons: v.buttons, rotSnap: +v.rotSnap, gridW: Math.max(20, Math.min(2000, v.gridW || 300)), gridH: Math.max(20, Math.min(2000, v.gridH || 200)), bg: v.bg, axes: v.axes }); applySettings(); toast('Settings saved.'); }, 'Saved on this computer and used every time you open the 3D tool. <a href="#" id="set3reset">Reset to defaults</a>');
  const r = $('#set3reset'); if (r) r.onclick = e => { e.preventDefault(); SET = Object.assign({}, SET_DEF); applySettings(); $('#dlg3').style.display = 'none'; toast('Settings reset.'); };
}
function renderClean(scale, fn) { const r = wrap.getBoundingClientRect(); renderer.setPixelRatio((window.devicePixelRatio || 1) * scale); renderer.setSize(r.width, r.height, false); for (const [, h] of selBoxes) h.visible = false; tc.getHelper && (tc.getHelper().visible = false); gridGroup.visible = showGrid; renderer.render(scene, camera); const out = fn(renderer.domElement); renderer.setPixelRatio(window.devicePixelRatio || 1); resize(); for (const [, h] of selBoxes) h.visible = true; tc.getHelper && (tc.getHelper().visible = true); return out; }
function saveUrl(nm, url) { if (window.cesimNative && window.cesimNative.saveBinary) window.cesimNative.saveBinary(nm, url.split(',')[1]); else { const a = document.createElement('a'); a.href = url; a.download = nm; document.body.appendChild(a); a.click(); a.remove(); } }
function imageWithBg(cv, mime) { if (mime === 'image/png') return cv.toDataURL(mime); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d'); g.fillStyle = '#' + scene.background.getHexString(); g.fillRect(0, 0, c.width, c.height); g.drawImage(cv, 0, 0); return c.toDataURL(mime, 0.93); }
function exportSVG3() {
  const r = wrap.getBoundingClientRect(); const sr = new SVGRenderer(); sr.setSize(r.width, r.height); sr.setQuality('high');
  for (const [, h] of selBoxes) h.visible = false; tc.getHelper && (tc.getHelper().visible = false); const gv = gridGroup.visible; gridGroup.visible = false; measureGroup.visible = false;
  sr.render(scene, camera); for (const [, h] of selBoxes) h.visible = true; tc.getHelper && (tc.getHelper().visible = true); gridGroup.visible = gv; measureGroup.visible = true;
  const el = sr.domElement; el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(el);
}
function csvReport() {
  const q = v => { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const f = v => (+v).toFixed(2); const rows = [['Name', 'Type', 'Role', 'X (mm)', 'Y (mm)', 'Z (mm)', 'Width (mm)', 'Depth (mm)', 'Height (mm)', 'Rot X°', 'Rot Y°', 'Rot Z°', 'Color', 'In export']];
  objs.forEach(o => { const bb = bboxOf(o); const sz = bb.getSize(new THREE.Vector3()); rows.push([o.name || o.kind, o.kind, o.hole ? 'Hole' : 'Solid', f(o.pos[0]), f(o.pos[1]), f(o.pos[2]), f(sz.x), f(sz.y), f(sz.z), f(o.rot[0] || 0), f(o.rot[1] || 0), f(o.rot[2] || 0), o.color || '', o.exportable === false ? 'No' : 'Yes']); });
  if (measures.length) { rows.push([]); rows.push(['Measurement', 'From X', 'From Y', 'From Z', 'To X', 'To Y', 'To Z', 'Distance (mm)']); measures.forEach((m, i) => { const a = new THREE.Vector3(...m.a), b = new THREE.Vector3(...m.b); rows.push(['M' + (i + 1), ...m.a.map(f), ...m.b.map(f), f(a.distanceTo(b))]); }); }
  if (objs.length) { const all = objs.reduce((a, o) => a.union(bboxOf(o)), bboxOf(objs[0])); const s3 = all.getSize(new THREE.Vector3()); rows.push([]); rows.push(['Overall size (mm)', f(s3.x), f(s3.y), f(s3.z)]); }
  return '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n');
}
function openShot3(btn) {
  const m = $('#shot3'); const r = btn.getBoundingClientRect(); const items = [
    ['Save view as PNG', () => exportAs('png', { scale: 2 })],
    ['Save view as JPG', () => exportAs('jpg', { scale: 2 })],
    ['Copy view to clipboard', async () => { try { const url = renderClean(2, cv => cv.toDataURL('image/png')); const blob = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Copied. Paste it into Word or a slide.'); } catch (e) { toast('Copy failed: ' + e.message, true); } }],
    ...(window.cesimNative && window.cesimNative.capture ? [['Capture the whole window…', () => window.cesimNative.capture(docName.replace(/[^\w.-]+/g, '_') + '_window.png')]] : [])];
  m.innerHTML = items.map((x, i) => `<button data-i="${i}">${x[0]}</button>`).join(''); m.style.display = 'flex'; m.style.left = Math.max(4, r.right - 220) + 'px'; m.style.top = r.bottom + 4 + 'px';
  m.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; m.style.display = 'none'; items[+b.dataset.i][1](); };
}
document.addEventListener('pointerdown', e => { const m = $('#shot3'); if (m && m.style.display === 'flex' && !e.target.closest('#shot3') && !e.target.closest('#v-shot')) m.style.display = 'none'; });
function openExport3() {
  dialog3('Export', Object.assign([{ k: 'fmt', l: 'Format', type: 'select', opts: [['stl', 'STL binary (3D printing)'], ['stla', 'STL text (ASCII)'], ['3mf', '3MF (slicers, keeps colors)'], ['obj', 'OBJ'], ['glb', 'GLB (3D viewers)'], ['png', 'PNG image'], ['jpg', 'JPG image'], ['webp', 'WebP image'], ['svg', 'SVG vector drawing'], ['csv', 'CSV report: sizes and measurements']], v: lastExp3.fmt || 'stl' }, { k: 'area', l: 'What to export', type: 'select', opts: [['all', 'Everything marked for export'], ['sel', 'Selection only']], v: lastExp3.area || 'all' }, { k: 'scale', l: 'Image size', type: 'select', opts: [['1', '1× window'], ['2', '2× window'], ['3', '3× window']], v: lastExp3.scale || '2' }], { okLabel: 'Export' }), v => { lastExp3 = v; exportAs(v.fmt, v); }, 'Boards are reference models and are skipped unless "Include in export" is ticked. Group holes with a solid first so they are cut.');
}
let lastExp3 = {};
function to3MF(list) {
  let objsXml = '', items = '', id = 1; const mats = [];
  for (const { mesh, color } of list) { const g = mesh.geometry; const pa = g.getAttribute('position'); const vmap = new Map(); const verts = []; const tris = []; const key = (x, y, z) => x.toFixed(4) + ',' + y.toFixed(4) + ',' + z.toFixed(4);
    const idx = i => { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); const k = key(x, y, z); if (!vmap.has(k)) { vmap.set(k, verts.length); verts.push(`<vertex x="${x.toFixed(4)}" y="${y.toFixed(4)}" z="${z.toFixed(4)}"/>`); } return vmap.get(k); };
    for (let i = 0; i < pa.count; i += 3) { const a = idx(i), b = idx(i + 1), c = idx(i + 2); if (a !== b && b !== c && a !== c) tris.push(`<triangle v1="${a}" v2="${b}" v3="${c}" pid="1" p1="${mats.length}"/>`); }
    mats.push(`<base name="${color}" displaycolor="${color.toUpperCase()}FF"/>`);
    objsXml += `<object id="${id + 1}" type="model"><mesh><vertices>${verts.join('')}</vertices><triangles>${tris.join('')}</triangles></mesh></object>`; items += `<item objectid="${id + 1}"/>`; id++; }
  const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><basematerials id="1">${mats.join('')}</basematerials>${objsXml}</resources><build>${items}</build></model>`;
  const files = { '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'), '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'), '3D/3dmodel.model': strToU8(model) };
  return zipSync(files).buffer;
}
function deleteSel() { if (!sel.size) return; pushUndo(); objs = objs.filter(o => !sel.has(o.id)); sel.clear(); rebuildAll(); }

/* ---------------- measuring ---------------- */
let mode = 'select'; let measureA = null; const measureGroup = new THREE.Group(); scene.add(measureGroup);
function addMeasure(a, b) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]); const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color: '#d1452b', dashSize: 2, gapSize: 1.2, depthTest: false })); line.computeLineDistances(); line.renderOrder = 10;
  const dot = p => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), new THREE.MeshBasicMaterial({ color: '#d1452b', depthTest: false })); m.position.copy(p); m.renderOrder = 11; return m };
  const grp = new THREE.Group(); grp.add(line, dot(a), dot(b)); measureGroup.add(grp);
  const el = document.createElement('div'); el.className = 'mlabel'; $('#view').appendChild(el);
  measures.push({ a: a.toArray(), b: b.toArray(), grp, el });
}
function clearMeasures() { measures.forEach(m => { measureGroup.remove(m.grp); m.el.remove() }); measures = []; }
function updateMeasureLabels() {
  const R = renderer.domElement.getBoundingClientRect();
  measures.forEach(m => { const a = new THREE.Vector3(...m.a), b = new THREE.Vector3(...m.b); const mid = a.clone().add(b).multiplyScalar(0.5).project(camera); m.el.style.left = (mid.x + 1) / 2 * R.width + 'px'; m.el.style.top = (1 - mid.y) / 2 * R.height + 'px'; const d = a.distanceTo(b); const u = units === 'in' ? ' in' : ' mm'; m.el.innerHTML = `<b>${fmt(d)}${u}</b><span>Δx ${fmt(Math.abs(b.x - a.x))} · Δy ${fmt(Math.abs(b.y - a.y))} · Δz ${fmt(Math.abs(b.z - a.z))}</span>`; m.el.style.display = mid.z < 1 ? 'flex' : 'none'; });
}
function setMode(m) { mode = m; measureA = null; $('#b-measure').classList.toggle('on', m === 'measure'); renderer.domElement.style.cursor = m === 'measure' ? 'crosshair' : 'default'; $('#hint').textContent = m === 'measure' ? 'Measure: click the first point, then the second point. Points snap to corners within 2 mm. Esc to finish.' : ''; }
function snapToVertex(hit) {
  if (!hit || !hit.object.geometry) return hit && hit.point;
  const p = hit.point; let best = null, bd = 2;
  const pa = hit.object.geometry.getAttribute('position'); const m = hit.object.matrixWorld; const v = new THREE.Vector3();
  if (pa.count < 20000) for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(m); const d = v.distanceTo(p); if (d < bd) { bd = d; best = v.clone() } }
  return best || p;
}

/* ---------------- pointer interaction ---------------- */
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
function pick(ev) {
  const R = renderer.domElement.getBoundingClientRect(); ndc.set((ev.clientX - R.left) / R.width * 2 - 1, -(ev.clientY - R.top) / R.height * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(objGroup.children, true).filter(h => h.object.isMesh || h.object.isInstancedMesh);
  return hits[0] || null;
}
function planePoint(ev, z = 0) { const R = renderer.domElement.getBoundingClientRect(); ndc.set((ev.clientX - R.left) / R.width * 2 - 1, -(ev.clientY - R.top) / R.height * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z), p) ? p : null; }
let drag = null;
renderer.domElement.addEventListener('pointerdown', ev => {
  if (ev.button !== 0) return; $('#alignpop').style.display = 'none';
  if (tc.dragging || tc.axis) return;
  const hit = pick(ev);
  if (mode === 'measure') { const p = hit ? snapToVertex(hit) : planePoint(ev); if (!p) return; if (!measureA) { measureA = p.clone(); $('#hint').textContent = 'Now click the second point.'; } else { pushUndo(); addMeasure(measureA, p.clone()); measureA = null; $('#hint').textContent = 'Click two more points to measure again, or press Esc.'; } return; }
  if (!hit) { if (!ev.shiftKey) selectOnly(null); return; }
  let id = hit.object.userData.id; let o2 = hit.object; while (!id && o2.parent) { o2 = o2.parent; id = o2.userData.id; }
  if (ev.shiftKey) { sel.has(id) ? sel.delete(id) : sel.add(id); updateSelectionVis(); refreshInspector(); return; }
  if (!sel.has(id)) selectOnly(id);
  const o = objs.find(x => x.id === id); const start = planePoint(ev, o.pos[2]); if (!start) return;
  drag = { start, base: selected().map(x => ({ o: x, p: x.pos.slice() })), moved: false, snap: snapshot() };
  renderer.domElement.setPointerCapture(ev.pointerId);
});
renderer.domElement.addEventListener('pointermove', ev => {
  if (!drag) return; const p = planePoint(ev, drag.base[0].p[2]); if (!p) return;
  const dx = snap(p.x - drag.start.x), dy = snap(p.y - drag.start.y);
  if (dx || dy) drag.moved = true;
  drag.base.forEach(({ o, p: bp }) => { o.pos[0] = +(bp[0] + dx).toFixed(3); o.pos[1] = +(bp[1] + dy).toFixed(3); applyObj(roots.get(o.id), o); });
  for (const [id, h] of selBoxes) h.update(); refreshInspector(true);
});
renderer.domElement.addEventListener('pointerup', ev => { if (drag) { if (drag.moved) { undoStack.push(drag.snap); redoStack = []; dirtyTitle(true) } drag = null; } });
renderer.domElement.addEventListener('dblclick', ev => { const hit = pick(ev); if (hit) { const c = new THREE.Box3().setFromObject(roots.get(hit.object.userData.id) || hit.object).getCenter(new THREE.Vector3()); controls.target.copy(c); } });

/* ---------------- keyboard ---------------- */
window.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return }
  if (ctrl && k === 'y') { e.preventDefault(); redo(); return }
  if (ctrl && k === 'd') { e.preventDefault(); duplicateSel(); return }
  if (ctrl && k === 'c') { e.preventDefault(); copySel3(); return }
  if (ctrl && k === 'v') { e.preventDefault(); paste3(); return }
  if (ctrl && k === 'e') { e.preventDefault(); openExport3(); return }
  if (!ctrl && k === 'a' && e.shiftKey) { openArray(); return }
  if (ctrl && k === 'g') { e.preventDefault(); e.shiftKey ? ungroupSel() : groupSel(); return }
  if (ctrl && k === 's') { e.preventDefault(); saveProject(); return }
  if (ctrl && k === 'o') { e.preventDefault(); $('#fileIn').click(); return }
  if (ctrl && k === 'a') { e.preventDefault(); sel = new Set(objs.map(o => o.id)); updateSelectionVis(); refreshInspector(); return }
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSel(); return }
  if (k === 'escape') { setMode('select'); selectOnly(null); $('#alignpop').style.display = 'none'; return }
  if (k === 'h') { pushUndo(); selected().forEach(o => { if (o.kind !== 'board') { o.hole = !o.hole; rebuildOne(o) } }); refreshInspector(); updateTree(); return }
  if (k === 'm') { setMode(mode === 'measure' ? 'select' : 'measure'); return }
  if (k === 'f') { fitView(sel.size ? selected() : objs); return }
  if (k === 'w') { setGizmo('translate'); return } if (k === 'e') { setGizmo('rotate'); return } if (k === 'r') { setGizmo('scale'); return }
  if (k === 'd' && !ctrl) { dropToPlane(); return }
  if (k.startsWith('arrow') && sel.size) { e.preventDefault(); pushUndo(); const st = e.shiftKey ? snapStep * 10 : snapStep; selected().forEach(o => { if (ctrl) { if (k === 'arrowup') o.pos[2] += st; if (k === 'arrowdown') o.pos[2] -= st } else { if (k === 'arrowleft') o.pos[0] -= st; if (k === 'arrowright') o.pos[0] += st; if (k === 'arrowup') o.pos[1] += st; if (k === 'arrowdown') o.pos[1] -= st } applyObj(roots.get(o.id), o) }); for (const [, h] of selBoxes) h.update(); refreshInspector(true); }
});
function dropToPlane() { const s = selected(); if (!s.length) return; pushUndo(); s.forEach(o => { const bb = bboxOf(o); o.pos[2] -= bb.min.z; applyObj(roots.get(o.id), o) }); refreshInspector(); for (const [, h] of selBoxes) h.update(); }
function setGizmo(m) { gizmoMode = gizmoMode === m ? null : m; ['translate', 'rotate', 'scale'].forEach(x => $('#g-' + x).classList.toggle('on', gizmoMode === x)); updateSelectionVis(); }

/* ---------------- views ---------------- */
function fitView(list) {
  const bb = new THREE.Box3(); if (list && list.length) list.forEach(o => bb.union(bboxOf(o))); else bb.set(new THREE.Vector3(-WP.w / 2, -WP.h / 2, 0), new THREE.Vector3(WP.w / 2, WP.h / 2, 20));
  const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3()).length() || 100; const dir = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(c); camera.position.copy(c).add(dir.multiplyScalar(s * 1.4 + 20));
}
function viewDir(v) { const dist = camera.position.distanceTo(controls.target); camera.position.copy(controls.target).add(new THREE.Vector3(...v).normalize().multiplyScalar(dist)); if (v[2] > 0.99) camera.up.set(0, 1, 0); else camera.up.set(0, 0, 1); controls.update(); camera.up.set(0, 0, 1); }

/* ---------------- files ---------------- */
function download(name, data, mime) {
  if (window.cesimNative && window.cesimNative.saveBinary && data instanceof ArrayBuffer) { window.cesimNative.saveBinary(name, b64FromBuf(data)); return; }
  if (window.cesimNative && window.cesimNative.save && typeof data === 'string') { window.cesimNative.save(name, data); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: mime || 'application/octet-stream' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 800);
}
function b64FromBuf(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
let filePath3 = null;
async function saveProject(asNew) { const s = JSON.stringify({ format: 'CEsim3D', version: 1, name: docName, objs, measures: measures.map(m => ({ a: m.a, b: m.b })) }); const N_ = window.cesimNative; if (N_ && N_.write && filePath3 && !asNew) { await N_.write(filePath3, s); toast('Saved ' + filePath3.split(/[\\/]/).pop()); } else if (N_ && N_.save) { const r = await N_.save(docName.replace(/[^\w.-]+/g, '_') + '.ce3d', s); if (r) { filePath3 = r; docName = r.split(/[\\/]/).pop().replace(/\.ce3d$/i, ''); toast('Saved ' + r.split(/[\\/]/).pop()); } } else download(docName.replace(/[^\w.-]+/g, '_') + '.ce3d', s, 'application/json'); dirtyTitle(false); try { localStorage.setItem('cesim3d.autosave', s) } catch (e) { } }
function exportScene(onlySel) {
  const pool = onlySel ? objs.filter(o => sel.has(o.id)) : objs.filter(o => o.exportable !== false);
  const holesLeft = pool.filter(o => o.hole);
  const sc = new THREE.Scene();
  pool.filter(o => !o.hole).forEach(o => { const r = roots.get(o.id); r.updateMatrixWorld(true); r.traverse(m => { if (m.isMesh && !m.isInstancedMesh) { const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); const mm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: o.color })); mm.userData.color = o.color; sc.add(mm) } }) });
  if (holesLeft.length) toast(holesLeft.length + ' hole shape(s) are not grouped yet. Group them with a solid (Ctrl+G) to cut them.');
  if (!sc.children.length) { toast('Nothing to export. Boards are excluded by default; tick "Include in export" to add one.', true); return null; }
  return sc;
}
function exportAs(kind, opt = {}) {
  if (kind === 'jpg' || kind === 'webp' || kind === 'png') { const mime = 'image/' + (kind === 'jpg' ? 'jpeg' : kind); const url = renderClean(Math.max(1, +opt.scale || 1), cv => imageWithBg(cv, mime)); saveUrl(docName.replace(/[^\w.-]+/g, '_') + '.' + kind, url); return; }
  if (kind === 'svg') { download(docName.replace(/[^\w.-]+/g, '_') + '.svg', exportSVG3(), 'image/svg+xml'); return; }
  if (kind === 'csv') { download(docName.replace(/[^\w.-]+/g, '_') + '_report.csv', csvReport(), 'text/csv'); return; }
  if (kind === 'png_old') { const sc0 = Math.max(1, +opt.scale || 1); const r = wrap.getBoundingClientRect(); renderer.setPixelRatio((window.devicePixelRatio || 1) * sc0); renderer.setSize(r.width, r.height, false); for (const [, h] of selBoxes) h.visible = false; tc.getHelper && (tc.getHelper().visible = false); gridGroup.visible = showGrid; renderer.render(scene, camera); const url = renderer.domElement.toDataURL('image/png'); renderer.setPixelRatio(window.devicePixelRatio || 1); resize(); for (const [, h] of selBoxes) h.visible = true; tc.getHelper && (tc.getHelper().visible = true); const nm = docName.replace(/[^\w.-]+/g, '_') + '.png'; if (window.cesimNative && window.cesimNative.saveBinary) window.cesimNative.saveBinary(nm, url.split(',')[1]); else { const a = document.createElement('a'); a.href = url; a.download = nm; a.click(); } return; }
  const sc = exportScene(opt.area === 'sel'); if (!sc) return; const base = docName.replace(/[^\w.-]+/g, '_');
  if (kind === 'stl') { const dv = new STLExporter().parse(sc, { binary: true }); download(base + '.stl', dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength)); }
  else if (kind === 'stla') download(base + '.stl', new STLExporter().parse(sc, { binary: false }), 'model/stl');
  else if (kind === '3mf') { sc.updateMatrixWorld(true); download(base + '.3mf', to3MF(sc.children.map(m => ({ mesh: m, color: m.userData.color || '#888888' })))); }
  else if (kind === 'obj') download(base + '.obj', new OBJExporter().parse(sc), 'text/plain');
  else if (kind === 'glb') new GLTFExporter().parse(sc, r => download(base + '.glb', r), e => toast('Export failed: ' + e.message, true), { binary: true });
}
function importGeometryObject(name, g) {
  g = ensureAttrs(g); const st = storeMeshGeom(g); pushUndo();
  const o = { id: uidGen(), kind: 'mesh', name, color: PALETTE[colorIdx++ % PALETTE.length], hole: false, pos: [0, 0, 0], rot: [0, 0, 0], size: st.natural.slice(), natural: st.natural, geom: st.geom, exportable: true };
  placeFree(o); objs.push(o); if (objs.length === 1) { docName = name; dirtyTitle(false); } rebuildOne(o); selectOnly(o.id); updateTree(); fitView([o]);
  toast(`Imported ${name}: ${st.natural.map(v => v.toFixed(1)).join(' × ')} mm`);
}
function mergeObject3D(obj) { const gs = []; obj.updateMatrixWorld(true); obj.traverse(m => { if (m.isMesh) { const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); gs.push(ensureAttrs(g)) } }); if (!gs.length) throw new Error('No mesh found in the file.'); return gs.length === 1 ? gs[0] : mergeGeometries(gs); }
/* lay parts out in rows by their real footprint (used by the System model tool) */
function packObjs(list, maxW) {
  const W = +maxW > 0 ? +maxW : 260, gap = 10; let x = 0, y = 0, rowD = 0; const at = [];
  for (const o of list) { const sz = o.size || o.natural || [20, 20, 20]; const w = sz[0], d = sz[1]; if (x > 0 && x + w > W) { x = 0; y += rowD + gap; rowD = 0; } at.push([o, x + w / 2, y + d / 2]); x += w + gap; rowD = Math.max(rowD, d); }
  const tw = Math.max(0, ...at.map(([o, cx]) => cx + (o.size || o.natural || [20])[0] / 2)), td = y + rowD;
  for (const [o, cx, cy] of at) { o.pos = [+(cx - tw / 2).toFixed(2), +(td / 2 - cy).toFixed(2), o.pos ? o.pos[2] : 0]; }
}
async function openFile(name, data) {
  const ext = name.split('.').pop().toLowerCase(); const base = name.replace(/\.[^.]+$/, '');
  try {
    if (ext === 'ce3d' || ext === 'json') { const o = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); if (o.format !== 'CEsim3D') throw new Error('Not a CEsim 3D file.'); pushUndo(); objs = o.objs; docName = o.name || base; clearMeasures(); (o.measures || []).forEach(m => addMeasure(new THREE.Vector3(...m.a), new THREE.Vector3(...m.b))); sel.clear(); rebuildAll(); if (o.pack) { packObjs(objs, o.pack); rebuildAll(); } fitView(objs); dirtyTitle(false); return; }
    const buf = typeof data === 'string' ? new TextEncoder().encode(data).buffer : data;
    if (ext === 'stl') importGeometryObject(base, new STLLoader().parse(buf));
    else if (ext === 'obj') importGeometryObject(base, mergeObject3D(new OBJLoader().parse(new TextDecoder().decode(buf))));
    else if (ext === '3mf') importGeometryObject(base, mergeObject3D(new ThreeMFLoader().parse(buf)));
    else throw new Error('This format is not supported. Open .ce3d, .stl, .obj or .3mf.');
  } catch (err) { console.error(err); toast('Could not open ' + name + ': ' + err.message, true); }
}
window.cesimOpenText = (name, text, path) => { filePath3 = path && /\.ce3d$/i.test(path) ? path : null; openFile(name, text); };
window.cesimOpenBinary = (name, b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); openFile(name, u.buffer); };
$('#fileIn').addEventListener('change', async e => { for (const f of e.target.files) { const b = await f.arrayBuffer(); await openFile(f.name, b); } e.target.value = ''; });
wrap.addEventListener('dragover', e => e.preventDefault());
wrap.addEventListener('drop', async e => { e.preventDefault(); for (const f of e.dataTransfer.files) openFile(f.name, await f.arrayBuffer()); });

/* ---------------- toolbar wiring ---------------- */
const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
on('#b-new', () => { if (objs.length && !confirmInline()) return; pushUndo(); objs = []; sel.clear(); clearMeasures(); docName = 'Untitled'; rebuildAll(); dirtyTitle(false); });
function confirmInline() { return true; }
on('#b-open', () => $('#fileIn').click()); on('#b-import', () => $('#fileIn').click()); on('#b-save', saveProject);
on('#b-undo', undo); on('#b-redo', redo); on('#b-group', groupSel); on('#b-ungroup', ungroupSel); on('#b-align', openAlign); on('#b-dup', duplicateSel); on('#b-del', deleteSel); on('#b-drop', dropToPlane);
on('#b-mx', () => mirror('x')); on('#b-my', () => mirror('y')); on('#b-mz', () => mirror('z'));
on('#b-array', openArray); on('#b-shell', openShell); on('#b-enc', openEnclosure);
on('#b-measure', () => setMode(mode === 'measure' ? 'select' : 'measure')); on('#b-clearm', () => { pushUndo(); clearMeasures() });
on('#g-translate', () => setGizmo('translate')); on('#g-rotate', () => setGizmo('rotate')); on('#g-scale', () => setGizmo('scale'));
on('#v-set', openSettings3); on('#v-shot', e => openShot3(e.currentTarget));
on('#v-home', () => { camera.position.set(170, -230, 190); controls.target.set(0, 0, 0); camera.up.set(0, 0, 1) }); on('#v-fit', () => fitView(sel.size ? selected() : objs));
on('#v-top', () => viewDir([0, 0, 1])); on('#v-front', () => viewDir([0, -1, 0])); on('#v-right', () => viewDir([1, 0, 0])); on('#v-iso', () => viewDir([1, -1, 1]));
on('#v-zin', () => { camera.position.lerp(controls.target, 0.25) }); on('#v-zout', () => { camera.position.sub(controls.target).multiplyScalar(1.33).add(controls.target) });
on('#b-export', openExport3);
$('#snapSel').addEventListener('change', e => { snapStep = parseFloat(e.target.value); tc.setTranslationSnap(snapStep); });
$('#unitSel').addEventListener('change', e => { units = e.target.value; refreshInspector(); });
$('#viewSel').addEventListener('change', e => { const v = e.target.value; e.target.value = ''; if (v === 'grid') { showGrid = !showGrid; gridGroup.visible = showGrid; } if (v === 'dims') { showDims = !showDims; } if (v === 'dark') { const dk = scene.background.getHexString() !== '1b2230'; SET.bg = dk ? '#1b2230' : '#eef2f7'; applySettings(); } if (v === 'settings') openSettings3(); if (v === 'help') $('#help3').style.display = 'block'; });
$('#wpSel').addEventListener('change', e => { const [w, h] = e.target.value.split('x').map(Number); SET.gridW = w; SET.gridH = h; applySettings(); });
(() => { const ws = $('#wpSel'); const v = SET.gridW + 'x' + SET.gridH; if (![...ws.options].some(o => o.value === v)) ws.add(new Option(SET.gridW + '×' + SET.gridH, v)); ws.value = v; })();
document.querySelectorAll('[data-shape]').forEach(b => b.addEventListener('click', () => addPrimitive(b.dataset.shape, { hole: b.dataset.hole === '1' })));
const BOPEN = new Set();
function listBoards(q) { q = (q || '').trim().toLowerCase(); const grp = {}; for (const k of Object.keys(BOARDS)) { const B = BOARDS[k]; const g = B.g || 'Boards'; if (q && !(k + ' ' + g + ' ' + (B.sub || '') + ' ' + B.note).toLowerCase().includes(q)) continue; (grp[g] = grp[g] || []).push(k); }
  const btn = k => `<button class="bl" data-board="${k.replace(/"/g, '&quot;')}" title="${BOARDS[k].note.replace(/"/g, '&quot;')}"><b>${k}</b><span>${BOARDS[k].w} × ${BOARDS[k].d} mm</span></button>`;
  const first = ['Boards', 'Sensors', 'Drone', 'Motors', 'Power', 'Modules', 'Tools']; const cat = PLIB ? Object.values(PLIB.SEC) : [];
  const order = [...first.filter(g => grp[g]), ...Object.keys(grp).filter(g => !first.includes(g) && !cat.includes(g)), ...cat.filter(g => grp[g])];
  $('#boards').innerHTML = `<input id="bq3" type="search" placeholder="Search boards, sensors, parts and packages" value="${q.replace(/"/g, '')}" style="height:28px;border:1px solid var(--line);border-radius:4px;padding:0 8px;font:12px var(--font);margin-bottom:4px">` + order.map(g => {
    if (!cat.includes(g)) return `<div class="muted" style="margin:6px 0 2px;font-weight:600">${g}</div>` + grp[g].map(btn).join('');
    const subs = {}; for (const k of grp[g]) (subs[BOARDS[k].sub] = subs[BOARDS[k].sub] || []).push(k);
    return `<div class="muted" style="margin:8px 0 2px;font-weight:600">${g}</div>` + Object.keys(subs).map(sb => { const id = g + '|' + sb; const open = q || BOPEN.has(id); return `<details data-g="${id.replace(/"/g, '&quot;')}"${open ? ' open' : ''} style="margin:0 0 2px 2px"><summary style="cursor:pointer;font-size:12px;padding:3px 0">${sb} <span class="muted">${subs[sb].length}</span></summary>${open ? subs[sb].map(btn).join('') : ''}</details>`; }).join('');
  }).join('') + (order.length ? '' : '<div class="muted">Nothing matches</div>');
  $('#boards').querySelectorAll('details[data-g]').forEach(d => d.addEventListener('toggle', () => { const id = d.dataset.g; if (d.open) { if (q || BOPEN.has(id)) return; BOPEN.add(id); listBoards($('#bq3').value); } else BOPEN.delete(id); }));
  const i = $('#bq3'); i.oninput = () => { const pos = i.selectionStart; listBoards(i.value); const j = $('#bq3'); j.focus(); j.setSelectionRange(pos, pos); }; }
listBoards('');
$('#boards').addEventListener('click', e => { const b = e.target.closest('[data-board]'); if (b) addBoard(b.dataset.board); });
on('#alignbtn-close', () => $('#alignpop').style.display = 'none');

/* ---------------- loop ---------------- */
function resize() { const r = wrap.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();
function loop() { controls.update(); for (const [, h] of selBoxes) h.update(); renderer.render(scene, camera); updateDims(); updateMeasureLabels(); requestAnimationFrame(loop); }
loop();

/* start with a small example so the workspace is not empty */
(function start() {
  try { const a = localStorage.getItem('cesim3d.autosave'); if (a && !location.search.includes('blank')) { const o = JSON.parse(a); objs = o.objs || []; docName = o.name || 'Untitled'; } } catch (e) { }
  if (!objs.length && !location.search.includes('blank')) {
    const box = { id: uidGen(), kind: 'roundbox', name: 'Enclosure base', color: '#2f6fdb', hole: false, pos: [0, 0, 0], rot: [0, 0, 0], size: [78, 63, 22], params: {}, exportable: true };
    const cav = { id: uidGen(), kind: 'roundbox', name: 'Cavity', color: '#999', hole: true, pos: [0, 0, 2], rot: [0, 0, 0], size: [72, 57, 22], params: {}, exportable: true };
    const usb = { id: uidGen(), kind: 'box', name: 'USB cut-out', color: '#999', hole: true, pos: [-37.5, 11.1, 3.5], rot: [0, 0, 0], size: [8, 15, 13], params: {}, exportable: true };
    const jack = { id: uidGen(), kind: 'box', name: 'Power jack cut-out', color: '#999', hole: true, pos: [-37.5, -18.9, 3.5], rot: [0, 0, 0], size: [8, 11, 13], params: {}, exportable: true };
    const uno = { id: uidGen(), kind: 'board', name: 'Arduino Uno R3', color: '#0b7fa3', hole: false, pos: [-3.17, 0, 3], rot: [0, 0, 0], size: null, natural: null, params: { model: 'Arduino Uno R3' }, exportable: false };
    objs = [box, cav, usb, jack, uno]; docName = 'Uno enclosure example';
  }
  rebuildAll(); dirtyTitle(false); fitView(objs);
  setInterval(() => { try { localStorage.setItem('cesim3d.autosave', JSON.stringify({ format: 'CEsim3D', name: docName, objs })) } catch (e) { } }, 4000);
})();
window.CE3D = { buildBoard, openSettings3, SET: () => SET, controls, csvReport, exportSVG3, openShot3, openArray, openShell, openEnclosure, buildEnclosure, BOARDS, to3MF, exportScene, copySel3, paste3, objs: () => objs, addPrimitive, addBoard, groupSel, selectOnly, exportAs, openFile, sel: () => sel, measure: (a, b) => addMeasure(new THREE.Vector3(...a), new THREE.Vector3(...b)), fitView };
