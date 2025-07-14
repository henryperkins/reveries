import { GoogleGenerativeAI } from "@google/generative-ai";
import { GENAI_MODEL_FLASH } from "../types";

export interface GeminiFunctionCall {
  name: string;
  parameters: Record<string, any>;
}

export interface GeminiFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
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
  // Try Vite environment variables first (client-side)
  const viteApiKey = typeof import !== 'undefined' && import.meta?.env?.VITE_GEMINI_API_KEY;

  // Try Node.js environment variables (server-side)
  const nodeApiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);

  const apiKey = viteApiKey || nodeApiKey;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please configure it in .env.local file."
    );
  }
  return apiKey;
};

export class GeminiService {
  private geminiAI: GoogleGenerativeAI;

  constructor() {
    this.geminiAI = new GoogleGenerativeAI(getGeminiApiKey());
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
      model = GENAI_MODEL_FLASH,
      thinkingBudget,
      temperature,
      maxOutputTokens,
      functions,
      useSearch = false
    } = options;

    // Generation config only contains generation parameters
    const generationConfig: any = {};

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
    const tools: any[] = [];

    if (useSearch) {
      tools.push({ googleSearch: {} });
    }

    if (functions && functions.length > 0) {
      tools.push({
        functionDeclarations: functions.map(fn => ({
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        }))
      });
    }

    try {
      // Create the request body with proper structure
      const requestBody: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      };

      // Add tools at the top level if any exist
      if (tools.length > 0) {
        requestBody.tools = tools;
      }

      const model = this.geminiAI.getGenerativeModel({ model: options.model || GENAI_MODEL_FLASH });
      const response = await model.generateContent(requestBody);

      const text = (response as any).text ?? '';
      const functionCalls: GeminiFunctionCall[] = [];
      const sources: { name: string; url?: string }[] = [];

      // Extract function calls if present
      if ((response as any).candidates?.[0]?.content?.parts) {
        const parts = (response as any).candidates[0].content.parts;

        for (const part of parts) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              parameters: part.functionCall.args || {}
            });
          }
        }
      }

      // Extract sources from grounding metadata
      if (useSearch && (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = (response as any).candidates[0].groundingMetadata.groundingChunks;
        sources.push(
          ...chunks
            .filter((chunk: any) => chunk.web && chunk.web.uri)
            .map((chunk: any) => ({
              name: chunk.web.title || 'Web Source',
              url: chunk.web.uri
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
}

export const geminiService = new GeminiService();
