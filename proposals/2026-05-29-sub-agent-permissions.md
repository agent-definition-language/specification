# ADL Proposal: Sub-Agent Permissions (Core §9.7 + Runtime Protocol §4)

**Date:** 2026-05-29
**Status:** Superseded by [2026-06-01-internal-vs-external-sub-agents.md](./2026-06-01-internal-vs-external-sub-agents.md) — its external-delegation model (`allowed`/`denied`/`max_depth`/`attenuation`) is retained but rehomed from `permissions.sub_agents` to `permissions.delegation`, and `permissions.sub_agents` is reshaped into a persona array. Read this proposal for the original external-delegation rationale; read the successor for the current shape.
**ADL Version:** 0.3.0-draft (additive; no version bump required)
**Builds on:** [2026-05-29-budget-envelopes.md](./2026-05-29-budget-envelopes.md) (template), [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) (§6), [2026-05-21-delegation-chains-in-presentation-proof.md](./2026-05-21-delegation-chains-in-presentation-proof.md) (delegation-chain verification)
**Affects:** `versions/draft/spec.md` (§9.7, §14.2), `versions/draft/schema.json` (`permissions.sub_agents`), `protocol/draft/runtime-protocol.md` (§4), `versions/draft/spec-manifest.yaml` (new §9.7 subsection)

## Summary

Adds `permissions.sub_agents` to ADL Core §9 — declaring which agents this agent may delegate to (`allowed` / `denied`), how deep (`max_depth`), and under what `attenuation` (scopes/budget must be a subset of the parent's) — and specifies the governor's **admission** procedure as **Runtime Protocol §4**, composing with the Trust Protocol's delegation-chain verification.

## Motivation

An agent that can spawn sub-agents can escalate its own reach: each delegated agent is new identity, new permissions, new spend. The Trust Protocol's delegation chains establish *who* a sub-agent is and that the chain is intact; they do not say *which* sub-agents a given agent is allowed to create or that a child cannot exceed its parent. `permissions.sub_agents` is the deny-by-default boundary on delegation — the §9 permission model extended from "what this agent may touch" to "what agents this agent may bring into being."

`attenuation` encodes the security-critical invariant that authority only ever shrinks down a delegation chain (a child's scopes/budget ⊆ parent's), which the delegation-chains proposal already assumes but does not let an agent *declare* and a governor *enforce*.

## Details

### 1. Spec changes (Core §9.7)

New subsection §9.7 Sub-Agents. `permissions.sub_agents` (OPTIONAL object): `allowed` / `denied` (arrays of §4.4 identifier patterns, deny overrides), `max_depth` (integer), `attenuation` (`scopes_subset`, `budget_subset` booleans). Deny-by-default per §9.1.

**Validation:** **VAL-34** (patterns conform to §4.4), **VAL-35** (`max_depth` integer ≥ 1).

### 2. Schema changes

```json5
// permissions.properties.sub_agents
{
  "type": "object",
  "properties": {
    "allowed":     { "type": "array", "items": { "type": "string" } },
    "denied":      { "type": "array", "items": { "type": "string" } },
    "max_depth":   { "type": "integer", "minimum": 1 },
    "attenuation": {
      "type": "object",
      "properties": {
        "scopes_subset": { "type": "boolean" },
        "budget_subset": { "type": "boolean" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

### 3. Runtime Protocol §4 (admission)

On a delegation attempt the PDP: matches the sub-agent identifier against `allowed`/`denied` (§4.4, deny-by-default) → checks `max_depth` against the chain root → checks `attenuation` (child `scopes` ⊆ parent, child `budget` ≤ parent) → on failure resolves `runtime.degradation.on_sub_agent_denied` (§6, fail-closed) → records the decision. Admission **composes with**, not replaces, Trust delegation-chain verification (identity + chain integrity).

### 4. Conformance tier mapping

| Tier | Sub-agent behavior |
|------|--------------------|
| **R1 Observing** | Records prospective delegations and the would-be decision; does not block. |
| **R2 Enforcing** | **MUST** enforce admission (identity, depth, attenuation) and apply §6 on denial. |
| **R3 Adaptive** | Delegation patterns feed the §7 anomaly substrate. |

### 5. Manifest taxonomy

Adds §9.7 Sub-Agents to `spec-manifest.yaml` under §9: `nature: operational, enforced_by: runtime`.

## Alternatives

- **Reuse `security.scopes` alone to bound sub-agents.** Rejected: scopes bound *what a caller may ask*, not *which agents may be spawned*; delegation needs its own allow/deny surface.
- **Put delegation limits only in the Trust Protocol.** Rejected: Trust verifies an existing chain; the *policy* of which children are permissible is a declared property of the parent agent (Core), enforced at spawn time (Runtime §4).
- **Mandatory `max_depth`.** Rejected: kept OPTIONAL for additivity; the Governance Profile can make it conditionally required at higher autonomy tiers (see Open Questions).

## Open Questions

1. **Identifier patterns for `did:web` / URN.** §4.4 patterns were designed for hosts/paths/env; sub-agent identifiers are URIs/URNs/DIDs. May need a note (or a dedicated matching rule) on how patterns apply to identifier forms.
2. **Profile tier-gating.** Should the Governance Profile require `sub_agents` (and `attenuation.scopes_subset`/`budget_subset`) at autonomy Tier 2+? Shared question with §2 and §7.

## References

- [2026-05-21-delegation-chains-in-presentation-proof.md](./2026-05-21-delegation-chains-in-presentation-proof.md) — chain identity/integrity this admission composes with.
- [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) — `on_sub_agent_denied`.
- `protocol/draft/runtime-protocol.md` §4; `versions/draft/spec.md` §9.7, §14.2.
