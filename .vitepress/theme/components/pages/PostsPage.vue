<template>
  <div class="posts-container">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-icon">✍️</span>
          <span class="badge-text">博客文章</span>
        </div>
        <h1 class="hero-title">文章列表</h1>
        <p class="hero-desc">深入的技术文章与学习思考，探索编程与人工智能的无限可能</p>
        
        <!-- Stats -->
        <div class="hero-stats">
          <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-info">
              <span class="stat-value">{{ posts.length }}</span>
              <span class="stat-label">篇文章</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏷️</div>
            <div class="stat-info">
              <span class="stat-value">{{ uniqueTags }}</span>
              <span class="stat-label">个分类</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <span class="stat-value">2024</span>
              <span class="stat-label">持续更新</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Decorative Elements -->
      <div class="hero-decoration">
        <div class="deco-circle deco-1"></div>
        <div class="deco-circle deco-2"></div>
        <div class="deco-circle deco-3"></div>
      </div>
    </section>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button 
          v-for="tab in filterTabs" 
          :key="tab.value"
          class="filter-tab"
          :class="{ active: currentFilter === tab.value }"
          @click="currentFilter = tab.value"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-text">{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- Posts Grid -->
    <main class="posts-main">
      <TransitionGroup name="post-list" tag="div" class="posts-grid">
        <article 
          v-for="post in filteredPosts" 
          :key="post.title" 
          class="post-card"
        >
          <a :href="post.link" class="post-link">
            <!-- Card Header with Tag -->
            <div class="card-header">
              <span class="post-tag" :class="post.badgeClass">
                <span class="tag-dot"></span>
                {{ post.tag }}
              </span>
              <time class="post-date" :datetime="post.date">
                <span class="date-icon">📅</span>
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
            
            <!-- Hover Effect Overlay -->
            <div class="card-glow"></div>
          </a>
        </article>
      </TransitionGroup>
      
      <!-- Empty State -->
      <div v-if="filteredPosts.length === 0" class="empty-state">
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
  badgeClass: string
  date: string
  excerpt: string
  link: string
}

const posts: Post[] = [
  {
    title: 'AI 论文阅读 2024',
    tag: 'AI',
    badgeClass: 'ai',
    date: '2024-12-01',
    excerpt: '精选2024年人工智能领域的重要论文，深入解读核心思想与创新点，涵盖大语言模型、多模态学习等前沿方向...',
    link: './ai-paper-reading-2024.html'
  },
  {
    title: '强化学习：从游戏到现实',
    tag: '强化学习',
    badgeClass: 'rl',
    date: '2024-11-15',
    excerpt: '探讨强化学习技术在游戏、机器人、推荐系统等领域的应用，以及从虚拟环境到真实世界的迁移挑战...',
    link: './rl-from-game-to-reality.html'
  },
  {
    title: 'Node L1 系列文章',
    tag: '系列',
    badgeClass: 'series',
    date: '2024-10-01',
    excerpt: 'Node L1 系列文章，包含多级目录结构下的内容组织示例，展示如何构建层次化的知识体系...',
    link: './node-L1/node-L1.html'
  },
  {
    title: 'Leaf 1-1 测试文章',
    tag: '测试',
    badgeClass: 'test',
    date: '2024-09-15',
    excerpt: '这是一篇测试文章，用于展示文章列表的样式和布局效果，包含基本的文本排版和样式设置...',
    link: './leaf-1-1/leaf-1-1.html'
  },
  {
    title: 'Leaf 1-2 测试文章',
    tag: '测试',
    badgeClass: 'test',
    date: '2024-09-01',
    excerpt: '另一篇测试文章，展示多级目录结构下的文章展示效果，探索内容组织的最佳实践...',
    link: './leaf-1-2/leaf-1-2.html'
  }
]

const filterTabs = [
  { label: '全部', value: 'all', icon: '📋' },
  { label: 'AI', value: 'AI', icon: '🤖' },
  { label: '强化学习', value: '强化学习', icon: '🎯' },
  { label: '系列', value: '系列', icon: '📚' }
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
.posts-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 24px 80px;
  min-height: 100vh;
}

/* Hero Section */
.hero {
  position: relative;
  padding: 60px 40px;
  margin-bottom: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  color: rgba(255, 255, 255, 0.9);
  max-width: 600px;
  margin: 0 auto 40px;
  line-height: 1.6;
}

/* Hero Stats */
.hero-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

/* Decorative Elements */
.hero-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.deco-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -50px;
}

.deco-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
}

.deco-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.05);
}

/* Filter Bar */
.filter-bar {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: #f1f5f9;
  border-radius: 14px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-tab:hover {
  color: #475569;
  background: rgba(255, 255, 255, 0.5);
}

.filter-tab.active {
  background: white;
  color: #7c3aed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-icon {
  font-size: 14px;
}

/* Posts Grid */
.posts-main {
  position: relative;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.post-card {
  position: relative;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e2e8f0;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15);
  border-color: #c4b5fd;
}

.post-link {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  position: relative;
  z-index: 1;
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.post-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.post-tag.ai {
  background: #ede9fe;
  color: #7c3aed;
}
.post-tag.ai .tag-dot { background: #8b5cf6; }

.post-tag.rl {
  background: #fef3c7;
  color: #d97706;
}
.post-tag.rl .tag-dot { background: #f59e0b; }

.post-tag.series {
  background: #dbeafe;
  color: #2563eb;
}
.post-tag.series .tag-dot { background: #3b82f6; }

.post-tag.test {
  background: #f1f5f9;
  color: #64748b;
}
.post-tag.test .tag-dot { background: #94a3b8; }

.post-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #94a3b8;
}

.date-icon {
  font-size: 12px;
}

/* Card Content */
.card-content {
  flex: 1;
  margin-bottom: 20px;
}

.post-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.post-card:hover .post-title {
  color: #7c3aed;
}

.post-excerpt {
  font-size: 15px;
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
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.read-more {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #7c3aed;
  transition: gap 0.3s ease;
}

.post-card:hover .read-more {
  gap: 10px;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.post-card:hover .arrow-icon {
  transform: translateX(4px);
}

/* Card Glow Effect */
.card-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.post-card:hover .card-glow {
  opacity: 1;
}

/* Transition Animations */
.post-list-enter-active,
.post-list-leave-active {
  transition: all 0.4s ease;
}

.post-list-enter-from,
.post-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .posts-container {
    padding: 80px 16px 60px;
  }
  
  .hero {
    padding: 40px 24px;
    border-radius: 24px;
  }
  
  .hero-title {
    font-size: 32px;
  }
  
  .hero-desc {
    font-size: 16px;
  }
  
  .hero-stats {
    gap: 12px;
  }
  
  .stat-card {
    padding: 12px 16px;
  }
  
  .stat-value {
    font-size: 20px;
  }
  
  .filter-tabs {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .post-link {
    padding: 20px;
  }
}
</style>
