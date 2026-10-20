import { defineConfig } from 'vitest/config';

// Testes de unidade (regras de agenda, telefone, mensagem). Rápidos, sem rede.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
