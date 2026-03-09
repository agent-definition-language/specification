---
id: specification
title: "Specification"
sidebar_position: 2
slug: ../specification
description: "Full specification for the ADL Portfolio Profile including agent relationships and domain membership."
keywords: [adl, portfolio specification, multi-agent, agentic ai, agent orchestration, agent relationships, ai fleet management]
adl_profile_meta:
  example_filename: "customer-service-agent.adl.json"
---

# Portfolio Profile Specification

**Identifier:** `urn:adl:profile:portfolio:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x
**Schema:** [`schema.json`](schema.json)
**Dependencies:** None

## 1. Introduction

The Portfolio Profile extends ADL with agent relationships and business domain membership capabilities. It enables organizations to track agent dependencies, composition hierarchies, and business domain alignment at scale.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

### 1.1 Relationship to Other Profiles

The Portfolio Profile is independent of other ADL profiles:

- **Registry Profile** — Provides catalog identity and classification. Portfolio does not depend on registry — an enterprise may track portfolio relationships in a Git repository, CMDB, or spreadsheet without requiring formal registry integration.
- **Governance Profile** — Provides compliance and governance controls. Portfolio does not depend on governance — an agent can have portfolio relationships without being governed.

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

### 2.1 relationships

**OPTIONAL.** An object containing agent dependencies and composition relationships.

| Member         | Type   | Required | Description |
|----------------|--------|----------|-------------|
| depends_on     | array  | OPTIONAL | Agent URIs this agent requires |
| composed_of    | array  | OPTIONAL | Sub-agent URIs (for orchestrators) |
| orchestrated_by| string | OPTIONAL | Parent orchestrator URI |
| peers          | array  | OPTIONAL | Related agents at same level |

#### depends_on

When present, **MUST** be an array of strings. Each string **SHOULD** be an agent URI (e.g., `urn:adl:acme:shared-tools:1.0`). Lists agents that this agent requires to function correctly.

#### composed_of

When present, **MUST** be an array of strings. Each string **SHOULD** be an agent URI. Used when this agent is an orchestrator that manages sub-agents.

#### orchestrated_by

When present, **MUST** be a string containing the URI of the orchestrating agent. Indicates this agent operates as part of a larger orchestrated system.

#### peers

When present, **MUST** be an array of strings. Each string **SHOULD** be an agent URI. Lists agents that operate at the same level or collaborate directly with this agent.

---

### 2.2 domain

**OPTIONAL.** An object containing business/functional domain membership information, aligned with Domain-Driven Design (DDD) concepts.

| Member          | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| domain_id       | string | OPTIONAL | Domain identifier |
| subdomain       | string | OPTIONAL | Subdomain within the domain |
| bounded_context | string | OPTIONAL | Bounded context name |
| role            | string | OPTIONAL | Agent's role within the domain |

#### domain_id

When present, **SHOULD** be a URI or URN identifying the business domain (e.g., `urn:domain:customer-service`).

#### subdomain

When present, specifies the subdomain within the domain (e.g., "ticketing", "live-chat").

#### bounded_context

When present, specifies the DDD bounded context this agent belongs to.

#### role

When present, describes the agent's role within the domain (e.g., "primary-handler", "escalation", "specialist").

---

## 3. Example

```json
{
  "adl_spec": "0.1.0",
  "name": "Customer Service Agent",
  "description": "Handles tier-1 customer inquiries and support requests.",
  "version": "1.2.0",
  "data_classification": {
    "sensitivity": "internal",
    "categories": ["pii"]
  },
  "profiles": ["urn:adl:profile:portfolio:1.0"],
  "relationships": {
    "depends_on": [
      "urn:adl:acme:knowledge-base-agent:1.0",
      "urn:adl:acme:ticket-api-agent:2.0"
    ],
    "orchestrated_by": "urn:adl:acme:support-orchestrator:1.0",
    "peers": [
      "urn:adl:acme:billing-support-agent:1.0",
      "urn:adl:acme:technical-support-agent:1.0"
    ]
  },
  "domain": {
    "domain_id": "urn:domain:customer-service",
    "subdomain": "inquiries",
    "bounded_context": "support-portal",
    "role": "primary-handler"
  }
}
```

---

## 4. Validation Rules

Implementations validating against this profile **MUST** enforce:

| Rule   | Description |
|--------|-------------|
| PFL-01 | `relationships` or `domain` **MUST** be present (at least one) |
| PFL-02 | `relationships.depends_on` elements **MUST** be strings if present |
| PFL-03 | `relationships.composed_of` elements **MUST** be strings if present |
| PFL-04 | `relationships.orchestrated_by` **MUST** be a string if present |
| PFL-05 | `relationships.peers` elements **MUST** be strings if present |

### 4.1 Schema Validation

The portfolio profile provides a JSON Schema ([`schema.json`](schema.json)) that extends the base ADL schema via `allOf` composition per Section 13.1 of the core specification. The profile schema:

1. References the base ADL schema via `allOf` with `$ref`.
2. Declares all portfolio-specific members in its own `properties`.
3. Uses `anyOf` to enforce that at least one of `relationships` or `domain` is present.
4. Adds `unevaluatedProperties: false` to reject members not defined by either the base schema or this profile.

Validators **SHOULD** use this schema for structural validation of documents declaring the portfolio profile.

### 4.2 Profile Dependencies

This profile has no dependencies. It **MAY** be declared alongside other profiles (e.g., registry, governance) as a sibling. See Section 13.3 of the core specification for dependency rules.

---

## 5. Use Cases

### 5.1 Dependency Management

The `relationships` member enables:
- Deployment order determination via `depends_on`
- Orchestrator-to-sub-agent mapping via `composed_of`
- Impact analysis when agents change
- Visualization of agent relationships

### 5.2 Domain Alignment

The `domain` member enables:
- Grouping agents by business capability
- Mapping agents to bounded contexts
- Understanding agent responsibilities within domains
