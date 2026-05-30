# AGENTS.md

**What this repo is:** ADL (Agent Definition Language) spec + standardization materials (LF AAIF, IETF, ISO). Like OpenAPI/AsyncAPI for agents.

**NEVER**
- include credits or attribution in commit messages

## Working discipline

Behavioral guidelines to reduce common LLM coding mistakes. Merge with the project-specific instructions below as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Frozen areas — do not edit

It is **forbidden** to edit frozen areas of the specification. Frozen areas are released, immutable artifacts; changing them rewrites published history and breaks downstream consumers, conformance vectors, and the documentation site's version snapshots.

Frozen areas include:

- `versions/<x.y.z>/` — any numbered release directory (e.g. `versions/0.1.0/`, `versions/0.2.0/`). The working draft lives in `versions/draft/`; edit there.
- `profiles/<name>/<version>/` — any **released** profile version. Edit the in-development draft version; never retroactively change a released one.
- `site/spec_versioned_docs/` and other generated version snapshots — these mirror frozen releases and are produced by the release tooling.

A version's status (`draft` / `rc` / `released` / `deprecated`) is defined in `versions/manifest.yaml` and `profiles/manifest.yaml` — consult those when status is unclear. A fix that looks like it belongs in a released version belongs in the draft (and, if warranted, a new release), never in the frozen copy. If editing a frozen area seems genuinely required, stop and raise it with a maintainer.

## Layout

Spec content is organized by version under `versions/`. The **working draft is `versions/draft/`** — this is where all spec changes go. Numbered directories (`versions/0.1.0/`, `versions/0.2.0/`) are released and frozen (see "Frozen areas").

- `versions/draft/spec.md` — the working-draft spec (edit here for spec changes)
- `versions/draft/spec-manifest.yaml` — section structure for body-specific generation; keep in sync with `spec.md`
- `versions/draft/schema.json` — JSON Schema for ADL documents; `schema-strict.json` rejects unknown top-level members
- `versions/draft/schema-enforcement-record.json` — standalone schema for Runtime Protocol enforcement records
- `versions/draft/schema-discovery.json` — standalone schema for the `.well-known/adl-agents` discovery document (§6.4)
- `versions/draft/examples/` — version-scoped example ADL documents (`*.yaml` with `*.mdx` doc wrappers); keep `examples/README.md` current
- `versions/draft/snippets/` — code snippets (YAML + JSON pairs) embedded in docs
- `versions/draft/test-vectors/` — conformance test vectors
- `versions/draft/diagrams/` — spec diagrams
- `versions/manifest.yaml` — version metadata: `latest`, `next`, and per-version `status`
- `protocol/draft/` — the protocol layer: `trust-protocol.md`, `runtime-protocol.md`, and `index.md` (overview)
- `profiles/` — domain-specific profiles (governance, healthcare, financial, portfolio, registry); each versioned independently; `profiles/manifest.yaml` holds metadata and status
- `packages/` — implementations: `adl-core` (verification), `adl-cli`, `adl-generator`, `adl-agent`, `adl-py` (Python port)
- `standardization/roadmap.md`, `standardization/bodies/`, `standardization/templates/` — standardization roadmap, per-body notes, and boilerplate
- `proposals/` — one Markdown file per proposal; see `proposals/README.md`
- `patterns/draft/` — non-normative deployment patterns
- `site/` — Docusaurus documentation site (consumes `versions/` directly at build time)
- `CONTRIBUTING.md`, `GOVERNANCE.md` — contribution workflow and project governance
- `.github/` — issue/PR templates, CI workflow

## Package commands

All commands run from repo root:

```bash
bun run build        # Build packages (core → generator → cli)
bun run typecheck    # Typecheck all packages
bun run test         # Test all packages
bun run check        # Full CI check (build + typecheck + test)
```

## Site commands

All commands run from `site/`:

```bash
cd site && npm install        # Install deps (Node >= 18)
npm run dev                   # Local dev server (http://localhost:3000)
npm run build                 # Production build (static site + llms.txt)
npm run serve                 # Serve the built site
npm run typecheck             # TypeScript type checking
```

The site uses the Rspack bundler via `future.v4: true` in `docusaurus.config.ts`, which requires `@docusaurus/faster` as a direct dep.

### Build pipeline

Content is consumed directly from `versions/` at build time via the `spec-version-bridge` plugin (`site/src/plugins/spec-version-bridge.ts`) — no separate sync/prebuild step. `docusaurus build` produces the static site, and the `@signalwire/docusaurus-plugin-llms-txt` plugin generates `llms.txt`.

CI (`ci.yml`) runs on pushes/PRs to `main` touching `site/`, `versions/`, or the workflow. It validates the full build and checks `llms.txt` is non-placeholder.

## Spec authoring conventions

When editing `versions/draft/spec.md`:

- Section headings: `## N. Title` (top-level), `### N.M Title` (subsections), `## Appendix A. Title` (appendices)
- Requirements language: RFC 2119 keywords in **bold** — **MUST**, **SHOULD**, **MAY**, etc.
- Tables: Markdown pipe tables for member definitions, error codes, validation rules
- Code blocks: fenced with language tag (` ```json `, ` ```yaml `)
- Cross-references: "Section N" or "Appendix A" (generators replace with body-specific refs)
- When adding/renumbering sections, update `versions/draft/spec-manifest.yaml` to match

## Conventions

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `docs(spec): ...`, `feat(spec): ...`, `chore(standardization): ...`
- Branches: short-lived `feature/`, `fix/`, `docs/` → merge to `main`
- Spec versioning: SemVer; `versions/manifest.yaml` controls latest/next and status lifecycle (`draft` → `rc` → `released` → `deprecated`)

## When acting

- **Spec change:** Edit `versions/draft/spec.md`; update examples if needed; keep `versions/draft/spec-manifest.yaml` in sync.
- **Schema change:** Update `versions/draft/schema.json` alongside the spec member it defines.
- **Protocol change:** Edit `protocol/draft/trust-protocol.md` or `protocol/draft/runtime-protocol.md`.
- **Profile change:** Edit `profiles/<name>/<version>/profile.md`; update profile examples.
- **New profile:** Create `profiles/<name>/` with README.md, COMPATIBILITY.md, `1.0/profile.md`.
- **Standardization:** Update `standardization/roadmap.md` or `standardization/bodies/<body>.md`.
- **New proposal:** Add under `proposals/`; follow format in `proposals/README.md`.
- **New example:** Add YAML/JSON under `versions/draft/examples/`; add a row to `versions/draft/examples/README.md`.
- **PR:** Use `.github/PULL_REQUEST_TEMPLATE.md`; link issues; run `cd site && npm run build` to validate.
