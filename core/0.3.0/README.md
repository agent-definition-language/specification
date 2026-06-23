# Agent Definition Language (ADL) — Version 0.3.0 (Draft)

This directory contains the specification for the ADL v0.3.0 working draft.

> **Note:** Version status (draft, released, deprecated) is defined in the root [`manifest.yaml`](../manifest.yaml), not in the directory name.

## Directory Structure

```
draft/
├── spec.md              # Canonical specification (source of truth)
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
| `schema.json` | JSON Schema for validating ADL documents |
| `examples/` | Complete, valid ADL document examples |
| `snippets/` | Partial code snippets used in documentation |

## Versioning

ADL follows [Semantic Versioning](https://semver.org/). Version status is managed in the root `manifest.yaml`:

```yaml
versions:
  - id: "draft"
    status: draft  # draft | rc | released | deprecated
    label: "0.3.0 (Draft)"
```
