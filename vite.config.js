import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index:  resolve(__dirname, 'index.html'),
        level2: resolve(__dirname, 'level2.html'),
        level3: resolve(__dirname, 'level3.html'),
      }
    }
  },
  assetsInclude: ['**/*.glb', '**/*.hdr'],
  server: { open: false }
});
