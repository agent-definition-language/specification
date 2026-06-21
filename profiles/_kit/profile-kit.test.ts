import { expect, test } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { assembleProfile } from './profile-kit.ts';

const root = Type.Object({ demo: Type.Optional(Type.String()) });
const base = { $ref: 'https://adl-spec.org/0.3/schema.json' };

test('no dependsOn → allOf is just the base ref', () => {
  const s = assembleProfile({ slug: 'demo', version: '1.0', title: 't', description: 'd', root });
  expect(s.allOf).toEqual([base]);
});

test('dependsOn appends dependency $refs after base, before conditionals', () => {
  const s = assembleProfile({
    slug: 'demo',
    version: '1.0',
    title: 't',
    description: 'd',
    root,
    dependsOn: ['governance/1.0'],
    allOfExtra: [{ if: { required: ['x'] }, then: {} }],
  });
  expect(s.allOf).toEqual([
    base,
    { $ref: 'https://adl-spec.org/profiles/governance/1.0/schema.json' },
    { if: { required: ['x'] }, then: {} },
  ]);
});

test('multiple dependencies are emitted in order', () => {
  const s = assembleProfile({
    slug: 'demo',
    version: '1.0',
    title: 't',
    description: 'd',
    root,
    dependsOn: ['governance/1.0', 'registry/1.0'],
  });
  expect(s.allOf).toEqual([
    base,
    { $ref: 'https://adl-spec.org/profiles/governance/1.0/schema.json' },
    { $ref: 'https://adl-spec.org/profiles/registry/1.0/schema.json' },
  ]);
});
