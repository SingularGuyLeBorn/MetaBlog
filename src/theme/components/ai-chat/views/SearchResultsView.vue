<!--
  SearchResultsView - 搜索结果视图
  展示工具搜索返回的网页结果列表.
-->
<template>
  <div class="search-results-view">
    <div v-if="results.length === 0" class="empty-state">
      <span class="empty-icon">🔍</span>
      <span class="empty-text">暂无搜索结果</span>
    </div>
    <div v-else class="results-list">
      <div
        v-for="(result, index) in results"
        :key="index"
        class="result-card"
      >
        <div class="result-header">
          <img
            v-if="result.favicon"
            :src="result.favicon"
            class="result-favicon"
            alt=""
            @error="($event.target as HTMLImageElement).style.display='none'"
          />
          <span v-else class="result-favicon-placeholder">🌐</span>
          <div class="result-meta">
            <span class="result-source">{{ result.source || result.domain || '网页' }}</span>
          </div>
        </div>
        <a
          :href="result.url"
          target="_blank"
          rel="noopener noreferrer"
          class="result-title"
        >
          {{ result.title || '无标题' }}
        </a>
        <p v-if="result.snippet" class="result-snippet">
          {{ result.snippet }}
        </p>
        <a
          :href="result.url"
          target="_blank"
          rel="noopener noreferrer"
          class="result-url"
        >
          {{ result.domain || result.url }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchResultItem } from '@/theme/types'

interface Props {
  results: SearchResultItem[]
}

defineProps<Props>()
</script>

<style scoped>
.search-results-view {
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

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(200, 195, 188, 0.3);
  border-radius: 12px;
  padding: 14px 16px;
  transition: all 0.2s ease;
}

.result-card:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(200, 195, 188, 0.5);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.result-favicon {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.result-favicon-placeholder {
  font-size: 14px;
}

.result-source {
  font-size: 11px;
  font-weight: 500;
  color: var(--sr-text-muted, #9a9588);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.result-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #2d2a26);
  text-decoration: none;
  line-height: 1.5;
  margin-bottom: 6px;
}

.result-title:hover {
  color: var(--sr-morandi-blue, #9aa8b3);
}

.result-snippet {
  font-size: 13px;
  line-height: 1.6;
  color: var(--sr-text-secondary, #6a6560);
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-url {
  font-size: 11px;
  color: var(--sr-morandi-blue, #9aa8b3);
  text-decoration: none;
  word-break: break-all;
}

.result-url:hover {
  text-decoration: underline;
}
</style>
