// Traffic cars and pedestrians: they keep the streets alive and give the
// player something to steal. Traffic follows the road grid in lanes; at an
// intersection it may turn. Pedestrians wander the sidewalks and flee when
// a gun goes off.
import * as THREE from '../vendor/three.module.min.js';
import { ROADS } from './city.js';
import { makeCar, updateDrive } from './vehicles.js';

function randRoad() {
  return ROADS[Math.floor(Math.random() * ROADS.length)];
}

export function spawnTrafficCar(G, x, z) {
  const model = ['breeze', 'sunset', 'gator', 'courier', 'lumen'][Math.floor(Math.random() * 5)];
  const car = makeCar(G, model, undefined, { x, z, kind: 'traffic' });
  car.axis = Math.random() < 0.5 ? 'x' : 'z';
  car.dir = Math.random() < 0.5 ? 1 : -1;
  car.lane = (Math.random() < 0.5 ? -1 : 1) * 3;
  car.cruise = 7 + Math.random() * 6;
  car.heading = car.axis === 'x' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  car.group.rotation.y = car.heading;
  G.cars.push(car);
  return car;
}

export function initTraffic(G) {
  G.traffic = [];
  for (let i = 0; i < 10; i++) {
    const car = spawnTrafficCar(G, randRoad(), randRoad());
    G.traffic.push(car);
  }
  // Parked cars the player can steal without a chase.
  G.parked = [];
  const spots = [[-40, 6], [40, -46], [80, 46], [-120, -34], [120, 86], [0, 126]];
  for (const [sx, sz] of spots) {
    const car = makeCar(G, ['breeze', 'lumen', 'gator'][G.parked.length % 3], undefined, {
      x: sx, z: sz, kind: 'parked', heading: Math.PI / 2,
    });
    G.cars.push(car);
    G.parked.push(car);
  }
  // Pedestrians.
  G.peds = [];
  const shirtColors = [0xffd23e, 0x7df3ff, 0xff7ad9, 0x9dff8a, 0xff9a3e, 0xc89aff];
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.1, 0.4),
      new THREE.MeshLambertMaterial({ color: shirtColors[i % shirtColors.length] }),
    );
    body.position.y = 0.95;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xd8a878 }),
    );
    head.position.y = 1.75;
    g.add(head);
    const x = randRoad() + 8;
    const z = randRoad() + 8;
    g.position.set(x, 0, z);
    G.scene.add(g);
    G.peds.push({ group: g, x, z, heading: Math.random() * Math.PI * 2, speed: 1.2 + Math.random(), flee: 0 });
  }
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    if (car.kind !== 'traffic') continue;
    // Drive along the current axis in its lane; turn at intersections.
    const onRoad = car.axis === 'x'
      ? Math.abs(car.z - Math.round(car.z / 40) * 40) < 8
      : Math.abs(car.x - Math.round(car.x / 40) * 40) < 8;
    if (onRoad && Math.random() < dt * 0.12) {
      car.axis = car.axis === 'x' ? 'z' : 'x';
      car.dir = Math.random() < 0.5 ? 1 : -1;
    }
    car.speed = car.cruise;
    const heading = car.axis === 'x' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    // Ease the heading toward the lane direction instead of snapping.
    let dh = heading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    if (car.x > 195 || car.x < -195 || car.z > 195 || car.z < -195) {
      car.x = randRoad();
      car.z = randRoad();
      car.axis = Math.random() < 0.5 ? 'x' : 'z';
      car.dir = Math.random() < 0.5 ? 1 : -1;
    }
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
  }
  // Pedestrians: stroll, turn sometimes, flee from gunfire.
  for (const p of G.peds) {
    if (p.flee > 0) {
      p.flee -= dt;
      p.speed = 5;
    } else {
      p.speed = 1.3;
      if (Math.random() < dt * 0.2) p.heading += (Math.random() - 0.5) * 2;
    }
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    p.x = Math.max(-180, Math.min(180, p.x));
    p.z = Math.max(-180, Math.min(180, p.z));
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = p.heading;
  }
}

export function scarePeds(G, x, z) {
  for (const p of G.peds) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < 25) {
      p.flee = 3;
      p.heading = Math.atan2(p.x - x, p.z - z);
    }
  }
}

// Nearest stealable car (traffic or parked) within range of a point.
export function nearestCar(G, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.kind === 'police') continue;
    if (car === G.player.car) continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}
