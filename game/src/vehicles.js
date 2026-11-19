// Cars: factory + arcade driving. Five models, each with its own top speed,
// acceleration and handling. Driving is deliberately forgiving: strong grip,
// a handbrake that slides the tail, and building collision that pushes the
// car out instead of wedging it.
import * as THREE from '../vendor/three.module.min.js';
import { resolveCircle } from './city.js';

export const MODELS = [
  { id: 'breeze', name: 'Breeze Sedan', top: 38, accel: 15, grip: 2.6, color: 0x7a8a9a },
  { id: 'sunset', name: 'Sunset GT', top: 48, accel: 21, grip: 3.1, color: 0xff4f2a },
  { id: 'gator', name: 'Gator 4x4', top: 34, accel: 13, grip: 2.2, color: 0x4a7a3a },
  { id: 'courier', name: 'Courier Van', top: 30, accel: 11, grip: 2.0, color: 0xd8d8d8 },
  { id: 'lumen', name: 'Lumen Cruiser', top: 36, accel: 14, grip: 2.4, color: 0xff4fd8 },
];

export function modelById(id) {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

export function makeCar(G, modelId, color, opts = {}) {
  const model = modelById(modelId);
  const paint = color ?? model.color;
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: paint });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18242e });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.3, -0.2);
  group.add(cabin);
  if (model.id === 'courier') {
    cabin.scale.set(1.05, 1.25, 1.5);
    cabin.position.set(0, 1.45, 0.3);
  }
  // Headlights + taillights.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const sx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), lightMat);
    hl.position.set(sx, 0.7, 2.22);
    group.add(hl);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const sx of [-0.7, 0.7]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), tailMat);
    tl.position.set(sx, 0.7, -2.22);
    group.add(tl);
  }
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    group.add(w);
    wheels.push(w);
  }
  // Police light bar, for pursuit cars.
  if (opts.police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }),
    );
    bar.position.set(0, 1.75, -0.2);
    group.add(bar);
    group.userData.lightBar = bar;
  }

  group.position.set(opts.x ?? 0, 0, opts.z ?? 0);
  group.rotation.y = opts.heading ?? 0;
  G.scene.add(group);

  const car = {
    group, model, paint, wheels,
    x: group.position.x, z: group.position.z,
    heading: group.rotation.y,
    speed: 0,
    engine: opts.engine ?? 0,   // Neon Customs level 0-3
    armor: opts.armor ?? 0,     // Neon Customs level 0-3
    underglow: false,
    health: 100,
    kind: opts.kind ?? 'traffic',
    police: !!opts.police,
    driver: opts.driver ?? null,
    steerVis: 0,
  };
  return car;
}

export function carTopSpeed(car) {
  return car.model.top * (1 + car.engine * 0.09);
}

// Arcade drive step. input: {throttle: -1..1, steer: -1..1, handbrake: bool}
export function updateDrive(G, car, dt, input) {
  const top = carTopSpeed(car);
  const accel = car.model.accel * (1 + car.engine * 0.08);
  if (input.throttle > 0) car.speed += accel * input.throttle * dt;
  else if (input.throttle < 0) car.speed += accel * 0.9 * input.throttle * dt; // brake / reverse
  // Drag + rolling resistance; handbrake kills speed fast and loosens grip.
  car.speed -= car.speed * (input.handbrake ? 1.6 : 0.35) * dt;
  car.speed = Math.max(-top * 0.45, Math.min(top, car.speed));
  if (Math.abs(car.speed) < 0.05 && input.throttle === 0) car.speed = 0;

  const grip = input.handbrake ? car.model.grip * 0.45 : car.model.grip;
  const steerAmount = input.steer * grip * dt * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.heading += steerAmount * (car.speed >= 0 ? 1 : -1);
  car.steerVis = input.steer;

  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const p = { x: nx, z: nz };
  resolveCircle(G, p, 2.3);
  // City bounds: soft wall at the map edge.
  p.x = Math.max(-195, Math.min(215, p.x));
  p.z = Math.max(-195, Math.min(195, p.z));
  const hitWall = p.x !== nx || p.z !== nz;
  car.x = p.x;
  car.z = p.z;
  if (hitWall) car.speed *= 0.6;

  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.heading;
  // Wheel spin + front-wheel steer for looks.
  const spin = (car.speed * dt) / 0.42;
  for (const w of car.wheels) w.rotation.x += spin;
  car.wheels[0].rotation.y = car.steerVis * 0.35;
  car.wheels[1].rotation.y = car.steerVis * 0.35;
}

export function removeCar(G, car) {
  G.scene.remove(car.group);
  const i = G.cars.indexOf(car);
  if (i !== -1) G.cars.splice(i, 1);
}

// Damage to a car; returns true when it is wrecked.
export function damageCar(G, car, amount) {
  const soaked = amount * (1 - car.armor * 0.12);
  car.health -= soaked;
  if (car.health <= 0) {
    car.health = 0;
    return true;
  }
  return false;
}
