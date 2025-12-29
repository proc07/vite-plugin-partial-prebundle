import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import partialPrebundle, {getAllComponentPaths} from 'vite-plugin-partial-prebundle';

getAllComponentPaths('src/components/*')

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
