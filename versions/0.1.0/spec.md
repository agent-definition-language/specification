# Agent Definition Language (ADL) Specification

**Version:** 0.1.0-draft  
**Status:** Draft (internal draft of ADL)  
**Format:** JSON (snake_case member names)

## 1. Introduction

### 1.1 Purpose

The Agent Definition Language (ADL) provides a standard format for describing AI agents. ADL documents are JSON objects that describe an agent's identity, capabilities, tools, permissions, and runtime requirements. This specification describes the structure of ADL documents, the semantics of their members, and conformance requirements for implementations.

ADL serves a similar role for AI agents that OpenAPI serves for REST APIs, AsyncAPI for event-driven architectures, and WSDL for web services. It enables:

- **Discovery:** Agents can be found and understood programmatically.
- **Interoperability:** Agents can interact with tools, resources, and other agents using a common description format.
- **Deployment:** Runtime environments can provision and configure agents based on declared requirements.
- **Security:** Permission boundaries and security requirements are explicitly declared and enforceable.

### 1.2 Goals

- **Portable:** ADL documents describe agents independent of any specific runtime, platform, or provider.
- **Interoperable:** ADL documents can be transformed into other formats (A2A Agent Cards, MCP configurations) and consumed by diverse tooling.
- **Extensible:** ADL supports profiles that add domain-specific requirements without changing the core specification.
- **Secure:** Permission boundaries, authentication, and security constraints are first-class concepts.
- **Machine-readable:** ADL documents are validated against JSON Schema and can be processed programmatically.
- **Human-friendly:** Clear naming conventions and structures that are easy to read and author.

### 1.3 Relationship to Other Specifications

ADL builds upon and interoperates with:

- **JSON [RFC8259]** — ADL documents are valid JSON.
- **JSON Schema** — ADL documents are validated against JSON Schema; tool parameters use JSON Schema for types.
- **A2A Protocol** — ADL documents can generate A2A Agent Cards.
- **Model Context Protocol (MCP)** — ADL documents can generate MCP server configurations; tools, resources, and prompts align with MCP primitives.
- **OpenAPI** — ADL can reference OpenAPI specifications for HTTP-based tools.
- **W3C DIDs / Verifiable Credentials** — ADL supports DIDs for cryptographic identity and VCs for attestations.

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

- `adl` (Section 5.1)
- `name` (Section 5.3)
- `description` (Section 5.4)
- `version` (Section 5.5)

**Optional members:**

- `$schema`, `id`, `provider`, `cryptographic_identity`, `model`, `system_prompt`, `tools`, `resources`, `prompts`, `permissions`, `security`, `runtime`, `metadata`, `profiles`

An ADL document **MUST NOT** contain members not defined by this specification, a declared profile, or the extension mechanism.

### 4.3 Extension Mechanism

- **Profiles:** Add domain-specific requirements and members; declared in `profiles`. See Section 13.
- **Extension members:** Custom data without a full profile. Names **MUST** be prefixed with `x_` followed by a namespace identifier (e.g., `x_acme_internal_id`).

Implementations **MUST** preserve extension members when processing but **MAY** ignore their contents. Implementations **MUST NOT** reject documents containing unknown `x_`-prefixed members.

---

## 5. Core Members

### 5.1 adl

Specifies the ADL specification version the document conforms to.

- **REQUIRED.** Value **MUST** be a string in semantic versioning format (MAJOR.MINOR.PATCH).
- Implementations **MUST** reject documents with an unsupported `adl` version.
- Implementations **SHOULD** support documents with the same MAJOR version and lower or equal MINOR version.

Example: `"adl": "0.1.0"`

### 5.2 $schema

Optional. URI reference to the JSON Schema for validation. **RECOMMENDED** for JSON documents (enables IDE validation). Canonical schema URI for ADL 0.1: `https://adl-spec.org/0.1/schema.json`.

### 5.3 name

Human-readable name for the agent. **REQUIRED.** Value **MUST** be a non-empty string. For machine identifiers, use `id` (Section 6.1).

### 5.4 description

Human-readable description of the agent's purpose and capabilities. **REQUIRED.** Value **MUST** be a non-empty string. **SHOULD** be sufficient for users to understand what the agent does without examining tool definitions.

### 5.5 version

Agent's version. **REQUIRED.** Value **MUST** be a string in semantic versioning format (MAJOR.MINOR.PATCH). Agent version changes **SHOULD** follow SemVer (MAJOR: breaking; MINOR: new capabilities; PATCH: fixes, docs).

---

## 6. Agent Identity

### 6.1 id

Unique identifier for the agent. **OPTIONAL.** When present, value **MUST** be a string; **SHOULD** be a URI or URN. Recommended formats: `urn:adl:{namespace}:{name}:{version}`, `did:web:example.com:agents:{name}`, or `https://example.com/agents/{name}`.

### 6.2 provider

Identifies the organization or entity that provides the agent. **OPTIONAL.** When present, value **MUST** be an object:

| Member   | Type   | Required | Description     |
|----------|--------|----------|-----------------|
| name    | string | REQUIRED | Provider name   |
| url     | string | OPTIONAL | Provider website |
| contact | string | OPTIONAL | Contact email   |

### 6.3 cryptographic_identity

Cryptographic identification for the agent. **OPTIONAL.** When present, value **MUST** be an object:

| Member     | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| did        | string | OPTIONAL | Decentralized Identifier [W3C.DID]  |
| public_key | object | OPTIONAL | Public key for signature verification |

At least one of `did` or `public_key` **SHOULD** be present. The `public_key` object, when present, **MUST** contain `algorithm` (string, REQUIRED) and `value` (string, Base64-encoded, REQUIRED). Implementations **SHOULD** reject weak algorithms (e.g., RSA &lt; 2048 bits, DSA, ECDSA &lt; P-256). EdDSA (Ed25519, Ed448) is **RECOMMENDED**.

---

## 7. Model Configuration

### 7.1 model

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

### 7.2 system_prompt

System prompt for the agent. **OPTIONAL.** Value **MUST** be a string or an object. When an object, it **MUST** contain `template` (string, REQUIRED) and **MAY** contain `variables` (object). Variables in templates use `{{variable_name}}`.

---

## 8. Capabilities

### 8.1 tools

Array of tool objects (functions the agent can invoke). **OPTIONAL.** Each tool **MUST** contain `name` (string, REQUIRED) and `description` (string, REQUIRED). Each tool **MAY** contain: `parameters` (JSON Schema), `returns` (JSON Schema), `examples`, `requires_confirmation` (bool), `idempotent` (bool), `read_only` (bool), `annotations`. Tool names **MUST** be unique and match `^[a-z][a-z0-9_]*$`. The `parameters` and `returns` objects, when present, **MUST** be valid JSON Schema.

### 8.2 resources

Array of resource objects (data sources the agent can access). **OPTIONAL.** Each resource **MUST** contain `name` (string, REQUIRED) and `type` (string, REQUIRED). `type` **MUST** be one of: `vector_store`, `knowledge_base`, `file`, `api`, `database`. Each resource **MAY** contain: `description`, `uri`, `mime_types`, `schema`, `annotations`. Resource names **MUST** be unique.

### 8.3 prompts

Array of prompt objects (reusable prompt templates). **OPTIONAL.** Each prompt **MUST** contain `name` (string, REQUIRED) and `template` (string, REQUIRED). Each prompt **MAY** contain `description`, `arguments` (JSON Schema). Template arguments use `{{argument_name}}`. Prompt names **MUST** be unique.

---

## 9. Permissions

The `permissions` member defines the agent's operational boundaries. **OPTIONAL.** When present, value **MUST** be an object containing one or more permission domain members. Permissions operate deny-by-default; runtimes **SHOULD** enforce declared permissions.

| Domain          | Description                    |
|-----------------|--------------------------------|
| network         | Network access boundaries      |
| filesystem      | Filesystem access boundaries   |
| environment     | Environment variable access    |
| execution       | Process execution boundaries   |
| resource_limits | Resource consumption limits   |

Permissions operate on a **deny-by-default** model: capabilities not explicitly granted are denied. Runtimes **SHOULD** enforce declared permissions. Runtimes that cannot enforce a permission domain **SHOULD** warn users before execution.

### 9.2 network

May contain: `allowed_hosts` (array of host patterns), `allowed_ports`, `allowed_protocols`, `deny_private` (bool). Host patterns support exact match and `*.example.com`.

### 9.3 filesystem

May contain: `allowed_paths` (array of `{ path, access }` where access is `read`, `write`, or `read_write`), `denied_paths`.

### 9.4 environment

May contain: `allowed_variables`, `denied_variables` (patterns with wildcards, e.g., `APP_*`).

### 9.5 execution

May contain: `allowed_commands`, `denied_commands`, `allow_shell` (bool).

### 9.6 resource_limits

May contain: `max_memory_mb`, `max_cpu_percent`, `max_duration_sec`, `max_concurrent`.

---

## 10. Security

The `security` member defines security requirements. **OPTIONAL.** When present, value **MUST** be an object that **MAY** contain `authentication`, `encryption`, and `attestation`.

### 10.1 authentication

May contain: `type` (one of `none`, `api_key`, `oauth2`, `oidc`, `mtls`), `required` (bool). Type-specific members (e.g., OAuth2: `scopes`, `token_endpoint`; OIDC: `issuer`, `audience`) **MAY** be present.

### 10.2 encryption

May contain: `in_transit` (`required`, `min_version`), `at_rest` (`required`, `algorithm`).

### 10.3 attestation

May contain: `type` (one of `self`, `third_party`, `verifiable_credential`), `issuer`, `issued_at`, `expires_at` (ISO 8601), `signature` (object). Implementations **SHOULD** warn when `expires_at` is in the past or within 30 days.

**Signature object:** When present, **MUST** contain `algorithm`, `value` (Base64url-encoded), `signed_content` (`"canonical"` or `"digest"`). When `signed_content` is `"digest"`, **MUST** also include `digest_algorithm` and `digest_value`. Supported algorithms include Ed25519 (RECOMMENDED), Ed448, ES256/384/512, RS256, PS256 (RSA ≥ 2048). Verification: remove signature, serialize with JCS [RFC8785], verify digest if applicable, resolve public key from `cryptographic_identity`, verify signature.

---

## 11. Runtime Behavior

The `runtime` member configures agent runtime behavior. **OPTIONAL.** When present, value **MUST** be an object.

### 11.1 input_handling

May contain: `max_input_length`, `content_types`, `sanitization`.

### 11.2 output_handling

May contain: `max_output_length`, `format`, `streaming` (bool).

### 11.3 tool_invocation

May contain: `parallel` (bool), `max_concurrent`, `timeout_ms`, `retry_policy`.

### 11.4 error_handling

May contain: `on_tool_error` (`abort`, `continue`, or `retry`), `max_retries`, `fallback_behavior`.

---

## 12. Metadata

The `metadata` member provides additional information. **OPTIONAL.** When present, value **MUST** be an object.

### 12.1 authors

Array of author objects. Each **MAY** contain `name`, `email`, `url`.

### 12.2 license

String: SPDX license identifier or URI to license document.

### 12.3 documentation

String: URI to documentation.

### 12.4 repository

String: URI to source repository.

### 12.5 tags

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
| VAL-01 | `adl` MUST match a supported version |
| VAL-02 | Tool names MUST be unique |
| VAL-03 | Resource names MUST be unique |
| VAL-04 | Prompt names MUST be unique |
| VAL-05 | Timestamps MUST be valid ISO 8601 |
| VAL-06 | URIs MUST be valid per RFC 3986 |
| VAL-07 | JSON Schema in parameters/returns MUST be valid |
| VAL-08 | Profile requirements MUST be satisfied |

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
| ADL-3001 | Profile  | Profile requirements not satisfied |
| ADL-3002 | Profile  | Unknown profile |
| ADL-4001 | Security | Weak key algorithm |
| ADL-4002 | Security | Invalid signature |
| ADL-4003 | Security | Expired attestation |

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
| [Healthcare](../../profiles/healthcare/) | `urn:adl:profile:healthcare:1.0` | Placeholder |
| [Financial](../../profiles/financial/) | `urn:adl:profile:financial:1.0` | Placeholder |

See [profiles/README.md](../../profiles/README.md) for the full profile index and contribution guidelines.
