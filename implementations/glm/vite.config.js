import { defineConfig } from 'vite';

// base relativo para que el build funcione en GitHub Pages bajo cualquier subruta
// (p. ej. https://<usuario>.github.io/<repo>/). Si se necesita una ruta fija,
// exportar VITE_BASE o cambiar esta línea.
export default defineConfig({
  base: process.env.VITE_BASE || './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node'
  }
});
