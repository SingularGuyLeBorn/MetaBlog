/**
 * 增强交互动效 - Enhanced Interactive Effects
 * 
 * - 3D 卡片倾斜 (3D Card Tilt)
 * - 涟漪效果 (Ripple Effect)
 * - 扫描线效果 (Scanline Effect)
 */

// ===== 3D 卡片倾斜效果 =====
export function initCardTilt() {
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

// ===== 涟漪效果 =====
export function initRipple() {
  const buttons = document.querySelectorAll('.ripple-btn')
  
  buttons.forEach(btn => {
    const htmlBtn = btn as HTMLElement
    
    const createRipple = (e: MouseEvent) => {
      const rect = htmlBtn.getBoundingClientRect()
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
      
      htmlBtn.style.position = 'relative'
      htmlBtn.style.overflow = 'hidden'
      htmlBtn.appendChild(ripple)
      
      setTimeout(() => ripple.remove(), 600)
    }
    
    htmlBtn.addEventListener('click', (e) => createRipple(e as MouseEvent))
  })
}

// ===== 扫描线效果 =====
export function initScanline() {
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

// ===== 初始化所有效果 =====
export function initInteractiveEffects() {
  initCardTilt()
  initRipple()
  initScanline()
}

// ===== 数字滚动动画 =====
export function useCountUp(target: number, duration: number = 2000) {
  const current = ref(0)
  let rafId: number | null = null
  
  const start = () => {
    const startTime = performance.now()
    
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      current.value = Math.floor(target * easeOut)
      
      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }
    
    rafId = requestAnimationFrame(animate)
  }
  
  const stop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }
  
  return { current, start, stop }
}

// Import ref for useCountUp
import { ref } from 'vue'
