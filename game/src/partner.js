// Rosa Vega: Kai's partner. She trails him on foot, rides shotgun when he
// drives (hidden inside the car so her mesh never clips the roof — the pink
// dot on the minimap still tracks her), and lays down covering fire on
// mission gunmen.
import * as THREE from '../vendor/three.module.min.js';

export function initPartner(G) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 1.1, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xff4fd8 }),
  );
  body.position.y = 0.98;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xc98a5a }),
  );
  head.position.y = 1.82;
  group.add(head);
  // Pink hair.
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshLambertMaterial({ color: 0xff2fb3 }),
  );
  hair.position.y = 1.9;
  group.add(hair);
  group.position.set(G.player.x + 2, 0, G.player.z + 2);
  G.scene.add(group);
  G.partner = { group, x: G.player.x + 2, z: G.player.z + 2, heading: 0, shootCooldown: 0, riding: false };
}

const LINES = [
  'Rosa: Right behind you, Kai.',
  'Rosa: Kross will not see this coming.',
  'Rosa: I have got your back — go.',
  'Rosa: Lena is going to love this one.',
];

export function updatePartner(G, dt) {
  const R = G.partner;
  const P = G.player;
  R.shootCooldown = Math.max(0, R.shootCooldown - dt);

  if (P.car) {
    // Riding shotgun: hide the mesh in the car, keep tracking the car.
    R.riding = true;
    R.group.visible = false;
    R.x = P.car.x;
    R.z = P.car.z;
    return;
  }
  R.riding = false;
  R.group.visible = true;

  const dx = P.x - R.x;
  const dz = P.z - R.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 2.6) {
    const speed = dist > 25 ? 14 : 6.5; // catch up fast when far behind
    R.x += (dx / dist) * speed * dt;
    R.z += (dz / dist) * speed * dt;
    R.heading = Math.atan2(dx, dz);
    R.group.position.y = Math.abs(Math.sin(G.time * 9)) * 0.08;
  } else {
    R.group.position.y = 0;
  }
  // Teleport if she somehow falls far behind (e.g. after a respawn).
  if (dist > 60) {
    R.x = P.x + 2;
    R.z = P.z + 2;
  }
  R.group.position.set(R.x, R.group.position.y, R.z);
  R.group.rotation.y = R.heading;

  // Covering fire: during a mission she shoots the nearest gunman.
  if (G.mission && G.gunmen.length > 0 && R.shootCooldown <= 0) {
    let best = null;
    let bestD = 32;
    for (const gm of G.gunmen) {
      const d = Math.hypot(gm.x - R.x, gm.z - R.z);
      if (d < bestD) { best = gm; bestD = d; }
    }
    if (best) {
      R.shootCooldown = 0.85;
      best.health -= 16;
      G.audio.playShot();
      if (best.health <= 0 && !best.dead) {
        best.dead = true;
        G.stats.kills += 1;
        if (G.missions) G.missions.onGunmanKilled(G, best);
      }
    }
  }
}

export function partnerQuip(G) {
  G.hud.notify(LINES[Math.floor(Math.random() * LINES.length)]);
}
