<script setup lang="ts">
defineProps<{
  isOpen: boolean
}>()
</script>

<template>
  <button class="kimi-orb" :class="{ active: isOpen }">
    <svg v-if="!isOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a3 3 0 0 0-3 3v14a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0v-6a2 2 0 0 0-2-2Z"/>
      <path d="M5 10a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0v-6a2 2 0 0 0-2-2Z"/>
    </svg>
    <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>
</template>

<style scoped>
.kimi-orb {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #4a90d9;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
  transition: all 0.2s ease;
}

.kimi-orb:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
}

.kimi-orb.active {
  background: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.kimi-orb.active:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
