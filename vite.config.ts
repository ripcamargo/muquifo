import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // O Bootstrap 5.3 ainda usa @import e funções globais do Sass;
        // os avisos de depreciação vêm dele, não do nosso código.
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // O SDK do Firebase (~180 KB gzip) fica num pacote próprio, baixado só no agendamento/painel.
    chunkSizeWarningLimit: 700,
  },
});
