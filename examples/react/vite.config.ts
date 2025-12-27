import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import partialPrebundle from 'vite-plugin-partial-prebundle';

export default defineConfig({
  plugins: [
    partialPrebundle({
      includes: [
        'src/components/**/*.tsx',
      ],
      excludes: [
        'src/components/ContactForm.tsx',
        'src/components/SignupForm.tsx',
        // 'src/components/StepsTimeline.tsx',
      ]
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  }
});
