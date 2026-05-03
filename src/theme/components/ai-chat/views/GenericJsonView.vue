<!--
  GenericJsonView - 通用 JSON 视图
  以结构化方式展示任意 JSON 数据.
-->
<template>
  <div class="generic-json-view">
    <div v-if="data === null || data === undefined" class="empty-state">
      <span class="empty-icon">📦</span>
      <span class="empty-text">暂无数据</span>
    </div>
    <div v-else-if="isPrimitive" class="primitive-value">
      <pre>{{ formattedJson }}</pre>
    </div>
    <div v-else class="structured-data">
      <!-- 如果数据是对象且有明确字段，展示为表格 -->
      <template v-if="canShowAsTable">
        <table class="data-table">
          <tbody>
            <tr v-for="(value, key) in flatEntries" :key="key">
              <td class="key-cell">{{ key }}</td>
              <td class="value-cell">
                <span v-if="isUrl(value)" class="url-value">
                  <a :href="value" target="_blank" rel="noopener noreferrer">{{ value }}</a>
                </span>
                <span v-else-if="typeof value === 'boolean'" :class="value ? 'bool-true' : 'bool-false'">
                  {{ value }}
                </span>
                <span v-else class="text-value">{{ formatValue(value) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <!-- 否则展示为格式化 JSON -->
      <template v-else>
        <pre class="json-block">{{ formattedJson }}</pre>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  data: any
}

const props = defineProps<Props>()

const isPrimitive = computed(() => {
  const d = props.data
  return typeof d !== 'object' || d === null
})

const canShowAsTable = computed(() => {
  const d = props.data
  if (typeof d !== 'object' || d === null || Array.isArray(d)) return false
  const entries = Object.entries(d)
  // 如果对象嵌套太深，不用表格
  return entries.length > 0 && entries.length <= 30 && entries.every(([, v]) => {
    const t = typeof v
    return t === 'string' || t === 'number' || t === 'boolean' || v === null
  })
})

const flatEntries = computed(() => {
  if (typeof props.data !== 'object' || props.data === null) return {}
  return props.data as Record<string, any>
})

const formattedJson = computed(() => {
  try {
    return JSON.stringify(props.data, null, 2)
  } catch {
    return String(props.data)
  }
})

function isUrl(value: any): boolean {
  if (typeof value !== 'string') return false
  return value.startsWith('http://') || value.startsWith('https://')
}

function formatValue(value: any): string {
  if (value === null) return 'null'
  if (typeof value === 'string' && value.length > 500) {
    return value.slice(0, 500) + '...'
  }
  return String(value)
}
</script>

<style scoped>
.generic-json-view {
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

.primitive-value pre {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 14px 16px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--sr-text-primary, #2d2a26);
  white-space: pre-wrap;
  word-break: break-all;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  vertical-align: top;
}

.key-cell {
  width: 30%;
  font-weight: 600;
  color: var(--sr-text-secondary, #6a6560);
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px 0 0 6px;
  word-break: break-word;
}

.value-cell {
  color: var(--sr-text-primary, #2d2a26);
  word-break: break-word;
}

.url-value a {
  color: var(--sr-morandi-blue, #9aa8b3);
  text-decoration: none;
}

.url-value a:hover {
  text-decoration: underline;
}

.bool-true {
  color: #889888;
  font-weight: 600;
}

.bool-false {
  color: #a88080;
  font-weight: 600;
}

.text-value {
  color: var(--sr-text-primary, #2d2a26);
  line-height: 1.5;
}

.json-block {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 14px 16px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--sr-text-secondary, #6a6560);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}
</style>
