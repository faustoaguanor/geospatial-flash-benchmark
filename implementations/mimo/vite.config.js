import { defineConfig } from 'vite';

export default defineConfig({
  // base './' permite desplegar bajo una subruta de GitHub Pages
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    reporters: ['default'],
  },
});
