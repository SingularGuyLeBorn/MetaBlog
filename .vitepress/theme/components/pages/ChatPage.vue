<!--
  ChatPage - AI Chat 页面（集成到主布局版本）
-->
<template>
  <div class="chat-page-integrated">
    <ClientOnly>
      <ChatLayout />
      <template #fallback>
        <div class="loading-screen">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ChatLayout } from '../ai-chat'
</script>

<style scoped>
.chat-page-integrated {
  height: calc(100vh - var(--vp-nav-height, 64px));
  overflow: hidden;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
  background: var(--vp-c-bg, #f8f6f3);
  color: var(--sr-text-muted, #94a3b8);
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-top-color: var(--sr-accent-star, #b8a090);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
