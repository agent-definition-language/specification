---
id: overview
slug: overview
title: Overview
sidebar_position: 1
description: "The Governance Profile extends ADL for regulated enterprise environments with compliance tracking and audit trails."
keywords: [adl, governance specification, ai compliance, ai audit, soc2, nist 800-53, iso 27001, eu ai act, agentic ai, ai governance, responsible ai]
---

# Governance Profile

**Identifier:** `urn:adl:profile:governance:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

> **Note:** This profile is in **draft** status. The specification is stable for early adoption, but minor changes may occur before 1.0.

## Overview

The Governance Profile extends ADL for regulated enterprise environments. It adds members for compliance frameworks, autonomy classification, AI governance, operational governance, and lifecycle process controls.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

## Use Cases

- Regulatory compliance tracking
- AI governance and oversight
- Audit trail management
- Multi-framework compliance mapping

## Quick Start

Add the Governance Profile to your ADL document:

```json
{
  "adl_spec": "0.1.0",
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
    ]
  }
}
```

## Additional Members

The Governance Profile adds the following top-level members:

| Member | Required | Description |
|--------|----------|-------------|
| `compliance_framework` | **REQUIRED** | Compliance and regulatory framework information |
| `autonomy` | **REQUIRED** | Autonomy tier classification (Tier 1, 2, or 3) |
| `risk_classification` | Optional | AI risk level and assessment |
| `human_oversight` | Tier 2+ | Human oversight configuration and triggers |
| `incident_response` | Tier 2+ | Incident escalation policy attestation |
| `disclosure` | Tier 2+ | User-facing transparency declarations |
| `evaluation_attestation` | Tier 3 | Pre-deployment evaluation result |
| `safety_reviews` | Optional | Safety review schedule and status |
| `governance` | Optional | Operational governance information |
| `governance_record_ref` | Optional | URI to governance record in registry |

See the [full specification](./1.0/profile.md) for detailed member definitions.

## Supported Compliance Frameworks

The profile supports the following compliance frameworks:

- `NIST_800_53` - NIST Special Publication 800-53
- `SOC2_TYPE_II` - SOC 2 Type II
- `ISO_27001` - ISO/IEC 27001 Information Security
- `ISO_42001` - ISO/IEC 42001 AI Management System
- `GDPR` - General Data Protection Regulation
- `HIPAA` - Health Insurance Portability and Accountability Act
- `PCI_DSS` - Payment Card Industry Data Security Standard
- `EU_AI_ACT` - EU Artificial Intelligence Act

## Specification

- [Profile Specification (1.0)](./1.0/profile.md)
- [Compatibility](./COMPATIBILITY.md)
- [Examples](./1.0/examples/)

## Maintainers

- ADL Working Group

## See Also

- [ADL Specification — Appendix C](../../versions/0.1.0/spec.md#appendix-c-profiles)
