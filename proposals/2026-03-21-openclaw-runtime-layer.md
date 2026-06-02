# Proposal: ADL Runtime Layer for OpenClaw

**Date:** 2026-03-21
**Status:** Draft
**ADL Version:** 0.2.0
**Depends on:** [2026-03-21-openclaw-interoperability.md](./2026-03-21-openclaw-interoperability.md)
**Affects:** packages/adl-agent, packages/adl-core (new: packages/adl-openclaw)

## Summary

Build an ADL governance layer on top of OpenClaw — analogous to how Nvidia's NemoClaw wraps OpenClaw with security controls. Where NemoClaw adds a **security layer** (kernel sandbox, privacy routing, guardrails), the ADL layer adds a **governance layer** (identity, permissions, lifecycle, discovery). The two layers are complementary and can stack: **OpenClaw (runtime) → ADL (governance) → NemoClaw (security)**.

## Motivation

### The NemoClaw Precedent

Nvidia validated the "wrapper" pattern with NemoClaw: rather than forking OpenClaw or requiring upstream changes, NemoClaw installs as a TypeScript plugin + Python blueprint that interposes on the gateway's event loop. The ADL layer can follow the same architecture.

NemoClaw proved three things:
1. OpenClaw's plugin system is expressive enough for non-trivial runtime interposition
2. The community accepts wrapper layers as legitimate extensions
3. Enterprise adopters need governance capabilities that OpenClaw alone doesn't provide

### The Governance Gap

NemoClaw addresses security. But security is only half of governance. OpenClaw still lacks:

| Capability | NemoClaw | ADL |
|-----------|----------|-----|
| Agent identity (globally unique, cryptographic) | No | Yes |
| Agent versioning (SemVer) | No | Yes |
| Lifecycle management (draft → active → deprecated → retired) | No | Yes |
| Standardized discovery (`/.well-known/adl-agents`) | No | Yes |
| Declarative permissions (structured, deny-by-default) | Partially (sandbox policies) | Yes |
| Data classification (sensitivity, handling constraints) | Partially (privacy router) | Yes |
| Compliance attestation (frameworks, audit records) | No | Yes (governance profile) |
| Autonomy tier governance | No | Yes (governance profile) |

An enterprise deploying agents on OpenClaw + NemoClaw still cannot answer: "Which version of this agent is running? When was it last attested? Is it deprecated? What compliance frameworks does it declare?" ADL answers all of these.

### Complementary Stacking

The three layers solve distinct concerns:

```
┌─────────────────────────────────────────┐
│  NemoClaw — Security Enforcement        │
│  Kernel sandbox, privacy router,        │
│  Colang guardrails, audit logging       │
├─────────────────────────────────────────┤
│  ADL Layer — Governance & Identity      │
│  Agent passport, permissions,           │
│  lifecycle, discovery, compliance       │
├─────────────────────────────────────────┤
│  OpenClaw — Agent Runtime               │
│  Gateway, turns, skills, memory,        │
│  channels, multi-agent coordination     │
└─────────────────────────────────────────┘
```

Each layer is independently useful but more powerful combined:
- OpenClaw alone: capable but ungoverned agents
- OpenClaw + NemoClaw: secure but unidentified agents
- OpenClaw + ADL: governed and discoverable agents
- OpenClaw + ADL + NemoClaw: governed, discoverable, and secure agents

## Details

### 1. Architecture

The ADL runtime layer is an **OpenClaw gateway plugin** (`@adl-spec/openclaw-plugin`) that interposes on agent provisioning and operation.

#### 1.1 Plugin Lifecycle

```
Gateway Start
  │
  ├── ADL plugin loads
  │     ├── Reads ADL documents from configured paths or discovery endpoints
  │     ├── Validates each document against ADL schema (via @adl-spec/core)
  │     └── Builds an in-memory agent registry
  │
  ├── Agent provisioning (for each declared agent)
  │     ├── Check lifecycle.status
  │     │     ├── "retired" → REFUSE provisioning, log error
  │     │     ├── "deprecated" → WARN, log sunset_date and successor
  │     │     ├── "draft" → ALLOW only in development mode
  │     │     └── "active" → ALLOW
  │     ├── Generate openclaw.json agent entry from ADL document
  │     ├── Generate SKILL.md files from ADL tool definitions
  │     ├── Apply permissions as tool policies
  │     └── Register agent in discovery endpoint
  │
  └── Runtime (ongoing)
        ├── Enforce permissions on each tool invocation
        ├── Track data classification on inputs/outputs
        ├── Serve /.well-known/adl-agents discovery endpoint
        └── Expose governance metadata via API
```

#### 1.2 Plugin Interface

```typescript
// packages/adl-openclaw/src/plugin.ts
import type { GatewayPlugin } from "openclaw";
import { validateDocument } from "@adl-spec/core";

export const adlPlugin: GatewayPlugin = {
  name: "@adl-spec/openclaw-plugin",
  version: "0.1.0",

  async onGatewayStart(gateway) {
    // Load ADL documents from configured paths
    // Validate and build agent registry
    // Register discovery endpoint
  },

  async onAgentProvision(agent, context) {
    // Check lifecycle status
    // Apply permissions as tool policies
    // Inject identity metadata
  },

  async onToolInvocation(agent, tool, params, context) {
    // Enforce ADL permissions
    // Check data classification constraints
    // Log for compliance audit
  },

  async onAgentReply(agent, reply, context) {
    // Track data classification of outputs
    // Enforce output constraints
  },
};
```

#### 1.3 Configuration

The plugin is configured via `openclaw.json`:

```json5
{
  "plugins": [
    {
      "name": "@adl-spec/openclaw-plugin",
      "config": {
        // Path(s) to ADL documents
        "documents": [
          "./agents/search-agent.adl.yaml",
          "./agents/report-agent.adl.yaml"
        ],

        // Remote discovery endpoints to poll
        "discovery": [
          "https://agents.example.com"
        ],

        // How often to poll discovery endpoints (seconds)
        "discovery_interval": 300,

        // Whether to expose /.well-known/adl-agents
        "serve_discovery": true,

        // Enforcement mode
        "mode": "enforce"  // "enforce" | "audit" | "permissive"
      }
    }
  ]
}
```

**Enforcement modes:**
- **`enforce`** — ADL permissions and lifecycle rules are enforced at runtime. Violations are blocked.
- **`audit`** — Violations are logged but not blocked. For gradual adoption.
- **`permissive`** — ADL metadata is tracked but no enforcement. For brownfield deployments.

### 2. Core Capabilities

#### 2.1 Lifecycle Gating

The plugin gates agent provisioning based on ADL lifecycle status:

```
Agent ADL Document
  └── lifecycle.status
        ├── "active"      → Provision normally
        ├── "draft"       → Provision only if gateway.mode == "development"
        ├── "deprecated"  → Provision with WARNING log
        │     └── Include sunset_date and successor URI in log
        └── "retired"     → REFUSE provisioning
              └── Return error with successor URI if available
```

This prevents stale or retired agents from running — a governance capability neither OpenClaw nor NemoClaw provides.

#### 2.2 Permission Enforcement

ADL permissions are translated to runtime enforcement on each tool invocation:

```
Tool Invocation Event
  │
  ├── Check permissions.network
  │     ├── Tool targets a network host?
  │     │     ├── Host in allowed_hosts? → ALLOW
  │     │     ├── Host in denied_hosts? → DENY (takes precedence)
  │     │     └── Neither? → DENY (deny-by-default)
  │     └── Protocol in allowed_protocols? Port in allowed_ports?
  │
  ├── Check permissions.filesystem
  │     ├── Tool accesses a file path?
  │     │     ├── Path matches allowed_paths? → ALLOW (with access level check)
  │     │     ├── Path matches denied_paths? → DENY
  │     │     └── Neither? → DENY
  │
  ├── Check permissions.execution
  │     ├── Tool executes a command?
  │     │     ├── Command in allowed_commands? → ALLOW
  │     │     ├── Command in denied_commands? → DENY
  │     │     └── allow_shell == false and tool uses shell? → DENY
  │
  └── Check permissions.resource_limits
        ├── Memory usage > max_memory_mb? → DENY
        ├── CPU usage > max_cpu_percent? → THROTTLE
        └── Duration > max_duration_sec? → TERMINATE
```

**Relationship with NemoClaw:** When both are active, ADL permissions operate at the application layer while NemoClaw enforces at the kernel layer. ADL provides the declarative policy; NemoClaw provides defense-in-depth enforcement. The ADL plugin can optionally export its permissions to NemoClaw's `openclaw-sandbox.yaml` format for kernel-level enforcement.

#### 2.3 Discovery Endpoint

The plugin serves `/.well-known/adl-agents` as defined in ADL Spec §14:

```json
{
  "agents": [
    {
      "id": "https://agents.example.com/search-agent",
      "adl_document": "https://agents.example.com/agents/search-agent.adl.json",
      "name": "Search Agent",
      "version": "2.1.0",
      "status": "active"
    },
    {
      "id": "https://agents.example.com/report-agent",
      "adl_document": "https://agents.example.com/agents/report-agent.adl.json",
      "name": "Report Agent",
      "version": "1.3.0",
      "status": "deprecated"
    }
  ]
}
```

This enables:
- Other OpenClaw gateways to discover and federate agents
- Registries to index available agents
- Monitoring systems to track agent fleet status
- NemoClaw to auto-configure privacy routing based on discovered agent metadata

#### 2.4 Data Classification Tracking

The plugin tracks data sensitivity through the agent's operation:

1. **Input classification** — Incoming messages are tagged with the agent's `data_classification.sensitivity` level
2. **Tool output classification** — Tools with their own `data_classification` have their outputs tagged accordingly
3. **High-water mark enforcement** — If a tool produces `restricted` data but the agent is classified as `confidential`, the plugin flags a violation
4. **NemoClaw integration** — Sensitivity tags are passed to NemoClaw's privacy router for model routing decisions

#### 2.5 Governance API

The plugin exposes a REST API for governance queries:

```
GET  /adl/agents                    → List all governed agents
GET  /adl/agents/:id                → Agent passport (full ADL document)
GET  /adl/agents/:id/permissions    → Resolved permissions
GET  /adl/agents/:id/lifecycle      → Lifecycle status and dates
GET  /adl/agents/:id/compliance     → Governance profile attestations
POST /adl/agents/:id/attest         → Record a new attestation
```

### 3. NemoClaw Integration

When both the ADL plugin and NemoClaw are active, they form a complementary governance + security stack:

#### 3.1 Permission Bridging

ADL permissions can be exported to NemoClaw's policy format:

```
ADL permissions.network.allowed_hosts: ["api.example.com"]
  → NemoClaw openclaw-sandbox.yaml:
      network:
        allow:
          - domain: api.example.com
            ports: [443]
        deny:
          - domain: "*"

ADL permissions.filesystem.allowed_paths: [{ path: "/data", access: "read" }]
  → NemoClaw openclaw-sandbox.yaml:
      filesystem:
        allow:
          - path: /data
            access: read-only
        deny:
          - path: "**"
```

This provides **defense-in-depth**: the ADL plugin enforces at the application layer, NemoClaw enforces at the kernel layer.

#### 3.2 Privacy Router Configuration

ADL data classification feeds NemoClaw's privacy router:

```
ADL data_classification.sensitivity: "restricted"
  → NemoClaw privacy router: force local Nemotron model

ADL data_classification.sensitivity: "confidential"
  → NemoClaw privacy router: local preferred, cloud allowed with sanitization

ADL data_classification.handling.anonymization_required: true
  → NemoClaw privacy router: strip PII before any cloud routing
```

#### 3.3 Autonomy Tier Mapping

ADL governance profile autonomy tiers map to NemoClaw guardrail strictness:

```
ADL governance.autonomy.tier: 1 (supervised)
  → NemoClaw: all actions require human approval
  → Colang: strict topical rails, input/output validation

ADL governance.autonomy.tier: 2 (conditional autonomy)
  → NemoClaw: high-risk actions need approval
  → Colang: security rails active, topical rails relaxed

ADL governance.autonomy.tier: 3 (full autonomy)
  → NemoClaw: minimal guardrails
  → Colang: security rails only
```

### 4. Package Structure

```
packages/adl-openclaw/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Plugin entry point + exports
│   ├── plugin.ts                   # GatewayPlugin implementation
│   ├── lifecycle.ts                # Lifecycle gating logic
│   ├── permissions.ts              # Permission enforcement engine
│   ├── discovery.ts                # /.well-known/adl-agents endpoint
│   ├── classification.ts           # Data classification tracking
│   ├── governance-api.ts           # REST API for governance queries
│   └── bridge/
│       ├── nemoclaw-policy.ts      # ADL → NemoClaw policy export
│       ├── nemoclaw-privacy.ts     # ADL → NemoClaw privacy router config
│       └── nemoclaw-colang.ts      # ADL autonomy tier → Colang guardrails
├── tests/
│   ├── lifecycle.test.ts
│   ├── permissions.test.ts
│   ├── discovery.test.ts
│   └── bridge/
│       └── nemoclaw.test.ts
└── README.md
```

**Dependencies:**
- `@adl-spec/core` — ADL document validation and types
- `openclaw` — OpenClaw plugin API (peer dependency)
- Optional: `nemoclaw` — NemoClaw integration (peer dependency)

### 5. Implementation Roadmap

| Phase | Deliverable | Description |
|-------|------------|-------------|
| **5.1** | Plugin scaffold | Basic `GatewayPlugin` with ADL document loading and validation |
| **5.2** | Lifecycle gating | Refuse retired agents, warn on deprecated, gate draft agents |
| **5.3** | Permission enforcement | Translate ADL permissions to runtime enforcement on tool invocations |
| **5.4** | Discovery endpoint | Serve `/.well-known/adl-agents` from the gateway |
| **5.5** | Governance API | REST API for querying agent passports and compliance status |
| **5.6** | NemoClaw bridge | Export ADL permissions to NemoClaw policy format, privacy router config |
| **5.7** | Data classification | Track sensitivity through agent operations, enforce high-water mark |

Phases 5.1–5.4 are the minimum viable product. Phases 5.5–5.7 depend on NemoClaw's config format stabilizing (currently early preview).

## Alternatives Considered

### Fork OpenClaw

Fork OpenClaw and embed ADL governance natively. **Rejected** — creates maintenance burden, fragments the ecosystem, and fights the "wrapper" pattern that the community has accepted via NemoClaw.

### Sidecar Process

Run the ADL governance layer as a separate sidecar process (like a service mesh proxy). **Rejected** — adds operational complexity. The plugin model is simpler, leverages OpenClaw's existing extension mechanism, and follows NemoClaw's approach.

### ADL-Native Runtime

Build a standalone ADL agent runtime that competes with OpenClaw. **Rejected** — ADL's strength is description, not execution. Building a runtime would duplicate OpenClaw's work and dilute ADL's focus.

### Spec-Only Approach

Only add §15.4 to the spec and let implementers figure out the runtime. **Rejected** — without a reference implementation, adoption would be slow. NemoClaw's success shows that a working stack drives adoption faster than a specification alone.

## References

- [ADL Specification v0.2.0](../versions/0.2.0/spec.md) — Sections 10 (Permissions), 11 (Security), 14 (Discovery), 15 (Interoperability)
- [ADL Governance Profile](../profiles/governance/1.0/) — Autonomy tiers, compliance frameworks
- [OpenClaw Plugin Documentation](https://docs.openclaw.ai/gateway/plugins)
- [NemoClaw Architecture](https://github.com/NVIDIA/NemoClaw) — Sandbox, policy engine, privacy router
- [OpenClaw Interoperability Proposal](./2026-03-21-openclaw-interoperability.md) — Companion proposal covering concept mapping and generator target
- [Research: OpenClaw](../research/openclaw.md) — Detailed platform analysis
- [Research: NemoClaw](../research/nemoclaw.md) — Detailed NemoClaw analysis
