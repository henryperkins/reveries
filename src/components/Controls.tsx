import React, { useState } from 'react';
import { EffortType, ModelType, effortOptions, modelOptions, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from '../types';
import { CpuChipIcon, PlusIcon, BeakerIcon, ArrowPathIcon, SparklesIcon, LightBulbIcon, ChartBarIcon, ChevronDownIcon } from './icons';
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
  selectedEffort, onEffortChange,
  selectedModel, onModelChange,
  onNewSearch, isLoading,
  enhancedMode = true,
  onEnhancedModeChange
}) => {
  const [showConfig, setShowConfig] = useState(false);

  // Filter available models - updated logic
  const availableModels = Object.entries(MODEL_INFO).filter(([key, info]) => {
    // Show all models that are marked as available
    return info.available;
  });

  return (
    <div className="mt-6 space-y-4">
      {/* Configuration Toggle */}
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="w-full flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-westworld-tan/30 hover:bg-white/70 transition-all duration-300 group"
      >
        <div className="flex items-center gap-3">
          <CpuChipIcon className="w-5 h-5 text-westworld-gold group-hover:rotate-12 transition-transform" />
          <span className="text-westworld-rust font-medium">Research Configuration</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-westworld-rust/70">
            {MODEL_INFO[selectedModel].name} • {EFFORT_INFO[selectedEffort].name}
          </span>
          <ChevronDownIcon className={`w-5 h-5 text-westworld-rust transition-transform duration-300 ${showConfig ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Configuration Panel */}
      <div className={`
        space-y-6 overflow-hidden transition-all duration-500 ease-out
        ${showConfig ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}
      `}>
        {/* Model Selection */}
        <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-westworld-tan/20 p-6">
          <h3 className="text-lg font-semibold text-westworld-rust mb-4 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-westworld-gold" />
            Select Research Model
          </h3>
          <div className="grid gap-3">
            {availableModels.map(([key, info]) => (
              <button
                key={key}
                onClick={() => onModelChange(key as ModelType)}
                disabled={isLoading}
                className={`
                  relative p-4 rounded-lg border-2 transition-all duration-300
                  ${selectedModel === key
                    ? 'border-westworld-gold bg-gradient-to-r ' + info.color + ' text-white shadow-lg scale-[1.02]'
                    : 'border-westworld-tan/30 bg-white/70 hover:bg-white hover:border-westworld-gold/50'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{info.icon}</span>
                  <div className="flex-1 text-left">
                    <h4 className={`font-semibold ${selectedModel === key ? 'text-white' : 'text-westworld-rust'}`}>
                      {info.name}
                    </h4>
                    <p className={`text-sm mt-1 ${selectedModel === key ? 'text-white/90' : 'text-westworld-rust/70'}`}>
                      {info.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {info.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded-full ${
                            selectedModel === key
                              ? 'bg-white/20 text-white'
                              : 'bg-westworld-tan/20 text-westworld-rust/70'
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Effort Selection */}
        <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-westworld-tan/20 p-6">
          <h3 className="text-lg font-semibold text-westworld-rust mb-4 flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-westworld-gold" />
            Research Depth
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(EFFORT_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => onEffortChange(key as EffortType)}
                disabled={isLoading}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-300
                  ${selectedEffort === key
                    ? 'border-westworld-gold bg-westworld-gold/10 shadow-md scale-[1.02]'
                    : 'border-westworld-tan/30 bg-white/70 hover:bg-white hover:border-westworld-gold/50'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="text-center">
                  <span className="text-2xl block mb-2">{info.icon}</span>
                  <h4 className="font-semibold text-westworld-rust">
                    {info.name}
                  </h4>
                  <p className="text-xs text-westworld-rust/70 mt-1">
                    {info.description}
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-westworld-rust/60">Time:</span>
                      <span className="text-westworld-rust font-medium">{info.time}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-westworld-rust/60">Depth:</span>
                      <span className="text-westworld-rust font-medium">{info.depth}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Patterns Toggle */}
        {onEnhancedModeChange && (
          <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-westworld-tan/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BeakerIcon className="w-5 h-5 text-westworld-gold" />
                <div>
                  <h3 className="font-semibold text-westworld-rust">Enhanced Research Patterns</h3>
                  <p className="text-sm text-westworld-rust/70 mt-1">
                    Enable advanced orchestration with iterative refinement and parallel exploration
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
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
