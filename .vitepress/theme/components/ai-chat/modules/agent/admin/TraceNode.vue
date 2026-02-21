<!--
  TraceNode - 对话链路节点（递归组件）
-->
<template>
  <div class="trace-node" :style="{ marginLeft: level * 20 + 'px' }">
    <div :class="['node-card', node.status]">
      <div class="node-header">
        <span class="node-icon">{{ nodeTypeIcon }}</span>
        <span class="node-type">{{ nodeTypeLabel }}</span>
        <span :class="['node-status', node.status]">{{ statusLabel }}</span>
        <span v-if="node.duration" class="node-duration">{{ node.duration }}ms</span>
      </div>
      
      <div v-if="node.content" class="node-content">
        {{ truncateContent(node.content) }}
      </div>
      
      <div class="node-time">
        {{ formatTime(node.timestamp) }}
      </div>
    </div>
    
    <!-- 递归渲染子节点 -->
    <div v-if="node.children?.length > 0" class="node-children">
      <TraceNode
        v-for="childId in node.children"
        :key="childId"
        :node="nodes.get(childId)!"
        :nodes="nodes"
        :level="level + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatTraceNode } from '../../../core/services/logger'

const props = defineProps<{
  node: ChatTraceNode
  nodes: Map<string, ChatTraceNode>
  level: number
}>()

const nodeTypeIcon = computed(() => {
  const map: Record<string, string> = {
    user_message: '👤',
    ai_response: '🤖',
    tool_call: '🔧',
    api_request: '🌐'
  }
  return map[props.node.type] || '📄'
})

const nodeTypeLabel = computed(() => {
  const map: Record<string, string> = {
    user_message: '用户消息',
    ai_response: 'AI 回复',
    tool_call: '工具调用',
    api_request: 'API 请求'
  }
  return map[props.node.type] || props.node.type
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '等待中',
    running: '执行中',
    success: '成功',
    error: '失败'
  }
  return map[props.node.status] || props.node.status
})

function truncateContent(content: string): string {
  if (content.length <= 100) return content
  return content.slice(0, 100) + '...'
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}
</script>

<style scoped>
.trace-node {
  margin-bottom: 8px;
}

.node-card {
  padding: 10px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 12px;
}

.node-card.running {
  border-left: 3px solid #3b82f6;
}

.node-card.success {
  border-left: 3px solid #10b981;
}

.node-card.error {
  border-left: 3px solid #ef4444;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.node-icon {
  font-size: 14px;
}

.node-type {
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.node-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.node-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.node-status.running {
  background: #dbeafe;
  color: #1e40af;
}

.node-status.success {
  background: #d1fae5;
  color: #065f46;
}

.node-status.error {
  background: #fee2e2;
  color: #991b1b;
}

.node-duration {
  margin-left: auto;
  color: var(--vp-c-brand);
  font-weight: 500;
}

.node-content {
  padding: 8px;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  word-break: break-word;
}

.node-time {
  margin-top: 6px;
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.node-children {
  margin-top: 8px;
  padding-left: 8px;
  border-left: 2px dashed var(--vp-c-divider);
}
</style>
