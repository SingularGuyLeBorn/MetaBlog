<template>
  <div class="tool-call-panel">
    <!-- 工具调用列表 -->
    <div v-for="record in records" :key="record.id" class="tool-call-item" :class="record.status">
      <!-- 工具头部 -->
      <div class="tool-header" @click="toggleExpand(record.id)">
        <span class="tool-icon">{{ getToolIcon(record.toolName) }}</span>
        <span class="tool-name">{{ formatToolName(record.toolName) }}</span>
        <span class="tool-status" :class="record.status">
          {{ getStatusText(record.status) }}
        </span>
        <span v-if="record.endTime && record.startTime" class="tool-duration">
          {{ record.endTime - record.startTime }}ms
        </span>
        <span class="expand-icon">{{ expanded.has(record.id) ? '▼' : '▶' }}</span>
      </div>
      
      <!-- 展开详情 -->
      <div v-if="expanded.has(record.id)" class="tool-details">
        <!-- 参数 -->
        <div class="detail-section">
          <div class="section-title">参数</div>
          <pre class="code-block">{{ JSON.stringify(record.args, null, 2) }}</pre>
        </div>
        
        <!-- 结果 -->
        <div v-if="record.result" class="detail-section">
          <div class="section-title">结果</div>
          <!-- 字符串结果 -->
          <div v-if="isStringResult(record.result)" class="result-success">
            <pre class="code-block" v-html="linkifyText(record.result.slice(0, 500) + (record.result.length > 500 ? '...' : ''))"></pre>
          </div>
          <!-- ToolResult 对象 -->
          <div v-else-if="isToolResult(record.result)">
            <div v-if="record.result.success" class="result-success">
              <div v-if="record.result.message" class="result-message">
                {{ record.result.message }}
              </div>
              <!-- 实体链接卡片（从结果中提取） -->
              <div v-if="getResultLinks(record).length > 0" class="result-links">
                <EntityLinkCard
                  v-for="link in getResultLinks(record)"
                  :key="link.url"
                  :link="link"
                />
              </div>
              <pre v-if="record.result.data" class="code-block" v-html="linkifyText(formatData(record.result.data))"></pre>
            </div>
            <div v-else class="result-error">
              <div class="error-message">{{ record.result.message || record.result.error }}</div>
              <div v-if="record.result.suggestion" class="error-suggestion">
                建议: {{ record.result.suggestion }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 错误信息 -->
        <div v-if="record.error" class="detail-section">
          <div class="section-title">错误</div>
          <div class="error-message">{{ record.error }}</div>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-if="records.length === 0" class="empty-state">
      暂无工具调用
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ToolCallRecord, ToolResult } from '@/theme/tools/types'
import EntityLinkCard from './EntityLinkCard.vue'
import { extractEntityLinks } from '@/theme/utils/extractEntityLinks'

interface Props {
  records: ToolCallRecord[]
}

const props = defineProps<Props>()

const expanded = ref(new Set<string>())

// 工具图标映射
const toolIcons: Record<string, string> = {
  createArticle: '📝',
  getArticleContent: '📄',
  updateArticle: '✏️',
  deleteArticle: '🗑️',
  searchArticles: '🔍',
  listArticles: '📚',
  searchArxiv: '📚',
  fetchArxiv: '📖',
  webSearch: '🌐',
  fetchUrl: '🔗',
  readFile: '📂',
  writeFile: '💾',
  listFiles: '📁',
  getCurrentTime: '⏰',
  calculate: '🧮',
  translateText: '🌐',
  executeCode: '▶️',
  analyzeCode: '🔍',
  default: '🔧'
}

function getToolIcon(toolName: string | undefined): string {
  return toolIcons[toolName || ''] || toolIcons.default
}

function formatToolName(toolName: string | undefined): string {
  if (!toolName) return 'Unknown Tool'
  return toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getStatusText(status: string | undefined): string {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '执行中',
    success: '成功',
    error: '失败'
  }
  return statusMap[status || ''] || status || '未知'
}

function toggleExpand(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
  } else {
    expanded.value.add(id)
  }
}

// 类型守卫：检查是否为字符串结果
function isStringResult(result: unknown): result is string {
  return typeof result === 'string'
}

// 类型守卫：检查是否为 ToolResult 对象
function isToolResult(result: unknown): result is ToolResult {
  return typeof result === 'object' && result !== null && 'success' in result
}

// 格式化数据为字符串
function formatData(data: unknown): string {
  if (typeof data === 'string') {
    return data.slice(0, 500) + (data.length > 500 ? '...' : '')
  }
  const jsonStr = JSON.stringify(data, null, 2)
  return jsonStr.slice(0, 500) + (jsonStr.length > 500 ? '...' : '')
}

// 从工具结果中提取实体链接
function getResultLinks(record: ToolCallRecord) {
  if (!record.result || typeof record.result !== 'object') return []
  const result = record.result as ToolResult
  if (!result.success) return []
  return extractEntityLinks(record.toolName || '', result.data || result)
}

// 将文本中的 URL 转换为可点击链接（简单版，仅用于展示）
function linkifyText(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`[\]]+)/g
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="tool-result-link">${url}</a>`
  })
}
</script>

<style scoped>
.tool-call-panel {
  font-size: 13px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 8px 0;
}

.tool-call-item {
  border-bottom: 1px solid var(--vp-c-divider);
}

.tool-call-item:last-child {
  border-bottom: none;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  background: var(--vp-c-bg-soft);
  transition: background 0.2s;
}

.tool-header:hover {
  background: var(--vp-c-bg-mute);
}

.tool-icon {
  font-size: 16px;
}

.tool-name {
  flex: 1;
  font-weight: 500;
}

.tool-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.tool-status.pending {
  background: #f0f0f0;
  color: #666;
}

.tool-status.running {
  background: #e3f2fd;
  color: #1976d2;
  animation: pulse 1.5s infinite;
}

.tool-status.success {
  background: #e8f5e9;
  color: #388e3c;
}

.tool-status.error {
  background: #ffebee;
  color: #d32f2f;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.tool-duration {
  color: var(--vp-c-text-2);
  font-size: 11px;
}

.expand-icon {
  color: var(--vp-c-text-2);
  font-size: 10px;
}

.tool-details {
  padding: 12px;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
}

.detail-section {
  margin-bottom: 12px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.code-block {
  background: var(--vp-c-bg-soft);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 11px;
  line-height: 1.5;
  margin: 0;
}

.result-success {
  color: #388e3c;
}

.result-message {
  margin-bottom: 8px;
  font-weight: 500;
}

.result-error {
  color: #d32f2f;
}

.error-message {
  font-weight: 500;
  margin-bottom: 4px;
}

.error-suggestion {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--vp-c-text-2);
}

.result-links {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-result-link {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  word-break: break-all;
}

.tool-result-link:hover {
  color: var(--vp-c-brand-2);
}
</style>
