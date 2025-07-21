import { QueryType } from '@/types';
import { FunctionCall, FunctionDefinition } from './functionCallingService';
import { Citation } from '@/types';
import { RateLimiter, estimateTokens } from './rateLimiter';

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
            'gemini-2.0-flash-exp', // Use a valid model
            args.depth === 'deep' ? 'HIGH' : args.depth === 'basic' ? 'LOW' : 'MEDIUM'
          );
          console.log('✅ comprehensive_research completed successfully');
          return {
            synthesis: result.synthesis,
            sources: result.sources,
            queryType: result.queryType,
            confidence: result.confidenceScore
          };
        } catch (error) {
          console.error('❌ comprehensive_research failed:', error);
          throw error;
        }
      }
    });

    // Exploratory Research Tool
    this.registerTool({
      name: 'exploratory_research',
      description: 'Explore multiple perspectives and discover related topics',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic to explore' },
          perspectives: { type: 'array', items: { type: 'string' }, description: 'Perspectives to consider' }
        },
        required: ['topic']
      },
      execute: async (args: any) => {
        console.log('🔍 Executing exploratory_research with args:', args);
        try {
          const { WebResearchService } = await import('./research/WebResearchService');
          const service = WebResearchService.getInstance();

          // Generate search queries for different perspectives
          const queries = args.perspectives?.length > 0
            ? args.perspectives.map((p: string) => `${args.topic} ${p}`)
            : [`${args.topic} overview`, `${args.topic} analysis`, `${args.topic} perspectives`];

          console.log('📋 Generated exploratory queries:', queries);

          // Perform web research
          const results = await service.performWebResearch(
            queries,
            'gemini-2.0-flash-exp',
            'MEDIUM',
            async (prompt, model, effort) => {
              // Use ModelProviderService for generation
              const { ModelProviderService } = await import('./providers/ModelProviderService');
              const provider = ModelProviderService.getInstance();
              return provider.generateText(prompt, model, effort);
            }
          );

          console.log('✅ exploratory_research completed successfully');
          return {
            findings: results.aggregatedFindings,
            sources: results.allSources,
            perspectives: args.perspectives || ['general']
          };
        } catch (error) {
          console.error('❌ exploratory_research failed:', error);
          throw error;
        }
      }
    });

    // Query Breakdown Tool
    this.registerTool({
      name: 'query_breakdown',
      description: 'Break down complex queries into sub-questions',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Complex query to break down' },
          max_parts: { type: 'number', description: 'Maximum number of sub-questions' }
        },
        required: ['query']
      },
      execute: async (args: any) => {
        console.log('🔍 Executing query_breakdown with args:', args);
        try {
          const { ResearchStrategyService } = await import('./research/ResearchStrategyService');
          const service = ResearchStrategyService.getInstance();

          // Use the service to analyze query complexity
          const queryType = service.classifyQueryType(args.query);
          const maxParts = args.max_parts || 5;

          // Generate sub-questions based on query type
          const subQuestions: string[] = [];

          if (queryType === 'comparison') {
            const items = args.query.match(/compare\s+(\w+)\s+(?:and|vs\.?|versus)\s+(\w+)/i);
            if (items) {
              subQuestions.push(`What are the key features of ${items[1]}?`);
              subQuestions.push(`What are the key features of ${items[2]}?`);
              subQuestions.push(`What are the main differences between ${items[1]} and ${items[2]}?`);
              subQuestions.push(`What are the similarities between ${items[1]} and ${items[2]}?`);
            }
          } else if (queryType === 'howto') {
            subQuestions.push(`What are the prerequisites for ${args.query}?`);
            subQuestions.push(`What are the main steps involved?`);
            subQuestions.push(`What tools or resources are needed?`);
            subQuestions.push(`What are common challenges and solutions?`);
          } else {
            // Generic breakdown
            subQuestions.push(`What is the definition or overview of the topic?`);
            subQuestions.push(`What are the key components or aspects?`);
            subQuestions.push(`What are real-world applications or examples?`);
            subQuestions.push(`What are current trends or developments?`);
          }

          console.log('✅ query_breakdown completed successfully');
          return {
            original_query: args.query,
            query_type: queryType,
            sub_questions: subQuestions.slice(0, maxParts)
          };
        } catch (error) {
          console.error('❌ query_breakdown failed:', error);
          throw error;
        }
      }
    });

    // Query Generation Tool (for generating search queries)
    this.registerTool({
      name: 'query_generation',
      description: 'Generate optimized search queries for a research topic',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Research topic' },
          count: { type: 'number', description: 'Number of queries to generate' },
          style: { type: 'string', enum: ['academic', 'general', 'technical'], description: 'Query style' }
        },
        required: ['topic']
      },
      execute: async (args: any) => {
        console.log('🔍 Executing query_generation with args:', args);
        try {
          const { WebResearchService } = await import('./research/WebResearchService');
          const { ModelProviderService } = await import('./providers/ModelProviderService');

          const service = WebResearchService.getInstance();
          const provider = ModelProviderService.getInstance();

          const generateText = provider.generateText.bind(provider);

          // Generate search queries
          const queries = await service.generateSearchQueries(
            args.topic,
            'gemini-2.0-flash-exp',
            'MEDIUM',
            generateText
          );

          // Filter by style if specified
          let styledQueries = queries;
          if (args.style === 'academic') {
            styledQueries = queries.map(q => `scholarly "${q}" peer-reviewed`);
          } else if (args.style === 'technical') {
            styledQueries = queries.map(q => `${q} technical documentation implementation`);
          }

          const count = args.count || 5;
          console.log('✅ query_generation completed successfully');
          return {
            topic: args.topic,
            queries: styledQueries.slice(0, count),
            style: args.style || 'general'
          };
        } catch (error) {
          console.error('❌ query_generation failed:', error);
          throw error;
        }
      }
    });

    console.log(`✅ Initialized ${this.tools.size} research tools`);
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

  public getAzureOpenAIToolDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  public async executeTool(call: FunctionCall): Promise<any> {
    console.log('🔧 ResearchToolsService.executeTool called:', call.name);
    const tool = this.tools.get(call.name);
    if (!tool) {
      console.warn(`Tool not found: ${call.name}`);
      throw new Error(`Tool not found: ${call.name}`);
    }

    // Check rate limits
    await this.rateLimiter.waitForCapacity(1);

    try {
      console.log(`🔧 Executing tool ${call.name} with args:`, call.arguments);
      const result = await tool.execute(call.arguments);
      console.log(`✅ Tool ${call.name} completed successfully`);

      // Ensure the result is properly formatted for the LLM
      if (typeof result === 'object' && result !== null) {
        return result;
      } else {
        // Wrap primitive results in an object
        return { result: result || 'Tool executed successfully' };
      }
    } catch (error) {
      console.error(`❌ Tool ${call.name} failed:`, error);
      // Return error in a format the LLM can understand
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Tool execution failed',
        tool: call.name
      };
    }
  }

  public getToolsByCategory(category: string): ResearchTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  public getTool(name: string): ResearchTool | undefined {
    return this.tools.get(name);
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
      // Apply rate limiting for external API call
      await this.rateLimiter.waitForCapacity(100); // Estimate for arXiv API call

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
      // Apply rate limiting for external API call
      await this.rateLimiter.waitForCapacity(100); // Estimate for arXiv API call

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
