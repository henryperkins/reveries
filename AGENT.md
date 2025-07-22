# Reveries Agent Instructions

## Build/Test Commands
- `npm run dev` - Start development server (port 5175)
- `npm run build` - Production build
- `npm run type-check` - TypeScript type checking  
- `npm run build:check` - Type check + build
- `npm run lint` - ESLint + Stylelint
- `npm run lint:fix` - Auto-fix linting issues
- `npm test` - Run Vitest tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run db:test` - Test database connection
- `npm run db:init` - Initialize database
- `npm run db:start` - Start Postgres via Docker

## Architecture
**React + TypeScript + Vite** research assistant app with **Westworld-themed UI**. Multi-paradigm research workflow with AI integrations (Azure OpenAI, Gemini, XAI).

**Key directories:**
- `src/components/` - React components (ui/, atoms/, feature-specific)
- `src/services/` - AI services + database layer
- `src/database/` - PostgreSQL schema + migrations
- `src/contexts/` - React Context providers
- `src/utils/` - Utility functions
- `api/research.ts` - Backend API

**Features:** Research graphs, progress tracking, paradigm dashboard, function calling dock

## Code Style & Conventions
- **Imports:** React first, external libs, then internal with `@/` alias
- **Components:** PascalCase names, TypeScript interfaces for props, `React.forwardRef` for reusables
- **Props:** Extend HTML attributes, optional with defaults (`variant = 'primary'`)
- **Error handling:** Error boundaries, optional chaining, try-catch in async ops
- **Styling:** Tailwind CSS + design tokens, mobile-first responsive, safe area support
- **Files:** kebab-case for files, organized by feature/function
- **Types:** Strict TypeScript, no implicit any, union types for variants
