import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { usePromptSuggestions } from '@/hooks/usePromptSuggestions';
import type { HostParadigm, ParadigmProbabilities } from '@/types';
import { cn } from '@/utils/cn';

// Icons
import {
  PaperAirplaneIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';

// Validation types
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: string) => boolean;
}

export interface InputBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  minLength?: number;
  validationRules?: ValidationRule[];
  autoCompleteSuggestions?: string[];
  dynamicPlaceholderHints?: string[];
  currentParadigm?: HostParadigm;
  paradigmProbabilities?: ParadigmProbabilities;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  testId?: string;
}

export interface InputBarRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  validate: () => boolean;
  getValue: () => string;
  setValue: (value: string) => void;
}

interface ValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Simple announcer for accessibility
const useAnnouncer = () => {
  const announce = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };
  return { announce };
};

// Simple visually hidden component
const VisuallyHidden = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="sr-only" {...props}>
    {children}
  </div>
);

const EnhancedInputBar = forwardRef<InputBarRef, InputBarProps>(
  (
    {
      value: controlledValue,
      onChange,
      onSubmit,
      onFocus,
      onBlur,
      onClear,
      placeholder = 'Enter your research question...',
      disabled = false,
      isLoading = false,
      maxLength = 1000,
      minLength = 3,
      validationRules = [],
      autoCompleteSuggestions = [],
      dynamicPlaceholderHints = [],
      currentParadigm,
      paradigmProbabilities,
      className,
      'aria-label': ariaLabel = 'Research question input',
      'aria-describedby': ariaDescribedBy,
      testId = 'enhanced-input-bar',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [validationState, setValidationState] = useState<ValidationState>({
      isValid: true,
      errors: [],
      warnings: [],
    });
    const [currentHintIndex, setCurrentHintIndex] = useState(0);
    const [announcement, setAnnouncement] = useState('');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const announcer = useAnnouncer();

    // Determine controlled vs uncontrolled
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    // Dynamic placeholder with hints
    const dynamicPlaceholder = useMemo(() => {
      if (dynamicPlaceholderHints.length > 0 && !isFocused && !value) {
        return dynamicPlaceholderHints[currentHintIndex % dynamicPlaceholderHints.length];
      }
      return placeholder;
    }, [dynamicPlaceholderHints, currentHintIndex, isFocused, value, placeholder]);

    // Auto-rotate placeholder hints
    useEffect(() => {
      if (dynamicPlaceholderHints.length > 0 && !isFocused && !value) {
        const interval = setInterval(() => {
          setCurrentHintIndex((prev) => prev + 1);
        }, 3000);
        return () => clearInterval(interval);
      }
    }, [dynamicPlaceholderHints.length, isFocused, value]);

    // Validation logic
    const validate = useCallback(
      (val: string): ValidationState => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Built-in validation
        if (minLength && val.length < minLength) {
          errors.push(`Minimum length is ${minLength} characters`);
        }
        if (maxLength && val.length > maxLength) {
          errors.push(`Maximum length is ${maxLength} characters`);
        }

        // Custom validation rules
        validationRules.forEach((rule) => {
          switch (rule.type) {
            case 'required':
              if (!val.trim()) {
                errors.push(rule.message);
              }
              break;
            case 'minLength':
              if (val.length < rule.value) {
                errors.push(rule.message);
              }
              break;
            case 'maxLength':
              if (val.length > rule.value) {
                errors.push(rule.message);
              }
              break;
            case 'pattern':
              if (!new RegExp(rule.value).test(val)) {
                errors.push(rule.message);
              }
              break;
            case 'custom':
              if (rule.validator && !rule.validator(val)) {
                errors.push(rule.message);
              }
              break;
          }
        });

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
      [minLength, maxLength, validationRules]
    );

    // Real-time validation
    useEffect(() => {
      const newValidationState = validate(value);
      setValidationState(newValidationState);
    }, [value, validate]);

    // Auto-complete suggestions
    const { suggestions: aiSuggestions } = usePromptSuggestions(
      value,
      currentParadigm,
      paradigmProbabilities
    );

    const allSuggestions = useMemo(() => {
      const combined = [
        ...aiSuggestions.map((s) => s.text),
        ...autoCompleteSuggestions,
      ];
      return [...new Set(combined)].slice(0, 5);
    }, [aiSuggestions, autoCompleteSuggestions]);

    // Auto-resize textarea
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [value]);

    // Announce validation state changes
    useEffect(() => {
      if (validationState.errors.length > 0) {
        setAnnouncement(validationState.errors[0]);
      } else if (validationState.warnings.length > 0) {
        setAnnouncement(validationState.warnings[0]);
      }
    }, [validationState]);

    // Expose ref methods
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      clear: () => handleClear(),
      validate: () => {
        const state = validate(value);
        setValidationState(state);
        return state.isValid;
      },
      getValue: () => value,
      setValue: (newValue: string) => handleValueChange(newValue),
    }));

    const handleValueChange = useCallback(
      (newValue: string) => {
        if (isControlled) {
          onChange?.(newValue);
        } else {
          setInternalValue(newValue);
        }
      },
      [isControlled, onChange]
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        handleValueChange(newValue);
      },
      [handleValueChange]
    );

    const handleSubmit = useCallback(
      (e?: React.FormEvent) => {
        e?.preventDefault();

        const state = validate(value);
        setValidationState(state);

        if (!state.isValid || !value.trim()) {
          announcer.announce('Please fix validation errors before submitting');
          return;
        }

        onSubmit?.(value.trim());

        // Clear after submission
        handleValueChange('');
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);

        announcer.announce('Research question submitted');
      },
      [value, validate, onSubmit, handleValueChange, announcer]
    );

    const handleClear = useCallback(() => {
      handleValueChange('');
      setValidationState({ isValid: true, errors: [], warnings: [] });
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      onClear?.();
      announcer.announce('Input cleared');
    }, [handleValueChange, onClear, announcer]);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(true);
        onFocus?.(e);
        if (allSuggestions.length > 0) {
          setShowSuggestions(true);
        }
      },
      [onFocus, allSuggestions.length]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(false);
        onBlur?.(e);
        // Delay hiding suggestions to allow click events
        setTimeout(() => setShowSuggestions(false), 200);
      },
      [onBlur]
    );

    const applySuggestion = useCallback(
      (suggestion: string) => {
        handleValueChange(suggestion);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        textareaRef.current?.focus();
        announcer.announce(`Applied suggestion: ${suggestion}`);
      },
      [handleValueChange, announcer]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSuggestions && allSuggestions.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestionIndex((prev) =>
              prev < allSuggestions.length - 1 ? prev + 1 : prev
            );
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
          } else if (e.key === 'Tab' && selectedSuggestionIndex >= 0) {
            e.preventDefault();
            applySuggestion(allSuggestions[selectedSuggestionIndex]);
          } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
          }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (selectedSuggestionIndex >= 0 && showSuggestions) {
            applySuggestion(allSuggestions[selectedSuggestionIndex]);
          } else {
            handleSubmit();
          }
        }
      },
      [showSuggestions, allSuggestions, selectedSuggestionIndex, applySuggestion, handleSubmit]
    );

    const getValidationIcon = () => {
      if (validationState.errors.length > 0) {
        return <ExclamationCircleIcon className="w-5 h-5 text-semantic-error" />;
      }
      if (validationState.warnings.length > 0) {
        return <InformationCircleIcon className="w-5 h-5 text-semantic-warning" />;
      }
      if (value && validationState.isValid) {
        return <CheckCircleIcon className="w-5 h-5 text-semantic-success" />;
      }
      return null;
    };

    return (
      <div className={cn('relative w-full', className)} data-testid={testId}>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative">
            <label htmlFor={`${testId}-textarea`} className="sr-only">
              {ariaLabel}
            </label>

            <textarea
              ref={textareaRef}
              id={`${testId}-textarea`}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={dynamicPlaceholder}
              disabled={disabled || isLoading}
              maxLength={maxLength}
              minLength={minLength}
              className={cn(
                'w-full px-4 py-3 pr-20 bg-theme-surface border border-theme-border rounded-lg',
                'resize-none outline-none transition-all duration-200',
                'text-theme-primary placeholder:text-theme-secondary',
                'focus:border-semantic-primary focus:ring-2 focus:ring-semantic-primary/20',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                validationState.errors.length > 0 && 'border-semantic-error focus:border-semantic-error',
                validationState.warnings.length > 0 && 'border-semantic-warning focus:border-semantic-warning',
                'min-h-[var(--height-input-min,48px)] max-h-[var(--height-input-max,200px)]'
              )}
              aria-label={ariaLabel}
              aria-describedby={cn(
                ariaDescribedBy,
                validationState.errors.length > 0 && `${testId}-error`,
                validationState.warnings.length > 0 && `${testId}-warning`
              )}
              aria-invalid={validationState.errors.length > 0}
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
              aria-busy={isLoading}
              data-testid={`${testId}-textarea`}
            />

            {/* Action buttons container */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {/* Validation icon */}
              {getValidationIcon()}

              {/* Character count on larger screens */}
              {maxLength && value.length > maxLength * 0.8 && (
                <div className="hidden sm:block text-xs text-theme-secondary">
                  {value.length}/{maxLength}
                </div>
              )}

              {/* Clear button */}
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={cn(
                    'p-2 rounded-md transition-all duration-200',
                    'text-theme-secondary hover:text-theme-primary',
                    'hover:bg-theme-secondary/10',
                    'focus:outline-none focus:ring-2 focus:ring-semantic-primary/50',
                    'min-h-[36px] min-w-[36px] flex items-center justify-center'
                  )}
                  aria-label="Clear input"
                  data-testid={`${testId}-clear`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!value.trim() || disabled || isLoading || !validationState.isValid}
                className={cn(
                  'p-2 rounded-md transition-all duration-200',
                  'bg-westworld-copper hover:bg-westworld-darkCopper',
                  'text-white shadow-sm hover:shadow-md',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-westworld-copper',
                  'focus:outline-none focus:ring-2 focus:ring-westworld-copper/50',
                  'min-h-[40px] min-w-[40px] flex items-center justify-center',
                  'border border-westworld-darkCopper/20'
                )}
                aria-label="Submit research question"
                data-testid={`${testId}-submit`}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <PaperAirplaneIcon className="w-5 h-5 transform rotate-90" />
                )}
              </button>
            </div>

            {/* Character count for mobile - shown below */}
            {maxLength && (
              <div className="absolute right-3 bottom-1 text-xs text-theme-secondary sm:hidden">
                {value.length}/{maxLength}
              </div>
            )}
          </div>

          {/* Validation messages */}
          {validationState.errors.length > 0 && (
            <div
              id={`${testId}-error`}
              className="mt-2 text-sm text-semantic-error"
              role="alert"
              aria-live="polite"
            >
              {validationState.errors[0]}
            </div>
          )}

          {validationState.warnings.length > 0 && (
            <div
              id={`${testId}-warning`}
              className="mt-2 text-sm text-semantic-warning"
              role="status"
              aria-live="polite"
            >
              {validationState.warnings[0]}
            </div>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && allSuggestions.length > 0 && (
            <div
              className={cn(
                'absolute z-dropdown mt-1 w-full',
                'bg-theme-surface border border-theme-border rounded-lg shadow-lg',
                'max-h-60 overflow-y-auto'
              )}
              role="listbox"
              aria-label="Suggestions"
              data-testid={`${testId}-suggestions`}
            >
              {allSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className={cn(
                    'w-full text-left px-4 py-2',
                    'hover:bg-theme-secondary focus:bg-theme-secondary',
                    'focus:outline-none focus:ring-2 focus:ring-semantic-primary/50',
                    index === selectedSuggestionIndex && 'bg-theme-secondary',
                    'border-b border-theme-border last:border-b-0'
                  )}
                  role="option"
                  aria-selected={index === selectedSuggestionIndex}
                  data-testid={`${testId}-suggestion-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <LightBulbIcon className="w-4 h-4 text-semantic-primary" />
                    <span className="text-sm text-theme-primary">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Screen reader announcements */}
          <VisuallyHidden aria-live="polite" aria-atomic="true">
            {announcement}
          </VisuallyHidden>
        </form>

        {/* Keyboard shortcuts info */}
        <div className="mt-2 text-xs text-theme-secondary text-center">
          <span className="sr-only">Keyboard shortcuts:</span>
          <span aria-hidden="true">
            Press Enter to submit • Tab for suggestions • Escape to close
          </span>
        </div>
      </div>
    );
  }
);

EnhancedInputBar.displayName = 'EnhancedInputBar';

export default EnhancedInputBar;
