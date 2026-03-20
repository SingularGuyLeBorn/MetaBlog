/**
 * 动画 Composable - 管理滚动触发动画和页面过渡
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

// ========== 滚动触发动画 ==========

export function useScrollAnimation(
  threshold: number = 0.1,
  rootMargin: string = '0px 0px -50px 0px'
) {
  const elements = ref<Set<Element>>(new Set())
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            // 可选：触发后停止观察
            // observer?.unobserve(entry.target)
          }
        })
      },
      {
        threshold,
        rootMargin,
      }
    )

    // 观察所有带有滚动动画类的元素
    document.querySelectorAll('.scroll-fade-in, .scroll-scale-in').forEach((el) => {
      elements.value.add(el)
      observer?.observe(el)
    })
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  // 手动添加元素
  const observe = (el: Element) => {
    if (observer && !elements.value.has(el)) {
      elements.value.add(el)
      observer.observe(el)
    }
  }

  return { observe }
}

// ========== 页面过渡动画 ==========

export function usePageTransition() {
  const isTransitioning = ref(false)

  const beforeEnter = (el: Element) => {
    isTransitioning.value = true
  }

  const afterEnter = (el: Element) => {
    isTransitioning.value = false
  }

  const beforeLeave = (el: Element) => {
    isTransitioning.value = true
  }

  const afterLeave = (el: Element) => {
    isTransitioning.value = false
  }

  return {
    isTransitioning,
    beforeEnter,
    afterEnter,
    beforeLeave,
    afterLeave,
  }
}

// ========== 列表交错动画 ==========

export function useStaggerAnimation(baseDelay: number = 50) {
  const getDelay = (index: number): string => {
    return `${index * baseDelay}ms`
  }

  const applyStagger = (container: HTMLElement) => {
    const children = container.children
    Array.from(children).forEach((child, index) => {
      ;(child as HTMLElement).style.animationDelay = getDelay(index)
    })
  }

  return { getDelay, applyStagger }
}

// ========== 鼠标跟随效果 ==========

export function useMouseFollow(speed: number = 0.1) {
  const mouseX = ref(0)
  const mouseY = ref(0)
  const currentX = ref(0)
  const currentY = ref(0)
  let rafId: number | null = null

  const handleMouseMove = (e: MouseEvent) => {
    mouseX.value = e.clientX
    mouseY.value = e.clientY
  }

  const animate = () => {
    currentX.value += (mouseX.value - currentX.value) * speed
    currentY.value += (mouseY.value - currentY.value) * speed
    rafId = requestAnimationFrame(animate)
  }

  onMounted(() => {
    window.addEventListener('mousemove', handleMouseMove)
    animate()
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { x: currentX, y: currentY }
}

// ========== 呼吸效果 ==========

export function useBreathing(
  minScale: number = 1,
  maxScale: number = 1.05,
  duration: number = 3000
) {
  const style = ref({
    animation: `breathe ${duration}ms ease-in-out infinite`,
  })

  return { style }
}

// ========== 脉冲效果 ==========

export function usePulse(duration: number = 2000) {
  const style = ref({
    animation: `pulse ${duration}ms cubic-bezier(0.4, 0, 0.6, 1) infinite`,
  })

  return { style }
}

// ========== 浮动效果 ==========

export function useFloat(
  distance: number = 10,
  duration: number = 3000
) {
  const style = ref({
    animation: `float ${duration}ms ease-in-out infinite`,
  })

  return { style }
}

// ========== 震动效果 ==========

export function useShake() {
  const isShaking = ref(false)

  const shake = () => {
    isShaking.value = true
    setTimeout(() => {
      isShaking.value = false
    }, 500)
  }

  const style = computed(() => ({
    animation: isShaking.value ? 'shake 0.5s ease-in-out' : 'none',
  }))

  return { isShaking, shake, style }
}

// ========== 渐变边框 ==========

export function useGradientBorder(
  colors: string[] = ['#3b82f6', '#9333ea', '#3b82f6'],
  speed: number = 3
) {
  const style = ref({
    position: 'relative',
    '::before': {
      content: '',
      position: 'absolute',
      inset: '-2px',
      background: `linear-gradient(135deg, ${colors.join(', ')})`,
      'background-size': '200% 200%',
      'border-radius': 'inherit',
      'z-index': '-1',
      animation: `borderFlow ${speed}s ease infinite`,
    },
  })

  return { style }
}

// ========== 视差滚动 ==========

export function useParallax(speed: number = 0.5) {
  const offset = ref(0)
  let rafId: number | null = null

  const handleScroll = () => {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      offset.value = window.scrollY * speed
      rafId = null
    })
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { offset }
}

// ========== 文字打字机效果 ==========

export function useTypewriter(
  text: string,
  speed: number = 50,
  delay: number = 0
) {
  const displayText = ref('')
  const isTyping = ref(false)
  const isComplete = ref(false)

  const type = async () => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))

    isTyping.value = true
    isComplete.value = false
    displayText.value = ''

    for (let i = 0; i < text.length; i++) {
      displayText.value += text[i]
      await new Promise((r) => setTimeout(r, speed))
    }

    isTyping.value = false
    isComplete.value = true
  }

  const reset = () => {
    displayText.value = ''
    isTyping.value = false
    isComplete.value = false
  }

  return {
    text: displayText,
    isTyping,
    isComplete,
    type,
    reset,
  }
}

// ========== 计数器动画 ==========

export function useCountUp(
  target: number,
  duration: number = 2000,
  delay: number = 0
) {
  const current = ref(0)
  const isAnimating = ref(false)

  const easeOutQuart = (t: number): number => {
    return 1 - Math.pow(1 - t, 4)
  }

  const count = async () => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))

    isAnimating.value = true
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutQuart(progress)

      current.value = Math.floor(eased * target)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        current.value = target
        isAnimating.value = false
      }
    }

    requestAnimationFrame(animate)
  }

  return { current, isAnimating, count }
}

export default {
  useScrollAnimation,
  usePageTransition,
  useStaggerAnimation,
  useMouseFollow,
  useBreathing,
  usePulse,
  useFloat,
  useShake,
  useGradientBorder,
  useParallax,
  useTypewriter,
  useCountUp,
}
