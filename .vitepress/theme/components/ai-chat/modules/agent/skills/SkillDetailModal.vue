<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <LiquidGlass class="modal-glass" glow-color="#8b5cf6" :intensity="0.4">
        <div class="skill-modal">
          <!-- 头部 -->
          <div class="modal-header">
            <div class="skill-title">
              <span class="skill-icon-lg">{{ skill.icon }}</span>
              <div class="skill-title-info">
                <h3>{{ skill.name }}</h3>
                <span class="skill-category">{{ skill.category }}</span>
              </div>
            </div>
            <button class="close-btn" @click="emit('close')">
              <Icon name="x" />
            </button>
          </div>

          <!-- 标签栏 -->
          <div class="modal-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="modal-tab"
              :class="{ active: currentTab === tab.id }"
              @click="currentTab = tab.id"
            >
              <Icon :name="tab.icon" />
              {{ tab.label }}
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
            <!-- 概览 -->
            <div v-show="currentTab === 'overview'" class="tab-content">
              <p class="skill-desc-lg">{{ skill.description }}</p>
              
              <div class="meta-grid">
                <LiquidGlass
                  v-for="meta in metaItems"
                  :key="meta.label"
                  class="meta-glass"
                  glow-color="#64748b"
                  :intensity="0.2"
                >
                  <div class="meta-item">
                    <span class="meta-label">{{ meta.label }}</span>
                    <code v-if="meta.isCode" class="meta-value code">{{ meta.value }}</code>
                    <span v-else class="meta-value">{{ meta.value }}</span>
                  </div>
                </LiquidGlass>
              </div>

              <!-- 使用场景 -->
              <div v-if="skill.usageScenarios?.length" class="scenarios">
                <h4 class="section-title">
                  <Icon name="target" />
                  使用场景
                </h4>
                <div class="scenario-list">
                  <LiquidGlass
                    v-for="(scene, idx) in skill.usageScenarios"
                    :key="idx"
                    class="scenario-glass"
                    glow-color="#f59e0b"
                    :intensity="0.2"
                  >
                    <div class="scenario-item">
                      <span class="scenario-num">{{ idx + 1 }}</span>
                      <span class="scenario-text">{{ scene }}</span>
                    </div>
                  </LiquidGlass>
                </div>
              </div>
            </div>

            <!-- 内容 -->
            <div v-show="currentTab === 'content'" class="tab-content">
              <LiquidGlass class="code-glass" glow-color="#06b6d4" :intensity="0.2">
                <pre class="code-block"><code>{{ skill.content }}</code></pre>
              </LiquidGlass>
            </div>

            <!-- 工具 -->
            <div v-show="currentTab === 'tools'" class="tab-content">
              <div v-if="skill.tools?.length" class="tools-list">
                <LiquidGlass
                  v-for="(tool, idx) in skill.tools"
                  :key="idx"
                  class="tool-glass"
                  :glow-color="getToolColor(idx)"
                  :intensity="0.3"
                >
                  <div class="tool-card">
                    <div class="tool-header">
                      <code class="tool-name">{{ tool }}</code>
                      <span class="tool-type">Function</span>
                    </div>
                  </div>
                </LiquidGlass>
              </div>
              <div v-else class="empty-state">
                <Icon name="tool" class="empty-icon" />
                <span>该 Skill 没有关联工具</span>
              </div>
            </div>
          </div>
        </div>
      </LiquidGlass>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Skill } from '../../../core/types/agent'
import Icon from '../../../shared/Icon.vue'
import LiquidGlass from '../../../shared/LiquidGlass.vue'

const props = defineProps<{ skill: Skill }>()
const emit = defineEmits<{ close: [] }>()

const tabs = [
  { id: 'overview', label: '概览', icon: 'bar-chart' },
  { id: 'content', label: '内容', icon: 'file-text' },
  { id: 'tools', label: '工具', icon: 'tool' }
]

const currentTab = ref('overview')

const metaItems = computed(() => [
  { label: 'ID', value: props.skill.id, isCode: true },
  { label: '版本', value: props.skill.version || '1.0.0' },
  { label: '作者', value: props.skill.author || 'System' },
  { label: '工具数', value: props.skill.tools?.length || 0 }
])

const toolColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899']

function getToolColor(idx: number) {
  return toolColors[idx % toolColors.length]
}
</script>

<style scoped>
@import '../../../styles/liquid-glass-theme.css';

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  z-index: 1200;
  padding: 24px;
}

.modal-glass {
  width: 90%;
  max-width: 640px;
  max-height: 80vh;
  border-radius: 28px;
  overflow: hidden;
}

.skill-modal {
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

/* 头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.skill-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.skill-icon-lg {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  border-radius: 18px;
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.15);
}

.skill-title-info h3 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.skill-category {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  transform: rotate(90deg);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

/* 标签栏 */
.modal-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-tab:hover {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
}

.modal-tab.active {
  background: #8b5cf6;
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
}

.modal-tab svg {
  width: 16px;
  height: 16px;
}

/* 内容区 */
.modal-body {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.skill-desc-lg {
  font-size: 15px;
  line-height: 1.7;
  color: #475569;
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 16px;
  border-left: 4px solid #8b5cf6;
}

/* 元数据网格 */
.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.meta-glass {
  border-radius: 14px;
}

.meta-item {
  padding: 16px;
}

.meta-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.meta-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.meta-value.code {
  font-family: 'JetBrains Mono', monospace;
  color: #7c3aed;
}

/* 使用场景 */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.section-title svg {
  width: 18px;
  height: 18px;
  color: #f59e0b;
}

.scenario-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scenario-glass {
  border-radius: 12px;
}

.scenario-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.scenario-num {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f59e0b;
  color: white;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
}

.scenario-text {
  font-size: 14px;
  color: #475569;
}

/* 代码块 */
.code-glass {
  border-radius: 16px;
}

.code-block {
  margin: 0;
  padding: 20px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #e2e8f0;
  background: #1e293b;
  border-radius: 16px;
  overflow: auto;
  max-height: 400px;
}

/* 工具列表 */
.tools-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-glass {
  border-radius: 14px;
}

.tool-card {
  padding: 18px;
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tool-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  background: rgba(139, 92, 246, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
}

.tool-type {
  font-size: 11px;
  color: #94a3b8;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.tool-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: #94a3b8;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #cbd5e1;
}
</style>
