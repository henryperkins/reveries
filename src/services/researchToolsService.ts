import { EffortType, ModelType } from '@/types';
import { FunctionCall, FunctionDefinition } from './functionCallingService';
import { RateLimiter } from './rateLimiter';

export interface ResearchTool {
  name: string;
  description: string;
  category: 'search' | 'analysis' | 'citation' | 'verification' | 'visualization' | 'knowledge';
  parameters: any;
  execute: (_args: any) => Promise<any>;
}

export class ResearchToolsService {
  private static instance: ResearchToolsService;
  private tools: Map<string, ResearchTool> = new Map();
  private rateLimiter = RateLimiter.getInstance();

  private constructor() {
    this.initializeTools();
  }

  public static getInstance(): ResearchToolsService {
    if (!ResearchToolsService.instance) {
      ResearchToolsService.instance = new ResearchToolsService();
    }
    return ResearchToolsService.instance;
  }

  private initializeTools(): void {
    console.log('🔧 Initializing research tools...');

    // Comprehensive Research Tool
    this.registerTool({
      name: 'comprehensive_research',
      description: 'Perform comprehensive multi-source research on a topic',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Research query' },
          depth: { type: 'string', enum: ['basic', 'standard', 'deep'], description: 'Research depth' }
        },
        required: ['query']
      },
      execute: async (args: any) => {
        console.log('🔍 Executing comprehensive_research with args:', args);
        try {
          const { ComprehensiveResearchService } = await import('./research/ComprehensiveResearchService');
          const service = ComprehensiveResearchService.getInstance();
          const result = await service.performComprehensiveResearch(
            args.query,
            'grok-4' as ModelType,
            EffortType.MEDIUM
          );
          console.log('✅ Comprehensive research completed');
          return result;
        } catch (error) {
          console.error('❌ Comprehensive research failed:', error);
          throw error;
        }
      }
    });

    // Search Tool
    this.registerTool({
      name: 'search_web',
      description: 'Search the web for information on a topic',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          num_results: { type: 'integer', description: 'Number of results to return', default: 10 }
        },
        required: ['query']
      },
      execute: async (args: any) => {
        console.log('🔍 Executing search_web with args:', args);
        try {
          const { SearchProviderService } = await import('./search/SearchProviderService');
          const searchService = SearchProviderService.getInstance();
          const results = await searchService.search(args.query, { maxResults: args.num_results || 10 });
          return {
            results: results.results || [],
            query: args.query,
            totalResults: results.results?.length || 0
          };
        } catch (error) {
          console.error('❌ Web search failed:', error);
          throw error;
        }
      }
    });

    // Academic Paper Search Tool
    this.registerTool({
      name: 'search_academic_papers',
      description: 'Search for academic papers and scholarly articles',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Academic search query' },
          limit: { type: 'integer', description: 'Number of papers to return', default: 5 }
        },
        required: ['query']
      },
      execute: async (args: any) => {
        console.log('📚 Executing search_academic_papers with args:', args);
        try {
          const { SearchProviderService } = await import('./search/SearchProviderService');
          const searchService = SearchProviderService.getInstance();

          // Add academic search modifiers
          const academicQuery = `${args.query} site:arxiv.org OR site:scholar.google.com OR site:pubmed.ncbi.nlm.nih.gov OR filetype:pdf`;
          const results = await searchService.search(academicQuery, { maxResults: args.limit || 5 });

          return {
            papers: results.results || [],
            query: args.query,
            totalPapers: results.results?.length || 0
          };
        } catch (error) {
          console.error('❌ Academic search failed:', error);
          throw error;
        }
      }
    });

    // Text Analysis Tool
    this.registerTool({
      name: 'analyze_text',
      description: 'Analyze text for key insights, themes, and patterns',
      category: 'analysis',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze' },
          analysis_type: {
            type: 'string',
            enum: ['summary', 'keywords', 'sentiment', 'themes'],
            description: 'Type of analysis to perform'
          }
        },
        required: ['text', 'analysis_type']
      },
      execute: async (args: any) => {
        console.log('📊 Executing analyze_text with args:', { analysis_type: args.analysis_type, text_length: args.text?.length });
        try {
          const { ModelProviderService } = await import('./providers/ModelProviderService');
          const modelProvider = ModelProviderService.getInstance();

          let prompt = '';
          switch (args.analysis_type) {
            case 'summary':
              prompt = `Provide a concise summary of the following text:\n\n${args.text}`;
              break;
            case 'keywords':
              prompt = `Extract the most important keywords and key phrases from the following text:\n\n${args.text}`;
              break;
            case 'sentiment':
              prompt = `Analyze the sentiment of the following text (positive, negative, neutral):\n\n${args.text}`;
              break;
            case 'themes':
              prompt = `Identify the main themes and topics in the following text:\n\n${args.text}`;
              break;
            default:
              prompt = `Analyze the following text and provide insights:\n\n${args.text}`;
          }

          const result = await modelProvider.generateText(prompt, 'grok-4' as ModelType, EffortType.MEDIUM);
          return {
            analysis_type: args.analysis_type,
            result: result.text,
            confidence: 0.8 // Default confidence score
          };
        } catch (error) {
          console.error('❌ Text analysis failed:', error);
          throw error;
        }
      }
    });

    // Document Summarization Tool
    this.registerTool({
      name: 'summarize_document',
      description: 'Summarize a document or long text',
      category: 'analysis',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Document content to summarize' },
          length: { type: 'string', enum: ['short', 'medium', 'long'], description: 'Summary length' }
        },
        required: ['content']
      },
      execute: async (args: any) => {
        console.log('📄 Executing summarize_document with args:', { length: args.length, content_length: args.content?.length });
        try {
          const { ModelProviderService } = await import('./providers/ModelProviderService');
          const modelProvider = ModelProviderService.getInstance();

          const lengthInstruction = {
            short: 'in 2-3 sentences',
            medium: 'in 1-2 paragraphs',
            long: 'in 3-4 paragraphs with detailed analysis'
          }[args.length as keyof { short: string; medium: string; long: string; }] || 'in 1-2 paragraphs';

          const prompt = `Summarize the following document ${lengthInstruction}:\n\n${args.content}`;
          const result = await modelProvider.generateText(prompt, 'grok-4' as ModelType, EffortType.MEDIUM);

          return {
            summary: result.text,
            original_length: args.content.length,
            summary_length: result.text.length,
            compression_ratio: (result.text.length / args.content.length).toFixed(2)
          };
        } catch (error) {
          console.error('❌ Document summarization failed:', error);
          throw error;
        }
      }
    });

    console.log(`✅ Initialized ${this.tools.size} research tools`);
  }

  private registerTool(tool: ResearchTool): void {
    this.tools.set(tool.name, tool);
    console.log(`📝 Registered tool: ${tool.name} (${tool.category})`);
  }

  public getTool(name: string): ResearchTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ResearchTool[] {
    return Array.from(this.tools.values());
  }

  public getToolsByCategory(category: string): ResearchTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  public getFunctionDefinitions(): FunctionDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  public getAzureOpenAIToolDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  public async executeTool(call: FunctionCall): Promise<any> {
    const tool = this.getTool(call.name);
    if (!tool) {
      throw new Error(`Tool not found: ${call.name}`);
    }

    await this.rateLimiter.waitForCapacity(100); // Default token estimate for tool execution

    try {
      const result = await tool.execute(call.arguments);
      console.log(`✅ Tool ${call.name} executed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Tool ${call.name} execution failed:`, error);
      throw error;
    }
  }

  public getToolRecommendations(query: string, _effort: EffortType = EffortType.MEDIUM): string[] {
    const queryLower = query.toLowerCase();
    const recommendations: string[] = [];

    // Simple keyword-based recommendations
    if (queryLower.includes('search') || queryLower.includes('find')) {
      recommendations.push('search_web', 'comprehensive_research');
    }

    if (queryLower.includes('academic') || queryLower.includes('paper') || queryLower.includes('research')) {
      recommendations.push('search_academic_papers', 'comprehensive_research');
    }

    if (queryLower.includes('analyze') || queryLower.includes('analysis')) {
      recommendations.push('analyze_text');
    }

    if (queryLower.includes('summarize') || queryLower.includes('summary')) {
      recommendations.push('summarize_document');
    }

    // Default recommendations if no specific keywords found
    if (recommendations.length === 0) {
      recommendations.push('comprehensive_research');
    }

    // Add complementary tools based on context
    switch (true) {
      case queryLower.includes('compare') || queryLower.includes('versus'):
        recommendations.push('search_web', 'analyze_text');
        break;
      case queryLower.includes('trend') || queryLower.includes('pattern'):
        recommendations.push('search_web', 'analyze_text');
        break;
      case queryLower.includes('fact') || queryLower.includes('verify'):
        recommendations.push('search_web', 'search_academic_papers');
        break;
      case queryLower.includes('explain') || queryLower.includes('understand'):
        recommendations.push('search_academic_papers', 'summarize_document');
        break;
    }

    // Remove duplicates and limit
    return [...new Set(recommendations)].slice(0, 3);
  }
}
