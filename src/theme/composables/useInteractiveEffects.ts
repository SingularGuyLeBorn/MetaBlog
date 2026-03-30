import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 数字递增动画
 */
export function useCountUp(
  targetValue: number,
  duration: number = 2000,
  startOnMount: boolean = true
) {
  const currentValue = ref(0)
  let animationId: number | null = null
  let startTime: number | null = null

  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp
    const progress = Math.min((timestamp - startTime) / duration, 1)
    
    // 使用 easeOutQuart 缓动函数
    const easeOutQuart = 1 - Math.pow(1 - progress, 4)
    currentValue.value = Math.floor(easeOutQuart * targetValue)

    if (progress < 1) {
      animationId = requestAnimationFrame(animate)
    }
  }

  const start = () => {
    startTime = null
    currentValue.value = 0
    animationId = requestAnimationFrame(animate)
  }

  const stop = () => {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  onMounted(() => {
    if (startOnMount) {
      start()
    }
  })

  onUnmounted(() => {
    stop()
  })

  return {
    currentValue,
    start,
    stop
  }
}

/**
 * 卡片倾斜效果
 */
export function useTiltEffect(selector: string) {
  onMounted(() => {
    const cards = document.querySelectorAll(selector)
    
    cards.forEach(card => {
      const htmlCard = card as HTMLElement
      
      const handleMouseMove = (e: MouseEvent) => {
        const rect = htmlCard.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = (y - centerY) / centerY * -8
        const rotateY = (x - centerX) / centerX * 8
        
        htmlCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
      }
      
      const handleMouseLeave = () => {
        htmlCard.style.transform = ''
      }
      
      htmlCard.addEventListener('mousemove', handleMouseMove)
      htmlCard.addEventListener('mouseleave', handleMouseLeave)
    })
  })
}
