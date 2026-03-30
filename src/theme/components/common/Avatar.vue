<template>
  <div 
    class="avatar"
    :class="[`avatar--${size}`, { 'avatar--online': online }]"
    :style="avatarStyle"
  >
    <img v-if="src" :src="src" :alt="alt" />
    <span v-else class="avatar__fallback">{{ fallbackText }}</span>
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
  return '??'
})

const avatarStyle = computed(() => ({
  backgroundColor: props.color || '#e2e8f0',
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
  font-weight: 500;
  color: #64748b;
}

.avatar--sm {
  width: 24px;
  height: 24px;
  font-size: 10px;
}

.avatar--md {
  width: 40px;
  height: 40px;
  font-size: 14px;
}

.avatar--lg {
  width: 56px;
  height: 56px;
  font-size: 18px;
}

.avatar--xl {
  width: 80px;
  height: 80px;
  font-size: 24px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar__fallback {
  user-select: none;
}

.avatar__status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background: #22c55e;
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
