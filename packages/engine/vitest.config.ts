import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // types.ts is declarations only and featureFlags.ts is a constant record;
      // neither has executable logic to cover.
      exclude: ['src/__tests__/**', 'src/index.ts', 'src/types.ts', 'src/featureFlags.ts'],
      thresholds: { lines: 95, functions: 90, branches: 85, statements: 95 },
    },
  },
});
