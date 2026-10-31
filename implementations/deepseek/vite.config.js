import { defineConfig } from 'vite';

// base relativo: permite publicar en GitHub Pages bajo cualquier subruta
// (https://usuario.github.io/nombre-repositorio/) sin recompilar.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022'
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    reporters: 'default'
  }
});
