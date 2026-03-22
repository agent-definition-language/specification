# AGENTS.md

**NEVER**
- include credits or attribution in commit messages

- **What this repo is:** ADL (Agent Definition Language) spec + standardization materials (LF AAIF, IETF, ISO). Like OpenAPI/AsyncAPI for agents.

## Layout

- `versions/0.1.0/spec.md` — current draft spec (edit here for spec changes)
- `versions/0.1.0/spec-manifest.yaml` — section structure for body-specific generation
- `versions/0.1.0/schema.json` — JSON Schema for ADL documents
- `versions/0.1.0/snippets/` — code snippets (YAML + JSON pairs) embedded in docs
- `versions/0.1.0/examples/` — version-scoped example ADL documents
- `versions/manifest.yaml` — version metadata: latest, next, status
- `profiles/` — domain-specific profiles (governance, healthcare, financial, portfolio); each versioned independently
- `standardization/roadmap.md`, `standardization/bodies/` — standardization roadmap and per-body notes
- `proposals/` — one Markdown file per proposal; see `proposals/README.md`
- `examples/` — top-level ADL YAML/JSON; keep `examples/README.md` index current
- `site/` — Docusaurus documentation site
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
npm run dev                   # Local dev server
npm run build                 # Full build: sync-spec → prebuild → docusaurus build
npm run sync-spec             # Sync versions/ content (examples, snippets) to site
npm run prebuild              # Convert YAML sources to JSON for site consumption
npm run typecheck             # TypeScript type checking
```

### Build pipeline

1. **`sync-spec`** reads `versions/manifest.yaml`, copies examples and snippets from `versions/{id}/` to `site/_yaml-sources/{id}/`
2. **`prebuild`** converts YAML source files to JSON
3. **`docusaurus build`** generates the static site (includes `llms.txt` generation via plugin)

CI (`ci.yml`) runs on pushes/PRs to `main` touching `site/`, `versions/`, or the workflow. It validates the full build and checks `llms.txt` is non-placeholder.

## Spec authoring conventions

When editing `versions/0.1.0/spec.md`:

- Section headings: `## N. Title` (top-level), `### N.M Title` (subsections), `## Appendix A. Title` (appendices)
- Requirements language: RFC 2119 keywords in **bold** — **MUST**, **SHOULD**, **MAY**, etc.
- Tables: Markdown pipe tables for member definitions, error codes, validation rules
- Code blocks: fenced with language tag (` ```json `, ` ```yaml `)
- Cross-references: "Section N" or "Appendix A" (generators replace with body-specific refs)
- When adding/renumbering sections, update `versions/0.1.0/spec-manifest.yaml` to match

## Conventions

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `docs(spec): ...`, `feat(spec): ...`, `chore(standardization): ...`
- Branches: short-lived `feature/`, `fix/`, `docs/` → merge to `main`
- Spec versioning: SemVer; `versions/manifest.yaml` controls latest/next and status lifecycle (`draft` → `rc` → `released` → `deprecated`)

## When acting

- **Spec change:** Edit `versions/0.1.0/spec.md`; update examples if needed; keep `spec-manifest.yaml` in sync.
- **Profile change:** Edit `profiles/<name>/<version>/profile.md`; update profile examples.
- **New profile:** Create `profiles/<name>/` with README.md, COMPATIBILITY.md, `1.0/profile.md`.
- **Standardization:** Update `standardization/roadmap.md` or `standardization/bodies/<body>.md`.
- **New proposal:** Add under `proposals/`; follow format in `proposals/README.md`.
- **New example:** Add YAML/JSON under `examples/`; add row to `examples/README.md` index.
- **PR:** Use `.github/PULL_REQUEST_TEMPLATE.md`; link issues; run `cd site && npm run build` to validate.
