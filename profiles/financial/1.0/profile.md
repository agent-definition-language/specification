# Financial Profile Specification

**Identifier:** `urn:adl:profile:financial:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

> **Regulatory Disclaimer:** This profile is provided as a technical specification in DRAFT status and does not constitute legal, regulatory, or compliance advice. It has not been reviewed or endorsed by the PCI Security Standards Council, the SEC, FINRA, the FTC, or any regulatory body. Organizations **MUST NOT** rely on this profile as their sole basis for regulatory compliance. Compliance with PCI-DSS, SOX, GLBA, or any other financial regulatory framework requires qualified professional assessment specific to your organization's circumstances. This profile does not substitute for a PCI-DSS assessment by a Qualified Security Assessor (QSA) or a SOX audit by a registered public accounting firm.

## 1. Introduction

The Financial Profile extends ADL for financial services environments. It adds members for financial data classification and handling, transaction controls, regulatory scope declarations, and financial risk management. This profile addresses requirements from PCI-DSS v4.0, SOX, GLBA, Basel III/IV, FINRA, SEC regulations, DORA, MiFID II, and AML/KYC frameworks.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

This profile is designed to compose with the Governance Profile. Organizations **SHOULD** declare both profiles for full enterprise financial compliance coverage.

---

## 2. Additional Members

### 2.1 financial_data_handling

**REQUIRED** when using this profile.

An object containing financial data handling configuration.

| Member              | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| pci_scope           | object | OPTIONAL | PCI-DSS scope declaration |
| data_residency      | array  | OPTIONAL | Jurisdictional data residency requirements |

> **Note:** Financial data types have moved to the composable `data_classification.financial` member (Section 2.5). This enables consistent data classification across profiles and reuse within tools and resources.

#### pci_scope

When present, **MUST** be an object containing:

| Member                 | Type   | Required | Description |
|------------------------|--------|----------|-------------|
| in_scope               | bool   | REQUIRED | Whether agent operates in the cardholder data environment |
| saq_type               | string | OPTIONAL | Self-Assessment Questionnaire type |
| tokenization_required  | bool   | OPTIONAL | Whether tokenization is required for data access |

#### data_residency

When present, **MUST** be an array of objects containing:

| Member      | Type   | Required | Description |
|-------------|--------|----------|-------------|
| jurisdiction | string | REQUIRED | ISO 3166-1 country code or region (e.g., `US`, `EU`) |
| regulation  | string | OPTIONAL | Governing regulation (e.g., `GLBA`, `DORA`, `GDPR`) |

---

### 2.2 transaction_controls

**OPTIONAL.** An object containing controls for agents that execute or influence financial transactions.

| Member                 | Type   | Required | Description |
|------------------------|--------|----------|-------------|
| transaction_limits     | object | OPTIONAL | Operational boundaries |
| pre_execution_controls | object | OPTIONAL | Pre-trade/pre-transaction safeguards |
| kill_switch            | object | OPTIONAL | Emergency stop configuration |
| segregation_of_duties  | object | OPTIONAL | SOX/PCI duty separation requirements |

#### transaction_limits

When present, **MAY** contain:

| Member            | Type   | Description |
|-------------------|--------|-------------|
| max_single_amount | number | Maximum single transaction value |
| max_daily_volume  | number | Maximum daily aggregate volume |
| currency          | string | ISO 4217 currency code |

#### pre_execution_controls

When present, **MAY** contain:

| Member                  | Type   | Description |
|-------------------------|--------|-------------|
| enabled                 | bool   | Whether pre-execution checks are active |
| price_tolerance_pct     | number | Maximum price deviation percentage |
| throttle_per_second     | number | Maximum executions per second |
| requires_approval_above | number | Amount threshold requiring human approval |

#### kill_switch

When present, **MAY** contain:

| Member              | Type   | Description |
|---------------------|--------|-------------|
| enabled             | bool   | Whether kill switch is configured |
| trigger_conditions  | array  | Conditions that trigger automatic halt |
| notification_targets | array | Contacts notified on trigger |

#### segregation_of_duties

When present, **MAY** contain:

| Member            | Type   | Description |
|-------------------|--------|-------------|
| enabled           | bool   | Whether segregation is enforced |
| restricted_actions | array | Actions that require separate authorization |
| approval_role     | string | Role that provides secondary authorization |

---

### 2.3 regulatory_scope

**OPTIONAL.** An object declaring which financial regulations apply to this agent.

| Member                  | Type   | Required | Description |
|-------------------------|--------|----------|-------------|
| applicable_regulations  | array  | REQUIRED (within member) | Financial regulations that apply |
| jurisdictions           | array  | OPTIONAL | Regulatory jurisdictions |
| reporting_obligations   | object | OPTIONAL | Regulatory reporting requirements |
| record_retention        | object | OPTIONAL | Record keeping requirements |

#### applicable_regulations

**MUST** be a non-empty array. Each item **MUST** be one of:

- `PCI_DSS_V4` — Payment Card Industry Data Security Standard v4.0
- `SOX` — Sarbanes-Oxley Act
- `GLBA` — Gramm-Leach-Bliley Act
- `BASEL_III` — Basel III Capital Framework
- `FINRA` — Financial Industry Regulatory Authority rules
- `SEC_REG` — SEC regulations
- `DORA` — EU Digital Operational Resilience Act
- `MIFID_II` — Markets in Financial Instruments Directive II
- `BSA_AML` — Bank Secrecy Act / Anti-Money Laundering
- `EU_AMLD` — EU Anti-Money Laundering Directive

#### reporting_obligations

When present, **MAY** contain:

| Member     | Type   | Description |
|------------|--------|-------------|
| authorities | array | Regulatory authorities to report to |
| frequency  | string | Reporting frequency: `real_time`, `daily`, `monthly`, `quarterly`, `annual` |

#### record_retention

When present, **MAY** contain:

| Member             | Type   | Description |
|--------------------|--------|-------------|
| min_retention_days | number | Minimum record retention in days |
| tamper_proof       | bool   | Whether tamper-proof storage is required |
| format             | string | Required record format |

---

### 2.4 financial_risk_management

**OPTIONAL.** An object containing risk management controls for financial agents.

| Member           | Type   | Required | Description |
|------------------|--------|----------|-------------|
| model_risk       | object | OPTIONAL | Model risk management (SR 11-7 / FFIEC) |
| aml_controls     | object | OPTIONAL | Anti-money laundering controls |
| operational_risk | object | OPTIONAL | Operational risk classification |

#### model_risk

When present, **MAY** contain:

| Member       | Type   | Description |
|--------------|--------|-------------|
| tier         | string | Model risk tier: `tier_1`, `tier_2`, `tier_3` |
| validated_by | string | Validation entity |
| validated_at | string | ISO 8601 timestamp |
| methodology  | string | Validation methodology used |

#### aml_controls

When present, **MAY** contain:

| Member            | Type   | Description |
|-------------------|--------|-------------|
| screening_required | bool  | Whether AML screening is required |
| monitoring_level  | string | `real_time`, `daily`, `periodic` |
| kyc_refresh_days  | number | Maximum days between KYC refreshes |

#### operational_risk

When present, **MAY** contain:

| Member          | Type   | Description |
|-----------------|--------|-------------|
| category        | string | `low`, `medium`, `high`, `critical` |
| assessed_by     | string | Entity that performed the assessment |
| assessed_at     | string | ISO 8601 timestamp |
| capital_reserve | bool   | Whether operational risk capital is allocated |

---

### 2.5 data_classification Extension

This profile extends the core ADL `data_classification` member (Spec §10.4) with a `financial` sub-object for financial data type classification.

**REQUIRED** when using this profile. The `data_classification` member **MUST** be present with a `financial` sub-object. The `data_classification.categories` array **MUST** include `financial`.

#### financial

An object containing financial-specific data classification. When present, **MUST** contain:

| Member         | Type   | Required | Description |
|----------------|--------|----------|-------------|
| data_types     | array  | REQUIRED | Types of financial data handled |
| pci_applicable | bool   | OPTIONAL | Whether PCI-DSS scope applies to this classification |

#### data_types

**MUST** be a non-empty array. Each item **MUST** be one of:

- `cardholder_data` — Primary Account Number, cardholder name, expiration date, service code
- `sensitive_auth_data` — Full track data, CAV2/CVC2/CVV2/CID, PINs (must NEVER be stored post-authorization)
- `nonpublic_personal_info` — NPI under GLBA: SSNs, account numbers, income, credit history
- `transaction_data` — Transaction records, trade data, order flow
- `market_data` — Market prices, indices, reference data
- `financial_reports` — Financial statements, regulatory filings, audit reports
- `material_nonpublic_info` — MNPI under SEC insider trading regulations

Example:

```json
{
  "data_classification": {
    "sensitivity": "confidential",
    "categories": ["pii", "financial"],
    "retention": {
      "min_days": 1825
    },
    "handling": {
      "encryption_required": true,
      "logging_required": true
    },
    "financial": {
      "data_types": ["transaction_data", "nonpublic_personal_info"],
      "pci_applicable": false
    }
  }
}
```

---

## 3. Compliance Mapping

| ADL / Profile Section                      | Regulatory Controls |
|--------------------------------------------|--------------------|
| data_classification.financial.data_types   | PCI-DSS Req 3, 4; GLBA Safeguards Rule; NIST 800-53 SC-16 |
| financial_data_handling.pci_scope           | PCI-DSS Req 1, 2 (CDE scoping); NIST 800-53 SC-7 |
| transaction_controls.transaction_limits    | MiFID II Art. 17; FINRA Rule 3110 |
| transaction_controls.kill_switch           | MiFID II Art. 17(1); ESMA Guidelines |
| transaction_controls.segregation_of_duties | SOX §302, §404; NIST 800-53 AC-5 |
| regulatory_scope.record_retention          | PCI-DSS Req 10.7; MiFID II Art. 25; SOX §802 |
| financial_risk_management.model_risk       | SR 11-7; FFIEC IT Examination; Basel III Pillar 2 |
| financial_risk_management.aml_controls     | BSA §5318; EU 6AMLD; FINRA Rule 3310 |
| security.authentication                    | PCI-DSS Req 8; NIST 800-53 IA-2, IA-5 |
| security.encryption                        | PCI-DSS Req 3.5, 4.1; NIST 800-53 SC-8, SC-13 |
| governance.audit_trail                     | PCI-DSS Req 10; SOX §404; NIST 800-53 AU-2, AU-6 |

---

## 4. Example

```json
{
  "adl_spec": "0.1.0",
  "name": "Trade Compliance Monitor",
  "description": "Monitors trading activity for regulatory compliance and suspicious patterns.",
  "version": "1.0.0",
  "profiles": [
    "urn:adl:profile:governance:1.0",
    "urn:adl:profile:financial:1.0"
  ],
  "lifecycle": {
    "status": "active",
    "effective_date": "2026-01-01T00:00:00Z"
  },
  "provider": {
    "name": "FinSecure Inc",
    "url": "https://finsecure.example",
    "contact": "compliance@finsecure.example"
  },
  "model": {
    "capabilities": ["function_calling"]
  },
  "tools": [
    {
      "name": "scan_transactions",
      "description": "Scan recent transactions for compliance violations and suspicious patterns",
      "parameters": {
        "type": "object",
        "properties": {
          "account_id": { "type": "string" },
          "lookback_days": { "type": "integer", "default": 30 }
        },
        "required": ["account_id"]
      },
      "read_only": true
    },
    {
      "name": "file_sar",
      "description": "File a Suspicious Activity Report with FinCEN",
      "parameters": {
        "type": "object",
        "properties": {
          "transaction_ids": { "type": "array", "items": { "type": "string" } },
          "narrative": { "type": "string" },
          "priority": { "type": "string", "enum": ["routine", "expedited"] }
        },
        "required": ["transaction_ids", "narrative"]
      },
      "requires_confirmation": true
    }
  ],
  "permissions": {
    "network": {
      "allowed_hosts": ["api.finsecure.example", "fincen.gov"],
      "allowed_protocols": ["https"],
      "deny_private": true
    },
    "filesystem": {
      "allowed_paths": [
        { "path": "/data/transactions/**", "access": "read" },
        { "path": "/data/reports/**", "access": "read_write" }
      ]
    }
  },
  "security": {
    "authentication": {
      "type": "mtls",
      "required": true
    },
    "encryption": {
      "in_transit": { "required": true, "min_version": "1.3" },
      "at_rest": { "required": true, "algorithm": "AES-256-GCM" }
    }
  },
  "data_classification": {
    "sensitivity": "confidential",
    "categories": ["pii", "financial"],
    "retention": {
      "min_days": 1825
    },
    "handling": {
      "encryption_required": true,
      "logging_required": true
    },
    "financial": {
      "data_types": ["transaction_data", "nonpublic_personal_info"],
      "pci_applicable": false
    }
  },
  "financial_data_handling": {
    "pci_scope": {
      "in_scope": false
    },
    "data_residency": [
      { "jurisdiction": "US", "regulation": "GLBA" }
    ]
  },
  "transaction_controls": {
    "kill_switch": {
      "enabled": true,
      "trigger_conditions": ["error_rate_threshold", "anomaly_detection"],
      "notification_targets": ["compliance-team@finsecure.example"]
    },
    "segregation_of_duties": {
      "enabled": true,
      "restricted_actions": ["file_sar"],
      "approval_role": "Compliance Officer"
    }
  },
  "regulatory_scope": {
    "applicable_regulations": ["GLBA", "BSA_AML", "FINRA", "SEC_REG"],
    "jurisdictions": [
      { "jurisdiction": "US", "regulation": "BSA_AML" }
    ],
    "record_retention": {
      "min_retention_days": 1825,
      "tamper_proof": true
    }
  },
  "financial_risk_management": {
    "model_risk": {
      "tier": "tier_2",
      "validated_by": "Model Risk Committee",
      "validated_at": "2025-12-15T00:00:00Z",
      "methodology": "Champion-challenger with backtesting"
    },
    "aml_controls": {
      "screening_required": true,
      "monitoring_level": "real_time",
      "kyc_refresh_days": 365
    }
  },
  "compliance_framework": {
    "primary_framework": "NIST_800_53",
    "control_mappings": [
      { "framework": "NIST", "control_id": "AU-2", "status": "implemented" },
      { "framework": "NIST", "control_id": "AC-5", "status": "implemented" },
      { "framework": "NIST", "control_id": "SC-13", "status": "implemented" }
    ]
  },
  "metadata": {
    "authors": [
      { "name": "FinSecure Compliance Team", "email": "compliance@finsecure.example" }
    ],
    "license": "Proprietary",
    "tags": ["financial", "compliance", "aml", "trading"]
  }
}
```

---

## 5. Validation Rules

Implementations validating against this profile **MUST** enforce:

| Rule   | Description |
|--------|-------------|
| FIN-01 | `financial_data_handling` MUST be present |
| FIN-02 | `data_classification.financial.data_types` MUST be a non-empty array of valid data types |
| FIN-03 | If `pci_scope.in_scope` is true, `data_classification.financial.data_types` MUST include `cardholder_data` |
| FIN-04 | `transaction_controls.transaction_limits.currency` MUST be valid ISO 4217 if present |
| FIN-05 | `transaction_controls.pre_execution_controls.price_tolerance_pct` MUST be > 0 and <= 100 if present |
| FIN-06 | `regulatory_scope.applicable_regulations` MUST contain valid regulation identifiers if present |
| FIN-07 | `data_residency[*].jurisdiction` MUST be valid ISO 3166-1 code if present |
| FIN-08 | All timestamps MUST be valid ISO 8601 |
| FIN-09 | `financial_risk_management.model_risk.tier` MUST be a valid tier if present |
| FIN-10 | `financial_risk_management.aml_controls.monitoring_level` MUST be a valid level if present |
| FIN-11 | `record_retention.min_retention_days` MUST be >= 1825 (5 years) when `MIFID_II` is in `applicable_regulations` |
| FIN-12 | `kill_switch.enabled` MUST be true when `MIFID_II` is in `applicable_regulations` and `transaction_controls` is present |
| FIN-13 | `data_classification` MUST be present with a `financial` sub-object |
| FIN-14 | `data_classification.categories` MUST include `financial` |
