---
id: specification
title: "Specification"
sidebar_position: 2
slug: ../specification
description: "Full specification for the ADL Registry Profile including agent catalog identity, classification, and federation."
keywords: [adl, registry specification, agent catalog, agent registry, agentic ai, agent discovery, agent classification, agent federation]
adl_profile_meta:
  example_filename: "registered-agent.adl.json"
---

# Registry Profile Specification

**Identifier:** `urn:adl:profile:registry:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x
**Schema:** [`schema.json`](schema.json)
**Dependencies:** None

## 1. Introduction

The Registry Profile extends ADL with agent catalog identity, classification, and federation capabilities. It enables organizations to manage agents across enterprise registries, support multi-path classification, and federate agent definitions across multiple registry instances.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

### 1.1 Relationship to Other Profiles

The Registry Profile is independent of other ADL profiles:

- **Portfolio Profile** — Tracks agent relationships and business domain alignment. An enterprise may manage portfolio relationships without a formal registry (e.g., in a Git repository or CMDB). Registry and portfolio are siblings with no dependency.
- **Governance Profile** — Tracks compliance and governance controls. An agent can be governed without being in a registry (e.g., during pre-deployment governance review). Registry and governance are siblings with no dependency.

Organizations that need both registry and portfolio capabilities declare both profiles as siblings:

```json
{
  "profiles": [
    "urn:adl:profile:registry:1.0",
    "urn:adl:profile:portfolio:1.0"
  ]
}
```

---

## 2. Additional Members

### 2.1 registry

**REQUIRED** when using this profile.

An object containing agent catalog identity, classification, and federation information.

| Member                 | Type   | Required | Description |
|------------------------|--------|----------|-------------|
| catalog_id             | string | REQUIRED | Unique identifier within the registry catalog |
| catalog_classification | array  | OPTIONAL | Registry catalog classification paths |
| visibility             | string | OPTIONAL | Visibility scope |
| federation             | object | OPTIONAL | Multi-registry publishing configuration |

#### catalog_id

A unique identifier for this agent within the registry catalog. **MUST** be a non-empty string. **SHOULD** be a URN or URI that is unique across the agent registry (e.g., `urn:acme:agents:compliance-review:2.0.0`).

#### catalog_classification

When present, **MUST** be an array of classification path objects. Each entry represents a classification path — an agent **MAY** belong to multiple categories via multiple entries. This enables multi-path classification where a single agent serves multiple business domains or capabilities.

Each classification entry **MUST** be an object containing:

| Member     | Type   | Required | Description |
|------------|--------|----------|-------------|
| domain     | string | REQUIRED | Business domain |
| subdomain  | string | OPTIONAL | Subdomain within domain |
| capability | string | OPTIONAL | Capability category |

`domain` **MUST** be a non-empty string identifying the business domain. Values **SHOULD** be lowercase, hyphen-separated (e.g., `"compliance"`, `"risk-management"`, `"customer-service"`).

The name `catalog_classification` is intentionally distinct from governance taxonomy terms (EU AI Act risk taxonomy, NIST AI taxonomy) to avoid confusion between catalog organization and regulatory classification systems.

#### visibility

When present, **MUST** be one of:

- `private` — Visible only to the owning team
- `internal` — Visible within the organization
- `public` — Visible externally

#### federation

When present, **MUST** be an object containing multi-registry publishing configuration:

| Member     | Type  | Required | Description |
|------------|-------|----------|-------------|
| registries | array | OPTIONAL | Registry URIs where agent is published |
| primary    | string | OPTIONAL | Primary registry URI |

`registries`, when present, **MUST** be an array of strings. Each string **MUST** be a valid URI identifying a registry where this agent is published.

`primary`, when present, **MUST** be a valid URI identifying the primary registry for this agent. The primary registry is the authoritative source for the agent definition.

---

## 3. Example

A registered agent with multi-path classification and federation:

```json
{
  "adl_spec": "0.1.0",
  "name": "Compliance Review Agent",
  "description": "Reviews documents for regulatory compliance against SOC 2 Type II controls.",
  "version": "2.0.0",
  "data_classification": {
    "sensitivity": "confidential",
    "categories": ["regulatory"]
  },
  "profiles": ["urn:adl:profile:registry:1.0"],
  "registry": {
    "catalog_id": "urn:acme:agents:compliance-review:2.0.0",
    "catalog_classification": [
      {
        "domain": "compliance",
        "subdomain": "document-review",
        "capability": "soc2-review"
      }
    ],
    "visibility": "internal",
    "federation": {
      "registries": [
        "https://registry.acme.example",
        "https://enterprise-agents.example"
      ],
      "primary": "https://registry.acme.example"
    }
  },
  "metadata": {
    "tags": ["compliance", "soc2", "audit", "document-review"]
  }
}
```

> **Note:** Discovery tags are handled by the core ADL `metadata.tags` member (Section 12.5). Registry classification serves catalog organization. There is no need for separate discovery tag fields.

---

## 4. Validation Rules

Implementations validating against this profile **MUST** enforce:

| Rule   | Description |
|--------|-------------|
| REG-01 | `registry` **MUST** be present |
| REG-02 | `registry.catalog_id` **MUST** be present and non-empty |
| REG-03 | `registry.visibility` **MUST** be a valid visibility value if present |
| REG-04 | `registry.catalog_classification[*].domain` **MUST** be present and non-empty if classification entry exists |
| REG-05 | `registry.federation.registries` elements **MUST** be valid URIs if present |
| REG-06 | `registry.federation.primary` **MUST** be a valid URI if present |

### 4.1 Schema Validation

The registry profile provides a JSON Schema ([`schema.json`](schema.json)) that extends the base ADL schema via `allOf` composition per Section 13.1 of the core specification. The profile schema:

1. References the base ADL schema via `allOf` with `$ref`.
2. Declares all registry-specific members in its own `properties`.
3. Adds `unevaluatedProperties: false` to reject members not defined by either the base schema or this profile.

Validators **SHOULD** use this schema for structural validation of documents declaring the registry profile.

### 4.2 Profile Dependencies

This profile has no dependencies. It **MAY** be declared alongside other profiles (e.g., governance, portfolio) as a sibling. See Section 13.3 of the core specification for dependency rules.

---

## 5. Use Cases

### 5.1 Agent Catalog

The `registry` member enables catalog systems to:
- Index agents by `catalog_id` for unique lookup
- Organize agents by `catalog_classification` domain, subdomain, and capability
- Control access based on `visibility`

### 5.2 Multi-Registry Federation

The `federation` member enables:
- Publishing agent definitions to multiple registries
- Identifying the authoritative registry via `primary`
- Synchronizing agent metadata across registry instances

### 5.3 Multi-Path Classification

The `catalog_classification` array enables:
- Classifying a single agent under multiple business domains
- Supporting matrix organizational structures where agents serve multiple teams
- Enabling cross-domain discovery without duplicating agent definitions
