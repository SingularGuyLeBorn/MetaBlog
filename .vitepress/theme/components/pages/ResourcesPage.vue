<template>
  <div class="resources-container">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-icon">📦</span>
          <span class="badge-text">开源分享</span>
        </div>
        <h1 class="hero-title">公开资源</h1>
        <p class="hero-desc">精选开源项目、实用工具与学习资料，助力你的技术成长之路</p>
        
        <!-- Stats -->
        <div class="hero-stats">
          <div class="stat-pill">
            <span class="pill-icon">📁</span>
            <span class="pill-text">{{ resources.length }} 个资源</span>
          </div>
          <div class="stat-pill">
            <span class="pill-icon">🌟</span>
            <span class="pill-text">持续更新</span>
          </div>
        </div>
      </div>
      
      <!-- Decorative Elements -->
      <div class="hero-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
      </div>
    </section>

    <!-- Filter Tags -->
    <div class="filter-section">
      <div class="filter-tags">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          class="filter-tag"
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
      <TransitionGroup name="resource-list" tag="div" class="resources-grid">
        <a 
          v-for="(resource, index) in filteredResources" 
          :key="resource.title"
          :href="resource.link"
          class="resource-card"
          :class="resource.typeClass"
          :style="{ '--delay': index * 0.08 + 's' }"
        >
          <!-- Card Top Decoration -->
          <div class="card-accent"></div>
          
          <!-- Card Header -->
          <div class="card-header">
            <div class="resource-icon-wrapper">
              <span class="resource-icon">{{ resource.icon }}</span>
            </div>
            <span class="resource-type" :class="resource.typeClass">
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
            <code class="resource-path">
              <span class="path-dot"></span>
              {{ resource.path }}
            </code>
            <span class="resource-action">
              查看
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
          
          <!-- Hover Effect -->
          <div class="card-shine"></div>
        </a>
      </TransitionGroup>
      
      <!-- Empty State -->
      <div v-if="filteredResources.length === 0" class="empty-state">
        <div class="empty-illustration">🔍</div>
        <h3>暂无相关资源</h3>
        <p>请尝试其他筛选条件</p>
      </div>
    </main>

    <!-- Bottom CTA -->
    <section class="cta-section">
      <div class="cta-card">
        <div class="cta-content">
          <h3>想要贡献资源？</h3>
          <p>如果你有优质的开源项目或工具想要分享，欢迎提交</p>
        </div>
        <button class="cta-button">
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
  { label: '全部', value: 'all', icon: '📋' },
  { label: '文档', value: 'doc', icon: '📄' },
  { label: '目录', value: 'folder', icon: '📁' }
]

const currentFilter = ref('all')

const filteredResources = computed(() => {
  if (currentFilter.value === 'all') return resources
  return resources.filter(r => r.typeClass === currentFilter.value)
})
</script>

<style scoped>
.resources-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 24px 80px;
  min-height: 100vh;
}

/* Hero Section */
.hero {
  position: relative;
  padding: 64px 48px;
  margin-bottom: 40px;
  background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
  border-radius: 32px;
  overflow: hidden;
  text-align: center;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 50px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.badge-icon {
  font-size: 16px;
}

.badge-text {
  font-size: 14px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.5px;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  letter-spacing: -1px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.hero-desc {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.95);
  max-width: 500px;
  margin: 0 auto 32px;
  line-height: 1.6;
}

/* Hero Stats */
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
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.pill-icon {
  font-size: 16px;
}

.pill-text {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

/* Hero Shapes */
.hero-shapes {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.shape-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -50px;
}

.shape-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
}

.shape-3 {
  width: 100px;
  height: 100px;
  top: 40%;
  left: 10%;
  background: rgba(255, 255, 255, 0.15);
}

.shape-4 {
  width: 60px;
  height: 60px;
  top: 20%;
  right: 15%;
  background: rgba(255, 255, 255, 0.2);
}

/* Filter Section */
.filter-section {
  margin-bottom: 32px;
}

.filter-tags {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-tag:hover {
  border-color: #10b981;
  color: #059669;
  transform: translateY(-2px);
}

.filter-tag.active {
  background: #ecfdf5;
  border-color: #10b981;
  color: #059669;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.filter-icon {
  font-size: 16px;
}

/* Resources Grid */
.resources-main {
  margin-bottom: 48px;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.resource-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  text-decoration: none;
  color: inherit;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: card-enter 0.6s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateY(20px);
}

@keyframes card-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.resource-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.15);
}

/* Card Accent Bar */
.card-accent {
  height: 4px;
  transition: height 0.3s ease;
}

.resource-card.doc .card-accent {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.resource-card.folder .card-accent {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.resource-card:hover .card-accent {
  height: 6px;
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px;
}

.resource-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.resource-card.doc .resource-icon-wrapper {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.resource-card.folder .resource-icon-wrapper {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.resource-card:hover .resource-icon-wrapper {
  transform: scale(1.1) rotate(-5deg);
}

.resource-icon {
  font-size: 28px;
}

.resource-type {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.resource-type.doc {
  background: #d1fae5;
  color: #059669;
}

.resource-type.folder {
  background: #fef3c7;
  color: #d97706;
}

/* Card Content */
.card-content {
  flex: 1;
  padding: 0 24px 16px;
}

.resource-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 10px 0;
  transition: color 0.3s ease;
}

.resource-card:hover .resource-title {
  color: #059669;
}

.resource-card.folder:hover .resource-title {
  color: #d97706;
}

.resource-desc {
  font-size: 14px;
  color: #64748b;
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
  padding: 16px 24px 24px;
  border-top: 1px solid #f1f5f9;
}

.resource-path {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  font-family: 'SF Mono', monospace;
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 8px;
}

.path-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cbd5e1;
}

.resource-card.doc .path-dot {
  background: #10b981;
}

.resource-card.folder .path-dot {
  background: #f59e0b;
}

.resource-action {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  transition: all 0.3s ease;
}

.resource-card:hover .resource-action {
  color: #059669;
  gap: 10px;
}

.resource-card.folder:hover .resource-action {
  color: #d97706;
}

.resource-action svg {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.resource-card:hover .resource-action svg {
  transform: translateX(4px);
}

/* Card Shine Effect */
.card-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.4) 45%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0.4) 55%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
  pointer-events: none;
}

.resource-card:hover .card-shine {
  transform: translateX(100%);
}

/* Transition Animations */
.resource-list-enter-active,
.resource-list-leave-active {
  transition: all 0.4s ease;
}

.resource-list-enter-from,
.resource-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
}

.empty-illustration {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* CTA Section */
.cta-section {
  margin-top: 16px;
}

.cta-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 32px 40px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 2px dashed #10b981;
  border-radius: 20px;
}

.cta-content h3 {
  font-size: 20px;
  font-weight: 700;
  color: #166534;
  margin: 0 0 6px 0;
}

.cta-content p {
  font-size: 14px;
  color: #15803d;
  margin: 0;
}

.cta-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.cta-button:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
}

.cta-button svg {
  width: 18px;
  height: 18px;
}

/* Responsive */
@media (max-width: 768px) {
  .resources-container {
    padding: 80px 16px 60px;
  }
  
  .hero {
    padding: 40px 24px;
    border-radius: 24px;
  }
  
  .hero-title {
    font-size: 36px;
  }
  
  .hero-desc {
    font-size: 16px;
  }
  
  .resources-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .cta-card {
    flex-direction: column;
    text-align: center;
    padding: 28px 24px;
  }
  
  .cta-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
