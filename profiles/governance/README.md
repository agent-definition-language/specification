# Governance Profile

The Governance Profile extends ADL for regulated enterprise environments with compliance, audit, and governance requirements.

## Scope

This profile addresses:

- **Compliance frameworks** — NIST 800-53, SOC 2 Type II, ISO 27001, ISO 42001, GDPR, HIPAA, PCI-DSS, EU AI Act
- **AI governance** — Risk classification, safety reviews, human oversight
- **Operational governance** — Status tracking, ownership, approval workflows
- **Audit trails** — Logging requirements, retention policies
- **Registry metadata** — Enterprise agent catalog integration

## Status

| Version | Status | ADL Compatibility |
|---------|--------|-------------------|
| 1.0     | Draft  | 0.1.x             |

## Identifier

```
urn:adl:profile:governance:1.0
```

## Quick Start

```json
{
  "adl": "0.1.0",
  "name": "Compliance Agent",
  "description": "Reviews documents for regulatory compliance.",
  "version": "1.0.0",
  "profiles": ["urn:adl:profile:governance:1.0"],
  "compliance_framework": {
    "primary_framework": "SOC2_TYPE_II",
    "audit_dates": {
      "last_audit": "2025-11-15T00:00:00Z",
      "next_audit": "2026-11-15T00:00:00Z"
    }
  }
}
```

## Specification

- [Profile Specification (1.0)](./1.0/profile.md)
- [Compatibility](./COMPATIBILITY.md)
- [Examples](./1.0/examples/)

## Maintainers

- ADL Working Group

## See Also

- [ADL Specification — Appendix C](../../versions/0.1.0-draft/spec.md#appendix-c-governance-profile)
