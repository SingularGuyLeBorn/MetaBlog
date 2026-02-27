<template>
  <div class="skill-editor-overlay" @click.self="cancel">
    <div class="skill-editor-modal">
      <div class="editor-header">
        <h4>{{ isEditing ? '编辑 Skill' : '新建 Skill' }}</h4>
        <button class="close-btn" @click="cancel">✕</button>
      </div>
      
      <div class="editor-body">
        <div class="editor-tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 基本信息 Tab -->
        <div v-if="activeTab === 'basic'" class="tab-content">
          <div class="form-group">
            <label>Skill 名称 <span class="required">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="例如：Markdown写作助手"
              class="form-input"
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>图标</label>
              <input
                v-model="form.icon"
                type="text"
                placeholder="例如：📝"
                class="form-input icon-input"
              />
            </div>
            
            <div class="form-group">
              <label>分类</label>
              <select v-model="form.category" class="form-select">
                <option value="general">通用</option>
                <option value="writing">写作</option>
                <option value="coding">编程</option>
                <option value="analysis">分析</option>
                <option value="creative">创意</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>描述 <span class="required">*</span></label>
            <input
              v-model="form.description"
              type="text"
              placeholder="一句话描述这个 Skill 的用途（用于匹配用户意图）"
              class="form-input"
            />
            <div class="form-hint">简短描述将显示在系统提示词中，帮助 Agent 判断何时调用此 Skill</div>
          </div>

          <div class="form-group">
            <label>标签（用逗号分隔）</label>
            <input
              v-model="tagsInput"
              type="text"
              placeholder="例如：markdown, 写作, 文档"
              class="form-input"
            />
          </div>
        </div>

        <!-- 使用场景 Tab -->
        <div v-if="activeTab === 'scenarios'" class="tab-content">
          <div class="form-group">
            <label>使用场景 <span class="required">*</span></label>
            <div class="form-hint">定义触发此 Skill 的具体场景，每行一个</div>
            <textarea
              v-model="scenariosInput"
              rows="8"
              placeholder="例如：
用户要求撰写技术文档
需要将内容转换为 Markdown 格式
用户提到排版或格式化需求"
              class="form-textarea"
            ></textarea>
          </div>
          <div class="form-hint">
            系统会根据用户输入匹配这些场景，决定是否注入此 Skill 的内容
          </div>
        </div>

        <!-- 内容 Tab - SKILL.md 格式 -->
        <div v-if="activeTab === 'content'" class="tab-content">
          <div class="form-group">
            <label>Skill 内容 <span class="required">*</span> <span class="format-badge">SKILL.md</span></label>
            <div class="content-toolbar">
              <span class="toolbar-hint">Markdown 格式，在调用时注入对话上下文</span>
            </div>
            <textarea
              v-model="form.content"
              rows="16"
              placeholder="# Markdown 写作助手

## 能力范围

你可以帮助用户：
- 撰写和编辑 Markdown 文档
- 优化文档结构和排版
- 提供写作建议

## 工作流程

1. 理解用户的写作需求
2. 提供结构化的内容建议
3. 输出格式良好的 Markdown

## 示例

```markdown
## 标题

正文内容...
```

## 注意事项

- 使用标准的 Markdown 语法
- 保持段落简洁清晰
- 合理使用列表和表格"
              class="form-textarea code-textarea"
            ></textarea>
            <div class="form-hint">
              这是 Skill 的核心内容，在调用时会被注入为上下文消息
            </div>
          </div>
        </div>

        <!-- 工具配置 Tab -->
        <div v-if="activeTab === 'tools'" class="tab-content">
          <div class="form-group">
            <label>所需工具</label>
            <div class="form-hint">此 Skill 需要使用的工具</div>
            
            <div class="tools-list">
              <label 
                v-for="tool in availableTools" 
                :key="tool.name"
                class="tool-checkbox"
              >
                <input
                  type="checkbox"
                  :value="tool.name"
                  v-model="form.tools"
                />
                <span class="tool-icon">{{ tool.icon }}</span>
                <span class="tool-info">
                  <span class="tool-name">{{ tool.name }}</span>
                  <span class="tool-desc">{{ tool.description }}</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="btn-secondary" @click="cancel">取消</button>
        <button 
          class="btn-primary" 
          :disabled="!isValid"
          @click="save"
        >
          {{ isEditing ? '保存' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Skill, SkillCategory } from '../../../core/types/agent'
import { allToolDefinitions } from '../../../core/tools/definitions'

const props = defineProps<{
  skill?: Skill | null
}>()

const emit = defineEmits<{
  save: [params: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>]
  cancel: []
}>()

const isEditing = computed(() => !!props.skill)

const tabs = [
  { key: 'basic', label: '基本信息' },
  { key: 'scenarios', label: '使用场景' },
  { key: 'content', label: '内容' },
  { key: 'tools', label: '工具' }
]

const activeTab = ref('basic')

// 可用工具列表
const availableTools = Object.entries(allToolDefinitions).map(([name, def]) => ({
  name,
  description: def.function.description,
  icon: getToolIcon(name)
}))

function getToolIcon(name: string): string {
  const iconMap: Record<string, string> = {
    get_current_time: '⏰',
    get_article_content: '📄',
    list_articles: '📚',
    create_article: '✨',
    update_article: '✏️',
    delete_article: '🗑️',
    search_articles: '🔍',
    test_echo: '🔊',
    summarize_text: '📝',
    format_text: '📐',
    read_file: '📂',
    write_file: '💾',
    list_files: '📁',
    web_search: '🌐',
    fetch_url: '🔗',
    calculate: '🧮',
    translate_text: '🌏',
    execute_code: '▶️',
    analyze_code: '🔍',
    query_knowledge: '🧠',
    get_weather: '🌤️',
    create_note: '📓',
  }
  return iconMap[name] || '🔧'
}

const form = ref({
  name: '',
  icon: '🔧',
  category: 'custom' as SkillCategory,
  description: '',
  content: '',
  usageScenarios: [] as string[],
  tools: [] as string[],
  tags: [] as string[],
  enabled: true
})

const tagsInput = ref('')
const scenariosInput = ref('')

// 初始化表单
watch(() => props.skill, (skill) => {
  if (skill) {
    form.value = {
      name: skill.name,
      icon: skill.icon || '🔧',
      category: skill.category,
      description: skill.description,
      content: skill.content || '',
      usageScenarios: skill.usageScenarios || [],
      tools: skill.tools || [],
      tags: skill.tags || [],
      enabled: skill.enabled !== false
    }
    tagsInput.value = (skill.tags || []).join(', ')
    scenariosInput.value = (skill.usageScenarios || []).join('\n')
  } else {
    form.value = {
      name: '',
      icon: '🔧',
      category: 'custom',
      description: '',
      content: '',
      usageScenarios: [],
      tools: [],
      tags: [],
      enabled: true
    }
    tagsInput.value = ''
    scenariosInput.value = ''
  }
  activeTab.value = 'basic'
}, { immediate: true })

const isValid = computed(() => {
  return form.value.name.trim() && 
         form.value.description.trim() && 
         form.value.content.trim() &&
         scenariosInput.value.trim()
})

function cancel() {
  emit('cancel')
}

function save() {
  if (!isValid.value) return
  
  const tags = tagsInput.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(t => t)
  
  const usageScenarios = scenariosInput.value
    .split('\n')
    .map(s => s.trim())
    .filter(s => s)
  
  emit('save', {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    icon: form.value.icon || '🔧',
    category: form.value.category,
    content: form.value.content.trim(),
    usageScenarios,
    tools: form.value.tools,
    tags,
    enabled: form.value.enabled,
    version: '1.0.0'
  })
}
</script>

<style scoped>
.skill-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.skill-editor-modal {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.editor-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 18px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--vp-c-bg-soft);
}

.editor-body {
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.editor-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 24px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tab-btn {
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--vp-c-text-1);
}

.tab-btn.active {
  color: var(--vp-c-brand);
  border-bottom-color: var(--vp-c-brand);
}

.tab-content {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.required {
  color: var(--vp-c-danger);
}

.format-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 4px;
  font-weight: 600;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  background: var(--vp-c-bg-soft);
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.icon-input {
  font-size: 20px;
  text-align: center;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.6;
}

.code-textarea {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.toolbar-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.form-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-top: 6px;
  line-height: 1.5;
}

.tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
}

.tool-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 0;
}

.tool-checkbox:hover {
  background: var(--vp-c-bg-mute);
}

.tool-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--vp-c-brand);
}

.tool-icon {
  font-size: 18px;
}

.tool-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.tool-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.tool-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-secondary:hover {
  background: var(--vp-c-bg-mute);
}

.btn-primary {
  background: var(--vp-c-brand);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
