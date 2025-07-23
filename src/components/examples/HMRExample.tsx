import React from 'react';
import { useHMRState, setupHMR, ParadigmClassifierState } from '@/utils/hmr';

/**
 * Example component showing HMR state preservation
 * for the Paradigm Classifier component
 */
export const ParadigmClassifierWithHMR: React.FC = () => {
  // Use HMR-preserved state
  const [classifierState, setClassifierState] = useHMRState<ParadigmClassifierState>(
    'paradigm-classifier',
    {
      probabilities: {
        dolores: 0.25,
        teddy: 0.20,
        bernard: 0.30,
        maeve: 0.25,
      },
      selectedParadigm: null,
      confidence: 0,
    }
  );

  // Example: Update probabilities
  const updateProbabilities = () => {
    const newProbs = {
      dolores: Math.random(),
      teddy: Math.random(),
      bernard: Math.random(),
      maeve: Math.random(),
    };
    
    // Normalize
    const sum = Object.values(newProbs).reduce((a, b) => a + b, 0);
    Object.keys(newProbs).forEach((key) => {
      newProbs[key as keyof typeof newProbs] /= sum;
    });

    setClassifierState({
      ...classifierState,
      probabilities: newProbs,
    });
  };

  return (
    <div className="paradigm-classifier">
      <h3>Paradigm Classifier (HMR Preserved)</h3>
      <div className="probabilities">
        {Object.entries(classifierState.probabilities).map(([paradigm, prob]) => (
          <div key={paradigm} className="paradigm-bar">
            <span>{paradigm}: {(prob * 100).toFixed(1)}%</span>
            <div 
              className="probability-fill"
              style={{ width: `${prob * 100}%` }}
            />
          </div>
        ))}
      </div>
      <button onClick={updateProbabilities}>
        Recalculate Probabilities
      </button>
      <p>
        Selected: {classifierState.selectedParadigm || 'None'} 
        (Confidence: {classifierState.confidence}%)
      </p>
    </div>
  );
};

// Setup HMR for this module
setupHMR('ParadigmClassifierWithHMR');

/**
 * Example: Research Context with HMR
 */
export const ResearchContextWithHMR: React.FC = () => {
  const [contextState, setContextState] = useHMRState(
    'research-context',
    {
      phase: 'analysis' as const,
      queryHistory: [] as string[],
      activeResearch: null as any,
    }
  );

  const addQuery = (query: string) => {
    setContextState({
      ...contextState,
      queryHistory: [...contextState.queryHistory, query],
    });
  };

  return (
    <div className="research-context">
      <h3>Research Context (HMR Preserved)</h3>
      <p>Phase: {contextState.phase}</p>
      <p>Query History: {contextState.queryHistory.length} queries</p>
      <ul>
        {contextState.queryHistory.slice(-5).map((query, idx) => (
          <li key={idx}>{query}</li>
        ))}
      </ul>
    </div>
  );
};

// Setup HMR for this module
setupHMR('ResearchContextWithHMR');