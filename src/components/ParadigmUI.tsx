// src/components/ParadigmUI.tsx
import React from 'react';
import {
  HostParadigm,
  ParadigmProbabilities,
  ContextLayer,
  EnhancedResearchResults
} from '@/types';
import { useParadigmTheme, PARADIGM_COLORS } from '@/theme';
import { ProgressMeter } from '@/components/atoms';

/* -------------------------------------------------------------------------- */
/*                             STYLE & META DATA                              */
/* -------------------------------------------------------------------------- */

// Extended paradigm styles using semantic colors with opacity
const EXTENDED_PARADIGM_STYLES = {
  factual:     { bg: 'bg-semantic-info/10',      border: 'border-semantic-info/30',      text: 'text-semantic-info' },
  analytical:  { bg: 'bg-semantic-primary/10',   border: 'border-semantic-primary/30',   text: 'text-semantic-primary' },
  exploratory: { bg: 'bg-semantic-success/10',   border: 'border-semantic-success/30',   text: 'text-semantic-success' },
  comparative: { bg: 'bg-semantic-warning/10',   border: 'border-semantic-warning/30',   text: 'text-semantic-warning' },
  theoretical: { bg: 'bg-semantic-secondary/10', border: 'border-semantic-secondary/30', text: 'text-semantic-secondary' },
  creative:    { bg: 'bg-westworld-rust/10',     border: 'border-westworld-rust/30',     text: 'text-westworld-rust' },
  diagnostic:  { bg: 'bg-westworld-copper/10',   border: 'border-westworld-copper/30',   text: 'text-westworld-copper' },
  evaluative:  { bg: 'bg-westworld-gold/10',     border: 'border-westworld-gold/30',     text: 'text-westworld-gold' }
} as const;

// Helper to get styles for any paradigm - now uses direct access to PARADIGM_COLORS
function getParadigmStyles(paradigm: string) {
  // Check if it's a host paradigm first
  if (paradigm in PARADIGM_COLORS) {
    const theme = PARADIGM_COLORS[paradigm as HostParadigm];
    return {
      bg: theme.bg,
      border: theme.border,
      text: theme.text
    };
  }
  // Fall back to extended styles
  return EXTENDED_PARADIGM_STYLES[paradigm as keyof typeof EXTENDED_PARADIGM_STYLES] ||
         { bg: 'bg-semantic-surface', border: 'border-semantic-border', text: 'text-semantic-text' };
}

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


  return (
    <div className="w-full">
      {/* stacked bar */}
      <ProgressMeter
        variant="stacked"
        stackedSegments={paradigms.map(p => {
          const theme = PARADIGM_COLORS[p];
          return {
            value: probabilities[p] * 100,
            color: theme.bg,
            label: PARADIGM_INFO[p].name,
            paradigm: p,
          };
        })}
        size="lg"
        showPercentage={false}
        animate={true}
      />

      {/* legend */}
      <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
        {paradigms.map((p) => (
          <div key={p} className="flex items-center">
            <span
              className={`mr-1 h-3 w-3 rounded ${PARADIGM_COLORS[p].bg}`}
            />
            <span className="text-semantic-text-muted">
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
  blendedParadigms?: HostParadigm[];
}> = ({ paradigm, probabilities, confidence, blendedParadigms }) => {
  const info   = PARADIGM_INFO[paradigm];
  const styles = getParadigmStyles(paradigm);
  const paradigmProb = probabilities?.[paradigm];

  // Check if we're in multi-paradigm mode
  const isBlended = blendedParadigms && blendedParadigms.length > 1;

  if (isBlended) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-semantic-text-muted">Multi-Paradigm Mode:</span>
          <div className="flex flex-wrap gap-2">
            {blendedParadigms.map(p => {
              const pInfo = PARADIGM_INFO[p];
              const pStyles = getParadigmStyles(p);
              const pProb = probabilities?.[p];

              return (
                <span
                  key={p}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                    pStyles.bg,
                    pStyles.border,
                    pStyles.text
                  ].join(' ')}
                >
                  <span role="img" aria-label={`${pInfo.name} icon`} className="text-base">
                    {pInfo.icon}
                  </span>
                  <span>{pInfo.name.split(' ')[0]}</span>
                  {pProb && (
                    <span className="opacity-75">
                      {Math.round(pProb * 100)}%
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
        {probabilities && <ParadigmProbabilityBar probabilities={probabilities} />}
      </div>
    );
  }

  // Single paradigm display (existing code)
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
      <span className="flex items-center gap-2">
        {info.name}
        {paradigmProb && (
          <span className="text-xs opacity-75">
            {Math.round(paradigmProb * 100)}%
          </span>
        )}
        {confidence && (
          <span className="text-xs opacity-75">
            (conf: {Math.round(confidence * 100)}%)
          </span>
        )}
      </span>
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
  const getParadigmTheme = useParadigmTheme();
  
  const layerInfo: Record<
    ContextLayer,
    { emoji: string; label: string; description: string }
  > = {
    write:    { emoji: '📝', label: 'Write',    description: 'Saving to memory' },
    select:   { emoji: '🔍', label: 'Select',   description: 'Choosing sources' },
    compress: { emoji: '🗜️', label: 'Compress', description: 'Distilling insights' },
    isolate:  { emoji: '🚪', label: 'Isolate',  description: 'Focused analysis' }
  };

  const paradigmTheme = getParadigmTheme(paradigm);

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        {/* timeline track - use CSS variable instead of hardcoded z-0 */}
        <div
          className="absolute top-6 left-0 right-0 h-1 bg-gray-200 z-0"
        />

        {layers.map((layer, idx) => {
          const info     = layerInfo[layer];
          const isActive = layer === currentLayer;
          const isPast   =
            currentLayer ? layers.indexOf(currentLayer) > idx : false;

          return (
            <div
              key={layer}
              className="relative flex flex-col items-center z-[1]"
              style={{
                width: `${100 / layers.length}%`
              }}
            >
              <div
                className={[
                  'flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300',
                  isActive ? 'scale-110' : '',
                  isPast
                    ? `${paradigmTheme.primaryClass} text-white`
                    : isActive
                    ? `${paradigmTheme.primaryClass} animate-pulse text-white opacity-80`
                    : 'bg-semantic-border text-semantic-text-muted'
                ].join(' ')}
              >
                <span className="text-xl">{info.emoji}</span>
              </div>
              <div className="mt-2 text-center">
                <div
                  className={`text-xs font-bold ${
                    isActive
                      ? paradigmTheme.text
                      : 'text-semantic-text-muted'
                  }`}
                >
                  {info.label}
                </div>
                {isActive && (
                  <div className="mt-1 text-xs text-semantic-text-muted">
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
          <div className="text-sm text-semantic-text-muted">Confidence</div>
          <div className="text-2xl font-bold text-semantic-text">
            {(metadata.confidenceScore * 100).toFixed(0)}%
          </div>
          <ProgressMeter
            value={metadata.confidenceScore * 100}
            variant="minimal"
            colorClass="bg-semantic-info"
            size="xs"
            showPercentage={false}
            className="mt-1"
          />
        </div>
      )}

      {/* processing time */}
      {metadata.processingTime !== undefined && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-semantic-text-muted">Processing Time</div>
          <div className="text-2xl font-bold text-semantic-text">
            {(metadata.processingTime / 1000).toFixed(1)} s
          </div>
        </div>
      )}

      {/* complexity */}
      {metadata.complexityScore !== undefined && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-semantic-text-muted">Complexity</div>
          <div className="text-2xl font-bold text-semantic-text">
            {(metadata.complexityScore * 100).toFixed(0)}%
          </div>
          <ProgressMeter
            value={metadata.complexityScore * 100}
            variant="minimal"
            colorClass="bg-semantic-primary"
            size="xs"
            showPercentage={false}
            className="mt-1"
          />
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
                  ? 'bg-semantic-success/10 text-semantic-success'
                  : 'bg-semantic-surface text-semantic-text-muted'
              }`}
            >
              {metadata.cacheHit ? 'Cache Hit' : 'Cache Miss'}
            </span>
          )}
          {metadata.learnedPatterns !== undefined && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                metadata.learnedPatterns
                  ? 'bg-semantic-info/10 text-semantic-info'
                  : 'bg-semantic-surface text-semantic-text-muted'
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
                  ? 'bg-semantic-warning/10 text-semantic-warning'
                  : 'bg-semantic-surface text-semantic-text-muted'
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
          <div className="text-sm text-semantic-text-muted">Context Density</div>
          <div className="text-2xl font-bold text-semantic-text">
            {metadata.contextDensity.toFixed(0)}%
          </div>
        </div>
      )}

      {/* pyramid layer */}
      {metadata.pyramidLayer && (
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-semantic-text-muted">Pyramid Layer</div>
          <div className="text-lg font-bold capitalize text-semantic-text">
            {metadata.pyramidLayer.replace('_', ' ')}
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                   COMPONENT: INTER-HOST COLLABORATION                      */
/* -------------------------------------------------------------------------- */

export const InterHostCollaboration: React.FC<{
  fromHost: HostParadigm;
  toHost: HostParadigm;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}> = ({ fromHost, toHost, reason, status }) => {
  const getParadigmTheme = useParadigmTheme();
  
  const fromInfo = PARADIGM_INFO[fromHost];
  const toInfo = PARADIGM_INFO[toHost];
  const fromTheme = getParadigmTheme(fromHost);
  const toTheme = getParadigmTheme(toHost);

  const statusStyles = {
    pending: 'bg-semantic-surface text-semantic-text-muted',
    processing: 'bg-semantic-info/10 text-semantic-info animate-pulse',
    completed: 'bg-semantic-success/10 text-semantic-success',
    failed: 'bg-semantic-error/10 text-semantic-error'
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${fromTheme.bg} ${fromTheme.border} border`}>
        <span className="text-lg">{fromInfo.icon}</span>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{fromInfo.name.split(' ')[0]}</span>
          <span className="text-semantic-text-muted">→</span>
          <span className="text-sm font-medium">{toInfo.name.split(' ')[0]}</span>
        </div>
        <div className="text-xs text-semantic-text-muted">{reason}</div>
      </div>

      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${toTheme.bg} ${toTheme.border} border`}>
        <span className="text-lg">{toInfo.icon}</span>
      </div>

      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[status]}`}>
        {status}
      </span>
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
