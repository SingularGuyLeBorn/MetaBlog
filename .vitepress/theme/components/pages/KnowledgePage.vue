<template>
  <div class="knowledge-container-3d">
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
          <span class="badge-icon">🧠</span>
          <span class="badge-text">知识体系</span>
        </div>
        <h1 class="hero-title">知识库</h1>
        <p class="hero-desc">系统化的知识整理，从理论到实践，构建完整的学习路径</p>
        
        <!-- Stats -->
        <div class="hero-stats-3d">
          <div class="stat-item-3d">
            <span class="stat-value">{{ topics.length + 1 }}</span>
            <span class="stat-label">核心专题</span>
          </div>
          <div class="stat-divider-3d"></div>
          <div class="stat-item-3d">
            <span class="stat-value">{{ articles.length }}</span>
            <span class="stat-label">知识节点</span>
          </div>
          <div class="stat-divider-3d"></div>
          <div class="stat-item-3d">
            <span class="stat-value">∞</span>
            <span class="stat-label">探索深度</span>
          </div>
        </div>
      </div>
      
      <!-- Decorative Grid -->
      <div class="hero-grid-3d">
        <div class="grid-item" v-for="i in 16" :key="i"></div>
      </div>
    </section>

    <!-- Main Content -->
    <main class="knowledge-main-3d">
      <!-- Featured Topic -->
      <section class="featured-section-3d">
        <div class="section-header-3d">
          <div class="section-label-3d">
            <span class="label-icon">⭐</span>
            <span>核心专题</span>
          </div>
          <h2 class="section-title">强化学习数学原理</h2>
          <p class="section-desc">从测度论、概率论的角度深入理解强化学习，建立严格的数学框架</p>
        </div>
        
        <a href="./rl-math-principle/" class="featured-card-3d">
          <div class="featured-visual-3d">
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
              <span class="meta-arrow-3d">
                开始探索
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </div>
          </div>
          <div class="featured-bg-3d"></div>
        </a>
      </section>

      <!-- Sub Topics Grid -->
      <section class="topics-section-3d">
        <div class="section-header-row-3d">
          <h2 class="section-title-small-3d">
            <span class="title-icon">🎯</span>
            子专题
          </h2>
          <span class="section-count-3d">{{ topics.length }} 个专题</span>
        </div>
        
        <div class="topics-grid-3d">
          <a 
            v-for="(topic, index) in topics" 
            :key="topic.title" 
            :href="topic.link"
            class="topic-card-3d"
            :style="{ '--delay': index * 0.1 + 's' }"
          >
            <div class="topic-number">0{{ index + 1 }}</div>
            <div class="topic-content">
              <div class="topic-icon-wrapper-3d">
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
            <div class="topic-glow-3d"></div>
          </a>
        </div>
      </section>

      <!-- Recent Articles -->
      <section class="articles-section-3d">
        <div class="section-header-row-3d">
          <h2 class="section-title-small-3d">
            <span class="title-icon">📄</span>
            核心文章
          </h2>
          <a href="./rl-math-principle/" class="view-all-3d">
            查看全部
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
        
        <div class="articles-list-3d">
          <a 
            v-for="(article, index) in articles" 
            :key="article.title" 
            :href="article.link"
            class="article-card-3d"
            :style="{ '--delay': index * 0.05 + 's' }"
          >
            <div class="article-marker-3d" :class="article.badgeClass"></div>
            <div class="article-content">
              <span class="article-badge-3d" :class="article.badgeClass">{{ article.tag }}</span>
              <h4 class="article-title">{{ article.title }}</h4>
              <p class="article-excerpt">{{ article.excerpt }}</p>
              <div class="article-path-3d">
                <span class="path-icon">📁</span>
                {{ article.path }}
              </div>
            </div>
            <div class="article-arrow-3d">
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
.knowledge-container-3d {
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
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%);
  top: 10%;
  left: 20%;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.12), transparent 70%);
  top: 50%;
  right: 10%;
  animation-delay: -7s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.1), transparent 70%);
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
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
  border-radius: 32px;
  overflow: hidden;
  text-align: center;
  box-shadow: 
    0 25px 50px -12px rgba(76, 29, 149, 0.4),
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
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 50px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.badge-icon {
  font-size: 16px;
}

.badge-text {
  font-size: 14px;
  font-weight: 700;
  color: #c4b5fd;
  letter-spacing: 0.5px;
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  letter-spacing: -2px;
  background: linear-gradient(to right, #ffffff, #ddd6fe, #c4b5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 10px rgba(139, 92, 246, 0.3));
}

.hero-desc {
  font-size: 18px;
  color: #a5b4fc;
  max-width: 500px;
  margin: 0 auto 40px;
  line-height: 1.7;
}

/* 3D Stats */
.hero-stats-3d {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
}

.stat-item-3d {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 32px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}

.stat-item-3d:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.stat-value {
  font-size: 40px;
  font-weight: 800;
  color: white;
  line-height: 1;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
}

.stat-label {
  font-size: 14px;
  color: #818cf8;
  font-weight: 600;
}

.stat-divider-3d {
  width: 1px;
  height: 50px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}

/* Hero Grid */
.hero-grid-3d {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  opacity: 0.05;
  pointer-events: none;
}

.grid-item {
  background: white;
  border-radius: 2px;
}

/* Main Content */
.knowledge-main-3d {
  display: flex;
  flex-direction: column;
  gap: 64px;
}

/* Section Headers */
.section-header-3d {
  text-align: center;
  margin-bottom: 40px;
}

.section-label-3d {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: linear-gradient(145deg, #ede9fe, #ddd6fe);
  color: #6d28d9;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
}

.label-icon {
  font-size: 14px;
}

.section-title {
  font-size: 36px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.section-desc {
  font-size: 16px;
  color: #64748b;
  max-width: 500px;
  margin: 0 auto;
}

.section-header-row-3d {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.section-title-small-3d {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.title-icon {
  font-size: 24px;
}

.section-count-3d {
  padding: 8px 16px;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border-radius: 12px;
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
}

.view-all-3d {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(145deg, #ede9fe, #ddd6fe);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #6d28d9;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
}

.view-all-3d:hover {
  transform: translateX(4px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.25);
}

.view-all-3d svg {
  width: 16px;
  height: 16px;
}

/* 3D Featured Card */
.featured-card-3d {
  position: relative;
  display: flex;
  align-items: center;
  gap: 48px;
  padding: 48px;
  background: linear-gradient(145deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%);
  border: 2px solid rgba(139, 92, 246, 0.2);
  border-radius: 28px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 20px rgba(139, 92, 246, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  transform-style: preserve-3d;
}

.featured-card-3d:hover {
  border-color: rgba(139, 92, 246, 0.4);
  transform: translateY(-8px) rotateX(2deg);
  box-shadow: 
    0 30px 60px -12px rgba(139, 92, 246, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
}

.featured-visual-3d {
  position: relative;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.visual-icon {
  font-size: 56px;
  z-index: 2;
  animation: float-icon 3s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.3));
}

@keyframes float-icon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.visual-ring {
  position: absolute;
  border: 2px solid #d8b4fe;
  border-radius: 50%;
  animation: pulse-ring-3d 2s ease-out infinite;
}

.ring-1 {
  width: 110px;
  height: 110px;
}

.ring-2 {
  width: 150px;
  height: 150px;
  animation-delay: 0.5s;
}

@keyframes pulse-ring-3d {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

.featured-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

.featured-content h3 {
  font-size: 28px;
  font-weight: 800;
  color: #581c87;
  margin: 0 0 14px 0;
}

.featured-content p {
  font-size: 16px;
  color: #7e22ce;
  margin: 0 0 28px 0;
  line-height: 1.7;
  opacity: 0.9;
}

.featured-meta {
  display: flex;
  align-items: center;
  gap: 28px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #9333ea;
  font-weight: 600;
}

.meta-icon {
  font-size: 16px;
}

.meta-arrow-3d {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  padding: 14px 28px;
  background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
  color: white;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(147, 51, 234, 0.4);
}

.featured-card-3d:hover .meta-arrow-3d {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  box-shadow: 0 8px 24px rgba(147, 51, 234, 0.5);
  gap: 16px;
}

.meta-arrow-3d svg {
  width: 18px;
  height: 18px;
}

.featured-bg-3d {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

/* 3D Topics Grid */
.topics-grid-3d {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.topic-card-3d {
  position: relative;
  display: flex;
  gap: 24px;
  padding: 32px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 24px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: card-fade-in 0.6s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateY(20px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
}

@keyframes card-fade-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.topic-card-3d:hover {
  border-color: rgba(139, 92, 246, 0.3);
  transform: translateY(-6px) rotateX(3deg);
  box-shadow: 
    0 20px 40px -12px rgba(139, 92, 246, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
}

.topic-number {
  font-size: 52px;
  font-weight: 900;
  color: rgba(139, 92, 246, 0.1);
  line-height: 1;
  flex-shrink: 0;
}

.topic-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.topic-icon-wrapper-3d {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
  transition: all 0.3s ease;
}

.topic-card-3d:hover .topic-icon-wrapper-3d {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.2);
}

.topic-icon {
  font-size: 26px;
}

.topic-title {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.topic-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 18px 0;
  line-height: 1.6;
  flex: 1;
}

.topic-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topic-count {
  font-size: 13px;
  color: #7c3aed;
  font-weight: 700;
  padding: 6px 12px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 20px;
}

.topic-arrow {
  width: 22px;
  height: 22px;
  color: #c084fc;
  transition: all 0.3s ease;
}

.topic-card-3d:hover .topic-arrow {
  color: #7c3aed;
  transform: translateX(6px);
}

.topic-glow-3d {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.topic-card-3d:hover .topic-glow-3d {
  opacity: 1;
}

/* 3D Articles List */
.articles-list-3d {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.article-card-3d {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px 28px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 18px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: card-fade-in 0.5s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateY(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.article-card-3d:hover {
  border-color: rgba(139, 92, 246, 0.3);
  background: linear-gradient(145deg, #faf5ff, #f3e8ff);
  transform: translateX(8px);
  box-shadow: 0 12px 30px rgba(139, 92, 246, 0.15);
}

.article-marker-3d {
  width: 4px;
  height: 50px;
  border-radius: 2px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.article-marker-3d.theory { 
  background: linear-gradient(180deg, #8b5cf6, #a78bfa);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}
.article-marker-3d.code { 
  background: linear-gradient(180deg, #3b82f6, #60a5fa);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
.article-marker-3d.practice { 
  background: linear-gradient(180deg, #10b981, #34d399);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.article-content {
  flex: 1;
}

.article-badge-3d {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.article-badge-3d.theory {
  background: linear-gradient(145deg, #ede9fe, #ddd6fe);
  color: #6d28d9;
}

.article-badge-3d.code {
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
}

.article-badge-3d.practice {
  background: linear-gradient(145deg, #d1fae5, #a7f3d0);
  color: #047857;
}

.article-title {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.article-card-3d:hover .article-title {
  color: #6d28d9;
}

.article-excerpt {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 10px 0;
  line-height: 1.6;
}

.article-path-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
}

.path-icon {
  font-size: 12px;
}

.article-arrow-3d {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border-radius: 12px;
  color: #94a3b8;
  transition: all 0.3s ease;
}

.article-arrow-3d svg {
  width: 20px;
  height: 20px;
}

.article-card-3d:hover .article-arrow-3d {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  transform: translateX(4px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .knowledge-container-3d {
    padding: 80px 16px 60px;
  }
  
  .hero-3d {
    padding: 40px 24px;
    border-radius: 24px;
  }
  
  .hero-title {
    font-size: 40px;
  }
  
  .hero-stats-3d {
    flex-direction: column;
    gap: 16px;
  }
  
  .stat-divider-3d {
    display: none;
  }
  
  .stat-value {
    font-size: 32px;
  }
  
  .featured-card-3d {
    flex-direction: column;
    text-align: center;
    padding: 32px 24px;
  }
  
  .featured-visual-3d {
    width: 120px;
    height: 120px;
  }
  
  .featured-meta {
    flex-direction: column;
    gap: 14px;
  }
  
  .meta-arrow-3d {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
  
  .topics-grid-3d {
    grid-template-columns: 1fr;
  }
  
  .topic-card-3d {
    padding: 24px;
  }
  
  .article-card-3d {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }
  
  .article-marker-3d {
    width: 50px;
    height: 4px;
  }
  
  .article-arrow-3d {
    align-self: flex-end;
  }
}
</style>
