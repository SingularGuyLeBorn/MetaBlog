/**
 * useVirtualScroll - 虚拟滚动组合式函数
 * 
 * 用于处理大量消息的渲染性能
 * 只渲染可视区域的消息
 */
import { ref, computed, watch, nextTick, type Ref } from 'vue'

export interface VirtualScrollOptions {
  /** 每项高度（估计值） */
  itemHeight: number
  /** 缓冲区数量（上下多渲染的数量） */
  bufferCount?: number
  /** 容器高度 */
  containerHeight: Ref<number>
}

export interface VirtualItem<T> {
  item: T
  index: number
  style: {
    position: 'absolute'
    top: string
    height: string
  }
}

export function useVirtualScroll<T>(
  items: Ref<T[]>,
  options: VirtualScrollOptions
) {
  const {
    itemHeight,
    bufferCount = 3,
    containerHeight
  } = options
  
  // ═══════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════
  
  const scrollTop = ref(0)
  const scrollHeight = ref(0)
  const containerRef = ref<HTMLElement>()
  
  // ═══════════════════════════════════════════════════════════════
  // 计算属性
  // ═══════════════════════════════════════════════════════════════
  
  // 总高度
  const totalHeight = computed(() => {
    return items.value.length * itemHeight
  })
  
  // 可视区域起始索引
  const startIndex = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / itemHeight) - bufferCount)
  })
  
  // 可视区域结束索引
  const endIndex = computed(() => {
    const visibleCount = Math.ceil(containerHeight.value / itemHeight)
    return Math.min(
      items.value.length,
      Math.floor(scrollTop.value / itemHeight) + visibleCount + bufferCount
    )
  })
  
  // 当前渲染的项
  const visibleItems = computed<VirtualItem<T>[]>(() => {
    const result: VirtualItem<T>[] = []
    
    for (let i = startIndex.value; i < endIndex.value; i++) {
      if (i >= 0 && i < items.value.length) {
        result.push({
          item: items.value[i],
          index: i,
          style: {
            position: 'absolute',
            top: `${i * itemHeight}px`,
            height: `${itemHeight}px`
          }
        })
      }
    }
    
    return result
  })
  
  // 偏移量（用于占位）
  const offsetY = computed(() => {
    return startIndex.value * itemHeight
  })
  
  // 可视项目数
  const visibleCount = computed(() => {
    return endIndex.value - startIndex.value
  })
  
  // ═══════════════════════════════════════════════════════════════
  // 方法
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 处理滚动事件
   */
  function onScroll(e: Event) {
    const target = e.target as HTMLElement
    scrollTop.value = target.scrollTop
    scrollHeight.value = target.scrollHeight
  }
  
  /**
   * 滚动到指定索引
   */
  function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth') {
    if (!containerRef.value) return
    
    const top = index * itemHeight
    containerRef.value.scrollTo({
      top,
      behavior
    })
  }
  
  /**
   * 滚动到底部
   */
  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (!containerRef.value) return
    
    nextTick(() => {
      containerRef.value?.scrollTo({
        top: totalHeight.value,
        behavior
      })
    })
  }
  
  /**
   * 滚动到顶部
   */
  function scrollToTop(behavior: ScrollBehavior = 'smooth') {
    containerRef.value?.scrollTo({
      top: 0,
      behavior
    })
  }
  
  /**
   * 检查元素是否在可视区域
   */
  function isInViewport(index: number): boolean {
    return index >= startIndex.value && index < endIndex.value
  }
  
  /**
   * 获取元素在视口中的位置
   */
  function getItemPosition(index: number): 'above' | 'visible' | 'below' {
    if (index < startIndex.value) return 'above'
    if (index >= endIndex.value) return 'below'
    return 'visible'
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 监听
  // ═══════════════════════════════════════════════════════════════
  
  // 项目数量变化时，如果在底部，保持滚动到底部
  watch(() => items.value.length, (newLength, oldLength) => {
    if (newLength > oldLength) {
      // 添加了新项目
      const isAtBottom = scrollTop.value + containerHeight.value >= scrollHeight.value - 50
      if (isAtBottom) {
        nextTick(() => scrollToBottom())
      }
    }
  })
  
  return {
    // Refs
    containerRef,
    scrollTop,
    
    // Computed
    totalHeight,
    startIndex,
    endIndex,
    visibleItems,
    visibleCount,
    offsetY,
    
    // Methods
    onScroll,
    scrollToIndex,
    scrollToBottom,
    scrollToTop,
    isInViewport,
    getItemPosition
  }
}

/**
 * useAutoScroll - 自动滚动组合式函数
 * 
 * 智能判断是否自动滚动到底部
 */
export function useAutoScroll(containerRef: Ref<HTMLElement | undefined>) {
  const isAutoScrollEnabled = ref(true)
  const isAtBottom = ref(true)
  const scrollThreshold = 50 // 距离底部多少像素视为"在底部"
  
  /**
   * 检查是否在底部
   */
  function checkIsAtBottom(): boolean {
    if (!containerRef.value) return false
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.value
    return scrollHeight - scrollTop - clientHeight < scrollThreshold
  }
  
  /**
   * 处理滚动事件
   */
  function onScroll() {
    isAtBottom.value = checkIsAtBottom()
    // 用户向上滚动时，禁用自动滚动
    if (!isAtBottom.value) {
      isAutoScrollEnabled.value = false
    }
  }
  
  /**
   * 启用自动滚动
   */
  function enableAutoScroll() {
    isAutoScrollEnabled.value = true
  }
  
  /**
   * 禁用自动滚动
   */
  function disableAutoScroll() {
    isAutoScrollEnabled.value = false
  }
  
  /**
   * 滚动到底部（如果启用了自动滚动）
   */
  function scrollToBottomIfEnabled() {
    if (isAutoScrollEnabled.value && containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  }
  
  /**
   * 手动滚动到底部
   */
  function scrollToBottom() {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
      isAutoScrollEnabled.value = true
      isAtBottom.value = true
    }
  }
  
  return {
    isAutoScrollEnabled,
    isAtBottom,
    onScroll,
    enableAutoScroll,
    disableAutoScroll,
    scrollToBottomIfEnabled,
    scrollToBottom
  }
}

// 默认导出
export default useVirtualScroll
