---
id: trust-protocol
slug: /trust
title: "Trust Protocol"
description: "The Trust Protocol — normative procedures for passport verification, presentation proof, and authorization enforcement in agent-to-agent trust."
keywords: [adl, trust protocol, passport verification, presentation proof, agent identity, did:web, authorization, agent-to-agent]
toc_max_heading_level: 3
hide_table_of_contents: false
---

# Trust Protocol

**Version:** 0.1.0-draft
**Status:** Draft

The **Trust Protocol** defines the normative procedures a counterparty performs to establish trust in an ADL agent: verifying a passport, binding a request to a presentation proof, and authorizing agent-to-agent calls. It is the *protocol* layer that sits on top of the *description* layer defined by the [ADL Core specification](/spec). ADL Core declares what an agent is and which credential schemes and scopes it advertises; ADL Trust defines what a verifier **MUST** do with those declarations.

The Trust Protocol is numbered independently as a standalone document: Authentication is §1 and Authorization is §2. Section references outside this range — for example §6.4, §9, §10.1, or §10.2 — refer to the [ADL Core specification](/spec). Conformance test vectors and verification-outcome step identifiers track these Trust Protocol section numbers (e.g., §1.1.5, §1.2.6.6).

The declarative members these procedures operate on — `security.attestation` (Core §10.2), the credential schemes (Core §10.3.3), and the scope declarations (Core §10.4.1–§10.4.2) — are defined in [ADL Core](/spec). This document references them but does not redefine them.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

## The Passport

A **passport** is a compact **identity document** for an agent — smaller than the agent's full [ADL Core](/spec) document — that the agent presents to establish trust with other agents. Where the full ADL Document describes everything about an agent (identity, capabilities, tools, resources, model configuration, permissions, and runtime behavior), the passport carries only what a counterparty needs to answer two questions: *who is this agent?* and *can I trust this document?* The members it carries are defined by [ADL Core](/spec), which is authoritative for their syntax and constraints.

Keeping the passport small matters because it travels on agent-to-agent interactions — attached to a request or dereferenced by URL (§1.2.5) — and is verified on every exchange. A counterparty that needs the agent's complete definition resolves the full ADL Document separately. The passport carries the following members:

| Member | ADL Core | Role in trust |
|--------|----------|---------------|
| `adl_spec` | §4 | Spec version; selects the JSON Schema used for validation (§1.1.2). |
| `id` | §6 | The agent's stable identifier — an HTTPS URI or URN — resolved to an authoritative key (§1.1.3). |
| `cryptographic_identity.did` | §6.3 | A `did:web` identifier resolved to a DID Document that supplies the verification key (§1.1.3). |
| `cryptographic_identity.public_key` | §6.3 | Inline public key (`algorithm`, `value`), cross-checked against the resolved key (§1.1.4). |
| `security.attestation` | §10.2 | Attestation envelope (`type`, `issuer`, `issued_at`, `expires_at`) carrying the signature and its validity window (§1.1.5–§1.1.6). |
| `security.attestation.signature` | §10.2 | The cryptographic signature over the JCS-canonical document, verified in §1.1.5 (`algorithm`, `value`, `signed_content`). |
| `lifecycle.status` | §5.6 | `active` / `deprecated` / `retired` / `draft`; gates whether the agent may be provisioned (§1.1.7). |
| `provider` | §6 | The publisher's identity, checked for coherence with the signing authority (§1.1.8). |
| `permissions`, `data_classification` | §9, §10.1 | The agent's declared access surface and sensitivity, applied when it is invoked (§1.1.9). |
| `security.scopes` | §10.4.1 | The agent's standing authorization ceiling for agent-to-agent calls (§2.2). |

A passport is **verifiable** when it carries a resolvable `id` (or `cryptographic_identity.did`) together with a `security.attestation.signature`. An ADL document that lacks these can still be consumed as a description, but cannot be cryptographically verified as a passport — §1.1.3 treats a URN-only, unsigned document as Trust-On-First-Use.

## 1 Authentication (Agent-to-Agent)

This section defines the agent-to-agent authentication path: how a counterparty verifies an ADL passport (§1.1) and binds it to a specific request via a presentation proof (§1.2). The complementary human/external-service path — the declarative credential schemes carried in `security.authentication` — is defined in [ADL Core §10.3.3](/spec/next#1033-credential-schemes).

The procedures in §1.1 and §1.2 are procedural rather than declarative: they describe what counterparties **MUST** do when receiving an ADL passport, and apply regardless of whether the passport declares `security.authentication`.

### 1.1 Passport Verification Procedure

When a counterparty receives an ADL document — whether through peer exchange, a discovery endpoint (§6.4), a registry, or any other channel — and intends to act on its declarations (provision the agent, route requests to it, grant access, or treat it as authoritative), the counterparty **MUST** perform the verification procedure defined in this section before relying on any declaration in the document.

The procedure is layered: each step gates the next. An implementation **MUST NOT** skip earlier steps to reach later ones, and **MUST NOT** treat a partial verification as sufficient unless this section explicitly allows it.

#### 1.1.1 Retrieval Integrity

Before any document-level verification, the counterparty **MUST** establish retrieval integrity:

- If the document was retrieved over the network, retrieval **MUST** use HTTPS with full TLS certificate validation per [RFC9110]. Implementations **MUST NOT** accept ADL documents over plain HTTP from untrusted sources.
- If the document was retrieved from a discovery endpoint (§6.4), the discovery endpoint's TLS authority establishes a starting trust anchor for the listed agents. Implementations **SHOULD** record this authority for use in §1.1.3.
- If the document was retrieved from local storage, an internal registry, or an air-gapped channel, the counterparty **MUST** record the provenance (path, registry name, channel identifier) for downstream auditing. Such documents **SHOULD** still be cryptographically verified per the remaining steps in this section.

#### 1.1.2 Schema Validation

The counterparty **MUST** validate the document against the ADL JSON Schema for the version declared in `adl_spec`. Documents that fail schema validation **MUST** be rejected; their declarations **MUST NOT** be acted upon. This step gates all subsequent verification because subsequent steps assume the document's structure conforms to the schema.

#### 1.1.3 Identity Resolution

If the document declares an `id` or `cryptographic_identity.did`, the counterparty **MUST** resolve it to an authoritative public key using the procedure appropriate for the identifier scheme:

- **HTTPS URI `id`** — The counterparty **MUST** dereference the `id` URL over HTTPS. The fetched document **MUST** match the document being verified by canonical byte sequence (per §10.2 / [RFC8785]). If the canonical byte sequences do not match, the document being verified is not the authoritative version published at the canonical URL and **MUST** be rejected unless the counterparty has out-of-band reason to accept it (e.g., a known mirror with an integrity record).
- **`did:web` `cryptographic_identity.did`** — The counterparty **MUST** resolve the DID by fetching `https://{domain}/.well-known/did.json` for top-level identifiers, or `https://{domain}/{path-segments}/did.json` for path-based identifiers, per the `did:web` method specification [W3C.DID-WEB]. The fetched DID Document **MUST** be served over HTTPS with full certificate validation. The counterparty **MUST** extract the public key designated by the DID Document's `assertionMethod` verification relationship. If `assertionMethod` is absent or unresolvable, verification **MUST** fail.
- **URN `id`** — URN identifiers do not resolve. If the document declares only a URN identifier, the counterparty **MUST NOT** rely on the URN for identity verification. The counterparty **MAY** still perform §1.1.5 (signature verification) using the inline `cryptographic_identity.public_key`, but **MUST** treat the result as Trust-On-First-Use and **MUST NOT** elevate the document's declarations to a higher trust tier than the channel that delivered it.

#### 1.1.4 Public Key Cross-Check

When both an inline `cryptographic_identity.public_key` and a resolved authoritative public key (from §1.1.3) are available, the counterparty **MUST** cross-check them:

- The `algorithm` values **MUST** match.
- The `value` byte sequences (after base64 decoding) **MUST** be identical.

If the cross-check fails, the document **MUST** be rejected. A mismatch indicates either document tampering after signing or a misconfigured publisher; in either case, the document cannot be trusted.

When only one public key source is available (e.g., URN-only identifier with inline key, or DID-only identifier without inline key), the counterparty **MUST** record which source was used and **MAY** apply additional policy (such as requiring human review) before acting on the document's declarations.

#### 1.1.5 Signature Verification

If the document contains `security.attestation.signature`, the counterparty **MUST** verify it per §10.2:

1. Construct the verification payload by removing the `signature` object from `security.attestation` (preserving all other fields).
2. Serialize the resulting document using JCS [RFC8785].
3. If `signed_content` is `"digest"`, compute the digest using `digest_algorithm` and compare to `digest_value`; reject on mismatch.
4. Verify the signature `value` against the canonical byte sequence (or its digest) using the algorithm in `signature.algorithm` and the public key established in §1.1.3 / §1.1.4.

A document that claims a signature but fails verification **MUST** be rejected. A document with no signature **MAY** be accepted only if the counterparty's policy permits unsigned documents from the document's retrieval channel.

#### 1.1.6 Temporal Validity

The counterparty **MUST** check the attestation's temporal validity:

- If `security.attestation.expires_at` is in the past, the document **MUST** be rejected unless the counterparty's policy explicitly permits expired attestations (e.g., for offline forensic analysis).
- Implementations **SHOULD** warn when `expires_at` is within 30 days of the current time, per §10.2.

#### 1.1.7 Lifecycle Gating

The counterparty **MUST** check `lifecycle.status` per §5.6:

- `retired` — The counterparty **MUST NOT** provision, route to, or otherwise rely on the agent. Verification fails at this step.
- `deprecated` — The counterparty **SHOULD** warn (including `sunset_date` and `successor` if present) and **MAY** continue. Counterparties **SHOULD NOT** onboard new dependencies on deprecated agents.
- `draft` — The counterparty **MUST NOT** provision in production. In development environments, the counterparty **MAY** continue.
- `active` — The counterparty **MAY** continue.

#### 1.1.8 Provider–Identity Coherence

The counterparty **SHOULD** verify that the signing identity is coherent with the document's declared `provider`:

- The TLS authority used in §1.1.1 (for retrieval) and §1.1.3 (for identity resolution) **SHOULD** align with the domain of `provider.url` and the authority component of an HTTPS `id` or the domain segment of a `did:web` identifier.
- When the counterparty maintains a provider allowlist (per §18), the signing identity **MUST** match an entry on that allowlist before the document's declarations are acted upon.

#### 1.1.9 Permission and Classification Compatibility

When the counterparty is invoking the agent (rather than merely cataloging it), the counterparty **MUST** apply the deny-by-default permission model (§9) and the data classification rules (§10.1) before completing verification. In particular:

- The agent's declared `permissions.network`, `permissions.filesystem`, `permissions.environment`, and `permissions.execution` **MUST** be applied to subsequent tool invocations.
- When the counterparty is itself an agent, its own `data_classification.sensitivity` **MUST** be at least as high as the data classification of any tool or resource it invokes on the verified agent. This prevents a `public`-classified agent from accessing `confidential` data exposed by a verified peer.

#### 1.1.10 Verification Outcome

A verification result **MUST** record, at minimum:
- A boolean overall outcome (`verified` or `not_verified`)
- The result of each step (1.1.1 through 1.1.9), including which step failed (if any)
- The retrieval channel and trust anchor used
- The public key source(s) used (inline, DID-resolved, or both)

Implementations that operate in `audit` or `permissive` modes (allowing failed verifications to proceed with logging) **MUST** still record the same structure; the outcome is informational rather than gating in those modes.

### 1.2 Presentation Proof

§1.1 authenticates a passport — does this document genuinely belong to the agent it names? It does not, however, bind the passport to a specific request. A passport that is published at a discoverable URL, shared in a registry, or transmitted over an authenticated channel is replayable: any party that obtains the passport bytes can re-present them as their own for the document's entire validity window. This subsection closes that gap by defining a per-request **presentation proof**, signed by the passport's private key, that binds the passport to a specific request URI, method, and timestamp.

The presentation proof is conceptually equivalent to OAuth 2.1's sender-constrained-token mechanism (DPoP, [RFC9449]) but uses ADL-native primitives (JCS canonicalization per §10.2 + Ed25519 signing) so that ports across languages do not need a JWT toolchain.

When an agent acts as the *presenter* of an ADL passport — when it submits its passport in support of a request to a counterparty — it **MUST**, unless §1.2.10 explicitly waives the requirement, produce a presentation proof. When a counterparty acts as the *verifier* of a presentation, it **MUST**, after completing §1.1 verification of the passport, perform the procedure in §1.2.6 before treating the request as authenticated.

#### 1.2.1 Threat Model

The presentation proof addresses a single threat: replay of a previously observed or scraped passport. It assumes:

- Passports are not secret. The threat model is that an attacker may obtain a complete, valid, signed passport (from a discovery endpoint, registry, network capture, or copy-pasted disclosure).
- The attacker does **not** have access to the corresponding private key.
- The verifier and presenter have synchronized clocks within a tolerance specified by §1.2.8.

The presentation proof does **not** address private key compromise; that is a key-rotation concern handled at the attestation level (§10.2 `expires_at`) and by operational rotation policies.

#### 1.2.2 Proof Document Structure

A presentation proof **MUST** be a JSON object with the following members:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `adl_proof` | string | REQUIRED | Proof format version. **MUST** be `"1.0"` for this specification. |
| `iss` | string | REQUIRED | The passport's `id` value. The verifier **MUST** confirm this matches the `id` of the accompanying passport. |
| `iat` | string | REQUIRED | ISO 8601 timestamp when the proof was issued. |
| `exp` | string | REQUIRED | ISO 8601 timestamp when the proof expires. **MUST NOT** be more than 5 minutes after `iat`. |
| `jti` | string | REQUIRED | Globally unique proof identifier (recommended: ULID, UUIDv7, or 128-bit base32 random). Used by verifiers for replay prevention. |
| `request` | object | REQUIRED | The request the proof binds to. See §1.2.3. |
| `scopes` | array of strings | OPTIONAL | Per-request requested authorization scopes. When present, the verifier **MUST** check that the array is a subset of the presenter's passport-declared ceiling per §2.2. Sender-constrained scope binding analogous to DPoP-bound access tokens. |
| `nonce` | string | OPTIONAL | A nonce previously issued by the verifier per §1.2.7. |
| `signature` | object | REQUIRED | Ed25519 signature over the JCS-canonical bytes of the proof minus the signature object. Same shape as §10.2 attestation signatures. |

#### 1.2.3 Request Binding Object

The `request` member binds the proof to a specific request:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `method` | string | REQUIRED for HTTP transports | Uppercase HTTP method (`GET`, `POST`, etc.). For non-HTTP transports, **MAY** be the literal `"NONE"`. |
| `uri` | string | REQUIRED | The canonical request URI per §1.2.4. |

For non-HTTP transports (e.g., A2A over message queues, MCP over stdio), `uri` **MUST** be a stable transport-specific identifier — a topic name, a fully-qualified RPC method, or an A2A skill URI — and `method` **MUST** be `"NONE"`. The intent is that two requests with the same logical target produce the same binding.

#### 1.2.4 URI Canonicalization

Before producing or verifying a proof, the `request.uri` value **MUST** be canonicalized:

1. The scheme **MUST** be lowercased.
2. The host (if present) **MUST** be lowercased and **MUST NOT** carry a trailing dot.
3. Default ports **MUST** be stripped (port 80 for `http`, 443 for `https`).
4. The path **MUST** be percent-encoding-normalized: unreserved characters (per [RFC3986]) **MUST** be unencoded, and reserved characters **MUST** use uppercase hex (`%2F`, not `%2f`).
5. The query string, if present, **MUST** be preserved verbatim (order-significant).
6. The fragment **MUST** be omitted (fragments are not transmitted; including one in a proof is a defect).

These rules match DPoP §4.2 (`htu`) [RFC9449] for cross-implementation consistency.

#### 1.2.5 Presentation

Two presentation modes are defined:

**Pull (verifier-initiated retrieval).** The verifier dereferences the passport's `id` URL or `adl_document` URL via HTTPS. No presentation proof is required: the TLS authority that served the document at its canonical URL is the binding, and §1.1.3's URL-equals-document check is sufficient.

**Push (presenter-initiated request).** The presenter attaches the passport and a presentation proof to its outgoing request. The proof **MUST** cover the request being made.

For HTTP-based push, the presenter **SHOULD** use the following header convention:

- `X-ADL-Passport`: Base64-encoded passport bytes (YAML or JSON).
- `X-ADL-Passport-URL`: Alternative to `X-ADL-Passport`. Canonical URL the verifier may dereference to retrieve the passport. When both are present, the verifier **MUST** prefer dereferencing.
- `X-ADL-Proof`: Base64-encoded presentation proof JSON.

For non-HTTP transports, the presentation proof **MUST** be carried in a transport-appropriate analog (for example, an A2A `proof` field alongside the `passport` field).

#### 1.2.6 Verification Procedure

After §1.1 succeeds, the verifier **MUST** perform the following checks. They are gated: failure of an earlier check halts the procedure.

**§1.2.6.1 Proof Document Parsing.** Decode and parse the proof. A document that is not valid JSON, or that is missing any REQUIRED member from §1.2.2, **MUST** be rejected.

**§1.2.6.2 Issuer Match.** The proof's `iss` **MUST** equal the passport's `id`. A mismatch indicates the proof was constructed for a different passport and **MUST** result in rejection.

**§1.2.6.3 Temporal Validity.** The current time **MUST** lie between `iat - skew` and `exp + skew`, where `skew` is the value defined in §1.2.8. Additionally, `exp - iat` **MUST NOT** exceed 5 minutes; proofs that declare longer lifetimes **MUST** be rejected.

**§1.2.6.4 Request Binding.** The proof's `request.method` **MUST** equal the actual request's HTTP method (compared case-insensitively, normalized to uppercase). The proof's `request.uri`, after the canonicalization in §1.2.4, **MUST** equal the canonicalized form of the actual request URI. Mismatch **MUST** result in rejection.

**§1.2.6.5 Signature Verification.** The signature **MUST** verify against the JCS-canonical bytes of the proof with its `signature` object removed, using the verification key established by §1.1.4 / §1.1.5 (the same key used to verify the passport itself). Signature failure **MUST** result in rejection.

**§1.2.6.6 Replay Prevention.** The verifier **MUST** maintain a cache of recently observed `jti` values, scoped to the verifier instance, with a TTL no shorter than the maximum proof lifetime (5 minutes). If the proof's `jti` is found in the cache, the proof **MUST** be rejected. Otherwise, the verifier **MUST** insert the `jti` into the cache before treating the request as authenticated.

**§1.2.6.7 Nonce Verification (when applicable).** If the verifier has issued a nonce per §1.2.7 and the proof includes a `nonce` member, the value **MUST** match the issued nonce. If the verifier requires a nonce (high-security mode) and the proof omits it, the proof **MUST** be rejected.

#### 1.2.7 Server-Issued Nonces

A verifier **MAY** require that proofs include a server-issued nonce, providing stronger guarantees than time-based replay prevention alone. When this mode is enabled:

- The verifier issues a nonce via a `WWW-Authenticate: ADL nonce="…"` challenge on a `401 Unauthorized` response, or via a separate challenge endpoint.
- The presenter retrieves the nonce, includes it in the next proof's `nonce` member, and re-issues the request.
- The verifier accepts the nonce only once and only within a configured TTL.

Nonces are **OPTIONAL** in the base specification. Deployments handling `restricted` data classification (§10.1) **SHOULD** require nonces.

#### 1.2.8 Clock Skew Tolerance

The default skew tolerance **MUST** be 60 seconds. Implementations **MAY** make this configurable but **MUST NOT** default to a value greater than 5 minutes.

#### 1.2.9 Outcome Recording

The §1.1.10 verification outcome **MUST** be extended to record the result of each §1.2.6 step using the same step-result shape, with section values `"1.2.6.1"` through `"1.2.6.7"`. The aggregate outcome's `verified` flag **MUST** require all §1.1 and §1.2 block-severity steps to pass.

#### 1.2.10 Backward Compatibility and Optional Enforcement

To allow incremental adoption:

- Implementations **MAY** provide a `require_proof` configuration flag (default: `false` for backward compatibility, **RECOMMENDED**: `true` for production).
- When `require_proof` is `false` and a proof is absent, §1.2 step results **MUST** be recorded with `severity: "warn"` and `passed: true` carrying the detail `"presentation proof not provided"`. The aggregate outcome remains `verified` based on §1.1 alone.
- When `require_proof` is `true` and a proof is absent, the verifier **MUST** reject the request with a missing-proof step at §1.2.6.1, severity `"block"`.

## 2 Authorization (Enforcement Procedures)

Authentication (§1) establishes *who* a counterparty is. Authorization establishes *what they may do*. The scope *declarations* an agent advertises — `security.scopes` and `tools[*].security.scopes`, together with their inheritance and override rules — are defined in [ADL Core §10.4.1–§10.4.2](/spec/next#104-authorization-scopes). This section defines the *enforcement procedures* a verifier applies to those declarations, uniformly across both authentication paths defined in §1.

### 2.1 Authorization in Human-to-Agent Flows

When the calling party authenticates via §10.3.3 (OAuth 2.1, OIDC, mTLS, or API key), the agent **MUST** authorize the request as follows:

1. **Authenticate first.** §10.3.3 credential validation **MUST** succeed before scope evaluation. Authentication failure short-circuits with a `401 Unauthorized` response (or transport-equivalent) and **MUST NOT** leak which scopes the request was missing.
2. **Extract presented scopes.** For OAuth 2.1 / OIDC, parse the `scope` claim of the access token. For API keys with an out-of-band scope binding, look up the scope set associated with the key. For mTLS, extract scopes from the client certificate (e.g., from a Subject Alternative Name extension or an external attribute store).
3. **Determine required scopes for the requested operation.**
   - For requests that target a specific tool, required = `tools[i].security.scopes` if declared, else `security.scopes`.
   - For requests that target the agent in general (e.g., capability discovery, status), required = `security.scopes`.
4. **Authorize.** The request is authorized iff every member of the required set is present in the presented set. Implementations **MAY** evaluate scope membership case-sensitively (recommended) or per the deployment's OAuth 2.1 server policy.
5. **Reject with structured error.** When authorization fails, respond with HTTP `403 Forbidden` and a `WWW-Authenticate: Bearer error="insufficient_scope", scope="<required scopes>"` header per [RFC6750] §3, and **MUST NOT** leak any data the client was attempting to access.

This procedure is unchanged from standard OAuth 2.1 resource-server behavior; ADL's contribution is only the declarative `tools[*].security.scopes` override semantics.

### 2.2 Authorization in Agent-to-Agent Flows

When the calling party is itself an ADL agent authenticating via §1.1 (passport) and §1.2 (presentation proof), the agent **MUST** authorize the request as follows:

1. **Authenticate first.** §1.1 verification and §1.2.6 proof verification **MUST** succeed before scope evaluation. Authentication failure short-circuits per §1.1.10 / §1.2.9.
2. **Establish the presenter's scope ceiling.** The ceiling is the calling agent's passport `security.scopes`. The ceiling represents the maximum capability the calling agent can ever assert, signed by the calling agent's key as part of the passport (§10.2 attestation).
3. **Extract requested scopes from the proof.** Read the `scopes` member of the presentation proof (§1.2.2). When omitted, the requested scope set is empty.
4. **Verify ceiling subset.** The proof's `scopes` array **MUST** be a subset of the calling agent's passport `security.scopes` ceiling. A request whose proof asserts a scope outside the ceiling **MUST** be rejected at this step. This is the agent-to-agent analog of OAuth 2.1's authorization-server-issued scope: the passport-attested ceiling is the agent's standing grant, and the proof is its per-request attestation of which slice of that grant it is exercising.
5. **Determine required scopes for the requested operation.** Identical to §2.1 step 3 — tool override or root default.
6. **Authorize.** The request is authorized iff every member of the required set is present in the proof's `scopes` set.
7. **Reject with structured error.** When authorization fails, the rejection **MUST** identify the missing scopes in the structured outcome (§1.1.10 + §1.2.9) and **MAY** include them in a transport-level error response, scoped to information the calling agent already has the right to see.

The proof's signature (§1.2.6.5) covers the `scopes` array as part of the canonical bytes, so the requested scope set is sender-constrained: a third party that intercepts the proof cannot replay it with an expanded scope set.

### 2.3 Composition Across Boundaries (Multi-Hop Authorization)

When a human-authenticated request arrives at Agent A and Agent A subsequently calls upstream Agent B on the human's behalf, two independent authorizations occur:

![UML sequence diagram of multi-hop authorization with three lifelines: Human, Agent A, and Agent B. Step 1, the human sends a request to Agent A carrying an OAuth token with scope S_h. Step 2, Agent A authorizes the human under §2.1, requiring its required_A scopes to be a subset of S_h. Step 3, Agent A invokes upstream Agent B, presenting its passport and a presentation proof carrying scope S_a. Step 4, Agent B authorizes Agent A under §2.2: first a ceiling check that the proof scopes are a subset of Agent A's passport scopes, then that Agent B's required_B scopes are a subset of the proof scopes. Step 5, Agent B returns a result to Agent A; step 6, Agent A returns a result to the human. A closing note states the two authorizations are independent: Agent A's outbound scope S_a is bounded only by its passport ceiling, not by S_h, and each hop keeps its own audit record so no single hop sees the whole chain.](./diagrams/multi-hop-authorization-sequence.svg)

*Figure: The two independent authorizations across the hop boundary — §2.1 (human → Agent A) and §2.2 (Agent A → Agent B). This is one representative trace: the §2.1/§2.2 checks run identically every time, while the agent's discovery of which counterparty to call is emergent.*

The two authorizations are **independent**:

- The human's scope set `S_h` authorizes the request *to* Agent A. It is not, by default, propagated upstream.
- Agent A's outbound scope set `S_a` is constrained only by Agent A's own passport ceiling — not by `S_h`.
- Agent B authorizes Agent A purely on the basis of `S_a` and `required_B`. Agent B does not (and cannot, without additional mechanism) see `S_h`.

Implementations **MAY** apply additional per-hop policy. The two common patterns:

- **Independent (default).** Each hop's authorization is its own decision. Recommended for most deployments. Audit MUST record both authorizations.
- **Reduction (delegated).** Agent A computes `S_a = S_a_max ∩ map(S_h)` where `S_a_max` is its passport ceiling and `map(...)` projects human-scope vocabulary to upstream-scope vocabulary. This is conceptually equivalent to OAuth 2.1 Token Exchange [RFC8693] with `actor_token` set to Agent A's passport. Implementations that adopt this pattern **MUST** document the mapping and **MUST** record the source human scopes in the audit trail.

In all cases, implementations **MUST** maintain an audit record per hop containing: the inbound credential's scopes, the tool invoked, the required scopes, and the outcome. The audit chain reconstructs end-to-end authority even though no single hop sees the entire chain.

### 2.4 Effective Scope Computation

For a single authorization decision at any hop:

```
required = tools[i].security.scopes  if declared, else  security.scopes
presented = OAuth token scopes  ∪  proof.scopes  ∪  out-of-band binding for key/cert  (whichever applies)
effective = required ∩ presented
authorized = (required ⊆ presented)
```

When `authorized` is false, `(required \ presented)` (set difference) gives the missing-scope list returned in the structured error.

For agent-to-agent specifically, the additional ceiling check is:

```
ceiling = caller_passport.security.scopes
ceiling_satisfied = (proof.scopes ⊆ ceiling)
```

A request fails authorization if `ceiling_satisfied` is false, even when `authorized` would be true. The ceiling check **MUST** run before the required-scope check; an out-of-ceiling request is a misbehavior that the verifier **MUST** distinguish from an insufficient-scope request in audit logs.

### 2.5 Composition with §1 Authentication

Authorization (§2) **MUST** be evaluated only after authentication (§1) succeeds. The relationship is strictly layered:

| Step | What it establishes |
|------|---------------------|
| §1.1 Verification Procedure | The passport is authentic and the calling identity is who it claims |
| §1.2 Presentation Proof | The current request is bound to that identity right now |
| §10.3.3 Credential Schemes | An OAuth 2.1 / OIDC / mTLS / API-key bearer is present (for non-agent callers) |
| §2 Authorization Scopes | The authenticated party may perform this specific operation |

A failure at any §1 step **MUST** prevent §2 evaluation. Conversely, §2 success without §1 success is a defect — implementations **MUST NOT** authorize requests against unauthenticated identities, even when the requested scope set looks sufficient. This is the OAuth 2.1 `unauthenticated → no scope decision` invariant carried into the agent-to-agent path.

### 2.6 Examples

**Root + per-tool override:**

```json
{
  "security": {
    "scopes": ["invoices:read", "invoices:write"]
  },
  "tools": [
    { "name": "list_invoices",       "security": { "scopes": ["invoices:read"] } },
    { "name": "approve_invoice",     "security": { "scopes": ["invoices:write", "invoices:approve"] } },
    { "name": "search_help",         "security": { "scopes": [] } }
  ]
}
```

`list_invoices` narrows the root requirement to read-only. `approve_invoice` adds a tool-specific `invoices:approve` scope beyond the root. `search_help` explicitly requires no scopes (e.g., a public help search).

**Agent-to-agent presentation proof carrying scopes:**

```json
{
  "adl_proof": "1.0",
  "iss": "https://agents.acme.example/finance-bot",
  "iat": "2026-05-06T14:30:00Z",
  "exp": "2026-05-06T14:35:00Z",
  "jti": "01HW8YQ7K9X2N3T4M5R6S7V8W9",
  "request": {
    "method": "POST",
    "uri": "https://agents.acme.example/invoice-processor/tools/approve_invoice"
  },
  "scopes": ["invoices:write", "invoices:approve"],
  "signature": { "algorithm": "Ed25519", "value": "...", "signed_content": "canonical" }
}
```

The verifier (`invoice-processor`) checks that `["invoices:write", "invoices:approve"]` is a subset of `finance-bot`'s passport ceiling, then checks that the `approve_invoice` tool's required scopes are a subset of those, then proxies the call.
