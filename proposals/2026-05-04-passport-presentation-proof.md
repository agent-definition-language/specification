# Proposal: Passport Presentation Proof

**Date:** 2026-05-04
**Status:** Draft
**ADL Version:** 0.2.0 (target: draft → 0.3.0)
**Builds on:** [2026-05-03-passport-verification-procedure.md](./2026-05-03-passport-verification-procedure.md)
**Affects:** `versions/draft/spec.md` (new Section 10.3.2), `packages/adl-core/src/verify/`, `packages/adl-py/src/adl_spec/verify/`, `versions/draft/test-vectors/verify/` (new vector category 100–119), `packages/adl-agent/examples/openclaw-passport/` (presentation endpoint + proof issuance)

## Summary

The verification procedure proposed in §10.3.1 authenticates an ADL passport — does this document genuinely belong to the agent it names? It does not, however, bind the passport to a specific request. A passport that is published at a discoverable URL, shared in a registry, or transmitted over an authenticated channel is replayable: any party that obtains the passport bytes can re-present them as their own for the document's entire validity window. This proposal closes that gap by introducing a **passport presentation proof**: a per-request structured document, signed by the passport's private key, that binds the passport to a specific request URI, method, and timestamp. A counterparty receiving a presentation runs §10.3.1 to authenticate the passport, then runs the procedure proposed here (§10.3.2) to authenticate the *binding*. Without §10.3.2, a leaked passport is a credential-replay vulnerability for its full `expires_at` lifetime; with §10.3.2, the leak grants no useful capability.

## Motivation

### The threat model §10.3.1 does not address

§10.3.1 verifies that an ADL passport was produced by the entity named in `cryptographic_identity` and has not been tampered with. It does not verify that the *presenter* of the passport is the named entity. Passports are designed to be discoverable — they're served at well-known URLs, listed in registries, and exchanged in clear over authenticated channels. Anyone who scrapes Alice's passport from `https://alice.example/agents/foo` can paste it into an `X-ADL-Passport` header and impersonate Alice for as long as the attestation hasn't expired (typically 1 year). The signature inside the passport proves Alice signed *this document*; it doesn't prove she's the one presenting it now.

This is the same gap OAuth solved with DPoP (RFC 9449), TLS solves with mTLS handshakes, and FIDO solves with challenge-response. All three demonstrate possession of a private key in real time, not just possession of bytes the holder of the private key once produced.

### Why an ADL-native proof, not DPoP or HTTP Signatures

Three options were considered:

| Option | Pros | Cons |
|--------|------|------|
| **DPoP (RFC 9449)** — JWT-based proof of possession | Well-known IETF standard; OAuth ecosystem reuse | Brings JWT library footguns (`alg=none`, key confusion, header-vs-claim ambiguity); JWT `alg: EdDSA` support inconsistent across languages; embeds public key in JWT header which collides with the inline passport key |
| **HTTP Message Signatures (RFC 9421)** | Most expressive (sign full request); IETF standard | Complex serialization rules; coverage of derived components like `@request-target` is itself a footgun; ports for less-common languages are immature |
| **ADL-native proof using JCS + Ed25519** | Reuses §10.2 primitives we already implement and have cross-language ports for; consistent mental model with passport signing; zero new crypto surface | Not a recognized IETF flavor; verifiers can't share infrastructure with OAuth/HTTPSig deployments |

The ADL-native option is recommended: it costs zero new crypto infrastructure (we already have JCS canonicalization and Ed25519 signing implemented and conformance-tested in TS and Python), produces a consistent signing model with §10.2, and ports trivially. DPoP-flavored interop can be added in a future profile if a deployment context demands it.

### Why this belongs as §10.3.2, not as another step in §10.3.1

§10.3.1 concerns the passport document. §10.3.2 concerns the *binding* between a passport and a specific request. They're orthogonal:

- A counterparty fetching a passport from a discovery endpoint to populate a registry runs §10.3.1 alone — there's no request to bind.
- A counterparty receiving an inbound agent request runs §10.3.1 + §10.3.2 — both passport authenticity and request binding.

Keeping them separate lets implementations enforce them independently and lets the test vector pack carry distinct categories.

## Details

### 1. Proposed Spec Change: New Section 10.3.2 (Presentation Proof)

Insert after §10.3.1 (Verification Procedure).

#### 10.3.2 Presentation Proof

When an agent acts as the *presenter* of an ADL passport — that is, when it submits its passport in support of a request to a counterparty — it **MUST**, unless §10.3.2.10 explicitly waives the requirement, produce a *presentation proof* that binds the passport to the specific request and demonstrates real-time control of the passport's private key.

When a counterparty acts as the *verifier* of a presentation, it **MUST**, after completing §10.3.1 verification of the passport, perform the procedure in this section before treating the request as authenticated.

##### 10.3.2.1 Threat Model

The presentation proof addresses a single threat: replay of a previously observed or scraped passport. It assumes:

- Passports are not secret. The threat model is that an attacker may obtain a complete, valid, signed passport (from a discovery endpoint, registry, network capture of a prior request, or copy-pasted disclosure).
- The attacker does **not** have access to the corresponding private key.
- The verifier and presenter have synchronized clocks within a tolerance specified by §10.3.2.8.

The presentation proof does **not** address private key compromise; that is a key-rotation concern handled at the attestation level (§10.2 `expires_at`) and by operational rotation policies.

##### 10.3.2.2 Proof Document Structure

A presentation proof **MUST** be a JSON object with the following members:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `adl_proof` | string | REQUIRED | Proof format version. **MUST** be `"1.0"` for this specification. |
| `iss` | string | REQUIRED | The passport's `id` value. The verifier **MUST** confirm this matches the `id` of the accompanying passport. |
| `iat` | string | REQUIRED | ISO 8601 timestamp when the proof was issued. |
| `exp` | string | REQUIRED | ISO 8601 timestamp when the proof expires. **MUST NOT** be more than 5 minutes after `iat`. |
| `jti` | string | REQUIRED | Globally unique proof identifier (recommended: ULID, UUIDv7, or 128-bit base32 random). Used by verifiers for replay prevention. |
| `request` | object | REQUIRED | The request the proof binds to. See §10.3.2.3. |
| `nonce` | string | OPTIONAL | A nonce previously issued by the verifier per §10.3.2.7. |
| `signature` | object | REQUIRED | Ed25519 signature over the JCS-canonical bytes of the proof minus the signature object. Same shape as §10.2 attestation signatures. |

##### 10.3.2.3 Request Binding Object

The `request` member binds the proof to a specific request:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `method` | string | REQUIRED for HTTP transports | Uppercase HTTP method (`GET`, `POST`, etc.). For non-HTTP transports, **MAY** be the literal `"NONE"`. |
| `uri` | string | REQUIRED | The canonical request URI per §10.3.2.6. |

For non-HTTP transports (e.g., A2A over message queues, MCP over stdio), `uri` **MUST** be a stable transport-specific identifier — a topic name, a fully-qualified RPC method, or an A2A skill URI — and `method` **MUST** be `"NONE"`. The intent is that two requests with the same logical target produce the same binding.

##### 10.3.2.4 URI Canonicalization

Before producing or verifying a proof, the `request.uri` value **MUST** be canonicalized:

1. The scheme **MUST** be lowercased.
2. The host (if present) **MUST** be lowercased and **MUST NOT** carry a trailing dot.
3. Default ports **MUST** be stripped (port 80 for `http`, 443 for `https`).
4. The path **MUST** be percent-encoding-normalized: unreserved characters (per RFC 3986) **MUST** be unencoded, and reserved characters **MUST** use uppercase hex (`%2F`, not `%2f`).
5. The query string, if present, **MUST** be preserved verbatim (order-significant).
6. The fragment **MUST** be omitted (fragments are not transmitted; including one in a proof is a defect).

This matches the canonicalization rules in DPoP §4.2 (`htu`) for cross-implementation consistency.

##### 10.3.2.5 Presentation

Two presentation modes are defined:

**Pull (verifier-initiated retrieval)** — the verifier dereferences the passport's `id` URL or `adl_document` URL via HTTPS. No presentation proof is required: the TLS authority that served the document at its canonical URL is the binding, and §10.3.3's URL-equals-document check is sufficient.

**Push (presenter-initiated request)** — the presenter attaches the passport and a presentation proof to its outgoing request. The proof MUST cover the request being made.

For HTTP-based push, the presenter **SHOULD** use the following header convention:

- `X-ADL-Passport`: Base64-encoded passport bytes (YAML or JSON).
- `X-ADL-Passport-URL`: Alternative to `X-ADL-Passport`. Canonical URL the verifier may dereference to retrieve the passport. When both are present, the verifier **MUST** prefer dereferencing.
- `X-ADL-Proof`: Base64-encoded presentation proof JSON.

For non-HTTP transports, the presentation proof **MUST** be carried in a transport-appropriate analog (for example, an A2A `proof` field alongside the `passport` field).

##### 10.3.2.6 Verification Procedure

After §10.3.1 succeeds, the verifier **MUST** perform the following checks. They are gated: failure of an earlier check halts the procedure.

**10.3.2.6.1 Proof Document Parsing.** Decode and parse the proof. A document that is not valid JSON, or that is missing any REQUIRED member from §10.3.2.2, **MUST** be rejected.

**10.3.2.6.2 Issuer Match.** The proof's `iss` **MUST** equal the passport's `id`. A mismatch indicates the proof was constructed for a different passport and **MUST** result in rejection.

**10.3.2.6.3 Temporal Validity.** The current time **MUST** lie between `iat - skew` and `exp + skew`, where `skew` is the value defined in §10.3.2.8. Additionally, `exp - iat` **MUST NOT** exceed 5 minutes; proofs that declare longer lifetimes **MUST** be rejected.

**10.3.2.6.4 Request Binding.** The proof's `request.method` **MUST** equal the actual request's HTTP method (compared case-insensitively, normalized to uppercase). The proof's `request.uri`, after the canonicalization in §10.3.2.4, **MUST** equal the canonicalized form of the actual request URI. Mismatch **MUST** result in rejection.

**10.3.2.6.5 Signature Verification.** The signature **MUST** verify against the JCS-canonical bytes of the proof with its `signature` object removed, using the verification key established by §10.3.4 / §10.3.5 (the same key used to verify the passport itself). Signature failure **MUST** result in rejection.

**10.3.2.6.6 Replay Prevention.** The verifier **MUST** maintain a cache of recently observed `jti` values, scoped to the verifier instance, with a TTL no shorter than the maximum proof lifetime (5 minutes). If the proof's `jti` is found in the cache, the proof **MUST** be rejected. Otherwise, the verifier **MUST** insert the `jti` into the cache before treating the request as authenticated.

**10.3.2.6.7 Nonce Verification (when applicable).** If the verifier has issued a nonce per §10.3.2.7 and the proof includes a `nonce` member, the value **MUST** match the issued nonce. If the verifier requires a nonce (high-security mode) and the proof omits it, the proof **MUST** be rejected.

##### 10.3.2.7 Server-Issued Nonces (High-Security Mode)

A verifier **MAY** require that proofs include a server-issued nonce, providing stronger guarantees than time-based replay prevention alone. When this mode is enabled:

- The verifier issues a nonce via a `WWW-Authenticate: ADL nonce="…"` challenge on a `401 Unauthorized` response, or via a separate challenge endpoint.
- The presenter retrieves the nonce, includes it in the next proof's `nonce` member, and re-issues the request.
- The verifier accepts the nonce only once and only within a configured TTL.

Nonces are **OPTIONAL** in the base specification. Deployments handling `restricted` data classification (§10.1) **SHOULD** require nonces.

##### 10.3.2.8 Clock Skew Tolerance

The default skew tolerance **MUST** be 60 seconds. Implementations **MAY** make this configurable but **MUST NOT** default to a value greater than 5 minutes. Deployments operating across known-unsynchronized environments **SHOULD** advertise their skew tolerance via a verifier-specific configuration mechanism (e.g., `WWW-Authenticate` parameters).

##### 10.3.2.9 Outcome Recording

The verification outcome (§10.3.1.10) **MUST** be extended to record the result of each §10.3.2.6 step using the same `VerificationStepResult` shape, with `section` values `"10.3.2.6.1"` through `"10.3.2.6.7"`. The aggregate outcome's `verified` flag **MUST** require all §10.3.1 and §10.3.2 block-severity steps to pass.

##### 10.3.2.10 Backward Compatibility and Optional Enforcement

To allow incremental adoption:

- Implementations **MAY** provide a `require_proof` configuration flag (default: `false` for backward compatibility, **RECOMMENDED**: `true` for production).
- When `require_proof` is `false` and a proof is absent, §10.3.2 step results **MUST** be recorded with `severity: "warn"` and `passed: true` carrying the detail `"presentation proof not provided (require_proof=false)"`. The aggregate outcome remains `verified` based on §10.3.1 alone.
- When `require_proof` is `true` and a proof is absent, the verifier **MUST** reject the request with a missing-proof step at §10.3.2.6.1, severity `"block"`.

This compatibility window allows existing deployments — including the OpenClaw passport reference example — to upgrade verifiers and presenters incrementally rather than requiring a flag-day migration.

### 2. Schema and Type Changes

No changes to the ADL document JSON Schema. The proof document is a separate artifact carried alongside the passport, not a passport member. A new optional schema for the proof document **MAY** be published at `versions/draft/schema-proof.json`; this is editorial.

### 3. Reference Implementation

#### 3.1 TypeScript

Extend `@adl-spec/core` (`packages/adl-core/src/verify/`):

```ts
// New module: presentation.ts
export function buildPresentationProof(input: BuildProofInput): PresentationProof;
export function signPresentationProof(proof: PresentationProof, privateKeyPem: string): PresentationProof;
export function verifyPresentationProof(proof: PresentationProof, ctx: ProofContext, config: VerifyConfig): VerificationStepResult[];

// Extend verifyPassport with optional proof parameter
export function verifyPassport(input: VerifyInput, config: VerifyConfig): Promise<VerificationOutcome>;
//                                                                    ^^^ no change to call signature
// VerifyInput gains an optional `proof_bytes` and `request_context` field
```

The replay cache will be a simple in-process LRU; multi-instance deployments will need a shared-cache adapter (Redis, etc.) — this is documented but not bundled.

#### 3.2 Python

Mirror the TS API in `adl_spec.verify.presentation`:

```python
def build_presentation_proof(input: BuildProofInput) -> PresentationProof: ...
def sign_presentation_proof(proof: PresentationProof, private_key_pem: str) -> PresentationProof: ...
def verify_presentation_proof(proof: PresentationProof, ctx: ProofContext, config: VerifyConfig) -> list[VerificationStepResult]: ...
```

`VerifyInput` gains optional `proof_bytes` and `request_context` fields.

#### 3.3 Test Vectors

A new vector category at `versions/draft/test-vectors/verify/vectors/`:

| Range | Focus |
|-------|-------|
| 100–104 | Happy path proof verification |
| 105–109 | Issuer mismatch, missing fields |
| 110–114 | Temporal validity (expired, future-dated, oversized lifetime) |
| 115–117 | Request binding (wrong method, wrong URI, canonicalization) |
| 118–119 | Replay (`jti` reuse) |

Approximately 15 new vectors. The vector schema needs a new optional `presentation_proof` input member and additional expected step outcomes for §10.3.2.6.x.

#### 3.4 OpenClaw Example

Update [`packages/adl-agent/examples/openclaw-passport/`](../packages/adl-agent/examples/openclaw-passport/):

- The consumer setup script generates a long-lived keypair for passport signing AND issues a fresh presentation proof for each demo request.
- The platform validator runs §10.3.2 after §10.3.1 with `require_proof: true`.
- A new demo scenario exercises proof failure modes (missing, expired, wrong URI, replay).
- The consumer also hosts a presentation endpoint (`GET https://home.local/agents/personal-assistant`) so the validator can pull-verify the consumer's passport, not just trust the inline header. Combined with §10.3.2, this enables full mutual authentication.

### 4. Migration Path

1. Land §10.3.2 in the draft spec with the conformance vector pack additions.
2. Ship TS and Python implementations with `require_proof: false` default. Both ports gain proof-issuance and proof-verification APIs but neither requires proofs at runtime.
3. Update the OpenClaw example to demonstrate proof issuance/verification. Document the upgrade path for existing deployments.
4. After one minor release, change the default to `require_proof: true`. Existing deployments will need to issue proofs by then.
5. In a future major release, remove the configurability and make proofs mandatory.

### 5. Relation to Other Proposals

- **[2026-05-03-passport-verification-procedure.md](./2026-05-03-passport-verification-procedure.md)** — §10.3.2 explicitly runs *after* §10.3.1 succeeds. The two procedures are orthogonal: §10.3.1 authenticates the passport, §10.3.2 authenticates the binding.
- **[2026-03-21-openclaw-runtime-layer.md](./2026-03-21-openclaw-runtime-layer.md)** — The OpenClaw plugin's `onAgentProvision` hook combines §10.3.1 + §10.6. The plugin's enforcement modes (`enforce`, `audit`, `permissive`) apply to the combined outcome.
- **[2026-05-02-security-schemes-and-tool-scopes.md](./2026-05-02-security-schemes-and-tool-scopes.md)** — Scope-based authorization runs *after* §10.3.2 succeeds. Authentication (§10.3.1 + §10.3.2) precedes authorization (scopes).

## Alternatives

### Alternative A: DPoP / JWT-based proof

Use RFC 9449 DPoP with `alg: EdDSA`. Considered and rejected: brings JWT library complexity (alg confusion attacks, library inconsistency in EdDSA support, a separate base64url'd payload format that requires a different parser path). The ADL-native form reuses primitives we already have conformance vectors for.

### Alternative B: HTTP Message Signatures (RFC 9421)

Sign specific request headers using RFC 9421. Considered and rejected: complex serialization (covered components, derived components, signature input strings), and the canonicalization pitfalls cause cross-implementation drift even within established RFC 9421 ecosystems. The ADL-native form is simpler and more portable.

### Alternative C: Bind via channel (mTLS)

Use mTLS client certificates instead of an in-document proof. Rejected because mTLS requires PKI infrastructure that consumer-grade agent deployments (e.g., a Mac Mini) cannot reasonably provision, and because mTLS doesn't capture the ADL identity model — the certificate's CN/SAN may not match the `id` URL or `did:web` identifier, requiring a parallel binding anyway.

### Alternative D: No proof — rely on TLS to canonical URL

Treat passport retrieval over HTTPS at the canonical URL as sufficient binding. This is what §10.3.1.3 already does for pull mode. Rejected for push mode because it requires every counterparty to dereference the passport URL on every request, which (a) is impractical for high-throughput agent meshes, (b) reveals the request to the passport publisher (privacy leak), and (c) only works when the canonical URL is reachable from the verifier, which is often false in air-gapped or LAN-only deployments.

### Alternative E: Defer indefinitely; accept the replay risk

Accept that passport replay is possible within the validity window and document it as a known limitation. Rejected because the replay window is typically 1 year (the default attestation `expires_at`), which converts a passport leak into a year-long credential compromise. Production-grade agent deployments cannot reasonably accept this exposure.

## References

- [RFC 9449] Fett, D., et al., "OAuth 2.0 Demonstrating Proof of Possession (DPoP)" — inspiration for the issuer/iat/exp/jti/htm/htu/nonce structure
- [RFC 9421] Backman, A., et al., "HTTP Message Signatures" — alternative considered
- [RFC 8785] Rundgren, A., et al., "JSON Canonicalization Scheme (JCS)" — same primitive used by §10.2
- [RFC 3986] Berners-Lee, T., et al., "Uniform Resource Identifier (URI): Generic Syntax" — URI canonicalization basis
- ADL Spec §10.2 (Attestation), §10.1 (Data Classification), §10.3.1 (Verification Procedure)
- Companion implementation: forthcoming at `packages/adl-core/src/verify/presentation.ts` and `packages/adl-py/src/adl_spec/verify/presentation.py`
