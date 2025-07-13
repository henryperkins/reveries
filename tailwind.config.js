/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        westworld: {
          cream: '#f8f6f1',
          beige: '#e8e0d5',
          tan: '#c8b8a8',
          brown: '#8b7355',
          darkbrown: '#5a4a3a',
          black: '#1a1a1a',
          gold: '#d4a574',
          rust: '#a0522d',
        }
      },
      fontFamily: {
        'mono': ['Courier', 'monospace'],
        'serif': ['Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}