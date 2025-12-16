import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
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
