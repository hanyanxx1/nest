import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    projects: [
      {
        test: {
          name: 'unit',
          include: ['**/*.spec.ts'],
        },
      },
      fileURLToPath(new URL('./vitest.config.e2e.ts', import.meta.url)),
    ],
  },
});
