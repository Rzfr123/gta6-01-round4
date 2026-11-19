// Screenshot staging: ?shot=cover|race|street|garage drops the player into
// a real running scene so the screenshots are honest renders, not mockups.
// Each stage also sets a fixed camera preset the main loop holds while the
// shot parameter is present.
import { makeCar } from './vehicles.js';
import { setWanted } from './police.js';
import { startMission, MISSIONS } from './missions.js';
import { snapToRoad } from './city.js';

export function applyShot(G, name) {
  G.shotMode = name;
  const P = G.player;
  if (name === 'cover') {
    // High-speed chase on the Neon Strand: Kai in a Sunset GT, two cop cars
    // closing in, Rosa riding shotgun.
    const car = makeCar(G, 'sunset', 0xff4f2a, { x: 160, z: -60, kind: 'player', heading: 0 });
    car.speed = 21; // ~47 MPH
    G.cars.push(car);
    P.car = car;
    car.driver = 'player';
    P.x = car.x;
    P.z = car.z;
    setWanted(G, 2);
    G.hud.notify('Solmar Heat — outrun the PD on the Neon Strand.');
  } else if (name === 'race') {
    // Mid-race on the Strand: checkpoints ahead, rival pace car beside.
    const car = makeCar(G, 'sunset', 0x00e5ff, { x: 160, z: -100, kind: 'player', heading: 0 });
    car.speed = 18;
    G.cars.push(car);
    P.car = car;
    car.driver = 'player';
    P.x = car.x;
    P.z = car.z;
    startMission(G, MISSIONS[3]); // Strand Sprint
    const rival = makeCar(G, 'lumen', 0xffd23e, { x: 156, z: -92, kind: 'traffic', heading: 0 });
    rival.speed = 16;
    G.cars.push(rival);
    G.traffic.push(rival);
  } else if (name === 'street') {
    // On foot outside Club Lumen at dusk, Rosa beside Kai, neon behind.
    P.car = null;
    P.x = 150;
    P.z = -6;
    P.heading = Math.PI;
    P.camYaw = Math.PI;
    G.partner.x = 147;
    G.partner.z = -4;
    G.partner.group.position.set(147, 0, -4);
    G.hud.notify('Club Lumen — Kai and Rosa, before the job.');
  } else if (name === 'garage') {
    // At Neon Customs with the garage menu open over a tuned GT. The car
    // parks south of the building (z=80) so the shot camera sees it clear
    // of the customs hall.
    const car = makeCar(G, 'sunset', 0xff4fd8, { x: -40, z: 80, kind: 'player', heading: Math.PI });
    car.engine = 2;
    car.armor = 1;
    G.cars.push(car);
    P.car = car;
    car.driver = 'player';
    P.x = car.x;
    P.z = car.z;
    G.cash = 2400;
    // Open the garage menu once the HUD is ready (main calls this after init).
    setTimeout(() => { import('./hud.js').then((h) => h.openGarage(G)); }, 300);
  }
  // Dusk lighting for the street shot, sunset for the rest.
  if (name === 'street' && G.duskLight) G.duskLight();
}
