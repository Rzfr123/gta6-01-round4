// Kai Mercer: on-foot movement, entering cars, shooting, and the weapon
// loadout. On foot the camera follows behind him; in a car the car drives.
import * as THREE from '../vendor/three.module.min.js';
import { resolveCircle } from './city.js';
import { updateDrive, damageCar } from './vehicles.js';
import { nearestCar, scarePeds } from './traffic.js';
import { addHeat } from './police.js';

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, range: 55, rate: 0.32, auto: false, ammo: Infinity },
  smg: { name: 'SMG', damage: 18, range: 45, rate: 0.09, auto: true, ammo: 0 },
  rifle: { name: 'Rifle', damage: 60, range: 90, rate: 0.55, auto: false, ammo: 0 },
};

export function initPlayer(G) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.15, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x2a6ac8 }),
  );
  body.position.y = 1.0;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xd8a878 }),
  );
  head.position.y = 1.85;
  group.add(head);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x181818 }),
  );
  gun.position.set(0.45, 1.15, 0.3);
  group.add(gun);
  group.userData.gun = gun;
  group.userData.body = body;
  group.position.set(G.city.safehouse.x, 0, G.city.safehouse.z + 8);
  G.scene.add(group);

  G.player = {
    group, body,
    x: G.city.safehouse.x, z: G.city.safehouse.z + 8,
    heading: 0, camYaw: 0,
    health: 100, car: null,
    weapon: 'pistol',
    ammo: { pistol: Infinity, smg: 120, rifle: 40 },
    hasSmg: false, hasRifle: false,
    shootCooldown: 0,
    lastHurt: 0,
  };
}

export function playerPos(G) {
  return { x: G.player.x, z: G.player.z };
}

export function updatePlayer(G, dt) {
  const P = G.player;
  P.shootCooldown = Math.max(0, P.shootCooldown - dt);
  // Slow health regen when out of trouble.
  if (G.wanted === 0 && P.health < 100 && G.time - P.lastHurt > 6) {
    P.health = Math.min(100, P.health + 4 * dt);
  }

  if (P.car) {
    const input = {
      throttle: (G.keys['KeyW'] || G.keys['ArrowUp'] ? 1 : 0) + (G.keys['KeyS'] || G.keys['ArrowDown'] ? -1 : 0),
      steer: (G.keys['KeyA'] || G.keys['ArrowLeft'] ? -1 : 0) + (G.keys['KeyD'] || G.keys['ArrowRight'] ? 1 : 0),
      handbrake: !!G.keys['Space'],
    };
    updateDrive(G, P.car, dt, input);
    P.x = P.car.x;
    P.z = P.car.z;
    P.heading = P.car.heading;
    P.group.position.set(P.x, -10, P.z); // hidden under the world while driving
    G.audio.setEngine(P.car ? Math.abs(P.car.speed) / 48 : 0);
    return;
  }

  G.audio.setEngine(0);
  // On foot: WASD relative to the camera yaw.
  let mx = 0;
  let mz = 0;
  if (G.keys['KeyW'] || G.keys['ArrowUp']) mz -= 1;
  if (G.keys['KeyS'] || G.keys['ArrowDown']) mz += 1;
  if (G.keys['KeyA'] || G.keys['ArrowLeft']) mx -= 1;
  if (G.keys['KeyD'] || G.keys['ArrowRight']) mx += 1;
  if (mx !== 0 || mz !== 0) {
    const len = Math.hypot(mx, mz);
    mx /= len;
    mz /= len;
    const sin = Math.sin(P.camYaw);
    const cos = Math.cos(P.camYaw);
    const wx = mx * cos - mz * sin;
    const wz = mx * sin + mz * cos;
    const speed = 6.2;
    const p = { x: P.x + wx * speed * dt, z: P.z + wz * speed * dt };
    p.x = Math.max(-195, Math.min(215, p.x));
    p.z = Math.max(-195, Math.min(195, p.z));
    resolveCircle(G, p, 0.7);
    P.x = p.x;
    P.z = p.z;
    P.heading = Math.atan2(wx, wz);
    // Walk bob.
    P.group.position.y = Math.abs(Math.sin(G.time * 9)) * 0.08;
  } else {
    P.group.position.y = 0;
  }
  P.group.position.set(P.x, P.group.position.y, P.z);
  P.group.rotation.y = P.heading;
}

export function enterCar(G) {
  const P = G.player;
  if (P.car) {
    // Step out beside the car.
    const x = P.car.x + Math.sin(P.car.heading + Math.PI / 2) * 3;
    const z = P.car.z + Math.cos(P.car.heading + Math.PI / 2) * 3;
    P.x = x;
    P.z = z;
    P.car = null;
    P.group.position.set(P.x, 0, P.z);
    G.hud.notify('You got out.');
    return;
  }
  const car = nearestCar(G, P.x, P.z, 4.5);
  if (car) {
    P.car = car;
    car.driver = 'player';
    if (car.kind === 'traffic') {
      const i = G.traffic.indexOf(car);
      if (i !== -1) G.traffic.splice(i, 1);
      car.kind = 'player';
    } else {
      car.kind = 'player';
    }
    G.hud.notify(`You are driving the ${car.model.name}.`);
  }
}

// F = carjack: rip the driver out of the nearest car. Witnessed, so heat.
export function stealCar(G) {
  const P = G.player;
  if (P.car) return;
  const car = nearestCar(G, P.x, P.z, 5.5);
  if (!car) {
    G.hud.notify('No car close enough to steal.');
    return;
  }
  if (car.kind === 'traffic') {
    const i = G.traffic.indexOf(car);
    if (i !== -1) G.traffic.splice(i, 1);
    // The driver bails and runs.
    scarePeds(G, car.x, car.z);
  }
  car.kind = 'player';
  car.driver = 'player';
  P.car = car;
  addHeat(G, 30);
  G.audio.playSirenBlip();
  G.hud.notify(`You jacked a ${car.model.name}! The PD is on you.`);
}

// Shoot toward the mouse aim point. Hits gunmen first, then cars, then peds.
export function shoot(G) {
  const P = G.player;
  if (P.shootCooldown > 0 || G.state !== 'play') return;
  const w = WEAPONS[P.weapon];
  if (P.weapon !== 'pistol') {
    if (P.ammo[P.weapon] <= 0) {
      G.hud.notify(`No ${w.name} ammo — buy more at Solmar Arms.`);
      P.shootCooldown = 0.3;
      return;
    }
    P.ammo[P.weapon] -= 1;
  }
  P.shootCooldown = w.rate;
  G.audio.playShot();
  scarePeds(G, P.x, P.z);
  addHeat(G, 2);

  // Aim: from the camera through the mouse cursor onto the ground plane.
  const aim = G.aimPoint ?? { x: P.x + Math.sin(P.heading) * 20, z: P.z + Math.cos(P.heading) * 20 };
  // Nearest gunman within a cone of the aim point.
  let best = null;
  let bestD = 6;
  for (const gm of G.gunmen) {
    const d = Math.hypot(gm.x - aim.x, gm.z - aim.z);
    if (d < bestD) { best = gm; bestD = d; }
  }
  if (best) {
    best.health -= w.damage;
    G.audio.playHit();
    if (best.health <= 0) {
      best.dead = true;
      G.stats.kills += 1;
      G.hud.notify(`Gunman down. (${G.stats.kills} taken out)`);
      if (G.missions) G.missions.onGunmanKilled(G, best);
    }
    return;
  }
  // Otherwise a car near the aim point takes the hit.
  for (const car of G.cars) {
    if (Math.hypot(car.x - aim.x, car.z - aim.z) < 3) {
      if (damageCar(G, car, w.damage) && car.kind === 'police') {
        G.hud.notify('Cop car wrecked!');
        addHeat(G, 12);
      }
      return;
    }
  }
}

export function giveWeapon(G, id) {
  const P = G.player;
  if (id === 'smg') P.hasSmg = true;
  if (id === 'rifle') P.hasRifle = true;
  P.weapon = id;
  G.hud.notify(`You equipped the ${WEAPONS[id].name}.`);
}
