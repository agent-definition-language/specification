/**
 * ADL passport document model — single source of truth.
 *
 * Authored in TypeBox; `scripts/build-schema.ts` emits the canonical JSON Schemas
 * (schema.json + schema-strict.json) and verifies them. TypeBox values *are* JSON
 * Schema, so the emitted schema is faithful 2020-12 and the TS types are inferred
 * from the same source — no drift between schema, types, and SDK.
 *
 * Conventions:
 *   - `Type.*` for regular constructs (objects, strings, numbers, arrays).
 *   - `Raw()` (Type.Unsafe) for constructs we need verbatim: `oneOf`, `patternProperties`,
 *     open objects with no `properties` key, and empty schemas.
 *   - `Ref(name)` emits a local `#/$defs/<name>` reference.
 *   - `StringEnum([...])` emits `{ type: 'string', enum: [...] }`.
 *   - Non-optional properties become `required`; wrap optional ones in `Type.Optional`.
 */
import { Type, type Static } from '@sinclair/typebox';

const Ref = (name: string) => Type.Unsafe({ $ref: `#/$defs/${name}` });
const Raw = (schema: Record<string, unknown>) => Type.Unsafe(schema);
const StringEnum = (values: readonly string[], opts: Record<string, unknown> = {}) =>
  Type.Unsafe<string>({ type: 'string', enum: values, ...opts });

// ---------------------------------------------------------------------------
// $defs
// ---------------------------------------------------------------------------

const Extensions = Raw({
  type: 'object',
  patternProperties: {
    '^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)+$': { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
  description: 'Vendor-namespaced extensions. Keys are reverse-domain identifiers.',
});

const DataClassification = Type.Object(
  {
    sensitivity: StringEnum(['public', 'internal', 'confidential', 'restricted'], {
      description: 'Information sensitivity level (NIST FIPS 199 / ISO 27001)',
    }),
    categories: Type.Optional(
      Type.Array(
        StringEnum(['pii', 'phi', 'financial', 'credentials', 'intellectual_property', 'regulatory']),
        { minItems: 1, description: 'Broad information categories handled' },
      ),
    ),
    retention: Type.Optional(
      Type.Object(
        {
          min_days: Type.Optional(Type.Number({ minimum: 0 })),
          max_days: Type.Optional(Type.Number({ minimum: 0 })),
          policy_uri: Type.Optional(Type.String({ format: 'uri' })),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false, description: 'Data retention requirements' },
      ),
    ),
    handling: Type.Optional(
      Type.Object(
        {
          encryption_required: Type.Optional(Type.Boolean()),
          anonymization_required: Type.Optional(Type.Boolean()),
          cross_border_restricted: Type.Optional(Type.Boolean()),
          logging_required: Type.Optional(Type.Boolean()),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false, description: 'Data handling constraints' },
      ),
    ),
    extensions: Type.Optional(Ref('extensions')),
  },
  {
    description:
      'Data classification (composable; profiles MAY add domain-specific sub-objects via schema composition)',
  },
);

const BudgetDimension = Type.Object(
  {
    per_session: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    per_day: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  },
  { additionalProperties: false, description: 'Per-session / per-day cap for one budget dimension' },
);

const Budget = Type.Object(
  {
    tokens: Type.Optional(Ref('budgetDimension')),
    cost_usd: Type.Optional(Ref('budgetDimension')),
    wall_clock_sec: Type.Optional(Ref('budgetDimension')),
  },
  {
    additionalProperties: false,
    description:
      'Cumulative token / cost / wall-clock budget, scoped per session and per day (enforced by Runtime Protocol §2)',
  },
);

const DegradationResponse = Type.Object(
  {
    action: StringEnum(['halt', 'pause', 'fallback', 'continue']),
    value: Type.Optional(Raw({ description: 'Value to return when action is fallback' })),
    message: Type.Optional(Type.String()),
    notify: Type.Optional(Type.Boolean()),
    extensions: Type.Optional(Ref('extensions')),
  },
  { additionalProperties: false, description: 'Governor response to a degradation cause (Runtime Protocol §6)' },
);

const $defs = {
  data_classification: DataClassification,
  budgetDimension: BudgetDimension,
  budget: Budget,
  degradationResponse: DegradationResponse,
  extensions: Extensions,
};

// ---------------------------------------------------------------------------
// Root passport object
// ---------------------------------------------------------------------------

const Root = Type.Object({
  adl_spec: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$', description: 'ADL specification version (semantic versioning)' }),
  $schema: Type.Optional(Type.String({ format: 'uri', description: 'URI to this JSON Schema' })),
  name: Type.String({ minLength: 1, description: 'Human-readable name for the agent' }),
  description: Type.String({ minLength: 1, description: "Human-readable description of the agent's purpose and capabilities" }),
  version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$', description: 'Agent version (semantic versioning)' }),
  lifecycle: Type.Optional(
    Type.Object(
      {
        status: StringEnum(['draft', 'active', 'deprecated', 'retired'], { description: 'Lifecycle state of the agent' }),
        effective_date: Type.Optional(Type.String({ format: 'date-time', description: 'ISO 8601 timestamp when current status took effect' })),
        sunset_date: Type.Optional(Type.String({ format: 'date-time', description: 'ISO 8601 timestamp for planned or actual retirement' })),
        successor: Type.Optional(Type.String({ format: 'uri', description: 'URI or URN of the replacement agent' })),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
  id: Type.Optional(Type.String({ description: 'Unique identifier for the agent (URI or URN)' })),
  provider: Type.Optional(
    Type.Object(
      {
        name: Type.String({ minLength: 1 }),
        url: Type.Optional(Type.String({ format: 'uri' })),
        contact: Type.Optional(Type.String({ format: 'email' })),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false, description: 'Organization or entity that provides the agent' },
    ),
  ),
  cryptographic_identity: Type.Optional(
    Type.Object(
      {
        did: Type.Optional(Type.String()),
        public_key: Type.Optional(
          Type.Object(
            {
              algorithm: Type.String(),
              value: Type.String(),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false, description: 'Cryptographic identification for the agent' },
    ),
  ),
  model: Type.Optional(
    Type.Object(
      {
        provider: Type.Optional(Type.String()),
        name: Type.Optional(Type.String()),
        version: Type.Optional(Type.String()),
        context_window: Type.Optional(Type.Integer({ minimum: 1 })),
        temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
        max_tokens: Type.Optional(Type.Integer({ minimum: 1 })),
        capabilities: Type.Optional(Type.Array(StringEnum(['function_calling', 'vision', 'code_execution', 'streaming']))),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false, description: 'AI model configuration' },
    ),
  ),
  system_prompt: Type.Optional(
    Raw({
      oneOf: [
        { type: 'string', minLength: 1 },
        {
          type: 'object',
          required: ['template'],
          properties: {
            template: { type: 'string', minLength: 1 },
            variables: { type: 'object' },
            extensions: { $ref: '#/$defs/extensions' },
          },
          additionalProperties: false,
        },
      ],
      description: 'System prompt (string or template object)',
    }),
  ),
  tools: Type.Optional(
    Type.Array(
      Type.Object(
        {
          name: Type.String({ pattern: '^[a-z][a-z0-9_]*$', description: 'Unique tool name' }),
          description: Type.String({ minLength: 1 }),
          parameters: Type.Optional(Raw({ type: 'object', description: 'JSON Schema for tool input parameters' })),
          returns: Type.Optional(Raw({ type: 'object', description: 'JSON Schema for tool return value' })),
          examples: Type.Optional(
            Type.Array(
              Type.Object(
                {
                  name: Type.Optional(Type.String()),
                  input: Type.Optional(Raw({ type: 'object' })),
                  output: Type.Optional(Raw({})),
                  extensions: Type.Optional(Ref('extensions')),
                },
                { additionalProperties: false },
              ),
              { description: 'Example invocations' },
            ),
          ),
          requires_confirmation: Type.Optional(Type.Boolean()),
          idempotent: Type.Optional(Type.Boolean()),
          read_only: Type.Optional(Type.Boolean()),
          annotations: Type.Optional(
            Raw({
              type: 'object',
              properties: {
                openapi_ref: { type: 'string', format: 'uri' },
                operation_id: { type: 'string' },
              },
              additionalProperties: true,
              description: 'Implementation hints and metadata (open object)',
            }),
          ),
          data_classification: Type.Optional(Ref('data_classification')),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false },
      ),
      { description: 'Tools (functions) the agent can invoke' },
    ),
  ),
  resources: Type.Optional(
    Type.Array(
      Type.Object(
        {
          name: Type.String({ minLength: 1 }),
          type: StringEnum(['vector_store', 'knowledge_base', 'file', 'api', 'database']),
          description: Type.Optional(Type.String()),
          uri: Type.Optional(Type.String({ format: 'uri' })),
          mime_types: Type.Optional(Type.Array(Type.String())),
          schema: Type.Optional(Raw({ type: 'object', description: "JSON Schema describing the resource's data structure" })),
          annotations: Type.Optional(Raw({ type: 'object', additionalProperties: true, description: 'Implementation hints and metadata (open object)' })),
          data_classification: Type.Optional(Ref('data_classification')),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false },
      ),
      { description: 'Data sources the agent can access' },
    ),
  ),
  prompts: Type.Optional(
    Type.Array(
      Type.Object(
        {
          name: Type.String({ minLength: 1 }),
          template: Type.String({ minLength: 1 }),
          description: Type.Optional(Type.String()),
          arguments: Type.Optional(Raw({ type: 'object', description: 'JSON Schema for template arguments' })),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false },
      ),
      { description: 'Reusable prompt templates' },
    ),
  ),
  permissions: Type.Optional(
    Type.Object(
      {
        network: Type.Optional(
          Type.Object(
            {
              allowed_hosts: Type.Optional(Type.Array(Type.String(), { description: 'Host patterns (see Section 4.4)' })),
              allowed_ports: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 65535 }))),
              allowed_protocols: Type.Optional(Type.Array(Type.String())),
              deny_private: Type.Optional(Type.Boolean()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        filesystem: Type.Optional(
          Type.Object(
            {
              allowed_paths: Type.Optional(
                Type.Array(
                  Type.Object(
                    {
                      path: Type.String(),
                      access: StringEnum(['read', 'write', 'read_write']),
                    },
                    { additionalProperties: false },
                  ),
                ),
              ),
              denied_paths: Type.Optional(Type.Array(Type.String(), { description: 'Path patterns to deny (see Section 4.4)' })),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        environment: Type.Optional(
          Type.Object(
            {
              allowed_variables: Type.Optional(Type.Array(Type.String(), { description: 'Variable name patterns (see Section 4.4)' })),
              denied_variables: Type.Optional(Type.Array(Type.String(), { description: 'Variable name patterns to deny (see Section 4.4)' })),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        execution: Type.Optional(
          Type.Object(
            {
              allowed_commands: Type.Optional(Type.Array(Type.String())),
              denied_commands: Type.Optional(Type.Array(Type.String())),
              allow_shell: Type.Optional(Type.Boolean()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        resource_limits: Type.Optional(
          Type.Object(
            {
              max_memory_mb: Type.Optional(Type.Number({ minimum: 0 })),
              max_cpu_percent: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
              max_duration_sec: Type.Optional(Type.Number({ minimum: 0 })),
              max_concurrent: Type.Optional(Type.Integer({ minimum: 1 })),
              budget: Type.Optional(Ref('budget')),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        sub_agents: Type.Optional(
          Type.Array(
            Type.Object(
              {
                name: Type.String(),
                description: Type.Optional(Type.String()),
                prompt_resource: Type.Optional(Type.String()),
                tools: Type.Optional(Type.Array(Type.String())),
                max_parallel: Type.Optional(Type.Integer({ minimum: 1 })),
                budget_share: Type.Optional(Ref('budget')),
                extensions: Type.Optional(Ref('extensions')),
              },
              { additionalProperties: false },
            ),
            {
              description:
                'Subordinate personas this agent may spawn under its own identity (no separate passport); capped at spawn by Runtime Protocol §4',
            },
          ),
        ),
        delegation: Type.Optional(
          Type.Object(
            {
              match: Type.Optional(Type.Array(Type.String())),
              deny: Type.Optional(Type.Array(Type.String())),
              max_depth: Type.Optional(Type.Integer({ minimum: 1 })),
              attenuation: Type.Optional(
                Type.Object(
                  {
                    scopes_subset: Type.Optional(Type.Boolean()),
                    budget_subset: Type.Optional(Type.Boolean()),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              extensions: Type.Optional(Ref('extensions')),
            },
            {
              additionalProperties: false,
              description:
                'Envelope of separately-identified peer agents this agent may engage (admitted by Runtime Protocol §4)',
            },
          ),
        ),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false, description: 'Agent operational boundaries (deny-by-default)' },
    ),
  ),
  security: Type.Optional(
    Type.Object(
      {
        authentication: Type.Optional(
          Type.Object(
            {
              type: Type.Optional(StringEnum(['none', 'api_key', 'oauth2', 'oidc', 'mtls'])),
              required: Type.Optional(Type.Boolean()),
              scopes: Type.Optional(Type.Array(Type.String())),
              token_endpoint: Type.Optional(Type.String({ format: 'uri' })),
              issuer: Type.Optional(Type.String()),
              audience: Type.Optional(Type.String()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        encryption: Type.Optional(
          Type.Object(
            {
              in_transit: Type.Optional(
                Type.Object(
                  {
                    required: Type.Optional(Type.Boolean()),
                    min_version: Type.Optional(Type.String()),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              at_rest: Type.Optional(
                Type.Object(
                  {
                    required: Type.Optional(Type.Boolean()),
                    algorithm: Type.Optional(Type.String()),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        attestation: Type.Optional(
          Type.Object(
            {
              type: Type.Optional(StringEnum(['self', 'third_party', 'verifiable_credential'])),
              issuer: Type.Optional(Type.String()),
              issued_at: Type.Optional(Type.String({ format: 'date-time' })),
              expires_at: Type.Optional(Type.String({ format: 'date-time' })),
              signature: Type.Optional(
                Type.Object(
                  {
                    algorithm: Type.String(),
                    value: Type.String(),
                    signed_content: StringEnum(['canonical', 'digest']),
                    digest_algorithm: Type.Optional(Type.String()),
                    digest_value: Type.Optional(Type.String()),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false, description: 'Security requirements' },
    ),
  ),
  data_classification: Ref('data_classification'),
  runtime: Type.Optional(
    Type.Object(
      {
        input_handling: Type.Optional(
          Type.Object(
            {
              max_input_length: Type.Optional(Type.Integer({ minimum: 1 })),
              content_types: Type.Optional(Type.Array(Type.String(), { description: 'Accepted MIME types (e.g., text/plain, application/json)' })),
              sanitization: Type.Optional(
                Type.Object(
                  {
                    enabled: Type.Optional(Type.Boolean()),
                    strip_html: Type.Optional(Type.Boolean()),
                    max_input_length: Type.Optional(Type.Integer({ minimum: 1 })),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        output_handling: Type.Optional(
          Type.Object(
            {
              max_output_length: Type.Optional(Type.Integer({ minimum: 1 })),
              format: Type.Optional(StringEnum(['text', 'json', 'markdown', 'html'])),
              streaming: Type.Optional(Type.Boolean()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        tool_invocation: Type.Optional(
          Type.Object(
            {
              parallel: Type.Optional(Type.Boolean()),
              max_concurrent: Type.Optional(Type.Integer({ minimum: 1 })),
              timeout_ms: Type.Optional(Type.Integer({ minimum: 0 })),
              max_iterations: Type.Optional(Type.Integer({ minimum: 1 })),
              max_tool_calls_per_session: Type.Optional(Type.Integer({ minimum: 1 })),
              loop_detection: Type.Optional(
                Type.Object(
                  {
                    window: Type.Optional(Type.Integer({ minimum: 2 })),
                    on_detected: Type.Optional(Ref('degradationResponse')),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              retry_policy: Type.Optional(
                Type.Object(
                  {
                    max_retries: Type.Optional(Type.Integer({ minimum: 0 })),
                    backoff_strategy: Type.Optional(StringEnum(['fixed', 'exponential', 'linear'])),
                    initial_delay_ms: Type.Optional(Type.Integer({ minimum: 0 })),
                    max_delay_ms: Type.Optional(Type.Integer({ minimum: 0 })),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        error_handling: Type.Optional(
          Type.Object(
            {
              on_tool_error: Type.Optional(StringEnum(['abort', 'continue', 'retry'])),
              max_retries: Type.Optional(Type.Integer({ minimum: 0 })),
              fallback_behavior: Type.Optional(
                Type.Object(
                  {
                    action: Type.Optional(StringEnum(['return_error', 'use_default', 'skip'])),
                    default: Type.Optional(Raw({ description: 'Default value when action is use_default' })),
                    message: Type.Optional(Type.String()),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        degradation: Type.Optional(
          Raw({
            type: 'object',
            properties: { extensions: { $ref: '#/$defs/extensions' } },
            patternProperties: { '^on_[a-z0-9_]+$': { $ref: '#/$defs/degradationResponse' } },
            additionalProperties: false,
            description:
              'Behavior when an operational limit is reached or a fault occurs, keyed by cause (enforced by Runtime Protocol §6)',
          }),
        ),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false, description: 'Runtime behavior configuration' },
    ),
  ),
  metadata: Type.Optional(
    Type.Object(
      {
        authors: Type.Optional(
          Type.Array(
            Type.Object(
              {
                name: Type.Optional(Type.String()),
                email: Type.Optional(Type.String({ format: 'email' })),
                url: Type.Optional(Type.String({ format: 'uri' })),
                extensions: Type.Optional(Ref('extensions')),
              },
              { additionalProperties: false },
            ),
          ),
        ),
        license: Type.Optional(Type.String()),
        documentation: Type.Optional(Type.String({ format: 'uri' })),
        repository: Type.Optional(Type.String({ format: 'uri' })),
        tags: Type.Optional(Type.Array(Type.String({ pattern: '^[a-z0-9][a-z0-9-]*$' }))),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false, description: 'Additional metadata' },
    ),
  ),
  profiles: Type.Optional(Type.Array(Type.String(), { description: 'Profile identifiers (URIs or registered names)' })),
  extensions: Type.Optional(Ref('extensions')),
});

/** The ADL document TypeScript type, inferred from the same source as the schema. */
export type AdlDocument = Static<typeof Root>;

/**
 * Assemble the passport JSON Schema for a given $id version segment (e.g. "0.3").
 * Returns a plain object ready to JSON-serialize.
 */
export function buildPassportSchema(idSegment: string, specVersion: string): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://adl-spec.org/${idSegment}/schema.json`,
    title: 'ADL Document',
    description: `Agent Definition Language v${specVersion}`,
    $defs,
    ...Root,
  };
}
