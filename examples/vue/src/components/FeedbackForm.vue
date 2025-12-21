<template>
  <form class="card" @submit.prevent="handleSubmit">
    <h2>提交反馈</h2>
    <label class="field">
      优先级
      <select v-model="priority">
        <option>高</option>
        <option>中</option>
        <option>低</option>
      </select>
    </label>
    <label class="field">
      标题
      <input v-model="title" placeholder="表单功能体验" />
    </label>
    <label class="field">
      描述
      <textarea v-model="detail" placeholder="描述问题或建议" />
    </label>
    <button type="submit">发送</button>
    <p v-if="submitted" class="hint">已收到反馈：{{ title || '未命名' }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const priority = ref('高');
const title = ref('');
const detail = ref('');
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

input,
select,
textarea {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

textarea {
  min-height: 90px;
  resize: vertical;
}

button {
  margin-top: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: #16a34a;
  color: white;
  cursor: pointer;
}

.hint {
  color: #16a34a;
  margin: 0;
  font-size: 13px;
}
</style>
