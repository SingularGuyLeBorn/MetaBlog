<!--
  EntityLinkCard - 实体链接卡片组件

  在消息气泡下方展示工具执行产生的可点击实体链接
  （飞书文档、GitHub Repo、语雀文档等）
-->
<template>
  <a
    :href="link.url"
    target="_blank"
    rel="noopener noreferrer"
    class="entity-link-card"
    :class="link.type"
    :title="link.url"
  >
    <span class="entity-icon">{{ link.icon }}</span>
    <div class="entity-info">
      <span class="entity-title">{{ displayTitle }}</span>
      <span class="entity-url">{{ displayUrl }}</span>
    </div>
    <span class="entity-arrow">↗</span>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EntityLink } from '@/theme/utils/extractEntityLinks'

interface Props {
  link: EntityLink
}

const props = defineProps<Props>()

const displayTitle = computed(() => {
  return props.link.title || props.link.url
})

const displayUrl = computed(() => {
  try {
    const url = new URL(props.link.url)
    return url.hostname + url.pathname.slice(0, 40) + (url.pathname.length > 40 ? '...' : '')
  } catch {
    return props.link.url.slice(0, 60)
  }
})
</script>

<style scoped>
.entity-link-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
  max-width: 100%;
}

.entity-link-card:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.entity-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.entity-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entity-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-url {
  font-size: 11px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-arrow {
  font-size: 14px;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.entity-link-card:hover .entity-arrow {
  opacity: 1;
}

/* 类型色带 */
.entity-link-card.feishu {
  border-left: 3px solid #3370ff;
}
.entity-link-card.github {
  border-left: 3px solid #24292f;
}
.entity-link-card.yuque {
  border-left: 3px solid #00b96b;
}
.entity-link-card.web {
  border-left: 3px solid var(--vp-c-brand-1);
}
</style>
