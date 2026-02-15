# Agent Definition Language (ADL)

The **Agent Definition Language (ADL)** is a vendor-neutral, machine-readable specification for describing AI agents and their capabilities, interfaces, and constraints—analogous to [OpenAPI](https://www.openapis.org/) for REST APIs and [AsyncAPI](https://www.asyncapi.com/) for event-driven APIs.

This repository holds the **specification**, **examples**, and **standardization materials** for proposing ADL to multiple standards bodies, including:

- **Linux Foundation** (e.g., OpenAPI Initiative, AAIF — Agentic AI Foundation)
- **IETF** (RFC track)
- **ISO/IEC** (e.g., JTC 1/SC 42 — Artificial Intelligence)
- Other standards organizations as the roadmap evolves

## Design goals

- **Vendor-neutral:** Describe agents without binding to a specific provider or runtime.
- **Machine-readable:** Enable tooling for validation, code generation, and orchestration.
- **Human-friendly:** Support YAML and JSON for authoring and review.
- **Extensible:** Allow custom extensions (`x_*` fields) and domain-specific profiles.
- **Standards-ready:** Structure the spec for submission to multiple standards organizations.

## Specification

- **0.1.0-draft (current):** [versions/0.1.0-draft/spec.md](versions/0.1.0-draft/spec.md) — Full spec (internal draft); JSON, snake_case.
- **Schema (0.1.0):** [versions/0.1.0-draft/schema.json](versions/0.1.0-draft/schema.json)

The Markdown in `versions/` is the source of truth for the draft specification until a standards body publishes an official standard.

## Examples

Example ADL documents are in [examples/](examples/). Minimal valid document (0.1.0, JSON):

```json
{
  "adl": "0.1.0",
  "name": "My Agent",
  "description": "An agent defined with ADL.",
  "version": "1.0.0"
}
```

## Standardization

- **Roadmap:** [standardization/roadmap.md](standardization/roadmap.md)
- **Standards bodies:** [standardization/bodies/](standardization/bodies/) (Linux Foundation, IETF, ISO)

We aim to align with existing DSL standards (OpenAPI, AsyncAPI) and to submit ADL to one or more of the above bodies as the spec stabilizes.

## Repository structure

| Path | Purpose |
|------|---------|
| [versions/](versions/) | Versioned specification (e.g., `0.1.0-draft/spec.md`). |
| [profiles/](profiles/) | Domain-specific profiles (governance, healthcare, financial). |
| [standardization/](standardization/) | Roadmap and per-standards-body notes. |
| [proposals/](proposals/) | Spec and process proposals. |
| [examples/](examples/) | Example ADL YAML/JSON documents. |
| [.github/](.github/) | Issue and PR templates. |

## Participation

- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Governance:** See [GOVERNANCE.md](GOVERNANCE.md).
- **Code of conduct:** See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Use [issues](https://github.com/YOUR_ORG/agent-definition-language/issues) and [pull requests](https://github.com/YOUR_ORG/agent-definition-language/pulls) for spec changes, standardization work, and examples. Replace `YOUR_ORG` with your GitHub org when this repo is under your organization.

## Implementations

Tools and libraries that implement or consume ADL are listed in [IMPLEMENTATIONS.md](IMPLEMENTATIONS.md). If you build one, we welcome a pull request to add it.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
