# Proposal: Replace `x_` Extensions with Structured `extensions` Object and Vendor Profiles

**Date:** 2026-03-14
**Status:** Draft
**ADL Version:** 0.1.0
**Affects:** versions/0.1.0/spec.md, versions/0.1.0/spec-manifest.yaml, versions/0.1.0/schema.json, versions/0.1.0/schema-strict.json, profiles/governance/1.0/schema.json, profiles/portfolio/1.0/schema.json, profiles/registry/1.0/schema.json

## Summary

Replace the `x_` prefix extension mechanism (Section 4.3) with a structured `extensions` object using reverse-domain vendor namespaces. Introduce vendor profiles as a new category of ADL profiles that enable organizations to publish validated schemas for their extensions, including extensions that target objects defined by other profiles.

## Motivation

### The `x_` Prefix Is a Deprecated Anti-Pattern

RFC 6648 ("Deprecating the 'X-' Prefix and Similar Constructs in Application Protocols," 2012) formally deprecated the `X-` convention in HTTP headers and other protocols. The core problems it identified apply directly to ADL's `x_` mechanism:

1. **Flat namespace collision risk.** The pattern `x_acme_cost_center` provides no structural guarantee of vendor identity. Two vendors could independently choose the same namespace prefix (e.g., `x_cloud_region`). The ABNF production `ns-id = 1*(lc-alpha / DIGIT / "_")` provides no delimiter between vendor and field name — is `x_acme_cost_center` vendor "acme" with field "cost_center", or vendor "acme_cost" with field "center"?

2. **Naming debt.** If an `x_` field becomes broadly useful, promoting it to a standard field requires all consumers to handle both the old `x_` name and the new standard name indefinitely.

3. **Schema pollution.** Every `x_` pattern lives at the same level as standard fields. The `patternProperties` regex `"^x_[a-z][a-z0-9_]*$": true` is duplicated 31 times across the base schema — once for every object that allows extensions.

### No Ecosystem Alignment

Modern agent protocols have converged on structured extension mechanisms:

| Protocol | Container | Vendor Namespacing | Validation |
|----------|-----------|-------------------|------------|
| **A2A** (Google) | `extensions[]` | URI-based | Opaque + required flag |
| **MCP** | `_meta` | `com.example/key` (dot-slash) | Opaque |
| **CloudEvents** | Extension attributes | Documented extensions registry | Opaque |
| **OpenTelemetry** | Extensions | Namespace-based | Schema-validated |
| **OpenAPI** | flat `x-` fields | Convention only | Opaque |

ADL's `x_` prefix aligns only with OpenAPI's legacy approach, which itself inherited the pattern that RFC 6648 deprecated.

### Profile Schema Bug

Profile schemas (governance, financial, healthcare) use `additionalProperties: false` on their nested objects but do not include `patternProperties` for `x_`-prefixed members. This means the governance profile's objects (`autonomy`, `compliance_framework`, `human_oversight`, etc.) silently reject all vendor extensions, contradicting the core spec's statement that extension members "MAY appear in any object within an ADL document" (Section 4.3).

### Vendors Cannot Extend Profile Objects

The current architecture provides no mechanism for a vendor to add fields inside another profile's objects. A vendor wanting to add `review_status` inside the governance profile's `autonomy` object must either:
- Use a flat `x_acme_review_status` at the `autonomy` level (blocked by the profile schema bug above), or
- Create an entirely separate profile that duplicates the governance structure

Neither option is practical for ecosystem growth.

## Details

### 1. The `extensions` Object

Replace all `x_`-prefixed extension members with a structured `extensions` member that MAY appear at any object level within an ADL document. Within `extensions`, vendor data is grouped under reverse-domain namespace keys.

#### 1.1 Syntax

```json
{
  "adl_spec": "0.1.0",
  "name": "Invoice Processor",
  "version": "2.0.0",
  "description": "Processes and routes invoices.",
  "data_classification": {
    "sensitivity": "confidential",
    "extensions": {
      "com.acme": {
        "data_tier": "gold",
        "retention_override_approved": true
      }
    }
  },
  "model": {
    "name": "acme-large-2024",
    "extensions": {
      "com.acme": {
        "model_tier": "premium",
        "cost_per_1k_tokens": 0.03
      }
    }
  },
  "extensions": {
    "com.acme": {
      "internal_id": "inv-proc-007",
      "cost_center": "engineering"
    }
  }
}
```

#### 1.2 Vendor Namespace Keys

Vendor keys MUST use reverse-domain notation with at least two dot-separated segments. This follows Java package naming, Android manifest namespaces, and MCP's vendor namespacing convention.

**Valid keys:** `com.acme`, `io.anthropic`, `org.example.research`, `gov.nist`
**Invalid keys:** `acme` (single segment), `COM.ACME` (uppercase), `_internal` (no dot segments)

ABNF:

```abnf
; Extensions (Section 4.3)
vendor-key     = domain-segment 1*("." domain-segment)
domain-segment = lc-alpha *(lc-alpha / DIGIT / "-")
lc-alpha       = %x61-7A  ; a-z
```

JSON Schema pattern for vendor keys:

```
^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$
```

This pattern requires:
- At least two dot-separated segments (prevents single-word squatting)
- Lowercase letters, digits, and hyphens only
- Each segment starts with a letter

#### 1.3 Schema Definition

A shared `$defs/extensions` definition is referenced by every object that allows vendor extensions:

```json
{
  "$defs": {
    "extensions": {
      "type": "object",
      "patternProperties": {
        "^[a-z][a-z0-9-]*(\\.[a-z][a-z0-9-]*)+$": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "additionalProperties": false,
      "description": "Vendor-namespaced extensions. Keys are reverse-domain identifiers."
    }
  }
}
```

Each object in the base schema adds:

```json
{
  "properties": {
    "extensions": { "$ref": "#/$defs/extensions" },
    ...existing properties...
  }
}
```

This replaces the current approach of duplicating `"patternProperties": { "^x_[a-z][a-z0-9_]*$": true }` on every object.

#### 1.4 Implementation Requirements

- Implementations **MUST** preserve `extensions` members when round-tripping ADL documents.
- Implementations **MAY** ignore the contents of `extensions`.
- Implementations **MUST NOT** reject documents containing `extensions` with unknown vendor namespaces.
- Vendor namespace keys **MUST** use reverse-domain notation with at least two segments.
- The member name `extensions` is **RESERVED** at every object level in an ADL document.

### 2. Vendor Profiles

A **vendor profile** is a profile published by an organization to declare vendor-specific extensions with schema validation. Vendor profiles use the same `allOf` composition mechanism as standard profiles (Section 13.1) but target the `extensions` namespace rather than defining new top-level members.

#### 2.1 Identifier

Vendor profiles use URI identifiers controlled by the vendor:

- `https://acme.com/adl/extensions/v1`
- `https://example.org/adl/vendor-profile/2.0`

The `urn:adl:profile:*` namespace is reserved for standard (registered) profiles. Vendor profiles MUST NOT use this namespace.

#### 2.2 Extending the Base ADL

A vendor profile MAY add schema constraints to the `extensions` object at any level, validating that its reverse-domain namespace contains the expected structure:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://acme.com/adl/extensions/v1/schema.json",
  "title": "Acme ADL Extensions",
  "allOf": [
    { "$ref": "https://adl-spec.org/0.1/schema.json" }
  ],
  "type": "object",
  "properties": {
    "profiles": {
      "type": "array",
      "contains": { "const": "https://acme.com/adl/extensions/v1" }
    },
    "extensions": {
      "type": "object",
      "properties": {
        "com.acme": {
          "type": "object",
          "properties": {
            "cost_center": { "type": "string", "minLength": 1 },
            "internal_id": { "type": "string", "pattern": "^[a-z]+-[0-9]+$" }
          }
        }
      }
    }
  }
}
```

#### 2.3 Extending Other Profiles

A vendor profile MAY declare a dependency on a standard profile and add schema constraints to `extensions` within that profile's objects. This is the key mechanism that enables vendors to extend profile-defined objects.

**Example:** Acme extends the governance profile's `autonomy` object with review tracking:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://acme.com/adl/governance-extensions/v1/schema.json",
  "title": "Acme Governance Extensions",
  "allOf": [
    { "$ref": "https://adl-spec.org/0.1/schema.json" },
    { "$ref": "https://adl-spec.org/profiles/governance/1.0/schema.json" }
  ],
  "type": "object",
  "properties": {
    "profiles": {
      "type": "array",
      "contains": { "const": "https://acme.com/adl/governance-extensions/v1" }
    },
    "autonomy": {
      "type": "object",
      "properties": {
        "extensions": {
          "type": "object",
          "properties": {
            "com.acme": {
              "type": "object",
              "properties": {
                "review_status": {
                  "type": "string",
                  "enum": ["pending", "approved", "rejected"]
                },
                "reviewer": { "type": "string", "format": "email" },
                "reviewed_at": { "type": "string", "format": "date-time" }
              },
              "required": ["review_status"]
            }
          }
        }
      }
    }
  }
}
```

An ADL document using this vendor profile:

```json
{
  "adl_spec": "0.1.0",
  "name": "Invoice Processor",
  "version": "2.0.0",
  "description": "Processes invoices with governance and Acme extensions.",
  "data_classification": { "sensitivity": "confidential" },
  "profiles": [
    "urn:adl:profile:governance:1.0",
    "https://acme.com/adl/governance-extensions/v1"
  ],
  "compliance_framework": {
    "primary_framework": "SOC2"
  },
  "autonomy": {
    "tier": 2,
    "basis": "Handles financial data requiring human approval for exceptions",
    "classified_by": "security-team",
    "classified_at": "2025-01-15T10:00:00Z",
    "extensions": {
      "com.acme": {
        "review_status": "approved",
        "reviewer": "jane@acme.com",
        "reviewed_at": "2025-06-01T14:30:00Z"
      }
    }
  },
  "human_oversight": {
    "enabled": true,
    "trigger_conditions": ["financial_threshold_exceeded"]
  },
  "incident_response": {
    "contact": "security@acme.example.com",
    "severity_levels": ["low", "medium", "high", "critical"]
  },
  "disclosure": {
    "ai_disclosure_required": true,
    "disclosure_method": "explicit"
  },
  "extensions": {
    "com.acme": {
      "cost_center": "engineering",
      "internal_id": "inv-007"
    }
  }
}
```

#### 2.4 Constraints

- Vendor profiles **MUST NOT** redefine core ADL members or standard profile members with incompatible types.
- Vendor profiles **MUST** only add schema constraints within their own reverse-domain namespace under `extensions`.
- A vendor profile's `extensions` schema applies only when the vendor profile is declared in the document's `profiles` array.
- Documents **MAY** include `extensions` data for a vendor without declaring the vendor's profile. In this case, the data is preserved but unvalidated — implementations treat it as opaque.
- Multiple vendor profiles compose independently. Each vendor's `extensions` constraints apply only within its own namespace.

#### 2.5 Registration

Vendor profiles do **NOT** require IANA registration. The reverse-domain namespace provides collision prevention through DNS ownership. This contrasts with standard profiles, which use the `urn:adl:profile:*` namespace and require designated expert review (Section 13.4).

Vendors **SHOULD**:
- Publish their profile schema at a stable, dereferenceable URI
- Version their profile schemas (e.g., `/v1/`, `/v2/`)
- Document the semantics of their extension fields

### 3. Changes to Existing Specification

#### 3.1 Section 4.3 (Extension Mechanism) — Rewrite

Replace the current `x_` prefix text with the `extensions` object definition. Remove all references to `x_` prefixed members. Update the example.

#### 3.2 Appendix D (Formal Grammar) — Update

Remove:
```abnf
ext-member-name = "x_" ns-id
ns-id           = 1*( lc-alpha / DIGIT / "_" )
```

Add:
```abnf
vendor-key     = domain-segment 1*("." domain-segment)
domain-segment = lc-alpha *(lc-alpha / DIGIT / "-")
```

Update cross-reference table: replace `ext-member-name` row with `vendor-key`.

#### 3.3 Section 13 (Profiles) — Add Vendor Profiles

Insert new Section 13.4 "Vendor Profiles" between existing 13.3 (Profile Dependencies) and 13.4 (Profile Registration). Renumber existing 13.4 to 13.5, 13.5 to 13.6.

Content as described in Section 2 of this proposal.

#### 3.4 Section 13.1 (Profile Schema Composition) — Update

Update the text referencing `x_`-prefixed extension members to reference `extensions` instead:

> Adds `unevaluatedProperties: false` to close the composed schema, ensuring only base ADL members, profile-defined members, and ~~`x_`-prefixed extension~~ **`extensions`** members are accepted.

#### 3.5 Base Schema (Appendix A / schema.json) — Update

1. Add `$defs/extensions` definition.
2. Add `"extensions": { "$ref": "#/$defs/extensions" }` to the `properties` of every object.
3. Remove all `"patternProperties": { "^x_[a-z][a-z0-9_]*$": true }` entries.

#### 3.6 Strict Schema (schema-strict.json) — Update

Same changes as base schema.

#### 3.7 Profile Schemas — Update

Add `"extensions": { "$ref": "#/$defs/extensions" }` (or equivalent inline) to every object in:
- `profiles/governance/1.0/schema.json`
- `profiles/portfolio/1.0/schema.json`
- `profiles/registry/1.0/schema.json`

This fixes the existing bug where profile schemas with `additionalProperties: false` silently reject all extensions.

#### 3.8 Examples — Update

Replace all `x_` prefixed members in example files with the `extensions` structure.

## Alternatives

### A. Keep `x_` prefix with improved namespacing

Add a namespace delimiter (e.g., `x_acme__cost_center` with double underscore) to separate vendor from field name.

**Rejected:** Still suffers from RFC 6648's fundamental objections. Adding delimiters is a band-aid on a deprecated pattern.

### B. Use `_meta` (MCP alignment)

Use MCP's `_meta` as the container name instead of `extensions`.

**Rejected:** `_meta` implies "internal metadata" which is too narrow. ADL vendor extensions can add functional behavior (e.g., review workflows), not just metadata. MCP's `_meta` is also designed for runtime protocol messages, not declarative document schemas. `extensions` better describes the intent and aligns with A2A and CloudEvents.

### C. URI-keyed extensions (JSON-LD style)

Use full URIs as vendor keys: `"https://acme.com/adl/v1": { ... }`.

**Rejected:** Verbose, harder to type, and the URI structure adds no practical value over reverse-domain notation. Reverse-domain keys are shorter, well-understood, and provide the same global uniqueness guarantee.

### D. Flat `extensions` with naming discipline

A single `extensions` object with flat keys (no vendor namespacing), relying on naming conventions.

**Rejected:** Reintroduces the same collision risk that `x_` has. CloudEvents uses this approach but supplements it with a documented extensions registry — ADL does not have such a registry.

## References

- [RFC 6648 — Deprecating the "X-" Prefix and Similar Constructs in Application Protocols](https://datatracker.ietf.org/doc/html/rfc6648)
- [A2A Protocol — Extensions](https://a2a-protocol.org/latest/topics/extensions/)
- [MCP Specification — `_meta` and Extensions](https://modelcontextprotocol.io/specification/2025-06-18/basic)
- [CloudEvents — Extension Context Attributes](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#extension-context-attributes)
- [OpenTelemetry — Extension Attributes](https://opentelemetry.io/docs/)
- [JSON Schema 2020-12 — `patternProperties`](https://json-schema.org/draft/2020-12/json-schema-core.html)
- [ADL Specification — Section 4.3 Extension Mechanism](../versions/0.1.0/spec.md)
- [ADL Specification — Section 13 Profiles](../versions/0.1.0/spec.md)
- [ADL Critical Gap Remediation Proposal](./2026-02-16-critical-gap-remediation.md)
