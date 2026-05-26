---
id: inbound-verification
title: Verifying Inbound Callers (the Policy Enforcement Point)
sidebar_position: 4
description: How ADL is verified and enforced on every inbound request at a Policy Enforcement Point (PEP) — a role, not a product — that can live in the agent runtime, an AI-aware gateway, a dedicated ADL verifier, or (incidentally, and not as a default) a generic API gateway.
keywords: [adl, pattern, policy enforcement point, pep, inbound verification, agent runtime, ai gateway, api gateway, kong, apigee, envoy, zero trust, passport, presentation proof, delegation, scopes, mtls, oidc]
---

# Verifying Inbound Callers (the Policy Enforcement Point)

**The pattern:** every inbound request to an agent — from a human (OAuth 2.1 / OIDC) or a peer agent (ADL passport + presentation proof + delegation chain) — must be authenticated and authorized *before* it reaches the agent's logic. The component that does this is a **Policy Enforcement Point (PEP)**: it runs the [§10.3](/spec/next#103-authentication) + [§10.4](/spec/next#104-authorization-scopes) procedures, holds the per-verifier state (replay cache, nonces, allowlists), and emits one consistent audit record — so the agents behind it don't each re-implement verification.

The PEP is a **role, not a product.** The verification it runs is exactly the procedure defined for any verifier ([§10.3](/spec/next#103-authentication) / [§10.4](/spec/next#104-authorization-scopes)); it is not a new ADL construct. What varies between deployments is *where* the PEP lives and *how well that host understands agent traffic*. That second point matters more than it first appears: an API gateway can reverse-proxy anything, which makes it the obvious place to bolt verification onto — and is exactly why it is the wrong *default* for AI agents. The verification is necessary but not sufficient; the agent-native policy that should ride alongside it (streaming responses, token/spend budgets, per-tool-call authorization, classification on live content) wants to live where the agent semantics are. The closing section makes that case.

> **PEP vs. egress gateway vs. OpenClaw plugin.** This pattern is the **inbound** edge: verifying callers *arriving* at an agent. Its mirror image is the [AI gateway](./ai-gateway), which mediates an agent's **outbound** traffic (egress + signing + tool mediation). The *OpenClaw gateway plugin* is one specific agent-runtime's inbound PEP. The ADL primitives are identical across all of these; the position and the job differ.

## Where the PEP can live

The same verification — passport ([§10.3.1](/protocol#1031-passport-verification-procedure)), proof ([§10.3.2](/protocol#1032-presentation-proof)), credential schemes ([§10.3.3](/spec/next#1033-credential-schemes)), scopes ([§10.4](/spec/next#104-authorization-scopes)) — can be hosted in several shapes. They differ not in *what* they verify but in how much of the agent's runtime semantics they can see and enforce alongside the identity check:

| Host shape | What it is | Agent-native fit | When to reach for it |
|------------|------------|------------------|----------------------|
| **Agent-runtime PEP** | Verification runs inside the agent runtime (e.g. the OpenClaw gateway plugin), in-process or as a runtime sidecar | **Highest** — sees the full agent context: streams, tool calls, token budgets, prompt/completion classification | The default for an ADL-native agent. The PEP and the agent semantics are co-located. |
| **AI-aware gateway** | A gateway purpose-built for AI traffic (an AI gateway in inbound mode, or an AI-aware data plane) | **High** — understands streaming, tokens, model/tool semantics natively | Fronting a fleet where you want one edge *and* agent-native enforcement, without re-implementing it per agent. |
| **Dedicated ADL verification service** | A focused verifier the host calls out to (ext_authz sidecar, standalone service) | **Medium** — does the identity/proof/scope check cleanly; agent-native policy stays in the caller | You want verification factored out and reused, but keep budget/tool/classification policy in the runtime. |
| **Generic API gateway** | A vendor-neutral gateway (Kong, Apigee, Envoy, AWS API Gateway, NGINX) running ADL verification as a plugin/filter/Lua/Wasm module | **Low** — treats traffic as opaque request/response HTTP; agent-native concerns must be bolted on | An incremental adoption path if you *already* run one — not the architecture to choose for AI agents from scratch. |

The verification procedure in the lifecycle below is written for the PEP role and holds for all four. The scenario uses a single abstract enforcement edge so the steps stay host-agnostic; the closing section explains why the last row is a fallback, not a default.

## What the PEP is, and is not

- **It is** the verifier: it runs passport verification ([§10.3.1](/protocol#1031-passport-verification-procedure)), presentation-proof verification ([§10.3.2](/protocol#1032-presentation-proof)), the delegation/principal checks that ride in the proof ([§10.4.5](/protocol#1045-composition-across-boundaries-multi-hop-authorization)), credential-scheme validation for human callers ([§10.3.3](/spec/next#1033-credential-schemes)), and scope authorization ([§10.4](/spec/next#104-authorization-scopes)). It holds the replay cache ([§10.3.2](/protocol#1032-presentation-proof)), issues step-up nonces, applies the provider allowlist and attestation requirements, and gates on data classification ([§10.3.1.9](/protocol#10319-permission-and-classification-compatibility)).
- **It is not** the root of trust. Proofs and delegation links are signed end-to-end by the real principals and agents; the PEP *verifies* that cryptographic chain, it does not *mint* it. The chain remains independently verifiable even if you bypass the PEP. A PEP that starts re-signing or vouching for identities it did not verify has reinvented a central authorization server — the exact thing the [passport + proof model](/spec/next#103-authentication) avoids.

## Illustrated through a scenario

Northwind Trading runs a fleet of internal agents — an Inventory Agent, a Pricing Agent, an Order Agent — none of them publicly reachable. Inbound requests are verified at a single enforcement edge before reaching any of them. Two kinds of caller arrive at that edge: a supplier's **Procurement Agent** (a peer agent, sometimes acting for a human buyer) and Northwind's own employees using an internal console. The edge authenticates both, authorizes the specific operation, and routes to the right backing agent. The trading is incidental; what matters is that one PEP handles both authentication paths and both authorization models — and that the *same* procedure would run whether Northwind hosts it in its agent runtime, an AI-aware gateway, a dedicated verifier, or (incidentally) a generic API gateway.

### Cast of actors

| Actor | Role | Identity | Notes |
|-------|------|----------|-------|
| **Northwind PEP** | Inbound enforcement edge | `https://api.northwind.example` | Runs ADL verification + authorization on every inbound request. Also fronts Northwind's OIDC. Host shape is deliberately abstract here. |
| **Inventory / Pricing / Order Agents** | Backing agents | Internal only (e.g. `inventory.svc.northwind.internal`), `did:web:api.northwind.example:agents:inventory` etc. | Not publicly reachable; reached only via the PEP over the internal trust domain. |
| **Procurement Agent** | External peer agent | `https://supply.example/agents/procurement`, `did:web:supply.example:agents:procurement` | Calls Northwind to check stock and place orders; may carry a delegation chain to a human buyer. |
| **Dana** | Northwind employee | OIDC subject `dana@northwind.example` | Uses an internal console; authenticates at the PEP via OIDC. |

## Request lifecycle through the PEP

A single inbound request from the Procurement Agent — "reserve 500 units of SKU-1234" — flows through these stages at the edge. Every step is host-agnostic: it is the same whether the PEP is a runtime plugin, an AI-aware gateway, a sidecar verifier, or a generic API gateway filter.

### 1. Ingress and caller classification

The PEP terminates TLS and inspects the request. It classifies the caller by what it presents:

- **Human / OAuth client** → `Authorization: Bearer …` (+ `DPoP`): take the [§10.3.3](/spec/next#1033-credential-schemes) credential-scheme path.
- **Peer agent** → `X-ADL-Passport` + `X-ADL-Proof` headers: take the [§10.3.1](/protocol#1031-passport-verification-procedure) + [§10.3.2](/protocol#1032-presentation-proof) path.

This is the same "two front doors, one edge" idea as [Exposing Agents](./exposing-agents) — but here the doors are two branches of one PEP.

### 2. Authenticate (agent path)

The PEP runs the full [§10.3.1](/protocol#1031-passport-verification-procedure) verification on the Procurement Agent's passport — [retrieval integrity](/protocol#10311-retrieval-integrity), [schema](/protocol#10312-schema-validation), [`did:web` resolution](/protocol#10313-identity-resolution), [key cross-check](/protocol#10314-public-key-cross-check), [signature](/protocol#10315-signature-verification), [temporal validity](/protocol#10316-temporal-validity), [lifecycle](/protocol#10317-lifecycle-gating), [provider coherence](/protocol#10318-provideridentity-coherence) — then [§10.3.2 proof verification](/protocol#10326-verification-procedure): the proof must be **bound to the PEP's public URL** (`https://api.northwind.example/...`), within its temporal window, and its `jti` not in the replay cache.

### 3. Authenticate (human path)

For Dana's console request, the PEP validates the OIDC token and DPoP binding ([§10.3.3](/spec/next#1033-credential-schemes)). No ADL passport is involved; the human's identity comes from the IdP.

### 4. Principal and delegation

When the Procurement Agent acts on behalf of a human buyer, the principal and the chain of agents that carried the authority ride in the proof and are verified here. The PEP checks that the exercised scopes are within the principal's grant and narrow monotonically down the chain — the on-edge enforcement of the [§10.4.5 composition rules](/protocol#1045-composition-across-boundaries-multi-hop-authorization). The PEP is where an organization sets its policy for *requiring* a principal chain (regulated/high-value routes) versus accepting agent identity alone (low-stakes routes).

### 5. Authorize

The PEP computes the effective authority and checks it against the targeted route:

- **Scope** ([§10.4](/spec/next#104-authorization-scopes)): the proof's requested scopes must be within the agent's [ceiling](/protocol#1044-authorization-in-agent-to-agent-flows) and cover the route's required scopes (`inventory:reserve` for the reserve endpoint).
- **Classification** ([§10.1](/spec/next#101-data-classification) / [§10.3.1.9](/protocol#10319-permission-and-classification-compatibility)): the caller must be cleared for the data the route returns.
- **Native policy**: rate limits, quotas, IP allowlists, and the [provider allowlist](/protocol#10318-provideridentity-coherence) — Northwind only does business with attested, allowlisted partners.

### 6. Route over the internal trust domain

Once verified, the PEP forwards the request to the backing agent (`inventory.svc.northwind.internal`). Two consequences worth being explicit about:

- **The proof is not forwarded for re-verification.** It was bound to the PEP's public URL (`https://api.northwind.example/...`), not the internal service URL, so forwarding it verbatim would fail the [request-binding check](/protocol#10326-verification-procedure). The PEP is the verification boundary; the internal hop is a separate trust domain secured by its own means (mTLS, SPIFFE/SVID, network policy).
- **The PEP passes the verified context forward**, typically as signed headers (the authenticated agent id, the principal, the granted scopes, a request id) so the backing agent can make fine-grained decisions and keep its own audit without re-running verification. In a zero-trust internal network, backing agents MAY still require their own proofs — defense in depth.

### 7. Audit

The PEP emits one provenance record per request — the authenticated identity, the principal and delegation chain, the effective scopes, the route, and the outcome — correlated by request id. Because the PEP is a single chokepoint, this is the cleanest place to satisfy the audit-recording obligation that the [§10.4.5 composition rules](/protocol#1045-composition-across-boundaries-multi-hop-authorization) place on multi-hop authorization.

## Why a generic API gateway is the wrong default

A generic API gateway *can* host the PEP: passport + proof verification slots into its request pipeline as a plugin/filter/Lua/Wasm module, right alongside the OAuth/OIDC validation, TLS termination, and routing it already does. If you already run one, that is a legitimate incremental path to enforcing ADL — the lifecycle above runs there unchanged.

But "can reverse-proxy anything" is precisely the problem. A generic gateway has no opinion about agents; it treats traffic as opaque request/response HTTP. Agent traffic is not shaped like that, and the enforcement that *should* ride alongside identity verification is exactly the part a generic gateway can't see:

- **Agent responses stream.** Completions arrive token-by-token over SSE / chunked transfer, and sessions are long-lived. A gateway tuned for short request/response transactions buffers, times out, or breaks the stream — degrading the very UX the agent exists to provide.
- **The meaningful unit isn't the HTTP transaction.** It's a tool call, a token budget, a spend cap. Enforcing `permissions.resource_limits` ([§9.6](/spec/next#96-resource-limits)) or per-tool-call authorization means understanding agent semantics the gateway has no model of — you'd reimplement it as custom Lua/Wasm, rebuilding what AI-aware hosts do natively.
- **Classification applies to live content, not just routes.** `data_classification` handling ([§10.1](/spec/next#101-data-classification)) — redaction, anonymization — needs to inspect streamed prompts and completions, not just gate a path by static policy. A generic gateway gates the route; it doesn't reason about what flows through it.
- **Identity verification is necessary but not sufficient.** Verifying the passport and proof proves *who* is calling. It says nothing about budget, tool mediation, or classification on the content — which is where most of an agent's runtime risk actually lives.

So the recommendation hierarchy: keep inbound verification **where the agent semantics are** — in the agent runtime ([the OpenClaw plugin pattern](./multi-hop-authorization)) or an AI-aware layer that understands streaming, tokens, tools, and content classification natively. Factor verification into a dedicated service if you want reuse. Use a generic API gateway as the PEP only when you already operate one and want ADL identity enforcement at that edge today — and even then, the agent-native policy belongs downstream, in the runtime, not stretched onto a gateway that was never designed for it.

## Failure modes

### Proof bound to the wrong URL

A client signs a proof for the backing agent's *internal* URL (or an old endpoint) instead of the PEP's public URL. The [request-binding check](/protocol#10326-verification-procedure) rejects it — the proof's `request.uri` does not match the URL the caller actually hit. The fix is client-side: bind proofs to the public PEP URL.

### Bypass attempt — calling a backing agent directly

An attacker who learns `inventory.svc.northwind.internal` tries to reach it directly, skipping the PEP. This is contained at the network layer (the internal trust domain is not externally routable) and, in a zero-trust deployment, by the backing agent still requiring a valid proof. The PEP is the *primary* enforcement point, not the *only* control.

### Replay against a different PEP node

A captured proof is replayed against a second PEP instance. Without a shared replay cache it could slip through; with one (the recommended deployment), the `jti` is already recorded and the [replay check](/protocol#10326-verification-procedure) rejects it. This is why the replay cache MUST be shared across PEP instances, not per-node.

### Principal chain required but absent

A regulated route (place-order) requires a verified principal; the caller presents only its agent identity. The PEP rejects with an insufficient-provenance error — distinct from an insufficient-scope error — so the caller knows to attach the principal/delegation, not request more scope. Low-stakes routes (check-stock) on the same PEP accept agent identity alone.

### PEP misconfigured to mint trust

If the PEP is configured to re-sign requests as itself or to vouch for unverified callers, it becomes a central authorization server and the end-to-end chain breaks. The discipline: the PEP **verifies** end-to-end-signed proofs and delegation links; it never originates authority it did not receive. A PEP that genuinely re-originates calls on an agent's behalf is acting as an agent and MUST carry its own passport and appear in the delegation chain — it is no longer a transparent enforcement point.

## Spec section index

| PEP operation | Spec section |
|---------------|--------------|
| Classify caller (human vs agent) | [§10.3](/spec/next#103-authentication) |
| Verify peer-agent passport | [§10.3.1](/protocol#1031-passport-verification-procedure) (all steps) |
| Verify presentation proof (binding, replay, nonce) | [§10.3.2](/protocol#10326-verification-procedure) |
| Validate human credential (OIDC/OAuth/mTLS) | [§10.3.3](/spec/next#1033-credential-schemes) |
| Enforce principal / multi-hop composition | [§10.4.5](/protocol#1045-composition-across-boundaries-multi-hop-authorization) |
| Authorize scopes (ceiling + route requirement) | [§10.4.4](/protocol#1044-authorization-in-agent-to-agent-flows) / [§10.4.3](/protocol#1043-authorization-in-human-to-agent-flows) |
| Enforce resource / token / spend budgets | [§9.6](/spec/next#96-resource-limits) |
| Provider allowlist / attestation requirement | [§10.3.1.8](/protocol#10318-provideridentity-coherence) / [§10.2](/spec/next#102-attestation) |
| Classification gating | [§10.1](/spec/next#101-data-classification) / [§10.3.1.9](/protocol#10319-permission-and-classification-compatibility) |
| Discovery of the org's agents | [§6.4](/spec/next#64-discovery) |

## Related material

- [Multi-Hop Authentication and Authorization](./multi-hop-authorization) — the client/caller side that produces the proofs the PEP verifies, and the runtime where the agent-native PEP naturally lives
- [Exposing Agents to External Callers](./exposing-agents) — the provider edge; this pattern is one way to *implement* that edge
- [Mediating Agent Egress through an AI Gateway](./ai-gateway) — the outbound mirror; the proofs an AI gateway constructs are what an inbound PEP verifies
- [Draft spec §10.3 (Authentication)](/spec/next#103-authentication)
- [Draft spec §10.4 (Authorization Scopes)](/spec/next#104-authorization-scopes)
