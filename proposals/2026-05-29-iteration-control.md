# ADL Proposal: Iteration Control (Core §11.3 + Runtime Protocol §3)

**Date:** 2026-05-29
**Status:** Draft
**ADL Version:** 0.3.0-draft (additive; no version bump required)
**Builds on:** [2026-05-29-budget-envelopes.md](./2026-05-29-budget-envelopes.md) (template), [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) (§6 responses)
**Affects:** `versions/draft/spec.md` (§11.3, §14.2), `versions/draft/schema.json` (`runtime.tool_invocation`), `protocol/draft/runtime-protocol.md` (§3). No new manifest section — added to existing §11.3.

## Summary

Adds three members to ADL Core §11.3 `runtime.tool_invocation` — `max_iterations`, `max_tool_calls_per_session`, and `loop_detection` — and specifies their enforcement as **Runtime Protocol §3**: the governor counts iterations and tool calls per session, detects repetitive loops, and resolves to a §6 degradation response (fail-closed default) when a limit or loop fires.

## Motivation

Budgets (§2) stop an agent that spends too much; iteration control stops an agent that *never stops*. A reasoning loop that calls the same tool forever may stay under a token budget for a long time while accomplishing nothing and holding resources — the classic agentic failure mode. `max_iterations` and `max_tool_calls_per_session` are hard ceilings; `loop_detection` catches the subtler case of an agent thrashing within the ceiling.

These are declarations of standing limits, like the rest of §11.3, so they belong in Core; the cumulative counting and loop detection require live session state, so enforcement belongs to the governor (§3).

## Details

### 1. Spec changes (Core §11.3)

Added to `runtime.tool_invocation`:

- `max_iterations` (integer) — max reason→act iterations per session.
- `max_tool_calls_per_session` (integer) — max total tool invocations per session.
- `loop_detection` (object) — `window` (integer ≥ 2; recent steps examined) and `on_detected` (a §11.5 degradation response overriding `on_iteration_limit` for the loop case).

**Validation:** **VAL-32** (`max_iterations` / `max_tool_calls_per_session` integers ≥ 1), **VAL-33** (`loop_detection.window` integer ≥ 2).

### 2. Schema changes

```json5
// added under runtime.tool_invocation.properties
"max_iterations":             { "type": "integer", "minimum": 1 },
"max_tool_calls_per_session": { "type": "integer", "minimum": 1 },
"loop_detection": {
  "type": "object",
  "properties": {
    "window":      { "type": "integer", "minimum": 2 },
    "on_detected": { "$ref": "#/$defs/degradationResponse" }
  },
  "additionalProperties": false
}
```

### 3. Runtime Protocol §3 (enforcement)

The PDP maintains per-session iteration and tool-call counts and a sliding window of recent step signatures. Before each step: count → check hard limits → detect loop (repeat of a recent tool+args signature beyond a governor-defined threshold) → on limit/loop resolve §6 (`loop_detection.on_detected` for loops, else `on_iteration_limit`, else fail-closed) → record. Signature computation is governor-specific and documented at R2+.

### 4. Conformance tier mapping

| Tier | Iteration behavior |
|------|--------------------|
| **R1 Observing** | Counts iterations/tool-calls and flags loops; does not block. |
| **R2 Enforcing** | **MUST** block on a reached limit or detected loop and apply §6. |
| **R3 Adaptive** | Loop/limit events feed the §7 anomaly substrate. |

### 5. Manifest taxonomy

No new section — added to §11.3 Tool Invocation, already `nature: operational, enforced_by: runtime`.

## Alternatives

- **A separate `runtime.iteration` block** instead of folding into `tool_invocation`. Rejected: tool-call ceilings and per-call concurrency naturally co-locate; one fewer top-level member.
- **Mandating a specific loop-detection algorithm.** Rejected: signature/threshold choices are runtime-specific; the spec declares the limit and requires the governor to document its method, mirroring the §2 cost-model treatment.

## Open Questions

1. **`max_iterations` vs. provider-side step caps.** Many runtimes already cap agent steps; should ADL note that `max_iterations` is the *declared ceiling* and the governor enforces the stricter of declared vs. runtime-native? Leaning yes.
2. **Loop repetition threshold.** Whether to expose a declarative `loop_detection.threshold` (N repeats) or leave entirely to the governor. Deferred; `window` plus a governor default covers the common case.

## References

- [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) — the `on_iteration_limit` response resolved here.
- `protocol/draft/runtime-protocol.md` §1.2 (PDP), §3, §6.
- `versions/draft/spec.md` §11.3, §14.2.
