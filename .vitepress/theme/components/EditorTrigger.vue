<script setup lang="ts">
import { useAppStore } from '../stores/app'

const store = useAppStore()
</script>

<template>
  <button class="edit-trigger" @click="store.toggleEditor()" title="Edit Page">
    <span class="icon">✏️</span>
    <span class="text">Edit</span>
  </button>
</template>

<style scoped>
.edit-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 36px;
  border-radius: 18px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border: 1px solid var(--vp-c-brand-dimm);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  margin-left: 12px;
}

.edit-trigger:hover {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.icon {
  font-size: 16px;
}
</style>
