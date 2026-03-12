<template>
  <div class="posts-page">
    <!-- Hero Section — 极简 -->
    <section class="hero-section fade-up">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-star">✦</span>
          <span class="badge-text">博客文章</span>
        </div>
        <h1 class="sr-title">
          <span class="title-main">文章</span>
          <span class="title-accent">列表</span>
        </h1>
        <p class="sr-subtitle hero-desc">
          深入的技术文章与学习思考，探索编程与人工智能的无限可能
        </p>

        <!-- Stats — Glass Cards -->
        <div class="hero-stats">
          <div class="stat-card glass-card scale-in" style="transition-delay: 0.1s">
            <span class="stat-num">{{ posts.length }}</span>
            <span class="stat-label">篇文章</span>
          </div>
          <div class="stat-card glass-card scale-in" style="transition-delay: 0.2s">
            <span class="stat-num">{{ uniqueTags }}</span>
            <span class="stat-label">个分类</span>
          </div>
          <div class="stat-card glass-card scale-in" style="transition-delay: 0.3s">
            <span class="stat-num">2024</span>
            <span class="stat-label">持续更新</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Trending Marquee Ticker -->
    <div class="marquee-section fade-up" style="transition-delay: 0.4s">
      <div class="marquee-track">
        <div class="marquee-content">
          <span v-for="(tag, i) in [...trendingTags, ...trendingTags, ...trendingTags]" :key="i" class="trending-badge glass-card">
            🔥 {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- Filter Bar — 新拟物 -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button 
          v-for="(tab, index) in filterTabs" 
          :key="tab.value"
          class="filter-tab neu-btn magnetic-btn"
          :class="{ active: currentFilter === tab.value }"
          :style="{ animationDelay: `${index * 0.05}s` }"
          @click="currentFilter = tab.value"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-text">{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- Posts Grid -->
    <main class="posts-main">
      <TransitionGroup name="post-list" tag="div" class="posts-grid sr-grid">
        <article 
          v-for="(post, index) in filteredPosts" 
          :key="post.title" 
          class="post-card glass-card glass-card-hover fade-up"
          :style="{ transitionDelay: `${index * 0.08}s` }"
        >
          <a :href="post.link" class="post-link">
            <!-- Card Header -->
            <div class="card-header">
              <span class="sr-tag" :class="'sr-tag-morandi-' + post.tagColor">
                {{ post.tag }}
              </span>
              <time class="post-date" :datetime="post.date">
                {{ formatDate(post.date) }}
              </time>
            </div>
            
            <!-- Card Content -->
            <div class="card-content">
              <h2 class="post-title">{{ post.title }}</h2>
              <p class="post-excerpt">{{ post.excerpt }}</p>
            </div>
            
            <!-- Card Footer -->
            <div class="card-footer">
              <span class="read-more">
                阅读全文
                <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </div>
          </a>
        </article>
      </TransitionGroup>
      
      <!-- Empty State -->
      <div v-if="filteredPosts.length === 0" class="empty-state glass-card">
        <div class="empty-icon">🔍</div>
        <p>暂无相关文章</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Post {
  title: string
  tag: string
  tagColor: string
  date: string
  excerpt: string
  link: string
}

const posts: Post[] = [
  {
    title: 'AI 论文阅读 2024',
    tag: 'AI',
    tagColor: 'purple',
    date: '2024-12-01',
    excerpt: '精选2024年人工智能领域的重要论文，深入解读核心思想与创新点，涵盖大语言模型、多模态学习等前沿方向...',
    link: '/sections/posts/ai-paper-reading-2024/'
  },
  {
    title: '强化学习：从游戏到现实',
    tag: '强化学习',
    tagColor: 'blue',
    date: '2024-11-15',
    excerpt: '探讨强化学习技术在游戏、机器人、推荐系统等领域的应用，以及从虚拟环境到真实世界的迁移挑战...',
    link: '/sections/posts/rl-from-game-to-reality/'
  },
  {
    title: 'Node L1 系列文章',
    tag: '系列',
    tagColor: 'green',
    date: '2024-10-01',
    excerpt: 'Node L1 系列文章，包含多级目录结构下的内容组织示例，展示如何构建层次化的知识体系...',
    link: '/sections/posts/node-L1/'
  },
  {
    title: 'Leaf 1-1 测试文章',
    tag: '测试',
    tagColor: 'pink',
    date: '2024-09-15',
    excerpt: '这是一篇测试文章，用于展示文章列表的样式和布局效果，包含基本的文本排版和样式设置...',
    link: '/sections/posts/leaf-1-1/'
  },
  {
    title: 'Leaf 1-2 测试文章',
    tag: '测试',
    tagColor: 'pink',
    date: '2024-09-01',
    excerpt: '另一篇测试文章，展示多级目录结构下的文章展示效果，探索内容组织的最佳实践...',
    link: '/sections/posts/leaf-1-2/'
  }
]

const filterTabs = [
  { label: '全部', value: 'all', icon: '✦' },
  { label: 'AI', value: 'AI', icon: '◈' },
  { label: '强化学习', value: '强化学习', icon: '◇' },
  { label: '系列', value: '系列', icon: '◆' }
]

const trendingTags = [
  'DeepSeek-R1', 'RLHF', 'Diffusion Models', 'Transformer', 'Agentic Workflow', 'Vector DB', 'Prompt Engineering', 'LangChain', 'Ollama'
]

const currentFilter = ref('all')

const filteredPosts = computed(() => {
  if (currentFilter.value === 'all') return posts
  return posts.filter(post => post.tag === currentFilter.value)
})

const uniqueTags = computed(() => {
  return new Set(posts.map(p => p.tag)).size
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   Posts Page — Star River Style
   ═══════════════════════════════════════════════════════════════════════════ */

.posts-page {
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

.hero-content {
  position: relative;
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

.badge-star {
  font-size: 12px;
  color: var(--sr-accent-star);
}

.badge-text {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--sr-text-secondary);
}

.title-main {
  color: var(--sr-text-primary);
  font-weight: 200;
}

.title-accent {
  color: var(--sr-morandi-purple);
  font-weight: 400;
}

.hero-desc {
  max-width: 500px;
  margin: 0 auto 48px;
}

/* Stats */
.hero-stats {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 32px !important;
}

.stat-num {
  font-size: 28px;
  font-weight: 300;
  letter-spacing: -0.02em;
  color: var(--sr-text-primary);
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--sr-text-muted);
}

/* Trending Marquee */
.marquee-section {
  width: 100vw;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  overflow: hidden;
  padding: 10px 0;
  margin-bottom: 48px;
  background: linear-gradient(90deg, transparent, rgba(184, 160, 144, 0.05) 20%, rgba(184, 160, 144, 0.05) 80%, transparent);
}

.marquee-track {
  display: flex;
  width: max-content;
}

.marquee-content {
  display: flex;
  gap: 20px;
  padding: 0 10px;
  animation: scroll-x 30s linear infinite;
}

.marquee-content:hover {
  animation-play-state: paused;
}

.trending-badge {
  white-space: nowrap;
  padding: 12px 24px !important;
  font-size: 14px;
  font-weight: 500;
  color: var(--sr-text-secondary);
  border-radius: var(--sr-radius-full) !important;
  cursor: pointer;
  transition: all 0.3s var(--sr-spring-bounce);
}

.trending-badge:hover {
  color: var(--sr-text-primary);
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(184, 160, 144, 0.15);
  border-color: var(--sr-morandi-purple);
}

@keyframes scroll-x {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(-33.33% - 6.66px)); /* Exact offset for 1/3 of the 3x duplicated array */ }
}

/* Filter Bar — Neumorphic */
.filter-bar {
  margin-bottom: 48px;
  display: flex;
  justify-content: center;
}

.filter-tabs {
  display: flex;
  gap: 12px;
  padding: 8px;
  background: var(--sr-bg-secondary);
  border-radius: var(--sr-radius-lg);
}

.filter-tab {
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

.filter-tab:hover {
  color: var(--sr-text-secondary);
}

.filter-tab.active {
  color: var(--sr-text-primary);
  background: var(--sr-bg-elevated) !important;
  box-shadow:
    4px 4px 8px var(--sr-neu-shadow-dark),
    -4px -4px 8px var(--sr-neu-shadow-light) !important;
}

.tab-icon {
  font-size: 12px;
  opacity: 0.6;
}

/* Posts Grid */
.posts-main {
  position: relative;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: var(--sr-space-md);
}

.post-card {
  overflow: hidden;
  padding: 0 !important;
}

.post-link {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 28px;
  text-decoration: none;
  color: inherit;
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.post-date {
  font-size: 13px;
  color: var(--sr-text-muted);
  font-weight: 400;
}

/* Card Content */
.card-content {
  flex: 1;
  margin-bottom: 24px;
}

.post-title {
  font-family: var(--sr-font-primary);
  font-size: 20px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 12px 0;
  line-height: 1.4;
  letter-spacing: -0.01em;
  transition: color 0.3s var(--sr-spring-gentle);
}

.post-card:hover .post-title {
  color: var(--sr-accent-star);
}

.post-excerpt {
  font-size: 14px;
  color: var(--sr-text-secondary);
  line-height: 1.8;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Card Footer */
.card-footer {
  display: flex;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--sr-glass-border);
}

.read-more {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-accent-star);
  letter-spacing: 0.02em;
  transition: gap 0.3s var(--sr-spring-bounce);
}

.post-card:hover .read-more {
  gap: 14px;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.post-card:hover .arrow-icon {
  transform: translateX(4px);
}

/* List Transition */
.post-list-enter-active,
.post-list-leave-active {
  transition: all 0.4s var(--sr-spring-gentle);
}

.post-list-enter-from,
.post-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px !important;
  color: var(--sr-text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 15px;
  font-weight: 500;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .posts-page {
    padding: 60px 16px 60px;
  }

  .hero-stats {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  
  .stat-card {
    width: 100%;
    max-width: 200px;
  }

  .filter-tabs {
    flex-wrap: wrap;
    justify-content: center;
  }

  .posts-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .post-link {
    padding: 24px;
  }
}
</style>
