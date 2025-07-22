// src/components/Controls.tsx
import React, { useState, useMemo } from 'react';
import {
   ModelType,
   EffortType,
   GENAI_MODEL_FLASH,
   GROK_MODEL_4,
   AZURE_O3_MODEL
 } from '@/types';
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
    name: 'Gemini Flash 2.5',
    description: 'Fast, efficient research with Google Search integration',
    icon: '⚡',
    color: 'from-blue-500 to-indigo-600',
    available: true
  },
  [GROK_MODEL_4]: {
    name: 'Grok 4',
    description: 'Advanced reasoning with real‑time data access',
    icon: '🚀',
    color: 'from-purple-500 to-pink-600',
    available: GROK_AVAILABLE
  },
  [AZURE_O3_MODEL]: {
    name: 'Azure o3',
    description: 'Cutting‑edge reasoning with deliberative processing',
    icon: '🧠',
    color: 'from-green-500 to-teal-600',
    available: AZURE_OPENAI_AVAILABLE
  }
} as const;

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export const Controls: React.FC<ControlsProps> = ({
  selectedModel,
  onModelChange,
  onNewSearch,
  onStart,
  onClear,
  onToggleGraph,
  onExport,
  isLoading,
  isEmpty,
  enhancedMode,
  onEnhancedModeChange,
  selectedEffort,
  onEffortChange
}) => {
  const [showConfig, setShowConfig] = useState(true);

  // Available models based on API key configuration
  const availableModels = useMemo(() =>
    Object.entries(MODEL_INFO)
      .filter(([, info]) => info.available)
      .map(([model]) => model as ModelType),
    []
  );

  return (
    <div className="relative flex flex-col gap-4 p-4 bg-theme-primary border-b border-theme-primary">
      {/* Primary Actions Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onNewSearch}
            disabled={isLoading}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            New Search
          </button>

          {onStart && (
            <button
              onClick={onStart}
              disabled={isLoading}
              className="btn btn-secondary flex items-center gap-2"
            >
              <PlayIcon className="w-4 h-4" />
              Start
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onToggleGraph && (
            <button
              onClick={onToggleGraph}
              className="btn btn-ghost flex items-center gap-2"
            >
              <ChartBarIcon className="w-4 h-4" />
              Graph
            </button>
          )}

          {onExport && !isEmpty && (
            <button
              onClick={onExport}
              className="btn btn-ghost flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export
            </button>
          )}

          {onClear && !isEmpty && (
            <button
              onClick={onClear}
              className="btn btn-danger flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              Clear
            </button>
          )}

          <button
            onClick={() => setShowConfig((v: boolean) => !v)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="p-4 bg-theme-secondary rounded-lg border border-theme-primary">
          <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">
                AI Model
              </label>
              <div className="space-y-2">
                {availableModels.map((model) => {
                  const info = MODEL_INFO[model];
                  return (
                    <label
                      key={model}
                      className="flex items-center p-3 border border-theme-primary rounded-lg cursor-pointer hover-theme-primary"
                    >
                      <input
                        type="radio"
                        name="model"
                        value={model}
                        checked={selectedModel === model}
                        onChange={() => onModelChange(model)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{info.icon}</span>
                          <span className="font-medium">{info.name}</span>
                        </div>
                        <p className="text-sm text-theme-secondary">{info.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Effort Selection */}
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">
                Research Effort
              </label>
              <div className="space-y-2">
                {Object.values(EffortType).map((effort) => (
                  <label
                    key={effort}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-white"
                  >
                    <input
                      type="radio"
                      name="effort"
                      value={effort}
                      checked={selectedEffort === effort}
                      onChange={() => onEffortChange(effort)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{effort} Effort</div>
                      <p className="text-sm text-theme-secondary">
                        {effort === EffortType.LOW && 'Quick research with basic analysis'}
                        {effort === EffortType.MEDIUM && 'Balanced research with moderate depth'}
                        {effort === EffortType.HIGH && 'Comprehensive research with deep analysis'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Enhanced Mode Toggle */}
            {onEnhancedModeChange && (
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Features
                </label>
                <label className="flex items-center p-3 border border-theme-primary rounded-lg cursor-pointer hover-theme-primary">
                  <input
                    type="checkbox"
                    checked={enhancedMode}
                    onChange={(e) => onEnhancedModeChange(e.target.checked)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Enhanced Mode</div>
                    <p className="text-sm text-theme-secondary">
                      Enable advanced features and deeper analysis
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
