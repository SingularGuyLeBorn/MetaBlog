<!--
  ChatPage - AI Chat 页面（集成到主布局版本）
-->
<template>
  <div class="chat-page-integrated">
    <ClientOnly>
      <ChatLayout />
      <template #fallback>
        <div class="loading-screen-3d">
          <div class="spinner-3d"></div>
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

.loading-screen-3d {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  color: #64748b;
}

.spinner-3d {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
