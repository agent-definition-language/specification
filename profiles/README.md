---
id: index
title: Profiles
sidebar_position: 1
slug: /profiles
description: ADL Profiles extend the core specification with domain-specific requirements for regulated industries.
keywords: [adl, profiles, governance, healthcare, financial, compliance]
---

# Profiles

Profiles extend the core ADL specification with domain-specific requirements, members, and validation rules. They enable regulated industries and specialized use cases to build on ADL without modifying the core spec.

> **Tip:** Use profiles when your agents need to comply with industry regulations (HIPAA, SOC2, PCI-DSS) or organizational governance requirements. Profiles add structured compliance tracking without changing core ADL semantics.

## Overview

A **profile** is a set of additional requirements and members that extend ADL for a specific domain. When an ADL document declares a profile in its `profiles` array, it:

- **MUST** satisfy all requirements of that profile
- **MAY** use members defined by the profile
- **SHOULD** be validated against profile-specific rules

Profiles are identified by URIs (e.g., `urn:adl:profile:governance:1.0`).

## Available Profiles

| Profile | Identifier | Status | Description |
|---------|------------|--------|-------------|
| [Governance](./governance/) | `urn:adl:profile:governance:1.0` | Draft | Compliance frameworks, audit trails, enterprise governance |
| [Portfolio](./portfolio/) | `urn:adl:profile:portfolio:1.0` | Draft | Agent inventory, relationships, and domain membership |
| [Healthcare](./healthcare/) | `urn:adl:profile:healthcare:1.0` | Draft | HIPAA compliance, PHI handling, clinical safety, FHIR interoperability |
| [Financial](./financial/) | `urn:adl:profile:financial:1.0` | Draft | PCI-DSS, SOX, GLBA, MiFID II, AML/KYC compliance |

## Profile Versioning

Profiles are versioned independently of the core ADL specification. Each profile declares which ADL versions it is compatible with in its `COMPATIBILITY.md` file.

- Profile versions follow [Semantic Versioning](https://semver.org/)
- A profile version remains compatible with ADL versions it declares
- When ADL introduces breaking changes, profiles release new versions as needed

## Proposing a New Profile

1. Open an issue using the [profile proposal template](../.github/ISSUE_TEMPLATE/profile_proposal.md)
2. Discuss scope, requirements, and target ADL compatibility
3. Create a directory under `profiles/` with:
   - `README.md` — Scope, status, maintainers
   - `COMPATIBILITY.md` — ADL version compatibility
   - `1.0/profile.md` — Profile specification
   - `1.0/examples/` — Example ADL documents using the profile
4. Submit a PR for review

## Profile Requirements

Profiles **MUST NOT**:
- Redefine core ADL members
- Conflict with other profiles

Profiles **MAY**:
- Add new top-level members
- Add members to existing objects
- Define additional validation rules
- Require specific values for optional members

## See Also

- [ADL Specification — Section 13: Profiles](../versions/0.1.0/spec.md#13-profiles)
- [Contributing Guide](../CONTRIBUTING.md)
