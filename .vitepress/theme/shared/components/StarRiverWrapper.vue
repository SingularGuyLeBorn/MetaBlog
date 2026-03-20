<template>
  <div class="star-river-wrapper">
    <!-- 星河背景 -->
    <div class="star-river-bg"></div>
    
    <!-- 星星容器 -->
    <div class="stars" ref="starsRef"></div>
    
    <!-- 光标聚光灯 -->
    <div 
      class="cursor-spotlight"
      :style="{
        left: `${spotlightX}px`,
        top: `${spotlightY}px`,
        opacity: isInContent ? 1 : 0
      }"
    ></div>
    
    <!-- 主内容 -->
    <div class="sr-content" ref="contentRef">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const starsRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const spotlightX = ref(0)
const spotlightY = ref(0)
const isInContent = ref(false)

// 生成星星
const generateStars = () => {
  if (!starsRef.value) return
  
  const starCount = 60
  const fragment = document.createDocumentFragment()
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div')
    star.className = 'star'
    star.style.left = `${Math.random() * 100}%`
    star.style.top = `${Math.random() * 100}%`
    star.style.animationDelay = `${Math.random() * 5}s`
    star.style.opacity = `${Math.random() * 0.4 + 0.1}`
    star.style.transform = `scale(${Math.random() * 0.5 + 0.5})`
    fragment.appendChild(star)
  }
  
  starsRef.value.appendChild(fragment)
}

// 鼠标跟随
const handleMouseMove = (e: MouseEvent) => {
  spotlightX.value = e.clientX
  spotlightY.value = e.clientY
  
  // 检查是否在内容区域
  if (contentRef.value) {
    const rect = contentRef.value.getBoundingClientRect()
    isInContent.value = 
      e.clientX >= rect.left && 
      e.clientX <= rect.right &&
      e.clientY >= rect.top && 
      e.clientY <= rect.bottom
  }
}

// 滚动动画
const initScrollAnimations = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          
          // 添加弹性延迟效果
          const el = entry.target as HTMLElement
          const siblings = Array.from(el.parentElement?.children || [])
          const index = siblings.indexOf(el)
          el.style.transitionDelay = `${index * 50}ms`
          
          observer.unobserve(entry.target)
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    }
  )
  
  const elements = document.querySelectorAll('.fade-up, .sr-animate')
  elements.forEach(el => observer.observe(el))
  
  return () => observer.disconnect()
}

// 磁性按钮初始化
const initMagneticButtons = () => {
  const buttons = document.querySelectorAll('.magnetic-btn, .star-btn')
  
  buttons.forEach(btn => {
    const htmlBtn = btn as HTMLElement
    
    const handleMove = (e: MouseEvent) => {
      const rect = htmlBtn.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const distX = e.clientX - centerX
      const distY = e.clientY - centerY
      
      const distance = Math.sqrt(distX * distX + distY * distY)
      const maxDistance = 120
      
      if (distance < maxDistance) {
        const factor = (1 - distance / maxDistance) * 0.4
        htmlBtn.style.transform = `translate(${distX * factor}px, ${distY * factor}px) scale(1.02)`
      }
    }
    
    const handleLeave = () => {
      htmlBtn.style.transform = ''
    }
    
    htmlBtn.addEventListener('mousemove', handleMove)
    htmlBtn.addEventListener('mouseleave', handleLeave)
  })
}

// 视差效果
const initParallax = () => {
  const parallaxElements = document.querySelectorAll('[data-parallax]')
  if (parallaxElements.length === 0) return
  
  let ticking = false
  
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY
        
        parallaxElements.forEach(el => {
          const speed = parseFloat(el.getAttribute('data-parallax') || '0.5')
          ;(el as HTMLElement).style.transform = `translateY(${scrollY * speed}px)`
        })
        
        ticking = false
      })
      ticking = true
    }
  }
  
  window.addEventListener('scroll', onScroll, { passive: true })
  return () => window.removeEventListener('scroll', onScroll)
}

onMounted(() => {
  generateStars()
  window.addEventListener('mousemove', handleMouseMove)
  
  // 延迟初始化确保DOM已渲染
  setTimeout(() => {
    initScrollAnimations()
    initMagneticButtons()
    initParallax()
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style scoped>
.star-river-wrapper {
  min-height: 100vh;
  position: relative;
}

.star-river-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background: 
    radial-gradient(ellipse at 10% 90%, rgba(184, 169, 201, 0.12) 0%, transparent 40%),
    radial-gradient(ellipse at 90% 10%, rgba(138, 154, 170, 0.08) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 50%, rgba(196, 167, 167, 0.04) 0%, transparent 60%),
    radial-gradient(ellipse at 30% 30%, rgba(232, 213, 183, 0.06) 0%, transparent 50%),
    var(--sr-bg-primary, #0a0a0f);
}

.stars {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}

.star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #e8d5b7;
  border-radius: 50%;
  opacity: 0.3;
  animation: twinkle 3s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.6; }
}

.cursor-spotlight {
  position: fixed;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, 
    rgba(232, 213, 183, 0.06) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
  transform: translate(-50%, -50%);
  transition: opacity 0.5s ease;
}

.sr-content {
  position: relative;
  z-index: 1;
}
</style>
