/**
 * Utility to parse tool_used messages and extract tool information
 */

export interface ToolMessage {
  type: 'start' | 'complete';
  toolName: string;
  timestamp?: number;
}

/**
 * Parse a progress message to extract tool usage information
 * @param message Progress message from services
 * @returns Parsed tool information or null if not a tool message
 */
export function parseToolMessage(message: string): ToolMessage | null {
  // Check for tool start message: "tool_used:toolName"
  if (message.startsWith('tool_used:') && !message.includes(':completed:')) {
    const toolName = message.substring('tool_used:'.length);
    return {
      type: 'start',
      toolName,
      timestamp: Date.now()
    };
  }
  
  // Check for tool completion message: "tool_used:completed:toolName:timestamp"
  if (message.startsWith('tool_used:completed:')) {
    const parts = message.substring('tool_used:completed:'.length).split(':');
    const toolName = parts[0];
    const timestamp = parts[1] ? parseInt(parts[1], 10) : undefined;
    
    return {
      type: 'complete',
      toolName,
      timestamp
    };
  }
  
  return null;
}

/**
 * Extract all tool names from an array of messages
 * @param messages Array of progress messages
 * @returns Array of unique tool names
 */
export function extractToolsFromMessages(messages: string[]): string[] {
  const tools = new Set<string>();
  
  messages.forEach(message => {
    const parsed = parseToolMessage(message);
    if (parsed) {
      tools.add(parsed.toolName);
    }
  });
  
  return Array.from(tools);
}

/**
 * Check if a message indicates tool usage
 * @param message Progress message
 * @returns True if message is about tool usage
 */
export function isToolMessage(message: string): boolean {
  return message.startsWith('tool_used:');
}

/**
 * Calculate tool execution duration
 * @param startTime Start timestamp
 * @param endTime End timestamp (defaults to now)
 * @returns Duration in milliseconds
 */
export function calculateToolDuration(startTime: number, endTime?: number): number {
  return (endTime || Date.now()) - startTime;
}

/**
 * Format tool name for display
 * @param toolName Raw tool name from message
 * @returns Human-readable tool name
 */
export function formatToolName(toolName: string): string {
  // Handle common tool name patterns
  const formatted = toolName
    .replace(/_/g, ' ')
    .replace(/api$/i, ' API')
    .replace(/llm/i, 'LLM')
    .replace(/^(\w)/, (match) => match.toUpperCase());
  
  // Special cases
  const specialCases: Record<string, string> = {
    'gemini api': 'Gemini API',
    'grok api': 'Grok API',
    'azure openai': 'Azure OpenAI',
    'web search': 'Web Search',
    'search cache': 'Search Cache',
    'memory cache': 'Memory Cache',
    'query generation': 'Query Generation',
    'query classification': 'Query Classification',
    'paradigm detection': 'Paradigm Detection',
    'comprehensive research': 'Comprehensive Research',
    'quality evaluation': 'Quality Evaluation',
    'llm summarization': 'LLM Summarization',
    'llm fallback': 'LLM Fallback'
  };
  
  return specialCases[toolName.toLowerCase()] || formatted;
}