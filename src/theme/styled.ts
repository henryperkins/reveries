// CSS-in-JS styles with dark mode support using CSS custom properties
// This approach uses CSS variables for runtime theming without external dependencies

// CSS-in-JS styles now use the unified CSS variables from design-tokens.css
// No need to redeclare variables - they come from the single source of truth

// Base styles object
export const styles = {
  // Layout
  container: `
    min-height: 100vh;
    background: linear-gradient(135deg, var(--colors-semantic-background) 0%, var(--colors-semantic-surface) 100%);
    transition: background var(--transitions-duration-slow);
  `,

  // Card styles
  card: `
    background: var(--colors-semantic-surface);
    border: 1px solid var(--colors-semantic-border);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadows-md);
    transition: all var(--transitions-duration-slow);

    &:hover {
      box-shadow: var(--shadows-lg);
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
    border-radius: var(--border-radius-md);
    transition: all var(--transitions-duration-fast);
    cursor: pointer;
    border: 1px solid transparent;

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--colors-semantic-primary)40;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,

  primaryButton: `
    background: var(--colors-semantic-primary);
    color: white;

    &:hover:not(:disabled) {
      background: var(--colors-semantic-primary-dark);
    }
  `,

  secondaryButton: `
    background: var(--colors-semantic-secondary);
    color: var(--colors-semantic-text-primary);
    border-color: var(--colors-semantic-border);

    &:hover:not(:disabled) {
      background: var(--colors-semantic-secondary-dark);
    }
  `,

  ghostButton: `
    background: transparent;
    color: var(--colors-semantic-text-secondary);

    &:hover:not(:disabled) {
      background: var(--colors-semantic-secondary);
    }
  `,

  // Input styles
  input: `
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
    border: 1px solid var(--colors-semantic-border);
    border-radius: var(--border-radius-md);
    background: var(--colors-semantic-surface);
    color: var(--colors-semantic-text-primary);
    transition: all var(--transitions-duration-fast);

    &:focus {
      outline: none;
      border-color: var(--colors-semantic-primary);
      box-shadow: 0 0 0 2px var(--colors-semantic-primary)20;
    }

    &::placeholder {
      color: var(--colors-semantic-text-muted);
    }
  `,

  // Text styles
  text: {
    heading: `
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 700;
      color: var(--colors-semantic-text-primary);
    `,

    body: `
      font-family: system-ui, -apple-system, sans-serif;
      color: var(--colors-semantic-text-primary);
      line-height: 1.625;
    `,

    muted: `
      color: var(--colors-semantic-text-muted);
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
        var(--colors-semantic-secondary) 0%,
        var(--colors-semantic-border) 20%,
        var(--colors-semantic-secondary) 40%,
        var(--colors-semantic-secondary) 100%
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
        box-shadow: 0 0 0 2px var(--colors-semantic-primary)40;
      }
    `,
  },

  // Component-specific styles
  components: {
    researchCard: `
      background: var(--colors-semantic-surface);
      border: 1px solid var(--colors-semantic-border);
      border-radius: var(--border-radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-md);
      transition: all var(--transitions-duration-slow);

      &:hover {
        box-shadow: var(--shadows-lg);
        transform: translateY(-1px);
      }
    `,

    progressBar: `
      height: 4px;
      background: var(--colors-semantic-secondary);
      border-radius: var(--border-radius-full);
      overflow: hidden;
    `,

    progressFill: `
      height: 100%;
      background: linear-gradient(90deg, var(--colors-semantic-primary), var(--colors-semantic-accent));
      transition: width var(--transitions-duration-slow);
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
    transition: background-color var(--transitions-duration-slow),
                color var(--transitions-duration-slow),
                border-color var(--transitions-duration-slow),
                box-shadow var(--transitions-duration-slow);
  }
`;

// Export for easy usage
export const styled = {
  ...styles,
  keyframes,
  transition: themeTransition,
};
