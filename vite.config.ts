import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Use stub for browser builds
        './azureOpenAIService': mode === 'production'
          ? path.resolve(__dirname, './services/azureOpenAIStub.ts')
          : path.resolve(__dirname, './services/azureOpenAIService.ts'),
      },
    },
    define: {
      // Make environment variables available
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
      'import.meta.env.VITE_XAI_API_KEY': JSON.stringify(env.VITE_XAI_API_KEY || ''),
      'import.meta.env.VITE_AZURE_OPENAI_ENDPOINT': JSON.stringify(env.VITE_AZURE_OPENAI_ENDPOINT || ''),
      'import.meta.env.VITE_AZURE_OPENAI_API_KEY': mode === 'production' ? '""' : JSON.stringify(env.VITE_AZURE_OPENAI_API_KEY || ''),
      'import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT': JSON.stringify(env.VITE_AZURE_OPENAI_DEPLOYMENT || 'o3-mini'),
      'import.meta.env.VITE_AZURE_OPENAI_API_VERSION': JSON.stringify(env.VITE_AZURE_OPENAI_API_VERSION || '2024-10-01-preview'),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'ai-services': ['./services/geminiService', './services/grokService', './services/azureOpenAIService'],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
