# Proposal: Model-Provenance Attestation

**Date:** 2026-05-21
**Status:** Draft
**ADL Version:** 0.2.0 (target: draft → 0.3.0)
**Builds on:** spec §7.1 (Model), §10.2 (Attestation); relates to [2026-05-04-passport-presentation-proof.md](./2026-05-04-passport-presentation-proof.md) (§10.3.2)
**Affects:** `versions/draft/spec.md` (new subsection under §10.2; cross-reference from §7.1), `versions/draft/schema-proof.json` (or a new `schema-model-attestation.json`), `packages/adl-core/src/verify/`, `packages/adl-py/src/adl_spec/verify/`, `versions/draft/test-vectors/verify/` (new vector category 300–309)

## Summary

ADL's `model` member (§7.1) is a **declaration** of the model an agent intends to run — `provider`, `name`, version, parameters. Nothing today produces or verifies **runtime evidence** that the declared model actually served a given request. In practice an AI gateway (see the [ai-gateway pattern](../versions/draft/patterns/ai-gateway.md)) routinely reroutes across providers for cost or availability, falls back to a different model under load, or serves a response from a semantic cache — none of which is visible to a downstream consumer who trusts the passport's `model` declaration.

This proposal defines a **model-provenance attestation**: a signed, request-bound statement from the entity that actually served (or mediated) a model call — typically the AI gateway or the serving runtime — recording the *actual* model, parameters, and serving mode (live / fallback / cache), and binding it to the request. A verifier or auditor can then compare *declared* (`§7.1`) against *attested actual*, and detect drift. It reuses the JCS + Ed25519 attestation machinery of §10.2; the attestor signs with its own ADL identity. Like the presentation proof and delegation chain, it is **optional and graduated** — required where model provenance matters (regulated decisions, safety claims, "we only use frontier models" guarantees), ignored where it doesn't.

## Motivation

### The declaration-vs-reality gap

The passport says an agent runs `anthropic/claude-opus-4-7`. When the agent answers a high-stakes question — a medical triage, a financial recommendation, a compliance determination — the consumer wants to trust that the stated model produced it. But the request likely passed through an AI gateway that:

- **Rerouted** to a cheaper or faster provider under cost/latency policy.
- **Fell back** to a different model when the primary was rate-limited or down.
- **Served from a semantic cache** — no model ran at all for this request.
- **Silently changed parameters** (temperature, max tokens, system prompt injection).

Each is operationally reasonable; each invalidates a naive read of the `model` declaration. For audit, safety attestations, regulatory claims ("this determination was made by a model meeting bar X"), and provenance of AI-generated output, the declaration alone is insufficient. We need runtime evidence.

### Why this is an attestation, and who signs it

The agent cannot credibly attest its own model — it doesn't (and shouldn't) sit below the routing/caching layer. The entity that *does* know what served the request is the **AI gateway or serving runtime**. That entity has its own ADL identity (its own passport/keypair — see the ai-gateway use case, where the gateway is `did:web:helios.example:gateways:egress`) and can sign a statement binding "request R was served by model M in mode X." This is a second kind of attestation alongside the passport (document) attestation of §10.2 — an **execution attestation** about a runtime event rather than about the document.

### Relationship to content provenance

This is the agent-infrastructure analog of content-provenance efforts (C2PA for media): instead of "this image was produced by camera X / edited by tool Y," it is "this agent response was produced by model M, served live / from cache, mediated by gateway G." It complements model cards (which describe a model in general) with per-request evidence.

## Details

### 1. The model-provenance attestation object (new §10.2 subsection)

A model-provenance attestation is a JSON object:

```json
{
  "adl_model_attestation": "1.0",
  "request": { "ref": "01HXB2K8N3M9P4Q5R6S7T8V9W0", "ref_type": "proof_jti" },
  "declared": { "provider": "anthropic", "name": "claude-opus-4-7" },
  "actual":   { "provider": "anthropic", "name": "claude-opus-4-7", "parameters": { "temperature": 0.2, "max_tokens": 1024 } },
  "serving_mode": "live",
  "attestor": "did:web:helios.example:gateways:egress",
  "iat": "2026-05-21T16:04:00Z",
  "signature": { "algorithm": "Ed25519", "value": "<base64url over JCS-canonical attestation minus signature>", "signed_content": "canonical" }
}
```

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `adl_model_attestation` | string | REQUIRED | Format version. **MUST** be `"1.0"`. |
| `request` | object | REQUIRED | Binds the attestation to a specific request. `ref` is the identifier; `ref_type` is one of `proof_jti` (the §10.3.2 proof's `jti`), `request_id`, or `response_digest` (a hash of the served response). |
| `declared` | object | REQUIRED | The model the agent's passport declared (§7.1) — `provider`, `name`, optional version. Lets a verifier compare without re-fetching the passport. |
| `actual` | object | REQUIRED | What actually served the request: `provider`, `name`, optional version, optional `parameters` (the effective inference parameters). |
| `serving_mode` | string | REQUIRED | One of `live` (a fresh model call), `cache` (served from a semantic/response cache; `actual` records the model that produced the cached entry), `fallback` (primary unavailable; `actual` is the substitute), `replay` (deterministic re-serve). |
| `attestor` | string | REQUIRED | The ADL identity (`did:web` or HTTPS `id`) of the entity making the attestation — the gateway or serving runtime. Its key verifies the signature, resolved per §10.3.1.3. |
| `iat` | string | REQUIRED | ISO 8601 time the attestation was produced. |
| `exp` | string | OPTIONAL | ISO 8601 expiry, if the attestation is to be treated as time-limited evidence. |
| `signature` | object | REQUIRED | Ed25519 signature by the `attestor` over the JCS-canonical attestation minus `signature` — same construction as §10.2 / §10.3.2.6.5. |

### 2. Where it sits in the spec

Add a subsection to §10.2 (Attestation), which today covers only the passport's document attestation. The new subsection distinguishes:

- **§10.2.x Document Attestation** (the existing content) — attests the ADL document.
- **§10.2.y Execution (Model-Provenance) Attestation** (this proposal) — attests a runtime event (which model served a request).

Add a cross-reference from §7.1 (Model): the `model` member is a declaration; runtime conformance to it is evidenced by an execution attestation per §10.2.y.

### 3. Producing the attestation

The serving entity (AI gateway or runtime) produces the attestation **as it serves the request**:

1. Determine `actual` (the model/provider/parameters it routed to) and `serving_mode`.
2. Bind to the request via `request.ref` — the presentation proof `jti` if the call carried one, else a request id, else a digest of the served response.
3. Set `declared` from the agent's passport `model`.
4. Sign with the attestor's private key (JCS + Ed25519).

The attestation MAY be returned inline with the response (e.g., an `X-ADL-Model-Attestation` header or a response envelope field) and/or written to an audit log / provenance store keyed by `request.ref`.

### 4. Verifying the attestation (new verifier capability)

A consumer or auditor that requires model provenance:

1. **Parse + structural check** — reject if malformed or missing REQUIRED members.
2. **Attestor signature** — resolve `attestor` (§10.3.1.3) and verify the signature over the JCS-canonical attestation. Reject on failure.
3. **Attestor trust** — the `attestor` MUST be on the verifier's trusted-attestor list (you trust *this* gateway/runtime to report honestly), analogous to the provider allowlist (§10.3.1.8). An attestation from an unknown attestor is `untrusted` and MUST be recorded as such.
4. **Request binding** — `request.ref` MUST match the request/response under audit (the proof `jti`, request id, or response digest).
5. **Temporal** — if `exp` present, not expired.
6. **Conformance policy** — compare `declared` vs `actual` and apply the verifier's policy:
   - `strict`: `actual` MUST equal `declared` (same provider + name [+ version]); any drift → **non-conformant**.
   - `family`: `actual` MUST be within a configured equivalence set of `declared` (e.g., any model meeting a capability bar).
   - `disclose`: drift is permitted but MUST be surfaced (the consumer is told the served model differed).
   - `serving_mode` policy: e.g., `cache` may be disallowed for requests that require a fresh determination.
7. **Record** the outcome (declared, actual, mode, attestor, trust level, conformance result) for audit.

### 5. Graduated enforcement

A new `VerifyConfig`-style knob, `require_model_attestation` (default `false`), plus a `model_conformance_policy` (`strict` | `family` | `disclose`, default `disclose`) and a `trusted_attestors` list. When `require_model_attestation` is `false`, absence is a warn-level no-op. Deployments making model-dependent claims (safety, regulatory, "frontier-only") set it `true` with `strict` or `family`.

### 6. Schema changes

No change to the ADL **document** schema. Publish a model-attestation schema (`versions/draft/schema-model-attestation.json`) describing the object above. It is an independent artifact, like the presentation proof.

## Reference Implementation

Reuses `signCanonical` / `verifyCanonical` / `jcsCanonicalize` (§10.2) and `resolveDIDWeb` (§10.3.1.3).

### TypeScript — `packages/adl-core/src/verify/`

```ts
// model-attestation.ts
export type ServingMode = "live" | "cache" | "fallback" | "replay";
export interface ModelAttestation {
  adl_model_attestation: "1.0";
  request: { ref: string; ref_type: "proof_jti" | "request_id" | "response_digest" };
  declared: { provider: string; name: string; version?: string };
  actual: { provider: string; name: string; version?: string; parameters?: Record<string, unknown> };
  serving_mode: ServingMode;
  attestor: string;
  iat: string;
  exp?: string;
  signature?: { algorithm: "Ed25519"; value: string; signed_content: "canonical" };
}
export function buildModelAttestation(input: Omit<ModelAttestation, "adl_model_attestation" | "signature">): ModelAttestation;
export function signModelAttestation(att: ModelAttestation, attestorPrivateKeyPem: string): ModelAttestation;
export function verifyModelAttestation(
  att: ModelAttestation,
  ctx: { requestRef: string; trustedAttestors: string[]; conformancePolicy: "strict" | "family" | "disclose"; familySets?: Record<string, string[]> },
  opts?: { fetchImpl?: typeof fetch },
): VerificationStepResult[];
```

### Python — `packages/adl-py/src/adl_spec/verify/`

Mirror in `model_attestation.py`: `build_model_attestation`, `sign_model_attestation`, `verify_model_attestation`, with the same conformance-policy and trusted-attestor inputs, reusing `resolve_did_web` (with `fetch_impl` injection for tests).

### Both ports

`verify_model_attestation` returns `VerificationStepResult`s with section IDs under the new §10.2.y so outcomes compose with the existing structures. It is independent of `verify_passport` (an attestation can be verified after the fact, during audit, without the original request context beyond `request.ref`).

## Test Vectors

New category `300–309` under `versions/draft/test-vectors/verify/vectors/`, generated by extending the vector generator. The vector schema gains an optional `model_attestation` input block and `expected.step_outcomes` for the §10.2.y steps.

| Vector | Focus | Expected |
|--------|-------|----------|
| 300 | declared == actual, `live`, trusted attestor, `strict` | conformant |
| 301 | declared == actual, `cache`, policy allows cache | conformant |
| 302 | `family` policy, actual in the declared equivalence set | conformant |
| 303 | drift (declared opus, actual a cheaper model), `disclose` | conformant + disclosed |
| 304 | drift, `strict` | non-conformant (drift) |
| 305 | `cache` serving mode, policy disallows cache for this request | non-conformant (mode) |
| 306 | forged attestor signature | reject (`attestation_signature_invalid`) |
| 307 | attestor not in `trusted_attestors` | reject / `untrusted` |
| 308 | `request.ref` mismatch with the audited request | reject (`request_binding_mismatch`) |
| 309 | expired attestation (`exp` past) | reject (`attestation_expired`) |

Both the TS and Python conformance runners consume the same vectors, intercepting `did:web` resolution for the attestor key via their existing fetch shims.

## Migration & Backward Compatibility

Purely additive. The `model` declaration (§7.1) is unchanged. Model attestation is a separate, optional artifact; no existing passport, proof, or vector changes. Adoption is graduated: implementations add the build/verify APIs, then provenance-sensitive consumers turn `require_model_attestation` on. A future minor release MAY recommend it for agents whose `data_classification` is `confidential`/`restricted` or that make safety/regulatory claims.

## Relation to Standards & Other Work

- **§10.2 Attestation** — reuses the same JCS + Ed25519 signature construction; this is a sibling attestation type (execution vs document).
- **§7.1 Model** — the declaration this attestation provides runtime evidence for.
- **C2PA / content provenance** — conceptual cousin (per-artifact signed provenance); this applies the idea to model-serving events rather than media.
- **AI gateway use case** — the natural producer of these attestations, since it sits between agent and model.
- **Presentation proof (§10.3.2)** — the `request.ref` typically points at the proof's `jti`, tying model provenance to the authenticated request.

## Alternatives

1. **Trust the `model` declaration; no runtime evidence.** The status quo. Rejected for any provenance-sensitive use: declaration ≠ what served the request, especially behind an AI gateway.
2. **Have the agent self-attest its model.** Rejected: the agent sits above the routing/caching layer and cannot credibly know or attest what actually served the request; the serving entity must.
3. **Carry the attestation inside the presentation proof.** Rejected: the proof is produced *before* the model serves the request (it authenticates the inbound call), whereas model provenance is known *after* serving. They are different lifecycle moments; binding by `request.ref` keeps them linked without conflating them.
4. **Use a generic logging/observability record instead of a signed attestation.** Rejected for provenance: unsigned logs are not verifiable evidence and can't be presented to a third party as proof of which model served a request.

## Security Considerations

- **Attestor honesty** — the attestation is only as trustworthy as the attestor. The `trusted_attestors` allowlist is essential; an attestation is evidence *that a trusted gateway/runtime claims* a model served the request, not an independent measurement. (A fully adversarial serving entity can lie; mitigations include independent measurement, TEE-backed attestation, or multi-party corroboration — out of scope here but compatible.)
- **Forgery / swap** — the attestor signature + `request.ref` binding prevent forging an attestation or moving it onto a different request.
- **Replay** — `request.ref` plus optional `exp` bound reuse; an attestation is evidence about one request.
- **Privacy** — `actual.parameters` and `response_digest` may be sensitive; implementations SHOULD scope what is included and MUST NOT embed raw prompts/completions.
- **Cache correctness** — for `serving_mode: cache`, `actual` MUST record the model that produced the cached entry, not the (absent) model for this request, so a `strict` consumer can still reason about provenance.

## References

- [RFC8785] Rundgren, A., et al., "JSON Canonicalization Scheme (JCS)" — attestation signing
- C2PA — Coalition for Content Provenance and Authenticity (conceptual cousin)
- ADL Spec §7.1 (Model), §10.2 (Attestation), §10.3.1 (Verification Procedure), §10.3.2 (Presentation Proof)
- Pattern: [Mediating Agent Egress through an AI Gateway](../versions/draft/patterns/ai-gateway.md)
