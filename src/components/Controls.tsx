import React, { useState, useMemo } from 'react';
import { EffortType, ModelType, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from '../types';
import { CpuChipIcon, PlusIcon, BeakerIcon, SparklesIcon, LightBulbIcon, ChevronDownIcon } from './icons';
import { GROK_AVAILABLE, AZURE_OPENAI_AVAILABLE } from '../constants';

interface ControlsProps {
  selectedEffort: EffortType;
  onEffortChange: (effort: EffortType) => void;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  onNewSearch: () => void;
  isLoading: boolean;
  enhancedMode?: boolean;
  onEnhancedModeChange?: (enabled: boolean) => void;
  /** Optional export callback (hooked up in App) */
  onExport?: () => void;
  /** Optional toggle-graph callback (hooked up in App) */
  onToggleGraph?: () => void;
  onStart?: () => void;
  onClear?: () => void;
  isEmpty?: boolean;
}

const MODEL_INFO = {
  [GENAI_MODEL_FLASH]: {
    name: 'Gemini Flash 2.5',
    description: 'Fast, efficient research with Google Search integration',
    icon: '⚡',
    features: ['Web search', 'Quick responses', 'Cost-effective'],
    color: 'from-blue-500 to-indigo-600',
    available: true // Always available
  },
  [GROK_MODEL_4]: {
    name: 'Grok 4',
    description: 'Advanced reasoning with real-time data access',
    icon: '🚀',
    features: ['Live search', 'Citations', 'Advanced analysis'],
    color: 'from-purple-500 to-pink-600',
    available: GROK_AVAILABLE
  },
  [AZURE_O3_MODEL]: {
    name: 'Azure o3',
    description: 'Cutting-edge reasoning with deliberative processing',
    icon: '🧠',
    features: ['Deep reasoning', 'Complex analysis', 'High accuracy'],
    color: 'from-green-500 to-teal-600',
    available: AZURE_OPENAI_AVAILABLE
  }
};

const EFFORT_INFO = {
  [EffortType.LOW]: {
    name: 'Quick Scout',
    description: 'Fast reconnaissance for simple queries',
    icon: '🏃',
    time: '~10s',
    depth: 'Basic'
  },
  [EffortType.MEDIUM]: {
    name: 'Thorough Analysis',
    description: 'Balanced research with good coverage',
    icon: '🔍',
    time: '~30s',
    depth: 'Comprehensive'
  },
  [EffortType.HIGH]: {
    name: 'Deep Dive',
    description: 'Exhaustive investigation with multiple perspectives',
    icon: '🏔️',
    time: '~60s',
    depth: 'Exhaustive'
  }
};

export const Controls: React.FC<ControlsProps> = ({
  onStart,
  onClear,
  onToggleGraph,
  onExport,
  onEnhancedModeChange,
  isLoading,
  isEmpty,
  enhancedMode,
  onModelChange,
  selectedModel
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const availableModels = useMemo(() => Object.entries(MODEL_INFO).filter(([, info]) => info.available), []);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
      <div className="flex gap-2 flex-1">
        <button
          onClick={onStart}
          disabled={isLoading || isEmpty}
          className="btn-primary flex items-center gap-2"
          aria-label="Start research"
        >
          <PlayIcon className="w-5 h-5" />
          <span>Research</span>
        </button>

        <button
          onClick={onClear}
          disabled={isLoading || isEmpty}
          className="btn-secondary flex items-center gap-2"
          aria-label="Clear research"
        >
          <TrashIcon className="w-5 h-5" />
          <span>Clear</span>
        </button>

        <button
          onClick={onToggleGraph}
          disabled={isEmpty}
          className="btn-secondary flex items-center gap-2"
          aria-label="View research graph"
        >
          <ChartBarIcon className="w-5 h-5" />
          <span>Graph</span>
        </button>

        <button
          onClick={onExport}
          disabled={isEmpty}
          className="btn-secondary flex items-center gap-2"
          aria-label="Export research"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          <span>Export</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enhancedMode}
            onChange={(e) => onEnhancedModeChange?.(e.target.checked)}
            className="w-4 h-4 text-westworld-gold bg-westworld-cream border-westworld-tan
                     rounded focus:ring-westworld-gold focus:ring-2"
            aria-label="Toggle enhanced mode"
          />
          <span className="text-sm text-westworld-darkbrown">Enhanced Mode</span>
        </label>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 rounded-lg hover:bg-westworld-tan/20 transition-colors"
          aria-label="Toggle configuration"
          aria-expanded={showConfig}
        >
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-westworld-copper" />
        </button>
      </div>

      {showConfig && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-westworld-cream rounded-lg
                      shadow-xl border border-westworld-tan/30 p-4 z-10 animate-slideUp">
          <h3 className="text-lg font-semibold mb-4 text-westworld-black">Configuration</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-westworld-darkbrown mb-2">
                AI Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => onModelChange?.(e.target.value)}
                className="w-full px-3 py-2 bg-westworld-white border border-westworld-tan/30
                         rounded-lg focus:ring-2 focus:ring-westworld-gold focus:border-westworld-gold"
                aria-label="Select AI model"
              >
                {availableModels.map(([model]) => {
                  const info = MODEL_INFO[model as keyof typeof MODEL_INFO];
                  return (
                    <option key={model} value={model}>
                      {info.name} - {info.provider}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-medium text-westworld-darkbrown mb-2">
                Available Models
              </h4>
              <div className="space-y-2">
                {availableModels.map(([model]) => {
                  const info = MODEL_INFO[model as keyof typeof MODEL_INFO];
                  return (
                    <div
                      key={model}
                      className={`p-2 rounded-lg border ${
                        model === selectedModel
                          ? 'border-westworld-gold bg-westworld-gold/10'
                          : 'border-westworld-tan/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{info.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${info.color} text-white`}>
                          {info.provider}
                        </span>
                      </div>
                      <p className="text-xs text-westworld-darkbrown/70 mt-1">
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
    </div>
  );
};
                  checked={enhancedMode}
                  onChange={(e) => onEnhancedModeChange(e.target.checked)}
                  disabled={isLoading}
                  className="sr-only peer"
                />
                <div className={`
                  w-11 h-6 bg-westworld-tan/30 peer-focus:outline-none rounded-full peer
                  peer-checked:after:translate-x-full peer-checked:after:border-white
                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                  after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                  peer-checked:bg-westworld-gold
                  ${isLoading ? 'opacity-50' : ''}
                `}></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onNewSearch}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-westworld-gold to-westworld-copper text-black rounded-xl font-medium hover:from-westworld-rust hover:to-westworld-copper hover:text-white transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <PlusIcon className="w-5 h-5" />
        Start New Research Session
      </button>
    </div>
  );
};
