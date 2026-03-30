<!--
  AgentDetail - Agent 详细配置页面（3D 液态玻璃风格）
-->
<template>
  <div class="agent-detail-3d">
    <!-- 顶部栏 -->
    <header class="detail-header-3d">
      <button class="btn-back-3d" @click="$emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span>返回列表</span>
      </button>
      
      <div class="header-title-3d">
        <span class="title-avatar-3d">{{ agent.avatar }}</span>
        <div class="title-info">
          <h2>{{ agent.name }}</h2>
          <span class="title-level-3d" :style="levelStyle">{{ levelLabel }}</span>
        </div>
      </div>
      
      <div class="header-actions-3d">
        <button class="btn-status-3d" :class="agent.status" @click="toggleStatus">
          <span class="status-dot-3d"></span>
          {{ statusText }}
        </button>
        <button class="btn-save-3d" :disabled="!hasChanges" @click="saveChanges">
          <span>💾</span>
          <span>保存</span>
        </button>
      </div>
    </header>
    
    <!-- 三栏主体 -->
    <div class="detail-body-3d">
      <!-- 左侧导航 -->
      <nav class="detail-nav-3d">
        <div class="nav-section-3d">
          <div class="nav-title-3d">基础配置</div>
          <button
            v-for="(item, index) in basicNavItems"
            :key="item.id"
            class="nav-item-3d"
            :class="{ active: currentTab === item.id }"
            :style="{ animationDelay: `${index * 0.05}s` }"
            @click="currentTab = item.id"
          >
            <span class="nav-icon-3d">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </div>
        
        <div class="nav-section-3d">
          <div class="nav-title-3d">高级配置</div>
          <button
            v-for="(item, index) in advancedNavItems"
            :key="item.id"
            class="nav-item-3d"
            :class="{ active: currentTab === item.id }"
            :style="{ animationDelay: `${(index + 3) * 0.05}s` }"
            @click="currentTab = item.id"
          >
            <span class="nav-icon-3d">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </div>
      </nav>
      
      <!-- 中间内容区 -->
      <main class="detail-content-3d">
        <!-- 基本信息 -->
        <section v-if="currentTab === 'basic'" class="content-section-3d">
          <h3>基本信息</h3>
          
          <div class="form-group-3d">
            <label>名称</label>
            <input v-model="form.name" type="text" class="form-input-3d" />
          </div>
          
          <div class="form-group-3d">
            <label>头像</label>
            <div class="avatar-grid-3d">
              <button
                v-for="emoji in avatarOptions"
                :key="emoji"
                class="avatar-btn-3d"
                :class="{ active: form.avatar === emoji }"
                @click="form.avatar = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
          
          <div class="form-group-3d">
            <label>描述</label>
            <textarea v-model="form.description" rows="3" class="form-textarea-3d" />
          </div>
          
          <div class="form-group-3d">
            <label>等级</label>
            <select v-model="form.level" class="form-select-3d">
              <option value="meta">元 Agent</option>
              <option value="core">核心 Agent</option>
              <option value="fixed">固定 Agent</option>
              <option value="custom">自定义 Agent</option>
            </select>
          </div>
        </section>
        
        <!-- 系统提示词 -->
        <section v-if="currentTab === 'prompt'" class="content-section-3d">
          <h3>系统提示词</h3>
          <p class="section-desc-3d">定义 Agent 的角色、行为和回答风格</p>
          
          <div class="form-group-3d">
            <textarea 
              v-model="form.capabilities.customSystemPrompt" 
              rows="20" 
              class="form-textarea-3d code"
              placeholder="你是一个 helpful 的 AI 助手..."
            />
          </div>
          
          <div class="prompt-templates-3d">
            <span class="template-label-3d">快速模板：</span>
            <button 
              v-for="tpl in promptTemplates" 
              :key="tpl.name"
              class="template-btn-3d"
              @click="applyPromptTemplate(tpl)"
            >
              {{ tpl.name }}
            </button>
          </div>
        </section>
        
        <!-- 技能配置 -->
        <section v-if="currentTab === 'skills'" class="content-section-3d">
          <h3>技能配置</h3>
          <p class="section-desc-3d">为此 Agent 配置可用的技能</p>
          
          <div class="skills-list-3d">
            <label
              v-for="(skill, index) in availableSkills"
              :key="skill.id"
              class="skill-checkbox-3d"
              :class="{ checked: form.capabilities.skillIds.includes(skill.id) }"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <input
                type="checkbox"
                :value="skill.id"
                v-model="form.capabilities.skillIds"
              />
              <span class="skill-icon-3d">{{ skill.icon }}</span>
              <div class="skill-info-3d">
                <span class="skill-name">{{ skill.name }}</span>
                <span class="skill-desc">{{ skill.description }}</span>
              </div>
            </label>
          </div>
        </section>
        
        <!-- 记忆管理 -->
        <section v-if="currentTab === 'memory'" class="content-section-3d">
          <h3>记忆管理</h3>
          
          <div class="form-group-3d inline">
            <label>启用长期记忆</label>
            <label class="toggle-switch-3d">
              <input type="checkbox" v-model="form.memory.enabled" />
              <span class="toggle-slider-3d"></span>
            </label>
          </div>
          
          <div v-if="form.memory.enabled" class="form-group-3d">
            <label>记忆内容</label>
            <textarea 
              v-model="form.memory.content" 
              rows="10" 
              class="form-textarea-3d"
              placeholder="输入 Agent 需要记住的信息..."
            />
          </div>
        </section>
        
        <!-- 权限设置 -->
        <section v-if="currentTab === 'permissions'" class="content-section-3d">
          <h3>权限设置</h3>
          <p class="section-desc-3d">配置 Agent 的操作权限</p>
          
          <div class="permissions-list-3d">
            <label
              v-for="(perm, index) in permissionTemplates"
              :key="perm.id"
              class="permission-item-3d"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <input
                type="checkbox"
                :checked="isPermissionGranted(perm.id)"
                @change="togglePermission(perm.id)"
              />
              <div class="permission-info-3d">
                <span class="permission-name">{{ perm.name }}</span>
                <span class="permission-desc">{{ perm.description }}</span>
              </div>
            </label>
          </div>
        </section>
        
        <!-- 高级设置 -->
        <section v-if="currentTab === 'advanced'" class="content-section-3d">
          <h3>高级设置</h3>
          
          <div class="form-group-3d">
            <label>座次</label>
            <input v-model.number="form.seat" type="number" class="form-input-3d" min="1" />
            <span class="form-hint-3d">数字越小，排名越靠前</span>
          </div>
          
          <div class="form-group-3d danger-zone-3d">
            <label>危险区域</label>
            <button class="btn-danger-3d" @click="confirmDelete">
              <span>🗑️</span>
              <span>删除此 Agent</span>
            </button>
          </div>
        </section>
      </main>
      
      <!-- 右侧预览区 -->
      <aside class="detail-preview-3d">
        <div class="preview-card-3d">
          <div class="preview-header-3d">
            <span class="preview-title">实时预览</span>
          </div>
          
          <div class="preview-agent-3d">
            <div class="preview-avatar-3d">{{ form.avatar }}</div>
            <div class="preview-info-3d">
              <span class="preview-name">{{ form.name || '未命名' }}</span>
              <span class="preview-status-3d" :class="agent.status">{{ statusText }}</span>
            </div>
          </div>
          
          <div class="preview-stats-3d">
            <div class="preview-stat-3d">
              <span class="stat-label">调用次数</span>
              <span class="stat-value">{{ agent.callCount }}</span>
            </div>
            <div class="preview-stat-3d">
              <span class="stat-label">技能数</span>
              <span class="stat-value">{{ form.capabilities.skillIds.length }}</span>
            </div>
            <div class="preview-stat-3d">
              <span class="stat-label">权限数</span>
              <span class="stat-value">{{ grantedPermissionsCount }}</span>
            </div>
          </div>
        </div>
        
        <div class="test-card-3d">
          <div class="test-header-3d">
            <span>🧪 快速测试</span>
          </div>
          <textarea
            v-model="testMessage"
            rows="4"
            placeholder="输入测试消息..."
            class="test-input-3d"
          />
          <button 
            class="btn-test-3d" 
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
import type { Agent, AgentPermission } from '../../stores/useAgents'
import { LEVEL_CONFIG, PERMISSION_TEMPLATES } from '../../stores/useAgents'

const props = defineProps<{
  agent: Agent
}>()

const emit = defineEmits<{
  back: []
  save: [data: Partial<Agent>]
  delete: [agent: Agent]
}>()

const currentTab = ref('basic')

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

const form = reactive({
  name: props.agent.name,
  avatar: props.agent.avatar,
  description: props.agent.description,
  level: props.agent.level,
  capabilities: {
    mode: props.agent.capabilities?.mode || 'raw',
    skillIds: [...(props.agent.capabilities?.skillIds || [])],
    toolIds: [...(props.agent.capabilities?.toolIds || [])],
    customSystemPrompt: props.agent.capabilities?.customSystemPrompt || ''
  },
  memory: {
    enabled: props.agent.memory?.enabled ?? true,
    content: props.agent.memory?.content || '',
    autoExtract: props.agent.memory?.autoExtract ?? true,
    maxTokens: props.agent.memory?.maxTokens || 2000
  },
  seat: props.agent.seat,
  permissions: JSON.parse(JSON.stringify(props.agent.permissions)) as AgentPermission[]
})

watch(() => props.agent, (newAgent) => {
  form.name = newAgent.name
  form.avatar = newAgent.avatar
  form.description = newAgent.description
  form.level = newAgent.level
  form.capabilities = {
    mode: newAgent.capabilities?.mode || 'raw',
    skillIds: [...(newAgent.capabilities?.skillIds || [])],
    toolIds: [...(newAgent.capabilities?.toolIds || [])],
    customSystemPrompt: newAgent.capabilities?.customSystemPrompt || ''
  }
  form.memory = {
    enabled: newAgent.memory?.enabled ?? true,
    content: newAgent.memory?.content || '',
    autoExtract: newAgent.memory?.autoExtract ?? true,
    maxTokens: newAgent.memory?.maxTokens || 2000
  }
  form.seat = newAgent.seat
  form.permissions = JSON.parse(JSON.stringify(newAgent.permissions))
}, { deep: true })

const avatarOptions = ['🤖', '👩‍💻', '👨‍💻', '🎨', '✍️', '🔬', '📊', '💼', '🎭', '🔮', '👑', '⚡']

const availableSkills = [
  { id: 'write', name: '写作', icon: '✍️', description: '撰写和编辑文章' },
  { id: 'code', name: '编程', icon: '💻', description: '编写和调试代码' },
  { id: 'summarize', name: '总结', icon: '📋', description: '总结长文本内容' },
  { id: 'translate', name: '翻译', icon: '🌐', description: '多语言翻译' },
  { id: 'analyze', name: '分析', icon: '📊', description: '数据分析和可视化' },
  { id: 'search', name: '搜索', icon: '🔍', description: '网络搜索和信息检索' },
]

const permissionTemplates = PERMISSION_TEMPLATES.default

const promptTemplates = [
  { name: '通用助手', content: '你是一个 helpful 的 AI 助手，擅长回答问题、提供建议和协助完成各种任务。' },
  { name: '编程专家', content: '你是一个专业的编程助手，精通多种编程语言，擅长代码审查、调试和优化。' },
  { name: '写作助手', content: '你是一个专业的写作助手，擅长撰写、编辑和润色各种文体的文章。' },
  { name: '数据分析', content: '你是一个数据分析专家，擅长数据清洗、统计分析、可视化和洞察提取。' },
]

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
    form.capabilities.mode !== (props.agent.capabilities?.mode || 'raw') ||
    JSON.stringify(form.capabilities.skillIds) !== JSON.stringify(props.agent.capabilities?.skillIds || []) ||
    JSON.stringify(form.capabilities.toolIds) !== JSON.stringify(props.agent.capabilities?.toolIds || []) ||
    form.capabilities.customSystemPrompt !== (props.agent.capabilities?.customSystemPrompt || '') ||
    form.memory.enabled !== (props.agent.memory?.enabled ?? true) ||
    form.memory.content !== (props.agent.memory?.content || '') ||
    form.memory.autoExtract !== (props.agent.memory?.autoExtract ?? true) ||
    form.memory.maxTokens !== (props.agent.memory?.maxTokens || 2000) ||
    form.seat !== props.agent.seat ||
    JSON.stringify(form.permissions) !== JSON.stringify(props.agent.permissions)
  )
})

const testMessage = ref('')

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
    capabilities: form.capabilities,
    memory: form.memory,
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
  form.capabilities.customSystemPrompt = tpl.content
}

function confirmDelete() {
  if (confirm(`确定要删除 Agent "${props.agent.name}" 吗？此操作无法撤销。`)) {
    emit('delete', props.agent)
  }
}

function sendTest() {
  console.log('Test message:', testMessage.value)
  testMessage.value = ''
}
</script>

<style scoped>
.agent-detail-3d {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
}

/* 3D 顶部栏 */
.detail-header-3d {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.btn-back-3d {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.btn-back-3d:hover {
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  border-color: rgba(179, 168, 184, 0.3);
  color: var(--sr-morandi-blue, #9daab8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(179, 168, 184, 0.15);
}

.btn-back-3d svg {
  width: 18px;
  height: 18px;
}

.header-title-3d {
  display: flex;
  align-items: center;
  gap: 14px;
}

.title-avatar-3d {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8) 0%, var(--sr-accent-star, #b8a090) 100%);
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.3);
  animation: avatar-float 3s ease-in-out infinite;
}

@keyframes avatar-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.title-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--sr-text-primary, #1a1a2e);
}

.title-level-3d {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  background: rgba(184, 160, 144, 0.1);
  border-radius: 20px;
}

.header-actions-3d {
  display: flex;
  gap: 12px;
}

.btn-status-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-status-3d.online {
  color: var(--sr-morandi-green, #a8b3a8);
  background: linear-gradient(145deg, #d1fae5, #a7f3d0);
  box-shadow: 0 4px 12px rgba(168, 179, 168, 0.2);
}

.btn-status-3d.offline {
  color: var(--sr-text-muted, #94a3b8);
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
}

.status-dot-3d {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.btn-save-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8) 0%, var(--sr-accent-star, #b8a090) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(179, 168, 184, 0.35);
}

.btn-save-3d:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(179, 168, 184, 0.45);
}

.btn-save-3d:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 三栏主体 */
.detail-body-3d {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 3D 左侧导航 */
.detail-nav-3d {
  width: 220px;
  padding: 24px;
  border-right: 1px solid rgba(226, 232, 240, 0.8);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  overflow-y: auto;
}

.nav-section-3d {
  margin-bottom: 28px;
}

.nav-title-3d {
  padding: 0 14px;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.nav-item-3d {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 4px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  animation: slide-in-left 0.4s ease backwards;
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.nav-item-3d:hover {
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  color: var(--sr-morandi-blue, #9daab8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.nav-item-3d.active {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8) 0%, var(--sr-accent-star, #b8a090) 100%);
  color: white;
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.3);
}

.nav-icon-3d {
  font-size: 18px;
}

/* 中间内容区 */
.detail-content-3d {
  flex: 1;
  padding: 28px 32px;
  overflow-y: auto;
}

.content-section-3d {
  max-width: 640px;
  animation: fade-in-up 0.4s ease;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-section-3d h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--sr-text-primary, #1a1a2e);
}

.section-desc-3d {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 3D 表单样式 */
.form-group-3d {
  margin-bottom: 24px;
}

.form-group-3d.inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.form-group-3d label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.form-input-3d,
.form-textarea-3d,
.form-select-3d {
  width: 100%;
  padding: 14px 18px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 14px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  color: var(--sr-text-primary, #1a1a2e);
  outline: none;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.form-input-3d:focus,
.form-textarea-3d:focus,
.form-select-3d:focus {
  border-color: var(--sr-morandi-blue, #9daab8);
  box-shadow: 0 0 0 4px rgba(179, 168, 184, 0.1), 0 4px 12px rgba(179, 168, 184, 0.1);
}

.form-textarea-3d {
  resize: vertical;
  min-height: 120px;
}

.form-textarea-3d.code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.7;
}

.form-hint-3d {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

/* 3D 头像网格 */
.avatar-grid-3d {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.avatar-btn-3d {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.avatar-btn-3d:hover {
  border-color: rgba(179, 168, 184, 0.3);
  transform: translateY(-2px) scale(1.1);
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.15);
}

.avatar-btn-3d.active {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8) 0%, var(--sr-accent-star, #b8a090) 100%);
  border-color: transparent;
  transform: scale(1.1);
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.3);
}

/* 3D 提示词模板 */
.prompt-templates-3d {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  border-radius: 16px;
}

.template-label-3d {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  font-weight: 600;
}

.template-btn-3d {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--sr-morandi-blue, #9daab8);
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(179, 168, 184, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-btn-3d:hover {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8) 0%, var(--sr-accent-star, #b8a090) 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(179, 168, 184, 0.25);
}

/* 3D 技能列表 */
.skills-list-3d {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-checkbox-3d {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: fade-in-up 0.4s ease backwards;
}

.skill-checkbox-3d:hover {
  border-color: rgba(179, 168, 184, 0.3);
  transform: translateX(4px);
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.1);
}

.skill-checkbox-3d.checked {
  border-color: rgba(179, 168, 184, 0.5);
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  box-shadow: 0 4px 16px rgba(179, 168, 184, 0.15);
}

.skill-checkbox-3d input {
  display: none;
}

.skill-icon-3d {
  font-size: 28px;
}

.skill-info-3d {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.skill-desc {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 3D Toggle Switch */
.toggle-switch-3d {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle-switch-3d input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider-3d {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
  transition: 0.3s;
  border-radius: 28px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-slider-3d:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

input:checked + .toggle-slider-3d {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8) 0%, var(--sr-accent-star, #b8a090) 100%);
}

input:checked + .toggle-slider-3d:before {
  transform: translateX(24px);
}

/* 3D 权限列表 */
.permissions-list-3d {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.permission-item-3d {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: fade-in-up 0.4s ease backwards;
}

.permission-item-3d:hover {
  border-color: rgba(179, 168, 184, 0.3);
  transform: translateX(4px);
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.1);
}

.permission-item-3d input {
  margin-top: 4px;
  width: 18px;
  height: 18px;
  accent-color: var(--sr-morandi-blue, #9daab8);
}

.permission-info-3d {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.permission-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.permission-desc {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 3D 危险区域 */
.danger-zone-3d {
  padding: 24px;
  background: linear-gradient(145deg, #fef2f2, #fee2e2);
  border: 2px dashed #fca5a5;
  border-radius: 16px;
}

.danger-zone-3d label {
  color: #dc2626;
  margin-bottom: 16px;
  font-weight: 700;
}

.btn-danger-3d {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--sr-morandi-pink, #d4b8b8) 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(212, 184, 184, 0.3);
}

.btn-danger-3d:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(212, 184, 184, 0.4);
}

/* 3D 右侧预览区 */
.detail-preview-3d {
  width: 300px;
  padding: 24px;
  border-left: 1px solid rgba(226, 232, 240, 0.8);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  overflow-y: auto;
}

.preview-card-3d,
.test-card-3d {
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.preview-header-3d,
.test-header-3d {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  font-size: 14px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
}

.preview-agent-3d {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
}

.preview-avatar-3d {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8) 0%, var(--sr-accent-star, #b8a090) 100%);
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.3);
  animation: avatar-float 3s ease-in-out infinite;
}

.preview-info-3d {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.preview-status-3d {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  width: fit-content;
}

.preview-status-3d.online {
  color: var(--sr-morandi-green, #a8b3a8);
  background: linear-gradient(145deg, #d1fae5, #a7f3d0);
}

.preview-status-3d.offline {
  color: var(--sr-text-muted, #94a3b8);
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
}

.preview-stats-3d {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 20px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.preview-stat-3d {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.preview-stat-3d:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.preview-stat-3d .stat-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
}

.preview-stat-3d .stat-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--sr-morandi-blue, #9daab8);
}

/* 3D 测试卡片 */
.test-card-3d {
  padding: 0;
}

.test-header-3d {
  color: var(--sr-accent-star, #b8a090);
}

.test-input-3d {
  width: 100%;
  padding: 16px 20px;
  border: none;
  font-size: 14px;
  background: transparent;
  color: var(--sr-text-primary, #1a1a2e);
  outline: none;
  resize: vertical;
  min-height: 100px;
}

.test-input-3d::placeholder {
  color: #94a3b8;
}

.btn-test-3d {
  width: calc(100% - 40px);
  margin: 0 20px 20px;
  padding: 14px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090) 0%, var(--sr-morandi-purple, #b3a8b8) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(184, 160, 144, 0.3);
}

.btn-test-3d:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(184, 160, 144, 0.4);
}

.btn-test-3d:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 响应式 */
@media (max-width: 1024px) {
  .detail-nav-3d {
    width: 180px;
    padding: 20px 16px;
  }
  
  .detail-preview-3d {
    width: 260px;
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .detail-body-3d {
    flex-direction: column;
  }
  
  .detail-nav-3d {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    display: flex;
    gap: 8px;
    padding: 16px;
  }
  
  .nav-section-3d {
    display: flex;
    margin-bottom: 0;
  }
  
  .nav-title-3d {
    display: none;
  }
  
  .detail-preview-3d {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(226, 232, 240, 0.8);
  }
}
</style>
