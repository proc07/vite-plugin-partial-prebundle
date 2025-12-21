<template>
  <main class="page">
    <section>
      <h1>Partial prebundle demo (Vue)</h1>
      <p class="muted">
        下方两个组件作为入口预打包，改动后仅重建命中的入口并通过 HMR 更新。
      </p>
    </section>
    <section class="grid">
      <RegistrationForm />
      <FeedbackForm />
    </section>
  </main>
</template>

<script setup lang="ts">
import FeedbackForm from './components/FeedbackForm.vue';
import RegistrationForm from './components/RegistrationForm.vue';
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;
}

h1 {
  margin: 0 0 0.75rem 0;
}

.muted {
  color: #5f6a86;
  margin: 0 0 1.75rem 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
}
</style>
