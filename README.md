# Agent Definition Language (ADL)

The **Agent Definition Language (ADL)** is a vendor-neutral, machine-readable specification for describing AI agents — their identity, permissions, lifecycle, and compliance — in one auditable document. Think of it as [OpenAPI](https://www.openapis.org/) for AI agents.

**Documentation:** [adl-spec.org](https://adl-spec.org)

## Specification

| Version | Spec | Schema | IETF Draft |
|---------|------|--------|------------|
| **0.2.0** (latest) | [spec.md](versions/0.2.0/spec.md) | [schema.json](versions/0.2.0/schema.json) | `draft-nederveld-adl-02` |
| 0.1.0 | [spec.md](versions/0.1.0/spec.md) | [schema.json](versions/0.1.0/schema.json) | `draft-nederveld-adl-01` |

The Markdown in `versions/` is the source of truth for the draft specification until a standards body publishes an official standard. For the full standards strategy, see the [roadmap](standardization/roadmap.md).

## Quick start

Validate an ADL document with the CLI ([Bun](https://bun.sh/) required):

```bash
bunx @adl-spec/cli validate my-agent.yaml
```

## Packages

All packages are published under the `@adl-spec` scope on npm.

| Package | Description |
|---------|-------------|
| [`@adl-spec/core`](packages/adl-core/) | SDK — parsing, validation, and schema utilities |
| [`@adl-spec/generator`](packages/adl-generator/) | Code generation from ADL passports (vanilla TS, Claude SDK) |
| [`@adl-spec/cli`](packages/adl-cli/) | CLI tooling — validate, generate, inspect |
| [`@adl-spec/agent`](packages/adl-agent/) | ADL Explainer AI agent |

## Profiles

Domain-specific profiles extend the core spec for regulated industries. See [adl-spec.org](https://adl-spec.org/profiles/) for full documentation.

| Profile | Path |
|---------|------|
| Governance | [profiles/governance/](profiles/governance/) |
| Registry | [profiles/registry/](profiles/registry/) |
| Healthcare | [profiles/healthcare/](profiles/healthcare/) |
| Financial | [profiles/financial/](profiles/financial/) |
| Portfolio | [profiles/portfolio/](profiles/portfolio/) |

## Repository structure

| Path | Purpose |
|------|---------|
| [versions/](versions/) | Versioned specifications and schemas |
| [packages/](packages/) | SDK, CLI, code generator, and agent tooling |
| [profiles/](profiles/) | Domain-specific profiles |
| [site/](site/) | Documentation site ([adl-spec.org](https://adl-spec.org)) |
| [standardization/](standardization/) | IETF drafts and standards-body roadmap |
| [proposals/](proposals/) | Spec and process proposals |
| [.github/](.github/) | CI workflows, issue and PR templates |

## Participation

- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Governance:** See [GOVERNANCE.md](GOVERNANCE.md).
- **Code of conduct:** See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **Implementations:** See [IMPLEMENTATIONS.md](IMPLEMENTATIONS.md).

Use [issues](https://github.com/Ironstead-Group/agent-definition-language/issues) and [pull requests](https://github.com/Ironstead-Group/agent-definition-language/pulls) for spec changes, standardization work, and examples.

## Intellectual Property

ADL is the subject of US Provisional Patent Application No. 63/985,186 (filed February 18, 2026), assigned to Ironstead Group, LLC. An irrevocable [Patent Non-Assertion Covenant](PATENTS) guarantees that any conforming implementation — including clean-room implementations — may be freely made, used, and distributed without risk of patent assertion. This covenant binds all successors and assigns and contains no defensive termination clause.

The specification is published under the Apache License 2.0 to enable open implementation and adoption. Any standards submission will include appropriate IPR disclosures per the relevant standards body's policies.

See [NOTICE](NOTICE) for full attribution and patent details.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
