<template>
  <div class="knowledge-container">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-icon">🧠</span>
          <span class="badge-text">知识体系</span>
        </div>
        <h1 class="hero-title">知识库</h1>
        <p class="hero-desc">系统化的知识整理，从理论到实践，构建完整的学习路径</p>
        
        <!-- Stats -->
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-value">{{ topics.length + 1 }}</span>
            <span class="stat-label">核心专题</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ articles.length }}</span>
            <span class="stat-label">知识节点</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">∞</span>
            <span class="stat-label">探索深度</span>
          </div>
        </div>
      </div>
      
      <!-- Decorative Grid -->
      <div class="hero-grid">
        <div class="grid-item" v-for="i in 16" :key="i"></div>
      </div>
    </section>

    <!-- Main Content -->
    <main class="knowledge-main">
      <!-- Featured Topic -->
      <section class="featured-section">
        <div class="section-header">
          <div class="section-label">
            <span class="label-icon">⭐</span>
            <span>核心专题</span>
          </div>
          <h2 class="section-title">强化学习数学原理</h2>
          <p class="section-desc">从测度论、概率论的角度深入理解强化学习，建立严格的数学框架</p>
        </div>
        
        <a href="./rl-math-principle/" class="featured-card">
          <div class="featured-visual">
            <div class="visual-icon">📐</div>
            <div class="visual-ring ring-1"></div>
            <div class="visual-ring ring-2"></div>
          </div>
          <div class="featured-content">
            <h3>进入专题学习</h3>
            <p>包含理论推导、代码实现、理论实践联系等完整内容，帮助你建立扎实的理论基础</p>
            <div class="featured-meta">
              <span class="meta-item">
                <span class="meta-icon">📚</span>
                3 个子专题
              </span>
              <span class="meta-item">
                <span class="meta-icon">📝</span>
                12 篇文章
              </span>
              <span class="meta-arrow">
                开始探索
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </div>
          </div>
          <div class="featured-bg"></div>
        </a>
      </section>

      <!-- Sub Topics Grid -->
      <section class="topics-section">
        <div class="section-header-row">
          <h2 class="section-title-small">
            <span class="title-icon">🎯</span>
            子专题
          </h2>
          <span class="section-count">{{ topics.length }} 个专题</span>
        </div>
        
        <div class="topics-grid">
          <a 
            v-for="(topic, index) in topics" 
            :key="topic.title" 
            :href="topic.link"
            class="topic-card"
            :style="{ '--delay': index * 0.1 + 's' }"
          >
            <div class="topic-number">0{{ index + 1 }}</div>
            <div class="topic-content">
              <div class="topic-icon-wrapper">
                <span class="topic-icon">{{ topic.icon }}</span>
              </div>
              <div class="topic-info">
                <h4 class="topic-title">{{ topic.title }}</h4>
                <p class="topic-desc">{{ topic.desc }}</p>
                <div class="topic-footer">
                  <span class="topic-count">{{ topic.count }} 篇文章</span>
                  <svg class="topic-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <div class="topic-glow"></div>
          </a>
        </div>
      </section>

      <!-- Recent Articles -->
      <section class="articles-section">
        <div class="section-header-row">
          <h2 class="section-title-small">
            <span class="title-icon">📄</span>
            核心文章
          </h2>
          <a href="./rl-math-principle/" class="view-all">
            查看全部
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
        
        <div class="articles-list">
          <a 
            v-for="(article, index) in articles" 
            :key="article.title" 
            :href="article.link"
            class="article-card"
            :style="{ '--delay': index * 0.05 + 's' }"
          >
            <div class="article-marker" :class="article.badgeClass"></div>
            <div class="article-content">
              <span class="article-badge" :class="article.badgeClass">{{ article.tag }}</span>
              <h4 class="article-title">{{ article.title }}</h4>
              <p class="article-excerpt">{{ article.excerpt }}</p>
              <div class="article-path">
                <span class="path-icon">📁</span>
                {{ article.path }}
              </div>
            </div>
            <div class="article-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </a>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
interface Topic {
  icon: string
  title: string
  desc: string
  count: number
  link: string
}

interface Article {
  title: string
  tag: string
  badgeClass: string
  excerpt: string
  link: string
  path: string
}

const topics: Topic[] = [
  {
    icon: '📊',
    title: 'Foundations',
    desc: '测度论基础、理论推导、Python实现',
    count: 4,
    link: './rl-math-principle/00_Foundations/01_Theory_Derivation.html'
  },
  {
    icon: '🎯',
    title: 'Bellman Equation',
    desc: '贝尔曼最优性原理与动态规划',
    count: 4,
    link: './rl-math-principle/01_Bellman_Equation/01_Theory_Derivation.html'
  },
  {
    icon: '🚀',
    title: 'Policy Gradient',
    desc: '策略梯度方法与优化算法',
    count: 4,
    link: './rl-math-principle/02_Policy_Gradient/01_Theory_Derivation.html'
  }
]

const articles: Article[] = [
  {
    title: '测度论与概率空间基础',
    tag: '理论推导',
    badgeClass: 'theory',
    excerpt: '建立严格的数学框架来描述随机性，深入理解概率的严格定义与性质',
    link: './rl-math-principle/00_Foundations/01_Theory_Derivation.html',
    path: '00_Foundations / 01_Theory_Derivation'
  },
  {
    title: 'Python 实现代码',
    tag: '代码实现',
    badgeClass: 'code',
    excerpt: '理论推导对应的 Python 代码实现，包含完整的实验和可视化',
    link: './rl-math-principle/00_Foundations/02_Implementation.py.html',
    path: '00_Foundations / 02_Implementation.py'
  },
  {
    title: '理论与实践联系',
    tag: '实践联系',
    badgeClass: 'practice',
    excerpt: '将理论推导与代码实现联系起来，深入理解每个公式的实际意义',
    link: './rl-math-principle/00_Foundations/03_Theory_Practise_Link.html',
    path: '00_Foundations / 03_Theory_Practise_Link'
  },
  {
    title: '贝尔曼方程理论推导',
    tag: '理论推导',
    badgeClass: 'theory',
    excerpt: '贝尔曼最优性方程的严格数学推导过程，理解动态规划的核心思想',
    link: './rl-math-principle/01_Bellman_Equation/01_Theory_Derivation.html',
    path: '01_Bellman_Equation / 01_Theory_Derivation'
  }
]
</script>

<style scoped>
.knowledge-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 24px 80px;
  min-height: 100vh;
}

/* Hero Section */
.hero {
  position: relative;
  padding: 64px 48px;
  margin-bottom: 48px;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
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
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 50px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.badge-icon {
  font-size: 16px;
}

.badge-text {
  font-size: 14px;
  font-weight: 600;
  color: #c4b5fd;
  letter-spacing: 0.5px;
}

.hero-title {
  font-size: 52px;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  letter-spacing: -1px;
  background: linear-gradient(to right, #ffffff, #c4b5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 18px;
  color: #a5b4fc;
  max-width: 500px;
  margin: 0 auto 40px;
  line-height: 1.6;
}

/* Hero Stats */
.hero-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  color: white;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #818cf8;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
}

/* Hero Grid Decoration */
.hero-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  opacity: 0.03;
  pointer-events: none;
}

.grid-item {
  background: white;
  border-radius: 2px;
}

/* Main Content */
.knowledge-main {
  display: flex;
  flex-direction: column;
  gap: 56px;
}

/* Section Headers */
.section-header {
  text-align: center;
  margin-bottom: 32px;
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #ede9fe;
  color: #7c3aed;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}

.label-icon {
  font-size: 12px;
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.section-desc {
  font-size: 16px;
  color: #64748b;
  max-width: 500px;
  margin: 0 auto;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title-small {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.title-icon {
  font-size: 20px;
}

.section-count {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
}

.view-all {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #7c3aed;
  text-decoration: none;
  transition: gap 0.3s ease;
}

.view-all:hover {
  gap: 8px;
}

.view-all svg {
  width: 16px;
  height: 16px;
}

/* Featured Card */
.featured-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 40px;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border: 2px solid #e9d5ff;
  border-radius: 24px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: all 0.4s ease;
}

.featured-card:hover {
  border-color: #c084fc;
  transform: translateY(-2px);
  box-shadow: 0 20px 50px -12px rgba(147, 51, 234, 0.2);
}

.featured-visual {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.visual-icon {
  font-size: 48px;
  z-index: 2;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.visual-ring {
  position: absolute;
  border: 2px solid #d8b4fe;
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
}

.ring-1 {
  width: 100px;
  height: 100px;
}

.ring-2 {
  width: 140px;
  height: 140px;
  animation-delay: 0.5s;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.2); opacity: 0; }
}

.featured-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

.featured-content h3 {
  font-size: 24px;
  font-weight: 700;
  color: #581c87;
  margin: 0 0 12px 0;
}

.featured-content p {
  font-size: 15px;
  color: #7e22ce;
  margin: 0 0 24px 0;
  line-height: 1.6;
  opacity: 0.9;
}

.featured-meta {
  display: flex;
  align-items: center;
  gap: 24px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #9333ea;
  font-weight: 500;
}

.meta-icon {
  font-size: 14px;
}

.meta-arrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  padding: 10px 20px;
  background: #9333ea;
  color: white;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.featured-card:hover .meta-arrow {
  background: #7e22ce;
  gap: 12px;
}

.meta-arrow svg {
  width: 16px;
  height: 16px;
}

.featured-bg {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

/* Topics Grid */
.topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.topic-card {
  position: relative;
  display: flex;
  gap: 20px;
  padding: 28px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fade-in-up 0.6s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateY(20px);
}

@keyframes fade-in-up {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.topic-card:hover {
  border-color: #c084fc;
  transform: translateY(-4px);
  box-shadow: 0 16px 40px -12px rgba(147, 51, 234, 0.15);
}

.topic-number {
  font-size: 48px;
  font-weight: 800;
  color: #f3e8ff;
  line-height: 1;
  flex-shrink: 0;
}

.topic-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.topic-icon-wrapper {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.topic-icon {
  font-size: 22px;
}

.topic-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 6px 0;
}

.topic-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 16px 0;
  line-height: 1.5;
  flex: 1;
}

.topic-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topic-count {
  font-size: 13px;
  color: #9333ea;
  font-weight: 600;
}

.topic-arrow {
  width: 20px;
  height: 20px;
  color: #c084fc;
  transition: all 0.3s ease;
}

.topic-card:hover .topic-arrow {
  color: #9333ea;
  transform: translateX(4px);
}

.topic-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.03) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.topic-card:hover .topic-glow {
  opacity: 1;
}

/* Articles List */
.articles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  animation: fade-in-up 0.5s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateY(10px);
}

.article-card:hover {
  border-color: #c084fc;
  background: #faf5ff;
  padding-left: 28px;
}

.article-marker {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.article-marker.theory { background: #8b5cf6; }
.article-marker.code { background: #3b82f6; }
.article-marker.practice { background: #10b981; }

.article-content {
  flex: 1;
}

.article-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
}

.article-badge.theory {
  background: #ede9fe;
  color: #7c3aed;
}

.article-badge.code {
  background: #dbeafe;
  color: #2563eb;
}

.article-badge.practice {
  background: #d1fae5;
  color: #059669;
}

.article-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 6px 0;
}

.article-card:hover .article-title {
  color: #7c3aed;
}

.article-excerpt {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.article-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
  font-family: 'SF Mono', monospace;
}

.path-icon {
  font-size: 10px;
}

.article-arrow {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  transition: all 0.3s ease;
}

.article-arrow svg {
  width: 18px;
  height: 18px;
}

.article-card:hover .article-arrow {
  color: #9333ea;
}

/* Responsive */
@media (max-width: 768px) {
  .knowledge-container {
    padding: 80px 16px 60px;
  }
  
  .hero {
    padding: 40px 24px;
    border-radius: 24px;
  }
  
  .hero-title {
    font-size: 36px;
  }
  
  .hero-stats {
    gap: 20px;
  }
  
  .stat-divider {
    display: none;
  }
  
  .stat-value {
    font-size: 28px;
  }
  
  .featured-card {
    flex-direction: column;
    text-align: center;
    padding: 32px 24px;
  }
  
  .featured-visual {
    width: 100px;
    height: 100px;
  }
  
  .featured-meta {
    flex-direction: column;
    gap: 12px;
  }
  
  .meta-arrow {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
  
  .topics-grid {
    grid-template-columns: 1fr;
  }
  
  .topic-card {
    padding: 24px;
  }
  
  .article-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 20px;
  }
  
  .article-marker {
    width: 40px;
    height: 4px;
  }
  
  .article-arrow {
    align-self: flex-end;
  }
}
</style>
