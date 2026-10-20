import { defineConfig } from 'vitest/config';

// Testes das regras do Firestore: exigem o emulador rodando (veja o README).
export default defineConfig({
  test: { include: ['tests/rules/**/*.test.ts'], testTimeout: 20_000, fileParallelism: false },
});
