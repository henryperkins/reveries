import { GoogleGenerativeAI, type Tool, type SchemaType, type Schema } from "@google/generative-ai";
import { GoogleGenAI, Type } from "@google/genai";
import { GENAI_MODEL_FLASH } from '@/types';

export interface GeminiFunctionCall {
  name: string;
  parameters: {
    type: SchemaType;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface GeminiFunction {
  name: string;
  description: string;
  parameters: {
    type: string; // Should match SchemaType from SDK
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface GeminiServiceOptions {
  model?: string;
  thinkingBudget?: number;
  temperature?: number;
  maxOutputTokens?: number;
  functions?: GeminiFunction[];
  useSearch?: boolean;
}

const getGeminiApiKey = (): string => {
  /**
   * We need to support three execution contexts:
   *
   * 1. Browser bundle built by Vite                    → `import.meta.env.VITE_GEMINI_API_KEY`
   * 2. Browser dev-server (unbundled)                  → `window.__VITE_IMPORT_META_ENV__.VITE_GEMINI_API_KEY`
   * 3. Node / SSR / tests                              → `process.env.GEMINI_API_KEY` **or** `process.env.VITE_GEMINI_API_KEY`
   *
   * We therefore probe all three locations in priority order.
   */
  const clientKey =
    // Bundled / production builds
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEMINI_API_KEY)) ||
    // Dev-server global shim
    (typeof window !== 'undefined' && ((window as { __VITE_IMPORT_META_ENV__?: { VITE_GEMINI_API_KEY?: string } }).__VITE_IMPORT_META_ENV__?.VITE_GEMINI_API_KEY));

  const serverKey =
    (typeof process !== 'undefined' &&
      (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY));

  const apiKey = clientKey || serverKey;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please configure it in .env.local file."
    );
  }
  return apiKey;
};

export class GeminiService {
  private geminiAI: GoogleGenerativeAI;
  private genAI: GoogleGenAI;

  constructor() {
    this.geminiAI = new GoogleGenerativeAI(getGeminiApiKey());
    this.genAI = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  }

  async generateContent(
    prompt: string,
    options: GeminiServiceOptions = {}
  ): Promise<{
    text: string;
    functionCalls?: GeminiFunctionCall[];
    sources?: { name: string; url?: string }[];
  }> {
    const {
      thinkingBudget,
      temperature,
      maxOutputTokens,
      functions,
      useSearch = false
    } = options;

    // Generation config only contains generation parameters
  const generationConfig: Record<string, unknown> = {};

    // Configure thinking
    if (typeof thinkingBudget === 'number') {
      generationConfig.thinkingConfig = { thinkingBudget };
    }

    // Configure generation parameters
    if (temperature !== undefined) {
      generationConfig.temperature = temperature;
    }
    if (maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = maxOutputTokens;
    }

    // Tools array - separate from generationConfig
  const tools: Tool[] = [];

    if (useSearch) {
      tools.push({ googleSearch: {} } as Tool);
    }

    if (functions && functions.length > 0) {
      tools.push({
        functionDeclarations: functions.map(fn => ({
          name: fn.name,
          description: fn.description,
          parameters: {
            type: fn.parameters.type as SchemaType,
            properties: Object.fromEntries(
              Object.entries(fn.parameters.properties).map(([key, value]) => {
                // Map string types to Type enum for better compatibility
                const typeMap: Record<string, string> = {
                  'string': 'STRING',
                  'number': 'NUMBER',
                  'boolean': 'BOOLEAN',
                  'object': 'OBJECT',
                  'array': 'ARRAY'
                };
                const mappedType = typeMap[value.type.toLowerCase()] || value.type;

                if (value.enum) {
                  return [key, {
                    type: mappedType,
                    description: value.description,
                    enum: value.enum,
                    format: "enum"
                  } as Schema];
                }
                return [key, {
                  type: mappedType,
                  description: value.description
                } as Schema];
              })
            ),
            required: fn.parameters.required
          }
        }))
      });
    }

    try {
      // Create the request body with proper structure
      const requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
        ...(tools.length > 0 ? { tools } : {})
      };

      const geminiModel = this.geminiAI.getGenerativeModel({ model: options.model || GENAI_MODEL_FLASH });
      const response = await geminiModel.generateContent(requestBody);

      console.log('Raw Gemini response:', response);

  let text = '';

      try {
        // Method 1: Try the standard text() method
        if (response.response && typeof response.response.text === 'function') {
          text = response.response.text();
        }
        // Method 2: Try extracting from candidates structure
        else if (response.response?.candidates?.[0]?.content?.parts) {
          const parts = response.response.candidates[0].content.parts as { text?: string }[];
          text = parts
            .filter((p) => p.text && typeof p.text === 'string')
            .map((p) => p.text!)
            .join('\n')
            .trim();
        }
        // Method 3: Check if text is directly accessible
        else if (response.response?.text && typeof response.response.text === 'string') {
          text = response.response.text;
        }
      } catch (textError) {
        console.error('Error extracting text from response:', textError);
        console.error('Response structure:', JSON.stringify(response, null, 2));
      }

      console.log('Extracted text:', text);

      if (!text || text.trim() === '') {
        console.error('No text found in response. Response structure:', JSON.stringify(response, null, 2));
        throw new Error('Empty response from Gemini API - no text content found');
      }
      const functionCalls: GeminiFunctionCall[] = [];
      const sources: { name: string; url?: string }[] = [];

      // Extract function calls if present
      if (response.response?.candidates?.[0]?.content?.parts) {
        const parts = response.response.candidates[0].content.parts as { functionCall?: { name: string; args?: Record<string, unknown> } }[];
        for (const part of parts) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              parameters: part.functionCall.args as GeminiFunctionCall['parameters'] || {}
            });
          }
        }
      }

      // Extract sources from grounding metadata
      if (useSearch && response.response?.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.response.candidates[0].groundingMetadata.groundingChunks as { web?: { uri?: string; title?: string } }[];
        sources.push(
          ...chunks
            .filter((chunk) => chunk.web && chunk.web.uri)
            .map((chunk) => ({
              name: chunk.web?.title || 'Web Source',
              url: chunk.web?.uri
            }))
        );
      }

      return {
        text,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        sources: sources.length > 0 ? sources : undefined
      };

    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateWithFunctions(
    prompt: string,
    functions: GeminiFunction[],
    options: Omit<GeminiServiceOptions, 'functions'> = {}
  ): Promise<{
    text: string;
    functionCalls: GeminiFunctionCall[];
    sources?: { name: string; url?: string }[];
  }> {
    const result = await this.generateContent(prompt, {
      ...options,
      functions
    });
    return {
      text: result.text,
      functionCalls: result.functionCalls || [],
      sources: result.sources
    };
  }

  async generateWithThinking(
    prompt: string,
    thinkingBudget: number,
    options: Omit<GeminiServiceOptions, 'thinkingBudget'> = {}
  ): Promise<{
    text: string;
    functionCalls?: GeminiFunctionCall[];
    sources?: { name: string; url?: string }[];
  }> {
    return this.generateContent(prompt, {
      ...options,
      thinkingBudget
    });
  }

  async generateWithSearch(
    prompt: string,
    options: Omit<GeminiServiceOptions, 'useSearch'> = {}
  ): Promise<{
    text: string;
    sources: { name: string; url?: string }[];
  }> {
    const result = await this.generateContent(prompt, {
      ...options,
      useSearch: true
    });
    return {
      text: result.text,
      sources: result.sources || []
    };
  }

  /**
   * Generate content with function calling using the new @google/genai pattern
   * This method demonstrates the official API pattern from the docs
   */
  async generateWithGenAI(
    prompt: string,
    functions: {
      name: string;
      description: string;
      parameters: {
        type: string;
        properties: Record<string, {
          type: string;
          description: string;
          enum?: string[];
        }>;
        required: string[];
      };
    }[],
    options: Omit<GeminiServiceOptions, 'functions'> = {}
  ): Promise<{
    text: string;
    functionCalls?: {
      name: string;
      args: Record<string, unknown>;
    }[];
    sources?: { name: string; url?: string }[];
  }> {
    try {
      // Convert function declarations to new format
      const functionDeclarations = functions.map(fn => ({
        name: fn.name,
        description: fn.description,
        parameters: {
          type: Type.OBJECT,
          properties: Object.fromEntries(
            Object.entries(fn.parameters.properties).map(([key, value]) => {
              let propType = Type.STRING;
              switch (value.type.toLowerCase()) {
                case 'number':
                  propType = Type.NUMBER;
                  break;
                case 'boolean':
                  propType = Type.BOOLEAN;
                  break;
                case 'object':
                  propType = Type.OBJECT;
                  break;
                case 'array':
                  propType = Type.ARRAY;
                  break;
              }

              const prop: Record<string, unknown> = {
                type: propType,
                description: value.description
              };

              if (value.enum) {
                prop.enum = value.enum;
              }

              return [key, prop];
            })
          ),
          required: fn.parameters.required
        }
      }));

      // Build tools array with function declarations and optionally Google Search
      const tools: { functionDeclarations?: typeof functionDeclarations; googleSearch?: Record<string, never> }[] = [];

      if (functionDeclarations.length > 0) {
        tools.push({
          functionDeclarations
        });
      }

      if (options.useSearch) {
        tools.push({
          googleSearch: {}
        });
      }

      const config = {
        tools
      };

      const contents = [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const response = await this.genAI.models.generateContent({
        model: options.model || GENAI_MODEL_FLASH,
        contents,
        config
      });

      const text = response.text || '';
      const functionCalls = response.functionCalls
        ?.filter(fc => fc.name) // Filter out calls without names
        .map(fc => ({
          name: fc.name!,
          args: fc.args || {}
        }));

      // Extract sources if Google Search was used
      const sources: { name: string; url?: string }[] = [];
      if (options.useSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        sources.push(
          ...chunks
            .filter((chunk: { web?: { uri?: string; title?: string } }) => chunk.web && chunk.web.uri)
            .map((chunk: { web?: { uri?: string; title?: string } }) => ({
              name: chunk.web?.title || 'Web Source',
              url: chunk.web?.uri
            }))
        );
      }

      return {
        text,
        functionCalls,
        ...(sources.length > 0 ? { sources } : {})
      };
    } catch (error) {
      console.error('GenAI API error:', error);
      throw new Error(`GenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const geminiService = new GeminiService();
