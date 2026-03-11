<template>
  <Teleport to="body">
    <Transition name="modal-3d">
      <div class="modal-overlay-3d" @click.self="emit('close')">
        <div 
          class="modal-3d"
          :style="modalStyle"
          @mousemove="handleMouseMove"
          @mouseleave="handleMouseLeave"
        >
          <!-- 头部 -->
          <div class="modal-header-3d">
            <div class="skill-title-3d">
              <span class="skill-icon-lg-3d">{{ skill.icon }}</span>
              <div class="skill-title-info-3d">
                <h3 class="skill-name-3d">{{ skill.name }}</h3>
                <span class="skill-category-3d">{{ skill.category }}</span>
              </div>
            </div>
            <button class="close-btn-3d" @click="emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- 标签栏 -->
          <div class="modal-tabs-3d">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="modal-tab-3d"
              :class="{ active: currentTab === tab.id }"
              @click="currentTab = tab.id"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              {{ tab.label }}
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body-3d">
            <!-- 概览 -->
            <div v-show="currentTab === 'overview'" class="tab-content-3d">
              <p class="skill-desc-lg">{{ skill.description }}</p>
              
              <div class="meta-grid-3d">
                <div class="meta-item-3d">
                  <span class="meta-label">ID</span>
                  <code class="meta-value">{{ skill.id }}</code>
                </div>
                <div class="meta-item-3d">
                  <span class="meta-label">版本</span>
                  <span class="meta-value">{{ skill.version || '1.0.0' }}</span>
                </div>
                <div class="meta-item-3d">
                  <span class="meta-label">作者</span>
                  <span class="meta-value">{{ skill.author || 'System' }}</span>
                </div>
                <div class="meta-item-3d">
                  <span class="meta-label">工具数</span>
                  <span class="meta-value">{{ skill.tools?.length || 0 }}</span>
                </div>
              </div>

              <!-- 使用场景 -->
              <div v-if="skill.usageScenarios?.length" class="scenarios-3d">
                <h4 class="section-title-3d">
                  <span>🎯</span> 使用场景
                </h4>
                <div class="scenario-list-3d">
                  <div
                    v-for="(scene, idx) in skill.usageScenarios"
                    :key="idx"
                    class="scenario-item-3d"
                    :style="getScenarioStyle(idx)"
                    @mouseenter="hoveredScenario = idx"
                    @mouseleave="hoveredScenario = null"
                  >
                    <span class="scenario-num">{{ idx + 1 }}</span>
                    <span class="scenario-text">{{ scene }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 内容 -->
            <div v-show="currentTab === 'content'" class="tab-content-3d">
              <div class="code-block-3d">
                <pre><code>{{ skill.content }}</code></pre>
              </div>
            </div>

            <!-- 工具 -->
            <div v-show="currentTab === 'tools'" class="tab-content-3d">
              <div v-if="skill.tools?.length" class="tools-list-3d">
                <div
                  v-for="(tool, idx) in skill.tools"
                  :key="idx"
                  class="tool-card-3d"
                  :style="getToolStyle(idx)"
                  @mouseenter="hoveredTool = idx"
                  @mouseleave="hoveredTool = null"
                >
                  <div class="tool-header-3d">
                    <code class="tool-name-3d">{{ tool }}</code>
                    <span class="tool-type-3d">Function</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-3d">
                <span class="empty-icon">🔧</span>
                <span>该 Skill 没有关联工具</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Skill } from '../../../core/types/agent'

const props = defineProps<{ skill: Skill }>()
const emit = defineEmits<{ close: [] }>()

const tabs = [
  { id: 'overview', label: '概览', icon: '📊' },
  { id: 'content', label: '内容', icon: '📝' },
  { id: 'tools', label: '工具', icon: '🔧' }
]

const currentTab = ref('overview')
const hoveredScenario = ref<number | null>(null)
const hoveredTool = ref<number | null>(null)

const mouseX = ref(0)
const mouseY = ref(0)
const isHovering = ref(false)

const modalStyle = computed(() => ({
  transform: isHovering.value
    ? `perspective(1500px) rotateX(${-mouseY.value * 3}deg) rotateY(${mouseX.value * 3}deg) translateZ(30px)`
    : 'perspective(1500px) rotateX(0) rotateY(0) translateZ(0)',
  transition: 'transform 0.3s ease-out'
}))

function handleMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  mouseX.value = ((e.clientX - rect.left) / rect.width - 0.5) * 2
  mouseY.value = ((e.clientY - rect.top) / rect.height - 0.5) * 2
  isHovering.value = true
}

function handleMouseLeave() {
  isHovering.value = false
  mouseX.value = 0
  mouseY.value = 0
}

function getScenarioStyle(idx: number) {
  const isHovered = hoveredScenario.value === idx
  const delay = idx * 0.05
  return {
    transform: isHovered ? 'translateX(8px) translateZ(20px)' : 'translateX(0) translateZ(0)',
    transition: `all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`
  }
}

function getToolStyle(idx: number) {
  const isHovered = hoveredTool.value === idx
  const delay = idx * 0.08
  return {
    transform: isHovered ? 'translateZ(25px) scale(1.02)' : 'translateZ(0)',
    transition: `all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
    animationDelay: `${delay}s`
  }
}
</script>

<style scoped>
.modal-overlay-3d {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  perspective: 2000px;
}

.modal-3d {
  width: 90%;
  max-width: 640px;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 
    0 25px 80px rgba(0,0,0,0.3),
    0 0 0 1px rgba(255,255,255,0.1);
  overflow: hidden;
  transform-style: preserve-3d;
}

/* Header */
.modal-header-3d {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: linear-gradient(135deg, #faf8ff, #ffffff);
  border-bottom: 1px solid #e2e8f0;
}

.skill-title-3d {
  display: flex;
  align-items: center;
  gap: 16px;
}

.skill-icon-lg-3d {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  border-radius: 16px;
  box-shadow: 
    0 8px 20px rgba(139,92,246,0.2),
    inset 0 2px 4px rgba(255,255,255,0.5);
  transform: translateZ(20px);
}

.skill-name-3d {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  transform: translateZ(10px);
}

.skill-category-3d {
  display: inline-block;
  padding: 4px 12px;
  background: #ede9fe;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  margin-top: 4px;
}

.close-btn-3d {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border: none;
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transform: translateZ(20px);
  transition: all 0.2s ease;
}

.close-btn-3d:hover {
  background: #e2e8f0;
  color: #1e293b;
  transform: translateZ(30px) rotate(90deg);
}

.close-btn-3d svg {
  width: 20px;
  height: 20px;
}

/* Tabs */
.modal-tabs-3d {
  display: flex;
  gap: 8px;
  padding: 12px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.modal-tab-3d {
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
  transform-style: preserve-3d;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-tab-3d:hover {
  background: rgba(139,92,246,0.1);
  color: #7c3aed;
  transform: translateZ(10px);
}

.modal-tab-3d.active {
  background: #8b5cf6;
  color: white;
  transform: translateZ(15px);
  box-shadow: 0 8px 20px rgba(139,92,246,0.3);
}

.tab-icon {
  font-size: 16px;
}

/* Body */
.modal-body-3d {
  padding: 24px;
  overflow: auto;
  max-height: calc(80vh - 160px);
}

.tab-content-3d {
  animation: fadeIn 0.3s ease-out;
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
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #8b5cf6;
}

/* Meta Grid */
.meta-grid-3d {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.meta-item-3d {
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  transform-style: preserve-3d;
  transition: all 0.2s ease;
}

.meta-item-3d:hover {
  transform: translateZ(10px);
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(0,0,0,0.06);
}

.meta-label {
  display: block;
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.meta-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  font-family: 'JetBrains Mono', monospace;
}

/* Scenarios */
.section-title-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.scenario-list-3d {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scenario-item-3d {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transform-style: preserve-3d;
}

.scenario-item-3d:hover {
  background: #ede9fe;
}

.scenario-num {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #8b5cf6;
  color: white;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  transform: translateZ(15px);
}

.scenario-text {
  font-size: 14px;
  color: #475569;
}

/* Code Block */
.code-block-3d {
  background: #1e293b;
  border-radius: 16px;
  overflow: hidden;
  transform: translateZ(10px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.code-block-3d pre {
  margin: 0;
  padding: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #e2e8f0;
  overflow: auto;
  max-height: 400px;
}

/* Tools */
.tools-list-3d {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-card-3d {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transform-style: preserve-3d;
  animation: slideIn 0.4s ease-out forwards;
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.tool-card-3d:hover {
  border-color: #8b5cf6;
  background: #ffffff;
  box-shadow: 0 10px 25px rgba(139,92,246,0.1);
}

.tool-header-3d {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tool-name-3d {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  background: #ede9fe;
  padding: 4px 10px;
  border-radius: 6px;
}

.tool-type-3d {
  font-size: 11px;
  color: #64748b;
  padding: 2px 8px;
  background: #e2e8f0;
  border-radius: 4px;
}

.tool-desc-3d {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.empty-3d {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
}

/* Transition */
.modal-3d-enter-active,
.modal-3d-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-3d-enter-from,
.modal-3d-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
</style>
