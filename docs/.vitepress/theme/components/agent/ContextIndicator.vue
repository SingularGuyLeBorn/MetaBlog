<script setup lang="ts">
/**
 * ContextIndicator - 上下文指示器
 * 显示 Agent 关联的上下文信息
 */
import { ref, computed } from 'vue'
import { CostTracker } from '../../../agent/runtime/CostTracker'

interface Props {
  info: {
    relatedArticles: number
    entities: string[]
    tokens: number
    maxTokens: number
  }
}

const props = defineProps<Props>()

const isExpanded = ref(false)

const tokenRatio = computed(() => props.info.tokens / props.info.maxTokens)

const tokenColor = computed(() => {
  if (tokenRatio.value < 0.5) return '#52c41a'
  if (tokenRatio.value < 0.8) return '#faad14'
  return '#f5222d'
})

const formattedTokens = computed(() => {
  return CostTracker.formatTokens(props.info.tokens)
})
</script>

<template>
  <div class="context-indicator" :class="{ expanded: isExpanded }">
    <div class="indicator-summary" @click="isExpanded = !isExpanded">
      <div class="indicator-item">
        <span class="icon">📚</span>
        <span class="value">{{ info.relatedArticles }}</span>
        <span class="label">相关</span>
      </div>
      
      <div class="indicator-item">
        <span class="icon">🏷️</span>
        <span class="value">{{ info.entities.length }}</span>
        <span class="label">实体</span>
      </div>
      
      <div class="indicator-item tokens">
        <span class="icon">🔤</span>
        <div class="token-bar">
          <div 
            class="token-fill" 
            :style="{ width: `${Math.min(tokenRatio * 100, 100)}%`, background: tokenColor }"
          ></div>
        </div>
        <span class="token-value">{{ formattedTokens }}</span>
      </div>
      
      <span class="expand-icon">{{ isExpanded ? '▼' : '▶' }}</span>
    </div>
    
    <!-- 展开详情 -->
    <div v-if="isExpanded" class="indicator-details">
      <div v-if="info.entities.length > 0" class="detail-section">
        <h4>关联实体</h4>
        <div class="entity-tags">
          <span 
            v-for="entity in info.entities.slice(0, 10)" 
            :key="entity"
            class="entity-tag"
          >
            [[{{ entity }}]]
          </span>
          <span v-if="info.entities.length > 10" class="more-tag">
            +{{ info.entities.length - 10 }}
          </span>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>Token 使用</h4>
        <div class="token-info">
          <div class="token-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${Math.min(tokenRatio * 100, 100)}%`, background: tokenColor }"
              ></div>
            </div>
            <span class="progress-text">
              {{ formattedTokens }} / {{ CostTracker.formatTokens(info.maxTokens) }}
            </span>
          </div>
          <p class="token-hint">
            {{ tokenRatio > 0.8 ? '⚠️ 接近上限，建议精简上下文' : 
               tokenRatio > 0.5 ? '💡 建议关注 Token 使用' : 
               '✅ Token 使用正常' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-indicator {
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.context-indicator.expanded {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Summary */
.indicator-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.indicator-summary:hover {
  background: var(--vp-c-bg-mute);
}

.indicator-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.indicator-item .icon {
  font-size: 12px;
}

.indicator-item .value {
  font-weight: 600;
  color: var(--vp-c-text);
}

.indicator-item.tokens {
  gap: 6px;
}

.token-bar {
  width: 40px;
  height: 4px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  overflow: hidden;
}

.token-fill {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s;
}

.token-value {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.expand-icon {
  margin-left: auto;
  font-size: 10px;
  color: var(--vp-c-text-2);
  transition: transform 0.2s;
}

.context-indicator.expanded .expand-icon {
  transform: rotate(180deg);
}

/* Details */
.indicator-details {
  padding: 12px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.detail-section {
  margin-bottom: 12px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Entity Tags */
.entity-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.entity-tag {
  padding: 4px 8px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  font-size: 11px;
  color: var(--vp-c-brand);
  font-family: var(--vp-font-family-mono);
}

.more-tag {
  padding: 4px 8px;
  background: var(--vp-c-bg-mute);
  border-radius: 12px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

/* Token Info */
.token-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: all 0.3s;
}

.progress-text {
  font-size: 11px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  white-space: nowrap;
}

.token-hint {
  margin: 0;
  font-size: 11px;
  color: var(--vp-c-text-2);
}
</style>
