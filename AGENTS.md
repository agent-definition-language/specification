# AGENTS.md

**What this repo is:** the source of truth for the Agent Definition Language (ADL)
standard — core spec, companion protocols, domain profiles, deployment patterns, the
proposal process, and conformance vectors. Like OpenAPI/AsyncAPI for AI agents.

Reference implementations, the documentation site, and the standards-submission apparatus
live in separate repos. The canonical contribution process and governance live in the
`governance` repo.

**NEVER**
- include credits or attribution in commit messages
- use emojis in text

## Working discipline

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### 2. Simplicity First
**Minimum content that solves the problem. Nothing speculative.**
- No features/abstractions beyond what was asked.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent content or formatting; match existing style.
- Every changed line should trace directly to the request.

### 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- "Add validation" → "Write vectors for invalid inputs, then make them fail correctly."

## Frozen areas — do not edit

Released, immutable artifacts. Changing them rewrites published history and breaks
downstream consumers, conformance vectors, and the documentation site's version snapshots.

- `core/<x.y.z>/` — any numbered release directory. The working draft lives in
  `core/_next/`; edit there.
- `profiles/<name>/<version>/` — any **released** profile version. Edit the in-development
  draft version; never retroactively change a released one.

A version's status is defined in `core/manifest.yaml` / `profiles/manifest.yaml`. A fix
that looks like it belongs in a released version belongs in the draft (and, if warranted, a
new release), never in the frozen copy.

## Layout

- `core/_next/spec.md` — the working-draft spec (edit here for spec changes)
- `core/_next/schema.json` — JSON Schema; `schema-strict.json` rejects unknown top-level members
- `core/_next/schema-enforcement-record.json` — schema for Runtime Protocol enforcement records
- `core/_next/schema-discovery.json` — schema for the `.well-known/adl-agents` discovery document (§6.4)
- `core/_next/examples/` — version-scoped example documents (`*.yaml` + `*.mdx` wrappers)
- `core/_next/diagrams/` — spec diagrams
- `core/manifest.yaml` — version metadata: `latest`, `next`, per-version `status` (no standards-submission metadata)
- `protocol/_next/` — protocol layer: `trust-protocol.md`, `runtime-protocol.md`, `index.md`
- `profiles/` — domain profiles, each versioned independently; `profiles/manifest.yaml` holds metadata/status
- `patterns/` — non-normative, version-pinned deployment patterns
- `proposals/` — one Markdown file per proposal; see `proposals/README.md`
- `conformance/` — conformance vectors, scoped by version; see `conformance/README.md`

## Spec authoring conventions

When editing `core/_next/spec.md`:
- Section headings: `## N. Title` (top-level), `### N.M Title` (subsections), `## Appendix A. Title`
- Requirements language: RFC 2119 keywords in **bold** — **MUST**, **SHOULD**, **MAY**, etc.
- Tables: Markdown pipe tables for member definitions, error codes, validation rules
- Code blocks: fenced with a language tag (` ```json `, ` ```yaml `)
- Cross-references: "Section N" or "Appendix A"

## Conventions

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `docs(spec): ...`, `feat(spec): ...`
- Branches: short-lived `feature/`, `fix/`, `docs/` → merge to `main`
- Spec versioning: SemVer; `core/manifest.yaml` controls latest/next and status lifecycle

## When acting

- **Spec change:** Edit `core/_next/spec.md`; update examples if needed.
- **Schema change:** Update `core/_next/schema.json` alongside the member it defines.
- **Protocol change:** Edit `protocol/_next/trust-protocol.md` or `runtime-protocol.md`.
- **Profile change:** Edit `profiles/<name>/<version>/profile.md`; update profile examples.
- **New proposal:** Add under `proposals/`; follow `proposals/README.md`.
- **New example:** Add YAML under `core/_next/examples/`; update `examples/README.md`.
- **New conformance vector:** Add under `conformance/<version>/{valid,invalid}/`.
