---
id: index
title: Patterns
sidebar_position: 1
description: Worked deployment patterns that trace real-world agent topologies through the ADL specification end-to-end.
keywords: [adl, patterns, deployment patterns, scenarios, authentication, authorization, oauth, passport, did:web, multi-hop]
---

# Patterns

Worked deployment patterns that trace real-world agent topologies through the spec end-to-end. Each pattern cites specific section numbers — [§1.1](/protocol/trust#11-passport-verification-procedure) verification, [§1.2](/protocol/trust#12-presentation-proof) presentation proof, [§10.3.3](/spec/next#1033-credential-schemes) credential schemes, [§10.4](/spec/next#104-authorization-scopes) authorization scopes — so an implementer reading along can move from "I want this behavior in production" to "the normative paragraph that says how" in one lookup.

This section is **non-normative**. The normative content lives in the [specification](/spec/next). Patterns illustrate composition, document failure modes, and provide regulators or auditors with reconstructable end-to-end traces — but if a pattern ever conflicts with the spec, the spec wins.

## What belongs here

- **Multi-hop scenarios** that exercise the cohesive Authentication structure ([§10.3](/spec/next#103-authentication)) and Authorization Scopes ([§10.4](/spec/next#104-authorization-scopes)) across both the human/external boundary ([§10.3.3](/spec/next#1033-credential-schemes) OAuth 2.1) and the agent-to-agent boundary ([§1.1](/protocol/trust#11-passport-verification-procedure) + [§1.2](/protocol/trust#12-presentation-proof)).
- **Real-world deployment shapes** with concrete actors, scopes, audit chains, and failure modes — not abstract "Alice and Bob" pedagogy.
- **Cross-flow composition** where the [§2.3](/protocol/trust#23-composition-across-boundaries-multi-hop-authorization) independent-vs-reduction patterns become operationally visible.

## What does not belong here

- **Standalone ADL document samples** — those go in [Examples](/spec/next/examples) (e.g. `minimal.yaml`, `production.yaml`).
- **Test vectors** — those go in `core/_next/test-vectors/`, with their own SCHEMA.md and conformance runners.
- **Implementer guides** that prescribe "do these steps to build X" — patterns describe how the spec composes, not how to build something.

## Index

| Pattern | Illustrated by | Authentication paths | Authorization patterns |
|---------|----------------|----------------------|------------------------|
| [Multi-hop authentication and authorization](./multi-hop-authorization) | Vacation-booking scenario: human → assistant → MCP calendar / travel discovery / flight + hotel agents | OAuth 2.1, OAuth Token Exchange, ADL passport + presentation proof | Scope reduction across hops, escalated scopes for booking, sender-constrained `proof.scopes` |
| [Exposing agents to external callers](./exposing-agents) | Fortune-50 brokerage scenario: human client website chat + well-known discovery for peer agents | OIDC per session, ADL passport + presentation proof per request | Entitlements as scopes, provider allowlist + attestation, classification gating, step-up for high-stakes |
| [Verifying inbound callers (the PEP)](./inbound-verification) | One Policy Enforcement Point across host shapes — agent-runtime plugin, AI-aware gateway, dedicated ADL verifier, and (incidentally) a generic API gateway | OIDC (human path) + ADL passport/proof (agent path) at one PEP | Ceiling + route-required scopes, principal/delegation enforcement, classification gating, verification boundary vs internal trust domain |
| [Mediating agent egress through an AI gateway](./ai-gateway) | Support-agent platform behind an AI gateway (Kong AI / Cloudflare / Portkey / LiteLLM): model + tool + agent-to-agent egress | Gateway custodies the agent key, constructs passport + proof + delegation per outbound call | Key custody, per-call tool/MCP credentialing, budget + classification enforcement, model routing vs declared model |

## Conventions

- **One pattern per file**, named after the capability it demonstrates.
- **Section anchors** at the end of every pattern mapping every operation to the exact `§10.x.y.z` it cites.
- **Failure modes section** documenting what happens when each authentication or authorization gate rejects.
- **End-to-end audit reconstruction** showing how the chain reconstructs across hops where no single hop sees the full picture.
- **Unversioned living guidance**: patterns are non-normative and track the current spec; they are not snapshotted per release.
