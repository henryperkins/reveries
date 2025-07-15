// src/components/Controls.tsx
import React, { useState, useMemo } from 'react';
import {
  EffortType,
  ModelType,
  GENAI_MODEL_FLASH,
  GROK_MODEL_4,
  AZURE_O3_MODEL
} from '../types';
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { GROK_AVAILABLE, AZURE_OPENAI_AVAILABLE } from '../constants';

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface ControlsProps {
  /* research parameters */
  selectedEffort: EffortType;
  onEffortChange: (effort: EffortType) => void;

  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;

  /* actions */
  onNewSearch: () => void;
  onStart?: () => void;
  onClear?: () => void;
  onToggleGraph?: () => void;
  onExport?: () => void;

  /* state flags */
  isLoading: boolean;
  isEmpty?: boolean;

  /* enhanced / beta flags */
  enhancedMode?: boolean;
  onEnhancedModeChange?: (enabled: boolean) => void;
}

/* -------------------------------------------------------------------------- */
/*                             STATIC MODEL DATA                              */
/* -------------------------------------------------------------------------- */

const MODEL_INFO = {
  [GENAI_MODEL_FLASH]: {
    name: 'Gemini Flash 2.5',
    description: 'Fast, efficient research with Google Search integration',
    icon: '⚡',
    color: 'from-blue-500 to-indigo-600',
    available: true                  // always on
  },
  [GROK_MODEL_4]: {
    name: 'Grok 4',
    description: 'Advanced reasoning with real‑time data access',
    icon: '🚀',
    color: 'from-purple-500 to-pink-600',
    available: GROK_AVAILABLE
  },
  [AZURE_O3_MODEL]: {
    name: 'Azure o3',
    description: 'Cutting‑edge reasoning with deliberative processing',
    icon: '🧠',
    color: 'from-green-500 to-teal-600',
    available: AZURE_OPENAI_AVAILABLE
  }
} as const;

/* Effort info is not yet rendered in the UI but kept for future use */
const EFFORT_INFO = {
  [EffortType.LOW]: { name: 'Quick Scout',   icon: '🏃', time: '~10 s' },
  [EffortType.MEDIUM]: { name: 'Thorough Analysis', icon: '🔍', time: '~30 s' },
  [EffortType.HIGH]: { name: 'Deep Dive',    icon: '🏔️', time: '~60 s' }
} as const;

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export const Controls: React.FC<ControlsProps> = ({
  /* research parameters */
  selectedEffort,
  onEffortChange,
  selectedModel,
  onModelChange,

  /* actions */
  onNewSearch,
  onStart,
  onClear,
  onToggleGraph,
  onExport,

  /* state flags */
  isLoading,
  isEmpty,

  /* enhanced toggle */
  enhancedMode = false,
  onEnhancedModeChange
}) => {
  /* local UI state --------------------------------------------------------- */
  const [showConfig, setShowConfig] = useState(false);
  const availableModels = useMemo(
    () => Object.entries(MODEL_INFO).filter(([, info]) => info.available),
    []
  );

  /* ------------------------------------------------------------------------ */
  /*                                   JSX                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* primary action group ------------------------------------------------ */}
      <div className="flex flex-1 gap-2">
        <button
          onClick={onStart}
          disabled={isLoading || isEmpty}
          className="btn-primary flex items-center gap-2"
          aria-label="Start research"
        >
          <PlayIcon className="h-5 w-5" />
          <span>Research</span>
        </button>

        <button
          onClick={onClear}
          disabled={isLoading || isEmpty}
          className="btn-secondary flex items-center gap-2"
          aria-label="Clear research"
        >
          <TrashIcon className="h-5 w-5" />
          <span>Clear</span>
        </button>

        <button
          onClick={onToggleGraph}
          disabled={isEmpty}
          className="btn-secondary flex items-center gap-2"
          aria-label="View research graph"
        >
          <ChartBarIcon className="h-5 w-5" />
          <span>Graph</span>
        </button>

        <button
          onClick={onExport}
          disabled={isEmpty}
          className="btn-secondary flex items-center gap-2"
          aria-label="Export research"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span>Export</span>
        </button>
      </div>

      {/* toggle + config ----------------------------------------------------- */}
      <div className="flex items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={enhancedMode}
            onChange={(e) => onEnhancedModeChange?.(e.target.checked)}
            aria-label="Toggle enhanced mode"
            className="h-4 w-4 rounded border-westworld-tan bg-westworld-cream
                       text-westworld-gold focus:ring-2 focus:ring-westworld-gold"
          />
          <span className="text-sm text-westworld-darkbrown">Enhanced Mode</span>
        </label>

        <button
          onClick={() => setShowConfig((v) => !v)}
          className="rounded-lg p-2 transition-colors hover:bg-westworld-tan/20"
          aria-label="Toggle configuration"
          aria-expanded={showConfig}
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-westworld-copper" />
        </button>
      </div>

      {/* slide‑down config panel -------------------------------------------- */}
      {showConfig && (
        <div className="absolute right-0 top-full z-10 mt-2 w-80 animate-slideUp
                        rounded-lg border border-westworld-tan/30 bg-westworld-cream
                        p-4 shadow-xl">
          <h3 className="mb-4 text-lg font-semibold text-westworld-black">
            Configuration
          </h3>

          {/* model selector -------------------------------------------------- */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="model-select"
                className="mb-2 block text-sm font-medium text-westworld-darkbrown"
              >
                AI Model
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) =>
                  onModelChange?.(e.target.value as ModelType)
                }
                aria-label="Select AI model"
                className="w-full rounded-lg border border-westworld-tan/30
                           bg-westworld-white px-3 py-2 focus:border-westworld-gold
                           focus:ring-2 focus:ring-westworld-gold"
              >
                {availableModels.map(([model]) => (
                  <option key={model} value={model}>
                    {MODEL_INFO[model as keyof typeof MODEL_INFO].name}
                  </option>
                ))}
              </select>
            </div>

            {/* model summaries ---------------------------------------------- */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-westworld-darkbrown">
                Available Models
              </h4>
              <div className="space-y-2">
                {availableModels.map(([model]) => {
                  const info = MODEL_INFO[model as keyof typeof MODEL_INFO];
                  const isActive = model === selectedModel;

                  return (
                    <div
                      key={model}
                      className={`rounded-lg border p-2 ${
                        isActive
                          ? 'border-westworld-gold bg-westworld-gold/10'
                          : 'border-westworld-tan/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{info.name}</span>
                        <span
                          className={`bg-gradient-to-r ${info.color} rounded-full px-2 py-1 text-xs text-white`}
                        >
                          {info.icon}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-westworld-darkbrown/70">
                        {info.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* new search button --------------------------------------------------- */}
      <button
        onClick={onNewSearch}
        disabled={isLoading}
        className="mt-4 flex w-full transform items-center
                   justify-center gap-2 rounded-xl bg-gradient-to-r
                   from-westworld-gold to-westworld-copper px-6 py-3 font-medium
                   text-black shadow-md transition-all duration-300
                   hover:from-westworld-rust hover:to-westworld-copper
                   hover:scale-[1.02] hover:text-white hover:shadow-xl
                   active:scale-[0.98] disabled:cursor-not-allowed
                   disabled:opacity-50 sm:mt-0 sm:w-auto"
      >
        <PlusIcon className="h-5 w-5" />
        Start New Research Session
      </button>
    </div>
  );
};
