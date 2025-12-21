<template>
  <form class="card" @submit.prevent="handleSubmit">
    <h2>注册账号</h2>
    <label class="field">
      姓名
      <input v-model="name" placeholder="张三" />
    </label>
    <label class="field">
      邮箱
      <input v-model="email" type="email" placeholder="hi@example.com" />
    </label>
    <label class="field">
      公司
      <input v-model="company" placeholder="Acme Inc." />
    </label>
    <button type="submit">提交</button>
    <p v-if="submitted" class="hint">感谢注册，{{ name || '访客' }}。</p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const name = ref('');
const email = ref('');
const company = ref('');
const submitted = ref(false);

const handleSubmit = () => {
  submitted.value = true;
};
</script>

<style scoped>
.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  display: grid;
  gap: 12px;
}

h2 {
  margin: 0;
}

.field {
  display: grid;
  gap: 6px;
  color: #374151;
  font-size: 14px;
}

input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

button {
  margin-top: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: #2563eb;
  color: white;
  cursor: pointer;
}

.hint {
  color: #2563eb;
  margin: 0;
  font-size: 13px;
}
</style>
