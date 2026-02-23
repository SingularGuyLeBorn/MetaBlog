<!--
  CapabilityGraph - 能力图谱可视化（简化稳定版）
  
  设计原则：
  - 纯HTML/CSS布局，不使用SVG transform
  - 无鼠标跟踪，避免闪烁
  - 静态展示 + 简单的呼吸动画
  - 清晰的层级关系展示
-->
<template>
  <div class="capability-graph">
    <!-- 中央 Agent -->
    <div class="graph-center">
      <div class="center-node">
        <div class="center-glow"></div>
        <div class="center-icon">🤖</div>
        <div class="center-label">Agent</div>
      </div>
    </div>
    
    <!-- 技能层 -->
    <div class="skills-layer">
      <div 
        v-for="(skill, index) in skillNodes" 
        :key="skill.id"
        class="skill-node"
        :class="`skill-${index}`"
        :style="getSkillPosition(index, skillNodes.length)"
      >
        <div class="node-connector"></div>
        <div class="node-content" :class="`cat-${index % 5}`">
          <span class="node-icon">{{ skill.icon }}</span>
          <span class="node-name">{{ truncateName(skill.name, 6) }}</span>
        </div>
        
        <!-- 该技能下的工具 -->
        <div class="tools-cluster">
          <div 
            v-for="(tool, tIndex) in skill.tools.slice(0, 3)" 
            :key="tool"
            class="tool-chip"
            :style="getToolPosition(tIndex, Math.min(skill.tools.length, 3))"
          >
            {{ truncateName(tool, 8) }}
          </div>
          <div v-if="skill.tools.length > 3" class="tool-more">
            +{{ skill.tools.length - 3 }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 额外工具层（混合模式） -->
    <div v-if="extraToolNodes.length > 0" class="extras-layer">
      <div class="extras-label">额外工具</div>
      <div class="extras-row">
        <div 
          v-for="tool in extraToolNodes.slice(0, 5)" 
          :key="tool.id"
          class="extra-chip"
        >
          <span class="extra-icon">{{ tool.icon || '🔧' }}</span>
          <span>{{ truncateName(tool.name, 10) }}</span>
        </div>
        <div v-if="extraToolNodes.length > 5" class="extra-more">
          +{{ extraToolNodes.length - 5 }}
        </div>
      </div>
    </div>
    
    <!-- 图例 -->
    <div class="graph-legend">
      <div class="legend-item">
        <span class="legend-dot skill"></span>
        <span>技能</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot tool"></span>
        <span>工具</span>
      </div>
      <div class="legend-item" v-if="extraToolNodes.length > 0">
        <span class="legend-dot extra"></span>
        <span>额外</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CapabilityGraph, CapabilityNode } from '../../../core/types/agent'

const props = defineProps<{
  graph: CapabilityGraph
}>()

// 分类节点（Agent）
const rootNode = computed(() => props.graph.nodes.find(n => n.type === 'root'))

// 技能节点
const skillNodes = computed(() => {
  const skills = props.graph.nodes.filter(n => n.type === 'skill')
  return skills.map(skill => ({
    ...skill,
    tools: props.graph.nodes
      .filter(n => n.type === 'tool' && n.parentId === skill.id)
      .map(t => t.name)
  }))
})

// 额外工具节点（没有父技能）
const extraToolNodes = computed(() => 
  props.graph.nodes.filter(n => n.type === 'tool' && n.isExtra)
)

// 计算技能节点位置（弧形布局）
function getSkillPosition(index: number, total: number) {
  if (total <= 1) return { left: '50%', top: '30%', transform: 'translateX(-50%)' }
  
  // 弧形布局：从左到右均匀分布
  const angleStep = 120 / (total - 1) // 120度扇形
  const startAngle = -60 // 从左上开始
  const angle = startAngle + index * angleStep
  const radius = 35 // 距离中心的百分比
  
  // 转换为 Cartesian 坐标
  const rad = (angle * Math.PI) / 180
  const x = 50 + radius * Math.sin(rad)
  const y = 30 + radius * Math.cos(rad) * 0.6 // 压扁一点，更美观
  
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)'
  }
}

// 计算工具位置（围绕技能节点）
function getToolPosition(index: number, total: number) {
  const positions = [
    { top: '100%', left: '0%', marginTop: '8px' },
    { top: '100%', left: '50%', marginTop: '8px', transform: 'translateX(-50%)' },
    { top: '100%', left: '100%', marginTop: '8px', transform: 'translateX(-100%)' },
  ]
  return positions[index] || positions[0]
}

// 截断名称
function truncateName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen) + '...'
}
</script>

<style scoped>
.capability-graph {
  position: relative;
  width: 100%;
  height: 320px;
  background: linear-gradient(180deg, 
    rgba(248, 250, 252, 0) 0%, 
    rgba(241, 245, 249, 0.5) 50%,
    rgba(248, 250, 252, 0) 100%
  );
  border-radius: 16px;
  overflow: hidden;
}

/* 中央 Agent */
.graph-center {
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.center-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.center-glow {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%);
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.center-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #3b82f6, #1d4ed8);
  border-radius: 50%;
  font-size: 28px;
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
  position: relative;
  z-index: 2;
}

.center-label {
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
}

/* 技能层 */
.skills-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.skill-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
}

.node-connector {
  position: absolute;
  top: -20px;
  width: 2px;
  height: 20px;
  background: linear-gradient(180deg, #3b82f6, transparent);
  opacity: 0.3;
}

.node-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: white;
  border-radius: 16px;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  min-width: 80px;
}

.node-content:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.08);
}

.node-content.cat-0 { border-color: #94a3b8; }
.node-content.cat-1 { border-color: #fbbf24; }
.node-content.cat-2 { border-color: #60a5fa; }
.node-content.cat-3 { border-color: #34d399; }
.node-content.cat-4 { border-color: #f472b6; }

.node-icon {
  font-size: 24px;
}

.node-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

/* 工具簇 */
.tools-cluster {
  position: relative;
  width: 100%;
  height: 40px;
  margin-top: 4px;
}

.tool-chip {
  position: absolute;
  padding: 4px 10px;
  background: linear-gradient(145deg, #dcfce7, #bbf7d0);
  border-radius: 12px;
  font-size: 10px;
  color: #166534;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #86efac;
}

.tool-more {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 10px;
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
}

/* 额外工具层 */
.extras-layer {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.extras-label {
  font-size: 11px;
  font-weight: 600;
  color: #f59e0b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(245, 158, 11, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
}

.extras-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 500px;
}

.extra-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(145deg, #fef3c7, #fde68a);
  border-radius: 20px;
  font-size: 12px;
  color: #92400e;
  font-weight: 500;
  border: 1px solid #fcd34d;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.extra-icon {
  font-size: 14px;
}

.extra-more {
  padding: 6px 14px;
  background: #f1f5f9;
  border-radius: 20px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

/* 图例 */
.graph-legend {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.skill {
  background: #3b82f6;
  box-shadow: 0 0 6px #3b82f6;
}

.legend-dot.tool {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.legend-dot.extra {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b;
}

/* 响应式 */
@media (max-width: 640px) {
  .capability-graph {
    height: 280px;
  }
  
  .node-content {
    padding: 8px 12px;
    min-width: 60px;
  }
  
  .node-icon {
    font-size: 20px;
  }
  
  .node-name {
    font-size: 10px;
  }
  
  .graph-legend {
    display: none;
  }
}
</style>
