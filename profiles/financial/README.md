# Financial Profile

The Financial Profile extends ADL for financial services environments with financial data classification, transaction controls, regulatory scope declarations, and risk management.

## Status

| Version | Status | ADL Compatibility |
|---------|--------|-------------------|
| 1.0     | Draft  | 0.1.x             |

## Identifier

```
urn:adl:profile:financial:1.0
```

## Scope

This profile addresses:

- **Financial data handling** — Data classification (CHD, NPI, MNPI), PCI-DSS scoping, data residency
- **Transaction controls** — Limits, pre-execution checks, kill switches, segregation of duties
- **Regulatory scope** — Multi-regulation declarations, record retention, reporting obligations
- **Risk management** — Model risk (SR 11-7), AML controls, operational risk classification

## Additional Members

| Member | Required | Description |
|--------|----------|-------------|
| `financial_data_handling` | REQUIRED | Data classification, PCI scope, data residency |
| `transaction_controls` | OPTIONAL | Transaction limits, pre-execution controls, kill switch, segregation of duties |
| `regulatory_scope` | OPTIONAL | Applicable regulations, jurisdictions, record retention |
| `financial_risk_management` | OPTIONAL | Model risk, AML controls, operational risk |

## Regulatory Foundation

- PCI-DSS v4.0
- Sarbanes-Oxley Act (SOX)
- Gramm-Leach-Bliley Act (GLBA)
- Basel III/IV Capital Framework
- FINRA Rules
- SEC Regulations
- DORA (EU Digital Operational Resilience Act)
- MiFID II (Markets in Financial Instruments Directive)
- Bank Secrecy Act / AML (BSA)
- EU Anti-Money Laundering Directive (AMLD)
- FFIEC IT Examination Handbook

## See Also

- [Governance Profile](../governance/) — For general compliance framework support (composes with this profile)
- [Healthcare Profile](../healthcare/) — For healthcare compliance
- [ADL Profiles Overview](../README.md)
