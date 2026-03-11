<template>
  <div class="orchestrator-page">
    <OrchestratorDemo />
  </div>
</template>

<script setup lang="ts">
import OrchestratorDemo from '../ai-chat/modules/orchestrator/OrchestratorDemo.vue'
import { onMounted } from 'vue'
import { initializeDefaultAgents } from '../ai-chat/core/orchestrator'

onMounted(() => {
  // 页面加载时初始化Agent系统
  initializeDefaultAgents()
})
</script>

<style scoped>
.orchestrator-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
