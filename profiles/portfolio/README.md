---
id: overview
slug: overview
title: Overview
sidebar_position: 1
description: "The Portfolio Profile extends ADL with agent relationships and domain membership for managing agent portfolios at scale."
keywords: [adl, portfolio specification, multi-agent, agentic ai, agent orchestration, agent relationships, ai fleet management]
---

# Portfolio Profile

**Identifier:** `urn:adl:profile:portfolio:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

> **Note:** This profile is in **draft** status. The specification is stable for early adoption, but minor changes may occur before 1.0.

## Overview

The Portfolio Profile extends ADL with agent relationships and business domain membership capabilities. It enables organizations to track agent dependencies, composition hierarchies, and business domain alignment at scale using Domain-Driven Design (DDD) concepts.

Catalog identity and classification are handled by the [Registry Profile](../registry/) — a sibling profile with no dependency.

## Use Cases

- Agent dependency tracking and impact analysis
- Orchestrator-to-sub-agent composition mapping
- Domain-driven agent organization (bounded contexts, subdomains)
- Deployment order determination
- Agent relationship visualization

## Quick Start

Add the Portfolio Profile to your ADL document:

```json
{
  "adl_spec": "0.1.0",
  "name": "Customer Service Agent",
  "description": "Handles customer inquiries and support requests.",
  "version": "1.0.0",
  "profiles": ["urn:adl:profile:portfolio:1.0"],
  "relationships": {
    "depends_on": ["urn:adl:acme:knowledge-base-agent:1.0"],
    "orchestrated_by": "urn:adl:acme:support-orchestrator:1.0"
  },
  "domain": {
    "domain_id": "urn:domain:customer-service",
    "subdomain": "inquiries",
    "role": "primary-handler"
  }
}
```

## Additional Members

The Portfolio Profile adds the following top-level members:

| Member | Required | Description |
|--------|----------|-------------|
| `relationships` | At least one* | Agent dependencies and composition relationships |
| `domain` | At least one* | Business/functional domain membership (DDD-aligned) |

\* At least one of `relationships` or `domain` **MUST** be present.

See the [full specification](./1.0/profile.md) for detailed member definitions.

## Key Concepts

### Relationship Tracking
The `relationships` member models agent dependencies (`depends_on`), orchestration hierarchies (`composed_of`, `orchestrated_by`), and peer collaborations (`peers`). This enables deployment ordering, impact analysis, and relationship visualization.

### Domain Alignment
The `domain` member aligns agents with business capabilities using DDD concepts: domain identifiers, subdomains, bounded contexts, and roles within domains.

### Multi-Profile Composition
Organizations that need catalog identity alongside portfolio relationships declare the [Registry Profile](../registry/) as a sibling:

```json
{
  "profiles": [
    "urn:adl:profile:registry:1.0",
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
- [Registry Profile](../registry/) — Agent catalog identity, classification, and federation (sibling profile, no dependency)
