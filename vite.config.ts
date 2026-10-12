import react from '@vitejs/plugin-react';
import {existsSync, readFileSync} from 'fs';
import {defineConfig, Plugin} from 'vite';

// The local data files hold real rides, so they stay out of public/ (which is copied into
// every build) and are only served by the dev server.
const devData = (): Plugin => ({
  name: 'dev-data',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const match = request.url?.match(/^\/(local_[a-z_]+\.json)$/);
      const file = match && `dev-data/${match[1]}`;

      if (!file || !existsSync(file)) return next();

      response.setHeader('Content-Type', 'application/json');
      response.end(readFileSync(file));
    });
  },
});

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
  plugins: [react(), devData()],
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
