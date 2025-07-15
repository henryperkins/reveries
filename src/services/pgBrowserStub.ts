/**
 * Browser stub for the `pg` (node-postgres) module.
 * Prevents Vite from bundling server-side PostgreSQL code into the browser build
 * while still satisfying import statements.
 * Any attempt to instantiate Pool/Client will throw at runtime.
 */
export class Pool {
  constructor() {
    throw new Error('pg.Pool is not available in the browser.');
  }
}

// Common aliases so code that does `import { Client } from "pg"` still compiles.
export const Client = Pool;
export const types = {};

// Provide a default export that mimics CommonJS’s `module.exports =`
export default {
  Pool,
  Client,
  types,
};
