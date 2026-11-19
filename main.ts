// Solmar Heat — make.fun gta6-01 entrypoint (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, vendored
// three.js, no network request). This program hands it in: it copies game/
// and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Entrypoint validation: refuse to build a broken entry. -------------
// The game must exist, boot from index.html, and ship 3-4 screenshots that
// are each small enough for the gate. Anything missing here fails loudly
// instead of producing a dossier the judge would reject.
const entryHtml = join(here, 'game', 'index.html');
if (!existsSync(entryHtml)) throw new Error('missing game/index.html');
const html = readFileSync(entryHtml, 'utf8');
if (!html.includes('src/main.js') && !html.includes('./src/main.js')) {
  throw new Error('game/index.html does not boot ./src/main.js');
}
if (!existsSync(join(here, 'game', 'src', 'main.js'))) throw new Error('missing game/src/main.js');
if (!existsSync(join(here, 'game', 'vendor', 'three.module.min.js'))) {
  throw new Error('missing vendored game/vendor/three.module.min.js');
}

const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort()
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > 262144) throw new Error(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
}
// Duplicate screenshots (identical bytes) would fail the gate's uniqueness
// check, so catch them here before the dossier is written.
const seen = new Set<string>();
for (const shot of shots) {
  const bytes = readFileSync(join(shotsDir, shot));
  const key = bytes.toString('base64');
  if (seen.has(key)) throw new Error(`duplicate screenshot bytes: ${shot}`);
  seen.add(key);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Verify the dossier byte-for-byte: what we wrote must be exactly what
// buildDossier produced, so a partial write can never slip through.
const written = readFileSync(join(out, 'dossier.json'), 'utf8');
if (written !== dossier) throw new Error('dossier.json verification failed: bytes differ after write');
const parsed = JSON.parse(written);
if (!parsed || typeof parsed !== 'object') throw new Error('dossier.json is not a JSON object');
console.log(`Solmar Heat dossier written: ${shots.length} screenshots, ${written.length} bytes`);
