/// <reference types="vite/client" />

/**
 * Custom typing for all environment variables used by the project.
 *
 * NOTE:
 *   • Only variables prefixed with **`VITE_`** will be statically injected into
 *     the client-side bundle by Vite.
 *   • Secrets that must never reach the browser (e.g. database passwords or
 *     backend-only API keys) should **NOT** be prefixed with `VITE_`.
 *   • Add or remove fields here as your `.env*` files evolve – keeping this file
 *     in sync with actual usage avoids “stringly-typed” env access across the
 *     code-base.
 */
interface ImportMetaEnv {
  /** Google-AI / Gemini key required in the browser. */
  readonly VITE_GEMINI_API_KEY?: string;

  /** XAI / Grok key required in the browser. */
  readonly VITE_XAI_API_KEY?: string;

  /** Azure OpenAI (browser-side) configuration */
  readonly VITE_AZURE_OPENAI_ENDPOINT?: string;
  readonly VITE_AZURE_OPENAI_API_KEY?: string;
  readonly VITE_AZURE_OPENAI_DEPLOYMENT?: string;
  readonly VITE_AZURE_OPENAI_API_VERSION?: string;

  /** Database settings exposed to the browser for Postgres WASM queries. */
  readonly VITE_DB_HOST?: string;
  readonly VITE_DB_PORT?: string;
  readonly VITE_DB_USER?: string;
  readonly VITE_DB_NAME?: string;
  readonly VITE_DB_PASSWORD?: string;
  readonly VITE_DB_SSL?: string;
  readonly VITE_DB_SSL_MODE?: string;

  /** Application-level configuration */
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_DEFAULT_MODEL?: string;
  readonly VITE_ENABLE_FALLBACK?: string;

  /** Rate-limiting / concurrency controls (client hints for the UI) */
  readonly VITE_AZURE_OPENAI_CONCURRENCY?: string;
  readonly VITE_MAX_RETRIES?: string;
  readonly VITE_RATE_LIMIT_TOKENS_PER_MINUTE?: string;
  readonly VITE_RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
  readonly VITE_REQUEST_TIMEOUT?: string;

  // Catch-all for additional, not-yet-typed keys
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
