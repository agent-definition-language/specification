# Changelog

All notable changes to the ADL specification are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/). From the next release onward, version
sections are generated from conventional-commit messages (subject = what, body = why)
at release-cut time.

## [Unreleased]

No normative changes to the core 0.3.0 specification. Work since 0.3.0 is release
groundwork:

### Changed
- **Authoring** — the core and profile JSON Schemas are now generated from a single
  TypeBox model, with the emitted output verified structurally identical to the
  committed 0.3.0 schemas (no consumer-visible schema change).
- **Profiles** — profile schemas are now open additive mixins: the per-profile root
  closure was removed so independent profiles compose under `allOf` (spec §13.2), with
  a single closure applied over the composed document.

### Added
- **Profiles** — cross-profile dependencies via `dependsOn` (a dependent profile
  composes its parent by schema URL, e.g. financial → governance).
- **Profiles** — financial and healthcare profile schemas (previously `schema: null`).

## [0.3.0] — 2026-06-03

### Added
- **Protocol** — new Trust and Runtime protocol layer with runtime governance, plus
  the ADL security model.
- **Core** — VAL-37 URN type rule; sub-agents split into subordinate personas and
  external delegation; capability-described, self-triaging discovery entries.
- **Core** — `VAL-35a` assigned error code `ADL-6009`.

### Changed
- **Protocol** — renamed `X-ADL-*` headers to `ADL-*` (RFC 6648).
- **Release** — the protocol layer is frozen alongside each spec cut.

### Documentation
- Spec figures D1–D8 and UML sequence diagrams (incl. multi-hop authorization);
  protocol IANA, Security Considerations, and References sections; reference and
  error-code repairs; profile docs aligned to ADL 0.2.x compatibility.

## [0.2.0] — 2026-03-18

### Changed
- Replaced the `x_` extension mechanism with a structured `extensions` object (schema
  and spec).
- Elevated the passport model into the core specification.

### Added
- Standard vs vendor profile taxonomy (Section 13); conformance tiers, passport
  fields, and the governance record.
- Documentation-site version bridge (multi-version rendering).

### Documentation
- Aligned terminology with ISO/IEC 22989:2022; added ISO-22989 and AI-PROTOCOLS
  informative references; cited IMDA and CLTC governance studies.

## [0.1.0] — 2026-02-18

Initial release.

### Added
- Core ADL data model and document structure, with composable data classification as a
  required core member.
- Profiles directory structure and the governance profile.
- HTTPS-first identity model, discovery, and IANA registrations.
- IETF draft generation pipeline; metadata and error-source-pointer examples.

[Unreleased]: https://github.com/agent-definition-language/specification/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/agent-definition-language/specification/releases/tag/v0.3.0
[0.2.0]: https://github.com/agent-definition-language/specification/releases/tag/v0.2.0
[0.1.0]: https://github.com/agent-definition-language/specification/releases/tag/v0.1.0
