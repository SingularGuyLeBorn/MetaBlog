<template>
  <div class="trigger-panel">
    <h4>触发器配置</h4>
    <div class="trigger-form">
      <label>
        <span>触发条件</span>
        <select v-model="triggerType">
          <option value="manual">手动</option>
          <option value="scheduled">定时</option>
          <option value="event">事件</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const triggerType = ref('manual')
</script>

<style scoped>
.trigger-panel {
  padding: 16px;
}

.trigger-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trigger-form select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
</style>
