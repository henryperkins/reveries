import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface InputBarProps {
  onQuerySubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({
  onQuerySubmit,
  placeholder = "Enter your research question...",
  disabled = false,
  isLoading = false
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled && !isLoading) {
      onQuerySubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-end gap-2 p-4 bg-westworld-cream rounded-xl
                    border-2 border-westworld-tan/30 focus-within:border-westworld-gold
                    transition-colors duration-200">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="flex-1 bg-transparent resize-none outline-none text-westworld-black
                   placeholder:text-westworld-darkbrown/60 min-h-[24px] max-h-[200px]"
          rows={1}
          aria-label="Research question input"
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
      <p className="mt-2 text-xs text-westworld-darkbrown/60">
        Press Enter to submit, Shift+Enter for new line
      </p>
    </form>
  );
};

