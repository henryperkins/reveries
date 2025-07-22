/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: ['class', '[data-theme="dark"]'],
    theme: {
        extend: {
            colors: {
                westworld: {
                    cream: 'var(--color-westworld-cream)',
                    beige: 'var(--color-westworld-beige)',
                    tan: 'var(--color-westworld-tan)',
                    brown: 'var(--color-westworld-brown)',
                    darkBrown: 'var(--color-westworld-darkBrown)',
                    nearBlack: 'var(--color-westworld-nearBlack)',
                    black: 'var(--color-westworld-black)',
                    gold: 'var(--color-westworld-gold)',
                    darkGold: 'var(--color-westworld-darkGold)',
                    rust: 'var(--color-westworld-rust)',
                    copper: 'var(--color-westworld-copper)',
                    darkCopper: 'var(--color-westworld-darkCopper)',
                    white: 'var(--color-westworld-white)',
                }
            },
            animation: {
                shimmer: 'shimmer 2s ease-in-out infinite',
                fadeIn: 'fadeIn 0.3s ease-out',
                slideUp: 'slideUp 0.3s ease-out',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
                glow: 'glow 2s ease-in-out infinite',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' }
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.5)' },
                    '50%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.8), 0 0 30px rgba(212, 175, 55, 0.6)' },
                    '100%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.5)' }
                }
            },
            boxShadow: {
                'westworld-glow': '0 0 20px rgba(212, 175, 55, 0.5)',
                'sm': 'var(--shadow-sm)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'xl': 'var(--shadow-xl)',
            },
            spacing: {
                'xs': 'var(--spacing-xs, 0.25rem)',
                'sm': 'var(--spacing-sm, 0.5rem)',
                'md': 'var(--spacing-md, 1rem)',
                'lg': 'var(--spacing-lg, 1.5rem)',
                'xl': 'var(--spacing-xl, 2rem)',
                '2xl': 'var(--spacing-2xl, 2.5rem)',
                '3xl': 'var(--spacing-3xl, 3rem)',
            },
            borderRadius: {
                'sm': 'var(--radius-sm, 0.125rem)',
                'md': 'var(--radius-md, 0.375rem)',
                'lg': 'var(--radius-lg, 0.5rem)',
                'xl': 'var(--radius-xl, 0.75rem)',
                '2xl': 'var(--radius-2xl, 1rem)',
                'full': 'var(--radius-full, 9999px)',
            },
            transitionDuration: {
                'fast': 'var(--duration-fast, 150ms)',
                'base': 'var(--duration-base, 200ms)',
                'slow': 'var(--duration-slow, 300ms)',
                'slower': 'var(--duration-slower, 500ms)',
            }
        },
    },
    safelist: [
        // For ParadigmIndicator dynamic colors
        'bg-blue-50', 'border-blue-200', 'text-blue-700',
        'bg-purple-50', 'border-purple-200', 'text-purple-700',
        'bg-green-50', 'border-green-200', 'text-green-700',
        'bg-amber-50', 'border-amber-200', 'text-amber-700',
        'bg-indigo-50', 'border-indigo-200', 'text-indigo-700',
        'bg-pink-50', 'border-pink-200', 'text-pink-700',
        'bg-cyan-50', 'border-cyan-200', 'text-cyan-700',
        'bg-emerald-50', 'border-emerald-200', 'text-emerald-700',
        // For Controls gradient colors
        'from-blue-500', 'to-blue-600',
        'from-purple-500', 'to-purple-600',
        'from-green-500', 'to-green-600',
        'from-amber-500', 'to-amber-600',
    ],
    plugins: [],
}
