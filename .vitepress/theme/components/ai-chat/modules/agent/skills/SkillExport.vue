<!--
  SkillExport - 技能导出组件 (液态玻璃风格)
  
  功能：
  - 导出单个技能为 JSON
  - 批量导出多个技能
  - 复制到剪贴板
  - 下载为文件
-->
<template>
  <div class="skill-export-liquid">
    <div class="export-header">
      <h3 class="header-title">
        <span class="title-icon">📦</span>
        导出技能
      </h3>
      <p class="header-desc">将技能导出为 JSON 或 Markdown 格式，便于分享和备份</p>
    </div>

    <!-- 技能选择 -->
    <div class="skill-selection">
      <h4 class="section-title">选择要导出的技能</h4>
      <div class="skill-list-liquid">
        <label
          v-for="skill in skills"
          :key="skill.id"
          class="skill-select-item"
          :class="{ selected: selectedSkills.includes(skill.id) }"
        >
          <input
            type="checkbox"
            :value="skill.id"
            v-model="selectedSkills"
          />
          <div class="select-glow" />
          <span class="skill-icon">{{ skill.icon }}</span>
          <div class="skill-info">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-meta">{{ skill.category }} · {{ skill.tools.length }} 工具</span>
          </div>
          <div class="select-indicator">
            <span class="indicator-dot" />
          </div>
        </label>
      </div>
      
      <div class="selection-actions">
        <button class="action-link" @click="selectAll">全选</button>
        <span class="divider">|</span>
        <button class="action-link" @click="deselectAll">取消全选</button>
        <span class="selection-count">已选择 {{ selectedSkills.length }} 个</span>
      </div>
    </div>

    <!-- 导出格式 -->
    <div class="export-format">
      <h4 class="section-title">导出格式</h4>
      <div class="format-options">
        <label
          v-for="format in formats"
          :key="format.id"
          class="format-card"
          :class="{ active: selectedFormat === format.id }"
        >
          <input
            type="radio"
            :value="format.id"
            v-model="selectedFormat"
          />
          <div class="format-glow" />
          <span class="format-icon">{{ format.icon }}</span>
          <div class="format-info">
            <span class="format-name">{{ format.name }}</span>
            <span class="format-desc">{{ format.description }}</span>
          </div>
        </label>
      </div>
    </div>

    <!-- 预览 -->
    <div class="export-preview">
      <h4 class="section-title">
        预览
        <span class="preview-badge">{{ previewSize }}</span>
      </h4>
      <div class="preview-container">
        <pre class="preview-content"><code>{{ exportContent }}</code></pre>
        <div class="preview-overlay">
          <button class="copy-btn" @click="copyContent">
            <span>{{ copied ? '✓' : '📋' }}</span>
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 导出操作 -->
    <div class="export-actions">
      <button 
        class="btn-liquid secondary" 
        @click="$emit('cancel')"
      >
        <span class="btn-ripple" />
        <span class="btn-text">取消</span>
      </button>
      <button 
        class="btn-liquid primary" 
        :disabled="selectedSkills.length === 0"
        @click="downloadExport"
      >
        <span class="btn-ripple" />
        <span class="btn-glow" />
        <span class="btn-text">⬇️ 下载导出文件</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Skill } from '../../../core/types/agent'

const props = defineProps<{
  skills: Skill[]
  initialSelection?: string[]
}>()

const emit = defineEmits<{
  cancel: []
}>()

// 导出格式
const formats = [
  {
    id: 'json',
    name: 'JSON 格式',
    icon: '{ }',
    description: '完整的技能数据，适合导入和备份'
  },
  {
    id: 'markdown',
    name: 'Markdown',
    icon: '📝',
    description: '人类可读的文档格式'
  },
  {
    id: 'yaml',
    name: 'YAML',
    icon: '📋',
    description: '简洁的配置格式'
  }
]

// 状态
const selectedSkills = ref<string[]>(props.initialSelection || [])
const selectedFormat = ref('json')
const copied = ref(false)

// 计算选中的技能数据
const selectedSkillsData = computed(() => {
  return props.skills.filter(s => selectedSkills.value.includes(s.id))
})

// 导出内容
const exportContent = computed(() => {
  const data = selectedSkillsData.value
  
  switch (selectedFormat.value) {
    case 'json':
      return JSON.stringify(data, null, 2)
    
    case 'markdown':
      return data.map(skill => `# ${skill.icon} ${skill.name}

**ID:** \`${skill.id}\`  
**分类:** ${skill.category}  
**版本:** ${skill.version}  
**内置:** ${skill.isBuiltIn ? '是' : '否'}

## 描述

${skill.description}

## 内容

\`\`\`
${skill.content || ''}
\`\`\`

## 使用场景

${skill.usageScenarios?.map(s => `- ${s}`).join('\n') || '无'}

## 关联工具

${skill.tools.map(t => `- ${t}`).join('\n')}

---

*创建于 ${new Date(skill.createdAt).toLocaleString()}*
`).join('\n')
    
    case 'yaml':
      return data.map(skill => `skill:
  id: ${skill.id}
  name: "${skill.name}"
  icon: "${skill.icon}"
  description: "${skill.description}"
  category: ${skill.category}
  version: "${skill.version}"
  isBuiltIn: ${skill.isBuiltIn}
  enabled: ${skill.enabled}
  content: |
    ${(skill.content || '').replace(/\n/g, '\n    ')}
  usageScenarios:
${skill.usageScenarios?.map(s => `    - ${s}`).join('\n') || '    # 无'}
  tools:
${skill.tools.map(t => `    - ${t}`).join('\n')}
  tags:
${skill.tags.map(t => `    - ${t}`).join('\n')}
  createdAt: ${skill.createdAt}
  updatedAt: ${skill.updatedAt}
`).join('\n---\n')
    
    default:
      return ''
  }
})

// 预览大小
const previewSize = computed(() => {
  const bytes = new Blob([exportContent.value]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

// 文件名
const exportFilename = computed(() => {
  const timestamp = new Date().toISOString().slice(0, 10)
  const count = selectedSkills.value.length
  const extension = selectedFormat.value === 'markdown' ? 'md' : selectedFormat.value
  return `skills-export-${count}-${timestamp}.${extension}`
})

// 方法
function selectAll() {
  selectedSkills.value = props.skills.map(s => s.id)
}

function deselectAll() {
  selectedSkills.value = []
}

async function copyContent() {
  try {
    await navigator.clipboard.writeText(exportContent.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

function downloadExport() {
  const blob = new Blob([exportContent.value], { 
    type: selectedFormat.value === 'json' 
      ? 'application/json' 
      : 'text/plain' 
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = exportFilename.value
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* ===== 液态玻璃导出面板 ===== */
.skill-export-liquid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-height: 80vh;
  overflow-y: auto;
}

.export-header {
  text-align: center;
}

.header-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.title-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border-radius: 12px;
  font-size: 20px;
  box-shadow: 0 4px 15px rgba(179, 168, 184, 0.3);
}

.header-desc {
  margin: 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

/* ===== 技能选择 ===== */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.preview-badge {
  padding: 2px 8px;
  background: rgba(179, 168, 184, 0.1);
  border-radius: 100px;
  font-size: 11px;
  color: var(--sr-morandi-blue, #9daab8);
}

.skill-list-liquid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}

.skill-select-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.skill-select-item:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateX(4px);
}

.skill-select-item.selected {
  background: linear-gradient(145deg, rgba(179, 168, 184, 0.08), rgba(184, 160, 144, 0.04));
  border-color: rgba(179, 168, 184, 0.4);
}

.skill-select-item input {
  position: absolute;
  opacity: 0;
}

.select-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 0% 50%, rgba(179, 168, 184, 0.1), transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.skill-select-item.selected .select-glow {
  opacity: 1;
}

.skill-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.8));
  border-radius: 10px;
  font-size: 20px;
  z-index: 1;
}

.skill-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 1;
}

.skill-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.skill-meta {
  font-size: 11px;
  color: #94a3b8;
}

.select-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.indicator-dot {
  width: 12px;
  height: 12px;
  background: #cbd5e1;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.skill-select-item.selected .indicator-dot {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  box-shadow: 0 0 12px rgba(179, 168, 184, 0.5);
}

.selection-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(241, 245, 249, 0.5);
  border-radius: 10px;
}

.action-link {
  padding: 4px 10px;
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--sr-morandi-blue, #9daab8);
  cursor: pointer;
  transition: all 0.2s;
}

.action-link:hover {
  background: rgba(179, 168, 184, 0.1);
  border-radius: 6px;
}

.divider {
  color: #cbd5e1;
}

.selection-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

/* ===== 导出格式 ===== */
.export-format {
  padding: 16px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
}

.format-options {
  display: flex;
  gap: 10px;
}

.format-card {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.format-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.format-card.active {
  background: linear-gradient(145deg, rgba(179, 168, 184, 0.08), rgba(184, 160, 144, 0.04));
  border-color: rgba(179, 168, 184, 0.4);
}

.format-card input {
  position: absolute;
  opacity: 0;
}

.format-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 100%, rgba(179, 168, 184, 0.1), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.format-card.active .format-glow {
  opacity: 1;
}

.format-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.8));
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  color: var(--sr-text-muted, #94a3b8);
  z-index: 1;
}

.format-card.active .format-icon {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  color: white;
}

.format-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 1;
}

.format-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.format-desc {
  font-size: 11px;
  color: #94a3b8;
}

/* ===== 预览区 ===== */
.export-preview {
  padding: 16px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
}

.preview-container {
  position: relative;
  background: rgba(30, 41, 59, 0.95);
  border-radius: 12px;
  overflow: hidden;
}

.preview-content {
  max-height: 200px;
  overflow: auto;
  margin: 0;
  padding: 16px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.6;
  color: #94a3b8;
}

.preview-content code {
  color: #e2e8f0;
}

.preview-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 12px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ===== 导出操作 ===== */
.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.5);
}

.btn-liquid {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-liquid.secondary {
  color: var(--sr-text-muted, #94a3b8);
  background: rgba(241, 245, 249, 0.8);
}

.btn-liquid.secondary:hover {
  background: rgba(226, 232, 240, 0.8);
}

.btn-liquid.primary {
  color: white;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  box-shadow: 0 4px 16px rgba(179, 168, 184, 0.35);
}

.btn-liquid.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(179, 168, 184, 0.45);
}

.btn-liquid:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  border-radius: 14px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.btn-liquid:hover .btn-glow {
  opacity: 0.6;
}

.btn-text {
  position: relative;
  z-index: 1;
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .format-options {
    flex-direction: column;
  }
  
  .export-actions {
    flex-direction: column-reverse;
  }
  
  .btn-liquid {
    justify-content: center;
  }
}
</style>
