<!--
  AgentDetail - Agent 详情弹窗
  
  显示 Agent 的完整信息和操作
-->
<template>
  <Teleport to="body">
    <Transition name="detail-fade">
      <div v-if="visible" class="detail-overlay" @click.self="close">
        <div class="detail-panel" :style="panelStyle">
          <!-- 头部 -->
          <div class="detail-header" :style="headerStyle">
            <div class="header-bg"></div>
            <div class="header-content">
              <div class="detail-avatar">{{ agent.avatar }}</div>
              <div class="header-info">
                <h3 class="detail-name">{{ agent.name }}</h3>
                <div class="detail-badges">
                  <span class="badge level" :style="levelBadgeStyle">
                    {{ levelConfig.icon }} {{ levelConfig.label }}
                  </span>
                  <span class="badge status" :class="agent.status">
                    <span class="status-dot"></span>
                    {{ statusText }}
                  </span>
                  <span v-if="agent.isDefault" class="badge default">⭐ 默认</span>
                </div>
              </div>
            </div>
            <button class="close-btn" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="detail-body">
            <!-- 描述 -->
            <div class="detail-section">
              <h4 class="section-title">📝 描述</h4>
              <p class="detail-desc">{{ agent.description }}</p>
            </div>

            <!-- 座次信息 -->
            <div class="detail-section seat-section">
              <div class="seat-display">
                <div class="seat-number" :style="seatNumberStyle">{{ agent.seat }}</div>
                <div class="seat-label">当前座次</div>
              </div>
              <div class="seat-info">
                <p>座次越小，优先级越高</p>
                <p v-if="levelConfig">{{ levelConfig.label }} 范围: 1-{{ levelConfig.maxSeat }}</p>
              </div>
            </div>

            <!-- 技能列表 -->
            <div class="detail-section">
              <div class="section-header-row">
                <h4 class="section-title">🎯 技能 ({{ agent.skills.length }})</h4>
                <button class="btn-text" @click="showSkillManager = true">管理技能</button>
              </div>
              <div class="skills-list">
                <span 
                  v-for="skillId in agent.skills" 
                  :key="skillId"
                  class="skill-chip"
                >{{ getSkillName(skillId) }}</span>
                <span v-if="agent.skills.length === 0" class="empty-hint">暂无技能</span>
              </div>
            </div>

            <!-- 权限列表 -->
            <div class="detail-section">
              <div class="section-header-row">
                <h4 class="section-title">🔒 权限 ({{ grantedCount }}/{{ agent.permissions.length }})</h4>
              </div>
              <div class="permissions-grid">
                <div 
                  v-for="perm in agent.permissions" 
                  :key="perm.id"
                  class="permission-item"
                  :class="{ granted: perm.granted }"
                >
                  <div class="permission-check">
                    <svg v-if="perm.granted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </div>
                  <div class="permission-info">
                    <span class="permission-name">{{ perm.name }}</span>
                    <span class="permission-desc">{{ perm.description }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 系统提示词 -->
            <div class="detail-section">
              <h4 class="section-title">⚙️ 系统提示词</h4>
              <div class="prompt-preview">
                <pre>{{ agent.systemPrompt || '使用默认系统提示词' }}</pre>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="detail-section stats-section">
              <h4 class="section-title">📊 统计</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-value">{{ agent.callCount }}</span>
                  <span class="stat-label">调用次数</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ formatDate(agent.createdAt) }}</span>
                  <span class="stat-label">创建时间</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ formatDate(agent.updatedAt) }}</span>
                  <span class="stat-label">更新时间</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="detail-footer">
            <button class="btn-secondary" @click="close">关闭</button>
            <div class="footer-actions">
              <button 
                v-if="!agent.isDefault"
                class="btn-secondary" 
                @click="$emit('edit', agent)"
              >
                编辑
              </button>
              <button 
                class="btn-primary"
                :class="{ active: isCurrent }"
                :disabled="isCurrent"
                @click="activate"
              >
                {{ isCurrent ? '当前使用中' : '激活使用' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LEVEL_CONFIG, type Agent } from '../../../core/composables/useAgents'

const props = defineProps<{
  agent: Agent
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  activate: [agent: Agent]
  edit: [agent: Agent]
}>()

const showSkillManager = ref(false)

// 等级配置
const levelConfig = computed(() => LEVEL_CONFIG[props.agent.level])

// 是否当前激活
const isCurrent = computed(() => {
  const activeId = localStorage.getItem('ai-active-agent-id')
  return activeId === props.agent.id || (!activeId && props.agent.isDefault)
})

// 状态文本
const statusText = computed(() => {
  const map = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    idle: '空闲'
  }
  return map[props.agent.status]
})

// 已授权权限数
const grantedCount = computed(() => 
  props.agent.permissions.filter(p => p.granted).length
)

// 面板样式
const panelStyle = computed(() => ({
  '--level-color': levelConfig.value.color
}))

const headerStyle = computed(() => ({
  background: `linear-gradient(135deg, ${levelConfig.value.color}15, ${levelConfig.value.color}05)`
}))

const levelBadgeStyle = computed(() => ({
  background: levelConfig.value.color,
  color: 'white'
}))

const seatNumberStyle = computed(() => ({
  background: `linear-gradient(135deg, ${levelConfig.value.color}, ${levelConfig.value.color}80)`,
  color: 'white'
}))

function close() {
  emit('close')
}

function activate() {
  emit('activate', props.agent)
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
}

// 技能名称映射
const skillNames: Record<string, string> = {
  write: '写作助手',
  code: '代码生成',
  summarize: '文章总结',
  translate: '中英翻译',
  polish: '润色优化',
  review: '代码审查',
  explain: '概念解释',
  brainstorm: '头脑风暴'
}

function getSkillName(id: string): string {
  return skillNames[id] || id
}
</script>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
}

.detail-panel {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

/* 头部 */
.detail-header {
  position: relative;
  padding: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-bg {
  position: absolute;
  inset: 0;
  opacity: 0.5;
}

.header-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-avatar {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-info {
  flex: 1;
}

.detail-name {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}

.badge.status {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
}

.badge.status.online {
  background: #dcfce7;
  color: #166534;
}

.badge.status.busy {
  background: #fef3c7;
  color: #92400e;
}

.badge.status.offline {
  background: #f3f4f6;
  color: #6b7280;
}

.badge.default {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 10px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* 内容区 */
.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.detail-desc {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

/* 座次显示 */
.seat-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
}

.seat-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.seat-number {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  border-radius: 12px;
}

.seat-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.seat-info {
  flex: 1;
}

.seat-info p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* 技能列表 */
.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-chip {
  padding: 6px 14px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-size: 13px;
  font-weight: 500;
  border-radius: 100px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.empty-hint {
  color: var(--vp-c-text-3);
  font-style: italic;
  font-size: 13px;
}

/* 权限网格 */
.permissions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  opacity: 0.6;
}

.permission-item.granted {
  background: rgba(34, 197, 94, 0.08);
  opacity: 1;
}

.permission-check {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.permission-item.granted .permission-check {
  color: #22c55e;
}

.permission-item:not(.granted) .permission-check {
  color: #9ca3af;
}

.permission-check svg {
  width: 12px;
  height: 12px;
}

.permission-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.permission-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.permission-desc {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

/* 提示词预览 */
.prompt-preview {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  padding: 12px 16px;
}

.prompt-preview pre {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.stat-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

/* 底部 */
.detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--vp-c-text-1);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

.btn-primary {
  padding: 10px 24px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-primary.active {
  background: linear-gradient(135deg, #22c55e, #10b981);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btn-text {
  padding: 4px 10px;
  background: transparent;
  color: #3b82f6;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-text:hover {
  text-decoration: underline;
}

/* 动画 */
.detail-fade-enter-active,
.detail-fade-leave-active {
  transition: all 0.3s ease;
}

.detail-fade-enter-from,
.detail-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 深色模式 */
.dark .detail-panel {
  background: rgba(30, 30, 40, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .detail-avatar {
  background: rgba(255, 255, 255, 0.1);
}

.dark .seat-section,
.dark .prompt-preview,
.dark .stat-item,
.dark .permission-item {
  background: rgba(255, 255, 255, 0.05);
}

.dark .detail-footer {
  background: rgba(255, 255, 255, 0.05);
}

.dark .btn-secondary {
  background: rgba(255, 255, 255, 0.1);
}
</style>
