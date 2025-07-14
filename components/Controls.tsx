import React from 'react';
import { EffortType, ModelType, effortOptions, modelOptions, GENAI_MODEL_FLASH, GROK_MODEL_4, AZURE_O3_MODEL } from '../types';
import { AdjustmentsHorizontalIcon, CpuChipIcon, PlusIcon, ChevronDownIcon, BeakerIcon, ArrowPathIcon } from './icons';
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

const SelectDropdown: React.FC<{
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon: React.ElementType;
  disabled: boolean;
}> = ({ id, label, value, options, onChange, icon: Icon, disabled }) => (
  <div className="relative flex-1 min-w-[150px]">
    <label htmlFor={id} className="sr-only">{label}</label>
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Icon className="w-5 h-5 text-westworld-rust" />
    </div>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full pl-10 pr-8 py-2.5 reverie-input rounded-lg appearance-none outline-hidden transition-all duration-300 disabled:opacity-50"
    // Was: bg-brand-slate border-brand-steel text-brand-silver
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
      <ChevronDownIcon className="w-5 h-5 text-westworld-rust" />
    </div>
  </div>
);


export const Controls: React.FC<ControlsProps> = ({
  selectedEffort, onEffortChange,
  selectedModel, onModelChange,
  onNewSearch, isLoading,
  enhancedMode = true,
  onEnhancedModeChange
}) => {
  // Filter model options based on availability
  const availableModelOptions = modelOptions.filter(option => {
    if (option.value === GROK_MODEL_4 && !GROK_AVAILABLE) return false;
    if (option.value === AZURE_O3_MODEL && !AZURE_OPENAI_AVAILABLE) return false;
    return true;
  });

  return (
    <div className="mt-4 flex flex-wrap gap-3 items-center justify-between">
      <div className="flex gap-3 flex-wrap sm:flex-nowrap">
        <SelectDropdown
          id="effort-select"
          label="Effort"
          value={selectedEffort}
          options={effortOptions}
          onChange={(val) => onEffortChange(val as EffortType)}
          icon={AdjustmentsHorizontalIcon}
          disabled={isLoading}
        />
        <SelectDropdown
          id="model-select"
          label="Model"
          value={selectedModel}
          options={availableModelOptions}
          onChange={(val) => onModelChange(val as ModelType)}
          icon={CpuChipIcon}
          disabled={isLoading}
        />

        {/* Enhanced Mode Toggle */}
        {onEnhancedModeChange && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border westworld-border bg-westworld-beige">
            <BeakerIcon className="w-4 h-4 text-westworld-rust" />
            <label htmlFor="enhanced-mode" className="text-sm text-westworld-rust font-westworld-mono">
              Enhanced Patterns
            </label>
            <input
              id="enhanced-mode"
              type="checkbox"
              checked={enhancedMode}
              onChange={(e) => onEnhancedModeChange(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 text-westworld-gold bg-westworld-beige border-westworld-tan rounded focus:ring-westworld-gold focus:ring-2"
            />
          </div>
        )}
      </div>

      <button
        onClick={onNewSearch}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-2.5 reverie-button disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
      >
        <PlusIcon className="w-5 h-5" />
        New Search
      </button>
    </div>
  );
};
