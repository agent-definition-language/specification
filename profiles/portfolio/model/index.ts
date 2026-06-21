import { Type } from '@sinclair/typebox';
import { Ref, Raw, assembleProfile } from '../../_kit/profile-kit.ts';

const root = Type.Object({
  profiles: Type.Optional(Raw({ type: 'array', contains: { const: 'urn:adl:profile:portfolio:1.0' } })),
  relationships: Type.Optional(
    Type.Object(
      {
        depends_on: Type.Optional(Type.Array(Type.String())),
        composed_of: Type.Optional(Type.Array(Type.String())),
        orchestrated_by: Type.Optional(Type.String()),
        peers: Type.Optional(Type.Array(Type.String())),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
  domain: Type.Optional(
    Type.Object(
      {
        domain_id: Type.Optional(Type.String()),
        subdomain: Type.Optional(Type.String()),
        bounded_context: Type.Optional(Type.String()),
        role: Type.Optional(Type.String()),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
});

export const schema = assembleProfile({
  slug: 'portfolio',
  version: '1.0',
  title: 'ADL Portfolio Profile',
  description:
    'JSON Schema for ADL documents declaring the portfolio profile (urn:adl:profile:portfolio:1.0). Extends the base ADL schema via allOf composition.',
  root,
  extra: {
    anyOf: [{ required: ['relationships'] }, { required: ['domain'] }],
  },
});
