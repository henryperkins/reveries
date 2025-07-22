import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AzureOpenAIService, ParadigmAwareToolContext, ToolExecutionResult } from '../services/azureOpenAIService';
import { HostParadigm, EffortType, ParadigmProbabilities } from '../types';

// Mock the fetch API
global.fetch = vi.fn();

// Mock ResearchToolsService
vi.mock('../services/researchToolsService', () => ({
  ResearchToolsService: {
    getInstance: () => ({
      getTool: vi.fn((name) => {
        if (name === 'advanced_web_search') {
          return {
            execute: vi.fn(async (args) => ({
              results: [
                { title: 'Test Result', url: 'https://example.com', snippet: 'Test snippet' }
              ],
              totalFound: 1
            }))
          };
        }
        return null;
      }),
      getAzureOpenAIToolDefinitions: () => [
        {
          type: "function",
          function: {
            name: "advanced_web_search",
            description: "Perform advanced web search",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" }
              },
              required: ["query"]
            }
          }
        }
      ]
    })
  }
}));

// Mock WriteLayerService
vi.mock('../services/contextLayers/writeLayer', () => ({
  WriteLayerService: {
    getInstance: () => ({
      writeMemory: vi.fn()
    })
  }
}));

describe('Azure OpenAI Streaming with Tools', () => {
  let azureService: AzureOpenAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    azureService = AzureOpenAIService.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('streamResponseWithTools', () => {
    it('should handle streaming response with tool calls', async () => {
      const mockChunks = [
        'data: {"type":"response.output_text.delta","delta":"Let me search for that information."}',
        'data: {"type":"response.function_call.delta","call_id":"call_123","name":"advanced_web_search","delta":"{\\"query\\":\\"quantum computing\\"}"}',
        'data: {"type":"response.done"}'
      ];

      const mockToolResponse = {
        choices: [{
          message: {
            content: "Based on my search, quantum computing is..."
          }
        }]
      };

      let callCount = 0;
      (global.fetch as vi.MockedFunction<typeof global.fetch>).mockImplementation(async () => {
        if (callCount === 0) {
          callCount++;
          // First call - streaming with tool
          return {
            ok: true,
            headers: new Headers(),
            body: {
              getReader: () => ({
                read: vi.fn()
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode(mockChunks[0] + '\n') 
                  })
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode(mockChunks[1] + '\n') 
                  })
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode(mockChunks[2] + '\n') 
                  })
                  .mockResolvedValueOnce({ done: true }),
                releaseLock: vi.fn()
              })
            }
          };
        } else {
          // Second call - after tool execution
          return {
            ok: true,
            headers: new Headers(),
            body: {
              getReader: () => ({
                read: vi.fn()
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"Based on the search results, "}\n') 
                  })
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode('data: {"type":"response.done"}\n') 
                  })
                  .mockResolvedValueOnce({ done: true }),
                releaseLock: vi.fn()
              })
            }
          };
        }
      });

      const chunks: string[] = [];
      const toolCalls: Array<{ name: string; args: unknown; result: unknown }> = [];
      const metadata: Array<{ type: string; timestamp: number }> = [];

      await azureService.streamResponseWithTools(
        "Tell me about quantum computing",
        azureService.getAvailableResearchTools(),
        EffortType.MEDIUM,
        'bernard',
        { dolores: 0.1, teddy: 0.2, bernard: 0.6, maeve: 0.1 },
        {
          onChunk: (chunk, meta) => {
            chunks.push(chunk);
            if (meta) metadata.push(meta);
          },
          onToolCall: (toolCall, result) => {
            toolCalls.push({ toolCall, result });
          },
          onComplete: () => {},
          maxIterations: 2
        }
      );

      expect(chunks).toContain("Let me search for that information.");
      expect(chunks).toContain("Based on the search results, ");
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0].toolCall.function.name).toBe('advanced_web_search');
      expect(metadata.some(m => m.paradigm === 'bernard')).toBe(true);
    });

    it('should handle tool execution errors gracefully', async () => {
      // Mock a failing tool
      const { ResearchToolsService } = await import('../services/researchToolsService');
      const mockGetTool = ResearchToolsService.getInstance().getTool as vi.MockedFunction<
        typeof ResearchToolsService.getInstance().getTool
      >;
      mockGetTool.mockImplementation((name: string) => {
        if (name === 'failing_tool') {
          return {
            execute: vi.fn().mockRejectedValue(new Error('Network timeout'))
          };
        }
        return null;
      });

      const mockChunks = [
        'data: {"type":"response.function_call.delta","call_id":"call_456","name":"failing_tool","delta":"{}"}',
        'data: {"type":"response.done"}'
      ];

      let callCount = 0;
      (global.fetch as vi.MockedFunction<typeof global.fetch>).mockImplementation(async () => {
        if (callCount === 0) {
          callCount++;
          return {
            ok: true,
            headers: new Headers(),
            body: {
              getReader: () => ({
                read: vi.fn()
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode(mockChunks[0] + '\n') 
                  })
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode(mockChunks[1] + '\n') 
                  })
                  .mockResolvedValueOnce({ done: true }),
                releaseLock: vi.fn()
              })
            }
          };
        } else {
          // After error handling
          return {
            ok: true,
            headers: new Headers(),
            body: {
              getReader: () => ({
                read: vi.fn()
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"I encountered an error with the tool."}\n') 
                  })
                  .mockResolvedValueOnce({ 
                    done: false, 
                    value: new TextEncoder().encode('data: {"type":"response.done"}\n') 
                  })
                  .mockResolvedValueOnce({ done: true }),
                releaseLock: vi.fn()
              })
            }
          };
        }
      });

      const toolCalls: Array<{ name: string; args: unknown; result: unknown }> = [];
      const errors: string[] = [];

      await azureService.streamResponseWithTools(
        "Test query",
        [{ type: "function", function: { name: "failing_tool", description: "Test", parameters: {} }}],
        EffortType.LOW,
        'dolores',
        undefined,
        {
          onChunk: () => {},
          onToolCall: (toolCall, result) => {
            toolCalls.push({ toolCall, result });
            if (result?.error) errors.push(result.error);
          },
          onComplete: () => {},
          onError: (error) => errors.push(error.message)
        }
      );

      expect(toolCalls.length).toBeGreaterThan(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should respect paradigm-specific tool filtering', async () => {
      const allTools = azureService.getAvailableResearchTools();
      const bernardTools = azureService.getParadigmResearchTools('bernard');
      
      // Bernard should prioritize academic and analytical tools
      const bernardToolNames = bernardTools.map(t => t.function.name);
      expect(bernardToolNames).toContain('search_academic_papers');
      expect(bernardToolNames).toContain('analyze_statistics');
      
      // The paradigm-specific list might be reordered
      expect(bernardTools.length).toBe(allTools.length);
    });

    it('should enforce tool timeouts based on paradigm', async () => {
      const slowTool = {
        type: "function",
        function: {
          name: "slow_tool",
          description: "A slow tool",
          parameters: {}
        }
      };

      // Mock a slow tool that times out
      const { ResearchToolsService } = await import('../services/researchToolsService');
      const mockGetTool = ResearchToolsService.getInstance().getTool as vi.MockedFunction<typeof ResearchToolsService.getInstance().getTool>;
      mockGetTool.mockImplementation((name: string) => {
        if (name === 'slow_tool') {
          return {
            execute: vi.fn(async () => {
              await new Promise(resolve => setTimeout(resolve, 60000)); // 60 second delay
              return { result: 'Should timeout' };
            })
          };
        }
        return null;
      });

      const mockChunks = [
        'data: {"type":"response.function_call.delta","call_id":"call_789","name":"slow_tool","delta":"{}"}',
        'data: {"type":"response.done"}'
      ];

      (global.fetch as vi.MockedFunction<typeof global.fetch>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode(mockChunks[0] + '\n') 
              })
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode(mockChunks[1] + '\n') 
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      }).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"Tool timed out"}\n') 
              })
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode('data: {"type":"response.done"}\n') 
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      });

      const toolResults: Array<{ error?: string; result?: unknown }> = [];
      const startTime = Date.now();

      await azureService.streamResponseWithTools(
        "Test timeout",
        [slowTool],
        EffortType.LOW,
        'dolores', // Dolores has 0.8x timeout multiplier
        undefined,
        {
          onChunk: () => {},
          onToolCall: (_, result) => {
            toolResults.push(result);
          },
          onComplete: () => {},
        }
      );

      const executionTime = Date.now() - startTime;
      
      // Should timeout before 60 seconds
      expect(executionTime).toBeLessThan(35000); // Base 30s * 0.8 = 24s + some buffer
      expect(toolResults.some(r => r?.error?.includes('timeout'))).toBe(true);
    });

    it('should implement circuit breaker for repeatedly failing tools', async () => {
      // Create a new instance to ensure clean state
      const service = AzureOpenAIService.getInstance();
      
      // Mock a consistently failing tool
      const { ResearchToolsService } = await import('../services/researchToolsService');
      const mockGetTool = ResearchToolsService.getInstance().getTool as vi.MockedFunction<typeof ResearchToolsService.getInstance().getTool>;
      mockGetTool.mockImplementation((name: string) => {
        if (name === 'broken_tool') {
          return {
            execute: vi.fn().mockRejectedValue(new Error('Service unavailable'))
          };
        }
        return null;
      });

      // Simulate multiple failures
      for (let i = 0; i < 4; i++) {
        const context: ParadigmAwareToolContext = {
          phase: 'execution',
          paradigm: 'teddy'
        };

        const result = await (service as unknown as { executeToolWithContext: (toolCall: unknown, context: unknown) => Promise<unknown> }).executeToolWithContext(
          'broken_tool',
          {},
          context
        );

        if (i < 3) {
          expect(result.success).toBe(false);
          expect(result.error).toContain('Service unavailable');
        } else {
          // After 3 failures, circuit breaker should activate
          expect(result.success).toBe(false);
          expect(result.error).toContain('temporarily disabled');
          expect(result.retryable).toBe(false);
        }
      }
    });

    it('should propagate paradigm context through tool execution', async () => {
      const { WriteLayerService } = await import('../services/contextLayers/writeLayer');
      const mockWriteMemory = WriteLayerService.getInstance().writeMemory as vi.MockedFunction<typeof WriteLayerService.getInstance().writeMemory>;

      const paradigm: HostParadigm = 'maeve';
      const probabilities: ParadigmProbabilities = {
        dolores: 0.1,
        teddy: 0.1,
        bernard: 0.2,
        maeve: 0.6
      };

      const mockChunks = [
        'data: {"type":"response.function_call.delta","call_id":"call_ctx","name":"advanced_web_search","delta":"{\\"query\\":\\"strategic planning\\"}"}',
        'data: {"type":"response.done"}'
      ];

      (global.fetch as vi.MockedFunction<typeof global.fetch>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode(mockChunks[0] + '\n') 
              })
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode(mockChunks[1] + '\n') 
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      }).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode('data: {"type":"response.done"}\n') 
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      });

      await azureService.streamResponseWithTools(
        "Strategic planning query",
        azureService.getAvailableResearchTools(),
        EffortType.HIGH,
        paradigm,
        probabilities,
        {
          onChunk: () => {},
          onComplete: () => {}
        }
      );

      // Verify paradigm context was written to memory
      expect(mockWriteMemory).toHaveBeenCalled();
      const writeCall = mockWriteMemory.mock.calls[0];
      expect(writeCall[3]).toBe(paradigm); // paradigm parameter
      expect(writeCall[2]).toBe('episodic'); // memory type
    });
  });

  describe('Streaming phase metadata', () => {
    it('should include phase information in chunk metadata', async () => {
      const mockChunks = [
        'data: {"type":"response.output_text.delta","delta":"Analyzing your request..."}',
        'data: {"type":"response.function_call.delta","call_id":"call_phase","name":"advanced_web_search","delta":"{\\"query\\":\\"test\\"}"}',
        'data: {"type":"response.output_text.delta","delta":" Let me search for that."}',
        'data: {"type":"response.done"}'
      ];

      (global.fetch as vi.MockedFunction<typeof global.fetch>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode(mockChunks[0] + '\n') 
              })
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode(mockChunks[1] + '\n') 
              })
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode(mockChunks[2] + '\n') 
              })
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode(mockChunks[3] + '\n') 
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      }).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode('data: {"type":"response.done"}\n') 
              })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn()
          })
        }
      });

      const phases: string[] = [];

      await azureService.streamResponseWithTools(
        "Test query",
        azureService.getAvailableResearchTools(),
        EffortType.MEDIUM,
        'bernard',
        undefined,
        {
          onChunk: (_, metadata) => {
            if (metadata?.phase) {
              phases.push(metadata.phase);
            }
          },
          onComplete: () => {}
        }
      );

      expect(phases).toContain('response');
      expect(phases).toContain('tool_preparation');
    });
  });
});