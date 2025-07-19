import React, { useState } from 'react';
import { HistoryView } from './HistoryView';
import { LiveView } from './LiveView';
import { ToolsView } from './ToolsView';
import { FunctionCallProvider, useFunctionCalls } from './FunctionCallContext';

export type DockMode = 'history' | 'live' | 'tools';

interface FunctionCallDockProps {
  mode?: DockMode;
  className?: string;
  showModeSelector?: boolean;
  maxHeight?: string;
}

const FunctionCallDockContent: React.FC<FunctionCallDockProps> = ({
  mode: initialMode = 'history',
  className = '',
  showModeSelector = true,
  maxHeight = '400px',
}) => {
  const [currentMode, setCurrentMode] = useState<DockMode>(initialMode);
  const { history, liveCalls, toolsUsed } = useFunctionCalls();

  const modes: { value: DockMode; label: string; icon: string }[] = [
    { value: 'history', label: 'History', icon: '📜' },
    { value: 'live', label: 'Live', icon: '⚡' },
    { value: 'tools', label: 'Tools', icon: '🛠️' },
  ];

  return (
    <div className={`function-call-dock ${className}`}>
      {/* Mode Selector */}
      {showModeSelector && (
        <div className="flex space-x-2 mb-4">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setCurrentMode(mode.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentMode === mode.value
                  ? 'bg-westworld-rust text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div 
        className="overflow-auto rounded-lg border border-gray-200"
        style={{ maxHeight }}
      >
        {currentMode === 'history' && <HistoryView history={history} />}
        {currentMode === 'live' && <LiveView liveCalls={liveCalls} />}
        {currentMode === 'tools' && <ToolsView toolsUsed={toolsUsed} />}
      </div>
    </div>
  );
};

export const FunctionCallDock: React.FC<FunctionCallDockProps> = (props) => {
  return (
    <FunctionCallProvider>
      <FunctionCallDockContent {...props} />
    </FunctionCallProvider>
  );
};

// Re-export context and types
export { FunctionCallProvider, useFunctionCalls } from './FunctionCallContext';
export type { FunctionCallHistory } from '@/types';