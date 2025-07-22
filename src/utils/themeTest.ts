// Theme System Test
// Run this file to validate your theme implementation

import { designSystem } from '@/theme/designSystem';
import { generateCSSVariables } from '@/theme/themeConfig';

// Helper functions for testing
function getCurrentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getCSSVariable(variable: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

function getWestworldColors() {
  return {
    cream: getCSSVariable('--color-westworld-cream'),
    beige: getCSSVariable('--color-westworld-beige'),
    tan: getCSSVariable('--color-westworld-tan'),
    brown: getCSSVariable('--color-westworld-brown'),
    darkBrown: getCSSVariable('--color-westworld-dark-brown'),
    nearBlack: getCSSVariable('--color-westworld-near-black'),
    black: getCSSVariable('--color-westworld-black'),
    gold: getCSSVariable('--color-westworld-gold'),
    darkGold: getCSSVariable('--color-westworld-dark-gold'),
    rust: getCSSVariable('--color-westworld-rust'),
    copper: getCSSVariable('--color-westworld-copper'),
    darkCopper: getCSSVariable('--color-westworld-dark-copper'),
    white: getCSSVariable('--color-westworld-white'),
  };
}

function validateThemeImplementation() {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof document === 'undefined') {
    errors.push('Document is not available (SSR environment)');
    return { isValid: false, errors, warnings };
  }

  const root = document.documentElement;

  // Check if theme classes are applied
  const hasThemeClass = root.classList.contains('light') || root.classList.contains('dark');
  if (!hasThemeClass) {
    errors.push('No theme class (light/dark) found on document element');
  }

  // Check if data-theme attribute is set
  const hasDataTheme = root.hasAttribute('data-theme');
  if (!hasDataTheme) {
    warnings.push('data-theme attribute not found on document element');
  }

  // Check if CSS variables are defined
  const testVariables = [
    '--color-westworld-cream',
    '--color-westworld-gold',
    '--shadow-md',
    '--spacing-md'
  ];

  testVariables.forEach(variable => {
    const value = getCSSVariable(variable);
    if (!value) {
      errors.push(`CSS variable ${variable} is not defined or has no value`);
    }
  });

  // Check if ThemeProvider is in the React tree
  const themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) {
    warnings.push('Theme toggle button not found - ThemeProvider may not be properly implemented');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Test function to verify theme system
export function testThemeSystem() {
  console.log('🎨 Testing Unified Reveries Theme System...\n');

  // Test 1: Validate design system
  console.log('1. Validating design system structure...');
  console.log(`✅ Design system loaded: ${Object.keys(designSystem).length} sections`);
  console.log(`   - Colors: ${Object.keys(designSystem.colors).length} palettes`);
  console.log(`   - Typography: ${Object.keys(designSystem.typography.fontSize).length} font sizes`);
  console.log(`   - Spacing: ${Object.keys(designSystem.spacing).length} spacing values`);

  // Test 2: Check CSS variable generation
  console.log('\n2. Testing CSS variable generation...');
  const lightVars = generateCSSVariables('light');
  const darkVars = generateCSSVariables('dark');
  console.log(`✅ Generated ${Object.keys(lightVars).length} light mode variables`);
  console.log(`✅ Generated ${Object.keys(darkVars).length} dark mode variables`);

  // Test 3: Validate DOM implementation
  console.log('\n3. Validating DOM implementation...');
  const validation = validateThemeImplementation();

  if (validation.isValid) {
    console.log('✅ Theme implementation is valid!');
  } else {
    console.log('❌ Theme implementation has errors:');
    validation.errors.forEach((error: string) => console.log(`   - ${error}`));
  }

  if (validation.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    validation.warnings.forEach((warning: string) => console.log(`   - ${warning}`));
  }

  // Test 4: Check current theme
  console.log('\n4. Current theme status...');
  const currentTheme = getCurrentTheme();
  console.log(`Current theme: ${currentTheme}`);

  // Test 5: Check CSS variables
  console.log('\n5. Testing CSS variables...');
  const colors = getWestworldColors();
  console.log('Westworld colors:', colors);

  // Test 6: Check if ThemeProvider is working
  console.log('\n6. Checking React integration...');
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    console.log('✅ Theme toggle found - React integration working');
  } else {
    console.log('⚠️ Theme toggle not found - check ThemeProvider setup');
  }

  // Test 7: Check dark mode CSS variables
  console.log('\n7. Testing dark mode variables...');
  const originalTheme = getCurrentTheme();

  // Temporarily switch to dark mode to test variables
  document.documentElement.classList.add('dark');
  document.documentElement.setAttribute('data-theme', 'dark');

  const darkColors = getWestworldColors();
  console.log('Dark mode colors:', darkColors);

  // Restore original theme
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add(originalTheme);
  document.documentElement.setAttribute('data-theme', originalTheme);

  console.log('\n🎨 Unified theme system test complete!');

  return {
    isValid: validation.isValid,
    currentTheme,
    colors,
    darkColors,
    hasThemeToggle: !!themeToggle,
    designSystemSections: Object.keys(designSystem).length,
    variableCount: Object.keys(lightVars).length
  };
}

// Auto-run test when in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Run test after a short delay to ensure DOM is ready
  setTimeout(() => {
    try {
      testThemeSystem();
    } catch (error) {
      console.error('Theme test failed:', error);
    }
  }, 1000);
}

export default testThemeSystem;
