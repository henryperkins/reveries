import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
    ],
    optimizeDeps: {
      include: ['buffer', 'util', 'crypto-browserify', 'stream-browserify'],
      exclude: ['pg'],
      esbuildOptions: {
        // Define global for esbuild
        define: {
          global: 'globalThis',
        },
      },
    },
    css: {
      postcss: './postcss.config.js'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Use stub for browser builds
        azureOpenAIService: mode === 'production'
          ? path.resolve(__dirname, './src/services/azureOpenAIStub.ts')
          : path.resolve(__dirname, './src/services/azureOpenAIService.ts'),
        databaseService: path.resolve(__dirname, './src/services/databaseServiceStub.ts'),
        'pg': path.resolve(__dirname, './src/services/pgBrowserStub.ts'),
        // Node.js polyfills
        buffer: 'buffer',
        util: 'util',
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        process: 'process/browser',
      },
    },
    define: {
      // Make environment variables available
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
      'import.meta.env.VITE_XAI_API_KEY': JSON.stringify(env.VITE_XAI_API_KEY || ''),
      'import.meta.env.VITE_AZURE_OPENAI_ENDPOINT': JSON.stringify(env.VITE_AZURE_OPENAI_ENDPOINT || ''),
      'import.meta.env.VITE_AZURE_OPENAI_API_KEY': mode === 'production' ? '""' : JSON.stringify(env.VITE_AZURE_OPENAI_API_KEY || ''),
      'import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT': JSON.stringify(env.VITE_AZURE_OPENAI_DEPLOYMENT || 'o3'),
      'import.meta.env.VITE_AZURE_OPENAI_API_VERSION': JSON.stringify(env.VITE_AZURE_OPENAI_API_VERSION || '2024-10-01-preview'),
      // Properly define globals
      global: 'globalThis',
      'window.global': 'window',
      'process.env': '{}',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'ai-services': ['./src/services/geminiService', './src/services/grokService', './src/services/azureOpenAIService'],
          },
        },
      },
    },
    server: {
      // Explicit dev-server port and HMR client port
      port: 5175,
      strictPort: true,        // Fail if 5175 is taken instead of auto-incrementing
      hmr: {
        clientPort: 5175,      // Ensure websocket uses same port
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
