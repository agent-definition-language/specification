# ADL Proposal: Structured Oversight Triggers (Governance Profile + Runtime Protocol §5)

**Date:** 2026-05-29
**Status:** Draft
**ADL Version:** 0.3.0-draft / Governance Profile 1.0-draft (additive)
**Builds on:** [2026-05-29-budget-envelopes.md](./2026-05-29-budget-envelopes.md) (template), [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) (§6)
**Affects:** `profiles/governance/1.0/profile.md` (§2.4 `human_oversight.triggers`, §5.1 table), `profiles/governance/1.0/schema.json` (`triggers`), `profiles/manifest.yaml`, `protocol/draft/runtime-protocol.md` (§5)

## Summary

Adds a **structured predicate form** to the Governance Profile's `human_oversight.triggers[]`, alongside the existing free-text strings (back-compatible), and specifies the governor's evaluation, pause-for-review, and timeout procedure as **Runtime Protocol §5**. The predicate vocabulary: cost threshold, data-classification floor, tool name, and partial-path pattern.

## Motivation

The Governance Profile already declares `human_oversight.triggers` as free-text strings (`"Financial commitment exceeding $10,000"`). Prose triggers are auditable but **not mechanically enforceable** — a governor cannot reliably detect "exceeding $10,000" from a sentence. To make oversight a runtime control rather than documentation, a governor needs predicates it can evaluate. This is the article's distinction applied to human-in-the-loop: a trigger that only a human can interpret after the fact "documents it"; a structured trigger "stops it" and pauses for review.

Free-text is retained because much real oversight policy is genuinely qualitative ("decision affecting external communications"); structured predicates cover the mechanically-checkable cases.

## Note on profile versioning

The email proposed cutting `profiles/governance/1.1/`. Governance 1.0 is still **`status: draft`** (per `profiles/manifest.yaml`), so under the "version profiles independently" rule the structured-trigger addition goes into the draft 1.0 in place; a 1.1 is cut when 1.0 is *released*. This keeps the change additive and avoids premature version/site wiring. Same applies to [Anomaly Baselines](./2026-05-29-anomaly-baselines.md).

## Details

### 1. Profile changes (§2.4 `human_oversight.triggers`)

Each `triggers` entry is now **either** a free-text string **or** a structured object with a required `when` (≥1 predicate) and optional `description`. Predicate vocabulary: `cost_usd_over` (number), `data_classification_at_least` (`public`<`internal`<`confidential`<`restricted`), `tool` (string), `path_matches` (§4.4 pattern). Multiple predicates in one `when` are ANDed.

**Validation:** **GOV-25** — a structured trigger's `when` MUST contain at least one predicate. (Tier-2+ `triggers` presence remains GOV-13.)

### 2. Schema changes

`human_oversight.triggers.items` becomes `anyOf: [ {type: string}, {structured trigger} ]`, where the structured branch requires `when` (object, `minProperties: 1`) with the four predicate properties and `additionalProperties: false`. Existing string-only trigger arrays continue to validate.

### 3. Runtime Protocol §5 (enforcement)

The PDP evaluates each trigger before a step: structured `when` predicates against step/session state (cost vs. §2 counter, classification, tool, path), firing when all hold; free-text by governor-specific detection. On fire → `pause` (action) + request review via `intervention_model`; on `response_time_minutes` timeout → `runtime.degradation.on_oversight_timeout` (§6), fail-closed; resume only on explicit approval; record throughout.

### 4. Conformance tier mapping

| Tier | Oversight behavior |
|------|--------------------|
| **R1 Observing** | Records trigger evaluations; does not pause. |
| **R2 Enforcing** | **MUST** pause on a fired trigger and enforce the response-time timeout. |
| **R3 Adaptive** | Trigger firings feed the §7 anomaly substrate. |

### 5. Manifest taxonomy

Profile member; the Core spec manifest is unaffected. `profiles/manifest.yaml` is unchanged for §5 (the `human_oversight` section already exists); it gains §2.11 only for the companion Anomaly Baselines proposal.

## Alternatives

- **Replace free-text entirely.** Rejected: breaks existing governance documents and discards genuinely qualitative policy. `anyOf` keeps both.
- **A separate `structured_triggers` member.** Rejected: splits one concept across two members; `anyOf` on the existing array keeps oversight policy in one place.
- **Cut Governance 1.1.** Deferred to release time (see "Note on profile versioning").

## Open Questions

1. **`path_matches` target semantics.** What "path" a tool step exposes for matching (a filesystem path? a URL path? a resource URI?) needs a precise definition, likely per tool/resource type.
2. **Predicate composition across triggers.** Triggers are ORed (any fires → pause); predicates within a `when` are ANDed. Worth stating explicitly in the profile if it isn't obvious to authors.

## References

- [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) — `on_oversight_timeout`.
- `protocol/draft/runtime-protocol.md` §5; `profiles/governance/1.0/profile.md` §2.4.
- [Governance is Changing Meaning in AI](https://www.ironsteadgroup.com/articles/governance-changing-meaning-in-ai).
