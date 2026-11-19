// localStorage saves: cash, mission progress, flamingos, weapon stock and
// the player's spot in the city. Saves live only in the player's own
// browser; nothing leaves the machine.
const KEY = 'solmar-heat-save-v1';

export function saveGame(G) {
  const data = {
    cash: G.cash,
    health: G.player.health,
    missionsDone: [...G.missionsDone],
    flamingoCount: G.flamingoCount,
    flamingosTaken: G.flamingos.filter((f) => f.taken).map((f) => `${f.x},${f.z}`),
    ammo: G.player.ammo,
    hasSmg: G.player.hasSmg,
    hasRifle: G.player.hasRifle,
    weapon: G.player.weapon,
    x: G.player.x,
    z: G.player.z,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame(G) {
  let data = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) {
    data = null;
  }
  if (!data) return null;
  G.cash = data.cash ?? 500;
  G.player.health = data.health ?? 100;
  G.missionsDone = new Set(data.missionsDone ?? []);
  G.flamingoCount = data.flamingoCount ?? 0;
  const taken = new Set(data.flamingosTaken ?? []);
  for (const f of G.flamingos) {
    if (taken.has(`${f.x},${f.z}`)) {
      f.taken = true;
      f.group.visible = false;
    }
  }
  Object.assign(G.player.ammo, data.ammo ?? {});
  G.player.hasSmg = !!data.hasSmg;
  G.player.hasRifle = !!data.hasRifle;
  G.player.weapon = data.weapon ?? 'pistol';
  if (typeof data.x === 'number') {
    G.player.x = data.x;
    G.player.z = data.z;
  }
  return data;
}

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch (e) {
    return false;
  }
}
