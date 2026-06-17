import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['exceljs'],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress source map warnings for dhtmlxgantt
        if (warning.code === 'SOURCEMAP_ERROR' && warning.message.includes('dhtmlxgantt')) {
          return;
        }
        warn(warning);
      }
    }
  }
});
