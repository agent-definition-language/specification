/**
 * Shared helpers for profile TypeBox models.
 *
 * Each profile (model/profiles/<slug>.ts) composes the base ADL schema via allOf and
 * adds its own members. `scripts/build-profiles.ts` emits + verifies the resulting
 * JSON Schema against profiles/<slug>/<version>/schema.json.
 */
import { Type } from '@sinclair/typebox';

export const Ref = (name: string) => Type.Unsafe({ $ref: `#/$defs/${name}` });
export const Raw = (schema: Record<string, unknown>) => Type.Unsafe(schema);
export const StringEnum = (values: readonly string[], opts: Record<string, unknown> = {}) =>
  Type.Unsafe<string>({ type: 'string', enum: values, ...opts });

/** The vendor-extensions $def, identical across the base and every profile. */
export const EXTENSIONS = {
  type: 'object',
  patternProperties: {
    '^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)+$': { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
  description: 'Vendor-namespaced extensions. Keys are reverse-domain identifiers.',
};

const PROFILE_COMMENT =
  'Open additive mixin: intentionally has no root unevaluatedProperties so this profile composes with others via allOf (spec 13.2). Validators apply unevaluatedProperties:false once over the composed schema (base + all declared profiles), per spec 13.1.';

export interface ProfileOpts {
  slug: string;
  version: string;
  title: string;
  description: string;
  /** Base schema $id segment to compose via allOf (default "0.3"). */
  baseId?: string;
  /** The profile's root object (TypeBox Type.Object) contributing type/properties/required. */
  root: object;
  /** Extra allOf entries appended after the base $ref (e.g. conditional subschemas). */
  allOfExtra?: unknown[];
  /** Extra root keywords merged verbatim (e.g. root-level `if`/`then`, `anyOf`). */
  extra?: Record<string, unknown>;
}

/** Assemble a complete profile JSON Schema object (ready to serialize). */
export function assembleProfile(opts: ProfileOpts): Record<string, unknown> {
  const baseId = opts.baseId ?? '0.3';
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://adl-spec.org/profiles/${opts.slug}/${opts.version}/schema.json`,
    title: opts.title,
    description: opts.description,
    $defs: { extensions: EXTENSIONS },
    allOf: [{ $ref: `https://adl-spec.org/${baseId}/schema.json` }, ...(opts.allOfExtra ?? [])],
    ...(opts.root as Record<string, unknown>),
    ...(opts.extra ?? {}),
    $comment: PROFILE_COMMENT,
  };
}
