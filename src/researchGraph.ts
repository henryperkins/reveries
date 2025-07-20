/* Remove explicit any usage and improve type safety */
import {
  ResearchStep,
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

// Event system for reactive updates
export type GraphEvent =
  | { type: 'node-added'; nodeId: string; node: GraphNode }
  | { type: 'node-updated'; nodeId: string; node: GraphNode }
  | { type: 'node-completed'; nodeId: string; duration: number }
  | { type: 'node-error'; nodeId: string; error: string }
  | { type: 'edge-added'; edgeId: string; edge: GraphEdge }
  | { type: 'edge-removed'; edgeId: string }
  | { type: 'graph-reset' }
  | { type: 'batch-update'; nodeIds: string[] };

export type GraphEventListener = (event: GraphEvent) => void;

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
    level?: number; // Hierarchical level for layout
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
    private startTime: number | null = null; // Set when first node is added
    private nodeTimestamps: Map<string, number>;
    private lastNodeTimestamp: number | null;
    private graphVersion: number;
    private listeners: Set<GraphEventListener> = new Set();
    private batchingEnabled = false;
    private pendingEvents: GraphEvent[] = [];

    constructor() {
        this.graph = {
            nodes: new Map(),
            edges: new Map(),
            rootNode: null,
            currentPath: []
        };
        this.nodeTimestamps = new Map();
        this.lastNodeTimestamp = null;
        this.graphVersion = 0;
    }

    /**
     * Subscribe to graph events for reactive updates
     */
    subscribe(listener: GraphEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Emit an event to all subscribers
     */
    private emit(event: GraphEvent): void {
        if (this.batchingEnabled) {
            this.pendingEvents.push(event);
        } else {
            this.listeners.forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    console.error('Error in graph event listener:', error);
                }
            });
        }
    }

    /**
     * Enable batching for bulk operations
     */
    startBatch(): void {
        this.batchingEnabled = true;
        this.pendingEvents = [];
    }

    /**
     * Flush all pending events and disable batching
     */
    endBatch(): void {
        if (this.pendingEvents.length > 0) {
            const nodeIds = this.pendingEvents
                .filter((e): e is Extract<GraphEvent, { nodeId: string }> =>
                    'nodeId' in e && typeof e.nodeId === 'string')
                .map(e => e.nodeId);

            if (nodeIds.length > 0) {
                this.emit({ type: 'batch-update', nodeIds });
            }

            // Emit individual events too for specific listeners
            this.pendingEvents.forEach(event => {
                this.listeners.forEach(listener => {
                    try {
                        listener(event);
                    } catch (error) {
                        console.error('Error in graph event listener:', error);
                    }
                });
            });
        }

        this.batchingEnabled = false;
        this.pendingEvents = [];
    }

    /**
     * Get the current graph version (increments on mutations)
     */
    getVersion(): number {
        return this.graphVersion;
    }

    /**
     * Increment version to signal graph changes
     */
    private incrementVersion(): void {
        this.graphVersion++;
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
        const nodeId = `node-${step.id}`;
        const timestamp = Date.now();

        // Initialize startTime when first node is added
        if (this.startTime === null) {
            this.startTime = timestamp;
        }

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

        // Calculate hierarchical level
        let level = 0;
        if (parentId) {
            const parentNode = this.graph.nodes.get(parentId);
            if (parentNode && parentNode.level !== undefined) {
                level = parentNode.level + 1;
            }
        }

        const newNode: GraphNode = {
            id: nodeId,
            stepId: step.id,
            type: step.type,
            title: step.title || '',
            timestamp: new Date(timestamp).toISOString(),
            children: [],
            parents: parentId ? [parentId] : [],
            metadata: enrichedMetadata,
            level,
            data: step
        };

        this.graph.nodes.set(nodeId, newNode);
        this.graph.currentPath.push(nodeId);
        this.incrementVersion();

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

        // Emit event
        this.emit({ type: 'node-added', nodeId, node: newNode });

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

        // Public method to update node duration - preserves existing duration if set
    updateNodeDuration(nodeId: string): void {
        const node = this.graph.nodes.get(nodeId);
        const startedAt = this.getNodeTimestamp(nodeId);
        if (node && startedAt && node.metadata) {
            // Only update if duration hasn't been set yet to avoid double-counting
            if (!node.duration) {
                const duration = Date.now() - startedAt;
                node.duration = duration;
                node.metadata.processingTime = duration;
                this.incrementVersion();

                // Emit completion event
                this.emit({ type: 'node-completed', nodeId, duration });
            }
        }
    }

    // Public method to update node metadata
    updateNodeMetadata(nodeId: string, metadata: Partial<ResearchMetadata>): void {
        const node = this.graph.nodes.get(nodeId);
        if (node && node.metadata) {
            node.metadata = { ...node.metadata, ...metadata };
            this.incrementVersion();
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

    /**
     * Return all edges in the graph
     */
    public getEdges(): GraphEdge[] {
        return Array.from(this.graph.edges.values());
    }

    /**
     * Get edges by source node ID
     */
    public getEdgesBySource(sourceId: string): GraphEdge[] {
        return this.getEdges().filter(edge => edge.source === sourceId);
    }

    /**
     * Get edges by target node ID
     */
    public getEdgesByTarget(targetId: string): GraphEdge[] {
        return this.getEdges().filter(edge => edge.target === targetId);
    }

    /**
     * Get edges by type
     */
    public getEdgesByType(type: GraphEdge['type']): GraphEdge[] {
        return this.getEdges().filter(edge => edge.type === type);
    }

    /**
     * Get all edges connected to a specific node (incoming or outgoing)
     */
    public getConnectedEdges(nodeId: string): GraphEdge[] {
        return this.getEdges().filter(edge =>
            edge.source === nodeId || edge.target === nodeId
        );
    }

    /**
     * Check if two nodes are connected by an edge
     */
    public areNodesConnected(sourceId: string, targetId: string): boolean {
        return this.getEdges().some(edge =>
            edge.source === sourceId && edge.target === targetId
        );
    }

    /**
     * Remove an edge by ID
     */
    public removeEdge(edgeId: string): boolean {
        const result = this.graph.edges.delete(edgeId);
        if (result) this.incrementVersion();
        return result;
    }

    /**
     * Update an edge
     */
    public updateEdge(edgeId: string, updates: Partial<GraphEdge>): boolean {
        const edge = this.graph.edges.get(edgeId);
        if (!edge) return false;

        const updatedEdge = { ...edge, ...updates };
        this.graph.edges.set(edgeId, updatedEdge);
        this.incrementVersion();
        return true;
    }

    // Add an edge between nodes with proper uniqueness
    addEdge(sourceId: string, targetId: string, type: GraphEdge['type'], label?: string): void {
        // Generate unique edge ID using counter to avoid collisions
        const baseId = `edge-${sourceId}-${targetId}-${type}`;
        let edgeId = label ? `${baseId}-${label}` : baseId;

        // Ensure uniqueness by checking existing edges
        let counter = 0;
        while (this.graph.edges.has(edgeId)) {
            edgeId = `${baseId}-${counter}`;
            counter++;
        }

        const edge: GraphEdge = {
            id: edgeId,
            source: sourceId,
            target: targetId,
            type,
            label
        };

        this.graph.edges.set(edge.id, edge);
        this.incrementVersion();

        // Emit event
        this.emit({ type: 'edge-added', edgeId, edge });
    }

        // Mark a node as errored
    markNodeError(nodeId: string, errorMessage: string): void {
        const node = this.graph.nodes.get(nodeId);
        if (node && node.metadata) {
            node.type = ResearchStepType.ERROR;
            node.metadata.errorMessage = errorMessage;
            this.incrementVersion();

            // Add error edge from last successful node if it exists
            const lastSuccessful = this.getLastSuccessfulNode();
            if (lastSuccessful && lastSuccessful.id !== nodeId) {
                this.addEdge(lastSuccessful.id, nodeId, 'error', 'Error occurred');
            }

            // Emit error event
            this.emit({ type: 'node-error', nodeId, error: errorMessage });
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

    // Get graph statistics with improved accuracy
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
        const totalDuration = this.startTime ? Date.now() - this.startTime : 0;

        // Get all nodes that have completed and have actual durations
        const completedNodes = nodes.filter(n => n.duration && n.duration > 0);
        const averageStepDuration = completedNodes.length > 0
            ? completedNodes.reduce((sum, node) => sum + (node.duration || 0), 0) / completedNodes.length
            : 0;

        const errorCount = nodes.filter(n => n.type === ResearchStepType.ERROR).length;
        const successRate = nodes.length > 0 ? (nodes.length - errorCount) / nodes.length : 1;

        // More accurate source counting - avoid double counting
        const sourcesCollected = nodes.reduce((acc, node) => {
            // Use sourcesCount from metadata if available, otherwise count from data
            const metadataCount = node.metadata?.sourcesCount || 0;
            const dataCount = node.data?.sources?.length || 0;
            return acc + Math.max(metadataCount, dataCount);
        }, 0);

        // Count unique citations across all nodes
        const allCitations = new Set<string>();
        nodes.forEach(node => {
            // Check both metadata sections and data sources
            if (node.metadata?.sections) {
                node.metadata.sections.forEach(section => {
                    if (section.sources) {
                        section.sources.forEach(source => {
                            if (source.url) allCitations.add(source.url);
                        });
                    }
                });
            }
            if (node.data?.sources) {
                node.data.sources.forEach(source => {
                    if (source.url) {
                        allCitations.add(source.url);
                    } else if (source.title) {
                        allCitations.add(source.title);
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
                startTime: this.startTime ? new Date(this.startTime).toISOString() : new Date().toISOString(),
                endTime: this.startTime ? new Date(this.startTime + stats.totalDuration).toISOString() : new Date().toISOString(),
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
                content: 'content' in node ? (node as { content: string }).content : node.title,
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
                        content: 'content' in node ? (node as { content: string }).content : node.title,
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
                metadata: node.metadata,
                level: node.level
            })),
            edges: Array.from(this.graph.edges.values()),
        };
    }

    // Reset the graph with proper cleanup
    reset(): void {
        this.graph = {
            nodes: new Map(),
            edges: new Map(),
            rootNode: null,
            currentPath: []
        };
        this.startTime = null;
        this.nodeTimestamps.clear();
        this.lastNodeTimestamp = null;
        this.graphVersion = 0;
        this.incrementVersion();

        // Emit reset event
        this.emit({ type: 'graph-reset' });
    }

    /**
     * Archive old nodes to prevent memory growth in long sessions
     * Keeps only recent nodes and critical path
     */
    archiveOldNodes(maxNodes = 100): void {
        const nodes = Array.from(this.graph.nodes.values());
        if (nodes.length <= maxNodes) return;

        // Sort by timestamp and keep the most recent nodes
        nodes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const nodesToKeep = new Set(nodes.slice(0, maxNodes).map(n => n.id));

        // Always keep the critical path (from root to current)
        let current = this.graph.rootNode;
        while (current) {
            nodesToKeep.add(current);
            const node = this.graph.nodes.get(current);
            current = node?.children[0] || null; // Follow main path
        }

        // Remove old nodes and their edges
        this.startBatch();
        for (const [nodeId] of this.graph.nodes) {
            if (!nodesToKeep.has(nodeId)) {
                this.graph.nodes.delete(nodeId);
                this.nodeTimestamps.delete(nodeId);

                // Remove associated edges
                for (const [edgeId, edge] of this.graph.edges) {
                    if (edge.source === nodeId || edge.target === nodeId) {
                        this.graph.edges.delete(edgeId);
                    }
                }
            }
        }
        this.endBatch();

        this.incrementVersion();
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
            lastNodeTimestamp: this.lastNodeTimestamp,
            graphVersion: this.graphVersion
        });
    }

    // Persist graph to database if available
    async persistGraph(sessionId: string): Promise<void> {
        try {
            // Import DatabaseService dynamically to avoid circular dependencies
            const { DatabaseService } = await import('./services/databaseService');
            const databaseService = DatabaseService.getInstance();

            if (databaseService) {
                const graphData = this.serialize();
                await databaseService.saveResearchGraph(sessionId, graphData);
                console.log(`Research graph persisted for session: ${sessionId}`);
            } else {
                console.warn('Database service not available, graph not persisted');
            }
        } catch (error) {
            console.error('Failed to persist research graph:', error);
            // Don't throw - persistence failure shouldn't break the application
        }
    }

    // Load graph from database if available
    static async loadPersistedGraph(sessionId: string): Promise<ResearchGraphManager | null> {
        try {
            // Import DatabaseService dynamically to avoid circular dependencies
            const { DatabaseService } = await import('./services/databaseService');
            const databaseService = DatabaseService.getInstance();

            if (databaseService) {
                const graphData = await databaseService.getResearchGraph(sessionId);
                if (graphData) {
                    return ResearchGraphManager.deserialize(graphData);
                }
            }
        } catch (error) {
            console.error('Failed to load persisted research graph:', error);
        }

        return null;
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
        manager.graphVersion = parsed.graphVersion || 0;

        return manager;
    }

    async findSimilarNodes(
        nodeId: string,
        threshold = 0.8
    ): Promise<{ node: GraphNode; similarity: number }[]> {
        const node = this.graph.nodes.get(nodeId);
        if (!node) return [];

        try {
            // Use embedding service for semantic similarity instead of deprecated service
            const { EmbeddingService } = await import('./services/ai/EmbeddingService');
            const embeddingService = EmbeddingService.getInstance();

            const nodeEmbedding = await embeddingService.generateEmbedding(node.title);
            const similarNodes: { node: GraphNode; similarity: number }[] = [];

            // Compare with other nodes in the graph
            for (const [otherNodeId, otherNode] of this.graph.nodes.entries()) {
                if (otherNodeId === nodeId) continue;

                try {
                    const otherEmbedding = await embeddingService.generateEmbedding(otherNode.title);
                    const similarity = embeddingService.calculateSimilarity(nodeEmbedding, otherEmbedding);

                    if (similarity >= threshold) {
                        similarNodes.push({ node: otherNode, similarity });
                    }
                } catch (error) {
                    console.warn(`Failed to calculate similarity for node ${otherNodeId}:`, error);
                }
            }

            return similarNodes.sort((a, b) => b.similarity - a.similarity);
        } catch (error) {
            console.error('Semantic search failed:', error);
            return [];
        }
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

// Helper to generate mermaid diagram from graph with unique node IDs
export function generateMermaidDiagram(manager: ResearchGraphManager): string {
    const graphData = manager.exportForVisualization();
    let mermaid = 'graph TD\n';

    // Create unique node IDs to avoid title collisions
    const nodeIdMap = new Map<string, string>();
    graphData.nodes.forEach((node, index) => {
        const safeTitle = node.label.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const uniqueId = `${safeTitle}_${node.id.split('-').pop() || index}`;
        nodeIdMap.set(node.id, uniqueId);
    });

    // Add nodes with unique IDs and safe labels
    graphData.nodes.forEach(node => {
        const uniqueId = nodeIdMap.get(node.id) || node.id;
        const safeLabel = node.label.replace(/"/g, "'");
        const shape = node.type === ResearchStepType.ERROR ? '((' : node.type === ResearchStepType.FINAL_ANSWER ? '[[' : '[';
        const endShape = node.type === ResearchStepType.ERROR ? '))' : node.type === ResearchStepType.FINAL_ANSWER ? ']]' : ']';
        mermaid += `    ${uniqueId}${shape}"${safeLabel}"${endShape}\n`;
    });

    // Add edges using unique IDs
    graphData.edges.forEach(edge => {
        const sourceId = nodeIdMap.get(edge.source) || edge.source;
        const targetId = nodeIdMap.get(edge.target) || edge.target;
        const arrow = edge.type === 'error' ? '-..->' : '-->';
        const label = edge.label ? `|${edge.label}|` : '';
        mermaid += `    ${sourceId} ${arrow}${label} ${targetId}\n`;
    });

    // Add styling
    mermaid += '\n    classDef error fill:#fee,stroke:#f66,stroke-width:2px\n';
    mermaid += '    classDef success fill:#efe,stroke:#6f6,stroke-width:2px\n';
    mermaid += '    classDef processing fill:#eef,stroke:#66f,stroke-width:2px\n';

    // Apply styles to nodes using unique IDs
    const errorNodes = graphData.nodes
        .filter(n => n.type === ResearchStepType.ERROR)
        .map(n => nodeIdMap.get(n.id) || n.id);
    const successNodes = graphData.nodes
        .filter(n => n.type === ResearchStepType.FINAL_ANSWER)
        .map(n => nodeIdMap.get(n.id) || n.id);

    if (errorNodes.length > 0) {
        mermaid += `    class ${errorNodes.join(',')} error\n`;
    }
    if (successNodes.length > 0) {
        mermaid += `    class ${successNodes.join(',')} success\n`;
    }

    return mermaid;
}
