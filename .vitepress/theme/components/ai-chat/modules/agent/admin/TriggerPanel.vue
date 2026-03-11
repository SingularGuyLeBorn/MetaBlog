<template>
  <div class="trigger-panel">
    <!-- 类型卡片 -->
    <div class="trigger-types">
      <LiquidGlass
        v-for="(type, idx) in triggerTypes"
        :key="type.id"
        class="trigger-card-glass"
        :glow-color="type.glowColor"
        :intensity="selectedType === type.id ? 0.6 : 0.2"
        :class="{ active: selectedType === type.id }"
        @click="selectedType = type.id"
      >
        <div class="trigger-card">
          <div class="trigger-icon" :style="{ background: type.gradient }">
            <Icon :name="type.icon" />
          </div>
          <div class="trigger-info">
            <div class="trigger-name">{{ type.name }}</div>
            <div class="trigger-desc">{{ type.description }}</div>
          </div>
          <div v-if="selectedType === type.id" class="trigger-check">
            <Icon name="check" />
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 配置区 -->
    <LiquidGlass class="config-glass" glow-color="#8b5cf6" :intensity="0.3">
      <div class="config-card">
        <h4 class="config-title">{{ currentType?.name }} 配置</h4>
        
        <!-- 手动触发 -->
        <div v-if="selectedType === 'manual'" class="manual-config">
          <div class="info-box">
            <Icon name="hand" class="info-icon" />
            <div>
              <strong>手动触发</strong>：用户需要在 Agent 页面点击按钮才能开始对话
              <p class="info-desc">适用于需要用户主动发起交互的场景</p>
            </div>
          </div>
        </div>

        <!-- 定时触发 -->
        <div v-else-if="selectedType === 'scheduled'" class="scheduled-config">
          <div class="form-group">
            <label>Cron 表达式</label>
            <div class="input-group">
              <input
                v-model="triggerConfig.cron"
                type="text"
                placeholder="0 9 * * *"
                class="lg-input"
              />
              <LiquidGlass glow-color="#3b82f6" :intensity="0.3">
                <button class="lg-btn" @click="testCron">测试</button>
              </LiquidGlass>
            </div>
          </div>
          
          <div class="presets">
            <label>快速选择</label>
            <div class="preset-grid">
              <LiquidGlass
                v-for="preset in cronPresets"
                :key="preset.value"
                class="preset-glass"
                :glow-color="triggerConfig.cron === preset.value ? '#8b5cf6' : '#e2e8f0'"
                :intensity="triggerConfig.cron === preset.value ? 0.4 : 0.1"
              >
                <button
                  class="preset-btn"
                  :class="{ active: triggerConfig.cron === preset.value }"
                  @click="triggerConfig.cron = preset.value"
                >
                  <span class="preset-time">{{ preset.time }}</span>
                  <span class="preset-name">{{ preset.label }}</span>
                </button>
              </LiquidGlass>
            </div>
          </div>

          <div v-if="cronPreview" class="preview-box">
            <Icon name="clock" />
            <span>{{ cronPreview }}</span>
          </div>
        </div>

        <!-- 事件触发 -->
        <div v-else-if="selectedType === 'event'" class="event-config">
          <div class="form-row">
            <div class="form-group">
              <label>事件名称</label>
              <input
                v-model="triggerConfig.eventName"
                type="text"
                placeholder="user.login"
                class="lg-input"
              />
            </div>
            <div class="form-group">
              <label>过滤器 (JSON Path)</label>
              <input
                v-model="triggerConfig.filter"
                type="text"
                placeholder="$.data.userId"
                class="lg-input"
              />
            </div>
          </div>
        </div>

        <!-- Webhook -->
        <div v-else-if="selectedType === 'webhook'" class="webhook-config">
          <div class="form-group">
            <label>Webhook URL</label>
            <LiquidGlass class="url-glass" glow-color="#3b82f6" :intensity="0.2">
              <div class="url-box">
                <code class="url">{{ webhookUrl }}</code>
                <button class="copy-btn" @click="copyWebhook">
                  <Icon :name="copied ? 'check' : 'copy'" />
                  {{ copied ? '已复制' : '复制' }}
                </button>
              </div>
            </LiquidGlass>
          </div>
          <div class="info-box warning">
            <Icon name="lock" class="info-icon" />
            <div>发送 POST 请求到以上 URL 即可触发 Agent。请求体将作为输入参数。</div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="config-actions">
          <LiquidGlass glow-color="#64748b" :intensity="0.2">
            <button class="lg-btn" @click="$emit('cancel')">取消</button>
          </LiquidGlass>
          <LiquidGlass glow-color="#8b5cf6" :intensity="0.5">
            <button class="lg-btn lg-btn-primary" @click="save">
              <Icon name="save" />
              保存配置
            </button>
          </LiquidGlass>
        </div>
      </div>
    </LiquidGlass>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Agent } from '../../../core/types/agent'
import Icon from '../../../shared/Icon.vue'
import LiquidGlass from '../../../shared/LiquidGlass.vue'

const props = defineProps<{ agent: Agent }>()
const emit = defineEmits<{
  save: [data: { type: string; config: any }]
  cancel: []
}>()

const triggerTypes = [
  { id: 'manual', name: '手动触发', description: '用户点击开始', icon: 'hand', gradient: 'linear-gradient(135deg, #10b981, #059669)', glowColor: '#10b981' },
  { id: 'scheduled', name: '定时触发', description: '按 Cron 计划执行', icon: 'clock', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', glowColor: '#f59e0b' },
  { id: 'event', name: '事件触发', description: '监听系统事件', icon: 'zap', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', glowColor: '#8b5cf6' },
  { id: 'webhook', name: 'Webhook', description: '外部 HTTP 调用', icon: 'globe', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', glowColor: '#3b82f6' }
]

const selectedType = ref('manual')
const copied = ref(false)

const triggerConfig = ref({
  cron: '0 9 * * *',
  eventName: '',
  filter: ''
})

const cronPresets = [
  { label: '每小时', value: '0 * * * *', time: 'XX:00' },
  { label: '每天早9点', value: '0 9 * * *', time: '09:00' },
  { label: '每周一', value: '0 9 * * 1', time: '周一' },
  { label: '每月1号', value: '0 9 1 * *', time: '1号' },
  { label: '每5分钟', value: '*/5 * * * *', time: '*/5' },
  { label: '每15分钟', value: '*/15 * * * *', time: '*/15' }
]

const currentType = computed(() => triggerTypes.find(t => t.id === selectedType.value))
const webhookUrl = computed(() => `${window.location.origin}/api/agents/${props.agent.id}/webhook`)
const cronPreview = computed(() => {
  const preset = cronPresets.find(p => p.value === triggerConfig.value.cron)
  return preset ? `下次执行: ${preset.time}` : null
})

function testCron() {
  console.log('Testing cron:', triggerConfig.value.cron)
}

async function copyWebhook() {
  await navigator.clipboard.writeText(webhookUrl.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function save() {
  const config: any = {}
  if (selectedType.value === 'scheduled') config.cron = triggerConfig.value.cron
  if (selectedType.value === 'event') {
    config.eventName = triggerConfig.value.eventName
    config.filter = triggerConfig.value.filter
  }
  if (selectedType.value === 'webhook') config.webhook = webhookUrl.value
  
  emit('save', { type: selectedType.value, config })
}

watch(() => props.agent, (a) => {
  const t = a.triggers?.[0]
  if (t) {
    selectedType.value = t.type
    if (t.config) {
      triggerConfig.value.cron = t.config.cron || '0 9 * * *'
      triggerConfig.value.eventName = t.config.eventName || ''
      // config 中的字段是 eventFilter 而不是 filter
      triggerConfig.value.filter = (t.config as any).filter || t.config.eventFilter || ''
    }
  }
}, { immediate: true })
</script>

<style scoped>
@import '../../../styles/liquid-glass-theme.css';

.trigger-panel {
  max-width: 900px;
  margin: 0 auto;
  padding: 8px;
}

/* 类型卡片 */
.trigger-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.trigger-card-glass {
  border-radius: 20px;
  cursor: pointer;
}

.trigger-card-glass.active {
  transform: translateY(-4px) scale(1.02);
}

.trigger-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px;
  text-align: center;
}

.trigger-icon {
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.trigger-icon svg {
  width: 28px;
  height: 28px;
}

.trigger-info {
  margin-bottom: 12px;
}

.trigger-name {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.trigger-desc {
  font-size: 13px;
  color: #64748b;
}

.trigger-check {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trigger-check svg {
  width: 16px;
  height: 16px;
}

/* 配置区 */
.config-glass {
  border-radius: 28px;
}

.config-card {
  padding: 32px;
}

.config-title {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

/* 手动配置 */
.info-box {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 16px;
}

.info-box.warning {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.15);
}

.info-icon {
  width: 24px;
  height: 24px;
  color: #10b981;
  flex-shrink: 0;
}

.info-box.warning .info-icon {
  color: #f59e0b;
}

.info-desc {
  color: #64748b;
  margin-top: 6px;
  font-size: 14px;
}

/* 定时配置 */
.scheduled-config .form-group {
  margin-bottom: 24px;
}

.input-group {
  display: flex;
  gap: 12px;
}

.input-group .lg-input {
  flex: 1;
}

.presets {
  margin-bottom: 24px;
}

.presets label {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.preset-glass {
  border-radius: 14px;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-time {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.preset-name {
  font-size: 12px;
  color: #64748b;
}

.preset-btn.active .preset-time {
  color: white;
}

.preset-btn.active .preset-name {
  color: rgba(255, 255, 255, 0.8);
}

.preview-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
  color: #7c3aed;
}

.preview-box svg {
  width: 20px;
  height: 20px;
}

/* 事件配置 */
.event-config .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Webhook */
.url-glass {
  border-radius: 14px;
}

.url-box {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
}

.url {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: #475569;
  user-select: all;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(139, 92, 246, 0.1);
  border: none;
  border-radius: 10px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: rgba(139, 92, 246, 0.2);
}

.copy-btn svg {
  width: 16px;
  height: 16px;
}

/* 操作按钮 */
.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

@media (max-width: 768px) {
  .trigger-types {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .event-config .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
