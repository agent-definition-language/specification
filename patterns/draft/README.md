# Patterns

Worked, version-pinned deployment patterns that trace real-world agent topologies through the spec end-to-end. Each pattern in this directory cites specific section numbers (`§10.3.1.x`, `§10.4.4` step N, etc.) so an implementer reading along can move from "I want this behavior in production" to "the normative paragraph that says how" in one lookup.

This directory is **non-normative**. The normative content lives in [`spec.md`](../spec.md). Patterns illustrate composition, document failure modes, and provide regulators or auditors with reconstructable end-to-end traces — but if a pattern ever conflicts with the spec, the spec wins.

## What belongs here

- **Multi-hop scenarios** that exercise the cohesive Authentication structure (§10.3) and Authorization Scopes (§10.4) across both the human/external boundary (§10.3.3 OAuth 2.1) and the agent-to-agent boundary (§10.3.1 + §10.3.2).
- **Real-world deployment shapes** with concrete actors, scopes, audit chains, and failure modes — not abstract "Alice and Bob" pedagogy.
- **Cross-flow composition** where the §10.4.5 independent-vs-reduction patterns become operationally visible.

## What does not belong here

- **Standalone ADL document samples** — those go in [`../examples/`](../examples/) (e.g. `minimal.yaml`, `production.yaml`).
- **Test vectors** — those go in [`../test-vectors/`](../test-vectors/), with their own SCHEMA.md and conformance runners.
- **Implementer guides** that prescribe "do these steps to build X" — patterns describe how the spec composes, not how to build something. If we add prescriptive how-tos, they should land in a separate `guides/` or `tutorials/` directory.

## Convention

- **One pattern per file, named after the capability — not the scenario.** A pattern is a high-level deployment shape the specification enables (e.g. `multi-hop-authorization.md`, `inbound-verification.md`, `ai-gateway.md`). The illustrating scenario (vacation booking, trade settlement, etc.) lives *inside* the file as the vehicle for demonstrating the pattern; it does not name the file.
- **Section anchors** at the end of every pattern mapping every operation in the scenario to the exact `§10.x.y.z` it cites — so the pattern stays auditable as the spec evolves.
- **Failure modes section** documenting what happens when each authentication or authorization gate rejects.
- **End-to-end audit reconstruction** showing how a regulator or auditor reconstructs the chain across hops where no single hop sees the full picture.
- **Version-pinned**: this directory lives under `core/draft/`. When the draft is released as `0.3.0`, the patterns move with it (`core/0.3.0/patterns/`). Subsequent revisions update spec section references in lockstep.

## Index

| Pattern | Illustrated by | Authentication paths | Authorization patterns |
|---------|----------------|----------------------|------------------------|
| [multi-hop-authorization.md](./multi-hop-authorization.md) | Vacation-booking scenario: human → assistant → MCP calendar / travel discovery / flight + hotel agents | OAuth 2.1, OAuth Token Exchange, ADL passport + presentation proof | Scope reduction across hops, escalated scopes for booking, sender-constrained `proof.scopes` |
| [exposing-agents.md](./exposing-agents.md) | Fortune-50 brokerage scenario: human client website chat + well-known discovery for peer agents | OIDC per session, ADL passport + presentation proof per request | Entitlements as scopes, provider allowlist + attestation, classification gating, step-up for high-stakes |
| [inbound-verification.md](./inbound-verification.md) | One Policy Enforcement Point across host shapes — agent-runtime plugin, AI-aware gateway, dedicated ADL verifier, and (incidentally) a generic API gateway | OIDC (human path) + ADL passport/proof (agent path) at one PEP | Ceiling + route-required scopes, principal/delegation enforcement, classification gating, verification boundary vs internal trust domain |
| [ai-gateway.md](./ai-gateway.md) | Support-agent platform behind an AI gateway (Kong AI / Cloudflare / Portkey / LiteLLM): model + tool + agent-to-agent egress | Gateway custodies the agent key, constructs passport + proof + delegation per outbound call | Key custody, per-call tool/MCP credentialing, budget + classification enforcement, model routing vs declared model |

## Adding a new pattern

1. Name the **capability**, not the scenario — the file is `<capability>.md`, and the scenario is chosen inside it to illustrate that capability.
2. Pick a real deployment shape to illustrate it (preferably one we have a deployed reference for, like the OpenClaw passport example).
3. Cast the actors with concrete identities — DIDs, OAuth subjects, ceiling scopes.
4. Trace each hop with explicit `§` citations at every authentication and authorization decision.
5. Document at least three failure modes per pattern: typically a missing scope, a verification failure, and a replay attempt.
6. Close with an audit-reconstruction section and a section-anchor index.
7. Add a row to the index table above.
