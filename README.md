# Agent Definition Language (ADL)

The **Agent Definition Language (ADL)** is a vendor-neutral, machine-readable specification for describing AI agents — their identity, permissions, lifecycle, and compliance — in one auditable document. Think of it as [OpenAPI](https://www.openapis.org/) for AI agents.

**Documentation:** [adl-spec.org](https://adl-spec.org)

## Why ADL?

Protocols like [MCP](https://modelcontextprotocol.io/) describe how agents connect to tools. [A2A](https://google.github.io/A2A/) describes how agents communicate. Neither answers the governance questions enterprises need before deploying agents: **who is this agent, what is it allowed to do, and who authorized it?**

ADL fills that gap as the governance layer above communication and tooling protocols:

- **Deny-by-default permissions** with auditable boundaries for network, data, and execution
- **Compliance mappings** for NIST 800-53, SOC 2, ISO 27001, and the EU AI Act
- **Lifecycle management** with status tracking, sunset dates, and successor chains
- **Interoperability** — generates A2A Agent Cards and MCP configurations from a single source of truth

Without a standard like ADL, every organization invents its own way to describe and constrain agents, making cross-vendor interoperability, auditing, and regulatory compliance harder than it needs to be.

## Design goals

- **Vendor-neutral:** Describe agents without binding to a specific provider or runtime.
- **Machine-readable:** Enable tooling for validation, code generation, and orchestration.
- **Human-friendly:** Support YAML and JSON for authoring and review.
- **Extensible:** Allow custom extensions (`x_*` fields) and domain-specific profiles.
- **Standards-ready:** Structure the spec for submission to multiple standards organizations.

## Specification

- **0.1.0 (current draft):** [versions/0.1.0/spec.md](versions/0.1.0/spec.md)
- **JSON Schema:** [versions/0.1.0/schema.json](versions/0.1.0/schema.json)

The Markdown in `versions/` is the source of truth for the draft specification until a standards body publishes an official standard.

## Examples

Example ADL documents are in [versions/0.1.0/examples/](versions/0.1.0/examples/). Minimal valid document (YAML):

```yaml
adl_spec: "0.1.0"
name: My Agent
description: An agent defined with ADL.
version: "1.0.0"

data_classification:
  sensitivity: public
```

## CLI

The [`@adl-spec/cli`](https://www.npmjs.com/package/@adl-spec/cli) package provides validation and tooling for ADL documents.

```bash
npm install -g @adl-spec/cli
adl validate my-agent.yaml
```

Source: [packages/adl-cli/](packages/adl-cli/)

## Standardization

ADL has been submitted to the **IETF** as Internet-Draft [`draft-nederveld-adl-01`](standardization/output/) (Standards Track, individual submission) with an IANA media-type registration provision.

For the full standards strategy, see the [roadmap](standardization/roadmap.md).

## Repository structure

| Path | Purpose |
|------|---------|
| [versions/](versions/) | Versioned specification (e.g., `0.1.0/spec.md`). |
| [packages/](packages/) | Tooling (`adl-cli`). |
| [site/](site/) | Documentation site ([adl-spec.org](https://adl-spec.org)). |
| [profiles/](profiles/) | Domain-specific profiles (governance, healthcare, financial). |
| [standardization/](standardization/) | Roadmap, IETF drafts, and per-standards-body notes. |
| [proposals/](proposals/) | Spec and process proposals. |
| [.github/](.github/) | CI workflows, issue and PR templates. |

## Participation

- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Governance:** See [GOVERNANCE.md](GOVERNANCE.md).
- **Code of conduct:** See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Use [issues](https://github.com/Ironstead-Group/agent-definition-language/issues) and [pull requests](https://github.com/Ironstead-Group/agent-definition-language/pulls) for spec changes, standardization work, and examples.

## Implementations

Tools and libraries that implement or consume ADL are listed in [IMPLEMENTATIONS.md](IMPLEMENTATIONS.md). If you build one, we welcome a pull request to add it.

## Intellectual Property

ADL is the subject of US Provisional Patent Application No. 63/985,186 (filed February 18, 2026), assigned to Ironstead Group, LLC. The specification is published under the Apache License 2.0 to enable open implementation and adoption. Any standards submission will include appropriate IPR disclosures per the relevant standards body's policies.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
