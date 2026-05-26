# Proposal: Passport Verification Procedure

**Date:** 2026-05-03
**Status:** Draft
**ADL Version:** 0.2.0 (target: draft → 0.3.0)
**Affects:** `versions/draft/spec.md` (new Section 10.3.1), `versions/draft/schema.json` (no schema change), `packages/adl-core` (new verification module), `packages/adl-agent/examples/openclaw-passport` (reference implementation)

## Summary

Consolidate ADL's passport verification requirements — currently spread across Sections 6.1, 6.3, 10.2, 13, and 18 — into a single normative subsection (proposed §10.3.1 "Verification Procedure") that prescribes the end-to-end verification flow a counterparty MUST follow when accepting an ADL passport. Add a procedural specification of `did:web` resolution as it applies to ADL, mandate the cross-check between inline `cryptographic_identity.public_key` and the resolved DID Document key, and link the discovery endpoint (§6.4) to the verification requirement. Ship a reference implementation at `packages/adl-agent/examples/openclaw-passport/` that demonstrates the full procedure end-to-end.

## Motivation

### The verification responsibility is real but scattered

The current spec describes verification competently but distributes the requirements across at least five sections:

- **§6.1** — Identifier formats imply different trust anchors (TLS, DID, none)
- **§6.3** — `cryptographic_identity.public_key` exists "for signature verification"
- **§10.2** — Defines the algorithm: "remove signature, serialize with JCS, resolve public key, verify"
- **§13** — URN registration: "Verification of agent identity MUST rely on Sections 6.3 and 10.2"
- **§18 (Security Considerations)** — The most explicit normative requirements: implementations **MUST** verify before enforcing permissions; **MUST** reject failed signatures; **MUST** use conformant JCS; **SHOULD** validate signing identity matches provider; **SHOULD** require verified signatures for `confidential`/`restricted` data

A first-time implementer must assemble the full procedure from these five sections. In our own reference implementation work for the OpenClaw integration, this assembly produced ambiguity in three places:

1. **DID:web resolution is deferred entirely to `[W3C.DID]`.** The ADL spec does not describe how an implementer fetches a DID Document, what fields they extract, or what to do when resolution fails. This is correct in that DID:web is normatively defined elsewhere — but it leaves the connection between an ADL passport's `cryptographic_identity.did` and the actual public key used for verification under-specified at the ADL boundary.

2. **The cross-check between inline key and resolved key is implied but not required.** §18 says "validate that the signing identity declared in `cryptographic_identity` matches an expected, trusted identity for the document's declared `provider`." This is closer to provider-allowlisting than to cross-checking the public key bytes. A naive implementation could verify a signature against the inline key without ever resolving the DID Document, defeating the purpose of having a DID.

3. **Discovery (§6.4) does not link back to verification.** A passport fetched via the well-known discovery endpoint is operationally distinct from one received over a peer channel, but the spec treats them identically. There is no normative guidance that says "passports retrieved via discovery inherit the discovery domain's TLS trust anchor as a starting point for identity verification."

### Why a consolidated section helps standardization

ADL is being submitted to IETF as an Internet-Draft. IETF reviewers expect security procedures to be specified end-to-end in one place. A consolidated §10.3.1 makes the verification flow auditable as a unit, simplifies test-vector generation, and produces a single citation target for downstream specifications (e.g., the OpenClaw plugin proposal, the registry profile, A2A integration documents).

### Why ship a reference example alongside

The OpenClaw runtime layer proposal ([2026-03-21-openclaw-runtime-layer.md](./2026-03-21-openclaw-runtime-layer.md)) defines a gateway plugin that validates passports on inbound requests. It cites verification requirements at a high level but does not show the full procedure. A reference implementation under `packages/adl-agent/examples/openclaw-passport/` gives implementers a working code path to compare their own implementations against, and gives the spec an executable test bed for proposed normative text.

## Details

### 1. Proposed Spec Change: New Section 10.3.1 (Verification Procedure)

This proposal contributes the §10.3.1 reserved slot in the reordered Section 10 (see [2026-05-04-section-10-reorganization.md](./2026-05-04-section-10-reorganization.md)). Insert after §10.2 (Attestation) and before §10.4 (Presentation Proof).

#### 10.3.1 Passport Verification Procedure

When a counterparty receives an ADL document — whether through peer exchange, a discovery endpoint (§6.4), a registry, or any other channel — and intends to act on its declarations (provision the agent, route requests to it, grant access, or treat it as authoritative), the counterparty **MUST** perform the verification procedure defined in this section before relying on any declaration in the document.

The procedure is layered: each step gates the next. An implementation **MUST NOT** skip earlier steps to reach later ones, and **MUST NOT** treat a partial verification as sufficient unless this section explicitly allows it.

##### 10.3.1.1 Retrieval Integrity

Before any document-level verification, the counterparty **MUST** establish retrieval integrity:

- If the document was retrieved over the network, retrieval **MUST** use HTTPS with full TLS certificate validation per [RFC9110]. Implementations **MUST NOT** accept ADL documents over plain HTTP from untrusted sources.
- If the document was retrieved from a discovery endpoint (§6.4), the discovery endpoint's TLS authority establishes a starting trust anchor for the listed agents. Implementations **SHOULD** record this authority for use in step 10.3.3.
- If the document was retrieved from local storage, an internal registry, or an air-gapped channel, the counterparty **MUST** record the provenance (path, registry name, channel identifier) for downstream auditing. Such documents **SHOULD** still be cryptographically verified per the remaining steps in this section.

##### 10.3.1.2 Schema Validation

The counterparty **MUST** validate the document against the ADL JSON Schema for the version declared in `adl_spec`. Documents that fail schema validation **MUST** be rejected; their declarations **MUST NOT** be acted upon. This step gates all subsequent verification because subsequent steps assume the document's structure conforms to the schema.

##### 10.3.1.3 Identity Resolution

If the document declares an `id` or `cryptographic_identity.did`, the counterparty **MUST** resolve it to an authoritative public key using the procedure appropriate for the identifier scheme:

- **HTTPS URI `id`** — The counterparty **MUST** dereference the `id` URL over HTTPS. The fetched document **MUST** match the document being verified by canonical byte sequence (per §10.2 / [RFC8785]). If the canonical byte sequences do not match, the document being verified is not the authoritative version published at the canonical URL and **MUST** be rejected unless the counterparty has out-of-band reason to accept it (e.g., a known mirror with an integrity record).
- **`did:web` `cryptographic_identity.did`** — The counterparty **MUST** resolve the DID by fetching `https://{domain}/.well-known/did.json` for top-level identifiers, or `https://{domain}/{path-segments}/did.json` for path-based identifiers, per the `did:web` method specification [W3C.DID-WEB]. The fetched DID Document **MUST** be served over HTTPS with full certificate validation. The counterparty **MUST** extract the public key designated by the DID Document's `assertionMethod` verification relationship. If `assertionMethod` is absent or unresolvable, verification **MUST** fail.
- **URN `id`** — URN identifiers do not resolve. If the document declares only a URN identifier, the counterparty **MUST NOT** rely on the URN for identity verification. The counterparty **MAY** still perform §10.3.1.4 (signature verification) using the inline `cryptographic_identity.public_key`, but **MUST** treat the result as Trust-On-First-Use and **MUST NOT** elevate the document's declarations to a higher trust tier than the channel that delivered it.

##### 10.3.1.4 Public Key Cross-Check

When both an inline `cryptographic_identity.public_key` and a resolved authoritative public key (from §10.3.1.3) are available, the counterparty **MUST** cross-check them:

- The `algorithm` values **MUST** match.
- The `value` byte sequences (after base64 decoding) **MUST** be identical.

If the cross-check fails, the document **MUST** be rejected. A mismatch indicates either document tampering after signing or a misconfigured publisher; in either case, the document cannot be trusted.

When only one public key source is available (e.g., URN-only identifier with inline key, or DID-only identifier without inline key), the counterparty **MUST** record which source was used and **MAY** apply additional policy (such as requiring human review) before acting on the document's declarations.

##### 10.3.1.5 Signature Verification

If the document contains `security.attestation.signature`, the counterparty **MUST** verify it per §10.2:

1. Construct the verification payload by removing the `signature` object from `security.attestation` (preserving all other fields).
2. Serialize the resulting document using JCS [RFC8785].
3. If `signed_content` is `"digest"`, compute the digest using `digest_algorithm` and compare to `digest_value`; reject on mismatch.
4. Verify the signature `value` against the canonical byte sequence (or its digest) using the algorithm in `signature.algorithm` and the public key established in §10.3.1.3 / §10.3.4.

A document that claims a signature but fails verification **MUST** be rejected. A document with no signature **MAY** be accepted only if the counterparty's policy permits unsigned documents from the document's retrieval channel.

##### 10.3.1.6 Temporal Validity

The counterparty **MUST** check the attestation's temporal validity:

- If `security.attestation.expires_at` is in the past, the document **MUST** be rejected unless the counterparty's policy explicitly permits expired attestations (e.g., for offline forensic analysis).
- Implementations **SHOULD** warn when `expires_at` is within 30 days of the current time, per §10.2.

##### 10.3.1.7 Lifecycle Gating

The counterparty **MUST** check `lifecycle.status` per §5.6:

- `retired` — The counterparty **MUST NOT** provision, route to, or otherwise rely on the agent. Verification fails at this step.
- `deprecated` — The counterparty **SHOULD** warn (including `sunset_date` and `successor` if present) and **MAY** continue. Counterparties **SHOULD NOT** onboard new dependencies on deprecated agents.
- `draft` — The counterparty **MUST NOT** provision in production. In development environments, the counterparty **MAY** continue.
- `active` — The counterparty **MAY** continue.

##### 10.3.1.8 Provider–Identity Coherence

The counterparty **SHOULD** verify that the signing identity is coherent with the document's declared `provider`:

- The TLS authority used in §10.3.1.1 (for retrieval) and §10.3.1.3 (for identity resolution) **SHOULD** align with the domain of `provider.url` and the authority component of an HTTPS `id` or the domain segment of a `did:web` identifier.
- When the counterparty maintains a provider allowlist (per §18), the signing identity **MUST** match an entry on that allowlist before the document's declarations are acted upon.

##### 10.3.1.9 Permission and Classification Compatibility

When the counterparty is invoking the agent (rather than merely cataloging it), the counterparty **MUST** apply the deny-by-default permission model (§9) and the data classification rules (§10.4) before completing verification. In particular:

- The agent's declared `permissions.network`, `permissions.filesystem`, `permissions.environment`, and `permissions.execution` **MUST** be applied to subsequent tool invocations.
- When the counterparty is itself an agent, its own `data_classification.sensitivity` **MUST** be at least as high as the data classification of any tool or resource it invokes on the verified agent. This prevents a `public`-classified agent from accessing `confidential` data exposed by a verified peer.

##### 10.3.1.10 Verification Outcome

A verification result **MUST** record, at minimum:
- A boolean overall outcome (`verified` or `not_verified`)
- The result of each step (10.3.1.1 through 10.3.1.9), including which step failed (if any)
- The retrieval channel and trust anchor used
- The public key source(s) used (inline, DID-resolved, or both)

Implementations that operate in `audit` or `permissive` modes (allowing failed verifications to proceed with logging) **MUST** still record the same structure; the outcome is informational rather than gating in those modes. See the OpenClaw runtime layer proposal for an example of mode-gated enforcement.

### 2. Schema Changes

No JSON Schema changes are required. The verification procedure operates on existing fields. The proposal adds normative procedure, not new structure.

### 3. Reference Implementation

The verification procedure ships as a public API in `@adl-spec/core` under `src/verify/` so adapters for any agent runtime — OpenClaw plugins, A2A middleware, Google ADK callbacks, MCP server hooks, LangGraph nodes — can call it without re-implementing the chain. Public exports include `verifyPassport`, `VerifyConfig`, `VerificationOutcome`, `signCanonical`/`verifyCanonical`, `jcsCanonicalize`, `resolveDIDWeb`, `buildDIDDocument`, `fetchDiscoveryDocument`, `buildPassport`, and `signPassport`.

The OpenClaw integration at `packages/adl-agent/examples/openclaw-passport/` is the first reference adapter. It calls `verifyPassport` from core and maps the structured outcome to OpenClaw's `enforce`/`audit`/`permissive` modes. The example demonstrates all ten steps (10.3.1.1 through 10.3.1.10) across three scenarios:

#### 3.1 Consumer Setup (a Mac Mini hosting a personal OpenClaw agent)

`consumer/setup-passport.ts` — A CLI script that:
- Generates an Ed25519 keypair using Node.js built-in `crypto`
- Builds an ADL passport with `id` (HTTPS URI), `cryptographic_identity.did` (`did:web`), and `cryptographic_identity.public_key`
- Signs the passport per §10.2 using JCS canonicalization
- Publishes a `did.json` DID Document to satisfy §10.3.1.3 resolution
- Demonstrates passport presentation by attaching it to outbound requests

#### 3.2 Enterprise Discovery (a company onboarding agents)

`enterprise/enterprise-gateway.ts` — An HTTP server that:
- Loads enterprise agent passports (active, deprecated, with successor) from disk
- Validates each per §10.3.1.2 at startup
- Refuses to serve any passport whose `lifecycle.status` is `retired` (§10.3.1.7)
- Serves `/.well-known/adl-agents` per §6.4
- Serves individual passports under their canonical `id` URLs, ensuring §10.3.1.3's HTTPS-URI cross-check succeeds
- Serves DID Documents at `/.well-known/did.json` and path-based DID Document URLs

#### 3.3 Platform Validation Plugin (the OpenClaw gateway hook)

`platform/passport-validator.ts` — An HTTP proxy that imports `verifyPassport` from `@adl-spec/core` and runs the procedure on every inbound request. Each step returns a structured result; the aggregated result is the `VerificationOutcome` defined in §10.3.1.10. The plugin supports `enforce`, `audit`, and `permissive` modes per the OpenClaw runtime layer proposal.

#### 3.4 Test Cases

The reference implementation includes test cases that exercise each failure mode in §10.3.1:

| Failure Mode | Spec Anchor | Expected Outcome |
|--------------|-------------|------------------|
| Plain HTTP retrieval | §10.3.1.1 | Reject |
| Malformed schema | §10.3.1.2 | Reject |
| HTTPS `id` mismatch with retrieved doc | §10.3.1.3 | Reject |
| DID resolution returns 404 | §10.3.1.3 | Reject |
| Inline key ≠ DID Document key | §10.3.1.4 | Reject |
| Wrong key tries to verify signature | §10.3.1.5 | Reject |
| `expires_at` in the past | §10.3.1.6 | Reject (warn within 30 days) |
| `lifecycle.status: retired` | §10.3.1.7 | Reject |
| Provider authority ≠ TLS authority | §10.3.1.8 | Warn (or reject under allowlist policy) |
| `public` agent invokes `confidential` resource | §10.3.1.9 | Reject |

These test cases also serve as test vectors for §10.3.1 once the spec change is merged.

### 4. Migration and Backward Compatibility

This proposal adds normative procedure but does not change document syntax. Existing 0.2.0 documents remain valid. Existing implementations that perform a subset of the procedure (typically just §10.3.1.5 signature verification) become non-conformant under the new section, but their documents continue to validate. Implementations have until the 0.3.0 release to add the missing steps.

The proposal does not deprecate any existing field. The procedure references existing requirements in §6, §9, §10, and §18 rather than introducing parallel ones.

### 5. Relation to Other Proposals

- **[2026-03-21-openclaw-runtime-layer.md](./2026-03-21-openclaw-runtime-layer.md)** — The OpenClaw plugin's `onAgentProvision` hook is a direct application of §10.3. This proposal lets the plugin proposal cite §10.3.1 as a single anchor instead of stitching together §6, §10.2, and §18.
- **[2026-03-21-openclaw-interoperability.md](./2026-03-21-openclaw-interoperability.md)** — The reverse importer (`adl-cli import-openclaw`) needs to know which verification expectations to assert against imported configurations; §10.3.1 gives it a concrete checklist.
- **[2026-05-02-security-schemes-and-tool-scopes.md](./2026-05-02-security-schemes-and-tool-scopes.md)** — Scope-based authorization runs after verification. §10.3.1 defines what "verified" means before scope checks apply.

## Alternatives

### Alternative A: Keep verification distributed across §6, §10, §13, §18

This is the status quo. It works for sophisticated implementers but produces inconsistent implementations and complicates IETF review. Rejected because the cost of consolidation is low (no new fields, no new behavior — only consolidation of existing requirements) and the benefit (reduced ambiguity, single citation target, executable test vectors) is high.

### Alternative B: Define verification entirely in a separate companion document

Splitting verification into a standalone "ADL Verification" document was considered. Rejected because verification is intrinsic to the passport model — separating it suggests verification is optional or layered, when it is in fact a precondition for relying on any other declaration.

### Alternative C: Defer DID:web procedure to W3C without ADL-level guidance

The current spec does this implicitly. Rejected because the ADL boundary requires concrete guidance on which key to extract (`assertionMethod`), what to do on resolution failure, and how to cross-check against the inline key. These are ADL-specific concerns that W3C's general DID:web specification does not address.

### Alternative D: Make §10.3.1 entirely SHOULD-level (advisory)

Rejected because §18 already establishes MUST-level verification requirements (e.g., "MUST verify the signature before acting on the document's permission or security declarations"). Lowering them in §10.3.1 would weaken the spec. The proposal preserves existing MUST-level requirements and adds MUST-level requirements only where the corresponding security property is non-negotiable (retrieval integrity, schema validation, key cross-check, signature verification, lifecycle gating against retired agents).

## References

- [RFC8785] Rundgren, A., et al., "JSON Canonicalization Scheme (JCS)"
- [RFC9110] Fielding, R., Ed., et al., "HTTP Semantics"
- [W3C.DID] Sporny, M., et al., "Decentralized Identifiers (DIDs) v1.0"
- [W3C.DID-WEB] Steele, O., Sporny, M., "did:web Method Specification"
- ADL Spec §6 (Identity), §9 (Permissions), §10 (Security), §13 (URN registration), §18 (Security Considerations)
- Companion implementation: `packages/adl-agent/examples/openclaw-passport/`
