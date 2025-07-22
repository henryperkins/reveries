/**
 * Theme System Test
 * Tests the theme system to ensure variables are correctly applied
 */

import { generateCSSVariables, applyThemeToDOM } from '../theme/themeConfig';

export function testThemeSystem() {
  console.log('🎨 Testing theme system...');

  // Test light mode variables
  const lightVars = generateCSSVariables('light');
  console.log('Light mode variables:', Object.keys(lightVars).length, 'variables');

  // Test dark mode variables
  const darkVars = generateCSSVariables('dark');
  console.log('Dark mode variables:', Object.keys(darkVars).length, 'variables');

  // Check for missing variables
  const requiredVars = [
    '--color-bg-primary',
    '--color-bg-secondary',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-surface',
    '--color-surface-hover',
    '--color-accent',
    '--color-accent-hover',
    '--color-border',
    '--color-border-light',
    '--color-input-bg',
    '--color-input-border',
    '--color-button-primary',
    '--color-button-secondary',
    '--color-westworld-cream',
    '--color-westworld-gold',
    '--color-westworld-darkBrown',
    '--color-westworld-nearBlack',
  ];

  const missingInLight = requiredVars.filter(v => !lightVars[v]);
  const missingInDark = requiredVars.filter(v => !darkVars[v]);

  if (missingInLight.length > 0) {
    console.error('❌ Missing light mode variables:', missingInLight);
  } else {
    console.log('✅ All required light mode variables present');
  }

  if (missingInDark.length > 0) {
    console.error('❌ Missing dark mode variables:', missingInDark);
  } else {
    console.log('✅ All required dark mode variables present');
  }

  // Test variable values
  console.log('Sample variables:');
  console.log('Light bg-primary:', lightVars['--color-bg-primary']);
  console.log('Dark bg-primary:', darkVars['--color-bg-primary']);
  console.log('Light text-primary:', lightVars['--color-text-primary']);
  console.log('Dark text-primary:', darkVars['--color-text-primary']);

  // Test if we can apply theme (in browser)
  if (typeof window !== 'undefined') {
    console.log('Testing theme application...');
    applyThemeToDOM('light');
    setTimeout(() => {
      applyThemeToDOM('dark');
      console.log('✅ Theme switching works');
    }, 1000);
  }

  return {
    lightVars,
    darkVars,
    missingInLight,
    missingInDark,
    isValid: missingInLight.length === 0 && missingInDark.length === 0
  };
}

// Run test if called directly
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  // Test code for testing environment
  describe('Theme System', () => {
    it('should generate all required variables', () => {
      const result = testThemeSystem();
      expect(result.isValid).toBe(true);
    });

    it('should have different values for light and dark modes', () => {
      const lightVars = generateCSSVariables('light');
      const darkVars = generateCSSVariables('dark');

      expect(lightVars['--color-bg-primary']).not.toBe(darkVars['--color-bg-primary']);
      expect(lightVars['--color-text-primary']).not.toBe(darkVars['--color-text-primary']);
    });
  });
}
