<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="skill-modal">
        <div class="modal-header">
          <h3>{{ skill.name }}</h3>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>
        <div class="modal-body">
          <p>{{ skill.description }}</p>
          <div class="skill-meta">
            <span>分类: {{ skill.category || '通用' }}</span>
            <span>工具数: {{ skill.tools?.length || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Skill } from '../../types/agent'

const props = defineProps<{
  skill: Skill
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
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.skill-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.skill-meta {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  color: #666;
}
</style>
