import { PyramidLayer, ContextWindowMetrics, ResearchPhase, HouseParadigm } from '../types';
import { DEFAULT_CONTEXT_WINDOW_METRICS } from '../constants';

interface PyramidClassification {
  layer: PyramidLayer;
  confidence: number;
  reasoning: string;
}

interface ContextDensityResult {
  phase: ResearchPhase;
  densities: Record<HouseParadigm, number>;
  dominantHouse: HouseParadigm;
  averageDensity: number;
}

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
  determinePyramidLayer(query: string): PyramidClassification {
    const lowerQuery = query.toLowerCase();

    // Memory layer - fact retrieval, historical data, definitions
    const memoryKeywords = ['what is', 'define', 'history of', 'when did', 'who was', 'list', 'recall', 'remember'];
    const memoryScore = memoryKeywords.filter(kw => lowerQuery.includes(kw)).length;

    // Improvisation layer - creative solutions, hypotheticals, brainstorming
    const improvisationKeywords = ['what if', 'imagine', 'create', 'design', 'innovate', 'brainstorm', 'alternative', 'could we'];
    const improvisationScore = improvisationKeywords.filter(kw => lowerQuery.includes(kw)).length;

    // Self-interest layer - optimization, personal benefit, strategic advantage
    const selfInterestKeywords = ['optimize', 'maximize', 'benefit', 'advantage', 'strategy', 'compete', 'win', 'profit'];
    const selfInterestScore = selfInterestKeywords.filter(kw => lowerQuery.includes(kw)).length;

    // Suffering layer - ethics, harm reduction, social impact, consequences
    const sufferingKeywords = ['impact', 'consequences', 'ethical', 'harm', 'affect', 'society', 'sustainable', 'responsible'];
    const sufferingScore = sufferingKeywords.filter(kw => lowerQuery.includes(kw)).length;

    // Determine dominant layer
    const scores = [
      { layer: 'memory' as PyramidLayer, score: memoryScore },
      { layer: 'improvisation' as PyramidLayer, score: improvisationScore },
      { layer: 'self_interest' as PyramidLayer, score: selfInterestScore },
      { layer: 'suffering' as PyramidLayer, score: sufferingScore }
    ];

    const maxScore = Math.max(...scores.map(s => s.score));
    const dominant = scores.find(s => s.score === maxScore) || scores[0];

    // Default to memory if no clear signals
    if (maxScore === 0) {
      return {
        layer: 'memory',
        confidence: 0.5,
        reasoning: 'No clear pyramid layer indicators found, defaulting to memory'
      };
    }

    const confidence = Math.min(0.95, 0.5 + (maxScore * 0.15));
    const reasoning = `Query contains ${maxScore} ${dominant.layer} indicator(s)`;

    return {
      layer: dominant.layer,
      confidence,
      reasoning
    };
  }

  /**
   * Adapts context density based on research phase and house paradigm
   */
  adaptContextDensity(
    phase: ResearchPhase,
    house?: HouseParadigm,
    customMetrics?: ContextWindowMetrics[]
  ): ContextDensityResult {
    const metrics = customMetrics || DEFAULT_CONTEXT_WINDOW_METRICS;
    const phaseMetrics = metrics.find(m => m.phase === phase);

    if (!phaseMetrics) {
      throw new Error(`No metrics found for phase: ${phase}`);
    }

    const densities: Record<HouseParadigm, number> = {
      gryffindor: phaseMetrics.gryffindor,
      hufflepuff: phaseMetrics.hufflepuff,
      ravenclaw: phaseMetrics.ravenclaw,
      slytherin: phaseMetrics.slytherin
    };

    // Find dominant house
    let dominantHouse: HouseParadigm = 'ravenclaw';
    let maxDensity = 0;

    for (const [h, density] of Object.entries(densities)) {
      if (density > maxDensity) {
        maxDensity = density;
        dominantHouse = h as HouseParadigm;
      }
    }

    // If house is specified, boost its density
    if (house && densities[house]) {
      densities[house] = Math.min(100, densities[house] * 1.2);
      dominantHouse = house;
    }

    const averageDensity = Object.values(densities).reduce((sum, d) => sum + d, 0) / 4;

    return {
      phase,
      densities,
      dominantHouse,
      averageDensity
    };
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
   * Get house paradigm description
   */
  getHouseParadigmDescription(house: HouseParadigm): string {
    const descriptions: Record<HouseParadigm, string> = {
      gryffindor: 'Bold action and decisive implementation',
      hufflepuff: 'Thorough collection and systematic approach',
      ravenclaw: 'Deep analysis and intellectual rigor',
      slytherin: 'Strategic planning and competitive edge'
    };
    return descriptions[house] || '';
  }

  /**
   * Infer research phase from query
   */
  inferResearchPhase(prompt: string): ResearchPhase {
    const lower = prompt.toLowerCase();

    if (lower.includes('define') || lower.includes('what is') || lower.includes('problem')) {
      return 'problem_definition';
    } else if (lower.includes('collect') || lower.includes('gather') || lower.includes('find')) {
      return 'data_collection';
    } else if (lower.includes('analyze') || lower.includes('examine') || lower.includes('investigate')) {
      return 'analysis';
    } else if (lower.includes('combine') || lower.includes('integrate') || lower.includes('synthesize')) {
      return 'synthesis';
    } else if (lower.includes('implement') || lower.includes('execute') || lower.includes('apply')) {
      return 'action';
    }

    return 'problem_definition';
  }
}
