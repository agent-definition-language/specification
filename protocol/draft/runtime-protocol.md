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
**Status:** Draft — §1 (the runtime governor) is framed; the enforcement procedures (§2–§7) are reserved and not yet specified.

The **Runtime Protocol** defines the normative procedures a *runtime governor* performs to enforce an ADL agent's declared operational limits while the agent executes: budgets, iteration limits, sub-agent admission, human-oversight triggers, degradation, and anomaly detection. It sits in the ADL document family alongside the [ADL Core specification](/spec), which declares what an agent **is** and the limits it advertises, and the [Trust Protocol](/protocol/trust), which defines what a *counterparty* does to verify and authorize it; it is one document in ADL's open protocol layer. Where the Trust Protocol acts **once, at admission**, the Runtime Protocol acts **continuously, after admission**: it is the layer that gives an agent's declared operational limits force at runtime.

The declarative members these procedures operate on — `permissions.resource_limits`, `runtime.tool_invocation`, `permissions.sub_agents`, `human_oversight`, `runtime.degradation`, and `anomaly_baseline` — are defined by [ADL Core](/spec) and the governance profiles, which are authoritative for their syntax and constraints. This document references them but does not redefine them; it defines what a governor **MUST** do with them.

The Runtime Protocol is numbered independently as a standalone document: the runtime governor is §1 and the enforcement procedures are §2–§7. Section references outside this range — for example §9.6, §11.3, or §10.1 — refer to the [ADL Core specification](/spec).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

## 1 The Runtime Governor

The Trust Protocol's §1 defines the *counterparty* — the actor that decides, once, whether to admit an agent. This protocol defines a second actor, the **runtime governor**: the actor that holds an admitted agent to its declared operational limits on every step thereafter. Authentication asks *should this agent act?*; runtime governance asks *is it still acting within the limits it declared?* The two are complementary and independently conformant.

### 1.1 Role

The runtime governor is a **logical role**, not a prescribed component. Any element of a deployment with the authority to observe and intercept an agent's execution **MAY** act as the governor: the agent's own runtime, an AI gateway, a sidecar proxy, or an orchestrator. This protocol specifies the governor's responsibilities and authority, not its deployment shape.

Two distinctions matter:

- The governor is not **the runtime**. The runtime is the execution environment that runs the agent; the governor is the control authority *over* that environment. A single process **MAY** play both roles, but the responsibilities are separate — and §1.4 addresses the trust consequences when it does.
- The governor is not the **counterparty** (Trust Protocol §1). The counterparty makes a one-time admission decision from the passport and hands off; the governor acts continuously, for the lifetime of the session, against the passport the counterparty admitted (§1.3).

### 1.2 Decision and Enforcement

The governor operates a continuous **observe → decide → enforce** loop, decomposed into two functions adopted from the access-control model of [XACML] / [NIST.SP.800-162]:

- A **policy decision point (PDP)** evaluates the agent's declared limits (the members enumerated in §2–§7) against the observed state of the running session and returns a decision.
- A **policy enforcement point (PEP)** acts on that decision, with the authority to **observe**, **throttle**, **pause** (for oversight, §5), **halt**, or **escalate** execution.

§2–§7 define the *decisions* the PDP makes for each class of limit. §6 (Degradation) defines the *enforcement responses* the PEP applies when a limit is reached. This section defines only the actor that hosts both. A conforming governor **MUST** be able to enforce, not merely observe, to claim any tier above R1 (Conformance Tiers).

### 1.3 Binding to the Passport

The governor enforces against the **passport admitted for the session**. It does **not** re-authenticate the agent: passport verification is the counterparty's procedure (Trust Protocol §1.1), and the governor consumes its result. The separation is deliberate — authentication establishes *identity and integrity*; runtime governance establishes *conformance to declared limits*.

Two invariants bind the governor to that passport:

1. **Version pinning.** The governor **MUST** enforce against the exact passport version admitted at the start of the session — the same canonical bytes whose signature the counterparty verified (Trust Protocol §1.1.5).
2. **Anti-swap.** If the agent's declared limits change mid-session — a different passport, a re-signed passport, or any mutation of the members governed by §2–§7 — the governor **MUST NOT** silently adopt the new limits. It **MUST** treat the change as a session-integrity fault and apply the configured degradation response (§6), defaulting to fail-closed.

An agent's declared limits are therefore not advisory inputs to the runtime; they are the governor's enforcement contract for the session, fixed at admission.

### 1.4 Trust in the Governor

Because the governor **MAY** be operated by the same party that operates the agent (§1.1), its enforcement cannot be taken on faith: a party that benefits from an agent exceeding its limits could also operate a governor that declines to stop it. This is the **self-governance** problem, and this protocol does not pretend it away.

It is addressed by tiered evidence rather than by mandating separation:

- At **R1 (Observing)**, the governor's contribution is the **audit trail** — a record of the agent's resource use and limit boundaries that a third party can inspect after the fact. This is "document it," not "stop it."
- At **R2 (Enforcing)** and **R3 (Adaptive)**, a governor's enforcement **SHOULD** be **externally evidenced**: the governor produces verifiable evidence, bound to the admitted passport and session, that lets a counterparty distinguish a governor that *actually* enforced at a tier from one that merely *claimed* it.

The concrete evidence format — what an enforcement record attests, how it binds to the passport and session, and how a counterparty verifies it — is **reserved**, and will be specified alongside §7 (Anomaly Detection), with which it shares an audit substrate.

**Status:** §1.1–§1.3 are stable framing. §1.4's evidence mechanism and the per-tier normative requirements are not yet specified.

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

## References

- [XACML] — OASIS, *eXtensible Access Control Markup Language (XACML) Version 3.0* — the policy decision point / policy enforcement point (PDP/PEP) model adopted in §1.2.
- [NIST.SP.800-162] — NIST Special Publication 800-162, *Guide to Attribute Based Access Control (ABAC) Definition and Considerations*.
