<!--
  Avatar - 用户/AI 头像组件（3D 液态玻璃风格）
-->
<template>
  <div class="avatar" :class="[type, { typing }]">
    <!-- 3D 光晕背景 -->
    <div v-if="type === 'user'" class="avatar-glow"></div>
    
    <div class="avatar-inner">
      <!-- 用户头像：3D 球体效果 -->
      <template v-if="type === 'user'">
        <div class="avatar-3d-sphere">
          <span class="avatar-icon">👤</span>
          <div class="sphere-highlight"></div>
          <div class="sphere-shadow"></div>
        </div>
      </template>
      
      <!-- AI 头像 -->
      <template v-else>
        <span class="avatar-icon">🤖</span>
        <div v-if="typing" class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </template>
    </div>
    
    <!-- 动态边框 -->
    <div v-if="type === 'user'" class="avatar-ring"></div>
    
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
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  perspective: 1000px;
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

/* ========== 用户头像 - 3D 球体效果 ========== */
.avatar.user {
  transform-style: preserve-3d;
}

.avatar.user .avatar-inner {
  background: transparent;
  box-shadow: none;
}

/* 3D 球体容器 */
.avatar-3d-sphere {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%);
  box-shadow: 
    /* 外发光 */
    0 0 20px rgba(59, 130, 246, 0.5),
    0 0 40px rgba(59, 130, 246, 0.3),
    /* 3D 立体阴影 */
    inset -2px -2px 6px rgba(0, 0, 0, 0.3),
    inset 2px 2px 6px rgba(255, 255, 255, 0.3),
    /* 底部阴影 */
    0 10px 20px rgba(30, 64, 175, 0.4);
  transform-style: preserve-3d;
  animation: float 3s ease-in-out infinite;
  transition: transform 0.3s ease;
}

/* 悬浮动画 */
@keyframes float {
  0%, 100% {
    transform: translateY(0) rotateX(0) rotateY(0);
  }
  25% {
    transform: translateY(-3px) rotateX(5deg) rotateY(5deg);
  }
  50% {
    transform: translateY(-6px) rotateX(0) rotateY(10deg);
  }
  75% {
    transform: translateY(-3px) rotateX(-5deg) rotateY(5deg);
  }
}

/* 鼠标悬停时增强 3D 效果 */
.avatar.user:hover .avatar-3d-sphere {
  transform: scale(1.1) rotateY(15deg) rotateX(10deg);
  box-shadow: 
    0 0 30px rgba(59, 130, 246, 0.7),
    0 0 60px rgba(59, 130, 246, 0.4),
    inset -2px -2px 6px rgba(0, 0, 0, 0.3),
    inset 2px 2px 6px rgba(255, 255, 255, 0.4),
    0 15px 30px rgba(30, 64, 175, 0.5);
}

/* 光泽高光效果 */
.sphere-highlight {
  position: absolute;
  top: 8%;
  left: 15%;
  width: 30%;
  height: 25%;
  background: radial-gradient(ellipse at center, 
    rgba(255, 255, 255, 0.8) 0%, 
    rgba(255, 255, 255, 0.3) 40%, 
    transparent 70%);
  border-radius: 50%;
  transform: rotate(-45deg);
  pointer-events: none;
}

/* 底部阴影层 */
.sphere-shadow {
  position: absolute;
  bottom: -15%;
  left: 50%;
  transform: translateX(-50%);
  width: 70%;
  height: 30%;
  background: radial-gradient(ellipse at center, 
    rgba(30, 64, 175, 0.4) 0%, 
    transparent 70%);
  border-radius: 50%;
  filter: blur(4px);
  animation: shadow-pulse 3s ease-in-out infinite;
}

@keyframes shadow-pulse {
  0%, 100% {
    transform: translateX(-50%) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translateX(-50%) scale(0.8);
    opacity: 0.3;
  }
}

/* 外部光晕效果 */
.avatar-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, 
    rgba(59, 130, 246, 0.4) 0%, 
    rgba(59, 130, 246, 0.1) 40%, 
    transparent 70%);
  border-radius: 50%;
  animation: glow-pulse 2s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes glow-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.3;
  }
}

/* 旋转边框 */
.avatar-ring {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    rgba(59, 130, 246, 0.6) 20%,
    rgba(147, 197, 253, 0.8) 40%,
    rgba(59, 130, 246, 0.6) 60%,
    transparent 80%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  padding: 2px;
  animation: ring-rotate 3s linear infinite;
  pointer-events: none;
}

@keyframes ring-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 用户图标 */
.avatar.user .avatar-icon {
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  z-index: 1;
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
