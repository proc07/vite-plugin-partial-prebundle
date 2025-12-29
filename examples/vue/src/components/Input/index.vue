<template>
  <input type="text" v-model="inputValue">
</template>

<script setup lang="ts">
import { ref } from 'vue';

const inputValue = ref('');
</script>

<style scoped>
input {
  margin-top: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: #16a34a;
  color: white;
  cursor: pointer;
}
</style>
