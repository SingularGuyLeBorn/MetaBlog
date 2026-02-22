<!--
  AgentDetail - Agent 详细配置页面
  
  设计特点：
  - 三栏布局：左侧导航、中间内容、右侧预览
  - 左侧：配置分类导航菜单
  - 中间：动态表单配置
  - 右侧：实时预览和测试
-->
<template>
  <div class="agent-detail">
    <!-- 顶部栏 -->
    <header class="detail-header">
      <button class="btn-back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span>返回列表</span>
      </button>
      
      <div class="header-title">
        <span class="title-avatar">{{ agent.avatar }}</span>
        <div class="title-info">
          <h2>{{ agent.name }}</h2>
          <span class="title-level" :style="levelStyle">{{ levelLabel }}</span>
        </div>
      </div>
      
      <div class="header-actions">
        <button class="btn-status" :class="agent.status" @click="toggleStatus">
          <span class="status-dot"></span>
          {{ statusText }}
        </button>
        <button class="btn-save" :disabled="!hasChanges" @click="saveChanges">
          <span>💾</span>
          <span>保存</span>
        </button>
      </div>
    </header>
    
    <!-- 三栏主体 -->
    <div class="detail-body">
      <!-- 左侧导航 -->
      <nav class="detail-nav">
        <div class="nav-section">
          <div class="nav-title">基础配置</div>
          <button
            v-for="item in basicNavItems"
            :key="item.id"
            class="nav-item"
            :class="{ active: currentTab === item.id }"
            @click="currentTab = item.id"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </div>
        
        <div class="nav-section">
          <div class="nav-title">高级配置</div>
          <button
            v-for="item in advancedNavItems"
            :key="item.id"
            class="nav-item"
            :class="{ active: currentTab === item.id }"
            @click="currentTab = item.id"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </div>
      </nav>
      
      <!-- 中间内容区 -->
      <main class="detail-content">
        <!-- 基本信息 -->
        <section v-if="currentTab === 'basic'" class="content-section">
          <h3>基本信息</h3>
          
          <div class="form-group">
            <label>名称</label>
            <input v-model="form.name" type="text" class="form-input" />
          </div>
          
          <div class="form-group">
            <label>头像</label>
            <div class="avatar-grid">
              <button
                v-for="emoji in avatarOptions"
                :key="emoji"
                class="avatar-btn"
                :class="{ active: form.avatar === emoji }"
                @click="form.avatar = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="form.description" rows="3" class="form-textarea" />
          </div>
          
          <div class="form-group">
            <label>等级</label>
            <select v-model="form.level" class="form-select">
              <option value="meta">元 Agent</option>
              <option value="core">核心 Agent</option>
              <option value="fixed">固定 Agent</option>
              <option value="custom">自定义 Agent</option>
            </select>
          </div>
        </section>
        
        <!-- 系统提示词 -->
        <section v-if="currentTab === 'prompt'" class="content-section">
          <h3>系统提示词</h3>
          <p class="section-desc">定义 Agent 的角色、行为和回答风格</p>
          
          <div class="form-group">
            <textarea 
              v-model="form.systemPrompt" 
              rows="20" 
              class="form-textarea code"
              placeholder="你是一个 helpful 的 AI 助手..."
            />
          </div>
          
          <div class="prompt-templates">
            <span class="template-label">快速模板：</span>
            <button 
              v-for="tpl in promptTemplates" 
              :key="tpl.name"
              class="template-btn"
              @click="applyPromptTemplate(tpl)"
            >
              {{ tpl.name }}
            </button>
          </div>
        </section>
        
        <!-- 技能配置 -->
        <section v-if="currentTab === 'skills'" class="content-section">
          <h3>技能配置</h3>
          <p class="section-desc">为此 Agent 配置可用的技能</p>
          
          <div class="skills-list">
            <label
              v-for="skill in availableSkills"
              :key="skill.id"
              class="skill-checkbox"
              :class="{ checked: form.skills.includes(skill.id) }"
            >
              <input
                type="checkbox"
                :value="skill.id"
                v-model="form.skills"
              />
              <span class="skill-icon">{{ skill.icon }}</span>
              <div class="skill-info">
                <span class="skill-name">{{ skill.name }}</span>
                <span class="skill-desc">{{ skill.description }}</span>
              </div>
            </label>
          </div>
        </section>
        
        <!-- 记忆管理 -->
        <section v-if="currentTab === 'memory'" class="content-section">
          <h3>记忆管理</h3>
          
          <div class="form-group inline">
            <label>启用长期记忆</label>
            <label class="toggle-switch">
              <input type="checkbox" v-model="form.memoryEnabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div v-if="form.memoryEnabled" class="form-group">
            <label>记忆内容</label>
            <textarea 
              v-model="form.memoryContent" 
              rows="10" 
              class="form-textarea"
              placeholder="输入 Agent 需要记住的信息..."
            />
          </div>
        </section>
        
        <!-- 权限设置 -->
        <section v-if="currentTab === 'permissions'" class="content-section">
          <h3>权限设置</h3>
          <p class="section-desc">配置 Agent 的操作权限</p>
          
          <div class="permissions-list">
            <label
              v-for="perm in permissionTemplates"
              :key="perm.id"
              class="permission-item"
            >
              <input
                type="checkbox"
                :checked="isPermissionGranted(perm.id)"
                @change="togglePermission(perm.id)"
              />
              <div class="permission-info">
                <span class="permission-name">{{ perm.name }}</span>
                <span class="permission-desc">{{ perm.description }}</span>
              </div>
            </label>
          </div>
        </section>
        
        <!-- 高级设置 -->
        <section v-if="currentTab === 'advanced'" class="content-section">
          <h3>高级设置</h3>
          
          <div class="form-group">
            <label>座次</label>
            <input v-model.number="form.seat" type="number" class="form-input" min="1" />
            <span class="form-hint">数字越小，排名越靠前</span>
          </div>
          
          <div class="form-group danger-zone">
            <label>危险区域</label>
            <button class="btn-danger" @click="confirmDelete">
              <span>🗑️</span>
              <span>删除此 Agent</span>
            </button>
          </div>
        </section>
      </main>
      
      <!-- 右侧预览区 -->
      <aside class="detail-preview">
        <div class="preview-card">
          <div class="preview-header">
            <span class="preview-title">实时预览</span>
          </div>
          
          <div class="preview-agent">
            <div class="preview-avatar">{{ form.avatar }}</div>
            <div class="preview-info">
              <span class="preview-name">{{ form.name || '未命名' }}</span>
              <span class="preview-status" :class="agent.status">{{ statusText }}</span>
            </div>
          </div>
          
          <div class="preview-stats">
            <div class="preview-stat">
              <span class="stat-label">调用次数</span>
              <span class="stat-value">{{ agent.callCount }}</span>
            </div>
            <div class="preview-stat">
              <span class="stat-label">技能数</span>
              <span class="stat-value">{{ form.skills.length }}</span>
            </div>
            <div class="preview-stat">
              <span class="stat-label">权限数</span>
              <span class="stat-value">{{ grantedPermissionsCount }}</span>
            </div>
          </div>
        </div>
        
        <div class="test-card">
          <div class="test-header">
            <span>🧪 快速测试</span>
          </div>
          <textarea
            v-model="testMessage"
            rows="4"
            placeholder="输入测试消息..."
            class="test-input"
          />
          <button 
            class="btn-test" 
            :disabled="!testMessage.trim()"
            @click="sendTest"
          >
            发送测试
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Agent, AgentPermission } from '../../../core/composables/useAgents'
import { LEVEL_CONFIG, PERMISSION_TEMPLATES } from '../../../core/composables/useAgents'

const props = defineProps<{
  agent: Agent
}>()

const emit = defineEmits<{
  back: []
  save: [data: Partial<Agent>]
  delete: [agent: Agent]
}>()

// 当前标签页
const currentTab = ref('basic')

// 导航菜单
const basicNavItems = [
  { id: 'basic', label: '基本信息', icon: '📝' },
  { id: 'prompt', label: '系统提示词', icon: '💭' },
  { id: 'skills', label: '技能配置', icon: '🎯' },
]

const advancedNavItems = [
  { id: 'memory', label: '记忆管理', icon: '🧠' },
  { id: 'permissions', label: '权限设置', icon: '🔒' },
  { id: 'advanced', label: '高级设置', icon: '⚙️' },
]

// 表单数据
const form = reactive({
  name: props.agent.name,
  avatar: props.agent.avatar,
  description: props.agent.description,
  level: props.agent.level,
  systemPrompt: props.agent.systemPrompt,
  skills: [...props.agent.skills],
  memoryEnabled: props.agent.memoryEnabled,
  memoryContent: props.agent.memoryContent,
  seat: props.agent.seat,
  permissions: JSON.parse(JSON.stringify(props.agent.permissions)) as AgentPermission[]
})

// 同步 props 变化
watch(() => props.agent, (newAgent) => {
  form.name = newAgent.name
  form.avatar = newAgent.avatar
  form.description = newAgent.description
  form.level = newAgent.level
  form.systemPrompt = newAgent.systemPrompt
  form.skills = [...newAgent.skills]
  form.memoryEnabled = newAgent.memoryEnabled
  form.memoryContent = newAgent.memoryContent
  form.seat = newAgent.seat
  form.permissions = JSON.parse(JSON.stringify(newAgent.permissions))
}, { deep: true })

// 头像选项
const avatarOptions = ['🤖', '👩‍💻', '👨‍💻', '🎨', '✍️', '🔬', '📊', '💼', '🎭', '🔮', '👑', '⚡']

// 可用技能
const availableSkills = [
  { id: 'write', name: '写作', icon: '✍️', description: '撰写和编辑文章' },
  { id: 'code', name: '编程', icon: '💻', description: '编写和调试代码' },
  { id: 'summarize', name: '总结', icon: '📋', description: '总结长文本内容' },
  { id: 'translate', name: '翻译', icon: '🌐', description: '多语言翻译' },
  { id: 'analyze', name: '分析', icon: '📊', description: '数据分析和可视化' },
  { id: 'search', name: '搜索', icon: '🔍', description: '网络搜索和信息检索' },
]

// 权限模板
const permissionTemplates = PERMISSION_TEMPLATES

// 提示词模板
const promptTemplates = [
  { name: '通用助手', content: '你是一个 helpful 的 AI 助手，擅长回答问题、提供建议和协助完成各种任务。' },
  { name: '编程专家', content: '你是一个专业的编程助手，精通多种编程语言，擅长代码审查、调试和优化。' },
  { name: '写作助手', content: '你是一个专业的写作助手，擅长撰写、编辑和润色各种文体的文章。' },
  { name: '数据分析', content: '你是一个数据分析专家，擅长数据清洗、统计分析、可视化和洞察提取。' },
]

// 计算属性
const levelConfig = computed(() => LEVEL_CONFIG[form.level])
const levelLabel = computed(() => levelConfig.value.label)
const levelStyle = computed(() => ({ color: levelConfig.value.color }))

const statusText = computed(() => {
  const map: Record<string, string> = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    idle: '空闲'
  }
  return map[props.agent.status] || props.agent.status
})

const grantedPermissionsCount = computed(() => 
  form.permissions.filter(p => p.granted).length
)

const hasChanges = computed(() => {
  return (
    form.name !== props.agent.name ||
    form.avatar !== props.agent.avatar ||
    form.description !== props.agent.description ||
    form.level !== props.agent.level ||
    form.systemPrompt !== props.agent.systemPrompt ||
    JSON.stringify(form.skills) !== JSON.stringify(props.agent.skills) ||
    form.memoryEnabled !== props.agent.memoryEnabled ||
    form.memoryContent !== props.agent.memoryContent ||
    form.seat !== props.agent.seat ||
    JSON.stringify(form.permissions) !== JSON.stringify(props.agent.permissions)
  )
})

// 测试消息
const testMessage = ref('')

// 方法
function toggleStatus() {
  const newStatus = props.agent.status === 'online' ? 'offline' : 'online'
  emit('save', { status: newStatus })
}

function saveChanges() {
  emit('save', {
    name: form.name,
    avatar: form.avatar,
    description: form.description,
    level: form.level,
    systemPrompt: form.systemPrompt,
    skills: form.skills,
    memoryEnabled: form.memoryEnabled,
    memoryContent: form.memoryContent,
    seat: form.seat,
    permissions: form.permissions
  })
}

function isPermissionGranted(id: string): boolean {
  const perm = form.permissions.find(p => p.id === id)
  return perm?.granted || false
}

function togglePermission(id: string) {
  const perm = form.permissions.find(p => p.id === id)
  if (perm) {
    perm.granted = !perm.granted
  }
}

function applyPromptTemplate(tpl: { name: string; content: string }) {
  form.systemPrompt = tpl.content
}

function confirmDelete() {
  if (confirm(`确定要删除 Agent "${props.agent.name}" 吗？此操作无法撤销。`)) {
    emit('delete', props.agent)
  }
}

function sendTest() {
  console.log('Test message:', testMessage.value)
  // TODO: 实现测试逻辑
  testMessage.value = ''
}
</script>

<style scoped>
.agent-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vp-c-bg);
}

/* 顶部栏 */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
}

.btn-back svg {
  width: 18px;
  height: 18px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--vp-c-bg);
  border-radius: 10px;
}

.title-info h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.title-level {
  font-size: 12px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-status.online {
  color: #16a34a;
  background: #dcfce7;
}

.btn-status.offline {
  color: #6b7280;
  background: #f3f4f6;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 三栏主体 */
.detail-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧导航 */
.detail-nav {
  width: 200px;
  padding: 20px;
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-title {
  padding: 0 12px;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 2px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.nav-item.active {
  background: var(--vp-c-brand);
  color: white;
}

.nav-icon {
  font-size: 16px;
}

/* 中间内容区 */
.detail-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.content-section {
  max-width: 600px;
}

.content-section h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.section-desc {
  margin: 0 0 24px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* 表单样式 */
.form-group {
  margin-bottom: 20px;
}

.form-group.inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-textarea.code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 头像网格 */
.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.avatar-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--vp-c-bg-soft);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-btn:hover {
  border-color: var(--vp-c-divider);
}

.avatar-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
}

/* 提示词模板 */
.prompt-templates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.template-label {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.template-btn {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-btn:hover {
  background: var(--vp-c-brand);
  color: white;
}

/* 技能列表 */
.skills-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.skill-checkbox:hover {
  border-color: var(--vp-c-brand);
}

.skill-checkbox.checked {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.skill-checkbox input {
  display: none;
}

.skill-icon {
  font-size: 24px;
}

.skill-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.skill-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--vp-c-divider);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--vp-c-brand);
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 权限列表 */
.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.permission-item:hover {
  border-color: var(--vp-c-brand);
}

.permission-item input {
  margin-top: 2px;
}

.permission-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.permission-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.permission-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

/* 危险区域 */
.danger-zone {
  padding: 20px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
}

.danger-zone label {
  color: #dc2626;
  margin-bottom: 12px;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
}

/* 右侧预览区 */
.detail-preview {
  width: 280px;
  padding: 20px;
  border-left: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow-y: auto;
}

.preview-card,
.test-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
}

.preview-header,
.test-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.preview-agent {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.preview-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.preview-status {
  font-size: 12px;
  font-weight: 500;
}

.preview-status.online { color: #16a34a; }
.preview-status.offline { color: #6b7280; }

.preview-stats {
  display: flex;
  padding: 12px 16px;
  border-top: 1px solid var(--vp-c-divider);
}

.preview-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.preview-stat .stat-label {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.preview-stat .stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* 测试卡片 */
.test-input {
  width: 100%;
  padding: 12px;
  border: none;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  background: transparent;
  resize: vertical;
  outline: none;
}

.btn-test {
  width: 100%;
  padding: 10px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-test:hover {
  background: var(--vp-c-brand-dark);
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式 */
@media (max-width: 1024px) {
  .detail-preview {
    display: none;
  }
}

@media (max-width: 768px) {
  .detail-nav {
    display: none;
  }
}
</style>
