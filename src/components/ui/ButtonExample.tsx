import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface ButtonExampleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'paradigm';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  paradigm?: 'dolores' | 'teddy' | 'bernard' | 'maeve';
  isLoading?: boolean;
}

/**
 * Button component following the Tailwind-first with CSS variables pattern.
 * 
 * Key patterns demonstrated:
 * 1. Uses semantic color tokens (bg-primary, text-surface, etc.)
 * 2. Supports paradigm-specific styling via data attributes
 * 3. All colors reference CSS variables for runtime theming
 * 4. Opacity modifiers work correctly (hover:bg-primary/90)
 */
const ButtonExample = forwardRef<HTMLButtonElement, ButtonExampleProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    paradigm,
    isLoading = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-4 py-3 text-base rounded-md',
      xl: 'px-6 py-3 text-base rounded-lg',
    };
    
    const variantStyles = {
      primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
      secondary: 'bg-secondary text-primary hover:bg-secondary/80 focus:ring-border',
      outline: 'border border-border bg-transparent hover:bg-surface focus:ring-border',
      ghost: 'bg-transparent hover:bg-surface focus:ring-border',
      danger: 'bg-error text-white hover:bg-error/90 focus:ring-error',
      // Paradigm variant uses the dynamic paradigm accent color
      paradigm: 'bg-paradigm-accent text-white hover:bg-paradigm-accent/90 focus:ring-paradigm-accent',
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          // Apply paradigm-specific styles when using paradigm variant
          variant === 'paradigm' && 'data-[paradigm=dolores]:bg-red-600 data-[paradigm=teddy]:bg-amber-600 data-[paradigm=bernard]:bg-blue-600 data-[paradigm=maeve]:bg-purple-600',
          className
        )}
        disabled={disabled || isLoading}
        data-paradigm={paradigm}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

ButtonExample.displayName = 'ButtonExample';

export default ButtonExample;