import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface InputBarProps {
  onQuerySubmit: (query: string) => void;
  isLoading: boolean;
  initialQuery?: string;
}

const EXAMPLE_QUERIES = [
  {
    category: "Research & Analysis",
    icon: "🔬",
    queries: [
      {
        text: "What are the latest breakthroughs in quantum computing?",
        complexity: "medium",
        tags: ["technology", "science"]
      },
      {
        text: "Compare different approaches to sustainable energy storage",
        complexity: "high",
        tags: ["environment", "comparative"]
      },
      {
        text: "Analyze the impact of remote work on urban planning",
        complexity: "high",
        tags: ["society", "analysis"]
      }
    ]
  },
  {
    category: "Technology & Innovation",
    icon: "💡",
    queries: [
      {
        text: "Explain how large language models work with current examples",
        complexity: "medium",
        tags: ["AI", "explainer"]
      },
      {
        text: "What are the emerging trends in biotechnology for 2024?",
        complexity: "medium",
        tags: ["biotech", "trends"]
      },
      {
        text: "How is AI being used in climate change research?",
        complexity: "high",
        tags: ["AI", "climate"]
      }
    ]
  },
  {
    category: "Complex Topics",
    icon: "🧩",
    queries: [
      {
        text: "What are the philosophical implications of consciousness in AI?",
        complexity: "very-high",
        tags: ["philosophy", "AI"]
      },
      {
        text: "Trace the evolution of cryptocurrency regulation globally",
        complexity: "high",
        tags: ["crypto", "regulation"]
      },
      {
        text: "How do different cultures approach end-of-life care?",
        complexity: "high",
        tags: ["culture", "healthcare"]
      }
    ]
  }
];

export const InputBar: React.FC<InputBarProps> = ({ onQuerySubmit, isLoading, initialQuery = "" }) => {
  const [inputValue, setInputValue] = useState<string>(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [hoveredQuery, setHoveredQuery] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(true); // Add this missing state
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onQuerySubmit(inputValue);
      // Do not clear input after submission, let App control query state
      // setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
      handleSubmit(e);
    }
  };

  const handleExampleClick = (query: string) => {
    setInputValue(query);
    inputRef.current?.focus();
    setShowExamples(false);
  };

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'very-high': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleCategoryChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setActiveCategory(prev => prev === 0 ? EXAMPLE_QUERIES.length - 1 : prev - 1);
    } else {
      setActiveCategory(prev => prev === EXAMPLE_QUERIES.length - 1 ? 0 : prev + 1);
    }
  };

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="relative group">
        <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Initiate new narrative loop..."
            disabled={isLoading}
            className={`
              w-full px-12 py-4 pr-24
              bg-white/90 backdrop-blur-sm
              border-2 rounded-xl
              text-westworld-rust placeholder-westworld-rust/50
              transition-all duration-300
              ${isFocused ? 'border-westworld-gold shadow-lg' : 'border-westworld-tan/30 hover:border-westworld-tan/50'}
              ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
              focus:outline-none focus:bg-white
            `}
          />

          <MagnifyingGlassIcon className={`
            absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5
            transition-colors duration-300
            ${isFocused ? 'text-westworld-gold' : 'text-westworld-rust/50'}
          `} />

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2
              px-4 py-2 rounded-lg
              flex items-center gap-2
              font-medium text-sm
              transition-all duration-300
              ${inputValue.trim() && !isLoading
                ? 'bg-westworld-gold text-black hover:bg-westworld-copper hover:text-white shadow-sm hover:shadow-md active:scale-95'
                : 'bg-westworld-tan/20 text-westworld-rust/30 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⟳</span>
                <span>Processing...</span>
              </>
            ) : (
              <span>Submit</span>
            )}
          </button>
        </div>

        {/* Character count */}
        {inputValue.length > 0 && (
          <div className="absolute -bottom-6 right-0 text-xs text-westworld-rust/60">
            {inputValue.length} characters
          </div>
        )}
      </form>

      {/* Elegant example queries section - conditionally rendered */}
      {showExamples && (
        <div className="mt-12 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-5 h-5 text-westworld-gold" />
              <h3 className="text-lg font-semibold text-westworld-rust">
                Explore Research Narratives
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCategoryChange('prev')}
                className="p-2 rounded-full hover:bg-westworld-tan/20 transition-colors"
                aria-label="Previous category"
              >
                <ChevronLeftIcon className="w-5 h-5 text-westworld-rust" />
              </button>
              <div className="flex gap-1">
                {EXAMPLE_QUERIES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCategory(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx === activeCategory
                        ? 'bg-westworld-gold w-8'
                        : 'bg-westworld-tan/50 hover:bg-westworld-tan'
                    }`}
                    aria-label={`Go to category ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() => handleCategoryChange('next')}
                className="p-2 rounded-full hover:bg-westworld-tan/20 transition-colors"
                aria-label="Next category"
              >
                <ChevronRightIcon className="w-5 h-5 text-westworld-rust" />
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeCategory * 100}%)` }}
            >
              {EXAMPLE_QUERIES.map((category, categoryIdx) => (
                <div key={categoryIdx} className="w-full flex-shrink-0 px-2">
                  <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-westworld-tan/20 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{category.icon}</span>
                      <h4 className="text-xl font-semibold text-westworld-rust">
                        {category.category}
                      </h4>
                    </div>
                    <div className="grid gap-3">
                      {category.queries.map((query, queryIdx) => (
                        <button
                          key={queryIdx}
                          onClick={() => handleExampleClick(query.text)}
                          onMouseEnter={() => setHoveredQuery(query.text)}
                          onMouseLeave={() => setHoveredQuery(null)}
                          className={`
                            group relative w-full text-left p-4 rounded-lg
                            bg-white/70 border border-westworld-tan/30
                            hover:bg-white hover:border-westworld-gold/50
                            transition-all duration-300 transform
                            ${hoveredQuery === query.text ? 'scale-[1.02] shadow-lg' : ''}
                          `}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm text-westworld-rust/90 group-hover:text-westworld-rust flex-1">
                              {query.text}
                            </p>
                            <span className={`
                              text-xs px-2 py-1 rounded-full border whitespace-nowrap
                              ${getComplexityColor(query.complexity)}
                            `}>
                              {query.complexity.replace('-', ' ')}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {query.tags.map((tag, tagIdx) => (
                              <span
                                key={tagIdx}
                                className="text-xs px-2 py-0.5 bg-westworld-tan/20 text-westworld-rust/70 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className={`
                            absolute bottom-0 left-0 h-0.5 bg-westworld-gold
                            transition-all duration-300 ease-out
                            ${hoveredQuery === query.text ? 'w-full' : 'w-0'}
                          `} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-westworld-rust/50 mt-4">
            Click any narrative to begin • Press <kbd className="px-1.5 py-0.5 text-xs bg-westworld-tan/20 rounded">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 text-xs bg-westworld-tan/20 rounded">Enter</kbd> to submit
          </p>
        </div>
      )}
    </div>
  );
};
