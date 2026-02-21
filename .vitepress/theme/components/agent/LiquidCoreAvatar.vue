<template>
  <div class="liquid-avatar-container" :class="{ 'is-thinking': isThinking, 'hover': isHover }" :style="containerStyle">
    <canvas ref="canvasRef" class="liquid-canvas" :width="size * 2" :height="size * 2"></canvas>
    <div class="liquid-glow"></div>
    <div class="liquid-highlight"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

const props = defineProps<{
  size?: number
  isThinking?: boolean
}>()

const canvasRef = ref<HTMLCanvasElement>()
const isHover = ref(false)
let animationId: number
let time = 0

const size = computed(() => props.size || 56)

const containerStyle = computed(() => ({
  width: `${size.value}px`,
  height: `${size.value}px`
}))

// 颜色配置 - 浅色模式下的极地冰与晨光
const colors = {
  base: { r: 200, g: 240, b: 255 },     // 天青色基底
  core: { r: 120, g: 200, b: 255 },     // 核心亮蓝
  accent: { r: 224, g: 195, b: 252 },   // 雾紫色
  glow: { r: 0, g: 212, b: 255 },       // 发光色
  highlight: { r: 255, g: 255, b: 255, a: 0.4 } // 高光
}

class Particle {
  x: number
  y: number
  z: number // 深度层 0-1
  size: number
  speedX: number
  speedY: number
  phase: number
  brightness: number

  constructor(centerX: number, centerY: number, radius: number) {
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * radius * 0.7
    this.x = centerX + Math.cos(angle) * dist
    this.y = centerY + Math.sin(angle) * dist
    this.z = Math.random() // 深度
    this.size = 1 + Math.random() * 2
    this.speedX = (Math.random() - 0.5) * 0.5
    this.speedY = (Math.random() - 0.5) * 0.5
    this.phase = Math.random() * Math.PI * 2
    this.brightness = 0.5 + Math.random() * 0.5
  }

  update(centerX: number, centerY: number, radius: number, deltaTime: number, isThinking: boolean) {
    // 根据深度调整速度
    const depthFactor = 0.3 + this.z * 0.7
    const speedMultiplier = isThinking ? 3 : 1
    
    this.x += this.speedX * depthFactor * speedMultiplier
    this.y += this.speedY * depthFactor * speedMultiplier
    
    // 布朗运动
    this.x += (Math.random() - 0.5) * 0.3 * speedMultiplier
    this.y += (Math.random() - 0.5) * 0.3 * speedMultiplier
    
    // 限制在球体内
    const dx = this.x - centerX
    const dy = this.y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > radius * 0.8) {
      const angle = Math.atan2(dy, dx)
      this.x = centerX + Math.cos(angle) * radius * 0.8
      this.y = centerY + Math.sin(angle) * radius * 0.8
      this.speedX *= -0.8
      this.speedY *= -0.8
    }
    
    // 更新亮度
    this.brightness = 0.5 + Math.sin(deltaTime * 0.002 + this.phase) * 0.3
    if (isThinking) {
      this.brightness = 0.8 + Math.sin(deltaTime * 0.01 + this.phase) * 0.2
    }
  }
}

let particles: Particle[] = []

function initParticles(centerX: number, centerY: number, radius: number) {
  particles = []
  const count = 50 + Math.floor(Math.random() * 30) // 50-80个粒子
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(centerX, centerY, radius))
  }
}

function render() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvas.width
  const height = canvas.height
  const centerX = width / 2
  const centerY = height / 2
  const radius = (Math.min(width, height) / 2) - 4
  
  // 呼吸效果
  const breathe = props.isThinking 
    ? 1 + Math.sin(time * 0.01) * 0.05 // 思考时快速呼吸
    : 1 + Math.sin(time * 0.0015) * 0.04 // 正常呼吸 4秒周期
  
  const currentRadius = radius * breathe
  
  // 清空画布
  ctx.clearRect(0, 0, width, height)
  
  // 创建径向渐变
  const gradient = ctx.createRadialGradient(
    centerX - radius * 0.2, centerY - radius * 0.2, 0,
    centerX, centerY, currentRadius
  )
  
  if (props.isThinking) {
    // 思考时更亮更活跃
    gradient.addColorStop(0, `rgba(${colors.core.r}, ${colors.core.g}, ${colors.core.b}, 0.95)`)
    gradient.addColorStop(0.4, `rgba(${colors.base.r}, ${colors.base.g}, ${colors.base.b}, 0.8)`)
    gradient.addColorStop(0.8, `rgba(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b}, 0.6)`)
    gradient.addColorStop(1, `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, 0.3)`)
  } else {
    // 正常状态
    gradient.addColorStop(0, `rgba(${colors.core.r}, ${colors.core.g}, ${colors.core.b}, 0.9)`)
    gradient.addColorStop(0.5, `rgba(${colors.base.r}, ${colors.base.g}, ${colors.base.b}, 0.7)`)
    gradient.addColorStop(0.9, `rgba(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b}, 0.5)`)
    gradient.addColorStop(1, `rgba(${colors.base.r}, ${colors.base.g}, ${colors.base.b}, 0.2)`)
  }
  
  // 绘制主球体
  ctx.save()
  ctx.beginPath()
  
  // 使用噪声生成有机边缘
  const noiseScale = 0.1
  const noiseAmplitude = props.isThinking ? 3 : 2
  
  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
    // 使用多个正弦波模拟柏林噪声
    const noise = Math.sin(angle * 3 + time * 0.002) * 0.5 +
                  Math.sin(angle * 5 - time * 0.003) * 0.3 +
                  Math.sin(angle * 7 + time * 0.001) * 0.2
    
    const r = currentRadius * (1 + noise * noiseAmplitude / radius)
    const x = centerX + Math.cos(angle) * r
    const y = centerY + Math.sin(angle) * r
    
    if (angle === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.filter = 'blur(1px)'
  ctx.fill()
  ctx.restore()
  
  // 绘制内部粒子
  particles.forEach(particle => {
    particle.update(centerX, centerY, currentRadius, time, props.isThinking || false)
    
    // 根据深度计算透明度和大小
    const depthAlpha = 0.3 + particle.z * 0.7
    const depthSize = particle.size * (0.5 + particle.z * 0.5)
    
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, depthSize, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${particle.brightness * depthAlpha})`
    ctx.fill()
  })
  
  // 绘制高光
  ctx.beginPath()
  ctx.ellipse(
    centerX - currentRadius * 0.3,
    centerY - currentRadius * 0.3,
    currentRadius * 0.2,
    currentRadius * 0.15,
    Math.PI / 4,
    0, Math.PI * 2
  )
  ctx.fillStyle = `rgba(255, 255, 255, ${props.isThinking ? 0.5 : 0.3})`
  ctx.filter = 'blur(3px)'
  ctx.fill()
  ctx.filter = 'none'
  
  // 思考时添加能量脉冲效果
  if (props.isThinking) {
    ctx.beginPath()
    ctx.arc(centerX, centerY, currentRadius * (1 + Math.sin(time * 0.02) * 0.1), 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, 0.3)`
    ctx.lineWidth = 2
    ctx.stroke()
  }
  
  time += 16 // 约60fps
  animationId = requestAnimationFrame(render)
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = (Math.min(canvas.width, canvas.height) / 2) - 4
  
  initParticles(centerX, centerY, radius)
  render()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})

// 监听思考状态变化
watch(() => props.isThinking, (newVal) => {
  if (newVal) {
    // 开始思考时加速粒子
    particles.forEach(p => {
      p.speedX *= 2
      p.speedY *= 2
    })
  }
})
</script>

<style scoped>
.liquid-avatar-container {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 
    0 0 20px rgba(0, 212, 255, 0.3),
    inset 0 0 20px rgba(224, 195, 252, 0.2);
}

.liquid-avatar-container:hover {
  transform: scale(1.1);
  box-shadow: 
    0 0 30px rgba(0, 212, 255, 0.5),
    inset 0 0 30px rgba(224, 195, 252, 0.3);
}

.liquid-avatar-container.is-thinking {
  animation: thinking-pulse 0.5s ease-in-out infinite;
}

@keyframes thinking-pulse {
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(224, 195, 252, 0.3);
  }
  50% { 
    box-shadow: 0 0 40px rgba(0, 212, 255, 0.6), inset 0 0 30px rgba(224, 195, 252, 0.4);
  }
}

.liquid-canvas {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.liquid-glow {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
  animation: glow-rotate 10s linear infinite;
}

@keyframes glow-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.liquid-highlight {
  position: absolute;
  top: 15%;
  left: 20%;
  width: 25%;
  height: 20%;
  background: radial-gradient(ellipse, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(2px);
  pointer-events: none;
}
</style>
