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
        'src/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.d.ts',
        'src/db/supabase/type.ts',
        'src/agents/models/**',
        'src/agents/graphs/**',
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        'src/db/index.ts',
        'src/db/supabase/supabase.ts',
        'src/lib/adminDb.ts',
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
