import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 650,
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
