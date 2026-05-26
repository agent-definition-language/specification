# Proposal: Documentation Generator Language Targets and Code-to-ADL Strategy

**Date:** 2026-05-26
**Status:** Draft
**ADL Version:** 0.2.0 (target: generator roadmap)
**Affects:** `packages/adl-generator/`, future code-to-ADL extractors, rendered documentation views, examples, and language-specific conformance fixtures.

## Summary

ADL should use the OpenAPI adoption pattern deliberately: make the first experience concrete through generated documentation and useful renderers, then make the design-time artifact visible and reusable by generating ADL from real code. The risk is also the OpenAPI lesson: if ADL is only experienced as rendered docs, implementers may not learn that the ADL document is the durable design-time contract. To avoid that, the generator roadmap should have three coordinated surfaces: **render ADL**, **generate docs from ADL**, and **extract ADL from code**.

Current GitHub signals show MCP server repositories are concentrated in **Python** and **TypeScript**, with **JavaScript**, **Go**, and **Shell/Rust** forming the next tier. A2A protocol repositories show the same Python/TypeScript lead, followed by **Go**, **JavaScript**, and **Rust**. The narrower `google-adk` + `a2a-protocol` intersection is small but overwhelmingly Python. Based on this, ADL should focus generator and extractor work on Python and TypeScript first, then Go, JavaScript, and Rust, while keeping Java as the first enterprise-language watchlist target.

For framework plugins, ADL should prioritize ecosystems where an extractor can reliably discover agents, tools, schemas, auth, model configuration, and orchestration structure. The first plugin targets should be **Google ADK**, **LangGraph/LangChain**, **CrewAI**, **OpenAI Agents SDK**, and **Hermes Agent**, with **LlamaIndex**, **Microsoft Semantic Kernel / Microsoft Agent Framework**, **Pydantic AI**, **Mastra**, **Agno**, **Haystack**, and **AutoGen/AG2** on the next tier.

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

Framework and harness metadata collected from GitHub repository APIs on 2026-05-26:

| Framework / Harness | Repository | Stars | Primary Language | Plugin Priority |
|---------------------|------------|-------|------------------|-----------------|
| Hermes Agent | `NousResearch/hermes-agent` | 167,808 | Python | P0 research spike |
| AutoGen | `microsoft/autogen` | 58,407 | Python | Watch / migration-sensitive |
| CrewAI | `crewAIInc/crewAI` | 52,200 | Python | P0 |
| LlamaIndex | `run-llama/llama_index` | 49,670 | Python | P1 |
| Agno | `agno-agi/agno` | 40,361 | Python | P1 |
| LangGraph | `langchain-ai/langgraph` | 32,990 | Python | P0 |
| Semantic Kernel | `microsoft/semantic-kernel` | 27,983 | C# | P1 / enterprise |
| OpenAI Agents SDK | `openai/openai-agents-python` | 26,660 | Python | P0 |
| Haystack | `deepset-ai/haystack` | 25,373 | MDX / Python | P1 |
| Vercel AI SDK | `vercel/ai` | 24,470 | TypeScript | P2 / app surface |
| Mastra | `mastra-ai/mastra` | 24,312 | TypeScript | P1 |
| Google ADK | `google/adk-python` | 19,851 | Python | P0 |
| Pydantic AI | `pydantic/pydantic-ai` | 17,307 | Python | P1 |
| Google ADK Samples | `google/adk-samples` | 9,457 | Python | P0 reference corpus |
| Claude Agent SDK | `anthropics/claude-agent-sdk-python` | 7,051 | Python | P2 |
| Strands Agents | `strands-agents/sdk-python` | 5,940 | Python | P2 |
| AG2 | `ag2ai/ag2` | 4,601 | Python | P2 / AutoGen successor watch |

Stars are only a coarse demand signal. Plugin priority also accounts for ADL fit: structured agent definitions, explicit tool schemas, A2A/MCP relevance, enterprise relevance, and whether extraction can be done without brittle source parsing.

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

### 4. Framework Plugin Backlog

ADL should support plugins at two levels:

- **Extractor plugins:** read framework code/config/runtime metadata and emit ADL.
- **Renderer plugins:** render framework-specific sections in generated docs, such as LangGraph nodes, CrewAI crews, ADK agents, or OpenAI Agents handoffs.

Recommended plugin priority:

| Priority | Plugin | Why It Matters | Likely ADL Mapping |
|----------|--------|----------------|--------------------|
| P0 | Google ADK | Directly tied to A2A and heavily Python; strategically important for ADK+A2A agents. | Agents, tools, model config, instructions, deployment/runtime metadata, A2A integration. |
| P0 | LangGraph / LangChain | Strong production orchestration signal; graph structure maps well to ADL capabilities, workflows, and dependencies. | Graph nodes/edges, tools, state, model bindings, retrievers, external integrations. |
| P0 | CrewAI | Large community and clear crew/role/task abstractions. | Agents, roles, tasks, tools, process, collaboration topology. |
| P0 | OpenAI Agents SDK | Official SDK, lightweight, likely high growth; handoffs and tools are structured. | Agents, tools, handoffs, guardrails, model settings, tracing metadata. |
| P0 research spike | Hermes Agent | Very large and fast-growing Python agent harness; strategically relevant because it exposes self-improving skills, persistent memory, channels, model backends, and coding-agent style operation. | Agent identity, model backends, skills, tools, memories, channels, permissions, runtime config, generated-skill provenance. |
| P1 | LlamaIndex | Major RAG and document-agent ecosystem; important for knowledge-heavy agents. | Query engines, tools, indexes, retrievers, data sources, workflows. |
| P1 | Microsoft Semantic Kernel / Agent Framework | Enterprise and .NET relevance; important for standards credibility. | Plugins/functions, skills, planners, memory, services, auth. |
| P1 | Pydantic AI | Strong schema discipline; likely high-quality extraction because types are explicit. | Agent definitions, typed tools, structured outputs, validators. |
| P1 | Mastra | TypeScript-native agent framework with strong fit for JS/TS users. | Agents, tools, workflows, memory, evals, deployment metadata. |
| P1 | Agno | High GitHub signal and agent-platform orientation. | Agents, tools, teams, knowledge, memory, model config. |
| P1 | Haystack | Mature pipeline/RAG framework; useful for enterprise document and search agents. | Pipelines, components, tools, retrievers, generators, routers. |
| P2 | AutoGen / AG2 | Very large historical footprint, but migration and project direction need care. | Conversable agents, group chats, tools, termination/handoff policies. |
| P2 | Vercel AI SDK | Important TypeScript app surface, but less agent-contract-specific than orchestration frameworks. | Tools, model providers, UI-facing tool calls, app integration metadata. |
| P2 | Claude Agent SDK / Claude Code SDK | Important harness ecosystem, especially for coding agents; extraction surface still narrower. | Tools, permissions, model settings, session/harness metadata. |
| P2 | Strands Agents | Emerging Python framework; useful if AWS/enterprise adoption grows. | Agents, tools, model config, guardrails. |

The first plugin tranche should be **Google ADK**, **LangGraph/LangChain**, **CrewAI**, and **OpenAI Agents SDK**, plus **A2A agent-card ingestion** and **MCP server ingestion** as protocol-level plugins. **Hermes Agent should receive an immediate research spike**: its adoption signal is too large to ignore, but its self-improving runtime/skill-library model means ADL extraction may need to inspect runtime state, generated skills, and memory/config artifacts rather than only static source declarations. If those surfaces are stable, promote Hermes to the P0 implementation tranche.

### 5. Recommended Target Order

| Priority | Language | Rationale |
|----------|----------|-----------|
| P0 | Python | Top language for MCP servers, A2A protocol repositories, Google ADK repositories, and the ADK+A2A intersection. Also the primary Google ADK implementation language. |
| P0 | TypeScript | Second strongest MCP and A2A signal; matches existing generator work and the web/docs ecosystem. |
| P1 | Go | Third in A2A and fourth in MCP; important for infrastructure, registries, gateways, and production agent services. |
| P1 | JavaScript | Third in MCP and fourth in A2A; mostly overlaps TypeScript but matters for plain Node examples and lower-friction adoption. |
| P1 | Rust | Near-tied fifth in MCP and tied fourth/fifth in A2A; important for high-performance gateways, security-sensitive infrastructure, and protocol tooling. |

### 6. Enterprise Watchlist

Java should stay on the roadmap even though it is not top five across both main signals. The A2A project publishes an official Java SDK, and Java is likely to matter for enterprise adoption, regulated industries, and standards-body credibility. It should be considered the first P2 target unless customer or contributor demand pulls it forward.

### 7. Generator Scope by Phase

**Phase 1: Renderer + Python/TypeScript Docs**

- Build an ADL renderer that can produce static HTML, Markdown/MDX, and Docusaurus-ready pages.
- Generate ADL-facing documentation stubs and examples for Python and TypeScript agents.
- Include MCP server documentation patterns for both languages.
- Include A2A agent-card and task-schema documentation examples for both languages.
- Build shared conformance fixtures so generated docs can be validated against the same ADL examples.
- Show the source ADL and validation/conformance status in the rendered output.
- Define the plugin API for extractors and renderers.

**Phase 2: Python/TypeScript Code-to-ADL**

- Add MCP server extractors for Python and TypeScript.
- Add Google ADK Python extraction.
- Add A2A agent-card ingestion.
- Add LangGraph/LangChain, CrewAI, and OpenAI Agents SDK extractor prototypes.
- Run a Hermes Agent extraction spike focused on config, model backends, channels, skill library, memory metadata, and generated-skill provenance.
- Emit review-needed annotations for inferred ADL fields.
- Round-trip extracted ADL through the renderer and validator.

**Phase 3: Go + JavaScript + Rust**

- Add Go for production service and gateway implementers.
- Add JavaScript as a low-friction sibling of TypeScript, reusing templates where practical.
- Add Rust for infrastructure, security, and protocol implementers.
- Add extractors only where framework metadata is structured enough to avoid brittle parsing.
- Add LlamaIndex, Pydantic AI, Mastra, Semantic Kernel, Agno, and Haystack plugins as structured metadata surfaces are confirmed.

**Phase 4: Java**

- Add Java once ADL's core generator behavior stabilizes and enterprise integration examples are ready.
- Align examples with the official A2A Java SDK and common Java service patterns.

### 8. Practical Generator Implications

The generator should separate language-neutral ADL semantics from language-specific rendering:

- Keep schema, capability, tool, identity, security, and A2A/MCP mapping logic in shared generator code.
- Keep language-specific naming, package layout, doc-comment style, and framework snippets in per-target templates.
- Prefer examples that can round-trip through the same ADL document and produce comparable output across Python and TypeScript first.
- Treat extracted ADL as a draft contract until a human or CI policy marks it reviewed.
- Preserve a distinction between declared, discovered, and inferred fields in generated output.
- Keep framework plugins independent from language targets. For example, a LangGraph plugin may start in Python but later support TypeScript if the framework surface warrants it.
- Avoid treating Shell, HTML, and Jupyter Notebook as primary generator targets. They are useful supporting formats, but they do not represent durable SDK/runtime targets.

## Alternatives

1. **Python only.** This matches the strongest ADK+A2A signal, but it weakens ADL's cross-ecosystem message and ignores the very large TypeScript MCP/A2A audience.
2. **TypeScript only.** This aligns with the current generator codebase and web developer workflows, but misses the dominant Python ADK and A2A implementation base.
3. **Top five by MCP only.** This would include Shell ahead of Rust. Rejected because Shell is mostly operational glue, not a durable agent implementation target.
4. **Official SDK languages only.** A2A publishes Python, JavaScript/TypeScript, Java, Go, C#/.NET, and Rust SDKs. That is useful validation, but it does not reflect observed MCP server usage as directly as GitHub language facets.
5. **Support every common language immediately.** Rejected because generator quality depends on examples, tests, and idiomatic templates, not just emitting files.
6. **Documentation rendering only.** Attractive for fast adoption, but it repeats OpenAPI's failure mode where the specification is seen only as documentation. Rejected unless the rendered output consistently exposes source ADL, validation, and contract semantics.
7. **Code-to-ADL first.** Useful for bootstrapping existing projects, but risky before the renderer and validation story are strong enough to help users understand and review the generated ADL. Better as Phase 2.
8. **Rank framework plugins by GitHub stars only.** Rejected because ADL extraction needs structured declarations and strategic protocol fit. A smaller framework with explicit typed tools may be a better first plugin than a larger framework that requires brittle source inference.

## Recommendation

Adopt this product sequence:

1. **Render ADL** into static HTML, Markdown/MDX, and Docusaurus-ready pages.
2. **Generate docs from ADL** for Python and TypeScript agent ecosystems.
3. **Extract ADL from code** for Python and TypeScript MCP servers, Google ADK agents, A2A agent cards, LangGraph/LangChain, CrewAI, and OpenAI Agents SDK; run the Hermes Agent extraction spike in the same phase.
4. **Expand generator and extractor targets** to Go, JavaScript, and Rust.

Adopt this framework plugin sequence:

1. **Protocol plugins:** MCP server ingestion and A2A agent-card ingestion.
2. **P0 framework plugins:** Google ADK, LangGraph/LangChain, CrewAI, OpenAI Agents SDK.
3. **P0 research spike:** Hermes Agent, promoted to P0 if stable extraction surfaces are confirmed.
4. **P1 framework plugins:** LlamaIndex, Semantic Kernel / Microsoft Agent Framework, Pydantic AI, Mastra, Agno, Haystack.
5. **P2 watchlist plugins:** AutoGen/AG2, Vercel AI SDK, Claude Agent SDK / Claude Code SDK, Strands Agents.

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
8. Should ADL define a stable plugin API before the first extractor ships, or keep the first plugins internal until the mapping stabilizes?
9. Should framework plugins emit framework-specific `x-*` extensions, or should ADL add first-class workflow/graph/task primitives for common patterns?
10. Should Hermes-style self-improving skills be represented as ordinary tools/capabilities, or should ADL define a separate generated-skill provenance pattern?

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
- Hermes Agent repository: https://github.com/NousResearch/hermes-agent
- LangGraph repository: https://github.com/langchain-ai/langgraph
- CrewAI repository: https://github.com/crewAIInc/crewAI
- OpenAI Agents SDK repository: https://github.com/openai/openai-agents-python
- LlamaIndex repository: https://github.com/run-llama/llama_index
- Microsoft Semantic Kernel repository: https://github.com/microsoft/semantic-kernel
- Pydantic AI repository: https://github.com/pydantic/pydantic-ai
- Mastra repository: https://github.com/mastra-ai/mastra
- Agno repository: https://github.com/agno-agi/agno
- Haystack repository: https://github.com/deepset-ai/haystack
- AutoGen repository: https://github.com/microsoft/autogen
- AG2 repository: https://github.com/ag2ai/ag2
- Vercel AI SDK repository: https://github.com/vercel/ai
- Claude Agent SDK Python repository: https://github.com/anthropics/claude-agent-sdk-python
- Strands Agents SDK Python repository: https://github.com/strands-agents/sdk-python
