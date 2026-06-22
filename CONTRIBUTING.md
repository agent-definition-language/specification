# Contributing to the ADL specification

The canonical contribution process, governance, and the CLA live in the
**[governance](https://github.com/agent-definition-language/governance)** repo —
start there: `CONTRIBUTING.md`, `GOVERNANCE.md`, `CHARTER.md`.

Quick orientation for this repo:

- **Editorial / small fixes** (typos, clarifications, examples): open a PR directly.
- **Normative changes** (anything that changes meaning, requirements, schemas, or
  conformance): open an RFC under [`proposals/`](./proposals) (or a linked issue) first.
- **Sign the CLA** — required before any merge; the bot will prompt on your first PR.
- **Change-control tiers:** the core spec (`core/`) is the highest bar; `protocol/`
  moves on its own cadence; `profiles/` are delegated to domain stewards with the central
  team controlling the profile registry. See `governance/CHARTER.md`.

Draft work happens in the open under `core/_next/`. Unformed ideas may incubate
privately and be promoted to a public proposal when ready.
