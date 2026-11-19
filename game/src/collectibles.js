// The 12 Neon Flamingos: pink lawn birds hidden across every district.
// Walk or drive within 3 units to collect one for $50.
import * as THREE from '../vendor/three.module.min.js';
import { snapToRoad } from './city.js';

const SPOTS = [
  ['Neon Strand', 178, -60],
  ['Neon Strand', 178, 80],
  ['Downtown Solmar', 20, -40],
  ['Downtown Solmar', -20, 20],
  ['Gator Marsh', -120, 100],
  ['Gator Marsh', -80, 160],
  ['Port Solmar', -120, 150],
  ['Port Solmar', -60, 170],
  ['Solmar Heights', -140, -140],
  ['Calle Sol', 100, 80],
  ['Midtown Solmar', 120, -100],
  ['Midtown Solmar', -100, -120],
];

export function initCollectibles(G) {
  G.flamingos = [];
  G.flamingoCount = 0;
  for (const [district, sx, sz] of SPOTS) {
    const [x, z] = snapToRoad(G, sx, sz);
    // Nudge off the road centre onto the sidewalk so it is reachable.
    const fx = x + 6;
    const fz = z + 6;
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xff7ab8 }),
    );
    body.scale.set(1, 0.75, 1.4);
    body.position.y = 1.1;
    group.add(body);
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6),
      new THREE.MeshLambertMaterial({ color: 0xff7ab8 }),
    );
    neck.position.set(0, 1.7, 0.85);
    neck.rotation.x = 0.5;
    group.add(neck);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xff7ab8 }),
    );
    head.position.set(0, 2.2, 1.1);
    group.add(head);
    for (const lx of [-0.2, 0.2]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.0, 5),
        new THREE.MeshLambertMaterial({ color: 0x222222 }),
      );
      leg.position.set(lx, 0.5, 0);
      group.add(leg);
    }
    group.position.set(fx, 0, fz);
    G.scene.add(group);
    G.flamingos.push({ group, x: fx, z: fz, district, taken: false });
  }
}

export function updateCollectibles(G, dt) {
  const P = G.player;
  for (const f of G.flamingos) {
    if (f.taken) continue;
    // Gentle bob so the eye catches it.
    f.group.position.y = Math.abs(Math.sin(G.time * 2 + f.x)) * 0.15;
    f.group.rotation.y += dt * 0.6;
    const d = Math.hypot(P.x - f.x, P.z - f.z);
    if (d < 3) {
      f.taken = true;
      f.group.visible = false;
      G.flamingoCount += 1;
      G.cash += 50;
      G.hud.notify(`Neon Flamingo ${G.flamingoCount}/12 — +$50 (${f.district})`);
      G.audio.playPickup();
      if (G.flamingoCount === 12) {
        G.cash += 1000;
        G.hud.notify('All 12 flamingos! Lena pays a $1,000 bonus.');
      }
    }
  }
}
