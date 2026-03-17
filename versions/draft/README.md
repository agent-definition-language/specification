# Agent Definition Language (ADL) — Version 0.2.0

This directory contains the specification for ADL v0.2.0.

> **Note:** Version status (draft, released, deprecated) is defined in the root [`manifest.yaml`](../manifest.yaml), not in the directory name.

## Directory Structure

```
0.2.0/
├── spec.md              # Canonical specification (source of truth)
├── spec-manifest.yaml   # Section structure for multi-format generation
├── schema.json          # JSON Schema for validation
├── examples/            # Complete ADL document examples
│   ├── minimal.yaml
│   ├── with-tools.yaml
│   └── production.yaml
├── snippets/            # Code snippets for documentation
│   ├── capabilities/
│   ├── permissions/
│   ├── security/
│   └── ...
├── CONVENTIONS.md       # Specification writing conventions
└── README.md            # This file
```

## Files

| File | Purpose |
|------|---------|
| `spec.md` | The canonical specification document |
| `spec-manifest.yaml` | Section IDs and structure for generating body-specific output (IETF, ISO, LF) |
| `schema.json` | JSON Schema for validating ADL documents |
| `examples/` | Complete, valid ADL document examples |
| `snippets/` | Partial code snippets used in documentation |

## Generating Documentation

The sync script reads this directory and generates:
- Docusaurus documentation site pages
- JSON versions of YAML examples
- Versioned documentation snapshots

See [`scripts/sync-spec.ts`](../../site/scripts/sync-spec.ts) for the generation logic.

## Versioning

ADL follows [Semantic Versioning](https://semver.org/). Version status is managed in the root `manifest.yaml`:

```yaml
versions:
  - id: "0.2.0"
    status: draft  # draft | rc | released | deprecated
```
