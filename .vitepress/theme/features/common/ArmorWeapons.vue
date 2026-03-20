<template>
  <div class="armor-weapons-page">
    <div class="weapons-bg"></div>
    
    <h1 class="page-title">
      <span class="weapon-text">武器召唤</span>
    </h1>
    
    <div class="weapons-container">
      <!-- 火刑剑 -->
      <div class="weapon-card" :class="{ active: activeWeapon === 'sword' }" @click="summonWeapon('sword')">
        <div class="weapon-icon">🔥</div>
        <h3>火刑剑</h3>
        <div class="weapon-summon-effect" v-if="activeWeapon === 'sword' && summoning">
          <div class="summon-flame"></div>
          <div class="summon-sparks"></div>
        </div>
        <div class="weapon-display" :class="{ visible: activeWeapon === 'sword' && !summoning }">
          <div class="huoxing-sword">
            <div class="sword-blade">
              <div class="blade-edge"></div>
              <div class="blade-fire"></div>
            </div>
            <div class="sword-guard"></div>
            <div class="sword-hilt"></div>
            <div class="sword-aura"></div>
          </div>
        </div>
      </div>
      
      <!-- 火刑掌 -->
      <div class="weapon-card" :class="{ active: activeWeapon === 'palm' }" @click="summonWeapon('palm')">
        <div class="weapon-icon">✋</div>
        <h3>火刑掌</h3>
        <div class="weapon-summon-effect" v-if="activeWeapon === 'palm' && summoning">
          <div class="summon-energy"></div>
        </div>
        <div class="weapon-display" :class="{ visible: activeWeapon === 'palm' && !summoning }">
          <div class="huoxing-palm">
            <div class="palm-base">
              <div class="palm-symbol">火</div>
            </div>
            <div class="palm-energy"></div>
          </div>
        </div>
      </div>
      
      <!-- 电光击 -->
      <div class="weapon-card" :class="{ active: activeWeapon === 'fist' }" @click="summonWeapon('fist')">
        <div class="weapon-icon">⚡</div>
        <h3>电光击</h3>
        <div class="weapon-summon-effect" v-if="activeWeapon === 'fist' && summoning">
          <div class="summon-lightning"></div>
        </div>
        <div class="weapon-display" :class="{ visible: activeWeapon === 'fist' && !summoning }">
          <div class="dianguang-fist">
            <div class="fist-gauntlet">
              <div class="fist-spikes"></div>
            </div>
            <div class="fist-lightning"></div>
          </div>
        </div>
      </div>
      
      <!-- 天烈剑 -->
      <div class="weapon-card warrior-weapon" :class="{ active: activeWeapon === 'tianlie' }" @click="summonWeapon('tianlie')">
        <div class="weapon-icon">⚔️</div>
        <h3>天烈剑</h3>
        <span class="warrior-badge">战神专属</span>
        <div class="weapon-summon-effect" v-if="activeWeapon === 'tianlie' && summoning">
          <div class="summon-divine"></div>
        </div>
        <div class="weapon-display" :class="{ visible: activeWeapon === 'tianlie' && !summoning }">
          <div class="tianlie-sword">
            <div class="divine-blade">
              <div class="blade-runes"></div>
              <div class="blade-glow"></div>
            </div>
            <div class="divine-guard"></div>
            <div class="divine-hilt"></div>
            <div class="divine-aura"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="weapon-info" v-if="activeWeapon && !summoning">
      <h4>{{ weaponInfo.name }}</h4>
      <p>{{ weaponInfo.desc }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type WeaponType = 'sword' | 'palm' | 'fist' | 'tianlie' | null

const activeWeapon = ref<WeaponType>(null)
const summoning = ref(false)

const weaponData = {
  sword: { name: '火刑剑', desc: '刑天铠甲的标准武器，剑身缠绕着炽热火焰，可施展火刑乾坤劈等必杀技。' },
  palm: { name: '火刑掌', desc: '近距离格斗武器，掌击带有火焰能量，威力惊人。' },
  fist: { name: '电光击', desc: '高速打击武器，拳头缠绕电光，出拳如闪电般迅疾。' },
  tianlie: { name: '天烈剑', desc: '战神刑天专属武器，拥有斩断一切邪恶的神圣力量。' }
}

const weaponInfo = computed(() => {
  if (!activeWeapon.value) return { name: '', desc: '' }
  return weaponData[activeWeapon.value]
})

const summonWeapon = (weapon: WeaponType) => {
  if (summoning.value) return
  
  activeWeapon.value = null
  summoning.value = true
  
  setTimeout(() => {
    activeWeapon.value = weapon
  }, 100)
  
  setTimeout(() => {
    summoning.value = false
  }, 1500)
}
</script>

<style scoped>
.armor-weapons-page {
  min-height: 100vh;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

.weapons-bg {
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(ellipse at center, #0a1a0a 0%, #000500 100%),
    repeating-linear-gradient(45deg, transparent 0px, rgba(220, 20, 60, 0.02) 1px, transparent 2px);
  z-index: -1;
}

.weapons-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 30% 30%, rgba(220, 20, 60, 0.1) 0%, transparent 40%),
    radial-gradient(circle at 70% 70%, rgba(255, 140, 0, 0.08) 0%, transparent 40%);
}

.page-title {
  text-align: center;
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 800;
  margin-bottom: 40px;
  letter-spacing: 4px;
}

.weapon-text {
  background: linear-gradient(180deg, #ff6b35 0%, #dc143c 50%, #8b0000 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.weapons-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto 40px;
}

.weapon-card {
  position: relative;
  height: 280px;
  background: linear-gradient(145deg, rgba(20, 20, 30, 0.9) 0%, rgba(10, 10, 20, 0.95) 100%);
  border: 2px solid rgba(220, 20, 60, 0.3);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  overflow: hidden;
}

.weapon-card:hover {
  transform: translateY(-8px);
  border-color: rgba(220, 20, 60, 0.6);
  box-shadow: 0 20px 40px rgba(220, 20, 60, 0.2);
}

.weapon-card.active {
  border-color: #dc143c;
  box-shadow: 0 0 40px rgba(220, 20, 60, 0.4);
}

.weapon-card.warrior-weapon {
  border-color: rgba(255, 215, 0, 0.3);
}

.weapon-card.warrior-weapon:hover,
.weapon-card.warrior-weapon.active {
  border-color: #ffd700;
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.4);
}

.weapon-icon {
  font-size: 48px;
  margin-bottom: 16px;
  transition: transform 0.3s ease;
}

.weapon-card:hover .weapon-icon {
  transform: scale(1.2);
}

.weapon-card h3 {
  font-size: 20px;
  font-weight: 700;
  color: #c0c0c0;
  margin: 0;
}

.warrior-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: linear-gradient(145deg, #ffd700, #ff8c00);
  color: #000;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
}

/* 召唤特效 */
.weapon-summon-effect {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.summon-flame {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 100, 0, 0.6) 0%, transparent 60%);
  animation: flameBurst 1s ease-out;
}

@keyframes flameBurst {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.summon-sparks {
  position: absolute;
  inset: 0;
}

.summon-sparks::before,
.summon-sparks::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background: #ff6b35;
  border-radius: 50%;
  box-shadow: 
    20px 30px 0 #ff6b35,
    -30px 20px 0 #ff4500,
    40px -20px 0 #ff6347,
    -20px -30px 0 #ff8c00;
  animation: sparks 0.5s ease-out infinite;
}

.summon-sparks::before { top: 40%; left: 30%; }
.summon-sparks::after { top: 60%; right: 30%; animation-delay: 0.25s; }

@keyframes sparks {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.5); }
}

.summon-energy {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(220, 20, 60, 0.5) 0%, transparent 60%);
  animation: energyPulse 1s ease-out;
}

@keyframes energyPulse {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.summon-lightning {
  position: absolute;
  inset: 0;
}

.summon-lightning::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, transparent, #ffff00, transparent);
  transform: translateX(-50%);
  animation: lightningStrike 0.2s ease-out 3;
}

@keyframes lightningStrike {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.summon-divine {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle, rgba(255, 215, 0, 0.5) 0%, transparent 50%),
    radial-gradient(circle, rgba(220, 20, 60, 0.3) 30%, transparent 60%);
  animation: divineSummon 1s ease-out;
}

@keyframes divineSummon {
  0% { transform: scale(0) rotate(0deg); opacity: 1; }
  100% { transform: scale(2) rotate(180deg); opacity: 0; }
}

/* 武器展示 */
.weapon-display {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.weapon-display.visible {
  opacity: 1;
  transform: scale(1);
}

/* 火刑剑 */
.huoxing-sword {
  width: 60px;
  height: 180px;
  position: relative;
  animation: swordFloat 3s ease-in-out infinite;
}

@keyframes swordFloat {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

.sword-blade {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 120px;
  background: linear-gradient(90deg, #c0c0c0 0%, #ffffff 50%, #c0c0c0 100%);
  clip-path: polygon(50% 0%, 100% 15%, 100% 100%, 0% 100%, 0% 15%);
}

.blade-fire {
  position: absolute;
  inset: -5px;
  background: linear-gradient(180deg, rgba(255, 100, 0, 0.8) 0%, rgba(220, 20, 60, 0.6) 100%);
  clip-path: polygon(50% 0%, 100% 15%, 100% 100%, 0% 100%, 0% 15%);
  filter: blur(8px);
  animation: bladeFlame 0.5s ease-in-out infinite alternate;
}

@keyframes bladeFlame {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.sword-guard {
  position: absolute;
  top: 115px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 15px;
  background: linear-gradient(90deg, #8b0000, #dc143c, #8b0000);
  border-radius: 3px;
}

.sword-hilt {
  position: absolute;
  top: 130px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 50px;
  background: linear-gradient(90deg, #4a0000, #8b0000, #4a0000);
  border-radius: 3px;
}

.sword-aura {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(220, 20, 60, 0.3) 0%, transparent 50%);
  animation: swordAura 2s ease-in-out infinite;
}

@keyframes swordAura {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

/* 火刑掌 */
.huoxing-palm {
  width: 100px;
  height: 120px;
  position: relative;
}

.palm-base {
  width: 80px;
  height: 100px;
  background: linear-gradient(145deg, #dc143c, #8b0000);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #ff6347;
  box-shadow: 0 0 30px rgba(220, 20, 60, 0.5);
}

.palm-symbol {
  font-size: 36px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
}

.palm-energy {
  position: absolute;
  inset: -15px;
  background: radial-gradient(circle, rgba(255, 100, 0, 0.4) 0%, transparent 50%);
  animation: palmEnergy 1s ease-in-out infinite;
}

@keyframes palmEnergy {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; }
}

/* 电光击 */
.dianguang-fist {
  width: 90px;
  height: 110px;
  position: relative;
}

.fist-gauntlet {
  width: 70px;
  height: 90px;
  background: linear-gradient(145deg, #c0c0c0, #808080);
  border-radius: 15px;
  border: 3px solid #ffd700;
  position: relative;
}

.fist-spikes {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 20px;
  background: linear-gradient(180deg, #ffd700, #ff8c00);
  clip-path: polygon(20% 100%, 50% 0%, 80% 100%);
}

.fist-lightning {
  position: absolute;
  inset: -30px;
  background: 
    linear-gradient(90deg, transparent 48%, rgba(255, 255, 0, 0.5) 49%, rgba(255, 255, 0, 0.5) 51%, transparent 52%),
    linear-gradient(0deg, transparent 48%, rgba(255, 255, 0, 0.3) 49%, rgba(255, 255, 0, 0.3) 51%, transparent 52%);
  animation: lightningGlow 0.3s ease-in-out infinite;
}

@keyframes lightningGlow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* 天烈剑 */
.tianlie-sword {
  width: 70px;
  height: 200px;
  position: relative;
  animation: divineFloat 4s ease-in-out infinite;
}

@keyframes divineFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.divine-blade {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 140px;
  background: linear-gradient(90deg, #ffd700 0%, #ffffff 50%, #ffd700 100%);
  clip-path: polygon(50% 0%, 100% 10%, 100% 100%, 0% 100%, 0% 10%);
}

.blade-glow {
  position: absolute;
  inset: -8px;
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.8) 0%, rgba(220, 20, 60, 0.6) 100%);
  clip-path: polygon(50% 0%, 100% 10%, 100% 100%, 0% 100%, 0% 10%);
  filter: blur(10px);
  animation: divineGlow 1s ease-in-out infinite alternate;
}

@keyframes divineGlow {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.divine-guard {
  position: absolute;
  top: 135px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 20px;
  background: linear-gradient(90deg, #ff8c00, #ffd700, #ff8c00);
  border-radius: 5px;
}

.divine-hilt {
  position: absolute;
  top: 155px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 45px;
  background: linear-gradient(90deg, #8b4513, #a0522d, #8b4513);
  border-radius: 5px;
}

.divine-aura {
  position: absolute;
  inset: -30px;
  background: 
    radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 40%),
    radial-gradient(circle, rgba(220, 20, 60, 0.2) 30%, transparent 60%);
  animation: divineAura 2s ease-in-out infinite;
}

@keyframes divineAura {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 1; }
}

/* 武器信息 */
.weapon-info {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(220, 20, 60, 0.3);
  text-align: center;
}

.weapon-info h4 {
  font-size: 24px;
  font-weight: 700;
  color: #dc143c;
  margin: 0 0 12px;
}

.weapon-info p {
  font-size: 14px;
  color: #a0a0a0;
  margin: 0;
  line-height: 1.6;
}
</style>
