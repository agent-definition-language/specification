# Spec authoring conventions

Follow these conventions when editing `spec.md` so the specification stays consistent
and readable.

## Section headings

- **Top-level sections:** `## N. Title` (e.g. `## 5. Core Members`), with a consistent
  numeric `N`.
- **Subsections:** `### N.M Title` (e.g. `### 5.1 adl`).
- **Appendices:** `## Appendix A. Title`, and `### C.1 Title` for appendix subsections.
- Keep section numbering stable — renumbering ripples through cross-references.

## Requirements

- Use **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT** for mandatory requirements.
- Use **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED** for recommended behavior.
- Use **MAY**, **OPTIONAL** for optional behavior.
- Keep these keywords in **bold** so they are easy to find.

## Tables

- Use Markdown pipe tables for all member definitions, error codes, and validation rules.
- The header row must be first; an alignment row (`|---|`) is optional but allowed.

## Code and examples

- Use fenced code blocks with a language tag: ` ```json `, ` ```yaml `.
- Keep `spec.md` format-neutral — do not embed publication-format boilerplate (e.g. an
  IETF "Status of This Memo").

## Cross-references

- Reference other sections as "Section N" or "Section N.M" (e.g. "Section 5.1").
- Reference appendices as "Appendix A", "Appendix C.2", etc.
