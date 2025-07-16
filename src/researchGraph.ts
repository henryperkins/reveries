/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ResearchStep,
  ResearchState,
  ResearchStepType,
  ModelType,
  EffortType,
  Citation,
  ExportedResearchData,
  GENAI_MODEL_FLASH,
  ResearchMetadata,
  ParadigmProbabilities,
  ContextDensity,
  ResearchPhase
} from './types';
import { ResearchAgentService } from './services/researchAgentService';

export interface GraphNode {
    id: string;
    stepId: string;
    type: ResearchStepType;
    title: string;
    timestamp: string;
    duration?: number;
    children: string[]; // IDs of child nodes
    parents: string[]; // IDs of parent nodes
    metadata?: ResearchMetadata;
    data?: ResearchStep;
}

export interface GraphNodeMetadata {
    model?: ModelType;
    effort?: EffortType;
    paradigmProbabilities?: ParadigmProbabilities;
    contextDensity?: ContextDensity;
    phase?: ResearchPhase;
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
    edges: Map<string, GraphEdge>;
    rootNode: string | null;
    currentPath: string[];
}

export class ResearchGraphManager {
    private graph: ResearchGraph;
    private startTime: number;
    private nodeTimestamps: Map<string, number>;
    private lastNodeTimestamp: number | null;

    constructor() {
        this.graph = {
            nodes: new Map(),
            edges: new Map(),
            rootNode: null,
            currentPath: []
        };
        this.startTime = Date.now();
        this.nodeTimestamps = new Map();
        this.lastNodeTimestamp = null;
    }

    /**
     * Add a node with comprehensive metadata tracking
     */
    addNode(
        step: ResearchStep,
        parentId: string | null = null,
        metadata?: GraphNodeMetadata & {
            paradigmProbabilities?: ParadigmProbabilities;
            contextDensity?: ContextDensity;
            phase?: ResearchPhase;
        }
    ): GraphNode {
        const node: GraphNode = {
            id: step.id,
            stepId: step.id,
            type: step.type,
            title: step.title || '',
            timestamp: step.timestamp || new Date().toISOString(),
            children: [],
            parents: parentId ? [parentId] : [],
            data: step,
            metadata: {
                model: metadata?.model || GENAI_MODEL_FLASH,
                effort: metadata?.effort || EffortType.MEDIUM,
                paradigmProbabilities: metadata?.paradigmProbabilities,
                contextDensity: typeof metadata?.contextDensity === 'object'
                    ? metadata.contextDensity.averageDensity
                    : metadata?.contextDensity,
                phase: metadata?.phase
            }
        };

        this.graph.nodes.set(node.id, node);

        const nodeId = `node-${step.id}`;
        const timestamp = Date.now();

        // Ensure metadata includes all available information
        const enrichedMetadata: ResearchMetadata = {
            model: metadata?.model || GENAI_MODEL_FLASH,
            effort: metadata?.effort || EffortType.MEDIUM,
            sourcesCount: step.sources?.length || 0,
            processingTime: this.lastNodeTimestamp ? timestamp - this.lastNodeTimestamp : 0,
            paradigmProbabilities: metadata?.paradigmProbabilities,
            contextDensity: typeof metadata?.contextDensity === 'object'
                ? metadata.contextDensity.averageDensity
                : (typeof metadata?.contextDensity === 'number' ? metadata.contextDensity : undefined),
            phase: metadata?.phase
        };

        const newNode: GraphNode = {
            id: nodeId,
            stepId: step.id,
            type: step.type,
            title: step.title || '',
            timestamp: new Date(timestamp).toISOString(),
            children: [],
            parents: parentId ? [parentId] : [],
            metadata: enrichedMetadata
        };

        this.graph.nodes.set(nodeId, newNode);
        this.graph.currentPath.push(nodeId);

        // 🔑 start timing immediately
        this.nodeTimestamps.set(nodeId, timestamp);

        if (parentId) {
            this.addEdge(parentId, nodeId, step.type === ResearchStepType.ERROR ? 'error' : 'sequential');
            const parentNode = this.graph.nodes.get(parentId);
            if (parentNode) {
                parentNode.children.push(nodeId);
            }
        } else {
            this.graph.rootNode = nodeId;
        }

        this.lastNodeTimestamp = timestamp;
        return newNode;
    }

    /**
     * Get timestamp for a specific node
     */
    public getNodeTimestamp(nodeId: string): number | undefined {
        return this.nodeTimestamps.get(nodeId);
    }

    /**
     * Set timestamp for a specific node
     */
    public setNodeTimestamp(nodeId: string, timestamp: number): void {
        this.nodeTimestamps.set(nodeId, timestamp);
    }

    /**
     * Get node ID with consistent prefix handling
     */
    public getNodeIdFromStepId(stepId: string): string {
        return `node-${stepId}`;
    }

    // Public method to update node duration
    updateNodeDuration(nodeId: string): void {
        const node = this.graph.nodes.get(nodeId);
        const startedAt = this.getNodeTimestamp(nodeId);
        if (node && startedAt) node.duration = Date.now() - startedAt;
    }

    // Public method to update node metadata
    updateNodeMetadata(nodeId: string, metadata: Partial<ResearchMetadata>): void {
        const node = this.graph.nodes.get(nodeId);
        if (node && node.metadata) {
            node.metadata = { ...node.metadata, ...metadata };
        }
    }

    /**
     * Mark a node as complete and record its duration.
     * Exposed so UI components can signal when processing
     * for a given step has finished.
     */
    public completeNode(nodeId: string): void {
        // Re-use the existing duration helper
        this.updateNodeDuration(nodeId);
    }

    /**
     * Return all nodes in insertion order – useful for UI
     * components that need to iterate over the graph.
     */
    public getNodes(): GraphNode[] {
        return Array.from(this.graph.nodes.values());
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

        this.graph.edges.set(edge.id, edge);
    }

    // Mark a node as errored
    markNodeError(nodeId: string, errorMessage: string): void {
        const node = this.graph.nodes.get(nodeId);
        if (node && node.metadata) {
            node.metadata = {
                ...node.metadata,
                errorDetails: { message: errorMessage, retryable: false }
            };

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
        uniqueCitations: number;
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

        // Count unique citations across all nodes
        const allCitations = new Set<string>();
        nodes.forEach(node => {
            if (node.metadata?.sections) {
                node.metadata.sections.forEach(section => {
                    if (section.sources) {
                        section.sources.forEach(source => {
                            if (source.url) allCitations.add(source.url);
                        });
                    }
                });
            }
        });

        return {
            totalNodes: nodes.length,
            totalDuration,
            averageStepDuration,
            errorCount,
            successRate,
            sourcesCollected,
            uniqueCitations: allCitations.size
        };
    }

    /**
     * Get comprehensive export data
     */
    getExportData(query: string, sessionId?: string): ExportedResearchData {
        const stats = this.getStatistics();
        const nodes = Array.from(this.graph.nodes.values());
        const edges = Array.from(this.graph.edges.values());

        // Collect all sources
        const allSources: Citation[] = [];
        const sourcesByStep: Record<string, Citation[]> = {};
        const sourcesByDomain: Record<string, Citation[]> = {};
        const seenUrls = new Set<string>();

        nodes.forEach(node => {
            const sources: Citation[] = [];
            // Get sources from metadata sections
            if (node.metadata?.sections) {
                node.metadata.sections.forEach(section => {
                    if (section.sources) {
                        sources.push(...section.sources);
                    }
                });
            }

            sourcesByStep[node.id] = sources;

            sources.forEach((source: Citation) => {
                if (source.url && !seenUrls.has(source.url)) {
                    seenUrls.add(source.url);
                    allSources.push(source);

                    // Group by domain
                    try {
                        const domain = new URL(source.url).hostname;
                        if (!sourcesByDomain[domain]) {
                            sourcesByDomain[domain] = [];
                        }
                        sourcesByDomain[domain].push(source);
                    } catch {
                        // Invalid URL, skip domain grouping
                    }
                }
            });
        });

        // Collect function calls
        const functionCalls: ExportedResearchData['functionCalls'] = [];
        nodes.forEach(node => {
            if (node.metadata?.functionCalls && node.metadata.functionCalls.length > 0) {
                functionCalls.push({
                    step: node.id,
                    calls: node.metadata.functionCalls
                });
            }
        });

        // Determine primary model and effort
        const modelCounts = new Map<ModelType, number>();
        const effortCounts = new Map<EffortType, number>();

        nodes.forEach(node => {
            if (node.metadata?.model) {
                modelCounts.set(node.metadata.model, (modelCounts.get(node.metadata.model) || 0) + 1);
            }
            if (node.metadata?.effort) {
                effortCounts.set(node.metadata.effort, (effortCounts.get(node.metadata.effort) || 0) + 1);
            }
        });

        const primaryModel = Array.from(modelCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || GENAI_MODEL_FLASH;
        const primaryEffort = Array.from(effortCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || EffortType.MEDIUM;

        // Find final result node for confidence score
        const finalNode = nodes[nodes.length - 1];
        const confidenceScore = finalNode?.metadata?.confidenceScore;
        const queryType = finalNode?.metadata?.queryType;
        const hostParadigm = finalNode?.metadata?.hostParadigm;

        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            query,
            summary: {
                totalSteps: stats.totalNodes,
                totalSources: allSources.length,
                totalDuration: stats.totalDuration,
                successRate: stats.successRate,
                modelsUsed: Array.from(modelCounts.keys()),
                errorCount: stats.errorCount
            },
            metadata: {
                sessionId,
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date(this.startTime + stats.totalDuration).toISOString(),
                primaryModel,
                primaryEffort,
                queryType,
                hostParadigm,
                confidenceScore
            },
            steps: nodes.map(node => ({
                id: node.id,
                type: node.type,
                title: node.title,
                content: (node as any).content ?? node.title,
                timestamp: node.timestamp,
                duration: node.metadata?.processingTime,
                sources: sourcesByStep[node.id] || [],
                metadata: node.metadata
            })),
            graph: {
                nodes: nodes.map(node => {
                    // Create a ResearchStep-like object for compatibility
                    const stepData: ResearchStep = {
                        id: node.stepId,
                        type: node.type,
                        title: node.title,
                        content: (node as any).content ?? node.title,
                        icon: () => null,
                        timestamp: node.timestamp,
                        sources: sourcesByStep[node.id] || []
                    };
                    return {
                        id: node.id,
                        data: stepData,
                        metadata: node.metadata
                    };
                }),
                edges: edges.map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    type: edge.type
                }))
            },
            sources: {
                all: allSources,
                byStep: sourcesByStep,
                byDomain: sourcesByDomain
            },
            ...(functionCalls.length > 0 && { functionCalls })
        };
    }

    // Get the current graph state
    getGraph(): ResearchGraph {
        return this.graph;
    }

    // Export graph data for visualization
    exportForVisualization() {
        return {
            nodes: Array.from(this.graph.nodes.values()).map(node => ({
                id: node.id,
                label: node.title,
                type: node.type,
                metadata: node.metadata
            })),
            edges: Array.from(this.graph.edges.values()),
        };
    }

    // Reset the graph
    reset(): void {
        this.graph = {
            nodes: new Map(),
            edges: new Map(),
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
            edges: Array.from(this.graph.edges.entries()),
            rootNode: this.graph.rootNode,
            currentPath: this.graph.currentPath,
            startTime: this.startTime,
            lastNodeTimestamp: this.lastNodeTimestamp
        });
    }

    // Deserialize graph from saved state
    static deserialize(data: string): ResearchGraphManager {
        const parsed = JSON.parse(data);
        const manager = new ResearchGraphManager();

        manager.graph.nodes = new Map(parsed.nodes);
        manager.graph.edges = new Map(parsed.edges);
        manager.graph.rootNode = parsed.rootNode;
        manager.graph.currentPath = parsed.currentPath;
        manager.startTime = parsed.startTime;
        manager.lastNodeTimestamp = parsed.lastNodeTimestamp;

        return manager;
    }

    async findSimilarNodes(
        nodeId: string,
        threshold = 0.8
    ): Promise<{ node: GraphNode; similarity: number }[]> {
        const node = this.graph.nodes.get(nodeId);
        if (!node) return [];

        const agentService = ResearchAgentService.getInstance();
        const similarSteps = await agentService.semanticSearch(node.title);

        return similarSteps
            .filter((step: ResearchState) => step.query !== nodeId)
            .map((step: ResearchState) => ({
                node: this.graph.nodes.get(step.query)!,
                similarity: 1 - (step.evaluation?.completeness || 0),
            }))
            .filter((result: { node: GraphNode; similarity: number }) => result.similarity >= threshold);
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
