# ADL Proposal: Enforcement Evidence (Runtime Protocol §8)

**Date:** 2026-05-29
**Status:** Draft
**ADL Version:** 0.3.0-draft (additive; new standalone artifact, no Core change)
**Builds on:** [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md) and the other five Runtime members; resolves the evidence mechanism reserved by `runtime-protocol.md` §1.4 and §7.
**Affects:** `protocol/draft/runtime-protocol.md` (new §8; §1.4, §7, tier table, status updated), `versions/draft/schema-enforcement-record.json` (new artifact schema). **No Core `spec.md` / `schema.json` change** — the evidence is a separate signed artifact, like the presentation proof.

## Summary

Specifies the **enforcement record**: a signed, per-session artifact a runtime governor produces so a counterparty can verify that enforcement *actually happened* at the claimed tier, rather than taking an "R2" badge on faith. This is the mechanism §1.4 reserved — the piece that turns the conformance tiers from self-assertion into something checkable.

The record is governor-signed, its events are hash-chained, and a counterparty can seed it with a nonce for freshness. It delivers **tamper-evidence and freshness**; it deliberately stops short of **completeness** (proving nothing was omitted), which is named as a reserved third-party-witness tier (§8.8).

## Motivation

§1.4 stated the self-governance problem: the governor may be operated by the same party as the agent, so "I enforced at R2" is unverifiable on its own. Every other Runtime section produces *behavior* (it stops a runaway); this one produces *proof of behavior* (a counterparty can confirm it). Without it, the tiers are marketing. With it, an agent's operator can hand a counterparty — a peer agent, a gateway, an auditor — a record it can cryptographically check against the exact passport it admitted.

The honest framing matters: signing proves authorship and integrity, not completeness. We deliver the strong, implementable guarantees now (tamper-evidence + freshness) and are explicit that omission-detection needs a witness, which we reserve rather than hand-wave.

## Design decisions

1. **Trust property: tamper-evident + counterparty-seeded.** Hash-chained, governor-signed records detect alteration/reorder/deletion; an optional counterparty nonce (Trust §1.2.7 mechanism) binds a record to a live challenge so it can't be stale or pre-fabricated for that interaction. Completeness (omission detection) is the reserved §8.8 witness/transparency-log tier.
2. **Shape: per-session signed record.** One artifact summarizing admitted passport (id + digest), tier, limits in force, the hash-chained event list, and outcome — the session's enforcement story in one verifiable object.
3. **Signer: the governor's own cryptographic identity.** The governor is a first-class identified actor (`did:web` / HTTPS URI), resolved and verified with the Trust Protocol's §1.1.3 / §1.1.5 machinery; no new crypto.
4. **Home: Runtime Protocol §8 + standalone schema.** `schema-enforcement-record.json`, verified by the `verify/` library, mirroring the presentation-proof / model-attestation artifact pattern. Conveyed inline on request and/or published to the `governance_record_ref`.

## Details

### 1. Artifact (Runtime Protocol §8.3)

`adl_enforcement_record` (`"1.0"`), `governor`, `subject` (`id` + `passport_digest`), `session`, `tier`, `window`, `iat`, optional `nonce` and `limits`, `events[]`, `outcome`, `signature`. Each event: `seq`, `cause` (`on_*`), `action` (§6 action), `at`, `prev_hash`, optional `detail`.

### 2. Hash-chaining (§8.4)

`events[0].prev_hash` = base64url SHA-256 of the JCS-canonical record header (record minus `events` and `signature`); `events[i].prev_hash` = base64url SHA-256 of JCS-canonical `events[i-1]`. The `signature` seals the whole chain. Recomputation detects any tampering; the chain also provides the anchor points the §8.8 witness tier would attest, so the format reaches the higher tier without change.

### 3. Verification (§8.6)

Schema-validate → resolve governor key (§1.1.3) → verify signature (§1.1.5) → confirm `subject.passport_digest` matches the admitted passport (§1.3 pin) → verify nonce if issued → verify the hash-chain → **interpret as tamper-evidence, not completeness**.

### 4. Schema

New `versions/draft/schema-enforcement-record.json` (Draft 2020-12), closed object, signature shaped like §10.2 attestation. Standalone — not referenced by the ADL document schema.

### 5. Conformance tier mapping

| Tier | Evidence |
|------|----------|
| **R1** | Audit trail only; a record MAY be produced. |
| **R2** | **SHOULD** produce a signed enforcement record per §8. |
| **R3** | Enforcement record expected, including `on_anomaly` events (§7). |

## Alternatives

- **Tamper-evidence only (no nonce).** Rejected: leaves evidence replayable/stale; the counterparty nonce is cheap (reuses §1.2.7) and meaningfully raises the bar.
- **Transparency log now (completeness).** Deferred to §8.8: it needs a log operator and witness ecosystem — too much for a first draft, and the record format already anchors into one.
- **Operator-signed / co-signed.** Rejected in favor of a per-governor identity: accountability attaches to the enforcing component, and it reuses existing identity machinery without two-key records.
- **Define in the Trust Protocol.** Rejected: the governor *produces* the evidence, so it belongs with the governor (Runtime); verification simply reuses Trust's resolution/signature steps.
- **A Core member.** Rejected: like the presentation proof, evidence is a runtime artifact, not a passport declaration — Core stays lean.

## Open Questions

1. **Witness tier (§8.8).** The log protocol, witness model, and the conformance tier that *requires* completeness are reserved — the natural next design session.
2. **Streaming / long sessions.** Per-session records suit bounded sessions; very long-running agents may want signed checkpoints (the chaining supports this) — worth a follow-up once the base lands.
3. **Governor identity declaration.** Whether a governor SHOULD publish its own ADL passport (so counterparties can discover its key and tier claims ahead of time) or only present identity inline in records.
4. **Privacy.** Records summarize an agent's behavior; what a governor MAY redact before publishing to a shared governance record needs a guideline.

## References

- `protocol/draft/runtime-protocol.md` §1.3 (version pin), §1.4 (self-governance), §6 (actions), §7 (anomaly), §8.
- `protocol/draft/trust-protocol.md` §1.1.3 (identity resolution), §1.1.5 (signature verification), §1.2.7 (nonce).
- [2026-05-29-generalized-degradation.md](./2026-05-29-generalized-degradation.md); [Governance is Changing Meaning in AI](https://www.ironsteadgroup.com/articles/governance-changing-meaning-in-ai).
