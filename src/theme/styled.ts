// CSS-in-JS styles with dark mode support using CSS custom properties
// This approach uses CSS variables for runtime theming without external dependencies

// CSS variables for theme values
export const themeVariables = `
  :root {
    /* Light theme colors */
    --color-primary: #3B82F6;
    --color-secondary: #F3F4F6;
    --color-accent: #F59E0B;
    --color-background: #F9FAFB;
    --color-surface: #FFFFFF;
    --color-text-primary: #111827;
    --color-text-secondary: #6B7280;
    --color-text-muted: #9CA3AF;
    --color-border: #E5E7EB;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-error: #EF4444;
    --color-info: #3B82F6;

    /* Westworld theme colors */
    --color-westworld-cream: #FAF6F2;
    --color-westworld-beige: #F5EDE4;
    --color-westworld-tan: #E8D5C4;
    --color-westworld-brown: #8B6F47;
    --color-westworld-dark-brown: #6B5637;
    --color-westworld-near-black: #2A2522;
    --color-westworld-black: #1A1512;
    --color-westworld-gold: #D4AF37;
    --color-westworld-dark-gold: #B8941F;
    --color-westworld-rust: #A85732;
    --color-westworld-copper: #C87543;
    --color-westworld-dark-copper: #A65E36;
    --color-westworld-white: #FFFFFF;

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-2xl: 2.5rem;
    --spacing-3xl: 3rem;

    /* Border radius */
    --radius-sm: 0.125rem;
    --radius-md: 0.375rem;
    --radius-lg: 0.5rem;
    --radius-xl: 0.75rem;
    --radius-2xl: 1rem;
    --radius-full: 9999px;

    /* Transitions */
    --transition-fast: 150ms ease-in-out;
    --transition-base: 200ms ease-in-out;
    --transition-slow: 300ms ease-in-out;
  }

  [data-theme="dark"] {
    /* Dark theme colors */
    --color-primary: #60A5FA;
    --color-secondary: #374151;
    --color-accent: #FBBF24;
    --color-background: #111827;
    --color-surface: #1F2937;
    --color-text-primary: #F9FAFB;
    --color-text-secondary: #9CA3AF;
    --color-text-muted: #6B7280;
    --color-border: #374151;
    --color-success: #34D399;
    --color-warning: #FBBF24;
    --color-error: #F87171;
    --color-info: #60A5FA;

    /* Westworld dark theme colors */
    --color-westworld-cream: #1A1512;
    --color-westworld-beige: #2A2522;
    --color-westworld-tan: #3A3532;
    --color-westworld-brown: #D4AF37;
    --color-westworld-dark-brown: #E4BF47;
    --color-westworld-near-black: #F5EDE4;
    --color-westworld-black: #FAF6F2;
    --color-westworld-gold: #F4CF57;
    --color-westworld-dark-gold: #E4BF47;
    --color-westworld-rust: #E89353;
    --color-westworld-copper: #F4A460;
    --color-westworld-dark-copper: #E89353;
    --color-westworld-white: #0A0806;

    /* Dark shadows */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
  }
`;

// Base styles object
export const styles = {
  // Layout
  container: `
    min-height: 100vh;
    background: linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%);
    transition: background var(--transition-slow);
  `,

  // Card styles
  card: `
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    transition: all var(--transition-slow);

    &:hover {
      box-shadow: var(--shadow-lg);
      transform: translateY(-1px);
    }
  `,

  // Button styles
  button: `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
    cursor: pointer;
    border: 1px solid transparent;

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary)40;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,

  primaryButton: `
    background: var(--color-primary);
    color: white;

    &:hover:not(:disabled) {
      background: var(--color-primary);
      filter: brightness(0.9);
    }
  `,

  secondaryButton: `
    background: var(--color-secondary);
    color: var(--color-text-primary);
    border-color: var(--color-border);

    &:hover:not(:disabled) {
      background: var(--color-secondary);
      filter: brightness(0.95);
    }
  `,

  ghostButton: `
    background: transparent;
    color: var(--color-text-secondary);

    &:hover:not(:disabled) {
      background: var(--color-secondary);
    }
  `,

  // Input styles
  input: `
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    transition: all var(--transition-base);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary)20;
    }

    &::placeholder {
      color: var(--color-text-muted);
    }
  `,

  // Text styles
  text: {
    heading: `
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 700;
      color: var(--color-text-primary);
    `,

    body: `
      font-family: system-ui, -apple-system, sans-serif;
      color: var(--color-text-primary);
      line-height: 1.625;
    `,

    muted: `
      color: var(--color-text-muted);
    `,
  },

  // Animation classes
  animations: {
    fadeIn: `
      animation: fadeIn 0.3s ease-out;
    `,

    slideUp: `
      animation: slideUp 0.3s ease-out;
    `,

    shimmer: `
      background: linear-gradient(
        90deg,
        var(--color-secondary) 0%,
        var(--color-border) 20%,
        var(--color-secondary) 40%,
        var(--color-secondary) 100%
      );
      background-size: 200px 100%;
      animation: shimmer 1.5s infinite;
    `,
  },

  // Utility classes
  utilities: {
    visuallyHidden: `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `,

    focusRing: `
      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-primary)40;
      }
    `,
  },

  // Component-specific styles
  components: {
    researchCard: `
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-md);
      transition: all var(--transition-slow);

      &:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-1px);
      }
    `,

    progressBar: `
      height: 4px;
      background: var(--color-secondary);
      border-radius: var(--radius-full);
      overflow: hidden;
    `,

    progressFill: `
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
      transition: width var(--transition-slow);
    `,
  },

  // Responsive styles
  responsive: {
    mobile: `
      @media (max-width: 768px) {
        padding: var(--spacing-sm);
      }
    `,

    tablet: `
      @media (min-width: 769px) and (max-width: 1024px) {
        padding: var(--spacing-md);
      }
    `,

    desktop: `
      @media (min-width: 1025px) {
        padding: var(--spacing-lg);
      }
    `,
  },
};

// CSS keyframes
export const keyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

// Theme transition styles
export const themeTransition = `
  .theme-transition * {
    transition: background-color var(--transition-slow),
                color var(--transition-slow),
                border-color var(--transition-slow),
                box-shadow var(--transition-slow);
  }
`;

// Export for easy usage
export const styled = {
  ...styles,
  variables: themeVariables,
  keyframes,
  transition: themeTransition,
};
