# Healthcare Profile

The Healthcare Profile extends ADL for healthcare environments with HIPAA compliance, PHI handling, clinical safety controls, and health data interoperability.

## Status

| Version | Status | ADL Compatibility |
|---------|--------|-------------------|
| 1.0     | Draft  | 0.1.x             |

## Identifier

```
urn:adl:profile:healthcare:1.0
```

## Scope

This profile addresses:

- **HIPAA compliance** — Privacy Rule, Security Rule, Breach Notification Rule
- **PHI handling** — Protected Health Information safeguards, de-identification, consent management
- **Clinical safety** — FDA AI/ML classification, PCCP-aligned change control, bias monitoring
- **Interoperability** — HL7 FHIR, ONC Health IT, 21st Century Cures Act DSI transparency

## Additional Members

| Member | Required | Description |
|--------|----------|-------------|
| `hipaa_compliance` | REQUIRED | HIPAA entity type, PHI categories, minimum necessary, Security Rule settings |
| `phi_handling` | REQUIRED | De-identification, breach notification, consent management |
| `clinical_safety` | OPTIONAL | FDA classification, change control, bias monitoring, human-in-the-loop |
| `interoperability` | OPTIONAL | FHIR version, terminology bindings, information blocking, DSI transparency |

## Regulatory Foundation

- HIPAA (45 CFR Parts 160, 164)
- HITECH Act
- 42 CFR Part 2 (Substance Use Disorder Records)
- FDA AI/ML Guidance and PCCP Framework
- HL7 FHIR (R4, R5)
- ONC HTI-1 Final Rule
- 21st Century Cures Act
- NIST AI Risk Management Framework

## See Also

- [Governance Profile](../governance/) — For general compliance framework support (composes with this profile)
- [Financial Profile](../financial/) — For financial services compliance
- [ADL Profiles Overview](../README.md)
