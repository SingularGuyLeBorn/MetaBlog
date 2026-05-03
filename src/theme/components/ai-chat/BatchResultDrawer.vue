<!--
  BatchResultDrawer - 批量结果抽屉
  右侧滑出面板，存放批量操作产生的长内容，避免堆积在 MessageBubble 中。
-->
<template>
  <Teleport to="body">
    <!-- 半透明遮罩 -->
    <Transition name="drawer-backdrop">
      <div
        v-if="isOpen"
        class="drawer-backdrop"
        @click="close"
      />
    </Transition>

    <!-- 抽屉面板 -->
    <Transition name="drawer-slide">
      <aside
        v-if="isOpen"
        class="batch-result-drawer"
        tabindex="-1"
        @keydown.esc="close"
      >
        <!-- 头部 -->
        <div class="drawer-header">
          <div class="header-main">
            <Icon name="layers" :size="18" class="header-icon" />
            <h3 class="drawer-title">批量结果</h3>
            <span v-if="items.length > 0" class="item-count">{{ items.length }}</span>
          </div>
          <div class="header-actions">
            <button
              v-if="items.length > 0"
              class="action-btn"
              title="清空全部"
              @click="clear"
            >
              <Icon name="trash-2" :size="14" />
            </button>
            <button class="action-btn" title="关闭 (Esc)" @click="close">
              <Icon name="x" :size="16" />
            </button>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="drawer-body">
          <!-- 空状态 -->
          <div v-if="items.length === 0" class="empty-state">
            <Icon name="inbox" :size="40" class="empty-icon" />
            <p>暂无批量结果</p>
            <span class="empty-hint">大量内容会自动收纳到这里</span>
          </div>

          <!-- 结果列表 -->
          <div v-else class="result-list">
            <div
              v-for="item in items"
              :key="item.id"
              class="result-item"
              :class="{ expanded: expandedId === item.id }"
            >
              <div class="item-header" @click="toggleExpand(item.id)">
                <div class="item-info">
                  <span class="item-type-icon">{{ typeIcon(item.type) }}</span>
                  <span class="item-title">{{ item.title }}</span>
                </div>
                <div class="item-meta">
                  <span class="item-time">{{ formatTime(item.timestamp) }}</span>
                  <Icon
                    :name="expandedId === item.id ? 'chevron-up' : 'chevron-down'"
                    :size="14"
                    class="expand-icon"
                  />
                </div>
              </div>

              <Transition name="content-expand">
                <div v-show="expandedId === item.id" class="item-content">
                  <div class="item-summary" v-if="item.summary">
                    <Icon name="file-text" :size="12" />
                    {{ item.summary }}
                  </div>
                  <pre class="item-body">{{ item.content }}</pre>
                  <div v-if="item.meta" class="item-meta-tags">
                    <span v-for="(v, k) in item.meta" :key="k" class="meta-tag">
                      {{ k }}: {{ v }}
                    </span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
import { useBatchResultStore } from '@/theme/stores/batchResultStore'
import { ref } from 'vue'

const { isOpen, items, clear, close } = useBatchResultStore()

const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function typeIcon(type: string): string {
  const map: Record<string, string> = {
    document: '📄',
    search: '🔍',
    code: '💻',
    generic: '📦',
  }
  return map[type] || '📦'
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
  z-index: 900;
}

.batch-result-drawer {
  position: fixed;
  top: var(--vp-nav-height, 64px);
  right: 0;
  bottom: 0;
  width: 460px;
  max-width: 90vw;
  background: rgba(248, 246, 243, 0.96);
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(200, 195, 188, 0.3);
  z-index: 950;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
}

/* 头部 */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  color: var(--sr-accent-star, #b8a090);
}

.drawer-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.item-count {
  padding: 2px 8px;
  background: rgba(184, 160, 144, 0.15);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: var(--sr-accent-star, #b8a090);
}

.header-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 8px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(212, 184, 184, 0.15);
  color: var(--sr-morandi-pink, #d4b8b8);
}

/* 内容区 */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 20px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  color: var(--sr-text-muted, #94a3b8);
}

.empty-icon {
  margin-bottom: 16px;
  color: rgba(184, 160, 144, 0.3);
}

.empty-state p {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}

.empty-hint {
  font-size: 13px;
}

/* 结果列表 */
.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.25);
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.result-item:hover {
  border-color: rgba(184, 160, 144, 0.35);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.item-type-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.item-time {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.expand-icon {
  color: var(--sr-text-muted, #94a3b8);
  transition: transform 0.2s ease;
}

/* 展开内容 */
.item-content {
  padding: 0 14px 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.item-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.item-body {
  margin: 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
}

.item-meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.meta-tag {
  padding: 3px 8px;
  background: rgba(184, 160, 144, 0.1);
  border-radius: 6px;
  font-size: 11px;
  color: var(--sr-morandi-purple, #b3a8b8);
}

/* 过渡动画 */
.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.content-expand-enter-active,
.content-expand-leave-active {
  transition: all 0.2s ease;
}

.content-expand-enter-from,
.content-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
