// Solmar Heat — boot, game loop, camera, and interactions.
// A 3D open-world crime game in vendored Three.js: drive, steal, shoot,
// outrun the Solmar PD, and run twelve story jobs across Solmar City.
import * as THREE from '../vendor/three.module.min.js';
import { buildCity, districtAt } from './city.js';
import { initTraffic, updateTraffic } from './traffic.js';
import { initPolice, updatePolice, setWanted, addHeat } from './police.js';
import { initPlayer, updatePlayer, enterCar, stealCar, shoot, giveWeapon, WEAPONS } from './player.js';
import { initPartner, updatePartner, partnerQuip } from './partner.js';
import { initCollectibles, updateCollectibles } from './collectibles.js';
import { initMissions, updateMissions, startMission, nextMissionDef, sideAction, startTaxi } from './missions.js';
import { initHUD, updateHUD, openShop, openGarage } from './hud.js';
import { initAudio } from './audio.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');

const G = {
  state: 'title',
  time: 0,
  keys: {},
  cash: 500,
  stats: { nearMiss: 0, kills: 0 },
  camMode: 0,
  camYaw: 0,
  camPitch: 0.32,
  camDist: 13,
  aimPoint: null,
  mouse: { x: 0.5, y: 0.5 },
  paused: false,
  shotMode: null,
  dusk: false,
};

// --- Renderer / scene ------------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a8c8);
scene.fog = new THREE.Fog(0x87a8c8, 180, 420);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
G.scene = scene;
G.camera = camera;
G.renderer = renderer;

const sun = new THREE.DirectionalLight(0xffe0b0, 1.15);
sun.position.set(120, 180, 60);
scene.add(sun);
const amb = new THREE.AmbientLight(0x8090b0, 0.85);
scene.add(amb);
G.lights = { sun, amb };
G.duskLight = () => {
  G.dusk = true;
  scene.background = new THREE.Color(0x2a1440);
  scene.fog = new THREE.Fog(0x2a1440, 150, 380);
  sun.color.setHex(0xff7ab8);
  sun.intensity = 0.7;
  amb.color.setHex(0x5a4a7a);
};

// --- Build the world -------------------------------------------------------
buildCity(G);
G.cars = [];
initPlayer(G);
initPartner(G);
initTraffic(G);
initPolice(G);
initCollectibles(G);
initMissions(G);
initHUD(G);
initAudio(G);

// Restore a save if one exists (position, cash, jobs, flamingos).
let loaded = null;
if (hasSave()) {
  loaded = loadGame(G);
  if (loaded) G.hud.el.saveNote.textContent = `Save found — ${new Date(loaded.savedAt).toLocaleString()}, $${loaded.cash}, ${loaded.missionsDone.length}/12 jobs done.`;
}

// --- Input -----------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  G.keys[e.code] = true;
  if (e.code === 'KeyP') { togglePause(); return; }
  if (G.state !== 'play') return;
  if (e.code === 'KeyE') enterCar(G);
  if (e.code === 'KeyF') stealCar(G);
  if (e.code === 'KeyM') startMission(G);
  if (e.code === 'KeyV') G.hud.notify(`Radio: ${G.audio.nextStation()}`);
  if (e.code === 'KeyU') {
    const phone = G.hud.el.phone;
    if (phone.classList.contains('hidden')) G.hud.openPhone(G);
    else G.hud.closePhone();
  }
  if (e.code === 'KeyC') {
    G.camMode = (G.camMode + 1) % 3;
    G.hud.notify(['Camera: chase', 'Camera: far', 'Camera: top'][G.camMode]);
  }
  if (e.code === 'KeyB') tryShop(G);
  if (e.code === 'KeyG') tryGarage(G);
  if (e.code === 'KeyH') trySave(G);
  if (e.code === 'KeyR') sideAction(G);
  if (e.code === 'KeyT') startTaxi(G);
  if (e.code === 'KeyQ') partnerQuip(G);
  if (e.code === 'Digit1') { G.player.weapon = 'pistol'; }
  if (e.code === 'Digit2' && G.player.hasSmg) giveWeapon(G, 'smg');
  if (e.code === 'Digit3' && G.player.hasRifle) giveWeapon(G, 'rifle');
  if (e.code === 'Escape') {
    G.hud.closePhone();
    G.hud.el.shop.classList.add('hidden');
    G.hud.el.garage.classList.add('hidden');
  }
});
window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
window.addEventListener('mousemove', (e) => {
  G.mouse.x = e.clientX / window.innerWidth;
  G.mouse.y = e.clientY / window.innerHeight;
});
window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (G.state !== 'play') return;
  if (e.target !== canvas) return;
  G.audio.ensure();
  shoot(G);
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function togglePause() {
  if (G.state === 'play') {
    G.state = 'paused';
    G.hud.showBig('PAUSED', 'Solmar City waits. Press P or Keep going to resume.');
  } else if (G.state === 'paused') {
    G.hud.hideBig();
    G.state = 'play';
  }
}

function nearestShop(G2) {
  for (const key of Object.keys(G2.city.shops)) {
    const s = G2.city.shops[key];
    if (Math.hypot(G2.player.x - s.x, G2.player.z - s.z) < 12) return key;
  }
  return null;
}

function tryShop(G2) {
  const kind = nearestShop(G2);
  if (kind) openShop(G2, kind);
  else G2.hud.notify('No shop nearby — look for Solmar Arms, Taco Sol or Neon Threads.');
}

function tryGarage(G2) {
  const g = G2.city.garage;
  if (Math.hypot(G2.player.x - g.x, G2.player.z - g.z) > 16) {
    G2.hud.notify('Neon Customs is on the south side — drive up to the garage.');
    return;
  }
  openGarage(G2);
}

function trySave(G2) {
  const s = G2.city.safehouse;
  if (Math.hypot(G2.player.x - s.x, G2.player.z - s.z) > 14) {
    G2.hud.notify('Save at the safehouse (teal roof, north-west Downtown).');
    return;
  }
  if (saveGame(G2)) G2.hud.notify('Game saved at the safehouse.');
  else G2.hud.notify('Save failed — browser storage is unavailable.');
}

G.hud.el.startBtn.addEventListener('click', () => {
  G.audio.ensure();
  G.audio.startRadio();
  G.hud.el.overlay.classList.add('hidden');
  G.state = 'play';
  const next = nextMissionDef(G);
  if (next) G.hud.notify(`Welcome back, Kai. Press M to start: ${next.name}.`);
  else G.hud.notify('Welcome back, Kai. Solmar City is yours.');
});

// --- Camera ----------------------------------------------------------------
function updateCamera(dt) {
  const P = G.player;
  // Camera yaw eases toward the player's heading so the view follows.
  let dh = P.heading - G.camYaw;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  G.camYaw += dh * Math.min(1, dt * 2.2);
  P.camYaw = G.camYaw;

  const dist = [13, 20, 30][G.camMode];
  const pitch = [0.32, 0.42, 0.9][G.camMode];
  let cx;
  let cy;
  let cz;
  let lx = P.x;
  let ly = 1.5;
  let lz = P.z;
  if (G.shotMode === 'cover' || G.shotMode === 'race') {
    // Low chase cam, slightly to the side so the car and the road read.
    cx = P.x - Math.sin(G.camYaw) * 11 + Math.cos(G.camYaw) * 3;
    cy = 4.2;
    cz = P.z - Math.cos(G.camYaw) * 11 - Math.sin(G.camYaw) * 3;
    lx = P.x + Math.sin(G.camYaw) * 12;
    lz = P.z + Math.cos(G.camYaw) * 12;
  } else if (G.shotMode === 'street') {
    cx = P.x - Math.sin(P.heading) * 5;
    cy = 2.3;
    cz = P.z - Math.cos(P.heading) * 5;
    lx = P.x + Math.sin(P.heading) * 6;
    lz = P.z + Math.cos(P.heading) * 6;
    ly = 2.0;
  } else if (G.shotMode === 'garage') {
    // West of the car, looking north-east — but aiming west of the car so
    // it lands right of the centred panel instead of behind it.
    cx = P.x - 13;
    cy = 5.5;
    cz = P.z - 9;
    lx = P.x - 7;
    lz = P.z + 5;
    ly = 1.2;
  } else {
    cx = P.x - Math.sin(G.camYaw) * dist * Math.cos(pitch);
    cy = 2 + dist * Math.sin(pitch) + 2;
    cz = P.z - Math.cos(G.camYaw) * dist * Math.cos(pitch);
    lx = P.x + Math.sin(G.camYaw) * 6;
    lz = P.z + Math.cos(G.camYaw) * 6;
  }
  camera.position.set(cx, cy, cz);
  camera.lookAt(lx, ly, lz);
}

// Aim point: ray from the camera through the mouse cursor onto y=0.
function updateAim() {
  const ndc = new THREE.Vector2(G.mouse.x * 2 - 1, -(G.mouse.y * 2 - 1));
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const t = -ray.ray.origin.y / ray.ray.direction.y;
  if (t > 0) {
    const p = ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
    G.aimPoint = { x: p.x, z: p.z };
  }
}

// --- Main loop ---------------------------------------------------------------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (G.state === 'play') {
    G.time += dt;
    updatePlayer(G, dt);
    updatePartner(G, dt);
    updateTraffic(G, dt);
    updatePolice(G, dt);
    updateCollectibles(G, dt);
    updateMissions(G, dt);
    updateCamera(dt);
    updateAim();
    updateHUD(G, dt);
    // Auto weapon fire while the mouse is held (SMG).
    if (G.mouseDown && WEAPONS[G.player.weapon].auto) shoot(G);
  } else if (G.state === 'title') {
    // Slow orbit around the Strand behind the title screen.
    G.time += dt;
    const t = G.time * 0.05;
    camera.position.set(170 + Math.cos(t) * 40, 30, Math.sin(t) * 60);
    camera.lookAt(140, 4, 0);
  }
  renderer.render(scene, camera);
}
window.addEventListener('mousedown', () => { G.mouseDown = true; });
window.addEventListener('mouseup', () => { G.mouseDown = false; });

// Screenshot staging runs after the world exists.
if (shotName) {
  G.hud.el.overlay.classList.add('hidden');
  G.state = 'play';
  applyShot(G, shotName);
  G.audio.ensure();
}

loop();

// --- Test hooks (used by the headless playtest, not by players) ------------
window.__game = G;
G.test = {
  teleport(x, z) {
    if (G.player.car) { G.player.car.x = x; G.player.car.z = z; }
    G.player.x = x;
    G.player.z = z;
    G.player.group.position.set(x, 0, z);
  },
  drive(seconds) {
    G.keys['KeyW'] = true;
    return new Promise((res) => setTimeout(() => { G.keys['KeyW'] = false; res(); }, seconds * 1000));
  },
  state() {
    return {
      state: G.state,
      cash: G.cash,
      wanted: G.wanted,
      health: Math.round(G.player.health),
      x: Math.round(G.player.x),
      z: Math.round(G.player.z),
      speedMph: G.player.car ? Math.round(Math.abs(G.player.car.speed) * 2.237) : 0,
      inCar: !!G.player.car,
      cops: G.cops.length,
      mission: G.mission ? { name: G.mission.def.name, step: G.mission.stepIdx } : null,
      missionsDone: [...G.missionsDone],
      flamingos: G.flamingoCount,
      weapon: G.player.weapon,
      ammo: { ...G.player.ammo },
      district: districtAt(G, G.player.x, G.player.z),
      gunmen: G.gunmen.length,
    };
  },
};
