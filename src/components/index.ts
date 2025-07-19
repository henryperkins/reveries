// Central export file for all components
export { Controls } from './Controls';
export { ErrorDisplay } from './ErrorDisplay';
export { Header } from './Header';
export { InputBar } from './InputBar';
export { ResearchArea } from './ResearchArea';
export { default as ResearchGraphView } from './ResearchGraphView';
export { ResearchStepCard } from './ResearchStepCard';
export { ContextDensityBar } from './ContextDensityBar';
export { FunctionCallDock } from './FunctionCallDock';
export { SemanticSearch } from './SemanticSearch';
export { SessionHistoryBrowser } from './SessionHistoryBrowser';
export {
  ParadigmProbabilityBar,
  ContextLayerProgress,
  ResearchAnalytics,
  ParadigmDashboard,
  ParadigmIndicator
} from './ParadigmUI';
export { ErrorBoundary } from './ErrorBoundary';
export { RateLimitIndicator } from './RateLimitIndicator';

// Legacy components - DEPRECATED - use modern equivalents:
// - ProgressBar → ProgressMeter from '@/components/atoms'
// - FunctionCallVisualizer → FunctionCallDock with mode="history"
// - LiveFunctionCallIndicator → FunctionCallDock with mode="live"
// - ToolUsageIndicator → FunctionCallDock with mode="tools"

// Export icons separately
export * as Icons from './icons';

// Prototype components are in ./prototype/
