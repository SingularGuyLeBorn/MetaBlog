<!--
  MemoryManager - 记忆管理页面（Claude 风格）
  
  功能：
  - 查看所有记忆
  - 按分类筛选
  - 添加/编辑/删除记忆
  - 搜索记忆
  - 记忆持久化存储
-->
<template>
  <div class="memory-manager">
    <!-- 头部 -->
    <header class="manager-header">
      <div class="header-title">
        <h1>🧠 记忆管理</h1>
        <p class="subtitle">管理 AI 助手记住的信息和偏好</p>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-value">{{ memories.length }}</span>
          <span class="stat-label">总记忆</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ enabledMemories.length }}</span>
          <span class="stat-label">已启用</span>
        </div>
      </div>
    </header>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索记忆..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      
      <select v-model="filterCategory" class="filter-select">
        <option value="">全部分类</option>
        <option value="user_info">用户信息</option>
        <option value="preferences">偏好设置</option>
        <option value="facts">重要信息</option>
        <option value="goals">目标计划</option>
        <option value="context">上下文</option>
      </select>
      
      <button class="btn-create" @click="openCreateDialog">
        <span>+</span>
        <span>添加记忆</span>
      </button>
    </div>

    <!-- 记忆列表 -->
    <section class="memory-list">
      <div v-if="filteredMemories.length === 0" class="empty-state">
        <span class="empty-icon">📝</span>
        <h3>还没有记忆</h3>
        <p>添加一些信息让 AI 更了解你</p>
      </div>

      <template v-else>
        <div
          v-for="memory in filteredMemories"
          :key="memory.id"
          class="memory-card"
          :class="{ disabled: !memory.enabled }"
        >
          <div class="memory-header">
            <div class="memory-category-badge" :class="memory.category">
              {{ categoryName(memory.category) }}
            </div>
            <div class="memory-importance">
              <span v-for="i in 5" :key="i" :class="{ active: i <= memory.importance }">★</span>
            </div>
          </div>

          <p class="memory-content">{{ memory.content }}</p>

          <div class="memory-footer">
            <div class="memory-meta">
              <span class="memory-source" :class="memory.source">
                {{ memory.source === 'user' ? '👤 用户' : '🤖 AI' }}
              </span>
              <span class="memory-date">{{ formatDate(memory.updatedAt) }}</span>
            </div>
            <div class="memory-actions">
              <button class="action-btn" @click="editMemory(memory)" title="编辑">
                ✏️
              </button>
              <button class="action-btn" @click="toggleEnabled(memory)" :title="memory.enabled ? '禁用' : '启用'">
                {{ memory.enabled ? '👁️' : '🚫' }}
              </button>
              <button class="action-btn danger" @click="confirmDelete(memory)" title="删除">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- 添加/编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
        <div class="dialog-content">
          <div class="dialog-header">
            <h3>{{ isEditing ? '编辑记忆' : '添加记忆' }}</h3>
            <button class="btn-close" @click="closeDialog">✕</button>
          </div>

          <div class="dialog-body">
            <div class="form-group">
              <label>内容 *</label>
              <textarea 
                v-model="form.content" 
                rows="4" 
                class="form-textarea"
                placeholder="例如：我喜欢用 Python 编程，偏好简洁的代码风格..."
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>分类</label>
                <select v-model="form.category" class="form-select">
                  <option value="user_info">用户信息</option>
                  <option value="preferences">偏好设置</option>
                  <option value="facts">重要信息</option>
                  <option value="goals">目标计划</option>
                  <option value="context">上下文</option>
                </select>
              </div>

              <div class="form-group">
                <label>重要性 ({{ form.importance }})</label>
                <input 
                  v-model.number="form.importance"
                  type="range" 
                  min="1" 
                  max="5" 
                  class="form-slider"
                />
                <div class="importance-labels">
                  <span>低</span>
                  <span>高</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>来源</label>
              <div class="source-options">
                <label class="source-option" :class="{ active: form.source === 'user' }">
                  <input type="radio" value="user" v-model="form.source" />
                  <span>👤 用户明确告知</span>
                </label>
                <label class="source-option" :class="{ active: form.source === 'inferred' }">
                  <input type="radio" value="inferred" v-model="form.source" />
                  <span>🤖 AI 推断</span>
                </label>
              </div>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn-secondary" @click="closeDialog">取消</button>
            <button class="btn-primary" @click="saveMemory" :disabled="!form.content.trim()">
              {{ isEditing ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="showDeleteConfirm = false">
        <div class="dialog-content confirm">
          <div class="confirm-icon">⚠️</div>
          <h3>确认删除</h3>
          <p>确定要删除这条记忆吗？</p>
          <div class="dialog-footer">
            <button class="btn-secondary" @click="showDeleteConfirm = false">取消</button>
            <button class="btn-danger" @click="deleteMemory">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { Memory, MemoryCategory } from '../../../core/memory'
import {
  getAllMemories,
  createMemory,
  updateMemory,
  deleteMemory as deleteMemoryApi
} from '../../../core/memory'

const searchQuery = ref('')
const filterCategory = ref('')
const memories = ref<Memory[]>(getAllMemories())
const showDialog = ref(false)
const showDeleteConfirm = ref(false)
const isEditing = ref(false)
const memoryToDelete = ref<Memory | null>(null)

const form = reactive({
  id: '',
  content: '',
  category: 'facts' as MemoryCategory,
  importance: 3,
  source: 'user' as 'user' | 'inferred'
})

const filteredMemories = computed(() => {
  let result = memories.value
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(m => m.content.toLowerCase().includes(query))
  }
  
  if (filterCategory.value) {
    result = result.filter(m => m.category === filterCategory.value)
  }
  
  return result.sort((a, b) => {
    // 按重要性排序，然后按时间排序
    if (b.importance !== a.importance) return b.importance - a.importance
    return b.updatedAt - a.updatedAt
  })
})

const enabledMemories = computed(() => memories.value.filter(m => m.enabled))

function categoryName(cat: MemoryCategory): string {
  const names: Record<string, string> = {
    user_info: '用户',
    preferences: '偏好',
    facts: '信息',
    goals: '目标',
    context: '上下文'
  }
  return names[cat] || cat
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function openCreateDialog() {
  isEditing.value = false
  form.id = ''
  form.content = ''
  form.category = 'facts'
  form.importance = 3
  form.source = 'user'
  showDialog.value = true
}

function editMemory(memory: Memory) {
  isEditing.value = true
  form.id = memory.id
  form.content = memory.content
  form.category = memory.category
  form.importance = memory.importance
  form.source = memory.source
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  isEditing.value = false
}

function saveMemory() {
  if (!form.content.trim()) return
  
  if (isEditing.value) {
    updateMemory(form.id, {
      content: form.content.trim(),
      category: form.category,
      importance: form.importance,
      source: form.source
    })
  } else {
    createMemory(
      form.content.trim(),
      form.category,
      { importance: form.importance, source: form.source }
    )
  }
  
  memories.value = getAllMemories()
  closeDialog()
}

function confirmDelete(memory: Memory) {
  memoryToDelete.value = memory
  showDeleteConfirm.value = true
}

function deleteMemory() {
  if (memoryToDelete.value) {
    deleteMemoryApi(memoryToDelete.value.id)
    memories.value = getAllMemories()
    showDeleteConfirm.value = false
    memoryToDelete.value = null
  }
}

function toggleEnabled(memory: Memory) {
  updateMemory(memory.id, { enabled: !memory.enabled })
  memories.value = getAllMemories()
}
</script>

<style scoped>
.memory-manager {
  padding: 32px;
  max-width: 900px;
  margin: 0 auto;
}

/* 头部 */
.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-title h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: #64748b;
}

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #3b82f6;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-box {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: white;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* 记忆列表 */
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.memory-card {
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.memory-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.memory-card.disabled {
  opacity: 0.6;
  background: #f8fafc;
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.memory-category-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.memory-category-badge.user_info {
  background: #dbeafe;
  color: #3b82f6;
}

.memory-category-badge.preferences {
  background: #dcfce7;
  color: #22c55e;
}

.memory-category-badge.facts {
  background: #fef3c7;
  color: #f59e0b;
}

.memory-category-badge.goals {
  background: #fce7f3;
  color: #ec4899;
}

.memory-category-badge.context {
  background: #f3e8ff;
  color: #a855f7;
}

.memory-importance {
  color: #e2e8f0;
  font-size: 14px;
}

.memory-importance span.active {
  color: #f59e0b;
}

.memory-content {
  margin: 0 0 16px 0;
  font-size: 15px;
  line-height: 1.6;
  color: #1e293b;
}

.memory-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.memory-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}

.memory-source {
  padding: 2px 8px;
  border-radius: 4px;
}

.memory-source.user {
  background: #dbeafe;
  color: #3b82f6;
}

.memory-source.inferred {
  background: #f3e8ff;
  color: #a855f7;
}

.memory-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.action-btn:hover {
  background: #f1f5f9;
}

.action-btn.danger:hover {
  background: #fee2e2;
}

/* 弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog-content {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
}

.dialog-content.confirm {
  max-width: 400px;
  padding: 40px;
  text-align: center;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
}

.dialog-body {
  padding: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* 表单 */
.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
}

.form-textarea,
.form-select,
.form-slider {
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-slider {
  padding: 8px 0;
}

.importance-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

/* 来源选项 */
.source-options {
  display: flex;
  gap: 12px;
}

.source-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.source-option.active {
  border-color: #3b82f6;
  background: #dbeafe;
}

.source-option input {
  display: none;
}

/* 按钮 */
.btn-secondary,
.btn-primary,
.btn-danger {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
</style>
