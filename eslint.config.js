import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
    {
        // Global ignores
        ignores: [
            'generated/*',
            'node_modules/',
            'dist/',
            'build/',
            '.next/',
            'out/',
            '*.min.js',
            '*.d.ts',
            'coverage/',
            '.env*',
            '.vscode/',
            '.idea/',
            '*.log',
            '.DS_Store',
            'Thumbs.db'
        ]
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        plugins: {
            '@typescript-eslint': typescript,
            'react': react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh
        },
        settings: {
            react: {
                version: 'detect'
            }
        },
        rules: {
            // React rules
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

            // TypeScript rules
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                ignoreRestSiblings: true
            }],

            // General JavaScript rules
            'no-console': 'off',
            'no-debugger': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
            'no-duplicate-imports': 'error',
            'no-unused-labels': 'error',
            'no-irregular-whitespace': 'error'
        }
    },
    {
        // JavaScript files configuration
        files: ['**/*.{js,mjs,cjs}'],
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-require-imports': 'off'
        }
    },
    {
        // Test files configuration
        files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'off'
        }
    },
    {
        // Configuration files
        files: ['*.config.{js,ts}', '*.config.*.{js,ts}', '**/*.config.{js,ts}'],
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
];
'@typescript-eslint/naming-convention': 'off',

    // React rules
    'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

            // General best practices - only critical errors
            'no-console': 'off', // Too common in this codebase
                'no-debugger': 'error',
                    'prefer-const': 'error',
                        'no-var': 'error',
                            'eqeqeq': 'off', // Can be gradually introduced
                                'curly': 'off', // Too many violations to fix at once
                                    'no-duplicate-imports': 'error',
                                        'no-unused-labels': 'error',
                                            'no-irregular-whitespace': 'error',
                                                'no-trailing-spaces': 'off',
                                                    'no-multiple-empty-lines': 'off',
                                                        'comma-dangle': 'off',
                                                            'semi': 'off',
                                                                'quotes': 'off',
                                                                    'indent': 'off',
                                                                        'object-curly-spacing': 'off',
                                                                            'array-bracket-spacing': 'off',
                                                                                'computed-property-spacing': 'off',
                                                                                    'space-before-function-paren': 'off',
                    },
                },

// JavaScript files configuration (relaxed rules)
{
    files: ['**/*.{js,mjs,cjs}'],
                    extends: [js.configs.recommended],
        languageOptions: {
        globals: {
                            ...globals.node,
                        },
    },
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-var-requires': 'off',
                    '@typescript-eslint/no-require-imports': 'off',
                        '@typescript-eslint/no-unsafe-assignment': 'off',
                            '@typescript-eslint/no-unsafe-member-access': 'off',
                                '@typescript-eslint/no-unsafe-call': 'off',
                                    '@typescript-eslint/no-unsafe-return': 'off',
                                        '@typescript-eslint/no-explicit-any': 'off',
                                            '@typescript-eslint/no-unsafe-argument': 'off',
                                                '@typescript-eslint/naming-convention': 'off',
                                                    '@typescript-eslint/prefer-nullish-coalescing': 'off',
                                                        '@typescript-eslint/prefer-optional-chain': 'off',
                    },
},

// Test files configuration
{
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
        rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                    '@typescript-eslint/no-unsafe-assignment': 'off',
                        '@typescript-eslint/no-unsafe-member-access': 'off',
                            '@typescript-eslint/no-unsafe-call': 'off',
                                '@typescript-eslint/no-unsafe-return': 'off',
                                    '@typescript-eslint/no-unsafe-argument': 'off',
                                        '@typescript-eslint/unbound-method': 'off',
                                            'no-console': 'off',
                                                '@typescript-eslint/naming-convention': 'off',
                    },
},

// Configuration files configuration
{
    files: ['*.config.{js,ts}', '*.config.*.{js,ts}', '**/*.config.{js,ts}'],
        rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-var-requires': 'off',
                    '@typescript-eslint/no-require-imports': 'off',
                        '@typescript-eslint/no-unsafe-assignment': 'off',
                            '@typescript-eslint/no-explicit-any': 'off',
                                '@typescript-eslint/no-unsafe-argument': 'off',
                                    '@typescript-eslint/naming-convention': 'off',
                    },
}
)
