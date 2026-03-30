<template>
  <div class="star-river-layout">
    <!-- 星河背景层 - 浅色 -->
    <div class="star-river-bg" ref="bgRef"></div>
    
    <!-- 视差背景层 -->
    <div class="parallax-layer-bg" data-parallax="0.3" ref="parallaxBgRef">
      <div class="nebula nebula-1"></div>
      <div class="nebula nebula-2"></div>
    </div>
    <div class="parallax-layer-mid" data-parallax="0.6" ref="parallaxMidRef">
      <div class="stars-container" ref="starsContainerRef"></div>
    </div>
    
    <!-- 光标聚光灯 -->
    <div 
      class="cursor-spotlight"
      :style="{
        left: `${spotlightX}px`,
        top: `${spotlightY}px`,
        opacity: isInContent ? 0.6 : 0
      }"
      ref="spotlightRef"
    ></div>
    
    <!-- 自定义光标 -->
    <div 
      class="custom-cursor"
      :class="{ hover: isHovering }"
      :style="{
        left: `${cursorX}px`,
        top: `${cursorY}px`
      }"
      v-if="!isTouchDevice"
    ></div>
    
    <!-- 主内容 -->
    <div class="sr-main-content" ref="contentRef">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

// 响应式状态
const spotlightX = ref(0)
const spotlightY = ref(0)
const cursorX = ref(0)
const cursorY = ref(0)
const isInContent = ref(false)
const isHovering = ref(false)
const isTouchDevice = ref(false)

// Refs
const mainContentRef = ref<HTMLElement | null>(null)
const starsContainerRef = ref<HTMLElement | null>(null)

let rafId: number | null = null
let mouseX = 0
let mouseY = 0

// 平滑光标位置（插值）
const smoothCursor = () => {
  const ease = 0.12
  spotlightX.value += (mouseX - spotlightX.value) * ease
  spotlightY.value += (mouseY - spotlightY.value) * ease
  cursorX.value += (mouseX - cursorX.value) * ease
  cursorY.value += (mouseY - cursorY.value) * ease
  
  rafId = requestAnimationFrame(smoothCursor)
}

// 鼠标移动处理
const handleMouseMove = (e: MouseEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
  
  // 检查是否在内容区域
  if (mainContentRef.value) {
    const rect = mainContentRef.value.getBoundingClientRect()
    isInContent.value = 
      e.clientX >= rect.left && 
      e.clientX <= rect.right &&
      e.clientY >= rect.top && 
      e.clientY <= rect.bottom
  }
}

// 鼠标进入/离开元素
const handleMouseOver = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.matches('button, a, [role="button"], .magnetic-btn, .star-btn, .glass-card-hover')) {
    isHovering.value = true
  }
}

const handleMouseOut = () => {
  isHovering.value = false
}

// 生成星星
const generateStars = () => {
  if (!starsContainerRef.value) return
  
  const starCount = 60
  const fragment = document.createDocumentFragment()
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div')
    star.className = 'star'
    star.style.left = `${Math.random() * 100}%`
    star.style.top = `${Math.random() * 100}%`
    star.style.animationDelay = `${Math.random() * 5}s`
    star.style.animationDuration = `${2 + Math.random() * 4}s`
    star.style.opacity = `${Math.random() * 0.4 + 0.1}`
    star.style.transform = `scale(${Math.random() * 0.8 + 0.2})`
    fragment.appendChild(star)
  }
  
  starsContainerRef.value.appendChild(fragment)
}

// 视差效果
const initParallax = () => {
  const parallaxElements = document.querySelectorAll('[data-parallax]')
  if (parallaxElements.length === 0) return
  
  let ticking = false
  let lastScrollY = 0
  
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY
        const deltaY = scrollY - lastScrollY
        lastScrollY = scrollY
        
        parallaxElements.forEach(el => {
          const speed = parseFloat(el.getAttribute('data-parallax') || '0.5')
          const currentTransform = el.getAttribute('data-current-transform') || '0'
          const newTransform = parseFloat(currentTransform) + deltaY * speed
          el.setAttribute('data-current-transform', newTransform.toString())
          ;(el as HTMLElement).style.transform = `translateY(${newTransform}px)`
        })
        
        ticking = false
      })
      ticking = true
    }
  }
  
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => window.removeEventListener('scroll', onScroll)
}

// 滚动触发动画
const initScrollAnimations = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement
          const siblings = Array.from(el.parentElement?.querySelectorAll('.fade-up, .sr-animate') || [])
          const sIndex = siblings.indexOf(el)
          el.style.transitionDelay = `${sIndex * 80}ms`
          
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    },
    {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    }
  )
  
  const elements = document.querySelectorAll('.fade-up, .fade-in, .scale-in, .sr-animate')
  elements.forEach(el => observer.observe(el))
  
  return () => observer.disconnect()
}

// 磁性按钮初始化
const initMagneticButtons = () => {
  const buttons = document.querySelectorAll('.magnetic-btn, .star-btn, .neu-btn')
  
  buttons.forEach(btn => {
    const htmlBtn = btn as HTMLElement
    
    const handleMove = (e: MouseEvent) => {
      const rect = htmlBtn.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const distX = e.clientX - centerX
      const distY = e.clientY - centerY
      
      const distance = Math.sqrt(distX * distX + distY * distY)
      const maxDistance = 100
      
      if (distance < maxDistance) {
        const factor = (1 - distance / maxDistance) * 0.3
        htmlBtn.style.transform = `translate(${distX * factor}px, ${distY * factor}px)`
      }
    }
    
    const handleLeave = () => {
      htmlBtn.style.transform = ''
      htmlBtn.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      setTimeout(() => {
        htmlBtn.style.transition = ''
      }, 400)
    }
    
    htmlBtn.addEventListener('mousemove', handleMove)
    htmlBtn.addEventListener('mouseleave', handleLeave)
  })
}

const route = useRoute()

onMounted(() => {
  // 检测设备类型
  isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
  
  if (!isTouchDevice.value) {
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseout', handleMouseOut)
    rafId = requestAnimationFrame(smoothCursor)
  }
  
  generateStars()
  
  // 延迟初始化确保 DOM 已渲染
  setTimeout(() => {
    initScrollAnimations()
    initMagneticButtons()
    initParallax()
  }, 100)
})

// FIX: Re-initialize animations on route change
watch(() => route.path, () => {
  nextTick(() => {
    setTimeout(() => {
      initScrollAnimations()
      initMagneticButtons()
    }, 150)
  })
})

onUnmounted(() => {
  if (!isTouchDevice.value) {
    window.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseover', handleMouseOver)
    document.removeEventListener('mouseout', handleMouseOut)
  }
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.star-river-layout {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.star-river-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -3;
  background: 
    /* 柔和的莫兰迪色光晕 */
    radial-gradient(ellipse 80% 50% at 20% 80%, rgba(179, 168, 184, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 80% 20%, rgba(154, 168, 179, 0.12) 0%, transparent 40%),
    radial-gradient(ellipse 50% 30% at 50% 50%, rgba(196, 189, 181, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 30% 30%, rgba(201, 184, 179, 0.1) 0%, transparent 50%),
    #f8f6f3;
}

.nebula {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
}

.nebula-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(179, 168, 184, 0.5) 0%, transparent 70%);
  top: 10%;
  right: -150px;
}

.nebula-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(154, 168, 179, 0.4) 0%, transparent 70%);
  bottom: 10%;
  left: -100px;
}

.stars-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

:deep(.star) {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #b8a090;
  border-radius: 50%;
  opacity: 0;
  animation: star-twinkle 4s ease-in-out infinite;
}

@keyframes star-twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.8); }
  50% { opacity: 0.4; transform: scale(1.2); }
}

.cursor-spotlight {
  position: fixed;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, 
    rgba(184, 160, 144, 0.08) 0%,
    rgba(179, 168, 184, 0.04) 30%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
  transform: translate(-50%, -50%);
  transition: opacity 0.6s ease;
}

.custom-cursor {
  position: fixed;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(45, 42, 38, 0.3);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  transition: width 0.2s, height 0.2s, background 0.2s, border-color 0.2s;
  mix-blend-mode: difference;
}

.custom-cursor.hover {
  width: 50px;
  height: 50px;
  background: rgba(184, 160, 144, 0.08);
  border-color: rgba(45, 42, 38, 0.5);
}

.sr-main-content {
  position: relative;
  z-index: 1;
}

/* 触摸设备隐藏光标效果 */
@media (pointer: coarse) {
  .cursor-spotlight,
  .custom-cursor {
    display: none !important;
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .cursor-spotlight,
  .custom-cursor {
    display: none !important;
  }
}
</style>
