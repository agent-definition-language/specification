# Proposal: Section 10 (Security) Reorganization

**Date:** 2026-05-04
**Status:** Draft
**ADL Version:** 0.2.0 (target: draft → 0.3.0)
**Affects:** `versions/draft/spec.md` (§10 reorder), [`2026-05-03-passport-verification-procedure.md`](./2026-05-03-passport-verification-procedure.md) (§10.5→§10.3), [`2026-05-04-passport-presentation-proof.md`](./2026-05-04-passport-presentation-proof.md) (§10.6→§10.4), [`2026-05-02-security-schemes-and-tool-scopes.md`](./2026-05-02-security-schemes-and-tool-scopes.md) (Authorization Scopes slot), `packages/adl-core/`, `packages/adl-py/`, `versions/draft/test-vectors/verify/` (regenerate with new IDs)

## Summary

Reorder Section 10 (Security) so the trust-foundation members appear before the runtime authentication and authorization members they enable. The current ordering puts Authentication at §10.1 and Encryption at §10.2 — both runtime/channel concerns — ahead of Attestation (§10.3) and Data Classification (§10.4), which are the foundational mechanisms that make any of the runtime security meaningful. With the in-flight Verification Procedure proposal (§10.5) and Presentation Proof proposal (§10.6) about to land, the misordering would compound: a reader following the spec linearly would encounter authentication mechanisms before learning how passports are signed, verified, or bound to requests. This proposal renumbers the section so the dependency order matches the reading order, and propagates the renumber across the two pending proposals, the implementations, and the conformance vector pack.

## Motivation

### Dependency order ≠ section order

Reading Section 10 today, a first-time implementer sees:

> 10.1 Authentication — `oauth2`, `api_key`, `oidc`, `mtls` …
>
> 10.2 Encryption — TLS minimums, `at_rest` algorithm …
>
> 10.3 Attestation — signing the document, JCS canonicalization …
>
> 10.4 Data Classification — sensitivity levels …

The trust foundation (attestation, classification) appears *after* the authentication mechanisms it secures. Authenticating a peer before establishing how that peer's identity is proven is structurally backwards: the AuthN section depends on attestation to mean anything, but the spec presents AuthN first. This is the same critique that motivated consolidating the verification procedure into §10.5 in the first place — the trust mechanisms were scattered across §6, §10.3, §13, and §18, and a reader had to assemble the procedure from five places.

### The two pending proposals make it worse

The Verification Procedure proposal slots in at §10.5 and the Presentation Proof proposal at §10.6. Once both land, §10 reads:

> 10.1 Authentication
> 10.2 Encryption
> 10.3 Attestation
> 10.4 Data Classification
> 10.5 Verification Procedure
> 10.6 Presentation Proof

The dependency graph is: Data Classification (10.4) and Attestation (10.3) feed into Verification Procedure (10.5), which feeds into Presentation Proof (10.6), which together support Authentication (10.1) at runtime. The graph runs *backwards* through the section numbering. Implementers must read the section out of order, and standardization reviewers — who tend to read linearly — will find the trust story buried under runtime concerns.

### Renumber once, cleanly, before merging

Both pending proposals are still in draft. The implementations exist but have not been merged into a numbered spec release. The conformance vector pack is in `versions/draft/`. This is the cheapest possible window to renumber: every section ID is in pending or draft material; nothing has shipped under the old numbering. Waiting until after the proposals merge would convert this from a documentation move into a breaking spec change with a deprecation period.

## Details

### 1. Target Section 10 Ordering

The reorganization went through two iterations. The first pass (initial draft of this proposal) treated Verification Procedure, Presentation Proof, Authentication, and Authorization as four independent peer sections. Review feedback pointed out that the resulting §10.5 (Authentication) read as orphaned — it described credential schemes that depend on §10.3 + §10.4 for any meaning, and the schema member (`security.authentication`) lived in a different section from the procedure that actually authenticates. The final structure folds passport-based AuthN and credential-based AuthN under a single Authentication parent and treats them as the two complementary paths they always were.

**Final structure:**

| New | Section | Status | Rationale |
|-----|---------|--------|-----------|
| 10.1 | Data Classification (was old §10.4) | existing (REQUIRED) | Foundation. Drives every downstream policy. REQUIRED top-level member. |
| 10.2 | Attestation (was old §10.3) | existing | Signs the passport. Foundation of all identity verification. |
| **10.3** | **Authentication (parent)** | merged | How parties prove identity at runtime. Two complementary paths. |
| 10.3.1 | Passport Verification Procedure | from [2026-05-03 proposal](./2026-05-03-passport-verification-procedure.md) | Agent-to-agent identity. The 10-step procedure. |
| 10.3.2 | Presentation Proof | from [2026-05-04 proposal](./2026-05-04-passport-presentation-proof.md) | Per-request binding (DPoP-style). Prevents passport replay. |
| 10.3.3 | Credential Schemes | reframed from old §10.1 | OAuth 2.1, OIDC, mTLS, API keys for human/external boundaries. |
| 10.4 | Authorization Scopes | from [2026-05-02 proposal](./2026-05-02-security-schemes-and-tool-scopes.md) | Scope-based AuthZ with cross-flow composition. Runs after §10.3 succeeds. |
| 10.5 | Encryption (was old §10.2) | existing | Channel security. Independent of identity. |

The Authentication parent (§10.3) opens with a narrative explaining the two paths — agent-to-agent (§10.3.1 + §10.3.2) and human-or-external (§10.3.3) — and how they compose. The narrative explicitly positions ADL as a layer on top of OAuth 2.1 [RFC9700], not a replacement: ADL adds the agent-identity layer that OAuth 2.1's resource-server protocol does not specify, while §10.3.3 integrates with OAuth 2.1 cleanly at the human/external boundary.

The presentation proof (§10.3.2) is positioned as conceptually equivalent to OAuth 2.1's DPoP [RFC9449] sender-constrained-token mechanism — same threat model, same solution shape — but uses ADL-native primitives (JCS + Ed25519 from §10.2) so language ports do not need a JWT toolchain.

Authorization (§10.4) layers onto both authentication paths with one scope vocabulary. The same `<resource>:<action>` strings authorize a human-via-OAuth request at §10.3.3 and an agent-via-passport request at §10.3.1 + §10.3.2, with the proof's `scopes` member providing sender-constrained per-request scope binding. Multi-hop authorization (human → Agent A → Agent B) defaults to per-hop independent decisions, with optional reduction via OAuth 2.1 Token Exchange [RFC8693] semantics.

### 2. Migration Across Existing Material

#### 2.1 `versions/draft/spec.md`

The four existing subsections (10.1 Authentication, 10.2 Encryption, 10.3 Attestation, 10.4 Data Classification) are renumbered in place to (10.5, 10.7, 10.2, 10.1) and reordered to match the new sequence. **No subsection content changes**; this is a pure structural move. Cross-references within Section 10 (`see §10.3.x`) update to the new numbering.

The pending §10.3 (Verification Procedure), §10.4 (Presentation Proof), and §10.6 (Authorization Scopes) slots are reserved as section-level headers with a one-line "see proposal X" pointer. Concrete content lands when each proposal merges. Reserving the headers up front prevents the next proposal merge from triggering another renumber.

#### 2.2 Pending Proposals

- **[2026-05-03-passport-verification-procedure.md](./2026-05-03-passport-verification-procedure.md)** — the procedure becomes §10.3.1; §10.3.1.1…§10.3.1.10 carry the original ten steps. Cross-references in the proposal that pointed at the old standalone §10.3 (Attestation, in the original ordering) now point at §10.2.
- **[2026-05-04-passport-presentation-proof.md](./2026-05-04-passport-presentation-proof.md)** — the proof procedure becomes §10.3.2; §10.3.2.1…§10.3.2.10 carry the original ten subsections, and the proof-verification sub-steps inside §10.3.2.6 retain their four-deep numbering as §10.3.2.6.1…§10.3.2.6.7. Cross-references to the verification procedure point at §10.3.1.
- **[2026-05-02-security-schemes-and-tool-scopes.md](./2026-05-02-security-schemes-and-tool-scopes.md)** — already declares its target as a new subsection of Section 10. The reorder claims §10.4 for Authorization Scopes; the proposal text is updated to reflect the new number when it merges.

The previous §10.1 (Authentication) credential-scheme content is merged into §10.3.3, reframed and expanded to layer explicitly on OAuth 2.1, OIDC, mTLS, and API key best practices.

#### 2.3 Implementations

Both reference implementations hardcode section IDs as string literals returned in `VerificationStepResult.section`:

- **TypeScript** — `packages/adl-core/src/verify/verify.ts` and `packages/adl-core/src/verify/types.ts`. All `"10.5.N"` literals become `"10.3.N"`. Inline JSDoc and comments update similarly.
- **Python** — `packages/adl-py/src/adl_spec/verify/verify.py`. Identical literal updates.
- **Vector generator** — `packages/adl-core/scripts/generate-test-vectors.ts`. Vector descriptions, `spec_sections`, `blocked_at_section`, and `step_outcomes[].section` all update. The 23 generated JSON files are regenerated with new IDs as a single change.
- **Tests** — `packages/adl-core/tests/verify.test.ts` and `packages/adl-py/tests/test_conformance_vectors.py` carry section ID assertions that update with the rest.

#### 2.4 Documentation and Examples

- **Vector pack** — `versions/draft/test-vectors/verify/SCHEMA.md` and `README.md` (coverage tables and naming convention).
- **OpenClaw example** — `packages/adl-agent/examples/openclaw-passport/README.md` and `run-demo.ts` printout strings.
- **Python README** — `packages/adl-py/README.md` (spec section anchors table).

### 3. Vector File Naming

The vector files are named by ordinal range (e.g., `001-…`, `010-…`, `020-…`) keyed to the spec subsection they exercise. The naming convention in `SCHEMA.md` uses §10.5.N today; under the renumber, it documents §10.3.N. The numeric ranges (`020–029` for identity resolution, `040–049` for signature verification) are kept as-is — they remain unique identifiers within the vector pack and decoupling them from spec numbering avoids a second renumber if the spec ever reshuffles further.

### 4. Migration Strategy

Apply the renumber as a single, atomic change:

1. Land this reorganization proposal.
2. Update the spec, both pending proposals, both implementations, the vector generator, regenerate the 23 vectors, and update all documentation in one pull request.
3. Run TS conformance (`bun test packages/adl-core/tests/conformance-vectors.test.ts`) and Python conformance (`pytest packages/adl-py/tests/`); both **MUST** pass at 23/23 with the new section IDs before the change is merged.

The conformance pack itself is the verification mechanism: if the renumber inadvertently breaks the dependency between section IDs in the spec, in the impl, in the vectors, and in the runners, the pack catches it before it leaves the workstation.

### 5. Backward Compatibility

Nothing has shipped under the old numbering. The Verification Procedure (proposed §10.5) implementation exists in `@adl-spec/core` and `adl-spec` (Python) but is unreleased; the Presentation Proof proposal has not been implemented yet. There is no public consumer of the section-ID strings to support. The renumber is a documentation-only move from the perspective of any external caller of the public API — `verifyPassport` accepts the same input and returns the same outcome shape; only the `section` string values inside `VerificationStepResult` change.

### 6. Why Not Defer

Three alternatives were considered:

- **Defer until after both proposals merge, then renumber with a deprecation period.** Rejected: this turns a low-cost documentation move into a breaking change. The deprecation overhead would propagate to every downstream port.
- **Renumber only the subsection labels and leave the implementations untouched.** Rejected: section IDs in the structured outcome (`VerificationStepResult.section`) are the audit trail that downstream telemetry, governance dashboards, and incident retros consume. Diverging the spec from the impl would silently corrupt the audit story.
- **Keep the existing ordering and add a "structural reading order" guide as a separate appendix.** Rejected: standardization reviewers (IETF, ISO) read sections in document order. An appendix that overrides the section order is exactly the kind of out-of-band guidance that creates implementation drift.

## Alternatives Considered

### Alt A: Single-section refactor (collapse all of §10 into a single subsection-free narrative)

Rewrite §10 as one continuous section without numbered subsections, keyed only by topic. Rejected: profile authors and downstream specs cite specific §10.X.Y identifiers, and removing them would break those citations. Subsection numbering is also valuable for IETF reviewers who reference specific normative paragraphs.

### Alt B: Split into §10 (Trust) and §11 (Runtime Auth)

Move Authentication, Authorization, and Encryption to a new top-level §11. Rejected: this cascades a renumber through every downstream section (§11→§12, §12→§13, etc.) and breaks every external citation of post-§10 sections. The current proposal is contained entirely within §10.

### Alt C: Lexical ordering by member name within §10

Order subsections alphabetically (`Attestation`, `Authentication`, `Authorization`, `Data Classification`, `Encryption`, `Presentation Proof`, `Verification Procedure`). Rejected: lexical order produces an even worse dependency mismatch (Attestation appears between Authentication and Authorization, splitting the runtime pair).

## References

- [2026-05-02-security-schemes-and-tool-scopes.md](./2026-05-02-security-schemes-and-tool-scopes.md) — Authorization Scopes (claims §10.6 slot)
- [2026-05-03-passport-verification-procedure.md](./2026-05-03-passport-verification-procedure.md) — Verification Procedure (renumbered §10.5→§10.3)
- [2026-05-04-passport-presentation-proof.md](./2026-05-04-passport-presentation-proof.md) — Presentation Proof (renumbered §10.6→§10.4)
- ADL Spec §10 (Security) — current ordering being reorganized
