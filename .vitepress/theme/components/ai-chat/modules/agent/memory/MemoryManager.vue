<!--
  MemoryManager - 记忆管理组件
  
  功能：
  1. 会话记忆开关
  2. 长期记忆编辑
  3. 自动提取开关
-->
<template>
  <div class="memory-manager">
    <div class="memory-layout">
      <!-- 左侧：配置选项 -->
      <div class="memory-config">
        <!-- 会话记忆 -->
        <div class="config-card">
          <div class="card-header">
            <div class="header-icon">💬</div>
            <div class="header-info">
              <h4>会话记忆</h4>
              <p>记住对话历史，保持上下文连贯性</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="config.enabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="card-content" v-if="config.enabled">
            <div class="setting-item">
              <label>最大记忆 Tokens</label>
              <div class="token-input">
                <input 
                  type="number" 
                  v-model.number="config.maxTokens"
                  min="500"
                  max="8000"
                  step="500"
                />
                <span class="token-hint">约 {{ Math.floor(config.maxTokens / 4) }} 字</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 长期记忆 -->
        <div class="config-card">
          <div class="card-header">
            <div class="header-icon">🧠</div>
            <div class="header-info">
              <h4>长期记忆</h4>
              <p>AI 需要永久记住的信息</p>
            </div>
          </div>
          <div class="card-content">
            <div class="memory-editor">
              <div class="editor-toolbar">
                <button 
                  v-for="template in memoryTemplates"
                  :key="template.id"
                  class="template-btn"
                  @click="applyTemplate(template)"
                >
                  {{ template.name }}
                </button>
              </div>
              <textarea
                v-model="config.content"
                rows="10"
                placeholder="输入 AI 需要记住的长期信息，例如：
- 用户的编程语言偏好
- 用户的业务领域
- 特定的术语定义
- 个人喜好和习惯..."
              />
              <div class="editor-stats">
                <span>{{ config.content.length }} 字符</span>
                <button class="btn-save" @click="saveMemory">
                  <span>💾</span>
                  保存记忆
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 自动提取 -->
        <div class="config-card">
          <div class="card-header">
            <div class="header-icon">🔍</div>
            <div class="header-info">
              <h4>智能提取</h4>
              <p>自动从对话中提取重要信息</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="config.autoExtract" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="card-content" v-if="config.autoExtract">
            <p class="hint-text">
              开启后，AI 会自动识别对话中的重要信息（如偏好、事实、决定等）并保存到长期记忆。
            </p>
          </div>
        </div>
      </div>

      <!-- 右侧：预览 -->
      <div class="memory-preview">
        <div class="preview-card">
          <div class="preview-header">
            <h4>
              <span>👁️</span>
              记忆预览
            </h4>
          </div>
          <div class="preview-content">
            <div v-if="!config.enabled && !config.content" class="empty-state">
              <span class="empty-icon">📝</span>
              <p>记忆功能未启用</p>
            </div>
            <template v-else>
              <div v-if="config.enabled" class="preview-section">
                <span class="section-label">会话记忆</span>
                <div class="preview-box">
                  <span class="status-badge" :class="{ active: config.enabled }">
                    {{ config.enabled ? '已启用' : '已禁用' }}
                  </span>
                  <span v-if="config.enabled" class="token-badge">
                    最大 {{ config.maxTokens }} tokens
                  </span>
                </div>
              </div>
              
              <div v-if="config.content" class="preview-section">
                <span class="section-label">长期记忆</span>
                <div class="memory-content-preview">
                  <pre>{{ config.content }}</pre>
                </div>
              </div>
              
              <div v-if="config.autoExtract" class="preview-section">
                <span class="section-label">智能提取</span>
                <span class="status-badge active">已启用</span>
              </div>
            </template>
          </div>
        </div>

        <!-- 记忆使用提示 -->
        <div class="tips-card">
          <h5>💡 使用建议</h5>
          <ul>
            <li>长期记忆适合保存用户偏好、业务背景等稳定信息</li>
            <li>避免存储敏感信息（密码、密钥等）</li>
            <li>定期清理过期记忆以保持效率</li>
            <li>使用结构化格式（列表、段落）更易被 AI 理解</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Agent } from '../../../core/types/agent'

const props = defineProps<{
  agent: Agent | null
}>()

// 本地配置
const config = ref({
  enabled: props.agent?.memory.enabled ?? true,
  content: props.agent?.memory.content ?? '',
  autoExtract: props.agent?.memory.autoExtract ?? false,
  maxTokens: props.agent?.memory.maxTokens ?? 2000
})

// 记忆模板
const memoryTemplates = [
  {
    id: 'dev',
    name: '开发者偏好',
    content: `## 开发偏好
- 主要编程语言: 
- 技术栈: 
- 代码风格偏好: 
- 注释语言: 中文/英文`
  },
  {
    id: 'writer',
    name: '写作偏好',
    content: `## 写作偏好
- 写作领域: 
- 目标读者: 
- 语言风格: 专业/ casual
- 常用格式: Markdown`
  },
  {
    id: 'business',
    name: '业务背景',
    content: `## 业务背景
- 行业领域: 
- 公司/组织: 
- 主要职责: 
- 专业术语: `
  }
]

// 监听 agent 变化
watch(() => props.agent, (newAgent) => {
  if (newAgent) {
    config.value = {
      enabled: newAgent.memory.enabled,
      content: newAgent.memory.content,
      autoExtract: newAgent.memory.autoExtract,
      maxTokens: newAgent.memory.maxTokens
    }
  }
}, { deep: true })

function applyTemplate(template: typeof memoryTemplates[0]) {
  config.value.content = template.content
}

function saveMemory() {
  // TODO: 调用 updateAgent 保存记忆
  console.log('Save memory:', config.value)
}
</script>

<style scoped>
.memory-manager {
  height: 100%;
}

.memory-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
  height: 100%;
}

/* 左侧配置 */
.memory-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.config-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.header-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--vp-c-brand-soft), var(--vp-c-brand));
  border-radius: 10px;
  font-size: 20px;
}

.header-info {
  flex: 1;
}

.header-info h4 {
  margin: 0 0 2px 0;
  font-size: 15px;
  font-weight: 600;
}

.header-info p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.card-content {
  padding: 16px 20px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
  cursor: pointer;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--vp-c-divider);
  border-radius: 26px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--vp-c-brand);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.setting-item label {
  font-size: 13px;
  font-weight: 500;
}

.token-input {
  display: flex;
  align-items: center;
  gap: 12px;
}

.token-input input {
  width: 100px;
  padding: 8px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.token-hint {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 记忆编辑器 */
.memory-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-btn {
  padding: 6px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.template-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.memory-editor textarea {
  width: 100%;
  padding: 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
  resize: vertical;
  min-height: 160px;
}

.memory-editor textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand);
}

.editor-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-stats span {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--vp-c-brand);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  background: var(--vp-c-brand-dark);
}

.hint-text {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* 右侧预览 */
.memory-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}

.preview-header {
  padding: 16px 20px;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

.preview-header h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.preview-content {
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--vp-c-text-3);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.preview-section {
  margin-bottom: 16px;
}

.preview-section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.preview-box {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-badge {
  padding: 4px 10px;
  background: var(--vp-c-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.token-badge {
  padding: 4px 10px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 6px;
  font-size: 12px;
}

.memory-content-preview {
  max-height: 200px;
  overflow-y: auto;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px;
}

.memory-content-preview pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 提示卡片 */
.tips-card {
  padding: 16px 20px;
  background: linear-gradient(145deg, #fef3c7, #fde68a);
  border-radius: 12px;
}

.tips-card h5 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
}

.tips-card ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #a16207;
  line-height: 1.6;
}

.tips-card li {
  margin-bottom: 4px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .memory-layout {
    grid-template-columns: 1fr;
  }
  
  .memory-preview {
    order: -1;
  }
}
</style>
