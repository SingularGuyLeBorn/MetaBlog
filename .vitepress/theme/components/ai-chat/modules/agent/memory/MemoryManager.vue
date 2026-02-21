<!--
  MemoryManager - 记忆管理面板
  
  管理 Agent 的长期记忆和工作记忆
-->
<template>
  <Teleport to="body">
    <Transition name="memory-fade">
      <div v-if="visible" class="memory-overlay" @click.self="close">
        <div class="memory-panel">
          <div class="panel-header">
            <div class="header-title">
              <span class="header-icon">🧠</span>
              <h3>记忆管理</h3>
            </div>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <div class="panel-body">
            <!-- 记忆开关 -->
            <div class="memory-section">
              <div class="section-row">
                <div class="section-info">
                  <h4>会话记忆</h4>
                  <p>记住当前对话的上下文</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="config.enableSessionMemory" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <!-- 长期记忆 -->
            <div class="memory-section">
              <div class="section-row">
                <div class="section-info">
                  <h4>长期记忆</h4>
                  <p>跨会话持久化的关键信息</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="config.enableLongTermMemory" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div v-if="config.enableLongTermMemory" class="memory-editor">
                <textarea
                  v-model="config.longTermContent"
                  rows="8"
                  placeholder="输入需要 AI 记住的长期信息..."
                  class="memory-textarea"
                ></textarea>
                <div class="editor-actions">
                  <button class="btn-secondary" @click="clearMemory">清空</button>
                  <button class="btn-primary" @click="saveMemory">保存</button>
                </div>
              </div>
            </div>

            <!-- 自动提取 -->
            <div class="memory-section">
              <div class="section-row">
                <div class="section-info">
                  <h4>自动提取记忆</h4>
                  <p>自动从对话中提取重要信息</p>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="config.autoExtract" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <!-- 记忆统计 -->
            <div class="memory-stats">
              <h4>记忆统计</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-value">{{ sessionCount }}</span>
                  <span class="stat-label">会话记忆</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ longTermSize }}</span>
                  <span class="stat-label">长期记忆大小</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ extractCount }}</span>
                  <span class="stat-label">自动提取</span>
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
import { reactive, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  agentId?: string
}>()

const emit = defineEmits<{
  close: []
  save: [config: MemoryConfig]
}>()

interface MemoryConfig {
  enableSessionMemory: boolean
  enableLongTermMemory: boolean
  longTermContent: string
  autoExtract: boolean
}

const config = reactive<MemoryConfig>({
  enableSessionMemory: true,
  enableLongTermMemory: false,
  longTermContent: '',
  autoExtract: false
})

// 模拟统计数据
const sessionCount = computed(() => 12)
const longTermSize = computed(() => '2.4KB')
const extractCount = computed(() => 8)

function close() {
  emit('close')
}

function saveMemory() {
  emit('save', { ...config })
  close()
}

function clearMemory() {
  config.longTermContent = ''
}
</script>

<style scoped>
.memory-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  padding: 20px;
}

.memory-panel {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  border-radius: 12px;
  font-size: 20px;
}

.header-title h3 {
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
  font-size: 18px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.memory-section {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-info h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
}

.section-info p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 26px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + .toggle-slider {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

/* Memory Editor */
.memory-editor {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.memory-textarea {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.memory-textarea:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.btn-secondary {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--vp-c-text-1);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary {
  padding: 8px 16px;
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* Stats */
.memory-stats {
  padding: 16px;
  background: rgba(139, 92, 246, 0.08);
  border-radius: 12px;
}

.memory-stats h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

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
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #8b5cf6;
}

.stat-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

/* Animation */
.memory-fade-enter-active,
.memory-fade-leave-active {
  transition: all 0.3s ease;
}

.memory-fade-enter-from,
.memory-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Dark Mode */
.dark .memory-panel {
  background: rgba(30, 30, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .memory-section,
.dark .memory-stats {
  background: rgba(255, 255, 255, 0.05);
}

.dark .memory-textarea {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .stat-item {
  background: rgba(255, 255, 255, 0.05);
}
</style>
