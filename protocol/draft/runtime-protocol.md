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
**Status:** Draft — the runtime governor (§1), the enforcement procedures (§2–§7), and the enforcement-evidence format (§8) are drafted; the completeness/witness tier (§8.8) is reserved.

The **Runtime Protocol** defines the normative procedures a *runtime governor* performs to enforce an ADL agent's declared operational limits while the agent executes: budgets, iteration limits, sub-agent admission, human-oversight triggers, degradation, and anomaly detection. It sits in the ADL document family alongside the [ADL Core specification](/spec), which declares what an agent **is** and the limits it advertises, and the [Trust Protocol](/protocol/trust), which defines what a *counterparty* does to verify and authorize it; it is one document in ADL's open protocol layer. Where the Trust Protocol acts **once, at admission**, the Runtime Protocol acts **continuously, after admission**: it is the layer that gives an agent's declared operational limits force at runtime.

The declarative members these procedures operate on — `permissions.resource_limits`, `runtime.tool_invocation`, `permissions.sub_agents`, `permissions.delegation`, `human_oversight`, `runtime.degradation`, and `anomaly_baseline` — are defined by [ADL Core](/spec) and the governance profiles, which are authoritative for their syntax and constraints. This document references them but does not redefine them; it defines what a governor **MUST** do with them.

The Runtime Protocol is numbered independently as a standalone document: the runtime governor is §1, the enforcement procedures are §2–§7, and the enforcement-evidence format is §8. Section references outside §1–§8 — for example §9.6, §11.3, or §10.1 — refer to the [ADL Core specification](/spec).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

## 1 The Runtime Governor

The Trust Protocol's §1 defines the *counterparty* — the actor that decides, once, whether to admit an agent. This protocol defines a second actor, the **runtime governor**: the actor that holds an admitted agent to its declared operational limits on every step thereafter. Authentication asks *should this agent act?*; runtime governance asks *is it still acting within the limits it declared?* The two are complementary and independently conformant.

![Consumption-versus-time chart of the runtime governor. The vertical axis is cumulative consumption (tokens, cost, wall-clock); the horizontal axis is session progress. A bold red horizontal line near the top is the declared budget ceiling, fixed at admission — the deterministic boundary the governor enforces, with a GOVERNOR marker stationed on it. Rising from the session-start origin is a fan of blue curves, each a possible run of the agent; four level off below the ceiling and complete within budget, while one keeps climbing and is halted at the moment it would cross the ceiling, marked with a red cross labelled fail-closed. A caption notes the fan is one representative set of runs and the next run differs — the conduct is emergent; only the ceiling and the governor are fixed. To the right, a deterministic activity diagram shows the governor's decision loop: observe (the PDP projects usage), decide whether projected usage exceeds the cap, permit and loop if not, otherwise enforce (the PEP resolves the section 6 degradation response) and either apply the declared response or, if none is declared, HALT as the fail-closed default. A footnote states the governor is the control authority over the runtime, not the runtime itself and not the admission-time counterparty, and that the boundary and decision loop are fixed while the trajectories are not.](./diagrams/runtime-governor-envelope.svg)

*Figure 1 (informative): The runtime governor holds an admitted agent to its declared limits. A declared limit is a fixed boundary — here a budget ceiling (`permissions.resource_limits.budget`), fixed at admission (§1.3) — while the agent's consumption is emergent: a fan of possible runs, most completing under budget while one is halted at the boundary, fail-closed by default (§2, §6). The inset is the governor's deterministic observe → decide → enforce loop (§1.2). This figure is illustrative; the normative requirements are stated in the text.*

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

![State machine of the governor's binding to the passport. At session start the admitted passport is pinned to its exact canonical bytes — the version whose signature the counterparty verified — moving the governor into a governing state where it enforces against those pinned bytes on every step; while the bytes are unchanged it loops and continues. If the declared limits change mid-session — a different passport, a re-signed passport, or any mutation of the members governed by sections 2 to 7 — the governor must not silently adopt them; it transitions to a session-integrity fault state and applies the configured degradation response, defaulting to fail-closed (halt), so the swapped limits are never adopted.](./diagrams/anti-swap-version-pinning.svg)

*Figure 2 (informative): The admitted passport is pinned at session start; every step is checked against the pin. A mid-session change is treated as a session-integrity fault and fails closed by default — a swap is a fault, not an update. This figure is illustrative; §1.3 is authoritative.*

### 1.4 Trust in the Governor

Because the governor **MAY** be operated by the same party that operates the agent (§1.1), its enforcement cannot be taken on faith: a party that benefits from an agent exceeding its limits could also operate a governor that declines to stop it. This is the **self-governance** problem, and this protocol does not pretend it away.

It is addressed by tiered evidence rather than by mandating separation:

- At **R1 (Observing)**, the governor's contribution is the **audit trail** — a record of the agent's resource use and limit boundaries that a third party can inspect after the fact. This is "document it," not "stop it."
- At **R2 (Enforcing)** and **R3 (Adaptive)**, a governor's enforcement **SHOULD** be **externally evidenced**: the governor produces verifiable evidence, bound to the admitted passport and session, that lets a counterparty distinguish a governor that *actually* enforced at a tier from one that merely *claimed* it.

The concrete evidence format — what an enforcement record attests, how it binds to the passport and session, and how a counterparty verifies it — is specified in **§8 (Enforcement Evidence)**. That mechanism provides tamper-evidence and freshness but **not** completeness; detecting omission by a self-interested operator is the reserved witness tier (§8.8).

**Status:** §1.1–§1.3 are stable framing. §1.4's evidence mechanism is specified in §8; the per-tier normative requirements continue to firm up.

## 2 Budget Enforcement

This section defines how the governor (§1) enforces the budget envelope declared in [ADL Core §9.6](/spec/next#96-resource-limits): `permissions.resource_limits.budget`, capping `tokens`, `cost_usd`, and `wall_clock_sec` per session and per day.

The governor's PDP (§1.2) **MUST** maintain cumulative counters for each declared `budget` dimension, scoped per session (§1.3) and per rolling 24-hour day. Before the PEP admits a step that consumes a budgeted resource — a model call (tokens, cost) or any execution (wall-clock) — the PDP **MUST**:

1. **Project usage.** Compute projected cumulative usage as the current counter plus the step's expected consumption, for each declared dimension and scope.
2. **Compare to caps.** For each declared cap, if projected usage would exceed it, the dimension is **exhausted** for that scope.
3. **Decide.** If no declared cap would be exceeded, return *permit*. If any would, return *budget-exhausted*, identifying the dimension (`tokens` / `cost_usd` / `wall_clock_sec`) and scope (`per_session` / `per_day`).
4. **Enforce.** On *budget-exhausted*, the PEP **MUST** apply the degradation response keyed `on_budget_exhausted` (§6), **defaulting to fail-closed** (halt the session) when no response is declared.
5. **Record.** The governor **MUST** record the boundary event (which cap, which scope, observed versus limit) in its audit trail (§1.4), regardless of tier.

Cost accounting — mapping token counts and tool calls to `cost_usd` — is governor-specific. A governor claiming R2 or above on the `cost_usd` dimension **MUST** document its cost model.

**Sub-agent personas draw down the parent's envelope.** When the agent spawns subordinate personas ([Core §9.7.1](/spec/next#971-sub-agents-personas)), their consumption is **not** metered separately: a persona acts under the parent's identity, so the governor **MUST** count persona tokens, cost, and wall-clock against the parent's `budget` counters in **aggregate** (parent plus all personas), and **MUST** additionally enforce a persona's `budget_share` against that persona's own consumption when declared. The parent's caps are therefore the ceiling for the whole persona fan-out, not per-persona. (A separately-identified *peer*, by contrast, carries its own `budget` and is governed under §4.2.)

**Conformance.** At **R1** the governor tracks usage against caps and records boundary events but does not block. At **R2** it **MUST** block any step that would exceed a declared cap and apply §6 degradation. At **R3** the boundary events additionally feed the anomaly substrate (§7).

## 3 Iteration Control

This section defines how the governor enforces the iteration limits declared in [ADL Core §11.3](/spec/next#113-tool-invocation): `max_iterations`, `max_tool_calls_per_session`, and `loop_detection`.

The governor's PDP (§1.2) **MUST** maintain, per session (§1.3), a count of reason→act iterations and a count of tool invocations, and **MUST** retain a sliding window of the most recent steps when `loop_detection` is declared. Before the PEP admits a step, the PDP **MUST**:

1. **Count.** Increment the projected iteration and tool-call counts for the step.
2. **Check hard limits.** If the projected count would exceed `max_iterations` or `max_tool_calls_per_session`, the limit is reached.
3. **Detect loops.** When `loop_detection` is declared, examine the last `window` steps; if the step would repeat a prior step's signature (same tool and equivalent arguments) beyond a governor-defined repetition threshold, a loop is detected. How signatures are computed is governor-specific and **MUST** be documented when claiming R2+ on loop detection.
4. **Decide and enforce.** On a reached limit or detected loop, resolve the degradation response (§6): for a detected loop, `loop_detection.on_detected` if present, otherwise `runtime.degradation.on_iteration_limit`; for a hard limit, `runtime.degradation.on_iteration_limit`. Absent either, **fail closed** (halt).
5. **Record.** Record the boundary or loop event in the audit trail (§1.4).

**Conformance.** At **R1** the governor counts iterations and tool calls and flags loops without blocking. At **R2** it **MUST** block on a reached limit or detected loop and apply §6. At **R3** loop and limit events feed the anomaly substrate (§7).

## 4 Sub-Agent Spawning and Peer Delegation

ADL Core §9.7 declares two ways an agent brings other agents into its work, distinguished by identity, and the governor treats them differently because only one crosses a trust boundary:

- **Sub-agents** ([Core §9.7.1](/spec/next#971-sub-agents-personas)) are subordinate **personas** spawned under the parent's own identity. There is no passport to verify and no counterparty — the governor *caps* them, it does not *admit* them.
- **Delegation** ([Core §9.7.2](/spec/next#972-delegation-external-peers)) engages a separately-identified **peer**. This crosses a trust boundary and is the case that requires admission.

### 4.1 Sub-agent (persona) capping

When the agent attempts to spawn a persona declared in `permissions.sub_agents`, the governor's PDP (§1.2) **MUST**, before the PEP admits the spawn:

1. **Match the persona.** The persona **MUST** correspond to a declared `sub_agents[]` entry by `name`; a spawn naming no declared persona is **not** permitted (deny-by-default). The governor **MUST NOT** grant the persona any tool outside its declared `tools` subset (or the parent's tools when `tools` is omitted), and never a tool the parent itself lacks.
2. **Check concurrency.** Reject the spawn if it would exceed the persona's `max_parallel` or the parent's `resource_limits.max_concurrent` (§9.6).
3. **Account against the parent.** Persona consumption draws down the parent's envelope: the governor **MUST** count a persona's tokens, cost, and wall-clock against the parent's `budget` (§2) in **aggregate**, and against the persona's `budget_share` when declared. A persona does **not** receive a fresh budget.
4. **Decide and enforce.** If any check fails, the spawn is denied; the PEP resolves `runtime.degradation.on_sub_agent_denied` (§6), defaulting to fail-closed (do not spawn).
5. **Record.** Record the spawn decision (persona `name`, matched rule, aggregate draw-down) in the audit trail (§1.4).

A persona is **never** admitted as a counterparty: there is no passport, no delegation chain, and no attenuation to verify, because the persona acts under the parent's identity and its authority is a subset of the parent's by construction.

### 4.2 Peer (external) admission

When the agent attempts to delegate to a separately-identified peer, the governor's PDP (§1.2) **MUST**, before the PEP admits the delegation, evaluate the peer against `permissions.delegation`:

1. **Match identity.** Resolve the prospective peer's identifier and evaluate it against `match` and `deny` per §4.4 patterns. `deny` overrides `match`; an identifier matching no `match` pattern is **not** permitted (deny-by-default).
2. **Check depth.** Reject the delegation if it would exceed `max_depth` relative to the root of the current delegation chain.
3. **Check attenuation.** When `attenuation.scopes_subset` is set, the peer's passport `security.scopes` **MUST** be a subset of this agent's ceiling; when `attenuation.budget_subset` is set, its `budget` caps **MUST** be ≤ this agent's. This composes with — and does not replace — the Trust Protocol's delegation-chain verification, which establishes the peer's identity and the chain's integrity.
4. **Decide and enforce.** If any check fails, the delegation is denied; the PEP resolves `runtime.degradation.on_delegation_denied` (§6), defaulting to fail-closed (do not delegate).
5. **Record.** Record the admission decision (peer identity, matched rule, attenuation result) in the audit trail (§1.4).

**Conformance.** At **R1** the governor records prospective spawns and delegations and what the decision *would* be; it does not block. At **R2** it **MUST** enforce persona caps (§4.1) and peer admission (§4.2) and apply §6 on denial. At **R3** spawn and delegation patterns feed the anomaly substrate (§7).

## 5 Oversight Triggers

This section defines how the governor evaluates the human-oversight triggers declared in the [Governance Profile](/profiles/governance/specification) (`human_oversight.triggers`), including the structured predicate form, and the pause/timeout behavior they impose.

For each declared trigger, the governor's PDP (§1.2) **MUST**, before the PEP admits a step:

1. **Evaluate predicates.** For a structured trigger, evaluate its `when` predicates against the step and session state: `cost_usd_over` against the §2 cost counter, `data_classification_at_least` against the step's data classification, `tool` against the tool about to be invoked, and `path_matches` against the target path (§4.4 patterns). The trigger fires when **all** its predicates hold. Free-text triggers are evaluated by governor-specific detection.
2. **Pause on fire.** When a trigger fires, the PEP **MUST** pause execution (degradation action `pause`, §6) and request human review through the declared `intervention_model`.
3. **Time out.** If no reviewer responds within `human_oversight.response_time_minutes`, the governor resolves `runtime.degradation.on_oversight_timeout` (§6), defaulting to fail-closed (halt). The agent **MUST NOT** proceed unreviewed.
4. **Resume.** Execution resumes only on explicit approval per the `intervention_model` (`approve_reject` or `plan_editing`); `monitor_only` does not gate execution.
5. **Record.** Record the trigger firing, the review outcome, and any timeout in the audit trail (§1.4).

Independently of the Governance Profile, a governor **MUST** treat any tool declaring `requires_confirmation: true` ([ADL Core §8.1](/spec/next#81-tools)) as an always-on oversight trigger: the governor **MUST** obtain explicit human approval before such a tool is invoked and **MUST NOT** invoke it autonomously, regardless of whether `human_oversight` is declared. This is a Core-level control and applies even when no Governance Profile is present.

Structured triggers let the governor evaluate oversight conditions mechanically. Free-text triggers require governor-specific interpretation and are best treated as R1 signals unless the governor can detect them reliably.

**Conformance.** At **R1** the governor records trigger evaluations without pausing. At **R2** it **MUST** pause on a fired trigger and enforce the response-time timeout. At **R3** trigger firings feed the anomaly substrate (§7).

## 6 Degradation

This section defines how the governor responds when a limit fires or a fault occurs. Responses are declared in [ADL Core §11.5](/spec/next#115-degradation) as `runtime.degradation`, a map from *cause* (`on_budget_exhausted`, `on_iteration_limit`, `on_sub_agent_denied`, `on_delegation_denied`, `on_oversight_timeout`, `on_tool_error`, `on_anomaly`, …) to a *response* whose `action` is one of `halt`, `pause`, `fallback`, or `continue`.

![Activity diagram of the degradation procedure. A cause fires — budget exhausted, iteration limit, sub-agent denied, oversight timeout, tool error, or anomaly. The governor looks up the cause in the declared runtime.degradation map. If a response is declared, it applies the declared action: halt terminates the session, pause suspends and escalates for human oversight, fallback substitutes a declared value and continues, or continue proceeds despite the cause — continue is fail-open and must be explicitly declared and recorded with the cause it overrode. If no response is declared, the governor must halt the session: absence of a declared response is not consent to continue; this fail-closed default is the core of teeth at runtime. Every degradation event, including whether the fail-closed default applied, is recorded in the audit trail.](./diagrams/degradation-fail-closed.svg)

*Figure (informative): A fired cause either resolves to a declared response (halt, pause, fallback, or the explicit fail-open continue) or, when no response is declared, halts the session — the fail-closed default. This figure is illustrative; the procedure below (and Core §11.5) is authoritative.*

This is the shared response procedure that §2–§5 and §7 invoke. When a cause fires, the governor's PEP (§1.2) **MUST** resolve the response as follows:

1. **Look up the cause.** If `runtime.degradation` declares a response for the fired cause, apply it (step 3).
2. **Fail closed on absence.** If no response is declared for the cause, the governor **MUST** halt the session. Absence of a degradation response is **not** consent to continue — this default is the core of "teeth at runtime": a limit with no declared handling stops the agent rather than waving it through.
3. **Apply the action.**
   - `halt` — terminate the session; no further steps execute.
   - `pause` — suspend execution and escalate for human oversight (§5); resume only on explicit approval.
   - `fallback` — substitute the declared `value` / `message` for the blocked step and continue.
   - `continue` — proceed despite the cause. This is **fail-open** and **MUST** be explicit; the governor **MUST** record every `continue` in the audit trail (§1.4) together with the cause it overrode.
4. **Record.** Every degradation event — the cause, the resolved action, and whether the fail-closed default applied — is recorded in the audit trail (§1.4).

The Core `runtime.error_handling.fallback_behavior` member (§11.4) is treated as the `on_tool_error` cause; when both are present, `runtime.degradation.on_tool_error` governs.

**Conformance.** At **R1** the governor records which cause fired and what response *would* apply, but does not alter execution. At **R2** and above it **MUST** apply the resolved response, including the fail-closed default.

## 7 Anomaly Detection

This section defines how the governor monitors a session against the agent's declared [`anomaly_baseline`](/profiles/governance/specification) (Governance Profile) — expected tool-call distribution, per-session cost range, and the data classes the agent typically touches — and how it responds to deviation.

The governor's PDP (§1.2) **MUST**, over the course of a session, compare observed behavior against the declared baseline:

1. **Track.** Accumulate the session's tool-call distribution, cost (reusing the §2 counters), and the data classes touched.
2. **Compare.** Flag deviation when the session invokes a tool outside `expected_tools`, its cost falls outside `cost_per_session_usd`, or it touches a data class outside `data_classes`. How far a session may drift before it is "material" is governor-defined and **MUST** be documented when claiming R3.
3. **Respond.** On material deviation, the governor resolves `runtime.degradation.on_anomaly` (§6), defaulting to fail-closed (halt). Because anomaly is a softer signal than a hard limit, a `pause` (escalate to §5 oversight) is often the appropriate declared response.
4. **Evidence.** The governor **MUST** record the deviation as an enforcement event in the signed record of **§8**, so a counterparty can distinguish a governor that *actually* monitors (R3) from one that merely claims it. An anomaly is the `on_anomaly` cause; the record's tamper-evidence and freshness properties (§8.1) apply, and completeness remains subject to the reserved witness tier (§8.8).

Because the baseline is self-declared by the agent, anomaly detection against it is only as strong as the baseline is honest; its governance value depends on the §8 evidence being externally verifiable.

**Conformance.** Anomaly detection is **R3**. At **R1**/**R2** a governor **MAY** record baseline deviation but is not required to act on it; at **R3** it **MUST** monitor against a declared baseline and apply §6 on material deviation.

## 8 Enforcement Evidence

§1.4 requires that, at R2 and above, a governor's enforcement be *externally evidenced* so a counterparty can distinguish a governor that actually enforced from one that merely claims a tier. This section specifies that evidence: a signed, per-session **enforcement record**.

![Data-structure diagram of an ADL enforcement record. At the top is the record header, binding the record to a governor identity, the subject agent by passport digest (the version pin), the session and tier, the time window, and an optional counterparty nonce for freshness. Below it is an ordered chain of enforcement events, each carrying a sequence number, the cause that fired, the section 6 action applied, a timestamp, and a prev_hash field; an arrow from each event's prev_hash points back to the previous block — event zero's prev_hash is the SHA-256 of the header, each later event's is the SHA-256 of the prior event — so any alteration, reordering, or deletion breaks a link. At the bottom, the governor's signature seals the whole chain. A callout states what the evidence proves (tamper-evidence, and freshness with a nonce) and what it does not (completeness — the reserved witness tier).](./diagrams/enforcement-evidence-record.svg)

*Figure 1 (informative): An enforcement record binds a governor's signature over a hash-chained event sequence to the admitted passport (by digest) and, optionally, a counterparty nonce. The structure and its verification (§8.6) are deterministic; what the record proves — tamper-evidence and freshness, but not completeness (§8.1) — is fixed by that structure. This figure is illustrative; the normative structure is the table in §8.3.*

### 8.1 Trust model — what the evidence proves, and what it does not

Because a governor **MAY** be operated by the same party as the agent (§1.1), evidence must be read with a clear understanding of its guarantees:

- **Tamper-evidence (provided).** The record is signed by the governor and its events are hash-chained, so a counterparty can detect any *alteration, reordering, or deletion* of recorded events.
- **Freshness and interaction-binding (provided).** A counterparty **MAY** seed the record with a nonce (§8.5); a record carrying that nonce could only have been produced after the challenge, so a governor cannot satisfy the counterparty with a stale or pre-fabricated record.
- **Completeness (NOT provided at this tier).** Signing and chaining cannot prove that an event the governor *never recorded* did not occur. A self-interested operator can still under-report. Detecting omission requires third-party witnessing; that is the reserved higher-assurance tier in §8.8. The evidence in this section is honest about stopping short of it.

### 8.2 The governor's identity

The governor is a first-class identified actor. The record's `governor` field is an identifier — an HTTPS URI or `did:web` — that resolves to a verification key exactly as a passport `id` does (Trust Protocol §1.1.3). The governor's identity **MAY** itself be an ADL passport. A counterparty resolves and pins the governor key the same way it resolves an agent's, reusing the §10.2 attestation and §1.1.5 signature machinery.

### 8.3 Enforcement record structure

An enforcement record **MUST** be a JSON object with the following members:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `adl_enforcement_record` | string | REQUIRED | Format version. **MUST** be `"1.0"`. |
| `governor` | string | REQUIRED | The governor's identifier (HTTPS URI or `did:web`), resolved to its key per §8.2. |
| `subject` | object | REQUIRED | The admitted agent: `id` (the passport `id`) and `passport_digest` (the digest of the JCS-canonical admitted passport bytes, per the §1.3 version pin). |
| `session` | string | REQUIRED | Identifier of the governed session (§1.3). |
| `tier` | string | REQUIRED | The tier the governor enforced for this session: `"R1"`, `"R2"`, or `"R3"`. |
| `window` | object | REQUIRED | `start` / `end` ISO 8601 timestamps spanning the session. |
| `iat` | string | REQUIRED | ISO 8601 time the record was issued. |
| `nonce` | string | OPTIONAL | A counterparty-issued nonce (§8.5), when freshness binding is required. |
| `limits` | object | OPTIONAL | Summary of the declared limits in force (the §2–§7 members the governor enforced). |
| `events` | array | REQUIRED | Ordered, hash-chained enforcement events (§8.4). MAY be empty when no limit fired. |
| `outcome` | string | REQUIRED | Session outcome: `"completed"`, `"halted"`, or `"paused"`. |
| `signature` | object | REQUIRED | Signature over the JCS-canonical record minus `signature`, by the governor's key. Same shape as §10.2 attestation signatures (Ed25519 RECOMMENDED). |

Each `events[]` entry **MUST** contain `seq` (0-based index), `cause` (`on_budget_exhausted`, `on_iteration_limit`, `on_sub_agent_denied`, `on_delegation_denied`, `on_oversight_timeout`, `on_tool_error`, `on_anomaly`), `action` (the §6 action applied), `at` (ISO 8601), and `prev_hash` (§8.4); it **MAY** contain `detail`. When the event was produced by a subordinate persona ([Core §9.7.1](/spec/next#971-sub-agents-personas)), the governor **SHOULD** record the persona's `name` in `detail` (e.g. `"persona": "doc-reviewer"`), so the account can attribute conduct to the persona that produced it — without implying the persona was a separately-admitted party. The record's `subject` remains the parent agent, since the persona acts under the parent's identity.

### 8.4 Event hash-chaining

Events are chained so their order and integrity are self-checking and to provide the anchor points the §8.8 witness tier attests:

- `events[0].prev_hash` **MUST** be the SHA-256, base64url-encoded, of the JCS-canonical record *header* (the record minus `events` and `signature`).
- `events[i].prev_hash` (i > 0) **MUST** be the SHA-256, base64url-encoded, of the JCS-canonical bytes of `events[i-1]`.

A verifier recomputes the chain; any altered, reordered, or removed event breaks a `prev_hash` link. The governor's `signature` over the full record (including `events`) seals the chain at session end.

### 8.5 Counterparty-seeded binding

A counterparty **MAY** require a fresh record bound to its own challenge, using the nonce mechanism of Trust Protocol §1.2.7: the counterparty issues a nonce (e.g. `WWW-Authenticate: ADL nonce="…"`), and the governor **MUST** include it as the record's `nonce` so it is covered by the signature. A record carrying the counterparty's nonce demonstrably post-dates the challenge, defeating stale or pre-fabricated evidence for that interaction. Deployments handling `restricted` data (§10.1) **SHOULD** require it.

### 8.6 Verification procedure

A counterparty verifying an enforcement record **MUST**:

1. **Schema-validate** the record against `schema-enforcement-record.json`.
2. **Resolve the governor key** from `governor` per §8.2 (Trust Protocol §1.1.3 identity resolution).
3. **Verify the signature** over the JCS-canonical record minus `signature` (Trust Protocol §1.1.5).
4. **Bind to the passport.** Confirm `subject.passport_digest` matches the digest of the passport admitted for the session (§1.3 version pin); a mismatch means the evidence is for a different passport version and **MUST** be rejected.
5. **Verify the nonce** (when the counterparty issued one): it **MUST** equal the issued value and be within its TTL (§1.2.7 semantics).
6. **Verify the hash-chain** per §8.4; a broken link **MUST** cause rejection.
7. **Interpret honestly.** A valid record is tamper-evidence of *what the governor recorded* at the stated tier — not proof of completeness (§8.1). A counterparty **MUST NOT** treat a valid record as proof that no unrecorded violation occurred.

### 8.7 Conveyance

A governor **MAY** convey the record inline to a counterparty on request (the agent-to-agent analog of returning a presentation proof) and **MAY** publish it to the agent's governance record (the `governance_record_ref` of the Governance Profile), where operational evidence is expected to live. The record is self-contained: its signature and `subject.passport_digest` make it verifiable wherever it is obtained.

### 8.8 Completeness and the witness tier (reserved)

Detecting *omission* — not just alteration — requires a third party that sees records independently of the operator. A future higher-assurance tier anchors each record (or its event-chain checkpoints, §8.4) in an append-only, third-party-witnessed transparency log, so a gap in an agent's record sequence is itself detectable. The log protocol, witness model, and the conformance tier that requires it are **reserved**; the record format in §8.3 is designed to anchor into such a log without change.

## Conformance Tiers

A runtime governor advertises the tier of enforcement it implements. Tiers are cumulative.

| Tier | Name | A governor at this tier… |
|------|------|--------------------------|
| **R1** | Observing | Observes and records the agent's resource use, tool calls, and limit boundaries; does not block. Provides the audit trail. |
| **R2** | Enforcing | Blocks on declared hard limits (budgets §2, iteration caps §3, sub-agent admission §4) and applies `runtime.degradation` (§6), fail-closed on absence; **SHOULD** produce signed enforcement evidence (§8). |
| **R3** | Adaptive | R2 plus continuous anomaly-baseline monitoring (§7) and structured oversight-trigger escalation (§5); enforcement evidence (§8) is expected. |

**Status:** Tier definitions are provisional; their normative conformance requirements continue to firm up.

## IANA Considerations

This document requests no IANA registrations. The enforcement record (§8) is a JSON document whose format version is carried in-band in its `adl_enforcement_record` member (`"1.0"`) and whose structure is validated by `schema-enforcement-record.json` (§8.3); it is conveyed inline on request or published to the agent's governance record (§8.7) without a dedicated HTTP field or media type. Should a media type for the enforcement record be desired in a future revision (for example `application/adl-enforcement-record+json`), it would be registered through the IANA media-types registry at that time; no such registration is requested here.

## Security Considerations

The runtime governor's security model is developed normatively in §1.4 (Trust in the Governor) and §8.1 (what the evidence proves); this section consolidates it for review.

**Self-governance is the central limitation.** The governor **MAY** be operated by the same party as the agent (§1.1), so its enforcement cannot be taken on faith. The protocol addresses this with tiered, externally-verifiable evidence (§8) rather than by mandating separation: an enforcement record lets a counterparty distinguish a governor that *actually* enforced at a tier from one that merely claims it.

**The evidence proves tamper-evidence and freshness, not completeness.** A signed, hash-chained record (§8.4) detects alteration, reordering, or deletion of recorded events, and a counterparty-issued nonce (§8.5) defeats stale or pre-fabricated records — but a valid record does **not** prove that no *unrecorded* violation occurred. Detecting omission by a self-interested operator requires an independent witness and is the reserved tier of §8.8 (the [RFC6962] transparency-log model); counterparties **MUST NOT** read a valid record as proof of completeness (§8.1).

**Fail-closed is a security property.** Absence of a declared degradation response halts the session (§6): a limit with no declared handling stops the agent rather than waving it through. Implementations **MUST** preserve this default and **MUST** record any explicit `continue` (fail-open) override together with the cause it overrode (§6).

**The admitted passport is pinned.** The governor enforces against the exact canonical passport bytes admitted at session start (§1.3); any mid-session change to the governed members is a session-integrity fault that fails closed, preventing silent limit-swapping during a session.

**Governor key trust.** The governor is a first-class identified actor whose key is resolved and verified with the same machinery as a passport (§8.2, Trust Protocol §1.1.3/§1.1.5); the did:web and TLS trust-anchor considerations in the Trust Protocol's Security Considerations apply equally to the governor's identity.

## References

### Normative References

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, <https://www.rfc-editor.org/info/rfc2119>.
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, <https://www.rfc-editor.org/info/rfc8174>.
- **[RFC8785]** Rundgren, A., Jordan, B., and S. Erdtman, "JSON Canonicalization Scheme (JCS)", RFC 8785, <https://www.rfc-editor.org/info/rfc8785>. Used to canonicalize an enforcement record before signing and verifying (§8.3–§8.6).
- **[ADL-CORE]** Nederveld, T., "Agent Definition Language (ADL)", the Core document of this specification family; see [/spec](/spec).
- **[ADL-TRUST]** Nederveld, T., "ADL Trust Protocol", the companion authentication and authorization document; the governor resolves and verifies its own key with the Trust Protocol's §1.1.3/§1.1.5 machinery; see [/protocol/trust](/protocol/trust).

### Informative References

- **[XACML]** OASIS, "eXtensible Access Control Markup Language (XACML) Version 3.0", OASIS Standard, January 2013. The policy decision point / policy enforcement point (PDP/PEP) model adopted in §1.2.
- **[NIST.SP.800-162]** Hu, V., et al., "Guide to Attribute Based Access Control (ABAC) Definition and Considerations", NIST Special Publication 800-162, <https://doi.org/10.6028/NIST.SP.800-162>.
- **[RFC6962]** Laurie, B., Langley, A., and E. Kasper, "Certificate Transparency", RFC 6962, <https://www.rfc-editor.org/info/rfc6962>. The witness model the reserved completeness tier (§8.8) draws on.
