---
id: overview
slug: overview
title: Overview
sidebar_position: 1
description: "The Healthcare Profile extends ADL for healthcare environments with HIPAA compliance, PHI handling, and clinical safety controls."
keywords: [adl, healthcare specification, hipaa, phi, fhir, clinical ai, agentic ai, healthcare ai compliance, medical ai, ai safety]
---

# Healthcare Profile

**Identifier:** `urn:adl:profile:healthcare:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

> **Note:** This profile is in **draft** status. The specification is stable for early adoption, but minor changes may occur before 1.0.

> **Regulatory Disclaimer:** This profile does not constitute legal, regulatory, or compliance advice. It has not been reviewed or endorsed by HHS, OCR, the FDA, or any regulatory body. Compliance with HIPAA requires qualified professional assessment specific to your organization. This profile does not substitute for a HIPAA risk assessment as required by 45 CFR §164.308(a)(1).

## Overview

The Healthcare Profile extends ADL for healthcare and medical environments. It adds members for HIPAA compliance, Protected Health Information (PHI) handling, clinical safety controls, and health data interoperability. This profile addresses requirements from HIPAA, HITECH, FDA AI/ML guidance, HL7 FHIR, and the 21st Century Cures Act.

This profile is designed to compose with the [Governance Profile](../governance/). Organizations **SHOULD** declare both profiles for full enterprise healthcare compliance coverage.

## Use Cases

- Electronic Health Record (EHR) integration agents
- Clinical decision support systems
- Clinical research and trial matching assistants
- Patient communication agents
- Healthcare administrative and billing agents
- Medical imaging analysis agents

## Quick Start

Add the Healthcare Profile to your ADL document:

```json
{
  "adl_spec": "0.1.0",
  "name": "Clinical Research Assistant",
  "description": "Assists with patient record analysis and trial matching.",
  "version": "1.0.0",
  "profiles": ["urn:adl:profile:healthcare:1.0"],
  "data_classification": {
    "sensitivity": "restricted",
    "categories": ["pii", "phi"],
    "healthcare": {
      "phi_types": ["demographics", "medical_records"]
    }
  },
  "hipaa_compliance": {
    "covered_entity_type": "business_associate",
    "baa_required": true,
    "minimum_necessary": {
      "scope": "task_specific"
    }
  },
  "phi_handling": {
    "de_identification": {
      "method": "safe_harbor"
    },
    "breach_notification": {
      "notification_hours": 60,
      "contact": "privacy-officer@example.com"
    }
  }
}
```

## Additional Members

The Healthcare Profile adds the following top-level members:

| Member | Required | Description |
|--------|----------|-------------|
| `data_classification.healthcare` | **REQUIRED** | PHI types (composable; extends core `data_classification`) |
| `hipaa_compliance` | **REQUIRED** | HIPAA entity type, minimum necessary access, Security Rule settings |
| `phi_handling` | **REQUIRED** | De-identification, breach notification, consent management, data provenance |
| `clinical_safety` | Optional | FDA classification, PCCP change control, bias monitoring, human-in-the-loop |
| `interoperability` | Optional | FHIR version, terminology bindings, information blocking, DSI transparency |

See the [full specification](./1.0/profile.md) for detailed member definitions.

## Regulatory Foundation

This profile maps requirements from:

- **HIPAA** (45 CFR Parts 160, 164) — Privacy, Security, and Breach Notification Rules
- **HITECH Act** — Extended HIPAA to business associates
- **42 CFR Part 2** — Substance use disorder record protections
- **FDA AI/ML Guidance** — PCCP framework for AI model change control
- **HL7 FHIR** — Health data interoperability (R4, R5)
- **ONC HTI-1** — Decision Support Intervention transparency
- **21st Century Cures Act** — Information blocking prohibitions
- **NIST AI RMF** — AI risk management framework

## Specification

- [Profile Specification (1.0)](./1.0/profile.md)
- [Compatibility](./COMPATIBILITY.md)
- [Examples](./1.0/examples/)

## Maintainers

- ADL Working Group

## See Also

- [Governance Profile](../governance/) — For general compliance framework support (composes with this profile)
- [Financial Profile](../financial/) — For financial services compliance
- [ADL Profiles Overview](../README.md)
