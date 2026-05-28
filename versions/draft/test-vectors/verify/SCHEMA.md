# Verify Test Vector Schema

This document specifies the format of the JSON test vectors at
[`vectors/`](./vectors/). Every conforming implementation of the passport
verification procedure (proposed §10.3) MUST be able to load these vectors
and produce the expected outcome for each.

The intent is for the *vectors*, not any one library, to be the source of
truth as ports land in Python, Go, Rust, and other languages.

## Vector file layout

Each vector is a single JSON file named `NNN-short-name.json` where `NNN`
is a three-digit ordinal that groups related vectors together. The naming
convention also indicates which §10.3 step the vector primarily exercises:

| Range  | Section | Focus |
|--------|---------|-------|
| 000–009 | happy path / §1.1.1 | Valid passports and retrieval channel |
| 010–019 | §1.1.2 | Schema validation failures |
| 020–029 | §1.1.3 | Identity resolution (`did:web`) |
| 030–039 | §1.1.4 | Public key cross-check |
| 040–049 | §1.1.5 | Signature verification |
| 050–059 | §1.1.6 | Temporal validity |
| 060–069 | §1.1.7 | Lifecycle gating |
| 070–079 | §1.1.8 | Provider–identity coherence |
| 080–089 | §1.1.9 | Permission/classification compatibility |

## Vector schema

```jsonc
{
  // Required: stable identifier matching the file name.
  "id": "001-valid-self-signed-tofu",

  // Required: human-readable description.
  "description": "Self-signed passport with inline key passes verification under TOFU",

  // Required: the §10.3 subsection(s) this vector exercises.
  "spec_sections": ["1.1.1", "1.1.2", "1.1.4", "1.1.5", "1.1.6", "1.1.7"],

  // Required: inputs to verifyPassport().
  "input": {
    // The full ADL passport. Implementations canonicalize and verify this.
    "passport": { /* ADL document */ },

    // Optional: how the passport's serialized bytes should be interpreted.
    // Defaults to "json". When "yaml", implementations YAML-serialize the
    // passport before computing passport_bytes.
    "passport_format": "json",

    // Required: how the passport was retrieved.
    "retrieval": {
      "channel": "header",
      "authority": "localhost:3000",
      "discovery_authority": null
    },

    // Optional: the requesting agent's own passport, for §1.1.9 checks.
    "requesting_agent": null,

    // Optional: pre-canned responses for did:web resolution. Maps the
    // expected fetch URL to a synthetic Response. Implementations MUST
    // intercept HTTP calls during verification and answer from this table
    // rather than reaching the network. URLs that aren't in the table
    // SHOULD result in network failure (404 or connection error).
    "did_resolution_responses": {
      "https://test.example/agents/personal-assistant/did.json": {
        "status": 200,
        "body": { /* DID Document */ }
      }
    }
  },

  // Required: VerifyConfig passed to verifyPassport().
  "config": {
    "mode": "enforce",
    "require_signature": true,
    "require_did_resolution": false,
    "require_provider_coherence": false,
    "trust_on_first_use": true,
    "did_local_overrides": {},
    "provider_allowlist": []
  },

  // Required: the expected outcome.
  "expected": {
    // Required: overall verified flag.
    "verified": true,

    // Required: which key source the verifier used.
    "public_key_source": "inline_only",

    // Required when verified=false: the section that blocked.
    "blocked_at_section": null,

    // Required: per-step outcomes that MUST be present in the result.
    // Implementations may include additional steps (e.g., warns), but
    // every entry here MUST appear with the specified pass/severity.
    "step_outcomes": [
      { "section": "1.1.1", "passed": true,  "severity": "warn" },
      { "section": "1.1.2", "passed": true,  "severity": "block" },
      { "section": "1.1.3", "passed": true,  "severity": "warn" },
      { "section": "1.1.4", "passed": true,  "severity": "warn" },
      { "section": "1.1.5", "passed": true,  "severity": "block" },
      { "section": "1.1.6", "passed": true,  "severity": "block" },
      { "section": "1.1.7", "passed": true,  "severity": "block" }
    ]
  }
}
```

## Conformance requirements

A conforming implementation:

1. **MUST** load every vector in `vectors/` and apply the verification
   procedure with the supplied `config` and `input`.
2. **MUST** intercept any HTTP requests made during verification (notably
   `did:web` resolution) and serve responses from
   `input.did_resolution_responses`. Network access during vector
   evaluation is an implementation defect.
3. **MUST** assert that the resulting outcome's `verified` field equals
   `expected.verified`.
4. **MUST** assert that the resulting outcome's `public_key_source`
   equals `expected.public_key_source`.
5. **MUST** assert that, for every entry in `expected.step_outcomes`,
   the corresponding step in the outcome has matching `passed` and
   `severity` values.
6. **WHEN** `expected.verified` is `false`, **MUST** assert that the
   first blocking step's `section` matches `expected.blocked_at_section`.

A conforming implementation **MAY** include additional warning-level steps
not listed in `expected.step_outcomes` — for example, an implementation
that adds a §10.3.x.1 substep does not become non-conformant merely by
emitting an extra entry. The vectors specify a *minimum* set of expected
behaviors.

## Field encoding

- All `passport`, `requesting_agent`, and DID Document objects are
  expressed as JSON objects literally embedded in the vector file. There
  is no Base64 encoding step; the implementation reads them directly.
- When `passport_format` is `"yaml"`, implementations MUST convert the
  embedded JSON to YAML before computing the verifier input bytes. Use a
  conformant YAML 1.2 serializer.
- All timestamps are ISO 8601 with timezone (typically `Z` for UTC).
- Ed25519 public keys are Base64-encoded raw 32-byte values.
- Signatures are Base64url-encoded per RFC 4648 §5.

## Test keys

[`test-keys.json`](./test-keys.json) holds the deterministic Ed25519
keypairs used by the generator. These are **public** test keys — never
use them outside this vector pack. When a vector embeds a signature, that
signature was produced by one of these keys (usually `consumer` or
`enterprise`); the generator's source code documents which key signed
which passport.

Implementations that consume vectors do not need `test-keys.json` —
the public key for verification is always present in the passport's
`cryptographic_identity.public_key` (and, when `did_resolution_responses`
includes a DID Document, in that document as well).
