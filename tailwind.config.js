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
                // Use CSS variables for runtime theming
                westworld: {
                    cream: 'var(--colors-westworld-cream)',
                    beige: 'var(--colors-westworld-beige)',
                    tan: 'var(--colors-westworld-tan)',
                    brown: 'var(--colors-westworld-brown)',
                    darkBrown: 'var(--colors-westworld-dark-brown)',
                    nearBlack: 'var(--colors-westworld-near-black)',
                    black: 'var(--colors-westworld-black)',
                    gold: 'var(--colors-westworld-gold)',
                    darkGold: 'var(--colors-westworld-dark-gold)',
                    rust: 'var(--colors-westworld-rust)',
                    copper: 'var(--colors-westworld-copper)',
                    darkCopper: 'var(--colors-westworld-dark-copper)',
                    white: 'var(--colors-westworld-white)',
                },
                // Semantic colors
                primary: 'var(--colors-semantic-primary)',
                'primary-dark': 'var(--colors-semantic-primary-dark)',
                secondary: 'var(--colors-semantic-secondary)',
                'secondary-dark': 'var(--colors-semantic-secondary-dark)',
                background: 'var(--colors-semantic-background)',
                surface: 'var(--colors-semantic-surface)',
                text: 'var(--colors-semantic-text)',
                'text-muted': 'var(--colors-semantic-text-muted)',
                border: 'var(--colors-semantic-border)',
            },
            spacing: {
                0: 'var(--spacing-0)',
                1: 'var(--spacing-1)',
                2: 'var(--spacing-2)',
                3: 'var(--spacing-3)',
                4: 'var(--spacing-4)',
                5: 'var(--spacing-5)',
                6: 'var(--spacing-6)',
                8: 'var(--spacing-8)',
                10: 'var(--spacing-10)',
                12: 'var(--spacing-12)',
                16: 'var(--spacing-16)',
                20: 'var(--spacing-20)',
                24: 'var(--spacing-24)',
            },
            borderRadius: {
                none: 'var(--border-radius-none)',
                sm: 'var(--border-radius-sm)',
                DEFAULT: 'var(--border-radius-base)',
                md: 'var(--border-radius-md)',
                lg: 'var(--border-radius-lg)',
                xl: 'var(--border-radius-xl)',
                '2xl': 'var(--border-radius-2xl)',
                '3xl': 'var(--border-radius-3xl)',
                full: 'var(--border-radius-full)',
            },
            boxShadow: {
                none: 'var(--shadows-none)',
                sm: 'var(--shadows-sm)',
                DEFAULT: 'var(--shadows-base)',
                md: 'var(--shadows-md)',
                lg: 'var(--shadows-lg)',
                xl: 'var(--shadows-xl)',
                '2xl': 'var(--shadows-2xl)',
                inner: 'var(--shadows-inner)',
                'westworld-glow': 'var(--shadows-glow)',
                'westworld-glow-lg': 'var(--shadows-glow-lg)',
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
