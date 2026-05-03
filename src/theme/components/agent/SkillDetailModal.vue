<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="skill" class="modal-overlay" @click.self="emit('close')">
        <LiquidGlass class="modal-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.3">
          <div class="skill-detail-modal">
            <div class="modal-header">
              <div class="header-title">
                <div class="skill-avatar">{{ skill.icon || '🔧' }}</div>
                <h3>{{ skill.name }}</h3>
              </div>
              <button class="close-btn" @click="emit('close')">
                <Icon name="x" />
              </button>
            </div>

            <div class="modal-body">
              <p class="skill-description">{{ skill.description || '暂无描述' }}</p>

              <div class="skill-meta">
                <span class="meta-badge category">
                  {{ skill.category || '通用' }}
                </span>
                <span class="meta-badge tools">
                  <Icon name="tool" :size="12" />
                  {{ skill.tools?.length || 0 }} 个工具
                </span>
              </div>

              <div v-if="skill.tools?.length" class="tools-section">
                <h4>包含工具</h4>
                <div class="tools-list">
                  <span v-for="tool in skill.tools" :key="tool" class="tool-tag">
                    {{ tool }}
                  </span>
                </div>
              </div>

              <div v-if="skill.content" class="content-section">
                <h4>Skill 内容</h4>
                <pre class="content-preview">{{ skill.content }}</pre>
              </div>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Icon, LiquidGlass } from '@/theme/components/common'
import type { Skill } from '@/theme/types/agent'

const props = defineProps<{
  skill: Skill | null
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1100;
  padding: 24px;
}

.modal-glass {
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  border-radius: 24px;
  overflow: hidden;
}

.skill-detail-modal {
  padding: 28px;
  overflow-y: auto;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skill-avatar {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: linear-gradient(135deg, rgba(184, 160, 144, 0.15), rgba(179, 168, 184, 0.1));
  border-radius: 14px;
  border: 1px solid rgba(184, 160, 144, 0.15);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(212, 184, 184, 0.1);
  border-color: rgba(212, 184, 184, 0.2);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.skill-description {
  margin: 0 0 16px;
  font-size: 15px;
  color: var(--sr-text-secondary, #4a4a5a);
  line-height: 1.6;
}

.skill-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.meta-badge.category {
  background: rgba(184, 160, 144, 0.1);
  color: var(--sr-morandi-purple, #b3a8b8);
}

.meta-badge.tools {
  background: rgba(0, 0, 0, 0.04);
  color: var(--sr-text-muted, #94a3b8);
}

.tools-section,
.content-section {
  margin-top: 20px;
}

.tools-section h4,
.content-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.tools-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-tag {
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  font-size: 12px;
  color: var(--sr-text-secondary, #4a4a5a);
}

.content-preview {
  padding: 16px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--sr-text-secondary, #4a4a5a);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
