# Agent Definition Language (ADL) — Specification

The **Agent Definition Language (ADL)** is a vendor-neutral, machine-readable specification for describing AI agents — their identity, permissions, lifecycle, and compliance — in one auditable document. Think of it as [OpenAPI](https://www.openapis.org/) for AI agents.

This repository is the **source of truth for the standard**: the core specification, companion protocols, domain profiles, deployment patterns, the change-proposal process, and conformance vectors.

**Documentation:** [adl-spec.org](https://adl-spec.org) · **Reference implementations:** [agent-definition-language/implementations](https://github.com/agent-definition-language/implementations) · **Governance:** [agent-definition-language/governance](https://github.com/agent-definition-language/governance)

## Specification

| Version | Spec | Schema |
|---------|------|--------|
| **0.3.0** (latest) | [spec.md](core/0.3.0/spec.md) | [schema.json](core/0.3.0/schema.json) |
| 0.2.0 | [spec.md](core/0.2.0/spec.md) | [schema.json](core/0.2.0/schema.json) |
| 0.1.0 | [spec.md](core/0.1.0/spec.md) | [schema.json](core/0.1.0/schema.json) |
| draft (next) | [spec.md](core/_next/spec.md) | [schema.json](core/_next/schema.json) |

The Markdown in `core/` is the source of truth for the specification until a standards body publishes an official standard. Released versions are immutable; active work happens in `core/_next/`.

## Quick start

Validate an ADL document with the CLI (from the reference implementations):

```bash
bunx @adl-spec/cli validate my-agent.yaml
```

## Repository structure

| Path | Purpose |
|------|---------|
| [core/](core/) | Versioned core specifications and JSON schemas (the data model) |
| [protocol/](protocol/) | Companion protocol specs (runtime, trust) — versioned independently |
| [profiles/](profiles/) | Domain-specific profiles (governance, healthcare, financial, portfolio, registry) |
| [patterns/](patterns/) | Non-normative, version-pinned deployment patterns |
| [proposals/](proposals/) | The RFC / change-proposal process |
| [conformance/](conformance/) | Conformance test vectors, scoped by version |

Reference SDKs/CLI/tooling live in the separate [implementations](https://github.com/agent-definition-language/implementations) repo; the documentation site is built and deployed separately and consumes released versions of this repo.

## Profiles

Domain-specific profiles extend the core spec for regulated industries. See [adl-spec.org/profiles](https://adl-spec.org/profiles/) for full documentation.

| Profile | Path |
|---------|------|
| Governance | [profiles/governance/](profiles/governance/) |
| Registry | [profiles/registry/](profiles/registry/) |
| Healthcare | [profiles/healthcare/](profiles/healthcare/) |
| Financial | [profiles/financial/](profiles/financial/) |
| Portfolio | [profiles/portfolio/](profiles/portfolio/) |

## Participation

- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md) (canonical process in the [governance](https://github.com/agent-definition-language/governance) repo)
- **Governance & Code of Conduct:** [governance](https://github.com/agent-definition-language/governance) repo
- **Implementations:** [IMPLEMENTATIONS.md](https://github.com/agent-definition-language/implementations/blob/main/IMPLEMENTATIONS.md)

Use [issues](https://github.com/agent-definition-language/specification/issues) and [pull requests](https://github.com/agent-definition-language/specification/pulls) for spec changes and examples. Substantive (normative) changes start as an RFC under [proposals/](proposals/).

## Intellectual Property

ADL is the subject of US Provisional Patent Application No. 63/985,186 (filed February 18, 2026), assigned to Ironstead Group, LLC. An irrevocable [Patent Non-Assertion Covenant](PATENTS) guarantees that any conforming implementation — including clean-room implementations — may be freely made, used, and distributed without risk of patent assertion. This covenant binds all successors and assigns and contains no defensive termination clause.

The specification is published under the Apache License 2.0 to enable open implementation and adoption. Any standards submission will include appropriate IPR disclosures per the relevant standards body's policies.

See [NOTICE](NOTICE) for full attribution and patent details.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
