---
id: ai-gateway
title: Mediating Agent Egress through an AI Gateway
sidebar_position: 5
description: How an AI gateway (Kong AI Gateway, Cloudflare AI Gateway, Portkey, LiteLLM, Databricks Mosaic AI Gateway) mediates an agent's outbound model, tool, and agent-to-agent traffic — custodying the agent's ADL signing key, constructing presentation proofs and delegation links, and enforcing resource and data-classification policy.
keywords: [adl, pattern, ai gateway, egress, llm gateway, model routing, mcp, tool mediation, key custody, presentation proof, delegation, resource limits, guardrails, kong, cloudflare, portkey, litellm]
---

# Mediating Agent Egress through an AI Gateway

**The pattern:** an organization runs its agents behind an **AI gateway** — Kong AI Gateway, Cloudflare AI Gateway, Portkey, LiteLLM, TrueFoundry, Databricks Mosaic AI Gateway, and the like — that mediates the agents' **outbound** AI traffic: model calls (routed across providers, cached, budgeted), tool and MCP calls, and agent-to-agent calls. Because the gateway is the point where an agent's *reasoning* ("call tool X", "ask the model", "delegate to sub-agent Y") becomes an authenticated *request*, it is the natural place to custody the agent's ADL signing key, construct its presentation proofs ([§10.3.2](/protocol#1032-presentation-proof)) and delegation links, attach its passport ([§10.3.1](/protocol#1031-passport-verification-procedure)), and enforce the resource and data-handling policy the passport declares.

This is a **deployment pattern**. The AI gateway sits on the agent's **egress** edge, the mirror image of the inbound enforcement edge in [Verifying Inbound Callers (the PEP)](./inbound-verification). One organization will often run both: an inbound PEP verifying callers arriving at its agents, and an AI gateway mediating its agents' outbound traffic.

> **AI gateway vs. inbound PEP vs. OpenClaw plugin.** An *inbound PEP* ([inbound-verification](./inbound-verification)) verifies callers arriving at a provider. An *AI gateway* mediates an agent's outbound model/tool/agent traffic (egress + signing + tool mediation). The *OpenClaw gateway plugin* is one specific agent-runtime's ADL integration — and a natural host for the inbound PEP. The ADL primitives are the same across all three; the position and the job differ.

**Illustrated through a scenario:** Helios Support runs customer-support agents on an internal platform. Every outbound call those agents make goes through the Helios AI gateway: it routes model calls across providers (with the agent's declared model as the intent and fallbacks behind it), serves some from a semantic cache, mediates internal knowledge-base tools over MCP, and brokers calls to an external shipping carrier's agent to check delivery status on a customer's behalf. The support work is incidental; what matters is that one egress layer turns the agent's reasoning into authenticated, policy-bounded requests without the reasoning layer ever holding a key.

## Cast of actors

| Actor | Role | Identity | Notes |
|-------|------|----------|-------|
| **Helios AI Gateway** | Egress mediation + signing layer | `did:web:helios.example:gateways:egress` (its own passport) | Custodies each agent's ADL private key in a KMS; routes model calls; mediates tools/MCP; enforces budgets + guardrails. |
| **Support Agent** | Helios agent (the principal's delegate) | `https://helios.example/agents/support-bot`, `did:web:helios.example:agents:support-bot` | Declares its `model` ([§7.1](/spec/next#71-model)), `permissions.resource_limits` ([§9.6](/spec/next#96-resource-limits)), and `data_classification` ([§10.1](/spec/next#101-data-classification)) in its passport. |
| **Model providers** | LLM backends | (OpenAI, Anthropic, Bedrock, …) | The gateway routes/falls back across these; provider API keys are vaulted in the gateway. |
| **Knowledge MCP tools** | Internal tools | MCP servers, OAuth 2.1 resource servers | Reached via the gateway, which attaches the right credential per call. |
| **Carrier Agent** | External peer agent | `https://carrier.example/agents/tracking`, `did:web:carrier.example:agents:tracking` | Called agent-to-agent; the gateway signs the proof + delegation chain. |
| **Customer (Dana)** | Human principal | OIDC subject `dana@example.com` | Delegated the support interaction; rides as `sub` in outbound proofs. |

## What the AI gateway does, in ADL terms

### 1. Custodies the signing key and constructs the credential (the headline role)

The reasoning/LLM layer of an agent should not hold its ADL private key. The AI gateway holds it (KMS/HSM) and, for each outbound call that needs ADL credentials, constructs them on the agent's behalf:

- Attaches the agent's passport ([§10.3.1](/protocol#1031-passport-verification-procedure)).
- Builds and signs the **presentation proof** ([§10.3.2](/protocol#1032-presentation-proof)) bound to the specific outbound request (method + target URI), claiming the minimum scopes the counterparty requires.
- Injects the **principal** (`sub`, the customer) and **mints delegation links** when the agent delegates onward to a sub-agent — the egress gateway is where the signed `act` chain is produced, because it is the holder of the agent's key. (See the multi-hop and delegation models in [Multi-Hop Authentication and Authorization](./multi-hop-authorization).)

This concentrates a powerful capability — the gateway can sign *as* the agent — which is the central tension below.

### 2. Mediates tool and MCP calls

When the agent reasons that it needs a tool, the call passes through the gateway, which attaches the right credential **per call**:

- For an ADL-speaking tool/agent: passport + presentation proof ([§10.3.1](/protocol#1031-passport-verification-procedure) / [§10.3.2](/protocol#1032-presentation-proof)).
- For an OAuth tool/MCP server: the OAuth 2.1 token (or a token-exchanged downstream token), per the credential schemes in [§10.3.3](/spec/next#1033-credential-schemes).

This is the operational answer to "the tools an agent reasons it needs have their own authN/authZ that must be obtained and presented" — the gateway is where obtaining-and-presenting happens, uniformly, instead of in each agent's prompt-driven logic.

### 3. Enforces resource, cost, and classification policy

The AI gateway is the runtime enforcement point for declarations the passport only *states*:

- **Budgets / token + spend caps** map onto `permissions.resource_limits` ([§9.6](/spec/next#96-resource-limits)). The gateway refuses calls that would exceed the agent's declared limits.
- **Guardrails / PII redaction / content moderation** map onto `data_classification` handling ([§10.1](/spec/next#101-data-classification)) — `encryption_required`, `anonymization_required`, `logging_required` are enforced on the actual prompt and completion traffic, not just declared.

### 4. Routes model calls against the declared model

The agent's passport declares its intended model ([§7.1](/spec/next#71-model)). The gateway routes to that model, with provider fallbacks and semantic caching behind it. This is convenient and cost-effective — but it opens a gap between *declared* and *actually-served* model that matters for trust and audit (a request the passport says ran on a frontier model may have been silently rerouted to a cheaper one, or served from cache). Capturing runtime evidence of which model actually served a request is being specified separately as model-provenance attestation; the AI gateway is the natural place to emit it, since it sits between the agent and the model.

## Outbound request lifecycle through the gateway

The Support Agent decides to ask the Carrier Agent for a delivery status, on Dana's behalf:

1. **Reasoning emits an intent.** The agent's model output is a structured call: "ask carrier.example/tracking for order #4471 status." The reasoning layer holds no key and constructs no credential.
2. **The gateway resolves and verifies the counterparty.** It discovers / fetches the Carrier Agent's passport and runs [§10.3.1](/protocol#1031-passport-verification-procedure) verification, reading the carrier's declared connection requirements (auth path + per-tool scopes) off the passport.
3. **The gateway constructs the credential.** It signs a presentation proof bound to the carrier's `track_order` URL, claims the minimum scope the carrier requires, sets `sub` = Dana (with her grant), and appends any delegation link if the support agent is itself a delegate.
4. **The gateway enforces egress policy.** Token budget check ([§9.6](/spec/next#96-resource-limits)), data-classification handling on the outbound payload ([§10.1](/spec/next#101-data-classification) — strip customer PII the carrier doesn't need), and the org's egress allowlist (may this agent talk to `carrier.example` at all?).
5. **The gateway sends the request** with `X-ADL-Passport` + `X-ADL-Proof`. The carrier (or its own inbound PEP) verifies it as in the [inbound-verification](./inbound-verification) pattern.
6. **Model calls follow the same shape.** When the agent calls the LLM, the gateway routes to the declared model (or a fallback / cache), enforces the same budget and classification policy, and records what actually served the request.
7. **Audit.** The gateway emits one egress record per call — the agent identity, the principal/delegation it asserted, the counterparty, the scopes claimed, and (for model calls) the actual model/serving mode — correlated by request id.

## The central tension: key custody

Putting the agent's signing key in the gateway is the whole value (no keys in the model layer, uniform credential construction, central policy) and the whole risk. **The gateway can sign proofs and mint delegation links *as* the agent.** That makes it an extraordinarily high-value target and a hard trust boundary. Mitigations an ADL deployment should insist on:

- **The gateway has its own ADL identity** (its own passport/keypair), distinct from the agents it signs for, so its actions are attributable.
- **Scope what the gateway may sign for** — which agents, which counterparties, which scope ceilings — and enforce it in the gateway, not just trust the model output.
- **Custody the agent keys in a KMS/HSM**, not in gateway process memory; the gateway requests signatures, it doesn't export keys.
- **Audit every signature** the gateway produces on an agent's behalf, so a compromised gateway leaves a trail.
- **Verify, don't mint trust** — the same discipline as any gateway: the gateway authenticates the agent's *own* reasoning context and the principal's grant before signing; it does not fabricate authority the agent or principal never had. Attenuation still applies — the gateway can only sign for scopes within the agent's ceiling and the principal's grant.

## Failure modes

### The gateway is asked to sign beyond the agent's ceiling

The agent's reasoning requests a scope the agent's passport ceiling doesn't include. The gateway refuses to sign — it cannot construct a proof claiming scopes outside the ceiling (the downstream [§10.4.4](/protocol#1044-authorization-in-agent-to-agent-flows) check would reject it anyway, but the egress gateway should catch it first). The agent is told the capability isn't enabled.

### Model rerouting drifts from the declared model

The passport declares a frontier model; the gateway falls back to a cheaper one under load, or serves from semantic cache. Without runtime evidence, a downstream consumer trusts the declaration blindly. The mitigation is model-provenance attestation (separate specification) emitted by the gateway, recording the actual model and serving mode so drift is visible in audit.

### Compromised gateway signs rogue requests

If the gateway is compromised, it can sign as every agent it custodies keys for — a catastrophic blast radius. This is why the gateway's own identity, per-agent signing scope, KMS-backed keys, and signature audit are not optional. Note this is distinct from passport private-key compromise of a single agent; the egress gateway concentrates many agents' signing capability and must be protected accordingly.

### Egress to a disallowed counterparty

The agent reasons its way to calling an external service the org hasn't approved. The gateway's egress allowlist blocks it before any credential is constructed — the reasoning layer cannot reach the network directly.

## Spec section index

| Gateway operation | Spec section |
|-------------------|--------------|
| Verify the counterparty's passport | [§10.3.1](/protocol#1031-passport-verification-procedure) |
| Construct + sign the presentation proof | [§10.3.2](/protocol#1032-presentation-proof) |
| Attach OAuth credential for OAuth tools/MCP | [§10.3.3](/spec/next#1033-credential-schemes) |
| Claim scopes within the agent ceiling | [§10.4.4](/protocol#1044-authorization-in-agent-to-agent-flows) |
| Enforce token/spend budgets | [§9.6](/spec/next#96-resource-limits) |
| Enforce data-handling on prompts/completions | [§10.1](/spec/next#101-data-classification) |
| Route against the declared model | [§7.1](/spec/next#71-model) |
| Discover counterparty agents | [§6.4](/spec/next#64-discovery) |

## Related material

- [Verifying Inbound Callers (the PEP)](./inbound-verification) — the inbound mirror; the AI gateway's outbound proofs are what an inbound PEP verifies
- [Multi-Hop Authentication and Authorization](./multi-hop-authorization) — the proofs and delegation the AI gateway constructs
- [Exposing Agents to External Callers](./exposing-agents) — the provider edge a mediated egress call arrives at
- [Draft spec §7 (Model Configuration)](/spec/next#7-model-configuration)
- [Draft spec §9 (Permissions)](/spec/next#9-permissions)
- [Draft spec §10.3 (Authentication)](/spec/next#103-authentication)
