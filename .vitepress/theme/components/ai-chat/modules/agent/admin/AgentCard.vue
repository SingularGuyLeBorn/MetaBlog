<!--
  AgentCard - Agent 卡片组件
  
  液态玻璃风格，显示 Agent 的核心信息
-->
<template>
  <div 
    class="agent-card"
    :class="[ 
      `level-${agent.level}`,
      { 'is-active': isActive, 'is-default': agent.isDefault, 'is-dragging': isDragging }
    ]"
    :style="cardStyle"
    @click="$emit('click', agent)"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 座次标识 -->
    <div class="seat-badge" :style="seatStyle">
      <span class="seat-number">{{ agent.seat }}</span>
      <span class="seat-label">座</span>
    </div>
    
    <!-- 等级标识 -->
    <div class="level-badge" :style="levelStyle">
      <span class="level-icon">{{ levelConfig.icon }}</span>
      <span class="level-name">{{ levelConfig.label }}</span>
    </div>
    
    <!-- 状态指示器 -->
    <div class="status-indicator" :class="agent.status">
      <span class="status-dot"></span>
      <span class="status-name">{{ statusText }}</span>
    </div>
    
    <!-- 主要内容 -->
    <div class="card-content">
      <div class="avatar-section">
        <div class="avatar" :style="avatarStyle">
          {{ agent.avatar }}
        </div>
        <div v-if="agent.isDefault" class="default-badge">默认</div>
      </div>
      
      <div class="info-section">
        <h4 class="agent-name">{{ agent.name }}</h4>
        <p class="agent-desc">{{ agent.description }}</p>
        
        <!-- 技能标签 -->
        <div class="skills-preview">
          <span 
            v-for="skillId in displayedSkills" 
            :key="skillId"
            class="skill-tag"
          >{{ getSkillName(skillId) }}</span>
          <span v-if="remainingSkills > 0" class="skill-more">+{{ remainingSkills }}</span>
        </div>
      </div>
    </div>
    
    <!-- 底部信息栏 -->
    <div class="card-footer">
      <div class="footer-stat">
        <span class="stat-icon">📞</span>
        <span class="stat-value">{{ formatNumber(agent.callCount) }}</span>
      </div>
      <div class="footer-stat">
        <span class="stat-icon">🎯</span>
        <span class="stat-value">{{ agent.skills.length }}</span>
      </div>
      <div class="footer-stat">
        <span class="stat-icon">🔒</span>
        <span class="stat-value">{{ grantedPermissions }}</span>
      </div>
      <div class="footer-stat" :title="lastActiveText">
        <span class="stat-icon">⏱️</span>
        <span class="stat-value">{{ timeAgo }}</span>
      </div>
    </div>
    
    <!-- 悬停操作按钮 -->
    <Transition name="fade">
      <div v-if="isHovered && !agent.isDefault" class="card-actions">
        <button class="action-btn edit" @click.stop="$emit('edit', agent)" title="编辑">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="action-btn delete" @click.stop="$emit('delete', agent)" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </Transition>
    
    <!-- 激活指示器 -->
    <div v-if="isActive" class="active-indicator">
      <div class="active-pulse"></div>
      <span>当前使用</span>
    </div>
    
    <!-- 边框光效 -->
    <div class="glow-border" :style="glowStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Agent, AgentLevel, AgentStatus } from '../../../core/composables/useAgents'
import { LEVEL_CONFIG } from '../../../core/composables/useAgents'

const props = defineProps<{
  agent: Agent
  isActive: boolean
  isDragging?: boolean
}>()

defineEmits<{
  click: [agent: Agent]
  edit: [agent: Agent]
  delete: [agent: Agent]
}>()

const isHovered = ref(false)

// 等级配置
const levelConfig = computed(() => LEVEL_CONFIG[props.agent.level])

// 状态文本
const statusText = computed(() => {
  const map: Record<AgentStatus, string> = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    idle: '空闲'
  }
  return map[props.agent.status]
})

// 卡片样式
const cardStyle = computed(() => ({
  '--level-color': levelConfig.value.color,
  '--glow-opacity': isHovered.value ? '0.6' : '0.2'
}))

// 座次样式
const seatStyle = computed(() => ({
  background: `linear-gradient(135deg, ${levelConfig.value.color}20, ${levelConfig.value.color}40)`,
  borderColor: levelConfig.value.color
}))

// 等级样式
const levelStyle = computed(() => ({
  background: levelConfig.value.color,
  color: '#fff'
}))

// 头像样式
const avatarStyle = computed(() => ({
  background: `linear-gradient(135deg, ${levelConfig.value.color}30, ${levelConfig.value.color}10)`,
  borderColor: `${levelConfig.value.color}50`
}))

// 光效样式
const glowStyle = computed(() => ({
  boxShadow: `0 0 30px ${levelConfig.value.color}${isHovered.value ? '60' : '20'}`
}))

// 显示的技能（最多3个）
const displayedSkills = computed(() => props.agent.skills.slice(0, 3))
const remainingSkills = computed(() => Math.max(0, props.agent.skills.length - 3))

// 已授权权限数量
const grantedPermissions = computed(() => 
  props.agent.permissions.filter(p => p.granted).length
)

// 时间格式化
function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

// 相对时间
const timeAgo = computed(() => {
  const diff = Date.now() - props.agent.lastActiveAt
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return '很久以前'
})

const lastActiveText = computed(() => {
  const date = new Date(props.agent.lastActiveAt)
  return `最后活跃: ${date.toLocaleString()}`
})

// 技能名称映射（简化版）
const skillNames: Record<string, string> = {
  write: '写作',
  code: '代码',
  summarize: '总结',
  translate: '翻译',
  polish: '润色',
  review: '审查'
}

function getSkillName(id: string): string {
  return skillNames[id] || id
}
</script>

<style scoped>
.agent-card {
  position: relative;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

.agent-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.08),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.agent-card.is-active {
  border-color: var(--level-color);
  background: rgba(255, 255, 255, 0.85);
}

.agent-card.is-default {
  border-width: 2px;
}

/* 座次标识 */
.seat-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 600;
  color: var(--level-color);
}

.seat-number {
  font-size: 14px;
}

.seat-label {
  font-size: 10px;
  opacity: 0.8;
}

/* 等级标识 */
.level-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.level-icon {
  font-size: 12px;
}

/* 状态指示器 */
.status-indicator {
  position: absolute;
  top: 44px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
}

.status-indicator.online .status-dot {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.status-indicator.busy .status-dot {
  background: #f59e0b;
  animation: pulse 2s infinite;
}

.status-indicator.offline .status-dot {
  background: #6b7280;
}

.status-indicator.idle .status-dot {
  background: #3b82f6;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 卡片内容 */
.card-content {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  margin-bottom: 16px;
}

.avatar-section {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  border-radius: 16px;
  border: 2px solid;
  transition: all 0.3s;
}

.agent-card:hover .avatar {
  transform: scale(1.1) rotate(-5deg);
}

.default-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  padding: 2px 6px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  font-size: 9px;
  font-weight: 700;
  border-radius: 100px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.info-section {
  flex: 1;
  min-width: 0;
}

.agent-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-desc {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 技能标签 */
.skills-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.skill-tag {
  padding: 2px 8px;
  background: rgba(var(--level-color-rgb, 59, 130, 246), 0.1);
  color: var(--level-color, #3b82f6);
  font-size: 10px;
  font-weight: 500;
  border-radius: 100px;
  border: 1px solid rgba(var(--level-color-rgb, 59, 130, 246), 0.2);
}

.skill-more {
  padding: 2px 8px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  font-size: 10px;
  border-radius: 100px;
}

/* 底部统计 */
.card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.footer-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.stat-icon {
  font-size: 12px;
  opacity: 0.7;
}

.stat-value {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* 悬停操作按钮 */
.card-actions {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

.action-btn.edit {
  color: #3b82f6;
}

.action-btn.edit:hover {
  background: #3b82f6;
  color: white;
  transform: scale(1.1);
}

.action-btn.delete {
  color: #ef4444;
}

.action-btn.delete:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.1);
}

/* 激活指示器 */
.active-indicator {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: linear-gradient(135deg, var(--level-color), var(--level-color));
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.active-pulse {
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

/* 光效边框 */
.glow-border {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  pointer-events: none;
  opacity: var(--glow-opacity, 0.2);
  transition: opacity 0.3s;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* 深色模式适配 */
.dark .agent-card {
  background: rgba(30, 30, 40, 0.7);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.2),
    0 2px 4px -1px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.dark .agent-card:hover {
  background: rgba(40, 40, 55, 0.8);
}

.dark .card-footer {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.dark .action-btn {
  background: rgba(50, 50, 65, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}
</style>
