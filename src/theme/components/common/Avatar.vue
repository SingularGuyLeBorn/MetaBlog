<template>
  <div 
    class="avatar"
    :class="[`avatar--${size}`, { 'avatar--online': online }]"
    :style="avatarStyle"
  >
    <img v-if="src" :src="src" :alt="alt" />
    <span v-else class="avatar__fallback">
      <!-- 有名字显示首字母,没有显示人形图标 -->
      <template v-if="fallbackText">
        {{ fallbackText }}
      </template>
      <svg v-else class="avatar__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8" fill="none"/>
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      </svg>
    </span>
    <span v-if="online" class="avatar__status"></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  color?: string
}>()

const size = computed(() => props.size || 'md')

const fallbackText = computed(() => {
  if (props.name) {
    return props.name.slice(0, 2).toUpperCase()
  }
  return ''
})

const avatarStyle = computed(() => ({
  backgroundColor: props.color || 'rgba(184, 160, 144, 0.18)',
  color: props.color ? '#fff' : '#8a7a6a',
}))
</script>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  font-weight: 600;
  flex-shrink: 0;
  border: 1.5px solid rgba(184, 160, 144, 0.2);
}

.avatar--sm {
  width: 28px;
  height: 28px;
  font-size: 11px;
}
.avatar--sm .avatar__icon {
  width: 16px;
  height: 16px;
}

.avatar--md {
  width: 40px;
  height: 40px;
  font-size: 14px;
}
.avatar--md .avatar__icon {
  width: 22px;
  height: 22px;
}

.avatar--lg {
  width: 56px;
  height: 56px;
  font-size: 18px;
}
.avatar--lg .avatar__icon {
  width: 30px;
  height: 30px;
}

.avatar--xl {
  width: 80px;
  height: 80px;
  font-size: 24px;
}
.avatar--xl .avatar__icon {
  width: 44px;
  height: 44px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  user-select: none;
}

.avatar__icon {
  display: block;
  opacity: 0.7;
}

.avatar__status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background: #7cb898;
  border: 2px solid white;
  border-radius: 50%;
}

.avatar--lg .avatar__status,
.avatar--xl .avatar__status {
  width: 12px;
  height: 12px;
  border-width: 3px;
}
</style>
