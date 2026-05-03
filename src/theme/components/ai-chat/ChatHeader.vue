<!--
  ChatHeader - 聊天顶部栏
  信息层级：会话标题 > Agent/模型/状态 > 操作按钮
-->
<template>
  <header class="main-header">
    <div class="header-left">
      <button class="menu-btn" @click="$emit('toggle-left')">
        <Icon name="menu" :size="20" />
      </button>
      <div class="header-title-group">
        <h1 v-if="leftCollapsed" class="session-title">{{ title || '新对话' }}</h1>
        <div class="header-meta" :class="{ 'has-title': leftCollapsed }">
          <!-- 当前 Agent 信息（只读） -->
          <div v-if="selectedAgent" class="agent-info">
            <span class="agent-avatar">{{ selectedAgent.avatar || '🤖' }}</span>
            <span class="agent-name">{{ selectedAgent.name }}</span>
          </div>

          <span v-if="model" class="model-tag">{{ model }}</span>
          <StreamStatusIndicator :session-id="sessionId ?? null" />
        </div>
      </div>
    </div>

    <div class="header-right">
      <TokenUsageBar
        v-if="model"
        :usage="tokenUsage"
        :context-window="contextWindow"
      />

      <button class="icon-btn" title="设置" @click="$emit('toggle-right')">
        <Icon name="sliders" :size="18" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
import type { Agent } from '@/theme/types'
import { ref, onMounted, onUnmounted } from 'vue'
import StreamStatusIndicator from './StreamStatusIndicator.vue'
import TokenUsageBar from './TokenUsageBar.vue'

interface Props {
  title: string
  model: string
  selectedAgent: Agent | null
  tokenUsage: {
    estimatedInput: number
    estimatedOutput: number
    apiReportedPrompt: number
    apiReportedCompletion: number
    apiReportedTotal: number
    lastUpdated: number
  }
  contextWindow: number
  leftCollapsed: boolean
  rightCollapsed: boolean
  sessionId?: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  'toggle-left': []
  'toggle-right': []
}>()
</script>

<style scoped>
/* 顶部栏 */
.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ai-space-3) var(--ai-space-5);
  background: transparent;
  border-bottom: 1px solid var(--ai-border-light);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  min-width: 0;
}

.menu-btn,
.icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--ai-radius-md);
  color: var(--ai-text-tertiary);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
  flex-shrink: 0;
}

.menu-btn:hover,
.icon-btn:hover {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

.icon-btn.active {
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

/* 标题组：垂直排列，主次分明 */
.header-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.session-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ai-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 元信息行 */
.header-meta {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  min-width: 0;
}

.model-tag {
  padding: 1px 8px;
  background: var(--ai-primary-50);
  color: var(--ai-primary-600);
  border-radius: var(--ai-radius-full);
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

/* Agent 信息（只读） */
.agent-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--ai-text-secondary);
  flex-shrink: 0;
}

.agent-info .agent-avatar {
  font-size: 13px;
}

.agent-info .agent-name {
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* 右侧 */
.header-right {
  display: flex;
  align-items: center;
  gap: var(--ai-space-1);
  flex-shrink: 0;
}

/* 更多菜单 */
.more-menu {
  position: relative;
}

.more-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 6px;
  z-index: 100;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: var(--ai-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

.dropdown-item.active {
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

/* 响应式 */
@media (max-width: 768px) {
  .session-title {
    max-width: 120px;
  }

  .agent-name {
    max-width: 60px;
  }

  .agent-dropdown {
    left: auto;
    right: 0;
  }

  .agent-dropdown::before {
    left: auto;
    right: 20px;
  }
}
</style>
