// Vice Heat — the entrypoint for make.fun gta6-cover-art-01 (Node 22,
// standard library only). The grader runs this file: it gathers the
// browser app (app/) and the entry screenshots (screenshots/) into the
// output directory and writes dossier.json, the summary the judge reads,
// using the kit's vendored library (vendor/makefun-app.ts, the scorer's
// own copy, left untouched).
//
// Try the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The entry refuses to run when an input folder is missing, so a half
// built checkout can never be handed in as a silent empty entry.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error(`Vice Heat hand-in refused: ${message}`);
}

function nonEmptyDir(path, label) {
  if (!existsSync(path)) fail(`${label} is missing — build the app before handing it in`);
  if (readdirSync(path).filter((name) => !name.startsWith('.')).length === 0) {
    fail(`${label} is empty — take the entry screenshots before handing it in`);
  }
}

const appSource = join(repoRoot, 'app');
const shotsSource = join(repoRoot, 'screenshots');
if (!existsSync(join(appSource, 'index.html'))) {
  fail('app/index.html is missing — build the app before handing it in');
}
nonEmptyDir(shotsSource, 'screenshots/');

mkdirSync(outputDir, { recursive: true });
cpSync(appSource, join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsSource, join(outputDir, 'screenshots'), { recursive: true });

// The scorer's own caps (kit reference/gate.json): only text_max_bytes
// shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse — more than 4 screenshots or one over 256 KiB; more than 993
// files in app/ or 48 MiB of app files in all, or an app/ path over
// 1000 bytes (app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// Say what was handed in, so a silent empty entry is obvious at a glance.
const handedShots = readdirSync(join(outputDir, 'screenshots')).filter((name) => !name.startsWith('.'));
const dossierBytes = readdirSync(outputDir).includes('dossier.json')
  ? (await import('node:fs')).statSync(join(outputDir, 'dossier.json')).size
  : 0;
console.log(`Vice Heat handed in: app/ + ${handedShots.length} screenshots + dossier.json (${dossierBytes} B) -> ${outputDir}`);
