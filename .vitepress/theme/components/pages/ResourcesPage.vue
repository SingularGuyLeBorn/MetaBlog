<template>
  <div class="resources-page">
    <!-- Hero Section — 极简 -->
    <section class="hero-section fade-up">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-star">✦</span>
          <span class="badge-text">开源分享</span>
        </div>
        <h1 class="sr-title">
          <span class="title-main">公开</span>
          <span class="title-accent">资源</span>
        </h1>
        <p class="sr-subtitle hero-desc">
          精选开源项目、实用工具与学习资料，助力你的技术成长之路
        </p>

        <div class="hero-stats">
          <div class="stat-pill glass-card scale-in" style="transition-delay: 0.1s">
            <span>📁</span>
            <span>{{ resources.length }} 个资源</span>
          </div>
          <div class="stat-pill glass-card scale-in" style="transition-delay: 0.2s">
            <span>🌟</span>
            <span>持续更新</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Filter Tags -->
    <div class="filter-section">
      <div class="filter-tags">
        <button 
          v-for="(filter, index) in filters" 
          :key="filter.value"
          class="filter-tag neu-btn magnetic-btn"
          :class="{ active: currentFilter === filter.value }"
          @click="currentFilter = filter.value"
        >
          <span class="filter-icon">{{ filter.icon }}</span>
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- Resources Grid -->
    <main class="resources-main">
      <TransitionGroup name="resource-list" tag="div" class="resources-grid sr-grid sr-grid-2">
        <a 
          v-for="(resource, index) in filteredResources" 
          :key="resource.title"
          :href="resource.link"
          class="resource-card glass-card glass-card-hover fade-up"
          :style="{ transitionDelay: `${index * 0.08}s` }"
        >
          <!-- Card Header -->
          <div class="card-header">
            <div class="resource-icon-wrapper">
              <span class="resource-icon">{{ resource.icon }}</span>
            </div>
            <span class="sr-tag" :class="resource.typeClass === 'doc' ? 'sr-tag-morandi-green' : 'sr-tag-morandi-blue'">
              {{ resource.type }}
            </span>
          </div>
          
          <!-- Card Content -->
          <div class="card-content">
            <h3 class="resource-title">{{ resource.title }}</h3>
            <p class="resource-desc">{{ resource.desc }}</p>
          </div>
          
          <!-- Card Footer -->
          <div class="card-footer">
            <code class="resource-path">{{ resource.path }}</code>
            <span class="resource-action">
              查看
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
        </a>
      </TransitionGroup>
      
      <!-- Empty State -->
      <div v-if="filteredResources.length === 0" class="empty-state glass-card">
        <div class="empty-icon">🔍</div>
        <h3>暂无相关资源</h3>
        <p>请尝试其他筛选条件</p>
      </div>
    </main>

    <!-- Bottom CTA -->
    <section class="cta-section fade-up">
      <div class="cta-card glass-card">
        <div class="cta-content">
          <h3>想要贡献资源？</h3>
          <p class="sr-body">如果你有优质的开源项目或工具想要分享，欢迎提交</p>
        </div>
        <button class="star-btn star-btn-primary magnetic-btn">
          <span>提交资源</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Resource {
  title: string
  icon: string
  desc: string
  link: string
  type: string
  typeClass: string
  path: string
}

const resources: Resource[] = [
  {
    title: 'Leaf 1-1',
    icon: '📄',
    desc: 'A leaf node at depth 1 - 一级目录下的资源文件，包含基础文档和参考资料',
    link: './leaf-1-1/leaf-1-1.html',
    type: '文档',
    typeClass: 'doc',
    path: '/resources/leaf-1-1'
  },
  {
    title: 'Leaf 1-2',
    icon: '📄',
    desc: 'Another leaf node at depth 1 - 一级目录下的另一个资源文件',
    link: './leaf-1-2/leaf-1-2.html',
    type: '文档',
    typeClass: 'doc',
    path: '/resources/leaf-1-2'
  },
  {
    title: 'Node L1',
    icon: '📁',
    desc: 'A paired hub node at depth 1 - 一级目录节点，包含子资源和嵌套内容',
    link: './node-L1/node-L1.html',
    type: '目录',
    typeClass: 'folder',
    path: '/resources/node-L1'
  },
  {
    title: 'Leaf 2-1',
    icon: '📄',
    desc: 'A leaf node at depth 2 - 二级目录下的资源文件',
    link: './node-L1/leaf-2-1/leaf-2-1.html',
    type: '文档',
    typeClass: 'doc',
    path: '/resources/node-L1/leaf-2-1'
  },
  {
    title: 'Leaf 2-2',
    icon: '📄',
    desc: 'Another leaf node at depth 2 - 二级目录下的另一个资源文件',
    link: './node-L1/leaf-2-2/leaf-2-2.html',
    type: '文档',
    typeClass: 'doc',
    path: '/resources/node-L1/leaf-2-2'
  }
]

const filters = [
  { label: '全部', value: 'all', icon: '✦' },
  { label: '文档', value: 'doc', icon: '◇' },
  { label: '目录', value: 'folder', icon: '◆' }
]

const currentFilter = ref('all')

const filteredResources = computed(() => {
  if (currentFilter.value === 'all') return resources
  return resources.filter(r => r.typeClass === currentFilter.value)
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   Resources Page — Star River Style
   ═══════════════════════════════════════════════════════════════════════════ */

.resources-page {
  position: relative;
  width: 90%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 80px 0;
  min-height: 100vh;
}

/* Hero */
.hero-section {
  text-align: center;
  padding: 40px 0 64px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: var(--sr-glass-bg);
  backdrop-filter: var(--sr-glass-blur);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-full);
  margin-bottom: 24px;
}

.badge-star { font-size: 12px; color: var(--sr-accent-star); }
.badge-text { font-size: 12px; font-weight: 500; letter-spacing: 0.05em; color: var(--sr-text-secondary); }
.title-main { color: var(--sr-text-primary); font-weight: 200; }
.title-accent { color: var(--sr-morandi-green); font-weight: 400; }
.hero-desc { max-width: 500px; margin: 0 auto 40px; }

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px !important;
  font-size: 14px;
  font-weight: 500;
  color: var(--sr-text-secondary);
  border-radius: var(--sr-radius-full) !important;
}

/* Filter */
.filter-section {
  margin-bottom: 48px;
  display: flex;
  justify-content: center;
}

.filter-tags {
  display: flex;
  gap: 12px;
  padding: 8px;
  background: var(--sr-bg-secondary);
  border-radius: var(--sr-radius-lg);
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px !important;
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-text-muted);
  cursor: pointer;
  border-radius: var(--sr-radius-md) !important;
  transition: all 0.3s var(--sr-spring-bounce);
}

.filter-tag:hover { color: var(--sr-text-secondary); }

.filter-tag.active {
  color: var(--sr-text-primary);
  background: var(--sr-bg-elevated) !important;
  box-shadow:
    4px 4px 8px var(--sr-neu-shadow-dark),
    -4px -4px 8px var(--sr-neu-shadow-light) !important;
}

.filter-icon { font-size: 12px; opacity: 0.6; }

/* Resources Grid */
.resources-main { margin-bottom: 64px; }

.resources-grid {
  gap: var(--sr-space-md) !important;
}

.resource-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.resource-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: var(--sr-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  transition: transform 0.3s var(--sr-spring-bounce);
}

.resource-card:hover .resource-icon-wrapper { transform: scale(1.08); }
.resource-icon { font-size: 24px; }

/* Card Content */
.card-content { flex: 1; margin-bottom: 20px; }

.resource-title {
  font-family: var(--sr-font-primary);
  font-size: 18px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 8px;
  transition: color 0.2s ease;
}

.resource-card:hover .resource-title { color: var(--sr-accent-star); }

.resource-desc {
  font-size: 14px;
  color: var(--sr-text-secondary);
  line-height: 1.7;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Card Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 18px;
  border-top: 1px solid var(--sr-glass-border);
}

.resource-path {
  font-size: 11px;
  color: var(--sr-text-muted);
  font-family: 'JetBrains Mono', monospace;
  background: var(--sr-glass-bg);
  padding: 6px 12px;
  border-radius: var(--sr-radius-sm);
  border: 1px solid var(--sr-glass-border);
}

.resource-action {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-accent-star);
  transition: gap 0.3s var(--sr-spring-bounce);
}

.resource-card:hover .resource-action { gap: 10px; }

.resource-action svg {
  width: 16px;
  height: 16px;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.resource-card:hover .resource-action svg { transform: translateX(3px); }

/* List Transitions */
.resource-list-enter-active,
.resource-list-leave-active {
  transition: all 0.4s var(--sr-spring-gentle);
}

.resource-list-enter-from,
.resource-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px !important;
  color: var(--sr-text-muted);
}

.empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
.empty-state h3 { font-size: 18px; font-weight: 600; color: var(--sr-text-secondary); margin: 0 0 8px; }
.empty-state p { font-size: 14px; margin: 0; }

/* CTA Section */
.cta-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
}

.cta-content h3 {
  font-family: var(--sr-font-primary);
  font-size: 20px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 6px;
}

/* Responsive */
@media (max-width: 768px) {
  .resources-page { padding: 60px 16px 60px; }
  .resources-grid { grid-template-columns: 1fr !important; }
  .cta-card { flex-direction: column; text-align: center; }
}
</style>
