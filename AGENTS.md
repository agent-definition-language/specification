# AGENTS.md

**NEVER**
- include credits or attribution in commit messages

- **What this repo is:** ADL (Agent Definition Language) spec + standardization materials (LF AAIF, IETF, ISO). Like OpenAPI/AsyncAPI for agents.

## Layout

- `versions/0.1.0-draft/spec.md` — current draft spec (edit here for spec changes); `versions/0.1.0-draft/spec-manifest.yaml` — section structure for body-specific generation
- `standardization/roadmap.md`, `standardization/bodies/` — standardization roadmap and per-body notes
- `proposals/` — one Markdown file per proposal; see `proposals/README.md`
- `examples/` — ADL YAML/JSON; keep `examples/README.md` index current
- `.github/` — issue/PR templates

## Conventions

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `docs(spec): ...`, `feat(spec): ...`, `chore(standardization): ...`
- Branches: short-lived `feature/`, `fix/`, `docs/` → merge to `main`
- Spec versioning: SemVer; drafts use `-draft` in dir name

## When acting

- **Spec change:** Edit `versions/0.1.0-draft/spec.md`; update examples if needed; link to examples in spec.
- **Standardization:** Update `standardization/roadmap.md` or `standardization/bodies/<body>.md`.
- **New proposal:** Add under `proposals/`; follow format in `proposals/README.md`.
- **New example:** Add YAML/JSON under `examples/`; add row to `examples/README.md` index.
- **PR:** Use `.github/PULL_REQUEST_TEMPLATE.md`; link issues; run lint/tests if configured.
