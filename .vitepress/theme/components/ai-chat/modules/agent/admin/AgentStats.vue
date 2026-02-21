<!--
  AgentStats - Agent 统计面板
-->
<template>
  <Teleport to="body">
    <Transition name="stats-fade">
      <div v-if="visible" class="stats-overlay" @click.self="close">
        <div class="stats-panel">
          <div class="stats-header">
            <h3>📊 Agent 统计</h3>
            <button class="close-btn" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="stats-body">
            <!-- 总览卡片 -->
            <div class="overview-cards">
              <div class="overview-card total">
                <div class="card-icon">🤖</div>
                <div class="card-data">
                  <span class="card-value">{{ stats.total }}</span>
                  <span class="card-label">Agent 总数</span>
                </div>
              </div>
              <div class="overview-card online">
                <div class="card-icon" style="background: linear-gradient(135deg, #22c55e, #10b981)">🟢</div>
                <div class="card-data">
                  <span class="card-value">{{ stats.online }}</span>
                  <span class="card-label">在线数量</span>
                </div>
              </div>
              <div class="overview-card calls">
                <div class="card-icon" style="background: linear-gradient(135deg, #f59e0b, #f97316)">📞</div>
                <div class="card-data">
                  <span class="card-value">{{ formatNumber(stats.totalCalls) }}</span>
                  <span class="card-label">总调用次数</span>
                </div>
              </div>
            </div>

            <!-- 等级分布 -->
            <div class="stats-section">
              <h4 class="section-title">等级分布</h4>
              <div class="level-distribution">
                <div 
                  v-for="(count, level) in stats.byLevel" 
                  :key="level"
                  class="level-bar"
                >
                  <div class="bar-header">
                    <span class="bar-icon">{{ LEVEL_CONFIG[level as AgentLevel].icon }}</span>
                    <span class="bar-name">{{ LEVEL_CONFIG[level as AgentLevel].label }}</span>
                    <span class="bar-count">{{ count }}</span>
                  </div>
                  <div class="bar-track">
                    <div 
                      class="bar-fill"
                      :style="{ 
                        width: `${stats.total > 0 ? (count / stats.total * 100) : 0}%`,
                        background: LEVEL_CONFIG[level as AgentLevel].color
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 活跃度排行 -->
            <div class="stats-section">
              <h4 class="section-title">活跃度排行 TOP 5</h4>
              <div class="activity-ranking">
                <div 
                  v-for="(agent, index) in topAgents" 
                  :key="agent.id"
                  class="ranking-item"
                >
                  <div class="rank-number" :class="{ top: index < 3 }">{{ index + 1 }}</div>
                  <div class="rank-avatar">{{ agent.avatar }}</div>
                  <div class="rank-info">
                    <span class="rank-name">{{ agent.name }}</span>
                    <span class="rank-level">{{ LEVEL_CONFIG[agent.level].label }}</span>
                  </div>
                  <div class="rank-calls">
                    <span class="calls-value">{{ agent.callCount }}</span>
                    <span class="calls-label">次调用</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LEVEL_CONFIG, type AgentLevel } from '../../../core/composables/useAgents'

interface Stats {
  total: number
  byLevel: Record<AgentLevel, number>
  online: number
  totalCalls: number
}

const props = defineProps<{
  visible: boolean
  stats: Stats
}>()

const emit = defineEmits<{
  close: []
}>()

function close() {
  emit('close')
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

// 模拟 Top Agents（实际应该从 agents 数组计算）
const topAgents = computed(() => [
  { id: '1', name: 'Meta 助手', avatar: '🤖', level: 'meta' as AgentLevel, callCount: 1256 },
  { id: '2', name: '写作助手', avatar: '✍️', level: 'fixed' as AgentLevel, callCount: 892 },
  { id: '3', name: '代码生成', avatar: '💻', level: 'fixed' as AgentLevel, callCount: 745 },
  { id: '4', name: '文章总结', avatar: '📋', level: 'custom' as AgentLevel, callCount: 423 },
  { id: '5', name: '中英翻译', avatar: '🌐', level: 'custom' as AgentLevel, callCount: 312 }
])
</script>

<style scoped>
.stats-overlay {
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

.stats-panel {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.stats-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.close-btn {
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
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.stats-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 总览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.card-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 12px;
}

.card-data {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.card-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

/* 统计区块 */
.stats-section {
  margin-bottom: 24px;
}

.stats-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* 等级分布 */
.level-distribution {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.level-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.bar-icon {
  font-size: 14px;
}

.bar-name {
  flex: 1;
  color: var(--vp-c-text-1);
}

.bar-count {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.bar-track {
  height: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* 活跃度排行 */
.activity-ranking {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  transition: all 0.2s;
}

.ranking-item:hover {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.rank-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-2);
}

.rank-number.top {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
}

.rank-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.rank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rank-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.rank-level {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.rank-calls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.calls-value {
  font-size: 15px;
  font-weight: 700;
  color: #3b82f6;
}

.calls-label {
  font-size: 10px;
  color: var(--vp-c-text-2);
}

/* 动画 */
.stats-fade-enter-active,
.stats-fade-leave-active {
  transition: all 0.3s ease;
}

.stats-fade-enter-from,
.stats-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 深色模式 */
.dark .stats-panel {
  background: rgba(30, 30, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .overview-card,
.dark .ranking-item {
  background: rgba(255, 255, 255, 0.05);
}

.dark .rank-number,
.dark .rank-avatar,
.dark .bar-track {
  background: rgba(255, 255, 255, 0.1);
}
</style>
