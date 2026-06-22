#!/usr/bin/env bun
/**
 * commit-msg hook: enforce Conventional Commits and require a body (the "why")
 * for changelog-worthy types, so the generated changelog always has material.
 *
 * Subject = WHAT (conventional). Body (first paragraph) = WHY, which the release
 * changelog renders. `feat` / `fix` / `refactor` and any breaking change ("!")
 * must carry a body.
 *
 * Invoked by Lefthook: `bun scripts/check-commit-msg.ts {1}` ({1} = commit msg file).
 */
import { readFileSync } from 'node:fs';

const TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore', 'revert',
];
const NEEDS_BODY = new Set(['feat', 'fix', 'refactor']);

function fail(msg: string): never {
  console.error('\ncommit-msg check failed:\n  ' + msg.replace(/\n/g, '\n  ') + '\n');
  process.exit(1);
}

const file = process.argv[2];
if (!file) fail('no commit message file passed (expected Lefthook {1})');

const lines = readFileSync(file, 'utf8')
  .split('\n')
  .filter((l) => !l.startsWith('#')); // drop git comment lines

const firstIdx = lines.findIndex((l) => l.trim() !== '');
if (firstIdx === -1) fail('empty commit message');
const subject = lines[firstIdx];

// Let git's own machinery handle these.
if (/^(Merge |Revert "|fixup!|squash!)/.test(subject)) process.exit(0);

const m = subject.match(/^([a-z]+)(\(([a-z0-9_\-./]+)\))?(!)?: (.+)$/);
if (!m || !TYPES.includes(m[1])) {
  fail(
    'subject must be Conventional Commits: "<type>(<scope>): <description>"\n' +
      `  allowed types: ${TYPES.join(', ')}\n` +
      `  got: "${subject}"`
  );
}
const type = m[1];
const breaking = m[4] === '!';

const rest = lines.slice(firstIdx + 1);
if (rest.length > 0 && rest[0].trim() !== '') {
  fail('leave a blank line between the subject and the body');
}
const body = rest.slice(1).join('\n').trim();

if ((NEEDS_BODY.has(type) || breaking) && body === '') {
  fail(
    `a "${type}${breaking ? '!' : ''}" commit needs a body explaining WHY — it becomes\n` +
      '  the changelog entry. Add a blank line after the subject, then a short rationale.'
  );
}

process.exit(0);
