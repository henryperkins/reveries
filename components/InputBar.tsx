
import React, { useState, useEffect } from 'react';
import { ArrowUpCircleIcon } from './icons';

interface InputBarProps {
  onQuerySubmit: (query: string) => void;
  isLoading: boolean;
  initialQuery?: string;
}

export const InputBar: React.FC<InputBarProps> = ({ onQuerySubmit, isLoading, initialQuery = "" }) => {
  const [inputValue, setInputValue] = useState<string>(initialQuery);

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

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex items-center space-x-2">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Initiate new narrative loop..."
        className="grow p-3 reverie-input rounded-lg transition-all duration-300"
        disabled={isLoading}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        className={`rounded-full reverie-button transform active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        disabled={isLoading}
        aria-label="Submit query"
      >
        <ArrowUpCircleIcon className="w-6 h-6" />
      </button>
    </form>
  );
};
