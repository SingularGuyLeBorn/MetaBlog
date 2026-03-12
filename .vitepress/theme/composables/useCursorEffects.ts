/**
 * 光标特效 - Cursor Effects
 * 
 * - 自定义光标 (mix-blend-mode: difference)
 * - 磁性按钮 (magnetic buttons)
 * - 聚光灯跟随 (spotlight gradient)
 * - 视差背景 (parallax background)
 */

import { ref, onMounted, onUnmounted } from 'vue'

interface CursorPosition {
  x: number
  y: number
}

export function useCursorEffects() {
  const cursorPos = ref<CursorPosition>({ x: 0, y: 0 })
  const isHovering = ref(false)
  
  // 平滑光标位置
  const smoothPos = ref<CursorPosition>({ x: 0, y: 0 })
  let rafId: number | null = null
  
  // 更新光标位置（平滑插值）
  const updateSmoothCursor = () => {
    const ease = 0.15
    smoothPos.value.x += (cursorPos.value.x - smoothPos.value.x) * ease
    smoothPos.value.y += (cursorPos.value.y - smoothPos.value.y) * ease
    
    rafId = requestAnimationFrame(updateSmoothCursor)
  }
  
  // 鼠标移动
  const onMouseMove = (e: MouseEvent) => {
    cursorPos.value = { x: e.clientX, y: e.clientY }
  }
  
  // 磁性按钮效果
  const applyMagneticEffect = (e: MouseEvent, btn: HTMLElement, strength: number = 0.3) => {
    const rect = btn.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const distX = e.clientX - centerX
    const distY = e.clientY - centerY
    
    const distance = Math.sqrt(distX * distX + distY * distY)
    const maxDistance = 100
    
    if (distance < maxDistance) {
      const factor = (1 - distance / maxDistance) * strength
      btn.style.transform = `translate(${distX * factor}px, ${distY * factor}px)`
    }
  }
  
  // 重置磁性按钮
  const resetMagnetic = (btn: HTMLElement) => {
    btn.style.transform = ''
  }
  
  // 初始化
  const initMagneticButtons = () => {
    const buttons = document.querySelectorAll('.magnetic-btn')
    
    buttons.forEach(btn => {
      const htmlBtn = btn as HTMLElement
      
      htmlBtn.addEventListener('mousemove', (e) => {
        applyMagneticEffect(e, htmlBtn)
      })
      
      htmlBtn.addEventListener('mouseleave', () => {
        resetMagnetic(htmlBtn)
      })
    })
  }
  
  // 视差效果
  const initParallax = () => {
    const parallaxBg = document.querySelector('.parallax-bg') as HTMLElement
    const parallaxMid = document.querySelector('.parallax-mid') as HTMLElement
    const parallaxFg = document.querySelector('.parallax-fg') as HTMLElement
    
    if (!parallaxBg && !parallaxMid && !parallaxFg) return
    
    let ticking = false
    
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY
          
          if (parallaxBg) {
            parallaxBg.style.transform = `translateY(${scrollY * 0.3}px)`
          }
          if (parallaxMid) {
            parallaxMid.style.transform = `translateY(${scrollY * 0.6}px)`
          }
          if (parallaxFg) {
            parallaxFg.style.transform = `translateY(${scrollY * 1}px)`
          }
          
          ticking = false
        })
        ticking = true
      }
    }
    
    window.addEventListener('scroll', onScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }
  
  // 滚动触发动画
  const initScrollAnimations = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
      }
    )
    
    const elements = document.querySelectorAll('.fade-up')
    elements.forEach(el => observer.observe(el))
    
    return () => observer.disconnect()
  }
  
  // 生成星星
  const generateStars = () => {
    const starsContainer = document.querySelector('.stars')
    if (!starsContainer) return
    
    const starCount = 50
    
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      star.style.left = `${Math.random() * 100}%`
      star.style.top = `${Math.random() * 100}%`
      star.style.animationDelay = `${Math.random() * 3}s`
      star.style.opacity = `${Math.random() * 0.5 + 0.1}`
      starsContainer.appendChild(star)
    }
  }
  
  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
    rafId = requestAnimationFrame(updateSmoothCursor)
    
    initMagneticButtons()
    initParallax()
    initScrollAnimations()
    generateStars()
  })
  
  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    if (rafId) cancelAnimationFrame(rafId)
  })
  
  return {
    cursorPos,
    smoothPos,
    isHovering
  }
}

// 单独使用 spotlight
export function useSpotlight() {
  const spotlightX = ref(0)
  const spotlightY = ref(0)
  
  const updateSpotlight = (e: MouseEvent) => {
    spotlightX.value = e.clientX
    spotlightY.value = e.clientY
  }
  
  onMounted(() => {
    window.addEventListener('mousemove', updateSpotlight)
  })
  
  onUnmounted(() => {
    window.removeEventListener('mousemove', updateSpotlight)
  })
  
  return {
    spotlightX,
    spotlightY
  }
}
