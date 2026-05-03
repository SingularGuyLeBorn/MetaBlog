<!--
  SettingsPlaceholder - 系统设置占位
-->
<template>
  <div class="settings-placeholder">
    <div class="placeholder-content">
      <Icon name="settings" class="placeholder-icon" />
      <h3>系统设置</h3>
      <p>Settings 模块开发中...</p>
      <div class="placeholder-list">
        <div class="placeholder-item">
          <Icon name="cpu" :size="14" />
          <span>默认模型配置</span>
        </div>
        <div class="placeholder-item">
          <Icon name="sliders" :size="14" />
          <span>全局参数调优</span>
        </div>
        <div class="placeholder-item">
          <Icon name="bell" :size="14" />
          <span>通知与提醒</span>
        </div>
        <div class="placeholder-item">
          <Icon name="shield" :size="14" />
          <span>权限与安全</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
</script>

<style scoped>
.settings-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 48px;
}

.placeholder-icon {
  width: 56px;
  height: 56px;
  color: var(--sr-text-muted, #94a3b8);
}

.placeholder-content h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.placeholder-content p {
  margin: 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

.placeholder-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  text-align: left;
}

.placeholder-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}
</style>
