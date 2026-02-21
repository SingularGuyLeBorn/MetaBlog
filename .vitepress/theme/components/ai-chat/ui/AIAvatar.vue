<template>
  <div class="ai-avatar" :class="{ typing, 'size-small': size === 'small', 'size-large': size === 'large' }">
    <!-- 外层光晕 -->
    <div class="glow-ring glow-outer"></div>
    <!-- 中层光晕 -->
    <div class="glow-ring glow-middle"></div>
    <!-- 内层光晕 -->
    <div class="glow-ring glow-inner"></div>
    <!-- 核心光球 -->
    <div class="core">
      <div class="core-light"></div>
      <div class="core-highlight"></div>
    </div>
    <!-- 思考时的脉冲波纹 -->
    <div v-if="typing" class="pulse-rings">
      <div class="pulse-ring pulse-1"></div>
      <div class="pulse-ring pulse-2"></div>
      <div class="pulse-ring pulse-3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  typing?: boolean
  size?: 'small' | 'normal' | 'large'
}

withDefaults(defineProps<Props>(), {
  typing: false,
  size: 'normal'
})
</script>

<style scoped>
.ai-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-avatar.size-small {
  width: 32px;
  height: 32px;
}

.ai-avatar.size-large {
  width: 48px;
  height: 48px;
}

/* ===== 呼吸光晕 ===== */
.glow-ring {
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
}

/* 外层光晕 - 最慢最大 */
.glow-outer {
  width: 140%;
  height: 140%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
  animation: breathe-outer 4s ease-in-out infinite;
}

/* 中层光晕 */
.glow-middle {
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%);
  animation: breathe-middle 4s ease-in-out infinite;
  animation-delay: 0.5s;
}

/* 内层光晕 */
.glow-inner {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%);
  animation: breathe-inner 4s ease-in-out infinite;
  animation-delay: 1s;
}

/* 思考时加速呼吸 */
.ai-avatar.typing .glow-outer {
  animation: breathe-outer 2s ease-in-out infinite;
}

.ai-avatar.typing .glow-middle {
  animation: breathe-middle 2s ease-in-out infinite;
}

.ai-avatar.typing .glow-inner {
  animation: breathe-inner 2s ease-in-out infinite;
}

@keyframes breathe-outer {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

@keyframes breathe-middle {
  0%, 100% {
    transform: scale(0.85);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.9;
  }
}

@keyframes breathe-inner {
  0%, 100% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

/* ===== 核心光球 ===== */
.core {
  position: relative;
  width: 60%;
  height: 60%;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
  box-shadow: 
    0 0 20px rgba(59, 130, 246, 0.5),
    0 0 40px rgba(59, 130, 246, 0.3),
    inset 0 -2px 6px rgba(0, 0, 0, 0.2),
    inset 0 2px 6px rgba(255, 255, 255, 0.3);
  animation: core-pulse 4s ease-in-out infinite;
  z-index: 2;
}

.ai-avatar.typing .core {
  animation: core-pulse 2s ease-in-out infinite;
}

@keyframes core-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 
      0 0 20px rgba(59, 130, 246, 0.5),
      0 0 40px rgba(59, 130, 246, 0.3),
      inset 0 -2px 6px rgba(0, 0, 0, 0.2),
      inset 0 2px 6px rgba(255, 255, 255, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 
      0 0 30px rgba(59, 130, 246, 0.7),
      0 0 60px rgba(59, 130, 246, 0.5),
      inset 0 -2px 6px rgba(0, 0, 0, 0.2),
      inset 0 2px 6px rgba(255, 255, 255, 0.4);
  }
}

/* 核心内部光效 */
.core-light {
  position: absolute;
  top: 20%;
  left: 25%;
  width: 35%;
  height: 35%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, transparent 70%);
  filter: blur(1px);
}

.core-highlight {
  position: absolute;
  top: 15%;
  left: 20%;
  width: 20%;
  height: 20%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  filter: blur(2px);
}

/* ===== 思考时的脉冲波纹 ===== */
.pulse-rings {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.pulse-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(59, 130, 246, 0.6);
  opacity: 0;
}

.pulse-1 {
  width: 100%;
  height: 100%;
  animation: pulse-out 2s ease-out infinite;
}

.pulse-2 {
  width: 100%;
  height: 100%;
  animation: pulse-out 2s ease-out infinite;
  animation-delay: 0.4s;
}

.pulse-3 {
  width: 100%;
  height: 100%;
  animation: pulse-out 2s ease-out infinite;
  animation-delay: 0.8s;
}

@keyframes pulse-out {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* ===== 悬浮效果 ===== */
.ai-avatar:hover .core {
  transform: scale(1.1);
  box-shadow: 
    0 0 40px rgba(59, 130, 246, 0.8),
    0 0 80px rgba(59, 130, 246, 0.5),
    inset 0 -2px 6px rgba(0, 0, 0, 0.2),
    inset 0 2px 6px rgba(255, 255, 255, 0.4);
}

/* ===== 尺寸适配 ===== */
.ai-avatar.size-small .core {
  width: 55%;
  height: 55%;
}

.ai-avatar.size-large .core {
  width: 65%;
  height: 65%;
}
</style>
