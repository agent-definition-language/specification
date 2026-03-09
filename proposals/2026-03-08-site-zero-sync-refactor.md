# Proposal: Site Zero-Sync Refactor

**Date:** 2026-03-08
**Status:** Approved
**Scope:** Site build pipeline

## Problem

The documentation site requires three pre-build sync scripts (`sync-spec`, `sync-profiles`, `prebuild`) that copy and transform content from source locations into `site/docs/`. This creates:

- Generated files that must be gitignored
- Duplication between source and site content
- A fragile pipeline where content can drift out of sync
- Version-coupled example pages that live outside their version directory

## Solution

Eliminate all sync scripts. Use Docusaurus multi-instance docs plugins and remark plugins so the site reads directly from source locations.

### Target Pipeline

```
docusaurus build    # That's it
```

### Architecture

Three Docusaurus docs plugin instances:

| Instance | Source Path | Route | Content |
|----------|-----------|-------|---------|
| `default` | `site/docs/` | `/` | Site-specific pages (contributing, governance, implementations, standardization) |
| `spec` | `../versions/0.1.0/` | `/` | Spec, examples, snippets |
| `profiles` | `../profiles/` | `/profiles` | Profile overviews, specifications, examples |

### Content Ownership

All versioned content lives with its version:

| Content | Source Location |
|---------|---------------|
| Specification | `versions/0.1.0/spec.md` |
| Spec examples | `versions/0.1.0/examples/*.md` + `*.yaml` |
| Examples README | `versions/0.1.0/examples/README.md` |
| Profile overviews | `profiles/{id}/README.md` |
| Profile specs | `profiles/{id}/1.0/profile.md` |
| Profile examples | `profiles/{id}/1.0/examples/*.md` + `*.json` |

Site-only content stays in `site/docs/`:
- `contributing.md`
- `governance.md`
- `implementations.md`
- `standardization/roadmap.md`

### Remark Plugins (`site/src/remark/`)

Replace string-regex transforms with AST-level remark plugins:

1. **`remark-profile-badge`** — `**Identifier:**` lines → `<div className="profile-badge">` table
2. **`remark-blockquote-admonitions`** — `> **Note:**` / `> **Regulatory Disclaimer:**` / `> **Tip:**` → `:::` directives
3. **`remark-rewrite-links`** — Repo-relative links → site paths or GitHub URLs
4. **`remark-strip-sections`** — Remove Specification/Maintainers/See Also sections (README only)
5. **`remark-version-badge`** — `**Version:**` lines → `<div className="version-badge">` table
6. **`remark-wrap-example`** — Wraps `## N. Example` with `:::info` admonition
7. **`remark-wrap-validation`** — Wraps `## N. Validation Rules` with `:::warning` admonition

MDX escaping (`<url>` autolinks, bare `<`) is handled by configuring the profiles/spec docs instances with `format: 'md'` or by a small remark plugin.

### Frontmatter in Source Files

All source `.md` files get YAML frontmatter:

**`versions/0.1.0/spec.md`:**
```yaml
---
id: specification
title: "Agent Definition Language Specification"
description: "The complete ADL v0.1.0 specification..."
keywords: [adl, specification, ...]
toc_max_heading_level: 3
---
```

**`profiles/{id}/README.md`:**
```yaml
---
id: overview
title: Overview
sidebar_position: 1
description: "..."
keywords: [...]
---
```

**`profiles/{id}/1.0/profile.md`:**
```yaml
---
id: specification
title: "... Profile Specification"
sidebar_position: 2
slug: ../specification
description: "..."
keywords: [...]
adl_profile_meta:
  example_filename: "..."
---
```

**`versions/0.1.0/examples/minimal.md`:**
```yaml
---
id: minimal
title: Minimal Example
sidebar_position: 2
description: "..."
keywords: [...]
---
```

### Webpack Configuration

- YAML loader already configured
- Add alias for resolving example imports across directories if needed
- CodeTabs imports use relative paths (`.md` and `.yaml` are siblings)

### Schema Hosting

A small Docusaurus lifecycle plugin copies `versions/0.1.0/schema.json` → `static/0.1/schema.json` and generates the draft-07 variant. This runs as part of the Docusaurus build lifecycle, not a separate script.

### Profile Example Pages

Each profile example JSON gets a companion `.md` page:

```
profiles/governance/1.0/examples/
├── compliance-agent.json
├── compliance-agent.md          ← NEW
├── compliance-agent-tier3.json
├── compliance-agent-tier3.md    ← NEW
```

The `.md` pages display the JSON via a code block or CodeTabs component.

### What Gets Deleted

- `site/scripts/sync-spec.ts`
- `site/scripts/sync-profiles.ts`
- `site/scripts/prebuild.ts`
- `site/_yaml-sources/` directory
- `site/docs/profiles/` directory (all generated)
- `site/docs/specification.md` (generated)
- `site/docs/examples/` directory (moves to versions)
- `profiles/manifest.yaml` (metadata moves to frontmatter)

### What Gets Added

- `site/src/remark/` — remark plugins
- `site/src/plugins/schema-copy.ts` — schema lifecycle plugin
- Frontmatter in all source `.md` files
- Profile example `.md` companion pages
- `site/sidebarsProfiles.ts` — profiles sidebar
- `site/sidebarsSpec.ts` — spec/examples sidebar (or auto-generated)

### What Stays Unchanged

- `versions/0.1.0/spec-manifest.yaml` — for IETF/ISO generators
- `versions/manifest.yaml` — for version management
- `site/src/components/CodeTabs.tsx`
- Site-specific docs (`contributing.md`, `governance.md`, etc.)

### URL Stability

All current URLs must be preserved:

| URL | Source |
|-----|--------|
| `/specification` | `versions/0.1.0/spec.md` |
| `/examples` | `versions/0.1.0/examples/README.md` |
| `/examples/minimal` | `versions/0.1.0/examples/minimal.md` |
| `/profiles` | `profiles/README.md` |
| `/profiles/governance/overview` | `profiles/governance/README.md` |
| `/profiles/governance/specification` | `profiles/governance/1.0/profile.md` |

Profile specs use `slug: ../specification` in frontmatter to avoid the `1.0/` path segment.

### Verification

1. All existing URLs return 200
2. Site builds with zero pre-build scripts
3. Profile and spec content renders identically
4. Search indexes all content
5. `llms.txt` plugin indexes all docs instances
6. Schema files available at `https://adl-spec.org/0.1/schema.json`
