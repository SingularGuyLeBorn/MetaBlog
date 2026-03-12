<!--
  双龙戏珠 + 凤凰涅槃 SVG 装饰动画
  Dragon & Phoenix Decorative Animation
-->
<template>
  <div class="mythical-container">
    <!-- 左侧龙 -->
    <svg class="dragon left-dragon" viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dragonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ff8c00;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff4500;stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <!-- 龙身 -->
      <path class="dragon-body" 
        d="M100 20 
           Q60 60, 80 100 
           Q40 140, 70 180 
           Q30 220, 60 260 
           Q20 300, 50 340 
           L80 380"
        stroke="url(#dragonGradient)" 
        stroke-width="8" 
        stroke-linecap="round"
        fill="none"
        filter="url(#glow)"
      />
      <!-- 龙鳞 -->
      <circle class="dragon-scale" cx="70" cy="80" r="5" fill="#ffd700" opacity="0.8"/>
      <circle class="dragon-scale" cx="60" cy="120" r="4" fill="#ff8c00" opacity="0.7"/>
      <circle class="dragon-scale" cx="75" cy="160" r="5" fill="#ffd700" opacity="0.8"/>
      <circle class="dragon-scale" cx="55" cy="200" r="4" fill="#ff8c00" opacity="0.7"/>
      <circle class="dragon-scale" cx="70" cy="240" r="5" fill="#ffd700" opacity="0.8"/>
      <!-- 龙眼 -->
      <circle class="dragon-eye" cx="95" cy="25" r="6" fill="#ff0000" filter="url(#glow)"/>
      <!-- 龙须 -->
      <path class="dragon-whisker" d="M100 30 Q120 50, 130 40" stroke="#ffd700" stroke-width="2" fill="none"/>
      <path class="dragon-whisker" d="M100 30 Q120 20, 130 25" stroke="#ffd700" stroke-width="2" fill="none"/>
    </svg>

    <!-- 右侧凤 -->
    <svg class="phoenix right-phoenix" viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="phoenixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff69b4;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ff1493;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#dc143c;stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- 凤身 -->
      <path class="phoenix-body"
        d="M100 40
           Q140 80, 120 120
           Q160 160, 130 200
           Q170 240, 140 280
           Q160 320, 120 360
           L100 380"
        stroke="url(#phoenixGradient)"
        stroke-width="6"
        stroke-linecap="round"
        fill="none"
        filter="url(#glow)"
      />
      <!-- 凤羽 -->
      <ellipse class="phoenix-feather" cx="130" cy="100" rx="15" ry="8" fill="#ff69b4" opacity="0.7" transform="rotate(30 130 100)"/>
      <ellipse class="phoenix-feather" cx="140" cy="140" rx="12" ry="6" fill="#ff1493" opacity="0.6" transform="rotate(45 140 140)"/>
      <ellipse class="phoenix-feather" cx="150" cy="180" rx="15" ry="8" fill="#ff69b4" opacity="0.7" transform="rotate(30 150 180)"/>
      <ellipse class="phoenix-feather" cx="155" cy="220" rx="12" ry="6" fill="#ff1493" opacity="0.6" transform="rotate(45 155 220)"/>
      <ellipse class="phoenix-feather" cx="145" cy="260" rx="14" ry="7" fill="#ff69b4" opacity="0.7" transform="rotate(35 145 260)"/>
      <!-- 凤冠 -->
      <path class="phoenix-crest" d="M100 40 L90 20 M100 40 L100 15 M100 40 L110 20" stroke="#ffd700" stroke-width="3" stroke-linecap="round"/>
    </svg>

    <!-- 中间珠子/核心 -->
    <div class="pearl-container">
      <div class="pearl">
        <div class="pearl-inner"></div>
        <div class="pearl-ring ring-1"></div>
        <div class="pearl-ring ring-2"></div>
      </div>
      <div class="energy-rings">
        <span v-for="n in 3" :key="n" class="energy-ring" :class="`ring-${n}`"></span>
      </div>
    </div>

    <!-- 火焰效果（涅槃） -->
    <div class="flames-container">
      <div v-for="n in 12" :key="n" class="flame" :class="`flame-${n}`"></div>
    </div>
  </div>
</template>

<style scoped>
.mythical-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

/* 龙 */
.dragon {
  position: absolute;
  width: 150px;
  height: 300px;
  opacity: 0.15;
}

.left-dragon {
  left: 2%;
  top: 50%;
  transform: translateY(-50%);
  animation: dragon-float 8s ease-in-out infinite;
}

.dragon-body {
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: draw-dragon 3s ease-out forwards, dragon-pulse 4s ease-in-out infinite 3s;
}

.dragon-scale {
  animation: scale-twinkle 2s ease-in-out infinite;
}

.dragon-eye {
  animation: eye-glow 3s ease-in-out infinite;
}

.dragon-whisker {
  animation: whisker-wave 3s ease-in-out infinite;
}

@keyframes dragon-float {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-50%) translateX(10px); }
}

@keyframes draw-dragon {
  to { stroke-dashoffset: 0; }
}

@keyframes dragon-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

@keyframes scale-twinkle {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes eye-glow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.5); }
}

@keyframes whisker-wave {
  0%, 100% { d: path('M100 30 Q120 50, 130 40'); }
  50% { d: path('M100 30 Q120 45, 130 35'); }
}

/* 凤 */
.phoenix {
  position: absolute;
  width: 150px;
  height: 300px;
  opacity: 0.15;
}

.right-phoenix {
  right: 2%;
  top: 50%;
  transform: translateY(-50%);
  animation: phoenix-float 8s ease-in-out infinite reverse;
}

.phoenix-body {
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: draw-phoenix 3s ease-out 0.5s forwards, phoenix-pulse 4s ease-in-out infinite 3.5s;
}

.phoenix-feather {
  animation: feather-shimmer 3s ease-in-out infinite;
}

@keyframes phoenix-float {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-50%) translateX(-10px); }
}

@keyframes draw-phoenix {
  to { stroke-dashoffset: 0; }
}

@keyframes phoenix-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

@keyframes feather-shimmer {
  0%, 100% { opacity: 0.5; transform: rotate(var(--rotation, 0deg)) scale(1); }
  50% { opacity: 0.9; transform: rotate(var(--rotation, 0deg)) scale(1.1); }
}

/* 珠子 */
.pearl-container {
  position: absolute;
  left: 50%;
  top: 30%;
  transform: translateX(-50%);
}

.pearl {
  position: relative;
  width: 60px;
  height: 60px;
}

.pearl-inner {
  position: absolute;
  inset: 5px;
  background: radial-gradient(circle at 30% 30%, #fff 0%, #ffd700 30%, #ff8c00 70%);
  border-radius: 50%;
  box-shadow: 
    0 0 30px rgba(255, 215, 0, 0.6),
    inset -5px -5px 10px rgba(0,0,0,0.2);
  animation: pearl-glow 3s ease-in-out infinite;
}

.pearl-ring {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255, 215, 0, 0.4);
  border-radius: 50%;
}

.ring-1 { animation: pearl-ring 2s ease-out infinite; }
.ring-2 { animation: pearl-ring 2s ease-out 0.5s infinite; }

@keyframes pearl-glow {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

@keyframes pearl-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* 能量环 */
.energy-rings {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.energy-ring {
  position: absolute;
  width: 100px;
  height: 20px;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 50%;
  left: 50%;
  top: 50%;
  margin-left: -50px;
  margin-top: -10px;
}

.energy-ring.ring-1 {
  animation: energy-rotate 4s linear infinite;
}
.energy-ring.ring-2 {
  animation: energy-rotate 4s linear infinite reverse;
  width: 120px;
  margin-left: -60px;
}
.energy-ring.ring-3 {
  animation: energy-rotate 3s linear infinite;
  width: 80px;
  margin-left: -40px;
}

@keyframes energy-rotate {
  to { transform: rotateX(360deg) rotateY(360deg); }
}

/* 涅槃火焰 */
.flames-container {
  position: absolute;
  right: 5%;
  bottom: 20%;
  width: 100px;
  height: 150px;
}

.flame {
  position: absolute;
  bottom: 0;
  width: 20px;
  background: linear-gradient(to top, #ff4500, #ff8c00, transparent);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  transform-origin: bottom center;
  animation: flame-dance 1s ease-in-out infinite alternate;
}

.flame-1 { height: 60px; left: 10px; animation-delay: 0s; }
.flame-2 { height: 80px; left: 25px; animation-delay: 0.1s; }
.flame-3 { height: 70px; left: 40px; animation-delay: 0.2s; }
.flame-4 { height: 90px; left: 55px; animation-delay: 0.3s; }
.flame-5 { height: 65px; left: 70px; animation-delay: 0.4s; }

@keyframes flame-dance {
  0% { transform: scaleY(1) skewX(-5deg); opacity: 0.6; }
  100% { transform: scaleY(1.2) skewX(5deg); opacity: 0.9; }
}

/* 响应式隐藏 */
@media (max-width: 1200px) {
  .mythical-container {
    display: none;
  }
}
</style>