<!--
  ChatPage - AI Chat 页面(集成到主布局版本)
-->
<template>
  <div class="chat-page-integrated">
    <ClientOnly>
      <ChatLayout />
      <template #fallback>
        <div class="loading-screen">
          <div class="loading-orbits">
            <div class="orbit orbit-1"></div>
            <div class="orbit orbit-2"></div>
            <div class="orbit orbit-3"></div>
            <div class="loading-core">AI</div>
          </div>
          <p class="loading-text">正在连接 AI 助手...</p>
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ChatLayout } from '@/theme/components/ai-chat';
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
  gap: 24px;
  background: var(--vp-c-bg, #f8f6f3);
  color: var(--sr-text-muted, #94a3b8);
}

/* Orbital Loading Animation */
.loading-orbits {
  position: relative;
  width: 120px;
  height: 120px;
}

.orbit {
  position: absolute;
  border: 2px solid transparent;
  border-radius: 50%;
  border-top-color: var(--sr-accent-star, #b8a090);
  border-right-color: rgba(184, 160, 144, 0.3);
}

.orbit-1 {
  width: 120px;
  height: 120px;
  top: 0;
  left: 0;
  animation: orbit-spin 2s linear infinite;
}

.orbit-2 {
  width: 90px;
  height: 90px;
  top: 15px;
  left: 15px;
  animation: orbit-spin 1.5s linear infinite reverse;
}

.orbit-3 {
  width: 60px;
  height: 60px;
  top: 30px;
  left: 30px;
  animation: orbit-spin 1s linear infinite;
}

.loading-core {
  position: absolute;
  width: 40px;
  height: 40px;
  top: 40px;
  left: 40px;
  background: var(--sr-glass-bg);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--sr-accent-star);
  box-shadow: 0 4px 20px rgba(184, 160, 144, 0.3);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes orbit-spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(184, 160, 144, 0.3);
  }
  50% {
    box-shadow: 0 4px 30px rgba(184, 160, 144, 0.5), 0 0 60px rgba(184, 160, 144, 0.2);
  }
}

.loading-text {
  font-size: 14px;
  letter-spacing: 0.05em;
  margin: 0;
}

/* Loading Dots */
.loading-dots {
  display: flex;
  gap: 8px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: var(--sr-accent-star);
  border-radius: 50%;
  animation: dot-bounce 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
