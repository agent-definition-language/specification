---
id: specification
title: "Specification"
sidebar_position: 2
slug: ../specification
description: "Full specification for the ADL Governance Profile including compliance frameworks, AI governance, and audit trails."
keywords: [adl, governance specification, ai compliance, ai audit, soc2, nist 800-53, iso 27001, eu ai act, agentic ai, ai governance, responsible ai]
adl_profile_meta:
  example_filename: "compliance-review-agent.adl.json"
---

# Governance Profile Specification

**Identifier:** `urn:adl:profile:governance:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x
**Schema:** [`schema.json`](schema.json)
**Dependencies:** None

## 1. Introduction

The Governance Profile extends ADL for regulated enterprise environments. It adds members for compliance frameworks, autonomy classification, AI governance, operational governance, and lifecycle process controls. Agent lifecycle status is defined by the core ADL `lifecycle` member (Section 5.6); this profile adds governance-specific process controls around lifecycle transitions.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

### 1.1 Passport Model

This profile applies ADL's passport model (Section 1.3 of the core specification) to governance. The ADL document carries the minimum governance declarations needed for trust decisions; operational governance detail — escalation contacts, full accountability chains, audit schedules, evaluation reports — is maintained in a separate **governance record** stored in the agent registry and linked from the passport via `governance_record_ref`.

See the companion [Governance Record Specification](governance-record.md) for the governance record schema.

### 1.2 Conformance Tiers

The Governance Profile defines three conformance tiers based on agent autonomy. Tiers make governance fields **conditionally required** — fields that are OPTIONAL at Tier 1 become REQUIRED at higher tiers. This mechanism transforms optional governance declarations into enforceable constraints without making them universally required for all governed agents.

| Tier | Name | Description |
|------|------|-------------|
| 1 | Supervised | Human directs; agent assists. Agent operates under direct human control with limited independent action. |
| 2 | Conditional Autonomy | Agent acts within defined boundaries; human oversight on exceptions. Agent may execute independently but must pause for human review under declared trigger conditions. |
| 3 | Full Autonomy | Agent operates independently; human oversight is periodic or post-hoc. Agent makes and executes decisions with minimal real-time human intervention. |

Tier definitions are framework-agnostic. The compliance mapping table (Section 3) provides alignment to specific framework risk classifications.

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
- `IMDA_AGENTIC` — IMDA Model AI Governance Framework for Agentic AI
- `NIST_AI_RMF` — NIST AI Risk Management Framework

#### control_mappings

When present, **MUST** be an array of control mapping objects:

| Member     | Type   | Required | Description |
|------------|--------|----------|-------------|
| framework  | string | REQUIRED | Framework identifier |
| control_id | string | REQUIRED | Control identifier (e.g., "CC6.1") |
| status     | string | REQUIRED | Implementation status |

`status` **MUST** be one of: `implemented`, `partial`, `planned`, `not_applicable`.

> **Note:** For enterprise deployments with a governance registry, `control_mappings` **MAY** be maintained in the governance record rather than the passport. When present in both locations, the governance record is the authoritative source.

#### audit_dates

When present, **MUST** be an object containing:

| Member     | Type   | Required | Description |
|------------|--------|----------|-------------|
| last_audit | string | OPTIONAL | ISO 8601 timestamp of last audit |
| next_audit | string | OPTIONAL | ISO 8601 timestamp of next scheduled audit |

---

### 2.2 autonomy

**REQUIRED** when using this profile.

Declares the agent's autonomy tier, which determines the conformance requirements for the remainder of this profile. The autonomy classification is the primary governance signal for counterparties making trust decisions about this agent.

| Member        | Type   | Required | Description |
|---------------|--------|----------|-------------|
| tier          | number | REQUIRED | Conformance tier: `1`, `2`, or `3` |
| basis         | string | REQUIRED | Rationale for the tier classification |
| classified_by | string | REQUIRED | Entity that performed the classification |
| classified_at | string | REQUIRED | ISO 8601 timestamp of classification |

`tier` **MUST** be one of `1`, `2`, or `3`. See Section 1.2 for tier definitions.

`basis` **SHOULD** describe the factors that informed the classification, including the agent's scope of autonomous action, the reversibility of its decisions, and the sensitivity of data it processes.

`classified_by` **SHOULD** identify a person, team, or governance body with authority to classify agents.

Example:

```json
{
  "autonomy": {
    "tier": 2,
    "basis": "Agent executes document reviews independently but requires human approval for compliance determinations that affect regulatory filings.",
    "classified_by": "AI Ethics Committee",
    "classified_at": "2026-01-15T00:00:00Z"
  }
}
```

---

### 2.3 risk_classification

**OPTIONAL.** AI risk level and assessment for this agent.

| Member          | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| level           | string | OPTIONAL | Risk level: `low`, `medium`, `high`, `critical` |
| autonomy_level  | string | OPTIONAL | Fine-grained autonomy scale for framework alignment |
| assessed_by     | string | OPTIONAL | Entity that performed the assessment |
| assessed_at     | string | OPTIONAL | ISO 8601 timestamp |
| rationale       | string | OPTIONAL | Explanation of risk classification |

#### autonomy_level

When present, **MUST** be one of:

| Value | Description |
|-------|-------------|
| `L0`  | No autonomy — deterministic tool, no AI decision-making |
| `L1`  | Minimal autonomy — AI assists within tightly scoped parameters |
| `L2`  | Bounded autonomy — AI selects actions from a constrained set with human approval |
| `L3`  | Conditional autonomy — AI acts independently within defined boundaries, human override available |
| `L4`  | High autonomy — AI operates independently with periodic human review |
| `L5`  | Full autonomy — AI operates without ongoing human oversight |

`autonomy_level` provides a finer-grained scale than `autonomy.tier` for organizations that require detailed risk classification. When both are present, they **SHOULD** be consistent: L0–L1 maps to Tier 1, L2–L3 maps to Tier 2, L4–L5 maps to Tier 3.

---

### 2.4 human_oversight

**OPTIONAL.** Human oversight configuration for this agent. At Tier 2+, this member **MUST** be present (GOV-12).

| Member                | Type   | Required | Description |
|-----------------------|--------|----------|-------------|
| level                 | string | OPTIONAL | Oversight level: `none`, `on_exception`, `periodic`, `continuous` |
| role                  | string | OPTIONAL | Role responsible for oversight |
| triggers              | array  | OPTIONAL | Conditions that pause agent execution for human review |
| response_time_minutes | number | OPTIONAL | Maximum minutes before auto-halt when no reviewer responds |
| intervention_model    | string | OPTIONAL | How human intervention works |

#### triggers

When present, **MUST** be a non-empty array of strings. Each string describes a condition that **MUST** cause the agent to suspend execution and request human review. Trigger descriptions are declarative — the runtime is responsible for detecting the conditions and suspending execution.

At Tier 2+, `triggers` **MUST** be present (GOV-13).

Example trigger values: `"Financial commitment exceeding $10,000"`, `"Access to restricted data category"`, `"Decision affecting external-facing communications"`.

#### response_time_minutes

When present, **MUST** be a positive integer. Specifies the maximum number of minutes the agent will wait for a human reviewer to respond after a trigger condition is met. If no response is received within this period, the agent **MUST** halt execution rather than proceed without oversight.

At Tier 2+, `response_time_minutes` **MUST** be present (GOV-13).

#### intervention_model

When present, **MUST** be one of:

| Value            | Description |
|------------------|-------------|
| `approve_reject` | Human approves or rejects the agent's proposed action |
| `plan_editing`   | Human may modify the agent's proposed plan before execution |
| `monitor_only`   | Human observes but does not block execution |

> **Note:** Operational oversight detail — escalation contacts and audit cadence — is maintained in the governance record. See the [Governance Record Specification](governance-record.md).

---

### 2.5 incident_response

**OPTIONAL.** Declares whether an incident escalation policy is documented for this agent. At Tier 2+, this member **MUST** be present with `policy_documented: true` (GOV-14).

| Member            | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| policy_documented | bool   | REQUIRED | Whether an incident escalation policy is documented in the governance record |
| last_tested       | string | OPTIONAL | ISO 8601 timestamp of when the escalation path was last verified operational |

`policy_documented` **MUST** be `true` at Tier 2+ (GOV-14). Implementations **SHOULD** warn when `last_tested` is absent or more than 90 days old.

The full incident escalation policy — contacts, severity routing, response time SLAs, external reporting obligations — is maintained in the governance record. See the [Governance Record Specification](governance-record.md).

Example:

```json
{
  "incident_response": {
    "policy_documented": true,
    "last_tested": "2026-02-01T00:00:00Z"
  }
}
```

---

### 2.6 evaluation_attestation

**OPTIONAL.** Records the result of pre-deployment behavioral evaluation. At Tier 3, this member **MUST** be present with `result: passed` (GOV-16).

This member is distinct from `security.attestation` (Section 10.3 of the core ADL specification), which provides cryptographic provenance for the document. `evaluation_attestation` records whether the agent's behavior was evaluated and what the outcome was.

| Member          | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| result          | string | REQUIRED | Evaluation outcome |
| evaluator       | string | REQUIRED | Entity that performed the evaluation |
| evaluation_date | string | REQUIRED | ISO 8601 timestamp of evaluation completion |
| methodology     | string | OPTIONAL | Evaluation methodology class |
| expires_at      | string | OPTIONAL | ISO 8601 timestamp when the attestation expires |

#### result

**MUST** be one of:

| Value         | Description |
|---------------|-------------|
| `passed`      | Agent met all evaluation criteria |
| `conditional` | Agent passed with conditions — restrictions apply |
| `failed`      | Agent did not meet evaluation criteria |

At Tier 3, `result` **MUST** be `passed` (GOV-16). Implementations **SHOULD** warn when `result` is `conditional` at any tier.

#### methodology

When present, **MUST** be one of: `automated_benchmark`, `red_team`, `third_party_audit`, `sandbox`, `internal_review`.

#### expires_at

When present, implementations **SHOULD** warn when `expires_at` is in the past or within 30 days. Runtimes **SHOULD** treat an expired evaluation attestation as requiring re-evaluation before provisioning.

> **Note:** Detailed evaluation records — dimensions covered, conditions, full report URI, continuous testing configuration — are maintained in the governance record. See the [Governance Record Specification](governance-record.md).

Example:

```json
{
  "evaluation_attestation": {
    "result": "passed",
    "evaluator": "AI Safety Review Board",
    "evaluation_date": "2026-02-15T00:00:00Z",
    "methodology": "red_team",
    "expires_at": "2026-08-15T00:00:00Z"
  }
}
```

---

### 2.7 disclosure

**OPTIONAL.** User-facing transparency declarations for this agent. At Tier 2+, this member **MUST** be present with `required: true` (GOV-15).

Disclosure content is presented to users at interaction time. It informs anyone who interacts with the agent — including end users and peer agents — of the agent's AI identity, known limitations, prohibited uses, and reporting contact.

| Member               | Type   | Required | Description |
|----------------------|--------|----------|-------------|
| required             | bool   | REQUIRED | Whether the runtime **MUST** present disclosure to users before interaction |
| known_limitations    | array  | OPTIONAL | Known limitations of the agent |
| prohibited_uses      | array  | OPTIONAL | Uses for which the agent is not intended |
| user_responsibilities| array  | OPTIONAL | Responsibilities the user accepts when using the agent |
| reporting_contact    | string | OPTIONAL | URI for users to report issues or exercise data subject rights |
| disclosure_version   | string | OPTIONAL | Version identifier for tracking disclosure content changes |

`required` **MUST** be `true` at Tier 2+ (GOV-15). When `required` is `true`, runtimes **MUST** present the disclosure content to users before the first interaction in a session.

`known_limitations`, `prohibited_uses`, and `user_responsibilities`, when present, **MUST** each be a non-empty array of strings.

`reporting_contact`, when present, **MUST** be a valid URI.

Example:

```json
{
  "disclosure": {
    "required": true,
    "known_limitations": [
      "May produce inaccurate regulatory citations",
      "Not trained on jurisdiction-specific case law after 2025"
    ],
    "prohibited_uses": [
      "Final regulatory determination without human review",
      "Legal advice to external parties"
    ],
    "reporting_contact": "mailto:ai-issues@example.com",
    "disclosure_version": "1.2"
  }
}
```

---

### 2.8 safety_reviews

**OPTIONAL.** Safety review schedule and status for this agent.

| Member       | Type   | Required | Description |
|--------------|--------|----------|-------------|
| required     | bool   | OPTIONAL | Whether safety review is required |
| frequency    | string | OPTIONAL | Review frequency (e.g., `"quarterly"`) |
| last_review  | string | OPTIONAL | ISO 8601 timestamp |
| next_review  | string | OPTIONAL | ISO 8601 timestamp |
| review_board | string | OPTIONAL | Reviewing entity |

---

### 2.9 governance

**OPTIONAL.** An object containing operational governance information.

| Member              | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| ownership           | object | OPTIONAL | Owner and delegate information |
| approval_workflow   | object | OPTIONAL | Approval requirements |
| audit_trail         | object | OPTIONAL | Audit logging configuration |
| lifecycle_governance | object | OPTIONAL | Governance-specific lifecycle process controls |

> **Note:** Agent lifecycle status (`draft`, `active`, `deprecated`, `retired`) is defined by the core ADL `lifecycle` member (Section 5.6). The governance profile adds process controls around lifecycle transitions via `lifecycle_governance`, not a separate status field.

#### lifecycle_governance

When present, **MAY** contain:

| Member                  | Type   | Description |
|-------------------------|--------|-------------|
| transition_policy       | object | Rules governing lifecycle state transitions |
| last_transition         | object | Record of the most recent lifecycle state change |

##### transition_policy

When present, **MAY** contain:

| Member                      | Type   | Description |
|-----------------------------|--------|-------------|
| requires_approval           | bool   | Whether lifecycle transitions require approval |
| approvers                   | array  | List of required approvers for transitions |
| approval_type               | string | Type: `any`, `all`, `quorum` |
| notice_period_days          | number | Required notice period before deprecation/retirement |
| allowed_transitions         | array  | Permitted state transitions (e.g., `["draft->active", "active->deprecated"]`) |

##### last_transition

When present, **MAY** contain:

| Member      | Type   | Description |
|-------------|--------|-------------|
| from_status | string | Previous lifecycle status |
| to_status   | string | New lifecycle status |
| approved_by | string | Entity that approved the transition |
| approved_at | string | ISO 8601 timestamp of approval |
| reason      | string | Reason for the transition |

#### ownership

When present, **MAY** contain:

| Member                  | Type   | Description |
|-------------------------|--------|-------------|
| owner                   | string | Primary owner (team or individual) |
| delegate                | string | Delegate owner |
| contact                 | string | Contact email |
| user_escalation_contact | string | URI for end users or external parties to report issues |
| decision_boundaries     | array  | Declarations of which decision types require human approval |

##### user_escalation_contact

When present, **MUST** be a valid URI. This is distinct from `ownership.contact` — it is the external-facing contact for end users and counterparties, not the internal governance owner. It **MAY** be a `mailto:` URI, a web form URL, or another URI scheme appropriate to the organization.

##### decision_boundaries

When present, **MUST** be a non-empty array of objects. Each entry declares a category of decision and the authorization model for that category.

| Member        | Type   | Required | Description |
|---------------|--------|----------|-------------|
| decision_type | string | REQUIRED | Category of decision (e.g., `"financial_commitment"`, `"data_deletion"`, `"external_communication"`) |
| owner         | string | REQUIRED | Authorization model for this decision type |
| rationale     | string | OPTIONAL | Explanation of why this boundary exists |

`owner` **MUST** be one of:

| Value           | Description |
|-----------------|-------------|
| `human_only`    | Agent **MUST NOT** execute this decision type; human required |
| `agent`         | Agent may execute this decision type independently |
| `human_in_loop` | Agent may propose; human must approve before execution |

> **Note:** The full accountability chain and external dependencies list are maintained in the governance record. See the [Governance Record Specification](governance-record.md).

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

### 2.10 governance_record_ref

**OPTIONAL.** A URI that resolves to the governance record for this agent in the authoritative registry.

Value **MUST** be a valid URI when present. The URI **SHOULD** be stable — it **MUST NOT** change when the governance record content is updated. The URI **MAY** require authentication to access.

At Tier 3, `governance_record_ref` **SHOULD** be present (GOV-17).

The governance record contains operational governance detail that does not travel with the agent passport: full incident escalation contacts, oversight escalation contacts and audit cadence, detailed evaluation reports, full accountability chains, and compliance control mappings. See the [Governance Record Specification](governance-record.md) for the record schema.

Example:

```json
{
  "governance_record_ref": "https://gorvnd.example.com/agents/compliance-review/governance-record"
}
```

---

## 3. Compliance Mapping

The Governance Profile provides mappings between ADL/profile sections and common compliance framework controls.

| ADL / Profile Section               | Framework Controls |
|-------------------------------------|--------------------|
| lifecycle                           | NIST CM-3, SA-10; ISO 42001 8.4; EU AI Act Art. 9, 72 |
| permissions.network                 | NIST AC-4, SC-7; SOC2 CC6.6 |
| permissions.filesystem              | NIST AC-3, AC-6; SOC2 CC6.1 |
| security.authentication             | NIST IA-2, IA-5; SOC2 CC6.1 |
| security.encryption                 | NIST SC-8, SC-13; SOC2 CC6.1 |
| autonomy                            | IMDA §2.1 (IMDA-001, IMDA-016); CLTC Map 5.1 (CLTC-070, CLTC-071); CLTC Govern 1.4 (CLTC-007, CLTC-010) |
| risk_classification                 | ISO 42001 6.1, 9.1; EU AI Act Art. 9; CLTC Map 5.1 (CLTC-070); IMDA §2.1.1 (IMDA-016) |
| human_oversight                     | ISO 42001 6.1, 9.1; EU AI Act Art. 9; IMDA §2.2.2 (IMDA-040–IMDA-046, IMDA-069–IMDA-070); CLTC Govern 2.1 (CLTC-025, CLTC-026); CLTC Map 3.5 (CLTC-065, CLTC-066); CLTC Manage 1.3 (CLTC-104, CLTC-106) |
| incident_response                   | IMDA §2.3.3 (IMDA-065, IMDA-066, IMDA-071); CLTC Govern 4.2 (CLTC-032, CLTC-033); CLTC Manage 2.3 (CLTC-117, CLTC-125) |
| evaluation_attestation              | IMDA §2.3.2 (IMDA-056–IMDA-062, IMDA-072); CLTC Measure 1.1 (CLTC-077, CLTC-078, CLTC-084) |
| disclosure                          | IMDA §2.4.2 (IMDA-078; IMDA-073, IMDA-077); CLTC Govern 4.2 (CLTC-034, CLTC-035) |
| governance.ownership                | IMDA §2.2.1 (IMDA-028, IMDA-036, IMDA-081); CLTC Govern 2.1 (CLTC-023, CLTC-024) |
| governance.audit_trail              | NIST AU-2, AU-6; SOC2 CC7.2 |
| governance.lifecycle_governance     | NIST CM-3, CM-4; SOC2 CC8.1 |

---

## 4. Example

A Tier 2 agent with conformance tier, oversight triggers, disclosure, and incident response:

```json
{
  "adl_spec": "0.1.0",
  "name": "Compliance Review Agent",
  "description": "Reviews documents for regulatory compliance. Flags potential violations and recommends remediation actions.",
  "version": "2.0.0",
  "data_classification": {
    "sensitivity": "confidential",
    "categories": ["regulatory"]
  },
  "profiles": ["urn:adl:profile:governance:1.0"],
  "lifecycle": {
    "status": "active",
    "effective_date": "2026-01-15T00:00:00Z"
  },
  "autonomy": {
    "tier": 2,
    "basis": "Agent reviews documents independently but requires human approval for compliance determinations affecting regulatory filings.",
    "classified_by": "AI Ethics Committee",
    "classified_at": "2026-01-10T00:00:00Z"
  },
  "compliance_framework": {
    "primary_framework": "SOC2_TYPE_II",
    "audit_dates": {
      "last_audit": "2025-11-15T00:00:00Z",
      "next_audit": "2026-11-15T00:00:00Z"
    }
  },
  "risk_classification": {
    "level": "medium",
    "autonomy_level": "L3",
    "assessed_by": "AI Ethics Committee",
    "assessed_at": "2026-01-10T00:00:00Z"
  },
  "human_oversight": {
    "level": "on_exception",
    "role": "Compliance Officer",
    "triggers": [
      "Compliance determination affecting regulatory filing",
      "Document classified as restricted sensitivity",
      "Remediation recommendation with estimated cost exceeding $50,000"
    ],
    "response_time_minutes": 60,
    "intervention_model": "approve_reject"
  },
  "incident_response": {
    "policy_documented": true,
    "last_tested": "2026-02-01T00:00:00Z"
  },
  "disclosure": {
    "required": true,
    "known_limitations": [
      "May produce inaccurate regulatory citations for jurisdictions outside the US and EU",
      "Not trained on regulatory guidance published after 2025-12-01"
    ],
    "prohibited_uses": [
      "Final regulatory determination without human review",
      "Legal advice to external parties"
    ],
    "reporting_contact": "mailto:ai-issues@example.com"
  },
  "governance": {
    "ownership": {
      "owner": "Compliance Team",
      "contact": "compliance@example.com",
      "user_escalation_contact": "mailto:ai-support@example.com",
      "decision_boundaries": [
        {
          "decision_type": "regulatory_filing",
          "owner": "human_only",
          "rationale": "Regulatory filings require human sign-off per SOC2 CC6.1"
        },
        {
          "decision_type": "document_review",
          "owner": "agent",
          "rationale": "Routine document reviews are within the agent's authorized scope"
        },
        {
          "decision_type": "remediation_recommendation",
          "owner": "human_in_loop",
          "rationale": "Remediation actions may have budgetary implications"
        }
      ]
    },
    "lifecycle_governance": {
      "transition_policy": {
        "requires_approval": true,
        "approvers": ["security-team", "compliance-lead"],
        "approval_type": "all"
      }
    },
    "audit_trail": {
      "enabled": true,
      "retention_days": 730
    }
  },
  "governance_record_ref": "https://gorvnd.example.com/agents/compliance-review/governance-record"
}
```

---

## 5. Validation Rules

Implementations validating against this profile **MUST** enforce:

| Rule | Description |
|------|-------------|
| GOV-01 | `compliance_framework` **MUST** be present |
| GOV-02 | `compliance_framework.primary_framework` **MUST** be a valid framework identifier |
| GOV-03 | `control_mappings[*].status` **MUST** be a valid status value |
| GOV-04 | All timestamps **MUST** be valid ISO 8601 |
| GOV-05 | `risk_classification.level` **MUST** be valid if present |
| GOV-06 | `lifecycle` **MUST** be present (core member, Section 5.6) |
| GOV-07 | `human_oversight.level` **MUST** be valid if present |
| GOV-08 | `lifecycle_governance.last_transition.from_status` and `to_status` **MUST** be valid lifecycle status values if present |
| GOV-09 | `lifecycle_governance.transition_policy.approval_type` **MUST** be one of `any`, `all`, `quorum` if present |
| GOV-10 | `autonomy` **MUST** be present |
| GOV-11 | `autonomy.tier` **MUST** be `1`, `2`, or `3` |
| GOV-12 | At Tier 2+: `human_oversight` **MUST** be present |
| GOV-13 | At Tier 2+: `human_oversight.triggers` and `human_oversight.response_time_minutes` **MUST** be present |
| GOV-14 | At Tier 2+: `incident_response` **MUST** be present with `policy_documented: true` |
| GOV-15 | At Tier 2+: `disclosure` **MUST** be present with `required: true` |
| GOV-16 | At Tier 3: `evaluation_attestation` **MUST** be present with `result: passed` |
| GOV-17 | At Tier 3: `governance_record_ref` **SHOULD** be present |
| GOV-18 | `autonomy.classified_at` **MUST** be valid ISO 8601 |
| GOV-19 | `risk_classification.autonomy_level` **MUST** be a valid L0–L5 value if present |
| GOV-20 | `human_oversight.intervention_model` **MUST** be a valid enum value if present |
| GOV-21 | `evaluation_attestation.result` **MUST** be a valid enum value if present |
| GOV-22 | `evaluation_attestation.methodology` **MUST** be a valid enum value if present |
| GOV-23 | `governance.ownership.decision_boundaries[*].owner` **MUST** be a valid enum value if present |
| GOV-24 | `governance_record_ref` **MUST** be a valid URI if present |

### 5.1 Tier-Conditional Validation

Tier-conditional rules (GOV-12 through GOV-17) are evaluated using the value of `autonomy.tier`. Validators **MUST** resolve `autonomy.tier` before evaluating tier-conditional rules. If `autonomy` is absent, validation **MUST** fail at GOV-10 before reaching tier-conditional checks.

The following table summarizes field requirements by tier:

| Field | Tier 1 | Tier 2 | Tier 3 |
|-------|--------|--------|--------|
| `compliance_framework` | **MUST** | **MUST** | **MUST** |
| `autonomy` | **MUST** | **MUST** | **MUST** |
| `lifecycle` | **MUST** | **MUST** | **MUST** |
| `human_oversight` | MAY | **MUST** | **MUST** |
| `human_oversight.triggers` | MAY | **MUST** | **MUST** |
| `human_oversight.response_time_minutes` | MAY | **MUST** | **MUST** |
| `incident_response` (with `policy_documented: true`) | MAY | **MUST** | **MUST** |
| `disclosure` (with `required: true`) | MAY | **MUST** | **MUST** |
| `evaluation_attestation` (with `result: passed`) | MAY | MAY | **MUST** |
| `governance_record_ref` | MAY | MAY | SHOULD |

### 5.2 Schema Validation

The governance profile provides a JSON Schema ([`schema.json`](schema.json)) that extends the base ADL schema via `allOf` composition per Section 13.1 of the core specification. The profile schema:

1. References the base ADL schema via `allOf` with `$ref`.
2. Declares all governance-specific members in its own `properties`.
3. Enforces tier-conditional requirements using `if`/`then` on `autonomy.tier`.
4. Adds `unevaluatedProperties: false` to reject members not defined by either the base schema or this profile.

Validators **SHOULD** use this schema for structural validation of documents declaring the governance profile. Semantic validation rules (GOV-01 through GOV-24) that cannot be expressed in JSON Schema **MUST** be enforced programmatically.

### 5.3 Profile Dependencies

This profile has no dependencies. Profiles that depend on the governance profile (e.g., a healthcare profile) compose by referencing this profile's schema in their own `allOf` and **MAY** tighten governance constraints (e.g., require `human_oversight` at Tier 1). See Section 13.3 of the core specification for dependency rules.
