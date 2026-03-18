<template>
  <div class="armor-finisher-page">
    <div class="finisher-bg"></div>
    
    <h1 class="page-title">
      <span class="finisher-text">必杀技</span>
    </h1>
    
    <div class="finisher-container" @click="executeFinisher">
      <!-- 铠甲准备姿态 -->
      <div class="armor-stance" :class="{ charging: stage === 'charge', attacking: stage === 'attack' }">
        <div class="stance-figure">
          <div class="stance-helmet"></div>
          <div class="stance-body"></div>
          <div class="stance-weapon" :class="{ drawn: stage !== 'idle' }"></div>
        </div>
      </div>
      
      <!-- 蓄力特效 -->
      <div class="charge-effects" :class="{ active: stage === 'charge' }">
        <div class="charge-ring" v-for="n in 4" :key="`charge-${n}`" :style="{ '--i': n }"></div>
        <div class="charge-aura"></div>
        <div class="charge-text">蓄力中...</div>
      </div>
      
      <!-- 必杀文字 -->
      <div class="finisher-name" :class="{ show: stage === 'attack' }">
        <div class="name-text">天地战神斩</div>
        <div class="name-sub">Heaven Earth War God Slash</div>
      </div>
      
      <!-- 斩击特效 -->
      <div class="slash-effects" :class="{ active: stage === 'attack' }">
        <div class="slash-blade"></div>
        <div class="slash-trail"></div>
        <div class="slash-impact"></div>
        <div class="slash-particles" v-for="n in 20" :key="`particle-${n}`" :style="{ '--i': n }"></div>
      </div>
      
      <!-- 胜利姿态 -->
      <div class="victory-pose" :class="{ show: stage === 'finish' }">
        <div class="victory-text">💥 必杀成功！</div>
        <div class="victory-sparkles"></div>
      </div>
      
      <div class="click-hint" :class="{ fade: stage !== 'idle' && stage !== 'finish' }">
        <span>👆 点击释放必杀技</span>
      </div>
    </div>
    
    <div class="finisher-list">
      <div class="finisher-card" 
           v-for="(finisher, key) in finishers" 
           :key="key"
           :class="{ active: selectedFinisher === key }"
           @click="selectFinisher(key)">
        <h4>{{ finisher.name }}</h4>
        <p>{{ finisher.desc }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Stage = 'idle' | 'charge' | 'attack' | 'finish'
type FinisherKey = 'tianshen' | 'qianjun' | 'huoxing'

const stage = ref<Stage>('idle')
const selectedFinisher = ref<FinisherKey>('tianshen')

const finishers = {
  tianshen: { 
    name: '天地战神斩', 
    desc: '战神刑天最强必杀技，凝聚天地之力斩向敌人' 
  },
  qianjun: { 
    name: '火刑乾坤劈', 
    desc: '使用火刑剑施展的强力劈砍技' 
  },
  huoxing: { 
    name: '刑天光爆弹', 
    desc: '从胸口核心发射的能量弹' 
  }
}

const selectFinisher = (key: FinisherKey) => {
  if (stage.value !== 'idle' && stage.value !== 'finish') return
  selectedFinisher.value = key
  stage.value = 'idle'
}

const executeFinisher = () => {
  if (stage.value !== 'idle' && stage.value !== 'finish') return
  
  stage.value = 'idle'
  
  // 蓄力阶段
  setTimeout(() => {
    stage.value = 'charge'
  }, 100)
  
  // 攻击阶段
  setTimeout(() => {
    stage.value = 'attack'
  }, 2500)
  
  // 完成阶段
  setTimeout(() => {
    stage.value = 'finish'
  }, 4500)
}
</script>

<style scoped>
.armor-finisher-page {
  min-height: 100vh;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

.finisher-bg {
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(ellipse at center, #1a0000 0%, #0a0000 100%),
    repeating-radial-gradient(circle at 50% 50%, transparent 0px, rgba(220, 20, 60, 0.03) 2px, transparent 4px);
  z-index: -1;
}

.finisher-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 50% 50%, rgba(220, 20, 60, 0.15) 0%, transparent 50%);
}

.page-title {
  text-align: center;
  font-size: clamp(32px, 6vw, 56px);
  font-weight: 800;
  margin-bottom: 30px;
  letter-spacing: 8px;
}

.finisher-text {
  background: linear-gradient(180deg, #ff0000 0%, #dc143c 30%, #8b0000 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(220, 20, 60, 0.5);
}

.finisher-container {
  width: min(600px, 90vw);
  height: 450px;
  margin: 0 auto 30px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 24px;
  background: radial-gradient(ellipse at center, rgba(139, 0, 0, 0.1) 0%, transparent 70%);
  overflow: hidden;
}

/* 铠甲姿态 */
.armor-stance {
  position: relative;
  transition: all 0.5s ease;
}

.armor-stance.charging {
  transform: scale(0.9);
}

.armor-stance.attacking {
  transform: translateX(100px) rotate(15deg);
  animation: attackLunge 0.5s ease-out;
}

@keyframes attackLunge {
  0% { transform: translateX(0) rotate(0deg); }
  50% { transform: translateX(150px) rotate(20deg); }
  100% { transform: translateX(100px) rotate(15deg); }
}

.stance-figure {
  width: 120px;
  height: 240px;
  position: relative;
}

.stance-helmet {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 80px;
  background: linear-gradient(145deg, #c0c0c0, #808080);
  border-radius: 30px 30px 15px 15px;
  border: 2px solid #dc143c;
}

.stance-body {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 140px;
  background: linear-gradient(145deg, #c0c0c0, #606060);
  clip-path: polygon(20% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%, 0% 20%);
  border: 2px solid #dc143c;
}

.stance-weapon {
  position: absolute;
  top: 100px;
  right: -40px;
  width: 20px;
  height: 100px;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  border-radius: 3px;
  transform: rotate(-30deg);
  opacity: 0;
  transition: all 0.5s ease;
}

.stance-weapon.drawn {
  opacity: 1;
  transform: rotate(-45deg);
}

/* 蓄力特效 */
.charge-effects {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.charge-effects.active {
  opacity: 1;
}

.charge-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 150px;
  border: 2px solid;
  border-color: #dc143c transparent #dc143c transparent;
  border-radius: 50%;
  opacity: 0;
}

.charge-effects.active .charge-ring {
  animation: chargeRotate 1s linear infinite;
  animation-delay: calc(var(--i) * 0.2s);
}

.charge-ring:nth-child(1) { width: 150px; height: 150px; }
.charge-ring:nth-child(2) { width: 200px; height: 200px; }
.charge-ring:nth-child(3) { width: 250px; height: 250px; }
.charge-ring:nth-child(4) { width: 300px; height: 300px; }

@keyframes chargeRotate {
  0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0; }
}

.charge-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(220, 20, 60, 0.3) 0%, transparent 50%);
  animation: chargePulse 0.5s ease-in-out infinite;
}

@keyframes chargePulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
}

.charge-text {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  font-weight: 700;
  color: #dc143c;
  text-shadow: 0 0 20px rgba(220, 20, 60, 0.8);
  animation: chargeText 0.5s ease-in-out infinite alternate;
}

@keyframes chargeText {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

/* 必杀名字 */
.finisher-name {
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0;
  pointer-events: none;
}

.finisher-name.show {
  animation: nameReveal 2s ease-out forwards;
}

@keyframes nameReveal {
  0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
  30% { opacity: 1; transform: translateX(-50%) scale(1.2); }
  70% { opacity: 1; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) scale(1); }
}

.name-text {
  font-size: 42px;
  font-weight: 800;
  background: linear-gradient(180deg, #ffd700 0%, #ff6347 50%, #dc143c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(220, 20, 60, 0.8);
  white-space: nowrap;
}

.name-sub {
  font-size: 14px;
  color: #ff6347;
  letter-spacing: 4px;
  margin-top: 8px;
}

/* 斩击特效 */
.slash-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
}

.slash-effects.active {
  opacity: 1;
}

.slash-blade {
  position: absolute;
  top: 40%;
  left: 30%;
  width: 300px;
  height: 60px;
  background: linear-gradient(90deg, transparent, #ffffff, #ffd700, #ff6347, transparent);
  filter: blur(5px);
  transform: rotate(-30deg);
  opacity: 0;
}

.slash-effects.active .slash-blade {
  animation: slashCut 0.5s ease-out forwards;
}

@keyframes slashCut {
  0% { transform: rotate(-30deg) translateX(-200px) scaleX(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: rotate(-30deg) translateX(200px) scaleX(1); opacity: 0; }
}

.slash-trail {
  position: absolute;
  top: 35%;
  left: 20%;
  width: 400px;
  height: 100px;
  background: linear-gradient(90deg, transparent, rgba(220, 20, 60, 0.6), rgba(255, 215, 0, 0.4), transparent);
  filter: blur(20px);
  transform: rotate(-30deg);
  opacity: 0;
}

.slash-effects.active .slash-trail {
  animation: trailFade 1s ease-out forwards;
}

@keyframes trailFade {
  0% { opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 0; }
}

.slash-impact {
  position: absolute;
  top: 30%;
  right: 10%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, rgba(220, 20, 60, 0.6) 30%, transparent 60%);
  border-radius: 50%;
  opacity: 0;
}

.slash-effects.active .slash-impact {
  animation: impactBurst 0.8s ease-out forwards;
  animation-delay: 0.3s;
}

@keyframes impactBurst {
  0% { transform: scale(0); opacity: 1; }
  50% { opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.slash-particles {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #ffd700;
  border-radius: 50%;
  opacity: 0;
}

.slash-effects.active .slash-particles {
  animation: particleExplode 1s ease-out forwards;
  animation-delay: calc(var(--i) * 0.05s);
}

.slash-particles:nth-child(4) { top: 30%; left: 80%; }
.slash-particles:nth-child(5) { top: 40%; left: 85%; }
.slash-particles:nth-child(6) { top: 50%; left: 82%; }
.slash-particles:nth-child(7) { top: 35%; left: 90%; }
.slash-particles:nth-child(8) { top: 45%; left: 88%; }
.slash-particles:nth-child(9) { top: 25%; left: 75%; }
.slash-particles:nth-child(10) { top: 55%; left: 78%; }
.slash-particles:nth-child(11) { top: 32%; left: 95%; }
.slash-particles:nth-child(12) { top: 48%; left: 92%; }
.slash-particles:nth-child(13) { top: 38%; left: 87%; }
.slash-particles:nth-child(14) { top: 42%; left: 93%; }
.slash-particles:nth-child(15) { top: 28%; left: 83%; }
.slash-particles:nth-child(16) { top: 52%; left: 85%; }
.slash-particles:nth-child(17) { top: 36%; left: 79%; }
.slash-particles:nth-child(18) { top: 44%; left: 96%; }
.slash-particles:nth-child(19) { top: 26%; left: 88%; }
.slash-particles:nth-child(20) { top: 54%; left: 91%; }
.slash-particles:nth-child(21) { top: 34%; left: 84%; }
.slash-particles:nth-child(22) { top: 46%; left: 89%; }
.slash-particles:nth-child(23) { top: 29%; left: 94%; }

@keyframes particleExplode {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { 
    transform: translate(
      calc((var(--i) - 10) * 20px), 
      calc((var(--i) % 5 - 2) * -30px)
    ) scale(0); 
    opacity: 0; 
  }
}

/* 胜利姿态 */
.victory-pose {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
}

.victory-pose.show {
  animation: victoryShow 2s ease-out forwards;
}

@keyframes victoryShow {
  0% { opacity: 0; }
  30% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

.victory-text {
  font-size: 36px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
  animation: victoryPulse 0.5s ease-in-out infinite alternate;
}

@keyframes victoryPulse {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

.victory-sparkles {
  position: absolute;
  inset: 0;
}

.victory-sparkles::before,
.victory-sparkles::after {
  content: '✨';
  position: absolute;
  font-size: 24px;
  animation: sparkle 1s ease-in-out infinite;
}

.victory-sparkles::before { top: 20%; left: 20%; animation-delay: 0s; }
.victory-sparkles::after { top: 30%; right: 20%; animation-delay: 0.5s; }

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}

/* 提示 */
.click-hint {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 24px;
  font-size: 14px;
  color: #c0c0c0;
  transition: opacity 0.5s;
  white-space: nowrap;
}

.click-hint.fade {
  opacity: 0;
}

/* 必杀列表 */
.finisher-list {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  max-width: 800px;
  margin: 0 auto;
}

.finisher-card {
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(220, 20, 60, 0.3);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
  text-align: center;
}

.finisher-card:hover {
  border-color: rgba(220, 20, 60, 0.6);
  transform: translateY(-4px);
}

.finisher-card.active {
  border-color: #dc143c;
  background: rgba(220, 20, 60, 0.2);
  box-shadow: 0 0 20px rgba(220, 20, 60, 0.3);
}

.finisher-card h4 {
  font-size: 16px;
  font-weight: 700;
  color: #dc143c;
  margin: 0 0 8px;
}

.finisher-card p {
  font-size: 12px;
  color: #888;
  margin: 0;
}
</style>
