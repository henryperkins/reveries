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
                    cream: '#FAFAFA',
                    beige: '#F5E6D3',
                    tan: '#D2B48C',
                    brown: '#A0522D',
                    darkbrown: '#654321',
                    nearblack: '#2A2522',
                    black: '#1A1A1A',
                    gold: '#D4AF37',
                    rust: '#8B4513',
                    copper: '#B87333',
                    white: '#FFFFFF',
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
                'westworld-glow': '0 0 20px rgba(212, 175, 55, 0.5)'
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
