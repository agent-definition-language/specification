# ADL 0.1.0 Critical Gap Remediation

**Date:** 2026-02-16
**Status:** Implemented
**Affects:** `versions/0.1.0/spec.md`, `versions/0.1.0/schema.json`, `versions/0.1.0/spec-manifest.yaml`

---

## 1. Summary

This proposal addresses five critical gaps identified in the ADL 0.1.0 specification review that collectively prevent the spec from achieving its stated goals of machine-readability, security, and interoperability. The gaps are: (C1) the JSON Schema covers only 6 of 19+ defined members, providing ~10% validation coverage; (C2) the schema's `additionalProperties: true` directly contradicts Section 4.2's normative prohibition on undefined members; (C3) the `permissions` member's omission semantics are undefined, creating ambiguity in the deny-by-default security model; (C4) nine member structures are mentioned but never formally defined, making conformant implementation impossible; and (C5) wildcard and pattern syntax used in permission domains lacks formal specification. This proposal also addresses section numbering gaps, missing validation rules (VAL-13 through VAL-24), and normative language weaknesses discovered during the review.

---

## 2. Motivation

### 2.1 Interoperability Risk

The JSON Schema (`schema.json`) validates four required string fields and the `lifecycle` object. The remaining 13+ members defined in the specification — `tools`, `resources`, `prompts`, `permissions`, `security`, `model`, `runtime`, `metadata`, `provider`, `cryptographic_identity`, `profiles`, `id`, and `system_prompt` — have zero schema coverage. Combined with `additionalProperties: true`, any JSON object containing `adl`, `name`, `description`, and `version` as strings passes schema validation.

This means two independent implementations cannot produce compatible validators. A document with `"tools": "not an array"` or `"permissions": 42` passes schema validation. The spec's stated goal of being "Machine-readable" (Section 1.2) and the requirement that "Implementations MUST validate ADL documents against the JSON Schema defined in Appendix A" (Section 14.2) are effectively unmet.

### 2.2 Normative Contradictions Block Standardization

Section 4.2 states: "An ADL document **MUST NOT** contain members not defined by this specification, a declared profile, or the extension mechanism." The schema permits all additional properties. This contradiction would be flagged as a blocking defect by any standards body (IETF, ISO, LF). Additionally, the `lifecycle` sub-schema uses `additionalProperties: false`, which rejects extension members inside lifecycle objects — contradicting Section 4.3's guarantee that `x_`-prefixed members must not be rejected.

### 2.3 Undefined Permission Semantics Are a Security Risk

Section 9 states "Permissions operate on a deny-by-default model" using descriptive language rather than normative requirements. Critically, the spec never defines what happens when the `permissions` member is entirely omitted. One runtime could interpret omission as "deny everything" (making the agent unusable without explicit permissions), while another could interpret it as "no restrictions declared" (granting full access). For a specification with security as a first-class goal, this ambiguity is a vulnerability — particularly because a simple typo (`"permisions"` instead of `"permissions"`) would silently bypass all permission boundaries.

---

## 3. Details

### 3.1 C1: Expand JSON Schema to Cover All Spec-Defined Members

**File:** `versions/0.1.0/schema.json`

The schema must be expanded to include definitions for every member described in the specification. Below are the JSON Schema fragments for each missing member, organized by spec section. Each fragment is designed to be inserted into the root schema's `properties` object.

#### 3.1.1 Agent Identity (Section 6)

```json
"id": {
  "type": "string",
  "description": "Unique identifier for the agent (URI or URN)"
},
"provider": {
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "url": { "type": "string", "format": "uri" },
    "contact": { "type": "string", "format": "email" }
  },
  "patternProperties": {
    "^x_[a-z][a-z0-9_]*$": true
  },
  "additionalProperties": false,
  "description": "Organization or entity that provides the agent"
},
"cryptographic_identity": {
  "type": "object",
  "properties": {
    "did": { "type": "string" },
    "public_key": {
      "type": "object",
      "required": ["algorithm", "value"],
      "properties": {
        "algorithm": { "type": "string" },
        "value": { "type": "string" }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    }
  },
  "patternProperties": {
    "^x_[a-z][a-z0-9_]*$": true
  },
  "additionalProperties": false,
  "description": "Cryptographic identification for the agent"
}
```

#### 3.1.2 Model Configuration (Section 7)

```json
"model": {
  "type": "object",
  "properties": {
    "provider": { "type": "string" },
    "name": { "type": "string" },
    "version": { "type": "string" },
    "context_window": { "type": "integer", "minimum": 1 },
    "temperature": { "type": "number", "minimum": 0.0, "maximum": 2.0 },
    "max_tokens": { "type": "integer", "minimum": 1 },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["function_calling", "vision", "code_execution", "streaming"]
      }
    }
  },
  "patternProperties": {
    "^x_[a-z][a-z0-9_]*$": true
  },
  "additionalProperties": false,
  "description": "AI model configuration"
},
"system_prompt": {
  "oneOf": [
    { "type": "string", "minLength": 1 },
    {
      "type": "object",
      "required": ["template"],
      "properties": {
        "template": { "type": "string", "minLength": 1 },
        "variables": { "type": "object" }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    }
  ],
  "description": "System prompt (string or template object)"
}
```

#### 3.1.3 Capabilities (Section 8)

```json
"tools": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name", "description"],
    "properties": {
      "name": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9_]*$",
        "description": "Unique tool name"
      },
      "description": { "type": "string", "minLength": 1 },
      "parameters": {
        "type": "object",
        "description": "JSON Schema for tool input parameters"
      },
      "returns": {
        "type": "object",
        "description": "JSON Schema for tool return value"
      },
      "examples": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "input": { "type": "object" },
            "output": {}
          },
          "patternProperties": {
            "^x_[a-z][a-z0-9_]*$": true
          },
          "additionalProperties": false
        },
        "description": "Example invocations"
      },
      "requires_confirmation": { "type": "boolean" },
      "idempotent": { "type": "boolean" },
      "read_only": { "type": "boolean" },
      "annotations": {
        "type": "object",
        "properties": {
          "openapi_ref": { "type": "string", "format": "uri" },
          "operation_id": { "type": "string" }
        },
        "additionalProperties": true,
        "description": "Implementation hints and metadata (open object)"
      }
    },
    "patternProperties": {
      "^x_[a-z][a-z0-9_]*$": true
    },
    "additionalProperties": false
  },
  "description": "Tools (functions) the agent can invoke"
},
"resources": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name", "type"],
    "properties": {
      "name": { "type": "string", "minLength": 1 },
      "type": {
        "type": "string",
        "enum": ["vector_store", "knowledge_base", "file", "api", "database"]
      },
      "description": { "type": "string" },
      "uri": { "type": "string", "format": "uri" },
      "mime_types": {
        "type": "array",
        "items": { "type": "string" }
      },
      "schema": {
        "type": "object",
        "description": "JSON Schema describing the resource's data structure"
      },
      "annotations": {
        "type": "object",
        "additionalProperties": true,
        "description": "Implementation hints and metadata (open object)"
      }
    },
    "patternProperties": {
      "^x_[a-z][a-z0-9_]*$": true
    },
    "additionalProperties": false
  },
  "description": "Data sources the agent can access"
},
"prompts": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name", "template"],
    "properties": {
      "name": { "type": "string", "minLength": 1 },
      "template": { "type": "string", "minLength": 1 },
      "description": { "type": "string" },
      "arguments": {
        "type": "object",
        "description": "JSON Schema for template arguments"
      }
    },
    "patternProperties": {
      "^x_[a-z][a-z0-9_]*$": true
    },
    "additionalProperties": false
  },
  "description": "Reusable prompt templates"
}
```

#### 3.1.4 Permissions (Section 9)

```json
"permissions": {
  "type": "object",
  "properties": {
    "network": {
      "type": "object",
      "properties": {
        "allowed_hosts": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Host patterns (see Section 4.4)"
        },
        "allowed_ports": {
          "type": "array",
          "items": { "type": "integer", "minimum": 1, "maximum": 65535 }
        },
        "allowed_protocols": {
          "type": "array",
          "items": { "type": "string" }
        },
        "deny_private": { "type": "boolean" }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "filesystem": {
      "type": "object",
      "properties": {
        "allowed_paths": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["path", "access"],
            "properties": {
              "path": { "type": "string" },
              "access": {
                "type": "string",
                "enum": ["read", "write", "read_write"]
              }
            },
            "additionalProperties": false
          }
        },
        "denied_paths": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Path patterns to deny (see Section 4.4)"
        }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "environment": {
      "type": "object",
      "properties": {
        "allowed_variables": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Variable name patterns (see Section 4.4)"
        },
        "denied_variables": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Variable name patterns to deny (see Section 4.4)"
        }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "execution": {
      "type": "object",
      "properties": {
        "allowed_commands": {
          "type": "array",
          "items": { "type": "string" }
        },
        "denied_commands": {
          "type": "array",
          "items": { "type": "string" }
        },
        "allow_shell": { "type": "boolean" }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "resource_limits": {
      "type": "object",
      "properties": {
        "max_memory_mb": { "type": "number", "minimum": 0 },
        "max_cpu_percent": { "type": "number", "minimum": 0, "maximum": 100 },
        "max_duration_sec": { "type": "number", "minimum": 0 },
        "max_concurrent": { "type": "integer", "minimum": 1 }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    }
  },
  "patternProperties": {
    "^x_[a-z][a-z0-9_]*$": true
  },
  "additionalProperties": false,
  "description": "Agent operational boundaries (deny-by-default)"
}
```

#### 3.1.5 Security (Section 10)

```json
"security": {
  "type": "object",
  "properties": {
    "authentication": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["none", "api_key", "oauth2", "oidc", "mtls"]
        },
        "required": { "type": "boolean" },
        "scopes": { "type": "array", "items": { "type": "string" } },
        "token_endpoint": { "type": "string", "format": "uri" },
        "issuer": { "type": "string" },
        "audience": { "type": "string" }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "encryption": {
      "type": "object",
      "properties": {
        "in_transit": {
          "type": "object",
          "properties": {
            "required": { "type": "boolean" },
            "min_version": { "type": "string" }
          },
          "patternProperties": {
            "^x_[a-z][a-z0-9_]*$": true
          },
          "additionalProperties": false
        },
        "at_rest": {
          "type": "object",
          "properties": {
            "required": { "type": "boolean" },
            "algorithm": { "type": "string" }
          },
          "patternProperties": {
            "^x_[a-z][a-z0-9_]*$": true
          },
          "additionalProperties": false
        }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "attestation": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": ["self", "third_party", "verifiable_credential"]
        },
        "issuer": { "type": "string" },
        "issued_at": { "type": "string", "format": "date-time" },
        "expires_at": { "type": "string", "format": "date-time" },
        "signature": {
          "type": "object",
          "required": ["algorithm", "value", "signed_content"],
          "properties": {
            "algorithm": { "type": "string" },
            "value": { "type": "string" },
            "signed_content": {
              "type": "string",
              "enum": ["canonical", "digest"]
            },
            "digest_algorithm": { "type": "string" },
            "digest_value": { "type": "string" }
          },
          "patternProperties": {
            "^x_[a-z][a-z0-9_]*$": true
          },
          "additionalProperties": false
        }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    }
  },
  "patternProperties": {
    "^x_[a-z][a-z0-9_]*$": true
  },
  "additionalProperties": false,
  "description": "Security requirements"
}
```

#### 3.1.6 Runtime Behavior (Section 11)

```json
"runtime": {
  "type": "object",
  "properties": {
    "input_handling": {
      "type": "object",
      "properties": {
        "max_input_length": { "type": "integer", "minimum": 1 },
        "content_types": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Accepted MIME types (e.g., text/plain, application/json)"
        },
        "sanitization": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "strip_html": { "type": "boolean" },
            "max_input_length": { "type": "integer", "minimum": 1 }
          },
          "patternProperties": {
            "^x_[a-z][a-z0-9_]*$": true
          },
          "additionalProperties": false
        }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "output_handling": {
      "type": "object",
      "properties": {
        "max_output_length": { "type": "integer", "minimum": 1 },
        "format": {
          "type": "string",
          "enum": ["text", "json", "markdown", "html"]
        },
        "streaming": { "type": "boolean" }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "tool_invocation": {
      "type": "object",
      "properties": {
        "parallel": { "type": "boolean" },
        "max_concurrent": { "type": "integer", "minimum": 1 },
        "timeout_ms": { "type": "integer", "minimum": 0 },
        "retry_policy": {
          "type": "object",
          "properties": {
            "max_retries": { "type": "integer", "minimum": 0 },
            "backoff_strategy": {
              "type": "string",
              "enum": ["fixed", "exponential", "linear"]
            },
            "initial_delay_ms": { "type": "integer", "minimum": 0 },
            "max_delay_ms": { "type": "integer", "minimum": 0 }
          },
          "patternProperties": {
            "^x_[a-z][a-z0-9_]*$": true
          },
          "additionalProperties": false
        }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    },
    "error_handling": {
      "type": "object",
      "properties": {
        "on_tool_error": {
          "type": "string",
          "enum": ["abort", "continue", "retry"]
        },
        "max_retries": { "type": "integer", "minimum": 0 },
        "fallback_behavior": {
          "type": "object",
          "properties": {
            "action": {
              "type": "string",
              "enum": ["return_error", "use_default", "skip"]
            },
            "default": {
              "description": "Default value when action is use_default"
            },
            "message": { "type": "string" }
          },
          "patternProperties": {
            "^x_[a-z][a-z0-9_]*$": true
          },
          "additionalProperties": false
        }
      },
      "patternProperties": {
        "^x_[a-z][a-z0-9_]*$": true
      },
      "additionalProperties": false
    }
  },
  "patternProperties": {
    "^x_[a-z][a-z0-9_]*$": true
  },
  "additionalProperties": false,
  "description": "Runtime behavior configuration"
}
```

#### 3.1.7 Metadata (Section 12)

```json
"metadata": {
  "type": "object",
  "properties": {
    "authors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string", "format": "email" },
          "url": { "type": "string", "format": "uri" }
        },
        "patternProperties": {
          "^x_[a-z][a-z0-9_]*$": true
        },
        "additionalProperties": false
      }
    },
    "license": { "type": "string" },
    "documentation": { "type": "string", "format": "uri" },
    "repository": { "type": "string", "format": "uri" },
    "tags": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z0-9][a-z0-9-]*$"
      }
    }
  },
  "patternProperties": {
    "^x_[a-z][a-z0-9_]*$": true
  },
  "additionalProperties": false,
  "description": "Additional metadata"
}
```

#### 3.1.8 Profiles (Section 13)

```json
"profiles": {
  "type": "array",
  "items": { "type": "string" },
  "description": "Profile identifiers (URIs or registered names)"
}
```

---

### 3.2 C2: Resolve Schema/Spec Contradictions

**Files:** `versions/0.1.0/schema.json`, `versions/0.1.0/spec.md`

#### 3.2.1 Root-Level `additionalProperties`

**Current state:** `"additionalProperties": true`

**Proposed change:** Replace with:

```json
"patternProperties": {
  "^x_[a-z][a-z0-9_]*$": true
},
"additionalProperties": false
```

This allows `x_`-prefixed extension members (per Section 4.3) while rejecting undefined members (per Section 4.2). The `patternProperties` regex enforces the extension naming convention: `x_` followed by a lowercase namespace identifier.

Profile-added members (e.g., `compliance_framework` from the Governance Profile) are not handled by the base schema. Consumers validating profile-enabled documents should compose the base schema with profile-specific schemas. This is a documented limitation acceptable for 0.1.0.

#### 3.2.2 Nested Object `additionalProperties`

**Current state:** `lifecycle` uses `additionalProperties: false`, which rejects extension members.

**Proposed change:** Add `patternProperties` to `lifecycle` and all other nested objects (as shown in the C1 schema fragments above):

```json
"lifecycle": {
  "type": "object",
  "required": ["status"],
  "properties": {
    "status": { "type": "string", "enum": ["draft", "active", "deprecated", "retired"] },
    "effective_date": { "type": "string", "format": "date-time" },
    "sunset_date": { "type": "string", "format": "date-time" },
    "successor": { "type": "string" }
  },
  "patternProperties": {
    "^x_[a-z][a-z0-9_]*$": true
  },
  "additionalProperties": false
}
```

#### 3.2.3 Spec Text Clarification

Add to Section 4.3 (Extension Mechanism):

> Extension members (prefixed with `x_`) **MAY** appear in any object within an ADL document, including nested objects such as `lifecycle`, `provider`, `model`, `permissions`, and `security`. Extension member names **MUST** match the pattern `x_` followed by a namespace identifier using only lowercase letters, digits, and underscores (e.g., `x_acme_internal_id`).

---

### 3.3 C3: Define Permissions Omission Semantics

**File:** `versions/0.1.0/spec.md` Section 9

#### 3.3.1 Create Section 9.1: Permissions Model

The content currently between the `## 9. Permissions` heading and `### 9.2 network` should be moved into a new `### 9.1 Permissions Model` subsection. This fixes the section numbering gap (9 jumps to 9.2) and gives the permissions model its own addressable section.

#### 3.3.2 Add Omission Semantics

Add the following normative text to Section 9.1:

> When the `permissions` member is omitted from an ADL document, no permissions are granted to the agent. Runtimes **MUST** treat the absence of `permissions` as equivalent to an empty `permissions` object — the agent has no granted capabilities.
>
> When a specific permission domain (e.g., `network`, `filesystem`) is omitted from the `permissions` object, all operations in that domain are denied. For example, if `permissions` is present but does not contain `network`, the agent **MUST** have no network access.
>
> Runtimes **MUST NOT** infer, assume, or provide default permissions when `permissions` or a permission domain is absent.

#### 3.3.3 Strengthen Normative Language

Replace the current descriptive text:

> Permissions operate on a **deny-by-default** model: capabilities not explicitly granted are denied. Runtimes **SHOULD** enforce declared permissions.

With prescriptive requirements:

> Permissions operate on a **deny-by-default** model. Runtimes **MUST** deny any capability not explicitly granted in the `permissions` member. Runtimes **MUST** enforce declared permissions. Runtimes that cannot enforce a specific permission domain **MUST** warn users before execution and **SHOULD** refuse to execute the agent unless the user explicitly acknowledges the limitation.

**Rationale for SHOULD → MUST:** A specification that declares deny-by-default permissions but makes enforcement optional provides no security guarantee. Any claim of "security boundary" in ADL requires mandatory enforcement. Runtimes that cannot enforce a domain already have an escape hatch via the warning requirement.

---

### 3.4 C4: Define Undefined Member Structures

**File:** `versions/0.1.0/spec.md`

For each member currently mentioned but never structurally defined, the following definitions should be added to the relevant spec sections.

#### 3.4.1 `tool.examples` (Section 8.1)

Add after the existing tool member descriptions:

> The `examples` member, when present, **MUST** be an array of example objects. Each example object **MAY** contain:
>
> | Member | Type   | Required | Description                        |
> |--------|--------|----------|------------------------------------|
> | name   | string | OPTIONAL | Human-readable name for the example |
> | input  | object | OPTIONAL | Example input parameters            |
> | output | any    | OPTIONAL | Expected output value               |

#### 3.4.2 `tool.annotations` (Section 8.1)

Add after `tool.examples`:

> The `annotations` member, when present, **MUST** be an object containing implementation hints and metadata. Annotations is an open object — implementations **MAY** add custom keys. Standard annotation members include:
>
> | Member       | Type   | Required | Description                                |
> |--------------|--------|----------|--------------------------------------------|
> | openapi_ref  | string | OPTIONAL | URI to an OpenAPI specification             |
> | operation_id | string | OPTIONAL | OpenAPI operation identifier                |
>
> See Section 15.3 for OpenAPI integration details. Implementations **MUST** preserve all annotation members when processing, including unrecognized keys.

#### 3.4.3 `resource.mime_types` (Section 8.2)

Add:

> The `mime_types` member, when present, **MUST** be an array of strings. Each value **MUST** be a valid MIME type (e.g., `"application/json"`, `"text/plain"`).

#### 3.4.4 `resource.schema` (Section 8.2)

Add:

> The `schema` member, when present, **MUST** be a valid JSON Schema describing the structure of the resource's data.

#### 3.4.5 `resource.annotations` (Section 8.2)

Add:

> The `annotations` member, when present, **MUST** be an object. Same semantics as `tool.annotations` — an open object for implementation hints that **MUST** be preserved when processing.

#### 3.4.6 `runtime.input_handling.sanitization` (Section 11.1)

Replace the terse mention with:

> The `sanitization` member, when present, **MUST** be an object describing input sanitization rules. It **MAY** contain:
>
> | Member           | Type    | Required | Description                              |
> |------------------|---------|----------|------------------------------------------|
> | enabled          | boolean | OPTIONAL | Whether input sanitization is active      |
> | strip_html       | boolean | OPTIONAL | Whether to strip HTML tags from input     |
> | max_input_length | number  | OPTIONAL | Maximum input length in characters        |

#### 3.4.7 `runtime.input_handling.content_types` (Section 11.1)

Add:

> The `content_types` member, when present, **MUST** be an array of strings. Each value **MUST** be a valid MIME type specifying an accepted input content type.

#### 3.4.8 `runtime.output_handling.format` (Section 11.2)

Add:

> The `format` member, when present, **MUST** be a string specifying the default output format. Value **MUST** be one of: `"text"`, `"json"`, `"markdown"`, `"html"`.

#### 3.4.9 `runtime.tool_invocation.retry_policy` (Section 11.3)

Replace the terse mention with:

> The `retry_policy` member, when present, **MUST** be an object describing retry behavior for tool invocations. It **MAY** contain:
>
> | Member           | Type   | Required | Description                                    |
> |------------------|--------|----------|------------------------------------------------|
> | max_retries      | number | OPTIONAL | Maximum number of retry attempts                |
> | backoff_strategy | string | OPTIONAL | One of: `"fixed"`, `"exponential"`, `"linear"` |
> | initial_delay_ms | number | OPTIONAL | Initial delay between retries in milliseconds   |
> | max_delay_ms     | number | OPTIONAL | Maximum delay between retries in milliseconds   |

#### 3.4.10 `runtime.error_handling.fallback_behavior` (Section 11.4)

Replace the terse mention with:

> The `fallback_behavior` member, when present, **MUST** be an object describing behavior when errors occur and `on_tool_error` does not resolve the situation. It **MAY** contain:
>
> | Member  | Type   | Required | Description                                           |
> |---------|--------|----------|-------------------------------------------------------|
> | action  | string | OPTIONAL | One of: `"return_error"`, `"use_default"`, `"skip"`   |
> | default | any    | OPTIONAL | Default value to return when `action` is `"use_default"` |
> | message | string | OPTIONAL | User-facing message on fallback                        |

---

### 3.5 C5: Define Wildcard/Pattern Syntax

**File:** `versions/0.1.0/spec.md`

#### 3.5.1 New Section 4.4: Pattern Matching

Add after Section 4.3 (Extension Mechanism):

> ### 4.4 Pattern Matching
>
> Several ADL members use patterns to specify allowed or denied values. ADL defines a minimal pattern syntax based on a subset of glob matching rules. The following constructs are supported:
>
> 1. **Literal match.** A string with no wildcard characters matches only itself. Matching is case-sensitive unless the underlying system is case-insensitive (e.g., Windows filesystem paths).
>
> 2. **Single-segment wildcard (`*`).** The `*` character matches zero or more characters within a single segment. The segment boundary depends on context:
>    - **Host patterns** (Section 9.2): segments are separated by `.` (dot). `*` does not match dots. `*.example.com` matches `api.example.com` but does not match `deep.sub.example.com`.
>    - **Environment variable patterns** (Section 9.4): `*` matches any characters in the variable name. `APP_*` matches `APP_PORT` and `APP_HOST`.
>    - **Command patterns** (Section 9.5): `*` matches any characters in the command name.
>
> 3. **Multi-segment wildcard (`**`).** The `**` sequence matches zero or more path segments including separators. Valid only in filesystem path patterns (Section 9.3). `/data/**` matches `/data/`, `/data/foo`, and `/data/foo/bar/baz`. `**` **MUST NOT** appear in host patterns, environment variable patterns, or command patterns.
>
> 4. **Restrictions.** Patterns **MUST** contain wildcards only in the positions described above. Mid-string wildcards (e.g., `foo*bar`) are **NOT RECOMMENDED**; implementations **MAY** reject them. A bare `*` as an entire pattern (matching everything) is valid but **NOT RECOMMENDED** for security-sensitive domains (`allowed_hosts`, `allowed_variables`). Implementations **SHOULD** warn when a bare `*` wildcard is used in permission patterns.
>
> Implementations **MUST** apply patterns using the rules defined in this section. Implementations **MUST NOT** interpret patterns as regular expressions.

#### 3.5.2 Update Section 9.2 (network)

Add:

> Host patterns in `allowed_hosts` **MUST** conform to the pattern syntax defined in Section 4.4.

#### 3.5.3 Update Section 9.3 (filesystem)

Add:

> Path patterns in `allowed_paths[*].path` and `denied_paths` **MUST** conform to the pattern syntax defined in Section 4.4. The `**` multi-segment wildcard is valid in filesystem path patterns.

#### 3.5.4 Update Section 9.4 (environment)

Add:

> Variable patterns in `allowed_variables` and `denied_variables` **MUST** conform to the pattern syntax defined in Section 4.4.

#### 3.5.5 Update Section 9.5 (execution)

Add:

> Command patterns in `allowed_commands` and `denied_commands` **MUST** conform to the pattern syntax defined in Section 4.4.

---

### 3.6 Section Numbering and Manifest Fixes

**Files:** `versions/0.1.0/spec.md`, `versions/0.1.0/spec-manifest.yaml`

#### 3.6.1 Add Section 9.1

Move the existing permissions preamble (deny-by-default model description, domain table) into a new `### 9.1 Permissions Model` subsection as described in Section 3.3 of this proposal.

Add to `spec-manifest.yaml` under the `permissions` section:

```yaml
- id: permissions-model
  number: "9.1"
  title: Permissions Model
```

#### 3.6.2 Label Section 16.1

The error format content (JSON example and `source` object description) currently under the `## 16. Errors` heading without a subsection number should be placed under `### 16.1 Error Format`.

The spec-manifest already contains:

```yaml
- id: error-format
  number: "16.1"
  title: Error Format
```

The spec.md heading just needs to be added to match.

#### 3.6.3 Add Section 4.4

Add to `spec-manifest.yaml` under the `document-structure` section:

```yaml
- id: pattern-matching
  number: "4.4"
  title: Pattern Matching
```

---

### 3.7 Missing Validation Rules

**File:** `versions/0.1.0/spec.md` Section 14.2

Add the following rules to the validation table:

| Rule   | Description |
|--------|-------------|
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

Add corresponding error codes to Section 16.2:

| Code     | Category | Description |
|----------|----------|-------------|
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

---

### 3.8 Implementation Sequencing

The changes in this proposal have dependencies and should be implemented in the following order:

1. **Phase 1 — Define structures (C4) and patterns (C5).** The schema cannot reference structures or pattern constraints that don't exist in the spec. Complete Sections 3.4 and 3.5 first.
2. **Phase 2 — Define permissions semantics (C3).** Complete Section 3.3, including the new Section 9.1. Can overlap with Phase 1.
3. **Phase 3 — Expand schema (C1) and resolve contradictions (C2).** Now that all structures and patterns are defined, assemble the schema fragments from Section 3.1 and apply the `patternProperties`/`additionalProperties` changes from Section 3.2.
4. **Phase 4 — Housekeeping.** Section numbering (3.6), validation rules (3.7), and error codes. Can overlap with Phase 3.
5. **Phase 5 — Validation.** Verify existing examples (`minimal-0.1.0.json`, `with-tools-0.1.0.json`, `production-0.1.0.json`) pass the expanded schema. Fix any examples that fail due to legitimate schema constraints (not spec violations).

---

## 4. Alternatives Considered

### 4.1 Separate Proposals Per Gap

**Alternative:** Five individual proposals, one per critical gap.

**Rejected because:** The gaps are deeply interdependent. C4 (undefined structures) must be resolved before C1 (schema expansion) can be completed — you cannot write schema definitions for members whose structures are unspecified. C5 (wildcard syntax) feeds into C1's pattern constraints for host and path members. C2 (schema contradiction) is resolved as part of C1's `additionalProperties` changes. Splitting them would create circular cross-references between five documents and require careful sequencing of five separate reviews.

### 4.2 Keep `additionalProperties: true` with Runtime-Only Enforcement

**Alternative:** Leave the schema permissive and rely on custom ADL validators (not JSON Schema alone) to reject unknown members.

**Rejected because:** This defeats the stated purpose of `$schema` (Section 5.2: "enables IDE validation"). IDE extensions, CI pipelines, and lightweight tooling that use JSON Schema without a custom ADL validator would provide no useful validation. The spec's claim of machine-readability requires the schema to be meaningful on its own.

### 4.3 Full POSIX Glob Syntax

**Alternative:** Adopt complete POSIX glob syntax including character classes (`[abc]`), brace expansion (`{a,b,c}`), negation (`!`), and all escaping rules.

**Rejected because:** The spec currently uses only three constructs: literal match, `*`, and `**`. Full POSIX glob introduces complexity (character classes, brace expansion, negation) that benefits no current use case and increases implementation burden. The minimal subset defined in this proposal can be extended in a future spec version without breaking existing patterns.

### 4.4 Permissions SHOULD Enforce (Status Quo)

**Alternative:** Keep the current "Runtimes SHOULD enforce declared permissions" language.

**Rejected because:** A deny-by-default model with optional enforcement is self-contradictory. If a runtime may legally choose not to enforce permissions, then the deny-by-default claim is meaningless — it's a suggestion, not a security boundary. The strengthening to MUST still provides an escape hatch: runtimes that cannot enforce a specific domain must warn users, giving users the information to make an informed decision.

### 4.5 `unevaluatedProperties` for Extension Handling

**Alternative:** Use JSON Schema 2020-12's `unevaluatedProperties: false` with `$ref` composition, where profile schemas are composed with the base schema using `allOf`.

**Rejected for 0.1.0 because:** This approach requires profile schemas to be available at validation time, making standalone validation of the base schema impossible when profiles are declared. The `patternProperties` approach works standalone and matches the spec text exactly. The `unevaluatedProperties` approach should be reconsidered when profile schema tooling matures, potentially for ADL 1.0.

---

## 5. References

- Internal specification review, 2026-02-16 (identifying gaps C1–C5)
- ADL 0.1.0-draft specification: `versions/0.1.0/spec.md`
- ADL 0.1.0 JSON Schema: `versions/0.1.0/schema.json`
- ADL 0.1.0 Spec Manifest: `versions/0.1.0/spec-manifest.yaml`
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-core)
- [RFC 2119 — Requirements Language](https://www.rfc-editor.org/info/rfc2119)
- [RFC 8174 — Requirements Language Clarification](https://www.rfc-editor.org/info/rfc8174)
- [JSON Schema `patternProperties`](https://json-schema.org/draft/2020-12/json-schema-core#section-10.3.2.2)
