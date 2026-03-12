<!--
  铠甲合体风格按钮 - Henshin Style Button
  点击时有炫酷的合体动画
-->
<template>
  <button 
    class="henshin-btn"
    :class="{ 'is-transforming': isTransforming }"
    @click="handleClick"
  >
    <span class="btn-text">
      <slot>合体</slot>
    </span>
    <span class="btn-shine"></span>
    <span class="btn-rings">
      <span class="ring"></span>
      <span class="ring"></span>
      <span class="ring"></span>
    </span>
    <span v-if="isTransforming" class="transform-flash"></span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isTransforming = ref(false)

const handleClick = (e: MouseEvent) => {
  isTransforming.value = true
  emit('click', e)
  
  setTimeout(() => {
    isTransforming.value = false
  }, 1000)
}
</script>

<style scoped>
.henshin-btn {
  position: relative;
  padding: 16px 40px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 4px;
  box-shadow: 
    0 4px 15px rgba(255, 107, 53, 0.4),
    0 0 30px rgba(255, 107, 53, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.henshin-btn:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 20px rgba(255, 107, 53, 0.5),
    0 0 40px rgba(255, 107, 53, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.henshin-btn:active {
  transform: translateY(0);
}

/* 按钮文字 */
.btn-text {
  position: relative;
  z-index: 2;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* 光泽效果 */
.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

/* 能量环 */
.btn-rings {
  position: absolute;
  inset: -10px;
  pointer-events: none;
}

.btn-rings .ring {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-radius: 50px;
  border-top-color: rgba(255, 255, 255, 0.5);
  opacity: 0;
}

.henshin-btn:hover .btn-rings .ring:nth-child(1) {
  animation: ring-rotate 1s linear infinite;
  opacity: 1;
}
.henshin-btn:hover .btn-rings .ring:nth-child(2) {
  animation: ring-rotate 1s linear infinite reverse;
  opacity: 0.7;
  inset: -5px;
}
.henshin-btn:hover .btn-rings .ring:nth-child(3) {
  animation: ring-rotate 0.8s linear infinite;
  opacity: 0.5;
  inset: -15px;
}

@keyframes ring-rotate {
  to { transform: rotate(360deg); }
}

/* 合体动画 */
.is-transforming .transform-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, transparent 70%);
  animation: flash-expand 0.5s ease-out forwards;
}

@keyframes flash-expand {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(3); opacity: 0; }
}

.is-transforming {
  animation: btn-pulse 0.3s ease-in-out;
}

@keyframes btn-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.95); }
}
</style>