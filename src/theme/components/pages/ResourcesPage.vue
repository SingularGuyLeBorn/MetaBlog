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
          精选开源项目、实用工具与学习资料,助力你的技术成长之路
        </p>

        <div class="hero-stats">
          <div class="stat-pill glass-card tilt-card scale-in" style="transition-delay: 0.1s">
            <span>📁</span>
            <span>{{ resources.length }} 个资源</span>
          </div>
          <div class="stat-pill glass-card tilt-card scale-in" style="transition-delay: 0.2s">
            <span>🌟</span>
            <span>持续更新</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Resources Grid -->
    <main class="resources-main">
      <TransitionGroup name="resource-list" tag="div" class="resources-grid sr-grid sr-grid-2">
        <a 
          v-for="(resource, index) in displayResources" 
          :key="resource.title"
          :href="resource.link"
          class="resource-card glass-card glass-card-hover tilt-card fade-up"
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
    </main>

    <!-- Projects Showcase -->
    <section class="projects-section fade-up">
      <div class="section-header-row">
        <h2 class="section-title-sm">
          <span class="title-icon">🚀</span>
          开源项目
        </h2>
      </div>
      
      <div class="projects-list">
        <a 
          v-for="(project, index) in projects" 
          :key="project.title" 
          :href="project.link"
          class="project-item glass-card glass-card-hover tilt-card fade-up"
          :style="{ transitionDelay: `${index * 80}ms` }"
        >
          <div class="project-visual" :style="{ background: project.gradient }">
            <span class="project-emoji">{{ project.emoji }}</span>
          </div>
          <div class="project-body">
            <h3 class="project-name">{{ project.title }}</h3>
            <p class="project-description">{{ project.desc }}</p>
            <div class="project-meta">
              <span class="project-lang">{{ project.language }}</span>
              <span class="project-stars">⭐ {{ project.stars }}</span>
            </div>
          </div>
          <svg class="project-arrow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    </section>

    <!-- Tools Collection -->
    <section class="tools-section fade-up">
      <div class="section-header-row">
        <h2 class="section-title-sm">
          <span class="title-icon">🛠️</span>
          推荐工具
        </h2>
      </div>
      
      <div class="tools-grid">
        <a 
          v-for="(tool, index) in tools" 
          :key="tool.title" 
          :href="tool.link"
          class="tool-item glass-card glass-card-hover tilt-card fade-up"
          :style="{ transitionDelay: `${index * 60}ms` }"
        >
          <div class="tool-icon-wrapper">
            <span class="tool-icon">{{ tool.icon }}</span>
          </div>
          <div class="tool-info">
            <h4 class="tool-name">{{ tool.title }}</h4>
            <p class="tool-desc">{{ tool.desc }}</p>
          </div>
        </a>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="cta-section fade-up">
      <div class="cta-card glass-card tilt-card">
        <div class="cta-content">
          <h3>想要贡献资源？</h3>
          <p class="sr-body">如果你有优质的开源项目或工具想要分享,欢迎提交</p>
        </div>
        <button class="star-btn star-btn-primary magnetic-btn ripple-btn">
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
import { nextTick, onMounted, ref } from 'vue'

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
    desc: 'A leaf node at depth 1 - 一级目录下的资源文件,包含基础文档和参考资料',
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
    desc: 'A paired hub node at depth 1 - 一级目录节点,包含子资源和嵌套内容',
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

// All resources (no filter)
const displayResources = resources

// Projects Data
const projects = [
  {
    emoji: '🧠',
    title: 'MetaBlog',
    desc: 'AI 驱动的智能博客系统,支持知识图谱、RAG 检索、Agent 工作流',
    language: 'Vue + TypeScript',
    stars: '128',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    link: '/sections/about/'
  },
  {
    emoji: '📊',
    title: 'RL-Notebooks',
    desc: '强化学习算法实现集合,包含 DQN、PPO、SAC 等算法的 PyTorch 实现',
    language: 'Python',
    stars: '256',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    link: '/sections/knowledge/'
  },
  {
    emoji: '🤖',
    title: 'LLM-Toolkit',
    desc: '大语言模型工具包,支持多种模型接入、Prompt 管理、对话导出',
    language: 'Python',
    stars: '89',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    link: '/chat'
  }
]

// Tools Data
const tools = [
  { icon: '🔍', title: 'RAG Search', desc: '基于向量检索的语义搜索', link: '/sections/posts/ai-paper-reading-2024/' },
  { icon: '📈', title: 'Knowledge Graph', desc: '可视化知识图谱浏览器', link: '/sections/knowledge/' },
  { icon: '📝', title: 'Inline Editor', desc: 'Markdown 实时编辑器', link: '/sections/posts/tool-tester-guide.html' },
  { icon: '🎨', title: 'Theme Studio', desc: '主题设计与预览工具', link: '/sections/resources/' },
  { icon: '📚', title: 'Doc Generator', desc: '文档自动生成工具', link: '/sections/posts/tools-reference.html' },
  { icon: '🧪', title: 'Tool Tester', desc: 'AI 工具测试平台', link: '/sections/posts/tool-tester.html' }
]

// Switch filter with animation
const currentFilter = ref('all')
const isSwitching = ref(false)
const switchFilter = (value: string) => {
  if (currentFilter.value === value) return
  isSwitching.value = true
  setTimeout(() => {
    currentFilter.value = value
    isSwitching.value = false
  }, 200)
}

onMounted(() => {
  nextTick(() => {
    // 初始化卡片倾斜效果
    const cards = document.querySelectorAll('.tilt-card')
    cards.forEach(card => {
      const htmlCard = card as HTMLElement
      htmlCard.addEventListener('mousemove', (e) => {
        const rect = htmlCard.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = (y - centerY) / centerY * -8
        const rotateY = (x - centerX) / centerX * 8
        htmlCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
      })
      htmlCard.addEventListener('mouseleave', () => {
        htmlCard.style.transform = ''
      })
    })
  })
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   Resources Page — Star River Style
   ═══════════════════════════════════════════════════════════════════════════ */

.resources-page {
  position: relative;
  width: 95%;
  max-width: 1800px;
  margin: 0 auto;
  padding: 80px 24px;
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

/* Filter Switch Animation */
.resource-exit {
  animation: resourceExit 0.2s ease forwards;
}

@keyframes resourceExit {
  to {
    opacity: 0;
    transform: scale(0.95);
  }
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

/* Projects Section */
.projects-section {
  margin-top: 80px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title-sm {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--sr-font-primary);
  font-size: 20px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0;
}

.title-icon { font-size: 22px; }

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  text-decoration: none;
  color: inherit;
}

.project-visual {
  width: 64px;
  height: 64px;
  border-radius: var(--sr-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.project-emoji {
  font-size: 32px;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
}

.project-body {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-family: var(--sr-font-primary);
  font-size: 17px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 6px;
  transition: color 0.2s ease;
}

.project-item:hover .project-name {
  color: var(--sr-accent-star);
}

.project-description {
  font-size: 14px;
  color: var(--sr-text-secondary);
  line-height: 1.6;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--sr-text-muted);
}

.project-stars {
  color: var(--sr-accent-star);
}

.project-arrow-lg {
  width: 20px;
  height: 20px;
  color: var(--sr-text-muted);
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s var(--sr-spring-bounce);
}

.project-item:hover .project-arrow-lg {
  opacity: 1;
  transform: translateX(0);
  color: var(--sr-accent-star);
}

/* Tools Section */
.tools-section {
  margin-top: 60px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  text-decoration: none;
  color: inherit;
}

.tool-icon-wrapper {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-md);
  flex-shrink: 0;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.tool-item:hover .tool-icon-wrapper {
  transform: scale(1.1);
}

.tool-icon {
  font-size: 20px;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-family: var(--sr-font-primary);
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 3px;
  transition: color 0.2s ease;
}

.tool-item:hover .tool-name {
  color: var(--sr-accent-star);
}

.tool-desc {
  font-size: 12px;
  color: var(--sr-text-muted);
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .resources-page { padding: 60px 16px 60px; }
  .resources-grid { grid-template-columns: 1fr !important; }
  .cta-card { flex-direction: column; text-align: center; }
  
  .project-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .project-arrow-lg {
    opacity: 1;
    transform: none;
    align-self: flex-end;
  }
  
  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
