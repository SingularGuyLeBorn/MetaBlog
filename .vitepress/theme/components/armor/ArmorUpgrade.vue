<template>
  <div class="armor-upgrade-page">
    <div class="upgrade-bg"></div>
    
    <h1 class="page-title">
      <span class="warrior-text">战神</span>
      <span class="upgrade-text">升级</span>
    </h1>
    
    <div class="upgrade-container" @click="startUpgrade">
      <!-- 升级前形态 -->
      <div class="base-form" :class="{ shrink: stage === 'upgrade' || stage === 'complete' }">
        <div class="base-figure">
          <div class="base-helmet"></div>
          <div class="base-body"></div>
          <div class="base-aura"></div>
        </div>
      </div>
      
      <!-- 升级特效 -->
      <div class="upgrade-effects" :class="{ active: stage === 'upgrade' }">
        <div class="upgrade-ring" v-for="n in 3" :key="`ring-${n}`" :style="{ '--i': n }"></div>
        <div class="upgrade-energy"></div>
        <div class="upgrade-lightning" v-for="n in 5" :key="`lightning-${n}`"></div>
      </div>
      
      <!-- 战神形态 -->
      <div class="warrior-form" :class="{ visible: stage === 'complete' }">
        <div class="warrior-figure">
          <div class="warrior-helmet">
            <div class="helmet-horns"></div>
            <div class="helmet-crest"></div>
          </div>
          <div class="warrior-body">
            <div class="body-armor"></div>
            <div class="crystal-core"></div>
          </div>
          <div class="warrior-wings" :class="{ spread: wingsOpen }"></div>
          <div class="warrior-aura"></div>
        </div>
      </div>
      
      <!-- 升级文字 -->
      <div class="upgrade-text-effect" :class="{ show: stage === 'upgrade' }">
        <span>战神刑天</span>
      </div>
      
      <div class="click-hint" :class="{ fade: stage !== 'idle' }">
        <span>👆 点击升级</span>
      </div>
    </div>
    
    <div class="controls">
      <button class="ctrl-btn" @click="startUpgrade" :disabled="stage !== 'idle' && stage !== 'complete'">
        🔄 重新升级
      </button>
      <button class="ctrl-btn" @click="toggleWings" :class="{ active: wingsOpen }">
        🦅 展开翅膀
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

type Stage = 'idle' | 'upgrade' | 'complete'

const stage = ref<Stage>('idle')
const wingsOpen = ref(false)

const startUpgrade = () => {
  if (stage.value !== 'idle' && stage.value !== 'complete') return
  
  stage.value = 'idle'
  wingsOpen.value = false
  
  setTimeout(() => {
    stage.value = 'upgrade'
  }, 100)
  
  setTimeout(() => {
    stage.value = 'complete'
    wingsOpen.value = true
  }, 3000)
}

const toggleWings = () => {
  if (stage.value === 'complete') {
    wingsOpen.value = !wingsOpen.value
  }
}

onMounted(() => {
  setTimeout(startUpgrade, 800)
})
</script>

<style scoped>
.armor-upgrade-page {
  min-height: 100vh;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

.upgrade-bg {
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(ellipse at center, #1a0a1a 0%, #0a000a 100%),
    conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(138, 43, 226, 0.05) 30deg, transparent 60deg);
  z-index: -1;
}

.upgrade-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(220, 20, 60, 0.1) 0%, transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(138, 43, 226, 0.1) 0%, transparent 40%);
}

.page-title {
  text-align: center;
  font-size: clamp(32px, 6vw, 56px);
  font-weight: 800;
  margin-bottom: 40px;
  letter-spacing: 8px;
}

.warrior-text {
  background: linear-gradient(180deg, #ffd700 0%, #ff8c00 50%, #8b4513 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.upgrade-text {
  color: #c0c0c0;
  margin-left: 16px;
}

.upgrade-container {
  width: min(500px, 90vw);
  height: 500px;
  margin: 0 auto 40px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 24px;
  background: radial-gradient(ellipse at center, rgba(138, 43, 226, 0.1) 0%, transparent 70%);
}

/* 基础形态 */
.base-form {
  position: absolute;
  transition: all 1s ease;
}

.base-form.shrink {
  transform: scale(0.5);
  opacity: 0;
}

.base-figure {
  width: 150px;
  height: 300px;
  position: relative;
}

.base-helmet {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 90px;
  background: linear-gradient(145deg, #c0c0c0, #808080);
  border-radius: 35px 35px 15px 15px;
  border: 2px solid #dc143c;
}

.base-body {
  position: absolute;
  top: 90px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 180px;
  background: linear-gradient(145deg, #c0c0c0, #606060);
  clip-path: polygon(20% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%);
  border: 2px solid #dc143c;
}

.base-aura {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(220, 20, 60, 0.2) 0%, transparent 60%);
  animation: baseAura 2s ease-in-out infinite;
}

@keyframes baseAura {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

/* 升级特效 */
.upgrade-effects {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.upgrade-effects.active {
  opacity: 1;
}

.upgrade-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border: 3px solid;
  border-color: #ffd700 transparent #ffd700 transparent;
  border-radius: 50%;
  opacity: 0;
}

.upgrade-effects.active .upgrade-ring {
  animation: ringExpand 1.5s ease-out forwards;
  animation-delay: calc(var(--i) * 0.3s);
}

@keyframes ringExpand {
  0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(3) rotate(360deg); opacity: 0; }
}

.upgrade-energy {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 50%);
  opacity: 0;
}

.upgrade-effects.active .upgrade-energy {
  animation: energyBurst 1s ease-out forwards;
}

@keyframes energyBurst {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

.upgrade-lightning {
  position: absolute;
  width: 3px;
  height: 100px;
  background: linear-gradient(180deg, transparent, #ffd700, transparent);
  opacity: 0;
}

.upgrade-effects.active .upgrade-lightning:nth-child(3) { top: 10%; left: 20%; animation: lightning 0.2s ease-out 0.5s; }
.upgrade-effects.active .upgrade-lightning:nth-child(4) { top: 5%; left: 40%; animation: lightning 0.2s ease-out 0.7s; }
.upgrade-effects.active .upgrade-lightning:nth-child(5) { top: 8%; left: 60%; animation: lightning 0.2s ease-out 0.9s; }
.upgrade-effects.active .upgrade-lightning:nth-child(6) { top: 12%; left: 80%; animation: lightning 0.2s ease-out 1.1s; }
.upgrade-effects.active .upgrade-lightning:nth-child(7) { top: 15%; left: 50%; animation: lightning 0.2s ease-out 1.3s; }

@keyframes lightning {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

/* 战神形态 */
.warrior-form {
  position: absolute;
  opacity: 0;
  transform: scale(1.2);
  transition: all 0.8s ease;
}

.warrior-form.visible {
  opacity: 1;
  transform: scale(1);
}

.warrior-figure {
  width: 200px;
  height: 400px;
  position: relative;
}

.warrior-helmet {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 110px;
  background: linear-gradient(145deg, #ffd700 0%, #ff8c00 50%, #8b4513 100%);
  border-radius: 45px 45px 20px 20px;
  border: 3px solid #ffd700;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
}

.helmet-horns {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 40px;
}

.helmet-horns::before,
.helmet-horns::after {
  content: '';
  position: absolute;
  width: 15px;
  height: 50px;
  background: linear-gradient(180deg, #ffd700, #ff8c00);
  border-radius: 50%;
}

.helmet-horns::before { left: 0; transform: rotate(-20deg); }
.helmet-horns::after { right: 0; transform: rotate(20deg); }

.helmet-crest {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 30px;
  background: linear-gradient(180deg, #dc143c, #8b0000);
  clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
}

.warrior-body {
  position: absolute;
  top: 110px;
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  height: 220px;
}

.body-armor {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #ffd700 0%, #ff8c00 50%, #8b4513 100%);
  clip-path: polygon(15% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%, 0% 15%);
  border: 3px solid #ffd700;
}

.crystal-core {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 50px;
  background: radial-gradient(circle, #dc143c 0%, #8b0000 100%);
  border-radius: 50%;
  box-shadow: 0 0 40px rgba(220, 20, 60, 0.8);
  animation: crystalPulse 1s ease-in-out infinite;
}

@keyframes crystalPulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.15); }
}

.warrior-wings {
  position: absolute;
  top: 120px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 150px;
  opacity: 0;
  transition: all 0.8s ease;
}

.warrior-wings.spread {
  opacity: 1;
}

.warrior-wings::before,
.warrior-wings::after {
  content: '';
  position: absolute;
  width: 120px;
  height: 150px;
  background: linear-gradient(145deg, rgba(255, 215, 0, 0.8) 0%, rgba(220, 20, 60, 0.6) 100%);
  border-radius: 50% 0;
  border: 2px solid #ffd700;
  transform-origin: bottom center;
}

.warrior-wings.spread::before {
  left: 0;
  transform: rotate(-30deg);
  animation: wingFlapLeft 2s ease-in-out infinite;
}

.warrior-wings.spread::after {
  right: 0;
  transform: rotate(30deg) scaleX(-1);
  animation: wingFlapRight 2s ease-in-out infinite;
}

@keyframes wingFlapLeft {
  0%, 100% { transform: rotate(-30deg); }
  50% { transform: rotate(-40deg); }
}

@keyframes wingFlapRight {
  0%, 100% { transform: rotate(30deg) scaleX(-1); }
  50% { transform: rotate(40deg) scaleX(-1); }
}

.warrior-aura {
  position: absolute;
  inset: -40px;
  background: 
    radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 50%),
    radial-gradient(circle, rgba(220, 20, 60, 0.2) 30%, transparent 60%);
  animation: warriorAura 2s ease-in-out infinite;
}

@keyframes warriorAura {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
}

/* 升级文字特效 */
.upgrade-text-effect {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 36px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  opacity: 0;
  pointer-events: none;
}

.upgrade-text-effect.show {
  animation: textFlash 1s ease-out forwards;
}

@keyframes textFlash {
  0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.2); }
  100% { opacity: 0; transform: translateX(-50%) scale(1.5); }
}

/* 提示 */
.click-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 24px;
  font-size: 14px;
  color: #c0c0c0;
  transition: opacity 0.5s;
}

.click-hint.fade {
  opacity: 0;
}

/* 控制按钮 */
.controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.ctrl-btn {
  padding: 12px 24px;
  background: linear-gradient(145deg, rgba(255, 215, 0, 0.8) 0%, rgba(255, 140, 0, 0.8) 100%);
  border: 2px solid #ffd700;
  border-radius: 24px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ctrl-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 215, 0, 0.4);
}

.ctrl-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ctrl-btn.active {
  background: linear-gradient(145deg, #ffd700 0%, #ff8c00 100%);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
}
</style>
