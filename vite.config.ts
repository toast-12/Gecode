import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@google/generative-ai': '/node_modules/@google/generative-ai/dist/index.ts',
    },
  },
});
