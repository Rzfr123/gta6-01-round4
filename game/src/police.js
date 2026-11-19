// Solmar PD: a 5-star wanted system. Stars rise with crimes and fall when
// the player stays out of sight. Pursuit cars ram, the helicopter joins at
// 3 stars, roadblocks appear at 4, and getting caught costs 15% of cash.
import * as THREE from '../vendor/three.module.min.js';
import { makeCar } from './vehicles.js';
import { snapToRoad } from './city.js';

export function initPolice(G) {
  G.wanted = 0;
  G.heat = 0;          // 0..100, feeds the wanted level
  G.cops = [];
  G.roadblocks = [];
  G.heli = null;
  G.hiddenTimer = 0;   // seconds with no cop in sight
  G.bustedAt = 0;
}

export function setWanted(G, n) {
  G.wanted = Math.max(0, Math.min(5, n));
  G.heat = G.wanted * 20;
  syncCops(G);
  if (G.hud) G.hud.updateStars(G);
}

export function addHeat(G, amount) {
  G.heat = Math.max(0, Math.min(100, G.heat + amount));
  const level = G.heat < 12 ? 0 : G.heat < 32 ? 1 : G.heat < 52 ? 2 : G.heat < 72 ? 3 : G.heat < 88 ? 4 : 5;
  if (level !== G.wanted) setWanted(G, level);
}

function syncCops(G) {
  const want = G.wanted === 0 ? 0 : Math.min(2 + G.wanted, 6);
  while (G.cops.length < want) {
    const [sx, sz] = snapToRoad(G, G.player.x + (Math.random() - 0.5) * 120, G.player.z + (Math.random() - 0.5) * 120);
    const car = makeCar(G, 'breeze', 0x1a1a2e, { x: sx, z: sz, kind: 'police', police: true });
    car.cruise = 0;
    G.cars.push(car);
    G.cops.push(car);
  }
  while (G.cops.length > want) {
    const car = G.cops.pop();
    G.scene.remove(car.group);
    const i = G.cars.indexOf(car);
    if (i !== -1) G.cars.splice(i, 1);
  }
  // Helicopter from 3 stars.
  if (G.wanted >= 3 && !G.heli) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.4, 5),
      new THREE.MeshLambertMaterial({ color: 0x223344 }),
    );
    g.add(body);
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.1, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    rotor.position.y = 1;
    g.add(rotor);
    const spot = new THREE.Mesh(
      new THREE.ConeGeometry(4, 18, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.18 }),
    );
    spot.position.y = -9;
    spot.rotation.x = Math.PI;
    g.add(spot);
    g.userData.rotor = rotor;
    G.scene.add(g);
    G.heli = g;
  }
  if (G.wanted < 3 && G.heli) {
    G.scene.remove(G.heli);
    G.heli = null;
  }
  // Roadblocks from 4 stars: two barriers on roads ahead of the player.
  if (G.wanted >= 4 && G.roadblocks.length === 0) {
    for (const [ox, oz] of [[30, 0], [-30, 20]]) {
      const [bx, bz] = snapToRoad(G, G.player.x + ox, G.player.z + oz);
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(10, 1.4, 1),
        new THREE.MeshLambertMaterial({ color: 0xff7a2a }),
      );
      barrier.position.set(bx, 0.7, bz);
      G.scene.add(barrier);
      G.roadblocks.push({ mesh: barrier, x: bx, z: bz });
    }
  }
  if (G.wanted < 4) {
    for (const rb of G.roadblocks) G.scene.remove(rb.mesh);
    G.roadblocks = [];
  }
}

export function updatePolice(G, dt) {
  const px = G.player.x;
  const pz = G.player.z;
  // Heat cools when no cop can see the player.
  let nearestCop = Infinity;
  for (const cop of G.cops) {
    nearestCop = Math.min(nearestCop, Math.hypot(cop.x - px, cop.z - pz));
  }
  if (G.wanted > 0 && nearestCop > 55) {
    G.hiddenTimer += dt;
    if (G.hiddenTimer > 4) addHeat(G, -14 * dt);
  } else {
    G.hiddenTimer = 0;
  }

  // Pursuit: steer toward the player and ram.
  for (const cop of G.cops) {
    const dx = px - cop.x;
    const dz = pz - cop.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - cop.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    const top = 26 + G.wanted * 2;
    cop.speed = Math.min(top, cop.speed + 16 * dt);
    cop.ramCd = Math.max(0, (cop.ramCd ?? 0) - dt);
    if (dist < 3.2 && cop.ramCd <= 0) {
      // Ram: a single shove + damage, then a cooldown so the player can
      // actually pull away instead of being pinned by constant contact.
      cop.ramCd = 0.8;
      cop.speed *= 0.4;
      if (G.player.car) {
        G.player.car.speed *= 0.85;
        G.player.car.health -= 8;
        if (G.player.car.health <= 0) G.player.car.health = 1;
      } else {
        G.player.health -= 10;
      }
      G.player.x += Math.sin(cop.heading) * 1.2;
      G.player.z += Math.cos(cop.heading) * 1.2;
    }
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    cop.group.position.set(cop.x, 0, cop.z);
    cop.group.rotation.y = cop.heading;
    // Flash the light bar.
    if (cop.group.userData.lightBar) {
      cop.group.userData.lightBar.material.color.setHex(
        Math.floor(G.time * 4) % 2 === 0 ? 0xff2222 : 0x2244ff,
      );
    }
    // Near-miss bonus: fast pass within 4 units of a cop while driving.
    if (G.player.car && Math.abs(G.player.car.speed) > 20 && dist < 5 && dist > 3.2) {
      if (!cop.nearMissed) {
        cop.nearMissed = true;
        G.cash += 25;
        G.stats.nearMiss += 1;
        G.hud.notify('Close call! +$25');
      }
    } else if (dist > 8) {
      cop.nearMissed = false;
    }
  }

  // Helicopter circles overhead.
  if (G.heli) {
    const t = G.time * 0.5;
    G.heli.position.set(px + Math.cos(t) * 24, 42, pz + Math.sin(t) * 24);
    G.heli.rotation.y = -t;
    if (G.heli.userData.rotor) G.heli.userData.rotor.rotation.y += dt * 30;
  }

  // Busted: a cop touches the player on foot at low speed, or health hits 0.
  if (G.wanted > 0 && !G.player.car && nearestCop < 2.2 && G.state === 'play') {
    bustPlayer(G, 'BUSTED');
  }
  if (G.player.health <= 0 && G.state === 'play') {
    bustPlayer(G, 'WASTED');
  }
}

export function bustPlayer(G, kind) {
  if (G.state !== 'play') return;
  const fee = Math.floor(G.cash * 0.15);
  G.cash -= fee;
  G.wanted = 0;
  G.heat = 0;
  syncCops(G);
  G.state = kind === 'BUSTED' ? 'busted' : 'wasted';
  G.player.health = 100;
  if (G.player.car) {
    G.player.car = null;
  }
  // Respawn at the safehouse.
  G.player.x = G.city.safehouse.x;
  G.player.z = G.city.safehouse.z + 8;
  G.player.heading = 0;
  G.hud.showBig(kind, `${kind === 'BUSTED' ? 'The Solmar PD hauled you in.' : 'You got taken out.'} Impound fee: $${fee}. You wake up at the safehouse.`);
}
