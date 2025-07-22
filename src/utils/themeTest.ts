// Theme System Test
// Run this file to validate your theme implementation

import { validateThemeImplementation, getWestworldColors, getCurrentTheme } from './themeUtils';

// Test function to verify theme system
export function testThemeSystem() {
  console.log('🎨 Testing Reveries Theme System...\n');

  // Test 1: Validate overall implementation
  console.log('1. Validating theme implementation...');
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

  // Test 2: Check current theme
  console.log('\n2. Current theme status...');
  const currentTheme = getCurrentTheme();
  console.log(`Current theme: ${currentTheme}`);

  // Test 3: Check CSS variables
  console.log('\n3. Testing CSS variables...');
  const colors = getWestworldColors();
  console.log('Westworld colors:', colors);

  // Test 4: Check if ThemeProvider is working
  console.log('\n4. Checking React integration...');
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    console.log('✅ Theme toggle found - React integration working');
  } else {
    console.log('⚠️ Theme toggle not found - check ThemeProvider setup');
  }

  // Test 5: Check dark mode CSS variables
  console.log('\n5. Testing dark mode variables...');
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

  console.log('\n🎨 Theme system test complete!');

  return {
    isValid: validation.isValid,
    currentTheme,
    colors,
    darkColors,
    hasThemeToggle: !!themeToggle
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
