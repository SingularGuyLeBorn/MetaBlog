<template>
  <div class="system-console-wrapper" v-if="visible">
    <Teleport to="body">
      <Transition name="archive">
        <div class="archive-overlay" @click.self="close">
          <div class="archive-container">
            <!-- 顶部导航 -->
            <header class="nav-bar">
              <div class="nav-brand">
                <div class="brand-icon-wrapper">
                  <Icon name="sliders" class="brand-icon" />
                </div>
                <span class="brand-text">系统控制台</span>
              </div>

              <nav class="nav-tabs">
                <button
                  v-for="item in navItems"
                  :key="item.id"
                  class="nav-tab"
                  :class="{ active: currentView === item.id }"
                  @click="currentView = item.id"
                >
                  <Icon :name="item.icon" class="tab-icon" />
                  <span class="tab-label">{{ item.label }}</span>
                </button>
              </nav>

              <div class="nav-actions">
                <button class="close-btn" @click="close">
                  <Icon name="x" />
                </button>
              </div>
            </header>

            <!-- 主内容区 -->
            <main class="archive-content">
              <TaskManager v-if="currentView === 'tasks'" />
              <LogViewer v-else-if="currentView === 'logs'" />
              <FileManager v-else-if="currentView === 'files'" />
              <ArticleManager v-else-if="currentView === 'articles'" />
              <GitManager v-else-if="currentView === 'git'" />
            </main>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
import { ref } from 'vue'
import TaskManager from './TaskManager.vue'
import LogViewer from './LogViewer.vue'
import FileManager from './FileManager.vue'
import ArticleManager from './ArticleManager.vue'
import GitManager from './GitManager.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const currentView = ref<'tasks' | 'logs' | 'files' | 'articles' | 'git'>('tasks')

const navItems = [
  { id: 'tasks' as const, label: '任务', icon: 'list-checks' },
  { id: 'logs' as const, label: '日志', icon: 'scroll-text' },
  { id: 'files' as const, label: '文件', icon: 'folder-open' },
  { id: 'articles' as const, label: '文章', icon: 'file-text' },
  { id: 'git' as const, label: 'Git', icon: 'git-branch' }
]

function close() {
  emit('update:visible', false)
}
</script>

<style scoped>
.system-console-wrapper {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.archive-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1000;
}

.archive-container {
  width: 100%;
  max-width: 1100px;
  height: 90vh;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  gap: 16px;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.brand-icon-wrapper {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  border-radius: 12px;
  color: white;
}

.brand-icon {
  width: 22px;
  height: 22px;
}

.brand-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.nav-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: #f8f6f3;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow-x: auto;
  flex-wrap: nowrap;
  max-width: 100%;
}

.nav-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 12px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.nav-tab:hover {
  color: var(--sr-text-primary, #1a1a2e);
  background: rgba(255, 255, 255, 0.5);
}

.nav-tab.active {
  color: white;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  box-shadow: 0 4px 12px rgba(184, 160, 144, 0.25);
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(212, 184, 184, 0.1);
  color: var(--sr-morandi-pink, #d4b8b8);
}

/* 内容区 */
.archive-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 动画 */
.archive-enter-active,
.archive-leave-active {
  transition: all 0.3s ease;
}

.archive-enter-from,
.archive-leave-to {
  opacity: 0;
}

.archive-enter-from .archive-container,
.archive-leave-to .archive-container {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .archive-overlay {
    padding: 0;
  }

  .archive-container {
    max-width: 100%;
    height: 100vh;
    border-radius: 0;
  }

  .nav-bar {
    flex-wrap: wrap;
  }

  .nav-tabs {
    order: 3;
    width: 100%;
    overflow-x: auto;
  }
}
</style>
