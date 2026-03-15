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
  server: {
    host: true,
  },
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@chakra-ui/react')) return '@chakra-ui/react';
          if (id.includes('node_modules/react-apexcharts') || id.includes('node_modules/apexcharts')) return 'react-apexcharts';
          if (id.includes('node_modules/recharts')) return 'recharts';
        },
      },
    },
  },
});
