# Spec authoring conventions

So that `versions/0.2.0-draft/spec.md` stays **programmatically transformable** into body-specific output (IETF RFC, ISO, Linux Foundation), follow these conventions when editing the spec.

## Section headings

- **Top-level sections:** `## N. Title` (e.g. `## 5. Core Members`). Use numeric `N` matching the manifest (`spec-manifest.yaml`).
- **Subsections:** `### N.M Title` (e.g. `### 5.1 adl`). Use the same numbering as in the manifest.
- **Appendices:** `## Appendix A. Title` and `### C.1 Title` for appendix subsections.
- Do not change section numbers without updating `spec-manifest.yaml` so generators can map content to body-specific section numbers.

## Requirements

- Use **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT** for mandatory requirements.
- Use **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED** for recommended behavior.
- Use **MAY**, **OPTIONAL** for optional behavior.
- Keep these keywords in **bold** so they are easy to find: **MUST**, **SHOULD**, **MAY**.

## Tables

- Use Markdown pipe tables for all member definitions, error codes, and validation rules.
- Header row must be the first row; alignment row (`|---|`) is optional but allowed.
- Generators may strip or convert these to body-specific table formats (e.g. RFC ASCII tables).

## Code and examples

- Use fenced code blocks with a language tag: ` ```json `, ` ```yaml `.
- Do not embed body-specific boilerplate (e.g. IETF “Status of This Memo”) in `spec.md`; that belongs in `standardization/templates/` and is injected by scripts.

## Cross-references

- Reference other sections as “Section N” or “Section N.M” (e.g. “Section 5.1”). Generators can replace these with body-specific references (e.g. RFC section numbers).
- Reference appendices as “Appendix A”, “Appendix C.2”, etc.

## Manifest sync

- When adding or renumbering a section, update `versions/0.2.0-draft/spec-manifest.yaml` so the `sections` list and optional `subsections` match the spec. The manifest is the source of section order and IDs for generation.
