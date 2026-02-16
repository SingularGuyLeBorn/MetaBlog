<script setup lang="ts">
import { ref } from 'vue'
import { useData, useRoute } from 'vitepress'
import PageEditor from './PageEditor.vue'

const { page } = useData()
const route = useRoute()

const showEditor = ref(false)

// 判断当前页面是否可编辑（排除首页和特殊页面）
const isEditable = () => {
  // 首页不显示编辑按钮
  if (route.path === '/' || route.path === '/index.html') {
    return false
  }
  // 需要有文件路径
  return !!page.value.relativePath
}

const openEditor = () => {
  if (!isEditable()) return
  showEditor.value = true
}
</script>

<template>
  <!-- 浮动编辑按钮 -->
  <Transition name="fab">
    <button
      v-if="isEditable()"
      class="edit-fab"
      @click="openEditor"
      title="编辑当前页面"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <span>编辑</span>
    </button>
  </Transition>
  
  <!-- 页面编辑器 -->
  <PageEditor v-model="showEditor" />
</template>

<style scoped>
.edit-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 50px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  box-shadow: 0 4px 16px rgba(22, 119, 255, 0.35);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.edit-fab:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(22, 119, 255, 0.45);
  background: var(--vp-c-brand-dark);
}

.edit-fab:active {
  transform: translateY(0) scale(0.98);
}

/* 当右侧 TOC 显示时，调整按钮位置 */
@media (min-width: 1280px) {
  .edit-fab {
    right: 300px;
  }
}

/* 平板端 */
@media (max-width: 1279px) {
  .edit-fab {
    right: 20px;
    bottom: 80px; /* 避免与 TOC FAB 重叠 */
  }
}

/* 移动端 */
@media (max-width: 768px) {
  .edit-fab {
    right: 16px;
    bottom: 80px;
    padding: 10px 16px;
  }
  
  .edit-fab span {
    display: none;
  }
}

/* Animation */
.fab-enter-active,
.fab-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}
</style>
