<template>
  <div class="skill-import-overlay" @click.self="cancel">
    <div class="skill-import-modal">
      <div class="import-header">
        <h4>导入技能</h4>
        <button class="close-btn" @click="cancel">✕</button>
      </div>
      
      <div class="import-body">
        <div
          class="upload-area"
          :class="{ 'is-dragging': isDragging }"
          @dragenter.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @dragover.prevent
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".md"
            class="file-input"
            @change="handleFileSelect"
          />
          <div class="upload-icon">📄</div>
          <div class="upload-text">
            <p class="primary">点击或拖拽上传技能文件</p>
            <p class="secondary">支持 .md 格式的技能文件</p>
          </div>
        </div>
        
        <div class="import-help">
          <h5>技能文件格式示例：</h5>
          <pre><code>---
name: "写作助手"
description: "基于提示词生成文章"
icon: "✍️"
category: "content"
version: "1.0.0"
tags: ["写作", "内容创作"]
---

你是一个专业的写作助手，擅长根据用户需求创作高质量文章。</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  import: [file: File]
  cancel: []
}>()

const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processFile(file)
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.name.endsWith('.md')) {
    processFile(file)
  }
}

function processFile(file: File) {
  emit('import', file)
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.skill-import-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
}

.skill-import-modal {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.import-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.import-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
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

.import-body {
  padding: 24px;
}

.upload-area {
  border: 2px dashed var(--vp-c-divider);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover,
.upload-area.is-dragging {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.file-input {
  display: none;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text .primary {
  font-size: 16px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
}

.upload-text .secondary {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.import-help {
  margin-top: 24px;
}

.import-help h5 {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
}

.import-help pre {
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 16px;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  color: var(--vp-c-text-1);
}

.import-help code {
  font-family: 'JetBrains Mono', monospace;
}
</style>
