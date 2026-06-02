# ADL Proposal: Budget Envelopes (Core §9.6 + Runtime Protocol §2)

**Date:** 2026-05-29
**Status:** Draft
**ADL Version:** 0.3.0-draft (additive; no version bump required)
**Builds on:** [2026-05-29-document-family-and-layer-taxonomy.md](./2026-05-29-document-family-and-layer-taxonomy.md) (Core/protocol split, layer taxonomy), [2026-05-26-core-trust-conformance-tiers.md](./2026-05-26-core-trust-conformance-tiers.md)
**Affects:** `versions/draft/spec.md` (§9.6), `versions/draft/schema.json` (`permissions.resource_limits.budget`), `protocol/draft/runtime-protocol.md` (§2), `versions/draft/spec-manifest.yaml` (no new section — §9.6 is already tagged `enforced_by: runtime`)

> **Template note.** This is the first of the six Runtime Protocol member proposals and serves as the pattern for the other five (Iteration Control §3, Sub-Agent Permissions §4, Oversight Triggers §5, Generalized Degradation §6, Anomaly Baselines §7). Each follows the same shape: a *tiny declarative member* added to ADL Core, the *enforcement procedure* that fills the corresponding Runtime Protocol section, the conformance-tier mapping, and the manifest tag. Core stays lean; the teeth live in the protocol.

---

## Summary

ADL Core §9.6 `permissions.resource_limits` already declares quantitative runtime limits (`max_memory_mb`, `max_cpu_percent`, `max_duration_sec`, `max_concurrent`). This proposal adds one agentic-specific dimension to that member — a **budget envelope** capping the **tokens**, **monetary cost**, and **cumulative wall-clock** an agent may consume, scoped **per session** and **per day** — and specifies the enforcement procedure the runtime governor applies to it as **Runtime Protocol §2**.

The declaration is small (Core remains lean); the enforcement is where the teeth are (Runtime Protocol §2, against the governor defined in §1). A budget an agent declares but no governor enforces is a number in a document; §2 is what makes it stop a runaway agent.

## Motivation

The §9.6 limits predate agentic execution: they bound a *single* invocation's resources (memory, CPU, one execution's duration). They do not bound what a long-running, multi-step agent accumulates across a session or a day — the dimension where an autonomous agent actually runs away: a loop that burns tokens, a cost blowout, an agent that never terminates. This is the concrete form of the article's "2am rogue agent" — the runaway is almost always a *budget* runaway.

Token and monetary budgets are also the limit operators most consistently ask for first, because they map directly to spend. Putting them in the passport makes the ceiling **auditable and portable**: a counterparty or governor can read an agent's declared spend ceiling before admitting it, and the governor can hold it to that ceiling at runtime.

Budgets belong in Core as a *declaration* (they describe a standing limit of the agent, like the rest of §9.6) and in the Runtime Protocol as *enforcement* (a continuous, cumulative check only a governor with session state can perform). This is exactly the `nature: operational, enforced_by: runtime` split already recorded for §9.6 in the spec manifest.

## Details

### 1. Spec changes (Core §9.6)

`permissions.resource_limits` gains one OPTIONAL member, `budget`. Kept to the existing "May contain" table style.

> **§9.6 addition.** `resource_limits` **MAY** contain `budget`. When present, `budget` is an object that **MAY** contain `tokens`, `cost_usd`, and `wall_clock_sec`. Each is an OPTIONAL object that **MAY** contain `per_session` and `per_day` caps.

| Member | Type | Unit | Description |
|--------|------|------|-------------|
| `budget.tokens.per_session` / `.per_day` | number | tokens | Maximum model tokens (input + output) the agent may consume in one session / rolling 24-hour window. |
| `budget.cost_usd.per_session` / `.per_day` | number | USD | Maximum monetary cost the agent may incur in one session / rolling day. |
| `budget.wall_clock_sec.per_session` / `.per_day` | number | seconds | Maximum cumulative wall-clock the agent may run in one session / rolling day. |

**Relationship to existing §9.6 limits.** `max_duration_sec` bounds a *single* execution; `budget.wall_clock_sec` bounds *cumulative* wall-clock across a session or day. They compose: a step may be rejected by either the per-invocation limit or the cumulative budget.

**Session.** "Session" is the unit the governor binds the passport to per Runtime Protocol §1.3. Its boundary is deployment-defined, but the governor **MUST** scope `per_session` counters to a single such session and `per_day` counters to a 24-hour window (rolling vs. calendar-aligned is deployment policy but **MUST** be applied consistently).

**Validation rules** (added to §14.2):

- **VAL-29** — every `budget.*` cap, when present, **MUST** be a number greater than `0`.
- **VAL-30** — within any dimension, when both `per_session` and `per_day` are present, `per_session` **MUST** be ≤ `per_day`.

### 2. Schema changes

```json5
{
  "budget": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "tokens":         { "$ref": "#/$defs/budgetDimension" },
      "cost_usd":       { "$ref": "#/$defs/budgetDimension" },
      "wall_clock_sec": { "$ref": "#/$defs/budgetDimension" }
    }
  },
  "$defs": {
    "budgetDimension": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "per_session": { "type": "number", "exclusiveMinimum": 0 },
        "per_day":     { "type": "number", "exclusiveMinimum": 0 }
      }
    }
  }
}
```

`budget` is added under `permissions.resource_limits.properties`. VAL-30 (per_session ≤ per_day) is a semantic rule, not expressible in plain JSON Schema, and is validated per §14.2.

### 3. Runtime Protocol §2 (enforcement)

This fills the §2 placeholder against the governor defined in §1. Proposed normative procedure:

The governor's PDP (§1.2) **MUST** maintain cumulative counters for each declared `budget` dimension, scoped per session and per rolling day (§1, this proposal). Before the PEP admits a step that consumes a budgeted resource — a model call (tokens, cost) or any execution (wall-clock) — the PDP **MUST**:

1. **Project usage.** Compute projected cumulative usage = current counter + the step's expected consumption, for each declared dimension and scope.
2. **Compare to caps.** For each declared cap, if projected usage would exceed it, the dimension is **exhausted** for that scope.
3. **Decide.** If no declared cap would be exceeded, return *permit*. If any would, return *budget-exhausted*, identifying the dimension (`tokens` / `cost_usd` / `wall_clock_sec`) and scope (`per_session` / `per_day`).
4. **Enforce.** On *budget-exhausted*, the PEP applies the degradation response keyed `on_budget_exhausted` (Runtime Protocol §6), **defaulting to fail-closed** (halt the session) when no response is declared.
5. **Record.** The governor records the boundary event (which cap, which scope, observed vs. limit) in its audit trail (§1.4), regardless of tier.

Cost accounting (mapping tokens/calls → USD) is governor/deployment-specific and out of scope for the declaration; the governor **MUST** document its cost model when claiming R2+ on the `cost_usd` dimension.

### 4. Conformance tier mapping

| Tier | Budget behavior |
|------|-----------------|
| **R1 Observing** | Governor tracks cumulative usage against declared caps and records boundary events; does **not** block. ("Document it.") |
| **R2 Enforcing** | Governor **MUST** block any step that would exceed a declared cap and apply §6 degradation (fail-closed by default). ("Stop it.") |
| **R3 Adaptive** | R2, plus the boundary events feed the anomaly substrate (§7); a session approaching its envelope unusually fast is a signal, not only a hard stop. |

### 5. Manifest taxonomy

No new manifest section. §9.6 Resource Limits is already tagged `nature: operational, enforced_by: runtime`; `budget` is enforced by the same Runtime Protocol procedure. No `enforced_by` enum change.

## Alternatives

- **Put budgets only in the Runtime Protocol, not Core.** Rejected: the ceiling must be *declarable and auditable in the passport* (a counterparty should see an agent's spend ceiling before admitting it). Declaration is Core's job; only enforcement is the protocol's.
- **A single flat `max_tokens` / `max_cost` instead of per-session/per-day dimensions.** Rejected: operators reason in both scopes (a per-session cap stops one runaway; a per-day cap stops a flapping agent that restarts sessions). Both are cheap to declare.
- **Reuse `max_duration_sec` for time budgets.** Rejected: per-invocation and cumulative are different limits; conflating them makes neither enforceable cleanly.
- **Bytes/requests dimensions (network egress, API call counts).** Deferred: tokens, cost, and wall-clock cover the runaway cases operators ask for first; further dimensions can extend `budget` additively later.

## Open Questions

1. **`per_day` window semantics** — rolling 24h vs. calendar day (and whose timezone). Leaning rolling-24h as the default to avoid timezone ambiguity; calendar-aligned as an explicit deployment option.
2. **Profile interaction** — should the Governance Profile make `budget` REQUIRED at autonomy Tier 2+ (an autonomous agent with no declared spend ceiling is itself a finding)? Likely yes; to be decided with the Anomaly Baselines proposal (§7), which has the same tier-gating question.
3. **Cost-model attestation** — at R2+ on `cost_usd`, does the governor's documented cost model need to be *attested* (tying into §1.4 evidence), or is documentation enough?

## References

- [2026-05-29-document-family-and-layer-taxonomy.md](./2026-05-29-document-family-and-layer-taxonomy.md) — the Core/protocol split and the `enforced_by: runtime` tag this member relies on.
- `protocol/draft/runtime-protocol.md` §1 (the runtime governor, PDP/PEP, passport binding, audit trail) and §6 (degradation, fail-closed default).
- `versions/draft/spec.md` §9.6 (Resource Limits), §14.2 (validation rules).
- [Governance is Changing Meaning in AI](https://www.ironsteadgroup.com/articles/governance-changing-meaning-in-ai) — runtime enforcement as the locus of governance teeth.
