<template>
  <div class="skeleton-wrapper" :class="{ 'animate': !loaded }">
    <!-- 骨架屏状态 -->
    <div v-if="!loaded" class="skeleton-content">
      <template v-if="type === 'text'">
        <div class="skeleton skeleton-text" :style="{ width: width }"></div>
      </template>
      
      <template v-if="type === 'title'">
        <div class="skeleton skeleton-title"></div>
      </template>
      
      <template v-if="type === 'card'">
        <div class="skeleton skeleton-card" :style="{ height: height + 'px' }"></div>
      </template>
      
      <template v-if="type === 'avatar'">
        <div class="skeleton skeleton-avatar" :style="{ width: size + 'px', height: size + 'px' }"></div>
      </template>
      
      <template v-if="type === 'list'">
        <div v-for="i in lines" :key="i" class="skeleton skeleton-text" :style="{ width: `${90 - (i % 3) * 20}%` }"></div>
      </template>
      
      <template v-if="type === 'article'">
        <div class="skeleton skeleton-title mb-4"></div>
        <div v-for="i in lines" :key="i" class="skeleton skeleton-text mb-3"></div>
      </template>
    </div>
    
    <!-- 实际内容 -->
    <div v-else class="actual-content" :class="{ 'fade-in': loaded }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  type?: 'text' | 'title' | 'card' | 'avatar' | 'list' | 'article'
  loading?: boolean
  width?: string
  height?: number
  size?: number
  lines?: number
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  loading: true,
  width: '100%',
  height: 200,
  size: 48,
  lines: 3,
  delay: 0
})

const loaded = ref(false)

// 模拟加载延迟
onMounted(() => {
  if (props.loading) {
    setTimeout(() => {
      loaded.value = true
    }, 600 + props.delay)
  } else {
    loaded.value = true
  }
})

// 监听 loading 属性变化
watch(() => props.loading, (newVal) => {
  if (!newVal) {
    loaded.value = true
  }
})
</script>

<style scoped>
.skeleton-wrapper {
  width: 100%;
}

.skeleton-content {
  width: 100%;
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-text {
  height: 1em;
  margin-bottom: 0.75em;
}

.skeleton-title {
  height: 1.5em;
  width: 60%;
  margin-bottom: 1rem;
  border-radius: 6px;
}

.skeleton-card {
  border-radius: 16px;
  margin-bottom: 1rem;
}

.skeleton-avatar {
  border-radius: 50%;
}

.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.actual-content {
  opacity: 0;
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}
</style>
