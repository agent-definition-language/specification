#!/usr/bin/env bun
/**
 * Build the ADL spec content artifact.
 *
 * Bundles the consumable spec corpus — versions/, protocol/, profiles/, patterns/ —
 * into dist-artifact/ and a tarball (adl-content.tgz). Downstream consumers (the
 * website, the standardization tooling) extract this and point ADL_CONTENT_ROOT at it,
 * instead of reading this repo directly.
 *
 * Released versions inside versions/ are immutable; the draft is included too so the
 * site can render /spec/next. Standards-submission metadata (spec-manifest.yaml,
 * ietf_draft) is not present in this repo and therefore never ships in the artifact.
 *
 * Usage: node scripts/build-artifact.mjs
 */
import {execFileSync} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist-artifact');
const CONTENT_DIRS = ['versions', 'protocol', 'profiles', 'patterns'];

function rmrf(p) {
  fs.rmSync(p, {recursive: true, force: true});
}

function main() {
  rmrf(OUT);
  fs.mkdirSync(OUT, {recursive: true});

  for (const dir of CONTENT_DIRS) {
    const src = path.join(ROOT, dir);
    if (!fs.existsSync(src)) {
      console.warn(`skip (missing): ${dir}`);
      continue;
    }
    // Exclude authoring sources (per-profile `model/` dirs and the shared `_kit/`) —
    // the artifact is consumable content (schemas, markdown, examples), not the source
    // that generates it.
    fs.cpSync(src, path.join(OUT, dir), {
      recursive: true,
      filter: (s) => {
        const b = path.basename(s);
        return b !== 'model' && b !== '_kit';
      },
    });
    console.log(`bundled: ${dir}/`);
  }

  // Tarball with content dirs at the top level (so consumers extract straight into
  // a content root): tar czf adl-content.tgz -C dist-artifact versions protocol ...
  const present = CONTENT_DIRS.filter((d) => fs.existsSync(path.join(OUT, d)));
  const tarball = path.join(ROOT, 'adl-content.tgz');
  execFileSync('tar', ['czf', tarball, '-C', OUT, ...present], {stdio: 'inherit'});

  console.log(`\nartifact: ${path.relative(ROOT, tarball)}`);
  console.log(`unpacked: ${path.relative(ROOT, OUT)}/`);
}

main();
