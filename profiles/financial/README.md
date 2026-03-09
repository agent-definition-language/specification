---
id: overview
slug: overview
title: Overview
sidebar_position: 1
description: "The Financial Profile extends ADL for financial services with PCI-DSS, SOX, GLBA, and MiFID II compliance."
keywords: [adl, financial specification, pci-dss, sox, glba, mifid, aml, agentic ai, financial ai compliance, fintech ai, ai risk management]
---

# Financial Profile

**Identifier:** `urn:adl:profile:financial:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

> **Note:** This profile is in **draft** status. The specification is stable for early adoption, but minor changes may occur before 1.0.

> **Regulatory Disclaimer:** This profile does not constitute legal, regulatory, or compliance advice. It has not been reviewed or endorsed by the PCI Security Standards Council, the SEC, FINRA, the FTC, or any regulatory body. Compliance with PCI-DSS requires a Qualified Security Assessor (QSA) assessment. Compliance with SOX requires audit by a registered public accounting firm.

## Overview

The Financial Profile extends ADL for financial services and banking environments. It adds members for financial data classification, transaction controls, regulatory scope declarations, and risk management. This profile addresses requirements from PCI-DSS v4.0, SOX, GLBA, Basel III/IV, FINRA, SEC regulations, DORA, MiFID II, and AML/KYC frameworks.

This profile is designed to compose with the [Governance Profile](../governance/). Organizations **SHOULD** declare both profiles for full enterprise financial compliance coverage.

## Use Cases

- Trade compliance monitoring agents
- AML/KYC screening agents
- Risk analysis and assessment agents
- Fraud detection systems
- Regulatory reporting agents
- Customer service agents for financial institutions
- Algorithmic trading oversight agents

## Quick Start

Add the Financial Profile to your ADL document — minimum viable declaration:

```json
{
  "adl_spec": "0.1.0",
  "name": "Transaction Monitor",
  "description": "Monitors transactions for compliance violations.",
  "version": "1.0.0",
  "profiles": ["urn:adl:profile:financial:1.0"],
  "data_classification": {
    "sensitivity": "confidential",
    "categories": ["financial"],
    "financial": {
      "data_types": ["transaction_data"]
    }
  },
  "financial_data_handling": {}
}
```

## Additional Members

The Financial Profile adds the following top-level members:

| Member | Required | Description |
|--------|----------|-------------|
| `data_classification.financial` | **REQUIRED** | Financial data types (composable; extends core `data_classification`) |
| `financial_data_handling` | **REQUIRED** | PCI scope, data residency |
| `transaction_controls` | Optional | Transaction limits, pre-execution checks, kill switch, segregation of duties |
| `regulatory_scope` | Optional | Applicable regulations, jurisdictions, record retention |
| `financial_risk_management` | Optional | Model risk (SR 11-7), AML controls, operational risk |

See the [full specification](./1.0/profile.md) for detailed member definitions.

## Regulatory Foundation

This profile maps requirements from:

- **PCI-DSS v4.0** — Payment card data security
- **SOX** (Sarbanes-Oxley) — Internal controls, audit trails, segregation of duties
- **GLBA** (Gramm-Leach-Bliley) — Financial privacy, NPI safeguards
- **Basel III/IV** — Capital adequacy, operational risk
- **FINRA** — Broker-dealer supervision, AI agent oversight
- **SEC** — Securities regulations, MNPI controls
- **DORA** — EU digital operational resilience
- **MiFID II** — Algorithmic trading controls, kill switches, record retention
- **BSA/AML** — Anti-money laundering, suspicious activity reporting
- **FFIEC** — IT examination, model risk management (SR 11-7)

## Specification

- [Profile Specification (1.0)](./1.0/profile.md)
- [Compatibility](./COMPATIBILITY.md)
- [Examples](./1.0/examples/)

## Maintainers

- ADL Working Group

## See Also

- [Governance Profile](../governance/) — For general compliance framework support (composes with this profile)
- [Healthcare Profile](../healthcare/) — For healthcare compliance
- [ADL Profiles Overview](../README.md)
