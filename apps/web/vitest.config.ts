import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
  },
  // Components are tested by rendering them, so JSX has to compile here. The
  // automatic runtime matches tsconfig's "jsx": "preserve" plus Next's own
  // transform, so a component behaves in a test the way it does in the app.
  esbuild: { jsx: 'automatic' },
});
