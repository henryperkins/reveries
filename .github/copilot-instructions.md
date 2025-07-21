

# Copilot Instructions for Reveries Codebase

## Architecture Overview
Reveries is a React/TypeScript AI research orchestration system. Core data flow: `App.tsx` → `ResearchAgentService` → `ResearchGraphManager` → UI components.

**Key Service Pattern:** Always use the wrapper service `researchAgentServiceWrapper.ts` which delegates to the refactored implementation.

**Graph-Centric Design:** All research is tracked as nodes/edges in `ResearchGraphManager`. Never manipulate graph state directly - use manager methods.

## Critical Workflows
```bash
# Development
npm install && npm run dev
# Add API keys to .env.local (Gemini always available, Grok/Azure require keys)

# Build & Deploy
npm run build     # outputs to dist/
npm run preview   # test production build
```

## Agent Orchestration Patterns
**Context Layer System:** Research flows through write→select→compress→isolate layers based on paradigm (dolores/teddy/bernard/maeve).

**Progress State Machine:** `App.tsx` tracks: analyzing→routing→researching→evaluating→synthesizing with adaptive timeouts for O3 models.

**LangGraph Implementation:** Router patterns classify queries, orchestrator-worker breaks complex research into parallel sub-topics.

## Data Flow Conventions
**Research Steps as Graph Nodes:**
```tsx
// Always track parent-child relationships
graphManager.addNode(step, lastNodeIdRef.current ? `node-${lastNodeIdRef.current}` : null);
lastNodeIdRef.current = step.id;
```

**Source Provenance:** Every agent call returns `{ text, sources }`. UI always displays sources:
```tsx
{sources.map(src => <li><a href={src.url}>{src.name}</a></li>)}
```

**Progress Tracking:** Use `onProgress?.('tool_used:toolName')` to trigger FunctionCallDock updates and timeouts.

## Integration Points
**Model Selection:** Dynamic based on API key availability (`constants.ts`). Gemini fallback, O3 gets 4x timeout multipliers.

**Timeout Management:** `TIMEOUTS` constant defines phase-specific values. Progress timeouts prevent hanging with fallback advancement.

**Export/Visualization:** `generateMermaidDiagram(manager)` for graph export, `exportUtils.ts` for markdown/JSON/CSV formats.

## Project-Specific Patterns
- Graph mutations only via `ResearchGraphManager` methods
- Paradigm probabilities drive context density and layer sequencing
- All secrets in `.env.local` (gitignored)
- Function calls tracked in shared context for dock visualization
- Error edges styled differently in graph visualization

**Key Files:** `App.tsx` (orchestrator), `researchGraph.ts` (state), `types.ts` (contracts), `constants.ts` (config)
