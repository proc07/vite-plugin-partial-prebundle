import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import partialPrebundle from 'vite-plugin-partial-prebundle';

export default defineConfig({
  plugins: [
    partialPrebundle({
      includes: [
        'src/components/SignupForm.tsx',
        'src/components/ContactForm.tsx',
      ],
    }),
    react(),
  ],
});
