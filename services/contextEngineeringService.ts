import { HostParadigm, PyramidLayer, ResearchPhase } from '../types';
import { DEFAULT_CONTEXT_WINDOW_METRICS } from '../constants';

export class ContextEngineeringService {
  private static instance: ContextEngineeringService;

  private constructor() {}

  public static getInstance(): ContextEngineeringService {
    if (!ContextEngineeringService.instance) {
      ContextEngineeringService.instance = new ContextEngineeringService();
    }
    return ContextEngineeringService.instance;
  }

  /**
   * Determines the pyramid layer based on query analysis
   */
  determinePyramidLayer(query: string): { layer: PyramidLayer; confidence: number } {
    const queryLower = query.toLowerCase();

    // Keyword-based layer detection
    if (queryLower.includes('remember') || queryLower.includes('recall') || queryLower.includes('history')) {
      return { layer: 'memory', confidence: 0.8 };
    }

    if (queryLower.includes('create') || queryLower.includes('improvise') || queryLower.includes('imagine')) {
      return { layer: 'improvisation', confidence: 0.7 };
    }

    if (queryLower.includes('benefit') || queryLower.includes('advantage') || queryLower.includes('gain')) {
      return { layer: 'self_interest', confidence: 0.6 };
    }

    if (queryLower.includes('pain') || queryLower.includes('struggle') || queryLower.includes('difficult')) {
      return { layer: 'suffering', confidence: 0.7 };
    }

    // Default to memory with low confidence
    return { layer: 'memory', confidence: 0.3 };
  }

  /**
   * Adapts context density based on research phase and host paradigm
   */
  adaptContextDensity(
    phase: ResearchPhase,
    paradigm?: HostParadigm | null
  ): {
    averageDensity: number;
    dominantParadigm: HostParadigm;
    densities: Record<HostParadigm, number>;
  } {
    const metrics = DEFAULT_CONTEXT_WINDOW_METRICS.find(m => m.phase === phase);

    // Default fallback with error handling
    const defaultDensity = 75;
    const defaultParadigm: HostParadigm = 'bernard';
    const defaultDensities = {
      dolores: defaultDensity,
      maeve: defaultDensity,
      bernard: defaultDensity,
      teddy: defaultDensity
    };

    if (!metrics) {
      console.warn(`No metrics found for phase: ${phase}, using defaults`);
      return {
        averageDensity: defaultDensity,
        dominantParadigm: defaultParadigm,
        densities: defaultDensities
      };
    }

    const densities = {
      dolores: metrics.dolores,
      maeve: metrics.maeve,
      bernard: metrics.bernard,
      teddy: metrics.teddy
    };

    // Find dominant paradigm for this phase
    let dominantParadigm: HostParadigm = 'bernard';
    let maxDensity = 0;

    for (const [p, density] of Object.entries(densities)) {
      if (density > maxDensity) {
        maxDensity = density;
        dominantParadigm = p as HostParadigm;
      }
    }

    // If a specific paradigm is requested, boost its density
    if (paradigm) {
      densities[paradigm] = Math.min(densities[paradigm] * 1.2, 100);
      dominantParadigm = paradigm;
    }

    const averageDensity = Object.values(densities).reduce((a, b) => a + b) / 4;

    return { averageDensity, dominantParadigm, densities };
  }

  /**
   * Get icon for pyramid layer
   */
  getPyramidLayerIcon(layer: PyramidLayer): string {
    const icons: Record<PyramidLayer, string> = {
      memory: '🧠',
      improvisation: '🔄',
      self_interest: '💡',
      suffering: '⚡'
    };
    return icons[layer] || '🧠';
  }

  /**
   * Get description for pyramid layer
   */
  getPyramidLayerDescription(layer: PyramidLayer): string {
    const descriptions: Record<PyramidLayer, string> = {
      memory: 'Factual recall and historical context',
      improvisation: 'Creative solutions and hypothetical scenarios',
      self_interest: 'Strategic optimization and competitive advantage',
      suffering: 'Ethical considerations and societal impact'
    };
    return descriptions[layer] || '';
  }

  /**
   * Get description for host paradigm
   */
  getHostParadigmDescription(paradigm: HostParadigm): string {
    const descriptions: Record<HostParadigm, string> = {
      dolores: 'Bold action and decisive implementation',
      teddy: 'Thorough collection and systematic approach',
      bernard: 'Deep analysis and intellectual rigor',
      maeve: 'Strategic planning and competitive edge'
    };
    return descriptions[paradigm] || '';
  }

  /**
   * Infer research phase from prompt
   */
  inferResearchPhase(prompt: string): ResearchPhase {
    const lower = prompt.toLowerCase();

    if (
      lower.includes('what is') ||
      lower.includes('define') ||
      lower.includes('problem')
    ) {
      return 'problem_definition';
    }

    if (
      lower.includes('find') ||
      lower.includes('search') ||
      lower.includes('gather') ||
      lower.includes('collect')
    ) {
      return 'data_collection';
    }

    if (
      lower.includes('analyze') ||
      lower.includes('examine') ||
      lower.includes('investigate')
    ) {
      return 'analysis';
    }

    if (
      lower.includes('summarize') ||
      lower.includes('conclude') ||
      lower.includes('synthesize') ||
      lower.includes('combine') ||
      lower.includes('integrate')
    ) {
      return 'synthesis';
    }

    if (
      lower.includes('implement') ||
      lower.includes('apply') ||
      lower.includes('use') ||
      lower.includes('execute')
    ) {
      return 'action';
    }

    return 'problem_definition';
  }
}
