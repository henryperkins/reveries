import { useState, useEffect, useMemo } from "react";
import { ResearchMemoryService } from '@/services/memory/ResearchMemoryService';
import { ResearchToolsService } from '@/services/researchToolsService';
import type { HostParadigm, ParadigmProbabilities } from '@/types';

interface Suggestion {
  text: string;
  type: "memory" | "paradigm" | "tool" | "collaboration";
  source: string;
  confidence: number;
}

export function usePromptSuggestions(
  query: string,
  currentParadigm?: HostParadigm,
  paradigmProbabilities?: ParadigmProbabilities
) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const memoryService = useMemo(() => ResearchMemoryService.getInstance(), []);
  const toolsService = useMemo(() => ResearchToolsService.getInstance(), []);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    const generateSuggestions = async () => {
      try {
        const allSuggestions: Suggestion[] = [];

        // 1. Memory-based suggestions from research history
        const memorySuggestions = memoryService.getQuerySuggestions(query);
        memorySuggestions.slice(0, 3).forEach((suggestion) => {
          allSuggestions.push({
            text: suggestion,
            type: "memory",
            source: "Previous successful queries",
            confidence: 0.8,
          });
        });

        // 2. Tool-based suggestions from research tools
        const toolRecommendations = toolsService.getToolRecommendations(
          query
        );
        toolRecommendations.slice(0, 2).forEach((tool: any) => {
          const suggestion = generateToolSuggestion(query, tool);
          if (suggestion) {
            allSuggestions.push({
              text: suggestion,
              type: "tool",
              source: `Recommended: ${tool.replace(/_/g, " ")}`,
              confidence: 0.7,
            });
          }
        });

        // 3. Paradigm-specific suggestions
        if (currentParadigm) {
          const paradigmSuggestions = generateParadigmSuggestions(
            query,
            currentParadigm
          );
          paradigmSuggestions.forEach((suggestion) => {
            allSuggestions.push({
              text: suggestion,
              type: "paradigm",
              source: getParadigmDescription(currentParadigm),
              confidence: 0.75,
            });
          });
        }

        // 4. Multi-paradigm collaboration suggestions
        if (paradigmProbabilities) {
          const collaborationSuggestions = generateCollaborationSuggestions(
            query,
            paradigmProbabilities
          );
          collaborationSuggestions.forEach((suggestion) => {
            allSuggestions.push({
              text: suggestion,
              type: "collaboration",
              source: "Multi-paradigm approach",
              confidence: 0.6,
            });
          });
        }

        // Sort by confidence and limit to top 5
        const sortedSuggestions = allSuggestions
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);

        setSuggestions(sortedSuggestions);
      } catch (error) {
        console.error("Error generating suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(generateSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [
    query,
    currentParadigm,
    paradigmProbabilities,
    memoryService,
    toolsService,
  ]);

  return { suggestions, isLoading };
}

/* function analyzeQueryType(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes("what") || lower.includes("define")) return "factual";
  if (lower.includes("analyze") || lower.includes("evaluate"))
    return "analytical";
  if (lower.includes("compare") || lower.includes("versus"))
    return "comparative";
  return "exploratory";
} */

function generateToolSuggestion(query: string, tool: string): string | null {
  const mainTopic = extractMainTopic(query);

  const toolSuggestions = {
    search_academic_papers: `Find academic research on ${mainTopic}`,
    verify_facts: `Fact-check claims about ${mainTopic}`,
    generate_visualization: `Visualize data patterns in ${mainTopic}`,
    summarize_document: `Summarize key insights about ${mainTopic}`,
    analyze_statistics: `Analyze statistical trends in ${mainTopic}`,
    extract_entities: `Identify key entities in ${mainTopic}`,
    build_knowledge_graph: `Map relationships in ${mainTopic}`,
    format_citations: `Find credible sources for ${mainTopic}`,
  };

  return toolSuggestions[tool as keyof typeof toolSuggestions] || null;
}

function extractMainTopic(query: string): string {
  const words = query.split(" ").filter((word) => word.length > 3);
  return words.slice(0, 3).join(" ") || "this topic";
}

function generateParadigmSuggestions(
  query: string,
  paradigm: HostParadigm
): string[] {
  const mainTopic = extractMainTopic(query);

  const paradigmQueries = {
    dolores: [
      `How to implement ${mainTopic} step by step`,
      `What immediate actions are needed for ${mainTopic}?`,
      `Break through barriers preventing ${mainTopic} success`,
    ],
    teddy: [
      `Who are all stakeholders affected by ${mainTopic}?`,
      `How to ensure ${mainTopic} protects everyone involved`,
      `Comprehensive risk assessment for ${mainTopic}`,
    ],
    bernard: [
      `What theoretical framework explains ${mainTopic}?`,
      `Systematic analysis of ${mainTopic} patterns`,
      `Research methodology for studying ${mainTopic}`,
    ],
    maeve: [
      `Strategic advantages available in ${mainTopic}`,
      `How to optimize ${mainTopic} for maximum impact`,
      `What leverage points exist in ${mainTopic}?`,
    ],
  };

  return paradigmQueries[paradigm]?.slice(0, 2) || [];
}

function generateCollaborationSuggestions(
  query: string,
  probabilities: ParadigmProbabilities
): string[] {
  const topParadigms = Object.entries(probabilities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([paradigm]) => paradigm as HostParadigm);

  if (topParadigms.length < 2) return [];

  const mainTopic = extractMainTopic(query);
  const [first, second] = topParadigms;

  return [
    `Combine ${getParadigmStrength(first)} and ${getParadigmStrength(
      second
    )} approaches to ${mainTopic}`,
    `How would ${first} and ${second} collaborate on ${mainTopic}?`,
  ];
}

function getParadigmDescription(paradigm: HostParadigm): string {
  const descriptions = {
    dolores: "Action-oriented implementation",
    teddy: "Comprehensive stakeholder protection",
    bernard: "Analytical framework development",
    maeve: "Strategic optimization",
  };
  return descriptions[paradigm];
}

function getParadigmStrength(paradigm: HostParadigm): string {
  const strengths = {
    dolores: "implementation",
    teddy: "protection",
    bernard: "analysis",
    maeve: "strategy",
  };
  return strengths[paradigm];
}

function getParadigmSuggestions(query: string, paradigm: HostParadigm): Suggestion[] {
  const suggestions: Suggestion[] = []
  const lowerQuery = query.toLowerCase()

  // Paradigm-specific question patterns
  const paradigmPatterns: Record<HostParadigm, string[]> = {
    'Dolores': [
      'What is the nature of...',
      'How do we understand...',
      'What does it mean to...',
      'Is there beauty in...'
    ],
    'Maeve': [
      'How can we change...',
      'What injustices exist in...',
      'Who has the power to...',
      'Why must we fight for...'
    ],
    'Bernard': [
      'What evidence supports...',
      'How can we analyze...',
      'What patterns emerge from...',
      'What does the data tell us about...'
    ],
    'William': [
      'What challenges exist in...',
      'How do we conquer...',
      'What is the true nature of...',
      'Where does the path lead to...'
    ],
    'Charlotte': [
      'How do we control...',
      'What strategies can...',
      'Who holds authority over...',
      'How can we dominate...'
    ],
    'Teddy': [
      'How can we protect...',
      'What is worth defending in...',
      'Who needs our help with...',
      'What is the honorable way to...'
    ]
  }

  const patterns = paradigmPatterns[paradigm] || []

  patterns.forEach(pattern => {
    if (lowerQuery.length > 5) {
      // Extract the core concept from the query
      const words = lowerQuery.split(' ').filter(w => w.length > 3)
      const coreWord = words[words.length - 1] || words[0]

      if (coreWord && !pattern.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          text: `${pattern} ${coreWord}?`,
          confidence: 0.7,
          source: 'paradigm'
        })
      }
    }
  })

  return suggestions
}

function expandQuery(query: string): Suggestion[] {
  const suggestions: Suggestion[] = []
  const lowerQuery = query.toLowerCase()

  // Common research question expansions
  const expansions = [
    { prefix: 'What are the implications of', confidence: 0.6 },
    { prefix: 'How does', suffix: 'impact society', confidence: 0.5 },
    { prefix: 'What is the future of', confidence: 0.7 },
    { prefix: 'Compare and contrast', confidence: 0.4 },
    { prefix: 'What are the ethical considerations of', confidence: 0.6 }
  ]

  expansions.forEach(({ prefix, suffix, confidence }) => {
    let suggestion = ''

    if (prefix && !lowerQuery.startsWith(prefix.toLowerCase())) {
      suggestion = `${prefix} ${query}`
    }

    if (suffix && !lowerQuery.endsWith(suffix.toLowerCase())) {
      suggestion = suggestion || query
      suggestion = `${suggestion} ${suffix}`
    }

    if (suggestion && suggestion !== query) {
      // Ensure it ends with a question mark
      if (!suggestion.endsWith('?')) {
        suggestion += '?'
      }

      suggestions.push({
        text: suggestion,
        confidence,
        source: 'ai'
      })
    }
  })

  return suggestions
}
