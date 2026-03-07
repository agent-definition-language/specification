---
id: index
title: Examples
sidebar_position: 1
slug: /examples
description: Example ADL documents demonstrating minimal, intermediate, and production-ready agent definitions.
keywords: [adl, examples, agent definition, agentic ai, ai agent configuration, json, yaml, agent manifest]
---

# Examples

This section contains example Agent Definition Language (ADL) documents. They illustrate the specification and can be used to validate tooling.

> **Tip:** New to ADL? Start with the [Minimal Example](./minimal.yaml) to understand the required fields, then explore the [Production Example](./production.yaml) for a complete implementation.

## Example Index

| Example | Description |
|---------|-------------|
| [Minimal](./minimal.yaml) | Minimal valid ADL document with only required fields |
| [With Tools](./with-tools.yaml) | Calculator agent demonstrating tool definitions |
| [Production](./production.yaml) | Full production-style agent with all features |

## Conventions

- Examples are valid against the ADL version they target
- **Format:** YAML or JSON; must be valid JSON (RFC 8259) when processed
- **Encoding:** UTF-8
- **Member names:** `snake_case` (lowercase with underscores)
- **Required members:** `adl_spec`, `name`, `description`, `version`, `data_classification`
- **Versioning:** `adl_spec` and `version` use semantic versioning (`MAJOR.MINOR.PATCH`)
- **Timestamps:** ISO 8601 with timezone (e.g., `2026-02-15T14:30:00Z`)
- **Extensions:** Custom members use `x_` prefix (e.g., `x_acme_internal_id`)

## Quick Reference

The minimal valid ADL document:

```yaml title="minimal.adl.yaml"
adl_spec: "0.1.0"
name: Hello Agent
description: A simple greeting agent.
version: "1.0.0"

data_classification:
  sensitivity: public
```

> **Note:** ADL documents use the `.adl.yaml`, `.adl.json`, or `.adl` file extension. The media type is `application/adl+json`.

## Contributing Examples

New examples are welcome! To contribute:

1. Ensure the example conforms to the target spec version
2. Add clear comments explaining the example's purpose
3. Submit a PR with the example

See the [Contributing Guide](../../../CONTRIBUTING.md) for more information.
