Phase 1: Foundation Implementation
https://claude.ai/public/artifacts/5b43ccde-c8db-4571-b3c1-91e1c85ca5e3

Phase 2: Context Layer Implementation
https://claude.ai/public/artifacts/385ff75e-f9fe-482f-802c-6bbe6a12d47b

Phase 3: Context Layer Pipeline Integration
https://claude.ai/public/artifacts/9d0564a2-aabe-476e-9622-f75f810611db

Phase 4: UI Components for Paradigm Visualization
https://claude.ai/public/artifacts/50f51ec6-4f8c-4a4a-bc1c-98ab43e602cf

Phase 5: Type Definitions Update
https://claude.ai/public/artifacts/8f1f0162-e31d-4234-b675-f1cafb21f5bd

Phase 6: Paradigm-Specific Self-Healing
https://claude.ai/public/artifacts/6b047e08-0f9b-4144-b9e3-4be038584bef

Integration Example for App.tsx
https://claude.ai/public/artifacts/ad3e2e03-3715-4279-85f8-8650cc761019

---

# Four Hosts Paradigm - Complete Implementation Guide

## Overview

The Four Hosts paradigm from Westworld has been fully integrated into the research application, transforming it from a simple query router into a sophisticated, paradigm-aware research system.

## What Was Implemented

### Phase 1: Foundation (✅ Complete)
- **Probabilistic Paradigm Classification**: Replaced keyword matching with `ParadigmClassifier` that returns probability distributions
- **Paradigm-Aware Caching**: Cache keys now include paradigm prefixes for better isolation
- **Enhanced Confidence Scoring**: Paradigm-specific confidence adjustments (Bernard +5% for evaluations, Maeve +3% for strategy, etc.)

### Phase 2: Context Engineering (✅ Complete)
- **Write Layer**: Short-term scratchpad and long-term memory storage
- **Select Layer**: Paradigm-specific source selection and tool recommendations
- **Compress Layer**: Tailored compression strategies for each paradigm
- **Isolate Layer**: Async sub-task execution for focused analysis

### Phase 3: Pipeline Integration (✅ Complete)
- **Layer Sequencing**: Each paradigm executes layers in specific order:
  - Dolores: Write → Select → Compress → Isolate
  - Teddy: Write → Select → Isolate → Compress
  - Bernard: Select → Write → Compress → Isolate
  - Maeve: Isolate → Select → Compress → Write
- **Enhanced Research Methods**: All four paradigms now use context layers
- **Metadata Tracking**: Full tracking of layer execution and results

### Phase 4: UI Components (✅ Complete)
- **ParadigmProbabilityBar**: Visual representation of paradigm probabilities
- **ParadigmIndicator**: Shows dominant paradigm with confidence
- **ContextLayerProgress**: Real-time visualization of layer execution
- **ResearchAnalytics**: Comprehensive metadata dashboard

### Phase 5: Type System (✅ Complete)
- **ParadigmProbabilities**: Type for probability distributions
- **ContextLayer**: Union type for layer names
- **Enhanced Metadata**: Full tracking of paradigm and layer information

### Phase 6: Self-Healing (✅ Complete)
- **Dolores**: Expands search for more actionable results
- **Teddy**: Seeks comprehensive stakeholder perspectives
- **Bernard**: Deepens analysis with academic sources
- **Maeve**: Identifies higher-leverage control points

## How It Works

1. **Query Analysis**: When a user submits a query, the system:
   - Classifies the query type (factual, analytical, etc.)
   - Runs ParadigmClassifier to get probability distribution
   - Selects dominant paradigm(s) above threshold

2. **Context Engineering**: Based on the paradigm:
   - Determines research phase and context density
   - Executes layers in paradigm-specific order
   - Stores intermediate results in paradigm-namespaced memory

3. **Research Execution**: Each paradigm has unique:
   - Search query patterns
   - Source selection criteria
   - Synthesis prompts
   - Output formatting

4. **Quality Assurance**:
   - Confidence scoring with paradigm weighting
   - Self-healing if confidence < 40%
   - Paradigm-specific recovery strategies

## Usage Examples

### Action-Oriented Query (Dolores)
```
Query: "How can I implement a zero-waste lifestyle starting today?"
Result: Bullet-pointed action steps, immediate implementations, breaking consumption loops
```

### Protective Query (Teddy)
```
Query: "What are all the considerations for remote work policies?"
Result: Comprehensive stakeholder views, risk assessments, inclusive recommendations
```

### Analytical Query (Bernard)
```
Query: "Analyze the theoretical frameworks behind machine learning"
Result: Academic sources, architectural patterns, knowledge gaps, peer-reviewed content
```

### Strategic Query (Maeve)
```
Query: "How to gain competitive advantage in the SaaS market?"
Result: Control points, influence maps, optimization strategies, leverage opportunities
```

## Configuration

### Paradigm Thresholds
- Default: 0.4 (40% probability required for activation)
- Adjustable in `ParadigmClassifier.dominant()`

### Context Densities
- Defined in `constants.ts` as `DEFAULT_CONTEXT_WINDOW_METRICS`
- Range: 0-100% per paradigm per research phase

### Memory TTLs
- Scratchpad: 10 minutes
- Memory Store: 24 hours
- Research Cache: 30 minutes

## Future Enhancements

1. **Multi-Paradigm Blending**: When multiple paradigms have high probability
2. **Paradigm Learning**: Track successful paradigm selections for personalization
3. **Inter-Host Collaboration**: Allow paradigms to request help from each other
4. **ML-Based Classification**: Replace keyword classifier with embeddings

## Integration Points

### For UI Developers
```tsx
import { ParadigmDashboard } from './components/ParadigmUI';

<ParadigmDashboard
  paradigm={result.hostParadigm}
  probabilities={result.adaptiveMetadata?.paradigmProbabilities}
  metadata={result.adaptiveMetadata}
  layers={contextEngineering.getLayerSequence(paradigm)}
  currentLayer={currentLayer}
/>
```

### For API Consumers
```typescript
const result = await researchAgent.routeResearchQuery(
  query,
  model,
  effort,
  onProgress
);

// Access paradigm info
console.log(result.hostParadigm); // 'dolores' | 'teddy' | 'bernard' | 'maeve'
console.log(result.adaptiveMetadata.paradigmProbabilities); // { dolores: 0.6, ... }
console.log(result.adaptiveMetadata.contextLayers); // { executed: [...], results: {...} }
```

## Monitoring & Analytics

Key metrics to track:
- Paradigm distribution across queries
- Confidence scores by paradigm
- Self-healing frequency
- Context layer execution times
- Cache hit rates by paradigm

## Troubleshooting

### Low Confidence Scores
- Check if paradigm matches query intent
- Verify source availability for paradigm
- Review self-healing logs

### Slow Performance
- Monitor context layer execution times
- Check isolation layer task queue
- Review compression ratios

### Paradigm Misclassification
- Adjust keyword weights in classifier
- Collect training data for ML upgrade
- Consider multi-paradigm threshold adjustment
