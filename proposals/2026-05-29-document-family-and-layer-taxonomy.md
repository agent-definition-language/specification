# Proposal: Document-Family Naming and Section Layer Taxonomy

**Date:** 2026-05-29
**Status:** Draft
**ADL Version:** 0.3.0-draft (additive; no version bump required)
**Builds on:** [2026-05-26-core-trust-conformance-tiers.md](./2026-05-26-core-trust-conformance-tiers.md) (Core/Trust split)
**Affects:** `versions/draft/spec.md` (§1.3 Design Model), `versions/draft/spec-manifest.yaml` (resync + two new per-section keys). No schema, behavior, or normative-requirement changes.

## Summary

The Core/Trust split ([conformance-tiers proposal](./2026-05-26-core-trust-conformance-tiers.md)) recognized that ADL carries two categorically different kinds of content: a declarative description format and the normative procedures a counterparty performs against it. The runtime-governance work (budget envelopes, iteration control, generalized degradation, structured oversight triggers, anomaly baselines) adds a further procedural kind — procedures a **runtime governor** performs while an agent executes.

This proposal makes that structure **explicit and machine-readable**, without moving any content or changing any requirement:

1. Six lines in **§1.3 Design Model** name the **document family** — ADL Core plus an open protocol layer (the Trust Protocol and Runtime Protocol today) — and state the one distinction that organizes them: *Core declares; the protocols enforce.*
2. The **spec manifest** gains two orthogonal per-section keys — `nature` (constitutional | operational | structural) and `enforced_by` (core | trust | runtime | none) — so generators (IETF, ISO, AAIF) can render the split, and so each section's placement is recorded rather than inferred.

The manifest is also resynced to the current spec.md, which it had drifted from (see Details).

## Motivation

### The protocol layer needs naming, and a place to record itself

The conformance-tiers proposal named two documents. The operational-governance members now in flight are neither declarations the agent makes about itself (Core) nor procedures a counterparty runs at admission (Trust) — they are procedures a governor runs *continuously, after admission*, against the agent's own execution. That is a distinct document with a distinct actor (the runtime governor) and a distinct conformance track (R1/R2/R3). Naming it in §1.3 makes the architecture legible the moment the Runtime Protocol stub lands, so each member proposal reads as "fill the named placeholder" rather than "introduce a new concept."

### Declaration without enforcement is not governance

Governance for agentic systems cannot live in declarations alone; a declared limit matters only insofar as some procedure acts on it (see [Governance is Changing Meaning in AI](https://www.ironsteadgroup.com/articles/governance-changing-meaning-in-ai)). Keeping Core lean and declarative is correct — but only if the spec is honest about *where the teeth are*. The `enforced_by` key records, per section, which document holds the enforcing procedure, so the lean-Core decision is visible and auditable rather than implicit.

### Two axes, because nature and enforcement are independent

A section's *kind* and its *enforcer* are not the same question. `data_classification` is **constitutional** in nature (a declared posture) yet **core**-enforced (the high-water-mark rule, VAL-28, is a static document invariant — the validation *is* the rule). `lifecycle` is also constitutional but **trust**-enforced (validation only checks the enum; the provisioning gate that gives it force lives in Trust Protocol §1.1.7). Collapsing these into a single "constitutional vs operational" label would lose exactly the distinction the Core/protocol split exists to make. Two columns keep them separable.

## Details

### 1. §1.3 Design Model addition

Six lines, appended after the existing separation-of-concerns discussion, naming ADL Core / ADL Trust Protocol / ADL Runtime Protocol and stating: *Core declares; the protocols enforce. A declared limit has force only when a Trust or Runtime procedure acts on it.* No slogan; no normative keywords; IETF-appropriate prose.

### 2. Manifest layer taxonomy

Two keys are added to every section and subsection entry.

**`nature`** — what kind of content the section is:

| Value | Meaning |
|-------|---------|
| `constitutional` | Declares what the agent *is* / its standing posture. |
| `operational` | A runtime control whose behavior needs enforcement. |
| `structural` | Spec machinery / informative plumbing. |

**`enforced_by`** — which document holds (or *will* hold) the enforcing procedure. **Target-architecture basis:** operational members point at `runtime` even though the Runtime Protocol is still a stub, so the split is visible now.

| Value | Meaning |
|-------|---------|
| `core` | Enforced by Core's own processing/validation rules (validating the document enforces the rule). |
| `trust` | Enforced by a Trust Protocol procedure (a counterparty acts). |
| `runtime` | Enforced by a Runtime Protocol procedure (a governor acts). |
| `none` | No enforcing procedure (purely declarative or informative). |

**Tie-breaker for sections with both a validation rule and a downstream consumer:** tag by the *characteristic* enforcement — does passing/failing Core validation already enforce the rule (→ `core`), or does validation merely confirm well-formedness while the real consequence is imposed later by a separate actor (→ `trust`/`runtime`)? This is why `data_classification` → `core` (VAL-28 rejects dishonest documents outright) but `lifecycle` → `trust` (a `retired` document is perfectly valid; the gate fires at admission).

Granularity is **per subsection** (`###` / numbered level), matching the manifest's existing depth. `####`-level items (e.g. `10.3.1`, `Conflict Resolution`) are not tracked, consistent with prior practice.

### 3. Manifest resync (prerequisite)

The manifest had drifted from spec.md and is corrected as part of this change:

- **§10** rewritten to match the §10 reorganization: `10.1 Data Classification`, `10.2 Attestation`, `10.3 Authentication`, `10.4 Authorization Scopes`, `10.5 Encryption` (was a stale 4-subsection list in the old order).
- Added missing entries: **6.4 Discovery**, **12.6 Example**, **16.3 Error Source Examples**, **17.3 URN Namespace**, **17.4 Well-Known URI**, **Appendix D ABNF Grammar**.
- **13.5** title corrected to "Standard Profile Registration".
- Version label bumped `0.2.0-draft` → `0.3.0-draft` to match the spec it describes.

`scripts/generate_outline.py` keys only on `number`/`title`/`id` and ignores unknown keys, so the new columns are non-breaking for all existing tooling (verified: 89 entries, outline regenerates unchanged).

### Cross-cutting note

`data_classification` is a composable attribute — it appears on `tools[*]` and `resources[*]` as well as at the top level, and the top-level value is the high-water-mark rollup of those. A per-section manifest can only tag the section where an attribute is *defined* (§10.1), not everywhere it composes. This is acceptable for the manifest's section-mapping purpose, but the §10.1 prose already documents the composition, so the `enforced_by: core` tag should not be read as "classification is only a §10 concern."

## Alternatives

- **Single `layer: constitutional | operational` column** (the original sketch). Rejected: collapses Trust and Runtime into one "operational" bucket and conflates a section's nature with its enforcer.
- **Single `enforced_by: core | trust | runtime` column** (no `nature`). Rejected: loses the constitutional/operational distinction the article turns on.
- **List-valued `enforced_by`** (e.g. `[trust, runtime]`) for multi-touchpoint sections. Considered for `data_classification`, then rejected once §10.1 resolved cleanly to `core` under the characteristic-enforcement tie-breaker; single-valued is simpler for generators.
- **Per-top-level-section granularity.** Rejected: mixed sections (§9, §10) need subsection-level resolution.

## References

- [Governance is Changing Meaning in AI](https://www.ironsteadgroup.com/articles/governance-changing-meaning-in-ai) — the declaration-vs-enforcement framing motivating the `enforced_by` axis.
- [Core/Trust Conformance Tiers and Spec–Protocol Split](./2026-05-26-core-trust-conformance-tiers.md) — the two-document split this generalizes into an open protocol layer.
- `versions/draft/spec.md` §1.3, §10.1 (VAL-28), §14.2 (validation rules), §5.6 (lifecycle); Trust Protocol §1.1.7 (lifecycle gating), §1.1.9 (classification compatibility).
