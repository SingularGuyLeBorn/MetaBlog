<!--
  AgentCard - 3D 液态玻璃风格
  
  视觉效果：
  - 3D 透视倾斜
  - 鼠标跟随光影
  - 悬浮深度感
  - 全息边框
-->
<template>
  <div 
    class="agent-card-3d"
    :class="{ 
      'is-active': isActive,
      'is-offline': agent.status === 'offline'
    }"
    @click="$emit('click', agent)"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- 3D 内部容器 -->
    <div 
      class="card-inner"
      :style="transformStyle"
    >
      <!-- 全息边框 -->
      <div class="holo-border"></div>
      
      <!-- 动态光斑 -->
      <div class="light-spot" :style="lightSpotStyle"></div>
      
      <!-- 状态条 -->
      <div class="status-bar" :class="agent.status"></div>
      
      <!-- 头部 -->
      <div class="card-header">
        <div class="avatar-wrap">
          <div class="avatar-ring" :style="ringStyle"></div>
          <span class="avatar">{{ agent.avatar }}</span>
          <span class="status-dot" :class="agent.status"></span>
        </div>
        
        <div class="header-info">
          <h4 class="agent-name">{{ agent.name }}</h4>
          <span class="agent-level" :style="levelStyle">{{ levelLabel }}</span>
        </div>
        
        <div v-if="agent.isDefault" class="default-badge">默认</div>
      </div>
      
      <!-- 描述 -->
      <p class="agent-desc">{{ agent.description || '暂无描述' }}</p>
      
      <!-- 技能 -->
      <div class="skills-wrap">
        <span 
          v-for="skill in displayedSkills" 
          :key="skill"
          class="skill-pill"
        >{{ skill }}</span>
        <span v-if="remainingSkills > 0" class="skill-more">+{{ remainingSkills }}</span>
      </div>
      
      <!-- 统计 -->
      <div class="stats-box">
        <div class="stat" v-for="s in stats" :key="s.label">
          <span class="stat-val">{{ s.value }}</span>
          <span class="stat-lbl">{{ s.label }}</span>
        </div>
      </div>
      
      <!-- 操作栏 -->
      <div class="action-bar">
        <button 
          class="btn-toggle"
          :class="agent.status"
          @click.stop="$emit('toggle-status', agent)"
        >
          <span class="dot"></span>
          {{ statusText }}
        </button>
        
        <div class="btn-group">
          <button class="btn-icon" @click.stop="$emit('edit', agent)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          
          <button 
            v-if="!agent.isDefault"
            class="btn-icon delete"
            @click.stop="$emit('delete', agent)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 3D 阴影层 -->
    <div class="shadow-layer" :style="shadowStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Agent } from '../../../core/composables/useAgents'
import { LEVEL_CONFIG } from '../../../core/composables/useAgents'
import { useSkills } from '../../../core/composables'

const props = defineProps<{
  agent: Agent
  isActive: boolean
}>()

const emit = defineEmits<{
  click: [agent: Agent]
  edit: [agent: Agent]
  delete: [agent: Agent]
  'toggle-status': [agent: Agent]
}>()

// 3D 变换状态
const rotateX = ref(0)
const rotateY = ref(0)
const lightX = ref(50)
const lightY = ref(50)

// 鼠标移动 - 3D 倾斜
function handleMouseMove(e: MouseEvent) {
  const card = e.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  rotateY.value = ((x - centerX) / centerX) * 8
  rotateX.value = -((y - centerY) / centerY) * 8
  
  lightX.value = (x / rect.width) * 100
  lightY.value = (y / rect.height) * 100
}

// 鼠标离开 - 复位
function handleMouseLeave() {
  rotateX.value = 0
  rotateY.value = 0
  lightX.value = 50
  lightY.value = 50
}

// 3D 变换样式
const transformStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg) scale3d(1, 1, 1)`,
  transition: rotateX.value === 0 ? 'transform 0.5s ease' : 'transform 0.1s ease-out'
}))

// 光斑位置
const lightSpotStyle = computed(() => ({
  background: `radial-gradient(circle at ${lightX.value}% ${lightY.value}%, rgba(255,255,255,0.4) 0%, transparent 50%)`
}))

// 阴影偏移
const shadowStyle = computed(() => ({
  transform: `translate(${rotateY.value * 0.5}px, ${-rotateX.value * 0.5}px)`,
  opacity: Math.abs(rotateX.value) + Math.abs(rotateY.value) > 0 ? 0.6 : 0.4
}))

// 等级配置
const levelConfig = computed(() => LEVEL_CONFIG[props.agent.level] || LEVEL_CONFIG.custom)
const levelLabel = computed(() => levelConfig.value.label)
const levelStyle = computed(() => ({
  background: `linear-gradient(135deg, ${levelConfig.value.color}20, ${levelConfig.value.color}10)`,
  color: levelConfig.value.color,
  borderColor: `${levelConfig.value.color}40`
}))

// 头像光环
const ringStyle = computed(() => ({
  boxShadow: `0 0 20px ${levelConfig.value.color}60, inset 0 0 10px ${levelConfig.value.color}30`
}))

// 状态文本
const statusText = computed(() => {
  const map: Record<string, string> = { online: '在线', offline: '离线', busy: '忙碌', idle: '空闲' }
  return map[props.agent.status] || props.agent.status
})

// 技能显示
const { getSkillById } = useSkills()
const maxSkills = 3
const skillIds = computed(() => props.agent.capabilities?.skillIds || [])
const displayedSkills = computed(() => 
  skillIds.value.slice(0, maxSkills).map(id => getSkillById(id)?.name || id)
)
const remainingSkills = computed(() => Math.max(0, skillIds.value.length - maxSkills))

// 统计数据
const stats = computed(() => [
  { value: formatNumber(props.agent.callCount || 0), label: '调用' },
  { value: skillIds.value.length, label: '技能' },
  { value: (props.agent.permissions || []).filter(p => p.granted).length, label: '权限' }
])

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}
</script>

<style scoped>
.agent-card-3d {
  position: relative;
  perspective: 1000px;
  transform-style: preserve-3d;
}

.card-inner {
  position: relative;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
  border-radius: 20px;
  padding: 24px;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 8px rgba(0, 0, 0, 0.02),
    0 8px 16px rgba(0, 0, 0, 0.02),
    0 16px 32px rgba(0, 0, 0, 0.03);
}

/* 全息边框 */
.holo-border {
  position: absolute;
  inset: -1px;
  border-radius: 21px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.4) 0%,
    rgba(139, 92, 246, 0.3) 25%,
    rgba(236, 72, 153, 0.2) 50%,
    rgba(139, 92, 246, 0.3) 75%,
    rgba(59, 130, 246, 0.4) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.agent-card-3d:hover .holo-border {
  opacity: 1;
  animation: holo-rotate 3s linear infinite;
}

@keyframes holo-rotate {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

/* 动态光斑 */
.light-spot {
  position: absolute;
  inset: 0;
  border-radius: 20px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.agent-card-3d:hover .light-spot {
  opacity: 1;
}

/* 3D 阴影层 */
.shadow-layer {
  position: absolute;
  inset: 10px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 20px;
  filter: blur(30px);
  opacity: 0.3;
  transform: translateZ(-50px);
  transition: all 0.3s ease;
  z-index: -1;
}

/* 状态条 */
.status-bar {
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  transform: translateZ(10px);
}

.status-bar.online { background: linear-gradient(90deg, #22c55e, #4ade80); box-shadow: 0 0 10px #22c55e60; }
.status-bar.offline { background: linear-gradient(90deg, #9ca3af, #d1d5db); }
.status-bar.busy { background: linear-gradient(90deg, #f59e0b, #fbbf24); box-shadow: 0 0 10px #f59e0b60; }
.status-bar.idle { background: linear-gradient(90deg, #3b82f6, #60a5fa); box-shadow: 0 0 10px #3b82f660; }

/* 头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  transform: translateZ(20px);
}

/* 头像 */
.avatar-wrap {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
}

.avatar-ring {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(145deg, #f0f9ff, #e0f2fe);
  transform: translateZ(-5px);
  transition: transform 0.3s ease;
}

.agent-card-3d:hover .avatar-ring {
  transform: translateZ(-8px) scale(1.05);
}

.avatar {
  font-size: 28px;
  transform: translateZ(10px);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid white;
  transform: translateZ(15px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.status-dot.online { background: #22c55e; }
.status-dot.offline { background: #9ca3af; }
.status-dot.busy { background: #f59e0b; }
.status-dot.idle { background: #3b82f6; }

/* 标题信息 */
.header-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  margin: 0 0 4px 0;
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: translateZ(15px);
}

.agent-level {
  display: inline-block;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid;
  transform: translateZ(12px);
}

/* 默认标识 */
.default-badge {
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 700;
  color: #3b82f6;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  border-radius: 20px;
  border: 1px solid #93c5fd;
  transform: translateZ(15px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

/* 描述 */
.agent-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transform: translateZ(10px);
}

/* 技能 */
.skills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  transform: translateZ(18px);
}

.skill-pill {
  padding: 5px 12px;
  font-size: 12px;
  color: #475569;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border-radius: 20px;
  border: 1px solid #cbd5e1;
  transition: all 0.2s ease;
}

.skill-pill:hover {
  transform: translateZ(5px) scale(1.05);
  background: linear-gradient(145deg, #e0f2fe, #dbeafe);
  border-color: #93c5fd;
}

.skill-more {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  border-radius: 20px;
  border: 1px solid #93c5fd;
}

/* 统计 */
.stats-box {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  border-radius: 16px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
  transform: translateZ(15px);
  transform-style: preserve-3d;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transform: translateZ(5px);
}

.stat-val {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.stat-lbl {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  transform: translateZ(25px);
}

.btn-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  transform-style: preserve-3d;
}

.btn-toggle.online {
  color: #166534;
  background: linear-gradient(145deg, #bbf7d0, #86efac);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btn-toggle.offline {
  color: #4b5563;
  background: linear-gradient(145deg, #f3f4f6, #e5e7eb);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-toggle .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #ffffff, #f1f5f9);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  transform: translateZ(5px);
}

.btn-icon:hover {
  transform: translateZ(10px) scale(1.1);
  color: #3b82f6;
  border-color: #93c5fd;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.btn-icon.delete:hover {
  color: #ef4444;
  border-color: #fca5a5;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

/* 激活状态 */
.agent-card-3d.is-active .card-inner {
  border-color: #3b82f6;
  box-shadow: 
    0 0 0 2px rgba(59, 130, 246, 0.2),
    0 8px 32px rgba(59, 130, 246, 0.2);
}

.agent-card-3d.is-offline {
  opacity: 0.85;
}

.agent-card-3d.is-offline .card-inner {
  background: linear-gradient(145deg, #f9fafb, #f3f4f6);
}
</style>
