import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import partialPrebundle from 'vite-plugin-partial-prebundle';

export default defineConfig({
  plugins: [
    partialPrebundle({
      includes: [
        'src/components/*.tsx',
        // 'src/components/*/*.tsx',
        'src/components/ContactForm/ContactForm.tsx',
        'src/components/SignupForm/SignupForm.tsx',
        'src/components/LoadingResources/LoadingResources.tsx',
      ],
      excludes: [
        // 'src/components/ContactForm/ContactForm.tsx',
        // 'src/components/SignupForm/SignupForm.tsx',
        'src/components/StepsTimeline.tsx',
      ],
      internal: []
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  }
});
