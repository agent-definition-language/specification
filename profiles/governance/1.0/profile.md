# Governance Profile Specification

**Identifier:** `urn:adl:profile:governance:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

## 1. Introduction

The Governance Profile extends ADL for regulated enterprise environments. It adds members for compliance frameworks, AI governance, operational governance, and registry metadata.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

---

## 2. Additional Members

### 2.1 compliance_framework

**REQUIRED** when using this profile.

An object containing compliance and regulatory framework information.

| Member            | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| primary_framework | string | REQUIRED | Primary compliance framework identifier |
| control_mappings  | array  | OPTIONAL | Control implementation details |
| audit_dates       | object | OPTIONAL | Last and next audit dates |

#### primary_framework

**MUST** be one of:

- `NIST_800_53` — NIST Special Publication 800-53
- `SOC2_TYPE_II` — SOC 2 Type II
- `ISO_27001` — ISO/IEC 27001 Information Security
- `ISO_42001` — ISO/IEC 42001 AI Management System
- `GDPR` — General Data Protection Regulation
- `HIPAA` — Health Insurance Portability and Accountability Act
- `PCI_DSS` — Payment Card Industry Data Security Standard
- `EU_AI_ACT` — EU Artificial Intelligence Act

#### control_mappings

When present, **MUST** be an array of control mapping objects:

| Member     | Type   | Required | Description |
|------------|--------|----------|-------------|
| framework  | string | REQUIRED | Framework identifier |
| control_id | string | REQUIRED | Control identifier (e.g., "CC6.1") |
| status     | string | REQUIRED | Implementation status |

`status` **MUST** be one of: `implemented`, `partial`, `planned`, `not_applicable`.

#### audit_dates

When present, **MUST** be an object containing:

| Member     | Type   | Required | Description |
|------------|--------|----------|-------------|
| last_audit | string | OPTIONAL | ISO 8601 timestamp of last audit |
| next_audit | string | OPTIONAL | ISO 8601 timestamp of next scheduled audit |

---

### 2.2 ai_governance

**OPTIONAL.** An object containing AI-specific governance requirements.

| Member              | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| risk_classification | object | OPTIONAL | AI risk level and assessment |
| safety_reviews      | object | OPTIONAL | Safety review requirements |
| human_oversight     | object | OPTIONAL | Human oversight configuration |

#### risk_classification

When present, **MAY** contain:

| Member      | Type   | Description |
|-------------|--------|-------------|
| level       | string | Risk level: `low`, `medium`, `high`, `critical` |
| assessed_by | string | Entity that performed the assessment |
| assessed_at | string | ISO 8601 timestamp |
| rationale   | string | Explanation of risk classification |

#### safety_reviews

When present, **MAY** contain:

| Member          | Type   | Description |
|-----------------|--------|-------------|
| required        | bool   | Whether safety review is required |
| frequency       | string | Review frequency (e.g., "quarterly") |
| last_review     | string | ISO 8601 timestamp |
| next_review     | string | ISO 8601 timestamp |
| review_board    | string | Reviewing entity |

#### human_oversight

When present, **MAY** contain:

| Member | Type   | Description |
|--------|--------|-------------|
| level  | string | Oversight level: `none`, `on_exception`, `periodic`, `continuous` |
| role   | string | Role responsible for oversight |

---

### 2.3 governance

**OPTIONAL.** An object containing operational governance information.

| Member             | Type   | Required | Description |
|--------------------|--------|----------|-------------|
| operational_status | object | OPTIONAL | Current operational status |
| ownership          | object | OPTIONAL | Owner and delegate information |
| approval_workflow  | object | OPTIONAL | Approval requirements |
| audit_trail        | object | OPTIONAL | Audit logging configuration |

#### operational_status

When present, **MAY** contain:

| Member           | Type   | Description |
|------------------|--------|-------------|
| status           | string | Status: `draft`, `active`, `deprecated`, `retired` |
| effective_date   | string | ISO 8601 timestamp when status became effective |
| deprecation_date | string | ISO 8601 timestamp (if deprecated) |

#### ownership

When present, **MAY** contain:

| Member   | Type   | Description |
|----------|--------|-------------|
| owner    | string | Primary owner (team or individual) |
| delegate | string | Delegate owner |
| contact  | string | Contact email |

#### approval_workflow

When present, **MAY** contain:

| Member         | Type  | Description |
|----------------|-------|-------------|
| required       | bool  | Whether approval is required for changes |
| approvers      | array | List of required approvers |
| approval_type  | string | Type: `any`, `all`, `quorum` |

#### audit_trail

When present, **MAY** contain:

| Member         | Type   | Description |
|----------------|--------|-------------|
| enabled        | bool   | Whether audit logging is enabled |
| retention_days | number | Log retention period in days |
| destination    | string | Audit log destination URI |

---

### 2.4 registry_metadata

**OPTIONAL.** An object containing registry information for enterprise agent catalogs.

| Member         | Type   | Required | Description |
|----------------|--------|----------|-------------|
| urn            | string | OPTIONAL | Unique registry identifier |
| taxonomy       | object | OPTIONAL | Classification hierarchy |
| discovery_tags | array  | OPTIONAL | Search/discovery tags |
| federation     | object | OPTIONAL | Multi-registry configuration |

#### taxonomy

When present, **MAY** contain:

| Member      | Type   | Description |
|-------------|--------|-------------|
| domain      | string | Business domain |
| subdomain   | string | Subdomain within domain |
| capability  | string | Capability category |

#### federation

When present, **MAY** contain:

| Member     | Type  | Description |
|------------|-------|-------------|
| registries | array | List of registry URIs where agent is published |
| primary    | string | Primary registry URI |

---

## 3. Compliance Mapping

The Governance Profile provides mappings between ADL/profile sections and common compliance framework controls.

| ADL / Profile Section      | Framework Controls |
|----------------------------|--------------------|
| permissions.network        | NIST AC-4, SC-7; SOC2 CC6.6 |
| permissions.filesystem     | NIST AC-3, AC-6; SOC2 CC6.1 |
| security.authentication    | NIST IA-2, IA-5; SOC2 CC6.1 |
| security.encryption        | NIST SC-8, SC-13; SOC2 CC6.1 |
| ai_governance              | ISO 42001 6.1, 9.1; EU AI Act Art. 9 |
| governance.audit_trail     | NIST AU-2, AU-6; SOC2 CC7.2 |

---

## 4. Example

```json
{
  "adl": "0.1.0",
  "name": "Compliance Review Agent",
  "description": "Reviews documents for regulatory compliance.",
  "version": "1.0.0",
  "profiles": ["urn:adl:profile:governance:1.0"],
  "compliance_framework": {
    "primary_framework": "SOC2_TYPE_II",
    "control_mappings": [
      {
        "framework": "SOC2",
        "control_id": "CC6.1",
        "status": "implemented"
      }
    ],
    "audit_dates": {
      "last_audit": "2025-11-15T00:00:00Z",
      "next_audit": "2026-11-15T00:00:00Z"
    }
  },
  "ai_governance": {
    "risk_classification": {
      "level": "medium",
      "assessed_by": "AI Ethics Committee",
      "assessed_at": "2025-10-01T00:00:00Z"
    },
    "human_oversight": {
      "level": "on_exception",
      "role": "Compliance Officer"
    }
  },
  "governance": {
    "operational_status": {
      "status": "active",
      "effective_date": "2025-12-01T00:00:00Z"
    },
    "ownership": {
      "owner": "Compliance Team",
      "contact": "compliance@example.com"
    },
    "audit_trail": {
      "enabled": true,
      "retention_days": 730
    }
  },
  "registry_metadata": {
    "urn": "urn:example:agents:compliance-review:1.0.0",
    "taxonomy": {
      "domain": "compliance",
      "capability": "document-review"
    },
    "discovery_tags": ["compliance", "soc2", "audit"]
  }
}
```

---

## 5. Validation Rules

Implementations validating against this profile **MUST** enforce:

| Rule | Description |
|------|-------------|
| GOV-01 | `compliance_framework` MUST be present |
| GOV-02 | `compliance_framework.primary_framework` MUST be a valid framework identifier |
| GOV-03 | `control_mappings[*].status` MUST be a valid status value |
| GOV-04 | All timestamps MUST be valid ISO 8601 |
| GOV-05 | `ai_governance.risk_classification.level` MUST be valid if present |
| GOV-06 | `governance.operational_status.status` MUST be valid if present |
| GOV-07 | `ai_governance.human_oversight.level` MUST be valid if present |
