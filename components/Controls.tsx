
import React from 'react';
import { EffortType, ModelType, effortOptions, modelOptions } from '../types';
import { AdjustmentsHorizontalIcon, CpuChipIcon, PlusIcon, ChevronDownIcon } from './icons';

interface ControlsProps {
  selectedEffort: EffortType;
  onEffortChange: (effort: EffortType) => void;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  onNewSearch: () => void;
  isLoading: boolean;
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
  onNewSearch, isLoading
}) => {
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
          options={modelOptions}
          onChange={(val) => onModelChange(val as ModelType)}
          icon={CpuChipIcon}
          disabled={isLoading}
        />
      </div>
      <button
        onClick={onNewSearch}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-2.5 reverie-button disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
      // Was: focus:ring-offset-brand-charcoal
      >
        <PlusIcon className="w-5 h-5" />
        New Search
      </button>
    </div>
  );
};
