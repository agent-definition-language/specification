# Verify Test Vector Pack

Language-neutral conformance vectors for the ADL passport verification
procedure proposed in
[`proposals/2026-05-03-passport-verification-procedure.md`](../../../../proposals/2026-05-03-passport-verification-procedure.md)
(§10.3).

These vectors are the **source of truth** for `verifyPassport` behavior
across all implementations. Two reference ports today (TypeScript and
Python) both pass 23/23 vectors; Go is the next planned port, with
Rust, Java, and others added as community contributions.

| Implementation | Status | Conformance |
|----------------|--------|-------------|
| TypeScript ([`@adl-spec/core`](../../../../packages/adl-core/)) | Reference | 23/23 |
| Python ([`adl-spec`](../../../../packages/adl-py/)) | Reference | 23/23 |
| Go | Planned | — |
| Rust | Future / community | — |
| Java | Future / community | — |

## Why this exists

The verification procedure is security-critical: a passport that one
implementation accepts and another rejects is a real interop bug. The
TypeScript reference at `@adl-spec/core` is the canonical implementation,
but the spec — not any one library — must be the arbiter.

A vector pack that any implementation can run resolves that. Each vector
captures a passport, a verifier configuration, the network responses the
verifier should see, and the expected per-step outcome. A port is
conformant when it loads every vector and produces matching outcomes.

## Layout

```
versions/draft/test-vectors/verify/
├── README.md         (this file)
├── SCHEMA.md         (vector format reference)
├── test-keys.json    (deterministic Ed25519 keypairs the generator uses)
└── vectors/
    ├── 001-valid-self-signed-tofu.json
    ├── 002-valid-did-resolved-cross-checked.json
    ├── 003-retrieval-local-file.json
    ├── ...
    └── 082-classification-requesting-higher.json
```

23 vectors today, organized by §10.3 subsection (see SCHEMA.md for the
numbering convention).

## How to consume the vectors

Conforming implementations follow this loop:

```pseudocode
for vector in load_all_json("vectors/"):
    fetch_shim = build_shim(vector.input.did_resolution_responses)
    install_fetch_shim(fetch_shim)

    outcome = verify_passport(
        passport_bytes  = serialize(vector.input.passport, vector.input.passport_format),
        retrieval       = vector.input.retrieval,
        requesting      = vector.input.requesting_agent,
        config          = vector.config,
    )

    assert outcome.verified           == vector.expected.verified
    assert outcome.public_key_source  == vector.expected.public_key_source

    if not vector.expected.verified:
        blocking = first_step_with(severity="block", passed=False, in: outcome.steps)
        assert blocking.section == vector.expected.blocked_at_section

    for expected_step in vector.expected.step_outcomes:
        actual = find(outcome.steps, section=expected_step.section)
        assert actual.passed   == expected_step.passed
        assert actual.severity == expected_step.severity
```

Every implementation MUST intercept HTTP calls and answer from
`vector.input.did_resolution_responses`. Network access during vector
evaluation is an implementation defect.

Reference runners:

- TypeScript: [`packages/adl-core/tests/conformance-vectors.test.ts`](../../../../packages/adl-core/tests/conformance-vectors.test.ts)
- Python: [`packages/adl-py/tests/test_conformance_vectors.py`](../../../../packages/adl-py/tests/test_conformance_vectors.py)

Future ports SHOULD provide an equivalent runner in their language.

## Coverage

| §10.3 step | Vectors |
|------------|---------|
| 1.1.1 Retrieval integrity | 003, 004 |
| 1.1.2 Schema validation | 010, 011, 050 |
| 1.1.3 Identity resolution | 002, 020, 021, 022 |
| 1.1.4 Public key cross-check | 002, 030 |
| 1.1.5 Signature verification | 001, 040, 041, 042 |
| 1.1.6 Temporal validity | 050, 051 |
| 1.1.7 Lifecycle gating | 060, 061, 062 |
| 1.1.8 Provider–identity coherence | 070, 071 |
| 1.1.9 Permission/classification compatibility | 080, 081, 082 |

## Time-relative vectors

`051-attestation-near-expiry-warn` is **time-relative**: it embeds an
`expires_at` value computed from "now + 10 days" at generation time, to
test the §1.1.6 30-day warning threshold. Implementations evaluating
this vector after the embedded date will see §1.1.6 fail (block) instead
of warn. Regenerate the pack when the warning vector goes stale.

All other vectors are time-stable.

## Regenerating the pack

The TypeScript generator at
[`packages/adl-core/scripts/generate-test-vectors.ts`](../../../../packages/adl-core/scripts/generate-test-vectors.ts)
is the canonical source of how each vector is constructed. Re-run only
when:

- adding new vectors,
- the §10.3 procedure changes in a way that requires regenerating signatures,
- the time-relative vector (051) needs a fresh expiry date,
- test keys need to rotate (rare; existing vectors will need re-signing).

```bash
bun run packages/adl-core/scripts/generate-test-vectors.ts
```

The generator reads `test-keys.json`. If absent, fresh keys are generated
and written. Once committed, the same keys are reused on subsequent runs
so that all signatures remain stable.

## Test keys

`test-keys.json` holds three deterministic Ed25519 keypairs:

- `consumer` — signs the typical consumer passport
- `enterprise` — signs the enterprise/target passport in §1.1.9 vectors
- `imposter` — signs vectors that exercise key mismatch (042) or
  DID-Document-vs-inline divergence (030)

These are **public** test keys. **Never use them outside this vector
pack.** Each key's source-of-truth is the JSON file; the generator
documents which key signs which passport.

Implementations that consume vectors do not need `test-keys.json` — the
public key for verification is always present in the passport's
`cryptographic_identity.public_key` (and, when `did_resolution_responses`
includes a DID Document, in that document as well).

## Contributing a new vector

1. Add a `addVector({ ... })` block to
   `packages/adl-core/scripts/generate-test-vectors.ts` following the
   numbering convention in SCHEMA.md.
2. Include both passing and failing variants when adding coverage for a
   new spec branch.
3. Run `bun run packages/adl-core/scripts/generate-test-vectors.ts` to
   regenerate the pack.
4. Run `bun test tests/conformance-vectors.test.ts` from `packages/adl-core/`
   to confirm the new vector passes the TS reference impl.
5. Commit the generator change, the new vector JSON, and any updated
   coverage table in this README.

## Status

The vector pack is part of the **draft** version of the spec. It will
move to a numbered version (e.g., `versions/0.3.0/test-vectors/verify/`)
when §10.3 is included in a published release.

## Related

- [Verification procedure proposal](../../../../proposals/2026-05-03-passport-verification-procedure.md)
- [TypeScript reference implementation](../../../../packages/adl-core/src/verify/)
- [OpenClaw passport example](../../../../packages/adl-agent/examples/openclaw-passport/)
