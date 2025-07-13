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
