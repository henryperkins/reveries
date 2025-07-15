/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Semantic color names
        'background': 'var(--color-background)',
        'surface': 'var(--color-surface)',
        'border': 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'accent': 'var(--color-accent)',
        'accent-dark': 'var(--color-accent-dark)',

        // Keep westworld colors for backward compatibility
        'westworld-cream': 'var(--color-westworld-cream)',
        'westworld-beige': 'var(--color-westworld-beige)',
        'westworld-tan': 'var(--color-westworld-tan)',
        'westworld-brown': 'var(--color-westworld-brown)',
        'westworld-darkbrown': 'var(--color-westworld-darkbrown)',
        'westworld-black': 'var(--color-westworld-black)',
        'westworld-gold': 'var(--color-westworld-gold)',
        'westworld-rust': 'var(--color-westworld-rust)',
      },
      fontFamily: {
        'sans': ['system-ui', '-apple-system', 'sans-serif'],
        'serif': ['Georgia', 'Cambria', 'serif'],
        'mono': ['Courier New', 'Courier', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
