import React, { useState } from 'react';
import { HistoryView } from './HistoryView';
import { LiveView } from './LiveView';
import { ToolsView } from './ToolsView';
import { useFunctionCalls } from './hooks';

export type DockMode = 'history' | 'live' | 'tools';

interface FunctionCallDockProps {
  mode?: DockMode;
  className?: string;
  showModeSelector?: boolean;
  maxHeight?: string;
  /** Pre-populate the dock with tools already used (e.g. per research step) */
  initialTools?: string[];
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

/**
 * FunctionCallDock
 *
 * NOTE:
 * A global <FunctionCallProvider> is already mounted at the application root
 * (see [`src/index.tsx:14`](src/index.tsx:14)). Wrapping the dock with an
 * additional provider created an isolated React context, preventing the dock
 * from receiving updates (e.g., tool usage) pushed via `useFunctionCalls` in
 * other parts of the app. We remove the nested provider so the dock consumes
 * the shared context.
 */
export const FunctionCallDock: React.FC<FunctionCallDockProps> = (props) => {
  return <FunctionCallDockContent {...props} />;
};
