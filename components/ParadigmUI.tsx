import React from 'react';
import { HostParadigm, ParadigmProbabilities, ContextLayer, EnhancedResearchResults } from '../types';

// Component to display paradigm probabilities as a visual bar
export const ParadigmProbabilityBar: React.FC<{
  probabilities: ParadigmProbabilities
}> = ({ probabilities }) => {
  const paradigms: HostParadigm[] = ['dolores', 'teddy', 'bernard', 'maeve'];

  const paradigmColors = {
    dolores: '#DC2626', // red-600
    teddy: '#F59E0B',   // amber-500
    bernard: '#3B82F6', // blue-500
    maeve: '#10B981'    // emerald-500
  };

  const paradigmLabels = {
    dolores: 'Dolores (Action)',
    teddy: 'Teddy (Protection)',
    bernard: 'Bernard (Analysis)',
    maeve: 'Maeve (Strategy)'
  };

  return (
    <div className="w-full">
      <div className="flex h-8 rounded-lg overflow-hidden shadow-inner bg-gray-200">
        {paradigms.map((paradigm) => {
          const percentage = (probabilities[paradigm] * 100).toFixed(1);

          return (
            <div
              key={paradigm}
              className="relative transition-all duration-500 flex items-center justify-center text-xs font-bold text-white"
              style={{
                width: `${percentage}%`,
                backgroundColor: paradigmColors[paradigm],
                minWidth: parseFloat(percentage) > 5 ? 'auto' : '0'
              }}
              title={`${paradigmLabels[paradigm]}: ${percentage}%`}
            >
              {parseFloat(percentage) > 15 && (
                <span className="absolute inset-0 flex items-center justify-center">
                  {percentage}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
        {paradigms.map((paradigm) => (
          <div key={paradigm} className="flex items-center">
            <div
              className="w-3 h-3 rounded mr-1"
              style={{ backgroundColor: paradigmColors[paradigm] }}
            />
            <span className="text-gray-600">
              {paradigm.charAt(0).toUpperCase() + paradigm.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Component to show dominant paradigm with avatar
export const ParadigmIndicator: React.FC<{
  paradigm: HostParadigm;
  probabilities?: ParadigmProbabilities;
  confidence?: number;
}> = ({ paradigm, probabilities, confidence }) => {
  const paradigmInfo: Record<HostParadigm, { emoji: string; title: string; subtitle: string; color: string }> = {
    dolores: {
      emoji: '🔥',
      title: 'Dolores',
      subtitle: 'Bold Action & Awakening',
      color: 'red'
    },
    teddy: {
      emoji: '🛡️',
      title: 'Teddy',
      subtitle: 'Protection & Thoroughness',
      color: 'amber'
    },
    bernard: {
      emoji: '🧩',
      title: 'Bernard',
      subtitle: 'Analysis & Architecture',
      color: 'blue'
    },
    maeve: {
      emoji: '⚡',
      title: 'Maeve',
      subtitle: 'Strategy & Control',
      color: 'emerald'
    }
  };

  const info = paradigmInfo[paradigm];

  return (
    <div className={`bg-${info.color}-50 border-2 border-${info.color}-200 rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-3xl mr-3">{info.emoji}</span>
          <div>
            <h3 className={`text-lg font-bold text-${info.color}-700`}>
              {info.title} Paradigm Active
            </h3>
            <p className="text-sm text-gray-600">{info.subtitle}</p>
          </div>
        </div>
        {confidence !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-700">
              {(confidence * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Confidence</div>
          </div>
        )}
      </div>

      {probabilities && (
        <ParadigmProbabilityBar probabilities={probabilities} />
      )}
    </div>
  );
};

// Component to visualize context layer execution
export const ContextLayerProgress: React.FC<{
  layers: ContextLayer[];
  currentLayer?: ContextLayer;
  paradigm: HostParadigm;
}> = ({ layers, currentLayer, paradigm }) => {
  const layerInfo: Record<ContextLayer, { emoji: string; label: string; description: string }> = {
    write: { emoji: '📝', label: 'Write', description: 'Saving to memory' },
    select: { emoji: '🔍', label: 'Select', description: 'Choosing sources' },
    compress: { emoji: '🗜️', label: 'Compress', description: 'Distilling insights' },
    isolate: { emoji: '🚪', label: 'Isolate', description: 'Focused analysis' }
  };

  const paradigmColors = {
    dolores: 'red',
    teddy: 'amber',
    bernard: 'blue',
    maeve: 'emerald'
  };

  const color = paradigmColors[paradigm];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center relative">
        {/* Progress line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 z-0" />

        {layers.map((layer, index) => {
          const info = layerInfo[layer];
          const isActive = layer === currentLayer;
          const isPast = currentLayer ? layers.indexOf(currentLayer) > index : false;
          const isComplete = isPast;

          return (
            <div
              key={layer}
              className="relative z-10 flex flex-col items-center"
              style={{ width: `${100 / layers.length}%` }}
            >
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  transition-all duration-300 transform
                  ${isActive ? 'scale-110' : ''}
                  ${isComplete ? `bg-${color}-500 text-white` :
                    isActive ? `bg-${color}-400 text-white animate-pulse` :
                    'bg-gray-300 text-gray-600'}
                `}
              >
                <span className="text-xl">{info.emoji}</span>
              </div>
              <div className="mt-2 text-center">
                <div className={`text-xs font-bold ${isActive ? `text-${color}-600` : 'text-gray-600'}`}>
                  {info.label}
                </div>
                {isActive && (
                  <div className="text-xs text-gray-500 mt-1">
                    {info.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Analytics component showing research metadata
export const ResearchAnalytics: React.FC<{
  metadata: EnhancedResearchResults['adaptiveMetadata'] & { confidenceScore?: number };
}> = ({ metadata }) => {
  if (!metadata) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metadata.confidenceScore !== undefined && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Confidence</div>
          <div className="text-2xl font-bold text-gray-700">
            {(metadata.confidenceScore * 100).toFixed(0)}%
          </div>
          <div className="mt-1 h-2 bg-gray-200 rounded">
            <div
              className="h-full bg-blue-500 rounded"
              style={{ width: `${metadata.confidenceScore * 100}%` }}
            />
          </div>
        </div>
      )}

      {metadata.processingTime !== undefined && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Processing Time</div>
          <div className="text-2xl font-bold text-gray-700">
            {(metadata.processingTime / 1000).toFixed(1)}s
          </div>
        </div>
      )}

      {/* Complexity Score */}
      {metadata.complexityScore !== undefined && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Complexity</div>
          <div className="text-2xl font-bold text-gray-700">
            {(metadata.complexityScore * 100).toFixed(0)}%
          </div>
          <div className="mt-1 h-2 bg-gray-200 rounded">
            <div
              className="h-full bg-purple-500 rounded"
              style={{ width: `${metadata.complexityScore * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Cache / Learning / Healing Status */}
      {(metadata.cacheHit !== undefined || metadata.learnedPatterns !== undefined || metadata.selfHealed !== undefined) && (
        <div className="col-span-2 md:col-span-4 bg-white rounded-lg shadow p-4 flex flex-wrap gap-2 items-center">
          {metadata.cacheHit !== undefined && (
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${metadata.cacheHit ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
            >
              {metadata.cacheHit ? 'Cache Hit' : 'Cache Miss'}
            </span>
          )}
          {metadata.learnedPatterns !== undefined && (
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${metadata.learnedPatterns ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}
            >
              {metadata.learnedPatterns ? 'Learned Pattern Applied' : 'No Learned Pattern'}
            </span>
          )}
          {metadata.selfHealed !== undefined && (
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${metadata.selfHealed ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}
            >
              {metadata.selfHealed ? `Self-Healed${metadata.healingStrategy ? `: ${metadata.healingStrategy.replace(/_/g, ' ')}` : ''}` : 'No Self-Healing'}
            </span>
          )}
        </div>
      )}

      {metadata.contextDensity !== undefined && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Context Density</div>
          <div className="text-2xl font-bold text-gray-700">
            {metadata.contextDensity.toFixed(0)}%
          </div>
        </div>
      )}

      {metadata.pyramidLayer && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pyramid Layer</div>
          <div className="text-lg font-bold text-gray-700 capitalize">
            {metadata.pyramidLayer.replace('_', ' ')}
          </div>
        </div>
      )}
    </div>
  );
};

// Main component integrating all paradigm features
export const ParadigmDashboard: React.FC<{
  paradigm?: HostParadigm;
  probabilities?: ParadigmProbabilities;
  metadata?: EnhancedResearchResults['adaptiveMetadata'] & { confidenceScore?: number };
  layers?: ContextLayer[];
  currentLayer?: ContextLayer;
}> = ({ paradigm, probabilities, metadata, layers, currentLayer }) => {
  if (!paradigm) return null;

  return (
    <div className="space-y-6">
      <ParadigmIndicator
        paradigm={paradigm}
        probabilities={probabilities}
        confidence={metadata?.confidenceScore}
      />

      {layers && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Context Engineering Pipeline</h3>
          <ContextLayerProgress
            layers={layers}
            currentLayer={currentLayer}
            paradigm={paradigm}
          />
        </div>
      )}

      {metadata && (
        <div>
          <h3 className="text-lg font-bold mb-4">Research Analytics</h3>
          <ResearchAnalytics metadata={metadata} />
        </div>
      )}
    </div>
  );
};
