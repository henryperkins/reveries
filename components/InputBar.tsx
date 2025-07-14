import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon } from './icons';

interface InputBarProps {
  onQuerySubmit: (query: string) => void;
  isLoading: boolean;
  initialQuery?: string;
}

export const InputBar: React.FC<InputBarProps> = ({ onQuerySubmit, isLoading, initialQuery = "" }) => {
  const [inputValue, setInputValue] = useState<string>(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
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

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative group mt-6">
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
  );
};
