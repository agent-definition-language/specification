# Portfolio Profile Specification

**Identifier:** `urn:adl:profile:portfolio:1.0`
**Status:** Draft
**ADL Compatibility:** 0.1.x

## 1. Introduction

The Portfolio Profile extends ADL with inventory, relationships, and domain membership capabilities. It enables organizations to manage agent portfolios at scale, track agent dependencies, and align agents with business domains.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

---

## 2. Additional Members

### 2.1 inventory

**REQUIRED** when using this profile.

An object containing agent catalog and inventory information.

| Member         | Type   | Required | Description |
|----------------|--------|----------|-------------|
| catalog_id     | string | REQUIRED | Unique catalog identifier |
| classification | object | OPTIONAL | Category/type classification |
| tags           | array  | OPTIONAL | Discovery and grouping tags |
| visibility     | string | OPTIONAL | Visibility level |

#### catalog_id

A unique identifier for this agent within the organization's catalog. **MUST** be a non-empty string. **SHOULD** be unique across the agent portfolio.

#### classification

When present, **MAY** contain:

| Member   | Type   | Description |
|----------|--------|-------------|
| category | string | Primary category (e.g., "support", "analytics", "automation") |
| type     | string | Agent type (e.g., "conversational", "batch", "orchestrator") |

#### tags

When present, **MUST** be an array of strings. Tags **SHOULD** be lowercase, alphanumeric, and may contain hyphens. Tags enable discovery, grouping, and filtering of agents.

#### visibility

When present, **MUST** be one of:

- `private` — Visible only to the owning team
- `internal` — Visible within the organization
- `public` — Visible externally

---

### 2.2 relationships

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

### 2.3 domain

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
  "profiles": ["urn:adl:profile:portfolio:1.0"],
  "inventory": {
    "catalog_id": "cs-agent-001",
    "classification": {
      "category": "support",
      "type": "conversational"
    },
    "tags": ["customer-service", "support", "tier-1", "production"],
    "visibility": "internal"
  },
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
| PFL-01 | `inventory` MUST be present |
| PFL-02 | `inventory.catalog_id` MUST be present and non-empty |
| PFL-03 | `inventory.visibility` MUST be a valid visibility value if present |
| PFL-04 | `inventory.tags` elements MUST be strings if present |
| PFL-05 | `relationships.depends_on` elements MUST be strings if present |
| PFL-06 | `relationships.composed_of` elements MUST be strings if present |
| PFL-07 | `relationships.orchestrated_by` MUST be a string if present |
| PFL-08 | `relationships.peers` elements MUST be strings if present |

---

## 5. Use Cases

### 5.1 Agent Discovery

The `inventory` member enables catalog systems to:
- Index agents by `catalog_id` for unique lookup
- Filter agents by `classification` category and type
- Search agents by `tags`
- Control access based on `visibility`

### 5.2 Dependency Management

The `relationships` member enables:
- Deployment order determination via `depends_on`
- Orchestrator-to-sub-agent mapping via `composed_of`
- Impact analysis when agents change
- Visualization of agent relationships

### 5.3 Domain Alignment

The `domain` member enables:
- Grouping agents by business capability
- Mapping agents to bounded contexts
- Understanding agent responsibilities within domains
