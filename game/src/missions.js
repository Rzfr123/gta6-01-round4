// Story missions and side work. Twelve jobs for fixer Lena Voss against
// Dante Kross, each opening like a Solmar Social phone post, plus taxi
// fares, street races and shop holdups on the side. Every target snaps to
// the nearest road (never inside a building) and every radius is >= 10.
import * as THREE from '../vendor/three.module.min.js';
import { snapToRoad, districtAt } from './city.js';
import { setWanted, addHeat } from './police.js';

export const MISSIONS = [
  { id: 'strand-drop', name: 'Strand Drop', reward: 400,
    poster: 'Lena Voss: Kai, a package is waiting on the Neon Strand. Pick it up, no questions. — Lena',
    steps: [{ type: 'goto', x: 160, z: -80, text: 'Pick up the package on the Neon Strand' }] },
  { id: 'gator-run', name: 'Gator Run', reward: 600,
    poster: 'Lena Voss: Kross has men in the Gator Marsh. Drive in, shake them, get out. — Lena',
    steps: [
      { type: 'goto', x: -120, z: 120, text: 'Drive into the Gator Marsh' },
      { type: 'survive', seconds: 20, text: 'Survive the swamp chase — keep moving!' },
    ] },
  { id: 'club-lumen', name: 'Club Lumen', reward: 700,
    poster: 'Lena Voss: Tonight, Club Lumen. Kross is dealing inside. Clear his men out. — Lena',
    steps: [
      { type: 'goto', x: 160, z: -20, text: 'Reach Club Lumen' },
      { type: 'kill', count: 4, x: 150, z: -20, text: 'Take out Kross’s men outside Club Lumen' },
    ] },
  { id: 'strand-sprint', name: 'Strand Sprint', reward: 800,
    poster: 'Lena Voss: Race the beachfront, start to finish. Winner takes the purse. — Lena',
    steps: [{ type: 'race', points: [[160, -140], [160, 0], [160, 140]], text: 'Race the Neon Strand checkpoints' }] },
  { id: 'taco-holdup', name: 'Taco Stand Holdup', reward: 500,
    poster: 'Lena Voss: Taco Sol skimmed my cut all week. Go collect. Loudly. — Lena',
    steps: [
      { type: 'goto', x: 0, z: 40, text: 'Get to Taco Sol' },
      { type: 'kill', count: 2, x: 0, z: 40, text: 'Deal with the guards at Taco Sol' },
    ] },
  { id: 'marina-ambush', name: 'Marina Ambush', reward: 900,
    poster: 'Lena Voss: Kross is moving product at the marina. Ambush his crew. — Lena',
    steps: [
      { type: 'goto', x: 160, z: 80, text: 'Reach the marina on the Strand' },
      { type: 'kill', count: 5, x: 160, z: 80, text: 'Ambush Kross’s crew' },
    ] },
  { id: 'port-run', name: 'Port Run', reward: 1200,
    poster: 'Lena Voss: The port job is hot — the PD will be all over you. Run it under 3 stars and the cash is yours. — Lena',
    steps: [
      { type: 'goto', x: -80, z: 160, text: 'Reach Port Solmar' },
      { type: 'deliver', x: 120, z: -120, text: 'Deliver the cargo to Midtown — stay under 3 stars!' },
    ] },
  { id: 'calle-payback', name: 'Calle Sol Payback', reward: 750,
    poster: 'Lena Voss: A snitch on Calle Sol sold us out. Make him regret it. — Lena',
    steps: [
      { type: 'goto', x: 80, z: 80, text: 'Find the snitch on Calle Sol' },
      { type: 'kill', count: 3, x: 80, z: 80, text: 'Settle the score on Calle Sol' },
    ] },
  { id: 'heights-lookout', name: 'Heights Lookout', reward: 650,
    poster: 'Lena Voss: Kross has a lookout on the Solmar Heights hill. Take the high ground. — Lena',
    steps: [
      { type: 'goto', x: -120, z: -120, text: 'Climb to the Solmar Heights lookout' },
      { type: 'kill', count: 3, x: -120, z: -120, text: 'Clear the lookout' },
    ] },
  { id: 'customs-run', name: 'Customs Run', reward: 850,
    poster: 'Lena Voss: A tuned Sunset GT is waiting at Neon Customs. Bring it to me, fast. — Lena',
    steps: [
      { type: 'goto', x: -40, z: 100, text: 'Pick up the car at Neon Customs' },
      { type: 'deliver', x: -60, z: -60, text: 'Deliver the car to the safehouse' },
    ] },
  { id: 'the-setup', name: 'The Setup', reward: 1500,
    poster: 'Lena Voss: The Vice Job needs gear. Hit the gun shop, the docks, then meet Rosa. — Lena',
    steps: [
      { type: 'goto', x: 40, z: -40, text: 'Collect the gear at Solmar Arms' },
      { type: 'goto', x: -80, z: 160, text: 'Collect the second cache at Port Solmar' },
      { type: 'goto', x: 150, z: -20, text: 'Meet Rosa at Club Lumen' },
    ] },
  { id: 'vice-job', name: 'The Vice Job', reward: 3000,
    poster: 'Lena Voss: This is it. Kross himself is at the marina with his whole crew. You and Rosa, together. End this. — Lena',
    steps: [
      { type: 'goto', x: 160, z: 120, text: 'Storm the marina with Rosa' },
      { type: 'kill', count: 8, x: 160, z: 120, text: 'Take down Kross’s crew — the finale' },
    ] },
];

function makeMarker(G) {
  const geo = new THREE.CylinderGeometry(3.2, 3.2, 14, 20, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  m.add(ring);
  m.visible = false;
  G.scene.add(m);
  return m;
}

export function initMissions(G) {
  G.mission = null;
  G.missionsDone = new Set();
  G.gunmen = [];
  G.marker = makeMarker(G);
  G.race = null;   // side race runtime
  G.taxi = null;   // side taxi runtime
  G.holdup = null; // side holdup runtime
}

export function nextMissionDef(G) {
  return MISSIONS.find((m) => !G.missionsDone.has(m.id)) ?? null;
}

export function startMission(G, def) {
  const mission = def ?? nextMissionDef(G);
  if (!mission) {
    G.hud.notify('All 12 jobs done. Solmar City is yours, Kai.');
    return false;
  }
  clearGunmen(G);
  G.mission = { def: mission, stepIdx: 0, timer: 0, killsLeft: 0, raceIdx: 0, startedAt: G.time };
  G.hud.showPhonePost(mission.poster, mission.name);
  G.hud.notify(`New job: ${mission.name} — ${mission.steps[0].text}`);
  enterStep(G);
  return true;
}

function stepTarget(G, step) {
  if (step.type === 'race') {
    const [rx, rz] = step.points[G.mission.raceIdx];
    return snapToRoad(G, rx, rz);
  }
  if (step.x !== undefined) return snapToRoad(G, step.x, step.z);
  return [G.player.x, G.player.z];
}

function enterStep(G) {
  const M = G.mission;
  const step = M.def.steps[M.stepIdx];
  M.timer = 0;
  if (step.type === 'kill') {
    M.killsLeft = step.count;
    const [gx, gz] = stepTarget(G, step);
    spawnGunmen(G, gx, gz, step.count + 1);
  }
  if (step.type === 'survive') {
    // Swamp chase: cops join the fun.
    setWanted(G, Math.max(G.wanted, 2));
  }
  if (step.type === 'race') {
    M.raceIdx = 0;
  }
  const [tx, tz] = stepTarget(G, step);
  M.target = { x: tx, z: tz };
  G.marker.visible = true;
  G.marker.position.set(tx, 7, tz);
  G.hud.setObjective(M.def.name, step.text);
}

function advanceStep(G) {
  const M = G.mission;
  M.stepIdx += 1;
  if (M.stepIdx >= M.def.steps.length) {
    completeMission(G);
    return;
  }
  enterStep(G);
  G.hud.notify(`${M.def.name}: ${M.def.steps[M.stepIdx].text}`);
}

function completeMission(G) {
  const M = G.mission;
  G.missionsDone.add(M.def.id);
  G.cash += M.def.reward;
  G.hud.notify(`Job complete: ${M.def.name} — +$${M.def.reward}`);
  G.audio.playPickup();
  G.marker.visible = false;
  G.mission = null;
  clearGunmen(G);
  G.hud.setObjective(null, null);
  if (G.missionsDone.size === MISSIONS.length) {
    G.hud.notify('All 12 jobs done! The Vice Job is finished — Solmar City is yours.');
  }
}

export function onGunmanKilled(G, gm) {
  const M = G.mission;
  if (!M) return;
  const step = M.def.steps[M.stepIdx];
  if (step && step.type === 'kill') {
    M.killsLeft -= 1;
    G.hud.setObjective(M.def.name, `${step.text} (${Math.max(0, M.killsLeft)} left)`);
    if (M.killsLeft <= 0) advanceStep(G);
  }
}

export function spawnGunmen(G, x, z, n) {
  for (let i = 0; i < n; i++) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.15, 0.45),
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a }),
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
    const gx = x + (Math.random() - 0.5) * 14;
    const gz = z + (Math.random() - 0.5) * 14;
    group.position.set(gx, 0, gz);
    G.scene.add(group);
    G.gunmen.push({ group, x: gx, z: gz, health: 100, dead: false, shootCd: 1 + Math.random() });
  }
}

export function clearGunmen(G) {
  for (const gm of G.gunmen) G.scene.remove(gm.group);
  G.gunmen = [];
}

function updateGunmen(G, dt) {
  const P = G.player;
  for (const gm of G.gunmen) {
    if (gm.dead) continue;
    gm.shootCd -= dt;
    const dx = P.x - gm.x;
    const dz = P.z - gm.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 6) {
      gm.x += (dx / dist) * 3.2 * dt;
      gm.z += (dz / dist) * 3.2 * dt;
    }
    gm.group.position.set(gm.x, 0, gm.z);
    gm.group.rotation.y = Math.atan2(dx, dz);
    if (dist < 40 && gm.shootCd <= 0) {
      gm.shootCd = 1.4 + Math.random();
      P.health -= 6;
      P.lastHurt = G.time;
      G.audio.playShot();
      if (P.health <= 0) P.health = 1; // gunmen wound, the PD busts — handled in police.js
    }
  }
  // Sweep the dead out of the array (scene removal next frame is fine).
  for (let i = G.gunmen.length - 1; i >= 0; i--) {
    if (G.gunmen[i].dead) {
      G.scene.remove(G.gunmen[i].group);
      G.gunmen.splice(i, 1);
    }
  }
}

export function updateMissions(G, dt) {
  updateGunmen(G, dt);
  const M = G.mission;
  if (M) {
    const step = M.def.steps[M.stepIdx];
    const P = G.player;
    if (step.type === 'goto' || step.type === 'deliver') {
      const d = Math.hypot(P.x - M.target.x, P.z - M.target.z);
      if (d < 10) advanceStep(G);
      if (step.type === 'deliver' && M.def.id === 'port-run' && G.wanted >= 3) {
        G.hud.setObjective(M.def.name, 'HEAT TOO HIGH — lose the cops below 3 stars!');
      }
    } else if (step.type === 'survive') {
      M.timer += dt;
      G.hud.setObjective(M.def.name, `Survive the swamp chase — ${Math.ceil(step.seconds - M.timer)}s left`);
      if (M.timer >= step.seconds) advanceStep(G);
    } else if (step.type === 'race') {
      const d = Math.hypot(P.x - M.target.x, P.z - M.target.z);
      if (d < 10) {
        M.raceIdx += 1;
        if (M.raceIdx >= step.points.length) {
          advanceStep(G);
        } else {
          const [tx, tz] = stepTarget(G, step);
          M.target = { x: tx, z: tz };
          G.marker.position.set(tx, 7, tz);
          G.hud.notify(`Checkpoint ${M.raceIdx}/${step.points.length}`);
        }
      }
    }
    // Marker pulse.
    if (G.marker.visible) {
      G.marker.rotation.y += dt;
      G.marker.material.opacity = 0.25 + Math.sin(G.time * 4) * 0.12;
    }
  }

  // --- Side work ---------------------------------------------------------
  if (G.race) {
    const d = Math.hypot(G.player.x - G.race.target.x, G.player.z - G.race.target.z);
    if (d < 10) {
      G.race.idx += 1;
      if (G.race.idx >= G.race.points.length) {
        G.cash += 300;
        G.hud.notify('Street race won! +$300');
        G.race = null;
        G.marker.visible = !!G.mission;
        if (G.mission) G.marker.position.set(G.mission.target.x, 7, G.mission.target.z);
      } else {
        const [tx, tz] = snapToRoad(G, ...G.race.points[G.race.idx]);
        G.race.target = { x: tx, z: tz };
        G.marker.position.set(tx, 7, tz);
        G.hud.notify(`Race checkpoint ${G.race.idx + 1}/${G.race.points.length}`);
      }
    }
  }
  if (G.taxi) {
    const d = Math.hypot(G.player.x - G.taxi.target.x, G.player.z - G.taxi.target.z);
    if (d < 10) {
      G.cash += 150;
      G.hud.notify('Fare delivered! +$150');
      G.taxi = null;
    }
  }
  if (G.holdup) {
    G.holdup.timer += dt;
    const d = Math.hypot(G.player.x - G.holdup.x, G.player.z - G.holdup.z);
    if (d > 12) {
      G.hud.notify('Holdup aborted — you left the shop.');
      G.holdup = null;
    } else if (G.holdup.timer >= 5) {
      G.cash += 400;
      addHeat(G, 22);
      G.hud.notify('Holdup! +$400 — the PD is coming.');
      G.holdup = null;
    }
  }
}

// R key: race while driving, holdup on foot near a shop, taxi otherwise.
export function sideAction(G) {
  const P = G.player;
  if (P.car) {
    if (G.race) { G.hud.notify('Race already running.'); return; }
    const pts = [[160, -120], [160, 0], [160, 120]];
    const [tx, tz] = snapToRoad(G, ...pts[0]);
    G.race = { points: pts, idx: 0, target: { x: tx, z: tz } };
    G.marker.visible = true;
    G.marker.position.set(tx, 7, tz);
    G.hud.notify('Street race started — hit all 3 checkpoints on the Strand!');
    return;
  }
  // On foot near a shop: holdup.
  for (const key of Object.keys(G.city.shops)) {
    const s = G.city.shops[key];
    if (Math.hypot(P.x - s.x, P.z - s.z) < 12) {
      if (G.holdup) return;
      G.holdup = { x: s.x, z: s.z, timer: 0 };
      G.hud.notify(`Holdup at ${s.name} — stay inside 5 seconds…`);
      return;
    }
  }
  // On foot elsewhere: hail a taxi fare — drive a car to the pickup first.
  G.hud.notify('Get in a car and press R to start a street race, or stand in a shop to hold it up.');
}

export function startTaxi(G) {
  if (!G.player.car) return;
  const [tx, tz] = snapToRoad(G, 40 + Math.random() * 80, -80 + Math.random() * 120);
  G.taxi = { target: { x: tx, z: tz } };
  G.hud.notify(`Taxi fare: take the passenger to ${districtAt(G, tx, tz)} (+$150)`);
}
