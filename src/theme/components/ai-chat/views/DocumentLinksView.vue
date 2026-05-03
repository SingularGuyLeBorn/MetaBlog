<!--
  DocumentLinksView - 文档链接视图
  展示工具生成的文档链接（飞书、语雀、GitHub等）.
-->
<template>
  <div class="document-links-view">
    <div v-if="links.length === 0" class="empty-state">
      <span class="empty-icon">📎</span>
      <span class="empty-text">暂无文档链接</span>
    </div>
    <div v-else class="links-list">
      <a
        v-for="(link, index) in links"
        :key="index"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="link-card"
      >
        <span class="link-icon">{{ link.icon || '🔗' }}</span>
        <div class="link-info">
          <span class="link-title">{{ link.title || '未命名文档' }}</span>
          <span v-if="link.description" class="link-desc">{{ link.description }}</span>
          <span class="link-url">{{ link.url }}</span>
        </div>
        <span class="link-arrow">→</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DocumentLinkItem } from '@/theme/types'

interface Props {
  links: DocumentLinkItem[]
}

defineProps<Props>()
</script>

<style scoped>
.document-links-view {
  padding: 4px 0;
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

.links-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(200, 195, 188, 0.3);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.link-card:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(200, 195, 188, 0.5);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.link-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.link-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.link-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #2d2a26);
}

.link-desc {
  font-size: 12px;
  color: var(--sr-text-secondary, #6a6560);
  line-height: 1.5;
}

.link-url {
  font-size: 11px;
  color: var(--sr-morandi-blue, #9aa8b3);
  word-break: break-all;
}

.link-arrow {
  font-size: 16px;
  color: var(--sr-text-muted, #9a9588);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.link-card:hover .link-arrow {
  transform: translateX(4px);
  color: var(--sr-morandi-blue, #9aa8b3);
}
</style>
