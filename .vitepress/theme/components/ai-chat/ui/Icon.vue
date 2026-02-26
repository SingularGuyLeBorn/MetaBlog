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
      
      <!-- 左箭头（返回） -->
      <template v-else-if="name === 'arrow-left'">
        <line x1="19" y1="12" x2="5" y2="12"/>
        <polyline points="12 19 5 12 12 5"/>
      </template>
      
      <!-- 右箭头 -->
      <template v-else-if="name === 'arrow-right'">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </template>
      
      <!-- 图层/堆叠（管理会话） -->
      <template v-else-if="name === 'layers'">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </template>
      
      <!-- 闪光/AI -->
      <template v-else-if="name === 'sparkles'">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/>
        <path d="M19 17v4"/>
        <path d="M3 5h4"/>
        <path d="M17 19h4"/>
      </template>
      
      <!-- 机器人/Agent -->
      <template v-else-if="name === 'bot'">
        <path d="M12 8V4H8"/>
        <rect width="16" height="12" x="4" y="8" rx="2"/>
        <path d="M2 14h2"/>
        <path d="M20 14h2"/>
        <path d="M15 13v2"/>
        <path d="M9 13v2"/>
      </template>
      
      <!-- 日志/终端 -->
      <template v-else-if="name === 'terminal'">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </template>
      
      <!-- 文档/文件 -->
      <template v-else-if="name === 'file-text'">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </template>
      
      <!-- 对勾/成功 -->
      <template v-else-if="name === 'check'">
        <polyline points="20 6 9 17 4 12"/>
      </template>
      
      <!-- 警告 -->
      <template v-else-if="name === 'alert'">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
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
