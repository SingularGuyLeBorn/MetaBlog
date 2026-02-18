<script setup lang="ts">
/**
 * GlobalPageEditor-AGI
 * 增强编辑器 - 人机协同创作工作站
 * 
 * 新增功能：
 * - AgentModeToggle: MANUAL / COLLAB / AGENT 三模式切换
 * - InlineSuggestion: 行内建议（类 Copilot）
 * - ContextIndicator: 上下文指示器
 */
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'
import { useAppStore } from '../../stores/app'
import { AgentRuntime } from '../../../agent/core/AgentRuntime'
import { skillEngine } from '../../../agent/skills/SkillEngine'
import { builtinSkills } from '../../../agent/skills/builtin'
import VditorEditor from '../editor/VditorEditor.vue'
import AgentModeToggle from './AgentModeToggle.vue'
import InlineSuggestion from './InlineSuggestion.vue'
import ContextIndicator from './ContextIndicator.vue'
import type { EditorMode, InlineSuggestion as Suggestion } from '../../../agent/core/types'

const store = useAppStore()
const { page } = useData()

// Agent Runtime
const agent = AgentRuntime.getInstance({ mode: 'MANUAL' })

// 编辑器状态
const content = ref('')
const isSaving = ref(false)
const editorMode = ref<EditorMode>('MANUAL')
const isProcessing = ref(false)

// Agent 状态
const agentState = computed(() => agent.getCurrentState())
const currentTask = computed(() => agent.getCurrentTask())
const costTracker = computed(() => agent.getCostTracker())

// 行内建议
const suggestions = ref<Suggestion[]>([])
const activeSuggestion = ref<Suggestion | null>(null)
interface CursorPosition {
  line: number
  ch: number
}

const cursorPosition = ref<CursorPosition>({ line: 0, ch: 0 })

// 上下文
const contextInfo = ref({
  relatedArticles: 0,
  entities: [] as string[],
  tokens: 0,
  maxTokens: 8192
})

// 初始化
onMounted(async () => {
  // 注册技能
  skillEngine.registerMany(builtinSkills)
  for (const skill of builtinSkills) {
    agent.registerSkill(skill)
  }
  await agent.initialize()

  // 监听编辑器模式变化
  agent.on('modeChanged', ({ newMode }: { newMode: EditorMode }) => {
    editorMode.value = newMode
  })
})

// 加载内容
watch(() => store.isEditorOpen, async (isOpen) => {
  if (isOpen) {
    const filePath = page.value.relativePath
    agent.setCurrentFile(filePath)
    
    try {
      const res = await fetch(`/api/files/read?path=${filePath}`)
      if (res.ok) {
        content.value = await res.text()
        // 初始化上下文
        await updateContext()
      }
    } catch (e) {
      console.error('Failed to load content', e)
    }
  }
}, { immediate: true })

// 保存内容
async function saveContent(val?: string) {
  const valueToSave = val !== undefined ? val : content.value
  isSaving.value = true
  
  const filePath = page.value.relativePath

  try {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content: valueToSave })
    })
    
    if (!res.ok) throw new Error('Save failed')
    
    // 保存后更新知识图谱
    if (editorMode.value !== 'MANUAL') {
      await agent.getMemory().entities.extractFromContent(valueToSave, filePath)
    }
    
    console.log('Saved successfully')
  } catch (e) {
    console.error('Failed to save', e)
    alert('保存失败')
  } finally {
    isSaving.value = false
  }
}

// 内容更新处理（用于 COLLAB 模式）
function onUpdateValue(val: string) {
  content.value = val
  
  // COLLAB 模式下分析内容
  if (editorMode.value === 'COLLAB' && !isProcessing.value) {
    debouncedAnalyze(val)
  }
}

// 分析内容（防抖）
let analyzeTimeout: ReturnType<typeof setTimeout>
async function debouncedAnalyze(val: string) {
  clearTimeout(analyzeTimeout)
  analyzeTimeout = setTimeout(async () => {
    await analyzeContent(val)
  }, 1500)
}

async function analyzeContent(val: string) {
  if (!val || val.length < 50) return
  
  isProcessing.value = true
  try {
    const newSuggestions = await agent.analyzeEditorContent(val, cursorPosition.value.ch)
    suggestions.value = newSuggestions
  } catch (e) {
    console.error('Analysis failed', e)
  } finally {
    isProcessing.value = false
  }
}

// 更新上下文信息
async function updateContext() {
  const filePath = page.value.relativePath
  const ctx = await agent.getMemory().buildContext('', filePath)
  
  contextInfo.value = {
    relatedArticles: ctx.length,
    entities: ctx.filter(c => c.metadata.type === 'entity').map(c => c.source),
    tokens: ctx.reduce((sum, c) => sum + c.content.length, 0),
    maxTokens: 8192
  }
}

// 模式切换
function onModeChange(mode: EditorMode) {
  agent.setMode(mode)
  
  // 清除或显示建议
  if (mode === 'MANUAL') {
    suggestions.value = []
    activeSuggestion.value = null
  }
}

// 接受建议
function acceptSuggestion(suggestion: Suggestion) {
  // TODO: 将建议应用到编辑器
  console.log('Accepting suggestion:', suggestion)
  activeSuggestion.value = null
}

// 忽略建议
function dismissSuggestion(suggestion: Suggestion) {
  suggestions.value = suggestions.value.filter(s => s.id !== suggestion.id)
  if (activeSuggestion.value?.id === suggestion.id) {
    activeSuggestion.value = null
  }
}

// 关闭编辑器
function closeEditor() {
  store.toggleEditor()
}

// 从 Agent 接收指令
async function handleAgentCommand(command: string) {
  if (editorMode.value !== 'AGENT') return
  
  // Agent 模式下，用户输入指令，Agent 自动编辑
  const result = await agent.processInput(command, {
    currentFile: page.value.relativePath
  })
  
  // 如果生成了内容，插入到编辑器
  if (result.content) {
    content.value += '\n\n' + result.content
  }
}
</script>

<template>
  <div v-if="store.isEditorOpen" class="global-page-editor-agi">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <span class="file-info">{{ page.relativePath }}</span>
        <span v-if="isSaving" class="saving-indicator">
          <span class="spinner"></span>
          保存中...
        </span>
      </div>
      
      <div class="toolbar-center">
        <!-- 模式切换器 -->
        <AgentModeToggle 
          :mode="editorMode"
          @change="onModeChange"
        />
      </div>
      
      <div class="toolbar-right">
        <button class="toolbar-btn primary" @click="() => saveContent()">
          💾 保存
        </button>
        <button class="toolbar-btn" @click="closeEditor">
          ✓ 完成
        </button>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-main">
      <VditorEditor 
        :initial-value="content" 
        :path="page.relativePath"
        :mode="editorMode"
        @update:value="onUpdateValue"
        @save="saveContent"
        @cursor-change="(pos: CursorPosition) => cursorPosition = pos"
      />
      
      <!-- 行内建议 -->
      <InlineSuggestion
        v-if="editorMode !== 'MANUAL' && activeSuggestion"
        :suggestion="activeSuggestion"
        :position="cursorPosition"
        @accept="acceptSuggestion"
        @dismiss="dismissSuggestion"
      />
    </div>

    <!-- 底部状态栏 -->
    <div class="editor-status-bar">
      <div class="status-left">
        <span class="word-count">
          字数: {{ content.length }}
        </span>
        <span class="last-save">
          {{ isSaving ? '保存中...' : '已保存' }}
        </span>
      </div>
      
      <div class="status-center">
        <!-- Agent 状态指示 -->
        <span v-if="editorMode !== 'MANUAL'" class="agent-status" :class="agentState.toLowerCase()">
          <span class="status-icon">{{ 
            agentState === 'IDLE' ? '⏸️' : 
            agentState === 'UNDERSTANDING' ? '🤔' :
            agentState === 'EXECUTING' ? '⚡' : '⏳'
          }}</span>
          <span class="status-text">{{ 
            agentState === 'IDLE' ? 'AI 就绪' : 
            agentState === 'UNDERSTANDING' ? '理解中...' :
            agentState === 'EXECUTING' ? '执行中...' : '等待中'
          }}</span>
        </span>
      </div>
      
      <div class="status-right">
        <!-- 上下文指示器 -->
        <ContextIndicator
          v-if="editorMode !== 'MANUAL'"
          :info="contextInfo"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.global-page-editor-agi {
  margin-top: 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

/* Toolbar */
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-info {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.saving-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-brand);
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--vp-c-brand);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.toolbar-center {
  flex-shrink: 0;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: var(--vp-c-bg-mute);
}

.toolbar-btn.primary {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.toolbar-btn.primary:hover {
  opacity: 0.9;
}

/* Main Editor */
.editor-main {
  position: relative;
  height: 600px;
}

/* Status Bar */
.editor-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.status-left {
  display: flex;
  gap: 16px;
}

.status-center {
  display: flex;
  align-items: center;
}

.agent-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
}

.agent-status.executing {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
  animation: pulse 2s infinite;
}

.agent-status.understanding {
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status-right {
  display: flex;
  align-items: center;
}
</style>
