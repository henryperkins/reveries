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
                // Brand colors from unified tokens
                brand: {
                    gold: 'rgb(var(--color-brand-gold) / <alpha-value>)',
                    cream: 'rgb(var(--color-brand-cream) / <alpha-value>)',
                    'dark-brown': 'rgb(var(--color-brand-dark-brown) / <alpha-value>)',
                    rust: 'rgb(var(--color-brand-rust) / <alpha-value>)',
                    sand: 'rgb(var(--color-brand-sand) / <alpha-value>)',
                    blood: 'rgb(var(--color-brand-blood) / <alpha-value>)',
                },
                
                // Paradigm colors
                paradigm: {
                    dolores: 'rgb(var(--color-paradigm-dolores) / <alpha-value>)',
                    teddy: 'rgb(var(--color-paradigm-teddy) / <alpha-value>)',
                    bernard: 'rgb(var(--color-paradigm-bernard) / <alpha-value>)',
                    maeve: 'rgb(var(--color-paradigm-maeve) / <alpha-value>)',
                },
                
                // Semantic colors
                // Background & Surface
                background: 'rgb(var(--color-background) / <alpha-value>)',
                surface: 'rgb(var(--color-surface) / <alpha-value>)',
                'surface-alt': 'rgb(var(--color-surface-alt) / <alpha-value>)',
                
                // Text
                'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
                'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
                'text-tertiary': 'rgb(var(--color-text-tertiary) / <alpha-value>)',
                
                // Borders
                border: 'rgb(var(--color-border) / <alpha-value>)',
                'border-strong': 'rgb(var(--color-border-strong) / <alpha-value>)',
                
                // Interactive states
                primary: 'rgb(var(--color-primary) / <alpha-value>)',
                'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
                'primary-active': 'rgb(var(--color-primary-active) / <alpha-value>)',
                
                // Status colors
                success: 'rgb(var(--color-success) / <alpha-value>)',
                warning: 'rgb(var(--color-warning) / <alpha-value>)',
                error: 'rgb(var(--color-error) / <alpha-value>)',
                info: 'rgb(var(--color-info) / <alpha-value>)',
            },
            
            // Reference CSS variables for other properties
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
            
            fontSize: {
                xs: 'var(--font-size-xs)',
                sm: 'var(--font-size-sm)',
                base: 'var(--font-size-base)',
                lg: 'var(--font-size-lg)',
                xl: 'var(--font-size-xl)',
                '2xl': 'var(--font-size-2xl)',
                '3xl': 'var(--font-size-3xl)',
                '4xl': 'var(--font-size-4xl)',
                '5xl': 'var(--font-size-5xl)',
            },
            
            fontWeight: {
                light: 'var(--font-weight-light)',
                normal: 'var(--font-weight-normal)',
                medium: 'var(--font-weight-medium)',
                semibold: 'var(--font-weight-semibold)',
                bold: 'var(--font-weight-bold)',
            },
            
            borderRadius: {
                none: 'var(--radius-none)',
                sm: 'var(--radius-sm)',
                DEFAULT: 'var(--radius-base)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                xl: 'var(--radius-xl)',
                '2xl': 'var(--radius-2xl)',
                '3xl': 'var(--radius-3xl)',
                full: 'var(--radius-full)',
            },
            
            boxShadow: {
                xs: 'var(--shadow-xs)',
                sm: 'var(--shadow-sm)',
                DEFAULT: 'var(--shadow-base)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)',
                none: 'none',
            },
            
            transitionDuration: {
                fast: 'var(--transition-fast)',
                DEFAULT: 'var(--transition-base)',
                slow: 'var(--transition-slow)',
                slower: 'var(--transition-slower)',
            },
            
            transitionTimingFunction: {
                linear: 'var(--easing-linear)',
                in: 'var(--easing-in)',
                out: 'var(--easing-out)',
                'in-out': 'var(--easing-in-out)',
            },
            
            zIndex: {
                0: 'var(--z-base)',
                10: 'var(--z-dropdown)',
                20: 'var(--z-sticky)',
                30: 'var(--z-overlay)',
                40: 'var(--z-modal)',
                50: 'var(--z-popover)',
                60: 'var(--z-tooltip)',
                70: 'var(--z-notification)',
                max: 'var(--z-max)',
            },
            
            // Optimized animations
            animation: {
                // Core animations (always available)
                'fadeIn': 'fadeIn var(--transition-base) var(--easing-out)',
                'fadeOut': 'fadeOut var(--transition-base) var(--easing-in)',
                'slideUp': 'slideUp var(--transition-slow) var(--easing-out)',
                'slideDown': 'slideDown var(--transition-slow) var(--easing-in)',
                'scaleIn': 'scaleIn var(--transition-base) var(--easing-out)',
                'scaleOut': 'scaleOut var(--transition-base) var(--easing-in)',
                'pulse': 'pulse 2s var(--easing-in-out) infinite',
                'spin': 'spin 1s linear infinite',
                // Aliases for backward compatibility
                'fade-in': 'fadeIn var(--transition-base) var(--easing-out)',
                'slide-up': 'slideUp var(--transition-slow) var(--easing-out)',
                'pulse-soft': 'pulse 2s var(--easing-in-out) infinite',
            },
            
            keyframes: {
                // Core keyframes
                fadeIn: {
                    'from': { opacity: '0' },
                    'to': { opacity: '1' }
                },
                fadeOut: {
                    'from': { opacity: '1' },
                    'to': { opacity: '0' }
                },
                slideUp: {
                    'from': { 
                        opacity: '0',
                        transform: 'translateY(10px)'
                    },
                    'to': { 
                        opacity: '1',
                        transform: 'translateY(0)'
                    }
                },
                slideDown: {
                    'from': { 
                        opacity: '1',
                        transform: 'translateY(0)'
                    },
                    'to': { 
                        opacity: '0',
                        transform: 'translateY(10px)'
                    }
                },
                scaleIn: {
                    'from': { 
                        opacity: '0',
                        transform: 'scale(0.95)'
                    },
                    'to': { 
                        opacity: '1',
                        transform: 'scale(1)'
                    }
                },
                scaleOut: {
                    'from': { 
                        opacity: '1',
                        transform: 'scale(1)'
                    },
                    'to': { 
                        opacity: '0',
                        transform: 'scale(0.95)'
                    }
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' }
                },
                spin: {
                    'from': { transform: 'rotate(0deg)' },
                    'to': { transform: 'rotate(360deg)' }
                },
                // Aliases for backward compatibility
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                'slide-up': {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' }
                },
            },
        },
    },
    // Simplified safelist - only what's actually needed
    safelist: [
        // Paradigm-specific classes that might be dynamically generated
        {
            pattern: /^(bg|text|border)-(paradigm)-(dolores|teddy|bernard|maeve)$/,
        },
    ],
    plugins: [],
}