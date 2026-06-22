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

The protocol release: ADL grows from a single document into a three-document family —
the passport plus a **Trust Protocol** and a **Runtime Protocol** — and the core gains
runtime governance, authorization scopes, budgets, and graceful degradation.

### Added
- **Trust Protocol** — new standalone document (did not exist in 0.2.0): passport
  verification, presentation proof, the Passport section; with its own IANA, Security
  Considerations, and References.
- **Runtime Protocol** — new standalone document: the runtime governor (§1),
  enforcement (§2), the runtime-governance member set (§3–§7), and enforcement evidence
  (§8).
- **Core §9.6 budget envelopes** — new `budget` and `budgetDimension` schema
  definitions.
- **Core §9.7 Sub-Agents and Delegation** — sub-agents split into subordinate personas
  vs external delegation.
- **Core §10.4 Authorization Scopes** — new in the security model.
- **Core §11.5 Degradation** — graceful-degradation responses, with a new
  `degradationResponse` schema definition.
- **New schema documents** — `schema-discovery.json` (self-triaging discovery entries
  carrying a capability description) and `schema-enforcement-record.json` (enforcement
  evidence / governed discovery).
- **Core** — the `VAL-37` URN type rule; `VAL-35a` assigned error code `ADL-6009`.
- Named the three-document family and added a section-layer taxonomy.

### Changed
- **Core/Trust split** — the §10 security model (present since 0.2.0) was reorganized to
  Data Classification, Attestation, Authentication, Authorization Scopes, Encryption,
  with trust concerns moved out into the new Trust Protocol.
- **Protocol** — renamed `X-ADL-*` headers to `ADL-*` (RFC 6648); renamed `protocol.md`
  to `trust-protocol.md`; renumbered the Trust Protocol into standalone sections.
- **Discovery** — reframed for non-deterministic agents; distinguished the ADL document
  from the passport.
- **Release** — the protocol layer is now frozen alongside each spec cut.

### Fixed
- Resolved dangling references and error-code gaps in the draft; repaired the A2A and
  W3C.VC reference URLs; corrected IMDA/CLTC citations and removed non-existent control
  IDs.

### Documentation
- Completed cited references (Core §1.4, §19, and the I-D boilerplate) and added IANA,
  Security Considerations, and References to both protocols; added the D1–D8 figures and
  UML sequence diagrams (multi-hop authorization, governed discovery §6.4); aligned and
  reordered the profile docs to ADL 0.2.x.

## [0.2.0] — 2026-03-18

### Added
- Standard vs vendor **profile taxonomy** (Section 13).
- **Conformance tiers**, passport fields, and the governance record.
- Manifest section structure that drives profile badge rendering.
- Documentation-site **version bridge** (multi-version rendering).

### Changed
- Replaced the `x_` extension mechanism with a structured **`extensions` object** —
  across both the spec and the schema (`x_` patternProperties → an `extensions` `$def`).
- Elevated the **passport model** into the core specification.
- Corrected RFC 2119 keyword usage in the new sections.

### Documentation
- Aligned terminology with **ISO/IEC 22989:2022**; added the ISO-22989 and
  AI-PROTOCOLS informative references; cited the IMDA and CLTC governance studies.

## [0.1.0] — 2026-02-18

Initial release — the ADL document model, the first profile, identity, and the
standards-track scaffolding.

### Added
- Core ADL **data model** and document structure, with composable **data
  classification** as a required core member.
- **Profiles** directory structure and the **governance profile**.
- **HTTPS-first identity model**, discovery, and IANA registrations, including the
  initial IANA profile-registry contents.
- **IETF draft pipeline** — draft generation and spec expansion for standards
  readiness (`draft-nederveld-adl-01`, idnits-clean).
- Examples — metadata and error-source pointers.
- Governance-first framing and patent status.

[Unreleased]: https://github.com/agent-definition-language/specification/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/agent-definition-language/specification/releases/tag/v0.3.0
[0.2.0]: https://github.com/agent-definition-language/specification/releases/tag/v0.2.0
[0.1.0]: https://github.com/agent-definition-language/specification/releases/tag/v0.1.0
