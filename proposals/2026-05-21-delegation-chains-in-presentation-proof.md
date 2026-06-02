# Proposal: Delegation Chains in the Presentation Proof

**Date:** 2026-05-21
**Status:** Draft
**ADL Version:** 0.2.0 (target: draft → 0.3.0)
**Builds on:** [2026-05-04-passport-presentation-proof.md](./2026-05-04-passport-presentation-proof.md) (§10.3.2), [2026-05-03-passport-verification-procedure.md](./2026-05-03-passport-verification-procedure.md) (§10.3.1), [2026-05-02-security-schemes-and-tool-scopes.md](./2026-05-02-security-schemes-and-tool-scopes.md) (§10.4)
**Affects:** `versions/draft/spec.md` (extends §10.3.2; touches §10.4.4–§10.4.5), `versions/draft/schema-proof.json` (proof schema), `packages/adl-core/src/verify/`, `packages/adl-py/src/adl_spec/verify/`, `versions/draft/test-vectors/verify/` (new vector category 200–219), `versions/draft/patterns/` (worked examples)

## Summary

The presentation proof (§10.3.2) authenticates *which agent* is making a request and binds the proof to that request. It says nothing about *on whose authority* the agent acts. For a chatbot this is fine — the human is connected and the agent runs in the user's session. For an **autonomous agent** that reasons about a goal and calls other agents and tools without the human present, the missing piece is **provenance**: who is the originating principal, and through which chain of agents did authority reach the agent now making the call?

This proposal adds a **delegation chain** to the presentation proof: a `sub` member identifying the root principal (typically a human, via their OAuth grant) and an `act` member carrying an ordered chain of cryptographically signed, **attenuating** delegation links (each agent → the next). It chooses **delegation over impersonation** — the request always carries both the originating principal *and* the acting agent chain, never a token that pretends the agent *is* the user. This is the ADL-native analog of OAuth 2.0 Token Exchange's `sub`/`act` claims [RFC8693], built from the JCS + Ed25519 primitives ADL already uses (§10.2), with attenuation semantics borrowed from capability systems (UCAN). It closes the gap noted in §10.4.5, where the source principal is required only in the *audit trail* (out of band) — this proposal puts the principal and the delegation chain **on the wire**, cryptographically bound to the request, so a verifier can both authorize and account for it.

## Motivation

### The autonomous-agent provenance problem

A chatbot is easy: the user authenticates, a session is created, and every action runs in the user's context. The principal is implicit and continuously present.

A fully autonomous agent breaks that. It receives a goal, reasons about the steps, and decides which agents and tools to invoke. The human is not in the loop per action — they delegated a task at setup and went away (see [multi-hop-authorization](../versions/draft/patterns/multi-hop-authorization.md)). When the agent reaches a tool or peer agent that has its own authentication and authorization, the agent must satisfy that counterparty *and* the counterparty must be able to answer: **on whose authority is this being done?**

Today ADL answers "which agent" (the passport, §10.3.1, and the per-request proof, §10.3.2) but not "on whose authority." The vacation use-case states this limitation outright: *"Alice's identity is not visible to the flight agent."* For low-stakes calls that is acceptable. For regulated, high-value, or cross-organization calls it is not — a brokerage executing a trade needs "Alice's trade, via her agent," not "an agent." KYC, suitability, AML, fraud scoring, liability attribution, and incident response all require the **human principal**, not just the acting agent.

### Impersonation vs delegation — this proposal chooses delegation

There are two postures, named precisely by [RFC8693]:

- **Impersonation** — the downstream credential looks like it *is* the user; there is no record the agent was involved.
- **Delegation** — the credential names *both*: `sub` = the original principal, `act` = the acting party (recursively, for a chain). "The agent is acting *on behalf of* the principal."

For autonomous agents, impersonation is unsafe: it erases the human/agent distinction exactly where you need it most — when an agent misbehaves, you cannot separate "Alice did this" from "Alice's agent did this," which destroys liability attribution, incident containment, and every regulated-decision requirement. **This proposal mandates delegation semantics**: the principal and the acting-agent chain are always distinguishable, and the chain is cryptographically verifiable.

### Two questions this answers

1. **Does the originator flow through, or does the agent identity suffice?** Both, at different layers:
   - *Authentication of the call* and *authorization against the agent's ceiling* (§10.4.4) use the **agent's** identity — already covered by §10.3.1/§10.3.2.
   - *Accountability* requires the **principal chain** — added here as `sub` + `act`. It is **required where stakes demand it** (regulated providers turn it on) and **optional elsewhere** (low-stakes agent-to-agent stays lightweight), graduated exactly like `require_proof` (§10.3.2.10).
2. **Client and provider, and providers with upstream dependencies.** Roles are per-connection (see [exposing-agents](../versions/draft/patterns/exposing-agents.md)): a provider is a client to its own upstreams. The delegation chain is the connective tissue — it extends across every hop (`Alice → Assistant → Brokerage → Clearing House`), each agent appending one signed link while the root principal is preserved.

### Why on the wire, and why ADL-native

§10.4.5 already requires recording the source principal in the audit trail, but that is out-of-band reconstruction — each hop logs locally and no hop sees the whole chain at decision time. Putting the chain *in the proof* lets the verifier make the authorization/accountability decision with the full provenance in hand, signed and bound to the request. We define an ADL-native structure (rather than requiring an OAuth Token Exchange deployment at every agent-to-agent boundary) for the same reason §10.3.2 is an ADL-native DPoP analog: cross-language portability and no dependency on a shared authorization server in a decentralized agent mesh. ADL agents that *also* speak OAuth can map this structure to/from RFC 8693 `sub`/`act` tokens (§ Relation to standards).

## Details

### Background: the current proof (recap)

A presentation proof (§10.3.2.2) is a JSON object carrying `adl_proof`, `iss` (the presenting agent's passport `id`), `iat`/`exp`/`jti`, `request` ({method, uri}), optional `scopes` and `nonce`, and an Ed25519 `signature` over the JCS-canonical proof minus the signature. The verifier runs §10.3.2.6 (parse, issuer match, temporal, request binding, signature, replay, nonce) after §10.3.1 verifies the presenter's passport, then authorizes per §10.4.4 (the proof's `scopes` must be a subset of the presenter's passport ceiling).

This proposal extends that proof with `sub` and `act`, adds one verification step (§10.3.2.6.8), and adds one normative subsection (§10.3.2.11). Nothing in the existing proof changes shape; the new members are OPTIONAL by default.

### 1. The delegation model

- **`sub` (root principal)** — *who the work is ultimately for.* Present whenever an agent acts on someone's behalf. Usually a human, identified by their OAuth subject and the grant that authorized the first agent. This single field solves the common "originator must be visible" case even when there are no intermediate agents.
- **`act` (delegation chain)** — *the chain of agents through which authority passed*, present when authority was **sub-delegated** agent-to-agent (the presenter is exercising authority handed down a chain, not its own standing authority). An ordered, root-first array of signed delegation links. Empty (or absent) when the presenter is the principal's **direct** delegate.

This mirrors RFC 8693 exactly (`sub` = subject, `act` = actor chain) and answers the user-facing questions cleanly: the originator flows through via `sub`; the agent chain via `act`; the request itself is still authenticated by the presenter's own passport (§10.3.1) and bound by the proof signature (§10.3.2.6.5).

> **Request vs delegation.** Calling an agent to do work (a *request*) needs only the presenter's passport + proof + `sub`. Granting an agent authority to act *onward* on the same principal's behalf (a *delegation*) requires the delegator to sign an `act` link. An agent that calls upstreams on its **own** standing authority (e.g., a brokerage → its clearing house) does **not** extend the principal's `act` chain; it starts a new authorization with its own passport, and **MAY** carry the principal `sub` forward for accountability without delegating authority.

### 2. New proof document members (amends §10.3.2.2)

Add two rows to the §10.3.2.2 proof table:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `sub` | object | OPTIONAL (REQUIRED when acting on a principal's behalf and the verifier's policy requires it) | The root principal. See §10.3.2.11.1. |
| `act` | array | OPTIONAL | Ordered, root-first chain of signed delegation links (§10.3.2.11.2). Absent or empty means the presenter is the principal's direct delegate. |

The `signature` over the proof (§10.3.2.6.5) covers `sub` and `act` as part of the JCS-canonical bytes, so the presenter cannot alter the declared principal or chain without invalidating the proof.

### 3. New normative subsection: §10.3.2.11 Delegation Chains

#### 10.3.2.11.1 The `sub` (root principal) object

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | string | REQUIRED | Stable identifier of the principal (e.g., an OAuth subject `alice@example.com`, a `did:web`, or a URN). |
| `type` | string | REQUIRED | One of `oauth_subject`, `did`, `urn`, `agent`. Identifies how `id` is interpreted and how `grant` is validated. |
| `grant` | object | OPTIONAL | Evidence of the principal's authorization of the first agent. See below. |

When `type` is `oauth_subject`, `grant` SHOULD be present:

| `grant` member | Type | Description |
|----------------|------|-------------|
| `issuer` | string (HTTPS URI) | The OAuth 2.1 / OIDC issuer that authenticated the principal and authorized the first agent. |
| `token_thumbprint` | string | A thumbprint of the access token that established the grant, formatted `S256:<base64url(SHA-256(token))>`. Lets a verifier bind the chain to a presented/introspectable token without carrying the raw token. |
| `scopes` | array of strings | The scopes the principal granted the first agent — the **top of the attenuation ladder**. |

The `grant` is the **ADL ↔ OAuth boundary**: the human → first-agent delegation is an OAuth grant (the human has no ADL key to sign a link). A verifier validates it according to policy (§10.3.2.11.5): at minimum it records `sub` as *asserted by the first agent*; for high assurance it MUST verify `token_thumbprint` against a token the presenter also supplies (or that the verifier introspects at `issuer`).

#### 10.3.2.11.2 The delegation link

Each element of `act` is a signed delegation credential:

```json
{
  "adl_delegation": "1.0",
  "iss": "https://assistant.example/agents/personal-bot",
  "aud": "https://travel.example/agents/itinerary-planner",
  "scopes": ["flights:search", "flights:book", "hotels:book"],
  "iat": "2026-05-07T14:30:00Z",
  "exp": "2026-05-07T15:30:00Z",
  "jti": "01HXB2K8N3M9P4Q5R6S7T8V9W0",
  "signature": {
    "algorithm": "Ed25519",
    "value": "<base64url Ed25519 signature over JCS-canonical link minus signature>",
    "signed_content": "canonical"
  }
}
```

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `adl_delegation` | string | REQUIRED | Link format version. **MUST** be `"1.0"`. |
| `iss` | string | REQUIRED | The **delegator's** passport `id` (the agent granting authority). |
| `aud` | string | REQUIRED | The **delegate's** passport `id` (the agent receiving authority). |
| `scopes` | array of strings | REQUIRED | The authority delegated. **MUST** be a subset of the delegator's own authority at this point in the chain (§10.3.2.11.4). |
| `iat` | string | REQUIRED | ISO 8601 issuance time. |
| `exp` | string | REQUIRED | ISO 8601 expiry. A delegation link **MAY** be longer-lived than a proof (it is a standing grant, reusable across many proofs until `exp`), but **SHOULD** be as short as the workflow allows. |
| `jti` | string | REQUIRED | Unique link identifier (for revocation lists / audit; not for per-request replay, which is the proof's `jti`). |
| `nbf` | string | OPTIONAL | ISO 8601 "not before" time. |
| `signature` | object | REQUIRED | Ed25519 signature by the **delegator** (`iss`) over the JCS-canonical link minus the `signature` object — same construction as §10.2 / §10.3.2.6.5. |

The link's signature is produced by the **delegator's** private key; the verifier checks it with the delegator's public key resolved per §10.3.1.3. Because each link is independently signed by the party granting authority, the chain is verifiable without a central authorization server.

#### 10.3.2.11.3 Chain ordering and audience chaining

`act` is **root-first**: `act[0]` is the delegation from the principal's direct delegate to the next agent. The chain **MUST** satisfy:

- `act[i].iss == act[i-1].aud` for all `i > 0` (each delegate becomes the next delegator).
- `act[last].aud == proof.iss` (the final delegate is the agent presenting this proof).
- When `act` is absent/empty, `proof.iss` is the principal's direct delegate.

#### 10.3.2.11.4 Attenuation (MUST narrow, never widen)

Authority **MUST** monotonically narrow down the chain:

- `act[0].scopes ⊆ sub.grant.scopes` (the first delegation cannot exceed what the principal granted).
- `act[i].scopes ⊆ act[i-1].scopes` for all `i > 0`.
- `proof.scopes ⊆ act[last].scopes` (or `⊆ sub.grant.scopes` when `act` is empty), **and** `proof.scopes ⊆` the presenter's passport ceiling per §10.4.4.

The verifier **MUST** reject any link or proof that widens authority. This is the security backbone: a compromised mid-chain agent can only ever pass along a subset of what it received, never escalate. (This is the same monotonic-attenuation property as capability systems such as UCAN, and the on-wire form of the §10.4.5 reduction `S_a = S_a_max ∩ map(S_h)`.)

Where scope vocabularies differ between hops (e.g., `travel:book` upstream vs `flights:book` downstream), the delegator performs the projection when it issues the link, and records the mapping per §10.4.5; the verifier checks subset relationships within a single vocabulary at each link.

#### 10.3.2.11.5 Verification procedure

This is invoked as step §10.3.2.6.8 (below), after the proof signature is verified. Given a proof with optional `sub`/`act` and a `VerifyConfig`:

1. **Presence.** If `config.require_delegation_chain` is true and `sub` is absent → **reject** (`missing_principal`).
2. **Principal validation.** If `sub` present, validate its structure (§10.3.2.11.1). If `sub.type == "oauth_subject"` and `config.require_principal_grant_verification` is true, the verifier **MUST** validate `sub.grant.token_thumbprint` against a token the presenter supplies in the request (or introspect at `sub.grant.issuer`); failure → **reject** (`principal_grant_unverified`). Otherwise record `sub` as `asserted` (lower assurance) in the outcome.
3. **Chain shape.** If `act` present, verify ordering and audience chaining (§10.3.2.11.3). Any break → **reject** (`broken_delegation_chain`).
4. **Per-link signature.** For each link, resolve `link.iss`'s public key (§10.3.1.3 `did:web` resolution, or — in *anchored* mode, §10.3.2.11.6 — the key embedded in the link, validated for internal consistency) and verify `link.signature` over the JCS-canonical link minus `signature`. Any failure → **reject** (`delegation_signature_invalid`).
5. **Temporal.** For each link, `nbf ≤ now ≤ exp` within the §10.3.2.8 skew. Expired/not-yet-valid link → **reject** (`delegation_expired`).
6. **Attenuation.** Enforce §10.3.2.11.4 across `sub.grant.scopes`, every `act` link, and `proof.scopes`. Any widening → **reject** (`attenuation_violation`), distinguished in audit from an ordinary insufficient-scope failure.
7. **Revocation (optional).** If the verifier maintains or can query a revocation list, any link or `sub.grant` whose `jti`/thumbprint is revoked → **reject** (`delegation_revoked`).
8. **Record.** Write the full provenance — `sub` (with assurance level), each `act` link's `iss`/`aud`/`scopes`, and the effective authorized scope set — to the verification outcome (§10.3.2.9) for audit.

Each check gates the next. A proof with neither `sub` nor `act` passes this step trivially when `require_delegation_chain` is false (back-compat).

#### 10.3.2.11.6 Anchored mode (offline / unreachable delegators)

The default ("resolved") mode resolves every delegator's `did:web` to verify each link signature. When a mid-chain delegator's DID Document is unreachable (air-gapped, intermittent, or the delegator is itself a consumer-grade agent), a verifier **MAY** operate in *anchored* mode: each link embeds the delegator's public key (`signature` plus an inline `public_key` matching the delegator's passport `cryptographic_identity`), the verifier checks internal signature consistency along the chain, and anchors trust at (a) the presenter's passport, verified normally via §10.3.1, and (b) the root `sub.grant`. Anchored mode is weaker (it trusts embedded keys rather than independently resolving each) and **MUST** be recorded as such in the outcome; deployments handling `restricted` data (§10.1) **SHOULD** require resolved mode.

#### 10.3.2.11.7 Privacy and chain minimization

The full chain reveals the principal and every intermediary to the verifier. That is desirable for accountability but can over-disclose. A presenter **MAY** minimize the chain — e.g., reveal `sub` and the final link while replacing intermediate links with a salted hash commitment — at the cost of full-chain auditability at that verifier. Minimization **MUST NOT** weaken attenuation (the revealed `proof.scopes` must still be provably within the principal's grant). Default for regulated/high-stakes flows is the full chain; minimization is an explicit deployment choice.

### 4. Verification step (amends §10.3.2.6)

Add **§10.3.2.6.8 Delegation Chain Verification** to the §10.3.2.6 procedure, running after §10.3.2.6.5 (Signature Verification) and before authorization (§10.4): perform the §10.3.2.11.5 procedure. Renumber nothing else; §10.3.2.6.6 (Replay) and §10.3.2.6.7 (Nonce) are unaffected and continue to run.

### 5. Interaction with §10.4 Authorization (amends §10.4.4–§10.4.5)

- §10.4.4 (ceiling check) is unchanged but its inputs compose with the chain: the **effective authorized scope set** is `proof.scopes ∩ act[last].scopes ∩ presenter_ceiling` (or `proof.scopes ∩ sub.grant.scopes ∩ presenter_ceiling` when `act` is empty). The chain provides the principal-derived upper bound; the ceiling provides the agent-derived upper bound; the proof requests the per-request slice.
- §10.4.5's "reduction (delegated)" pattern is **promoted from an audit-only requirement to an on-the-wire structure**: the chain *is* the carried, verifiable form of the principal whose scopes §10.4.5 currently only requires recording in the audit trail. §10.4.5's MUST to "record the source human scopes in the audit trail" is satisfied by §10.3.2.6.8 step 8.

### 6. Graduated enforcement (amends §10.3.2.10)

Extend the `VerifyConfig` knobs from §10.3.2.10:

- `require_delegation_chain` (default `false`, RECOMMENDED `true` for regulated providers) — reject proofs lacking `sub`.
- `require_principal_grant_verification` (default `false`) — require cryptographic validation of `sub.grant`, not mere assertion.

When `require_delegation_chain` is `false` and `sub`/`act` are absent, the §10.3.2.6.8 step records a warn-level result and passes, exactly like the `require_proof` back-compat path.

### 7. Schema changes

No change to the ADL **document** JSON Schema. The delegation structures live in the proof and its links, not in the passport. Extend the proof schema (the optional `versions/draft/schema-proof.json` introduced by the §10.3.2 proposal) with `sub` (object) and `act` (array of delegation-link objects), and publish a delegation-link sub-schema. Both are optional; existing proofs validate unchanged.

## Reference Implementation

The chain ships as a public API in `@adl-spec/core` and `adl-spec` (Python), mirroring how the verification core and presentation proof were implemented. All cryptography reuses the existing `signCanonical`/`verifyCanonical` + `jcsCanonicalize` primitives (§10.2) and the `resolveDIDWeb` resolver (§10.3.1.3).

### TypeScript — `packages/adl-core/src/verify/`

```ts
// delegation.ts
export interface DelegationLink {
  adl_delegation: "1.0";
  iss: string;
  aud: string;
  scopes: string[];
  iat: string;
  exp: string;
  jti: string;
  nbf?: string;
  signature?: { algorithm: "Ed25519"; value: string; signed_content: "canonical" };
}
export interface Subject {
  id: string;
  type: "oauth_subject" | "did" | "urn" | "agent";
  grant?: { issuer: string; token_thumbprint?: string; scopes?: string[] };
}

export function buildDelegationLink(input: Omit<DelegationLink, "adl_delegation" | "signature">): DelegationLink;
export function signDelegationLink(link: DelegationLink, privateKeyPem: string): DelegationLink;  // JCS + Ed25519, like signPassport
export function verifyDelegationLink(link: DelegationLink, delegatorPublicKey: string): boolean;

// verify.ts — new gated step inside verifyPassport's proof path
//   §10.3.2.6.8: verifyDelegationChain(proof, config, { fetchImpl }) -> VerificationStepResult[]
```

- Extend `VerifyConfig` (types.ts) with `requireDelegationChain: boolean` and `requirePrincipalGrantVerification: boolean` (both default false in `DEFAULT_VERIFY_CONFIG`).
- Extend the proof input type with optional `sub` and `act`.
- The chain verifier returns one `VerificationStepResult` per §10.3.2.11.5 sub-check (section IDs `"10.3.2.6.8"` plus a `phase` field for presence/principal/shape/signature/temporal/attenuation), folded into the existing `VerificationOutcome`.

### Python — `packages/adl-py/src/adl_spec/verify/`

Mirror the TS API in `delegation.py`: `build_delegation_link`, `sign_delegation_link`, `verify_delegation_link`, and a `verify_delegation_chain(proof, config, *, fetch_impl=None) -> list[VerificationStepResult]`. Extend `VerifyConfig` with `require_delegation_chain` and `require_principal_grant_verification`. The `did:web` resolution reuses the existing `resolve_did_web` (with `fetch_impl` injection for tests).

### Both ports

`verify_passport` gains the §10.3.2.6.8 step in its proof-verification phase. The step is a no-op (warn, pass) when the proof carries no `sub`/`act` and `require_delegation_chain` is false, preserving every existing conformance vector.

## Test Vectors

New category `200–219` under `versions/draft/test-vectors/verify/vectors/`, generated by extending `packages/adl-core/scripts/generate-test-vectors.ts`. The vector schema (SCHEMA.md) gains an optional `delegation` input block (the proof's `sub`/`act` and any presented OAuth token thumbprint) and `expected.step_outcomes` entries for section `"10.3.2.6.8"`.

| Vector | Focus | Expected |
|--------|-------|----------|
| 200 | `sub` only, no `act` (direct delegate); `proof.scopes ⊆ sub.grant.scopes ⊆ ceiling` | verified |
| 201 | `sub` + 1 signed `act` link, correct chaining + attenuation | verified |
| 202 | `sub` + 2 `act` links (3-party chain) | verified |
| 203 | no `sub`/`act`, `require_delegation_chain=false` | verified (back-compat warn) |
| 210 | attenuation: `act[1].scopes ⊄ act[0].scopes` | block at §10.3.2.6.8 (`attenuation_violation`) |
| 211 | `proof.scopes` exceeds `act[last].scopes` | block (`attenuation_violation`) |
| 212 | broken chaining: `act[1].iss ≠ act[0].aud` | block (`broken_delegation_chain`) |
| 213 | last link `aud ≠ proof.iss` | block (`broken_delegation_chain`) |
| 214 | expired delegation link | block (`delegation_expired`) |
| 215 | link signed by the wrong key | block (`delegation_signature_invalid`) |
| 216 | `sub` absent, `require_delegation_chain=true` | block (`missing_principal`) |
| 217 | `act[0].scopes ⊄ sub.grant.scopes` | block (`attenuation_violation`) |
| 218 | `require_principal_grant_verification=true`, no token thumbprint match | block (`principal_grant_unverified`) |
| 219 | anchored mode: mid-chain DID unreachable, embedded keys consistent | verified (recorded as `anchored`, warn) |

The generator signs links with the existing test keys (`test-keys.json`), adding a third/fourth key as needed for multi-hop chains. Both the TS (`conformance-vectors.test.ts`) and Python (`test_conformance_vectors.py`) runners consume the same vectors, intercepting `did:web` resolution via their existing fetch shims. A conforming implementation passes all 200-series vectors.

## Worked Example (to be added to the patterns)

Extend [multi-hop-authorization](../versions/draft/patterns/multi-hop-authorization.md) with a delegation-chain variant: Alice → Assistant → an Itinerary-Planner sub-agent → the Flight Agent.

- `sub` = `{ id: "alice@example.com", type: "oauth_subject", grant: { issuer: "https://auth.assistant.example", token_thumbprint: "S256:…", scopes: ["travel:search","travel:book","payments:authorize"] } }`.
- `act[0]` = Assistant → Itinerary-Planner, `scopes: ["flights:search","flights:book","hotels:book"]`, signed by the Assistant.
- The Itinerary-Planner presents to the Flight Agent with `proof.iss = itinerary-planner`, `act = [act[0]]`, `proof.scopes = ["flights:search"]`.
- The Flight Agent verifies: planner's passport (§10.3.1), the proof signature (§10.3.2.6.5), then the chain (§10.3.2.6.8) — Assistant's link signature, attenuation (`flights:search ⊆ act[0].scopes ⊆ sub.grant.scopes`), and `proof.scopes ⊆` planner's ceiling. It now knows "Itinerary-Planner, delegated by Assistant, acting for Alice," and can apply suitability/KYC against Alice while authorizing the planner.

The [exposing-agents](../versions/draft/patterns/exposing-agents.md) provider example gains a note: a regulated provider sets `require_delegation_chain=true` and `require_principal_grant_verification=true`, and extends the chain to its own upstream (clearing house) by appending its own link.

## Migration & Backward Compatibility

Purely additive. `sub` and `act` are OPTIONAL; `require_delegation_chain` defaults `false`. Every existing proof, vector, and implementation remains valid and conformant; the new §10.3.2.6.8 step is a warn-level no-op when the chain is absent and not required. Adoption is graduated: implementations add the build/verify APIs first (no runtime requirement), then regulated providers flip `require_delegation_chain` on. A future minor release MAY recommend `require_delegation_chain=true` as the default for `confidential`/`restricted` data classifications.

## Relation to Standards & Other Proposals

- **[RFC8693] OAuth 2.0 Token Exchange** — direct conceptual parent. `sub`/`act` here mirror the token-exchange `sub` and (recursive) `act` claims. An ADL agent that also operates in an OAuth ecosystem can construct an `act` chain from token-exchange responses, or emit a token-exchange `actor_token` from an ADL chain. The `sub.grant` is the explicit ADL↔OAuth seam.
- **[RFC9635] GNAP** — the OAuth-successor's richer support for software acting for users aligns with this model; a GNAP grant can populate `sub.grant`.
- **UCAN / capability tokens** — the signed, attenuating, DID-rooted delegation link is structurally a UCAN. We reuse the *attenuation* and *signed-chain* properties while keeping ADL's JCS+Ed25519+`did:web` primitives.
- **[W3C.VC]** — a delegation link is expressible as a Verifiable Credential; this proposal defines the minimal ADL-native shape to avoid a full VC toolchain dependency, consistent with the §10.3.2 rationale.
- **2026-05-04 Presentation Proof** — this extends §10.3.2; the chain rides inside the existing proof and is covered by the same signature.
- **2026-05-02 Authorization Scopes** — attenuation here is the on-wire enforcement of §10.4.5's reduction pattern; the ceiling check (§10.4.4) composes with the chain's scope bound.

## Alternatives

1. **Defer entirely to RFC 8693 token exchange** (carry an OAuth token with `act`/`sub` alongside the passport). Rejected as the *default*: it requires a shared/federated authorization server and OAuth token-exchange infrastructure at every agent-to-agent boundary, which a decentralized `did:web` agent mesh does not have. Kept as an interop *mapping* for OAuth-native deployments.
2. **Carry only `sub`, never `act`** (principal but no agent chain). Rejected: handles accountability for the direct-delegate case but cannot represent sub-delegation through autonomous agent meshes, which is exactly the hard case this proposal targets. `act` remains optional, so simple deployments still get the lightweight `sub`-only behavior.
3. **Nested `act` objects (RFC 8693 literal nesting) instead of a root-first array.** Rejected for ergonomics: a flat ordered array is simpler to validate (linear attenuation + audience-chaining scan) and to express in test vectors. The semantics are identical; the OAuth mapping converts between the two.
4. **Impersonation (rewrap as the user, drop the agent identity).** Rejected on safety/accountability grounds as argued in Motivation.

## Security Considerations

- **Forgery** — each link is signed by its delegator; a forged link fails §10.3.2.11.5 step 4. The whole `sub`/`act` block is additionally covered by the proof signature (§10.3.2.6.5), so it cannot be swapped onto another request.
- **Escalation** — monotonic attenuation (§10.3.2.11.4) guarantees no hop can grant more than it holds; a compromised mid-chain agent is bounded by what it received.
- **Replay** — the proof's `jti` + request binding (§10.3.2.6.4/.6) prevent request replay; delegation links are intentionally longer-lived standing grants, mitigated by short `exp`, optional `nbf`, and optional revocation (§10.3.2.11.5 step 7).
- **Principal grant integrity** — the human→first-agent root is only as strong as the OAuth grant validation policy (`require_principal_grant_verification`); without it, `sub` is *asserted* and MUST be recorded as such. High-stakes verifiers MUST require grant verification.
- **Privacy** — the chain discloses principal + intermediaries; §10.3.2.11.7 minimization trades auditability for disclosure control. Implementations MUST NOT log raw OAuth tokens (only thumbprints).
- **Key compromise** — out of scope here (handled by attestation expiry §10.2 and lifecycle rotation §5.6), same as §10.3.2.1.

## References

- [RFC8693] Jones, M., et al., "OAuth 2.0 Token Exchange"
- [RFC9635] Richer, J., et al., "Grant Negotiation and Authorization Protocol (GNAP)"
- [RFC8785] Rundgren, A., et al., "JSON Canonicalization Scheme (JCS)" — link/proof signing
- [W3C.VC] "Verifiable Credentials Data Model"
- UCAN — User-Controlled Authorization Networks (capability delegation chains)
- ADL Spec §10.2 (Attestation), §10.3.1 (Verification Procedure), §10.3.2 (Presentation Proof), §10.4 (Authorization Scopes)
- Patterns: [multi-hop-authorization](../versions/draft/patterns/multi-hop-authorization.md), [exposing-agents](../versions/draft/patterns/exposing-agents.md)
