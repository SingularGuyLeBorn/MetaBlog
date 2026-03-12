/**
 * 增强交互动效 - Enhanced Interactive Effects
 * 
 * - 3D 卡片倾斜 (3D Card Tilt)
 * - 打字机效果 (Typewriter)
 * - 呼吸动画 (Breathing Animation)
 * - 浮动粒子 (Floating Particles)
 * - 涟漪效果 (Ripple Effect)
 */

import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// ===== 3D 卡片倾斜效果 =====
export function useCardTilt() {
  const initTilt = () => {
    const cards = document.querySelectorAll('.tilt-card')
    
    cards.forEach(card => {
      const htmlCard = card as HTMLElement
      
      const handleMove = (e: MouseEvent) => {
        const rect = htmlCard.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        
        const rotateX = (y - centerY) / centerY * -8
        const rotateY = (x - centerX) / centerX * 8
        
        htmlCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
        htmlCard.style.transition = 'transform 0.1s ease-out'
      }
      
      const handleLeave = () => {
        htmlCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'
        htmlCard.style.transition = 'transform 0.5s var(--sr-spring-bounce)'
      }
      
      htmlCard.addEventListener('mousemove', handleMove)
      htmlCard.addEventListener('mouseleave', handleLeave)
    })
  }
  
  return { initTilt }
}

// ===== 打字机效果 =====
export function useTypewriter(text: string, speed: number = 80) {
  const displayText = ref('')
  const isTyping = ref(false)
  
  const type = async () => {
    isTyping.value = true
    displayText.value = ''
    
    for (let i = 0; i < text.length; i++) {
      displayText.value += text[i]
      await new Promise(resolve => setTimeout(resolve, speed))
    }
    
    isTyping.value = false
  }
  
  return { displayText, isTyping, type }
}

// ===== 涟漪效果 =====
export function useRipple() {
  const createRipple = (e: MouseEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const ripple = document.createElement('span')
    ripple.className = 'ripple-effect'
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(184, 160, 144, 0.3);
      pointer-events: none;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      left: ${x}px;
      top: ${y}px;
      width: 20px;
      height: 20px;
      margin-left: -10px;
      margin-top: -10px;
    `
    
    element.style.position = 'relative'
    element.style.overflow = 'hidden'
    element.appendChild(ripple)
    
    setTimeout(() => ripple.remove(), 600)
  }
  
  const initRipple = () => {
    const buttons = document.querySelectorAll('.ripple-btn')
    
    buttons.forEach(btn => {
      const htmlBtn = btn as HTMLElement
      htmlBtn.addEventListener('click', (e) => createRipple(e, htmlBtn))
    })
  }
  
  return { initRipple, createRipple }
}

// ===== 浮动粒子 =====
export function useFloatingParticles() {
  const particles = ref<Array<{x: number, y: number, size: number, speed: number, opacity: number}>>([])
  
  const initParticles = (container: HTMLElement, count: number = 20) => {
    const containerRect = container.getBoundingClientRect()
    
    for (let i = 0; i < count; i++) {
      particles.value.push({
        x: Math.random() * containerRect.width,
        y: Math.random() * containerRect.height,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.2
      })
    }
  }
  
  return { particles, initParticles }
}

// ===== 数字滚动动画 =====
export function useCountUp(target: number, duration: number = 2000) {
  const current = ref(0)
  
  const start = () => {
    const startTime = performance.now()
    
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      current.value = Math.floor(target * easeOut)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }
  
  return { current, start }
}

// ===== 鼠标轨迹粒子 =====
export function useMouseTrail() {
  const trail = ref<Array<{x: number, y: number, life: number}>>([])
  let rafId: number | null = null
  
  const addParticle = (x: number, y: number) => {
    trail.value.push({ x, y, life: 1 })
    if (trail.value.length > 20) {
      trail.value.shift()
    }
  }
  
  const update = () => {
    trail.value = trail.value.map(p => ({ ...p, life: p.life - 0.02 })).filter(p => p.life > 0)
    rafId = requestAnimationFrame(update)
  }
  
  onMounted(() => {
    rafId = requestAnimationFrame(update)
  })
  
  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })
  
  return { trail, addParticle }
}

// ===== 视差滚动增强 =====
export function useParallaxScroll() {
  const parallaxElements = ref<Array<{element: HTMLElement, speed: number}>>([])
  
  const register = (element: HTMLElement, speed: number = 0.5) => {
    parallaxElements.value.push({ element, speed })
  }
  
  const update = () => {
    const scrollY = window.scrollY
    
    parallaxElements.value.forEach(({ element, speed }) => {
      const yPos = scrollY * speed
      element.style.transform = `translateY(${yPos}px)`
    })
  }
  
  onMounted(() => {
    window.addEventListener('scroll', update, { passive: true })
  })
  
  onUnmounted(() => {
    window.removeEventListener('scroll', update)
  })
  
  return { register, update }
}

// ===== 扫描线效果 =====
export function useScanline() {
  const initScanline = () => {
    const elements = document.querySelectorAll('.scanline-effect')
    
    elements.forEach(el => {
      const htmlEl = el as HTMLElement
      
      const scanline = document.createElement('div')
      scanline.className = 'scanline-bar'
      scanline.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(184, 160, 144, 0.5), transparent);
        animation: scanline 3s ease-in-out infinite;
        pointer-events: none;
      `
      
      htmlEl.style.position = 'relative'
      htmlEl.style.overflow = 'hidden'
      htmlEl.appendChild(scanline)
    })
  }
  
  return { initScanline }
}

// ===== 初始化所有效果 =====
export function useInteractiveEffects() {
  const { initTilt } = useCardTilt()
  const { initRipple } = useRipple()
  const { initScanline } = useScanline()
  
  onMounted(() => {
    nextTick(() => {
      setTimeout(() => {
        initTilt()
        initRipple()
        initScanline()
      }, 300)
    })
  })
  
  return {
    useCardTilt,
    useTypewriter,
    useRipple,
    useFloatingParticles,
    useCountUp,
    useMouseTrail,
    useParallaxScroll,
    useScanline
  }
}
