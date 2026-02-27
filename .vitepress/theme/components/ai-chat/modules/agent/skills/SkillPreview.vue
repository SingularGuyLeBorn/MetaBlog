<template>
  <div class="skill-preview-overlay" @click.self="close">
    <div class="skill-preview-modal">
      <div class="preview-header">
        <div class="skill-info">
          <span class="skill-icon">{{ skill.icon }}</span>
          <div class="skill-meta">
            <h4 class="skill-name">{{ skill.name }}</h4>
            <span class="skill-version" v-if="skill.version">v{{ skill.version }}</span>
          </div>
        </div>
        <button class="close-btn" @click="close">✕</button>
      </div>
      
      <div class="preview-body">
        <p class="skill-description">{{ skill.description }}</p>
        
        <div class="skill-tags" v-if="skill.tags?.length">
          <span 
            v-for="tag in skill.tags" 
            :key="tag"
            class="skill-tag"
          >{{ tag }}</span>
        </div>
        
        <div class="skill-category">
          <span class="category-label">分类：</span>
          <span class="category-value">{{ categoryName }}</span>
        </div>
        
        <div class="prompt-preview">
          <h5>📝 Skill 内容</h5>
          <pre class="prompt-content">{{ skill.content }}</pre>
        </div>
      </div>
      
      <div class="preview-footer">
        <button class="btn-secondary" @click="close">关闭</button>
        <button class="btn-primary" @click="useSkill">
          使用此技能
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Skill } from '../../../core/types/agent'

const props = defineProps<{
  skill: Skill
}>()

const emit = defineEmits<{
  close: []
  use: [skill: Skill]
}>()

const categoryNames: Record<string, string> = {
  system: '系统技能',
  content: '内容创作',
  analysis: '分析总结',
  language: '语言翻译',
  editing: '编辑润色',
  development: '开发编程',
  education: '教育解释',
  creativity: '创意思维',
  custom: '自定义'
}

const categoryName = computed(() => 
  categoryNames[props.skill.category] || '其他'
)

function close() {
  emit('close')
}

function useSkill() {
  emit('use', props.skill)
}
</script>

<style scoped>
.skill-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.skill-preview-modal {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.skill-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skill-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-soft);
  border-radius: 12px;
  font-size: 24px;
}

.skill-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.skill-version {
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  padding: 2px 8px;
  border-radius: 4px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 18px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--vp-c-bg-soft);
}

.preview-body {
  padding: 24px;
  overflow-y: auto;
}

.skill-description {
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  margin-bottom: 16px;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.skill-tag {
  font-size: 12px;
  padding: 4px 10px;
  background: var(--vp-c-bg-soft);
  border-radius: 100px;
  color: var(--vp-c-text-2);
}

.skill-category {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 20px;
}

.category-value {
  color: var(--vp-c-brand);
  font-weight: 500;
}

.prompt-preview h5 {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
}

.prompt-content {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.preview-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-secondary:hover {
  background: var(--vp-c-bg-mute);
}

.btn-primary {
  background: var(--vp-c-brand);
  color: white;
}

.btn-primary:hover {
  background: var(--vp-c-brand-dark);
}
</style>
