<template>
  <div class="trigger-panel">
    <div class="layout">
      <!-- 触发条件 -->
      <LiquidGlass class="card-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.3">
        <div class="card-inner">
          <label class="field-label">
            <Icon name="clock" class="label-icon" />
            触发条件
          </label>
          <DropdownSelect
            v-model="triggerType"
            :options="[
              { value: 'manual', label: '手动触发' },
              { value: 'scheduled', label: '定时触发' },
              { value: 'event', label: '事件触发' },
              { value: 'webhook', label: 'Webhook 触发' }
            ]"
            placeholder="选择触发类型"
            @change="emit('save', { type: triggerType, config: triggerConfig })"
          />
          <p class="field-hint">{{ typeHint }}</p>
        </div>
      </LiquidGlass>

      <!-- 定时配置 -->
      <LiquidGlass v-if="triggerType === 'scheduled'" class="card-glass" glow-color="var(--sr-morandi-blue, #9aa8b8)" :intensity="0.3">
        <div class="card-inner">
          <label class="field-label">
            <Icon name="calendar" class="label-icon" />
            Cron 表达式
          </label>
          <input
            v-model="triggerConfig.cron"
            type="text"
            class="lg-input"
            placeholder="0 9 * * * (每天上午9点)"
          />
          <div class="cron-presets">
            <button
              v-for="preset in cronPresets"
              :key="preset.value"
              class="preset-chip"
              @click="triggerConfig.cron = preset.value"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
      </LiquidGlass>

      <!-- 事件配置 -->
      <LiquidGlass v-if="triggerType === 'event'" class="card-glass" glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.3">
        <div class="card-inner">
          <label class="field-label">
            <Icon name="zap" class="label-icon" />
            监听事件
          </label>
          <div class="event-list">
            <label v-for="event in eventOptions" :key="event.value" class="event-item">
              <input
                v-model="triggerConfig.events"
                type="checkbox"
                :value="event.value"
              />
              <span class="event-name">{{ event.label }}</span>
            </label>
          </div>
        </div>
      </LiquidGlass>

      <!-- Webhook 配置 -->
      <LiquidGlass v-if="triggerType === 'webhook'" class="card-glass" glow-color="var(--sr-morandi-purple, #b3a8b8)" :intensity="0.3">
        <div class="card-inner">
          <label class="field-label">
            <Icon name="link" class="label-icon" />
            Webhook URL
          </label>
          <input
            v-model="triggerConfig.webhookUrl"
            type="text"
            class="lg-input"
            placeholder="https://example.com/webhook"
          />
          <label class="field-label" style="margin-top: 16px;">
            <Icon name="key" class="label-icon" />
            密钥 (可选)
          </label>
          <input
            v-model="triggerConfig.secret"
            type="password"
            class="lg-input"
            placeholder="用于验证请求来源"
          />
        </div>
      </LiquidGlass>


    </div>
  </div>
</template>

<script setup lang="ts">
import { DropdownSelect, Icon, LiquidGlass } from '@/theme/components/common'
import { computed, ref } from 'vue'

const props = defineProps<{
  agent: any
}>()

const emit = defineEmits<{
  save: [config: any]
  cancel: []
}>()

const triggerType = ref('manual')
const triggerConfig = ref<{
  cron?: string
  events?: string[]
  webhookUrl?: string
  secret?: string
}>({
  cron: '',
  events: [],
  webhookUrl: '',
  secret: ''
})

const typeHint = computed(() => {
  const hints: Record<string, string> = {
    manual: '用户手动点击按钮或发送消息时触发',
    scheduled: '按照 Cron 表达式定时自动触发',
    event: '监听系统事件（如文件变更、新日志等）时触发',
    webhook: '通过外部 HTTP 请求调用 Webhook 触发'
  }
  return hints[triggerType.value] || ''
})

const cronPresets = [
  { label: '每小时', value: '0 * * * *' },
  { label: '每天', value: '0 0 * * *' },
  { label: '每周一', value: '0 0 * * 1' },
  { label: '每月1日', value: '0 0 1 * *' }
]

const eventOptions = [
  { label: '文件变更', value: 'file_change' },
  { label: '新日志产生', value: 'new_log' },
  { label: 'Git 提交', value: 'git_commit' },
  { label: '新文章发布', value: 'article_publish' }
]

function handleSave() {
  emit('save', {
    type: triggerType.value,
    config: { ...triggerConfig.value }
  })
}
</script>

<style scoped>
.trigger-panel {
  padding: 8px;
}

.layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
}

.card-glass {
  border-radius: 24px;
}

.card-inner {
  padding: 24px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.label-icon {
  width: 20px;
  height: 20px;
  color: var(--sr-accent-star, #b8a090);
}

.field-hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.cron-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.preset-chip {
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  font-size: 13px;
  color: var(--sr-text-secondary, #4a4a5a);
  cursor: pointer;
  transition: all 0.2s;
}

.preset-chip:hover {
  background: rgba(184, 160, 144, 0.1);
  border-color: rgba(184, 160, 144, 0.2);
  color: var(--sr-accent-star, #b8a090);
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.event-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.event-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--sr-accent-star, #b8a090);
}

.event-name {
  font-size: 14px;
  color: var(--sr-text-secondary, #4a4a5a);
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

.lg-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.lg-btn-primary {
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  color: white;
}
</style>
