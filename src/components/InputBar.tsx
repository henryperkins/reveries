import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  LightBulbIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import { usePromptSuggestions } from '../hooks/usePromptSuggestions';
import type { HostParadigm, ParadigmProbabilities } from '../types';

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
  const [value, setValue] = useState('');
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
      textareaRef.current.style.height = 'auto';
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
      setValue('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Tab' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
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
      case 'memory':
        return '🧠';
      case 'paradigm':
        return '🎭';
      case 'tool':
        return '🔧';
      case 'collaboration':
        return '🤝';
      default:
        return '💡';
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'memory':
        return 'border-l-blue-400 bg-blue-50';
      case 'paradigm':
        return 'border-l-purple-400 bg-purple-50';
      case 'tool':
        return 'border-l-green-400 bg-green-50';
      case 'collaboration':
        return 'border-l-orange-400 bg-orange-50';
      default:
        return 'border-l-gray-400 bg-gray-50';
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex items-end gap-2 p-4 bg-westworld-cream rounded-xl
                      border-2 border-westworld-tan/30 focus-within:border-westworld-gold
                      transition-colors duration-200">
          {/* Suggestion indicator */}
          {(suggestions.length > 0 || suggestionsLoading) && (
            <div className="absolute top-2 right-12 text-westworld-darkbrown/60">
              <LightBulbIcon
                className={`w-4 h-4 ${
                  suggestionsLoading ? 'animate-pulse' : ''
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
                              ? 'bg-indigo-100 border-l-indigo-500'
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
        Press Enter to submit, Shift+Enter for new line, Tab to apply suggestions
      </p>
    </div>
  );
};

