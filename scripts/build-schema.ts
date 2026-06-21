#!/usr/bin/env bun
/**
 * Emit and verify the ADL core JSON Schemas from the TypeBox model.
 *
 *   bun run scripts/build-schema.ts            # write versions/draft/schema*.json
 *   bun run scripts/build-schema.ts --check    # verify only (no writes); nonzero on drift
 *
 * Verifies the emitted passport schema is structurally identical (deep-equal,
 * key-order-independent) to the committed draft and 0.3.0 schemas.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPassportSchema } from '../model/adl.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT = path.join(ROOT, 'versions', 'draft');
const V030 = path.join(ROOT, 'versions', '0.3.0');
const check = process.argv.includes('--check');

/** Drop TypeBox symbols and normalize empty `required: []` (source omits them). */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'required' && Array.isArray(v) && v.length === 0) continue;
      out[k] = normalize(v);
    }
    return out;
  }
  return value;
}

/** Structural diff (emitted vs canonical); arrays order-sensitive, objects order-independent. */
function diff(a: unknown, b: unknown, p = '', out: string[] = []): string[] {
  if (a === b) return out;
  const oa = a && typeof a === 'object';
  const ob = b && typeof b === 'object';
  if (!oa || !ob) {
    if (!Object.is(a, b)) out.push(`${p || '/'}: emitted=${JSON.stringify(a)} canonical=${JSON.stringify(b)}`);
    return out;
  }
  const aa = Array.isArray(a);
  const ba = Array.isArray(b);
  if (aa !== ba) {
    out.push(`${p}: array/object mismatch`);
    return out;
  }
  if (aa) {
    const A = a as unknown[];
    const B = b as unknown[];
    if (A.length !== B.length) out.push(`${p}: array length emitted=${A.length} canonical=${B.length}`);
    for (let i = 0; i < Math.max(A.length, B.length); i++) diff(A[i], B[i], `${p}[${i}]`, out);
    return out;
  }
  const A = a as Record<string, unknown>;
  const B = b as Record<string, unknown>;
  for (const k of Object.keys(A)) if (!(k in B)) out.push(`${p}/${k}: emitted has key, canonical lacks`);
  for (const k of Object.keys(B)) if (!(k in A)) out.push(`${p}/${k}: canonical has key, emitted lacks`);
  for (const k of Object.keys(A)) if (k in B) diff(A[k], B[k], `${p}/${k}`, out);
  return out;
}

function buildStrict(idSegment: string): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://adl-spec.org/${idSegment}/schema-strict.json`,
    title: 'ADL Document (Strict)',
    description:
      'Strict ADL schema that rejects unknown top-level properties. Use for documents that do not declare any profiles. Profile schemas provide their own closed validation via allOf composition with the base schema.',
    allOf: [{ $ref: `https://adl-spec.org/${idSegment}/schema.json` }],
    unevaluatedProperties: false,
  };
}

// Emit (the draft currently carries the 0.3 $id and v0.3.0 description — unchanged from
// the committed schema since the draft has not yet diverged from 0.3.0).
const emitted = normalize(buildPassportSchema('0.3', '0.3.0')) as Record<string, unknown>;

let failed = false;
for (const [label, dir] of [['draft', DRAFT], ['0.3.0', V030]] as const) {
  const canonical = JSON.parse(fs.readFileSync(path.join(dir, 'schema.json'), 'utf-8'));
  const diffs = diff(emitted, canonical);
  if (diffs.length === 0) {
    console.log(`✓ emitted schema matches ${label}/schema.json exactly`);
  } else {
    failed = true;
    console.log(`✗ ${diffs.length} difference(s) vs ${label}/schema.json:`);
    for (const d of diffs.slice(0, 40)) console.log('   ' + d);
    if (diffs.length > 40) console.log(`   …and ${diffs.length - 40} more`);
  }
}

// Verify the generated strict wrapper matches the (correct) draft strict exactly.
// Note: 0.3.0/schema-strict.json is frozen and carries a known stale $id/$ref bug
// (points at 0.2); it is intentionally not regenerated.
const emittedStrict = buildStrict('0.3');
const canonicalStrict = JSON.parse(fs.readFileSync(path.join(DRAFT, 'schema-strict.json'), 'utf-8'));
const strictDiffs = diff(emittedStrict, canonicalStrict);
if (strictDiffs.length === 0) {
  console.log('✓ emitted strict wrapper matches draft/schema-strict.json exactly');
} else {
  failed = true;
  console.log(`✗ ${strictDiffs.length} difference(s) vs draft/schema-strict.json:`);
  for (const d of strictDiffs.slice(0, 20)) console.log('   ' + d);
}

if (check) {
  process.exit(failed ? 1 : 0);
}

if (failed) {
  console.log('\nNot writing outputs while there are diffs. Fix the model first.');
  process.exit(1);
}

// Write generated outputs for the draft (released versions stay frozen).
fs.writeFileSync(path.join(DRAFT, 'schema.json'), JSON.stringify(emitted, null, 2) + '\n');
fs.writeFileSync(path.join(DRAFT, 'schema-strict.json'), JSON.stringify(buildStrict('0.3'), null, 2) + '\n');
console.log('\nwrote versions/draft/schema.json and schema-strict.json (generated from model)');
