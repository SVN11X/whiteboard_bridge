import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/whiteboard-bridge/',
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
  test: { include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'], environment: 'node' },
});
