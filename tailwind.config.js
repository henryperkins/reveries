/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        'westworld-serif': ['Georgia', 'serif'],
        'westworld-mono': ['Courier', 'monospace'],
      },
    },
  },
  plugins: [],
}
