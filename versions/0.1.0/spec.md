# Agent Definition Language (ADL) Specification

**Version:** 0.1.0-draft  
**Status:** Draft (internal draft of ADL)

## 1. Introduction

### 1.1 Purpose

The Agent Definition Language (ADL) provides a standard format for describing AI agents. ADL documents are JSON objects that describe an agent's identity, capabilities, tools, permissions, and runtime requirements. This specification describes the structure of ADL documents, the semantics of their members, and conformance requirements for implementations.

ADL serves a similar role for AI agents that OpenAPI serves for REST APIs, AsyncAPI for event-driven architectures, and WSDL for web services. It enables:

- **Discovery:** Agents can be found and understood programmatically.
- **Interoperability:** Agents can interact with tools, resources, and other agents using a common description format.
- **Deployment:** Runtime environments can provision and configure agents based on declared requirements.
- **Security:** Permission boundaries and security requirements are explicitly declared and enforceable.
- **Lifecycle:** Agents can be versioned, tracked through operational states, and managed across their entire lifecycle from draft to retirement.

### 1.2 Goals

- **Portable:** ADL documents describe agents independent of any specific runtime, platform, or provider.
- **Interoperable:** ADL documents can be transformed into other formats (A2A Agent Cards, MCP configurations) and consumed by diverse tooling.
- **Extensible:** ADL supports profiles that add domain-specific requirements without changing the core specification.
- **Secure:** Permission boundaries, authentication, and security constraints are first-class concepts.
- **Machine-readable:** ADL documents are validated against JSON Schema and can be processed programmatically.
- **Human-friendly:** Clear naming conventions and structures that are easy to read and author.

### 1.3 Relationship to Other Specifications

ADL builds upon and interoperates with:

- **<a href="https://www.rfc-editor.org/rfc/rfc8259" target="_blank">JSON [RFC8259]</a>** — ADL documents are valid JSON.
- **<a href="https://json-schema.org/draft/2020-12/json-schema-core" target="_blank">JSON Schema</a>** — ADL documents are validated against JSON Schema; tool parameters use JSON Schema for types.
- **<a href="https://a2a-protocol.org/latest/specification/" target="_blank">A2A Protocol</a>** — ADL documents can generate A2A Agent Cards.
- **<a href="https://modelcontextprotocol.io/specification" target="_blank">Model Context Protocol (MCP)</a>** — ADL documents can generate MCP server configurations; tools, resources, and prompts align with MCP primitives.
- **<a href="https://spec.openapis.org/oas/latest.html" target="_blank">OpenAPI</a>** — ADL can reference OpenAPI specifications for HTTP-based tools.
- **<a href="https://www.w3.org/TR/did-core/" target="_blank">W3C DIDs</a> / <a href="https://www.w3.org/TR/vc-data-model-2.0/" target="_blank">Verifiable Credentials</a>** — ADL supports DIDs for cryptographic identity and VCs for attestations.

---

## 2. Requirements Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as in BCP 14 [RFC2119] [RFC8174].

---

## 3. Terminology

| Term | Definition |
|------|------------|
| **ADL document** | A JSON object that conforms to this specification. |
| **agent** | An AI system capable of autonomous operation within defined boundaries, described by an ADL document. |
| **tool** | A function or capability that an agent can invoke (equivalent to "function" in function-calling). |
| **resource** | A data source that an agent can read from (e.g., vector store, knowledge base, file system). |
| **prompt** | A predefined prompt template that an agent can use. |
| **profile** | A set of additional requirements and members that extend the core ADL specification for specific domains. |
| **permission domain** | A category of system access (network, filesystem, etc.) that defines operational boundaries. |
| **runtime** | The system or environment that executes an agent based on its ADL definition. |
| **model** | The LLM or other AI model that powers the agent's reasoning. |

---

## 4. Document Structure

### 4.1 Media Type

- ADL documents use the media type **`application/adl+json`**.
- ADL documents **MUST** be encoded in UTF-8.
- ADL documents **MUST** be valid JSON [RFC8259].
- Member names **MUST** use **snake_case** (lowercase with underscores).
- All timestamps **MUST** be ISO 8601 strings with timezone (e.g., `"2026-02-15T14:30:00Z"`).
- All URIs **MUST** conform to [RFC3986].

### 4.2 Top-Level Object

An ADL document **MUST** be a single JSON object.

**Required members:**

- `adl_spec` (Section 5.1)
- `name` (Section 5.3)
- `description` (Section 5.4)
- `version` (Section 5.5)
- `data_classification` (Section 10.4)

**Optional members:**

- `$schema`, `id`, `provider`, `cryptographic_identity`, `lifecycle`, `model`, `system_prompt`, `tools`, `resources`, `prompts`, `permissions`, `security`, `runtime`, `metadata`, `profiles`

An ADL document **MUST NOT** contain members not defined by this specification, a declared profile, or the extension mechanism.

### 4.3 Extension Mechanism

- **Profiles:** Add domain-specific requirements and members; declared in `profiles`. See Section 13.
- **Extension members:** Custom data without a full profile. Names **MUST** be prefixed with `x_` followed by a namespace identifier (e.g., `x_acme_internal_id`).

Implementations **MUST** preserve extension members when processing but **MAY** ignore their contents. Implementations **MUST NOT** reject documents containing unknown `x_`-prefixed members.

Extension members (prefixed with `x_`) **MAY** appear in any object within an ADL document, including nested objects such as `lifecycle`, `provider`, `model`, `permissions`, and `security`. Extension member names **MUST** match the pattern `x_` followed by a namespace identifier using only lowercase letters, digits, and underscores (e.g., `x_acme_internal_id`).

### 4.4 Pattern Matching

Several ADL members use patterns to specify allowed or denied values. ADL defines a minimal pattern syntax based on a subset of glob matching rules. The following constructs are supported:

1. **Literal match.** A string with no wildcard characters matches only itself. Matching is case-sensitive unless the underlying system is case-insensitive (e.g., Windows filesystem paths).

2. **Single-segment wildcard (`*`).** The `*` character matches zero or more characters within a single segment. The segment boundary depends on context:
   - **Host patterns** (Section 9.2): segments are separated by `.` (dot). `*` does not match dots. `*.example.com` matches `api.example.com` but does not match `deep.sub.example.com`.
   - **Environment variable patterns** (Section 9.4): `*` matches any characters in the variable name. `APP_*` matches `APP_PORT` and `APP_HOST`.
   - **Command patterns** (Section 9.5): `*` matches any characters in the command name.

3. **Multi-segment wildcard (`**`).** The `**` sequence matches zero or more path segments including separators. Valid only in filesystem path patterns (Section 9.3). `/data/**` matches `/data/`, `/data/foo`, and `/data/foo/bar/baz`. `**` **MUST NOT** appear in host patterns, environment variable patterns, or command patterns.

4. **Restrictions.** Patterns **MUST** contain wildcards only in the positions described above. Mid-string wildcards (e.g., `foo*bar`) are **NOT RECOMMENDED**; implementations **MAY** reject them. A bare `*` as an entire pattern (matching everything) is valid but **NOT RECOMMENDED** for security-sensitive domains (`allowed_hosts`, `allowed_variables`). Implementations **SHOULD** warn when a bare `*` wildcard is used in permission patterns.

Implementations **MUST** apply patterns using the rules defined in this section. Implementations **MUST NOT** interpret patterns as regular expressions.

---

## 5. Core Members

### 5.1 ADL Specification

Specifies the ADL specification version the document conforms to.

- **REQUIRED.** Value **MUST** be a string in semantic versioning format (MAJOR.MINOR.PATCH).
- Implementations **MUST** reject documents with an unsupported `adl_spec` version.
- Implementations **SHOULD** support documents with the same MAJOR version and lower or equal MINOR version.

Example: `"adl_spec": "0.1.0"`

### 5.2 $schema

Optional. URI reference to the JSON Schema for validation. **RECOMMENDED** for JSON documents (enables IDE validation). Canonical schema URI for ADL 0.1: `https://adl-spec.org/0.1/schema.json`.

### 5.3 Name

Human-readable name for the agent. **REQUIRED.** Value **MUST** be a non-empty string. For machine identifiers, use `id` (Section 6.1).

### 5.4 Description

Human-readable description of the agent's purpose and capabilities. **REQUIRED.** Value **MUST** be a non-empty string. **SHOULD** be sufficient for users to understand what the agent does without examining tool definitions.

### 5.5 Version

Agent's version. **REQUIRED.** Value **MUST** be a string in semantic versioning format (MAJOR.MINOR.PATCH). Agent version changes **SHOULD** follow SemVer (MAJOR: breaking; MINOR: new capabilities; PATCH: fixes, docs).

### 5.6 Lifecycle

Operational lifecycle status of the agent. **OPTIONAL.** When present, value **MUST** be an object containing at minimum a `status` member.

| Member          | Type   | Required | Description                                      |
|-----------------|--------|----------|--------------------------------------------------|
| status          | string | REQUIRED | Lifecycle state of the agent                     |
| effective_date  | string | OPTIONAL | ISO 8601 timestamp when current status took effect |
| sunset_date     | string | OPTIONAL | ISO 8601 timestamp for planned or actual retirement |
| successor       | string | OPTIONAL | URI or URN of the replacement agent              |

#### status

**REQUIRED** when `lifecycle` is present. Value **MUST** be one of:

| Status       | Meaning                                                   |
|--------------|-----------------------------------------------------------|
| `draft`      | Under development; not ready for production use           |
| `active`     | Operational and available for use                         |
| `deprecated` | Superseded; discouraged for new use; may be removed       |
| `retired`    | End-of-life; no longer operational                        |

When `lifecycle` is omitted, no lifecycle assertion is made. Implementations **MUST NOT** assume a default status.

Runtimes **SHOULD** check `lifecycle.status` before provisioning agents. Runtimes **SHOULD NOT** provision agents with status `draft` in production environments. Runtimes **SHOULD** warn users when provisioning agents with status `deprecated`. Runtimes **MUST NOT** provision or execute agents with status `retired`.

> **Note:** "Provision" and "execute" refer to instantiating an agent for operation. Reading, parsing, validating, analyzing, or migrating from an agent definition is unrestricted regardless of lifecycle status.

#### effective_date

When present, value **MUST** be a valid ISO 8601 string with timezone. Indicates when the current `status` took effect.

#### sunset_date

When present, value **MUST** be a valid ISO 8601 string with timezone. Indicates when the agent will be or was retired. Implementations **SHOULD** warn when `sunset_date` is in the future and within 30 days. When `sunset_date` is in the past and `status` is `deprecated`, runtimes **SHOULD** treat the agent as `retired`.

#### successor

When present, value **MUST** be a string; **SHOULD** be a URI or URN identifying the replacement agent (see Section 6.1 for identifier formats). **SHOULD** be present when `status` is `deprecated` or `retired`. Implementations **SHOULD** warn if `successor` is present when `status` is `active` or `draft`.

Example:

```json
{
  "lifecycle": {
    "status": "deprecated",
    "effective_date": "2026-01-15T00:00:00Z",
    "sunset_date": "2026-08-01T00:00:00Z",
    "successor": "urn:adl:acme:research-assistant:3.0.0"
  }
}
```

---

## 6. Agent Identity

### 6.1 Id

Unique identifier for the agent. **OPTIONAL.** When present, value **MUST** be a string; **SHOULD** be a URI or URN. Recommended formats: `urn:adl:{namespace}:{name}:{version}`, `did:web:example.com:agents:{name}`, or `https://example.com/agents/{name}`.

### 6.2 Provider

Identifies the organization or entity that provides the agent. **OPTIONAL.** When present, value **MUST** be an object:

| Member   | Type   | Required | Description     |
|----------|--------|----------|-----------------|
| name    | string | REQUIRED | Provider name   |
| url     | string | OPTIONAL | Provider website |
| contact | string | OPTIONAL | Contact email   |

### 6.3 Cryptographic Identity

Cryptographic identification for the agent. **OPTIONAL.** When present, value **MUST** be an object:

| Member     | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| did        | string | OPTIONAL | Decentralized Identifier [W3C.DID]  |
| public_key | object | OPTIONAL | Public key for signature verification |

At least one of `did` or `public_key` **SHOULD** be present. The `public_key` object, when present, **MUST** contain `algorithm` (string, REQUIRED) and `value` (string, Base64-encoded, REQUIRED). Implementations **SHOULD** reject weak algorithms (e.g., RSA &lt; 2048 bits, DSA, ECDSA &lt; P-256). EdDSA (Ed25519, Ed448) is **RECOMMENDED**.

---

## 7. Model Configuration

### 7.1 Model

AI model configuration. **OPTIONAL.** When omitted, the runtime determines the model. When present, value **MUST** be an object:

| Member         | Type   | Required | Description                    |
|----------------|--------|----------|--------------------------------|
| provider       | string | OPTIONAL | Model provider (e.g., anthropic, openai) |
| name           | string | OPTIONAL | Model identifier               |
| version        | string | OPTIONAL | Model version                  |
| context_window | number | OPTIONAL | Max context window (tokens)    |
| temperature    | number | OPTIONAL | Sampling temperature (0.0–2.0) |
| max_tokens     | number | OPTIONAL | Max output tokens              |
| capabilities   | array  | OPTIONAL | Required model capabilities    |

`capabilities` values may include: `function_calling`, `vision`, `code_execution`, `streaming`.

### 7.2 System Prompt

System prompt for the agent. **OPTIONAL.** Value **MUST** be a string or an object. When an object, it **MUST** contain `template` (string, REQUIRED) and **MAY** contain `variables` (object). Variables in templates use `{{variable_name}}`.

---

## 8. Capabilities

### 8.1 Tools

Array of tool objects (functions the agent can invoke). **OPTIONAL.** Each tool **MUST** contain `name` (string, REQUIRED) and `description` (string, REQUIRED). Each tool **MAY** contain: `parameters` (JSON Schema), `returns` (JSON Schema), `examples`, `requires_confirmation` (bool), `idempotent` (bool), `read_only` (bool), `annotations`, `data_classification` (Section 10.4). Tool names **MUST** be unique and match `^[a-z][a-z0-9_]*$`. The `parameters` and `returns` objects, when present, **MUST** be valid JSON Schema.

The `examples` member, when present, **MUST** be an array of example objects. Each example object **MAY** contain:

| Member | Type   | Required | Description                        |
|--------|--------|----------|------------------------------------|
| name   | string | OPTIONAL | Human-readable name for the example |
| input  | object | OPTIONAL | Example input parameters            |
| output | any    | OPTIONAL | Expected output value               |

The `annotations` member, when present, **MUST** be an object containing implementation hints and metadata. Annotations is an open object — implementations **MAY** add custom keys. Standard annotation members include:

| Member       | Type   | Required | Description                                |
|--------------|--------|----------|--------------------------------------------|
| openapi_ref  | string | OPTIONAL | URI to an OpenAPI specification             |
| operation_id | string | OPTIONAL | OpenAPI operation identifier                |

See Section 15.3 for OpenAPI integration details. Implementations **MUST** preserve all annotation members when processing, including unrecognized keys.

### 8.2 Resources

Array of resource objects (data sources the agent can access). **OPTIONAL.** Each resource **MUST** contain `name` (string, REQUIRED) and `type` (string, REQUIRED). `type` **MUST** be one of: `vector_store`, `knowledge_base`, `file`, `api`, `database`. Each resource **MAY** contain: `description`, `uri`, `mime_types`, `schema`, `annotations`, `data_classification` (Section 10.4). Resource names **MUST** be unique.

The `mime_types` member, when present, **MUST** be an array of strings. Each value **MUST** be a valid MIME type (e.g., `"application/json"`, `"text/plain"`).

The `schema` member, when present, **MUST** be a valid JSON Schema describing the structure of the resource's data.

The `annotations` member, when present, **MUST** be an object. Same semantics as `tool.annotations` — an open object for implementation hints that **MUST** be preserved when processing.

### 8.3 Prompts

Array of prompt objects (reusable prompt templates). **OPTIONAL.** Each prompt **MUST** contain `name` (string, REQUIRED) and `template` (string, REQUIRED). Each prompt **MAY** contain `description`, `arguments` (JSON Schema). Template arguments use `{{argument_name}}`. Prompt names **MUST** be unique.

---

## 9. Permissions

The `permissions` member defines the agent's operational boundaries. **OPTIONAL.** When present, value **MUST** be an object containing one or more permission domain members.

### 9.1 Permissions Model

| Domain          | Description                    |
|-----------------|--------------------------------|
| network         | Network access boundaries      |
| filesystem      | Filesystem access boundaries   |
| environment     | Environment variable access    |
| execution       | Process execution boundaries   |
| resource_limits | Resource consumption limits   |

Permissions operate on a **deny-by-default** model. Runtimes **MUST** deny any capability not explicitly granted in the `permissions` member. Runtimes **MUST** enforce declared permissions. Runtimes that cannot enforce a specific permission domain **MUST** warn users before execution and **SHOULD** refuse to execute the agent unless the user explicitly acknowledges the limitation.

When the `permissions` member is omitted from an ADL document, no permissions are granted to the agent. Runtimes **MUST** treat the absence of `permissions` as equivalent to an empty `permissions` object — the agent has no granted capabilities.

When a specific permission domain (e.g., `network`, `filesystem`) is omitted from the `permissions` object, all operations in that domain are denied. For example, if `permissions` is present but does not contain `network`, the agent **MUST** have no network access.

Runtimes **MUST NOT** infer, assume, or provide default permissions when `permissions` or a permission domain is absent.

### 9.2 Network

May contain: `allowed_hosts` (array of host patterns), `allowed_ports`, `allowed_protocols`, `deny_private` (bool). Host patterns support exact match and `*.example.com`.

Host patterns in `allowed_hosts` **MUST** conform to the pattern syntax defined in Section 4.4.

### 9.3 Filesystem

May contain: `allowed_paths` (array of `{ path, access }` where access is `read`, `write`, or `read_write`), `denied_paths`.

Path patterns in `allowed_paths[*].path` and `denied_paths` **MUST** conform to the pattern syntax defined in Section 4.4. The `**` multi-segment wildcard is valid in filesystem path patterns.

### 9.4 Environment

May contain: `allowed_variables`, `denied_variables` (patterns with wildcards, e.g., `APP_*`).

Variable patterns in `allowed_variables` and `denied_variables` **MUST** conform to the pattern syntax defined in Section 4.4.

### 9.5 Execution

May contain: `allowed_commands`, `denied_commands`, `allow_shell` (bool).

Command patterns in `allowed_commands` and `denied_commands` **MUST** conform to the pattern syntax defined in Section 4.4.

### 9.6 Resource Limits

May contain: `max_memory_mb`, `max_cpu_percent`, `max_duration_sec`, `max_concurrent`.

---

## 10. Security

The `security` member defines security requirements. **OPTIONAL.** When present, value **MUST** be an object that **MAY** contain `authentication`, `encryption`, and `attestation`.

### 10.1 Authentication

May contain: `type` (one of `none`, `api_key`, `oauth2`, `oidc`, `mtls`), `required` (bool). Type-specific members (e.g., OAuth2: `scopes`, `token_endpoint`; OIDC: `issuer`, `audience`) **MAY** be present.

### 10.2 Encryption

May contain: `in_transit` (`required`, `min_version`), `at_rest` (`required`, `algorithm`).

### 10.3 Attestation

May contain: `type` (one of `self`, `third_party`, `verifiable_credential`), `issuer`, `issued_at`, `expires_at` (ISO 8601), `signature` (object). Implementations **SHOULD** warn when `expires_at` is in the past or within 30 days.

**Signature object:** When present, **MUST** contain `algorithm`, `value` (Base64url-encoded), `signed_content` (`"canonical"` or `"digest"`). When `signed_content` is `"digest"`, **MUST** also include `digest_algorithm` and `digest_value`. Supported algorithms include Ed25519 (RECOMMENDED), Ed448, ES256/384/512, RS256, PS256 (RSA ≥ 2048). Verification: remove signature, serialize with JCS [RFC8785], verify digest if applicable, resolve public key from `cryptographic_identity`, verify signature.

### 10.4 Data Classification

The `data_classification` member declares the sensitivity and categories of data the agent may access, process, or produce. **REQUIRED.** Value **MUST** be an object.

Data classification is required by NIST FIPS 199, NIST SP 800-60, ISO 27001:2022 Annex A.5.12, FedRAMP, SOC 2, and CMMC. It is the foundational step of security categorization across all major compliance frameworks.

This member is a **reusable composable attribute**. In addition to the required top-level declaration, it **MAY** also appear within individual `tools[*]` or `resources[*]` objects to classify specific capabilities. When present on both the top level and a tool or resource, the tool/resource-level classification applies to that capability.

#### High-Water Mark Rule

The top-level `data_classification.sensitivity` **MUST** be greater than or equal to the highest `sensitivity` value declared in any tool-level or resource-level `data_classification` within the same document. This follows the FIPS 199 high-water mark principle: a system's overall security categorization is the highest value among its constituent information types.

The sensitivity ordering from lowest to highest is: `public` < `internal` < `confidential` < `restricted`.

Sensitivity levels align with NIST FIPS 199 impact categorization and ISO 27001:2022 Annex A.5.12 information classification.

| Member      | Type   | Required | Description |
|-------------|--------|----------|-------------|
| sensitivity | string | REQUIRED | Information sensitivity level |
| categories  | array  | OPTIONAL | Broad information categories handled |
| retention   | object | OPTIONAL | Data retention requirements |
| handling    | object | OPTIONAL | Data handling constraints |

#### sensitivity

**REQUIRED** when `data_classification` is present. Value **MUST** be one of:

| Value          | Definition |
|----------------|------------|
| `public`       | Information approved for unrestricted disclosure |
| `internal`     | Information limited to organizational use |
| `confidential` | Information requiring protection; unauthorized disclosure could cause harm |
| `restricted`   | Information requiring the highest level of protection; unauthorized disclosure could cause severe harm |

#### categories

When present, **MUST** be a non-empty array. Each item **MUST** be one of:

| Value                   | Definition |
|-------------------------|------------|
| `pii`                   | Personally Identifiable Information |
| `phi`                   | Protected Health Information (HIPAA) |
| `financial`             | Financial data (PCI-DSS, GLBA, SOX scope) |
| `credentials`           | Authentication credentials, secrets, keys |
| `intellectual_property` | Trade secrets, proprietary algorithms, business-sensitive data |
| `regulatory`            | Data subject to specific regulatory requirements |

Profiles **MAY** define additional category values.

#### retention

When present, **MUST** be an object. **MAY** contain:

| Member     | Type   | Description |
|------------|--------|-------------|
| min_days   | number | Minimum retention period in days |
| max_days   | number | Maximum retention period in days |
| policy_uri | string | URI to the governing retention policy |

When both `min_days` and `max_days` are present, `min_days` **MUST** be less than or equal to `max_days`.

#### handling

When present, **MUST** be an object. **MAY** contain:

| Member                  | Type | Description |
|-------------------------|------|-------------|
| encryption_required     | bool | Whether data must be encrypted at rest |
| anonymization_required  | bool | Whether data must be anonymized before processing |
| cross_border_restricted | bool | Whether data may not leave jurisdictional boundaries |
| logging_required        | bool | Whether all access must be logged |

#### Profile Extensions

Profiles **MAY** add domain-specific sub-objects within `data_classification` to provide granular classification vocabularies. For example, a healthcare profile may add a `healthcare` sub-object with PHI type enumerations, and a financial profile may add a `financial` sub-object with financial data type enumerations. Multiple profile extensions compose naturally within the same `data_classification` object. See Section 13 for profile composition rules.

---

## 11. Runtime Behavior

The `runtime` member configures agent runtime behavior. **OPTIONAL.** When present, value **MUST** be an object.

### 11.1 Input Handling

May contain: `max_input_length`, `content_types`, `sanitization`.

The `sanitization` member, when present, **MUST** be an object describing input sanitization rules. It **MAY** contain:

| Member           | Type    | Required | Description                              |
|------------------|---------|----------|------------------------------------------|
| enabled          | boolean | OPTIONAL | Whether input sanitization is active      |
| strip_html       | boolean | OPTIONAL | Whether to strip HTML tags from input     |
| max_input_length | number  | OPTIONAL | Maximum input length in characters        |

The `content_types` member, when present, **MUST** be an array of strings. Each value **MUST** be a valid MIME type specifying an accepted input content type.

### 11.2 Output Handling

May contain: `max_output_length`, `format`, `streaming` (bool).

The `format` member, when present, **MUST** be a string specifying the default output format. Value **MUST** be one of: `"text"`, `"json"`, `"markdown"`, `"html"`.

### 11.3 Tool Invocation

May contain: `parallel` (bool), `max_concurrent`, `timeout_ms`, `retry_policy`.

The `retry_policy` member, when present, **MUST** be an object describing retry behavior for tool invocations. It **MAY** contain:

| Member           | Type   | Required | Description                                    |
|------------------|--------|----------|------------------------------------------------|
| max_retries      | number | OPTIONAL | Maximum number of retry attempts                |
| backoff_strategy | string | OPTIONAL | One of: `"fixed"`, `"exponential"`, `"linear"` |
| initial_delay_ms | number | OPTIONAL | Initial delay between retries in milliseconds   |
| max_delay_ms     | number | OPTIONAL | Maximum delay between retries in milliseconds   |

### 11.4 Error Handling

May contain: `on_tool_error` (`abort`, `continue`, or `retry`), `max_retries`, `fallback_behavior`.

The `fallback_behavior` member, when present, **MUST** be an object describing behavior when errors occur and `on_tool_error` does not resolve the situation. It **MAY** contain:

| Member  | Type   | Required | Description                                           |
|---------|--------|----------|-------------------------------------------------------|
| action  | string | OPTIONAL | One of: `"return_error"`, `"use_default"`, `"skip"`   |
| default | any    | OPTIONAL | Default value to return when `action` is `"use_default"` |
| message | string | OPTIONAL | User-facing message on fallback                        |

---

## 12. Metadata

The `metadata` member provides additional information. **OPTIONAL.** When present, value **MUST** be an object.

### 12.1 Authors

Array of author objects. Each **MAY** contain `name`, `email`, `url`.

### 12.2 License

String: SPDX license identifier or URI to license document.

### 12.3 Documentation

String: URI to documentation.

### 12.4 Repository

String: URI to source repository.

### 12.5 Tags

Array of strings. **SHOULD** be lowercase, alphanumeric and hyphens only.

---

## 13. Profiles

The `profiles` member declares which profiles the document conforms to. **OPTIONAL.** Value **MUST** be an array of profile identifiers (URIs or registered names). When a profile is declared: the document **MUST** satisfy all profile requirements, **MAY** use profile-defined members, and validators **SHOULD** check profile-specific rules. Profiles **MUST NOT** redefine core ADL members; they **MAY** add top-level members, add members to existing objects, define validation rules, or require specific values for optional members.

**Standard profiles (examples):** Governance (`urn:adl:profile:governance:1.0`), Healthcare, Financial. Additional profiles may be registered (e.g., IANA profile registry).

---

## 14. Processing ADL Documents

### 14.1 Parsing

Implementations **MUST** parse ADL as JSON [RFC8259], **MUST** reject invalid JSON, and **MUST** reject documents where the top-level value is not a JSON object.

### 14.2 Validation

Implementations **MUST** validate ADL documents against the JSON Schema defined in Appendix A. Implementations **MUST** validate the following semantic rules:

| Rule   | Description |
|--------|-------------|
| VAL-01 | `adl_spec` MUST match a supported version |
| VAL-02 | Tool names MUST be unique |
| VAL-03 | Resource names MUST be unique |
| VAL-04 | Prompt names MUST be unique |
| VAL-05 | Timestamps MUST be valid ISO 8601 |
| VAL-06 | URIs MUST be valid per RFC 3986 |
| VAL-07 | JSON Schema in parameters/returns MUST be valid |
| VAL-08 | Profile requirements MUST be satisfied |
| VAL-09 | `lifecycle.status` MUST be a valid status value if present |
| VAL-10 | `lifecycle.effective_date` MUST be valid ISO 8601 if present |
| VAL-11 | `lifecycle.sunset_date` MUST be valid ISO 8601 if present |
| VAL-12 | `lifecycle.successor` MUST be a valid URI if present |
| VAL-13 | Tool names MUST match `^[a-z][a-z0-9_]*$` |
| VAL-14 | Resource `type` MUST be a valid resource type value |
| VAL-15 | `model.temperature` MUST be between 0.0 and 2.0 if present |
| VAL-16 | `security.authentication.type` MUST be a valid authentication type if present |
| VAL-17 | `security.attestation.type` MUST be a valid attestation type if present |
| VAL-18 | `runtime.error_handling.on_tool_error` MUST be a valid error action if present |
| VAL-19 | `runtime.output_handling.format` MUST be a valid format value if present |
| VAL-20 | `model.capabilities` items MUST be valid capability values if present |
| VAL-21 | Host patterns MUST conform to Section 4.4 pattern syntax |
| VAL-22 | Filesystem path patterns MUST conform to Section 4.4 pattern syntax |
| VAL-23 | Environment variable patterns MUST conform to Section 4.4 pattern syntax |
| VAL-24 | Attestation `signature.signed_content` value `"digest"` MUST have `digest_algorithm` and `digest_value` present |
| VAL-25 | `data_classification.sensitivity` MUST be a valid sensitivity level if present |
| VAL-26 | `data_classification.categories` items MUST be valid category values if present |
| VAL-27 | `data_classification.retention.min_days` MUST be less than or equal to `max_days` when both are present |
| VAL-28 | Top-level `data_classification.sensitivity` MUST be >= the highest `sensitivity` in any tool or resource `data_classification` (high-water mark) |

Implementations **MAY** perform additional validation based on declared profiles.

### 14.3 Unknown Members

Implementations **MUST** preserve unrecognized members when round-tripping. Implementations **MUST NOT** reject documents containing unknown `x_`-prefixed members. Implementations **MAY** warn on unknown non-extension, non-profile members.

---

## 15. Interoperability

### 15.1 A2A Agent Card Generation

Implementations **SHOULD** support generating A2A Agent Cards from ADL (e.g., name, description, version, tools→skills, cryptographic_identity.did→id, security.authentication→authentication).

### 15.2 MCP Server Configuration

Implementations **SHOULD** support generating MCP server configurations (name, description, version, tools, resources, prompts).

### 15.3 OpenAPI Integration

Tools that invoke HTTP APIs **MAY** reference OpenAPI specs. The tool `annotations` object **MAY** contain `openapi_ref` (URI) and `operation_id`.

---

## 16. Errors

### 16.1 Error Format

Implementations **SHOULD** return errors in a consistent format, e.g.:

```json
{
  "errors": [
    {
      "code": "ADL-1001",
      "title": "Invalid JSON",
      "detail": "Unexpected token at line 42, column 15",
      "source": { "pointer": "/tools/0/name" }
    }
  ]
}
```

The `source` object **MAY** contain: `pointer` (JSON Pointer to the error location), `line` (1-indexed), `column` (1-indexed).

### 16.2 Error Codes

| Code     | Category | Description |
|----------|----------|-------------|
| ADL-1001 | Parse    | Invalid JSON syntax |
| ADL-1002 | Parse    | Document is not a JSON object |
| ADL-1003 | Schema   | Missing required member |
| ADL-1004 | Schema   | Invalid member type |
| ADL-1005 | Schema   | Invalid enum value |
| ADL-1006 | Schema   | Value does not match pattern |
| ADL-2001 | Semantic | Unsupported ADL version |
| ADL-2002 | Semantic | Duplicate tool name |
| ADL-2003 | Semantic | Duplicate resource name |
| ADL-2004 | Semantic | Duplicate prompt name |
| ADL-2005 | Semantic | Invalid timestamp format |
| ADL-2006 | Semantic | Invalid URI format |
| ADL-2007 | Semantic | Invalid JSON Schema |
| ADL-2008 | Semantic | Invalid tool name pattern |
| ADL-2009 | Semantic | Invalid resource type value |
| ADL-2010 | Semantic | Temperature out of range |
| ADL-2011 | Semantic | Invalid authentication type |
| ADL-2012 | Semantic | Invalid attestation type |
| ADL-2013 | Semantic | Invalid error handling action |
| ADL-2014 | Semantic | Invalid output format |
| ADL-2015 | Semantic | Invalid model capability |
| ADL-2016 | Semantic | Invalid host pattern syntax |
| ADL-2017 | Semantic | Invalid filesystem path pattern |
| ADL-2018 | Semantic | Invalid environment variable pattern |
| ADL-2019 | Semantic | Missing digest fields for digest-mode signature |
| ADL-2020 | Semantic | Invalid data classification sensitivity level |
| ADL-2021 | Semantic | Invalid data classification category |
| ADL-2022 | Semantic | Retention min_days exceeds max_days |
| ADL-2023 | Semantic | Top-level sensitivity below tool/resource sensitivity (high-water mark violation) |
| ADL-3001 | Profile  | Profile requirements not satisfied |
| ADL-3002 | Profile  | Unknown profile |
| ADL-4001 | Security | Weak key algorithm |
| ADL-4002 | Security | Invalid signature |
| ADL-4003 | Security | Expired attestation |
| ADL-5001 | Lifecycle | Invalid lifecycle status value |
| ADL-5002 | Lifecycle | Successor present on active/draft agent |
| ADL-5003 | Lifecycle | Sunset date in the past with non-retired status |

---

## 17. IANA Considerations

### 17.1 Media Type

- **Type name:** application  
- **Subtype name:** adl+json  
- **Required parameters:** None  
- **Optional parameters:** `profile` — comma-separated list of profile identifiers  
- **Encoding considerations:** binary (UTF-8 JSON)  
- **File extensions:** .adl.json, .adl  
- **Fragment identifier:** JSON Pointer [RFC6901]  
- **Intended usage:** COMMON  
- **Applications:** AI agent platforms, agent registries, development tools, runtime environments  
- **Security considerations:** See Section 18

### 17.2 Profile Registry

A registry for ADL profiles may be created (Specification Required). Each registration **MUST** include profile identifier (URI), name, specification reference, and contact information.

---

## 18. Security Considerations

- **Document integrity:** Signed documents use `security.attestation.signature`. Implementations **SHOULD** verify signatures before trusting contents; **SHOULD** warn or reject invalid signatures.
- **Sensitive data:** ADL documents **SHOULD NOT** contain secrets (API keys, passwords, private keys). Sensitive configuration **SHOULD** use environment variables or secret manager URIs. Implementations **SHOULD** warn on sensitive patterns in string values.
- **Permission enforcement:** Runtimes **SHOULD** enforce declared permissions (e.g., via OS security features). Runtimes **MUST NOT** allow agents to exceed declared permissions. If a runtime cannot enforce a permission, it **SHOULD** warn users.
- **Tool security:** Validate inputs/outputs against schemas; enforce rate limits; log invocations. Tools with `requires_confirmation` **SHOULD** prompt users; `read_only` tools **SHOULD** be treated as lower risk.
- **Supply chain:** Validate ADL from untrusted sources; verify attestations from trusted issuers; consider allowlists of trusted providers.
- **Lifecycle enforcement:** Implementations **SHOULD** treat agents with `lifecycle.status` of `retired` as potentially unmaintained. Retired agents may have revoked credentials, unpatched vulnerabilities, or stale configurations. Runtimes **MUST NOT** provision or execute retired agents. Deploying deprecated agents may expose users to known issues; runtimes **SHOULD** surface deprecation warnings and `successor` information when available.

---

## 19. References

### 19.1 Normative References

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, <https://www.rfc-editor.org/info/rfc2119>.
- **[RFC3986]** Berners-Lee, T., Fielding, R., and L. Masinter, "Uniform Resource Identifier (URI): Generic Syntax", STD 66, RFC 3986, <https://www.rfc-editor.org/info/rfc3986>.
- **[RFC6901]** Bryan, P., Ed., "JavaScript Object Notation (JSON) Pointer", RFC 6901, <https://www.rfc-editor.org/info/rfc6901>.
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, <https://www.rfc-editor.org/info/rfc8174>.
- **[RFC8259]** Bray, T., Ed., "The JavaScript Object Notation (JSON) Data Interchange Format", STD 90, RFC 8259, <https://www.rfc-editor.org/info/rfc8259>.
- **[RFC8785]** Rundgren, A., Jordan, B., and S. Erdtman, "JSON Canonicalization Scheme (JCS)", RFC 8785, <https://www.rfc-editor.org/info/rfc8785>.

### 19.2 Informative References

- **[A2A]** A2A Protocol Working Group, "Agent-to-Agent Protocol Specification", <https://a2a-protocol.org/specification>.
- **[JSON-SCHEMA]** Wright, A., et al., "JSON Schema: A Media Type for Describing JSON Documents", <https://json-schema.org/draft/2020-12/json-schema-core>.
- **[MCP]** Anthropic, "Model Context Protocol Specification", <https://modelcontextprotocol.io/specification>.
- **[OPENAPI]** OpenAPI Initiative, "OpenAPI Specification", Version 3.1, <https://spec.openapis.org/oas/v3.1.0>.
- **[W3C.DID]** Sporny, M., et al., "Decentralized Identifiers (DIDs) v1.0", W3C Recommendation, <https://www.w3.org/TR/did-core/>.
- **[W3C.VC]** Sporny, M., et al., "Verifiable Credentials Data Model v1.1", W3C Recommendation, <https://www.w3.org/TR/vc-data-model/>.

---

## Appendix A. JSON Schema

The normative JSON Schema for ADL is available at `https://adl-spec.org/0.1/schema.json` (JSON Schema Draft 2020-12). A minimal required-fields schema is provided in [schema.json](./schema.json) in this directory.

---

## Appendix B. Examples

See the [examples/](../../examples/) directory:

- **Minimal:** [minimal-0.1.0.json](../../examples/minimal-0.1.0.json)
- **Agent with tools:** [with-tools-0.1.0.json](../../examples/with-tools-0.1.0.json)
- **Production agent:** [production-0.1.0.json](../../examples/production-0.1.0.json)

---

## Appendix C. Profiles

ADL profiles are maintained in the [profiles/](../../profiles/) directory. Each profile is versioned independently and declares compatibility with ADL versions.

### Available Profiles

| Profile | Identifier | Status |
|---------|------------|--------|
| [Governance](../../profiles/governance/) | `urn:adl:profile:governance:1.0` | Draft |
| [Portfolio](../../profiles/portfolio/) | `urn:adl:profile:portfolio:1.0` | Draft |
| [Healthcare](../../profiles/healthcare/) | `urn:adl:profile:healthcare:1.0` | Placeholder |
| [Financial](../../profiles/financial/) | `urn:adl:profile:financial:1.0` | Placeholder |

See [profiles/README.md](../../profiles/README.md) for the full profile index and contribution guidelines.
