# Portfolio Profile

The Portfolio Profile extends ADL with agent inventory, relationships, and domain membership capabilities for managing agent portfolios at scale.

## Scope

This profile addresses:

- **Inventory management** — Catalog identifiers, classification, tags, visibility
- **Agent relationships** — Dependencies, composition, orchestration, peer relationships
- **Domain membership** — Business domain alignment using DDD concepts (domains, subdomains, bounded contexts)

## Status

| Version | Status | ADL Compatibility |
|---------|--------|-------------------|
| 1.0     | Draft  | 0.1.x             |

## Identifier

```
urn:adl:profile:portfolio:1.0
```

## Quick Start

```json
{
  "adl_spec": "0.1.0",
  "name": "Customer Service Agent",
  "description": "Handles customer inquiries and support requests.",
  "version": "1.0.0",
  "profiles": ["urn:adl:profile:portfolio:1.0"],
  "inventory": {
    "catalog_id": "cs-agent-001",
    "classification": {
      "category": "support",
      "type": "conversational"
    },
    "tags": ["customer-service", "support", "tier-1"],
    "visibility": "internal"
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

- [ADL Specification — Appendix C](../../versions/0.1.0/spec.md#appendix-c-profiles)
