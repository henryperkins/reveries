Unified Implementation & Roadmap (v1.0 – 2025-07-16)

This single document supersedes:
• 4HostsImplementationGuide.md
• fullphases.md
• 4HostsPlan.md
• plan.md

It combines everything already delivered and everything still scheduled, so engineers, PMs, and designers can rely on one
canonical source of truth.

---

## Table of Contents

    1. Overview
    2. Phase-by-Phase Breakdown
        1. Foundation *(COMPLETE)*

        2. Context Engineering *(COMPLETE)*

        3. Pipeline Integration *(COMPLETE)*

        4. UI Components *(COMPLETE)*

        5. Type System *(COMPLETE)*

        6. Self-Healing *(COMPLETE)*

        7. Machine-Learning Integration *(IN PROGRESS)*
    3. Usage Examples
    4. Configuration & Tunables
    5. Integration Points
    6. Monitoring & Analytics
    7. Success Metrics
    8. Troubleshooting
    9. Glossary
    10. Next Immediate Steps

---

## 1. Overview

The Four-Hosts paradigm—inspired by Westworld characters Dolores, Teddy, Bernard, and Maeve—has transformed our research agent
from a simple query router into a paradigm-aware, self-healing system.

Each host brings a distinct research style:

┌─────────┬───────────────────────────────────────┐
│ Host │ Speciality (One-liner) │
├─────────┼───────────────────────────────────────┤
│ Dolores │ Action-oriented implementation guides │
├─────────┼───────────────────────────────────────┤
│ Teddy │ Protective coverage & risk mitigation │
├─────────┼───────────────────────────────────────┤
│ Bernard │ Analytical depth with academic rigor │
├─────────┼───────────────────────────────────────┤
│ Maeve │ Strategic, leverage-seeking insights │
└─────────┴───────────────────────────────────────┘

A probabilistic classifier (➡ ParadigmClassifier) chooses one or more hosts per query; context-engineering layers then shape
retrieval, compression, analysis, and synthesis.

---

## 2. Phase-by-Phase Breakdown

Legend – Status emojis: ✅ Complete 🛠 In progress 🗓 Not started

### Phase 1 Foundation ✅

Week 1

    1. Probabilistic **ParadigmClassifier** replaces keyword matching.
    2. **Paradigm-aware cache keys** (`<host>:<normalized-query>`).
    3. **Confidence scoring** now applies host-specific weights (e.g., Bernard +5 pts for academic citations).

### Phase 2 Context Engineering ✅

Week 2

┌──────────┬───────────────────────────────────────────────────────────┐
│ Layer │ Purpose (all paradigms) │
├──────────┼───────────────────────────────────────────────────────────┤
│ Write │ Scratch-pad & long-term memory (density-controlled). │
├──────────┼───────────────────────────────────────────────────────────┤
│ Select │ Paradigm-specific retrieval / tool recommendation. │
├──────────┼───────────────────────────────────────────────────────────┤
│ Compress │ Summarize or lossy-compress context to hit token budgets. │
├──────────┼───────────────────────────────────────────────────────────┤
│ Isolate │ Spawn asynchronous sub-tasks for deep dives. │
└──────────┴───────────────────────────────────────────────────────────┘

### Phase 3 Pipeline Integration ✅

Week 3

Host-specific layer order:

┌─────────────────────────────────────┬─────────────────────────────────────┬─────────────────────────────────────┬────────────
─────────────────────────┐
│ Dolores │ Teddy │ Bernard │ Maeve
│
├─────────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────────┼────────────
─────────────────────────┤
│ Write → Select → Compress → Isolate │ Write → Select → Isolate → Compress │ Select → Write → Compress → Isolate │ Isolate →
Select → Compress → Write │
└─────────────────────────────────────┴─────────────────────────────────────┴─────────────────────────────────────┴────────────
─────────────────────────┘

Execution metadata (layer, timestamps, densities, tools used) is attached to every graph node.

### Phase 4 UI Components ✅

Week 4

    1. **ParadigmIndicator** – shows dominant host icon + description.
    2. **ParadigmProbabilityBar** – stacked bar of probabilities.
    3. **ContextLayerProgress** – real-time layer tracker.
    4. **ResearchAnalytics** – dashboard of confidence, density, tools, etc.

### Phase 5 Type System ✅

Week 4

    * ParadigmProbabilities, ContextLayer union, enriched ResearchMetadata types.

### Phase 6 Self-Healing ✅

Week 5

Host-tuned recovery paths triggered when overall confidence < 40 %:

┌─────────┬──────────────────────────────────────────────────────────────┐
│ Host │ Recovery Action Example │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Dolores │ Broadens keyword set for more actionable items. │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Teddy │ Seeks additional stakeholder viewpoints & risk checklists. │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Bernard │ Adds deeper academic / statistical sources. │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Maeve │ Searches for higher-leverage control points & optimizations. │
└─────────┴──────────────────────────────────────────────────────────────┘

### Phase 7 Machine-Learning Integration 🛠

Weeks 6-8

    1. Replace rule-based classifier with **embedding-similarity model**.
    2. Collect satisfaction feedback → fine-tune paradigm selection.
    3. A/B test against keyword baseline; gate rollout with feature flag `ENABLE_EMBEDDED_CLASSIFIER`.

Future advanced capabilities such as multi-paradigm blending and inter-host collaboration will piggy-back on the ML foundation.

---

## 3. Usage Examples

    1. **Action (Dolores)**

           Q: "How can I implement a zero-waste lifestyle starting today?"
           → Bullet-point action steps, quick wins, blocking-loop breakers
    2. **Protective (Teddy)**

           Q: "What considerations are required for remote-work policies?"
           → Stakeholder matrix, risk register, inclusive recommendations
    3. **Analytical (Bernard)**

           Q: "Analyse theoretical frameworks behind machine learning."
           → Peer-reviewed citations, architectural patterns, knowledge gaps
    4. **Strategic (Maeve)**

           Q: "How do we gain competitive advantage in the SaaS market?"
           → Market control points, influence maps, ROI prioritisation

---

## 4. Configuration & Tunables

• Paradigm threshold: default 0.4 ⇒ ParadigmClassifier.dominant()
• Context density: DEFAULT_CONTEXT_WINDOW_METRICS (0-100 %)
• Memory TTLs: scratch-pad 10 min, memory-store 24 h, cache 30 min

---

## 5. Integration Points

### UI (React / Next.js)

    import { ParadigmDashboard } from '@/components/ParadigmUI';

    <ParadigmDashboard
      paradigm={result.hostParadigm}
      probabilities={result.adaptiveMetadata.paradigmProbabilities}
      metadata={result.adaptiveMetadata}
      layers={contextEngineering.getLayerSequence(result.hostParadigm)}
      currentLayer={result.adaptiveMetadata.currentLayer}
    />;

### Backend / API

    const result = await researchAgent.routeResearchQuery(
      query, model, effort, onProgress
    );

    console.log(result.hostParadigm);                 // 'dolores' | ...
    console.log(result.adaptiveMetadata.paradigmProbabilities); // { dolores: 0.61, ... }
    console.log(result.adaptiveMetadata.contextLayers);         // { executed: [...], results: {...} }

---

## 6. Monitoring & Analytics

Key dashboards (Grafana → research-platform/four-hosts/\*):

    1. Paradigm distribution per 1000 queries.
    2. Mean confidence score by host.
    3. Self-healing invocation frequency.
    4. Context-layer execution times (p50/p95).
    5. Cache hit rates (global vs. paradigm-prefixed).

---

## 7. Success Metrics

    1. **Paradigm Distinction** – measurable divergence in output style (BLEU/ROUGE heuristics).
    2. **User Satisfaction** – ≥ 15 % lift on CSAT for queries > 500 tokens.
    3. **Context Efficiency** – 25 % reduction in total token usage via compression.
    4. **Research Quality** – average confidence score ≥ 60 %.
    5. **UI Clarity** – 90 % of beta users correctly identify active host.

---

## 8. Troubleshooting

┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐
│ Symptom │ Checks / Fixes │
├────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ Low confidence (< 40 %) │ Ensure paradigm fit; verify source availability; inspect self-healing logs. │
├────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ Slow performance │ Profile layer timings; inspect isolation-task queue; check compression ratios. │
├────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ Paradigm misclassification │ Adjust keyword weights (legacy); verify embedding model version; tweak threshold. │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘

---

## 9. Glossary

    * **Context Density** – Percentage of available context window reserved for a host at a given phase.
    * **RAG** – Retrieval-Augmented Generation: combining search results with language-model completion.
    * **Pyramid Layer** – Visual metaphor in analytics for hierarchical context layers.
    * **Self-Healing** – Automatic re-query/re-synthesis when confidence drops below threshold.

---

## 10. Next Immediate Steps (Sprint 28)

    1. **Feature branch** `feature/four-hosts-ml-classifier`.
    2. Implement embedding-based ParadigmClassifier (Phase 7.1).
    3. Add instrumentation to log `userSatisfaction` feedback.
    4. Release behind flag `ENABLE_EMBEDDED_CLASSIFIER` to 10 % traffic.
    5. Validate dashboards & adjust thresholds → Gradual rollout to 100 %.

---

### Change-Log

┌─────────┬────────────┬───────────────────┬───────────────────────────────────────────────────────┐
│ Version │ Date │ Author │ Notes │
├─────────┼────────────┼───────────────────┼───────────────────────────────────────────────────────┤
│ 1.0 │ 2025-07-16 │ Documentation Bot │ First consolidated guide (supersedes 4 previous docs) │
└─────────┴────────────┴───────────────────┴───────────────────────────────────────────────────────┘

---

End of Document
