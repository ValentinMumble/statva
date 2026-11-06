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
    // The dev server has no server functions: shared rides are read from the live site, so a
    // share link opens here too (/w/<id>). Reading one needs no login.
    proxy: {'/api/activity': {target: 'https://statva.vumble.dev', changeOrigin: true}},
  },
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@chakra-ui/react')) return '@chakra-ui/react';
          if (id.includes('node_modules/recharts')) return 'recharts';
        },
      },
    },
  },
});
