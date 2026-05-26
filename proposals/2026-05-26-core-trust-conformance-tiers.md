# Proposal: Core / Trust Conformance Tiers and Spec–Protocol Split

**Date:** 2026-05-26
**Status:** Draft
**ADL Version:** 0.2.0 (target: draft → 0.3.0)
**Builds on:** [2026-05-02-security-schemes-and-tool-scopes.md](./2026-05-02-security-schemes-and-tool-scopes.md) (§10.4), [2026-05-03-passport-verification-procedure.md](./2026-05-03-passport-verification-procedure.md) (§10.3.1), [2026-05-04-passport-presentation-proof.md](./2026-05-04-passport-presentation-proof.md) (§10.3.2), [2026-05-04-section-10-reorganization.md](./2026-05-04-section-10-reorganization.md), [2026-05-21-delegation-chains-in-presentation-proof.md](./2026-05-21-delegation-chains-in-presentation-proof.md), [2026-05-21-model-provenance-attestation.md](./2026-05-21-model-provenance-attestation.md)
**Affects:** `versions/draft/spec.md` (splits §10), a new `protocol/draft/protocol.md` train, JSON Schemas, the documentation site (`site/docusaurus.config.ts`, sidebars, `spec-version-bridge.ts`, navbar/sidebar components), and the release/IETF tooling (`release-spec`, `ietf-id-prep`, `sync-spec`, `build-site` skills).

## Summary

ADL has accreted two categorically different kinds of content under one specification: a **declarative description format** (what an agent *is* and *expects* — identity, model, capabilities, permissions, data classification, the security schemes and scopes it advertises) and a **normative trust protocol** (what a counterparty *must do* — verify a passport, bind a request with a presentation proof, validate a delegation chain, check a model-provenance attestation). These have different audiences, different adoption curves, and different standardization tracks.

This proposal **splits the two into named conformance tiers** — **ADL Core** (the description format, the OpenAPI-for-agents layer) and **ADL Trust** (the verification/presentation/delegation/provenance protocol) — and restructures the spec, schemas, site, and tooling to match. The split is largely a *recognition and naming* of a seam that already exists: the proof, delegation, and model-attestation proposals all explicitly state "no change to the ADL **document** schema" and define separate artifacts (`schema-proof.json`, `schema-model-attestation.json`) verified by a separate `verify/` library.

The goal is industry standardization. A description format competes with "nothing" and adopts broadly and fast; a novel agent-identity protocol competes with the OAuth 2.1 consensus (MCP, A2A) and adopts slowly. Bundling them throttles the format to the protocol's speed and forces every implementer to evaluate a contested identity protocol before they can claim ADL support. Splitting lets Core build the installed base that later ratifies Trust, and lets each track version — and standardize (separate IETF Internet-Drafts) — independently.

## Motivation

### Two layers, two audiences, two tracks

- **ADL Core** answers *"describe this agent."* Audience: any agent author, framework, or registry. Competitor: ad-hoc agent cards / undocumented agents. Low resistance.
- **ADL Trust** answers *"how do I trust an agent I did not provision?"* Audience: implementers building cross-org agent meshes. Competitor: OAuth 2.1 + the MCP/A2A delegation model. High resistance; requires `did:web`, key management, signing.

OAuth 2.1 — and therefore MCP and A2A — model *delegated* authority rooted in a present human or registered client. Fully autonomous agents break that assumption: there is no upstream principal to delegate from, so authority must be *intrinsic* to the agent (its passport-attested ceiling, §10.4.4) and rooted in a trust anchor rather than a delegation chain. That intrinsic-identity layer is ADL's differentiation — and it is exactly the layer that should be an opt-in protocol tier on top of a broadly-adopted format, not a precondition for using the format at all.

### The seam already exists

The recent proposals confirm the boundary structurally:

- Delegation chains and model provenance both state **no change to the document JSON Schema**.
- Both define **independent artifacts with their own schemas** (`schema-proof.json`, `schema-model-attestation.json`, a delegation-link schema) and live in `packages/adl-core/src/verify/` and `packages/adl-py/src/adl_spec/verify/`.
- Both are **optional and graduated**, gated by `require_*` config knobs.

The document is the noun; the proof/delegation/attestation are runtime verbs. This proposal formalizes that.

### Delegation vs. attestation (keep them distinct)

"Fully autonomous, no human in the chain" removes *delegated authority* (the human → agent chain), not the *root of trust* (the agent's key still anchors in `did:web`/DNS, a CA, or a registry). The delegation-chains proposal already encodes this correctly (an agent acting on its own standing authority does **not** extend the principal's `act` chain). The one gap: both proposals are framed around a human-rooted principal who "delegated and went away." The fully principal-less case (where `sub.type` is `agent` and authority is purely the passport ceiling) is structurally supported but not first-class, and should be promoted to a worked pattern in the Trust tier.

## Details

### 1. Conformance tiers

| Tier | Conformance means | Schema(s) | Audience |
|------|-------------------|-----------|----------|
| **ADL Core** | Produce/consume a valid, identity-bearing ADL document | `schema.json`, `schema-strict.json` | All agent authors, frameworks, registries |
| **ADL Trust** | Implement §10.3.1 verification + §10.3.2 presentation proof (the `verify/` library + conformance vectors) | `schema-proof.json`, `schema-model-attestation.json`, delegation-link schema | Cross-org agent-mesh implementers |

ADL Trust has graduated sub-capabilities, advertised independently, gated by the knobs the existing proposals already define: `require_proof`, `require_delegation_chain`, `require_principal_grant_verification`, `require_model_attestation`. An implementation declares which tier and sub-capabilities it meets; the conformance vectors (100/200/300 series) map to those capabilities.

### 2. Section mapping (which content goes where)

Dividing principle: **Core = nouns the document declares; Trust = verbs a counterparty performs.** The identity primitive (`id`, `cryptographic_identity`) already lives in §6 Agent Identity and stays in Core.

| Current section | Tier | Notes |
|---|---|---|
| §6 `id`, `cryptographic_identity` | **Core** | The identity primitive. Mandatory. |
| §10.1 Data Classification | **Core** | Declarative, already REQUIRED. |
| §10.2 Attestation **object** (the `signature` shape) | **Core** | The signed envelope is part of the document; producing/embedding it is Core. |
| §10.2 → verifying the signature (the §10.3.1.5 step) | **Trust** | Counterparty behavior. |
| Execution / Model-Provenance Attestation | **Trust** | Runtime evidence + verification. |
| §10.3 intro (two-boundary model) | **Split** | Short declarative pointer stays in Core; procedural framing moves to Trust. |
| §10.3.1 Passport Verification Procedure | **Trust** | Protocol spine. |
| §10.3.2 Presentation Proof (+ §10.3.2.11 Delegation) | **Trust** | Per-request protocol. |
| §10.3.3 Credential Schemes (the *declarations*) | **Core** | "I expect oauth2 with these scopes." Links forward to Trust for verification. |
| §10.4.1–.2 Scope **declaration** + inheritance/override | **Core** | Declarative scope surface. |
| §10.4.3–.7 Authorization **procedures** | **Trust** | Enforcement behavior. |
| §10.4.8 examples | **Split** | Declaration examples → Core; enforcement examples → Trust. |
| §10.5 Encryption | **Core** | Declarative. |
| Patterns (multi-hop-auth, ai-gateway, inbound-verification, exposing-agents) | **Trust** | All describe verification/enforcement flows. |

Core `spec.md` retains the declarative tables in §10.3.3/§10.4.1–.2 and links forward to the Trust document for the verification semantics.

### 3. Content layout and version trains

Core and Trust **must version independently** (the format stabilizes while the protocol iterates). Mirror the existing `versions/` layout with a parallel `protocol/` tree:

```
versions/draft/spec.md            # ADL Core (trimmed §10)
versions/draft/schema.json        # Core document schema
protocol/draft/protocol.md        # ADL Trust (migrated verification/proof/delegation/provenance)
protocol/draft/schema-proof.json
protocol/draft/schema-model-attestation.json
protocol/draft/schema-delegation-link.json
protocol/draft/test-vectors/      # 100/200/300-series conformance vectors
protocol/draft/patterns/          # multi-hop-auth, ai-gateway, etc.
```

Released snapshots of each train are bridged to `site/spec_versioned_docs/` and a new `site/protocol_versioned_docs/`. The Core train continues as 0.2.0 (current) → 0.3.0 (draft). The Trust train starts its own line (proposed 0.1.0 draft), so the protocol can iterate without forcing Core minor bumps. **Open question:** whether Trust 0.1.0 should align numerically with the Core version it is first extracted from, or version purely on its own cadence — recommend its own cadence, with a compatibility matrix on the Standardization page.

### 4. Documentation site changes

The site is Docusaurus with one `plugin-content-docs` instance per versioned thing (`spec`, `profiles`) plus the default preset docs. The single navbar `docsVersionDropdown` no longer suffices with two trains.

**Navigation — two-tier, MCP-style (chosen design).** A persistent **section-tab row** sits under a slim utility bar, and a **single contextual version dropdown** appears in the utility bar *only* on version-aware sections. Because Core Spec and Trust Protocol are separate tabs and a user is only ever in one at a time, exactly one version dropdown is ever shown — the Core train on the Spec tab, the Trust train on the Protocol tab. This resolves the dual-train problem without two competing controls and without pushing the selector into the sidebar.

```
Utility bar:   ADL   [Spec: 0.2.0 ▾  ← shown only on version-aware tabs]      search   Blog   GitHub
Section tabs:  Spec    Protocol    Profiles    Standardization    Implementations    Community
```

On a Spec page the dropdown shows the Core train; on a Protocol page the Trust train; on Profiles / Implementations / Community it is hidden. The active tab is highlighted by route prefix. Examples and Patterns live inside the Spec / Protocol sidebars, not as top-level tabs.

**Implementation reality.** Docusaurus renders a single navbar by default. The two-tier layout (utility row + persistent section tabs) requires **swizzling the Navbar** to add the section-tab row, with active-section detection by route prefix. The contextual version control is a **custom navbar item** that resolves the active plugin (`spec` vs `protocol`) from the route and renders that plugin's versions via `@docusaurus/plugin-content-docs/client` (`useVersions(pluginId)` / `useActiveVersion(pluginId)`), rendering nothing on non-version-aware routes. This supersedes the earlier two-dropdown and sidebar-selector ideas.

**Concrete file-level changes:**

1. `site/docusaurus.config.ts` — add a third `plugin-content-docs` instance:
   ```ts
   { id: 'protocol', path: '../protocol/draft', routeBasePath: '/protocol',
     sidebarPath: './sidebarsProtocol.ts',
     include: ['protocol.md', 'patterns/**/*.{md,mdx}'],
     lastVersion: '...', versions: { current: { label: '... (Draft)', path: 'next', banner: 'unreleased' } } }
   ```
   Add `/protocol` to the search theme's `docsRouteBasePath`; add `/protocol/**` to the llms-txt `includeOrder`; **remove** the navbar `docsVersionDropdown` item (replaced by the contextual component below).
2. `site/src/theme/Navbar/` (swizzled) — render the two-tier layout: utility row + the persistent section-tab row (Spec, Protocol, Profiles, Standardization, Implementations, Community), with active-tab highlighting by route prefix.
3. `site/src/components/ContextualVersionDropdown.tsx` — the route-aware version control for the utility bar; registered as a custom navbar item.
4. `site/src/plugins/spec-version-bridge.ts` — extend `bridgeSpecVersions` to also bridge `protocol/{id}/ → protocol_versioned_docs/`.
5. New `site/sidebarsProtocol.ts` + `site/protocol_versioned_sidebars/`; move the Patterns category out of `sidebarsSpec.ts` into the protocol sidebar.
6. `site/src/plugins/schema-copy` — register the Trust schemas so they are served alongside `schema.json`.
7. `site/docs/standardization/roadmap` — describe the **two-track** standardization story (Core format I-D + Trust protocol I-D) and publish the Core↔Trust compatibility matrix.
8. Landing page — a "Two layers: describe (Core) + trust (Protocol)" section and a conformance-tier explainer. The existing tagline ("The standard for trusted AI agents") already supports this.

### 5. Tooling changes

- `release-spec` and `ietf-id-prep` skills now operate on **two trains** and emit **two Internet-Drafts** (Core format, Trust protocol). This is the literal expression of the "OpenAPI ≠ OAuth-RFC" layering.
- `sync-spec` syncs both `versions/` and `protocol/` to the site.
- `build-site` validates both doc plugins and the new sidebar component.

## Migration & Backward Compatibility

Organizational, not breaking. The document schema is unchanged, so every existing ADL document remains valid ADL Core. The Trust content is *moved*, not redefined; existing §10.3/§10.4 procedural text and the proof/delegation/provenance proposals land in the Trust document under the same normative requirements. URL stability: keep `/spec` redirects for any anchors that move to `/protocol` (Docusaurus client redirects), and have Core's §10.3.3/§10.4 link forward to the relocated Trust sections via `remarkRewriteLinks`. Conformance vectors keep their numbering; only their published location moves under the Trust train.

## Alternatives

1. **Keep everything in one spec (status quo).** Rejected for the standardization goal: couples format adoption to a contested identity protocol and to a single version cadence, and invites standards-body scope-creep pushback.
2. **Single train, Trust as a second doc in the existing `spec` plugin.** Lighter config change, but Core and Trust stay version-locked — defeating the main rationale. Acceptable only as an interim step.
3. **Consolidated "Documentation" mega-dropdown navbar.** Compact, but buries the Core/Trust distinction one click down, weakening the positioning that is the whole point. Rejected in favor of the two-tier section-tab nav.
4. **Two always-visible navbar version dropdowns.** Most explicit, busiest navbar, redundant when reading a single layer. Rejected in favor of one route-aware contextual dropdown.
5. **Version selector in the left sidebar.** Considered (and initially chosen), then superseded by the MCP-style utility-bar placement: with section tabs separating the two trains, a single contextual top-bar dropdown is sufficient and matches an established docs convention, so a sidebar control is unnecessary.

## Relation to Standards & Other Proposals

- **OpenAPI** — the model for the split: OpenAPI describes `securitySchemes` but never defines token-verification procedures; enforcement lives in separate RFCs (OAuth 2.1, DPoP, mTLS). ADL Core ≈ OpenAPI; ADL Trust ≈ the protocol RFCs it references.
- **2026-05-04 Section 10 Reorganization** — this proposal extends that reorg from "reorder within one section" to "split across two conformance tiers / version trains."
- **2026-05-03 / 2026-05-04 / 2026-05-21 proposals** — their verification, presentation-proof, delegation-chain, and model-provenance content becomes the body of the ADL Trust document; their "no document-schema change" statements are the evidence the seam already exists.
- **MCP / A2A** — both rely on OAuth 2.1's delegated-authority model; ADL Trust is the opt-in tier that adds intrinsic agent identity for autonomous, principal-less meshes.

## Open Questions

1. Trust train version numbering: own cadence (recommended) vs. aligned with the Core version it is extracted from.
2. Whether Patterns are Trust-only or a shared third area linked from both.
3. First-class treatment of the fully-autonomous (`sub.type: agent`, no human root) case as a Trust pattern.
