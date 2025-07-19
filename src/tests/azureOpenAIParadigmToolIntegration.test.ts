/**
 * Test suite for Azure OpenAI paradigm-aware tool integration
 * Tests Priority Gap 1 completion: streaming & tool-calling with paradigm awareness
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AzureOpenAIService } from '../services/azureOpenAIService';
import { ResearchToolsService } from '../services/researchToolsService';
import { FunctionCallingService } from '../services/functionCallingService';
import { EffortType, HostParadigm, ParadigmProbabilities } from '../types';

// Mock the dependencies
vi.mock('../services/researchToolsService');
vi.mock('../services/functionCallingService');
vi.mock('../services/rateLimiter');
vi.mock('../services/errorHandler');

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Azure OpenAI Paradigm-Aware Tool Integration', () => {
  let azureService: AzureOpenAIService;
  let mockResearchTools: Mock;
  let mockFunctionCalling: Mock;

  const testParadigm: HostParadigm = 'bernard';
  const testProbabilities: ParadigmProbabilities = {
    dolores: 0.1,
    teddy: 0.2,
    bernard: 0.6,
    maeve: 0.1
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock environment variables
    vi.stubEnv('VITE_AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com');
    vi.stubEnv('VITE_AZURE_OPENAI_API_KEY', 'test-key');
    vi.stubEnv('VITE_AZURE_OPENAI_DEPLOYMENT', 'gpt-4');

    // Mock ResearchToolsService
    mockResearchTools = vi.mocked(ResearchToolsService.getInstance);
    mockResearchTools.mockReturnValue({
      getAzureOpenAIToolDefinitions: vi.fn().mockReturnValue([
        {
          type: 'function',
          function: {
            name: 'advanced_web_search',
            description: 'Perform advanced web search',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                maxResults: { type: 'number' }
              },
              required: ['query']
            }
          }
        }
      ]),
      getTool: vi.fn().mockReturnValue({
        name: 'advanced_web_search',
        execute: vi.fn().mockResolvedValue({
          results: [
            { title: 'Test Result', url: 'https://example.com', snippet: 'Test snippet' }
          ]
        })
      })
    });

    // Mock FunctionCallingService
    mockFunctionCalling = vi.mocked(FunctionCallingService.getInstance);
    mockFunctionCalling.mockReturnValue({
      executeFunction: vi.fn().mockResolvedValue({
        result: { success: true, data: 'function result' }
      })
    });

    // Get service instance
    azureService = AzureOpenAIService.getInstance();
  });

  describe('Tool Integration', () => {
    it('should get available research tools in Azure OpenAI format', () => {
      const tools = azureService.getAvailableResearchTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual({
        type: 'function',
        function: {
          name: 'advanced_web_search',
          description: 'Perform advanced web search',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              maxResults: { type: 'number' }
            },
            required: ['query']
          }
        }
      });
    });

    it('should filter tools based on paradigm preferences', () => {
      const allTools = [
        { function: { name: 'advanced_web_search' } },
        { function: { name: 'search_academic_sources' } },
        { function: { name: 'generate_visualizations' } }
      ];

      const bernardTools = azureService.getParadigmResearchTools('bernard');
      
      // Bernard should prioritize academic sources and statistics
      expect(bernardTools).toBeDefined();
      expect(Array.isArray(bernardTools)).toBe(true);
    });
  });

  describe('Paradigm-Aware System Prompts', () => {
    it('should generate paradigm-specific system prompts', async () => {
      // Mock successful Azure OpenAI response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Test response from Bernard paradigm',
                role: 'assistant'
              }
            }
          ],
          usage: { total_tokens: 100 }
        }),
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      });

      const response = await azureService.generateResponseWithTools(
        'Analyze the framework for quantum computing research',
        [],
        EffortType.MEDIUM,
        testParadigm,
        testProbabilities
      );

      expect(response).toBeDefined();
      expect(response.paradigmContext).toEqual({
        paradigm: testParadigm,
        probabilities: testProbabilities,
        toolsUsed: []
      });

      // Verify the system prompt was paradigm-aware
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const systemMessage = requestBody.messages[0];
      
      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('BERNARD paradigm');
      expect(systemMessage.content).toContain('analytical depth');
    });
  });

  describe('Automatic Function-Call Loop', () => {
    it('should execute tool calls and continue conversation', async () => {
      // Mock Azure OpenAI responses
      mockFetch
        // First call with tool calls
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_1',
                      function: {
                        name: 'advanced_web_search',
                        arguments: '{"query": "quantum computing framework", "maxResults": 5}'
                      }
                    }
                  ]
                }
              }
            ],
            usage: { total_tokens: 150 }
          }),
          headers: {
            get: vi.fn().mockReturnValue(null)
          }
        })
        // Second call with final response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Based on the search results, I can provide a comprehensive analysis of quantum computing frameworks...',
                }
              }
            ],
            usage: { total_tokens: 200 }
          }),
          headers: {
            get: vi.fn().mockReturnValue(null)
          }
        });

      const tools = azureService.getAvailableResearchTools();
      const response = await azureService.generateResponseWithTools(
        'Research quantum computing frameworks',
        tools,
        EffortType.MEDIUM,
        testParadigm,
        testProbabilities
      );

      expect(response.iterationCount).toBe(2);
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0].name).toBe('advanced_web_search');
      expect(response.text).toContain('comprehensive analysis');
      expect(response.paradigmContext?.toolsUsed).toContain('advanced_web_search');
    });

    it('should handle tool execution errors gracefully', async () => {
      // Mock tool execution failure
      const mockTool = {
        name: 'advanced_web_search',
        execute: vi.fn().mockRejectedValue(new Error('Search API unavailable'))
      };

      mockResearchTools().getTool.mockReturnValue(mockTool);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_1',
                      function: {
                        name: 'advanced_web_search',
                        arguments: '{"query": "test"}'
                      }
                    }
                  ]
                }
              }
            ],
            usage: { total_tokens: 100 }
          }),
          headers: {
            get: vi.fn().mockReturnValue(null)
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'I encountered an error with the search tool, but I can still provide a response based on my knowledge...',
                }
              }
            ],
            usage: { total_tokens: 150 }
          }),
          headers: {
            get: vi.fn().mockReturnValue(null)
          }
        });

      const tools = azureService.getAvailableResearchTools();
      const response = await azureService.generateResponseWithTools(
        'Test query',
        tools,
        EffortType.MEDIUM,
        testParadigm,
        testProbabilities
      );

      expect(response.iterationCount).toBe(2);
      expect(response.text).toContain('error with the search tool');
      
      // Verify error was passed to the model
      const secondCall = mockFetch.mock.calls[1];
      const requestBody = JSON.parse(secondCall[1].body);
      const toolMessage = requestBody.messages.find((msg: any) => msg.role === 'tool');
      
      expect(toolMessage).toBeDefined();
      expect(JSON.parse(toolMessage.content)).toEqual({
        error: 'Search API unavailable',
        success: false
      });
    });
  });

  describe('Paradigm-Aware Streaming', () => {
    it('should stream responses with paradigm context', async () => {
      const chunks: string[] = [];
      const metadata: any[] = [];

      // Mock streaming response
      const mockReadableStream = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Based on "}}]}\n\n')
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"analytical frameworks"}}]}\n\n')
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: [DONE]\n\n')
            })
            .mockResolvedValueOnce({
              done: true,
              value: undefined
            }),
          releaseLock: vi.fn()
        })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockReadableStream,
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      });

      const onChunk = vi.fn((chunk: string, meta?: any) => {
        chunks.push(chunk);
        if (meta) metadata.push(meta);
      });

      const onComplete = vi.fn();

      await azureService.streamResponse(
        'Analyze quantum computing',
        EffortType.MEDIUM,
        onChunk,
        onComplete,
        undefined,
        testParadigm,
        testProbabilities
      );

      expect(chunks).toEqual(['Based on ', 'analytical frameworks']);
      expect(metadata).toHaveLength(2);
      expect(metadata[0]).toEqual({ paradigm: 'bernard' });
      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle tool calls in streaming mode', async () => {
      const toolCalls: any[] = [];

      const mockReadableStream = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"id":"call_1","function":{"name":"search"}}]}}]}\n\n')
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: [DONE]\n\n')
            })
            .mockResolvedValueOnce({
              done: true,
              value: undefined
            }),
          releaseLock: vi.fn()
        })
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockReadableStream,
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      });

      const onToolCall = vi.fn((toolCall: any) => {
        toolCalls.push(toolCall);
      });

      await azureService.streamResponse(
        'Search for information',
        EffortType.MEDIUM,
        vi.fn(),
        vi.fn(),
        undefined,
        testParadigm,
        testProbabilities,
        onToolCall
      );

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]).toEqual({
        id: 'call_1',
        function: { name: 'search' }
      });
    });
  });

  describe('Multi-Paradigm Context', () => {
    it('should handle multi-paradigm scenarios', async () => {
      const multiParadigmProbs: ParadigmProbabilities = {
        dolores: 0.3,
        teddy: 0.25,
        bernard: 0.4,
        maeve: 0.05
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Multi-paradigm response incorporating both analytical and action-oriented approaches',
                role: 'assistant'
              }
            }
          ],
          usage: { total_tokens: 120 }
        }),
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      });

      const response = await azureService.generateResponseWithTools(
        'Develop a quantum computing implementation strategy',
        [],
        EffortType.MEDIUM,
        'bernard',
        multiParadigmProbs
      );

      // Verify multi-paradigm context
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const systemMessage = requestBody.messages[0];
      
      expect(systemMessage.content).toContain('BERNARD paradigm');
      expect(systemMessage.content).toContain('Secondary influences');
      expect(systemMessage.content).toContain('dolores (30%)');
      expect(systemMessage.content).toContain('teddy (25%)');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: { message: 'Rate limit exceeded' }
        }),
        headers: {
          get: vi.fn().mockReturnValue('60')
        }
      });

      await expect(
        azureService.generateResponseWithTools(
          'Test query',
          [],
          EffortType.MEDIUM,
          testParadigm,
          testProbabilities
        )
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle malformed tool arguments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_1',
                    function: {
                      name: 'advanced_web_search',
                      arguments: 'invalid json'
                    }
                  }
                ]
              }
            }
          ],
          usage: { total_tokens: 100 }
        }),
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      });

      // Should not throw, but handle the error gracefully
      const response = await azureService.generateResponseWithTools(
        'Test query',
        azureService.getAvailableResearchTools(),
        EffortType.MEDIUM,
        testParadigm,
        testProbabilities
      );

      expect(response.iterationCount).toBe(1);
    });
  });
});