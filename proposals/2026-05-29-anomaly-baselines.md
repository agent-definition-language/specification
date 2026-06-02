# ADL Proposal: Anomaly Baselines (Governance Profile + Runtime Protocol §7)

**Date:** 2026-05-29
**Status:** Draft
**ADL Version:** 0.3.0-draft / Governance Profile 1.0-draft (additive)
**Builds on:** [2026-05-29-budget-envelopes.md](./2026-05-29-budget-envelopes.md) (template), [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) (§6), [2026-05-29-structured-oversight-triggers.md](./2026-05-29-structured-oversight-triggers.md) (profile-versioning note)
**Affects:** `profiles/governance/1.0/profile.md` (§2.11, §5.1 table), `profiles/governance/1.0/schema.json` (`anomaly_baseline` + Tier-3 required), `profiles/manifest.yaml`, `protocol/draft/runtime-protocol.md` (§7)

## Summary

Adds `anomaly_baseline` to the Governance Profile — a declaration of an agent's expected runtime behavior (tool-call distribution, per-session cost range, data classes touched) — and specifies the governor's deviation-detection and response procedure as **Runtime Protocol §7**. **SHOULD** at autonomy Tier 2, **MUST** at Tier 3. §7 also hosts the enforcement-evidence substrate reserved by §1.4.

## Motivation

Budgets, iteration caps, and oversight triggers catch *known* failure modes with hard thresholds. Anomaly baselines catch the *unknown* one — the article's core point that an agent's behavior "emerges at runtime and isn't fully specified in advance." A baseline declares what normal looks like so a governor can flag a session that drifts: a tool it never uses, a cost an order of magnitude off, a data class it shouldn't touch.

This is the epistemically distinct proposal of the six: the others enforce *deterministic limits*; this one detects *statistical deviation*. That difference drives two design choices below.

## Note on what kind of declaration this is

A baseline is **self-declared by the agent**, so on its own it is a weak signal — an agent could declare a flattering baseline. Its governance value is realized only when the governor's anomaly findings are **externally verifiable**. That is exactly the enforcement-evidence mechanism reserved in Runtime Protocol §1.4; this proposal therefore co-locates the evidence substrate with §7. Until that mechanism is specified, anomaly detection is an R3 capability whose trust rests on the audit trail.

(Profile versioning: added to draft Governance 1.0 in place, not a new 1.1 — see the [Structured Oversight Triggers](./2026-05-29-structured-oversight-triggers.md) note. The email also floated a separate *Monitoring Profile*; folding into Governance keeps anomaly detection beside the autonomy tiers that gate it, which is where operators look.)

## Details

### 1. Profile changes (§2.11 `anomaly_baseline`)

New member: `expected_tools` (array of `{name, share?}`), `cost_per_session_usd` (`{min, max}`), `data_classes` (array, `data_classification.categories` vocabulary). Tier-gated: **SHOULD** at Tier 2, **MUST** at Tier 3 (**GOV-26**), so an autonomous agent ships with a declared envelope.

### 2. Schema changes

Adds `anomaly_baseline` to the governance profile `properties` (closed object as above) and adds `anomaly_baseline` to the **Tier-3 `then.required`** block, so a Tier-3 document without one fails validation. Tier-1/2 documents are unaffected (additive).

### 3. Runtime Protocol §7 (enforcement)

The PDP accumulates the session's tool distribution, cost (reusing §2 counters), and data classes; flags deviation against the baseline (unexpected tool, cost outside range, unexpected data class) with a governor-defined materiality threshold documented at R3; responds via `runtime.degradation.on_anomaly` (§6, fail-closed; `pause` to §5 oversight often apt); and records the deviation as the **enforcement evidence** §1.4 relies on. The evidence *format* is reserved pending §1.4.

### 4. Conformance tier mapping

| Tier | Anomaly behavior |
|------|------------------|
| **R1 Observing** | MAY record baseline deviation; not required. |
| **R2 Enforcing** | MAY record; not required to act. |
| **R3 Adaptive** | **MUST** monitor against a declared baseline and apply §6 on material deviation. |

Note the deliberate asymmetry: anomaly detection is the one capability that is **R3-only**, because it depends on the (reserved) evidence mechanism to be trustworthy.

### 5. Manifest taxonomy

Profile member; Core spec manifest unaffected. `profiles/manifest.yaml` gains §2.11 `anomaly_baseline` under the governance profile.

## Alternatives

- **A dedicated Monitoring Profile.** Considered (the email floated it). Rejected for now: anomaly detection is meaningless without the autonomy-tier context that lives in the Governance Profile; a separate profile would have to depend on it anyway. Revisit if monitoring grows beyond baselines.
- **Put `anomaly_baseline` in Core.** Rejected: it is governance/monitoring policy, not a universal agent property, and its tier-gating is a Governance Profile concept.
- **Make it MUST at Tier 2.** Rejected: Tier 2 is "conditional autonomy"; a SHOULD lets Tier 2 adopt incrementally while Tier 3 (full autonomy) requires it.

## Open Questions

1. **Materiality threshold as a declaration.** Should the baseline declare *how far* is too far (e.g. a tolerance per dimension), or is that purely governor policy? Leaning governor policy for now, documented at R3.
2. **Distribution vs. set for `expected_tools`.** `share` is optional, so a baseline can be a simple allowlist or a full distribution. Whether to require shares to sum to ~1 when all are present is an open validation question.
3. **Evidence format.** Blocked on the §1.4 enforcement-evidence mechanism; this proposal reserves the slot rather than specifying it.

## References

- `protocol/draft/runtime-protocol.md` §1.4 (enforcement evidence, reserved), §7.
- [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) — `on_anomaly`.
- `profiles/governance/1.0/profile.md` §2.11, §5.1.
- [Governance is Changing Meaning in AI](https://www.ironsteadgroup.com/articles/governance-changing-meaning-in-ai) — runtime-emergent behavior as the case for baselines.
