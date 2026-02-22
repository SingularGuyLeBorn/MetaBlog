<template>
  <div class="resources-container-3d">
    <!-- 背景光效 -->
    <div class="ambient-light">
      <div class="light-orb orb-1"></div>
      <div class="light-orb orb-2"></div>
      <div class="light-orb orb-3"></div>
    </div>

    <!-- Hero Section -->
    <section class="hero-3d">
      <div class="hero-content">
        <div class="hero-badge-3d">
          <span class="badge-icon">📦</span>
          <span class="badge-text">开源分享</span>
        </div>
        <h1 class="hero-title">公开资源</h1>
        <p class="hero-desc">精选开源项目、实用工具与学习资料，助力你的技术成长之路</p>
        
        <!-- Stats -->
        <div class="hero-stats-3d">
          <div class="stat-pill-3d">
            <span class="pill-icon">📁</span>
            <span class="pill-text">{{ resources.length }} 个资源</span>
          </div>
          <div class="stat-pill-3d">
            <span class="pill-icon">🌟</span>
            <span class="pill-text">持续更新</span>
          </div>
        </div>
      </div>
      
      <!-- Decorative Elements -->
      <div class="hero-shapes-3d">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
      </div>
    </section>

    <!-- Filter Tags -->
    <div class="filter-section-3d">
      <div class="filter-tags-3d">
        <button 
          v-for="(filter, index) in filters" 
          :key="filter.value"
          class="filter-tag-3d"
          :class="{ active: currentFilter === filter.value }"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @click="currentFilter = filter.value"
        >
          <span class="filter-icon">{{ filter.icon }}</span>
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- Resources Grid -->
    <main class="resources-main-3d">
      <TransitionGroup name="resource-list-3d" tag="div" class="resources-grid-3d">
        <a 
          v-for="(resource, index) in filteredResources" 
          :key="resource.title"
          :href="resource.link"
          class="resource-card-3d"
          :class="resource.typeClass"
          :style="{ '--delay': `${index * 0.08}s` }"
        >
          <!-- Card Top Decoration -->
          <div class="card-accent-3d"></div>
          
          <!-- Card Header -->
          <div class="card-header-3d">
            <div class="resource-icon-wrapper-3d">
              <span class="resource-icon">{{ resource.icon }}</span>
            </div>
            <span class="resource-type-3d" :class="resource.typeClass">
              {{ resource.type }}
            </span>
          </div>
          
          <!-- Card Content -->
          <div class="card-content-3d">
            <h3 class="resource-title">{{ resource.title }}</h3>
            <p class="resource-desc">{{ resource.desc }}</p>
          </div>
          
          <!-- Card Footer -->
          <div class="card-footer-3d">
            <code class="resource-path-3d">
              <span class="path-dot"></span>
              {{ resource.path }}
            </code>
            <span class="resource-action-3d">
              查看
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
          
          <!-- Hover Effect -->
          <div class="card-shine-3d"></div>
        </a>
      </TransitionGroup>
      
      <!-- Empty State -->
      <div v-if="filteredResources.length === 0" class="empty-state-3d">
        <div class="empty-illustration">🔍</div>
        <h3>暂无相关资源</h3>
        <p>请尝试其他筛选条件</p>
      </div>
    </main>

    <!-- Bottom CTA -->
    <section class="cta-section-3d">
      <div class="cta-card-3d">
        <div class="cta-content">
          <h3>想要贡献资源？</h3>
          <p>如果你有优质的开源项目或工具想要分享，欢迎提交</p>
        </div>
        <button class="cta-button-3d">
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
.resources-container-3d {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 24px 80px;
  min-height: 100vh;
  overflow: hidden;
}

/* 环境光效 */
.ambient-light {
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  pointer-events: none;
  z-index: -1;
}

.light-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float-orb 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.15), transparent 70%);
  top: 10%;
  left: 20%;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(5, 150, 105, 0.12), transparent 70%);
  top: 50%;
  right: 10%;
  animation-delay: -7s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.1), transparent 70%);
  bottom: 20%;
  left: 30%;
  animation-delay: -14s;
}

@keyframes float-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
}

/* 3D Hero Section */
.hero-3d {
  position: relative;
  padding: 64px 48px;
  margin-bottom: 48px;
  background: linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%);
  border-radius: 32px;
  overflow: hidden;
  text-align: center;
  box-shadow: 
    0 25px 50px -12px rgba(5, 150, 105, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-badge-3d {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 50px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.badge-icon {
  font-size: 16px;
}

.badge-text {
  font-size: 14px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
}

.hero-title {
  font-size: 52px;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  letter-spacing: -2px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.hero-desc {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.95);
  max-width: 500px;
  margin: 0 auto 32px;
  line-height: 1.7;
}

/* 3D Hero Stats */
.hero-stats-3d {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-pill-3d {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-pill-3d:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
}

.pill-icon {
  font-size: 20px;
}

.pill-text {
  font-size: 15px;
  font-weight: 700;
  color: white;
}

/* 3D Hero Shapes */
.hero-shapes-3d {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float-shape 10s ease-in-out infinite;
}

.shape-1 {
  width: 350px;
  height: 350px;
  top: -120px;
  right: -50px;
  animation-delay: 0s;
}

.shape-2 {
  width: 250px;
  height: 250px;
  bottom: -80px;
  left: -50px;
  animation-delay: -2.5s;
}

.shape-3 {
  width: 120px;
  height: 120px;
  top: 40%;
  left: 10%;
  background: rgba(255, 255, 255, 0.15);
  animation-delay: -5s;
}

.shape-4 {
  width: 80px;
  height: 80px;
  top: 20%;
  right: 15%;
  background: rgba(255, 255, 255, 0.2);
  animation-delay: -7.5s;
}

@keyframes float-shape {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

/* 3D Filter Section */
.filter-section-3d {
  margin-bottom: 40px;
}

.filter-tags-3d {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}

.filter-tag-3d {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 2px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  animation: tag-fade-in 0.4s ease backwards;
}

@keyframes tag-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-tag-3d:hover {
  border-color: #10b981;
  color: #059669;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.15);
}

.filter-tag-3d.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
}

.filter-icon {
  font-size: 18px;
}

/* 3D Resources Grid */
.resources-main-3d {
  margin-bottom: 48px;
}

.resources-grid-3d {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 28px;
}

.resource-card-3d {
  position: relative;
  display: flex;
  flex-direction: column;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.8);
  text-decoration: none;
  color: inherit;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: card-enter 0.6s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateY(20px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
}

@keyframes card-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.resource-card-3d:hover {
  transform: translateY(-8px) rotateX(3deg);
  box-shadow: 
    0 28px 56px -14px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
}

/* Card Accent Bar */
.card-accent-3d {
  height: 4px;
  transition: height 0.3s ease;
}

.resource-card-3d.doc .card-accent-3d {
  background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7);
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
}

.resource-card-3d.folder .card-accent-3d {
  background: linear-gradient(90deg, #f59e0b, #fbbf24, #fcd34d);
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
}

.resource-card-3d:hover .card-accent-3d {
  height: 6px;
}

/* Card Header */
.card-header-3d {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 28px 20px;
}

.resource-icon-wrapper-3d {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.resource-card-3d.doc .resource-icon-wrapper-3d {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);
}

.resource-card-3d.folder .resource-icon-wrapper-3d {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.2);
}

.resource-card-3d:hover .resource-icon-wrapper-3d {
  transform: scale(1.15) rotate(-8deg);
}

.resource-icon {
  font-size: 32px;
}

.resource-type-3d {
  padding: 8px 18px;
  border-radius: 24px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.resource-type-3d.doc {
  background: linear-gradient(145deg, #d1fae5, #a7f3d0);
  color: #047857;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
}

.resource-type-3d.folder {
  background: linear-gradient(145deg, #fef3c7, #fde68a);
  color: #b45309;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}

/* Card Content */
.card-content-3d {
  flex: 1;
  padding: 0 28px 20px;
}

.resource-title {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 10px 0;
  transition: color 0.3s ease;
}

.resource-card-3d:hover .resource-title {
  color: #059669;
}

.resource-card-3d.folder:hover .resource-title {
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
.card-footer-3d {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px 28px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.resource-path-3d {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  font-weight: 600;
}

.path-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e1;
  transition: all 0.3s ease;
}

.resource-card-3d.doc .path-dot {
  background: linear-gradient(135deg, #10b981, #34d399);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.resource-card-3d.folder .path-dot {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.resource-action-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  transition: all 0.3s ease;
}

.resource-card-3d:hover .resource-action-3d {
  color: #059669;
  gap: 12px;
}

.resource-card-3d.folder:hover .resource-action-3d {
  color: #d97706;
}

.resource-action-3d svg {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.resource-card-3d:hover .resource-action-3d svg {
  transform: translateX(4px);
}

/* Card Shine Effect */
.card-shine-3d {
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
  transition: transform 0.7s ease;
  pointer-events: none;
}

.resource-card-3d:hover .card-shine-3d {
  transform: translateX(100%);
}

/* Transition Animations */
.resource-list-3d-enter-active,
.resource-list-3d-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.resource-list-3d-enter-from,
.resource-list-3d-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Empty State */
.empty-state-3d {
  text-align: center;
  padding: 100px 20px;
  color: #94a3b8;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  border-radius: 24px;
  border: 2px dashed rgba(226, 232, 240, 0.8);
}

.empty-illustration {
  font-size: 72px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state-3d h3 {
  font-size: 22px;
  font-weight: 800;
  color: #64748b;
  margin: 0 0 10px 0;
}

.empty-state-3d p {
  font-size: 15px;
  margin: 0;
  font-weight: 600;
}

/* 3D CTA Section */
.cta-section-3d {
  margin-top: 16px;
}

.cta-card-3d {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  padding: 40px 48px;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%);
  border: 2px dashed #10b981;
  border-radius: 24px;
  transition: all 0.4s ease;
}

.cta-card-3d:hover {
  border-style: solid;
  border-color: #059669;
  box-shadow: 0 20px 40px rgba(16, 185, 129, 0.2);
  transform: translateY(-4px);
}

.cta-content h3 {
  font-size: 24px;
  font-weight: 800;
  color: #065f46;
  margin: 0 0 8px 0;
}

.cta-content p {
  font-size: 15px;
  color: #047857;
  margin: 0;
  font-weight: 600;
}

.cta-button-3d {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
}

.cta-button-3d:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.45);
}

.cta-button-3d svg {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.cta-button-3d:hover svg {
  transform: translateX(4px);
}

/* Responsive */
@media (max-width: 768px) {
  .resources-container-3d {
    padding: 80px 16px 60px;
  }
  
  .hero-3d {
    padding: 40px 24px;
    border-radius: 24px;
  }
  
  .hero-title {
    font-size: 40px;
  }
  
  .hero-desc {
    font-size: 16px;
  }
  
  .resources-grid-3d {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .cta-card-3d {
    flex-direction: column;
    text-align: center;
    padding: 32px 24px;
  }
  
  .cta-button-3d {
    width: 100%;
    justify-content: center;
  }
}
</style>
