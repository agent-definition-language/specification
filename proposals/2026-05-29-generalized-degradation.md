# ADL Proposal: Generalized Degradation (Core §11.5 + Runtime Protocol §6)

**Date:** 2026-05-29
**Status:** Draft
**ADL Version:** 0.3.0-draft (additive; no version bump required)
**Builds on:** [2026-05-29-budget-envelopes.md](./2026-05-29-budget-envelopes.md) (template), [2026-05-29-document-family-and-layer-taxonomy.md](./2026-05-29-document-family-and-layer-taxonomy.md)
**Affects:** `versions/draft/spec.md` (§11.5, §14.2), `versions/draft/schema.json` (`runtime.degradation`, `$defs/degradationResponse`), `protocol/draft/runtime-protocol.md` (§6), `versions/draft/spec-manifest.yaml` (new §11.5 subsection)

## Summary

Adds `runtime.degradation` — a single, cause-keyed map declaring how an agent behaves when *any* operational limit fires or a fault occurs — and specifies the governor's response procedure as **Runtime Protocol §6**, with a **fail-closed default**: a cause that fires with no declared response halts the session.

This is the shared response mechanism the other enforcement sections invoke. Budget exhaustion (§2), iteration limits (§3), denied sub-agents (§4), and oversight timeouts (§5) all resolve to a `runtime.degradation` cause, so degradation is drafted first in dependency order.

## Motivation

Core §11.4 already has `error_handling.fallback_behavior`, but it covers exactly one cause (tool error) and its options (`return_error` / `use_default` / `skip`) are all fail-*open* — the agent keeps going. As ADL grows runtime limits with real teeth (budgets, iteration caps, oversight), each needs a declared behavior *when it fires*, and "keep going" is the wrong default for a limit whose entire purpose is to stop a runaway agent.

`degradation` generalizes the one-cause member into a uniform map, and the Runtime Protocol gives it the default the article argues for: **absent guidance, fail closed.** This is what makes the "2am rogue agent" answer "it halts," not "it logged an error and continued."

## Details

### 1. Spec changes (Core §11.5)

New subsection §11.5. `runtime.degradation` is an OPTIONAL object keyed by *cause* (`^on_[a-z0-9_]+$`); each value is a *response* with a REQUIRED `action` ∈ {`halt`, `pause`, `fallback`, `continue`} and OPTIONAL `value` / `message` / `notify`. Recognized causes: `on_budget_exhausted`, `on_iteration_limit`, `on_sub_agent_denied`, `on_oversight_timeout`, `on_tool_error`, `on_anomaly`.

`runtime.error_handling.fallback_behavior` (§11.4) is **retained for backward compatibility** and is equivalent to `degradation.on_tool_error`; `degradation` takes precedence when both address that cause. This keeps the change additive (no member removed, no version bump) while superseding the narrow form — the email's "replace" intent achieved without a breaking change.

**Validation:** **VAL-31** — each `degradation` response `action` MUST be one of the four enum values.

### 2. Schema changes

```json5
// runtime.properties.degradation
{
  "type": "object",
  "properties": { "extensions": { "$ref": "#/$defs/extensions" } },
  "patternProperties": { "^on_[a-z0-9_]+$": { "$ref": "#/$defs/degradationResponse" } },
  "additionalProperties": false
}
// $defs.degradationResponse
{
  "type": "object",
  "required": ["action"],
  "properties": {
    "action":  { "type": "string", "enum": ["halt", "pause", "fallback", "continue"] },
    "value":   {},
    "message": { "type": "string" },
    "notify":  { "type": "boolean" }
  },
  "additionalProperties": false
}
```

### 3. Runtime Protocol §6 (enforcement)

The PEP resolves a fired cause by: (1) look up the cause in `runtime.degradation`; (2) **if absent, halt** (fail-closed default); (3) apply the action — `halt` (stop), `pause` (escalate to §5 oversight), `fallback` (substitute declared value), `continue` (explicit fail-open, audited); (4) record the event in the audit trail (§1.4). At R1 the governor records what *would* happen; at R2+ it applies the response.

### 4. Conformance tier mapping

| Tier | Degradation behavior |
|------|----------------------|
| **R1 Observing** | Records which cause fired and the response that would apply; execution unchanged. |
| **R2 Enforcing** | **MUST** apply the resolved response, including the fail-closed default (halt on undeclared cause). |
| **R3 Adaptive** | R2, plus degradation events feed the §7 anomaly substrate (a rising rate of a given cause is itself a signal). |

### 5. Manifest taxonomy

Adds §11.5 Degradation to `spec-manifest.yaml` under §11: `nature: operational, enforced_by: runtime` (same as the rest of §11).

## Alternatives

- **Literally replace `fallback_behavior`.** Rejected: removing a member is a breaking change requiring a version bump. Retaining it as an alias of `on_tool_error` achieves the same generalization additively.
- **Fail-open default (continue on undeclared cause).** Rejected: it reduces every limit to advisory. Fail-closed is the whole point; `continue` remains available but must be explicit.
- **Per-limit inline responses** (each of §2–§5 carries its own response field). Rejected: scatters policy and duplicates the action vocabulary. One map, one vocabulary, consumed by all.

## Open Questions

1. **`pause` without an oversight target.** If `action: pause` is declared but the agent has no `human_oversight` configuration (Governance Profile), should that be a validation warning? Likely yes.
2. **Notification transport.** `notify: true` declares intent; the channel is governor-specific and out of scope here. Worth a cross-reference once an eventing pattern exists.

## References

- [2026-05-29-budget-envelopes.md](./2026-05-29-budget-envelopes.md) — the §2 procedure whose `on_budget_exhausted` resolves here.
- `protocol/draft/runtime-protocol.md` §1.2 (PEP), §1.4 (audit trail), §6.
- `versions/draft/spec.md` §11.4 (`error_handling.fallback_behavior`, superseded), §11.5, §14.2.
- [Governance is Changing Meaning in AI](https://www.ironsteadgroup.com/articles/governance-changing-meaning-in-ai) — the fail-closed-by-default argument.
