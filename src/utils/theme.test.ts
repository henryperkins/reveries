import { applyThemeToDOM, initializeTheme } from '../theme/themeConfig';

describe('Theme functionality', () => {
  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  test('should apply light theme by default', () => {
    const theme = initializeTheme();
    applyThemeToDOM(theme);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('should apply dark theme when specified', () => {
    applyThemeToDOM('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('should toggle theme from light to dark', () => {
    applyThemeToDOM('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyThemeToDOM('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});