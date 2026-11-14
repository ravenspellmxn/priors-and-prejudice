// 06 Be the mouse: the diorama's rig seen from just behind the mouse's head, looking at the grating screen.
// Geometry and Wet Lab materials are copied from the ABRCMS diorama (~/src/diorama-scenes/priors-and-prejudice/src/main.js).
// The screen shows the site's own 2D Grating canvas (#g6) as a texture, so the stimulus is pixel for pixel the 2D game's.
// Visual only: the game logic, timing and scoring stay in app.js. Build: node build-3d.mjs -> be-the-mouse.js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStrokedToon } from './stroked-toon.js';

const Y0 = 0.125, P0 = Y0 + 0.08;
const RX = -0.6;
const AXIS = P0 + 0.5;
const TUBE = { r: 0.3, t: 0.03, z0: 0.18, z1: 1.18 };
const BODY = { c: new THREE.Vector3(RX, AXIS - 0.07, 0.62), s: [0.25, 0.23, 0.42] };
const HEAD = { c: new THREE.Vector3(RX, AXIS + 0.0, 0.1), s: [0.19, 0.18, 0.22] };
const MOUTH = new THREE.Vector3(RX, AXIS - 0.07, -0.2);
const TIP = { x: 0.06, y: AXIS - 0.08, z: -0.27 };
// same monitor as the diorama, with a 4:3 screen to match the site's 320x240 grating canvas
const MON = { x: RX, y: Y0 + 0.78, z: -1.55, yaw: 0, w: 1.7, h: 1.45, d: 0.08, sw: 1.56, sh: 1.17 };
const C = { ink: '#0e2233', graphite: '#3b4650', en1: '#fdfefd', en2: '#eceff0', steel2: '#aeb6bd', tint: '#35a3a0' };

export function mount(container, gratingCanvas, { onLick = () => {}, reduceMotion = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'bm3d';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Three dimensional view from behind a toy mouse at the lab rig: the grating screen ahead and the mouse\'s head below it. A round loupe in the bottom right corner shows the snout and both lick spouts up close: the tongue reaching a spout, the lick light, and a water drop after a correct lick. Use the LEFT and RIGHT buttons to lick.');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const look = createStrokedToon(renderer, { ink: 0x1a2a38, dpr: Math.min(2, window.devicePixelRatio || 1) });
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.05, 50);
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xc9cdd4, 1.55));
  const key = new THREE.DirectionalLight(0xfff3e0, 2.55);
  key.position.set(-6, 9, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 25 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.72); fill.position.set(6, 4, -3); scene.add(fill);
// the companion site's steelG gradient as a brushed-chrome map
const steelTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 4; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0);
  [[0, '#b6bfc6'], [0.45, '#f4f6f7'], [0.55, '#d0d6db'], [1, '#9aa4ac']].forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const M = {
  slab: look.toon(0xfdfefd), cabinet: look.toon(0xa9bccb), door: look.toon(0xd3e0e9), chrome: look.toon(0xffffff, { map: steelTex }), board_side: look.toon(0x3b4650), printed: look.toon(0xc3cad0), copper: look.toon(0xb36b45),
  steel: look.toon(0xd5dbe0), black: look.toon(0x3b4650), cement: look.toon(0xf1ece1), whiteBar: look.toon(0xfdfefd),
  fur: look.toon(0x2b3a46), pink: look.toon(0xe7a7a4), eye: look.toon(0x0e2233), whisker: look.toon(0xaeb6bd, { outline: false }),
  frame: look.toon(0x3b4650), stand: look.toon(0x3b4650), hub: look.toon(0x1f7a77), redWire: look.toon(0xb93179, { outline: false }),
  line: look.toon(0xf3f7f9, { outline: false }), cable: look.toon(0x3a5264, { outline: false }),
  waterCol: look.toon(0x9fd6d3, { outline: false }),
  water: look.toon(0x9fd6d3, { outline: false }), tongue: look.toon(0xe58f97),
  tray: look.toon(0xaeb6bd), board: look.toon(0xeceff0), roller: look.toon(0xaeb6bd), sign: look.toon(0xfdfefd),
  glass: look.toon(0xf3f7f9, { transparent: true, opacity: 0.3, depthWrite: false, stroke: 0.0022 }),
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mesh(geo, mat, parent, pos, name) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  m.name = name || '';
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const groups = {};
const part = id => (groups[id] ||= (() => { const g = new THREE.Group(); g.name = id; scene.add(g); return g; })());
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { c, ctx: c.getContext('2d'), tex };
}
const FONT = "'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif", MONO = "'Geist Mono', ui-monospace, Menlo, monospace";
// enamel plate: white enamel, a navy line inset, steel rim (Wet Lab .plate)
function enamel(ctx, w, h, r = 18) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, C.en1); g.addColorStop(1, C.en2);
  ctx.fillStyle = C.steel2; ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, r - 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(9, 9, w - 18, h - 18, Math.max(2, r - 8)); ctx.stroke();
}
function decal(tex, w, h, parent, pos, name) {
  const m = mesh(new THREE.PlaneGeometry(w, h), look.flat(0xffffff, { map: tex.tex }), parent, pos, name);
  m.castShadow = false; m.userData.decal = true;
  return m;
}
function between(a, b, r, mat, parent, name) {   // cylinder from point a to point b
  const d = b.clone().sub(a), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), mat, parent, a.clone().add(b).multiplyScalar(0.5), name);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}
// ---------- breadboard (black Thorlabs-style, hole grid) ----------
const plat = part('platform');
const holes = canvasTex(512, 512);
{
  const { ctx } = holes; ctx.fillStyle = C.graphite; ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#222b33';
  for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) { ctx.beginPath(); ctx.arc(18 + i * 34.4, 18 + j * 34.4, 6.5, 0, 2 * Math.PI); ctx.fill(); }
  holes.tex.needsUpdate = true;
}
const BB = { x: RX + 0.3, z: 0.1, w: 2.45, d: 2.6 };
const bbMat = [M.board_side, M.board_side, look.toon(0xffffff, { map: holes.tex }), M.board_side, M.board_side, M.board_side];
mesh(new THREE.BoxGeometry(BB.w, P0 - Y0, BB.d), bbMat, plat, V(BB.x, (P0 + Y0) / 2, BB.z), 'breadboard');
// post + gray printed holder: holder block on the board, stainless post rising to y1
function postAt(x, z, y1, owner, name, r = 0.032) {
  mesh(new RoundedBoxGeometry(0.16, 0.12, 0.2, 2, 0.02), M.printed, owner, V(x, P0 + 0.06, z), `${name}-holder`);
  between(V(x, P0 + 0.06, z), V(x, y1, z), r, M.steel, owner, `${name}-post`);
}
// gray 3D-printed half-tube holder; front end wrapped in copper tape (lick circuit ground)
const arc = new THREE.Shape();
arc.absarc(0, 0, TUBE.r + TUBE.t, Math.PI, 2 * Math.PI, false);
arc.absarc(0, 0, TUBE.r, 2 * Math.PI, Math.PI, true);
mesh(new THREE.ExtrudeGeometry(arc, { depth: TUBE.z1 - TUBE.z0, bevelEnabled: false, curveSegments: 32 }), M.printed, plat, V(RX, AXIS, TUBE.z0), 'tube-holder');
const cu = new THREE.Shape();
cu.absarc(0, 0, TUBE.r + TUBE.t + 0.008, Math.PI - 0.08, 2 * Math.PI + 0.08, false);
cu.absarc(0, 0, TUBE.r - 0.006, 2 * Math.PI + 0.08, Math.PI - 0.08, true);
mesh(new THREE.ExtrudeGeometry(cu, { depth: 0.24, bevelEnabled: false, curveSegments: 32 }), M.copper, plat, V(RX, AXIS, TUBE.z0 - 0.004), 'copper-tape');
mesh(new RoundedBoxGeometry(0.36, 0.08, 0.22, 2, 0.02), M.printed, plat, V(RX, AXIS - TUBE.r - TUBE.t - 0.04, 0.72), 'tube-clamp');
postAt(RX, 0.72, AXIS - TUBE.r - TUBE.t - 0.08, plat, 'tube');

// ---------- the mouse (toy; black fur like the lab's mice) ----------
const mouse = part('mouse');
const bodyM = mesh(new THREE.SphereGeometry(1, 40, 28), M.fur, mouse, BODY.c, 'body'); bodyM.scale.set(...BODY.s);
const headM = mesh(new THREE.SphereGeometry(1, 40, 28), M.fur, mouse, HEAD.c, 'head'); headM.scale.set(...HEAD.s);
const snout = mesh(new THREE.SphereGeometry(1, 28, 20), M.fur, mouse, V(RX, AXIS - 0.04, -0.07), 'snout'); snout.scale.set(0.1, 0.09, 0.15);
mesh(new THREE.SphereGeometry(0.03, 16, 12), M.pink, mouse, V(RX, AXIS - 0.03, -0.215), 'nose');
const ears = [];
for (const s of [-1, 1]) {
  const ear = new THREE.Group(); ear.position.set(RX + s * 0.15, AXIS + 0.12, 0.2); mouse.add(ear);
  const e = mesh(new THREE.SphereGeometry(1, 24, 16), M.fur, ear, V(0, 0.05, 0), 'ear'); e.scale.set(0.08, 0.08, 0.024);
  const ei = mesh(new THREE.SphereGeometry(1, 20, 14), M.pink, ear, V(0, 0.05, -0.011), 'ear-inner'); ei.scale.set(0.055, 0.055, 0.016);
  ear.rotation.set(-0.15, 0, -s * 0.75);
  ears.push(ear);
  mesh(new THREE.SphereGeometry(0.028, 16, 12), M.eye, mouse, V(RX + s * 0.11, AXIS + 0.04, -0.04), 'eye');
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Group(); w.position.set(RX + s * 0.06, AXIS - 0.045, -0.17); mouse.add(w);
    const wm = mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.22, 6), M.whisker, w, V(0, 0.11, 0), 'whisker'); wm.castShadow = false;
    w.rotation.set(0, 0, -s * (1.25 + (i - 1) * 0.16));
    w.userData.base = w.rotation.z; w.userData.side = s; w.userData.i = i;
    ears.push(w);
  }
  // forepaws on the copper-taped front lip, hind paws on the holder floor
  mesh(new THREE.SphereGeometry(0.04, 16, 12), M.pink, mouse, V(RX + s * 0.1, AXIS - 0.2, TUBE.z0 + 0.02), 'forepaw');
  const hpw = mesh(new THREE.SphereGeometry(0.05, 16, 12), M.pink, mouse, V(RX + s * 0.13, AXIS - 0.25, 0.92), 'hindpaw'); hpw.scale.set(1, 0.6, 1.5);
}
const whiskers = ears.filter(o => o.userData.side);
const tailCurve = new THREE.CatmullRomCurve3([V(RX, AXIS - 0.1, 1.0), V(RX, AXIS - 0.12, 1.25), V(RX + 0.1, P0 + 0.14, 1.32), V(RX + 0.3, P0 + 0.03, 1.2), V(RX + 0.45, P0 + 0.03, 0.95)]);
mesh(new THREE.TubeGeometry(tailCurve, 40, 0.022, 10), M.pink, mouse, null, 'tail');
const tongue = new THREE.Group(); tongue.position.copy(MOUTH); mouse.add(tongue);
const tongueGeo = new THREE.CapsuleGeometry(0.026, 0.06, 6, 12); tongueGeo.translate(0, 0.05, 0);
const tongueM = mesh(tongueGeo, M.tongue, tongue, null, 'tongue');

// ---------- head fixation: cream cement headcap, headplate pinched by two conical-tip posts ----------
const hp = part('headpost');
const cap = mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.cement, hp, V(RX, AXIS + 0.13, 0.12), 'headcap'); cap.scale.set(0.095, 0.05, 0.1);
const PLATE_Y = AXIS + 0.16, PLATE_Z = 0.12;
mesh(new RoundedBoxGeometry(0.42, 0.022, 0.09, 2, 0.008), M.steel, hp, V(RX, PLATE_Y, PLATE_Z), 'headplate');
for (const s of [-1, 1]) {
  const tipX = RX + s * 0.21, rodX0 = RX + s * 0.3, rodX1 = RX + s * 0.66;
  const cone = mesh(new THREE.ConeGeometry(0.035, 0.09, 20), M.black, hp, V(RX + s * 0.255, PLATE_Y, PLATE_Z), 'post-cone-tip');
  cone.rotation.z = s * Math.PI / 2;      // apex points inward at the plate
  void tipX;
  between(V(rodX0, PLATE_Y, PLATE_Z), V(rodX1, PLATE_Y, PLATE_Z), 0.035, M.black, hp, 'pinch-post');
  mesh(new RoundedBoxGeometry(0.12, 0.12, 0.12, 2, 0.02), M.black, hp, V(rodX1 + s * 0.04, PLATE_Y, PLATE_Z), 'right-angle-clamp');
  postAt(rodX1 + s * 0.04, PLATE_Z, PLATE_Y - 0.06, hp, 'pinch');
}

// ---------- lick spouts: two U-bent hairpin stainless tubes on white bars ----------
const sp = part('spouts');
const tips = {}, spoutEnds = {};
for (const s of [-1, 1]) {
  const x = RX + s * TIP.x, yT = TIP.y, yL = TIP.y - 0.22, zF = -0.6, rB = 0.11;
  const tip = V(x, yT, TIP.z); tips[s] = tip;
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(tip, V(x, yT, zF + 0.0)));
  path.add(new THREE.CubicBezierCurve3(V(x, yT, zF), V(x, yT, zF - rB * 1.35), V(x, yL, zF - rB * 1.35), V(x, yL, zF)));
  path.add(new THREE.LineCurve3(V(x, yL, zF), V(x, yL, -0.36)));
  mesh(new THREE.TubeGeometry(path, 60, 0.013, 10), M.steel, sp, null, s > 0 ? 'spout-right' : 'spout-left');
  spoutEnds[s] = V(x, yL, -0.36);
  // gray printed block with two screws clamps the spout to a white bar running out to a post
  mesh(new RoundedBoxGeometry(0.1, 0.05, 0.08, 2, 0.01), M.printed, sp, V(x, yL - 0.035, -0.42), 'spout-clamp');
  for (const dz of [-0.018, 0.018]) mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 10), M.steel, sp, V(x, yL - 0.004, -0.42 + dz), 'screw');
  const barEnd = RX + s * 0.5;
  between(V(x, yL - 0.075, -0.42), V(barEnd, yL - 0.075, -0.42), 0.026, M.whiteBar, sp, 'white-bar');
  postAt(barEnd, -0.42, yL - 0.1, sp, 'spout');
}
const drops = {};
for (const s of [-1, 1]) { drops[s] = mesh(new THREE.SphereGeometry(0.045, 16, 12), M.water, sp, V(tips[s].x, tips[s].y - 0.022, tips[s].z + 0.004), 'water-drop'); drops[s].scale.y = 1.2; }

// ---------- contact-circuit lick detector: two-LED indicator box, wired to the copper tape and spouts ----------
const lk = part('lickbox');
const LB = V(RX - 0.72, P0 + 0.09, -0.62);
mesh(new RoundedBoxGeometry(0.34, 0.18, 0.24, 2, 0.02), M.black, lk, LB, 'led-box');
const leds = {};
for (const s of [-1, 1]) leds[s] = mesh(new THREE.SphereGeometry(0.04, 14, 10), look.flat(0x6b4a5c), lk, V(LB.x + s * 0.08, LB.y + 0.095, LB.z + s * 0.05), s > 0 ? 'led-right' : 'led-left');
const cuWire = new THREE.CatmullRomCurve3([V(RX - 0.31, AXIS - 0.1, TUBE.z0 + 0.1), V(RX - 0.45, P0 + 0.06, -0.1), V(LB.x + 0.05, P0 + 0.04, LB.z + 0.3), V(LB.x, LB.y, LB.z + 0.12)]);
mesh(new THREE.TubeGeometry(cuWire, 40, 0.008, 6), M.redWire, lk, null, 'ground-wire');
for (const s of [-1, 1]) mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(RX + s * 0.5, TIP.y - 0.3, -0.42), V(RX + s * 0.3, P0 + 0.03, -0.75), V(LB.x + s * 0.06, P0 + 0.03, LB.z + 0.25), V(LB.x + s * 0.06, LB.y - 0.02, LB.z + 0.12)]), 40, 0.008, 6), M.redWire, lk, null, 'spout-wire');

// ---------- monitor + grating: directly in front of the mouse, facing it (per Raven) ----------
const mon = part('monitor');
mon.position.set(MON.x, 0, MON.z); mon.rotation.y = THREE.MathUtils.degToRad(MON.yaw);
mesh(new RoundedBoxGeometry(MON.w, MON.h, MON.d, 3, 0.03), M.chrome, mon, V(0, MON.y, 0), 'monitor-frame');
mesh(new THREE.BoxGeometry(0.12, MON.y - MON.h / 2 - Y0, 0.06), M.chrome, mon, V(0, (MON.y - MON.h / 2 + Y0) / 2, -0.06), 'monitor-neck');
mesh(new RoundedBoxGeometry(0.7, 0.04, 0.4, 2, 0.015), M.chrome, mon, V(0, Y0 + 0.02, -0.06), 'monitor-foot');
  // the screen: the site's own grating canvas, updated every frame
  // read the 2D canvas's pixels each frame (a canvas-to-texture upload tore on some GPUs; pixels are robust)
  const gCtx = gratingCanvas.getContext('2d'), GW = gratingCanvas.width, GH = gratingCanvas.height;
  const gTex = new THREE.DataTexture(new Uint8Array(GW * GH * 4), GW, GH, THREE.RGBAFormat);
  gTex.colorSpace = THREE.SRGBColorSpace; gTex.minFilter = gTex.magFilter = THREE.LinearFilter;
  gTex.repeat.set(1, -1); gTex.offset.set(0, 1);   // canvas rows run top to bottom
  const screen = mesh(new THREE.PlaneGeometry(MON.sw, MON.sh), look.flat(0xffffff, { map: gTex }), mon, V(0, MON.y, MON.d / 2 + 0.002), 'screen'); screen.castShadow = false;

  // camera: behind the mouse, LEVEL and square to the screen (no keystone). It sits a little above the screen's
  // centre so the mouse and spouts drop below the screen; a vertical lens shift (not a tilt) frames both.
  const CAM_Y = 2.05, CAM_Z = 2.0, CAM_X = MON.x;   // centred behind the mouse, high enough that the head drops below the screen
  camera.position.set(CAM_X, CAM_Y, CAM_Z); camera.lookAt(CAM_X, CAM_Y, MON.z);
  // in frame: the monitor's corners, the ears and headcap, and the shoulders
  const fitPts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) fitPts.push(V(MON.x + sx * MON.w / 2, MON.y + sy * MON.h / 2, MON.z + MON.d / 2));
  for (const sx of [-1, 1]) fitPts.push(V(RX + sx * 0.24, AXIS + 0.2, 0.2), V(RX + sx * 0.27, AXIS - 0.12, 0.5));

  // loupe: a second camera on the head and both spouts in side profile,
  // drawn into a render target in the same renderer, then shown as a round glass inset with a chrome rim
  const loupe = new THREE.PerspectiveCamera(34, 1, 0.05, 1.75);   // short far plane: the rig behind drops out, leaving plain glass
  loupe.position.set(RX + 1.0, AXIS + 0.3, -0.7); loupe.lookAt(RX, AXIS - 0.06, -0.3);   // side profile from the mouse's right, a little forward so the near and far spouts separate
  const rt = new THREE.WebGLRenderTarget(256, 256, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const ov = new THREE.Scene(), ovCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 64), new THREE.MeshBasicMaterial({ map: rt.texture }));
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 64), new THREE.MeshBasicMaterial({ map: steelTex }));
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.575, 64), new THREE.MeshBasicMaterial({ color: 0x8f9aa3 }));
  // glass sheen across the lens (wetlab .glass highlight)
  const sheen = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.47, 48, 1, Math.PI * 0.58, Math.PI * 0.42), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthTest: false }));
  ov.add(lens, rim, edge, sheen);

  // lick state, driven by app.js through lick(side, ok)
  const clamps = {};
  sp.traverse(o => { if (o.name === 'spout-clamp') clamps[o.position.x > RX ? 1 : -1] = o; });
  const clampMat = { '-1': M.printed.clone(), '1': M.printed.clone() };
  for (const s of [-1, 1]) { clamps[s].material = clampMat[s]; drops[s].visible = false; }
  tongueM.visible = false;
  let lk0 = -1e9, side = 1, ok = false;
  const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  function frame(now) {
    gTex.image.data.set(gCtx.getImageData(0, 0, GW, GH).data); gTex.needsUpdate = true;
    const t = (now - lk0) / 1000;                       // seconds since the lick
    const ext = t >= 0 ? smooth(0, 0.07, t) * (1 - smooth(0.3, 0.42, t)) : 0;   // out, hold at the spout, back: all inside the game's 500 ms gap
    const tip = tips[side];
    tongue.quaternion.setFromUnitVectors(V(0, 1, 0), tip.clone().sub(MOUTH).normalize());
    tongue.scale.setScalar(0.25 + 0.75 * ext); tongue.scale.y = 0.05 + 1.12 * ext; tongueM.visible = ext > 0.02;
    for (const s of [-1, 1]) {
      const mine = s === side;
      leds[s].material.color.setHex(mine && t >= 0.05 && t < 0.4 ? 0xe86aae : 0x6b4a5c);
      clampMat[s].color.setHex(mine && ok && t >= 0.07 && t < 0.2 ? 0x35a3a0 : 0xc3cad0);   // the valve opens
      const show = mine && ok && t >= 0.07 && t < 0.49;
      drops[s].visible = show;
      if (show) { const g = smooth(0.07, 0.14, t) * (1 - smooth(0.34, 0.49, t)); drops[s].scale.set(Math.max(0.05, g), Math.max(0.05, g) * 1.2, Math.max(0.05, g)); }
    }
    if (!reduceMotion) { const b = 1 + 0.02 * Math.sin(now / 1000 * 2 * Math.PI * 1.6); bodyM.scale.set(BODY.s[0] * b, BODY.s[1] * b, BODY.s[2]); }
    // loupe pass into its render target, glass-tinted background
    renderer.setRenderTarget(rt); renderer.setClearColor(0xe4eef3, 1); look.render(scene, loupe);
    renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0);
    look.render(scene, camera);
    renderer.autoClear = false; renderer.render(ov, ovCam); renderer.autoClear = true;
  }
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // slopes of every fit point seen from the level camera
    let top = -Infinity, bot = Infinity, lft = Infinity, rgt = -Infinity;
    for (const p of fitPts) { const d = CAM_Z - p.z, y = (p.y - CAM_Y) / d, x = (p.x - CAM_X) / d; top = Math.max(top, y); bot = Math.min(bot, y); lft = Math.min(lft, x); rgt = Math.max(rgt, x); }
    const m = 1.06, halfH = Math.max((top - bot) / 2, (rgt - lft) / 2 / camera.aspect) * m, centre = (top + bot) / 2, centreX = (lft + rgt) / 2;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfH));
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[9] = centre / halfH;   // lens shift, not a tilt: the view stays level and square, so the screen stays a rectangle
    camera.projectionMatrix.elements[8] = centreX / (halfH * camera.aspect);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    // loupe inset: about 30% of the window width, bottom right
    const d = Math.round(Math.min(w * 0.35, h * 0.5)), mg = Math.round(d * 0.08) + 4, cx = w - mg - d / 2, cy = mg + d / 2;
    ovCam.left = 0; ovCam.right = w; ovCam.top = h; ovCam.bottom = 0; ovCam.updateProjectionMatrix();
    for (const o of [lens, rim, edge, sheen]) { o.position.set(cx, cy, 0); o.scale.set(d, d, 1); }
    const px = Math.min(512, Math.round(d * Math.min(2, window.devicePixelRatio || 1)));
    rt.setSize(px, px);
  }
  const ro = new ResizeObserver(resize); ro.observe(container);
  container.appendChild(canvas); resize();
  // tapping a spout in 3D licks it (the buttons stay the primary control)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hits = [];
  sp.traverse(o => o.isMesh && hits.push(o));
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, false)[0];
    if (h) { const p = h.point; onLick(p.x > RX ? 1 : -1); }
  });
  let running = false;
  return {
    lick(s, correct) { side = s; ok = !!correct; lk0 = performance.now(); },
    start() { if (running) return; running = true; renderer.setAnimationLoop(frame); },
    stop() { running = false; renderer.setAnimationLoop(null); },
    get running() { return running; },
    renderer, canvas,
  };
}
