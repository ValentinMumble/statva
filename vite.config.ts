import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';

/**
 * Writes the service worker (sw/sw.js) into the build, with an id that changes with the build and the files it keeps
 * on the device: all of them, but for the fonts only the Latin ones (the others come when a page needs them).
 */
const serviceWorker = (): Plugin => ({
  name: 'statva-service-worker',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const files = Object.keys(bundle)
      .filter(fileName => fileName.startsWith('assets/') && !fileName.endsWith('.woff'))
      .filter(fileName => !fileName.endsWith('.woff2') || /-latin(-ext)?-/.test(fileName))
      .map(fileName => `/${fileName}`)
      .sort();
    const page = bundle['index.html'];
    const pageSource = page && 'asset' === page.type ? String(page.source) : String(Date.now());
    const build = createHash('sha256').update(files.join('\n')).update(pageSource).digest('hex').slice(0, 12);
    const source = readFileSync('sw/sw.js', 'utf8')
      .replace('__BUILD__', build)
      .replace(/\[\s*\/\* FILES \*\/\s*\]/, JSON.stringify(files));
    this.emitFile({type: 'asset', fileName: 'sw.js', source});
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
    // The dev server has no server functions: shared rides are read from the live site, so a
    // share link opens here too (/w/<id>). Reading one needs no login.
    proxy: {'/api/activity': {target: 'https://statva.vumble.dev', changeOrigin: true}},
  },
  plugins: [react(), serviceWorker()],
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
