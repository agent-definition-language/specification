import { Type } from '@sinclair/typebox';
import { Ref, Raw, StringEnum, assembleProfile } from '../../_kit/profile-kit.ts';

const root = Type.Object({
  profiles: Type.Optional(Raw({ type: 'array', contains: { const: 'urn:adl:profile:financial:1.0' } })),
  data_classification: Type.Optional(
    Type.Object({
      categories: Type.Optional(Raw({ contains: { const: 'financial' } })),
      financial: Type.Object(
        {
          data_types: Type.Array(
            StringEnum([
              'cardholder_data',
              'sensitive_auth_data',
              'nonpublic_personal_info',
              'transaction_data',
              'market_data',
              'financial_reports',
              'material_nonpublic_info',
            ]),
            { minItems: 1 },
          ),
          pci_applicable: Type.Optional(Type.Boolean()),
          extensions: Type.Optional(Ref('extensions')),
        },
        { additionalProperties: false },
      ),
    }),
  ),
  financial_data_handling: Type.Object(
    {
      pci_scope: Type.Optional(
        Type.Object(
          {
            in_scope: Type.Boolean(),
            saq_type: Type.Optional(Type.String()),
            tokenization_required: Type.Optional(Type.Boolean()),
            extensions: Type.Optional(Ref('extensions')),
          },
          { additionalProperties: false },
        ),
      ),
      data_residency: Type.Optional(
        Type.Array(
          Type.Object(
            {
              jurisdiction: Type.String({ minLength: 1 }),
              regulation: Type.Optional(Type.String()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
      ),
      extensions: Type.Optional(Ref('extensions')),
    },
    { additionalProperties: false },
  ),
  transaction_controls: Type.Optional(
    Type.Object(
      {
        transaction_limits: Type.Optional(
          Type.Object(
            {
              max_single_amount: Type.Optional(Type.Number()),
              max_daily_volume: Type.Optional(Type.Number()),
              currency: Type.Optional(Type.String()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        pre_execution_controls: Type.Optional(
          Type.Object(
            {
              enabled: Type.Optional(Type.Boolean()),
              price_tolerance_pct: Type.Optional(Type.Number({ exclusiveMinimum: 0, maximum: 100 })),
              throttle_per_second: Type.Optional(Type.Number({ minimum: 0 })),
              requires_approval_above: Type.Optional(Type.Number()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        kill_switch: Type.Optional(
          Type.Object(
            {
              enabled: Type.Optional(Type.Boolean()),
              trigger_conditions: Type.Optional(Type.Array(Type.String())),
              notification_targets: Type.Optional(Type.Array(Type.String())),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        segregation_of_duties: Type.Optional(
          Type.Object(
            {
              enabled: Type.Optional(Type.Boolean()),
              restricted_actions: Type.Optional(Type.Array(Type.String())),
              approval_role: Type.Optional(Type.String()),
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
  regulatory_scope: Type.Optional(
    Type.Object(
      {
        applicable_regulations: Type.Array(
          StringEnum([
            'PCI_DSS_V4',
            'SOX',
            'GLBA',
            'BASEL_III',
            'FINRA',
            'SEC_REG',
            'DORA',
            'MIFID_II',
            'BSA_AML',
            'EU_AMLD',
          ]),
          { minItems: 1 },
        ),
        jurisdictions: Type.Optional(
          Type.Array(
            Type.Object(
              {
                jurisdiction: Type.String({ minLength: 1 }),
                regulation: Type.Optional(Type.String()),
                extensions: Type.Optional(Ref('extensions')),
              },
              { additionalProperties: false },
            ),
          ),
        ),
        reporting_obligations: Type.Optional(
          Type.Object(
            {
              authorities: Type.Optional(Type.Array(Type.String())),
              frequency: Type.Optional(StringEnum(['real_time', 'daily', 'monthly', 'quarterly', 'annual'])),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        record_retention: Type.Optional(
          Type.Object(
            {
              min_retention_days: Type.Optional(Type.Number({ minimum: 0 })),
              tamper_proof: Type.Optional(Type.Boolean()),
              format: Type.Optional(Type.String()),
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
  financial_risk_management: Type.Optional(
    Type.Object(
      {
        model_risk: Type.Optional(
          Type.Object(
            {
              tier: Type.Optional(StringEnum(['tier_1', 'tier_2', 'tier_3'])),
              validated_by: Type.Optional(Type.String()),
              validated_at: Type.Optional(Type.String({ format: 'date-time' })),
              methodology: Type.Optional(Type.String()),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        aml_controls: Type.Optional(
          Type.Object(
            {
              screening_required: Type.Optional(Type.Boolean()),
              monitoring_level: Type.Optional(StringEnum(['real_time', 'daily', 'periodic'])),
              kyc_refresh_days: Type.Optional(Type.Number({ minimum: 0 })),
              extensions: Type.Optional(Ref('extensions')),
            },
            { additionalProperties: false },
          ),
        ),
        operational_risk: Type.Optional(
          Type.Object(
            {
              category: Type.Optional(StringEnum(['low', 'medium', 'high', 'critical'])),
              assessed_by: Type.Optional(Type.String()),
              assessed_at: Type.Optional(Type.String({ format: 'date-time' })),
              capital_reserve: Type.Optional(Type.Boolean()),
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
  slug: 'financial',
  version: '1.0',
  title: 'ADL Financial Profile',
  description:
    'JSON Schema for ADL documents declaring the financial profile (urn:adl:profile:financial:1.0). Extends the base ADL schema via allOf composition.',
  root,
  allOfExtra: [
    {
      comment:
        'FIN-03: when the agent operates in the cardholder data environment, financial data types MUST include cardholder_data.',
      if: {
        required: ['financial_data_handling'],
        properties: {
          financial_data_handling: {
            required: ['pci_scope'],
            properties: {
              pci_scope: { required: ['in_scope'], properties: { in_scope: { const: true } } },
            },
          },
        },
      },
      then: {
        properties: {
          data_classification: {
            properties: {
              financial: {
                properties: { data_types: { contains: { const: 'cardholder_data' } } },
              },
            },
          },
        },
      },
    },
    {
      comment: 'FIN-11: MiFID II record-keeping requires at least five years (1825 days) of retention.',
      if: {
        required: ['regulatory_scope'],
        properties: {
          regulatory_scope: {
            required: ['applicable_regulations'],
            properties: { applicable_regulations: { contains: { const: 'MIFID_II' } } },
          },
        },
      },
      then: {
        properties: {
          regulatory_scope: {
            required: ['record_retention'],
            properties: {
              record_retention: {
                required: ['min_retention_days'],
                properties: { min_retention_days: { type: 'number', minimum: 1825 } },
              },
            },
          },
        },
      },
    },
    {
      comment: 'FIN-12: when MiFID II applies and transaction controls are present, the kill switch MUST be enabled.',
      if: {
        required: ['regulatory_scope', 'transaction_controls'],
        properties: {
          regulatory_scope: {
            required: ['applicable_regulations'],
            properties: { applicable_regulations: { contains: { const: 'MIFID_II' } } },
          },
        },
      },
      then: {
        properties: {
          transaction_controls: {
            required: ['kill_switch'],
            properties: {
              kill_switch: { required: ['enabled'], properties: { enabled: { const: true } } },
            },
          },
        },
      },
    },
  ],
});
