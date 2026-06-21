# ADL Conformance Vectors

Test vectors for validating ADL implementations against the specification. Vectors are
**scoped by spec version** because schemas and rules are version-specific.

```
conformance/
  <version>/
    valid/      documents that MUST validate against versions/<version>/schema(-strict).json
    invalid/    documents that MUST be rejected, each with a header comment stating why
```

## Running

A reference runner lives in the `implementations` repo (`@adl-spec/cli`): validate every
`valid/*` (expect pass) and every `invalid/*` (expect failure) against the matching
version schema. CI in this repo also validates vectors on every change.

## Conformance and certification

Passing these vectors is necessary but not sufficient for the **"ADL Certified"** mark.
Anyone may state "ADL-compatible"; the certified mark is granted under
`governance/CERTIFICATION-POLICY.md`. Certification authority is held by the project
steward.

## Adding a vector

1. Put it under the target `<version>/valid` or `<version>/invalid`.
2. For invalid vectors, add a top comment: `# INVALID: <which rule it violates>`.
3. Keep each vector minimal — exercise one rule per invalid vector.
