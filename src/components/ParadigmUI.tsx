// src/components/ParadigmUI.tsx
import React from 'react';
import {
  HostParadigm,
  ParadigmProbabilities,
  ContextLayer,
  EnhancedResearchResults
} from '../types';

/* -------------------------------------------------------------------------- */
/*                             STYLE & META DATA                              */
/* -------------------------------------------------------------------------- */

const PARADIGM_STYLES = {
  factual:     { bg: 'bg-blue-50',      border: 'border-blue-200',      text: 'text-blue-700' },
  analytical:  { bg: 'bg-purple-50',    border: 'border-purple-200',    text: 'text-purple-700' },
  exploratory: { bg: 'bg-green-50',     border: 'border-green-200',     text: 'text-green-700' },
  comparative: { bg: 'bg-amber-50',     border: 'border-amber-200',     text: 'text-amber-700' },
  theoretical: { bg: 'bg-indigo-50',    border: 'border-indigo-200',    text: 'text-indigo-700' },
  creative:    { bg: 'bg-pink-50',      border: 'border-pink-200',      text: 'text-pink-700' },
  diagnostic:  { bg: 'bg-cyan-50',      border: 'border-cyan-200',      text: 'text-cyan-700' },
  evaluative:  { bg: 'bg-emerald-50',   border: 'border-emerald-200',   text: 'text-emerald-700' }
} as const;

/** Rich labels and emoji avatars for each host paradigm */
const PARADIGM_INFO: Record<HostParadigm, { icon: string; name: string }> = {
  dolores:  { icon: '🤠', name: 'Dolores (Action)' },
  teddy:    { icon: '🛡️', name: 'Teddy (Protection)' },
  bernard:  { icon: '🧠', name: 'Bernard (Analysis)' },
  maeve:    { icon: '🕊️', name: 'Maeve (Strategy)' }
};

/* -------------------------------------------------------------------------- */
/*                         COMPONENT: PARADIGM BAR                            */
/* -------------------------------------------------------------------------- */

export const ParadigmProbabilityBar: React.FC<{
  probabilities: ParadigmProbabilities;
}> = ({ probabilities }) => {
  const paradigms: HostParadigm[] = ['dolores', 'teddy', 'bernard', 'maeve'];

  const paradigmColors: Record<HostParadigm, string> = {
    dolores: '#DC2626', // red‑600
    teddy:   '#F59E0B', // amber‑500
    bernard: '#3B82F6', // blue‑500
    maeve:   '#10B981'  // emerald‑500
  };

  return (
    <div className="w-full">
      {/* stacked bar */}
      <div className="flex h-8 overflow-hidden rounded-lg bg-gray-200 shadow-inner">
        {paradigms.map((p) => {
          const pct = (probabilities[p] * 100).toFixed(1);
          return (
            <div
              key={p}
              className="relative flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: paradigmColors[p],
                minWidth: parseFloat(pct) > 5 ? 'auto' : '0'
              }}
              title={`${PARADIGM_INFO[p].name}: ${pct}%`}
            >
              {parseFloat(pct) > 15 && (
                <span className="absolute inset-0 flex items-center justify-center">
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
        {paradigms.map((p) => (
          <div key={p} className="flex items-center">
            <span
              className="mr-1 h-3 w-3 rounded"
              style={{ backgroundColor: paradigmColors[p] }}
            />
            <span className="text-gray-600">
              {PARADIGM_INFO[p].name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                      COMPONENT: PARADIGM INDICATOR                         */
/* -------------------------------------------------------------------------- */

export const ParadigmIndicator: React.FC<{
  paradigm: HostParadigm;
  probabilities?: ParadigmProbabilities;
  confidence?: number;
}> = ({ paradigm }) => {
  const info   = PARADIGM_INFO[paradigm];
  const styles = PARADIGM_STYLES[paradigm] ?? PARADIGM_STYLES.factual;

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
        styles.bg,
        styles.border,
        styles.text
      ].join(' ')}
    >
      <span role="img" aria-label={`${info.name} icon`} className="text-lg">
        {info.icon}
      </span>
      {info.name}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*                   COMPONENT: CONTEXT LAYER PROGRESS BAR                    */
/* -------------------------------------------------------------------------- */

export const ContextLayerProgress: React.FC<{
  layers: ContextLayer[];
  currentLayer?: ContextLayer;
  paradigm: HostParadigm;
}> = ({ layers, currentLayer, paradigm }) => {
  const layerInfo: Record<
    ContextLayer,
    { emoji: string; label: string; description: string }
  > = {
    write:    { emoji: '📝', label: 'Write',    description: 'Saving to memory' },
    select:   { emoji: '🔍', label: 'Select',   description: 'Choosing sources' },
    compress: { emoji: '🗜️', label: 'Compress', description: 'Distilling insights' },
    isolate:  { emoji: '🚪', label: 'Isolate',  description: 'Focused analysis' }
  };

  const paradigmColorTailwind = {
    dolores: 'red',
    teddy:   'amber',
    bernard: 'blue',
    maeve:   'emerald'
  }[paradigm];

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        {/* timeline track */}
        <div className="absolute top-6 left-0 right-0 z-0 h-1 bg-gray-200" />

        {layers.map((layer, idx) => {
          const info     = layerInfo[layer];
          const isActive = layer === currentLayer;
          const isPast   =
            currentLayer ? layers.indexOf(currentLayer) > idx : false;

          return (
            <div
              key={layer}
              className="relative z-10 flex flex-col items-center"
              style={{ width: `${100 / layers.length}%` }}
            >
              <div
                className={[
                  'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300',
                  isActive ? 'scale-110' : '',
                  isPast
                    ? `bg-${paradigmColorTailwind}-500 text-white`
                    : isActive
                    ? `bg-${paradigmColorTailwind}-400 animate-pulse text-white`
                    : 'bg-gray-300 text-gray-600'
                ].join(' ')}
              >
                <span className="text-xl">{info.emoji}</span>
              </div>
              <div className="mt-2 text-center">
                <div
                  className={`text-xs font-bold ${
                    isActive
                      ? `text-${paradigmColorTailwind}-600`
                      : 'text-gray-600'
                  }`}
                >
                  {info.label}
                </div>
                {isActive && (
                  <div className="mt-1 text-xs text-gray-500">
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

/* -------------------------------------------------------------------------- */
/*                    COMPONENT: RESEARCH ANALYTICS PANEL                     */
/* -------------------------------------------------------------------------- */

export const ResearchAnalytics: React.FC<{
  metadata: EnhancedResearchResults['adaptiveMetadata'] & {
    confidenceScore?: number;
  };
}> = ({ metadata }) => {
  if (!metadata) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {/* confidence */}
      {metadata.confidenceScore !== undefined && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Confidence</div>
          <div className="text-2xl font-bold text-gray-700">
            {(metadata.confidenceScore * 100).toFixed(0)}%
          </div>
          <div className="mt-1 h-2 rounded bg-gray-200">
            <div
              className="h-full rounded bg-blue-500"
              style={{ width: `${metadata.confidenceScore * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* processing time */}
      {metadata.processingTime !== undefined && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Processing Time</div>
          <div className="text-2xl font-bold text-gray-700">
            {(metadata.processingTime / 1000).toFixed(1)} s
          </div>
        </div>
      )}

      {/* complexity */}
      {metadata.complexityScore !== undefined && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Complexity</div>
          <div className="text-2xl font-bold text-gray-700">
            {(metadata.complexityScore * 100).toFixed(0)}%
          </div>
          <div className="mt-1 h-2 rounded bg-gray-200">
            <div
              className="h-full rounded bg-purple-500"
              style={{ width: `${metadata.complexityScore * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* cache / learning / healing */}
      {(metadata.cacheHit !== undefined ||
        metadata.learnedPatterns !== undefined ||
        metadata.selfHealed !== undefined) && (
        <div className="col-span-2 flex flex-wrap items-center gap-2 rounded-lg bg-white p-4 shadow md:col-span-4">
          {metadata.cacheHit !== undefined && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                metadata.cacheHit
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {metadata.cacheHit ? 'Cache Hit' : 'Cache Miss'}
            </span>
          )}
          {metadata.learnedPatterns !== undefined && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                metadata.learnedPatterns
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {metadata.learnedPatterns
                ? 'Learned Pattern Applied'
                : 'No Learned Pattern'}
            </span>
          )}
          {metadata.selfHealed !== undefined && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                metadata.selfHealed
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {metadata.selfHealed
                ? `Self‑Healed${
                    metadata.healingStrategy
                      ? `: ${metadata.healingStrategy.replace(/_/g, ' ')}`
                      : ''
                  }`
                : 'No Self‑Healing'}
            </span>
          )}
        </div>
      )}

      {/* context density */}
      {metadata.contextDensity !== undefined && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Context Density</div>
          <div className="text-2xl font-bold text-gray-700">
            {metadata.contextDensity.toFixed(0)}%
          </div>
        </div>
      )}

      {/* pyramid layer */}
      {metadata.pyramidLayer && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Pyramid Layer</div>
          <div className="text-lg font-bold capitalize text-gray-700">
            {metadata.pyramidLayer.replace('_', ' ')}
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                  COMPONENT: HIGH‑LEVEL PARADIGM DASHBOARD                  */
/* -------------------------------------------------------------------------- */

export const ParadigmDashboard: React.FC<{
  paradigm?: HostParadigm;
  probabilities?: ParadigmProbabilities;
  metadata?: EnhancedResearchResults['adaptiveMetadata'] & {
    confidenceScore?: number;
  };
  layers?: ContextLayer[];
  currentLayer?: ContextLayer;
}> = ({ paradigm, probabilities, metadata, layers, currentLayer }) => {
  if (!paradigm) return null;

  return (
    <div className="space-y-6">
      {/* dominant paradigm pill */}
      <ParadigmIndicator paradigm={paradigm} />

      {/* probability bar */}
      {probabilities && (
        <ParadigmProbabilityBar probabilities={probabilities} />
      )}

      {/* context‑engineering pipeline */}
      {layers && (
        <section className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-bold">Context Engineering Pipeline</h3>
          <ContextLayerProgress
            layers={layers}
            currentLayer={currentLayer}
            paradigm={paradigm}
          />
        </section>
      )}

      {/* analytics */}
      {metadata && (
        <section>
          <h3 className="mb-4 text-lg font-bold">Research Analytics</h3>
          <ResearchAnalytics metadata={metadata} />
        </section>
      )}
    </div>
  );
};
