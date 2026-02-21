<!--
  Icon - 图标组件
-->
<template>
  <span class="icon" :class="[name, { spin }]" :style="{ width: size + 'px', height: size + 'px' }">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- 菜单 -->
      <template v-if="name === 'menu'">
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </template>
      
      <!-- 发送 -->
      <template v-else-if="name === 'send'">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9"/>
      </template>
      
      <!-- 停止 -->
      <template v-else-if="name === 'stop'">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </template>
      
      <!-- 设置 -->
      <template v-else-if="name === 'settings'">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </template>
      
      <!-- 删除 -->
      <template v-else-if="name === 'trash'">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </template>
      
      <!-- 编辑 -->
      <template v-else-if="name === 'edit'">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </template>
      
      <!-- 复制 -->
      <template v-else-if="name === 'copy'">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </template>
      
      <!-- 刷新 -->
      <template v-else-if="name === 'refresh'">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </template>
      
      <!-- 附件 -->
      <template v-else-if="name === 'paperclip'">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
      </template>
      
      <!-- 关闭 -->
      <template v-else-if="name === 'close'">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </template>
      
      <!-- 下拉箭头 -->
      <template v-else-if="name === 'chevron-down'">
        <polyline points="6 9 12 15 18 9"/>
      </template>
      
      <!-- 右箭头 -->
      <template v-else-if="name === 'chevron-right'">
        <polyline points="9 18 15 12 9 6"/>
      </template>
      
      <!-- 消息 -->
      <template v-else-if="name === 'message'">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </template>
      
      <!-- 加号 -->
      <template v-else-if="name === 'plus'">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </template>
      
      <!-- 搜索 -->
      <template v-else-if="name === 'search'">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </template>
      
      <!-- 更多 -->
      <template v-else-if="name === 'more'">
        <circle cx="12" cy="12" r="1"/>
        <circle cx="19" cy="12" r="1"/>
        <circle cx="5" cy="12" r="1"/>
      </template>
    </svg>
  </span>
</template>

<script setup lang="ts">
interface Props {
  name: string
  size?: number
  spin?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 20,
  spin: false
})
</script>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon svg {
  width: 100%;
  height: 100%;
}

.icon.spin {
  animation: spin 1s linear infinite;
}
</style>
