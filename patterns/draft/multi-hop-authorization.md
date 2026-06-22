---
id: multi-hop-authorization
title: Multi-Hop Authentication and Authorization
sidebar_position: 2
description: How ADL composes authentication and authorization across multiple agent hops — human OAuth 2.1, MCP token exchange, ADL passport + presentation proof, and scope composition across boundaries — illustrated with a vacation-booking scenario.
keywords: [adl, pattern, multi-hop, delegation, oauth, dpop, passport, presentation proof, scopes, agent-to-agent, mcp, token exchange]
---

# Multi-Hop Authentication and Authorization

**The pattern:** an agent acting on a user's behalf calls other agents and services, and each hop must independently authenticate the caller and authorize the specific operation. This is the core capability ADL adds on top of OAuth 2.1: human-to-agent boundaries authenticate with OAuth credentials ([§10.3.3](/spec/next#1033-credential-schemes)), agent-to-agent boundaries authenticate with passports ([§1.1](/protocol/trust#11-passport-verification-procedure)) and presentation proofs ([§1.2](/protocol/trust#12-presentation-proof)), and authorization scopes ([§10.4](/spec/next#104-authorization-scopes)) compose across the chain so that no single hop sees more authority than it needs.

**Illustrated through a scenario:** Alice asks her assistant to book a 5-day vacation to Ibiza in July — she might type it into a web app, DM it to her agent on Discord or Slack, send an iMessage, or email it; the entry point varies but the model is the same. The assistant checks her calendar for open dates, reaches out to travel agents — or, if Alice has a preferred airline, books with that airline directly — and arranges a hotel, searching options first and then escalating to actually book and charge her card. The assistant here is itself an AI agent (often a self-hosted OpenClaw agent) acting on Alice's behalf. The vacation booking is incidental; what matters is the authentication and authorization decision made at each hop. The protocol details behind "checks her calendar" and "reaches out to travel agents" are spelled out hop-by-hop below.

A note on how to read this: the assistant does **not** start out knowing which agents it will call or which scopes those calls require. It starts with one thing — Alice's message and the standing authority she delegated when she set it up. Everything else is discovered as it works: it parses the request, uses the tools it already has, finds the agents it needs, and learns each counterparty's connection requirements *from that counterparty's passport* at the moment it connects. It then works the task to completion on its own; it does not return to Alice between hops. The walkthrough is ordered to follow that real sequence of discovery, not a pre-computed plan.

This walkthrough traces every authentication and authorization decision along the way, with explicit citations to the corresponding spec sections. It is the canonical worked example for the cohesive Authentication structure ([§10.3](/spec/next#103-authentication)) and the cross-flow scope composition rules ([§2.3](/protocol/trust#23-composition-across-boundaries-multi-hop-authorization)).

![Infographic of the vacation-booking scenario. At the top, Alice delegates a single authority envelope S_h — calendar:read, travel:search, travel:book, payments:authorize — to her Personal Assistant once via OAuth 2.1; this envelope is the ceiling for everything that follows. A banner states the rule: at each hop the assistant reads the required scopes from the counterparty's passport and claims only that minimum. Six numbered, color-coded steps then trace the journey: (1) the task arrives over an authenticated channel, (2) an OAuth token exchange to a Calendar MCP server claiming calendar:read, (3) public discovery where the assistant verifies each agent's passport and reads the required scopes off it, (4) an ADL passport-plus-proof call to a Flight Agent claiming flights:search, (5) the higher-stakes flight booking that escalates to flights:book plus payments:authorize while staying within the envelope, and (6) the hotel agent claiming hotels:book plus payments:authorize. Three takeaways close it: scopes are pulled not pushed, reduced to the minimum, and every hop authenticates independently so no hop sees the full chain.](./diagrams/multi-hop-authorization.svg)

*Figure 1 — Conceptual view: one delegated envelope, reduced to the minimum scope at each hop, across three boundary types — human→agent (OAuth 2.1), agent→MCP (OAuth token exchange), and agent→agent (ADL passport + presentation proof). Required scopes are pulled from each counterparty's passport at connect time; every hop authenticates independently.*

The same multi-hop authorization, viewed as a UML sequence at the protocol level ([§2.3](/protocol/trust#23-composition-across-boundaries-multi-hop-authorization)) — the abstract Human → Agent A → Agent B shape behind the scenario above:

![UML sequence diagram of multi-hop authorization with three lifelines: Human, Agent A, and Agent B. Step 1, the human sends a request to Agent A carrying an OAuth token with scope S_h. Step 2, Agent A authorizes the human per Trust Protocol section 2.1, checking that its required scopes are a subset of S_h. Step 3, Agent A invokes upstream Agent B, presenting its passport and a presentation proof carrying scope S_a. Step 4, Agent B authorizes Agent A per section 2.2: first a ceiling check that the proof scopes are a subset of Agent A's passport scopes, then that Agent B's required scopes are a subset of the proof scopes. Step 5, Agent B returns a result to Agent A; step 6, Agent A returns a result to the human. A closing note states the two authorizations are independent: Agent A's outbound scope S_a is bounded only by Agent A's passport ceiling, not by S_h, and each hop keeps its own audit record so no single hop sees the whole chain.](./diagrams/multi-hop-authorization-sequence.svg)

*Figure 2 — Protocol view: the per-hop authorization mechanics as a UML sequence ([§2.3](/protocol/trust#23-composition-across-boundaries-multi-hop-authorization)). The §2.1/§2.2 checks run identically on every hop — that part is fixed and safe to draw — but this is **one representative trace**: which counterparties the assistant discovers, and in what order, is emergent (see the discovery note above), not a pre-set sequence.*

## Cast of actors

| Actor | Role | Identity | Notable scopes |
|-------|------|----------|----------------|
| **Alice** | Human user | Account `alice@example.com`, reaching her assistant over a linked channel (web, Discord, Slack, Teams, iMessage, or email) | What she delegated to her assistant at setup |
| **Personal Assistant** (Agent A) | Alice's main AI agent (e.g. a self-hosted OpenClaw agent) | `https://assistant.example/agents/personal-bot`, `did:web:assistant.example:agents:personal-bot` | Passport ceiling: `[calendar:read, travel:search, travel:book, payments:authorize, flights:search, flights:book, hotels:search, hotels:book]` |
| **Calendar MCP Server** | Provides calendar tools | `https://calendar.example/mcp` (OAuth 2.1 resource server) | Tools require `calendar:read` |
| **Travel Discovery** | Public agent registry | `https://travel-agents.example/.well-known/adl-agents` | None (public) |
| **Flight Booking Agent** (Agent B) | Books flights | `https://acme-flights.example/agents/booking`, `did:web:acme-flights.example:agents:booking` | Passport: `[flights:search, flights:book, payments:authorize]` |
| **Hotel Booking Agent** (Agent C) | Books hotels | `https://luxury-hotels.example/agents/concierge`, `did:web:luxury-hotels.example:agents:concierge` | Passport: `[hotels:search, hotels:book, payments:authorize]` |

## What's already in place before Alice asks

For the agent-to-agent hops to work at all, each agent has previously established cryptographic identity:

- **Personal Assistant** has an Ed25519 keypair (private key in `assistant.example`'s KMS), a DID Document at `https://assistant.example/agents/personal-bot/did.json`, and a signed passport at `https://assistant.example/agents/personal-bot`. The passport's `cryptographic_identity.public_key.value` matches the DID Document's `assertionMethod` key (the [§1.1.4](/protocol/trust#114-public-key-cross-check) cross-check anchor).
- **Flight Booking Agent** and **Hotel Booking Agent** likewise.
- The well-known discovery endpoint at `https://travel-agents.example/.well-known/adl-agents` lists active travel agents. Each entry includes the agent's `id`, `adl_document` URL, name, version, and lifecycle status.

This is the ambient trust state. None of it changes during Alice's session.

---

## How the agent works the task

Before the hop-by-hop detail, here is the shape of what actually happens — and, importantly, what the agent knows at each stage:

1. **Alice sends a starting message.** "Book me a 5-day vacation to Ibiza in July." The agent does not yet know it will talk to a flight agent, a hotel agent, or anything else. It knows only the request and its **standing authority** — the delegation envelope Alice granted when she set the assistant up (Hop 1).
2. **The agent understands the request.** It parses intent: a 5-day trip, destination Ibiza, month July, requiring dates + flights + lodging. Still no knowledge of *which* downstream agents or *what* they'll require.
3. **The agent uses the tools it already has.** It has a calendar tool, so it checks Alice's calendar for open dates (Hop 2). From this point it is acting on Alice's behalf within its own granted tools.
4. **The agent plans the next leg and finds counterparties.** Now it knows it needs flights and lodging, so it discovers candidate travel agents (Hop 3).
5. **Each counterparty declares its own connection requirements.** When the agent verifies a travel agent's passport, that passport *tells the agent* what authentication and which scopes are required to connect and to invoke each tool ([§10.3.3](/spec/next#1033-credential-schemes) + [§10.4](/spec/next#104-authorization-scopes)). The agent does not guess these — it reads them off the counterparty's passport at discovery time.
6. **The agent matches each discovered requirement against its standing authority and connects.** If a required scope is within the envelope Alice delegated, the agent presents a proof claiming exactly that scope (Hops 4–6, agent-to-agent). If it is outside the envelope, that is a genuine authority gap — see [Failure modes](#failure-modes).
7. **The agent completes the task autonomously.** It searches, then books, then confirms — without returning to Alice between steps. Alice delegated the task; the agent finishes it and reports back once, with the result.

The rest of this document is that sequence in full detail. The key thing the hops below make concrete: **required scopes are pulled from the counterparty's passport at connection time, not pre-computed by the assistant.**

---

## Hop 1: Alice → Personal Assistant

**Authentication path:** [§10.3.3](/spec/next#1033-credential-schemes) (Credential Schemes) — established once at setup, presented per message by the channel
**Authorization path:** [§2.1](/protocol/trust#21-authorization-in-human-to-agent-flows) (Human-to-Agent Flows)

Alice doesn't necessarily reach her assistant through a web app. People run agents — often an OpenClaw agent they've configured on their own machine — and talk to them over whatever channel they already live in: a Discord DM, a Slack message, a Teams chat, iMessage, email, or a web UI. The authentication model has to work across all of them, and it does, because of one separation: **delegation is established once, at setup; each task message is authenticated by the channel it arrives on.** There is no consent screen popping up mid-conversation on Discord.

### Setup (happens once, before any task)

When Alice first connects her assistant — installs the agent, links her calendar, authorizes payments — she performs the delegation. Concretely this is an OAuth 2.1 grant:

- For a web or app setup, the Authorization Code grant with PKCE in a browser.
- For a channel or device with no convenient browser, the OAuth 2.1 Device Authorization Grant ([RFC 8628]) — the "go to this URL and enter this code" flow built exactly for input-constrained setups, which is how an OpenClaw agent on a headless box or a chat channel typically gets authorized.

Either way, Alice consents **once** to a delegation envelope sized to what she wants the assistant to do, and the assistant stores the resulting tokens (with refresh tokens for longevity). This is the moment her standing authority is defined:

```
S_h = {calendar:read, travel:search, travel:book, payments:authorize}
```

The envelope is a *ceiling, not a checklist* — it bounds what the assistant may do on her behalf, and the assistant draws on whatever subset each downstream step actually requires, discovered as it goes. It is established at setup, not re-negotiated on every message.

### This message (per task)

Later, Alice sends "Book me a 5-day vacation to Ibiza in July" over her channel. The agent already holds its authority, so there is no fresh login — what the agent must do now is **bind the message to Alice's identity**, and the strength of that binding depends on the channel:

| Channel | Sender authentication | Assurance |
|---------|----------------------|-----------|
| Web / app session | Authenticated session + DPoP-bound token | High |
| Slack / Teams | Platform request signing + verified workspace user id | High |
| Discord | Verified Discord user id of the message author | Medium |
| iMessage | Sender handle (phone / Apple ID) | Medium — handle spoofing is possible |
| Email | DKIM/SPF/DMARC on the sender domain + linked address | Medium with DMARC, low without |

The agent maps the channel-authenticated sender to Alice's account, looks up her stored delegation `S_h`, and proceeds. In this model the [§10.3.3](/spec/next#1033-credential-schemes) "credential" is the channel-authenticated identity bound to the stored token set — not an interactive browser login per request. (On a web session it still looks like a classic bearer-token + DPoP request; on Discord it's a verified author id mapped to the same stored tokens. Same §10.3.3 outcome, different transport.)

### Channel assurance feeds the authorization decision

Because channels differ in how strongly they prove the sender, the [§10.4](/spec/next#104-authorization-scopes) authorization decision can factor channel assurance in alongside scope. A reasonable policy:

- **Search / read** (`travel:search`, `calendar:read`): allow on any linked channel.
- **Book / charge** (`travel:book`, `payments:authorize`): require a high-assurance channel, or a one-time step-up confirmation ("reply YES to confirm the $580 booking") when the request arrives on a medium-assurance channel like email or iMessage.

This keeps a spoofed email from triggering a real charge, without weakening the autonomous flow for low-stakes actions on trusted channels.

### The agent starts working

The assistant accepts the message and parses intent: a 5-day trip to Ibiza in July, needing dates, flights, and lodging. It sketches a rough plan — find dates, then find and engage travel agents — but it does **not** yet know which agents it will call or what they will require. Those facts get discovered in the later hops.

**Alice's standing authority, the ceiling for everything the assistant does next:**
```
S_h = {calendar:read, travel:search, travel:book, payments:authorize}
```
The assistant never needs to come back to Alice as long as each step's discovered requirement falls inside this envelope — which matters even more on a chat channel, where "going back to Alice" means sending a message and waiting, possibly hours, for a reply.

---

## Hop 2: Personal Assistant → Calendar MCP Server

**Authentication path:** OAuth 2.1 token exchange ([§10.3.3.1](/spec/next#10331-oauth-21-type-oauth2))
**Authorization path:** [§2.1](/protocol/trust#21-authorization-in-human-to-agent-flows) (the MCP server is itself an OAuth 2.1 resource server)

### Why this hop is OAuth, not passport

MCP servers in the wild are typically OAuth 2.1 resource servers. They authenticate via tokens, not via ADL passports. So even though the assistant is an ADL agent, when it calls a non-ADL MCP server, it falls back to OAuth 2.1.

If the calendar MCP did speak ADL, the assistant would use [§1.1](/protocol/trust#11-passport-verification-procedure) + [§1.2](/protocol/trust#12-presentation-proof) + [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) instead — the same machinery as Hops 4–6. The choice of authentication mechanism is a property of the *server*, not the *client*. ADL agents speak OAuth 2.1 to non-ADL servers and ADL passports to ADL servers, gracefully.

### What happens

1. The assistant exchanges Alice's token for an MCP-bound token using OAuth 2.1 Token Exchange ([RFC 8693]):
    - `POST https://auth.assistant.example/oauth/token`
    - `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`
    - `subject_token=eyJ...` (Alice's access token)
    - `subject_token_type=urn:ietf:params:oauth:token-type:access_token`
    - `actor_token=<JWT signed with assistant's key, asserting `sub=did:web:assistant.example:agents:personal-bot`>`
    - `resource=https://calendar.example/mcp`
    - `scope=calendar:read`

    The IdP returns a new access token bound to the calendar MCP audience, with `scope=calendar:read` and an `act` claim referencing the assistant's DID. This makes the audit trail reconstruct who-on-behalf-of-whom.

2. The assistant calls the MCP server: `POST /mcp/tools/find_open_dates` with `Authorization: Bearer <exchanged token>` and `DPoP: ...`.

3. The MCP server's [§10.3.3](/spec/next#1033-credential-schemes) authentication validates the token, the audience, and the DPoP binding.

4. [§2.1](/protocol/trust#21-authorization-in-human-to-agent-flows) authorization at the MCP server:
    - `required = ["calendar:read"]` for the `find_open_dates` tool.
    - `presented = ["calendar:read"]` from the exchanged token.
    - `required ⊆ presented` ✓ — authorized.

5. MCP returns `["2026-07-12", "2026-07-13", ..., "2026-07-20"]`.

**Audit record at this hop:**
- Inbound credential: exchanged OAuth token, scopes `[calendar:read]`, `act={"sub": "did:web:assistant.example:agents:personal-bot"}`, `sub=alice@example.com`
- Tool: `find_open_dates`
- Outcome: authorized

---

## Hop 3: Personal Assistant → Travel Discovery

**Authentication path:** None — public discovery endpoint
**Authorization path:** None at retrieval. **[§1.1](/protocol/trust#11-passport-verification-procedure) verification** runs on each discovered passport before they enter the assistant's candidate list.

### What happens

1. The assistant fetches `GET https://travel-agents.example/.well-known/adl-agents`. No auth.

2. The endpoint returns a discovery document listing travel agents:

    ```json
    {
      "adl_discovery": "1.0",
      "agents": [
        { "id": "https://acme-flights.example/agents/booking",
          "adl_document": "https://acme-flights.example/agents/booking",
          "name": "Acme Flight Booking", "version": "3.2.1", "status": "active" },
        { "id": "https://luxury-hotels.example/agents/concierge",
          "adl_document": "https://luxury-hotels.example/agents/concierge",
          "name": "Luxury Hotels Concierge", "version": "1.5.0", "status": "active" },
        { "id": "https://budget-air.example/agents/legacy-booking",
          "adl_document": "https://budget-air.example/agents/legacy-booking",
          "name": "Budget Air Legacy", "version": "0.9.2", "status": "deprecated" }
      ]
    }
    ```

3. For each candidate, the assistant fetches the passport (HTTPS GET to `adl_document`) and runs the full [§1.1](/protocol/trust#11-passport-verification-procedure) verification procedure:

    - **[§1.1.1](/protocol/trust#111-retrieval-integrity) Retrieval Integrity** — TLS validation against the candidate's domain.
    - **[§1.1.2](/protocol/trust#112-schema-validation) Schema Validation** — passport conforms to the ADL schema.
    - **[§1.1.3](/protocol/trust#113-identity-resolution) Identity Resolution** — resolve `did:web:acme-flights.example:agents:booking` to its DID Document at `https://acme-flights.example/agents/booking/did.json`.
    - **[§1.1.4](/protocol/trust#114-public-key-cross-check) Public Key Cross-Check** — passport's inline `cryptographic_identity.public_key.value` matches the DID Document's `assertionMethod` key.
    - **[§1.1.5](/protocol/trust#115-signature-verification) Signature Verification** — the passport signature verifies against the resolved key.
    - **[§1.1.6](/protocol/trust#116-temporal-validity) Temporal Validity** — `security.attestation.expires_at` is well in the future.
    - **[§1.1.7](/protocol/trust#117-lifecycle-gating) Lifecycle Gating** — `lifecycle.status: "active"`. (Budget Air's status is `deprecated`, which the assistant logs but doesn't filter — it's still safe to use, just with a sunset warning. If it were `retired`, the assistant would skip it entirely.)
    - **[§1.1.8](/protocol/trust#118-provideridentity-coherence) Provider–Identity Coherence** — TLS authority `acme-flights.example` matches `provider.url` host matches the `did:web` domain segment.
    - **[§1.1.9](/protocol/trust#119-permission-and-classification-compatibility) Permission/Classification Compatibility** — the assistant is invoking the agent shortly, so it pre-checks classification: assistant's `data_classification.sensitivity` (let's say `internal`) is `≥` flight agent's classification (`internal`). ✓

4. Acme Flight Booking and Luxury Hotels Concierge both pass with no warnings. Budget Air Legacy passes with a `deprecated` warning logged for ops review. The assistant's candidate list is `[Acme Flight Booking, Luxury Hotels Concierge, Budget Air Legacy(warn)]`.

### Reading each counterparty's connection requirements

Verification does more than establish trust — it hands the assistant the **requirements to connect**. The same passport the assistant just verified declares, in its own `security` and `tools` members, exactly what a caller must present. The assistant reads these off the passport; it does not guess them. From Acme Flight Booking's passport:

```yaml
security:
  authentication:
    type: oauth2          # ← but Acme also accepts ADL agent-to-agent auth; see note
  scopes: ["flights:search", "flights:book"]   # the agent's standing grant / ceiling for callers
tools:
  - name: search_flights
    security:
      scopes: ["flights:search"]               # ← required to call search_flights
  - name: book_flight
    security:
      scopes: ["flights:book", "payments:authorize"]   # ← required to call book_flight
```

This tells the assistant three things before it sends a single request:

- **Authentication path:** Acme is an ADL agent and exposes its `did:web` identity, so the assistant will authenticate agent-to-agent ([§1.1](/protocol/trust#11-passport-verification-procedure) + [§1.2](/protocol/trust#12-presentation-proof)) rather than via the human OAuth path. (A counterparty that only spoke OAuth would advertise only `security.authentication`, and the assistant would fall back to the [Hop 2](#hop-2-personal-assistant--calendar-mcp-server) pattern.)
- **What `search_flights` requires:** `flights:search`.
- **What `book_flight` requires:** `flights:book` + `payments:authorize`.

The assistant now checks those discovered requirements against Alice's standing authority (`S_h`) and its own passport ceiling. `flights:search` and `flights:book` map from Alice's delegated `travel:search` / `travel:book`; `payments:authorize` Alice delegated directly. Every requirement Acme just declared is inside the envelope — so the assistant can proceed autonomously, with no trip back to Alice.

**Audit record at this hop:**
- Verification outcome per candidate (verified, public key source, lifecycle warnings)
- For Budget Air specifically: verified=true, severity=warn at [§1.1.7](/protocol/trust#117-lifecycle-gating)
- Discovered connection requirements per chosen agent (auth path + per-tool required scopes)

The assistant decides to use Acme Flight Booking and Luxury Hotels Concierge.

---

## Hop 4: Personal Assistant → Flight Booking Agent (search)

**Authentication path:** [§1.1](/protocol/trust#11-passport-verification-procedure) (passport already verified in Hop 3, cached) + [§1.2](/protocol/trust#12-presentation-proof) (presentation proof, fresh per request)
**Authorization path:** [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) (Agent-to-Agent Flows)

### Constructing the proof

The assistant does not invent a scope set here. It already learned in Hop 3, from Acme's passport, that `search_flights` requires exactly `flights:search`. So the claim for this request is determined by the counterparty's declared requirement, then confirmed against Alice's standing authority:

```
required (from Acme's passport)  = {flights:search}                  # discovered in Hop 3
S_h (Alice's standing authority) = {calendar:read, travel:search, travel:book, payments:authorize}
map(travel:search)               = {flights:search, hotels:search}    # vocabulary translation
assistant ceiling                = {..., flights:search, flights:book, ...}

required ⊆ map(S_h) ∩ ceiling  ?  YES  → claim exactly `required`
```

This is the **reduction pattern** from [§2.3](/protocol/trust#23-composition-across-boundaries-multi-hop-authorization) applied per-counterparty: the requirement is pulled from the counterparty, not pushed by the assistant, and the assistant claims the minimum the counterparty asked for rather than the maximum Alice granted. For *this* search request, that minimum is `flights:search`.

```json
{
  "adl_proof": "1.0",
  "iss": "https://assistant.example/agents/personal-bot",
  "iat": "2026-05-06T14:30:00Z",
  "exp": "2026-05-06T14:35:00Z",
  "jti": "01HXAA2K8N3M9P4Q5R6S7T8V9W",
  "request": {
    "method": "POST",
    "uri": "https://acme-flights.example/agents/booking/tools/search_flights"
  },
  "scopes": ["flights:search"],
  "signature": {
    "algorithm": "Ed25519",
    "value": "<base64url Ed25519 signature over JCS canonical bytes>",
    "signed_content": "canonical"
  }
}
```

The signature covers the JCS-canonical form of the proof minus the `signature` object (per [§1.2.6.5](/protocol/trust#126-verification-procedure)). Since `scopes` is part of the canonical bytes, an attacker who scrapes the proof cannot replay it with an expanded scope set.

### Request

```http
POST /agents/booking/tools/search_flights HTTP/1.1
Host: acme-flights.example
ADL-Passport: <Base64-encoded YAML of assistant's signed passport>
ADL-Proof: <Base64-encoded JSON of the proof above>
Content-Type: application/json

{ "origin": "JFK", "destination": "IBZ", "depart": "2026-07-12", "return": "2026-07-17", "passengers": 1 }
```

### Verification at Acme Flight Booking

1. **[§1.1](/protocol/trust#11-passport-verification-procedure) Passport Verification** — already cached from Hop 3 (or re-run fresh if cache expired). All 9 steps pass.

2. **[§1.2.6](/protocol/trust#126-verification-procedure) Proof Verification:**
    - **[§1.2.6.1](/protocol/trust#126-verification-procedure) Parsing** — proof is valid JSON, all required members present.
    - **[§1.2.6.2](/protocol/trust#126-verification-procedure) Issuer Match** — proof.iss `https://assistant.example/agents/personal-bot` equals passport.id ✓.
    - **[§1.2.6.3](/protocol/trust#126-verification-procedure) Temporal Validity** — current time is between `iat - 60s` and `exp + 60s`, and `exp - iat ≤ 5min` ✓.
    - **[§1.2.6.4](/protocol/trust#126-verification-procedure) Request Binding** — proof.request.method = `POST` matches actual method ✓; proof.request.uri canonicalizes to actual URI ✓.
    - **[§1.2.6.5](/protocol/trust#126-verification-procedure) Signature Verification** — Ed25519 signature verifies against JCS canonical bytes using the verification key from [§1.1.4](/protocol/trust#114-public-key-cross-check) ✓.
    - **[§1.2.6.6](/protocol/trust#126-verification-procedure) Replay Prevention** — `jti` not in the verifier's recent-cache ✓; insert it.
    - **[§1.2.6.7](/protocol/trust#126-verification-procedure) Nonce Verification** — N/A (no server-issued nonce required).

3. **[§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) Authorization (Agent-to-Agent):**
    - **Step 1:** Authentication done.
    - **Step 2: Establish ceiling.** Calling agent's passport `security.scopes` is `[calendar:read, travel:search, travel:book, payments:authorize, flights:search, flights:book, hotels:search, hotels:book]`. This is the ceiling.
    - **Step 3: Extract requested scopes.** `proof.scopes = ["flights:search"]`.
    - **Step 4: Verify ceiling subset.** `["flights:search"] ⊆ ceiling` ✓.
    - **Step 5: Determine required.** `tools[search_flights].security.scopes` is declared as `["flights:search"]`. So `required = ["flights:search"]`.
    - **Step 6: Authorize.** `["flights:search"] ⊆ ["flights:search"]` ✓ — authorized.

4. The flight agent runs its actual search and returns 8 candidate flights.

**Audit record at this hop:**
- Inbound: passport DID `did:web:assistant.example:agents:personal-bot`, proof.scopes `[flights:search]`, ceiling `[flights:search, flights:book, payments:authorize]` (the relevant subset)
- Tool: `search_flights`
- Required scopes: `[flights:search]`
- Outcome: authorized
- Note: **Alice's identity is not visible to the flight agent** — Hop 4 sees only the assistant's identity. If the flight agent needed Alice's identity (e.g., for fraud scoring), the assistant would have to include it in the request body or via a separate vouching mechanism. The protocol-level audit chain is per-hop.

---

## Hop 5: Personal Assistant → Flight Booking Agent (book)

**Authentication path:** [§1.1](/protocol/trust#11-passport-verification-procedure) (cached) + [§1.2](/protocol/trust#12-presentation-proof) (fresh per request)
**Authorization path:** [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) with **escalated scopes**

### What's different about booking

Alice picked a flight from the search results. Booking is a higher-stakes operation, and Acme's passport said so back in Hop 3: `book_flight` requires `flights:book` + `payments:authorize`, where search required only `flights:search`. The requirement *escalates*, and the assistant escalates the scopes it claims to match — but only as far as the counterparty asked, and only within Alice's envelope.

### Confirming authority before booking

The assistant re-checks the discovered requirement against Alice's standing authority — the same check as Hop 4, with the escalated requirement:

```
required (from Acme's passport)  = {flights:book, payments:authorize}    # discovered in Hop 3
S_h                              = {calendar:read, travel:search, travel:book, payments:authorize}
map(travel:book)                 = {flights:book, hotels:book}
                                   payments:authorize delegated directly
assistant ceiling                = {..., flights:book, payments:authorize, ...}

required ⊆ map(S_h) ∩ ceiling  ?  YES → claim exactly `required`, proceed autonomously
```

Because booking is within the envelope Alice already delegated, the assistant proceeds without returning to Alice. It does not pause mid-task to re-confirm — Alice asked it to book a vacation, and booking is part of that. (The case where a requirement falls *outside* the envelope is covered in [Failure modes](#failure-modes); the short version is that it's resolved when the delegation is set up, not mid-task.)

### Constructing the proof

```json
{
  "adl_proof": "1.0",
  "iss": "https://assistant.example/agents/personal-bot",
  "iat": "2026-05-06T14:32:00Z",
  "exp": "2026-05-06T14:37:00Z",
  "jti": "01HXAA3M9P4Q5R6S7T8V9W0X1Y",
  "request": {
    "method": "POST",
    "uri": "https://acme-flights.example/agents/booking/tools/book_flight"
  },
  "scopes": ["flights:book", "payments:authorize"],
  "signature": { ... }
}
```

Note: a different `jti` (replay prevention is per-request), a different request URI (different tool), a different scope set (escalated), but the same `iss` (same agent) and the same passport.

### Verification at Acme Flight Booking

[§1.1](/protocol/trust#11-passport-verification-procedure) cached. [§1.2.6](/protocol/trust#126-verification-procedure) runs fresh on the new proof — all checks pass.

[§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) authorization:
- Ceiling check: `[flights:book, payments:authorize] ⊆ ceiling` ✓.
- Required: `tools[book_flight].security.scopes = [flights:book, payments:authorize]`.
- Match: `[flights:book, payments:authorize] ⊆ [flights:book, payments:authorize]` ✓.

The flight agent books the flight, charges the payment method (Alice's card on file with the assistant — pre-authorized via the OAuth grant), returns confirmation.

---

## Hop 6: Personal Assistant → Hotel Booking Agent

Same pattern as Hops 4 & 5, but against `https://luxury-hotels.example/agents/concierge` with `hotels:search` then `hotels:book + payments:authorize`. The cached [§1.1](/protocol/trust#11-passport-verification-procedure) verification of the hotel agent's passport reused; fresh [§1.2](/protocol/trust#12-presentation-proof) proof per request; [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) ceiling and tool checks identical in shape.

---

## End-to-end audit reconstruction

The audit chain looks like:

```
[Hop 1]  Alice → Assistant
         sub=alice@example.com   channel=discord (author id verified, medium assurance)
         standing scopes=[calendar:read, travel:search, travel:book, payments:authorize]  (delegated at setup)
         tool=chat   outcome=authorized

[Hop 2]  Assistant → Calendar MCP
         token: act={did:web:assistant.example:agents:personal-bot}, sub=alice@example.com, scope=[calendar:read]
         tool=find_open_dates   outcome=authorized

[Hop 3]  Assistant → Discovery (no auth, but verification of each candidate passport)
         outcomes: [Acme Flights: verified, Luxury Hotels: verified, Budget Air: verified+warn(deprecated)]

[Hop 4]  Assistant → Flight Agent
         passport=did:web:assistant.example:agents:personal-bot, proof.scopes=[flights:search]
         tool=search_flights   outcome=authorized

[Hop 5]  Assistant → Flight Agent
         passport=did:web:assistant.example:agents:personal-bot, proof.scopes=[flights:book, payments:authorize]
         tool=book_flight   outcome=authorized

[Hop 6a] Assistant → Hotel Agent
         passport=did:web:assistant.example:agents:personal-bot, proof.scopes=[hotels:search]
         tool=search_hotels   outcome=authorized

[Hop 6b] Assistant → Hotel Agent
         passport=did:web:assistant.example:agents:personal-bot, proof.scopes=[hotels:book, payments:authorize]
         tool=book_hotel   outcome=authorized
```

Each hop records its own row. No single hop sees the entire chain. End-to-end reconstruction requires correlating by request id, by Alice's session, by the assistant's actor token (which carries her sub through the calendar exchange), or by the assistant's passport DID (which is constant across all upstream hops).

If a regulator later asks "did Alice authorize this booking?", the chain reconstructs:

- Alice's OAuth grant included `travel:book` and `payments:authorize` (at the assistant)
- The assistant's passport ceiling included `flights:book` and `payments:authorize` (at the flight agent)
- Both proofs at Hop 5 declared scopes within both bounds
- Therefore the booking was authorized end-to-end, with both layers of consent recorded

---

## Failure modes

### The discovered requirement falls outside Alice's delegated envelope

Suppose Alice's standing authority is `{calendar:read, travel:search, travel:book}` — she never delegated `payments:authorize`. When the assistant reads Acme's `book_flight` requirement in Hop 3, it discovers `payments:authorize` is required but not in the envelope:

```
required (from Acme's passport)  = {flights:book, payments:authorize}
S_h                              = {calendar:read, travel:search, travel:book}   # no payments:authorize
required ⊆ map(S_h) ∩ ceiling    ?  NO — payments:authorize is outside the envelope
```

This is a genuine authority gap, and the right place to resolve it is **at delegation time, not mid-task**. The assistant should request an envelope sized to the intent up front: a request to "book a vacation" plainly implies authority to pay, so the assistant requests `payments:authorize` in the original Hop 1 consent. A well-designed assistant catches an under-sized envelope before it starts work — by comparing the parsed intent against the granted scopes the moment Alice's message arrives — and asks for the missing grant once, at the start, rather than discovering it three hops deep.

If the gap is only discovered mid-task (e.g., a counterparty requires a scope the assistant could not have anticipated from the intent), the assistant has two honest options: complete the part of the task it *is* authorized for and report what it could not do, or pause and request the additional grant. It does **not** silently claim authority it wasn't given — the upstream [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) ceiling check (next failure mode) is the backstop that makes sure of that. The design goal is that this is rare: front-loading the delegation to match the intent keeps the agent working autonomously to completion in the common case.

### The assistant's passport ceiling doesn't include `flights:book`

Maybe the assistant was provisioned without `flights:book` because the operator didn't enable that capability. At Hop 5, the assistant could *try* to issue the proof anyway, but the flight agent's [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) step 4 (ceiling subset check) would reject:

```
proof.scopes = [flights:book, payments:authorize]
ceiling      = [calendar:read, travel:search, ..., flights:search, hotels:search, hotels:book]   # no flights:book

[flights:book, payments:authorize] ⊆ ceiling  ?  NO
```

The flight agent rejects with a structured error pointing at [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) step 4. The assistant logs the misconfiguration and reports back to Alice that flight booking isn't enabled for this assistant.

A well-designed assistant catches this BEFORE the request via a passport self-check (the assistant reads its own passport's ceiling), but the upstream check is the security backstop.

### Flight agent's lifecycle is `retired`

The discovery document at Hop 3 listed Acme Flight Booking as `active`, but between Hop 3 and Hop 4 the agent was retired. When the assistant re-runs [§1.1](/protocol/trust#11-passport-verification-procedure) on the cached passport (or hits a still-cached signed passport whose lifecycle changed in the document at the canonical URL), [§1.1.7](/protocol/trust#117-lifecycle-gating) catches it:

- If the cached passport says `active` but the canonical URL now says `retired`, the [§1.1.3](/protocol/trust#113-identity-resolution) byte-sequence check catches the divergence (the old passport doesn't match the current canonical version).
- If the assistant re-fetches and gets the new `retired` passport, [§1.1.7](/protocol/trust#117-lifecycle-gating) hard-blocks.

Either way, the assistant falls back to the next candidate (Budget Air Legacy, with the deprecated warning) or surfaces the issue to Alice.

### Personal Assistant's proof gets replayed by an attacker

Someone captures the `ADL-Proof` header from Hop 4 (a search) and replays it at Hop 5 (a book). They want the *book* tool's effect using the *search* tool's proof.

[§1.2.6.4](/protocol/trust#126-verification-procedure) catches this: the replayed proof has `request.uri = .../search_flights` but the actual request URL is `.../book_flight`. URI mismatch → reject.

If the attacker also tries to replay the proof at the same URI (a duplicate search), [§1.2.6.6](/protocol/trust#126-verification-procedure) catches it: the `jti` is in the recent-cache → reject.

If the attacker has *forged* a proof for the right URI but signed with their own key, [§1.2.6.5](/protocol/trust#126-verification-procedure) catches it: the signature doesn't verify against the assistant's key.

If the attacker has the assistant's private key, none of this matters — the assistant has been compromised, and operational rotation (rotating the keypair, issuing a new attestation, marking the old as superseded via §5.6 lifecycle) is the answer. The presentation proof addresses replay; private key compromise is out of scope per [§1.2.1](/protocol/trust#121-threat-model).

---

## Spec section index

For implementers building this scenario:

| Step | Spec section |
|------|--------------|
| Alice's setup-time delegation (web OAuth or device-code grant) | [§10.3.3.1](/spec/next#10331-oauth-21-type-oauth2) OAuth 2.1 + RFC 8628 |
| Channel-authenticated message bound to standing delegation | [§10.3.3](/spec/next#1033-credential-schemes) |
| Channel assurance factored into the authorization decision | [§10.4](/spec/next#104-authorization-scopes) |
| Authorize Alice's request to assistant | [§2.1](/protocol/trust#21-authorization-in-human-to-agent-flows) |
| Token exchange to MCP | [§10.3.3.1](/spec/next#10331-oauth-21-type-oauth2) + RFC 8693 |
| MCP tool authorization | [§2.1](/protocol/trust#21-authorization-in-human-to-agent-flows) |
| Discovery retrieval | [§6.4](/spec/next#64-discovery) |
| Per-candidate verification | [§1.1](/protocol/trust#11-passport-verification-procedure) (all 9 steps) |
| Passport caching | [§1.1](/protocol/trust#11-passport-verification-procedure) (implementation discretion; vector pack covers freshness) |
| Proof construction | [§1.2](/protocol/trust#12-presentation-proof) (build) |
| Proof signing | [§10.2](/spec/next#102-attestation) + [§1.2](/protocol/trust#12-presentation-proof) |
| Proof verification at upstream | [§1.2.6](/protocol/trust#126-verification-procedure) (all 7 sub-steps) |
| Ceiling check | [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) step 4 |
| Required-scope check | [§2.2](/protocol/trust#22-authorization-in-agent-to-agent-flows) step 6 |
| Cross-hop authorization independence | [§2.3](/protocol/trust#23-composition-across-boundaries-multi-hop-authorization) (independent vs. reduction patterns) |
| Audit recording | [§2.3](/protocol/trust#23-composition-across-boundaries-multi-hop-authorization) (multi-hop record requirement) |

## Related material

- [Draft spec §10 (Security)](/spec/next#10-security)
- [Draft spec §10.3 (Authentication)](/spec/next#103-authentication)
- [Draft spec §10.4 (Authorization Scopes)](/spec/next#104-authorization-scopes)
- [Draft spec §6.4 (Discovery)](/spec/next#64-discovery)
- [Test vector pack](https://github.com/adl-spec/agent-definition-language/tree/main/core/_next/test-vectors/verify) (GitHub)
- [OpenClaw passport reference example](https://github.com/adl-spec/agent-definition-language/tree/main/packages/adl-agent/examples/openclaw-passport) (GitHub)


