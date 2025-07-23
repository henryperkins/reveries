// Central export file for all components
export { Controls } from './Controls';
export { ErrorDisplay } from './ErrorDisplay';
export { Header } from './Header';
export { default as EnhancedInputBar } from './EnhancedInputBar';
export type { InputBarProps, InputBarRef, ValidationRule } from './EnhancedInputBar';
export { ResearchArea } from './ResearchArea';
export { default as ResearchGraphView } from './ResearchGraphView';
export { ResearchStepCard } from './ResearchStepCard';
export { ContextDensityBar } from './ContextDensityBar';
export { FunctionCallDock } from './FunctionCallDock';
export { SemanticSearch } from './SemanticSearch';
export { SessionHistoryBrowser } from './SessionHistoryBrowser';
export { TopNavigation } from './TopNavigation';
export { ReverieHeader } from './ReverieHeader';
export { ResearchView } from './ResearchView';
export { SessionsView } from './SessionsView';
export { AnalyticsView } from './AnalyticsView';
export {
  ParadigmProbabilityBar,
  ContextLayerProgress,
  ResearchAnalytics,
  ParadigmDashboard,
  ParadigmIndicator,
  InterHostCollaboration
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

// UI Components
export { default as Button } from './ui/Button';
export type { ButtonProps } from './ui/Button';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from './ui/Card';

// Theme
export { ThemeToggle } from './ThemeToggle';

// Graph Error Handling
export { default as GraphErrorBoundary } from './GraphErrorBoundary';
export { default as GraphAccessibilityLayer } from './GraphAccessibilityLayer';
export { GraphLayoutErrorBoundary, GraphCanvasErrorBoundary } from './GraphErrorBoundaryUtils';
export { withGraphErrorBoundary } from './withGraphErrorBoundary';
