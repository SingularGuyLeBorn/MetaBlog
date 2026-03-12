<!--
  刑天铠甲合体动画 - Armor Transformation Animation
  页面加载时的炫酷合体效果
-->
<template>
  <Transition name="armor-transform" @after-leave="onComplete">
    <div v-if="show" class="armor-overlay">
      <!-- 能量核心 -->
      <div class="energy-core">
        <div class="core-inner"></div>
        <div class="core-ring ring-1"></div>
        <div class="core-ring ring-2"></div>
        <div class="core-ring ring-3"></div>
      </div>
      
      <!-- 铠甲部件 - 左侧 -->
      <div class="armor-piece left-helmet"></div>
      <div class="armor-piece left-chest"></div>
      <div class="armor-piece left-arm"></div>
      
      <!-- 铠甲部件 - 右侧 -->
      <div class="armor-piece right-helmet"></div>
      <div class="armor-piece right-chest"></div>
      <div class="armor-piece right-arm"></div>
      
      <!-- 能量文字 -->
      <div class="transform-text">
        <span v-for="(char, i) in textChars" :key="i" :style="{ animationDelay: `${i * 0.1}s` }">
          {{ char }}
        </span>
      </div>
      
      <!-- 光效 -->
      <div class="light-beam beam-1"></div>
      <div class="light-beam beam-2"></div>
      <div class="light-beam beam-3"></div>
      
      <!-- 粒子效果 -->
      <div class="particles">
        <span v-for="n in 20" :key="n" class="particle" :style="getParticleStyle(n)"></span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const props = defineProps<{
  duration?: number
}>()

const emit = defineEmits<{
  complete: []
}>()

const show = ref(true)
const text = '刑天铠甲·合体'
const textChars = computed(() => text.split(''))

const getParticleStyle = (n: number) => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 2}s`,
  animationDuration: `${1 + Math.random()}s`
})

onMounted(() => {
  setTimeout(() => {
    show.value = false
  }, props.duration || 2500)
})

const onComplete = () => {
  emit('complete')
}
</script>

<style scoped>
.armor-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 能量核心 */
.energy-core {
  position: relative;
  width: 200px;
  height: 200px;
}

.core-inner {
  position: absolute;
  inset: 40px;
  background: radial-gradient(circle, #ff6b35 0%, #f7931e 40%, transparent 70%);
  border-radius: 50%;
  animation: core-pulse 0.8s ease-in-out infinite;
}

.core-ring {
  position: absolute;
  border: 3px solid transparent;
  border-radius: 50%;
  border-top-color: #ff6b35;
  border-right-color: rgba(255, 107, 53, 0.5);
}

.ring-1 {
  inset: 0;
  animation: ring-spin 2s linear infinite;
}

.ring-2 {
  inset: 20px;
  animation: ring-spin 1.5s linear infinite reverse;
}

.ring-3 {
  inset: 60px;
  border-width: 2px;
  animation: ring-spin 1s linear infinite;
}

@keyframes core-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

@keyframes ring-spin {
  to { transform: rotate(360deg); }
}

/* 铠甲部件 */
.armor-piece {
  position: absolute;
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #a0a0a0 100%);
  border: 2px solid #ff6b35;
  box-shadow: 
    0 0 20px rgba(255, 107, 53, 0.5),
    inset 0 0 20px rgba(255, 255, 255, 0.3);
}

.left-helmet {
  width: 150px;
  height: 200px;
  left: -200px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 0 100px 100px 0;
  clip-path: polygon(0 0, 100% 20%, 100% 80%, 0 100%);
  animation: slide-in-left 0.6s ease-out 0.5s forwards;
}

.right-helmet {
  width: 150px;
  height: 200px;
  right: -200px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 100px 0 0 100px;
  clip-path: polygon(100% 0, 0 20%, 0 80%, 100% 100%);
  animation: slide-in-right 0.6s ease-out 0.5s forwards;
}

.left-chest {
  width: 200px;
  height: 250px;
  left: -250px;
  top: 55%;
  clip-path: polygon(0 0, 100% 10%, 90% 90%, 0 100%);
  animation: slide-in-left 0.6s ease-out 0.7s forwards;
}

.right-chest {
  width: 200px;
  height: 250px;
  right: -250px;
  top: 55%;
  clip-path: polygon(100% 0, 0 10%, 10% 90%, 100% 100%);
  animation: slide-in-right 0.6s ease-out 0.7s forwards;
}

.left-arm {
  width: 100px;
  height: 300px;
  left: -150px;
  top: 60%;
  border-radius: 50px 0 0 50px;
  animation: slide-in-left 0.6s ease-out 0.9s forwards;
}

.right-arm {
  width: 100px;
  height: 300px;
  right: -150px;
  top: 60%;
  border-radius: 0 50px 50px 0;
  animation: slide-in-right 0.6s ease-out 0.9s forwards;
}

@keyframes slide-in-left {
  to { left: 50%; transform: translateX(-100%) translateY(-50%); opacity: 0; }
}

@keyframes slide-in-right {
  to { right: 50%; transform: translateX(100%) translateY(-50%); opacity: 0; }
}

/* 能量文字 */
.transform-text {
  position: absolute;
  bottom: 20%;
  font-size: 48px;
  font-weight: 900;
  color: transparent;
  -webkit-text-stroke: 2px #ff6b35;
  text-shadow: 0 0 30px rgba(255, 107, 53, 0.8);
  display: flex;
  gap: 8px;
}

.transform-text span {
  opacity: 0;
  transform: translateY(20px);
  animation: char-appear 0.3s ease-out forwards;
}

@keyframes char-appear {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 光效 */
.light-beam {
  position: absolute;
  width: 2px;
  height: 100%;
  background: linear-gradient(to bottom, transparent, #ff6b35, transparent);
  opacity: 0;
}

.beam-1 {
  left: 30%;
  animation: beam-flash 0.5s ease-out 1.2s forwards;
}

.beam-2 {
  left: 50%;
  animation: beam-flash 0.5s ease-out 1.3s forwards;
}

.beam-3 {
  left: 70%;
  animation: beam-flash 0.5s ease-out 1.4s forwards;
}

@keyframes beam-flash {
  0% { opacity: 0; transform: scaleY(0); }
  50% { opacity: 1; transform: scaleY(1); }
  100% { opacity: 0; transform: scaleY(0); }
}

/* 粒子 */
.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #ff6b35;
  border-radius: 50%;
  box-shadow: 0 0 10px #ff6b35;
  animation: particle-float linear infinite;
}

@keyframes particle-float {
  0%, 100% {
    transform: translateY(100vh) scale(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) scale(1);
    opacity: 0;
  }
}

/* Transition */
.armor-transform-enter-active,
.armor-transform-leave-active {
  transition: all 0.5s ease-out;
}

.armor-transform-leave-to {
  opacity: 0;
  transform: scale(1.1);
}
</style>