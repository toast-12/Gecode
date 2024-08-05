import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@google/generative-ai': '/node_modules/@google/generative-ai/dist/index.ts',
      'base64-js': '/node_modules/base64-js/base64js.min.js' // 필요한 경우 경로 수정
    },
  },
});
