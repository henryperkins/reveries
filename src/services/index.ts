// Core Services
export { ResearchAgentService } from './researchAgentServiceWrapper'
export { ContextEngineeringService } from './contextEngineeringService'
export { FunctionCallingService } from './functionCallingService'

// Export refactored sub-services for direct access if needed
export * from './research/types'

// AI Provider Services
export { GeminiService } from './geminiService'
export { GrokService } from './grokService'
export { AzureOpenAIService } from './azureOpenAIService'

// Utility Services
export { APIError, ErrorBoundary, withRetry } from './errorHandler'
export { RateLimiter } from './rateLimiter'

// Stubs for browser builds
export { AzureOpenAIService as azureOpenAIStub } from './azureOpenAIStub'

// Re-export the appropriate DatabaseService based on environment
// This allows imports to use a single path regardless of environment

// Always use the adapter which provides compatibility layer
export { DatabaseService, databaseService } from './databaseServiceAdapter';
