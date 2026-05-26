# Proposal: Documentation Generator Language Targets and Code-to-ADL Strategy

**Date:** 2026-05-26
**Status:** Draft
**ADL Version:** 0.2.0 (target: generator roadmap)
**Affects:** `packages/adl-generator/`, future code-to-ADL extractors, rendered documentation views, examples, and language-specific conformance fixtures.

## Summary

ADL should use the OpenAPI adoption pattern deliberately: make the first experience concrete through generated documentation and useful renderers, then make the design-time artifact visible and reusable by generating ADL from real code. The risk is also the OpenAPI lesson: if ADL is only experienced as rendered docs, implementers may not learn that the ADL document is the durable design-time contract. To avoid that, the generator roadmap should have three coordinated surfaces: **render ADL**, **generate docs from ADL**, and **extract ADL from code**.

Current GitHub signals show MCP server repositories are concentrated in **Python** and **TypeScript**, with **JavaScript**, **Go**, and **Shell/Rust** forming the next tier. A2A protocol repositories show the same Python/TypeScript lead, followed by **Go**, **JavaScript**, and **Rust**. The narrower `google-adk` + `a2a-protocol` intersection is small but overwhelmingly Python. Based on this, ADL should focus generator and extractor work on Python and TypeScript first, then Go, JavaScript, and Rust, while keeping Java as the first enterprise-language watchlist target.

## Motivation

The documentation generator is a strategic adoption surface. OpenAPI grew quickly because its documentation generators made the specification valuable immediately to teams that did not yet care about the specification itself. ADL can use the same adoption motion for agents: a useful rendered view of an agent, its tools, capabilities, identity, security posture, and A2A/MCP interoperability points is easier to adopt than a raw schema-first specification.

The mistake to avoid is letting documentation become the whole mental model. OpenAPI was often treated as "API docs" rather than a design-time contract, which weakened understanding of the specification's role in governance, validation, client/server generation, and review workflows. ADL should therefore expose the document as the source of truth even when the first user-facing output is a rendered page.

If ADL wants to become the descriptive layer for agents, MCP servers, and A2A-capable agent systems, the first generated and extracted artifacts should land where implementers already are:

- MCP server authors exposing tools and resources.
- Agent authors wrapping ADK, LangGraph, CrewAI, and similar frameworks.
- A2A implementers publishing agent cards, task schemas, and server/client docs.
- Enterprise teams evaluating language coverage before standardizing on ADL.

Prioritizing too many languages early would dilute examples, conformance tests, and templates. Prioritizing only one language would undercut ADL's cross-ecosystem positioning.

This proposal therefore treats "generator" as more than one direction:

- **ADL-to-docs:** render a valid ADL document into human-readable documentation.
- **ADL-to-code-adjacent artifacts:** generate framework-specific docs, examples, SDK notes, or integration stubs.
- **Code-to-ADL:** inspect a real agent implementation and produce an ADL document that can be reviewed, validated, rendered, and standardized.

## Research Method

This research used public GitHub repository language facets and GitHub Search API counts collected on 2026-05-26.

For MCP servers, the most direct GitHub topic signal is `mcp-servers`. GitHub reports 776 matching repositories with these top language facets:

| Rank | Language | Repositories | Share of Topic |
|------|----------|--------------|----------------|
| 1 | Python | 260 | 33.5% |
| 2 | TypeScript | 219 | 28.2% |
| 3 | JavaScript | 49 | 6.3% |
| 4 | Go | 40 | 5.2% |
| 5 | Shell | 22 | 2.8% |

Rust is effectively tied for fifth at 21 repositories. For generator strategy, treat Shell as an operational/deployment signal rather than an SDK/runtime target, and treat Rust as the stronger fifth implementation-language candidate.

For A2A agents and protocol implementations, the broadest current signal is `a2a-protocol`. GitHub reports 445 matching repositories with these top language facets:

| Rank | Language | Repositories | Share of Topic |
|------|----------|--------------|----------------|
| 1 | Python | 204 | 45.8% |
| 2 | TypeScript | 92 | 20.7% |
| 3 | Go | 25 | 5.6% |
| 4 | JavaScript | 16 | 3.6% |
| 5 | Rust | 16 | 3.6% |

The narrower `topic:google-adk topic:a2a-protocol` GitHub Search API query returned 17 repositories. Their dominant GitHub languages were:

| Rank | Language | Repositories | Share of Intersection |
|------|----------|--------------|-----------------------|
| 1 | Python | 13 | 76.5% |
| 2 | Jupyter Notebook | 2 | 11.8% |
| 3 | TypeScript | 1 | 5.9% |
| 4 | Java | 1 | 5.9% |
| 5 | Go / JavaScript / Rust / C# | 0 | 0.0% |

This intersection should be treated as directional rather than definitive because it depends on repository topic hygiene. It still strongly supports Python as the first ADK+A2A target.

## Details

### 1. Adoption Model

ADL should make rendered documentation the low-friction entry point, but make the ADL file visible in every workflow.

| Surface | Purpose | Adoption Role |
|---------|---------|---------------|
| **Renderer** | Turn ADL into browsable, shareable agent documentation | Fast adoption; makes the value obvious to agent authors and consumers |
| **Docs generator** | Emit static docs, Markdown, site pages, and language/framework notes from ADL | Lets teams publish ADL-backed documentation without custom site work |
| **Code-to-ADL extractor** | Infer ADL from framework code, MCP server definitions, A2A agent cards, and runtime metadata | Converts existing codebases into design-time ADL contracts |
| **Validator/conformance output** | Show schema, policy, security, and interoperability findings alongside rendered docs | Teaches that ADL is a contract, not just documentation |

The renderer should always include links or panels for the source ADL, validation status, schema version, and conformance profile. That prevents the rendered output from hiding the design-time artifact.

### 2. Rendering Requirements

Rendering should be a first-class deliverable, not an afterthought of code generation.

The initial renderer should support:

- Agent overview: identity, owner, version, description, lifecycle status.
- Model and runtime summary.
- Capabilities and skills.
- Tool catalog with inputs, outputs, scopes, and safety notes.
- MCP surface: tools/resources/prompts/transports where available.
- A2A surface: agent-card fields, supported modalities, tasks, auth, and endpoints where available.
- Security and trust posture: authentication schemes, scopes, data classification, attestations, and warnings.
- Validation/conformance panel: schema validity, missing recommended fields, unknown extensions, and profile compatibility.
- Export targets: static HTML, Markdown/MDX, and Docusaurus-ready pages.

The rendered view should distinguish declared facts from inferred facts. For example, an ADL document authored directly by a team is a declared source; an ADL document extracted from decorators, MCP tool registrations, or A2A agent cards may contain inferred fields that need review.

### 3. Code-to-ADL Extraction

Code-to-ADL is the key mechanism for adoption without reducing ADL to documentation. It lets teams start from working agents and produce an explicit ADL contract they can improve over time.

Initial extractors should focus on patterns with structured metadata:

| Source | Extraction Strategy | First Targets |
|--------|---------------------|---------------|
| MCP servers | Inspect server/tool/resource registrations, schemas, transports, and auth configuration | Python, TypeScript |
| Google ADK agents | Inspect agent declarations, tools, model config, instructions metadata, and A2A integration points | Python first |
| A2A agent cards | Convert agent-card metadata into ADL identity, capabilities, endpoints, auth, and task surfaces | Python, TypeScript |
| Framework annotations/decorators | Map explicit tool and capability annotations into ADL members | Python, TypeScript |
| Repository manifests | Use package metadata, README hints, and config files only as secondary evidence | All later targets |

Extraction should produce a reviewable ADL document with provenance annotations for inferred fields. A generated ADL document should not silently pretend to be fully authored. Recommended extension fields include:

- `x-adl-generated-from`: source files or framework metadata used.
- `x-adl-inference-confidence`: coarse confidence for inferred sections.
- `x-adl-review-needed`: fields that require human confirmation.

These extensions keep the bootstrap path practical while preserving ADL's role as a design-time contract.

### 4. Recommended Target Order

| Priority | Language | Rationale |
|----------|----------|-----------|
| P0 | Python | Top language for MCP servers, A2A protocol repositories, Google ADK repositories, and the ADK+A2A intersection. Also the primary Google ADK implementation language. |
| P0 | TypeScript | Second strongest MCP and A2A signal; matches existing generator work and the web/docs ecosystem. |
| P1 | Go | Third in A2A and fourth in MCP; important for infrastructure, registries, gateways, and production agent services. |
| P1 | JavaScript | Third in MCP and fourth in A2A; mostly overlaps TypeScript but matters for plain Node examples and lower-friction adoption. |
| P1 | Rust | Near-tied fifth in MCP and tied fourth/fifth in A2A; important for high-performance gateways, security-sensitive infrastructure, and protocol tooling. |

### 5. Enterprise Watchlist

Java should stay on the roadmap even though it is not top five across both main signals. The A2A project publishes an official Java SDK, and Java is likely to matter for enterprise adoption, regulated industries, and standards-body credibility. It should be considered the first P2 target unless customer or contributor demand pulls it forward.

### 6. Generator Scope by Phase

**Phase 1: Renderer + Python/TypeScript Docs**

- Build an ADL renderer that can produce static HTML, Markdown/MDX, and Docusaurus-ready pages.
- Generate ADL-facing documentation stubs and examples for Python and TypeScript agents.
- Include MCP server documentation patterns for both languages.
- Include A2A agent-card and task-schema documentation examples for both languages.
- Build shared conformance fixtures so generated docs can be validated against the same ADL examples.
- Show the source ADL and validation/conformance status in the rendered output.

**Phase 2: Python/TypeScript Code-to-ADL**

- Add MCP server extractors for Python and TypeScript.
- Add Google ADK Python extraction.
- Add A2A agent-card ingestion.
- Emit review-needed annotations for inferred ADL fields.
- Round-trip extracted ADL through the renderer and validator.

**Phase 3: Go + JavaScript + Rust**

- Add Go for production service and gateway implementers.
- Add JavaScript as a low-friction sibling of TypeScript, reusing templates where practical.
- Add Rust for infrastructure, security, and protocol implementers.
- Add extractors only where framework metadata is structured enough to avoid brittle parsing.

**Phase 4: Java**

- Add Java once ADL's core generator behavior stabilizes and enterprise integration examples are ready.
- Align examples with the official A2A Java SDK and common Java service patterns.

### 7. Practical Generator Implications

The generator should separate language-neutral ADL semantics from language-specific rendering:

- Keep schema, capability, tool, identity, security, and A2A/MCP mapping logic in shared generator code.
- Keep language-specific naming, package layout, doc-comment style, and framework snippets in per-target templates.
- Prefer examples that can round-trip through the same ADL document and produce comparable output across Python and TypeScript first.
- Treat extracted ADL as a draft contract until a human or CI policy marks it reviewed.
- Preserve a distinction between declared, discovered, and inferred fields in generated output.
- Avoid treating Shell, HTML, and Jupyter Notebook as primary generator targets. They are useful supporting formats, but they do not represent durable SDK/runtime targets.

## Alternatives

1. **Python only.** This matches the strongest ADK+A2A signal, but it weakens ADL's cross-ecosystem message and ignores the very large TypeScript MCP/A2A audience.
2. **TypeScript only.** This aligns with the current generator codebase and web developer workflows, but misses the dominant Python ADK and A2A implementation base.
3. **Top five by MCP only.** This would include Shell ahead of Rust. Rejected because Shell is mostly operational glue, not a durable agent implementation target.
4. **Official SDK languages only.** A2A publishes Python, JavaScript/TypeScript, Java, Go, C#/.NET, and Rust SDKs. That is useful validation, but it does not reflect observed MCP server usage as directly as GitHub language facets.
5. **Support every common language immediately.** Rejected because generator quality depends on examples, tests, and idiomatic templates, not just emitting files.
6. **Documentation rendering only.** Attractive for fast adoption, but it repeats OpenAPI's failure mode where the specification is seen only as documentation. Rejected unless the rendered output consistently exposes source ADL, validation, and contract semantics.
7. **Code-to-ADL first.** Useful for bootstrapping existing projects, but risky before the renderer and validation story are strong enough to help users understand and review the generated ADL. Better as Phase 2.

## Recommendation

Adopt this product sequence:

1. **Render ADL** into static HTML, Markdown/MDX, and Docusaurus-ready pages.
2. **Generate docs from ADL** for Python and TypeScript agent ecosystems.
3. **Extract ADL from code** for Python and TypeScript MCP servers, Google ADK agents, and A2A agent cards.
4. **Expand generator and extractor targets** to Go, JavaScript, and Rust.

Adopt this language sequence:

1. **Python**
2. **TypeScript**
3. **Go**
4. **JavaScript**
5. **Rust**

Keep **Java** as the first enterprise watchlist language, with **C#/.NET** behind it unless customer demand appears.

This ordering optimizes for the overlap between MCP servers, A2A implementations, and ADK-based agents while preserving ADL's standards-oriented, multi-language posture.

## Open Questions

1. Should Python and TypeScript ship in the same generator milestone, or should Python be added first because ADK+A2A is so Python-heavy?
2. Should JavaScript be a separate target or a TypeScript target mode that emits plain `.js` examples?
3. Should Rust be prioritized ahead of JavaScript if the generator's next use case is trust/protocol tooling rather than application-agent examples?
4. Should the project maintain a small recurring GitHub topic-count script so this prioritization can be revisited before each minor release?
5. What is the minimum renderer feature set required before code-to-ADL extraction is useful to users?
6. Which fields should be allowed as inferred output, and which ADL fields should require explicit human confirmation?
7. Should generated ADL provenance annotations be standardized as `x-adl-*` extensions or kept internal to the generator?

## References

- GitHub `mcp-servers` topic language facets: https://github.com/topics/mcp-servers
- GitHub `a2a-protocol` topic language facets: https://github.com/topics/a2a-protocol
- GitHub `google-adk` topic language facets: https://github.com/topics/google-adk
- GitHub `adk` topic language facets: https://github.com/topics/adk
- A2A Project organization and official SDK list: https://github.com/a2aproject
- A2A repository README, including ADK/LangGraph/BeeAI course context and official SDK links: https://github.com/a2aproject/A2A
- Google ADK Python repository: https://github.com/google/adk-python
- Google ADK samples repository: https://github.com/google/adk-samples
- GitHub Search API query used for the narrow ADK+A2A intersection: `topic:google-adk topic:a2a-protocol`
