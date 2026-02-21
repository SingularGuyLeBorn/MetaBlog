<!--
  Avatar - 用户/AI 头像组件（浅色主题）
-->
<template>
  <div class="avatar" :class="[type, { typing }]">
    <div class="avatar-inner">
      <span v-if="type === 'user'" class="avatar-icon">👤</span>
      <template v-else>
        <span class="avatar-icon">🤖</span>
        <div v-if="typing" class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </template>
    </div>
    <div v-if="showStatus" class="avatar-status" :class="status"></div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type: 'user' | 'ai'
  typing?: boolean
  status?: 'online' | 'offline' | 'busy'
  showStatus?: boolean
}

withDefaults(defineProps<Props>(), {
  typing: false,
  status: 'online',
  showStatus: false
})
</script>

<style scoped>
.avatar {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.avatar-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ai-radius-full);
  font-size: 20px;
  transition: all var(--ai-transition-fast);
}

/* 用户头像 */
.avatar.user .avatar-inner {
  background: linear-gradient(135deg, var(--ai-primary-500) 0%, var(--ai-primary-600) 100%);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

/* AI 头像 */
.avatar.ai .avatar-inner {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.avatar.typing .avatar-inner {
  animation: breathe 2s ease-in-out infinite;
}

/* 打字指示器 */
.typing-dots {
  position: absolute;
  bottom: -4px;
  right: -4px;
  display: flex;
  gap: 2px;
  padding: 4px 6px;
  background: white;
  border-radius: 10px;
  box-shadow: var(--ai-shadow-sm);
}

.typing-dots span {
  width: 4px;
  height: 4px;
  background: var(--ai-primary-500);
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

/* 状态指示器 */
.avatar-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.avatar-status.online {
  background: var(--ai-accent-500);
}

.avatar-status.offline {
  background: var(--ai-gray-400);
}

.avatar-status.busy {
  background: #f59e0b;
}
</style>
