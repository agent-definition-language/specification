---
id: overview
slug: overview
title: Overview
sidebar_position: 1
description: "The Registry Profile extends ADL with agent catalog identity, classification, and multi-registry federation capabilities."
keywords: [adl, registry specification, agent catalog, agent registry, agentic ai, agent discovery, agent classification, agent federation]
---

# Registry Profile

**Identifier:** `urn:adl:profile:registry:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

> **Note:** This profile is in **draft** status. The specification is stable for early adoption, but minor changes may occur before 1.0.

## Overview

The Registry Profile extends ADL with agent catalog identity, classification, and federation capabilities. It enables organizations to manage agents across enterprise registries, support multi-path classification, and federate agent definitions across multiple registry instances.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

## Use Cases

- Enterprise agent registries and catalogs
- Multi-path agent classification by business domain
- Agent discovery across organizational boundaries
- Multi-registry federation and synchronization
- Access control scoping (private, internal, public)

## Quick Start

Add the Registry Profile to your ADL document:

```json
{
  "adl_spec": "0.1.0",
  "name": "Compliance Review Agent",
  "description": "Reviews documents for regulatory compliance.",
  "version": "2.0.0",
  "profiles": ["urn:adl:profile:registry:1.0"],
  "registry": {
    "catalog_id": "urn:acme:agents:compliance-review:2.0.0",
    "catalog_classification": [
      {
        "domain": "compliance",
        "subdomain": "document-review",
        "capability": "soc2-review"
      }
    ],
    "visibility": "internal"
  }
}
```

## Additional Members

The Registry Profile adds the following top-level member:

| Member | Required | Description |
|--------|----------|-------------|
| `registry` | **REQUIRED** | Agent catalog identity, classification, and federation information |

### registry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `catalog_id` | string | **REQUIRED** | Unique identifier within the registry catalog |
| `catalog_classification` | array | Optional | Multi-path catalog classification entries |
| `visibility` | string | Optional | Visibility scope: `private`, `internal`, `public` |
| `federation` | object | Optional | Multi-registry publishing configuration |

See the [full specification](./1.0/profile.md) for detailed member definitions and validation rules.

## Relationship to Other Profiles

The Registry Profile is independent — it has no dependencies on other profiles.

- **Portfolio Profile** — Tracks agent relationships and domain alignment. Organizations may use portfolio without a formal registry. Declare both as siblings when you need both.
- **Governance Profile** — Tracks compliance and governance controls. An agent can be governed without being registered, and vice versa.

```json
{
  "profiles": [
    "urn:adl:profile:registry:1.0",
    "urn:adl:profile:governance:1.0",
    "urn:adl:profile:portfolio:1.0"
  ]
}
```

## Specification

- [Profile Specification (1.0)](./1.0/profile.md)
- [Compatibility](./COMPATIBILITY.md)
- [Examples](./1.0/examples/)

## Maintainers

- ADL Working Group

## See Also

- [ADL Specification — Appendix C](../../versions/0.1.0/spec.md#appendix-c-profiles)
- [Portfolio Profile](../portfolio/) — Agent relationships and domain alignment (sibling profile, no dependency)
- [Governance Profile](../governance/) — Compliance and governance controls (sibling profile, no dependency)
