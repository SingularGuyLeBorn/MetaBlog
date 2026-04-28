/**
 * 打字机效果 composable
 * 用于模拟流式输出的视觉效果
 */
import { computed, ref, watch } from 'vue'

export interface TypewriterOptions {
  /** 打字速度(毫秒/字符) */
  speed?: number
  /** 是否启用打字效果 */
  enabled?: boolean
  /** 最小延迟(毫秒) */
  minDelay?: number
  /** 最大延迟(毫秒) */
  maxDelay?: number
  /** 遇到标点符号时的额外延迟 */
  punctuationDelay?: number
}

export function useTypewriter(options: TypewriterOptions = {}) {
  const {
    speed = 30,
    enabled = true,
    minDelay = 10,
    maxDelay = 100,
    punctuationDelay = 150
  } = options

  const fullText = ref('')
  const displayedText = ref('')
  const isTyping = ref(false)
  const currentIndex = ref(0)
  let animationFrameId: number | null = null
  let lastTypeTime = 0

  const isComplete = computed(() => currentIndex.value >= fullText.value.length)
  const progress = computed(() =>
    fullText.value.length > 0
      ? (currentIndex.value / fullText.value.length) * 100
      : 0
  )

  // 获取下一个字符的延迟时间
  function getDelayForChar(char: string): number {
    // 标点符号增加延迟
    if (/[。！？.!?]/.test(char)) {
      return Math.max(punctuationDelay, speed * 3)
    }
    if (/[，,；;]/.test(char)) {
      return Math.max(punctuationDelay * 0.6, speed * 1.5)
    }
    // 代码块或长段落加速
    if (currentIndex.value > 0 && currentIndex.value % 50 === 0) {
      return minDelay
    }
    return speed
  }

  // 打字动画循环
  function typeNextChar(timestamp: number) {
    if (!isTyping.value) return

    const elapsed = timestamp - lastTypeTime
    const nextChar = fullText.value[currentIndex.value]
    const requiredDelay = getDelayForChar(nextChar)

    if (elapsed >= requiredDelay) {
      if (currentIndex.value < fullText.value.length) {
        displayedText.value = fullText.value.substring(0, currentIndex.value + 1)
        currentIndex.value++
        lastTypeTime = timestamp
      }
    }

    if (currentIndex.value < fullText.value.length) {
      animationFrameId = requestAnimationFrame(typeNextChar)
    } else {
      isTyping.value = false
      displayedText.value = fullText.value
    }
  }

  // 开始打字
  function start(text: string) {
    // 清理之前的状态
    stop()

    fullText.value = text

    if (!enabled || text.length === 0) {
      displayedText.value = text
      currentIndex.value = text.length
      isTyping.value = false
      return
    }

    // 短文本直接显示，不打字
    if (text.length < 10) {
      displayedText.value = text
      currentIndex.value = text.length
      isTyping.value = false
      return
    }

    displayedText.value = ''
    currentIndex.value = 0
    isTyping.value = true
    lastTypeTime = performance.now()
    animationFrameId = requestAnimationFrame(typeNextChar)
  }

  // 停止打字
  function stop() {
    isTyping.value = false
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // 立即完成
  function complete() {
    stop()
    displayedText.value = fullText.value
    currentIndex.value = fullText.value.length
  }

  // 重置
  function reset() {
    stop()
    fullText.value = ''
    displayedText.value = ''
    currentIndex.value = 0
  }

  // 设置新文本
  function setText(text: string, autoStart = true) {
    if (autoStart) {
      start(text)
    } else {
      fullText.value = text
      displayedText.value = text
      currentIndex.value = text.length
    }
  }

  // 监听 fullText 变化
  watch(fullText, (newText) => {
    if (newText && !isTyping.value && displayedText.value !== newText) {
      start(newText)
    }
  })

  return {
    displayedText,
    isTyping,
    isComplete,
    progress,
    fullText: computed(() => fullText.value),
    start,
    stop,
    complete,
    reset,
    setText
  }
}

export default useTypewriter
