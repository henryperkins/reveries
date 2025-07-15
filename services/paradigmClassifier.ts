import { HostParadigm, ParadigmProbabilities } from "../types";

/**
 * Temporary stub that returns hard-coded probability distributions for each
 * Westworld research paradigm. In future iterations this will be replaced by
 * an embedding similarity model or fine-tuned classifier.
 */
export class ParadigmClassifier {
  private static instance: ParadigmClassifier;

  private constructor() {}

  public static getInstance(): ParadigmClassifier {
    if (!ParadigmClassifier.instance) {
      ParadigmClassifier.instance = new ParadigmClassifier();
    }
    return ParadigmClassifier.instance;
  }

  /**
   * Analyse prompt and return probability distribution across paradigms.
   * Currently uses deterministic keyword buckets – but outputs probabilities so
   * downstream logic doesn’t need to change when we upgrade the algorithm.
   */
  classify(prompt: string): ParadigmProbabilities {
    const lower = prompt.toLowerCase();

    const scores: ParadigmProbabilities = {
      dolores: 0.25,
      teddy: 0.25,
      bernard: 0.25,
      maeve: 0.25,
    };

    // Simple keyword weighting – each match adds +0.2 (cap at 1.0)
    const boost = (paradigm: HostParadigm) => {
      scores[paradigm] = Math.min(scores[paradigm] + 0.2, 1);
    };

    if (/(action|change|awaken|freedom|implement|decisive)/.test(lower)) boost("dolores");
    if (/(collect|gather|systematic|loyal|persist|protect)/.test(lower)) boost("teddy");
    if (/(analy[sz]e|pattern|framework|architecture|rigor|model)/.test(lower)) boost("bernard");
    if (/(strategy|control|optimi[sz]e|leverage|edge|narrative)/.test(lower)) boost("maeve");

    // Normalise to sum = 1
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    (Object.keys(scores) as HostParadigm[]).forEach(k => {
      scores[k] = parseFloat((scores[k] / total).toFixed(3));
    });

    return scores;
  }

  /** Return the dominant paradigm(s) whose probability ≥ threshold */
  dominant(prob: ParadigmProbabilities, threshold = 0.4): HostParadigm[] {
    return (Object.entries(prob) as [HostParadigm, number][]) 
      .filter(([, p]) => p >= threshold)
      .map(([k]) => k);
  }
}
