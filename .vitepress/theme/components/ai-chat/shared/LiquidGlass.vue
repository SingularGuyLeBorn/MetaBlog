<template>
  <div
    ref="glassRef"
    class="liquid-glass"
    :class="{
      'is-hovered': isHovered,
      'is-pressed': isPressed,
      'is-resisting': isResisting,
      'is-active': isActive,
      'is-sleeping': isSleeping
    }"
    :style="containerStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mousemove="onMouseMove"
  >
    <!-- 焦散光斑阴影层 -->
    <div class="caustics-shadow" :style="causticsStyle" />
    
    <!-- 基础玻璃层 - 90%透明+10%雾感 -->
    <div class="glass-base" :style="baseStyle" />
    
    <!-- 液态流动层 - 蜂蜜般粘稠 -->
    <div class="glass-liquid" :style="liquidStyle">
      <div class="liquid-layer layer-1" />
      <div class="liquid-layer layer-2" />
      <div class="liquid-layer layer-3" />
    </div>
    
    <!-- 内部纹理 - 视差深度 -->
    <div class="glass-texture" :style="textureStyle" />
    
    <!-- 雾感层 - 呼吸起伏 -->
    <div class="glass-fog" :style="fogStyle" />
    
    <!-- 霓虹辉光边缘 - 淡紫/薄荷绿/婴儿蓝 -->
    <div class="glass-glow" :style="glowStyle" />
    
    <!-- 镜面反射层 -->
    <div class="glass-reflection" :style="reflectionStyle" />
    
    <!-- 涟漪效果 - 粘稠传播 -->
    <div
      v-for="ripple in ripples"
      :key="ripple.id"
      class="ripple"
      :style="getRippleStyle(ripple)"
    />
    
    <!-- 随机气泡 - 生命节律 -->
    <div
      v-for="bubble in bubbles"
      :key="bubble.id"
      class="bubble"
      :style="getBubbleStyle(bubble)"
    >
      <div class="bubble-inner" />
    </div>
    
    <!-- 神经光丝 - 高亮态 -->
    <div v-if="isActive" class="neural-network">
      <div
        v-for="neuron in neurons"
        :key="neuron.id"
        class="neural-path"
        :style="getNeuralStyle(neuron)"
      />
    </div>
    
    <!-- 内容插槽 - 悬浮在玻璃之上 -->
    <div class="glass-content" :style="contentStyle">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Ripple {
  id: number
  x: number
  y: number
  size: number
  birth: number
  intensity: number
}

interface Bubble {
  id: number
  x: number
  y: number
  size: number
  birth: number
  speed: number
}

interface Neuron {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  birth: number
  branch: number
}

const props = defineProps<{
  glowColor?: string
  intensity?: number
}>()

const glassRef = ref<HTMLElement>()
const isHovered = ref(false)
const isPressed = ref(false)
const isResisting = ref(false)
const isActive = ref(false)
const isSleeping = ref(false)

// 鼠标位置 - 用于3D透视
const mouseX = ref(0.5)
const mouseY = ref(0.5)
const targetMouseX = ref(0.5)
const targetMouseY = ref(0.5)

// 物理模拟
const velocityX = ref(0)
const velocityY = ref(0)
const displacementX = ref(0)
const displacementY = ref(0)

// 涟漪列表
const ripples = ref<Ripple[]>([])
let rippleId = 0

// 气泡列表
const bubbles = ref<Bubble[]>([])
let bubbleId = 0

// 神经元
const neurons = ref<Neuron[]>([])
let neuronId = 0

// 生命节律
const breathPhase = ref(0)
const randomSeed = ref(Math.random() * 1000)

// 动画循环
let rafId: number
let breathInterval: number
let bubbleInterval: number
let neuronInterval: number
let sleepTimeout: number
let resistTimeout: number

// 颜色配置
const neonColors = {
  purple: { r: 139, g: 92, b: 246 },   // 淡紫
  mint: { r: 16, g: 185, b: 129 },      // 薄荷绿
  baby: { r: 59, g: 130, b: 246 },      // 婴儿蓝
}

// 解析发光颜色
const glowRgb = computed(() => {
  const color = props.glowColor || '#8b5cf6'
  const r = parseInt(color.slice(1, 3), 16) || neonColors.purple.r
  const g = parseInt(color.slice(3, 5), 16) || neonColors.purple.g
  const b = parseInt(color.slice(5, 7), 16) || neonColors.purple.b
  return { r, g, b }
})

// 容器样式 - 3D透视+悬浮
const containerStyle = computed(() => {
  const intensity = props.intensity || 1
  
  // 3D倾斜计算 - 视差深度
  const tiltX = (mouseY.value - 0.5) * 15 * intensity
  const tiltY = (mouseX.value - 0.5) * -15 * intensity
  
  // 物理惯性模拟
  const inertiaX = displacementX.value * 2
  const inertiaY = displacementY.value * 2
  
  // 抵抗效果 - 0.3秒收缩
  const resistScale = isResisting.value ? 0.97 : 1
  
  // 按压凹陷 - 3-5mm
  const pressDepth = isPressed.value ? -8 : isHovered.value ? -3 : 0
  
  // 沉睡态倾斜
  const sleepTilt = isSleeping.value ? 5 : 0
  
  // 呼吸缩放
  const breathScale = 1 + Math.sin(breathPhase.value) * 0.005
  
  return {
    transform: `
      perspective(1500px)
      rotateX(${tiltX + inertiaY + sleepTilt}deg)
      rotateY(${tiltY + inertiaX}deg)
      translateZ(${pressDepth}px)
      scale(${breathScale * resistScale})
    `,
    transition: isPressed.value 
      ? 'transform 0.1s cubic-bezier(0.23, 1, 0.32, 1)'
      : isResisting.value
        ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
  }
})

// 基础玻璃层样式 - 90%透明+10%雾感
const baseStyle = computed(() => {
  const fogOpacity = isSleeping.value ? 0.15 : 0.1 + Math.sin(breathPhase.value) * 0.02
  
  return {
    background: `
      linear-gradient(
        135deg,
        rgba(255, 255, 255, ${0.72 + (isHovered.value ? 0.1 : 0)}) 0%,
        rgba(255, 255, 255, ${0.65 + (isHovered.value ? 0.08 : 0)}) 50%,
        rgba(255, 255, 255, ${0.58 + (isHovered.value ? 0.05 : 0)}) 100%
      )
    `,
    backdropFilter: `blur(${20 + (isHovered.value ? 5 : 0)}px) saturate(${180 + (isHovered.value ? 20 : 0)}%)`,
    opacity: 1
  }
})

// 液态流动层 - 蜂蜜粘稠
const liquidStyle = computed(() => {
  const flow1 = Math.sin(breathPhase.value * 0.7 + randomSeed.value) * 3
  const flow2 = Math.cos(breathPhase.value * 0.5 + randomSeed.value) * 2
  const flow3 = Math.sin(breathPhase.value * 0.3 + randomSeed.value) * 4
  
  return {
    transform: `
      translate(${flow1}px, ${flow2}px)
      scale(${1 + Math.sin(breathPhase.value) * 0.01})
    `
  }
})

// 纹理层 - 视差深度
const textureStyle = computed(() => {
  const parallaxX = (mouseX.value - 0.5) * 20
  const parallaxY = (mouseY.value - 0.5) * 20
  
  return {
    transform: `translate(${parallaxX}px, ${parallaxY}px)`,
    opacity: isHovered.value ? 0.6 : 0.4
  }
})

// 雾感层 - 呼吸起伏
const fogStyle = computed(() => {
  const breath = Math.sin(breathPhase.value) * 0.03 + 0.1
  const localFog = isHovered.value ? breath + 0.05 : breath
  
  return {
    background: `
      radial-gradient(
        ellipse at ${mouseX.value * 100}% ${mouseY.value * 100}%,
        rgba(255, 255, 255, ${localFog + 0.05}) 0%,
        rgba(255, 255, 255, ${localFog}) 30%,
        rgba(255, 255, 255, 0) 70%
      )
    `,
    opacity: isSleeping.value ? 0.5 : 1
  }
})

// 霓虹辉光边缘 - 淡紫/薄荷绿/婴儿蓝
const glowStyle = computed(() => {
  const { r, g, b } = glowRgb.value
  const intensity = isHovered.value ? 0.7 : isPressed.value ? 0.9 : isActive.value ? 0.6 : 0.35
  const breath = Math.sin(breathPhase.value) * 0.15 + 0.85
  
  // 沉睡态辉光减弱
  const sleepFactor = isSleeping.value ? 0.3 : 1
  
  return {
    boxShadow: `
      0 0 ${15 * breath * sleepFactor}px rgba(${r}, ${g}, ${b}, ${intensity * 0.6}),
      0 0 ${30 * breath * sleepFactor}px rgba(${r}, ${g}, ${b}, ${intensity * 0.3}),
      0 0 ${60 * breath * sleepFactor}px rgba(${r}, ${g}, ${b}, ${intensity * 0.15}),
      inset 0 1px 1px rgba(255, 255, 255, 0.4),
      inset 0 -1px 1px rgba(0, 0, 0, 0.05)
    `,
    borderColor: `rgba(${r}, ${g}, ${b}, ${intensity * 0.4 * sleepFactor})`
  }
})

// 镜面反射层
const reflectionStyle = computed(() => {
  return {
    background: `
      linear-gradient(
        ${105 + Math.sin(breathPhase.value) * 5}deg,
        transparent 40%,
        rgba(255, 255, 255, ${isHovered.value ? 0.3 : 0.15}) 45%,
        rgba(255, 255, 255, ${isHovered.value ? 0.5 : 0.25}) 50%,
        rgba(255, 255, 255, ${isHovered.value ? 0.3 : 0.15}) 55%,
        transparent 60%
      )
    `,
    transform: `translateX(${(mouseX.value - 0.5) * 30}px)`,
    opacity: isSleeping.value ? 0.3 : 1
  }
})

// 焦散光斑阴影
const causticsStyle = computed(() => {
  const { r, g, b } = glowRgb.value
  const breath = Math.sin(breathPhase.value * 1.2) * 0.2 + 0.3
  
  return {
    background: `
      radial-gradient(circle at 30% 30%, rgba(${r}, ${g}, ${b}, ${breath * 0.3}), transparent 40%),
      radial-gradient(circle at 70% 70%, rgba(${neonColors.mint.r}, ${neonColors.mint.g}, ${neonColors.mint.b}, ${breath * 0.2}), transparent 35%),
      radial-gradient(circle at 50% 50%, rgba(${neonColors.baby.r}, ${neonColors.baby.g}, ${neonColors.baby.b}, ${breath * 0.15}), transparent 50%)
    `,
    transform: `translate(${(mouseX.value - 0.5) * 40}px, ${(mouseY.value - 0.5) * 40}px) scale(${1 + Math.sin(breathPhase.value) * 0.05})`,
    filter: 'blur(20px)',
    opacity: isSleeping.value ? 0.2 : breath
  }
})

// 内容层样式
const contentStyle = computed(() => {
  return {
    transform: `translateZ(30px)`,
    opacity: isSleeping.value ? 0.7 : 1
  }
})

// 涟漪样式 - 粘稠传播
function getRippleStyle(ripple: Ripple) {
  const age = Date.now() - ripple.birth
  const progress = Math.min(age / 2000, 1)
  
  // 阻尼曲线 - 粘稠感
  const easeOut = 1 - Math.pow(1 - progress, 3)
  const damped = Math.sin(progress * Math.PI) * (1 - progress * 0.3)
  
  return {
    left: `${ripple.x}px`,
    top: `${ripple.y}px`,
    width: `${ripple.size + easeOut * 150}px`,
    height: `${ripple.size + easeOut * 150}px`,
    opacity: ripple.intensity * damped * (isSleeping.value ? 0.3 : 1),
    borderWidth: `${2 - easeOut}px`,
    transform: 'translate(-50%, -50%)'
  }
}

// 气泡样式
function getBubbleStyle(bubble: Bubble) {
  const age = Date.now() - bubble.birth
  const progress = Math.min(age / 5000, 1)
  
  return {
    left: `${bubble.x}%`,
    bottom: `${progress * 100}%`,
    width: `${bubble.size}px`,
    height: `${bubble.size}px`,
    opacity: progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 0.6,
    transform: `scale(${1 + Math.sin(progress * Math.PI) * 0.2})`
  }
}

// 神经光丝样式
function getNeuralStyle(neuron: Neuron) {
  const age = Date.now() - neuron.birth
  const progress = Math.min(age / 1000, 1)
  
  const length = Math.sqrt(
    Math.pow(neuron.x2 - neuron.x1, 2) + 
    Math.pow(neuron.y2 - neuron.y1, 2)
  )
  const angle = Math.atan2(neuron.y2 - neuron.y1, neuron.x2 - neuron.x1) * 180 / Math.PI
  
  return {
    left: `${neuron.x1}%`,
    top: `${neuron.y1}%`,
    width: `${length}%`,
    transform: `rotate(${angle}deg)`,
    opacity: Math.sin(progress * Math.PI) * 0.8,
    boxShadow: `0 0 6px rgba(${glowRgb.value.r}, ${glowRgb.value.g}, ${glowRgb.value.b}, 0.8)`
  }
}

// 创建涟漪
function createRipple(x: number, y: number, intensity = 0.6) {
  const newRipple: Ripple = {
    id: rippleId++,
    x,
    y,
    size: 20,
    birth: Date.now(),
    intensity
  }
  ripples.value.push(newRipple)
  
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== newRipple.id)
  }, 2000)
}

// 创建气泡
function createBubble() {
  const newBubble: Bubble = {
    id: bubbleId++,
    x: 10 + Math.random() * 80,
    y: 100,
    size: 3 + Math.random() * 5,
    birth: Date.now(),
    speed: 0.5 + Math.random() * 0.5
  }
  bubbles.value.push(newBubble)
  
  setTimeout(() => {
    bubbles.value = bubbles.value.filter(b => b.id !== newBubble.id)
  }, 5000)
}

// 创建神经光丝
function createNeuron() {
  if (!isActive.value) return
  
  const branches = 1 + Math.floor(Math.random() * 3)
  
  for (let i = 0; i < branches; i++) {
    const neuron: Neuron = {
      id: neuronId++,
      x1: 20 + Math.random() * 60,
      y1: 20 + Math.random() * 60,
      x2: 20 + Math.random() * 60,
      y2: 20 + Math.random() * 60,
      birth: Date.now(),
      branch: i
    }
    neurons.value.push(neuron)
    
    setTimeout(() => {
      neurons.value = neurons.value.filter(n => n.id !== neuron.id)
    }, 1000)
  }
}

// 物理动画循环
function animate() {
  // 惯性滞后模拟
  const spring = 0.1
  const friction = 0.85
  
  const targetX = targetMouseX.value - 0.5
  const targetY = targetMouseY.value - 0.5
  
  velocityX.value += (targetX - displacementX.value) * spring
  velocityY.value += (targetY - displacementY.value) * spring
  
  velocityX.value *= friction
  velocityY.value *= friction
  
  displacementX.value += velocityX.value
  displacementY.value += velocityY.value
  
  // 鼠标平滑跟随
  mouseX.value += (targetMouseX.value - mouseX.value) * 0.1
  mouseY.value += (targetMouseY.value - mouseY.value) * 0.1
  
  rafId = requestAnimationFrame(animate)
}

// 事件处理
function onMouseEnter() {
  isHovered.value = true
  isSleeping.value = false
  clearTimeout(sleepTimeout)
  
  // 0.3秒抵抗效果
  isResisting.value = true
  resistTimeout = window.setTimeout(() => {
    isResisting.value = false
    isActive.value = true
  }, 300)
  
  // 苏醒涟漪
  if (glassRef.value) {
    const rect = glassRef.value.getBoundingClientRect()
    createRipple(rect.width / 2, rect.height / 2, 0.4)
  }
}

function onMouseLeave() {
  isHovered.value = false
  isPressed.value = false
  isActive.value = false
  targetMouseX.value = 0.5
  targetMouseY.value = 0.5
  
  // 5秒后沉睡
  sleepTimeout = window.setTimeout(() => {
    if (!isHovered.value) {
      isSleeping.value = true
    }
  }, 5000)
}

function onMouseDown(e: MouseEvent) {
  isPressed.value = true
  
  if (glassRef.value) {
    const rect = glassRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 按压涟漪 - 从接触点传播
    createRipple(x, y, 0.8)
    
    // 随机产生神经光丝
    createNeuron()
  }
}

function onMouseUp() {
  isPressed.value = false
}

function onMouseMove(e: MouseEvent) {
  if (!glassRef.value) return
  
  const rect = glassRef.value.getBoundingClientRect()
  targetMouseX.value = (e.clientX - rect.left) / rect.width
  targetMouseY.value = (e.clientY - rect.top) / rect.height
  
  // 移动时偶尔产生涟漪
  if (Math.random() < 0.02) {
    createRipple(
      e.clientX - rect.left,
      e.clientY - rect.top,
      0.3
    )
  }
}

// 生命周期
onMounted(() => {
  // 启动物理动画循环
  animate()
  
  // 呼吸动画 - 4-6秒周期
  breathInterval = window.setInterval(() => {
    breathPhase.value += 0.015
  }, 50)
  
  // 随机气泡 - 生命节律
  bubbleInterval = window.setInterval(() => {
    if (Math.random() < 0.15 && !isSleeping.value) {
      createBubble()
    }
  }, 1000)
  
  // 神经光丝闪烁
  neuronInterval = window.setInterval(() => {
    if (isActive.value && Math.random() < 0.4) {
      createNeuron()
    }
  }, 300)
  
  // 初始沉睡定时
  sleepTimeout = window.setTimeout(() => {
    isSleeping.value = true
  }, 8000)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearInterval(breathInterval)
  clearInterval(bubbleInterval)
  clearInterval(neuronInterval)
  clearTimeout(sleepTimeout)
  clearTimeout(resistTimeout)
})
</script>

<style scoped>
.liquid-glass {
  position: relative;
  transform-style: preserve-3d;
  will-change: transform;
  border-radius: inherit;
}

/* 焦散光斑阴影 */
.caustics-shadow {
  position: absolute;
  inset: -30%;
  border-radius: inherit;
  pointer-events: none;
  z-index: -1;
  transition: all 0.8s ease;
}

/* 基础玻璃层 - 90%透明+10%雾感 */
.glass-base {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  overflow: hidden;
}

.glass-base::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.2) 0%,
    transparent 50%,
    rgba(0, 0, 0, 0.02) 100%
  );
  pointer-events: none;
}

/* 液态流动层 - 蜂蜜般粘稠 */
.glass-liquid {
  position: absolute;
  inset: -10%;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  transition: transform 1s cubic-bezier(0.23, 1, 0.32, 1);
}

.liquid-layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  filter: blur(40px);
  opacity: 0.4;
  animation: liquid-flow 8s ease-in-out infinite;
}

.layer-1 {
  background: radial-gradient(
    ellipse at 30% 20%,
    rgba(139, 92, 246, 0.3) 0%,
    transparent 50%
  );
  animation-delay: 0s;
}

.layer-2 {
  background: radial-gradient(
    ellipse at 70% 60%,
    rgba(16, 185, 129, 0.2) 0%,
    transparent 45%
  );
  animation-delay: -2.5s;
}

.layer-3 {
  background: radial-gradient(
    ellipse at 50% 80%,
    rgba(59, 130, 246, 0.15) 0%,
    transparent 55%
  );
  animation-delay: -5s;
}

@keyframes liquid-flow {
  0%, 100% {
    transform: translate(0, 0) scale(1) rotate(0deg);
  }
  25% {
    transform: translate(2%, -1%) scale(1.02) rotate(1deg);
  }
  50% {
    transform: translate(-1%, 2%) scale(1) rotate(-1deg);
  }
  75% {
    transform: translate(-2%, -1%) scale(0.98) rotate(0.5deg);
  }
}

/* 内部纹理 - 视差深度 */
.glass-texture {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: 
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 20%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.08) 0%, transparent 25%);
  pointer-events: none;
  transition: all 0.8s ease;
}

/* 雾感层 */
.glass-fog {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  transition: all 0.6s ease;
}

/* 霓虹辉光边缘 */
.glass-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid transparent;
  pointer-events: none;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

/* 镜面反射 */
.glass-reflection {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  transition: all 0.5s ease;
}

/* 涟漪 - 粘稠传播 */
.ripple {
  position: absolute;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 
    0 0 20px rgba(139, 92, 246, 0.3),
    inset 0 0 20px rgba(255, 255, 255, 0.2);
  animation: ripple-viscous 2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes ripple-viscous {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0.8;
    border-width: 3px;
  }
  50% {
    opacity: 0.4;
    border-width: 1.5px;
  }
  100% {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
    border-width: 0.5px;
  }
}

/* 气泡 */
.bubble {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation: bubble-rise 5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.bubble-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.4) 40%,
    rgba(255, 255, 255, 0.1) 70%,
    transparent 100%
  );
  box-shadow: 
    0 0 10px rgba(255, 255, 255, 0.3),
    inset 0 0 10px rgba(255, 255, 255, 0.5);
}

@keyframes bubble-rise {
  0% {
    transform: translateY(0) scale(0);
  }
  10% {
    transform: translateY(-5%) scale(1);
  }
  90% {
    transform: translateY(-90%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-100%) scale(1.3);
    opacity: 0;
  }
}

/* 神经光丝网络 */
.neural-network {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}

.neural-path {
  position: absolute;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(139, 92, 246, 0.8) 20%,
    rgba(255, 255, 255, 0.9) 50%,
    rgba(139, 92, 246, 0.8) 80%,
    transparent 100%
  );
  border-radius: 1px;
  transform-origin: left center;
  animation: neural-pulse 1s ease-out forwards;
  box-shadow: 
    0 0 8px rgba(139, 92, 246, 0.8),
    0 0 16px rgba(139, 92, 246, 0.4);
}

@keyframes neural-pulse {
  0% {
    opacity: 0;
    transform: scaleX(0);
  }
  20% {
    opacity: 1;
    transform: scaleX(0.3);
  }
  100% {
    opacity: 0;
    transform: scaleX(1);
  }
}

/* 内容层 */
.glass-content {
  position: relative;
  z-index: 10;
  border-radius: inherit;
  transition: all 0.5s ease;
}

/* 抵抗态 - 0.3秒收缩 */
.liquid-glass.is-resisting {
  transform: scale(0.97) !important;
}

.liquid-glass.is-resisting .glass-base {
  background: linear-gradient(
    135deg,
    rgba(200, 210, 230, 0.8) 0%,
    rgba(220, 225, 240, 0.7) 100%
  );
}

/* 沉睡态 */
.liquid-glass.is-sleeping {
  transform: perspective(1500px) rotateX(8deg) rotateY(-3deg) scale(0.96) !important;
}

.liquid-glass.is-sleeping .glass-liquid {
  animation-play-state: paused;
  opacity: 0.3;
}

.liquid-glass.is-sleeping .glass-glow {
  box-shadow: 
    0 0 10px rgba(139, 92, 246, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.2) !important;
}

.liquid-glass.is-sleeping .glass-reflection {
  opacity: 0.2;
}

/* 激活态 */
.liquid-glass.is-active .glass-liquid {
  opacity: 0.7;
}

.liquid-glass.is-active .glass-base {
  background: linear-gradient(
    135deg,
    rgba(255, 250, 240, 0.8) 0%,
    rgba(255, 245, 250, 0.75) 100%
  );
}

/* 按压态 */
.liquid-glass.is-pressed {
  transition: transform 0.1s ease-out !important;
}

.liquid-glass.is-pressed .glass-base {
  background: linear-gradient(
    135deg,
    rgba(240, 240, 245, 0.85) 0%,
    rgba(235, 235, 240, 0.8) 100%
  );
  box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.1);
}

/* 悬浮态增强 */
.liquid-glass.is-hovered .glass-liquid .liquid-layer {
  opacity: 0.6;
}

.liquid-glass.is-hovered .glass-reflection {
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
