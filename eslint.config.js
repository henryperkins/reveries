import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    // Global ignores
    {
        ignores: [
            'dist',
            'src/test',
            'src/tests',
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            '**/__tests__/**/*',
            'src/stories/**/*',
            'node_modules',
            '.vite',
            'build',
            'coverage',
            '*.config.js',
            '*.config.ts',
            'vite.config.js',  // Add this line
            'vite-env.d.ts',
            'actions-runner',
            '.github/actions',
            'workflows-starter/**/*',
            'src/tests/manualIntegrationTest.ts',
            'src/tests/systemExhaustiveTest.ts',
            'src/tests/azureIntegrationTest.ts',
            'src/generated/**/*'
        ]
    },

    // Base JavaScript configuration
    {
        ...js.configs.recommended,
        files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    },

    // TypeScript configuration with strict rules
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            ...tseslint.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
                ...globals.es2020,
            },
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],

            // Core TypeScript rules - only critical errors
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                ignoreRestSiblings: true,
            }],

            // Type safety rules - relaxed for gradual adoption
            '@typescript-eslint/no-explicit-any': 'off', // Too many to fix at once
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/restrict-plus-operands': 'off',
            '@typescript-eslint/no-base-to-string': 'off',

            // Code style rules - warnings only
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/prefer-readonly': 'off',
            '@typescript-eslint/no-var-requires': 'error',
            '@typescript-eslint/no-require-imports': 'error',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
            '@typescript-eslint/await-thenable': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/consistent-generic-constructors': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-redundant-type-constituents': 'off',
            '@typescript-eslint/prefer-nullish-coalescing': 'off',
            '@typescript-eslint/prefer-optional-chain': 'off',

            // Naming conventions - off for now
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
