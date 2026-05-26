# ADL Proposal: Scope-Based Authorization (§10.4)

**Date:** 2026-05-02 (revised 2026-05-06 to align with §10 reorganization and cohesive Authentication structure)
**Status:** Draft
**ADL Version:** 0.2.0 (target: draft → 0.3.0)
**Builds on:** [2026-05-04-section-10-reorganization.md](./2026-05-04-section-10-reorganization.md), [2026-05-03-passport-verification-procedure.md](./2026-05-03-passport-verification-procedure.md), [2026-05-04-passport-presentation-proof.md](./2026-05-04-passport-presentation-proof.md)
**Affects:** `versions/draft/spec.md` (§10.4), `versions/draft/schema.json` (`security.scopes`, `tools[*].security.scopes`)

---

## Summary

Define scope-based authorization at the agent (root) and tool levels with override-on-presence inheritance, layered onto the cohesive Authentication structure (§10.3). Scopes use the same vocabulary across both authentication paths defined in §10.3 — OAuth 2.1 access tokens at the human/external boundary (§10.3.3) and presentation-proof `scopes` claims at the agent-to-agent boundary (§10.3.1 + §10.3.2) — and apply uniform inheritance and effective-scope computation regardless of which path delivered the credential. The presentation proof is extended with a `scopes` member so that requested scopes are sender-constrained per-request, analogous to OAuth 2.1's DPoP-bound access tokens [RFC9449].

This revision supersedes the original 2026-05-02 draft, which positioned scopes as an addendum to a standalone Authentication subsection. Following the §10 reorganization (2026-05-04), Authentication is a cohesive parent (§10.3) with three subsections; scopes now sit at peer level as §10.4, and explicitly compose with both authentication paths.

## Motivation

ADL needs an authorization model that:

- Composes uniformly with both Authentication paths (§10.3.3 OAuth 2.1 / OIDC / mTLS / API key for the human-and-external boundary, and §10.3.1 + §10.3.2 passport verification + presentation proof for the agent-to-agent boundary).
- Layers onto OAuth 2.1 [RFC9700] without re-inventing scope syntax, scope-based access decisions, or the `insufficient_scope` error semantics from [RFC6750].
- Survives multi-hop calls (human → agent → upstream agent) with a clear per-hop authorization model and explicit composition rules.
- Stays portable across A2A, LangGraph, MCP, and OpenClaw runtimes without baking framework-specific permissioning into core ADL.

Per-tool scope overrides are the minimum viable least-privilege mechanism for agents whose surface includes both safe and sensitive operations. Most agents have a small handful of high-risk tools (write, approve, delete) buried inside a larger surface of read-only tools; one root scope set with per-tool overrides expresses this without ceremony.

## Details

### 1. Spec changes (proposed §10.4)

The full normative §10.4 lands directly in `versions/draft/spec.md`. This proposal documents the design decisions; the spec is the source of truth.

#### 1.1 Declaration members

- `security.scopes` (root, OPTIONAL, array of strings) — default required scopes; doubles as the agent's **passport-attested ceiling** for upstream agent-to-agent calls (§10.4.4).
- `tools[*].security.scopes` (per tool, OPTIONAL, array of strings) — required scopes to invoke this specific tool. **Override on presence**, not augment.

Scope strings follow OAuth 2.1 grammar [RFC6749 §3.3]. Recommended convention: `<resource>:<action>`. Reserved prefix: `adl:`.

#### 1.2 Inheritance and override

- Tool absent → root applies.
- Tool present (including `[]`) → completely replaces root for that tool.
- Empty array at tool level is a deliberate downgrade ("this tool requires no scopes"), not an oversight.

Validators **SHOULD** warn when a tool-level scope set introduces values outside the root scope set; an optional strict mode **MAY** reject.

#### 1.3 Two paths, one vocabulary

Scopes carry the same meaning regardless of which authentication path delivered them:

- **Human/external boundary (§10.3.3).** Scopes ride in the OAuth 2.1 access token's `scope` claim, the OIDC ID token, or an out-of-band binding for API keys / mTLS certs.
- **Agent-to-agent boundary (§10.3.1 + §10.3.2).** Scopes ride in the presentation proof's new `scopes` member, signed alongside the request URL/method/timestamp. The proof's signature covers the requested scope set, making it sender-constrained per-request.

This means the same scope string (`invoices:approve`) is the authorization token whether the caller is a human-via-OAuth or an agent-via-passport. Auditing, governance, and policy tooling consume one vocabulary, not two.

#### 1.4 Multi-hop composition

When a human-authenticated request arrives at Agent A and Agent A calls upstream Agent B, two **independent** authorizations occur. The default is per-hop independent: each hop authorizes purely on the basis of credentials presented to it, and the human's scope set does not automatically propagate. Implementations **MAY** apply OAuth 2.1 Token Exchange semantics [RFC8693] to derive `S_a = S_a_max ∩ map(S_h)`; this is documented as the "reduction" pattern in §10.4.5 but is not mandated.

Audit **MUST** record both authorizations per hop. The audit chain reconstructs end-to-end authority even though no single hop sees the entire chain.

#### 1.5 Sender-constrained scope binding (proof.scopes)

Adding `scopes` to the presentation proof (§10.3.2.2) is what makes per-request scope assertion replay-safe. A scraped passport carries the static ceiling but no in-flight request scopes; a scraped proof can't be re-presented for a different request because §10.3.2.6.4 binds the URI/method. Together, they are the agent-to-agent equivalent of OAuth 2.1's DPoP-bound access tokens [RFC9449]: per-request, sender-constrained, signed.

### 2. Schema changes

```json5
{
  "security": {
    "type": "object",
    "properties": {
      "scopes": { "type": "array", "items": { "type": "string", "minLength": 1 } }
    }
  },
  "tools": {
    "items": {
      "properties": {
        "security": {
          "type": "object",
          "properties": {
            "scopes": { "type": "array", "items": { "type": "string", "minLength": 1 } }
          }
        }
      }
    }
  }
}
```

The presentation proof schema (separate from the ADL document schema) gains:

```json5
{
  "scopes": { "type": "array", "items": { "type": "string", "minLength": 1 } }
}
```

### 3. Interop assessment

#### 3.1 OAuth 2.1 / OIDC

Direct mapping. `security.scopes` populates the `scope` claim a client requests at the authorization server. `tools[*].security.scopes` becomes per-resource scope policy at the resource server. The `insufficient_scope` error from [RFC6750] is the canonical authorization-failure response for the human/external path.

#### 3.2 A2A

A2A skill cards carry a dominant auth posture per agent endpoint. Root scopes map to the card's required scopes; tool overrides become per-skill scope metadata where available, or extension fields where not.

#### 3.3 MCP

MCP deployments rely on a server-level trust boundary plus per-tool runtime policy. Root scopes + per-tool override map naturally onto MCP's existing tool-policy surface.

#### 3.4 LangGraph

Runtime middleware binds credentials at the graph entrypoint and per-node policy is enforced via tags. ADL's root + per-tool scope structure is a direct fit.

#### 3.5 OpenClaw

The OpenClaw runtime layer plugin (proposal 2026-03-21) consumes:
- `AuthenticationPolicy` (per §10.3.3) — single-AuthN at the agent boundary
- `DefaultScopeSet` (per §10.4 root)
- `ToolScopeOverrideSet` (per §10.4 tool)

OpenClaw's existing tool-policy enforcement can apply scope checks per tool invocation without protocol changes.

### 4. Migration

Existing `security.authentication.scopes` (the inline scope array historically declared inside the auth scheme) **SHOULD** migrate to the new top-level `security.scopes`. The migration is mechanical:

```json5
// before
{
  "security": {
    "authentication": {
      "type": "oauth2",
      "scopes": ["invoices:read", "invoices:write"]
    }
  }
}

// after
{
  "security": {
    "authentication": {
      "type": "oauth2"
    },
    "scopes": ["invoices:read", "invoices:write"]
  }
}
```

Validators **SHOULD** continue to accept the legacy inline shape with a deprecation warning until the next minor release.

## Alternatives

1. **Single root scopes only (no per-tool override).** Rejected — fails least-privilege use cases for agents with mixed-sensitivity tools.

2. **Scopes nested under `security.authentication`.** Rejected — blurs the AuthN/AuthZ separation and makes tool-level overrides awkward.

3. **Full OpenAPI-style multi-scheme components in core ADL.** Deferred — powerful but over-complex for current runtime support levels. Profiles can layer this on later without changing the §10.4 baseline.

4. **Skip sender-constrained scope binding (no `proof.scopes`).** Rejected — would leave agent-to-agent scopes vulnerable to replay if proofs were captured. The cost (one optional field in the proof) is much less than the security gain.

## Open Questions

- Should ADL core strictly require that each tool scope set be a subset of root `security.scopes`, or allow divergence with a warning? (Current spec text recommends warn, with optional strict mode.)
- Should the multi-hop composition default flip from independent to reduction in a future revision, once Token Exchange [RFC8693] is widely adopted in agent runtimes?

## References

- [RFC9700] OAuth 2.1 — authorization framework
- [RFC6749] OAuth 2.0 — scope grammar inherited by OAuth 2.1
- [RFC6750] OAuth 2.0 Bearer Token Usage — `insufficient_scope` error semantics
- [RFC9449] DPoP — sender-constrained tokens, design parallel for `proof.scopes`
- [RFC8693] OAuth 2.0 Token Exchange — basis for the optional reduction pattern in §10.4.5
- ADL Spec §10.3 (Authentication), §10.3.1 (Verification), §10.3.2 (Presentation Proof), §10.3.3 (Credential Schemes)
- OpenAPI Specification 3.1 — Security Scheme Object (comparison baseline)
