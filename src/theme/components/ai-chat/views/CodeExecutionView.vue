<!--
  CodeExecutionView - 代码执行结果视图
  展示代码工具的输入、输出和错误.
-->
<template>
  <div class="code-execution-view">
    <!-- 代码块 -->
    <div v-if="execution.code" class="code-section">
      <div class="section-label">
        <span class="section-icon">📝</span>
        <span>代码</span>
        <span v-if="execution.language" class="lang-badge">{{ execution.language }}</span>
      </div>
      <pre class="code-block"><code>{{ execution.code }}</code></pre>
    </div>

    <!-- 标准输出 -->
    <div v-if="execution.stdout" class="output-section">
      <div class="section-label">
        <span class="section-icon">✅</span>
        <span>输出</span>
      </div>
      <pre class="output-block">{{ execution.stdout }}</pre>
    </div>

    <!-- 标准错误 -->
    <div v-if="execution.stderr" class="error-section">
      <div class="section-label">
        <span class="section-icon">❌</span>
        <span>错误</span>
      </div>
      <pre class="error-block">{{ execution.stderr }}</pre>
    </div>

    <!-- 退出码 -->
    <div v-if="execution.exitCode !== undefined" class="exit-code">
      退出码: <span :class="{ 'exit-success': execution.exitCode === 0, 'exit-error': execution.exitCode !== 0 }">{{ execution.exitCode }}</span>
    </div>

    <!-- 空状态 -->
    <div v-if="!execution.code && !execution.stdout && !execution.stderr" class="empty-state">
      <span class="empty-icon">💻</span>
      <span class="empty-text">暂无代码执行结果</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CodeExecutionResult } from '@/theme/types'

interface Props {
  execution: CodeExecutionResult
}

defineProps<Props>()
</script>

<style scoped>
.code-execution-view {
  padding: 4px 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sr-text-muted, #9a9588);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-icon {
  font-size: 14px;
}

.lang-badge {
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(154, 168, 179, 0.15);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--sr-morandi-blue, #9aa8b3);
  text-transform: none;
  letter-spacing: 0;
}

.code-section,
.output-section,
.error-section {
  margin-bottom: 16px;
}

.code-block,
.output-block,
.error-block {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 12px 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.code-block {
  color: var(--sr-text-secondary, #6a6560);
}

.output-block {
  color: var(--sr-text-primary, #2d2a26);
}

.error-block {
  color: #a88080;
  background: rgba(201, 168, 168, 0.08);
  border-color: rgba(201, 168, 168, 0.2);
}

.exit-code {
  font-size: 12px;
  color: var(--sr-text-muted, #9a9588);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  padding: 8px 0;
}

.exit-success {
  color: #889888;
  font-weight: 600;
}

.exit-error {
  color: #a88080;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  color: var(--sr-text-muted, #9a9588);
}

.empty-icon {
  font-size: 32px;
  opacity: 0.6;
}

.empty-text {
  font-size: 14px;
}
</style>
