---
id: exposing-agents
title: Exposing Agents to External Callers
sidebar_position: 3
description: How an organization exposes agents that external humans and peer agents discover and call — the provider (resource-server) side, where every inbound caller authenticates per session or per request rather than once at setup.
keywords: [adl, pattern, agent provider, resource server, discovery, well-known, oauth, oidc, passport, presentation proof, scopes, brokerage, regulated]
---

# Exposing Agents to External Callers

**The pattern:** an organization exposes agents that external parties — its own human clients, and peer agents acting for others — discover and call. This is the *provider* side of the connection, and it behaves differently from a personal agent. A personal agent ([Multi-Hop Authentication and Authorization](./multi-hop-authorization)) is set up once by its owner and carries standing delegated authority. A provider has never met its callers: it authenticates **every inbound caller fresh** — each human session, each peer-agent request. There is no "set up once" with parties the provider didn't provision.

**Illustrated through a scenario:** Meridian Capital, a Fortune-50 brokerage, exposes agents — portfolio analysis, market research, trade execution — to the outside world through two front doors:

1. **A chat interface on its authenticated client website.** A retail client signs in to `meridian.example` and talks to the portfolio agent.
2. **A well-known discovery file** that lets peer agents (a wealth-management aggregator, or a client's own personal agent) find Meridian's agents and call them directly.

We trace authentication and authorization for both doors, and show why the provider side is per-session / per-request, not setup-once.

## Why the provider side is different

This is the question the personal-agent walkthrough leaves open: if authentication is "established once at setup," how does that work for an agent that exposes itself to the world? It doesn't — because "once at setup" describes the *client* role, not the *provider* role.

| | Personal agent (client / delegate) | Agent provider (resource server) |
|--|------------------------------------|----------------------------------|
| Who provisions the trust | Its owner, once at setup | Nobody — callers arrive unprovisioned |
| When authentication happens | Once at setup; channel-bound per message thereafter | Per human session and per agent request |
| Standing authority | Holds delegated authority and spends it | Validates each caller's authority at the door |
| Knows its counterparties in advance? | Yes — it set up the connections | No — anyone may show up |
| Role in [§10.3](/spec/next#103-authentication) | The party *being verified* (presents passport + proof) | The *verifier* (runs [§1.1](/protocol#11-passport-verification-procedure), [§1.2](/protocol#12-presentation-proof), checks [§10.3.3](/spec/next#1033-credential-schemes) credentials) |

**Roles are per connection, not per agent.** Meridian is a provider to its callers, but when its own trade-execution agent calls a clearing house or a market-data feed, Meridian is a *client* there — set up once, presenting credentials. The same agent is a provider on its inbound edge and a client on its outbound edge. The personal-agent pattern traced the client edge; this one traces the provider edge of the very same kind of connection.

## Cast of actors

| Actor | Role | Identity | Notes |
|-------|------|----------|-------|
| **Meridian Capital** | Agent provider (brokerage) | `https://agents.meridian.example`, IdP at `auth.meridian.example` | FINRA/SEC-regulated; did KYC at account opening |
| **Portfolio Analysis Agent** | Meridian agent | `https://agents.meridian.example/portfolio`, `did:web:agents.meridian.example:portfolio` | Tools require `portfolio:read` |
| **Market Research Agent** | Meridian agent | `https://agents.meridian.example/research` | Tools require `research:read` |
| **Trade Execution Agent** | Meridian agent (high-stakes) | `https://agents.meridian.example/trade` | Tools require `trades:execute`; step-up required |
| **Dana** | Human Meridian client | Account `dana@example.com`, signs in to `meridian.example` | Already KYC-verified at account opening |
| **Wealth Aggregator** | Peer agent acting for a mutual client | `https://aggregator.example/agents/advisor`, `did:web:aggregator.example:agents:advisor` | Calls Meridian's portfolio agent to pull positions |
| **Meridian Discovery** | Well-known endpoint | `https://agents.meridian.example/.well-known/adl-agents` | Lists Meridian's externally-callable agents |

## Front door 1: Authenticated website chat (human clients)

**Authentication path:** [§10.3.3](/spec/next#1033-credential-schemes) (OIDC) — **per session, not once at setup**
**Authorization path:** [§2.1](/protocol#21-authorization-in-human-to-agent-flows) (Human-to-Agent Flows)

### What happens

1. Dana navigates to `meridian.example` and signs in. Meridian is an OpenID Connect provider; Dana authenticates with username + password + MFA. **This authentication is fresh every session** — when her session expires, she re-authenticates. Meridian already did identity proofing (KYC) when Dana opened her account, so the login binds to a known, proofed identity.

2. Meridian issues a session with an OIDC ID token and an access token whose `scope` reflects Dana's *entitlements*, computed by Meridian's own authorization system from her account profile:

    ```
    scope = openid portfolio:read research:read trades:execute
    ```

   Dana is a full-service client, so she gets trade execution. A view-only client would get `portfolio:read research:read` and no `trades:execute`.

3. Dana opens the chat and asks the portfolio agent: "How did my retirement account do this quarter?" The browser sends the message with her session token (DPoP-bound per [§10.3.3.1](/spec/next#10331-oauth-21-type-oauth2)).

4. The portfolio agent authorizes per [§2.1](/protocol#21-authorization-in-human-to-agent-flows):
    - `required = ["portfolio:read"]` for the `get_performance` tool.
    - `presented = ["portfolio:read", "research:read", "trades:execute"]` from Dana's session token.
    - `required ⊆ presented` ✓ — authorized. The agent returns the quarter's performance.

5. Dana then says "sell 100 shares of ACME." This routes to the trade-execution agent, whose `place_order` tool requires `trades:execute` — a **high-stakes** scope. Meridian's policy requires a **step-up** for trade execution even within an authenticated session: the agent issues a re-authentication challenge (MFA re-prompt, or a signed confirmation), per the same step-up pattern as a server-issued nonce ([§1.2.7](/protocol#127-server-issued-nonces) is the agent-to-agent analog). Only after Dana satisfies the challenge does the order go through.

**The contrast with the personal agent:** Dana is not "set up once." Every session is a fresh OIDC authentication, sessions expire, and high-stakes actions force re-authentication mid-session. Meridian is the resource server; Dana is an unprovisioned-until-she-logs-in caller.

**Audit record:**
- Inbound: OIDC session, `sub=dana@example.com`, MFA satisfied, scopes from entitlements
- Tools: `get_performance` (authorized), `place_order` (authorized after step-up)
- Outcome per tool, with the step-up event recorded for FINRA/SEC

## Front door 2: Well-known discovery + agent-to-agent

**Authentication path:** [§1.1](/protocol#11-passport-verification-procedure) + [§1.2](/protocol#12-presentation-proof) — **per request, not once at setup**
**Authorization path:** [§2.2](/protocol#22-authorization-in-agent-to-agent-flows) (Agent-to-Agent Flows)

A mutual client of both Meridian and a wealth-management platform has authorized the **Wealth Aggregator** agent to pull their Meridian positions into a consolidated view. The aggregator is a peer agent Meridian has never provisioned. Here is how it connects.

### Discovery

1. The aggregator fetches `GET https://agents.meridian.example/.well-known/adl-agents` ([§6.4](/spec/next#64-discovery)). No auth on the listing — discovery is public. It returns Meridian's externally-callable agents:

    ```json
    {
      "adl_discovery": "1.0",
      "agents": [
        { "id": "https://agents.meridian.example/portfolio",
          "adl_document": "https://agents.meridian.example/portfolio",
          "name": "Meridian Portfolio Analysis", "version": "4.1.0", "status": "active" },
        { "id": "https://agents.meridian.example/research",
          "adl_document": "https://agents.meridian.example/research",
          "name": "Meridian Market Research", "version": "2.0.0", "status": "active" }
      ]
    }
    ```

   Note: the trade-execution agent is **not** listed for public discovery — Meridian only exposes read-oriented agents to unprovisioned peers. Discovery is a deliberate disclosure decision, not an automatic dump of every agent.

2. The aggregator fetches the portfolio agent's passport and runs the full [§1.1](/protocol#11-passport-verification-procedure) verification (it is verifying *Meridian*, the same way Meridian will shortly verify *it*). It also reads Meridian's declared connection requirements from the passport:

    ```yaml
    security:
      authentication:
        type: oauth2          # Meridian also accepts agent-to-agent; see below
      scopes: ["portfolio:read"]
      attestation:
        type: third_party     # Meridian requires callers to be attested, see §10.2
    tools:
      - name: get_positions
        security:
          scopes: ["portfolio:read"]
    ```

### Per-request authentication at Meridian

3. The aggregator calls `POST https://agents.meridian.example/portfolio/tools/get_positions`, presenting:
    - `X-ADL-Passport`: the aggregator's own signed passport.
    - `X-ADL-Proof`: a fresh presentation proof ([§1.2](/protocol#12-presentation-proof)) bound to this request URI and method, claiming `scopes: ["portfolio:read"]`.

4. Meridian — now the **verifier** — authenticates the inbound caller from scratch. **It has no prior relationship with the aggregator; everything it needs arrives in this request:**
    - [§1.1](/protocol#11-passport-verification-procedure): verify the aggregator's passport (resolve its `did:web`, cross-check key, verify signature, check lifecycle).
    - [§1.2.6](/protocol#126-verification-procedure): verify the presentation proof (issuer match, temporal validity, request binding, signature, replay).
    - **Provider allowlist ([§1.1.8](/protocol#118-provideridentity-coherence)):** because Meridian is regulated, it does not accept *any* well-formed passport. It checks the aggregator's `provider` / `id` authority against an allowlist of agents it has agreed to do business with, and requires the passport to carry a third-party attestation ([§10.2](/spec/next#102-attestation)) from an issuer Meridian trusts. An unknown but cryptographically valid agent is rejected here — verification ≠ authorization to transact.
    - [§2.2](/protocol#22-authorization-in-agent-to-agent-flows): ceiling check (`proof.scopes ⊆ aggregator's passport ceiling`) and required-scope check (`get_positions` requires `portfolio:read` ⊆ `proof.scopes`).
    - [§1.1.9](/protocol#119-permission-and-classification-compatibility): positions are `confidential` ([§10.1](/spec/next#101-data-classification)); Meridian checks the aggregator's declared `data_classification.sensitivity` is high enough to receive them.

5. All checks pass; Meridian returns the positions. **Every one of those checks runs again on the aggregator's next request** — there is no session that "remembers" the aggregator the way Dana's browser session remembers her. Agent-to-agent is stateless per request; the presentation proof is the per-request authenticator.

**The contrast with the personal agent, restated:** Alice's personal agent was set up once and *holds* authority. The aggregator is not set up at Meridian at all — it earns authorization on each request by presenting a verifiable passport, a fresh proof, a trusted attestation, and scopes within both its own ceiling and Meridian's requirements.

**Audit record:**
- Inbound: passport DID `did:web:aggregator.example:agents:advisor`, attestation issuer, proof `jti`, proof.scopes `[portfolio:read]`
- Allowlist + attestation check outcome
- Tool: `get_positions`, classification check, outcome
- Logged per request for FINRA/SEC reconstruction

## The regulated-provider overlay

A Fortune-50 brokerage adds requirements a consumer service wouldn't:

- **Identity proofing.** For humans, KYC happened at account opening; the OIDC login binds to that proofed identity. For agents, Meridian requires a third-party attestation ([§10.2](/spec/next#102-attestation)) and an allowlisted provider authority — a cryptographically valid passport from an unknown party is not enough to transact.
- **Entitlements as scopes.** What a caller may do (view positions vs. execute trades) is expressed as [§10.4](/spec/next#104-authorization-scopes) scopes, derived from the human's account profile or the agent's negotiated relationship — not from the caller's say-so.
- **Step-up for high-stakes operations.** Trade execution forces re-authentication (humans) or a server-issued nonce / human-in-the-loop confirmation (agents, [§1.2.7](/protocol#127-server-issued-nonces)), even within an otherwise-authenticated session.
- **Data classification gating.** Positions and balances are `confidential` ([§10.1](/spec/next#101-data-classification)); Meridian enforces classification compatibility ([§1.1.9](/protocol#119-permission-and-classification-compatibility)) so a caller cleared only for `public` data cannot receive them.
- **Per-interaction audit.** Every inbound authentication and authorization decision — human or agent — is logged with enough detail to reconstruct who did what, under whose authority, when. The per-request statelessness of the agent path is an audit *advantage*: each request carries its own signed, timestamped proof.

## Where "once at setup" does and does not apply

Putting the two patterns together:

| Connection | Setup-once or per-request? | Why |
|------------|---------------------------|-----|
| Alice → her personal agent | Once at setup (then channel-bound) | Alice provisions and delegates to *her own* agent |
| Personal agent → Meridian | Per request (from Meridian's side) | Meridian never provisioned the personal agent |
| Dana → Meridian website | Per session | Meridian authenticates each login fresh |
| Aggregator → Meridian | Per request | Stateless agent-to-agent; proof is the authenticator |
| Meridian's trade agent → clearing house | Once at setup (Meridian is the client there) | Meridian provisions its *own* upstream connections |

"Once at setup" is what a principal does with an agent it *owns*. Everything an agent does toward parties it does *not* own is authenticated per session or per request. The two patterns are the two ends of the same wire.

## Failure modes

### Dana's session expired

She comes back an hour later and sends another message. The token is past `exp`; Meridian rejects with `401` and the chat prompts her to re-authenticate. No standing authority carries her across the gap — provider sessions are deliberately finite.

### The aggregator is verifiable but not on Meridian's allowlist

The aggregator's passport verifies cleanly under [§1.1](/protocol#11-passport-verification-procedure), and its proof is valid under [§1.2](/protocol#12-presentation-proof) — but Meridian has no business relationship with `aggregator.example`. The allowlist / attestation check rejects it. **Verification is not authorization:** proving who you are does not entitle you to transact with a regulated provider. The aggregator gets a structured `403` distinguishing "not verified" from "verified but not authorized."

### A peer agent requests `trades:execute` over discovery

The trade-execution agent isn't even listed in the well-known file, and its tools require a step-up that the stateless agent-to-agent path doesn't satisfy on its own. A peer agent that somehow targets the trade endpoint is rejected: the scope is outside what Meridian grants to discovered peers, and high-stakes execution requires the human step-up or an explicit, separately-negotiated machine relationship. Read is open to attested peers; execute is not.

### Replayed proof against the portfolio agent

A captured `X-ADL-Proof` replayed at the same endpoint is caught by [§1.2.6.6](/protocol#126-verification-procedure) (the `jti` is already in Meridian's recent-cache); replayed at a different endpoint, by [§1.2.6.4](/protocol#126-verification-procedure) (request-binding mismatch). The provider's per-request verification is exactly what makes replay detectable.

### Caller's classification is too low for positions

The aggregator's passport declares `data_classification.sensitivity: internal`, but Meridian classifies positions as `confidential`. [§1.1.9](/protocol#119-permission-and-classification-compatibility) rejects: the caller is not cleared to receive `confidential` data. Meridian returns a classification-mismatch error without leaking the positions.

## Spec section index

| Provider operation | Spec section |
|--------------------|--------------|
| Publish callable agents | [§6.4](/spec/next#64-discovery) (well-known discovery) |
| Human client login (per session) | [§10.3.3.1](/spec/next#10331-oauth-21-type-oauth2) (OIDC) |
| Authorize human request | [§2.1](/protocol#21-authorization-in-human-to-agent-flows) |
| Step-up for high-stakes human action | [§1.2.7](/protocol#127-server-issued-nonces) (analog) |
| Verify inbound peer agent (per request) | [§1.1](/protocol#11-passport-verification-procedure) (all steps) |
| Verify the request binding | [§1.2.6](/protocol#126-verification-procedure) |
| Require caller attestation | [§10.2](/spec/next#102-attestation) (third-party) |
| Provider allowlist for transacting | [§1.1.8](/protocol#118-provideridentity-coherence) |
| Authorize peer agent request | [§2.2](/protocol#22-authorization-in-agent-to-agent-flows) (ceiling + required scope) |
| Classification gating | [§10.1](/spec/next#101-data-classification) + [§1.1.9](/protocol#119-permission-and-classification-compatibility) |

## Related material

- [Multi-Hop Authentication and Authorization](./multi-hop-authorization) — the client/delegate side of the same kind of connection
- [Draft spec §10.3 (Authentication)](/spec/next#103-authentication)
- [Draft spec §10.4 (Authorization Scopes)](/spec/next#104-authorization-scopes)
- [Draft spec §6.4 (Discovery)](/spec/next#64-discovery)
- [OpenClaw passport reference example](https://github.com/adl-spec/agent-definition-language/tree/main/packages/adl-agent/examples/openclaw-passport) (GitHub) — the enterprise gateway is a small working model of this provider edge
