import { HostParadigm, PyramidLayer, ResearchPhase, ContextDensity } from '@/types';
import type { ContextLayer } from '@/types';
import { DEFAULT_CONTEXT_WINDOW_METRICS } from '@/constants';

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
  ): ContextDensity {
    // Normalize phase names to match DEFAULT_CONTEXT_WINDOW_METRICS
    const phaseMap: Record<string, string> = {
      'analyzing': 'synthesis',
      'discovery': 'problem_definition',
      'exploration': 'data_collection',
      'synthesis': 'synthesis',
      'validation': 'action'
    };
    
    const normalizedPhase = phaseMap[phase] || phase;
    const metrics = DEFAULT_CONTEXT_WINDOW_METRICS.find(m => m.phase === normalizedPhase);

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
      console.warn(`No metrics found for phase: ${phase} (normalized: ${normalizedPhase}), using defaults`);
      const averageDensity = Object.values(defaultDensities).reduce((a, b) => a + b) / Object.values(defaultDensities).length;
      return {
        phase,
        averageDensity,
        dominantParadigm: defaultParadigm,
        densities: defaultDensities,
        density: averageDensity
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

    return { phase, averageDensity, dominantParadigm, densities, density: averageDensity };
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
   * Quick helper to check if a given layer is first for a paradigm
   */
  isFirstLayer(paradigm: HostParadigm, layer: ContextLayer): boolean {
    const sequence = this.getLayerSequence(paradigm);
    return sequence && sequence.length > 0 && sequence[0] === layer;
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
   * Return preferred ordering of context-manipulation layers for a paradigm.
   * This allows callers to pipeline Write / Select / Compress / Isolate steps
   * in a host-specific way that matches the design in the Four Hosts
   * infographics.
   */
  getLayerSequence(paradigm: HostParadigm): ContextLayer[] {
    const sequences: Record<HostParadigm, ContextLayer[]> = {
      // Dolores focuses on decisive action – write initial reveries, then
      // select supporting context, compress feedback loops, finally isolate
      // urgent interventions.
      dolores: ['write', 'select', 'compress', 'isolate'],

      // Teddy values protection & collaboration – write perspectives, select
      // tools, run tasks in isolation early, compress last.
      teddy: ['write', 'select', 'isolate', 'compress'],

      // Bernard is analytical – first gather (select) rigorous sources, write
      // structured notes, compress summaries, optionally isolate heavy
      // analysis.
      bernard: ['select', 'write', 'compress', 'isolate'],

      // Maeve seeks leverage – start by isolating high-impact sub-agents,
      // then select leverage points, compress narratives, and write closing
      // updates.
      maeve: ['isolate', 'select', 'compress', 'write']
    };

    return sequences[paradigm];
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
      return 'discovery';
    }

    if (
      lower.includes('find') ||
      lower.includes('search') ||
      lower.includes('gather') ||
      lower.includes('collect')
    ) {
      return 'exploration';
    }

    if (
      lower.includes('analyze') ||
      lower.includes('examine') ||
      lower.includes('investigate')
    ) {
      return 'synthesis';
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
      return 'validation';
    }

    return 'discovery';
  }
}
