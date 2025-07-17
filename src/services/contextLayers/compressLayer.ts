import { HostParadigm, ModelType, EffortType } from '../../types';
import { ModelProviderService } from '../providers/ModelProviderService';
import crypto from 'crypto';

interface CompressionStrategy {
  paradigm: HostParadigm;
  preserveKeywords: string[];
  summaryStyle: 'action' | 'comprehensive' | 'analytical' | 'strategic';
  maxSentenceLength: number;
}

interface CompressionBlock {
  content: string;
  tokens: number;
  hash: string;
  depth: number;
}

export class CompressLayerService {
  private static instance: CompressLayerService;
  private modelProvider: ModelProviderService;
  
  // ACE-Graph parameters from documentation
  private readonly WINDOW_SIZE = 2048; // W = 2,048 tokens
  private readonly MAX_DEPTH = 3; // d = 3
  private readonly COMPRESSION_THRESHOLD = 0.4; // 0.4W threshold
  
  private strategies: Record<HostParadigm, CompressionStrategy> = {
    dolores: {
      paradigm: 'dolores',
      preserveKeywords: ['action', 'implement', 'change', 'step', 'now'],
      summaryStyle: 'action',
      maxSentenceLength: 20
    },
    teddy: {
      paradigm: 'teddy',
      preserveKeywords: ['all', 'stakeholder', 'comprehensive', 'consider', 'protect'],
      summaryStyle: 'comprehensive',
      maxSentenceLength: 30
    },
    bernard: {
      paradigm: 'bernard',
      preserveKeywords: ['framework', 'pattern', 'analysis', 'theory', 'model'],
      summaryStyle: 'analytical',
      maxSentenceLength: 35
    },
    maeve: {
      paradigm: 'maeve',
      preserveKeywords: ['strategy', 'leverage', 'control', 'optimize', 'advantage'],
      summaryStyle: 'strategic',
      maxSentenceLength: 25
    }
  };

  private constructor() {
    this.modelProvider = ModelProviderService.getInstance();
  }

  public static getInstance(): CompressLayerService {
    if (!CompressLayerService.instance) {
      CompressLayerService.instance = new CompressLayerService();
    }
    return CompressLayerService.instance;
  }

  compress(
    content: string,
    targetTokens: number,
    paradigm: HostParadigm
  ): string {
    const strategy = this.strategies[paradigm];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    
    // Score sentences based on keyword presence
    const scoredSentences = sentences.map(sentence => {
      const score = strategy.preserveKeywords.reduce((acc, keyword) => 
        acc + (sentence.toLowerCase().includes(keyword) ? 1 : 0), 0
      );
      return { sentence: sentence.trim(), score };
    });

    // Sort by score descending
    scoredSentences.sort((a, b) => b.score - a.score);

    // Build compressed content up to target token limit
    const compressed: string[] = [];
    let currentTokens = 0;
    const avgTokensPerWord = 1.3; // Rough estimate

    for (const { sentence } of scoredSentences) {
      const sentenceTokens = sentence.split(' ').length * avgTokensPerWord;
      if (currentTokens + sentenceTokens <= targetTokens) {
        compressed.push(sentence);
        currentTokens += sentenceTokens;
      }
    }

    // Apply paradigm-specific formatting
    return this.formatByParadigm(compressed, strategy.summaryStyle);
  }

  private formatByParadigm(sentences: string[], style: CompressionStrategy['summaryStyle']): string {
    switch (style) {
      case 'action':
        // Dolores: Bullet points for action items
        return sentences.map(s => `• ${s}`).join('\n');
      
      case 'comprehensive':
        // Teddy: Narrative flow preserving all perspectives
        return sentences.join('. ') + '.';
      
      case 'analytical':
        // Bernard: Structured with clear sections
        return sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
      
      case 'strategic':
        // Maeve: Key points with emphasis
        return sentences.map(s => `**${s}**`).join('\n\n');
    }
  }

  estimateTokens(content: string): number {
    return Math.ceil(content.split(' ').length * 1.3);
  }

  /**
   * ACE-Graph Recursive Delta Summarization (R-Sum)
   * Algorithm from docs: window size W, depth d
   * 94% compression with <5% factual loss
   */
  async recursiveCompress(
    content: string,
    paradigm: HostParadigm,
    model: ModelType = 'o3'
  ): Promise<{ compressed: string; traceHashes: string[] }> {
    const traceHashes: string[] = [];
    const blocks = this.chunkContent(content, this.WINDOW_SIZE);
    
    return this.recursiveSummarize(blocks, paradigm, model, 0, traceHashes);
  }

  private async recursiveSummarize(
    blocks: CompressionBlock[],
    paradigm: HostParadigm,
    model: ModelType,
    depth: number,
    traceHashes: string[]
  ): Promise<{ compressed: string; traceHashes: string[] }> {
    // Base case: if small enough or max depth reached
    const totalTokens = blocks.reduce((sum, block) => sum + block.tokens, 0);
    if (totalTokens <= this.COMPRESSION_THRESHOLD * this.WINDOW_SIZE || depth >= this.MAX_DEPTH) {
      const combined = blocks.map(b => b.content).join('\n\n');
      traceHashes.push(...blocks.map(b => b.hash));
      return { compressed: combined, traceHashes };
    }

    // Summarize each block
    const summaries: CompressionBlock[] = [];
    for (const block of blocks) {
      const summary = await this.summarizeBlock(block.content, paradigm, model);
      const summaryTokens = this.estimateTokens(summary);
      const summaryHash = this.generateHash(summary);
      
      summaries.push({
        content: summary,
        tokens: summaryTokens,
        hash: summaryHash,
        depth: depth + 1
      });

      // Store hash of omitted content for audit trail
      traceHashes.push(block.hash);
    }

    // Re-chunk summaries and recurse
    const rechunkedSummaries = this.rechunkSummaries(summaries);
    return this.recursiveSummarize(rechunkedSummaries, paradigm, model, depth + 1, traceHashes);
  }

  private chunkContent(content: string, windowSize: number): CompressionBlock[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const blocks: CompressionBlock[] = [];
    let currentBlock = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > windowSize && currentBlock) {
        blocks.push({
          content: currentBlock.trim(),
          tokens: currentTokens,
          hash: this.generateHash(currentBlock),
          depth: 0
        });
        currentBlock = sentence;
        currentTokens = sentenceTokens;
      } else {
        currentBlock += (currentBlock ? '. ' : '') + sentence.trim();
        currentTokens += sentenceTokens;
      }
    }

    if (currentBlock) {
      blocks.push({
        content: currentBlock.trim(),
        tokens: currentTokens,
        hash: this.generateHash(currentBlock),
        depth: 0
      });
    }

    return blocks;
  }

  private async summarizeBlock(content: string, paradigm: HostParadigm, model: ModelType): Promise<string> {
    const strategy = this.strategies[paradigm];
    const prompt = `Summarize **facts & citations only** from this content. 
    
Style: ${strategy.summaryStyle}
Preserve keywords: ${strategy.preserveKeywords.join(', ')}
Max sentence length: ${strategy.maxSentenceLength} words

Content:
${content}

Summary:`;

    try {
      const result = await this.modelProvider.generateText(prompt, model, EffortType.LOW);
      return result.text.trim();
    } catch (error) {
      console.warn('Summarization failed, using original content:', error);
      return content;
    }
  }

  private rechunkSummaries(summaries: CompressionBlock[]): CompressionBlock[] {
    // Simple rechunking - combine small summaries
    const rechunked: CompressionBlock[] = [];
    let currentChunk = '';
    let currentTokens = 0;
    const hashes: string[] = [];

    for (const summary of summaries) {
      if (currentTokens + summary.tokens > this.WINDOW_SIZE && currentChunk) {
        rechunked.push({
          content: currentChunk.trim(),
          tokens: currentTokens,
          hash: this.generateHash(hashes.join('|')),
          depth: summary.depth
        });
        currentChunk = summary.content;
        currentTokens = summary.tokens;
        hashes.length = 0;
        hashes.push(summary.hash);
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + summary.content;
        currentTokens += summary.tokens;
        hashes.push(summary.hash);
      }
    }

    if (currentChunk) {
      rechunked.push({
        content: currentChunk.trim(),
        tokens: currentTokens,
        hash: this.generateHash(hashes.join('|')),
        depth: summaries[0]?.depth || 0
      });
    }

    return rechunked;
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}