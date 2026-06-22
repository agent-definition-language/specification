# Diagrams

Editable Excalidraw masters and their exported SVGs for the spec docs in this version.

This directory is **version-pinned**: it lives under `core/_next/` alongside `patterns/`, `examples/`, and `test-vectors/`, so the diagrams travel with the spec when the draft is released (snapshotting into `core/0.3.0/diagrams/`). Each version's docs reference their own copy.

## Contents

- `*.excalidraw` — editable master files. This is the source of truth; keep it so diagrams can be re-edited later without spelunking through raw SVG.
- `*.svg` — exported, committed render referenced by the docs.

Commit **both** the `.excalidraw` master and the exported `.svg` together.

## Workflow

1. **Draw** the diagram at [excalidraw.com](https://excalidraw.com).
   - Keep text large enough to read in docs.
   - Use consistent stroke width; group related shapes.
2. **Save the master** as `core/_next/diagrams/<name>.excalidraw` (Menu → Save to… / export the scene).
3. **Export the SVG** with a **white background baked in**: Menu → Export image → SVG, "Background: on", dark mode off. Save as `core/_next/diagrams/<name>.svg`.
   - White background keeps Excalidraw's dark strokes readable in the site's dark theme without any wrapper.
4. **(Optional) Optimize** — from `site/`, run `npm run optimize:diagrams`. Be conservative; aggressive SVGO settings can strip embedded fonts or scene metadata.
5. **Embed** in a doc using a **relative** path so the asset version-pins (never a global `/img/...` URL — that would share one asset across all versions and break version-pinning):
   - **In `.md` (CommonMark — e.g. the pattern docs):**
     ```markdown
     ![Describe the diagram for screen readers](../diagrams/<name>.svg)

     *Figure: optional caption.*
     ```
   - **In `.mdx` (e.g. example docs), for a card + caption:**
     ```mdx
     import Diagram from '@site/src/components/Diagram';
     import d from '../diagrams/<name>.svg';

     <Diagram src={d} alt="Describe the diagram" caption="Optional caption." />
     ```
6. **Commit** the master and the SVG.

## Why relative paths, not `/img/...`

Docusaurus resolves a **relative** markdown image (or a relative `import`) at build time and emits a per-version hashed asset, so each spec version references its own diagram. A raw-HTML `<img src="/img/...">` is passed through verbatim — it points at a single site-global asset shared across all versions, which defeats version-pinning. Always reference diagrams relatively from the doc that uses them.

## Why `.md` docs use a plain image (no `<figure>` card)

`.md` files are parsed as CommonMark (`markdown.format: 'detect'`), where raw HTML `src` attributes are not bundler-resolved — so a `<figure><img src="../diagrams/…">` card can't use a version-pinned relative path. The `<figure>` + caption card is therefore only available in `.mdx` via the `<Diagram>` component. For `.md`, the white-background SVG export gives the same readability without a wrapper.
