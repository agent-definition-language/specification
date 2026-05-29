---
id: index
slug: /
title: Protocol
sidebar_position: 1
description: The ADL protocol layer — the normative procedures that give an agent's declarations force. Trust Protocol (counterparty procedures) and Runtime Protocol (runtime-governor procedures).
keywords: [adl, protocol, trust protocol, runtime protocol, passport verification, runtime governance, agent-to-agent]
---

# Protocol

ADL is specified as a **family of documents** built around one signed passport. The [ADL Core specification](/spec) is the single *declarative* document: it describes what an agent **is** and the limits it **declares**. Around it sits a **protocol layer** — an open set of *procedural* documents that define what an actor **MUST do** with those declarations, the layer that gives an agent's declarations force.

Core declares; the protocols enforce. A declared limit has force only when a protocol procedure acts on it.

## The protocol layer

Two protocols are defined today. The layer is open: further protocols may join it as new enforcement boundaries emerge.

| Document | Actor | When it acts | What it does |
|----------|-------|--------------|--------------|
| **[Trust Protocol](/protocol/trust)** | A counterparty (peer agent, gateway, registry) | Once, at **admission** | Verifies a passport, binds a request to a presentation proof, and authorizes agent-to-agent calls. |
| **[Runtime Protocol](/protocol/runtime)** | A runtime governor | Continuously, **after admission** | Enforces an agent's declared operational limits while it executes — budgets, iteration limits, sub-agent admission, oversight triggers, degradation, and anomaly detection. |

The split mirrors the two questions governance has to answer about an agent that wasn't fully specified in advance: *can I trust this agent before I let it act?* (Trust) and *is it still behaving within its declared limits while it acts?* (Runtime).

## Status

- The **[Trust Protocol](/protocol/trust)** is drafted: authentication (§1) and authorization (§2) procedures, with conformance test vectors tracking its section numbers.
- The **[Runtime Protocol](/protocol/runtime)** is an early draft — the runtime governor (§1), the enforcement procedures (§2–§7: budgets, iteration, sub-agent admission, oversight, degradation, anomaly), and the signed enforcement-evidence format (§8) are drafted; the completeness/witness tier (§8.8) is reserved.

Each protocol is numbered and versioned independently of ADL Core. Section references outside a protocol's own range refer to the [ADL Core specification](/spec).
