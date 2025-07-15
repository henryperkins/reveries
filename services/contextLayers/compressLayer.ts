import { HostParadigm } from '../../types';

interface CompressionStrategy {
  paradigm: HostParadigm;
  preserveKeywords: string[];
  summaryStyle: 'action' | 'comprehensive' | 'analytical' | 'strategic';
  maxSentenceLength: number;
}

export class CompressLayerService {
  private static instance: CompressLayerService;
  
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

  private constructor() {}

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
}