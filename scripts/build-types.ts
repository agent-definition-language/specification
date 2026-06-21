#!/usr/bin/env bun
/**
 * Emit TypeScript types for the ADL document from the generated JSON Schema.
 *
 *   bun run scripts/build-types.ts            # write versions/draft/types.ts
 *   bun run scripts/build-types.ts --check    # verify only (nonzero on drift)
 *
 * The schema itself is generated from the TypeBox model (build-schema.ts), so these
 * types share that single source. Consumers (e.g. the adl-core SDK) import these
 * instead of hand-maintaining a parallel type definition.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT = path.join(ROOT, 'versions', 'draft');
const OUT = path.join(DRAFT, 'types.ts');
const check = process.argv.includes('--check');

const schema = JSON.parse(fs.readFileSync(path.join(DRAFT, 'schema.json'), 'utf-8'));

let ts = await compile(schema, 'ADLDocument', {
  bannerComment:
    '/* eslint-disable */\n/**\n * GENERATED — do not edit by hand.\n * Source: ADL spec model (model/adl.ts) -> versions/draft/schema.json\n * Regenerate with: bun run build:types\n */',
  // Leave additionalProperties at the default (true) so open JSON-Schema-valued fields
  // (tool parameters/returns, resource schema, prompt arguments, annotations) become
  // index-signature objects rather than `{}` — usable by consumers that introspect them.
  declareExternallyReferenced: true,
  style: { singleQuote: true },
});

// Fix the one construct JSON Schema can express but TS cannot as-is: `runtime.degradation`
// has a fixed `extensions` property AND patternProperties (on_*), which json2ts emits as a
// named property plus a `[k: string]: DegradationResponse` index — an invalid combination.
// Fold the named property into the index union so the type is valid and usable.
const degradationFix = ts.replace(
  /\n\s*extensions\?: Extensions;\n(\s*)\[k: string\]: DegradationResponse;/,
  '\n$1[k: string]: DegradationResponse | Extensions | undefined;',
);
if (degradationFix === ts && ts.includes('[k: string]: DegradationResponse;')) {
  console.error('build-types: degradation index/property conflict not resolved — check the post-processor.');
  process.exit(1);
}
ts = degradationFix;

if (check) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf-8') : '';
  if (current.trim() !== ts.trim()) {
    console.log('✗ versions/draft/types.ts is stale — run `bun run build:types`');
    process.exit(1);
  }
  console.log('✓ versions/draft/types.ts is up to date');
  process.exit(0);
}

fs.writeFileSync(OUT, ts);
console.log('wrote versions/draft/types.ts');
