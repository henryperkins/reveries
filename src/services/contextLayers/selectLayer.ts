import { HostParadigm, Citation } from '../../types';

interface SelectionStrategy {
  paradigm: HostParadigm;
  toolPriorities: string[];
  sourcePriorities: string[];
  selectionCriteria: (source: Citation) => number;
}

export class SelectLayerService {
  private static instance: SelectLayerService;

  private strategies: Record<HostParadigm, SelectionStrategy> = {
    dolores: {
      paradigm: 'dolores',
      toolPriorities: ['action_planner', 'implementation_guide', 'change_tracker'],
      sourcePriorities: ['case studies', 'success stories', 'implementation'],
      selectionCriteria: (source) => {
        const actionWords = ['implement', 'action', 'change', 'transform', 'achieve'];
        const score = actionWords.reduce((acc, word) =>
          acc + (source.title?.toLowerCase().includes(word) ? 1 : 0), 0
        );
        return score;
      }
    },
    teddy: {
      paradigm: 'teddy',
      toolPriorities: ['stakeholder_mapper', 'risk_assessor', 'consensus_builder'],
      sourcePriorities: ['comprehensive', 'balanced', 'stakeholder', 'safety'],
      selectionCriteria: (source) => {
        const protectiveWords = ['comprehensive', 'thorough', 'safety', 'all', 'complete'];
        const score = protectiveWords.reduce((acc, word) =>
          acc + (source.title?.toLowerCase().includes(word) ? 1 : 0), 0
        );
        return score;
      }
    },
    bernard: {
      paradigm: 'bernard',
      toolPriorities: ['academic_search', 'pattern_analyzer', 'framework_builder'],
      sourcePriorities: ['peer-reviewed', 'academic', 'theoretical', 'framework'],
      selectionCriteria: (source) => {
        const analyticalWords = ['analysis', 'framework', 'theory', 'model', 'pattern'];
        const score = analyticalWords.reduce((acc, word) =>
          acc + (source.title?.toLowerCase().includes(word) ? 1 : 0), 0
        );
        // Boost for academic sources
        if (source.url?.includes('.edu') || source.url?.includes('scholar')) {
          return score + 2;
        }
        return score;
      }
    },
    maeve: {
      paradigm: 'maeve',
      toolPriorities: ['competitor_analyzer', 'influence_mapper', 'optimization_engine'],
      sourcePriorities: ['strategic', 'competitive', 'leverage', 'control'],
      selectionCriteria: (source) => {
        const strategicWords = ['strategy', 'competitive', 'leverage', 'control', 'optimize'];
        const score = strategicWords.reduce((acc, word) =>
          acc + (source.title?.toLowerCase().includes(word) ? 1 : 0), 0
        );
        return score;
      }
    }
  };

  private constructor() {}

  public static getInstance(): SelectLayerService {
    if (!SelectLayerService.instance) {
      SelectLayerService.instance = new SelectLayerService();
    }
    return SelectLayerService.instance;
  }

  async select(
    paradigm: HostParadigm,
    k: number = 5
  ): Promise<{
    recommendedTools: string[];
    selectedSources: unknown[];
  }> {
    return {
      recommendedTools: this.recommendTools(paradigm),
      selectedSources: []
    };
  }

  async selectSources(
    query: string,
    sources: Citation[],
    paradigm: HostParadigm,
    k: number
  ): Promise<Citation[]> {
    const strategy = this.strategies[paradigm];

    // Score and rank sources based on paradigm strategy
    const scoredSources = sources.map(source => ({
      source,
      score: strategy.selectionCriteria(source)
    }));

    // Sort by score descending
    scoredSources.sort((a, b) => b.score - a.score);

    // Return top k sources
    return scoredSources.slice(0, k).map(s => s.source);
  }

  recommendTools(paradigm: HostParadigm): string[] {
    return this.strategies[paradigm].toolPriorities;
  }

  getSourcePriorities(paradigm: HostParadigm): string[] {
    return this.strategies[paradigm].sourcePriorities;
  }
}
