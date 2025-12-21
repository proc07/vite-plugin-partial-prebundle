import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import partialPrebundle from 'vite-plugin-partial-prebundle';

export default defineConfig({
  plugins: [
    partialPrebundle({
      includes: [
        'src/components/RegistrationForm.vue',
        'src/components/FeedbackForm.vue',
      ],
    }),
    vue(),
  ],
});
