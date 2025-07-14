
# Copilot Instructions for Reveries Codebase

## Overview
This is a React + TypeScript app for visualizing and managing AI-driven research workflows. It uses Vite, TailwindCSS, and integrates Gemini, Grok/XAI, and Azure OpenAI APIs. The system is designed for agent orchestration and research graph tracking.

## Architecture & Key Components
- **components/**: UI and workflow. `ResearchGraphView.tsx` visualizes the research graph with zoom/pan, node selection, and export. `App.tsx` orchestrates the main workflow, including session management and agent routing.
- **services/**: API integrations. `researchAgentService.ts` is the main orchestrator, routing requests to Gemini, Grok, or Azure OpenAI. Stubs are used for browser builds (see `vite.config.ts`).
- **researchGraph.ts**: Core logic for graph management, serialization, and visualization. Use `ResearchGraphManager` for all mutations and queries.
- **types.ts**: Shared type definitions for research steps, models, and sources. Models are defined as constants (e.g., `GENAI_MODEL_FLASH`).

## Data Flow & Patterns
- Research steps are nodes in a directed graph. Each node tracks sources, metadata, and errors. Edges represent sequential, dependency, or error relationships (error edges are styled distinctly).
- Model selection is dynamic: Gemini is always available, Grok and Azure OpenAI are enabled only if API keys are present (see `constants.ts`).
- All agent calls return `{ text, sources }` for provenance. Sources are always displayed in the UI and tracked in graph statistics.
- Error handling: Use `markNodeError` to mark nodes as errored and add error edges.
- Export graph visualizations using `generateMermaidDiagram(manager)`.

## Prompting Strategies & Agent Orchestration
- The agent workflow uses LangGraph patterns:
  - **Router Pattern**: Classifies queries as factual, analytical, comparative, or exploratory, and routes to specialized handlers.
  - **Evaluator-Optimizer Pattern**: Analytical queries trigger iterative evaluation and refinement loops for quality improvement.
  - **Orchestrator-Worker Pattern**: Complex queries are broken into sub-topics and researched in parallel, then synthesized.
- Prompt construction for Gemini, Grok, and Azure OpenAI follows best practices: system messages set context, user prompts are passed as `prompt`, and sources/citations are extracted when available.
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

## Conventions & Patterns
- Always use `ResearchGraphManager` for graph mutations. Do not manipulate graph state directly.
- Always pass and display sources for each research step. Use the pattern in `App.tsx`:
  ```tsx
  <ul>
    {sources.map(src => <li><a href={src.url}>{src.name}</a></li>)}
  </ul>
  ```
- UI state (selection, zoom, pan) is managed via React hooks.
- All environment-specific secrets must go in `.env.local` (gitignored).

## Integration Points
- **Gemini, Grok/XAI, Azure OpenAI**: API keys required, see `README.md` and `.env.local`. Gemini is the default and supports Google Search grounding.
- **Graph Layout**: See `utils/graphLayout.ts` for layout engine details.
- **Export**: Use `utils/exportUtils.ts` for formatting durations and exporting data.

## Examples
- To add a research step: `ResearchGraphManager.addNode(step, parentId, metadata)`
- To mark an error: `ResearchGraphManager.markNodeError(nodeId, errorMessage)`
- To export a graph: `generateMermaidDiagram(manager)`

---
For questions or unclear patterns, review `README.md`, `researchGraph.ts`, `App.tsx`, and main UI components. Ask for feedback if any workflow or pattern is ambiguous.
