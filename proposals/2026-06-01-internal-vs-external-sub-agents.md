# ADL Proposal: Sub-Agents as Personas; External Delegation as a Separate Member

**Date:** 2026-06-01
**Status:** Draft
**ADL Version:** 0.3.0-draft (additive + one rehome; no version bump required)
**Builds on:** [2026-05-29-sub-agent-permissions.md](./2026-05-29-sub-agent-permissions.md) (the current `permissions.sub_agents` external model, which this proposal **rehomes** to `permissions.delegation`), [2026-05-29-budget-envelopes.md](./2026-05-29-budget-envelopes.md) (resource limits), [2026-05-29-enforcement-evidence.md](./2026-05-29-enforcement-evidence.md) (persona attribution)
**Affects:** `versions/draft/spec.md` (§3 Terminology, §9.1/§9.7), `versions/draft/schema.json` (`permissions.sub_agents` reshaped, new `permissions.delegation`), `protocol/draft/runtime-protocol.md` (§4 admission, §2 budget attribution, §8 evidence), `versions/draft/spec-manifest.yaml`

## Summary

ADL currently has one notion of "sub-agent" — the delegated, independently-identified agent of `permissions.sub_agents` (§9.7). The industry uses "sub-agent" for **two structurally different things**, and ADL conflates them. The distinguishing property is the one ADL already treats as foundational — **identity** — and once you cut on it, the two kinds turn out to have different *natures*, not just different shapes, so they want different homes:

- **Persona (internal sub-agent)** — a *role of the same party*: a persona the parent spawns that acts **under the parent's identity**, with **no passport**. These are **static** — enumerable, like files in the repo (Claude Code's markdown subagents). They genuinely *are* subordinate; "sub" means subordinate. → `permissions.sub_agents` becomes a static **array of persona entries**.
- **External delegation** — engaging a *separate party*: an agent with its own ADL document and passport, crossing a trust boundary. These are **emergent** — discovered at runtime (via §6.4 Discovery / the Registry Profile / a future trusted directory), not pre-enumerated. A discovered agent is a **peer**, not a subordinate. → a new `permissions.delegation` member declares the **envelope** (which discovered agents may be engaged), not a list.

This proposal: (1) defines the taxonomy in §3, (2) reshapes `permissions.sub_agents` into the persona array, and (3) rehomes the existing external delegation model (`allowed`/`denied`/`max_depth`/`attenuation`) to `permissions.delegation`.

## Motivation

The recurring real-world pattern is an agent that fans out into **personas** — separate context windows, each with a focused prompt and a tool subset, all running under one set of credentials. Claude Code spawning its markdown subagents is the canonical example: the subagents run in parallel but under the **same identity, same model access, same permissions** as the parent. There is no second party to authenticate, because there is no second party — it is one agent wearing several hats. Personas are **statically enumerable** (they are literally files the agent ships), and they are genuinely **subordinate** — part of the parent for trust and accountability.

External delegation is a different animal. When Agent A engages upstream Agent B, B is a **separate sovereign party** with its own passport. ADL's own multi-hop authorization figure draws A and B as **peers** with *independent* authorizations and *independent* audit records — "no single hop sees the whole chain." That is not a parent/subordinate relationship, and calling B a "sub-agent of A" was always slightly wrong. Crucially, external engagement is **emergent**: an agent discovers counterparties at runtime — today via §6.4 `.well-known/adl-agents` and the Registry Profile, in the future via a trusted directory ("yellow pages") an agent queries to find collaborators. You cannot enumerate at design time which agents you will discover and call; you can only declare the **boundary** of which discovered agents you are authorized to engage. This is the same Regime A / Regime B line the spec's diagrams already draw: personas are Regime A (you list them), external delegation is Regime B (declare the envelope, not the path).

Forcing both into one member fought one of the two natures. Splitting them lets each take the form its nature demands.

| | **`sub_agents`** (personas) | **`delegation`** (external) |
|---|---|---|
| Identity | Same (parent's); no passport | Separate; own passport |
| Relationship | Subordinate (part of the parent) | Peer (a separate party) |
| Nature | **Static** — enumerable | **Emergent** — discovered at runtime |
| Form | **Array** of concrete persona entries | **Envelope** (`match`/`deny`/`max_depth`/`attenuation`) |
| Trust boundary | None crossed | Crossed — Trust Protocol admission |
| Governed by | Parent's envelope, in **aggregate** | Per-peer admission + attenuation |
| Stance | Regime A (the list) | Regime B (the boundary) |
| Example | Markdown subagents | Discovered upstream Agent B |

Anchoring the cut on **identity, not process**, is deliberate: whether a persona runs in-process or out-of-process is an implementation detail; what makes it a persona is that it acts under the parent's identity.

## Details

### 1. Terminology (§3)

Two rows, one taxonomy, cut on identity:

- **sub-agent** — A **subordinate** agent: a persona an agent spawns that runs under the **parent agent's own identity**, sharing its passport, permissions, and accountability rather than holding its own. It is *sub*-ordinate in the literal sense — part of the parent, not a separate party — typically a distinct context with a focused prompt and a tool subset. Declared in `permissions.sub_agents` (§9.7). Engaging a *separately-identified* agent is **delegation to a peer**, not a sub-agent relationship (see *delegation*).
- **delegation** — An agent engaging a **separate, independently-identified agent** (its own ADL document and passport) to act with or for it. The engaged agent is a **peer**, not a subordinate; it is discovered (§6.4) and admitted via the Trust Protocol, and bounded by the calling agent's `permissions.delegation` envelope (§9.7).

This keeps the familiar word "sub-agent" but pins it to the case where it is literally true (a subordinate persona), and gives the peer case its own honest name.

### 2. `permissions.sub_agents` — static array of personas (Core §9.7)

`sub_agents` (OPTIONAL) becomes an **array**; each entry is a persona:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | REQUIRED | Local persona/role name (not an agent identifier; unique within the array). |
| `description` | string | OPTIONAL | What the persona is for. |
| `prompt_resource` | string | OPTIONAL | Identifier of a `resources` entry (§8.2) holding the persona's prompt/instructions. Keeps the persona's *content* in `resources` (versioned, signed-over) and its *declaration* here. |
| `tools` | array | OPTIONAL | Subset of the parent's tools the persona may use. Omitted ⇒ the parent's full tool set. A persona **MUST NOT** be granted a tool the parent lacks. |
| `max_parallel` | integer | OPTIONAL | Maximum instances of this persona running concurrently. Composes with `resource_limits.max_concurrent` (§9.6). |
| `budget_share` | object | OPTIONAL | Per-instance sub-cap within the parent's `resource_limits.budget`, so one persona cannot exhaust the whole envelope. The **sum** across personas remains bounded by the parent. |

Key invariant: a persona's authority is a **subset of the parent's by construction** — there is no attenuation chain to verify, because there is no separate grant. The parent's declared envelope is the ceiling for parent + all personas **in aggregate**. Deny-by-default (§9.1): a runtime **MUST NOT** spawn a persona not declared in this array.

### 3. `permissions.delegation` — external envelope (Core §9.7)

The existing external model (from the sub-agent-permissions proposal), rehomed and reframed as the **boundary on emergent delegation**:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `match` | array | OPTIONAL | §4.4 identifier patterns for agents this agent MAY delegate to (the envelope over discovered agents). |
| `deny` | array | OPTIONAL | Patterns this agent MUST NOT delegate to; `deny` overrides `match` (§9.1). |
| `max_depth` | integer | OPTIONAL | Maximum delegation depth rooted at this agent. |
| `attenuation` | object | OPTIONAL | `scopes_subset` / `budget_subset` booleans — a delegated peer's scopes/budget MUST be ⊆ this agent's. |

Deny-by-default: a delegation to an agent matched by no `match` pattern is denied. The mechanics are unchanged from the existing proposal; only the member name and framing (envelope over discovered peers, not a roster) change.

### 4. Permissions model table (§9.1)

The §9.1 domain table gains two delegation domains alongside the five system-access domains:

- `sub_agents` — persona delegation (internal, same identity; a static array).
- `delegation` — external delegation (separate identity; an emergent envelope).

One framing sentence: the five system-access domains bound *what the agent may touch*; `sub_agents` bounds *which personas it may spawn under its own identity*; `delegation` bounds *which separately-identified peers it may engage*.

### 5. Runtime Protocol changes

- **§4 (admission)** applies to **`delegation`** (external peers) only. A persona is **never** admitted — no passport, no chain, no counterparty. The governor enforces the §2 `sub_agents` persona caps (`max_parallel`, `max_total` via array length, `budget_share`) at spawn time, reusing `runtime.degradation.on_sub_agent_denied` (fail-closed) on breach.
- **§2 (budget) attribution.** The governor enforces the parent's budget against the **aggregate** of parent + all personas; personas draw down the parent's envelope rather than receiving fresh ones. (Makes explicit what `max_concurrent` already gestured at.)
- **§8 (evidence) attribution.** Enforcement-record events **SHOULD** carry an optional `persona` (the persona `name`) in `detail`, so "what an agent did at 2 a.m." can be traced to which persona did it — without implying the persona was a separately-admitted party.

### 6. Schema changes

```json5
// permissions.properties.sub_agents  (reshaped: array of personas)
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name"],
    "properties": {
      "name":            { "type": "string" },
      "description":     { "type": "string" },
      "prompt_resource": { "type": "string" },
      "tools":           { "type": "array", "items": { "type": "string" } },
      "max_parallel":    { "type": "integer", "minimum": 1 },
      "budget_share":    { "type": "object" }
    },
    "additionalProperties": false
  }
}

// permissions.properties.delegation  (new: external envelope, ex-sub_agents)
{
  "type": "object",
  "properties": {
    "match":       { "type": "array", "items": { "type": "string" } },
    "deny":        { "type": "array", "items": { "type": "string" } },
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

### 7. Conformance tier mapping

| Tier | `sub_agents` (personas) | `delegation` (external) |
|------|-------------------------|-------------------------|
| **R1** | Records spawns + aggregate draw-down; does not block. | Records prospective delegations + would-be decision; does not block. |
| **R2** | **MUST** enforce `max_parallel` / array bounds + aggregate budget; apply §6 on breach. | **MUST** enforce admission (identity, depth, attenuation); apply §6 on denial. |
| **R3** | Persona spawn patterns feed the §7 anomaly substrate. | Delegation patterns feed the §7 anomaly substrate. |

## Alternatives

- **One `sub_agents` member, two shapes (`oneOf` persona|agent).** Considered and rejected in favor of the split: the two kinds differ in *nature* (static vs. emergent), not just shape. A single array forces emergent external discovery into a declared list, which fights the Regime B stance the spec's own diagrams take; and "sub" mislabels an external peer. The split lets each member take the form its nature demands and keeps the familiar word "sub-agent" honest.
- **Keep one notion; treat personas as an implementation detail.** Rejected: personas carry real governance weight (aggregate spend, blast radius, attribution) the parent must declare and a governor must cap.
- **Model personas with full passports/admission.** Rejected: no separate party to authenticate; a passport per persona is ceremony with no trust value.
- **Cut on process/parallelism instead of identity.** Rejected: where a persona runs is an implementation detail; identity is the property that decides the trust and governance treatment, and it is already ADL's spine.
- **Carry the persona prompt inline in the `sub_agents` entry.** Rejected: the prompt is *content*, and `resources` (§8.2) is ADL's home for content an agent reads. Referencing it by `prompt_resource` keeps it versioned, signed-over, and reusable.

## Open Questions

1. **Naming of the external member.** `permissions.delegation` reads well against the multi-hop "delegate to upstream" prose. Alternatives: `permissions.peers`, `permissions.collaborators`, `permissions.external_agents`. Which best signals "separate party, discovered, peer"?
2. **Migration of the existing proposal.** `2026-05-29-sub-agent-permissions.md` defined `permissions.sub_agents` as the external model and Runtime §4. Since neither is released (draft only), this proposal supersedes it by rehoming to `permissions.delegation`. Confirm we update that proposal's status to "Superseded by 2026-06-01" rather than editing it in place.
3. **`budget_share` shape.** Mirror `resource_limits.budget` (per-instance `tokens`/`cost_usd`/`wall_clock_sec`) for clean §2 composition, or a simpler single cap/fraction?
4. **`prompt_resource` resolution.** Should it be a bare `resources` id, or a full identifier/URI so a persona prompt can be an external signed resource? Bare id is simplest and keeps the content in-document.
5. **Trusted directory ("yellow pages") forward-compat.** A future directory an agent queries to discover collaborators is pure emergent delegation — it composes with `permissions.delegation` (the envelope) and §6.4 / the Registry Profile (the directory) without change. Worth a forward-reference note so the envelope is understood as the governance layer over directory discovery.
6. **Profile tier-gating.** Should the Governance Profile require `delegation.attenuation` and/or `sub_agents` aggregate-budget enforcement at autonomy Tier 2+ — the shared question with §2, §7, and the original §9.7?

## References

- [2026-05-29-sub-agent-permissions.md](./2026-05-29-sub-agent-permissions.md) — the external model this rehomes to `permissions.delegation`.
- [2026-05-29-budget-envelopes.md](./2026-05-29-budget-envelopes.md) — the aggregate envelope personas draw down.
- [2026-05-29-enforcement-evidence.md](./2026-05-29-enforcement-evidence.md) — the record that would carry persona attribution.
- `versions/draft/spec.md` §3, §6.4, §8.2, §9.1, §9.6, §9.7; `protocol/draft/runtime-protocol.md` §2, §4, §8.
