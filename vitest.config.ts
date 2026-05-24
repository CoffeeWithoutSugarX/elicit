import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/agents/**/*.ts',
        'src/lib/katexHelpers.ts',
        'src/lib/numerals.ts',
        'src/lib/theme.ts',
        'src/lib/relativeTime.ts',
        'src/lib/utils.ts',
        'src/types/enums/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.d.ts',
        'src/agents/models/**',
        'src/agents/graphs/**',
        'src/agents/nodes/ChatNode.ts',
        'src/agents/prompts/vision/OcrPrompt.ts',
      ],
      thresholds: { lines: 90, branches: 90 },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
