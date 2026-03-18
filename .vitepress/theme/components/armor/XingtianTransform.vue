<template>
  <div class="xingtian-container">
    <!-- 背景特效 -->
    <div class="bg-effects">
      <div class="digital-rain"></div>
      <div class="energy-field"></div>
    </div>

    <!-- 阶段1: 召唤器出现 -->
    <div class="summoner-camera" :class="{ 
      appear: stage >= 1, 
      active: stage >= 2,
      insert: stage >= 3 
    }">
      <div class="camera-body">
        <div class="camera-lens">
          <div class="lens-glass"></div>
          <div class="scan-line" v-if="stage === 2"></div>
          <div class="reticle" v-if="stage === 2">
            <div class="crosshair-h"></div>
            <div class="crosshair-v"></div>
            <div class="focus-box"></div>
          </div>
        </div>
        <div class="camera-flash"></div>
        <div class="camera-brand">ARMOR HERO</div>
      </div>
      
      <!-- 召唤卡 -->
      <div class="summon-card" :class="{ insert: stage >= 3 }">
        <div class="card-front">
          <div class="card-symbol">刑</div>
          <div class="card-pattern"></div>
        </div>
      </div>
    </div>

    <!-- 阶段2: 身份识别文字 -->
    <div class="identity-verify" v-if="stage === 2">
      <div class="verify-text">身份识别中...</div>
      <div class="verify-bar">
        <div class="verify-progress"></div>
      </div>
    </div>

    <!-- 阶段3: 腰带出现 -->
    <div class="belt-device" :class="{ appear: stage >= 4, activate: stage >= 5 }">
      <div class="belt-strap-left"></div>
      <div class="belt-strap-right"></div>
      <div class="belt-core">
        <div class="core-center">
          <div class="taiji-symbol" :class="{ rotate: stage >= 5 }"></div>
        </div>
        <div class="core-lights">
          <div class="light" v-for="n in 8" :key="n" :style="{ '--i': n }"></div>
        </div>
      </div>
      <!-- 召唤器安装在腰带上 -->
      <div class="camera-mounted" :class="{ mounted: stage >= 4 }">
        <div class="mounted-lens"></div>
      </div>
    </div>

    <!-- 阶段4: 合体咒语 -->
    <div class="fusion-chant" :class="{ show: stage >= 5 && stage < 7 }">
      <div class="chant-line1">后人发，先人至</div>
      <div class="chant-line2">谋长节短，百战百胜</div>
    </div>

    <!-- 阶段5: 能量爆发 -->
    <div class="energy-burst" :class="{ burst: stage >= 6 }">
      <div class="burst-ring" v-for="n in 3" :key="n" :style="{ '--i': n }"></div>
      <div class="burst-core"></div>
    </div>

    <!-- 阶段6: 铠甲部件飞来 -->
    <div class="armor-parts" v-if="stage >= 6">
      <!-- 腰带先出现 -->
      <div class="part belt-part" :class="{ assemble: stage >= 6 }">
        <div class="waist-armor"></div>
      </div>
      <!-- 胸甲 -->
      <div class="part chest-part" :class="{ assemble: stage >= 7 }">
        <div class="chest-plate">
          <div class="chest-core"></div>
        </div>
      </div>
      <!-- 肩甲 -->
      <div class="part shoulder-left" :class="{ assemble: stage >= 7 }"></div>
      <div class="part shoulder-right" :class="{ assemble: stage >= 7 }"></div>
      <!-- 头盔 -->
      <div class="part helmet-part" :class="{ assemble: stage >= 8 }">
        <div class="helmet-main">
          <div class="visor"></div>
          <div class="crest"></div>
        </div>
      </div>
      <!-- 手臂 -->
      <div class="part arm-left" :class="{ assemble: stage >= 8 }"></div>
      <div class="part arm-right" :class="{ assemble: stage >= 8 }"></div>
      <!-- 腿部 -->
      <div class="part leg-left" :class="{ assemble: stage >= 9 }"></div>
      <div class="part leg-right" :class="{ assemble: stage >= 9 }"></div>
    </div>

    <!-- 完整铠甲剪影 -->
    <div class="complete-armor" :class="{ reveal: stage >= 10 }">
      <div class="armor-silhouette">
        <div class="sil-head">
          <div class="sil-visor"></div>
          <div class="sil-crest"></div>
        </div>
        <div class="sil-torso">
          <div class="sil-core"></div>
        </div>
        <div class="sil-arms">
          <div class="sil-arm-left"></div>
          <div class="sil-arm-right"></div>
        </div>
        <div class="sil-legs">
          <div class="sil-leg-left"></div>
          <div class="sil-leg-right"></div>
        </div>
      </div>
      <div class="armor-aura"></div>
    </div>

    <!-- 最终完成特效 -->
    <div class="final-flash" v-if="stage === 10"></div>

    <!-- 控制UI -->
    <div class="controls">
      <button class="transform-btn" @click="startTransform" :disabled="stage > 0 && stage < 10">
        {{ stage === 0 || stage === 10 ? '刑天铠甲，合体！' : '合体中...' }}
      </button>
      <div class="stage-indicator">阶段: {{ stage }}/10</div>
    </div>

    <!-- 提示 -->
    <div class="hint" v-if="stage === 0">点击按钮开始合体</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const stage = ref(0)
let timer: number | null = null

const startTransform = () => {
  if (stage.value > 0 && stage.value < 10) return
  
  stage.value = 0
  if (timer) clearInterval(timer)
  
  // 阶段递进
  const stages = [
    { s: 1, delay: 0 },      // 召唤器出现
    { s: 2, delay: 800 },    // 对准眼睛识别
    { s: 3, delay: 2000 },   // 插入召唤卡
    { s: 4, delay: 3000 },   // 装到腰带
    { s: 5, delay: 4000 },   // 念咒语
    { s: 6, delay: 5500 },   // 能量爆发
    { s: 7, delay: 6500 },   // 胸甲肩甲
    { s: 8, delay: 7500 },   // 头盔手臂
    { s: 9, delay: 8500 },   // 腿部
    { s: 10, delay: 9500 },  // 完成
  ]
  
  stages.forEach(({ s, delay }) => {
    setTimeout(() => { stage.value = s }, delay)
  })
}
</script>

<style scoped>
.xingtian-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0f 0%, #1a0a0f 50%, #0f0a0a 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Microsoft YaHei', sans-serif;
}

/* 背景特效 */
.bg-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.digital-rain {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(180deg, transparent 0%, rgba(220, 20, 60, 0.03) 50%, transparent 100%);
  background-size: 100% 200%;
  animation: digitalRain 3s linear infinite;
}

@keyframes digitalRain {
  0% { background-position: 0 0; }
  100% { background-position: 0 200%; }
}

.energy-field {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 50% 50%, rgba(220, 20, 60, 0.1) 0%, transparent 50%);
}

/* 召唤器相机 */
.summoner-camera {
  position: relative;
  width: 200px;
  height: 160px;
  opacity: 0;
  transform: scale(0.5) translateY(100px);
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 10;
}

.summoner-camera.appear {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.camera-body {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #2a2a3a 0%, #1a1a2a 50%, #0a0a1a 100%);
  border-radius: 20px;
  border: 3px solid #8b0000;
  box-shadow: 
    0 0 40px rgba(220, 20, 60, 0.4),
    inset 0 2px 4px rgba(255, 100, 100, 0.2),
    inset 0 -2px 4px rgba(0, 0, 0, 0.5);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.camera-lens {
  width: 100px;
  height: 100px;
  background: linear-gradient(145deg, #0a0a0f 0%, #1a1a2f 100%);
  border-radius: 50%;
  border: 4px solid #dc143c;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 0 30px rgba(220, 20, 60, 0.5),
    inset 0 0 20px rgba(220, 20, 60, 0.2);
}

.lens-glass {
  position: absolute;
  inset: 10px;
  background: radial-gradient(circle at 30% 30%, rgba(220, 20, 60, 0.4) 0%, transparent 50%);
  border-radius: 50%;
}

/* 扫描线 */
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #00ff00, transparent);
  animation: scanMove 1.5s ease-in-out infinite;
  box-shadow: 0 0 10px #00ff00;
}

@keyframes scanMove {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

/* 瞄准镜 */
.reticle {
  position: absolute;
  inset: 0;
}

.crosshair-h, .crosshair-v {
  position: absolute;
  background: rgba(0, 255, 0, 0.6);
}

.crosshair-h {
  top: 50%;
  left: 20%;
  right: 20%;
  height: 1px;
}

.crosshair-v {
  left: 50%;
  top: 20%;
  bottom: 20%;
  width: 1px;
}

.focus-box {
  position: absolute;
  top: 35%;
  left: 35%;
  width: 30%;
  height: 30%;
  border: 2px solid rgba(0, 255, 0, 0.8);
  animation: focusPulse 0.5s ease-in-out infinite;
}

@keyframes focusPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(0.9); opacity: 1; }
}

.camera-flash {
  position: absolute;
  top: 10px;
  right: 15px;
  width: 20px;
  height: 15px;
  background: linear-gradient(145deg, #fff, #ccc);
  border-radius: 3px;
  opacity: 0.8;
}

.camera-brand {
  position: absolute;
  bottom: 10px;
  font-size: 10px;
  color: #dc143c;
  letter-spacing: 2px;
  font-weight: bold;
}

/* 召唤卡 */
.summon-card {
  position: absolute;
  width: 60px;
  height: 90px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) translateX(-150px) rotateY(-90deg);
  opacity: 0;
  transition: all 0.8s ease;
}

.summon-card.insert {
  transform: translate(-50%, -50%) translateX(0) rotateY(0deg);
  opacity: 1;
}

.card-front {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #dc143c 0%, #8b0000 100%);
  border-radius: 8px;
  border: 2px solid #ffd700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(220, 20, 60, 0.6);
}

.card-symbol {
  font-size: 32px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
}

.card-pattern {
  position: absolute;
  inset: 5px;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 4px;
}

/* 身份识别 */
.identity-verify {
  position: absolute;
  top: 20%;
  text-align: center;
  z-index: 20;
}

.verify-text {
  font-size: 18px;
  color: #00ff00;
  text-shadow: 0 0 10px #00ff00;
  margin-bottom: 10px;
}

.verify-bar {
  width: 200px;
  height: 4px;
  background: rgba(0, 255, 0, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.verify-progress {
  height: 100%;
  background: #00ff00;
  width: 0;
  animation: verifyLoad 1s ease-out forwards;
  box-shadow: 0 0 10px #00ff00;
}

@keyframes verifyLoad {
  to { width: 100%; }
}

/* 腰带 */
.belt-device {
  position: absolute;
  width: 300px;
  height: 120px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.5s ease;
  z-index: 5;
}

.belt-device.appear {
  opacity: 1;
  transform: scale(1);
}

.belt-strap-left, .belt-strap-right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100px;
  height: 40px;
  background: linear-gradient(90deg, #1a1a2e, #2a2a3e);
  border: 2px solid #444;
}

.belt-strap-left { left: 0; border-radius: 10px 0 0 10px; }
.belt-strap-right { right: 0; border-radius: 0 10px 10px 0; }

.belt-core {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: linear-gradient(145deg, #2a2a3a 0%, #1a1a2a 100%);
  border-radius: 50%;
  border: 3px solid #dc143c;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(220, 20, 60, 0.4);
}

.core-center {
  width: 60px;
  height: 60px;
  background: #0a0a0f;
  border-radius: 50%;
  border: 2px solid #444;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.taiji-symbol {
  width: 40px;
  height: 40px;
  background: 
    radial-gradient(circle at 50% 25%, #fff 0%, #fff 20%, transparent 20%),
    radial-gradient(circle at 50% 75%, #000 0%, #000 20%, transparent 20%),
    linear-gradient(90deg, #fff 50%, #000 50%);
  border-radius: 50%;
  position: relative;
  opacity: 0.7;
}

.taiji-symbol.rotate {
  animation: taijiRotate 2s linear infinite;
}

@keyframes taijiRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.core-lights .light {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #dc143c;
  border-radius: 50%;
  box-shadow: 0 0 10px #dc143c;
  opacity: 0;
}

.belt-device.activate .core-lights .light {
  opacity: 1;
  animation: lightBlink 0.5s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.1s);
}

.core-lights .light:nth-child(1) { top: 5px; left: 50%; transform: translateX(-50%); }
.core-lights .light:nth-child(2) { top: 20%; right: 10%; }
.core-lights .light:nth-child(3) { top: 50%; right: 5px; transform: translateY(-50%); }
.core-lights .light:nth-child(4) { bottom: 20%; right: 10%; }
.core-lights .light:nth-child(5) { bottom: 5px; left: 50%; transform: translateX(-50%); }
.core-lights .light:nth-child(6) { bottom: 20%; left: 10%; }
.core-lights .light:nth-child(7) { top: 50%; left: 5px; transform: translateY(-50%); }
.core-lights .light:nth-child(8) { top: 20%; left: 10%; }

@keyframes lightBlink {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; box-shadow: 0 0 15px #dc143c; }
}

/* 安装的召唤器 */
.camera-mounted {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%) translateY(-50px);
  width: 80px;
  height: 60px;
  background: linear-gradient(145deg, #2a2a3a 0%, #1a1a2a 100%);
  border-radius: 10px;
  border: 2px solid #dc143c;
  opacity: 0;
  transition: all 0.5s ease;
}

.camera-mounted.mounted {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.mounted-lens {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, rgba(220, 20, 60, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  animation: lensGlow 1s ease-in-out infinite;
}

@keyframes lensGlow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* 合体咒语 */
.fusion-chant {
  position: absolute;
  top: 15%;
  text-align: center;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.5s ease;
  z-index: 20;
}

.fusion-chant.show {
  opacity: 1;
  transform: translateY(0);
}

.chant-line1, .chant-line2 {
  font-size: 28px;
  font-weight: 800;
  color: #dc143c;
  text-shadow: 
    0 0 20px rgba(220, 20, 60, 0.8),
    0 0 40px rgba(220, 20, 60, 0.4);
  margin: 10px 0;
  letter-spacing: 4px;
}

.chant-line2 {
  font-size: 32px;
  animation: chantPulse 0.8s ease-in-out infinite alternate;
}

@keyframes chantPulse {
  from { text-shadow: 0 0 20px rgba(220, 20, 60, 0.8); }
  to { text-shadow: 0 0 40px rgba(220, 20, 60, 1), 0 0 60px rgba(220, 20, 60, 0.6); }
}

/* 能量爆发 */
.energy-burst {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
}

.energy-burst.burst {
  opacity: 1;
}

.burst-ring {
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

.energy-burst.burst .burst-ring {
  animation: burstExpand 1s ease-out forwards;
  animation-delay: calc(var(--i) * 0.2s);
}

@keyframes burstExpand {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
}

.burst-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(220, 20, 60, 0.6) 0%, transparent 50%);
  opacity: 0;
}

.energy-burst.burst .burst-core {
  animation: coreFlash 0.5s ease-out forwards;
}

@keyframes coreFlash {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

/* 铠甲部件 */
.armor-parts {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.part {
  position: absolute;
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* 腰带部分 */
.belt-part {
  bottom: -100px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
}

.belt-part.assemble {
  bottom: 80px;
  opacity: 1;
}

.waist-armor {
  width: 140px;
  height: 60px;
  background: linear-gradient(145deg, #c0c0c0 0%, #808080 100%);
  border-radius: 10px;
  border: 3px solid #dc143c;
  position: relative;
}

.waist-armor::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, #dc143c 0%, #8b0000 100%);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(220, 20, 60, 0.8);
}

/* 胸甲 */
.chest-part {
  top: -150px;
  left: 50%;
  transform: translateX(-50%) scale(0.5);
  opacity: 0;
}

.chest-part.assemble {
  top: 140px;
  transform: translateX(-50%) scale(1);
  opacity: 1;
}

.chest-plate {
  width: 120px;
  height: 130px;
  background: linear-gradient(145deg, #d4d4d4 0%, #a0a0a0 50%, #606060 100%);
  clip-path: polygon(20% 0%, 80% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%);
  border: 3px solid #dc143c;
  position: relative;
}

.chest-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 45px;
  height: 45px;
  background: radial-gradient(circle, #dc143c 0%, #8b0000 100%);
  border-radius: 50%;
  box-shadow: 
    0 0 30px rgba(220, 20, 60, 0.8),
    inset 0 0 10px rgba(255, 100, 100, 0.5);
  animation: corePulse 1s ease-in-out infinite;
}

@keyframes corePulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

/* 肩甲 */
.shoulder-left, .shoulder-right {
  width: 60px;
  height: 60px;
  background: linear-gradient(145deg, #c0c0c0, #808080);
  border-radius: 50%;
  border: 3px solid #dc143c;
  top: 120px;
  opacity: 0;
}

.shoulder-left { left: -80px; transform: rotate(-30deg); }
.shoulder-right { right: -80px; transform: rotate(30deg); }

.shoulder-left.assemble { left: calc(50% - 90px); opacity: 1; }
.shoulder-right.assemble { right: calc(50% - 90px); opacity: 1; }

/* 头盔 */
.helmet-part {
  top: -200px;
  left: 50%;
  transform: translateX(-50%) rotateY(-180deg);
  opacity: 0;
}

.helmet-part.assemble {
  top: 20px;
  transform: translateX(-50%) rotateY(0deg);
  opacity: 1;
}

.helmet-main {
  width: 85px;
  height: 105px;
  background: linear-gradient(145deg, #d4d4d4 0%, #909090 50%, #505050 100%);
  border-radius: 42px 42px 25px 25px;
  border: 3px solid #dc143c;
  position: relative;
  box-shadow: 0 0 30px rgba(220, 20, 60, 0.4);
}

.visor {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  width: 70%;
  height: 28%;
  background: linear-gradient(180deg, #ff3333 0%, #cc0000 50%, #990000 100%);
  border-radius: 8px;
  box-shadow: 
    0 0 20px rgba(220, 20, 60, 0.8),
    inset 0 2px 4px rgba(255, 150, 150, 0.5);
}

.visor::after {
  content: '';
  position: absolute;
  top: 20%;
  left: 15%;
  right: 15%;
  height: 30%;
  background: linear-gradient(90deg, transparent, rgba(255, 200, 200, 0.9), transparent);
  border-radius: 4px;
}

.crest {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-bottom: 25px solid #dc143c;
  filter: drop-shadow(0 0 10px rgba(220, 20, 60, 0.8));
}

/* 手臂 */
.arm-left, .arm-right {
  width: 45px;
  height: 110px;
  background: linear-gradient(90deg, #b0b0b0, #808080);
  border-radius: 22px;
  border: 2px solid #dc143c;
  top: 160px;
  opacity: 0;
}

.arm-left { left: -100px; transform: rotate(20deg); }
.arm-right { right: -100px; transform: rotate(-20deg); }

.arm-left.assemble { left: calc(50% - 100px); opacity: 1; }
.arm-right.assemble { right: calc(50% - 100px); opacity: 1; }

/* 腿部 */
.leg-left, .leg-right {
  width: 50px;
  height: 140px;
  background: linear-gradient(180deg, #b0b0b0, #707070);
  border-radius: 25px;
  border: 2px solid #dc143c;
  bottom: -180px;
  opacity: 0;
}

.leg-left { left: calc(50% - 60px); }
.leg-right { right: calc(50% - 60px); }

.leg-left.assemble, .leg-right.assemble {
  bottom: 20px;
  opacity: 1;
}

/* 完整铠甲 */
.complete-armor {
  position: absolute;
  opacity: 0;
  transform: scale(0.8);
  transition: all 1s ease;
  filter: drop-shadow(0 0 40px rgba(220, 20, 60, 0.6));
}

.complete-armor.reveal {
  opacity: 1;
  transform: scale(1);
}

.armor-silhouette {
  width: 180px;
  height: 380px;
  position: relative;
}

/* 完整铠甲各部位 */
.sil-head {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 100px;
  background: linear-gradient(145deg, #e0e0e0 0%, #a0a0a0 50%, #606060 100%);
  border-radius: 40px 40px 20px 20px;
  border: 3px solid #dc143c;
}

.sil-visor {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translateX(-50%);
  width: 65%;
  height: 25%;
  background: linear-gradient(180deg, #ff3333 0%, #cc0000 100%);
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(220, 20, 60, 0.8);
}

.sil-crest {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 20px solid #dc143c;
}

.sil-torso {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: 110px;
  height: 130px;
  background: linear-gradient(145deg, #d0d0d0 0%, #909090 100%);
  clip-path: polygon(15% 0%, 85% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%);
  border: 3px solid #dc143c;
}

.sil-core {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, #ff3333 0%, #cc0000 100%);
  border-radius: 50%;
  box-shadow: 0 0 25px rgba(220, 20, 60, 0.9);
  animation: finalCorePulse 1.5s ease-in-out infinite;
}

@keyframes finalCorePulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
  50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
}

.sil-arm-left, .sil-arm-right {
  position: absolute;
  top: 115px;
  width: 40px;
  height: 100px;
  background: linear-gradient(90deg, #c0c0c0, #808080);
  border-radius: 20px;
  border: 2px solid #dc143c;
}

.sil-arm-left { left: -15px; }
.sil-arm-right { right: -15px; }

.sil-leg-left, .sil-leg-right {
  position: absolute;
  bottom: 0;
  width: 45px;
  height: 150px;
  background: linear-gradient(180deg, #c0c0c0, #707070);
  border-radius: 22px;
  border: 2px solid #dc143c;
}

.sil-leg-left { left: 25px; }
.sil-leg-right { right: 25px; }

.armor-aura {
  position: absolute;
  inset: -30px;
  background: 
    radial-gradient(ellipse at center, rgba(220, 20, 60, 0.3) 0%, transparent 60%);
  animation: auraPulse 2s ease-in-out infinite;
}

@keyframes auraPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 1; }
}

/* 最终闪光 */
.final-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(220, 20, 60, 0.5) 40%, transparent 70%);
  animation: finalFlash 0.8s ease-out forwards;
  pointer-events: none;
  z-index: 100;
}

@keyframes finalFlash {
  0% { opacity: 0; }
  20% { opacity: 1; }
  100% { opacity: 0; }
}

/* 控制UI */
.controls {
  position: absolute;
  bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  z-index: 50;
}

.transform-btn {
  padding: 16px 40px;
  background: linear-gradient(145deg, #dc143c 0%, #8b0000 100%);
  border: 3px solid #ff3333;
  border-radius: 30px;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  box-shadow: 0 0 30px rgba(220, 20, 60, 0.5);
}

.transform-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 40px rgba(220, 20, 60, 0.6);
}

.transform-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stage-indicator {
  font-size: 14px;
  color: #888;
  font-family: monospace;
}

/* 提示 */
.hint {
  position: absolute;
  bottom: 120px;
  font-size: 16px;
  color: #666;
  animation: hintPulse 1.5s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
