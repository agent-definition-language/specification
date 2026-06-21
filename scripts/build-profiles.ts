#!/usr/bin/env bun
/**
 * Emit and verify profile JSON Schemas from their TypeBox models.
 *
 *   bun run scripts/build-profiles.ts          # write profiles/<slug>/<version>/schema.json
 *   bun run scripts/build-profiles.ts --check  # verify only (nonzero on drift)
 *
 * Each profile model (model/profiles/<slug>.ts) exports the assembled schema. Profiles
 * are draft, so their schema.json is regenerated from the model (the single source).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { schema as registry } from '../profiles/registry/model/index.ts';
import { schema as portfolio } from '../profiles/portfolio/model/index.ts';
import { schema as governance } from '../profiles/governance/model/index.ts';
import { schema as healthcare } from '../profiles/healthcare/model/index.ts';
import { schema as financial } from '../profiles/financial/model/index.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const PROFILES: Array<{ slug: string; version: string; schema: Record<string, unknown> }> = [
  { slug: 'registry', version: '1.0', schema: registry },
  { slug: 'portfolio', version: '1.0', schema: portfolio },
  { slug: 'governance', version: '1.0', schema: governance },
  { slug: 'healthcare', version: '1.0', schema: healthcare },
  { slug: 'financial', version: '1.0', schema: financial },
];

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
  if (aa !== ba) return (out.push(`${p}: array/object mismatch`), out);
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

let failed = false;
for (const { slug, version, schema } of PROFILES) {
  const file = path.join(ROOT, 'profiles', slug, version, 'schema.json');
  const emitted = normalize(JSON.parse(JSON.stringify(schema))) as Record<string, unknown>;
  const canonical = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const diffs = diff(emitted, canonical);
  if (diffs.length === 0) {
    console.log(`✓ ${slug} matches profiles/${slug}/${version}/schema.json exactly`);
  } else {
    failed = true;
    console.log(`✗ ${slug}: ${diffs.length} difference(s):`);
    for (const d of diffs.slice(0, 30)) console.log('   ' + d);
    if (diffs.length > 30) console.log(`   …and ${diffs.length - 30} more`);
  }
}

if (check) process.exit(failed ? 1 : 0);
if (failed) {
  console.log('\nNot writing while there are diffs. Fix the model first.');
  process.exit(1);
}
for (const { slug, version, schema } of PROFILES) {
  const file = path.join(ROOT, 'profiles', slug, version, 'schema.json');
  const emitted = normalize(JSON.parse(JSON.stringify(schema)));
  fs.writeFileSync(file, JSON.stringify(emitted, null, 2) + '\n');
}
console.log('\nwrote profile schemas from models');
