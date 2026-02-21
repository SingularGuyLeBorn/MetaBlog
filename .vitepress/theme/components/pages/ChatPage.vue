<!--
  ChatPage - AI Chat 页面（浅色主题版本）
-->
<template>
  <div class="chat-page">
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
.chat-page {
  height: 100vh;
  overflow: hidden;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
  background: #f8fafc;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
