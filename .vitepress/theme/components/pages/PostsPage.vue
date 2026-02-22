<template>
  <div class="posts-container-3d">
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
          <span class="badge-icon">✍️</span>
          <span class="badge-text">博客文章</span>
        </div>
        <h1 class="hero-title">文章列表</h1>
        <p class="hero-desc">深入的技术文章与学习思考，探索编程与人工智能的无限可能</p>
        
        <!-- Stats -->
        <div class="hero-stats-3d">
          <div class="stat-card-3d">
            <div class="stat-icon-wrapper">
              <span class="stat-icon">📚</span>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ posts.length }}</span>
              <span class="stat-label">篇文章</span>
            </div>
          </div>
          <div class="stat-card-3d">
            <div class="stat-icon-wrapper">
              <span class="stat-icon">🏷️</span>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ uniqueTags }}</span>
              <span class="stat-label">个分类</span>
            </div>
          </div>
          <div class="stat-card-3d">
            <div class="stat-icon-wrapper">
              <span class="stat-icon">📅</span>
            </div>
            <div class="stat-info">
              <span class="stat-value">2024</span>
              <span class="stat-label">持续更新</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Decorative Elements -->
      <div class="hero-decoration-3d">
        <div class="deco-circle deco-1"></div>
        <div class="deco-circle deco-2"></div>
        <div class="deco-circle deco-3"></div>
      </div>
    </section>

    <!-- Filter Bar -->
    <div class="filter-bar-3d">
      <div class="filter-tabs-3d">
        <button 
          v-for="(tab, index) in filterTabs" 
          :key="tab.value"
          class="filter-tab-3d"
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
    <main class="posts-main-3d">
      <TransitionGroup name="post-list-3d" tag="div" class="posts-grid-3d">
        <article 
          v-for="(post, index) in filteredPosts" 
          :key="post.title" 
          class="post-card-3d"
          :style="{ '--delay': `${index * 0.08}s` }"
        >
          <a :href="post.link" class="post-link-3d">
            <!-- Card Header with Tag -->
            <div class="card-header-3d">
              <span class="post-tag-3d" :class="post.badgeClass">
                <span class="tag-dot"></span>
                {{ post.tag }}
              </span>
              <time class="post-date-3d" :datetime="post.date">
                <span class="date-icon">📅</span>
                {{ formatDate(post.date) }}
              </time>
            </div>
            
            <!-- Card Content -->
            <div class="card-content-3d">
              <h2 class="post-title">{{ post.title }}</h2>
              <p class="post-excerpt">{{ post.excerpt }}</p>
            </div>
            
            <!-- Card Footer -->
            <div class="card-footer-3d">
              <span class="read-more-3d">
                阅读全文
                <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </div>
            
            <!-- Hover Effect Overlay -->
            <div class="card-glow-3d"></div>
          </a>
        </article>
      </TransitionGroup>
      
      <!-- Empty State -->
      <div v-if="filteredPosts.length === 0" class="empty-state-3d">
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
.posts-container-3d {
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
  background: radial-gradient(circle, rgba(102, 126, 234, 0.15), transparent 70%);
  top: 10%;
  right: 20%;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(118, 75, 162, 0.12), transparent 70%);
  top: 40%;
  left: 10%;
  animation-delay: -7s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%);
  bottom: 20%;
  right: 30%;
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
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%);
  border-radius: 32px;
  overflow: hidden;
  text-align: center;
  box-shadow: 
    0 25px 50px -12px rgba(124, 58, 237, 0.4),
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
  max-width: 600px;
  margin: 0 auto 40px;
  line-height: 1.7;
}

/* 3D Stats */
.hero-stats-3d {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.stat-card-3d {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 28px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-card-3d:hover {
  transform: translateY(-6px) rotateX(5deg);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.stat-icon-wrapper {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  font-size: 28px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.stat-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.stat-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: white;
  line-height: 1;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
  font-weight: 600;
}

/* Decorative Elements */
.hero-decoration-3d {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  animation: float-deco 8s ease-in-out infinite;
}

.deco-1 {
  width: 350px;
  height: 350px;
  top: -120px;
  right: -60px;
  animation-delay: 0s;
}

.deco-2 {
  width: 250px;
  height: 250px;
  bottom: -80px;
  left: -60px;
  animation-delay: -3s;
}

.deco-3 {
  width: 180px;
  height: 180px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.05);
  animation-delay: -6s;
}

@keyframes float-deco {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

/* 3D Filter Bar */
.filter-bar-3d {
  margin-bottom: 40px;
  display: flex;
  justify-content: center;
}

.filter-tabs-3d {
  display: flex;
  gap: 10px;
  padding: 8px;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border-radius: 16px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
}

.filter-tab-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  background: transparent;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: tab-fade-in 0.4s ease backwards;
}

@keyframes tab-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-tab-3d:hover {
  color: #7c3aed;
  background: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.filter-tab-3d.active {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: white;
  box-shadow: 
    0 4px 16px rgba(124, 58, 237, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

.tab-icon {
  font-size: 16px;
}

/* 3D Posts Grid */
.posts-main-3d {
  position: relative;
}

.posts-grid-3d {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 28px;
}

.post-card-3d {
  position: relative;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(226, 232, 240, 0.8) inset;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.8);
  animation: card-fade-in 0.6s ease backwards;
  animation-delay: var(--delay);
  transform-style: preserve-3d;
}

@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.post-card-3d:hover {
  transform: translateY(-8px) rotateX(3deg);
  box-shadow: 
    0 30px 60px -12px rgba(124, 58, 237, 0.2),
    0 0 0 1px rgba(139, 92, 246, 0.2) inset;
  border-color: rgba(139, 92, 246, 0.3);
}

.post-link-3d {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 28px;
  text-decoration: none;
  color: inherit;
  position: relative;
  z-index: 1;
}

/* Card Header */
.card-header-3d {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.post-tag-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.post-tag-3d.ai {
  background: linear-gradient(145deg, #ede9fe, #ddd6fe);
  color: #6d28d9;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
}
.post-tag-3d.ai .tag-dot { 
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
}

.post-tag-3d.rl {
  background: linear-gradient(145deg, #fef3c7, #fde68a);
  color: #b45309;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}
.post-tag-3d.rl .tag-dot { 
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

.post-tag-3d.series {
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}
.post-tag-3d.series .tag-dot { 
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
}

.post-tag-3d.test {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  color: #475569;
}
.post-tag-3d.test .tag-dot { 
  background: #94a3b8;
}

.post-date-3d {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 600;
}

.date-icon {
  font-size: 13px;
}

/* Card Content */
.card-content-3d {
  flex: 1;
  margin-bottom: 24px;
}

.post-title {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 14px 0;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.post-card-3d:hover .post-title {
  color: #7c3aed;
}

.post-excerpt {
  font-size: 15px;
  color: #64748b;
  line-height: 1.8;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Card Footer */
.card-footer-3d {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.read-more-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #7c3aed;
  transition: all 0.3s ease;
}

.post-card-3d:hover .read-more-3d {
  gap: 14px;
  color: #6d28d9;
}

.arrow-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.post-card-3d:hover .arrow-icon {
  transform: translateX(6px);
}

/* Card Glow Effect */
.card-glow-3d {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.03) 0%, rgba(139, 92, 246, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.post-card-3d:hover .card-glow-3d {
  opacity: 1;
}

/* Transition Animations */
.post-list-3d-enter-active,
.post-list-3d-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.post-list-3d-enter-from,
.post-list-3d-leave-to {
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

.empty-icon {
  font-size: 56px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-state-3d p {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .posts-container-3d {
    padding: 80px 16px 60px;
  }
  
  .hero-3d {
    padding: 40px 24px;
    border-radius: 24px;
  }
  
  .hero-title {
    font-size: 36px;
  }
  
  .hero-desc {
    font-size: 16px;
  }
  
  .hero-stats-3d {
    flex-direction: column;
    gap: 16px;
  }
  
  .stat-card-3d {
    width: 100%;
    justify-content: center;
  }
  
  .filter-tabs-3d {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .posts-grid-3d {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .post-link-3d {
    padding: 24px;
  }
}
</style>
