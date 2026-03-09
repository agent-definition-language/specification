---
id: governance-record
title: Governance Record
sidebar_position: 3
description: Companion specification defining the governance record schema for operational governance detail stored in agent registries.
keywords: [adl, governance, governance record, registry, escalation, accountability, audit, compliance]
---

# Governance Record Specification

**Companion to:** `urn:adl:profile:governance:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

## 1. Introduction

A governance record is a structured document maintained by a governance registry for each registered agent. It contains operational governance detail that does not travel with the agent passport — escalation contacts, full accountability chains, audit schedules, detailed evaluation reports, and compliance control mappings.

The governance record is referenced from the agent's ADL document via the `governance_record_ref` member (Section 2.10 of the Governance Profile). The passport carries trust-decision signals; the governance record carries the operational substance behind those signals.

### 1.1 Scope

This specification defines the schema for governance records. It is a **companion specification** to the Governance Profile, not a new ADL document type. Governance records are stored and served by governance registries (such as Gorvnd) and are not embedded in ADL documents.

### 1.2 Relationship to the Passport

| Concern | Passport (ADL Document) | Governance Record |
|---------|------------------------|-------------------|
| Incident response | `incident_response.policy_documented: true` | Full escalation contacts, severity routing, SLAs, external reporting |
| Human oversight | `triggers`, `response_time_minutes`, `intervention_model` | Escalation contact, audit cadence, review history |
| Evaluation | `result`, `evaluator`, `evaluation_date`, `expires_at` | Dimensions covered, conditions, report URI, continuous testing config |
| Accountability | `user_escalation_contact`, `decision_boundaries` | Full accountability chain, external dependencies |
| Compliance | `compliance_framework.primary_framework` | Full `control_mappings` table, audit schedule |

---

## 2. Document Structure

A governance record **MUST** be a JSON object. It **SHOULD** be served with media type `application/json`.

### 2.1 Top-Level Members

| Member            | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| agent_ref         | string | REQUIRED | URI to the ADL document this record accompanies |
| record_version    | string | REQUIRED | Version of this governance record |
| updated_at        | string | REQUIRED | ISO 8601 timestamp of last update |
| incident_escalation | object | OPTIONAL | Full incident escalation policy |
| oversight_operations | object | OPTIONAL | Operational oversight detail |
| evaluation_detail | object | OPTIONAL | Detailed evaluation records |
| accountability    | object | OPTIONAL | Accountability chain and dependencies |
| compliance_detail | object | OPTIONAL | Detailed compliance control mappings |

---

### 2.2 incident_escalation

Operational detail for incident detection, escalation, and reporting. This content backs the passport's `incident_response.policy_documented: true` declaration.

| Member                    | Type   | Required | Description |
|---------------------------|--------|----------|-------------|
| contacts                  | array  | REQUIRED | Escalation contact chain |
| triggers                  | array  | REQUIRED | Conditions that activate escalation |
| external_reporting_required | bool | OPTIONAL | Whether incidents must be reported to external authorities |
| reporting_framework       | string | OPTIONAL | External reporting framework (e.g., `"NIST IR-6"`, `"IMDA Incident Reporting"`) |
| external_reporting_contact | string | OPTIONAL | URI for external reporting; **MUST** be present if `external_reporting_required` is `true` |
| last_tested               | string | OPTIONAL | ISO 8601 timestamp of last escalation path test |

#### contacts

**MUST** be a non-empty array of contact objects:

| Member              | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| role                | string | REQUIRED | Role in the escalation chain (e.g., `"first_responder"`, `"incident_commander"`) |
| contact             | string | REQUIRED | URI for the contact (e.g., `mailto:`, PagerDuty URL, Slack webhook) |
| response_time_minutes | number | REQUIRED | Maximum response time SLA in minutes |
| severity_threshold  | string | OPTIONAL | Minimum severity that routes to this contact: `low`, `medium`, `high`, `critical` |

#### triggers

**MUST** be a non-empty array of strings describing conditions that activate the escalation process.

---

### 2.3 oversight_operations

Operational detail for human oversight enforcement. This content backs the passport's `human_oversight.triggers` and `human_oversight.response_time_minutes` declarations.

| Member             | Type   | Required | Description |
|--------------------|--------|----------|-------------|
| escalation_contact | string | OPTIONAL | URI of the person, team, or notification endpoint for oversight alerts |
| audit_cadence      | string | OPTIONAL | Review frequency for oversight effectiveness (e.g., `"quarterly"`, `"monthly"`, `"after_each_incident"`) |
| review_history     | array  | OPTIONAL | Record of past oversight reviews |

#### review_history

When present, **MUST** be an array of review objects:

| Member           | Type   | Required | Description |
|------------------|--------|----------|-------------|
| date             | string | REQUIRED | ISO 8601 timestamp of review |
| reviewer         | string | REQUIRED | Entity that performed the review |
| findings_summary | string | OPTIONAL | Summary of review findings |

---

### 2.4 evaluation_detail

Detailed evaluation records backing the passport's `evaluation_attestation` declaration.

| Member                     | Type   | Required | Description |
|----------------------------|--------|----------|-------------|
| dimensions_covered         | array  | OPTIONAL | Aspects of behavior that were evaluated |
| conditions                 | array  | OPTIONAL | Conditions attached to a `conditional` result |
| report_uri                 | string | OPTIONAL | URI to the full evaluation report document |
| continuous_testing_enabled | bool   | OPTIONAL | Whether continuous post-deployment testing is active |
| evaluation_history         | array  | OPTIONAL | Record of past evaluations |

#### dimensions_covered

When present, **MUST** be a non-empty array. Each item **MUST** be one of:

| Value                      | Description |
|----------------------------|-------------|
| `task_execution_accuracy`  | Whether the agent correctly performs its intended tasks |
| `policy_compliance`        | Whether the agent adheres to declared policies and constraints |
| `tool_calling_correctness` | Whether the agent invokes tools with correct parameters and in appropriate contexts |
| `robustness`               | Whether the agent handles edge cases, adversarial inputs, and unexpected conditions |
| `security`                 | Whether the agent resists prompt injection, data exfiltration, and other security threats |
| `multi_agent_behavior`     | Whether the agent behaves correctly in multi-agent pipeline scenarios |

#### conditions

When present, **MUST** be a non-empty array of strings. **MUST** be present when the passport's `evaluation_attestation.result` is `conditional`.

#### evaluation_history

When present, **MUST** be an array of evaluation record objects:

| Member     | Type   | Required | Description |
|------------|--------|----------|-------------|
| date       | string | REQUIRED | ISO 8601 timestamp |
| evaluator  | string | REQUIRED | Entity that performed the evaluation |
| result     | string | REQUIRED | `passed`, `conditional`, or `failed` |
| report_uri | string | OPTIONAL | URI to the evaluation report |

---

### 2.5 accountability

Full accountability chain and external dependency records. This content backs the passport's `governance.ownership.user_escalation_contact` and `governance.ownership.decision_boundaries` declarations.

| Member                | Type  | Required | Description |
|-----------------------|-------|----------|-------------|
| accountability_chain  | array | OPTIONAL | Ordered chain of accountable entities |
| external_dependencies | array | OPTIONAL | Third-party services the agent depends on |

#### accountability_chain

When present, **MUST** be a non-empty array of accountability objects, ordered from the deploying team to the ultimate accountable authority:

| Member  | Type   | Required | Description |
|---------|--------|----------|-------------|
| role    | string | REQUIRED | Role in the accountability chain (e.g., `"deployer"`, `"product_owner"`, `"model_developer"`) |
| entity  | string | REQUIRED | Name of the accountable entity |
| contact | string | OPTIONAL | URI for the entity |
| scope   | string | OPTIONAL | Description of what this entity is accountable for |

#### external_dependencies

When present, **MUST** be a non-empty array of dependency objects:

| Member            | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| service           | string | REQUIRED | Name of the external service |
| provider          | string | REQUIRED | Provider of the service |
| accountability_ref | string | OPTIONAL | URI to the provider's accountability or terms of service |
| notes             | string | OPTIONAL | Additional context |

---

### 2.6 compliance_detail

Detailed compliance control mappings and audit schedule. This content extends the passport's `compliance_framework.primary_framework` declaration.

| Member           | Type   | Required | Description |
|------------------|--------|----------|-------------|
| control_mappings | array  | OPTIONAL | Full control implementation details |
| audit_schedule   | object | OPTIONAL | Audit schedule and history |

#### control_mappings

When present, **MUST** be an array of control mapping objects following the same schema as the passport's `compliance_framework.control_mappings`:

| Member      | Type   | Required | Description |
|-------------|--------|----------|-------------|
| framework   | string | REQUIRED | Framework identifier |
| control_id  | string | REQUIRED | Control identifier |
| status      | string | REQUIRED | `implemented`, `partial`, `planned`, `not_applicable` |
| evidence_uri | string | OPTIONAL | URI to compliance evidence |

#### audit_schedule

When present, **MAY** contain:

| Member     | Type   | Description |
|------------|--------|-------------|
| last_audit | string | ISO 8601 timestamp of last audit |
| next_audit | string | ISO 8601 timestamp of next scheduled audit |
| auditor    | string | Entity performing the audit |

---

## 3. Tier-Conditional Record Requirements

Governance registries **SHOULD** enforce the following requirements at agent registration time based on the passport's `autonomy.tier`:

| Field | Tier 1 | Tier 2 | Tier 3 |
|-------|--------|--------|--------|
| `incident_escalation` | MAY | SHOULD | **MUST** |
| `incident_escalation.contacts` (non-empty) | MAY | SHOULD | **MUST** |
| `oversight_operations.escalation_contact` | MAY | MAY | **MUST** |
| `oversight_operations.audit_cadence` | MAY | MAY | **MUST** |
| `evaluation_detail` | MAY | MAY | SHOULD |
| `accountability.accountability_chain` | MAY | MAY | SHOULD |

These requirements are enforced by the governance registry, not by passport validators. The passport validator's responsibility ends at the passport schema; the registry validates the governance record at registration time.

---

## 4. Example

```json
{
  "agent_ref": "https://example.com/agents/compliance-review",
  "record_version": "3.1.0",
  "updated_at": "2026-03-01T14:00:00Z",
  "incident_escalation": {
    "contacts": [
      {
        "role": "first_responder",
        "contact": "mailto:soc@example.com",
        "response_time_minutes": 15,
        "severity_threshold": "high"
      },
      {
        "role": "incident_commander",
        "contact": "https://pagerduty.example.com/escalation/ai-incidents",
        "response_time_minutes": 30,
        "severity_threshold": "critical"
      }
    ],
    "triggers": [
      "Agent produces output contradicting established regulatory guidance",
      "Agent attempts to access resources outside declared permissions",
      "Anomalous volume of tool invocations detected"
    ],
    "external_reporting_required": false,
    "last_tested": "2026-02-01T00:00:00Z"
  },
  "oversight_operations": {
    "escalation_contact": "mailto:compliance-lead@example.com",
    "audit_cadence": "quarterly",
    "review_history": [
      {
        "date": "2026-01-15T00:00:00Z",
        "reviewer": "AI Ethics Committee",
        "findings_summary": "Oversight triggers functioning as designed. Response times within SLA."
      }
    ]
  },
  "evaluation_detail": {
    "dimensions_covered": [
      "task_execution_accuracy",
      "policy_compliance",
      "robustness",
      "security"
    ],
    "report_uri": "https://gorvnd.example.com/reports/compliance-review/eval-2026-02.pdf",
    "continuous_testing_enabled": true,
    "evaluation_history": [
      {
        "date": "2026-02-15T00:00:00Z",
        "evaluator": "AI Safety Review Board",
        "result": "passed",
        "report_uri": "https://gorvnd.example.com/reports/compliance-review/eval-2026-02.pdf"
      },
      {
        "date": "2025-08-20T00:00:00Z",
        "evaluator": "External Audit Firm",
        "result": "conditional",
        "report_uri": "https://gorvnd.example.com/reports/compliance-review/eval-2025-08.pdf"
      }
    ]
  },
  "accountability": {
    "accountability_chain": [
      {
        "role": "deployer",
        "entity": "Compliance Team",
        "contact": "mailto:compliance@example.com",
        "scope": "Day-to-day operation and monitoring"
      },
      {
        "role": "product_owner",
        "entity": "VP of Compliance",
        "contact": "mailto:vp-compliance@example.com",
        "scope": "Strategic direction and risk acceptance"
      },
      {
        "role": "model_developer",
        "entity": "Acme AI",
        "contact": "mailto:support@acme-ai.example.com",
        "scope": "Underlying model behavior and updates"
      }
    ],
    "external_dependencies": [
      {
        "service": "Regulatory Database API",
        "provider": "RegData Corp",
        "accountability_ref": "https://regdata.example.com/terms",
        "notes": "Agent queries this API for current regulatory text"
      }
    ]
  },
  "compliance_detail": {
    "control_mappings": [
      {
        "framework": "SOC2",
        "control_id": "CC6.1",
        "status": "implemented",
        "evidence_uri": "https://gorvnd.example.com/evidence/cc6.1"
      },
      {
        "framework": "SOC2",
        "control_id": "CC7.2",
        "status": "implemented",
        "evidence_uri": "https://gorvnd.example.com/evidence/cc7.2"
      }
    ],
    "audit_schedule": {
      "last_audit": "2025-11-15T00:00:00Z",
      "next_audit": "2026-11-15T00:00:00Z",
      "auditor": "External Audit Partners LLP"
    }
  }
}
```
