import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(projectRoot, 'src/renderer'),
  base: './',
  build: {
    outDir: resolve(projectRoot, 'dist/renderer'),
    emptyOutDir: true,
  },
});