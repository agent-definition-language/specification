# Proposal: ADL ↔ OpenClaw Interoperability

**Date:** 2026-03-21
**Status:** Draft
**ADL Version:** 0.2.0
**Affects:** versions/0.2.0/spec.md (Section 15), packages/adl-generator, packages/adl-cli

## Summary

Define how ADL documents map to OpenClaw agent configurations and skill definitions, enabling ADL to serve as the portable description layer for agents deployed on the OpenClaw orchestration platform and Nvidia's NemoClaw security wrapper. This follows the precedent of ADL's existing A2A (Section 15.1), MCP (Section 15.2), and OpenAPI (Section 15.3) interoperability mappings.

## Motivation

### OpenClaw Market Momentum

OpenClaw has emerged as a leading open-source AI agent orchestration platform. Its gateway-based architecture, skills ecosystem (5,400+ registered skills), multi-agent runtime, and ROS 2 robotics integration make it the de facto platform for deploying autonomous agents in both software and physical environments. Nvidia's entry with NemoClaw — an open-source reference stack adding privacy routing and security guardrails — further cements OpenClaw's role as critical infrastructure.

### ADL's Interoperability Gap

ADL already generates A2A Agent Cards and MCP server configurations (Spec §15.1–15.2). OpenClaw is conspicuously absent. An agent described in ADL today cannot be provisioned on an OpenClaw gateway without manual translation. This gap limits ADL's value proposition as a universal agent passport.

### Complementary Strengths

ADL and OpenClaw solve different layers of the agent stack:

| Concern | ADL | OpenClaw |
|---------|-----|----------|
| **Agent description** | First-class (passport model) | Implicit (scattered across config + skills) |
| **Permissions** | Deny-by-default, 5 domains | Tool policies, exec approvals |
| **Security & compliance** | Authentication, attestation, governance profile | NemoClaw privacy router, guardrails |
| **Lifecycle management** | draft → active → deprecated → retired | No formal lifecycle |
| **Orchestration runtime** | Declared, not executed | Full runtime (turns, tool calls, state, memory) |
| **Skills/tools ecosystem** | Structured JSON Schema definitions | 5,400+ markdown-based skills |
| **Discovery** | `/.well-known/adl-agents` | No standardized discovery |

Bridging these creates a more complete agent management story: ADL describes, OpenClaw executes.

## Details

### 1. Concept Mapping

#### 1.1 Agent Identity

| ADL Member | OpenClaw Equivalent | Mapping Notes |
|------------|-------------------|---------------|
| `name` | `agents[].name` in `openclaw.json` | Direct. OpenClaw agent names are string identifiers. |
| `description` | `agents[].description` | Direct. Used for agent identity context. |
| `version` | No equivalent | ADL adds versioning OpenClaw lacks. Carry as metadata. |
| `id` (HTTPS URI, DID, or URN) | No equivalent | ADL's globally unique identifier has no OpenClaw counterpart. Could be stored in agent workspace metadata. |
| `provider` | No equivalent | Organization metadata. Informational only in OpenClaw context. |
| `cryptographic_identity` | No equivalent (NemoClaw partially) | DID-based identity could map to NemoClaw's agent attestation if supported. |

#### 1.2 Model Configuration

| ADL Member | OpenClaw Equivalent | Mapping Notes |
|------------|-------------------|---------------|
| `model.provider` | Provider prefix in `models` catalog | ADL `"anthropic"` → OpenClaw `"anthropic/"` prefix. |
| `model.name` | Model name in `models` catalog | ADL `"claude-opus-4-6"` → OpenClaw `"anthropic/claude-opus-4-6"`. |
| `model.temperature` | `agents[].model_settings.temperature` | Direct. |
| `model.max_tokens` | `agents[].model_settings.max_tokens` | Direct. |
| `model.context_window` | Informational only | OpenClaw does not expose context window config. |
| `model.capabilities[]` | No equivalent | ADL capabilities (vision, function_calling, streaming) are informational in OpenClaw. |

#### 1.3 Tools → Skills

This is the most significant mapping. ADL tools are structured JSON Schema objects; OpenClaw skills are markdown files with YAML frontmatter.

**ADL tool definition:**
```yaml
tools:
  - name: search_documents
    description: Search a document corpus by semantic query.
    parameters:
      type: object
      properties:
        query:
          type: string
          description: The search query.
        max_results:
          type: integer
          default: 10
      required: [query]
    returns:
      type: array
      items:
        type: object
        properties:
          title: { type: string }
          score: { type: number }
    read_only: true
    idempotent: true
```

**Generated OpenClaw SKILL.md:**
```markdown
---
name: search_documents
description: Search a document corpus by semantic query.
read_only: true
idempotent: true
parameters:
  query:
    type: string
    description: The search query.
    required: true
  max_results:
    type: integer
    description: Maximum number of results to return.
    default: 10
returns:
  type: array
  description: Array of matching documents with title and relevance score.
---

# search_documents

Search a document corpus by semantic query.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | The search query. |
| `max_results` | integer | No | 10 | Maximum number of results to return. |

## Returns

An array of objects, each containing:
- `title` (string) — Document title.
- `score` (number) — Relevance score.

## Behavior

- This tool is **read-only** and **idempotent** — it does not modify state and repeated calls with the same input produce the same result.
```

**Mapping rules:**

| ADL Tool Member | SKILL.md Equivalent | Notes |
|----------------|-------------------|-------|
| `name` | `name` in frontmatter, filename (`skills/{name}/SKILL.md`) | Direct. |
| `description` | `description` in frontmatter + body heading | Direct. |
| `parameters` (JSON Schema) | `parameters` in frontmatter + Parameters table | Flatten JSON Schema `properties` into YAML map. |
| `returns` (JSON Schema) | `returns` in frontmatter + Returns section | Summarize schema as prose. |
| `read_only` | `read_only` in frontmatter | Direct. |
| `idempotent` | `idempotent` in frontmatter | Direct. |
| `requires_confirmation` | Maps to OpenClaw exec approval policy | High-risk tools needing confirmation → OpenClaw's exec approval list. |
| `annotations.openapi_ref` | Implementation detail in skill body | Reference for skill implementation, not config. |
| `examples[]` | Example sections in skill body | Input/output pairs rendered as markdown code blocks. |
| `data_classification` (tool-level) | No equivalent (NemoClaw) | Sensitivity info → NemoClaw privacy routing decisions. |

#### 1.4 Permissions → Tool Policies and Exec Approvals

ADL's deny-by-default permission model maps to OpenClaw's tool policy and exec approval mechanisms:

| ADL Permission Domain | OpenClaw Mapping | Notes |
|----------------------|-----------------|-------|
| `permissions.network.allowed_hosts` | Gateway network policy | Restrict which hosts the agent's skills can reach. |
| `permissions.network.denied_hosts` | Gateway network deny list | Explicit denials take precedence (ADL conflict resolution). |
| `permissions.filesystem.allowed_paths` | `agents[].workspace` boundaries | Agent workspace scoping. |
| `permissions.execution.allowed_commands` | OpenClaw exec approval allowlist | Commands the agent can run without human approval. |
| `permissions.execution.denied_commands` | OpenClaw exec approval denylist | Commands that are always blocked. |
| `permissions.execution.allow_shell` | Shell access policy | Whether the agent can invoke a shell at all. |
| `permissions.resource_limits.max_memory_mb` | Gateway resource constraints | Container/process-level limits. |
| `permissions.resource_limits.max_duration_sec` | Turn timeout / session limits | Mapped to OpenClaw's turn-level timeouts. |

**Key difference:** ADL permissions are declarative ("this agent needs X"), while OpenClaw policies are enforcement-oriented ("allow/deny X at runtime"). The mapping is: ADL `allowed_*` → OpenClaw allowlist; ADL `denied_*` → OpenClaw denylist.

#### 1.5 Security → NemoClaw Guardrails

| ADL Security Member | NemoClaw Mapping | Notes |
|--------------------|-----------------|-------|
| `security.authentication.type` | NemoClaw auth provider config | `oauth2`, `api_key`, `mtls` → NemoClaw auth routing. |
| `security.encryption_in_transit` | NemoClaw TLS enforcement | Boolean flag → enforce HTTPS. |
| `security.attestation[]` | NemoClaw audit records | Security attestation records for compliance. |
| `data_classification.sensitivity` | NemoClaw privacy router | `confidential`/`restricted` → route through local Nemotron models instead of cloud. |
| `data_classification.handling` | NemoClaw data handling policies | `encryption_required`, `anonymization_required` → NemoClaw guardrail config. |
| Governance profile `autonomy.tier` | NemoClaw guardrail strictness | Tier 1 (supervised) → strict guardrails; Tier 3 (autonomous) → relaxed. |

#### 1.6 System Prompt and Resources

| ADL Member | OpenClaw Equivalent | Notes |
|------------|-------------------|-------|
| `system_prompt` | Agent identity instructions | Injected as the agent's base instructions. Template variables (`{{var}}`) resolved at generation time or mapped to OpenClaw's runtime context. |
| `resources[]` | Integration configurations | ADL resources (vector stores, APIs, databases) → OpenClaw integration configs or skill references. |
| `prompts[]` | No direct equivalent | ADL prompt templates could be generated as utility skills or instruction fragments. |

#### 1.7 Lifecycle (ADL-only)

OpenClaw has no formal agent lifecycle management. ADL's lifecycle declarations add governance that OpenClaw lacks:

- **`draft`** → Agent config exists but is not loaded by the gateway.
- **`active`** → Agent is provisioned and running.
- **`deprecated`** → Gateway logs warnings; migration to `successor` is recommended.
- **`retired`** → Gateway refuses to provision this agent.

A generator could emit lifecycle metadata as comments or a companion `lifecycle.json` in the agent workspace. An OpenClaw gateway plugin could enforce lifecycle rules by checking ADL documents before provisioning.

#### 1.8 Runtime Configuration

| ADL Runtime Member | OpenClaw Equivalent | Notes |
|-------------------|-------------------|-------|
| `runtime.tool_invocation.parallel` | Agent turn config | Whether tools can be called in parallel. |
| `runtime.tool_invocation.max_concurrent` | Concurrency limit | Max parallel tool calls per turn. |
| `runtime.tool_invocation.timeout_ms` | Turn/tool timeout | Per-tool timeout. |
| `runtime.error_handling.on_tool_error` | Error recovery policy | `retry`, `skip`, `fail` → OpenClaw error handling. |
| `runtime.error_handling.max_retries` | Retry config | Direct mapping. |

### 2. Integration Architecture

#### 2.1 ADL → OpenClaw Generator Target

The primary integration path leverages the existing `adl-generator` pipeline:

```
ADL Document → IR (AgentIR) → OpenClaw Renderer → Output Files
```

This follows the established pattern of the `claude-sdk-ts` and `vanilla-ts` targets in `packages/adl-generator/src/targets/`. A new `openclaw` target would implement the `TargetRenderer` interface:

```typescript
// packages/adl-generator/src/targets/openclaw/index.ts
import type { TargetRenderer, GeneratedFile } from "../../renderer.js";
import type { AgentIR } from "../../ir/types.js";

export const openclawTarget: TargetRenderer = {
  id: "openclaw",
  label: "OpenClaw Gateway Configuration",
  outputLanguage: "json5",
  render(ir: AgentIR): GeneratedFile[] {
    // 1. Generate openclaw.json (gateway config with agent + model entries)
    // 2. Generate skills/{toolName}/SKILL.md for each tool
    // 3. Generate MEMORY.md seeded from system_prompt + resource descriptions
    // 4. Optionally generate lifecycle.json for governance metadata
  },
};
```

**Generated output structure:**
```
output/
├── openclaw.json          # Gateway configuration
├── skills/
│   ├── search_documents/
│   │   └── SKILL.md       # Generated from ADL tool definition
│   └── create_report/
│       └── SKILL.md
├── MEMORY.md              # Seeded from system_prompt + resources
└── .adl/
    └── source.adl.yaml    # Original ADL document for traceability
```

#### 2.2 OpenClaw → ADL Importer

A reverse path for existing OpenClaw deployments:

```
openclaw.json + skills/*.md → ADL Document
```

This would be a CLI command (`adl-cli import-openclaw`) that:
1. Parses `openclaw.json` for agent identity, model config, and policies
2. Scans `skills/` directories for SKILL.md files and converts frontmatter to ADL tool definitions
3. Infers permissions from tool policies and exec approval lists
4. Generates an ADL YAML document with appropriate `data_classification` defaults

#### 2.3 Discovery Integration

OpenClaw gateways could discover ADL-described agents via the well-known URI mechanism (Spec §14):

1. Gateway is configured with a list of ADL discovery endpoints
2. Fetches `https://{domain}/.well-known/adl-agents` periodically
3. Retrieves ADL documents for discovered agents
4. Auto-provisions agents using the ADL → OpenClaw generator

This could be implemented as an OpenClaw gateway plugin.

#### 2.4 NemoClaw Security Bridge

ADL security and governance declarations map to NemoClaw's guardrail configuration:

```
ADL Document
  ├── data_classification.sensitivity → Privacy router routing rules
  │     "restricted" → Force local Nemotron model
  │     "confidential" → Anonymize before cloud routing
  │     "public" → Allow cloud model routing
  ├── security.authentication → NemoClaw auth provider
  ├── permissions → NemoClaw enforcement policies
  └── governance profile
        └── autonomy.tier → Guardrail strictness level
              Tier 1 (supervised) → All actions require approval
              Tier 2 (conditional) → High-risk actions need approval
              Tier 3 (autonomous) → Minimal guardrails
```

### 3. Spec Changes Required

Add **Section 15.4** to the ADL specification:

> ### 15.4 OpenClaw Configuration Generation
>
> Implementations **SHOULD** support generating OpenClaw gateway configurations from ADL documents (e.g., agent identity and model settings → `openclaw.json` agent entries, tools → SKILL.md skill definitions, permissions → tool policies and exec approvals, security → NemoClaw guardrail configurations).

This mirrors the brevity of §15.1 (A2A) and §15.2 (MCP), keeping detailed mapping rules in this proposal and implementer documentation rather than the spec itself.

### 4. Implementation Roadmap

| Phase | Deliverable | Effort |
|-------|------------|--------|
| **Phase 1** | This proposal document | Current |
| **Phase 2** | `adl-generator` OpenClaw target renderer | New `packages/adl-generator/src/targets/openclaw/` implementing `TargetRenderer` |
| **Phase 3** | Spec §15.4 addition | One-line normative text + informative mapping reference |
| **Phase 4** | `adl-cli import-openclaw` command | Reverse importer in `packages/adl-cli` |
| **Phase 5** | OpenClaw gateway discovery plugin | Community contribution; consumes `/.well-known/adl-agents` |
| **Phase 6** | NemoClaw guardrail mapping | Depends on NemoClaw's configuration format stabilizing (currently early preview) |

## Alternatives Considered

### OpenClaw-Specific ADL Profile

A dedicated `urn:adl:profile:openclaw:1.0` profile could define OpenClaw-specific extensions (workspace config, channel bindings, ROS 2 topic mappings, memory policies). **Deferred** — the core mapping covers the 80% case. A profile makes sense once the community identifies OpenClaw-specific declarations that don't fit in the core spec or existing profiles.

### Bidirectional Real-Time Sync

Rather than static generation, a live sync daemon could keep ADL documents and OpenClaw configs in lockstep. **Rejected** — adds operational complexity with minimal benefit. Static generation with CI/CD pipelines is simpler and more auditable.

### OpenClaw as ADL Runtime

Rather than generating OpenClaw configs from ADL, OpenClaw could natively consume ADL documents as its configuration format, replacing `openclaw.json`. **Rejected** — too invasive for OpenClaw's architecture. The generator approach respects both projects' independence.

## References

- [ADL Specification v0.2.0](../versions/0.2.0/spec.md) — Sections 7 (Tools), 10 (Permissions), 11 (Security), 15 (Interoperability)
- [ADL Generator Package](../packages/adl-generator/) — Target renderer pattern (`TargetRenderer` interface)
- [OpenClaw Documentation](https://docs.openclaw.ai/) — Gateway configuration, skills system
- [OpenClaw Architecture: Control Plane, Sessions, and the Event Loop](https://theagentstack.substack.com/p/openclaw-architecture-part-1-control)
- [OpenClaw Skills Developer Guide](https://www.digitalocean.com/resources/articles/what-are-openclaw-skills)
- [OpenClaw Configuration Reference](https://docs.openclaw.ai/gateway/configuration)
- [Nvidia NemoClaw Announcement](https://nvidianews.nvidia.com/news/nvidia-announces-nemoclaw) — Privacy router, security guardrails
- [Nvidia NemoClaw Product Page](https://www.nvidia.com/en-us/ai/nemoclaw/)
- [Vendor Extensions Proposal](./2026-03-14-vendor-extensions.md) — Precedent for `extensions` object pattern
- [RFC 6648](https://www.rfc-editor.org/rfc/rfc6648) — Deprecating the "X-" Prefix (referenced for extension design context)
