# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Reverie Engine is a sophisticated AI-powered research assistant with a Westworld-themed UI. It uses a Four Hosts paradigm system (Dolores, Teddy, Bernard, Maeve) to route and process research queries through different analytical approaches.

## Build and Development Commands

```bash
# Development
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint (Note: currently has many warnings)
npm run lint:fix        # Auto-fix ESLint issues
npm run type-check      # TypeScript type checking (tsc --noEmit)
npm run lint:css        # Lint CSS files with Stylelint

# Database
npm run db:start        # Start PostgreSQL in Docker
npm run db:stop         # Stop PostgreSQL
npm run db:test         # Test database connection
npm run db:init         # Initialize database schema
npm run docker:up       # Start all Docker services
npm run docker:down     # Stop all Docker services

# Testing
npm run test            # Run Vitest tests
npm run test:ui         # Run tests with UI
npm run test:coverage   # Generate test coverage
```

## Architecture Overview

### Core Research Flow
1. **User Query** → **Paradigm Classifier** → **Context Engineering** → **Research Execution** → **Quality Evaluation** → **Synthesis** → **Enhanced Results**

### Key Services Architecture

```
/src/services/
├── researchAgentServiceWrapper.ts      # Main entry point (wraps refactored service)
├── researchAgentServiceRefactored.ts   # Core research orchestration
├── paradigmClassifier.ts                # Classifies queries into paradigms
├── contextEngineeringService.ts        # Manages context layers
├── /contextLayers/
│   ├── writeLayer.ts                   # Scratchpad & memory storage
│   ├── selectLayer.ts                  # Source/tool selection
│   ├── compressLayer.ts                # Token reduction
│   └── isolateLayer.ts                 # Async sub-tasks
├── /research/
│   ├── ComprehensiveResearchService.ts # Web research orchestration
│   ├── ResearchStrategyService.ts      # Query type strategies
│   ├── WebResearchService.ts           # Search execution
│   └── EvaluationService.ts            # Quality evaluation & self-healing
└── /providers/
    └── ModelProviderService.ts         # LLM provider abstraction
```

### UI Component Structure

```
/src/
├── App.tsx                             # Main app with state management
├── /components/
│   ├── ResearchView.tsx                # Research steps display
│   ├── ResearchGraphView.tsx           # Visual research graph
│   ├── ParadigmUI.tsx                  # Paradigm indicators
│   ├── FunctionCallDock/               # Live API call monitoring
│   └── InputBar.tsx                    # Query input with suggestions
```

### Four Hosts Paradigm System

Each paradigm has unique characteristics:
- **Dolores** (Action/Revolution): Direct solutions, breaking loops
- **Teddy** (Protection/Loyalty): Comprehensive stakeholder views  
- **Bernard** (Analysis/Knowledge): Academic sources, patterns
- **Maeve** (Strategy/Control): Leverage points, optimization

Context layers execute in paradigm-specific order to optimize research.

## Critical Implementation Details

### Research Workflow State Machine
The workflow progresses through states: `idle` → `analyzing` → `routing` → `researching` → `evaluating` → `synthesizing` → `complete`

Progress messages trigger state transitions:
- "Query classified as:" → analyzing
- "Routing to" + "paradigm" → routing  
- "search queries" or "Comprehensive research" → researching
- "quality" or "evaluating" or "completed, evaluating" → evaluating
- "Finalizing" or "synthesis" or "comprehensive answer" → synthesizing

### Recent Fix: Synthesis Stall
The workflow was stalling after web search because the synthesis progress message was missing. Fixed by adding:
```typescript
onProgress?.('Finalizing comprehensive answer through synthesis...');
```
in `researchAgentServiceRefactored.ts` after evaluation completes.

### Environment Variables
Required for full functionality:
- `VITE_GEMINI_API_KEY` - Google Gemini API
- `VITE_GROK_API_KEY` - Grok API  
- `VITE_AZURE_OPENAI_API_KEY` - Azure OpenAI
- `VITE_AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `VITE_AZURE_AI_AGENT_KEY` - Azure AI Agent
- `VITE_AZURE_AI_AGENT_PROJECT` - Azure AI project name
- `VITE_PINECONE_API_KEY` - Vector search (optional)
- Database connection (see docker-compose.yml)

### Model Support
- `gemini-2.5-flash` - Default, no key required in dev
- `grok-4` - Requires API key
- `o3` - Azure O3 model, requires Azure setup

### Key Design Patterns

1. **Singleton Services**: All services use getInstance() pattern
2. **Progress Callbacks**: Services accept `onProgress?: (message: string) => void`
3. **Tool Usage Tracking**: Messages follow pattern `tool_used:<toolName>` and `tool_used:completed:<toolName>:<startTime>`
4. **Paradigm Caching**: Results cached with key `${paradigm}:${queryHash}`, TTL 30min
5. **Self-Healing**: If confidence < 40%, paradigm-specific recovery strategies activate

### Mobile-First Responsive Design
- Breakpoints: 475px, 640px, 768px
- Touch targets: minimum 44px height
- Safe areas: Uses `env(safe-area-inset-*)` throughout
- Fixed elements account for keyboard presence

### Common Issues

1. **Linting Errors**: Project has many ESLint warnings (400+). Run `npm run type-check` to verify TypeScript compilation.
2. **Database Connection**: Ensure PostgreSQL is running (`npm run db:start`) before starting dev server.
3. **API Keys**: Most features work without keys in dev mode, but some services will fallback to stubs.

## Testing Approach

1. **Type Safety**: Always run `npm run type-check` after changes
2. **Integration Tests**: See `/src/tests/` for examples
3. **Manual Testing**: Test all paradigms with varied queries
4. **Responsive Testing**: Test at breakpoint boundaries (474px, 475px, etc.)

## Key Documentation

- `/docs/4HostsImplementationGuide.md` - Complete paradigm system guide
- `/docs/POST_SYNTHESIS_WORKFLOW.md` - Research completion flow
- `/docs/DESIGN_SYSTEM.md` - UI/UX guidelines
- `/docs/azure_o3_implementation_guide.md` - O3 model setup