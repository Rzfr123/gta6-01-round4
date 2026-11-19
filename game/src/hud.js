// HUD: cash/health/stars/district/speed, the circular minimap with an N
// marker, objective line, toasts, phone (Solmar Social), shop and garage
// menus, and the busted/wasted overlay.
import { districtAt, ROADS } from './city.js';
import { MISSIONS } from './missions.js';
import { WEAPONS } from './player.js';

export function initHUD(G) {
  const $ = (id) => document.getElementById(id);
  G.hud = {
    el: {
      cash: $('cash'), health: $('health'), armor: $('armor'), weapon: $('weapon'),
      stars: $('stars'), district: $('district'), objective: $('objective'),
      objTitle: $('objTitle'), objText: $('objText'),
      mph: $('mph'), carname: $('carname'), radio: $('radio'),
      minimap: $('minimap'), toast: $('toast'),
      phone: $('phone'), phoneList: $('phoneList'),
      shop: $('shop'), shopTitle: $('shopTitle'), shopSub: $('shopSub'), shopItems: $('shopItems'),
      garage: $('garage'), garageItems: $('garageItems'),
      overlay: $('overlay'), startBtn: $('startBtn'), saveNote: $('saveNote'),
      bigmsg: $('bigmsg'), bigTitle: $('bigTitle'), bigText: $('bigText'), bigBtn: $('bigBtn'),
      crosshair: $('crosshair'),
    },
    toastTimer: 0,
    notify(text) {
      const t = this.el.toast;
      t.textContent = text;
      t.style.opacity = '1';
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 2600);
      const s = document.getElementById('status');
      if (s) s.textContent = text;
    },
    setObjective(title, text) {
      if (!title) { this.el.objective.classList.add('hidden'); return; }
      this.el.objective.classList.remove('hidden');
      this.el.objTitle.textContent = title;
      this.el.objText.textContent = text ?? '';
    },
    updateStars(G2) {
      let html = '';
      for (let i = 0; i < 5; i++) {
        html += i < G2.wanted ? '★' : '<span class="off">★</span>';
      }
      this.el.stars.innerHTML = html;
    },
    showPhonePost(poster, name) {
      // A mission opening reads like a Solmar Social post: show it as a
      // toast AND in the phone so the player can re-read it.
      this.notify(`📱 ${name}: ${poster}`);
    },
    openPhone(G2) {
      const list = this.el.phoneList;
      list.innerHTML = '';
      for (const m of MISSIONS) {
        const done = G2.missionsDone.has(m.id);
        const active = G2.mission && G2.mission.def.id === m.id;
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `<div class="who">${m.name} ${done ? '<span class="done">✓ done</span>' : active ? '<span class="done">● active</span>' : ''}</div><div>${m.poster}</div><div>Reward: $${m.reward}</div>`;
        list.appendChild(div);
      }
      const side = document.createElement('div');
      side.className = 'post';
      side.innerHTML = `<div class="who">Side work</div><div>Taxi fares $150 · Street races $300 · Shop holdups $400 · Neon Flamingos $50 each (12 hidden).</div>`;
      list.appendChild(side);
      this.el.phone.classList.remove('hidden');
    },
    closePhone() { this.el.phone.classList.add('hidden'); },
    showBig(title, text) {
      this.el.bigTitle.textContent = title;
      this.el.bigText.textContent = text;
      this.el.bigmsg.style.display = 'flex';
    },
    hideBig() { this.el.bigmsg.style.display = 'none'; },
  };

  document.getElementById('phoneClose').addEventListener('click', () => G.hud.closePhone());
  document.getElementById('shopClose').addEventListener('click', () => G.hud.el.shop.classList.add('hidden'));
  document.getElementById('garageClose').addEventListener('click', () => G.hud.el.garage.classList.add('hidden'));
  G.hud.el.bigBtn.addEventListener('click', () => {
    G.hud.hideBig();
    G.state = 'play';
  });
}

export function updateHUD(G, dt) {
  const h = G.hud.el;
  h.cash.textContent = `$${G.cash.toLocaleString()}`;
  h.health.textContent = `♥ ${Math.max(0, Math.ceil(G.player.health))}`;
  h.armor.textContent = G.player.car && G.player.car.armor > 0 ? `🛡 ${G.player.car.armor}` : '';
  const w = WEAPONS[G.player.weapon];
  const ammo = G.player.weapon === 'pistol' ? '∞' : G.player.ammo[G.player.weapon];
  h.weapon.textContent = `${w.name} · ${ammo}`;
  h.district.textContent = districtAt(G, G.player.x, G.player.z);
  const mph = G.player.car ? Math.round(Math.abs(G.player.car.speed) * 2.237) : 0;
  h.mph.textContent = mph;
  h.carname.textContent = G.player.car ? G.player.car.model.name : 'On foot';
  h.radio.textContent = `♪ ${G.audio.stations[G.audio.station].name}`;
  h.crosshair.style.display = G.player.car ? 'none' : 'block';
  drawMinimap(G);
}

function drawMinimap(G) {
  const c = G.hud.el.minimap;
  const ctx = c.getContext('2d');
  const S = 190;
  const scale = S / 460; // world -200..260 mapped into the circle
  const cx = S / 2;
  const cy = S / 2;
  const toMap = (x, z) => [cx + (x - 10) * scale, cy + z * scale];
  ctx.clearRect(0, 0, S, S);
  // Clip to the circle.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, S / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#1d2b1a';
  ctx.fillRect(0, 0, S, S);
  // Sea + sand.
  ctx.fillStyle = '#1b6f8e';
  ctx.fillRect(cx + 185 * scale, 0, S, S);
  ctx.fillStyle = '#d9c08a';
  ctx.fillRect(cx + 172 * scale, 0, 14 * scale + 4, S);
  // Marsh.
  ctx.fillStyle = '#2c4a2e';
  ctx.fillRect(cx - 180 * scale, cy + 40 * scale, 150 * scale, 150 * scale);
  // Roads.
  ctx.strokeStyle = '#3a3f46';
  ctx.lineWidth = 5;
  for (const r of ROADS) {
    const [x1, y1] = toMap(r, -180);
    const [x2, y2] = toMap(r, 180);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const [hx1, hy1] = toMap(-180, r);
    const [hx2, hy2] = toMap(180, r);
    ctx.beginPath(); ctx.moveTo(hx1, hy1); ctx.lineTo(hx2, hy2); ctx.stroke();
  }
  const dot = (x, z, color, r = 4) => {
    const [mx, my] = toMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
  };
  // Flamingos, mission target, gunmen, cops.
  for (const f of G.flamingos) if (!f.taken) dot(f.x, f.z, '#ff7ab8', 3);
  if (G.mission) dot(G.mission.target.x, G.mission.target.z, '#ffd23e', 6);
  if (G.race) dot(G.race.target.x, G.race.target.z, '#ff9a3e', 5);
  if (G.taxi) dot(G.taxi.target.x, G.taxi.target.z, '#7dff9a', 5);
  for (const gm of G.gunmen) dot(gm.x, gm.z, '#ff2a2a', 3);
  for (const cop of G.cops) dot(cop.x, cop.z, '#2a7aff', 4);
  // Rosa: pink dot.
  dot(G.partner.x, G.partner.z, '#ff4fd8', 4);
  // Player arrow, rotated by heading.
  const [px, py] = toMap(G.player.x, G.player.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // N marker at the top, rotated by camera yaw.
  ctx.save();
  ctx.translate(cx, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, 0);
  ctx.restore();
}

// --- Shops ---------------------------------------------------------------
export function openShop(G, kind) {
  const shop = G.city.shops[kind];
  const h = G.hud.el;
  h.shopTitle.textContent = shop.name;
  h.shopSub.textContent = kind === 'gun' ? 'Solmar Arms — cash only, no questions.'
    : kind === 'food' ? 'Taco Sol — eat up, heal up.'
    : 'Neon Threads — look sharp, drive sharp.';
  const items = h.shopItems;
  items.innerHTML = '';
  const add = (label, price, canBuy, buy) => {
    const b = document.createElement('button');
    b.textContent = `${label} — $${price}`;
    b.disabled = !canBuy;
    b.addEventListener('click', () => { buy(); });
    items.appendChild(b);
  };
  if (kind === 'gun') {
    add('SMG', 800, G.cash >= 800, () => { G.cash -= 800; G.player.hasSmg = true; G.player.ammo.smg += 120; G.player.weapon = 'smg'; G.hud.notify('Bought an SMG (+120 ammo).'); openShop(G, kind); });
    add('SMG ammo ×120', 150, G.cash >= 150 && G.player.hasSmg, () => { G.cash -= 150; G.player.ammo.smg += 120; G.hud.notify('SMG ammo +120.'); openShop(G, kind); });
    add('Rifle', 1500, G.cash >= 1500, () => { G.cash -= 1500; G.player.hasRifle = true; G.player.ammo.rifle += 40; G.player.weapon = 'rifle'; G.hud.notify('Bought a Rifle (+40 ammo).'); openShop(G, kind); });
    add('Rifle ammo ×40', 200, G.cash >= 200 && G.player.hasRifle, () => { G.cash -= 200; G.player.ammo.rifle += 40; G.hud.notify('Rifle ammo +40.'); openShop(G, kind); });
    add('Body armor (full heal)', 300, G.cash >= 300, () => { G.cash -= 300; G.player.health = 100; G.hud.notify('Patched up — health 100.'); openShop(G, kind); });
  } else if (kind === 'food') {
    add('Taco plate (heal 50)', 25, G.cash >= 25, () => { G.cash -= 25; G.player.health = Math.min(100, G.player.health + 50); G.hud.notify('Tasty. +50 health.'); openShop(G, kind); });
    add('Churro combo (full heal)', 60, G.cash >= 60, () => { G.cash -= 60; G.player.health = 100; G.hud.notify('Full and fighting fit.'); openShop(G, kind); });
  } else {
    add('Neon jacket (Kai goes pink)', 200, G.cash >= 200, () => {
      G.cash -= 200;
      G.player.group.userData.body.material.color.setHex(0xff4fd8);
      G.hud.notify('Kai is now very pink.');
      openShop(G, kind);
    });
    add('Solmar cap', 80, G.cash >= 80, () => { G.cash -= 80; G.hud.notify('Cap acquired. Very street.'); openShop(G, kind); });
  }
  h.shop.classList.remove('hidden');
}

export function openGarage(G) {
  const car = G.player.car;
  if (!car) { G.hud.notify('Drive a car into Neon Customs first.'); return; }
  const h = G.hud.el;
  const items = h.garageItems;
  items.innerHTML = '';
  const add = (label, price, level, max, buy) => {
    const b = document.createElement('button');
    b.textContent = level >= max ? `${label} — MAXED` : `${label} (Lv ${level}/${max}) — $${price}`;
    b.disabled = level >= max || G.cash < price;
    b.addEventListener('click', () => { buy(); });
    items.appendChild(b);
  };
  add('Engine tune', 500, car.engine, 3, () => { G.cash -= 500; car.engine += 1; G.hud.notify(`Engine tuned to Lv ${car.engine}. Faster top speed.`); openGarage(G); });
  add('Armor plating', 400, car.armor, 3, () => { G.cash -= 400; car.armor += 1; G.hud.notify(`Armor plated to Lv ${car.armor}.`); openGarage(G); });
  add('Neon underglow (pink)', 150, car.paint ? 1 : 0, 1, () => { G.cash -= 150; car.paint = 0xff4fd8; G.hud.notify('Underglow installed. Very Lumen.'); openGarage(G); });
  h.garage.classList.remove('hidden');
}
