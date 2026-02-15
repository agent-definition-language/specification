# Agent Definition Language (ADL) — Version 0.1.0-draft

This directory contains the **draft** specification for ADL v0.1.0 (internal draft of ADL).

- **Status:** Draft (pre-standardization)
- **Source of truth:** [spec.md](./spec.md)
- **Section structure (for generation):** [spec-manifest.yaml](./spec-manifest.yaml) — section IDs and order so the spec can be programmatically turned into body-specific output (IETF, ISO, LF). See [CONVENTIONS.md](./CONVENTIONS.md) and [scripts/README.md](../../scripts/README.md).
- **JSON Schema:** [schema.json](./schema.json) (minimal required fields; full schema TBD)

ADL documents are JSON objects that describe an agent's identity, capabilities, tools, permissions, and runtime requirements. This version uses top-level members `adl`, `name`, `description`, and `version` (snake_case throughout).

## Versioning

ADL follows [Semantic Versioning](https://semver.org/). This draft is not yet stable. Once ratified (e.g., by IETF, Linux Foundation AAIF, or ISO), versioned releases will be published from this repository.
