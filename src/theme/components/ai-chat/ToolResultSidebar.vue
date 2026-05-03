<!--
  ToolResultSidebar - 工具结果侧面板
  右侧滑出的面板，用于展示工具执行的详细结果.
-->
<template>
  <Teleport to="body">
    <!-- 半透明遮罩 -->
    <Transition name="sidebar-backdrop">
      <div
        v-if="isOpen"
        class="sidebar-backdrop"
        @click="close"
      />
    </Transition>

    <!-- 侧面板 -->
    <Transition name="sidebar-slide">
      <aside
        v-if="isOpen"
        class="tool-result-sidebar"
        tabindex="-1"
        @keydown.esc="close"
      >
        <!-- 头部 -->
        <div class="sidebar-header">
          <div class="header-main">
            <span class="tool-icon">{{ toolIcon }}</span>
            <div class="header-info">
              <h3 class="tool-name">{{ toolItem?.name || '工具结果' }}</h3>
              <span class="tool-status" :class="toolItem?.status">
                {{ statusLabel }}
              </span>
            </div>
          </div>
          <button class="close-btn" @click="close" title="关闭 (Esc)">
            <Icon name="x" :size="18" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="sidebar-body" ref="bodyRef">
          <!-- 参数摘要 -->
          <div v-if="hasArgs" class="args-section">
            <div class="section-title">参数</div>
            <pre class="args-code">{{ formattedArgs }}</pre>
          </div>

          <!-- 结果视图 -->
          <div class="result-section">
            <div class="section-title">结果</div>
            <div v-if="isLoading" class="loading-state">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-text">工具执行中...</span>
            </div>
            <div v-else-if="resultView" class="result-content">
              <SearchResultsView
                v-if="resultView.type === 'search'"
                :results="resultView.results"
              />
              <DocumentLinksView
                v-else-if="resultView.type === 'documents'"
                :links="resultView.links"
              />
              <CodeExecutionView
                v-else-if="resultView.type === 'code'"
                :execution="resultView.execution"
              />
              <GenericJsonView
                v-else-if="resultView.type === 'generic'"
                :data="resultView.data"
              />
            </div>
            <div v-else class="empty-state">
              <span class="empty-icon">📭</span>
              <span class="empty-text">暂无结果数据</span>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="sidebar-footer">
          <div class="footer-stats">
            <span v-if="toolItem?.duration" class="stat-item">
              ⏱ {{ toolItem.duration }}ms
            </span>
            <span v-if="resultSize" class="stat-item">
              📦 {{ resultSize }}
            </span>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
import { useToolStore } from '@/theme/stores'
import type { ToolChainItem, ToolResultView } from '@/theme/types'
import { computed, nextTick, ref, watch } from 'vue'
import CodeExecutionView from './views/CodeExecutionView.vue'
import DocumentLinksView from './views/DocumentLinksView.vue'
import GenericJsonView from './views/GenericJsonView.vue'
import SearchResultsView from './views/SearchResultsView.vue'

const toolStore = useToolStore()
const bodyRef = ref<HTMLDivElement | null>(null)

const isOpen = computed(() => !!toolStore.inspectedToolId.value)

const toolItem = computed<ToolChainItem | null>(() => {
  const id = toolStore.inspectedToolId.value
  if (!id) return null
  // 遍历所有 chain 查找 tool item
  for (const key of Object.keys(toolStore.toolChains.value)) {
    const chain = toolStore.toolChains.value[key]
    const item = chain?.items.find(i => i.id === id)
    if (item) return item
  }
  return null
})

const resultView = computed<ToolResultView | null>(() => {
  if (!toolItem.value) return null
  return toolStore.buildToolResultView(toolItem.value)
})

const isLoading = computed(() => {
  return toolItem.value?.status === 'running' || toolItem.value?.status === 'calling'
})

const hasArgs = computed(() => {
  return toolItem.value?.arguments && Object.keys(toolItem.value.arguments).length > 0
})

const formattedArgs = computed(() => {
  if (!toolItem.value?.arguments) return ''
  try {
    return JSON.stringify(toolItem.value.arguments, null, 2)
  } catch {
    return String(toolItem.value.arguments)
  }
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    pending: '等待中',
    calling: '准备调用',
    running: '执行中',
    success: '成功',
    error: '失败'
  }
  return map[toolItem.value?.status || ''] || toolItem.value?.status || ''
})

const toolIcon = computed(() => {
  const name = (toolItem.value?.name || '').toLowerCase()
  if (name.includes('search')) return '🔍'
  if (name.includes('fetch') || name.includes('proxy')) return '🌐'
  if (name.includes('read') || name.includes('get')) return '📄'
  if (name.includes('write') || name.includes('edit')) return '✏️'
  if (name.includes('create') || name.includes('article')) return '📝'
  if (name.includes('code') || name.includes('python') || name.includes('execute')) return '💻'
  if (name.includes('arxiv')) return '📚'
  if (name.includes('scholar')) return '🎓'
  return '🔧'
})

const resultSize = computed(() => {
  const result = toolItem.value?.result
  if (!result) return ''
  const str = typeof result === 'string' ? result : JSON.stringify(result)
  const bytes = new TextEncoder().encode(str).length
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

function close() {
  toolStore.inspectTool(null)
}

// 打开时自动聚焦到 body（使 ESC 键生效）
watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    bodyRef.value?.focus()
  }
})
</script>

<style scoped>
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.tool-result-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: 90vw;
  background: var(--sr-bg-primary, #f8f6f3);
  border-left: 1px solid rgba(200, 195, 188, 0.4);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
  z-index: 101;
  display: flex;
  flex-direction: column;
  outline: none;
}

/* 动画 */
.sidebar-backdrop-enter-active,
.sidebar-backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.sidebar-backdrop-enter-from,
.sidebar-backdrop-leave-to {
  opacity: 0;
}

.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.3s var(--sr-spring-gentle, cubic-bezier(0.22, 1, 0.36, 1));
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(100%);
}

/* 头部 */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.tool-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.header-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary, #2d2a26);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  width: fit-content;
}

.tool-status.pending {
  color: #a89088;
  background: rgba(212, 196, 176, 0.2);
}
.tool-status.running,
.tool-status.calling {
  color: #788898;
  background: rgba(154, 168, 179, 0.2);
}
.tool-status.success {
  color: #889888;
  background: rgba(168, 179, 168, 0.2);
}
.tool-status.error {
  color: #a88080;
  background: rgba(201, 168, 168, 0.2);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--sr-text-muted, #9a9588);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--sr-text-primary, #2d2a26);
}

/* 内容区 */
.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  outline: none;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--sr-text-muted, #9a9588);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.args-section {
  margin-bottom: 20px;
}

.args-code {
  background: rgba(0, 0, 0, 0.035);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--sr-text-secondary, #6a6560);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
}

.result-section {
  margin-bottom: 16px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  justify-content: center;
}

.loading-dot {
  width: 6px;
  height: 6px;
  background: var(--sr-morandi-warm, #d4c4b0);
  border-radius: 50%;
  animation: loading-bounce 1.2s ease-in-out infinite;
}

.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes loading-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.loading-text {
  font-size: 13px;
  color: var(--sr-text-muted, #9a9588);
  margin-left: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  color: var(--sr-text-muted, #9a9588);
}

.empty-icon {
  font-size: 32px;
  opacity: 0.6;
}

.empty-text {
  font-size: 14px;
}

/* 底部 */
.sidebar-footer {
  flex-shrink: 0;
  padding: 12px 20px;
  border-top: 1px solid rgba(200, 195, 188, 0.3);
  background: rgba(255, 255, 255, 0.4);
}

.footer-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 12px;
  color: var(--sr-text-muted, #9a9588);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

/* 响应式 */
@media (max-width: 480px) {
  .tool-result-sidebar {
    width: 100%;
    max-width: 100%;
  }
}
</style>
