// Solmar City: a 9x9 road grid with seven districts, built fresh from the
// design spec. Roads sit on a 40-unit grid; every building footprint is
// pulled inside its block edge so no corner juts into a traffic lane.
import * as THREE from '../vendor/three.module.min.js';

export const ROADS = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
export const CITY_EDGE = 180;

export function nearestRoadCoord(v) {
  let best = ROADS[0];
  for (const r of ROADS) if (Math.abs(v - r) < Math.abs(v - best)) best = r;
  return best;
}

// Snap a target onto the nearest road centre so mission markers never land
// inside a building. Returns [x, z] on the closest road line.
export function snapToRoad(G, x, z) {
  const rx = nearestRoadCoord(x);
  const rz = nearestRoadCoord(z);
  if (Math.abs(x - rx) <= Math.abs(z - rz)) return [rx, z];
  return [x, rz];
}

export function districtAt(G, x, z) {
  if (x >= 150) return 'Neon Strand';
  if (z >= 120 && x < 20) return 'Port Solmar';
  if (x < -40 && z > 40) return 'Gator Marsh';
  if (x < -80 && z < -80) return 'Solmar Heights';
  if (Math.abs(x) <= 80 && z >= -80 && z < 40) return 'Downtown Solmar';
  if (x > 40 && z >= 40) return 'Calle Sol';
  return 'Midtown Solmar';
}

// Push a circle (player / car) out of every building AABB it overlaps.
export function resolveCircle(G, p, radius) {
  for (const b of G.buildings) {
    const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * radius;
        p.z = cz + (dz / d) * radius;
      } else {
        // Dead centre inside the box: shove out along the shortest face.
        const pushL = p.x - b.minX + radius;
        const pushR = b.maxX - p.x + radius;
        const pushB = p.z - b.minZ + radius;
        const pushF = b.maxZ - p.z + radius;
        const m = Math.min(pushL, pushR, pushB, pushF);
        if (m === pushL) p.x = b.minX - radius;
        else if (m === pushR) p.x = b.maxX + radius;
        else if (m === pushB) p.z = b.minZ - radius;
        else p.z = b.maxZ + radius;
      }
    }
  }
}

function box(G, x, y, z, w, h, d, color, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color, emissive: opts.emissive ?? 0x000000 });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = false;
  G.scene.add(m);
  return m;
}

function addBuilding(G, cx, cz, w, d, h, color) {
  // Footprint inset: the block is 30 wide between roads; keep the building
  // at least 5 units clear of every road edge.
  const bw = Math.min(w, 20);
  const bd = Math.min(d, 20);
  box(G, cx, 0, cz, bw, h, bd, color);
  // Rooftop trim / neon edge for tall towers.
  if (h > 25) box(G, cx, h, cz, bw * 0.7, 1.2, bd * 0.7, 0x222233);
  G.buildings.push({
    minX: cx - bw / 2, maxX: cx + bw / 2,
    minZ: cz - bd / 2, maxZ: cz + bd / 2, h,
  });
}

function neonSign(G, x, y, z, text, color) {
  // Letters as glowing boxes — a skyline sign, no textures needed.
  const group = new THREE.Group();
  const letterW = 3.4;
  const startX = -((text.length * letterW) / 2);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') continue;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(letterW * 0.62, 5, 1.0),
      new THREE.MeshBasicMaterial({ color }),
    );
    m.position.set(startX + i * letterW + letterW / 2, 0, 0);
    group.add(m);
  }
  group.position.set(x, y, z);
  G.scene.add(group);
  return group;
}

function palm(G, x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 7, 6),
    new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
  );
  trunk.position.y = 3.5;
  trunk.rotation.z = 0.12;
  g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.18, 1.1),
      new THREE.MeshLambertMaterial({ color: 0x2f8f4e }),
    );
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.9, 7.1, Math.sin(a) * 1.9);
    leaf.rotation.y = -a;
    leaf.rotation.z = 0.35;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  G.scene.add(g);
}

function boat(G, x, z, color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.2, 9),
    new THREE.MeshLambertMaterial({ color }),
  );
  hull.position.y = 0.6;
  g.add(hull);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.4, 3.4),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
  );
  cabin.position.set(0, 1.8, -0.5);
  g.add(cabin);
  g.position.set(x, 0.1, z);
  g.rotation.y = Math.random() * Math.PI;
  G.scene.add(g);
}

export function buildCity(G) {
  const S = G.scene;
  G.buildings = [];

  // --- Ground, sea, beach, marsh --------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshLambertMaterial({ color: 0x46543f }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(40, -0.05, 0);
  S.add(ground);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 760),
    new THREE.MeshLambertMaterial({ color: 0x1b6f8e }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(300, 0.02, 0);
  S.add(sea);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 380),
    new THREE.MeshLambertMaterial({ color: 0xd9c08a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(193, 0.0, 0);
  S.add(sand);

  // Gator Marsh: dark swamp floor + water pools, southwest quadrant.
  const marsh = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshLambertMaterial({ color: 0x2c4a2e }),
  );
  marsh.rotation.x = -Math.PI / 2;
  marsh.position.set(-105, 0.01, 115);
  S.add(marsh);
  for (const [px, pz, pw] of [[-140, 80, 40], [-80, 150, 46], [-130, 150, 30], [-60, 90, 26]]) {
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(pw / 2, 20),
      new THREE.MeshLambertMaterial({ color: 0x1e5a6e }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(px, 0.03, pz);
    S.add(pool);
  }

  // --- Roads ------------------------------------------------------------
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x23262b });
  for (const r of ROADS) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(12, 380), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(r, 0.04, 0);
    S.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(380, 12), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.04, r);
    S.add(h);
  }
  // Centre dashes.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c95a });
  for (const r of ROADS) {
    for (let t = -170; t <= 170; t += 16) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5), dashMat);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(r, 0.06, t);
      S.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), dashMat);
      d2.rotation.x = -Math.PI / 2;
      d2.position.set(t, 0.06, r);
      S.add(d2);
    }
  }

  // --- Buildings, per block --------------------------------------------
  const palette = [0x8a7f8d, 0x6f7f96, 0x9c8a6a, 0x7d8a7a, 0xa08a90, 0x5f6f7f];
  let pi = 0;
  const special = new Set([
    '0,0',      // central park
    '-2,-2',    // safehouse block (-60,-60)
    '3,-1',     // Club Lumen block (Neon Strand side)
    '-1,3',     // Neon Customs block (-40,100)
    '1,-1',     // gun shop block (40,-20)
    '0,1',      // food block (20,60)
    '0,-1',     // clothes block (0,-20)
  ]);
  for (let ix = 0; ix < 8; ix++) {
    for (let iz = 0; iz < 8; iz++) {
      const cx = ROADS[ix] + 20;
      const cz = ROADS[iz] + 20;
      const key = `${ix - 4},${iz - 4}`;
      if (special.has(key)) continue;
      if (cx > 140) continue; // beachfront: hotels handled below
      if (cx < -40 && cz > 40) continue; // marsh: trees, not towers
      if (cz > 120 && cx < 0) continue; // port: containers, not towers
      const downtown = Math.abs(cx) <= 80 && cz >= -80 && cz < 40;
      const h = downtown ? 26 + ((ix * 7 + iz * 13) % 46) : 7 + ((ix * 5 + iz * 11) % 11);
      const color = palette[pi++ % palette.length];
      // One or two towers per block, both inset from the block edge.
      addBuilding(G, cx - 4, cz - 3, 13, 12, h, color);
      if ((ix + iz) % 3 === 0) addBuilding(G, cx + 6, cz + 5, 9, 8, Math.max(6, h * 0.55), color);
      // Lit windows: a few emissive strips on tall towers.
      if (h > 25) {
        box(G, cx - 4, h * 0.55, cz - 3 + 6.2, 10, 2.2, 0.3, 0xffe9a8, { emissive: 0xffe9a8 });
      }
    }
  }

  // Beachfront hotels along the Neon Strand. x=178 keeps every footprint
  // clear of the x=160 road (road edge 166, hotel edge 171).
  for (let z = -140; z <= 140; z += 40) {
    addBuilding(G, 178, z + 10, 14, 18, 18 + ((z + 140) % 30), 0xe8d8c8);
  }

  // --- Park (centre block) ----------------------------------------------
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshLambertMaterial({ color: 0x3f7a3a }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(20, 0.05, 20);
  S.add(park);
  for (const [tx, tz] of [[12, 12], [28, 12], [12, 28], [28, 28], [20, 20]]) {
    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x2f6b2f }),
    );
    tree.position.set(tx, 4, tz);
    S.add(tree);
  }

  // --- Landmarks ---------------------------------------------------------
  // Club Lumen: pink/cyan neon box on the Strand.
  const club = box(G, 150, 0, -20, 16, 10, 14, 0x2a0a2e, { emissive: 0x30102a });
  G.buildings.push({ minX: 142, maxX: 158, minZ: -27, maxZ: -13, h: 10 });
  club.material.emissive = new THREE.Color(0x30102a);
  neonSign(G, 150, 12, -12.5, 'LUMEN', 0xff4fd8);
  const clubGlow = new THREE.Mesh(
    new THREE.BoxGeometry(17, 0.8, 15),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
  );
  clubGlow.position.set(150, 10.4, -20);
  S.add(clubGlow);

  // Solmar Heights hillside sign.
  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(70, 26, 4),
    new THREE.MeshLambertMaterial({ color: 0x5a6b4a }),
  );
  hill.position.set(-150, 0, -150);
  hill.rotation.y = Math.PI / 4;
  S.add(hill);
  neonSign(G, -138, 20, -138, 'SOLMAR', 0xffffff);

  // Safehouse (small house with a teal roof).
  box(G, -60, 0, -60, 12, 6, 10, 0xd8c8a8);
  box(G, -60, 6, -60, 13, 2.5, 11, 0x2f8f8a);
  G.buildings.push({ minX: -66, maxX: -54, minZ: -65, maxZ: -55, h: 8 });

  // Shops: fronts set back from the road, doors facing the street.
  const shopDefs = [
    { id: 'gun', name: 'Solmar Arms', x: 40, z: -8, color: 0x7a2a2a },
    { id: 'food', name: 'Taco Sol', x: 8, z: 40, color: 0xc87a2a },
    { id: 'clothes', name: 'Neon Threads', x: -8, z: -40, color: 0x8a4fd8 },
  ];
  for (const s of shopDefs) {
    box(G, s.x, 0, s.z, 12, 6, 9, s.color);
    G.buildings.push({ minX: s.x - 6, maxX: s.x + 6, minZ: s.z - 4.5, maxZ: s.z + 4.5, h: 6 });
    neonSign(G, s.x, 7.5, s.z + 4.8, s.name.split(' ')[0].toUpperCase(), 0xffe9a8);
  }

  // Neon Customs garage.
  box(G, -40, 0, 100, 18, 8, 12, 0x24303f);
  G.buildings.push({ minX: -49, maxX: -31, minZ: 94, maxZ: 106, h: 8 });
  neonSign(G, -40, 10, 94, 'CUSTOMS', 0x00e5ff);

  // Port Solmar: containers + cranes + docks.
  for (let i = 0; i < 8; i++) {
    const cx = -150 + (i % 4) * 22;
    const cz = 145 + Math.floor(i / 4) * 14;
    box(G, cx, 0, cz, 12, 3.4, 4, [0xc8542a, 0x2a7ac8, 0x7ac82a, 0xd8b82a][i % 4]);
  }
  for (const dx of [-120, -60]) {
    const dock = new THREE.Mesh(
      new THREE.BoxGeometry(10, 1, 40),
      new THREE.MeshLambertMaterial({ color: 0x8a6f4d }),
    );
    dock.position.set(dx, 0.5, 175);
    S.add(dock);
  }

  // Boats on the sea.
  for (const [bx, bz, c] of [[240, -80, 0xf2f2f2], [260, 30, 0xffd23e], [235, 110, 0x2a7ac8], [280, -140, 0xc8542a]]) {
    boat(G, bx, bz, c);
  }

  // Palms along the Strand and Calle Sol.
  for (let z = -160; z <= 160; z += 24) palm(G, 182, z);
  for (let x = -120; x <= 120; x += 48) palm(G, x, 62);

  // Marsh cypress trees.
  for (const [tx, tz] of [[-150, 70], [-110, 90], [-70, 130], [-150, 140], [-90, 170], [-60, 70], [-120, 120]]) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.8, 9, 6),
      new THREE.MeshLambertMaterial({ color: 0x5a4632 }),
    );
    trunk.position.set(tx, 4.5, tz);
    S.add(trunk);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 9, 8),
      new THREE.MeshLambertMaterial({ color: 0x2f5b2f }),
    );
    top.position.set(tx, 12, tz);
    S.add(top);
  }

  // Billboards.
  for (const [bx, bz, c] of [[120, -160, 0xff4fd8], [-160, 40, 0x00e5ff], [40, 160, 0xffd23e]]) {
    box(G, bx, 8, bz, 16, 8, 1, c, { emissive: c });
  }

  G.city = {
    safehouse: { x: -60, z: -60 },
    club: { x: 150, z: -20 },
    garage: { x: -40, z: 100 },
    shops: {
      gun: { x: 40, z: -8, name: 'Solmar Arms' },
      food: { x: 8, z: 40, name: 'Taco Sol' },
      clothes: { x: -8, z: -40, name: 'Neon Threads' },
    },
    port: { x: -90, z: 150 },
    marsh: { x: -110, z: 110 },
    beach: { x: 185, z: 0 },
    heights: { x: -138, z: -138 },
  };
}
