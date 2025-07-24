import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Optimize CSS output
    cssCodeSplit: true,
    // Ensure development files are not included
    rollupOptions: {
      external: (id) => {
        // Exclude debug CSS files from production build
        if (id.includes('debug-visibility.css') || id.includes('fix-visibility.css')) {
          return true;
        }
        return false;
      },
    },
    // Enable CSS minification
    cssMinify: true,
    // Generate source maps for debugging
    sourcemap: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})