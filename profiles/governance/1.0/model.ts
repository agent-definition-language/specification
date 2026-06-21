import { Type } from '@sinclair/typebox';
import { Ref, Raw, StringEnum, assembleProfile } from '../../../model/profile-kit.ts';

const root = Type.Object({
  profiles: Type.Optional(Raw({ type: 'array', contains: { const: 'urn:adl:profile:governance:1.0' } })),
  compliance_framework: Type.Object(
    {
      primary_framework: StringEnum([
        'NIST_800_53',
        'SOC2_TYPE_II',
        'ISO_27001',
        'ISO_42001',
        'GDPR',
        'HIPAA',
        'PCI_DSS',
        'EU_AI_ACT',
        'IMDA_AGENTIC',
        'NIST_AI_RMF',
      ]),
      control_mappings: Type.Optional(
        Type.Array(
          Type.Object(
            {
              framework: Type.String(),
              control_id: Type.String(),
              status: StringEnum(['implemented', 'partial', 'planned', 'not_applicable']),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
      ),
      audit_dates: Type.Optional(
        Type.Object(
          {
            last_audit: Type.Optional(Type.String({ format: 'date-time' })),
            next_audit: Type.Optional(Type.String({ format: 'date-time' })),
            extensions: Type.Optional(Ref('extensions')),
          },
          { additionalProperties: false },
        ),
      ),
      extensions: Type.Optional(Ref('extensions')),
    },
    { additionalProperties: false },
  ),
  autonomy: Type.Object(
    {
      tier: Raw({ type: 'integer', enum: [1, 2, 3] }),
      basis: Type.String({ minLength: 1 }),
      classified_by: Type.String({ minLength: 1 }),
      classified_at: Type.String({ format: 'date-time' }),
      extensions: Type.Optional(Ref('extensions')),
    },
    { additionalProperties: false },
  ),
  risk_classification: Type.Optional(
    Type.Object(
      {
        level: Type.Optional(StringEnum(['low', 'medium', 'high', 'critical'])),
        autonomy_level: Type.Optional(StringEnum(['L0', 'L1', 'L2', 'L3', 'L4', 'L5'])),
        assessed_by: Type.Optional(Type.String()),
        assessed_at: Type.Optional(Type.String({ format: 'date-time' })),
        rationale: Type.Optional(Type.String()),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
  human_oversight: Type.Optional(
    Type.Object(
      {
        level: Type.Optional(StringEnum(['none', 'on_exception', 'periodic', 'continuous'])),
        role: Type.Optional(Type.String()),
        triggers: Type.Optional(
          Raw({
            type: 'array',
            minItems: 1,
            items: {
              anyOf: [
                { type: 'string' },
                {
                  type: 'object',
                  required: ['when'],
                  properties: {
                    description: { type: 'string' },
                    when: {
                      type: 'object',
                      minProperties: 1,
                      properties: {
                        cost_usd_over: { type: 'number', exclusiveMinimum: 0 },
                        data_classification_at_least: {
                          type: 'string',
                          enum: ['public', 'internal', 'confidential', 'restricted'],
                        },
                        tool: { type: 'string' },
                        path_matches: { type: 'string' },
                      },
                      additionalProperties: false,
                    },
                  },
                  additionalProperties: false,
                },
              ],
            },
          }),
        ),
        response_time_minutes: Type.Optional(Type.Integer({ minimum: 1 })),
        intervention_model: Type.Optional(StringEnum(['approve_reject', 'plan_editing', 'monitor_only'])),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
  incident_response: Type.Optional(
    Type.Object(
      {
        policy_documented: Type.Boolean(),
        last_tested: Type.Optional(Type.String({ format: 'date-time' })),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
  evaluation_attestation: Type.Optional(
    Type.Object(
      {
        result: StringEnum(['passed', 'conditional', 'failed']),
        evaluator: Type.String({ minLength: 1 }),
        evaluation_date: Type.String({ format: 'date-time' }),
        methodology: Type.Optional(
          StringEnum(['automated_benchmark', 'red_team', 'third_party_audit', 'sandbox', 'internal_review']),
        ),
        expires_at: Type.Optional(Type.String({ format: 'date-time' })),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
  disclosure: Type.Optional(
    Type.Object(
      {
        required: Type.Boolean(),
        known_limitations: Type.Optional(Type.Array(Type.String(), { minItems: 1 })),
        prohibited_uses: Type.Optional(Type.Array(Type.String(), { minItems: 1 })),
        user_responsibilities: Type.Optional(Type.Array(Type.String(), { minItems: 1 })),
        reporting_contact: Type.Optional(Type.String({ format: 'uri' })),
        disclosure_version: Type.Optional(Type.String()),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
  safety_reviews: Type.Optional(
    Type.Object(
      {
        required: Type.Optional(Type.Boolean()),
        frequency: Type.Optional(Type.String()),
        last_review: Type.Optional(Type.String({ format: 'date-time' })),
        next_review: Type.Optional(Type.String({ format: 'date-time' })),
        review_board: Type.Optional(Type.String()),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
  governance: Type.Optional(
    Type.Object(
      {
        ownership: Type.Optional(
          Type.Object(
            {
              owner: Type.Optional(Type.String()),
              delegate: Type.Optional(Type.String()),
              contact: Type.Optional(Type.String({ format: 'email' })),
              user_escalation_contact: Type.Optional(Type.String({ format: 'uri' })),
              decision_boundaries: Type.Optional(
                Type.Array(
                  Type.Object(
                    {
                      decision_type: Type.String(),
                      owner: StringEnum(['human_only', 'agent', 'human_in_loop']),
                      rationale: Type.Optional(Type.String()),
                      extensions: Type.Optional(Ref('extensions')),
                    },
                    { additionalProperties: false },
                  ),
                  { minItems: 1 },
                ),
              ),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        approval_workflow: Type.Optional(
          Type.Object(
            {
              required: Type.Optional(Type.Boolean()),
              approvers: Type.Optional(Type.Array(Type.String())),
              approval_type: Type.Optional(StringEnum(['any', 'all', 'quorum'])),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        audit_trail: Type.Optional(
          Type.Object(
            {
              enabled: Type.Optional(Type.Boolean()),
              retention_days: Type.Optional(Type.Integer({ minimum: 0 })),
              destination: Type.Optional(Type.String({ format: 'uri' })),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        lifecycle_governance: Type.Optional(
          Type.Object(
            {
              transition_policy: Type.Optional(
                Type.Object(
                  {
                    requires_approval: Type.Optional(Type.Boolean()),
                    approvers: Type.Optional(Type.Array(Type.String())),
                    approval_type: Type.Optional(StringEnum(['any', 'all', 'quorum'])),
                    notice_period_days: Type.Optional(Type.Integer({ minimum: 0 })),
                    allowed_transitions: Type.Optional(Type.Array(Type.String())),
                    extensions: Type.Optional(Ref('extensions')),
                  },
                  { additionalProperties: false },
                ),
              ),
              last_transition: Type.Optional(
                Type.Object(
                  {
                    from_status: Type.Optional(StringEnum(['draft', 'active', 'deprecated', 'retired'])),
                    to_status: Type.Optional(StringEnum(['draft', 'active', 'deprecated', 'retired'])),
                    approved_by: Type.Optional(Type.String()),
                    approved_at: Type.Optional(Type.String({ format: 'date-time' })),
                    reason: Type.Optional(Type.String()),
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
      { additionalProperties: false },
    ),
  ),
  governance_record_ref: Type.Optional(Type.String({ format: 'uri' })),
  anomaly_baseline: Type.Optional(
    Type.Object(
      {
        expected_tools: Type.Optional(
          Type.Array(
            Type.Object(
              {
                name: Type.String(),
                share: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
              },
              { additionalProperties: false },
            ),
          ),
        ),
        cost_per_session_usd: Type.Optional(
          Type.Object(
            {
              min: Type.Optional(Type.Number({ minimum: 0 })),
              max: Type.Optional(Type.Number({ minimum: 0 })),
            },
            { additionalProperties: false },
          ),
        ),
        data_classes: Type.Optional(
          Type.Array(StringEnum(['pii', 'phi', 'financial', 'credentials', 'intellectual_property', 'regulatory'])),
        ),
        extensions: Type.Optional(Ref('extensions')),
      },
      { additionalProperties: false },
    ),
  ),
});

export const schema = assembleProfile({
  slug: 'governance',
  version: '1.0',
  title: 'ADL Governance Profile',
  description:
    'JSON Schema for ADL documents declaring the governance profile (urn:adl:profile:governance:1.0). Extends the base ADL schema via allOf composition.',
  root,
  extra: {
    if: {
      properties: {
        autonomy: {
          properties: { tier: { enum: [2, 3] } },
          required: ['tier'],
        },
      },
      required: ['autonomy'],
    },
    then: {
      required: ['human_oversight', 'incident_response', 'disclosure'],
      properties: {
        human_oversight: { required: ['triggers', 'response_time_minutes'] },
        incident_response: { properties: { policy_documented: { const: true } } },
        disclosure: { properties: { required: { const: true } } },
      },
      if: {
        properties: {
          autonomy: { properties: { tier: { const: 3 } } },
        },
      },
      then: {
        required: ['human_oversight', 'incident_response', 'disclosure', 'evaluation_attestation', 'anomaly_baseline'],
        properties: {
          evaluation_attestation: { properties: { result: { const: 'passed' } } },
        },
      },
    },
  },
});
