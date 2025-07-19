import React, { useState, useCallback } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ResearchStep } from '@/types';

interface SemanticSearchProps {
  onSearch: (query: string) => Promise<ResearchStep[]>;
  isSearching: boolean;
  onSelectResult: (step: ResearchStep) => void;
}

export const SemanticSearch: React.FC<SemanticSearchProps> = ({
  onSearch,
  isSearching,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResearchStep[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    const searchResults = await onSearch(query);
    setResults(searchResults);
    setShowResults(true);
  }, [query, onSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search similar research..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-2 py-1">
              Found {results.length} similar results
            </div>
            {results.map((step) => (
              <button
                key={step.id}
                onClick={() => {
                  onSelectResult(step);
                  setShowResults(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">
                  {step.query}
                </div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {step.metadata?.summary || (typeof step.content === 'string' ? step.content.substring(0, 100) : String(step.content).substring(0, 100))}...
                </div>
                <div className="text-xs text-indigo-600 mt-1">
                  Similarity: {Math.round((1 - (step.metadata?.distance || 0)) * 100)}%
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
