# Solmar Heat — an open-world crime game for make.fun gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Rzfr123/gta6-01-round4/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Rzfr123/gta6-01-round4/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01).

Drive, steal, outrun the Solmar PD and take the city with your partner Rosa Vega: 12 story missions for fixer Lena Voss against Dante Kross — from the Neon Strand beachfront and Club Lumen nightlife to a swamp chase in the Gator Marsh, a port run at Port Solmar, a heist setup and a duo finale — plus a 5-star wanted system with police cars, a helicopter and roadblocks, carjacking, street races, shop holdups, taxi fares, Neon Customs tuning, gun/food shops, Solmar radio, a circular minimap with district names, a phone full of Solmar Social posts (U), and 12 Neon Flamingos hidden across every district — all in a sun-soaked, neon-lit 3D city in the spirit of the GTA VI trailer. Getting busted or wasted costs 15% of your cash; threading past a cop car at speed pays a $25 close-call bonus.

## Play

Serve `game/` with any static server (`node serve.ts`, then http://localhost:8080) and play in desktop Chrome. No network, no build step.

- WASD move / drive · E enter car · F steal car · SPACE handbrake
- Mouse aim · CLICK shoot · 1/2/3 weapons · M start mission · V radio · U phone
- C camera · P pause · B shop · G garage · H save at the safehouse · R race / holdup

## Districts

Downtown Solmar (skyline), Neon Strand (beachfront + Club Lumen), Gator Marsh (swamps), Port Solmar (docks), Calle Sol, Solmar Heights (hillside sign), Midtown Solmar.

## Screenshots

`?shot=cover|race|street|garage` stages a real running scene for screenshots.

## Files

- `game/index.html` — page shell and HUD
- `game/src/main.js` — boot, loop, camera, interactions
- `game/src/city.js` — Solmar City: roads, buildings, waterfront, park, shops
- `game/src/vehicles.js` — car factory and arcade driving
- `game/src/traffic.js` — traffic cars and pedestrians
- `game/src/police.js` — wanted level, pursuit, helicopter, roadblocks
- `game/src/player.js` — Kai Mercer on foot and behind the wheel
- `game/src/partner.js` — Rosa Vega, the partner AI who follows, rides shotgun and covers fire
- `game/src/collectibles.js` — the 12 Neon Flamingos hidden across the districts
- `game/src/missions.js` — 12 story missions plus taxi, race and robbery side work
- `game/src/hud.js` — HUD, minimap, menus, shops, garage
- `game/src/audio.js` — synthesized sound and radio (WebAudio, no files)
- `game/src/save.js` — localStorage saves
- `game/src/shots.js` — screenshot staging
- `game/vendor/three.module.min.js` — vendored Three.js (MIT)

## License

MIT — see LICENSE.
