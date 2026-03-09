---
id: specification
title: "Specification"
sidebar_position: 2
slug: ../specification
description: "Full specification for the ADL Healthcare Profile including HIPAA compliance, PHI handling, clinical safety, and FHIR interoperability."
keywords: [adl, healthcare specification, hipaa, phi, fhir, clinical ai, agentic ai, healthcare ai compliance, medical ai, ai safety]
adl_profile_meta:
  example_filename: "clinical-research-agent.adl.json"
---

# Healthcare Profile Specification

**Identifier:** `urn:adl:profile:healthcare:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

> **Regulatory Disclaimer:** This profile is provided as a technical specification in DRAFT status and does not constitute legal, regulatory, or compliance advice. It has not been reviewed or endorsed by HHS, OCR, the FDA, or any regulatory body. Organizations **MUST NOT** rely on this profile as their sole basis for regulatory compliance. Compliance with HIPAA, HITECH, FDA regulations, or any other healthcare regulatory framework requires qualified professional assessment specific to your organization's circumstances. This profile does not substitute for a HIPAA risk assessment as required by 45 CFR §164.308(a)(1).

## 1. Introduction

The Healthcare Profile extends ADL for healthcare environments. It adds members for HIPAA compliance, Protected Health Information (PHI) handling, clinical safety controls, and health data interoperability. This profile addresses requirements from HIPAA (Privacy, Security, and Breach Notification Rules), HITECH, FDA AI/ML guidance, HL7 FHIR, ONC Health IT certification, and the 21st Century Cures Act.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

This profile is designed to compose with the Governance Profile. Organizations **SHOULD** declare both profiles for full enterprise healthcare compliance coverage.

---

## 2. Additional Members

### 2.1 hipaa_compliance

**REQUIRED** when using this profile.

An object containing HIPAA regulatory compliance configuration.

| Member            | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| covered_entity_type | string | REQUIRED | Entity classification under HIPAA |
| baa_required      | bool   | REQUIRED | Whether a Business Associate Agreement is required |
| minimum_necessary | object | REQUIRED | Minimum necessary access configuration |
| security_rule     | object | OPTIONAL | Security Rule compliance settings |

> **Note:** PHI categories have moved to the composable `data_classification.healthcare` member (Section 2.5). This enables consistent data classification across profiles and reuse within tools and resources.

#### covered_entity_type

**MUST** be one of:

- `covered_entity` — Health plan, healthcare clearinghouse, or healthcare provider
- `business_associate` — Entity performing functions involving PHI on behalf of a covered entity
- `subcontractor` — Business associate of a business associate

#### minimum_necessary

**MUST** be an object containing:

| Member            | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| scope             | string | REQUIRED | Access scope level |
| justification     | string | OPTIONAL | Reason for access level |
| review_frequency  | string | OPTIONAL | How often access scope is reviewed |

`scope` **MUST** be one of: `task_specific`, `role_based`, `full_record`.

#### security_rule

When present, **MAY** contain:

| Member               | Type   | Description |
|----------------------|--------|-------------|
| encryption_at_rest   | string | Required algorithm: `AES_256`, `AES_128` |
| encryption_in_transit | string | Required protocol: `TLS_1_2`, `TLS_1_3` |
| mfa_required         | bool   | Whether multi-factor authentication is required |
| data_retention       | string | Retention policy: `none`, `minimum`, `standard` |
| restoration_hours    | number | Maximum hours to restore critical systems |

---

### 2.2 phi_handling

**REQUIRED** when using this profile.

An object containing PHI data handling and de-identification controls.

| Member              | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| de_identification   | object | REQUIRED | De-identification method and configuration |
| breach_notification | object | REQUIRED | Breach notification configuration |
| consent_management  | object | OPTIONAL | Patient consent tracking |
| data_provenance     | object | OPTIONAL | Data lineage tracking |

#### de_identification

**MUST** be an object containing:

| Member                    | Type   | Required | Description |
|---------------------------|--------|----------|-------------|
| method                    | string | REQUIRED | De-identification method |
| re_identification_controls | bool  | OPTIONAL | Whether re-identification prevention is active |

`method` **MUST** be one of: `safe_harbor`, `expert_determination`, `none`.

#### breach_notification

**MUST** be an object containing:

| Member              | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| notification_hours  | number | REQUIRED | Maximum hours to notify authorities |
| contact             | string | REQUIRED | Breach notification contact |
| threshold           | number | OPTIONAL | Number of affected individuals triggering escalated notification |

#### consent_management

When present, **MAY** contain:

| Member               | Type   | Description |
|----------------------|--------|-------------|
| required             | bool   | Whether explicit consent is required |
| consent_types        | array  | Types: `treatment`, `payment`, `operations`, `research`, `marketing` |
| granularity          | string | Consent granularity: `broad`, `purpose_specific`, `data_specific` |
| revocation_supported | bool   | Whether consent revocation is supported |

#### data_provenance

When present, **MAY** contain:

| Member        | Type   | Description |
|---------------|--------|-------------|
| tracking      | bool   | Whether data lineage tracking is enabled |
| source_systems | array | List of source system identifiers |

---

### 2.3 clinical_safety

**OPTIONAL.** An object containing clinical safety controls for agents involved in clinical decision support or patient-facing interactions.

| Member              | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| fda_classification  | object | OPTIONAL | FDA device/software classification |
| change_control      | object | OPTIONAL | Model change management (PCCP-aligned) |
| bias_monitoring     | object | OPTIONAL | Bias detection and mitigation |
| human_in_the_loop   | object | OPTIONAL | Clinical decision oversight |

#### fda_classification

When present, **MAY** contain:

| Member           | Type   | Description |
|------------------|--------|-------------|
| device_class     | string | `exempt`, `class_I`, `class_II`, `class_III`, `non_device` |
| clearance_type   | string | `510k`, `de_novo`, `pma`, `not_applicable` |
| clearance_number | string | FDA clearance/approval number |
| software_level   | string | `non_significant_risk`, `significant_risk`, `life_supporting` |

#### change_control

Aligned with FDA Predetermined Change Control Plan (PCCP) guidance. When present, **MAY** contain:

| Member               | Type   | Description |
|----------------------|--------|-------------|
| pccp_authorized      | bool   | Whether a PCCP has been FDA-authorized |
| modification_scope   | array  | Authorized modification types |
| validation_protocol  | string | URI to validation protocol |
| rollback_plan        | bool   | Whether rollback capability exists |
| monitoring_frequency | string | Real-world performance monitoring frequency |

#### bias_monitoring

When present, **MAY** contain:

| Member               | Type   | Description |
|----------------------|--------|-------------|
| enabled              | bool   | Whether bias monitoring is active |
| protected_classes    | array  | Demographics monitored for bias |
| assessment_frequency | string | How often bias is assessed |
| last_assessment      | string | ISO 8601 timestamp |

#### human_in_the_loop

When present, **MAY** contain:

| Member          | Type   | Description |
|-----------------|--------|-------------|
| level           | string | `advisory`, `approval_required`, `continuous_oversight` |
| role            | string | Clinical role responsible (e.g., "Physician", "Nurse Practitioner") |
| escalation_path | string | Escalation contact or procedure |

---

### 2.4 interoperability

**OPTIONAL.** An object containing health data interoperability standards compliance.

| Member               | Type   | Required | Description |
|----------------------|--------|----------|-------------|
| fhir_version         | string | OPTIONAL | Supported FHIR version |
| terminology_bindings | array  | OPTIONAL | Supported code systems |
| tefca_participant    | bool   | OPTIONAL | Whether agent participates in TEFCA |
| information_blocking | object | OPTIONAL | 21st Century Cures Act compliance |
| dsi_transparency     | object | OPTIONAL | ONC Decision Support Intervention transparency |

#### fhir_version

When present, **MUST** be one of: `DSTU2`, `STU3`, `R4`, `R4B`, `R5`.

#### terminology_bindings

When present, **MUST** be an array of strings. Common values: `ICD-10`, `SNOMED-CT`, `LOINC`, `RxNorm`, `CPT`, `HCPCS`.

#### information_blocking

When present, **MAY** contain:

| Member              | Type   | Description |
|---------------------|--------|-------------|
| compliant           | bool   | Whether agent is information blocking compliant |
| exceptions_claimed  | array  | Any claimed exceptions per 45 CFR Part 171 |

#### dsi_transparency

When present, **MAY** contain:

| Member                      | Type   | Description |
|-----------------------------|--------|-------------|
| predictive_dsi              | bool   | Whether agent includes predictive DSI |
| source_attributes_published | bool   | Whether source attributes are disclosed |
| irm_practices               | bool   | Whether Intervention Risk Management practices are documented |

---

### 2.5 data_classification Extension

This profile extends the core ADL `data_classification` member (Spec §10.4) with a `healthcare` sub-object for PHI classification.

**REQUIRED** when using this profile. The `data_classification` member **MUST** be present with a `healthcare` sub-object. The `data_classification.categories` array **MUST** include `phi`.

#### healthcare

An object containing healthcare-specific data classification. When present, **MUST** contain:

| Member              | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| phi_types           | array  | REQUIRED | Categories of PHI the agent may access |
| hipaa_applicability | bool   | OPTIONAL | Whether HIPAA applies to this classification |

#### phi_types

**MUST** be a non-empty array. Each item **MUST** be one of:

- `demographics` — Patient demographic information
- `medical_records` — Clinical and medical record data
- `billing` — Billing and payment information
- `mental_health` — Mental and behavioral health records
- `substance_use` — Substance use disorder records (42 CFR Part 2)
- `genetic` — Genetic information (GINA)
- `reproductive` — Reproductive health information
- `hiv_status` — HIV/AIDS status information

Example:

```json
{
  "data_classification": {
    "sensitivity": "restricted",
    "categories": ["pii", "phi"],
    "retention": {
      "min_days": 2190,
      "policy_uri": "https://healthtech.example/retention-policy"
    },
    "handling": {
      "encryption_required": true,
      "logging_required": true
    },
    "healthcare": {
      "phi_types": ["demographics", "medical_records"],
      "hipaa_applicability": true
    }
  }
}
```

---

## 3. Compliance Mapping

| ADL / Profile Section              | Regulatory Controls |
|------------------------------------|--------------------|
| data_classification.healthcare.phi_types | HIPAA §164.514; NIST 800-53 SC-16 |
| hipaa_compliance.security_rule     | HIPAA §164.312; NIST 800-53 SC-8, SC-13, AC-3 |
| hipaa_compliance.minimum_necessary | HIPAA §164.502(b); NIST 800-53 AC-6 |
| phi_handling.de_identification     | HIPAA §164.514; NIST 800-53 SI-19 |
| phi_handling.consent_management    | HIPAA §164.508; 42 CFR Part 2 |
| phi_handling.breach_notification   | HIPAA §164.400-414; HITECH §13402 |
| clinical_safety.fda_classification | FDA 21 CFR 820; ISO 13485 |
| clinical_safety.change_control     | FDA PCCP Guidance; 21 CFR 820.30 |
| clinical_safety.bias_monitoring    | NIST AI RMF; ONC HTI-1 DSI requirements |
| interoperability.fhir_version      | HL7 FHIR; ONC Cures Act Final Rule |
| interoperability.information_blocking | 21st Century Cures Act §4004; 45 CFR Part 171 |
| interoperability.dsi_transparency  | ONC HTI-1 Final Rule §170.315(b)(11) |

---

## 4. Example

```json
{
  "adl_spec": "0.1.0",
  "name": "Clinical Research Assistant",
  "description": "Assists researchers with patient record analysis and clinical trial matching.",
  "version": "1.0.0",
  "profiles": [
    "urn:adl:profile:governance:1.0",
    "urn:adl:profile:healthcare:1.0"
  ],
  "lifecycle": {
    "status": "active",
    "effective_date": "2026-01-15T00:00:00Z"
  },
  "provider": {
    "name": "HealthTech Corp",
    "url": "https://healthtech.example",
    "contact": "compliance@healthtech.example"
  },
  "model": {
    "capabilities": ["function_calling"]
  },
  "tools": [
    {
      "name": "search_patient_records",
      "description": "Search de-identified patient records for clinical trial matching",
      "parameters": {
        "type": "object",
        "properties": {
          "criteria": { "type": "string" },
          "limit": { "type": "integer", "default": 20 }
        },
        "required": ["criteria"]
      },
      "read_only": true
    },
    {
      "name": "generate_cohort_report",
      "description": "Generate a cohort analysis report from matched records",
      "parameters": {
        "type": "object",
        "properties": {
          "cohort_id": { "type": "string" },
          "format": { "type": "string", "enum": ["pdf", "json"] }
        },
        "required": ["cohort_id"]
      }
    }
  ],
  "permissions": {
    "network": {
      "allowed_hosts": ["ehr.healthtech.example", "fhir.healthtech.example"],
      "allowed_protocols": ["https"],
      "deny_private": true
    },
    "filesystem": {
      "allowed_paths": [
        { "path": "/data/deidentified/**", "access": "read" },
        { "path": "/data/reports/**", "access": "read_write" }
      ]
    }
  },
  "security": {
    "authentication": {
      "type": "oauth2",
      "required": true,
      "scopes": ["patient:read", "report:write"]
    },
    "encryption": {
      "in_transit": { "required": true, "min_version": "1.2" },
      "at_rest": { "required": true, "algorithm": "AES-256-GCM" }
    }
  },
  "data_classification": {
    "sensitivity": "restricted",
    "categories": ["pii", "phi"],
    "retention": {
      "min_days": 2190
    },
    "handling": {
      "encryption_required": true,
      "logging_required": true
    },
    "healthcare": {
      "phi_types": ["demographics", "medical_records"],
      "hipaa_applicability": true
    }
  },
  "hipaa_compliance": {
    "covered_entity_type": "business_associate",
    "baa_required": true,
    "minimum_necessary": {
      "scope": "task_specific",
      "justification": "Access limited to de-identified records for clinical trial matching",
      "review_frequency": "quarterly"
    },
    "security_rule": {
      "encryption_at_rest": "AES_256",
      "encryption_in_transit": "TLS_1_2",
      "mfa_required": true,
      "data_retention": "none",
      "restoration_hours": 72
    }
  },
  "phi_handling": {
    "de_identification": {
      "method": "safe_harbor",
      "re_identification_controls": true
    },
    "breach_notification": {
      "notification_hours": 60,
      "contact": "privacy-officer@healthtech.example",
      "threshold": 500
    },
    "consent_management": {
      "required": true,
      "consent_types": ["research"],
      "granularity": "purpose_specific",
      "revocation_supported": true
    }
  },
  "clinical_safety": {
    "bias_monitoring": {
      "enabled": true,
      "protected_classes": ["race", "ethnicity", "sex", "age"],
      "assessment_frequency": "quarterly",
      "last_assessment": "2026-01-01T00:00:00Z"
    },
    "human_in_the_loop": {
      "level": "approval_required",
      "role": "Principal Investigator",
      "escalation_path": "IRB Committee"
    }
  },
  "interoperability": {
    "fhir_version": "R4",
    "terminology_bindings": ["ICD-10", "SNOMED-CT", "LOINC"],
    "information_blocking": {
      "compliant": true
    }
  },
  "compliance_framework": {
    "primary_framework": "HIPAA",
    "control_mappings": [
      { "framework": "HIPAA", "control_id": "§164.312(a)(1)", "status": "implemented" },
      { "framework": "HIPAA", "control_id": "§164.312(e)(1)", "status": "implemented" },
      { "framework": "NIST", "control_id": "AC-6", "status": "implemented" }
    ]
  },
  "metadata": {
    "authors": [
      { "name": "HealthTech Compliance Team", "email": "compliance@healthtech.example" }
    ],
    "license": "Proprietary",
    "tags": ["healthcare", "hipaa", "clinical-research", "fhir"]
  }
}
```

---

## 5. Validation Rules

Implementations validating against this profile **MUST** enforce:

| Rule  | Description |
|-------|-------------|
| HC-01 | `hipaa_compliance` MUST be present |
| HC-02 | `hipaa_compliance.covered_entity_type` MUST be a valid type |
| HC-03 | `data_classification.healthcare.phi_types` MUST be a non-empty array of valid types |
| HC-04 | `hipaa_compliance.baa_required` MUST be present |
| HC-05 | `hipaa_compliance.minimum_necessary` MUST be present with valid `scope` |
| HC-06 | `hipaa_compliance.security_rule.encryption_at_rest` MUST be `AES_256` or `AES_128` if present |
| HC-07 | `hipaa_compliance.security_rule.encryption_in_transit` MUST be `TLS_1_2` or `TLS_1_3` if present |
| HC-08 | `phi_handling` MUST be present |
| HC-09 | `phi_handling.de_identification.method` MUST be a valid method |
| HC-10 | `phi_handling.breach_notification` MUST be present with `notification_hours` and `contact` |
| HC-11 | If `data_classification.healthcare.phi_types` includes `substance_use`, `phi_handling.consent_management` MUST be present (42 CFR Part 2) |
| HC-12 | All timestamps MUST be valid ISO 8601 |
| HC-13 | `interoperability.fhir_version` MUST be a valid version if present |
| HC-14 | If `clinical_safety.fda_classification.device_class` is not `exempt` or `non_device`, `clinical_safety.change_control` MUST be present |
| HC-15 | If `interoperability.dsi_transparency.predictive_dsi` is true, `source_attributes_published` and `irm_practices` MUST be true |
| HC-16 | `data_classification` MUST be present with a `healthcare` sub-object |
| HC-17 | `data_classification.categories` MUST include `phi` |
