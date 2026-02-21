<script setup lang="ts">
import { data as posts } from '../../../docs/data/posts.data'
import { data as knowledge } from '../../../docs/data/knowledge.data'
import { data as resources } from '../../../docs/data/resources.data'


const sections = [
  {
    id: 'posts',
    title: '文章列表',
    description: '深入的技术文章与思考',
    path: '/sections/posts',
    icon: '📝',
    bgClass: 'bg-blue',
    preview: posts.slice(0, 3)
  },
  {
    id: 'knowledge',
    title: '知识库',
    description: '系统化的知识体系',
    path: '/sections/knowledge',
    icon: '📚',
    bgClass: 'bg-green',
    preview: knowledge.slice(0, 3)
  },
  {
    id: 'resources',
    title: '公开资源',
    description: '开源项目与工具分享',
    path: '/sections/resources',
    icon: '📦',
    bgClass: 'bg-purple',
    preview: resources.slice(0, 3)
  },
  {
    id: 'about',
    title: '关于我',
    description: '了解更多关于作者的信息',
    path: '/sections/about',
    icon: '👤',
    bgClass: 'bg-orange',
    preview: []
  }
]
</script>

<template>
  <div class="home-portal">
    <div class="portal-header">
      <h1 class="gradient-text">MetaUniverse Blog</h1>
      <p class="subtitle">Exploring the boundaries of AI & Hardware</p>
    </div>

    <div class="sections-grid">
      <div v-for="section in sections" :key="section.id" class="section-card glass" :class="section.bgClass">
        <div class="card-header">
          <span class="icon">{{ section.icon }}</span>
          <h2>{{ section.title }}</h2>
        </div>
        <p class="description">{{ section.description }}</p>
        
        <div class="preview-list" v-if="section.preview && section.preview.length > 0">
           <a v-for="item in section.preview" :key="item.url" :href="item.url" class="preview-item">
             <span class="bull">&bull;</span> {{ item.title }}
           </a>
        </div>

        <a :href="section.path" class="view-more">查看更多 &rarr;</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-portal {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.portal-header {
  text-align: center;
  margin-bottom: 60px;
}

.gradient-text {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(120deg, var(--vp-c-brand-dark), var(--vp-c-brand));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
  line-height: 1.2;
  padding-bottom: 0.1em;
}

.subtitle {
  font-size: 1.5rem;
  color: var(--vp-c-text-2);
}

.sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.section-card {
  padding: 30px;
  border-radius: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.icon {
  font-size: 2rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.description {
  color: var(--vp-c-text-2);
  margin-bottom: 24px;
}

.preview-list {
  margin-bottom: 24px;
  flex-grow: 1;
}

.preview-item {
  display: block;
  padding: 6px 0;
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.preview-item:hover {
  color: var(--vp-c-brand);
}

.bull {
  color: var(--vp-c-brand);
  margin-right: 6px;
}

.view-more {
  display: inline-block;
  color: var(--vp-c-brand);
  font-weight: 600;
  text-decoration: none;
  margin-top: auto;
}

.view-more:hover {
  text-decoration: underline;
}

/* Background Gradients */
/* Using ::before to apply gradient opacity */
.section-card::before {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
}

.bg-blue::before { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
.bg-green::before { background: linear-gradient(135deg, #10b981, #22c55e); }
.bg-purple::before { background: linear-gradient(135deg, #8b5cf6, #ec4899); }
.bg-orange::before { background: linear-gradient(135deg, #f97316, #eab308); }

</style>
