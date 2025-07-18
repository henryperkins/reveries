import { QueryType } from '../types';
import { FunctionCall, FunctionDefinition } from './functionCallingService';
import { Citation } from '../types';

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
    // Advanced web search with filters
    this.registerTool({
      name: 'advanced_web_search',
      description: 'Perform advanced web search with domain, date, and type filters',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          domains: {
            type: 'array',
            items: { type: 'string' },
            description: 'Limit to specific domains (e.g., .edu, .gov)'
          },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' }
            }
          },
          fileType: {
            type: 'string',
            enum: ['pdf', 'doc', 'ppt', 'xls', 'any'],
            description: 'Filter by file type'
          }
        },
        required: ['query']
      },
      execute: async (_args) => {
        const { SearchProviderService } = await import('./search/SearchProviderService');
        const searchService = SearchProviderService.getInstance();
        
        try {
          const searchOptions: any = {
            maxResults: 20,
            safe: true
          };

          if (_args.domains && _args.domains.length > 0) {
            searchOptions.domains = _args.domains;
          }

          if (_args.fileType && _args.fileType !== 'any') {
            searchOptions.fileType = _args.fileType;
          }

          if (_args.dateRange) {
            const { start, end } = _args.dateRange;
            if (start && end) {
              const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff <= 7) searchOptions.timeRange = 'week';
              else if (daysDiff <= 30) searchOptions.timeRange = 'month';
              else if (daysDiff <= 365) searchOptions.timeRange = 'year';
            }
          }

          const response = await searchService.search(_args.query, searchOptions);
          
          return {
            results: response.results.map(r => ({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
              relevanceScore: r.relevanceScore
            })),
            totalFound: response.totalResults || response.results.length,
            filters: _args,
            provider: response.provider
          };
        } catch (error) {
          console.error('Advanced search failed:', error);
          return {
            results: [],
            totalFound: 0,
            filters: _args,
            error: error instanceof Error ? error.message : 'Search failed'
          };
        }
      }
    });

    // Academic paper search
    this.registerTool({
      name: 'search_academic_papers',
      description: 'Search academic papers from arXiv, PubMed, and other databases',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          database: {
            type: 'string',
            enum: ['arxiv', 'pubmed', 'scholar', 'all']
          },
          yearRange: {
            type: 'object',
            properties: {
              start: { type: 'integer' },
              end: { type: 'integer' }
            }
          },
          limit: { type: 'integer', default: 10 }
        },
        required: ['query']
      },
      execute: async (_args) => {
        try {
          // Try arxiv search if specified or as fallback
          if (_args.database === 'arxiv' || _args.database === 'all') {
            const arxivResults = await this.searchArxiv(_args.query, _args.limit || 10);
            if (arxivResults.length > 0) {
              return {
                papers: arxivResults,
                database: 'arxiv',
                source: 'arXiv.org'
              };
            }
          }

          // Try general academic search through search provider
          const { SearchProviderService } = await import('./search/SearchProviderService');
          const searchService = SearchProviderService.getInstance();
          
          const academicQuery = `${_args.query} filetype:pdf site:arxiv.org OR site:pubmed.ncbi.nlm.nih.gov OR site:scholar.google.com`;
          const response = await searchService.search(academicQuery, {
            maxResults: _args.limit || 10,
            domains: ['arxiv.org', 'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov'],
            fileType: 'pdf'
          });

          const papers = response.results.map(result => ({
            title: result.title,
            url: result.url,
            abstract: result.snippet,
            authors: this.extractAuthorsFromSnippet(result.snippet),
            publishedDate: result.publishedDate,
            source: this.identifyAcademicSource(result.url),
            relevanceScore: result.relevanceScore
          }));

          return {
            papers,
            database: _args.database || 'search',
            totalFound: response.totalResults
          };
        } catch (error) {
          console.error('Academic search failed:', error);
          return {
            papers: [],
            database: _args.database || 'all',
            error: error instanceof Error ? error.message : 'Academic search failed'
          };
        }
      }
    });

    // Local file search
    this.registerTool({
      name: 'search_local_files',
      description: 'Search through uploaded or cached documents',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          fileTypes: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['query']
      },
      execute: async (_args) => {
        // Would search through indexed local content
        return {
          files: [],
          matches: []
        };
      }
    });

    // Statistical analysis
    this.registerTool({
      name: 'analyze_statistics',
      description: 'Perform statistical analysis on research data',
      category: 'analysis',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { type: 'number' } },
          analysisType: {
            type: 'string',
            enum: ['descriptive', 'correlation', 'regression', 'timeseries']
          }
        },
        required: ['data', 'analysisType']
      },
      execute: async (_args) => {
        try {
          const data = _args.data;
          const analysisType = _args.analysisType;

          switch (analysisType) {
            case 'descriptive':
              return this.performDescriptiveAnalysis(data);
            case 'correlation':
              return this.performCorrelationAnalysis(data);
            case 'regression':
              return this.performRegressionAnalysis(data);
            case 'timeseries':
              return this.performTimeSeriesAnalysis(data);
            default:
              return this.performDescriptiveAnalysis(data);
          }
        } catch (error) {
          console.error('Statistical analysis failed:', error);
          return {
            analysis: _args.analysisType,
            results: {},
            error: error instanceof Error ? error.message : 'Analysis failed'
          };
        }
      }
    });

    // Citation formatter
    this.registerTool({
      name: 'format_citations',
      description: 'Format citations in various academic styles',
      category: 'citation',
      parameters: {
        type: 'object',
        properties: {
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                authors: { type: 'array', items: { type: 'string' } },
                year: { type: 'integer' },
                url: { type: 'string' }
              }
            }
          },
          style: {
            type: 'string',
            enum: ['APA', 'MLA', 'Chicago', 'Harvard']
          }
        },
        required: ['sources', 'style']
      },
      execute: async (_args) => {
        return this.formatCitations(_args.sources, _args.style);
      }
    });

    // Fact checker
    this.registerTool({
      name: 'verify_facts',
      description: 'Cross-reference facts with reliable sources',
      category: 'verification',
      parameters: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          context: { type: 'string' }
        },
        required: ['claim']
      },
      execute: async (_args) => {
        // Would check against fact-checking databases
        return {
          claim: _args.claim,
          verdict: 'unverified',
          sources: []
        };
      }
    });

    // Visualization generator
    this.registerTool({
      name: 'generate_visualization',
      description: 'Create charts and graphs from research data',
      category: 'visualization',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          chartType: {
            type: 'string',
            enum: ['line', 'bar', 'pie', 'scatter', 'network', 'timeline']
          },
          options: { type: 'object' }
        },
        required: ['data', 'chartType']
      },
      execute: async (_args) => {
        // Would generate chart configuration
        return {
          chartConfig: {},
          chartType: _args.chartType
        };
      }
    });

    // Entity extractor
    this.registerTool({
      name: 'extract_entities',
      description: 'Extract named entities from text',
      category: 'analysis',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          entityTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['person', 'organization', 'location', 'date', 'concept']
            }
          }
        },
        required: ['text']
      },
      execute: async (_args) => {
        // Would use NER models
        return {
          entities: []
        };
      }
    });

    // Summarization tool
    this.registerTool({
      name: 'summarize_document',
      description: 'Generate concise summaries of long documents',
      category: 'analysis',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          maxLength: { type: 'integer', default: 500 },
          style: {
            type: 'string',
            enum: ['bullet', 'paragraph', 'abstract']
          }
        },
        required: ['text']
      },
      execute: async (_args) => {
        // Would generate summaries
        return {
          summary: '',
          style: _args.style || 'paragraph'
        };
      }
    });

    // Knowledge graph builder
    this.registerTool({
      name: 'build_knowledge_graph',
      description: 'Extract relationships and build a knowledge graph',
      category: 'analysis',
      parameters: {
        type: 'object',
        properties: {
          documents: { type: 'array', items: { type: 'string' } },
          relationTypes: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['documents']
      },
      execute: async (_args) => {
        // Would extract relationships
        return {
          nodes: [],
          edges: [],
          stats: {}
        };
      }
    });

    // Query analysis tool
    this.registerTool({
      name: 'analyzeQuery',
      description: 'Analyze a query to determine its type and complexity',
      category: 'analysis',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The query to analyze' }
        },
        required: ['query']
      },
      execute: async (_args) => {
        const queryLower = _args.query.toLowerCase();

        let type: QueryType = 'exploratory';
        if (queryLower.includes('what is') || queryLower.includes('define')) {
          type = 'factual';
        } else if (queryLower.includes('compare') || queryLower.includes('difference')) {
          type = 'comparative';
        } else if (queryLower.includes('analyze') || queryLower.includes('explain')) {
          type = 'analytical';
        }

        const complexity = Math.min(_args.query.split(' ').length / 20, 1);

        return { type, complexity };
      }
    });

    // Search query generator
    this.registerTool({
      name: 'generateSearchQueries',
      description: 'Generate optimal search queries for a given topic',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The topic to search for' },
          count: { type: 'number', description: 'Number of queries to generate' }
        },
        required: ['topic']
      },
      execute: async (_args) => {
        const queries: string[] = [_args.topic];

        // Generate variations
        if (_args.count > 1) queries.push(`${_args.topic} definition explanation`);
        if (_args.count > 2) queries.push(`${_args.topic} examples applications`);
        if (_args.count > 3) queries.push(`${_args.topic} research studies`);

        return queries.slice(0, _args.count);
      }
    });

    // Tool to list all available tools
    this.registerTool({
      name: 'list_tools',
      description: 'List all available research tools',
      category: 'knowledge',
      parameters: {},
      execute: async (_args) => {
        return {
          currentTools: Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            category: t.category
          }))
        };
      }
    });

    // Tool to suggest a research workflow
    this.registerTool({
      name: 'suggest_workflow',
      description: 'Suggest a research workflow based on the given parameters',
      category: 'analysis',
      parameters: {
        type: 'object',
        properties: {
          researchGoal: { type: 'string' },
          dataAvailability: { type: 'string', enum: ['high', 'medium', 'low'] },
          analysisType: { type: 'string', enum: ['descriptive', 'inferential', 'predictive'] }
        },
        required: ['researchGoal']
      },
      execute: async (_args) => {
        const workflowSteps = await this.suggestWorkflow(
          'Research workflow planning',
          'analytical'
        );
        return { workflowSteps };
      }
    });

    // Citation guide retrieval tool
    this.registerTool({
      name: 'get_citation_guide',
      description: 'Retrieve the citation guide for various styles',
      category: 'citation',
      parameters: {},
      execute: async (_args) => {
        const guide = await this.getCitationGuide();
        return { guide };
      }
    });
  }

  private registerTool(tool: ResearchTool): void {
    this.tools.set(tool.name, tool);
  }

  public getToolDefinitions(): FunctionDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  public async executeTool(call: FunctionCall): Promise<any> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${call.name}`);
    }
    return tool.execute(call.arguments);
  }

  public getToolsByCategory(category: string): ResearchTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  public recommendToolsForQuery(query: string, queryType: string): string[] {
    const recommendations: string[] = [];

    // Recommend based on query patterns
    const queryLower = query.toLowerCase();

    if (queryLower.includes('paper') || queryLower.includes('research') || queryLower.includes('study')) {
      recommendations.push('search_academic_papers');
    }

    if (queryLower.includes('fact') || queryLower.includes('verify') || queryLower.includes('true')) {
      recommendations.push('verify_facts');
    }

    if (queryLower.includes('graph') || queryLower.includes('chart') || queryLower.includes('visualiz')) {
      recommendations.push('generate_visualization');
    }

    if (queryLower.includes('summar') || queryLower.includes('brief') || queryLower.includes('overview')) {
      recommendations.push('summarize_document');
    }

    if (queryLower.includes('statistic') || queryLower.includes('correlat') || queryLower.includes('analyz')) {
      recommendations.push('analyze_statistics');
    }

    if (queryLower.includes('citation') || queryLower.includes('reference') || queryLower.includes('bibliography')) {
      recommendations.push('format_citations');
    }

    // Recommend based on query type
    switch (queryType) {
      case 'factual':
        recommendations.push('verify_facts', 'advanced_web_search');
        break;
      case 'analytical':
        recommendations.push('analyze_statistics', 'build_knowledge_graph');
        break;
      case 'comparative':
        recommendations.push('generate_visualization', 'extract_entities');
        break;
      case 'exploratory':
        recommendations.push('search_academic_papers', 'summarize_document');
        break;
    }

    // Remove duplicates and limit
    return [...new Set(recommendations)].slice(0, 3);
  }

  /**
   * Format citations in various academic styles
   */
  private formatCitations(sources: any[], style: string): any {
    const formattedCitations = sources.map((source, index) => {
      // Normalize source to Citation format
      const normalizedCitation: Citation = {
        url: source.url || '',
        title: source.title || 'Unknown Title',
        authors: source.authors || [],
        published: source.published || source.year ? `${source.year}-01-01` : undefined,
        accessed: source.accessed || new Date().toISOString()
      };

      const citation = this.formatSingleCitation(normalizedCitation, style);
      return {
        index: index + 1,
        citation,
        source: normalizedCitation
      };
    });

    return {
      citations: formattedCitations,
      style,
      formatted: formattedCitations.map(c => c.citation).join('\n\n'),
      count: formattedCitations.length
    };
  }

  /**
   * Format a single citation based on the specified style
   */
  private formatSingleCitation(source: Citation, style: string): string {
    const title = source.title || 'Unknown Title';
    const authors = source.authors || [];
    const year = source.published ? new Date(source.published).getFullYear() : 'n.d.';
    const url = source.url || '';

    switch (style.toUpperCase()) {
      case 'APA':
        return this.formatAPA(title, authors, year, url);
      case 'MLA':
        return this.formatMLA(title, authors, year, url);
      case 'CHICAGO':
        return this.formatChicago(title, authors, year, url);
      case 'HARVARD':
        return this.formatHarvard(title, authors, year, url);
      default:
        return this.formatAPA(title, authors, year, url);
    }
  }

  private formatAPA(title: string, authors: string[], year: string | number, url: string): string {
    const authorText = authors.length > 0 ?
      (authors.length === 1 ? authors[0] :
       authors.length === 2 ? `${authors[0]} & ${authors[1]}` :
       `${authors[0]} et al.`) : 'Unknown Author';

    let citation = `${authorText} (${year}). ${title}`;
    if (url) {
      citation += `. Retrieved from ${url}`;
    }
    return citation;
  }

  private formatMLA(title: string, authors: string[], _year: string | number, url: string): string {
    const authorStr = authors.length > 0 ? `${authors[0]}` : 'Unknown';
    return `${authorStr}. "${title}." Web. <${url}>.`;
  }

  private formatChicago(title: string, authors: string[], _year: string | number, url: string): string {
    const authorStr = authors.join(', ');
    return `${authorStr}. "${title}." Accessed from ${url}.`;
  }

  private formatHarvard(title: string, authors: string[], year: string | number, url: string): string {
    const authorText = authors.length > 0 ?
      (authors.length === 1 ? authors[0] :
       authors.length === 2 ? `${authors[0]} and ${authors[1]}` :
       `${authors[0]} et al.`) : 'Unknown Author';

    let citation = `${authorText} ${year}, '${title}'`;
    if (url) {
      citation += `, viewed ${new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}, <${url}>`;
    }
    return citation;
  }

  private async suggestWorkflow(_goal: string, queryType: string): Promise<string[]> {
    // Simple workflow suggestion based on query type
    const workflows = {
      analytical: [
        'Define research question',
        'Identify key concepts',
        'Search academic sources',
        'Analyze evidence',
        'Synthesize findings'
      ],
      comparative: [
        'Identify items to compare',
        'Define comparison criteria',
        'Research each item separately',
        'Identify similarities/differences',
        'Draw conclusions'
      ],
      exploratory: [
        'Broad initial search',
        'Identify key themes',
        'Deep dive into promising areas',
        'Connect related concepts',
        'Summarize discoveries'
      ],
      factual: [
        'Identify specific information needed',
        'Search authoritative sources',
        'Verify facts across sources',
        'Compile verified information'
      ]
    };
    
    return workflows[queryType as keyof typeof workflows] || workflows.analytical;
  }

  private async getCitationGuide(): Promise<string> {
    return `
# Citation Guide

## APA Style
Format: Author, A. A. (Year). Title of work. URL

## MLA Style
Format: Author. "Title of Work." Website Name, Date, URL.

## Chicago Style
Format: Author. "Title of Work." Website Name. Date. URL.

## Harvard Style
Format: Author Year, 'Title of Work', Website Name, viewed Date, <URL>.

Choose the appropriate style based on your academic or professional requirements.
    `.trim();
  }

  // Statistical analysis helper methods
  private performDescriptiveAnalysis(data: number[]): any {
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    
    const median = n % 2 === 0 
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
      : sorted[Math.floor(n / 2)];
    
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    
    return {
      analysis: 'descriptive',
      results: {
        count: n,
        mean: parseFloat(mean.toFixed(4)),
        median: parseFloat(median.toFixed(4)),
        standardDeviation: parseFloat(stdDev.toFixed(4)),
        variance: parseFloat(variance.toFixed(4)),
        minimum: sorted[0],
        maximum: sorted[n - 1],
        range: sorted[n - 1] - sorted[0],
        quartiles: {
          q1: parseFloat(q1.toFixed(4)),
          q3: parseFloat(q3.toFixed(4)),
          iqr: parseFloat((q3 - q1).toFixed(4))
        },
        summary: `Dataset of ${n} values with mean ${mean.toFixed(2)} and std dev ${stdDev.toFixed(2)}`
      }
    };
  }

  private performCorrelationAnalysis(data: number[]): any {
    // For simple correlation, assume data represents paired values [x1, y1, x2, y2, ...]
    if (data.length < 4 || data.length % 2 !== 0) {
      return {
        analysis: 'correlation',
        results: {},
        error: 'Correlation analysis requires paired data (even number of values)'
      };
    }

    const pairs = [];
    for (let i = 0; i < data.length; i += 2) {
      pairs.push([data[i], data[i + 1]]);
    }

    const n = pairs.length;
    const xValues = pairs.map(p => p[0]);
    const yValues = pairs.map(p => p[1]);
    
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
    
    let numerator = 0;
    let xSumSq = 0;
    let ySumSq = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      xSumSq += xDiff * xDiff;
      ySumSq += yDiff * yDiff;
    }
    
    const correlation = numerator / Math.sqrt(xSumSq * ySumSq);
    const rSquared = correlation * correlation;
    
    return {
      analysis: 'correlation',
      results: {
        correlationCoefficient: parseFloat(correlation.toFixed(4)),
        rSquared: parseFloat(rSquared.toFixed(4)),
        strength: this.interpretCorrelation(Math.abs(correlation)),
        direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'no correlation',
        pairsAnalyzed: n,
        summary: `${this.interpretCorrelation(Math.abs(correlation))} ${correlation > 0 ? 'positive' : 'negative'} correlation (r = ${correlation.toFixed(3)})`
      }
    };
  }

  private performRegressionAnalysis(data: number[]): any {
    // Simple linear regression, assume paired data
    if (data.length < 4 || data.length % 2 !== 0) {
      return {
        analysis: 'regression',
        results: {},
        error: 'Regression analysis requires paired data (even number of values)'
      };
    }

    const pairs = [];
    for (let i = 0; i < data.length; i += 2) {
      pairs.push([data[i], data[i + 1]]);
    }

    const n = pairs.length;
    const xValues = pairs.map(p => p[0]);
    const yValues = pairs.map(p => p[1]);
    
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      numerator += xDiff * (yValues[i] - yMean);
      denominator += xDiff * xDiff;
    }
    
    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;
    
    // Calculate R-squared
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = slope * xValues[i] + intercept;
      ssRes += Math.pow(yValues[i] - predicted, 2);
      ssTot += Math.pow(yValues[i] - yMean, 2);
    }
    
    const rSquared = 1 - (ssRes / ssTot);
    
    return {
      analysis: 'regression',
      results: {
        slope: parseFloat(slope.toFixed(4)),
        intercept: parseFloat(intercept.toFixed(4)),
        rSquared: parseFloat(rSquared.toFixed(4)),
        equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
        goodnessOfFit: rSquared > 0.7 ? 'good' : rSquared > 0.5 ? 'moderate' : 'poor',
        summary: `Linear regression: y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)} (R² = ${rSquared.toFixed(3)})`
      }
    };
  }

  private performTimeSeriesAnalysis(data: number[]): any {
    if (data.length < 3) {
      return {
        analysis: 'timeseries',
        results: {},
        error: 'Time series analysis requires at least 3 data points'
      };
    }

    // Calculate trend using linear regression
    const xValues = Array.from({ length: data.length }, (_, i) => i);
    const yValues = data;
    const n = data.length;
    
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      numerator += xDiff * (yValues[i] - yMean);
      denominator += xDiff * xDiff;
    }
    
    const trend = numerator / denominator;
    
    // Calculate volatility (standard deviation)
    const mean = yMean;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const volatility = Math.sqrt(variance);
    
    // Detect direction changes
    let increases = 0;
    let decreases = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] > data[i - 1]) increases++;
      else if (data[i] < data[i - 1]) decreases++;
    }
    
    return {
      analysis: 'timeseries',
      results: {
        trend: parseFloat(trend.toFixed(4)),
        trendDirection: trend > 0.01 ? 'increasing' : trend < -0.01 ? 'decreasing' : 'stable',
        volatility: parseFloat(volatility.toFixed(4)),
        dataPoints: n,
        increases,
        decreases,
        stability: volatility < mean * 0.1 ? 'stable' : volatility < mean * 0.3 ? 'moderate' : 'volatile',
        summary: `${trend > 0 ? 'Increasing' : trend < 0 ? 'Decreasing' : 'Stable'} trend with ${volatility < mean * 0.2 ? 'low' : 'high'} volatility`
      }
    };
  }

  private interpretCorrelation(abs: number): string {
    if (abs >= 0.8) return 'very strong';
    if (abs >= 0.6) return 'strong';
    if (abs >= 0.4) return 'moderate';
    if (abs >= 0.2) return 'weak';
    return 'very weak';
  }

  // Academic search helper methods
  private async searchArxiv(query: string, limit: number): Promise<any[]> {
    try {
      // Simple arXiv search using their API
      const searchUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }
      
      const xmlText = await response.text();
      return this.parseArxivXML(xmlText);
    } catch (error) {
      console.error('arXiv search failed:', error);
      return [];
    }
  }

  private parseArxivXML(xmlText: string): any[] {
    // Simple XML parsing for arXiv results
    const papers = [];
    const entries = xmlText.split('<entry>').slice(1); // Skip first empty split
    
    for (const entry of entries) {
      const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);
      const linkMatch = entry.match(/<id>(.*?)<\/id>/);
      const authorMatches = entry.match(/<name>(.*?)<\/name>/g);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
      
      if (titleMatch && linkMatch) {
        papers.push({
          title: titleMatch[1].trim().replace(/\s+/g, ' '),
          url: linkMatch[1].trim(),
          abstract: summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '',
          authors: authorMatches ? authorMatches.map(m => m.replace(/<\/?name>/g, '')) : [],
          publishedDate: publishedMatch ? publishedMatch[1].trim() : '',
          source: 'arXiv'
        });
      }
    }
    
    return papers;
  }

  private extractAuthorsFromSnippet(snippet: string): string[] {
    // Simple author extraction from text snippets
    const authorPatterns = [
      /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)/gi,
      /([A-Z][a-z]+,\s*[A-Z]\.(?:\s*[A-Z]\.)*)/gi
    ];
    
    for (const pattern of authorPatterns) {
      const match = snippet.match(pattern);
      if (match) {
        return match[0].replace(/^by\s+/i, '').split(/,\s*/).map(author => author.trim());
      }
    }
    
    return [];
  }

  private identifyAcademicSource(url: string): string {
    if (url.includes('arxiv.org')) return 'arXiv';
    if (url.includes('pubmed.ncbi.nlm.nih.gov')) return 'PubMed';
    if (url.includes('scholar.google.com')) return 'Google Scholar';
    if (url.includes('ieee.org')) return 'IEEE';
    if (url.includes('acm.org')) return 'ACM';
    return 'Academic';
  }
}
