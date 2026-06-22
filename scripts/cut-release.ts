#!/usr/bin/env bun
/**
 * cut-release.ts <version> — the controlled release cut (writes files, does NOT
 * commit or tag).
 *
 *   bun run scripts/cut-release.ts 0.4.0
 *
 * Steps:
 *   1. Freeze core/_next  -> core/<version>.
 *   2. Freeze protocol/_next -> protocol/<version>, ONLY if protocol/_next differs
 *      from the last released protocol version (independent version line).
 *   3. Bump core/manifest.yaml (latest, new version entry, next-draft label).
 *   4. Generate the CHANGELOG.md [<version>] section from conventional commits
 *      (git-cliff over the last tag..HEAD) and reset [Unreleased].
 *   5. Print a CONTENT-DIFF GAP CHECK (schema defs / props / spec sections that
 *      actually changed) so you can confirm the generated changelog is complete.
 *
 * Then review the diff, commit, and push the v<version> tag (which fires release.yml).
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.join(ROOT, 'core');
const PROTOCOL = path.join(ROOT, 'protocol');
const MANIFEST = path.join(CORE, 'manifest.yaml');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

const C = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

function die(msg: string): never {
  console.error(C.red('cut-release: ' + msg));
  process.exit(1);
}

// ── args ──────────────────────────────────────────────────────────────────
const version = process.argv[2];
if (!version) die('usage: bun run scripts/cut-release.ts <version>  (e.g. 0.4.0)');
if (!/^\d+\.\d+\.\d+$/.test(version)) die(`version must be MAJOR.MINOR.PATCH, got "${version}"`);
const today = new Date().toISOString().slice(0, 10);

// ── helpers ───────────────────────────────────────────────────────────────
const readJSON = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8'));
const semverDirs = (dir: string) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((d) => /^\d+\.\d+\.\d+$/.test(d)).sort(cmpSemver)
    : [];
function cmpSemver(a: string, b: string) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}
function walk(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p)];
  });
}
function dirsEqual(a: string, b: string): boolean {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  const fa = walk(a).sort(), fb = walk(b).sort();
  if (fa.length !== fb.length || fa.some((f, i) => f !== fb[i])) return false;
  return fa.every((f) => fs.readFileSync(path.join(a, f)).equals(fs.readFileSync(path.join(b, f))));
}
function headings(file: string): string[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => /^#{1,3} /.test(l));
}
function listDiff(prev: string[], next: string[]) {
  const ps = new Set(prev), ns = new Set(next);
  return { added: next.filter((x) => !ps.has(x)), removed: prev.filter((x) => !ns.has(x)) };
}
function schemaKeys(file: string, key: string): string[] {
  if (!fs.existsSync(file)) return [];
  const j = readJSON(file);
  return Object.keys(j[key] ?? j[key === '$defs' ? 'definitions' : key] ?? {});
}

// ── preconditions ─────────────────────────────────────────────────────────
const nextCore = path.join(CORE, '_next');
if (!fs.existsSync(nextCore)) die('core/_next not found');
const newCore = path.join(CORE, version);
if (fs.existsSync(newCore)) die(`core/${version} already exists — nothing to cut`);

const released = semverDirs(CORE);
const prevVersion = released[released.length - 1];
if (!prevVersion) die('no previous released core version found in core/');

// model-version guard (warn, do not block — patch cuts may not bump the schema)
const nextSchemaDesc: string = (() => {
  try { return readJSON(path.join(nextCore, 'schema.json')).description ?? ''; } catch { return ''; }
})();
const m = nextSchemaDesc.match(/v(\d+\.\d+\.\d+)/);
if (m && m[1] !== version) {
  console.warn(
    C.yellow(`WARNING: core/_next schema is "v${m[1]}" but you are cutting ${version}.\n`) +
    C.yellow(`         If this is a minor/major change, bump the model (model/adl.ts + build-schema.ts)\n`) +
    C.yellow(`         and re-run bun run build:schema first, or the frozen schema will carry v${m[1]}.\n`)
  );
}

console.log(C.bold(`\nCutting ${version}  (previous core: ${prevVersion}, date: ${today})\n`));

// ── 1. freeze core ──────────────────────────────────────────────────────────
fs.cpSync(nextCore, newCore, { recursive: true });
console.log(C.green(`froze  core/_next -> core/${version}`));

// ── 2. freeze protocol if changed ────────────────────────────────────────────
const nextProto = path.join(PROTOCOL, '_next');
const prevProto = semverDirs(PROTOCOL).at(-1);
let protoCut: string | null = null;
if (fs.existsSync(nextProto)) {
  if (prevProto && dirsEqual(nextProto, path.join(PROTOCOL, prevProto))) {
    console.log(C.dim(`skip   protocol unchanged since ${prevProto} (no new protocol version)`));
  } else {
    const newProto = path.join(PROTOCOL, version);
    if (fs.existsSync(newProto)) die(`protocol/${version} already exists`);
    fs.cpSync(nextProto, newProto, { recursive: true });
    protoCut = version;
    console.log(C.green(`froze  protocol/_next -> protocol/${version}`));
  }
}

// ── 3. bump manifest ──────────────────────────────────────────────────────────
const nextMinor = (() => { const [maj, min] = version.split('.').map(Number); return `${maj}.${min + 1}.0`; })();
let manifest = fs.readFileSync(MANIFEST, 'utf8');
manifest = manifest.replace(/^(latest:\s*").*?(")/m, `$1${version}$2`);
// bump the _next draft label
manifest = manifest.replace(
  /(- id:\s*"_next"[\s\S]*?label:\s*").*?(")/,
  `$1${nextMinor} (Draft)$2`
);
// insert the new released entry before the previous latest entry
const entry =
  `  - id: "${version}"\n    status: released\n    label: "${version}"\n    released_at: "${today}"\n\n`;
manifest = manifest.replace(new RegExp(`( {2}- id:\\s*"${prevVersion.replace(/\./g, '\\.')}")`), entry + '$1');
fs.writeFileSync(MANIFEST, manifest);
console.log(C.green(`bumped core/manifest.yaml (latest=${version}, _next -> ${nextMinor} draft)`));

// ── 4. changelog ──────────────────────────────────────────────────────────────
let section: string;
try {
  section = execFileSync('git-cliff', ['--unreleased', '--tag', `v${version}`, '--strip', 'all'], {
    cwd: ROOT, encoding: 'utf8',
  }).trim();
} catch {
  die('git-cliff failed (is it installed? `brew install git-cliff`)');
}
// normalize the generated date to today
section = section.replace(/^(## \[[^\]]+\] — ).*/m, `$1${today}`);
let changelog = fs.readFileSync(CHANGELOG, 'utf8');
changelog = changelog.replace(
  /## \[Unreleased\][\s\S]*?(?=\n## \[)/,
  `## [Unreleased]\n\n${section}\n`
);
// refresh link refs (Unreleased compare + new version link)
changelog = changelog.replace(/(\[Unreleased\]:.*compare\/)v[\d.]+(\.\.\.HEAD)/, `$1v${version}$2`);
if (!changelog.includes(`[${version}]: `)) {
  changelog = changelog.replace(
    /(\[Unreleased\]:.*\n)/,
    `$1[${version}]: https://github.com/agent-definition-language/specification/releases/tag/v${version}\n`
  );
}
fs.writeFileSync(CHANGELOG, changelog);
console.log(C.green(`wrote  CHANGELOG.md [${version}] section (git-cliff) and reset [Unreleased]`));

// ── 5. content-diff gap check ─────────────────────────────────────────────────
console.log(C.bold(`\n── GAP CHECK: content actually changed ${prevVersion} -> ${version} ──`));
console.log(C.dim('Confirm every change below appears in the generated CHANGELOG section.\n'));

function report(title: string, d: { added: string[]; removed: string[] }) {
  if (!d.added.length && !d.removed.length) return;
  console.log(C.bold(title));
  for (const x of d.added) console.log('  ' + C.green('+ ' + x));
  for (const x of d.removed) console.log('  ' + C.red('- ' + x));
}
const pc = path.join(CORE, prevVersion), nc = newCore;
let any = false;
for (const [label, key] of [['schema $defs', '$defs'], ['top-level members', 'properties']] as const) {
  const d = listDiff(schemaKeys(path.join(pc, 'schema.json'), key), schemaKeys(path.join(nc, 'schema.json'), key));
  if (d.added.length || d.removed.length) { report(`core ${label}`, d); any = true; }
}
{
  const d = listDiff(
    schemaKeys(path.join(pc, 'schema.json'), 'required'),
    schemaKeys(path.join(nc, 'schema.json'), 'required')
  );
  // required is an array, not an object; recompute from arrays
  const ra = (() => { try { return readJSON(path.join(pc, 'schema.json')).required ?? []; } catch { return []; } })();
  const rb = (() => { try { return readJSON(path.join(nc, 'schema.json')).required ?? []; } catch { return []; } })();
  const rd = listDiff(ra, rb);
  if (rd.added.length || rd.removed.length) { report('core required members', rd); any = true; }
}
{
  const d = listDiff(headings(path.join(pc, 'spec.md')), headings(path.join(nc, 'spec.md')));
  if (d.added.length || d.removed.length) { report('core spec.md sections', d); any = true; }
}
if (protoCut && prevProto) {
  for (const f of ['trust-protocol.md', 'runtime-protocol.md']) {
    const d = listDiff(headings(path.join(PROTOCOL, prevProto, f)), headings(path.join(PROTOCOL, protoCut, f)));
    if (d.added.length || d.removed.length) { report(`protocol ${f} sections`, d); any = true; }
  }
}
if (!any) console.log(C.dim('  (no schema/section differences detected)'));

// ── next steps ────────────────────────────────────────────────────────────────
console.log(C.bold('\n── Next (controlled tagging) ──'));
console.log(`  1. Review:  git diff   (and the GAP CHECK above vs CHANGELOG.md)`);
console.log(`  2. Stage:   git add -A`);
console.log(`  3. Commit:  git commit -m "feat(release): cut ${version}\\n\\n<why>"`);
console.log(`  4. Tag:     git tag v${version} && git push origin main && git push origin v${version}`);
console.log(C.dim(`     (pushing the tag fires release.yml: builds the artifact + publishes the`));
console.log(C.dim(`      CHANGELOG section as the GitHub Release body.)\n`));
