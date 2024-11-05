import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    process: {
      env: {},
      version: '1',
    },
  },
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          '@chakra-ui/react': ['@chakra-ui/react'],
          'react-apexcharts': ['react-apexcharts'],
        },
      },
    },
  },
});
