import { css, keyframes } from '@emotion/css';
import { theme } from './designTokens';

// Animation keyframes
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

// Base styles with dark mode support
export const baseStyles = {
  // Layout
  container: css`
    min-height: 100vh;
    background: linear-gradient(
      135deg,
      ${theme.colors.background.light} 0%,
      ${theme.colors.background.secondary.light} 100%
    );

    [data-theme="dark"] & {
      background: linear-gradient(
        135deg,
        ${theme.colors.background.dark} 0%,
        ${theme.colors.background.secondary.dark} 100%
      );
    }
  `,

  // Card styles
  card: css`
    background: ${theme.colors.surface.light};
    border: 1px solid ${theme.colors.border.light};
    border-radius: ${theme.borderRadius.lg};
    box-shadow: ${theme.shadows.md};
    transition: all 0.3s ease;

    [data-theme="dark"] & {
      background: ${theme.colors.surface.dark};
      border-color: ${theme.colors.border.dark};
      box-shadow: ${theme.shadows.dark.md};
    }

    &:hover {
      box-shadow: ${theme.shadows.lg};

      [data-theme="dark"] & {
        box-shadow: ${theme.shadows.dark.lg};
      }
    }
  `,

  // Button styles
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-size: ${theme.fontSize.sm};
    font-weight: ${theme.fontWeight.medium};
    border-radius: ${theme.borderRadius.md};
    transition: all 0.2s ease;
    cursor: pointer;
    border: 1px solid transparent;

    &:focus {
      outline: none;
      box-shadow: 0 0 0 2px ${theme.colors.primary.light}40;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,

  primaryButton: css`
    background: ${theme.colors.primary.light};
    color: white;

    &:hover:not(:disabled) {
      background: ${theme.colors.primary.hover.light};
    }

    [data-theme="dark"] & {
      background: ${theme.colors.primary.dark};

      &:hover:not(:disabled) {
        background: ${theme.colors.primary.hover.dark};
      }
    }
  `,

  secondaryButton: css`
    background: ${theme.colors.secondary.light};
    color: ${theme.colors.text.primary.light};
    border-color: ${theme.colors.border.light};

    &:hover:not(:disabled) {
      background: ${theme.colors.secondary.hover.light};
    }

    [data-theme="dark"] & {
      background: ${theme.colors.secondary.dark};
      color: ${theme.colors.text.primary.dark};
      border-color: ${theme.colors.border.dark};

      &:hover:not(:disabled) {
        background: ${theme.colors.secondary.hover.dark};
      }
    }
  `,

  ghostButton: css`
    background: transparent;
    color: ${theme.colors.text.secondary.light};

    &:hover:not(:disabled) {
      background: ${theme.colors.secondary.light};
    }

    [data-theme="dark"] & {
      color: ${theme.colors.text.secondary.dark};

      &:hover:not(:disabled) {
        background: ${theme.colors.secondary.dark};
      }
    }
  `,

  // Input styles
  input: css`
    width: 100%;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    font-size: ${theme.fontSize.sm};
    border: 1px solid ${theme.colors.border.light};
    border-radius: ${theme.borderRadius.md};
    background: ${theme.colors.surface.light};
    color: ${theme.colors.text.primary.light};
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: ${theme.colors.primary.light};
      box-shadow: 0 0 0 2px ${theme.colors.primary.light}20;
    }

    &::placeholder {
      color: ${theme.colors.text.muted.light};
    }

    [data-theme="dark"] & {
      background: ${theme.colors.surface.dark};
      border-color: ${theme.colors.border.dark};
      color: ${theme.colors.text.primary.dark};

      &::placeholder {
        color: ${theme.colors.text.muted.dark};
      }
    }
  `,

  // Text styles
  text: {
    heading: css`
      font-family: ${theme.fontFamily.heading};
      font-weight: ${theme.fontWeight.bold};
      color: ${theme.colors.text.primary.light};

      [data-theme="dark"] & {
        color: ${theme.colors.text.primary.dark};
      }
    `,

    body: css`
      font-family: ${theme.fontFamily.body};
      color: ${theme.colors.text.primary.light};
      line-height: ${theme.lineHeight.relaxed};

      [data-theme="dark"] & {
        color: ${theme.colors.text.primary.dark};
      }
    `,

    muted: css`
      color: ${theme.colors.text.muted.light};

      [data-theme="dark"] & {
        color: ${theme.colors.text.muted.dark};
      }
    `,
  },

  // Animation classes
  animations: {
    fadeIn: css`
      animation: ${fadeIn} 0.3s ease-out;
    `,

    slideUp: css`
      animation: ${slideUp} 0.3s ease-out;
    `,

    shimmer: css`
      background: linear-gradient(
        90deg,
        ${theme.colors.shimmer.light} 0%,
        ${theme.colors.shimmer.secondary.light} 20%,
        ${theme.colors.shimmer.light} 40%,
        ${theme.colors.shimmer.light} 100%
      );
      background-size: 200px 100%;
      animation: ${shimmer} 1.5s infinite;

      [data-theme="dark"] & {
        background: linear-gradient(
          90deg,
          ${theme.colors.shimmer.dark} 0%,
          ${theme.colors.shimmer.secondary.dark} 20%,
          ${theme.colors.shimmer.dark} 40%,
          ${theme.colors.shimmer.dark} 100%
        );
      }
    `,
  },

  // Utility classes
  utilities: {
    visuallyHidden: css`
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

    focusRing: css`
      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${theme.colors.primary.light}40;
      }

      [data-theme="dark"] &:focus {
        box-shadow: 0 0 0 2px ${theme.colors.primary.dark}40;
      }
    `,
  }
};

// Component-specific styles
export const componentStyles = {
  researchCard: css`
    background: ${theme.colors.surface.light};
    border: 1px solid ${theme.colors.border.light};
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.lg};
    margin-bottom: ${theme.spacing.md};
    transition: all 0.3s ease;

    &:hover {
      box-shadow: ${theme.shadows.lg};
      transform: translateY(-1px);
    }

    [data-theme="dark"] & {
      background: ${theme.colors.surface.dark};
      border-color: ${theme.colors.border.dark};
    }
  `,

  progressBar: css`
    height: 4px;
    background: ${theme.colors.secondary.light};
    border-radius: ${theme.borderRadius.full};
    overflow: hidden;

    [data-theme="dark"] & {
      background: ${theme.colors.secondary.dark};
    }
  `,

  progressFill: css`
    height: 100%;
    background: linear-gradient(90deg, ${theme.colors.primary.light}, ${theme.colors.accent.light});
    transition: width 0.3s ease;

    [data-theme="dark"] & {
      background: linear-gradient(90deg, ${theme.colors.primary.dark}, ${theme.colors.accent.dark});
    }
  `,
};

// Responsive styles
export const responsiveStyles = {
  mobile: css`
    @media (max-width: 768px) {
      padding: ${theme.spacing.sm};
    }
  `,

  tablet: css`
    @media (min-width: 769px) and (max-width: 1024px) {
      padding: ${theme.spacing.md};
    }
  `,

  desktop: css`
    @media (min-width: 1025px) {
      padding: ${theme.spacing.lg};
    }
  `,
};

// Export for easy usage
export const styled = {
  ...baseStyles,
  component: componentStyles,
  responsive: responsiveStyles,
  animations: baseStyles.animations,
  utilities: baseStyles.utilities,
};
