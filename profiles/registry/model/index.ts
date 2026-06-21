import { Type } from '@sinclair/typebox';
import { Ref, Raw, StringEnum, assembleProfile } from '../../../model/profile-kit.ts';

const root = Type.Object({
  profiles: Type.Optional(Raw({ type: 'array', contains: { const: 'urn:adl:profile:registry:1.0' } })),
  registry: Type.Object(
    {
      catalog_id: Type.String({ minLength: 1 }),
      catalog_classification: Type.Optional(
        Type.Array(
          Type.Object(
            {
              domain: Type.String({ minLength: 1 }),
              subdomain: Type.Optional(Type.String()),
              capability: Type.Optional(Type.String()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
      ),
      visibility: Type.Optional(StringEnum(['private', 'internal', 'public'])),
      federation: Type.Optional(
        Type.Object(
          {
            registries: Type.Optional(Type.Array(Type.String({ format: 'uri' }))),
            primary: Type.Optional(Type.String({ format: 'uri' })),
            extensions: Type.Optional(Ref('extensions')),
          },
          { additionalProperties: false },
        ),
      ),
      extensions: Type.Optional(Ref('extensions')),
    },
    { additionalProperties: false },
  ),
});

export const schema = assembleProfile({
  slug: 'registry',
  version: '1.0',
  title: 'ADL Registry Profile',
  description:
    'JSON Schema for ADL documents declaring the registry profile (urn:adl:profile:registry:1.0). Extends the base ADL schema via allOf composition.',
  root,
});
