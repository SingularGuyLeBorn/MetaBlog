<!--
  TriggerConfig - 触发器配置组件 (液态玻璃风格)
  
  功能：
  - 被动响应 (Manual)
  - 定时巡航 (Scheduled) - Cron 表达式
  - 事件激活 (Event Driven)
  - Webhook 触发
-->
<template>
  <div class="trigger-config-liquid">
    <!-- 触发方式选择 -->
    <div class="trigger-type-section">
      <h3 class="section-title-liquid">
        <span class="title-glow">⚡</span>
        工作规则
      </h3>
      <p class="section-desc">配置 Agent 的启动与触发方式</p>
      
      <div class="trigger-types-grid">
        <label
          v-for="type in triggerTypes"
          :key="type.id"
          class="trigger-type-card"
          :class="{ 
            active: selectedType === type.id,
            'is-liquid': true 
          }"
        >
          <input
            type="radio"
            :value="type.id"
            v-model="selectedType"
            @change="onTypeChange"
          />
          <div class="type-liquid-bg" />
          <div class="type-content">
            <span class="type-icon">{{ type.icon }}</span>
            <div class="type-info">
              <span class="type-name">{{ type.name }}</span>
              <span class="type-desc">{{ type.description }}</span>
            </div>
            <div class="type-indicator">
              <span class="indicator-dot" />
            </div>
          </div>
          <div class="type-ripple" />
        </label>
      </div>
    </div>

    <!-- 被动响应配置 -->
    <div v-if="selectedType === 'manual'" class="config-panel-liquid">
      <div class="panel-glow manual-glow" />
      <div class="panel-content">
        <div class="config-header">
          <span class="config-icon">👆</span>
          <h4>被动响应模式</h4>
        </div>
        <p class="config-desc">
          Agent 仅在用户主动发起对话时响应。这是最保守的模式，适合需要人工确认的场景。
        </p>
        <div class="config-options">
          <label class="liquid-checkbox">
            <input type="checkbox" v-model="config.manual.requireConfirmation" />
            <span class="check-indicator" />
            <span class="check-label">执行高危操作前需要确认</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 定时巡航配置 -->
    <div v-if="selectedType === 'scheduled'" class="config-panel-liquid">
      <div class="panel-glow scheduled-glow" />
      <div class="panel-content">
        <div class="config-header">
          <span class="config-icon">⏰</span>
          <h4>定时巡航模式</h4>
        </div>
        <p class="config-desc">
          Agent 按照预定的时间表自动执行。支持 Cron 表达式，可实现复杂的调度需求。
        </p>
        
        <div class="cron-builder">
          <div class="cron-presets">
            <span class="preset-label">快速预设：</span>
            <button
              v-for="preset in cronPresets"
              :key="preset.name"
              class="preset-btn-liquid"
              :class="{ active: config.scheduled.cron === preset.cron }"
              @click="applyCronPreset(preset)"
            >
              {{ preset.name }}
            </button>
          </div>
          
          <div class="cron-input-wrapper">
            <label>Cron 表达式</label>
            <div class="cron-input-group">
              <input
                v-model="config.scheduled.cron"
                type="text"
                class="liquid-input"
                placeholder="0 9 * * *"
                @blur="validateCron"
              />
              <button class="validate-btn" :class="{ valid: isCronValid }" @click="validateCron">
                {{ isCronValid ? '✓' : '验证' }}
              </button>
            </div>
            <p class="cron-hint">
              <span v-if="cronDescription" class="cron-desc">{{ cronDescription }}</span>
              <span v-else class="cron-format">格式：分 时 日 月 周 (0 9 * * 1-5 表示工作日早上9点)</span>
            </p>
          </div>
          
          <!-- 时区选择 - 液态玻璃 3D 下拉框 -->
          <div class="timezone-select">
            <label>时区</label>
            <GlassSelect
              v-model="config.scheduled.timezone"
              :options="timezoneOptions"
              placeholder="选择时区"
            />
          </div>
          
          <div class="schedule-preview">
            <div class="preview-header">
              <span>📅</span>
              <span>下次执行时间</span>
            </div>
            <div class="preview-times">
              <div
                v-for="(time, index) in nextExecutions"
                :key="index"
                class="preview-time-item"
                :style="{ animationDelay: `${index * 0.1}s` }"
              >
                <span class="time-dot" />
                <span class="time-value">{{ time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 事件激活配置 -->
    <div v-if="selectedType === 'event'" class="config-panel-liquid">
      <div class="panel-glow event-glow" />
      <div class="panel-content">
        <div class="config-header">
          <span class="config-icon">📡</span>
          <h4>事件激活模式</h4>
        </div>
        <p class="config-desc">
          当系统中发生特定事件时自动触发 Agent。例如：文件创建、文章更新等。
        </p>
        
        <div class="event-selector">
          <label>监听事件</label>
          <div class="event-grid">
            <label
              v-for="event in eventTypes"
              :key="event.id"
              class="event-card"
              :class="{ active: config.event.eventName === event.id }"
            >
              <input
                type="radio"
                :value="event.id"
                v-model="config.event.eventName"
              />
              <span class="event-icon">{{ event.icon }}</span>
              <span class="event-name">{{ event.name }}</span>
            </label>
          </div>
        </div>
        
        <div class="event-filter">
          <label>路径过滤（可选）</label>
          <input
            v-model="config.event.eventFilter.path"
            type="text"
            class="liquid-input"
            placeholder="例如：/docs/ 或 *.md"
          />
          <p class="filter-hint">仅当事件发生在匹配路径时触发</p>
        </div>
      </div>
    </div>

    <!-- Webhook 配置 -->
    <div v-if="selectedType === 'webhook'" class="config-panel-liquid">
      <div class="panel-glow webhook-glow" />
      <div class="panel-content">
        <div class="config-header">
          <span class="config-icon">🔗</span>
          <h4>Webhook 触发模式</h4>
        </div>
        <p class="config-desc">
          通过 HTTP 请求从外部系统触发 Agent。适合与第三方服务集成。
        </p>
        
        <div class="webhook-config">
          <div class="webhook-url">
            <label>Webhook URL</label>
            <div class="url-display">
              <code>{{ webhookUrl }}</code>
              <button class="copy-btn" @click="copyWebhookUrl">
                {{ copied ? '✓' : '📋' }}
              </button>
            </div>
          </div>
          
          <div class="webhook-secret">
            <label>Secret Key（用于验证请求）</label>
            <div class="secret-input-group">
              <input
                v-model="config.webhook.webhookSecret"
                :type="showSecret ? 'text' : 'password'"
                class="liquid-input"
                placeholder="输入密钥或点击生成"
              />
              <button class="toggle-btn" @click="showSecret = !showSecret">
                {{ showSecret ? '🙈' : '👁️' }}
              </button>
              <button class="generate-btn" @click="generateSecret">
                🎲 生成
              </button>
            </div>
          </div>
          
          <div class="webhook-docs">
            <div class="docs-header">📖 使用示例</div>
            <pre class="docs-code"><code>curl -X POST {{ webhookUrl }} \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: {{ config.webhook.webhookSecret || 'your-secret' }}" \
  -d '{"message": "Hello Agent"}'</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="trigger-actions">
      <button class="btn-liquid secondary" @click="$emit('cancel')">
        <span class="btn-ripple" />
        <span class="btn-text">取消</span>
      </button>
      <button class="btn-liquid primary" :disabled="!isValid" @click="saveConfig">
        <span class="btn-ripple" />
        <span class="btn-glow" />
        <span class="btn-text">💾 保存配置</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import GlassSelect from './GlassSelect.vue'

interface TriggerConfig {
  type: 'manual' | 'scheduled' | 'event' | 'webhook'
  manual: {
    requireConfirmation: boolean
  }
  scheduled: {
    cron: string
    timezone: string
  }
  event: {
    eventName: string
    eventFilter: {
      path: string
    }
  }
  webhook: {
    webhookSecret: string
  }
}

const props = defineProps<{
  initialConfig?: Partial<TriggerConfig>
  agentId: string
}>()

const emit = defineEmits<{
  save: [config: TriggerConfig]
  cancel: []
}>()

// 触发类型定义
const triggerTypes = [
  {
    id: 'manual' as const,
    name: '被动响应',
    icon: '👆',
    description: '用户主动发起时才响应'
  },
  {
    id: 'scheduled' as const,
    name: '定时巡航',
    icon: '⏰',
    description: '按 Cron 时间表自动执行'
  },
  {
    id: 'event' as const,
    name: '事件激活',
    icon: '📡',
    description: '系统事件触发时执行'
  },
  {
    id: 'webhook' as const,
    name: 'Webhook',
    icon: '🔗',
    description: 'HTTP 请求触发'
  }
]

// 事件类型
const eventTypes = [
  { id: 'article.created', name: '文章创建', icon: '📝' },
  { id: 'article.updated', name: '文章更新', icon: '✏️' },
  { id: 'article.deleted', name: '文章删除', icon: '🗑️' },
  { id: 'file.created', name: '文件创建', icon: '📄' },
  { id: 'file.modified', name: '文件修改', icon: '✍️' },
  { id: 'git.commit', name: 'Git 提交', icon: '📦' },
  { id: 'chat.mentioned', name: '被提及', icon: '💬' }
]

// Cron 预设
const cronPresets = [
  { name: '每小时', cron: '0 * * * *' },
  { name: '每天早9点', cron: '0 9 * * *' },
  { name: '工作日早9点', cron: '0 9 * * 1-5' },
  { name: '每周一', cron: '0 9 * * 1' },
  { name: '每月1日', cron: '0 9 1 * *' }
]

// 时区选项
const timezoneOptions = [
  { value: 'Asia/Shanghai', label: '北京时间', subLabel: 'Asia/Shanghai' },
  { value: 'Asia/Tokyo', label: '东京时间', subLabel: 'Asia/Tokyo' },
  { value: 'America/New_York', label: '纽约时间', subLabel: 'America/New_York' },
  { value: 'Europe/London', label: '伦敦时间', subLabel: 'Europe/London' },
  { value: 'UTC', label: 'UTC', subLabel: '协调世界时' }
]

// 本地状态
const selectedType = ref<TriggerConfig['type']>(props.initialConfig?.type || 'manual')
const isCronValid = ref(false)
const copied = ref(false)
const showSecret = ref(false)

const config = reactive<TriggerConfig>({
  type: props.initialConfig?.type || 'manual',
  manual: {
    requireConfirmation: props.initialConfig?.manual?.requireConfirmation ?? false
  },
  scheduled: {
    cron: props.initialConfig?.scheduled?.cron || '0 9 * * *',
    timezone: props.initialConfig?.scheduled?.timezone || 'Asia/Shanghai'
  },
  event: {
    eventName: props.initialConfig?.event?.eventName || 'article.created',
    eventFilter: {
      path: props.initialConfig?.event?.eventFilter?.path || ''
    }
  },
  webhook: {
    webhookSecret: props.initialConfig?.webhook?.webhookSecret || ''
  }
})

// Webhook URL
const webhookUrl = computed(() => {
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:5173'
  return `${baseUrl}/api/agents/webhook/${props.agentId}`
})

// Cron 描述
const cronDescription = computed(() => {
  const cron = config.scheduled.cron
  if (!cron) return ''
  
  const descriptions: Record<string, string> = {
    '0 * * * *': '每小时整点执行',
    '0 */2 * * *': '每2小时执行',
    '0 9 * * *': '每天早上 9:00 执行',
    '0 9 * * 1-5': '工作日早上 9:00 执行',
    '0 9 * * 1': '每周一早上 9:00 执行',
    '0 9 1 * *': '每月 1 日早上 9:00 执行',
    '0 0 * * *': '每天午夜执行',
    '*/5 * * * *': '每 5 分钟执行'
  }
  
  return descriptions[cron] || ''
})

// 下次执行时间预览（模拟）
const nextExecutions = computed(() => {
  if (!isCronValid.value || selectedType.value !== 'scheduled') {
    return ['请配置有效的 Cron 表达式']
  }
  
  const times: string[] = []
  const now = new Date()
  
  for (let i = 1; i <= 5; i++) {
    const next = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    times.push(next.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }))
  }
  
  return times
})

// 验证状态
const isValid = computed(() => {
  if (selectedType.value === 'scheduled') {
    return isCronValid.value && config.scheduled.cron
  }
  if (selectedType.value === 'event') {
    return config.event.eventName
  }
  return true
})

// 方法
function onTypeChange() {
  config.type = selectedType.value
}

function applyCronPreset(preset: { name: string; cron: string }) {
  config.scheduled.cron = preset.cron
  validateCron()
}

function validateCron() {
  // 简化的 Cron 验证
  const cron = config.scheduled.cron
  if (!cron) {
    isCronValid.value = false
    return
  }
  
  const parts = cron.split(' ')
  isCronValid.value = parts.length === 5 && parts.every(p => /^[\d*,/-]+$/.test(p))
}

function generateSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let secret = 'sk-'
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  config.webhook.webhookSecret = secret
}

async function copyWebhookUrl() {
  try {
    await navigator.clipboard.writeText(webhookUrl.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

function saveConfig() {
  emit('save', { ...config })
}

// 监听初始配置变化
watch(() => props.initialConfig, (newConfig) => {
  if (newConfig) {
    selectedType.value = newConfig.type || 'manual'
    config.type = newConfig.type || 'manual'
    if (newConfig.manual) Object.assign(config.manual, newConfig.manual)
    if (newConfig.scheduled) Object.assign(config.scheduled, newConfig.scheduled)
    if (newConfig.event) Object.assign(config.event, newConfig.event)
    if (newConfig.webhook) Object.assign(config.webhook, newConfig.webhook)
  }
}, { deep: true })

// 初始化验证
validateCron()
</script>

<style scoped>
/* ===== 液态玻璃基础 ===== */
.trigger-config-liquid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: linear-gradient(145deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    rgba(255, 255, 255, 0.05) 100%
  );
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
}

.section-title-liquid {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.title-glow {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 10px;
  font-size: 18px;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
}

.section-desc {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #64748b;
}

/* ===== 触发类型选择 - 液态卡片 ===== */
.trigger-types-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.trigger-type-card {
  position: relative;
  display: flex;
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.trigger-type-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 
    0 20px 40px rgba(59, 130, 246, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.trigger-type-card.active {
  background: linear-gradient(145deg, 
    rgba(59, 130, 246, 0.1) 0%, 
    rgba(139, 92, 246, 0.05) 100%
  );
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 
    0 0 30px rgba(59, 130, 246, 0.2),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.type-liquid-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 100%,
    rgba(59, 130, 246, 0.1) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.4s ease;
}

.trigger-type-card:hover .type-liquid-bg,
.trigger-type-card.active .type-liquid-bg {
  opacity: 1;
}

.type-content {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
  width: 100%;
}

.type-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.8));
  border-radius: 16px;
  font-size: 24px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.trigger-type-card.active .type-icon {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.type-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-name {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  transition: color 0.3s ease;
}

.trigger-type-card.active .type-name {
  color: #3b82f6;
}

.type-desc {
  font-size: 12px;
  color: #64748b;
}

.type-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicator-dot {
  width: 12px;
  height: 12px;
  background: #cbd5e1;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.trigger-type-card.active .indicator-dot {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
}

.type-ripple {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), 
    rgba(59, 130, 246, 0.2) 0%, 
    transparent 50%
  );
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.trigger-type-card:hover .type-ripple {
  opacity: 1;
}

.trigger-type-card input {
  position: absolute;
  opacity: 0;
}

/* ===== 配置面板 - 液态玻璃 ===== */
.config-panel-liquid {
  position: relative;
  padding: 24px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  overflow: hidden;
  animation: panel-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes panel-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-glow {
  position: absolute;
  inset: -50%;
  opacity: 0.5;
  pointer-events: none;
  filter: blur(60px);
}

.manual-glow {
  background: radial-gradient(circle, rgba(107, 114, 128, 0.15), transparent 60%);
}

.scheduled-glow {
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 60%);
}

.event-glow {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.2), transparent 60%);
}

.webhook-glow {
  background: radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 60%);
}

.panel-content {
  position: relative;
  z-index: 1;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.config-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.8));
  border-radius: 12px;
  font-size: 20px;
}

.config-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.config-desc {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

/* ===== Cron 配置 ===== */
.cron-builder {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cron-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.preset-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.preset-btn-liquid {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.preset-btn-liquid:hover {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.preset-btn-liquid.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.cron-input-wrapper label,
.timezone-select label,
.event-selector label,
.event-filter label,
.webhook-url label,
.webhook-secret label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.cron-input-group {
  display: flex;
  gap: 8px;
}

.liquid-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: all 0.3s ease;
}

.liquid-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.validate-btn {
  padding: 12px 20px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.validate-btn:hover {
  background: #3b82f6;
  color: white;
}

.validate-btn.valid {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.cron-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
}

.cron-desc {
  color: #3b82f6;
  font-weight: 500;
}

.cron-format {
  color: #94a3b8;
}

/* ===== 执行时间预览 ===== */
.schedule-preview {
  padding: 16px;
  background: linear-gradient(145deg, 
    rgba(59, 130, 246, 0.05) 0%, 
    rgba(139, 92, 246, 0.03) 100%
  );
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: 16px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
}

.preview-times {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-time-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  font-size: 13px;
  color: #475569;
  animation: slide-in-right 0.4s ease backwards;
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.time-dot {
  width: 6px;
  height: 6px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
}

/* ===== 事件配置 ===== */
.event-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.event-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.event-card.active {
  background: linear-gradient(145deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.15);
}

.event-card input {
  position: absolute;
  opacity: 0;
}

.event-icon {
  font-size: 24px;
}

.event-name {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
}

.event-filter,
.webhook-config {
  margin-top: 20px;
}

.filter-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #94a3b8;
}

/* ===== Webhook 配置 ===== */
.url-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.9);
  border-radius: 12px;
}

.url-display code {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #22d3ee;
  overflow-x: auto;
}

.copy-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.secret-input-group {
  display: flex;
  gap: 8px;
}

.toggle-btn,
.generate-btn {
  padding: 12px 16px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.toggle-btn:hover,
.generate-btn:hover {
  background: #3b82f6;
  color: white;
}

.webhook-docs {
  margin-top: 20px;
  padding: 16px;
  background: rgba(30, 41, 59, 0.95);
  border-radius: 14px;
}

.docs-header {
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.docs-code {
  margin: 0;
  padding: 16px;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.6;
  color: #22d3ee;
  overflow-x: auto;
}

/* ===== 复选框样式 ===== */
.liquid-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.liquid-checkbox:hover {
  background: rgba(255, 255, 255, 0.8);
}

.liquid-checkbox input {
  position: absolute;
  opacity: 0;
}

.check-indicator {
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid #cbd5e1;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
}

.liquid-checkbox input:checked + .check-indicator {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-color: transparent;
}

.check-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: translate(-50%, -60%) rotate(45deg) scale(0);
  transition: transform 0.2s ease;
}

.liquid-checkbox input:checked + .check-indicator::after {
  transform: translate(-50%, -60%) rotate(45deg) scale(1);
}

.check-label {
  font-size: 13px;
  color: #475569;
}

/* ===== 底部操作按钮 ===== */
.trigger-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.5);
}

.btn-liquid {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-liquid.secondary {
  color: #64748b;
  background: rgba(241, 245, 249, 0.8);
}

.btn-liquid.secondary:hover {
  background: rgba(226, 232, 240, 0.8);
}

.btn-liquid.primary {
  color: white;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.35);
}

.btn-liquid.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.45);
}

.btn-liquid:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  border-radius: 14px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.btn-liquid:hover .btn-glow {
  opacity: 0.6;
}

.btn-text {
  position: relative;
  z-index: 1;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .trigger-types-grid {
    grid-template-columns: 1fr;
  }
  
  .event-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
