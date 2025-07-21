// Plain JavaScript config (avoids esbuild requirement)
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

// __dirname is not available in ECMAScript modules by default. The following
// recreates the same value so the rest of the configuration can stay the same
// regardless of the module system used to load this file.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    optimizeDeps: {
      include: [
        'buffer',
        'util',
        'crypto-browserify',
        'stream-browserify',
        'process/browser',
      ],
      exclude: ['pg'],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        // Polyfill globals & core modules during dependency optimization
        plugins: [
          NodeGlobalsPolyfillPlugin({
            buffer: true,
            process: true,
          }),
          NodeModulesPolyfillPlugin(),
        ],
      },
    },

    css: {
      postcss: './postcss.config.js',
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Use stub for browser builds
        azureOpenAIService:
          mode === 'production'
            ? path.resolve(__dirname, './src/services/azureOpenAIStub.ts')
            : path.resolve(__dirname, './src/services/azureOpenAIService.ts'),
        databaseService: path.resolve(
          __dirname,
          './src/services/databaseServiceStub.ts',
        ),
        pg: path.resolve(__dirname, './src/services/pgBrowserStub.ts'),

        // Node.js polyfills and explicit aliases
        buffer: 'buffer',
        util: 'util',
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        process: 'process/browser',
        'util/': 'util',
        'node:util': 'util',
        'node:buffer': 'buffer',
        'node:crypto': 'crypto-browserify',
        'node:stream': 'stream-browserify',
        'node:process': 'process/browser',
      },
    },

    define: {
      // Make environment variables available
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
        env.VITE_GEMINI_API_KEY || '',
      ),
      'import.meta.env.VITE_XAI_API_KEY': JSON.stringify(
        env.VITE_XAI_API_KEY || '',
      ),
      'import.meta.env.VITE_AZURE_OPENAI_ENDPOINT': JSON.stringify(
        env.VITE_AZURE_OPENAI_ENDPOINT || '',
      ),
      'import.meta.env.VITE_AZURE_OPENAI_API_KEY':
        mode === 'production'
          ? '""'
          : JSON.stringify(env.VITE_AZURE_OPENAI_API_KEY || ''),
      'import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT': JSON.stringify(
        env.VITE_AZURE_OPENAI_DEPLOYMENT || 'o3',
      ),
      'import.meta.env.VITE_AZURE_OPENAI_API_VERSION': JSON.stringify(
        env.VITE_AZURE_OPENAI_API_VERSION || '2024-10-01-preview',
      ),

      // Node.js globals for browser
      global: 'globalThis',
      'globalThis.global': 'globalThis',
      'window.global': 'globalThis',
      'process.env': '{}',
      'process.version': '"v20.0.0"',
      'process.versions': '{}',
      'process.versions.node': '"20.0.0"',
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'ai-services': [
              './src/services/geminiService',
              './src/services/grokService',
              './src/services/azureOpenAIService',
            ],
          },
        },
      },
    },

    server: {
      // Explicit dev-server port and HMR client port
      port: 5175,
      strictPort: true, // Fail if 5175 is taken instead of auto-incrementing
      hmr: {
        clientPort: 5175, // Ensure websocket uses same port
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
