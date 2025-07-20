/**
 * Generate human-readable descriptions for function calls based on their name and arguments
 */

export function getFunctionDescription(functionName: string, args?: Record<string, any>): string {
  const descriptions: Record<string, (_args: any) => string> = {
    // Search functions
    'web_search': (args) => `Searching the web for: "${args.query || 'information'}"`,
    'google_search': (args) => `Searching Google for: "${args.query || 'information'}"`,
    'bing_search': (args) => `Searching Bing for: "${args.query || 'information'}"`,
    'academic_search': (args) => `Searching academic papers for: "${args.query || 'research'}"`,
    
    // Analysis functions
    'query_analysis': (_args) => `Analyzing the query to understand intent and requirements`,
    'paradigm_classification': (_args) => `Classifying query into research paradigms (analytical, narrative, etc.)`,
    'paradigm_routing': (args) => `Routing query to appropriate research paradigm: ${args.paradigm || 'best match'}`,
    'strategy_selection': (_args) => `Selecting optimal research strategy for this query`,
    
    // Evaluation functions
    'quality_evaluation': (_args) => `Evaluating the quality and reliability of research findings`,
    'fact_verification': (_args) => `Verifying facts and claims against reliable sources`,
    'source_validation': (_args) => `Validating the credibility of information sources`,
    
    // Synthesis functions
    'synthesis_engine': (_args) => `Synthesizing research findings into a comprehensive answer`,
    'content_compression': (_args) => `Compressing and summarizing key insights`,
    'narrative_generation': (_args) => `Generating a coherent narrative from research data`,
    
    // Context engineering
    'context_write': (_args) => `Writing key insights to context memory`,
    'context_select': (args) => `Selecting relevant context for query: "${args.query || 'current topic'}"`,
    'context_compress': (_args) => `Compressing context to optimize information density`,
    'context_isolate': (args) => `Isolating specific context relevant to: "${args.topic || 'query'}"`,
    
    // Model-specific
    'azure_ai_agent': (_args) => `Using Azure AI Agent with Bing grounding for enhanced research`,
    'grok_search': (_args) => `Using Grok with live X/Twitter data for real-time insights`,
    'gemini_research': (_args) => `Using Google Gemini for comprehensive research`,
    
    // Tool-specific descriptions
    'calculate': (args) => `Calculating: ${args.expression || 'mathematical expression'}`,
    'verify_facts': (_args) => `Cross-referencing facts with reliable sources`,
    'format_citations': (args) => `Formatting ${args.sources?.length || 'research'} sources in ${args.style || 'standard'} style`,
    'extract_entities': (_args) => `Extracting key entities and concepts from text`,
    'summarize_text': (args) => `Summarizing text to ${args.length || 'concise'} length`,
    
    // Research tools
    'research_papers': (args) => `Searching research papers on: "${args.topic || 'topic'}"`,
    'news_search': (args) => `Searching recent news about: "${args.query || 'current events'}"`,
    'social_media_search': (args) => `Analyzing social media discussions about: "${args.topic || 'topic'}"`,
    'patent_search': (args) => `Searching patents related to: "${args.query || 'innovation'}"`,
    
    // Default fallback
    'default': (_args) => `Processing request with specialized tools`
  };

  // Get the description function or use default
  const descriptionFn = descriptions[functionName] || descriptions['default'];
  
  try {
    return descriptionFn(args || {});
  } catch (error) {
    // Fallback if description function fails
    return `Executing ${functionName.replace(/_/g, ' ')}`;
  }
}

/**
 * Get a brief purpose description for a tool
 */
export function getToolPurpose(toolName: string): string {
  const purposes: Record<string, string> = {
    // Search tools
    'web_search': 'General web search across all sources',
    'google_search': 'Google search for comprehensive results',
    'bing_search': 'Microsoft Bing search with AI enhancements',
    'academic_search': 'Scholarly articles and research papers',
    
    // Analysis tools
    'query_analysis': 'Understand query intent and structure',
    'paradigm_classification': 'Categorize research approach needed',
    'paradigm_routing': 'Direct to optimal research paradigm',
    'strategy_selection': 'Choose best research strategy',
    
    // Evaluation tools
    'quality_evaluation': 'Assess research quality and completeness',
    'fact_verification': 'Verify claims against trusted sources',
    'source_validation': 'Check source credibility and bias',
    
    // Synthesis tools
    'synthesis_engine': 'Combine findings into coherent answer',
    'content_compression': 'Distill key insights efficiently',
    'narrative_generation': 'Create flowing, readable response',
    
    // Context tools
    'context_write': 'Store important information',
    'context_select': 'Retrieve relevant context',
    'context_compress': 'Optimize information density',
    'context_isolate': 'Focus on specific aspects',
    
    // Specialized tools
    'calculate': 'Perform mathematical calculations',
    'verify_facts': 'Fact-check claims',
    'format_citations': 'Format source citations properly',
    'extract_entities': 'Identify key concepts and entities',
    'summarize_text': 'Create concise summaries',
    
    // Default
    'default': 'Specialized processing tool'
  };

  return purposes[toolName] || purposes['default'];
}