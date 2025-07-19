/**
 * Unified environment-variable helper
 * -----------------------------------
 * Resolves configuration values in **both** browser (Vite) and Node.js
 * runtimes without repeating `import.meta.env` / `process.env` checks.
 *
 * Usage:
 *   const endpoint = getEnv('VITE_AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_ENDPOINT');
 *   const apiKey   = getEnv('VITE_AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY');
 *
 * The first defined & non-empty variable wins. Returns `undefined` if none
 * of the provided keys are set.
 */
export function getEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    /* Vite / browser context */
    try {
      if (typeof import.meta !== 'undefined' &&
          import.meta.env &&
          key in (import.meta.env as Record<string, unknown>)) {
        const val = (import.meta.env as Record<string, string | undefined>)[key];
        if (val) return val;
      }
    } catch {
      /* import.meta not available – ignore */
    }

    /* Node / server context */
    if (typeof process !== 'undefined' &&
        process.env &&
        key in process.env) {
      const val = process.env[key];
      if (val) return val;
    }
  }

  return undefined;
}
