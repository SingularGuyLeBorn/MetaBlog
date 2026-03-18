<template>
  <div class="armor-basic-page">
    <!-- 背景 -->
    <div class="xingtian-bg"></div>
    
    <!-- 标题 -->
    <h1 class="page-title">
      <span class="xingtian-text">刑天铠甲</span>
      <span class="fusion-text">合体</span>
    </h1>
    
    <!-- 合体动画容器 -->
    <div class="fusion-container" ref="fusionContainer" @click="startFusion">
      <!-- 召唤器 -->
      <div class="summoner-device" :class="{ active: stage === 'summon' }">
        <div class="summoner-lens">
          <div class="lens-inner"></div>
          <div class="scan-line"></div>
        </div>
        <div class="summoner-glow"></div>
      </div>
      
      <!-- 合体咒语 -->
      <div class="fusion-chant" :class="{ visible: showChant }">
        <div class="chant-text">后人发，先人至</div>
        <div class="chant-text">谋长节短，百战百胜</div>
      </div>
      
      <!-- 铠甲部件 -->
      <div class="armor-parts">
        <div class="part helmet" :class="{ flyin: stage === 'parts' }">
          <div class="part-design helmet-design">
            <div class="helmet-crown"></div>
            <div class="helmet-visor"></div>
            <div class="helmet-sides"></div>
          </div>
        </div>
        <div class="part chest" :class="{ flyin: stage === 'parts' }">
          <div class="part-design chest-design">
            <div class="chest-core"></div>
            <div class="chest-plates"></div>
          </div>
        </div>
        <div class="part left-arm" :class="{ flyin: stage === 'parts' }">
          <div class="part-design arm-design">
            <div class="arm-gauntlet"></div>
          </div>
        </div>
        <div class="part right-arm" :class="{ flyin: stage === 'parts' }">
          <div class="part-design arm-design">
            <div class="arm-gauntlet"></div>
          </div>
        </div>
        <div class="part left-leg" :class="{ flyin: stage === 'parts' }">
          <div class="part-design leg-design"></div>
        </div>
        <div class="part right-leg" :class="{ flyin: stage === 'parts' }">
          <div class="part-design leg-design"></div>
        </div>
      </div>
      
      <!-- 完整铠甲 -->
      <div class="complete-armor" :class="{ visible: stage === 'complete' }">
        <div class="armor-figure">
          <div class="armor-helmet"></div>
          <div class="armor-torso">
            <div class="armor-chest-glow"></div>
          </div>
          <div class="armor-arms"></div>
          <div class="armor-legs"></div>
          <div class="armor-aura"></div>
        </div>
      </div>
      
      <!-- 能量特效 -->
      <div class="energy-effects" :class="{ active: stage === 'parts' || stage === 'final' }">
        <div v-for="n in 6" :key="`beam-${n}`" 
             class="energy-beam" 
             :class="{ shoot: stage === 'final' }"
             :style="{ '--i': n }">
        </div>
        <div class="shockwave" :class="{ expand: stage === 'final' }"></div>
        <div class="fusion-flash" :class="{ flash: stage === 'final' }"></div>
      </div>
      
      <!-- 提示 -->
      <div class="click-hint" :class="{ fade: stage !== 'idle' }">
        <span class="hint-icon">👆</span>
        <span>点击屏幕启动合体</span>
      </div>
    </div>
    
    <!-- 控制按钮 -->
    <div class="controls">
      <button class="ctrl-btn restart" @click="startFusion" :disabled="stage !== 'complete' && stage !== 'idle'">
        <span>🔄</span> 重新合体
      </button>
      <button class="ctrl-btn pose" @click="togglePoseMode" :class="{ active: poseMode }">
        <span>🎭</span> 合体姿势
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

type Stage = 'idle' | 'summon' | 'chant' | 'parts' | 'final' | 'complete'

const stage = ref<Stage>('idle')
const showChant = ref(false)
const poseMode = ref(false)
const fusionContainer = ref<HTMLElement>()

// 合体序列
const startFusion = () => {
  if (stage.value !== 'idle' && stage.value !== 'complete') return
  
  stage.value = 'idle'
  showChant.value = false
  
  // 阶段1：召唤器出现
  setTimeout(() => {
    stage.value = 'summon'
  }, 100)
  
  // 阶段2：咒语
  setTimeout(() => {
    showChant.value = true
    stage.value = 'chant'
  }, 1500)
  
  // 阶段3：部件飞来
  setTimeout(() => {
    showChant.value = false
    stage.value = 'parts'
  }, 3500)
  
  // 阶段4：合体闪光
  setTimeout(() => {
    stage.value = 'final'
  }, 5500)
  
  // 阶段5：完成
  setTimeout(() => {
    stage.value = 'complete'
  }, 6500)
}

const togglePoseMode = () => {
  poseMode.value = !poseMode.value
}

onMounted(() => {
  // 自动播放一次
  setTimeout(startFusion, 500)
})
</script>

<style scoped>
.armor-basic-page {
  min-height: 100vh;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

/* 背景 */
.xingtian-bg {
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(ellipse at center, #1a0a0a 0%, #0a0000 100%),
    repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(139, 0, 0, 0.03) 5deg, transparent 10deg);
  z-index: -1;
}

.xingtian-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 70%, rgba(139, 0, 0, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, rgba(220, 20, 60, 0.1) 0%, transparent 40%);
}

/* 标题 */
.page-title {
  text-align: center;
  font-size: clamp(32px, 6vw, 56px);
  font-weight: 800;
  margin-bottom: 40px;
  text-transform: uppercase;
  letter-spacing: 8px;
}

.xingtian-text {
  background: linear-gradient(180deg, #dc143c 0%, #8b0000 50%, #4a0000 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(220, 20, 60, 0.5);
}

.fusion-text {
  color: #c0c0c0;
  margin-left: 16px;
}

/* 合体容器 */
.fusion-container {
  width: min(600px, 90vw);
  height: 600px;
  margin: 0 auto 40px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 24px;
  background: radial-gradient(ellipse at center, rgba(139, 0, 0, 0.1) 0%, transparent 70%);
}

/* 召唤器 */
.summoner-device {
  width: 100px;
  height: 80px;
  background: linear-gradient(145deg, #8b0000 0%, #4a0000 100%);
  border-radius: 16px;
  position: relative;
  opacity: 0;
  transform: scale(0) rotateY(180deg);
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  box-shadow: 
    0 0 30px rgba(220, 20, 60, 0.5),
    inset 0 2px 4px rgba(255, 100, 100, 0.3),
    inset 0 -2px 4px rgba(0, 0, 0, 0.5);
}

.summoner-device.active {
  opacity: 1;
  transform: scale(1) rotateY(0deg);
  animation: summonerFloat 2s ease-in-out infinite;
}

@keyframes summonerFloat {
  0%, 100% { transform: scale(1) rotateY(0deg) translateY(0); }
  50% { transform: scale(1) rotateY(0deg) translateY(-10px); }
}

.summoner-lens {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 50px;
  background: linear-gradient(145deg, #1a1a2e 0%, #0a0a1a 100%);
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #dc143c;
}

.lens-inner {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 30%, rgba(220, 20, 60, 0.8) 0%, transparent 50%);
  animation: lensPulse 1.5s ease-in-out infinite;
}

@keyframes lensPulse {
  0%, 100% { opacity: 0.6; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #dc143c, transparent);
  animation: scanLine 2s linear infinite;
}

@keyframes scanLine {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.summoner-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(220, 20, 60, 0.3) 0%, transparent 70%);
  opacity: 0;
  animation: glowPulse 1s ease-in-out infinite;
}

.summoner-device.active .summoner-glow {
  opacity: 1;
}

@keyframes glowPulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.6; }
}

/* 合体咒语 */
.fusion-chant {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0;
  transition: opacity 0.5s;
  pointer-events: none;
}

.fusion-chant.visible {
  opacity: 1;
}

.chant-text {
  font-size: 24px;
  font-weight: 700;
  color: #dc143c;
  text-shadow: 0 0 20px rgba(220, 20, 60, 0.8);
  margin: 8px 0;
  animation: chantGlow 1s ease-in-out infinite alternate;
}

@keyframes chantGlow {
  from { text-shadow: 0 0 20px rgba(220, 20, 60, 0.8); }
  to { text-shadow: 0 0 40px rgba(220, 20, 60, 1), 0 0 60px rgba(220, 20, 60, 0.5); }
}

/* 铠甲部件 */
.armor-parts {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.part {
  position: absolute;
  transition: all 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.part-design {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 头盔 */
.helmet {
  width: 80px;
  height: 100px;
  top: -150px;
  left: 50%;
  transform: translateX(-50%) rotateY(-180deg);
}

.helmet.flyin {
  top: 80px;
  transform: translateX(-50%) rotateY(0deg);
}

.helmet-design {
  background: linear-gradient(145deg, #c0c0c0 0%, #808080 50%, #404040 100%);
  border-radius: 40px 40px 20px 20px;
  border: 3px solid #dc143c;
}

.helmet-visor {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 25%;
  background: linear-gradient(180deg, #dc143c 0%, #8b0000 100%);
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(220, 20, 60, 0.6);
}

.helmet-visor::after {
  content: '';
  position: absolute;
  top: 20%;
  left: 20%;
  right: 20%;
  height: 30%;
  background: linear-gradient(90deg, transparent, rgba(255, 200, 200, 0.8), transparent);
  border-radius: 4px;
}

/* 胸甲 */
.chest {
  width: 120px;
  height: 140px;
  bottom: -200px;
  left: 50%;
  transform: translateX(-50%) scale(0.5);
}

.chest.flyin {
  bottom: 180px;
  transform: translateX(-50%) scale(1);
}

.chest-design {
  background: linear-gradient(145deg, #c0c0c0 0%, #808080 100%);
  clip-path: polygon(20% 0%, 80% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%);
  border: 3px solid #dc143c;
}

.chest-core {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, #dc143c 0%, #8b0000 100%);
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(220, 20, 60, 0.8);
  animation: corePulse 0.5s ease-in-out infinite;
}

@keyframes corePulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.1); }
}

/* 手臂 */
.left-arm, .right-arm {
  width: 50px;
  height: 120px;
  top: 200px;
}

.left-arm {
  left: -100px;
  transform: rotateZ(45deg);
}

.right-arm {
  right: -100px;
  transform: rotateZ(-45deg);
}

.left-arm.flyin {
  left: 180px;
  transform: rotateZ(0deg);
}

.right-arm.flyin {
  right: 180px;
  transform: rotateZ(0deg);
}

.arm-design {
  background: linear-gradient(90deg, #c0c0c0 0%, #808080 100%);
  border-radius: 25px;
  border: 2px solid #dc143c;
}

.arm-gauntlet {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 50px;
  background: linear-gradient(145deg, #8b0000 0%, #4a0000 100%);
  border-radius: 10px;
  border: 2px solid #dc143c;
}

/* 腿部 */
.left-leg, .right-leg {
  width: 55px;
  height: 150px;
  bottom: -200px;
}

.left-leg {
  left: 220px;
  transform: rotateZ(-30deg);
}

.right-leg {
  right: 220px;
  transform: rotateZ(30deg);
}

.left-leg.flyin {
  bottom: 20px;
  left: 240px;
  transform: rotateZ(0deg);
}

.right-leg.flyin {
  bottom: 20px;
  right: 240px;
  transform: rotateZ(0deg);
}

.leg-design {
  background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%);
  border-radius: 27px;
  border: 2px solid #dc143c;
}

/* 完整铠甲 */
.complete-armor {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.complete-armor.visible {
  opacity: 1;
  transform: scale(1);
}

.armor-figure {
  width: 200px;
  height: 400px;
  position: relative;
}

.armor-helmet {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 100px;
  background: linear-gradient(145deg, #c0c0c0 0%, #808080 50%, #404040 100%);
  border-radius: 40px 40px 20px 20px;
  border: 3px solid #dc143c;
}

.armor-helmet::after {
  content: '';
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 25%;
  background: linear-gradient(180deg, #dc143c 0%, #8b0000 100%);
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(220, 20, 60, 0.8);
}

.armor-torso {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 150px;
  background: linear-gradient(145deg, #c0c0c0 0%, #808080 100%);
  clip-path: polygon(20% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%);
  border: 3px solid #dc143c;
}

.armor-chest-glow {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 50px;
  background: radial-gradient(circle, #dc143c 0%, transparent 70%);
  border-radius: 50%;
  animation: chestGlow 1.5s ease-in-out infinite;
}

@keyframes chestGlow {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.8; }
  50% { transform: translateX(-50%) scale(1.2); opacity: 1; }
}

.armor-arms {
  position: absolute;
  top: 110px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 120px;
}

.armor-arms::before,
.armor-arms::after {
  content: '';
  position: absolute;
  width: 40px;
  height: 110px;
  background: linear-gradient(90deg, #c0c0c0 0%, #808080 100%);
  border-radius: 20px;
  border: 2px solid #dc143c;
}

.armor-arms::before { left: 0; }
.armor-arms::after { right: 0; }

.armor-legs {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 150px;
}

.armor-legs::before,
.armor-legs::after {
  content: '';
  position: absolute;
  width: 45px;
  height: 140px;
  background: linear-gradient(180deg, #c0c0c0 0%, #808080 100%);
  border-radius: 22px;
  border: 2px solid #dc143c;
}

.armor-legs::before { left: 0; }
.armor-legs::after { right: 0; }

.armor-aura {
  position: absolute;
  inset: -30px;
  background: radial-gradient(ellipse at center, rgba(220, 20, 60, 0.2) 0%, transparent 60%);
  animation: auraPulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes auraPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

/* 能量特效 */
.energy-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.energy-beam {
  position: absolute;
  width: 4px;
  height: 100px;
  background: linear-gradient(180deg, transparent, #dc143c, transparent);
  opacity: 0;
  transform-origin: bottom center;
}

.energy-beam:nth-child(1) { top: 20%; left: 20%; transform: rotate(-30deg); }
.energy-beam:nth-child(2) { top: 15%; left: 35%; transform: rotate(-15deg); }
.energy-beam:nth-child(3) { top: 10%; left: 50%; transform: rotate(0deg); }
.energy-beam:nth-child(4) { top: 15%; right: 35%; transform: rotate(15deg); }
.energy-beam:nth-child(5) { top: 20%; right: 20%; transform: rotate(30deg); }
.energy-beam:nth-child(6) { top: 30%; left: 50%; transform: rotate(180deg); }

.energy-beam.shoot {
  opacity: 1;
  animation: beamShoot 0.5s ease-out forwards;
  animation-delay: calc(var(--i) * 0.1s);
}

@keyframes beamShoot {
  0% { transform: translateY(0) scaleY(0); opacity: 1; }
  100% { transform: translateY(-200px) scaleY(1); opacity: 0; }
}

.shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border: 3px solid #dc143c;
  border-radius: 50%;
  opacity: 0;
}

.shockwave.expand {
  animation: shockwaveExpand 0.8s ease-out forwards;
}

@keyframes shockwaveExpand {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
}

.fusion-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(220, 20, 60, 0.5) 50%, transparent 70%);
  opacity: 0;
}

.fusion-flash.flash {
  animation: flashEffect 0.5s ease-out;
}

@keyframes flashEffect {
  0% { opacity: 0; }
  20% { opacity: 1; }
  100% { opacity: 0; }
}

/* 提示 */
.click-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
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

.hint-icon {
  font-size: 18px;
  animation: hintBounce 1s ease-in-out infinite;
}

@keyframes hintBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* 控制按钮 */
.controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(145deg, rgba(139, 0, 0, 0.8) 0%, rgba(74, 0, 0, 0.8) 100%);
  border: 2px solid #dc143c;
  border-radius: 24px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ctrl-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(220, 20, 60, 0.4);
}

.ctrl-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ctrl-btn.active {
  background: linear-gradient(145deg, #dc143c 0%, #8b0000 100%);
  box-shadow: 0 0 20px rgba(220, 20, 60, 0.6);
}
</style>
