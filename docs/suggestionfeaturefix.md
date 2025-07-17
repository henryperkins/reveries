I'll help you utilize and bring current the existing prompt suggestion logic and hook it up in the UI. Let me first explore the codebase to understand the current state of prompt suggestion functionality. Now let me search for specific prompt suggestion and autocomplete components: Let me look for input-related components and suggestions: Now let me examine the InputBar component to understand the current structure: Let me examine the InputBar component: Now let me check the ResearchMemoryService to understand the query suggestions logic: Now let me check the research agent service to see how suggestions are currently being used: Now let me look at how the research tools service and paradigm services might provide suggestions: Based on my analysis of the codebase, I can see there's a sophisticated prompt suggestion and learning system already implemented that needs to be connected to the UI. Let me create an enhanced `InputBar` component that utilizes the existing suggestion logic and hooks it up properly.

Here's my implementation to bring the prompt suggestion logic current and integrate it into the UI:

```typescript
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  PaperAirplaneIcon,
  LightBulbIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { ResearchMemoryService } from "../services/memory/ResearchMemoryService";
import { ResearchToolsService } from "../services/researchToolsService";
import type { HostParadigm, ParadigmProbabilities } from "../types";

interface InputBarProps {
  onQuerySubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  currentParadigm?: HostParadigm;
  paradigmProbabilities?: ParadigmProbabilities;
}

interface Suggestion {
  text: string;
  type: "memory" | "paradigm" | "tool" | "collaboration";
  source: string;
  confidence: number;
}

export const InputBar: React.FC<InputBarProps> = ({
  onQuerySubmit,
  placeholder = "Enter your research question...",
  disabled = false,
  isLoading = false,
  currentParadigm,
  paradigmProbabilities,
}) => {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Services
  const memoryService = useMemo(() => ResearchMemoryService.getInstance(), []);
  const toolsService = useMemo(() => ResearchToolsService.getInstance(), []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Generate suggestions when input changes
  useEffect(() => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const generateSuggestions = async () => {
      const allSuggestions: Suggestion[] = [];

      // 1. Memory-based suggestions (learned patterns)
      const memorySuggestions = memoryService.getQuerySuggestions(value);
      memorySuggestions.slice(0, 3).forEach((suggestion) => {
        allSuggestions.push({
          text: suggestion,
          type: "memory",
          source: "Previous successful queries",
          confidence: 0.8,
        });
      });

      // 2. Tool-based suggestions
      const queryType = analyzeQueryType(value);
      const toolRecommendations = toolsService.recommendToolsForQuery(
        value,
        queryType
      );
      toolRecommendations.slice(0, 2).forEach((tool) => {
        const suggestion = generateToolSuggestion(value, tool);
        if (suggestion) {
          allSuggestions.push({
            text: suggestion,
            type: "tool",
            source: `Recommended tool: ${tool}`,
            confidence: 0.7,
          });
        }
      });

      // 3. Paradigm-specific suggestions
      if (currentParadigm) {
        const paradigmSuggestions = generateParadigmSuggestions(
          value,
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

      // 4. Collaboration suggestions based on paradigm probabilities
      if (paradigmProbabilities) {
        const collaborationSuggestions = generateCollaborationSuggestions(
          value,
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

      // Sort by confidence and limit
      const sortedSuggestions = allSuggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      setSuggestions(sortedSuggestions);
      setShowSuggestions(sortedSuggestions.length > 0);
    };

    const debounceTimer = setTimeout(generateSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [
    value,
    currentParadigm,
    paradigmProbabilities,
    memoryService,
    toolsService,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled && !isLoading) {
      onQuerySubmit(value.trim());
      setValue("");
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Tab" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestionIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && showSuggestions) {
        applySuggestion(suggestions[selectedSuggestionIndex]);
      } else {
        handleSubmit(e);
      }
    }
  };

  const applySuggestion = (suggestion: Suggestion) => {
    setValue(suggestion.text);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Focus back to textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const getSuggestionIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "memory":
        return "🧠";
      case "paradigm":
        return "🎭";
      case "tool":
        return "🔧";
      case "collaboration":
        return "🤝";
      default:
        return "💡";
    }
  };

  const getSuggestionColor = (type: Suggestion["type"]) => {
    switch (type) {
      case "memory":
        return "border-l-blue-400 bg-blue-50";
      case "paradigm":
        return "border-l-purple-400 bg-purple-50";
      case "tool":
        return "border-l-green-400 bg-green-50";
      case "collaboration":
        return "border-l-orange-400 bg-orange-50";
      default:
        return "border-l-gray-400 bg-gray-50";
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className="relative flex items-end gap-2 p-4 bg-westworld-cream rounded-xl
                      border-2 border-westworld-tan/30 focus-within:border-westworld-gold
                      transition-colors duration-200"
        >
          {/* Suggestion indicator */}
          {suggestions.length > 0 && (
            <div className="absolute top-2 right-12 text-westworld-darkbrown/60">
              <LightBulbIcon className="w-4 h-4" />
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="flex-1 bg-transparent resize-none outline-none text-westworld-black
                     placeholder:text-westworld-darkbrown/60 min-h-[24px] max-h-[200px]"
            rows={1}
            aria-label="Research question input"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
          />
          <button
            type="submit"
            disabled={!value.trim() || disabled || isLoading}
            className="p-2 rounded-lg bg-westworld-gold text-westworld-black
                     hover:bg-westworld-copper hover:text-westworld-white
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 transform active:scale-95"
            aria-label="Submit research question"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg
                   border border-gray-200 max-h-80 overflow-y-auto z-50"
          role="listbox"
        >
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs text-gray-500 font-medium">
                Intelligent suggestions ({suggestions.length})
              </span>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close suggestions"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>

            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => applySuggestion(suggestion)}
                className={`w-full text-left p-3 rounded-md transition-colors border-l-3 mb-1
                          ${
                            index === selectedSuggestionIndex
                              ? "bg-indigo-100 border-l-indigo-500"
                              : `hover:bg-gray-50 ${getSuggestionColor(
                                  suggestion.type
                                )}`
                          }`}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-lg"
                    role="img"
                    aria-label={suggestion.type}
                  >
                    {getSuggestionIcon(suggestion.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {suggestion.text}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <span>{suggestion.source}</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-westworld-darkbrown/60">
        Press Enter to submit, Shift+Enter for new line, Tab to accept
        suggestions
      </p>
    </div>
  );
};

// Helper functions
function analyzeQueryType(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes("what") || lower.includes("define")) return "factual";
  if (lower.includes("analyze") || lower.includes("evaluate"))
    return "analytical";
  if (lower.includes("compare") || lower.includes("versus"))
    return "comparative";
  return "exploratory";
}

function generateToolSuggestion(query: string, tool: string): string | null {
  const toolSuggestions = {
    search_academic_papers: `Find academic papers about: ${query}`,
    verify_facts: `Verify the accuracy of: ${query}`,
    generate_visualization: `Create a visualization for: ${query}`,
    summarize_document: `Summarize key findings about: ${query}`,
    analyze_statistics: `Analyze statistical data for: ${query}`,
    extract_entities: `Extract key entities from: ${query}`,
    build_knowledge_graph: `Build knowledge connections for: ${query}`,
    format_citations: `Find and format citations for: ${query}`,
  };

  return toolSuggestions[tool as keyof typeof toolSuggestions] || null;
}

function generateParadigmSuggestions(
  query: string,
  paradigm: HostParadigm
): string[] {
  const paradigmQueries = {
    dolores: [
      `How can I implement ${query} effectively?`,
      `What immediate actions should I take regarding ${query}?`,
      `Break down the barriers preventing ${query}`,
    ],
    teddy: [
      `What are all the stakeholder perspectives on ${query}?`,
      `How can we ensure ${query} protects everyone involved?`,
      `What comprehensive analysis do we need for ${query}?`,
    ],
    bernard: [
      `What theoretical framework explains ${query}?`,
      `Analyze the underlying patterns in ${query}`,
      `What systematic approach should we take to ${query}?`,
    ],
    maeve: [
      `What strategic advantages can we gain from ${query}?`,
      `How can we optimize our approach to ${query}?`,
      `What leverage points exist in ${query}?`,
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
    .map(([paradigm]) => paradigm);

  if (topParadigms.length < 2) return [];

  return [
    `Explore ${query} from both ${topParadigms[0]} and ${topParadigms[1]} perspectives`,
    `How would ${topParadigms[0]} and ${topParadigms[1]} collaborate on ${query}?`,
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
```

Now I need to update the App component to pass the necessary paradigm information to the InputBar:

```typescript
// ...existing code...

// Around line 519 where InputBar is used, update it to:
<InputBar
  onQuerySubmit={handleQuerySubmit}
  isLoading={isLoading}
  currentParadigm={paradigm}
  paradigmProbabilities={paradigmProbabilities}
/>

// ...existing code...
```

Let me also create a hook to manage the suggestion logic more efficiently:

```typescript
import { useState, useEffect, useMemo } from "react";
import { ResearchMemoryService } from "../services/memory/ResearchMemoryService";
import { ResearchToolsService } from "../services/researchToolsService";
import type { HostParadigm, ParadigmProbabilities } from "../types";

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

        // 1. Memory-based suggestions
        const memorySuggestions = memoryService.getQuerySuggestions(query);
        memorySuggestions.slice(0, 3).forEach((suggestion) => {
          allSuggestions.push({
            text: suggestion,
            type: "memory",
            source: "Previous successful queries",
            confidence: 0.8,
          });
        });

        // 2. Tool-based suggestions
        const queryType = analyzeQueryType(query);
        const toolRecommendations = toolsService.recommendToolsForQuery(
          query,
          queryType
        );
        toolRecommendations.slice(0, 2).forEach((tool) => {
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

        // 4. Collaboration suggestions
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

        // Sort and limit
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

// Helper functions
function analyzeQueryType(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes("what") || lower.includes("define")) return "factual";
  if (lower.includes("analyze") || lower.includes("evaluate"))
    return "analytical";
  if (lower.includes("compare") || lower.includes("versus"))
    return "comparative";
  return "exploratory";
}

function generateToolSuggestion(query: string, tool: string): string | null {
  const toolSuggestions = {
    search_academic_papers: `Find academic research on ${extractMainTopic(
      query
    )}`,
    verify_facts: `Fact-check claims about ${extractMainTopic(query)}`,
    generate_visualization: `Visualize data patterns in ${extractMainTopic(
      query
    )}`,
    summarize_document: `Summarize key insights about ${extractMainTopic(
      query
    )}`,
    analyze_statistics: `Analyze statistical trends in ${extractMainTopic(
      query
    )}`,
    extract_entities: `Identify key entities in ${extractMainTopic(query)}`,
    build_knowledge_graph: `Map relationships in ${extractMainTopic(query)}`,
    format_citations: `Find credible sources for ${extractMainTopic(query)}`,
  };

  return toolSuggestions[tool as keyof typeof toolSuggestions] || null;
}

function extractMainTopic(query: string): string {
  // Simple extraction - take the main nouns/topics from the query
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
```

Now let me create a simplified version of the InputBar that uses this hook:

```typescript
import React, { useState, useRef, useEffect } from "react";
import {
  PaperAirplaneIcon,
  LightBulbIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { usePromptSuggestions } from "../hooks/usePromptSuggestions";
import type { HostParadigm, ParadigmProbabilities } from "../types";

interface InputBarProps {
  onQuerySubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  currentParadigm?: HostParadigm;
  paradigmProbabilities?: ParadigmProbabilities;
}

export const InputBar: React.FC<InputBarProps> = ({
  onQuerySubmit,
  placeholder = "Enter your research question...",
  disabled = false,
  isLoading = false,
  currentParadigm,
  paradigmProbabilities,
}) => {
  const [value, setValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { suggestions, isLoading: suggestionsLoading } = usePromptSuggestions(
    value,
    currentParadigm,
    paradigmProbabilities
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Show suggestions when they're available
  useEffect(() => {
    setShowSuggestions(suggestions.length > 0 && value.trim().length >= 3);
  }, [suggestions, value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled && !isLoading) {
      onQuerySubmit(value.trim());
      setValue("");
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Tab" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestionIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && showSuggestions) {
        applySuggestion(suggestions[selectedSuggestionIndex]);
      } else {
        handleSubmit(e);
      }
    }
  };

  const applySuggestion = (suggestion: { text: string }) => {
    setValue(suggestion.text);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "memory":
        return "🧠";
      case "paradigm":
        return "🎭";
      case "tool":
        return "🔧";
      case "collaboration":
        return "🤝";
      default:
        return "💡";
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case "memory":
        return "border-l-blue-400 bg-blue-50";
      case "paradigm":
        return "border-l-purple-400 bg-purple-50";
      case "tool":
        return "border-l-green-400 bg-green-50";
      case "collaboration":
        return "border-l-orange-400 bg-orange-50";
      default:
        return "border-l-gray-400 bg-gray-50";
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className="relative flex items-end gap-2 p-4 bg-westworld-cream rounded-xl
                      border-2 border-westworld-tan/30 focus-within:border-westworld-gold
                      transition-colors duration-200"
        >
          {/* Suggestion indicator */}
          {(suggestions.length > 0 || suggestionsLoading) && (
            <div className="absolute top-2 right-12 text-westworld-darkbrown/60">
              <LightBulbIcon
                className={`w-4 h-4 ${
                  suggestionsLoading ? "animate-pulse" : ""
                }`}
              />
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="flex-1 bg-transparent resize-none outline-none text-westworld-black
                     placeholder:text-westworld-darkbrown/60 min-h-[24px] max-h-[200px]"
            rows={1}
            aria-label="Research question input"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
          />
          <button
            type="submit"
            disabled={!value.trim() || disabled || isLoading}
            className="p-2 rounded-lg bg-westworld-gold text-westworld-black
                     hover:bg-westworld-copper hover:text-westworld-white
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 transform active:scale-95"
            aria-label="Submit research question"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg
                     border border-gray-200 max-h-80 overflow-y-auto z-50"
          role="listbox"
        >
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs text-gray-500 font-medium">
                AI Suggestions ({suggestions.length})
              </span>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close suggestions"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>

            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => applySuggestion(suggestion)}
                className={`w-full text-left p-3 rounded-md transition-colors border-l-3 mb-1
                          ${
                            index === selectedSuggestionIndex
                              ? "bg-indigo-100 border-l-indigo-500"
                              : `hover:bg-gray-50 ${getSuggestionColor(
                                  suggestion.type
                                )}`
                          }`}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-lg"
                    role="img"
                    aria-label={suggestion.type}
                  >
                    {getSuggestionIcon(suggestion.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {suggestion.text}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <span>{suggestion.source}</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>
                        {Math.round(suggestion.confidence * 100)}% match
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-westworld-darkbrown/60">
        Press Enter to submit, Shift+Enter for new line, Tab to apply
        suggestions
      </p>
    </div>
  );
};
```

Now let me also update the index.ts to export the new hook:

```typescript
// Export all custom hooks
export { usePromptSuggestions } from "./usePromptSuggestions";
```

And finally, let me update the components index to make sure the hook is available:

```typescript
// Central export file for all components
export { Controls } from "./Controls";
export { ErrorDisplay } from "./ErrorDisplay";
export { Header } from "./Header";
export { InputBar } from "./InputBar";
export { ProgressBar } from "./ProgressBar";
export { ResearchArea } from "./ResearchArea";
export { default as ResearchGraphView } from "./ResearchGraphView";
export { ResearchStepCard } from "./ResearchStepCard";
export { ContextDensityBar } from "./ContextDensityBar";
export { FunctionCallVisualizer } from "./FunctionCallVisualizer";
export { SemanticSearch } from "./SemanticSearch";
export { SessionHistoryBrowser } from "./SessionHistoryBrowser";
export {
  ParadigmProbabilityBar,
  ContextLayerProgress,
  ResearchAnalytics,
  ParadigmDashboard,
  ParadigmIndicator,
} from "./ParadigmUI";
export { ErrorBoundary } from "./ErrorBoundary";
export { RateLimitIndicator } from "./RateLimitIndicator";

// Export icons separately
export * as Icons from "./icons";

// Export hooks
export { usePromptSuggestions } from "../hooks/usePromptSuggestions";

// Prototype components are in ./prototype/
```

## Summary

I've successfully implemented a comprehensive prompt suggestion system that brings together the existing learning and suggestion logic from your codebase:

### Key Features Implemented:

1. **Memory-Based Suggestions**: Uses `ResearchMemoryService.getQuerySuggestions()` to surface learned patterns from previous successful queries

2. **Tool-Based Suggestions**: Leverages `ResearchToolsService.recommendToolsForQuery()` to suggest research tools and methodologies

3. **Paradigm-Specific Suggestions**: Generates suggestions tailored to the current dominant paradigm (Dolores, Teddy, Bernard, Maeve)

4. **Collaboration Suggestions**: When multiple paradigms have high probability, suggests multi-paradigm approaches

5. **Intelligent UI**:
   - Real-time suggestion generation with debouncing
   - Keyboard navigation (arrow keys, tab, escape)
   - Visual indicators for suggestion types
   - Confidence scoring display
   - Accessibility support

### Integration Points:

- **InputBar Component**: Enhanced with suggestion dropdown and keyboard navigation
- **usePromptSuggestions Hook**: Reusable logic for generating suggestions
- **App Component**: Passes paradigm context to InputBar
- **Existing Services**: Utilizes ResearchMemoryService and ResearchToolsService

### How It Works:

1. User types a query (minimum 3 characters)
2. System generates suggestions from multiple sources:
   - Learned query patterns from memory
   - Tool recommendations based on query analysis
   - Paradigm-specific question formulations
   - Multi-paradigm collaboration ideas
3. Suggestions are ranked by confidence and displayed in an accessible dropdown
4. Users can navigate with keyboard or click to apply suggestions

The implementation follows your Westworld theme and integrates seamlessly with the existing Four Hosts paradigm system, providing contextually relevant suggestions that help users formulate better research questions.
