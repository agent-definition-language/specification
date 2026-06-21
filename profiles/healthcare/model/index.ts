import { Type } from '@sinclair/typebox';
import { Ref, Raw, StringEnum, assembleProfile } from '../../_kit/profile-kit.ts';

const root = Type.Object({
  profiles: Type.Optional(Raw({ type: 'array', contains: { const: 'urn:adl:profile:healthcare:1.0' } })),
  data_classification: Type.Optional(
    Type.Object({
      categories: Type.Optional(Raw({ contains: { const: 'phi' } })),
      healthcare: Type.Object(
        {
          phi_types: Type.Array(
            StringEnum([
              'demographics',
              'medical_records',
              'billing',
              'mental_health',
              'substance_use',
              'genetic',
              'reproductive',
              'hiv_status',
            ]),
            { minItems: 1 },
          ),
          hipaa_applicability: Type.Optional(Type.Boolean()),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false },
      ),
    }),
  ),
  hipaa_compliance: Type.Object(
    {
      covered_entity_type: StringEnum(['covered_entity', 'business_associate', 'subcontractor']),
      baa_required: Type.Boolean(),
      minimum_necessary: Type.Object(
        {
          scope: StringEnum(['task_specific', 'role_based', 'full_record']),
          justification: Type.Optional(Type.String()),
          review_frequency: Type.Optional(Type.String()),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false },
      ),
      security_rule: Type.Optional(
        Type.Object(
          {
            encryption_at_rest: Type.Optional(StringEnum(['AES_256', 'AES_128'])),
            encryption_in_transit: Type.Optional(StringEnum(['TLS_1_2', 'TLS_1_3'])),
            mfa_required: Type.Optional(Type.Boolean()),
            data_retention: Type.Optional(StringEnum(['none', 'minimum', 'standard'])),
            restoration_hours: Type.Optional(Type.Number({ minimum: 0 })),
            extensions: Type.Optional(Ref('extensions')),
          },
          { additionalProperties: false },
        ),
      ),
      extensions: Type.Optional(Ref('extensions')),
    },
    { additionalProperties: false },
  ),
  phi_handling: Type.Object(
    {
      de_identification: Type.Object(
        {
          method: StringEnum(['safe_harbor', 'expert_determination', 'none']),
          re_identification_controls: Type.Optional(Type.Boolean()),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false },
      ),
      breach_notification: Type.Object(
        {
          notification_hours: Type.Number({ minimum: 0 }),
          contact: Type.String(),
          threshold: Type.Optional(Type.Number({ minimum: 0 })),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false },
      ),
      consent_management: Type.Optional(
        Type.Object(
          {
            required: Type.Optional(Type.Boolean()),
            consent_types: Type.Optional(
              Type.Array(StringEnum(['treatment', 'payment', 'operations', 'research', 'marketing'])),
            ),
            granularity: Type.Optional(StringEnum(['broad', 'purpose_specific', 'data_specific'])),
            revocation_supported: Type.Optional(Type.Boolean()),
            extensions: Type.Optional(Ref('extensions')),
          },
          { additionalProperties: false },
        ),
      ),
      data_provenance: Type.Optional(
        Type.Object(
          {
            tracking: Type.Optional(Type.Boolean()),
            source_systems: Type.Optional(Type.Array(Type.String())),
            extensions: Type.Optional(Ref('extensions')),
          },
          { additionalProperties: false },
        ),
      ),
      extensions: Type.Optional(Ref('extensions')),
    },
    { additionalProperties: false },
  ),
  clinical_safety: Type.Optional(
    Type.Object(
      {
        fda_classification: Type.Optional(
          Type.Object(
            {
              device_class: Type.Optional(StringEnum(['exempt', 'class_I', 'class_II', 'class_III', 'non_device'])),
              clearance_type: Type.Optional(StringEnum(['510k', 'de_novo', 'pma', 'not_applicable'])),
              clearance_number: Type.Optional(Type.String()),
              software_level: Type.Optional(
                StringEnum(['non_significant_risk', 'significant_risk', 'life_supporting']),
              ),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        change_control: Type.Optional(
          Type.Object(
            {
              pccp_authorized: Type.Optional(Type.Boolean()),
              modification_scope: Type.Optional(Type.Array(Type.String())),
              validation_protocol: Type.Optional(Type.String({ format: 'uri' })),
              rollback_plan: Type.Optional(Type.Boolean()),
              monitoring_frequency: Type.Optional(Type.String()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        bias_monitoring: Type.Optional(
          Type.Object(
            {
              enabled: Type.Optional(Type.Boolean()),
              protected_classes: Type.Optional(Type.Array(Type.String())),
              assessment_frequency: Type.Optional(Type.String()),
              last_assessment: Type.Optional(Type.String({ format: 'date-time' })),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        human_in_the_loop: Type.Optional(
          Type.Object(
            {
              level: Type.Optional(StringEnum(['advisory', 'approval_required', 'continuous_oversight'])),
              role: Type.Optional(Type.String()),
              escalation_path: Type.Optional(Type.String()),
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
  interoperability: Type.Optional(
    Type.Object(
      {
        fhir_version: Type.Optional(StringEnum(['DSTU2', 'STU3', 'R4', 'R4B', 'R5'])),
        terminology_bindings: Type.Optional(Type.Array(Type.String())),
        tefca_participant: Type.Optional(Type.Boolean()),
        information_blocking: Type.Optional(
          Type.Object(
            {
              compliant: Type.Optional(Type.Boolean()),
              exceptions_claimed: Type.Optional(Type.Array(Type.String())),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        dsi_transparency: Type.Optional(
          Type.Object(
            {
              predictive_dsi: Type.Optional(Type.Boolean()),
              source_attributes_published: Type.Optional(Type.Boolean()),
              irm_practices: Type.Optional(Type.Boolean()),
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
});

export const schema = assembleProfile({
  slug: 'healthcare',
  version: '1.0',
  title: 'ADL Healthcare Profile',
  description:
    'JSON Schema for ADL documents declaring the healthcare profile (urn:adl:profile:healthcare:1.0). Extends the base ADL schema via allOf composition.',
  root,
  allOfExtra: [
    {
      comment: 'HC-11: substance use disorder records (42 CFR Part 2) require consent management.',
      if: {
        properties: {
          data_classification: {
            properties: {
              healthcare: {
                properties: { phi_types: { contains: { const: 'substance_use' } } },
                required: ['phi_types'],
              },
            },
            required: ['healthcare'],
          },
        },
        required: ['data_classification'],
      },
      then: {
        properties: { phi_handling: { required: ['consent_management'] } },
        required: ['phi_handling'],
      },
    },
    {
      comment: 'HC-14: an FDA device class beyond exempt/non_device requires a documented change control plan.',
      if: {
        required: ['clinical_safety'],
        properties: {
          clinical_safety: {
            required: ['fda_classification'],
            properties: {
              fda_classification: {
                required: ['device_class'],
                properties: { device_class: { enum: ['class_I', 'class_II', 'class_III'] } },
              },
            },
          },
        },
      },
      then: {
        properties: { clinical_safety: { required: ['change_control'] } },
      },
    },
    {
      comment: 'HC-15: a predictive DSI must publish source attributes and document IRM practices (ONC HTI-1).',
      if: {
        required: ['interoperability'],
        properties: {
          interoperability: {
            required: ['dsi_transparency'],
            properties: {
              dsi_transparency: {
                required: ['predictive_dsi'],
                properties: { predictive_dsi: { const: true } },
              },
            },
          },
        },
      },
      then: {
        properties: {
          interoperability: {
            properties: {
              dsi_transparency: {
                required: ['source_attributes_published', 'irm_practices'],
                properties: {
                  source_attributes_published: { const: true },
                  irm_practices: { const: true },
                },
              },
            },
          },
        },
      },
    },
  ],
});
