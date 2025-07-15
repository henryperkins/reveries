

# Copilot Instructions for Reveries Codebase

## Project Overview
Reveries is a React + TypeScript application for orchestrating and visualizing AI-driven research workflows. It leverages Vite, TailwindCSS, and integrates Gemini, Grok/XAI, and Azure OpenAI APIs. The core architecture is built around agent orchestration and research graph tracking.

## Architecture & Key Files
- **src/components/**: UI and workflow logic. `App.tsx` is the main orchestrator; `ResearchGraphView.tsx` handles graph visualization and export.
- **src/services/researchAgentService.ts**: Central agent router, implements LangGraph patterns and model selection logic. Handles Gemini, Grok, Azure OpenAI integration and fallback.
- **src/researchGraph.ts**: Manages graph state, node/edge creation, error handling, export, and statistics. Use `ResearchGraphManager` for all graph mutations.
- **src/types.ts**: Shared types for research steps, models, sources, and paradigms.

## Data Flow & Patterns
- Research steps are nodes in a directed graph. Each node tracks sources, metadata, and errors. Edges represent sequential, dependency, or error relationships (error edges are styled distinctly).
- Model selection is dynamic: Gemini is always available; Grok and Azure OpenAI are enabled only if API keys are present (see `constants.ts`).
- All agent calls return `{ text, sources }` for provenance. Sources are always displayed in the UI and tracked in graph statistics.
- Error handling: Use `markNodeError` to mark nodes as errored and add error edges.
- Export graph visualizations using `generateMermaidDiagram(manager)`.

## Agent Orchestration & Prompting
- LangGraph patterns used:
  - **Router Pattern**: Classifies queries as factual, analytical, comparative, or exploratory, and routes to specialized handlers.
  - **Evaluator-Optimizer Pattern**: Analytical queries trigger iterative evaluation and refinement loops for quality improvement.
  - **Orchestrator-Worker Pattern**: Complex queries are broken into sub-topics and researched in parallel, then synthesized.
- Prompts for Gemini, Grok, and Azure OpenAI follow best practices: system messages set context, user prompts are passed as `prompt`, and sources/citations are extracted when available.
- For Gemini, use Google Search grounding for web research. For Grok, use `search_parameters` for live search and citations. For Azure OpenAI, set `reasoning_effort` for o3 models.

## Developer Workflows
- **Install & Run:**
  - `npm install`
  - Add API keys to `.env.local` (see `README.md`)
  - `npm run dev` to start locally
- **Build:**
  - `npm run build` (outputs to `dist/`)
- **Lint:**
  - `npm run lint` or `npm run lint:fix`
- **Preview:**
  - `npm run preview`

## Project-Specific Conventions
- Always use `ResearchGraphManager` for graph mutations. Do not manipulate graph state directly.
- Always pass and display sources for each research step. Example from `App.tsx`:
  ```tsx
  <ul>
    {sources.map(src => <li><a href={src.url}>{src.name}</a></li>)}
  </ul>
  ```
- UI state (selection, zoom, pan) is managed via React hooks.
- All environment-specific secrets must go in `.env.local` (gitignored).

## Integration Points
- **Gemini, Grok/XAI, Azure OpenAI**: API keys required, see `README.md` and `.env.local`. Gemini is the default and supports Google Search grounding.
- **Graph Layout**: See `src/utils/graphLayout.ts` for layout engine details.
- **Export**: Use `src/utils/exportUtils.ts` for formatting durations and exporting data.

## Examples
- Add a research step: `ResearchGraphManager.addNode(step, parentId, metadata)`
- Mark an error: `ResearchGraphManager.markNodeError(nodeId, errorMessage)`
- Export a graph: `generateMermaidDiagram(manager)`

---
For questions or unclear patterns, review `README.md`, `src/researchGraph.ts`, `src/App.tsx`, and main UI components. Ask for feedback if any workflow or pattern is ambiguous or incomplete.
