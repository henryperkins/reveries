export interface FunctionParameter {
    type: string;
    description: string;
    enum?: string[];
    items?: { type: string };
}

export interface FunctionDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, FunctionParameter>;
        required: string[];
    };
}

export interface FunctionCall {
    name: string;
    arguments: Record<string, any>;
}

export interface FunctionResult<T = any> {
    result: T | null;
    error?: string | null;
}

export interface ToolUseState {
    currentStep: string;
    history: Array<{
        function: string;
        arguments: Record<string, any>;
        result: any;
        timestamp: number;
    }>;
    context: Record<string, any>;
}

export class FunctionCallingService {
    private static instance: FunctionCallingService;
    private functions: Map<string, (...args: any[]) => any> = new Map();
    private toolState: ToolUseState;

    private constructor() {
        this.toolState = {
            currentStep: 'initial',
            history: [],
            context: {}
        };
        this.registerDefaultFunctions();
    }

    public static getInstance(): FunctionCallingService {
        if (!FunctionCallingService.instance) {
            FunctionCallingService.instance = new FunctionCallingService();
        }
        return FunctionCallingService.instance;
    }

    /**
     * Register default research functions
     */
    private registerDefaultFunctions(): void {
        // Define research-specific functions
        this.registerFunction('analyze_query_intent', async (query: string) => {
            const intents = {
                factual: ['what is', 'define', 'who is', 'when did', 'where is'],
                analytical: ['analyze', 'explain', 'how does', 'why does', 'impact of'],
                comparative: ['compare', 'versus', 'vs', 'difference between', 'better than'],
                exploratory: ['tell me about', 'overview of', 'introduction to', 'guide to']
            };

            const queryLower = query.toLowerCase();
            for (const [intent, keywords] of Object.entries(intents)) {
                if (keywords.some(keyword => queryLower.includes(keyword))) {
                    return { intent, confidence: 0.8 };
                }
            }
            return { intent: 'exploratory', confidence: 0.5 };
        });

        this.registerFunction('extract_key_entities', async (text: string) => {
            // Simple entity extraction
            const entities: {
                topics: string[];
                timeframes: string[];
                locations: string[];
                comparisons: string[];
            } = {
                topics: [],
                timeframes: [],
                locations: [],
                comparisons: []
            };

            // Extract topics (capitalized words)
            const topicMatches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
            if (topicMatches) {
                entities.topics = [...new Set(topicMatches)];
            }

            // Extract timeframes
            const timeMatches = text.match(/\b\d{4}\b|\b(recent|current|latest|historical)\b/gi);
            if (timeMatches) {
                entities.timeframes = [...new Set(timeMatches)];
            }

            // Extract comparison indicators
            const compareMatches = text.match(/\b(vs|versus|compared to|better than)\b/gi);
            if (compareMatches) {
                entities.comparisons = compareMatches;
            }

            return entities;
        });

        this.registerFunction('generate_search_strategy', async (intent: string, entities: any) => {
            const strategies = {
                factual: {
                    approach: 'authoritative_sources',
                    sources: ['wikipedia', 'gov', 'edu'],
                    depth: 'shallow',
                    verification: true
                },
                analytical: {
                    approach: 'multi_perspective',
                    sources: ['academic', 'expert_analysis', 'case_studies'],
                    depth: 'deep',
                    verification: true
                },
                comparative: {
                    approach: 'side_by_side',
                    sources: ['reviews', 'benchmarks', 'comparisons'],
                    depth: 'medium',
                    verification: false
                },
                exploratory: {
                    approach: 'broad_coverage',
                    sources: ['general', 'overview', 'introduction'],
                    depth: 'medium',
                    verification: false
                }
            };

            const strategy = strategies[intent as keyof typeof strategies] || strategies.exploratory;

            return {
                ...strategy,
                entities,
                searchQueries: this.generateQueriesFromStrategy(intent, entities)
            };
        });

        this.registerFunction('evaluate_source_quality', async (source: { url?: string; name: string }) => {
            if (!source.url) return { quality: 'unknown', score: 0.5 };

            const qualityIndicators = {
                high: ['.gov', '.edu', 'wikipedia.org', 'nature.com', 'science.org', 'arxiv.org'],
                medium: ['.org', 'medium.com', 'github.com'],
                low: ['blogspot.com', 'wordpress.com']
            };

            for (const [quality, domains] of Object.entries(qualityIndicators)) {
                if (domains.some(domain => source.url!.includes(domain))) {
                    return {
                        quality,
                        score: quality === 'high' ? 0.9 : quality === 'medium' ? 0.6 : 0.3
                    };
                }
            }

            return { quality: 'medium', score: 0.5 };
        });

        this.registerFunction('synthesize_findings', async (findings: unknown[], strategy: unknown) => {
            const synthesis: {
                mainPoints: string[];
                supportingEvidence: string[];
                contradictions: string[];
                gaps: string[];
            } = {
                mainPoints: [],
                supportingEvidence: [],
                contradictions: [],
                gaps: []
            };

            // Extract main points
            if (Array.isArray(findings)) {
                synthesis.mainPoints = findings
                    .filter(f => f && typeof f === 'object')
                    .map(f => (f as any).summary || (f as any).text || '')
                    .filter(text => text.length > 50);
            }

            // Identify gaps based on strategy
            const strategyObj = strategy as { entities?: { topics?: string[] } };
            if (strategyObj.entities?.topics && strategyObj.entities.topics.length > 0) {
                const coveredTopics = synthesis.mainPoints.join(' ').toLowerCase();
                synthesis.gaps = strategyObj.entities.topics.filter(
                    (topic: string) => !coveredTopics.includes(topic.toLowerCase())
                );
            }

            return synthesis;
        });
    }

    private generateQueriesFromStrategy(intent: string, entities: any): string[] {
        const queries: string[] = [];
        const baseTopics = entities.topics || [];

        switch (intent) {
            case 'factual':
                baseTopics.forEach((topic: string) => {
                    queries.push(`${topic} definition facts`);
                    queries.push(`${topic} official data statistics`);
                    queries.push(`what is ${topic}`);
                    queries.push(`define ${topic}`);
                });
                break;
            case 'analytical':
                baseTopics.forEach((topic: string) => {
                    queries.push(`${topic} analysis research`);
                    queries.push(`${topic} impact effects consequences`);
                    queries.push(`how does ${topic}`);
                    queries.push(`why does ${topic}`);
                });
                break;
            case 'comparative':
                if (baseTopics.length >= 2) {
                    queries.push(`${baseTopics[0]} vs ${baseTopics[1]} comparison`);
                    queries.push(`difference between ${baseTopics[0]} and ${baseTopics[1]}`);
                    queries.push(`compare ${baseTopics[0]} ${baseTopics[1]}`);
                }
                break;
            default:
                baseTopics.forEach((topic: string) => {
                    queries.push(`${topic} overview introduction`);
                    queries.push(`guide to ${topic}`);
                    queries.push(`introduction to ${topic}`);
                });
        }

        return queries.slice(0, 5); // Limit queries
    }

    /**
     * Register a function implementation
     */
    registerFunction(name: string, implementation: (...args: any[]) => Promise<any>): void {
        this.functions.set(name, implementation);
    }

    /**
     * Execute a function call with stricter type validation
     */
    async executeFunction(call: FunctionCall): Promise<FunctionResult> {
        try {
            // Validate input
            if (!call.name || typeof call.name !== 'string') {
                throw new Error('Invalid function name');
            }

            if (!call.arguments || typeof call.arguments !== 'object') {
                throw new Error('Invalid function arguments');
            }

            const fn = this.functions.get(call.name);
            if (!fn) {
                throw new Error(`Function ${call.name} not found`);
            }

            const args = Object.values(call.arguments);
            const result = await fn(...args);

            // Update tool state
            this.toolState.history.push({
                function: call.name,
                arguments: call.arguments,
                result,
                timestamp: Date.now()
            });

            return { result, error: null };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error(`Function execution error for ${call.name}:`, errorMessage);

            return {
                result: null,
                error: errorMessage
            };
        }
    }

    /**
     * Get function definitions for model
     */
    getFunctionDefinitions(): FunctionDefinition[] {
        return [
            {
                name: 'analyze_query_intent',
                description: 'Analyze the user query to determine research intent and approach',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The user query to analyze'
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'extract_key_entities',
                description: 'Extract key entities, topics, and timeframes from text',
                parameters: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'Text to extract entities from'
                        }
                    },
                    required: ['text']
                }
            },
            {
                name: 'generate_search_strategy',
                description: 'Generate a search strategy based on intent and entities',
                parameters: {
                    type: 'object',
                    properties: {
                        intent: {
                            type: 'string',
                            description: 'The research intent',
                            enum: ['factual', 'analytical', 'comparative', 'exploratory']
                        },
                        entities: {
                            type: 'object',
                            description: 'Extracted entities from the query'
                        }
                    },
                    required: ['intent', 'entities']
                }
            },
            {
                name: 'evaluate_source_quality',
                description: 'Evaluate the quality and reliability of a source',
                parameters: {
                    type: 'object',
                    properties: {
                        source: {
                            type: 'object',
                            description: 'Source to evaluate with name and optional URL'
                        }
                    },
                    required: ['source']
                }
            },
            {
                name: 'synthesize_findings',
                description: 'Synthesize research findings into structured insights',
                parameters: {
                    type: 'object',
                    properties: {
                        findings: {
                            type: 'array',
                            items: { type: 'object' },
                            description: 'Array of research findings'
                        },
                        strategy: {
                            type: 'object',
                            description: 'The search strategy used'
                        }
                    },
                    required: ['findings']
                }
            },
            {
                name: 'getCurrentTime',
                description: 'Get the current time in ISO format',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
            },
            {
                name: 'calculateSum',
                description: 'Calculate the sum of two numbers',
                parameters: {
                    type: 'object',
                    properties: {
                        a: { type: 'number', description: 'First number' },
                        b: { type: 'number', description: 'Second number' },
                    },
                    required: ['a', 'b'],
                },
            },
        ];
    }

    /**
     * Get tool state
     */
    getToolState(): ToolUseState {
        return { ...this.toolState };
    }

    /**
     * Reset tool state
     */
    resetToolState(): void {
        this.toolState = {
            currentStep: 'initial',
            history: [],
            context: {}
        };
    }

    /**
     * Update context
     */
    updateContext(key: string, value: any): void {
        this.toolState.context[key] = value;
    }

    /**
     * Get execution history
     */
    getExecutionHistory(): ToolUseState['history'] {
        return [...this.toolState.history];
    }
}
