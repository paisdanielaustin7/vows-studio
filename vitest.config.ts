import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/money/**/*.ts', 'lib/utils/**/*.ts', 'lib/validations/**/*.ts'],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        'lib/money/**': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        'lib/validations/**': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/mocks/empty.ts'),
    },
  },
});
