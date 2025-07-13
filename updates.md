henryperkins: Analyze the application and identify gaps.

GitHub Copilot: I'll analyze your Westworld-themed research assistant application and identify the key gaps:

## Architecture & Technical Gaps

### 1. ** Error Handling & Recovery **
    - No retry mechanism for failed API calls
        - Limited error boundaries for React components
            - No graceful degradation when API key is missing or invalid
                - Error states don't preserve partial progress

### 2. ** State Management **
    - No persistence of research history or sessions
        - Cannot resume interrupted workflows
            - No undo / redo functionality for queries
                - Research data(`ResearchDataState`) is defined but never used

### 3. ** Performance & Optimization **
    - No request debouncing or throttling
        - Missing React.memo for performance optimization
            - No lazy loading of components
                - All research steps execute sequentially without parallelization where possible

### 4. ** User Experience Gaps **
    - No loading progress indicators(percentage / steps completed)
        - Cannot cancel ongoing research
            - No keyboard shortcuts(e.g., Ctrl + Enter to submit)
                - Missing tooltips for controls
                    - No dark / light theme toggle despite dark theme design

### 5. ** Testing & Quality **
    - No unit tests
        - No integration tests
            - No error boundary components
                - Missing TypeScript strict null checks in some areas

## Feature Gaps

### 1. ** Research Capabilities **
    - Cannot export research results(PDF, Markdown, etc.)
        - No ability to refine or follow - up on queries
            - Missing citation formatting options
                - No research depth control beyond "effort" levels

### 2. ** Customization **
    - Limited model options(only Flash 2.5)
        - No custom prompt templates
            - Cannot adjust research focus areas
                - Missing advanced search operators

### 3. ** Collaboration & Sharing **
    - No sharing functionality for research results
        - Cannot save favorite queries
            - No collaborative research features
                - Missing permalink generation

### 4. ** Analytics & Insights **
    - No usage tracking or analytics
        - Missing cost estimation for API calls
            - No research quality metrics
                - Cannot compare different research runs

## Code Quality Issues

### 1. ** Service Layer **
    ````typescript
        // Missing interface for service methods
        // No dependency injection
        // Hardcoded configuration logic
        ````

### 2. ** Component Structure **
    - Some components mix presentation and logic
        - Missing proper prop validation
            - Inconsistent error handling patterns

### 3. ** Type Safety **
    ````typescript
        // ServiceCallConfig could be more granular
        // Missing proper discriminated unions for step types
        // Some any types in service layer
        ````

## Security Gaps

1. ** API Key Management **
    - API key exposed in client - side code
        - No backend proxy for API calls
            - Missing rate limiting

2. ** Input Validation **
    - No sanitization of user queries
        - Missing XSS protection for rendered content
            - No content security policy

## Accessibility Gaps

1. ** ARIA Support **
    - Limited ARIA labels
        - Missing keyboard navigation for all controls
            - No screen reader announcements for step updates

2. ** Visual Accessibility **
        - No high contrast mode
            - Missing focus indicators in some areas
                - Color - only status indicators

## Deployment & Infrastructure

1. ** Build & Deploy **
    - No production build optimizations configured
        - Missing environment - specific configurations
            - No CI / CD pipeline setup

2. ** Monitoring **
    - No error tracking(Sentry, etc.)
        - Missing performance monitoring
            - No health checks

Would you like me to provide specific code implementations to address any of these gaps ?

    henryperkins : Yes

GitHub Copilot: Based on the comprehensive analysis, I'll help you implement a research graph system to address several key gaps. This will create a visual representation of the research process and enable better tracking of the research flow.

    ````typescript
import { ResearchStep, ResearchStepType } from './types';

export interface GraphNode {
    id: string;
    stepId: string;
    type: ResearchStepType;
    title: string;
    timestamp: string;
    duration?: number;
    children: string[]; // IDs of child nodes
    parents: string[]; // IDs of parent nodes
    metadata?: {
        queriesGenerated?: string[];
        sourcesCount?: number;
        errorMessage?: string;
        model?: string;
        effort?: string;
    };
}

export interface GraphEdge {
    id: string;
    source: string; // Node ID
    target: string; // Node ID
    type: 'sequential' | 'dependency' | 'error';
    label?: string;
}

export interface ResearchGraph {
    nodes: Map<string, GraphNode>;
    edges: GraphEdge[];
    rootNode: string | null;
    currentPath: string[];
}

export class ResearchGraphManager {
    private graph: ResearchGraph;
    private startTime: number;
    private nodeTimestamps: Map<string, number>;

    constructor() {
        this.graph = {
            nodes: new Map(),
            edges: [],
            rootNode: null,
            currentPath: []
        };
        this.startTime = Date.now();
        this.nodeTimestamps = new Map();
    }

    // Add a node to the graph
    addNode(step: ResearchStep, parentId?: string, metadata?: GraphNode['metadata']): GraphNode {
        const nodeId = `node-${step.id}`;
        const timestamp = new Date().toISOString();

        const node: GraphNode = {
            id: nodeId,
            stepId: step.id,
            type: step.type,
            title: step.title,
            timestamp,
            children: [],
            parents: parentId ? [parentId] : [],
            metadata
        };

        // Calculate duration if this is updating an existing node
        if (this.nodeTimestamps.has(nodeId)) {
            node.duration = Date.now() - this.nodeTimestamps.get(nodeId)!;
        } else {
            this.nodeTimestamps.set(nodeId, Date.now());
        }

        this.graph.nodes.set(nodeId, node);

        // Set root node if this is the first node
        if (!this.graph.rootNode && step.type === ResearchStepType.USER_QUERY) {
            this.graph.rootNode = nodeId;
        }

        // Add edge from parent if specified
        if (parentId) {
            this.addEdge(parentId, nodeId, 'sequential');

            // Update parent's children
            const parentNode = this.graph.nodes.get(parentId);
            if (parentNode && !parentNode.children.includes(nodeId)) {
                parentNode.children.push(nodeId);
            }
        }

        // Update current path
        if (step.type !== ResearchStepType.ERROR) {
            this.graph.currentPath.push(nodeId);
        }

        return node;
    }

    // Add an edge between nodes
    addEdge(sourceId: string, targetId: string, type: GraphEdge['type'], label?: string): void {
        const edge: GraphEdge = {
            id: `edge-${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
            type,
            label
        };

        this.graph.edges.push(edge);
    }

    // Mark a node as errored
    markNodeError(nodeId: string, errorMessage: string): void {
        const node = this.graph.nodes.get(nodeId);
        if (node) {
            node.metadata = { ...node.metadata, errorMessage };

            // Add error edge to show where the error occurred
            const lastSuccessfulNode = this.getLastSuccessfulNode();
            if (lastSuccessfulNode && lastSuccessfulNode.id !== nodeId) {
                this.addEdge(lastSuccessfulNode.id, nodeId, 'error', 'Error occurred');
            }
        }
    }

    // Get the last successful node in the current path
    private getLastSuccessfulNode(): GraphNode | null {
        for (let i = this.graph.currentPath.length - 1; i >= 0; i--) {
            const node = this.graph.nodes.get(this.graph.currentPath[i]);
            if (node && node.type !== ResearchStepType.ERROR) {
                return node;
            }
        }
        return null;
    }

    // Get graph statistics
    getStatistics(): {
        totalNodes: number;
        totalDuration: number;
        averageStepDuration: number;
        errorCount: number;
        successRate: number;
        sourcesCollected: number;
    } {
        const nodes = Array.from(this.graph.nodes.values());
        const totalDuration = Date.now() - this.startTime;
        const durations = nodes.map(n => n.duration || 0).filter(d => d > 0);
        const averageStepDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

        const errorCount = nodes.filter(n => n.type === ResearchStepType.ERROR).length;
        const successRate = nodes.length > 0 ? (nodes.length - errorCount) / nodes.length : 0;

        const sourcesCollected = nodes.reduce((acc, node) =>
            acc + (node.metadata?.sourcesCount || 0), 0
        );

        return {
            totalNodes: nodes.length,
            totalDuration,
            averageStepDuration,
            errorCount,
            successRate,
            sourcesCollected
        };
    }

    // Export graph for visualization
    exportForVisualization(): {
        nodes: Array<{
            id: string;
            label: string;
            type: string;
            level: number;
            metadata: any;
        }>;
        edges: Array<{
            source: string;
            target: string;
            type: string;
            label?: string;
        }>;
    } {
        const nodes = Array.from(this.graph.nodes.values());
        const levelMap = this.calculateNodeLevels();

        return {
            nodes: nodes.map(node => ({
                id: node.id,
                label: node.title,
                type: node.type,
                level: levelMap.get(node.id) || 0,
                metadata: {
                    ...node.metadata,
                    duration: node.duration,
                    timestamp: node.timestamp
                }
            })),
            edges: this.graph.edges
        };
    }

    // Calculate hierarchical levels for nodes
    private calculateNodeLevels(): Map<string, number> {
        const levels = new Map<string, number>();
        const visited = new Set<string>();

        const calculateLevel = (nodeId: string, level: number) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            levels.set(nodeId, level);

            const node = this.graph.nodes.get(nodeId);
            if (node) {
                node.children.forEach(childId => calculateLevel(childId, level + 1));
            }
        };

        if (this.graph.rootNode) {
            calculateLevel(this.graph.rootNode, 0);
        }

        return levels;
    }

    // Get the current graph state
    getGraph(): ResearchGraph {
        return this.graph;
    }

    // Reset the graph
    reset(): void {
        this.graph = {
            nodes: new Map(),
            edges: [],
            rootNode: null,
            currentPath: []
        };
        this.startTime = Date.now();
        this.nodeTimestamps.clear();
    }

    // Find all paths from root to leaf nodes
    findAllPaths(): string[][] {
        const paths: string[][] = [];

        const dfs = (nodeId: string, currentPath: string[]) => {
            currentPath.push(nodeId);
            const node = this.graph.nodes.get(nodeId);

            if (node && node.children.length === 0) {
                paths.push([...currentPath]);
            } else if (node) {
                node.children.forEach(childId => dfs(childId, currentPath));
            }

            currentPath.pop();
        };

        if (this.graph.rootNode) {
            dfs(this.graph.rootNode, []);
        }

        return paths;
    }

    // Serialize graph for persistence
    serialize(): string {
        return JSON.stringify({
            nodes: Array.from(this.graph.nodes.entries()),
            edges: this.graph.edges,
            rootNode: this.graph.rootNode,
            currentPath: this.graph.currentPath,
            startTime: this.startTime
        });
    }

    // Deserialize graph from saved state
    static deserialize(data: string): ResearchGraphManager {
        const parsed = JSON.parse(data);
        const manager = new ResearchGraphManager();

        manager.graph.nodes = new Map(parsed.nodes);
        manager.graph.edges = parsed.edges;
        manager.graph.rootNode = parsed.rootNode;
        manager.graph.currentPath = parsed.currentPath;
        manager.startTime = parsed.startTime;

        return manager;
    }
}

// Helper function to determine node color based on type
export function getNodeColor(type: ResearchStepType): string {
    switch (type) {
        case ResearchStepType.USER_QUERY:
            return '#0284c7'; // Sky-600
        case ResearchStepType.GENERATING_QUERIES:
            return '#7c3aed'; // Violet-600
        case ResearchStepType.WEB_RESEARCH:
            return '#0891b2'; // Cyan-600
        case ResearchStepType.REFLECTION:
            return '#8b5cf6'; // Violet-500
        case ResearchStepType.SEARCHING_FINAL_ANSWER:
            return '#f59e0b'; // Amber-500
        case ResearchStepType.FINAL_ANSWER:
            return '#10b981'; // Emerald-500
        case ResearchStepType.ERROR:
            return '#ef4444'; // Red-500
        default:
            return '#64748b'; // Slate-500
    }
}

// Helper to generate mermaid diagram from graph
export function generateMermaidDiagram(manager: ResearchGraphManager): string {
    const graphData = manager.exportForVisualization();
    let mermaid = 'graph TD\n';

    // Add nodes
    graphData.nodes.forEach(node => {
        const label = node.label.replace(/"/g, "'");
        const shape = node.type === ResearchStepType.ERROR ? '((' : node.type === ResearchStepType.FINAL_ANSWER ? '[[' : '[';
        const endShape = node.type === ResearchStepType.ERROR ? '))' : node.type === ResearchStepType.FINAL_ANSWER ? ']]' : ']';
        mermaid += `    ${node.id}${shape}"${label}"${endShape}\n`;
    });

    // Add edges
    graphData.edges.forEach(edge => {
        const arrow = edge.type === 'error' ? '-..->' : '-->';
        const label = edge.label ? `|${edge.label}|` : '';
        mermaid += `    ${edge.source} ${arrow}${label} ${edge.target}\n`;
    });

    // Add styling
    mermaid += '\n    classDef error fill:#fee,stroke:#f66,stroke-width:2px\n';
    mermaid += '    classDef success fill:#efe,stroke:#6f6,stroke-width:2px\n';
    mermaid += '    classDef processing fill:#eef,stroke:#66f,stroke-width:2px\n';

    // Apply styles to nodes
    const errorNodes = graphData.nodes.filter(n => n.type === ResearchStepType.ERROR).map(n => n.id);
    const successNodes = graphData.nodes.filter(n => n.type === ResearchStepType.FINAL_ANSWER).map(n => n.id);

    if (errorNodes.length > 0) {
        mermaid += `    class ${errorNodes.join(',')} error\n`;
    }
    if (successNodes.length > 0) {
        mermaid += `    class ${successNodes.join(',')} success\n`;
    }

    return mermaid;
}
````

This implementation provides:

1. ** Graph Structure **: Complete graph representation of the research workflow with nodes and edges
2. ** Node Tracking **: Each step becomes a node with metadata, duration tracking, and relationships
3. ** Error Handling **: Special handling for error nodes and error paths
4. ** Statistics **: Real - time statistics about the research process
5. ** Visualization Export **: Export functionality for creating visual representations
6. ** Persistence **: Serialize / deserialize for saving research sessions
7. ** Path Analysis **: Find all paths through the research to understand different branches
8. ** Mermaid Diagram Generation **: Generate diagrams for documentation

To integrate this into your application, you would:

1. Create a `ResearchGraphManager` instance in your App component
2. Call `addNode()` whenever you add a research step
3. Use the statistics for analytics
4. Export visualization data for rendering graphs
5. Serialize the graph to localStorage for session persistence

Would you like me to show how to integrate this into your existing App.tsx or create a visualization component ?

    henryperkins : Yes

GitHub Copilot: I'll implement solutions to address the key gaps identified. Let me start with error handling, state persistence, and integrating the research graph into your application.

## 1. Error Handling & Retry Mechanism

    ````typescript
export class APIError extends Error {
    constructor(
        message: string,
        public code: string,
        public retryable: boolean = true,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
};

export async function withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            // Don't retry if it's not retryable
            if (error instanceof APIError && !error.retryable) {
                throw error;
            }

            // Don't retry on the last attempt
            if (attempt === config.maxRetries) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                config.initialDelay * Math.pow(config.backoffFactor, attempt),
                config.maxDelay
            );

            if (onRetry) {
                onRetry(attempt + 1, lastError);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}
````

## 2. Enhanced Service with Error Handling

    ````typescript
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelType, EffortType, GENAI_MODEL_FLASH } from "../types";
import { APIError, withRetry } from "./errorHandler";

// ...existing code...

export class ResearchAgentService {
    private static instance: ResearchAgentService;
    private ai: GoogleGenAI;

    private constructor() {
        try {
            this.ai = new GoogleGenAI({ apiKey: getApiKey() });
        } catch (error) {
            throw new APIError(
                "Failed to initialize Gemini API client",
                "INIT_ERROR",
                false
            );
        }
    }

    // ...existing code...

    private async generateText(
        prompt: string,
        selectedModel: ModelType,
        effort: EffortType,
        useSearch: boolean = false
    ): Promise<{ text: string; sources?: { name: string; url?: string }[] }> {
        return withRetry(async () => {
            try {
                const generationConfig: any = {};

                if (useSearch) {
                    generationConfig.tools = [{ googleSearch: {} }];
                }

                if (selectedModel === GENAI_MODEL_FLASH && effort === EffortType.LOW) {
                    generationConfig.thinkingConfig = { thinkingBudget: 0 };
                }

                const response: GenerateContentResponse = await this.ai.models.generateContent({
                    model: selectedModel,
                    contents: prompt,
                    config: generationConfig,
                });

                if (!response.text) {
                    throw new APIError(
                        "Empty response from Gemini API",
                        "EMPTY_RESPONSE",
                        true
                    );
                }

                const text = response.text;
                let sources: { name: string; url?: string }[] | undefined = undefined;

                if (useSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    sources = response.candidates[0].groundingMetadata.groundingChunks
                        .filter(chunk => chunk.web && chunk.web.uri)
                        .map(chunk => ({
                            name: chunk.web?.title || chunk.web?.uri || "Unknown Source",
                            url: chunk.web?.uri
                        }));
                }

                return { text, sources };
            } catch (error) {
                console.error("Gemini API Error:", error);

                if (error instanceof APIError) {
                    throw error;
                }

                // Check for rate limiting
                if (error instanceof Error && error.message.includes('rate limit')) {
                    throw new APIError(
                        "API rate limit exceeded. Please try again later.",
                        "RATE_LIMIT",
                        true,
                        429
                    );
                }

                // Check for invalid API key
                if (error instanceof Error && error.message.includes('API key')) {
                    throw new APIError(
                        "Invalid API key. Please check your configuration.",
                        "AUTH_ERROR",
                        false,
                        401
                    );
                }

                throw new APIError(
                    `Gemini API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    "API_ERROR",
                    true
                );
            }
        });
    }

    // ...rest of the existing methods with error handling wrapped...
}
````

## 3. State Persistence Hook

    ````typescript
import { useState, useEffect, useCallback } from 'react';

export function usePersistedState<T>(
    key: string,
    defaultValue: T,
    version: number = 1
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
    const storageKey = `reveries_${key}_v${version}`;

    // Initialize state from localStorage
    const [state, setState] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(storageKey);
            if (item) {
                const parsed = JSON.parse(item);
                // Validate the data structure if needed
                return parsed.data as T;
            }
        } catch (error) {
            console.error(`Error loading persisted state for ${key}:`, error);
        }
        return defaultValue;
    });

    // Persist state changes
    useEffect(() => {
        try {
            const dataToStore = {
                data: state,
                timestamp: Date.now(),
                version
            };
            window.localStorage.setItem(storageKey, JSON.stringify(dataToStore));
        } catch (error) {
            console.error(`Error persisting state for ${key}:`, error);
        }
    }, [state, storageKey, version]);

    // Clear persisted state
    const clearState = useCallback(() => {
        try {
            window.localStorage.removeItem(storageKey);
            setState(defaultValue);
        } catch (error) {
            console.error(`Error clearing persisted state for ${key}:`, error);
        }
    }, [storageKey, defaultValue]);

    return [state, setState, clearState];
}

// Hook for managing research sessions
export interface ResearchSession {
    id: string;
    query: string;
    timestamp: number;
    steps: any[]; // ResearchStep[]
    graphData?: string;
    completed: boolean;
}

export function useResearchSessions() {
    const [sessions, setSessions, clearSessions] = usePersistedState<ResearchSession[]>(
        'research_sessions',
        [],
        1
    );

    const addSession = useCallback((session: ResearchSession) => {
        setSessions(prev => [...prev, session].slice(-10)); // Keep last 10 sessions
    }, [setSessions]);

    const updateSession = useCallback((id: string, updates: Partial<ResearchSession>) => {
        setSessions(prev =>
            prev.map(session =>
                session.id === id ? { ...session, ...updates } : session
            )
        );
    }, [setSessions]);

    const getSession = useCallback((id: string) => {
        return sessions.find(s => s.id === id);
    }, [sessions]);

    return {
        sessions,
        addSession,
        updateSession,
        getSession,
        clearSessions
    };
}
````

## 4. Enhanced App Component with Graph Integration

    ````typescript
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// ...existing imports...
import { ResearchGraphManager } from './researchGraph';
import { usePersistedState, useResearchSessions } from './hooks/usePersistedState';
import { withRetry, APIError } from './services/errorHandler';

// ...existing code...

const App: React.FC = () => {
    const [currentQuery, setCurrentQuery] = useState<string>('');
    const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showGraph, setShowGraph] = useState<boolean>(false);

    const [selectedEffort, setSelectedEffort] = usePersistedState<EffortType>('effort', DEFAULT_EFFORT);
    const [selectedModel, setSelectedModel] = usePersistedState<ModelType>('model', DEFAULT_MODEL);

    const graphManagerRef = useRef<ResearchGraphManager>(new ResearchGraphManager());
    const { sessions, addSession, updateSession } = useResearchSessions();
    const currentSessionIdRef = useRef<string | null>(null);

    const researchAgentService = ResearchAgentService.getInstance();

    const addStep = useCallback((stepData: Omit<ResearchStep, 'id' | 'timestamp'>): string => {
        const newStepId = Date.now().toString() + Math.random().toString();
        const newStep: ResearchStep = {
            ...stepData,
            id: newStepId,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        setResearchSteps(prevSteps => [...prevSteps, newStep]);

        // Add to graph
        const parentId = graphManagerRef.current.getGraph().currentPath.slice(-1)[0];
        graphManagerRef.current.addNode(newStep, parentId, {
            model: selectedModel,
            effort: selectedEffort
        });

        return newStepId;
    }, [selectedModel, selectedEffort]);

    const updateStepContent = useCallback((stepId: string, newContent: string | React.ReactNode, newTitle?: string, newSources?: { name: string; url?: string }[]) => {
        setResearchSteps(prevSteps => prevSteps.map(step =>
            step.id === stepId ? {
                ...step,
                title: newTitle || step.title,
                content: newContent,
                sources: newSources || step.sources,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                isSpinning: false
            } : step
        ));

        // Update graph node
        const nodeId = `node-${stepId}`;
        const node = graphManagerRef.current.getGraph().nodes.get(nodeId);
        if (node) {
            node.metadata = {
                ...node.metadata,
                sourcesCount: newSources?.length || 0
            };
        }
    }, []);

    const markStepError = useCallback((stepId: string, errorMessage: string, title?: string) => {
        setResearchSteps(prevSteps => prevSteps.map(step =>
            step.id === stepId ? {
                ...step,
                title: title || "Error",
                content: errorMessage,
                icon: QuestionMarkCircleIcon,
                isSpinning: false,
                type: ResearchStepType.ERROR
            } : step
        ));

        // Mark error in graph
        graphManagerRef.current.markNodeError(`node-${stepId}`, errorMessage);
    }, []);

    const executeResearchWorkflow = useCallback(async (query: string) => {
        setIsLoading(true);
        setError(null);
        setResearchSteps([]);

        // Reset graph for new research
        graphManagerRef.current.reset();

        // Create new session
        const sessionId = `session-${Date.now()}`;
        currentSessionIdRef.current = sessionId;
        addSession({
            id: sessionId,
            query,
            timestamp: Date.now(),
            steps: [],
            completed: false
        });

        addStep({
            type: ResearchStepType.USER_QUERY,
            title: "Guest's Query",
            content: query,
            icon: UserCircleIcon,
        });

        const serviceConfig: ServiceCallConfig = {
            selectedModel,
            selectedEffort,
            shouldUseSearchInFinalAnswer: query.toLowerCase().includes("latest") ||
                query.toLowerCase().includes("recent") ||
                query.toLowerCase().includes("current events") ||
                query.toLowerCase().includes("who won"),
        };

        let currentProcessingStepId: string | null = null;

        try {
            // ...existing workflow code with error handling...

            // After successful completion
            updateSession(sessionId, {
                steps: researchSteps,
                graphData: graphManagerRef.current.serialize(),
                completed: true
            });

        } catch (e: any) {
            console.error("Error during research workflow execution:", e);
            let errorMessage = "An unexpected error occurred during the research process.";

            if (e instanceof APIError) {
                errorMessage = e.message;

                // Show retry option for retryable errors
                if (e.retryable) {
                    errorMessage += " Click 'Submit' to retry.";
                }
            }

            setError(errorMessage);

            if (currentProcessingStepId) {
                markStepError(currentProcessingStepId, errorMessage, "Aberration in Loop");
            } else {
                addStep({
                    type: ResearchStepType.ERROR,
                    title: "Critical Aberration",
                    content: errorMessage,
                    icon: QuestionMarkCircleIcon
                });
            }

            // Update session with error state
            updateSession(sessionId, {
                steps: researchSteps,
                graphData: graphManagerRef.current.serialize(),
                completed: false
            });
        } finally {
            setIsLoading(false);
        }
    }, [addStep, updateStepContent, markStepError, selectedModel, selectedEffort, researchAgentService, addSession, updateSession, researchSteps]);

    // ...existing handlers...

    // Add keyboard shortcut
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isLoading) {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (input && input.value.trim()) {
                    handleQuerySubmit(input.value);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isLoading, handleQuerySubmit]);

    return (
        <div className= "min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center py-8 px-4" >
        {/* ...existing JSX... */ }

    {/* Add Graph Statistics */ }
    {
        researchSteps.length > 0 && (
            <div className="mt-4 p-4 bg-slate-700 rounded-lg" >
                <h3 className="text-sm font-semibold text-slate-300 mb-2" > Research Statistics </h3>
                    < div className = "grid grid-cols-2 md:grid-cols-4 gap-4 text-xs" >
                        {(() => {
                            const stats = graphManagerRef.current.getStatistics();
                            return (
                                <>
                                <div>
                                <span className= "text-slate-400" > Total Steps: </span>
                                    < span className = "text-slate-200 ml-1" > { stats.totalNodes } </span>
                                        </div>
                                        < div >
                                        <span className="text-slate-400" > Success Rate: </span>
                                            < span className = "text-slate-200 ml-1" > {(stats.successRate * 100).toFixed(0)
                        }% </span>
                        </div>
                        < div >
                        <span className="text-slate-400" > Sources Found: </span>
                        < span className = "text-slate-200 ml-1" > { stats.sourcesCollected } </span>
                        </div>
                        < div >
                        <span className="text-slate-400" > Duration: </span>
                        < span className = "text-slate-200 ml-1" > {(stats.totalDuration / 1000).toFixed(1)} s </span>
                            </div>
                            </>
              );
            }) ()}
</div>
    </div>
      )}

{/* ...rest of existing JSX... */ }
</div>
  );
};

export default App;
````

## 5. Export Functionality

    ````typescript
import { ResearchStep } from '../types';

export async function exportToMarkdown(
    query: string,
    steps: ResearchStep[],
    metadata?: { model: string; effort: string; timestamp: string }
): Promise<string> {
    let markdown = `# Research Report\n\n`;
    markdown += `**Query:** ${query}\n\n`;

    if (metadata) {
        markdown += `**Date:** ${metadata.timestamp}\n`;
        markdown += `**Model:** ${metadata.model}\n`;
        markdown += `**Effort:** ${metadata.effort}\n\n`;
    }

    markdown += `---\n\n`;

    for (const step of steps) {
        markdown += `## ${step.title}\n\n`;
        markdown += `*${step.timestamp}*\n\n`;

        if (typeof step.content === 'string') {
            markdown += `${step.content}\n\n`;
        }

        if (step.sources && step.sources.length > 0) {
            markdown += `### Sources\n\n`;
            step.sources.forEach((source, idx) => {
                markdown += `${idx + 1}. [${source.name}](${source.url || '#'})\n`;
            });
            markdown += '\n';
        }

        markdown += `---\n\n`;
    }

    return markdown;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function exportResearch(
    query: string,
    steps: ResearchStep[],
    format: 'markdown' | 'json' = 'markdown'
): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedQuery = query.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '-');

    if (format === 'markdown') {
        const content = await exportToMarkdown(query, steps, {
            model: 'Gemini 2.5 Flash',
            effort: 'Medium',
            timestamp: new Date().toLocaleString()
        });
        downloadFile(content, `research-${sanitizedQuery}-${timestamp}.md`, 'text/markdown');
    } else {
        const content = JSON.stringify({ query, steps, timestamp }, null, 2);
        downloadFile(content, `research-${sanitizedQuery}-${timestamp}.json`, 'application/json');
    }
}
````

These implementations address several key gaps:

1. ** Error Handling **: Retry mechanism with exponential backoff, proper error classification
2. ** State Persistence **: Research sessions saved to localStorage, settings persistence
3. ** Graph Integration **: Complete tracking of research flow with statistics
4. ** Export Functionality **: Export research to Markdown or JSON
5. ** Performance **: Added keyboard shortcuts(Ctrl + Enter to submit)

Would you like me to continue with more implementations like the visualization component or testing setup ?

    Similar code found with 1 license type
