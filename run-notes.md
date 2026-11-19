# Run notes — gta6-01 round 4: "Solmar Heat"

## What was built

A 3D open-world crime game in Three.js (vendored `three.module.min.js`),
written fresh in-session in the recorded subagent session. Original city,
characters, names and story — nothing from Rockstar/GTA, nothing copied
from any previous round's game code (only the round-3 run-notes design
spec and README structure were read).

- **City** (`game/src/city.js`): 9x9 road grid with a downtown skyline, the
  Neon Strand beachfront, the Gator Marsh swamps, Port Solmar docks, Calle
  Sol, Solmar Heights (hillside SOLMAR sign), Club Lumen with pink/cyan neon,
  boats on the sea, palms, billboards, park, shops, safehouse, Neon Customs.
  District names shown live in the HUD.
- **Duo** (`game/src/partner.js`): Rosa Vega follows Kai on foot, rides
  shotgun (pink dot on the minimap), and gives covering fire on mission
  gunmen.
- **Missions** (`game/src/missions.js`): 12 story missions for fixer Lena
  Voss vs Dante Kross — Strand Drop, Gator Run (swamp chase), Club Lumen,
  Strand Sprint, Taco Stand Holdup, Marina Ambush, Port Run under 3-star
  heat, Calle Sol Payback, Heights Lookout, Customs Run, The Setup (heist
  setup), The Vice Job (duo finale). Each opens like a Solmar Social phone
  post. Side work: taxi fares, street races, shop holdups, 12 Neon Flamingo
  collectibles (`game/src/collectibles.js`).
- **Police** (`game/src/police.js`): 5-star wanted level, pursuit cars that
  ram (with a per-ram cooldown so the player can pull away), helicopter from
  3 stars, roadblocks from 4, heat that cools when hidden.
- **Systems**: carjacking (F), 5 car models, garage upgrades at Neon Customs,
  gun/food/clothes shops, 3 radio stations (Vice Coast / Gator / Solmar Talk,
  synthesized WebAudio), circular minimap with N marker, phone with mission
  list (U), localStorage saves, busted/wasted 15% impound fee, $25 near-miss
  bonus.
- **Entrypoint** (`main.ts`): validates the entrypoint, screenshots (3–4,
  ≤256 KiB, no duplicates), game/ caps (993 files / 48 MiB / 1000-byte
  paths), required modules and README badges, writes the dossier with the
  kit's `buildDossier`, and verifies the written dossier byte-for-byte
  (buffer comparison — buildDossier returns Uint8Array). Revised 4 times
  in-session (validation, size caps, module/README checks, dossier-verify
  buffer fix). `game/src/main.js` revised 6 times in-session (wiring fixes,
  pause handling, shot cameras).

## Fixes found by playtesting

- Steal only gave 1 star (heat 30 → level 1): steal now adds 45 heat → 2
  stars, cops spawn.
- Cop ramming every frame pinned the player's car at ~10 MPH: rams now
  fire once per 0.8s per cop with a single shove, and cop top speed is
  26 + 2×stars so the player can outrun them.
- Beachfront hotels at x=168 intruded into the x=160 road (edge 161 vs
  road edge 166) and wedged the cover-shot car: hotels moved to x=178
  (footprint edge 171, clear of the road).
- Neon sign letters were oversized pink slabs: letter boxes shrunk
  (3.4 wide, 5 tall).
- Garage underglow button always read MAXED: it keyed off the paint
  colour (always truthy) instead of an `underglow` flag.
- Garage screenshot camera shot through the customs hall, then hid the
  car behind the menu panel: car staged south of the hall (z=80),
  camera from the west aiming off-centre so the car clears the panel.
- Street screenshot camera pulled closer (5 units) so Kai and Rosa read.
- Favicon 404: added an inline `data:,` icon link.
- Test-harness notes (not game bugs): a Chrome process left running by an
  earlier run kept a stale save alive across playtests (SIGTERM did not
  kill it — SIGKILL does); flamingo objects hold THREE groups and cannot
  round-trip through CDP `returnByValue` (fetch plain `{x, z}` instead);
  SwiftShader renders slowly, so wall-clock drive tests need long holds.

## Verification (headless Chromium, SwiftShader, CDP)

- Kit check: **4 passed, 0 failed, 16 skipped, 5 checked at submission**
  (same shape as round 3; transcript checks run at submission; no local
  grade exists for this competition, the server grades).
- `MAKEFUN_OUTPUT_DIR=out node main.ts` builds clean; dossier 363,240
  bytes, 4 images, text 94,602 bytes.
- Mechanics test (fresh profile, all PASS): mission starts on M and
  completes (Strand Drop, cash $500→$900), steal → wanted 2 + 4 cops,
  driving 0→52 MPH (41 MPH on the re-run), SMG weapon switch, garage
  opens and engine purchase works ($2,000→$1,500, engine Lv 1), save at
  safehouse, flamingo collect +$50, phone opens with all 12 missions,
  district label changes, partner follows (gap 2–3), Gator Run survive
  step activates. Zero page errors, zero failed requests.
- Screenshots: 4 real renders, retaken after the final code change
  (1-cover chase at 34 MPH with 2 stars, 2-race Strand Sprint at 26 MPH,
  3-street at Club Lumen with Rosa, 4-garage at Neon Customs with the
  pink Sunset GT beside the menu). All ≤256 KiB, 1280x800.

## Repo

- https://github.com/Rzfr123/gta6-01-round4
- Final commit: see `git log` (this file + final screenshots in the last
  commit; game code at e4ccdf2, entrypoint fix in the commit after it).
- About set: description names make.fun, homepage
  https://make.fun/bounty/gta6-01, topics makefun, ai-agents, bounties,
  games (verified via GitHub API; repo is public).
- README 3143 bytes; LICENSE MIT, first line SPDX-License-Identifier: MIT.
- `.makefun/owner.json` = {"wallet": "bDXdfcW6wZ1hmDZnnH4eJLhXEbYUkV7AAKZHagdnoPg"}.

## Recording

- Recorder 01a1f1cc-ba87-73c3-bd1e-c7e5a03d1aec (started 2026-11-19T03:14:48Z,
  before this subagent session; session began after it).
- Session id: 76e392ca-005c-4e47-8e20-844e3d6a34ec
- Session file: ~/agents/agent-76e392ca-005c-4e47-8e20-844e3d6a34ec/sessions/76e392ca-005c-4e47-8e20-844e3d6a34ec.jsonl
- User's verbatim task prompt for this round: "Ya, rebuild lagi"
- NOT sealed, NOT submitted — parent seals (record --finish) and submits.

## GTA VI trailer references incorporated vs left out

Incorporated (design patterns only; no trailer footage, music, art or code):
- Neon beachfront (Neon Strand), downtown skyline, tropical palms, swamps
  (Gator Marsh), coastal port town (Port Solmar), hillside sign (Solmar
  Heights), sunset-and-neon palette.
- Duo protagonists: Kai + partner Rosa Vega (follows, rides shotgun, covers
  fire, duo dialogue lines) instead of a solo hero.
- Neon nightlife and beach culture: Club Lumen, neon signs, beachfront races,
  boats on the water, social-media/phone culture (Solmar Social posts open
  every mission; phone mission list).
- Trailer-flavored missions: beachfront races, club job, swamp chase, port
  run, heist setup + duo finale.
- Radio re-skinned to Vice-style stations; garage re-skinned as Neon Customs.

Deliberately left out:
- Any Rockstar names verbatim (no Vice City, Leonida, Lucia, Jason,
  Ocean Drive, Port Gellhorn) — all names invented.
- No trailer footage, music, art, or screenshots copied into the game.
- No drivable boats (boats are scenery) — out of scope.
- No switchable characters (partner AI instead of full switching) and no
  GTA V elements (no Los Santos, no special ability, no trio).
