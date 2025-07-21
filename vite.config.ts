import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendors
          'react-vendor': ['react', 'react-dom'],
          'langchain': ['langchain', '@langchain/community', '@langchain/openai'],
          'azure': ['@azure/openai'],
          'lucide': ['lucide-react'],
          // Add more as needed based on your dependencies
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB to reduce warnings
  },
});
