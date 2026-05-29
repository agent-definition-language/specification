---
id: runtime-protocol
slug: /runtime
title: "Runtime Protocol"
description: "The Runtime Protocol — normative procedures a runtime governor performs to enforce an agent's declared operational limits during execution."
keywords: [adl, runtime protocol, runtime governance, runtime governor, budget, iteration control, human oversight, anomaly detection, degradation]
toc_max_heading_level: 3
hide_table_of_contents: false
---

# Runtime Protocol

**Version:** 0.1.0-draft
**Status:** Draft — sections are reserved; normative bodies are not yet specified.

The **Runtime Protocol** defines the normative procedures a *runtime governor* performs to enforce an ADL agent's declared operational limits while the agent executes: budgets, iteration limits, sub-agent admission, human-oversight triggers, degradation, and anomaly detection. It sits in the ADL document family alongside the [ADL Core specification](/spec), which declares what an agent **is** and the limits it advertises, and the [Trust Protocol](/protocol/trust), which defines what a *counterparty* does to verify and authorize it; it is one document in ADL's open protocol layer. Where the Trust Protocol acts **once, at admission**, the Runtime Protocol acts **continuously, after admission**: it is the layer that gives an agent's declared operational limits force at runtime.

The declarative members these procedures operate on — `permissions.resource_limits`, `runtime.tool_invocation`, `permissions.sub_agents`, `human_oversight`, `runtime.degradation`, and `anomaly_baseline` — are defined by [ADL Core](/spec) and the governance profiles, which are authoritative for their syntax and constraints. This document references them but does not redefine them; it defines what a governor **MUST** do with them.

The Runtime Protocol is numbered independently as a standalone document: the runtime governor is §1 and the enforcement procedures are §2–§7. Section references outside this range — for example §9.6, §11.3, or §10.1 — refer to the [ADL Core specification](/spec).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

## 1 The Runtime Governor

The **runtime governor** is the actor that enforces this protocol: a control point interposed between an agent and the resources, tools, and sub-agents it invokes, with the authority to observe, throttle, pause, or halt execution. It is a distinct actor from the Trust Protocol's *counterparty*: the counterparty makes a one-time admission decision from the passport, then hands off; the governor holds session state and acts on every step thereafter.

The governor's authority binds to the **same signed passport** the counterparty verified. An agent's declared operational limits are not merely advisory inputs to the runtime — they are the governor's enforcement contract. A limit that no governor enforces is a declaration without force; this protocol defines the procedures that supply that force.

**Status:** Not yet specified. The governor's binding to the verified passport, its required state, and its halt/escalation authority will be specified here.

## 2 Budget Enforcement

Enforcement of `permissions.resource_limits.budget` — token, cost (USD), and wall-clock limits scoped per session and per day. Fills in the declarative member proposed for ADL Core §9.6.

**Status:** Not yet specified.

## 3 Iteration Control

Enforcement of iteration and tool-call limits and loop detection — `max_iterations`, `max_tool_calls_per_session`, and `loop_detection` (detection window and `on_detected` behavior). Fills in the declarative member proposed for ADL Core §11.3.

**Status:** Not yet specified.

## 4 Sub-Agent Admission

Admission of delegated sub-agents against `permissions.sub_agents` (`allowed` / `denied` and attenuation hints), composing with the Trust Protocol's delegation-chain verification.

**Status:** Not yet specified.

## 5 Oversight Triggers

Evaluation of `human_oversight.triggers` — including the structured predicate form (cost threshold, data classification, tool name, partial-path pattern) proposed for Governance Profile 1.1 — and the pause-for-review and timeout behavior they impose.

**Status:** Not yet specified.

## 6 Degradation

Behavior when a limit is reached or an error occurs, driven by `runtime.degradation` keyed by cause (`on_budget_exhausted`, `on_iteration_limit`, `on_oversight_timeout`, `on_tool_error`, …). Default-on-absence is **fail-closed**.

**Status:** Not yet specified.

## 7 Anomaly Detection

Monitoring against a declared `anomaly_baseline` — expected tool-call distribution, cost-per-session range, and the data classes the agent typically touches — and the governor's response when a session deviates.

**Status:** Not yet specified.

## Conformance Tiers

A runtime governor advertises the tier of enforcement it implements. Tiers are cumulative.

| Tier | Name | A governor at this tier… |
|------|------|--------------------------|
| **R1** | Observing | Observes and records the agent's resource use, tool calls, and limit boundaries; does not block. Provides the audit trail. |
| **R2** | Enforcing | Blocks on declared hard limits (budgets §2, iteration caps §3, sub-agent admission §4) and applies `runtime.degradation` (§6), fail-closed on absence. |
| **R3** | Adaptive | R2 plus continuous anomaly-baseline monitoring (§7) and structured oversight-trigger escalation (§5). |

**Status:** Tier definitions are provisional; their normative conformance requirements are not yet specified.
