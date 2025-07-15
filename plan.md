# Plan to Fully Realize the Four Hosts Paradigm

## Phase 1: Foundation - Connect Existing Infrastructure (Week 1)

### 1.1 Activate ParadigmClassifier in Research Pipeline

```typescript
// In researchAgentService.ts - Replace determineHostParadigm()
private async determineHostParadigm(query: string): Promise<HostParadigm | null> {
  const classifier = ParadigmClassifier.getInstance();
  const probabilities = classifier.classify(query);
  const dominant = classifier.dominant(probabilities, 0.4);
  
  // Store probabilities in instance for later use
  this.lastParadigmProbabilities = probabilities;
  
  return dominant.length > 0 ? dominant[0] : null;
}
```

### 1.2 Enhance ResearchGraph Metadata

```typescript
// When adding nodes, include paradigm probabilities
const metadata: ResearchMetadata = {
  ...existingMetadata,
  paradigmProbabilities: this.lastParadigmProbabilities,
  dominantParadigm: hostParadigm,
  contextLayer: currentLayer // Track which layer we're in
};
```

### 1.3 Implement Paradigm-Aware Caching

```typescript
// Update cache key generation
private getCacheKey(query: string, paradigm?: HostParadigm): string {
  const base = query.toLowerCase().trim();
  return paradigm ? `${paradigm}:${base}` : base;
}
```

## Phase 2: Context Engineering Implementation (Week 2)

### 2.1 Create Context Layer Services

```typescript
// services/contextLayers/writeLayer.ts
export class WriteLayerService {
  private scratchpad: Map<string, any> = new Map();
  private memoryStore: Map<string, any> = new Map();
  
  write(key: string, value: any, density: number) {
    if (density > 80) {
      this.memoryStore.set(key, value); // Long-term
    } else {
      this.scratchpad.set(key, value); // Short-term
    }
  }
}

// services/contextLayers/selectLayer.ts
export class SelectLayerService {
  async select(query: string, paradigm: HostParadigm, k: number) {
    // RAG implementation
    // Tool selection based on paradigm
  }
}

// services/contextLayers/compressLayer.ts
export class CompressLayerService {
  compress(context: string, targetTokens: number, paradigm: HostParadigm) {
    // Paradigm-specific summarization strategies
  }
}

// services/contextLayers/isolateLayer.ts
export class IsolateLayerService {
  async isolate(task: any, paradigm: HostParadigm) {
    // Spawn sub-agents with paradigm-specific configs
  }
}
```

### 2.2 Integrate Layers into Research Pipeline

```typescript
// In performHostBasedResearch()
private async performHostBasedResearch(
  query: string,
  paradigm: HostParadigm,
  // ... other params
) {
  const layers = this.contextEngineering.getLayerSequence(paradigm);
  const density = this.contextEngineering.adaptContextDensity(phase, paradigm);
  
  for (const layer of layers) {
    await this.executeContextLayer(layer, {
      query,
      paradigm,
      density: density.densities[paradigm],
      // ... context
    });
  }
}
```

## Phase 3: Paradigm-Specific Research Strategies (Week 3)

### 3.1 Dolores - Action-Oriented Research

```typescript
private async performDoloresResearch() {
  // Focus on implementation and action items
  const searches = [
    `${query} implementation guide`,
    `${query} action plan steps`,
    `${query} quick wins immediate`
  ];
  
  // Prioritize: Solutions > Theory
  // Format: Bullet points, action items
  // Tools: Task managers, implementation frameworks
}
```

### 3.2 Teddy - Protective Research

```typescript
private async performTeddyResearch() {
  // Focus on safety and comprehensive coverage
  const searches = [
    `${query} risks considerations`,
    `${query} best practices safety`,
    `${query} stakeholder perspectives`
  ];
  
  // Prioritize: Safety > Speed
  // Format: Detailed documentation
  // Tools: Compliance checkers, risk assessments
}
```

### 3.3 Bernard - Analytical Research

```typescript
private async performBernardResearch() {
  // Already implemented, enhance with:
  // - Academic source prioritization
  // - Statistical analysis tools
  // - Pattern recognition emphasis
  // - Theoretical framework construction
}
```

### 3.4 Maeve - Strategic Research

```typescript
private async performMaeveResearch() {
  // Already implemented, enhance with:
  // - Competitive analysis tools
  // - Influence mapping
  // - Optimization algorithms
  // - ROI calculations
}
```

## Phase 4: Enhanced UI Integration (Week 4)

### 4.1 Paradigm Visualization Component

```typescript
// components/ParadigmIndicator.tsx
export const ParadigmIndicator = ({ probabilities, dominant }) => {
  return (
    <div className="paradigm-indicator">
      <div className="dominant-host">
        <HostAvatar host={dominant} />
        <span>{getHostDescription(dominant)}</span>
      </div>
      <ParadigmProbabilityBar probabilities={probabilities} />
    </div>
  );
};
```

### 4.2 Context Layer Progress Tracker

```typescript
// components/ContextLayerProgress.tsx
export const ContextLayerProgress = ({ currentLayer, sequence, paradigm }) => {
  return (
    <div className="layer-progress">
      {sequence.map(layer => (
        <LayerStep 
          key={layer}
          layer={layer}
          active={layer === currentLayer}
          paradigm={paradigm}
        />
      ))}
    </div>
  );
};
```

### 4.3 Research Analytics Dashboard

```typescript
// components/ResearchAnalytics.tsx
export const ResearchAnalytics = ({ metadata }) => {
  return (
    <div className="analytics-grid">
      <ConfidenceGauge score={metadata.confidenceScore} />
      <DensityChart densities={metadata.densities} />
      <PyramidLayer layer={metadata.pyramidLayer} />
      <ToolsUsed tools={metadata.toolsUsed} />
    </div>
  );
};
```

## Phase 5: Advanced Features (Week 5-6)

### 5.1 Multi-Paradigm Blending

```typescript
// When multiple paradigms have high probability
private async performBlendedResearch(
  query: string,
  paradigms: HostParadigm[],
  probabilities: ParadigmProbabilities
) {
  // Weight results based on probabilities
  // Combine strategies proportionally
  // Show paradigm contributions in UI
}
```

### 5.2 Paradigm Learning & Adaptation

```typescript
// Track successful paradigm selections
private learnParadigmEffectiveness(
  query: string,
  paradigm: HostParadigm,
  userSatisfaction: number
) {
  // Store paradigm-query-satisfaction mappings
  // Adjust future classifications
  // Personalize paradigm selection
}
```

### 5.3 Inter-Host Collaboration

```typescript
// Enable hosts to request help from each other
private async requestHostCollaboration(
  primaryHost: HostParadigm,
  task: string,
  targetHost: HostParadigm
) {
  // Bernard requests Maeve's strategic input
  // Teddy requests Dolores' decisive action
  // etc.
}
```

## Phase 6: Machine Learning Integration (Week 7-8)

### 6.1 Replace Keyword-Based Classifier

```typescript
// services/paradigmClassifier.ts
export class ParadigmClassifier {
  private model: EmbeddingModel;
  
  async classify(prompt: string): Promise<ParadigmProbabilities> {
    const embedding = await this.model.embed(prompt);
    const similarities = await this.computeParadigmSimilarities(embedding);
    return this.softmax(similarities);
  }
}
```

### 6.2 Train on Successful Research Sessions

- Collect labeled data from user interactions
- Fine-tune embeddings for paradigm classification
- A/B test against keyword-based approach

## Implementation Priority Order

1. **Quick Wins (1-2 days)**
- Connect ParadigmClassifier to determineHostParadigm
- Add paradigm to cache keys
- Update confidence scoring with paradigm weights
1. **Core Features (1 week)**
- Implement basic Write/Select/Compress/Isolate services
- Add paradigm indicator to UI
- Enhance paradigm-specific search queries
1. **Advanced Features (2-3 weeks)**
- Full context layer pipeline
- Multi-paradigm blending
- Inter-host collaboration
1. **ML Enhancement (ongoing)**
- Collect training data
- Implement embedding-based classifier
- Continuous improvement

## Success Metrics

1. **Paradigm Distinction**: Each host produces noticeably different results
1. **User Satisfaction**: Higher ratings for paradigm-matched queries
1. **Context Efficiency**: Reduced token usage via smart compression
1. **Research Quality**: Improved confidence scores
1. **UI Clarity**: Users understand which host is helping them

## Next Immediate Steps

1. Create feature branch: `feature/four-hosts-integration`
1. Implement Phase 1.1 (ParadigmClassifier activation)
1. Add basic UI paradigm indicator
1. Test with example queries for each paradigm
1. Iterate based on results

This plan transforms the Four Hosts from a conceptual framework into a functional system that meaningfully impacts research quality and user experience.​​​​​​​​​​​​​​​​