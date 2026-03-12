<template>
  <div class="knowledge-page">
    <!-- Hero Section — 极简 -->
    <section class="hero-section fade-up">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-star">✦</span>
          <span class="badge-text">知识体系</span>
        </div>
        <h1 class="sr-title">
          <span class="title-main">知识</span>
          <span class="title-accent">库</span>
        </h1>
        <p class="sr-subtitle hero-desc">
          系统化的知识整理，从理论到实践，构建完整的学习路径
        </p>

        <!-- Stats -->
        <div class="hero-stats">
          <div class="stat-card glass-card tilt-card scale-in" style="transition-delay: 0.1s">
            <span class="stat-num">{{ topics.length + 1 }}</span>
            <span class="stat-label">核心专题</span>
          </div>
          <div class="stat-card glass-card tilt-card scale-in" style="transition-delay: 0.2s">
            <span class="stat-num">{{ articles.length }}</span>
            <span class="stat-label">知识节点</span>
          </div>
          <div class="stat-card glass-card tilt-card scale-in" style="transition-delay: 0.3s">
            <span class="stat-num">∞</span>
            <span class="stat-label">探索深度</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <main class="knowledge-main">
      <!-- Featured Topic -->
      <section class="featured-section fade-up">
        <div class="section-header">
          <span class="sr-label">⭐ 核心专题</span>
          <h2 class="section-title">强化学习数学原理</h2>
          <p class="section-desc sr-body">从测度论、概率论的角度深入理解强化学习，建立严格的数学框架</p>
        </div>
        
        <a href="./rl-math-principle/" class="featured-card glass-card glass-card-hover tilt-card magnetic-btn">
          <div class="featured-visual">
            <div class="visual-icon">📐</div>
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
              <span class="meta-arrow star-btn">
                开始探索
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </div>
          </div>
        </a>
      </section>

      <!-- Sub Topics Grid -->
      <section class="topics-section fade-up">
        <div class="section-header-row">
          <h2 class="section-title-sm">
            <span class="title-icon">🎯</span>
            子专题
          </h2>
          <span class="sr-tag">{{ topics.length }} 个专题</span>
        </div>
        
        <div class="topics-grid sr-grid sr-grid-3">
          <a 
            v-for="(topic, index) in topics" 
            :key="topic.title" 
            :href="topic.link"
            class="topic-card glass-card glass-card-hover tilt-card fade-up"
            :style="{ transitionDelay: `${index * 0.1}s` }"
          >
            <div class="topic-number">0{{ index + 1 }}</div>
            <div class="topic-content">
              <div class="topic-icon-wrapper">
                <span class="topic-icon">{{ topic.icon }}</span>
              </div>
              <h4 class="topic-title">{{ topic.title }}</h4>
              <p class="topic-desc">{{ topic.desc }}</p>
              <div class="topic-footer">
                <span class="sr-tag sr-tag-morandi-purple">{{ topic.count }} 篇文章</span>
                <svg class="topic-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </a>
        </div>
      </section>

      <!-- Recent Articles -->
      <section class="articles-section fade-up">
        <div class="section-header-row">
          <h2 class="section-title-sm">
            <span class="title-icon">📄</span>
            核心文章
          </h2>
          <a href="./rl-math-principle/" class="star-btn magnetic-btn">
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
            class="article-card glass-card tilt-card micro-interaction fade-up"
            :style="{ transitionDelay: `${index * 60}ms` }"
          >
            <div class="article-marker" :class="article.badgeClass"></div>
            <div class="article-content">
              <span class="sr-tag" :class="'sr-tag-morandi-' + tagColorMap[article.badgeClass]">{{ article.tag }}</span>
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

      <!-- Learning Path -->
      <section class="learning-path-section fade-up">
        <div class="section-header-row">
          <h2 class="section-title-sm">
            <span class="title-icon">🎯</span>
            学习路径
          </h2>
        </div>
        
        <div class="learning-path-timeline">
          <div 
            v-for="(step, index) in learningPath" 
            :key="step.title"
            class="path-step glass-card fade-up"
            :style="{ transitionDelay: `${index * 100}ms` }"
          >
            <div class="path-number">{{ index + 1 }}</div>
            <div class="path-content">
              <h4 class="path-title">{{ step.title }}</h4>
              <p class="path-desc">{{ step.desc }}</p>
              <div class="path-tags">
                <span v-for="tag in step.tags" :key="tag" class="path-tag">{{ tag }}</span>
              </div>
            </div>
            <a :href="step.link" class="path-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      <!-- Related Resources -->
      <section class="related-resources-section fade-up">
        <div class="section-header-row">
          <h2 class="section-title-sm">
            <span class="title-icon">🔗</span>
            相关资源
          </h2>
        </div>
        
        <div class="resources-cards">
          <a 
            v-for="(resource, index) in relatedResources" 
            :key="resource.title" 
            :href="resource.link"
            class="resource-card-mini glass-card glass-card-hover tilt-card fade-up"
            :style="{ transitionDelay: `${index * 80}ms` }"
          >
            <div class="resource-icon-mini">{{ resource.icon }}</div>
            <div class="resource-info-mini">
              <h4>{{ resource.title }}</h4>
              <p>{{ resource.desc }}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick, ref, computed } from 'vue'

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

const tagColorMap: Record<string, string> = {
  theory: 'purple',
  code: 'blue',
  practice: 'green'
}

const topics: Topic[] = [
  {
    icon: '📊',
    title: 'Foundations',
    desc: '测度论基础、理论推导、Python实现',
    count: 4,
    link: './rl-math-principle/00_Foundations/01_Theory_Derivation'
  },
  {
    icon: '🎯',
    title: 'Bellman Equation',
    desc: '贝尔曼最优性原理与动态规划',
    count: 4,
    link: './rl-math-principle/01_Bellman_Equation/01_Theory_Derivation'
  },
  {
    icon: '🚀',
    title: 'Policy Gradient',
    desc: '策略梯度方法与优化算法',
    count: 4,
    link: './rl-math-principle/02_Policy_Gradient/01_Theory_Derivation'
  }
]

const articles: Article[] = [
  {
    title: '测度论与概率空间基础',
    tag: '理论推导',
    badgeClass: 'theory',
    excerpt: '建立严格的数学框架来描述随机性，深入理解概率的严格定义与性质',
    link: './rl-math-principle/00_Foundations/01_Theory_Derivation',
    path: '00_Foundations / 01_Theory_Derivation'
  },
  {
    title: 'Python 实现代码',
    tag: '代码实现',
    badgeClass: 'code',
    excerpt: '理论推导对应的 Python 代码实现，包含完整的实验和可视化',
    link: './rl-math-principle/00_Foundations/02_Implementation.py',
    path: '00_Foundations / 02_Implementation.py'
  },
  {
    title: '理论与实践联系',
    tag: '实践联系',
    badgeClass: 'practice',
    excerpt: '将理论推导与代码实现联系起来，深入理解每个公式的实际意义',
    link: './rl-math-principle/00_Foundations/03_Theory_Practise_Link',
    path: '00_Foundations / 03_Theory_Practise_Link'
  },
  {
    title: '贝尔曼方程理论推导',
    tag: '理论推导',
    badgeClass: 'theory',
    excerpt: '贝尔曼最优性方程的严格数学推导过程，理解动态规划的核心思想',
    link: './rl-math-principle/01_Bellman_Equation/01_Theory_Derivation',
    path: '01_Bellman_Equation / 01_Theory_Derivation'
  }
]

// Learning Path Data
const learningPath = [
  {
    title: '测度论基础',
    desc: '从集合论出发，建立严格的测度与积分理论，为概率论和随机过程奠定基础',
    tags: ['测度论', '概率论', '数学基础'],
    link: './rl-math-principle/00_Foundations/01_Theory_Derivation'
  },
  {
    title: '概率与随机过程',
    desc: '掌握条件期望、鞅论等核心概念，理解随机过程的演化规律',
    tags: ['随机过程', '鞅论', '条件期望'],
    link: './rl-math-principle/00_Foundations/02_Implementation.py'
  },
  {
    title: '贝尔曼方程理论',
    desc: '深入理解动态规划与最优控制的核心——贝尔曼最优性原理',
    tags: ['动态规划', '最优控制', '贝尔曼方程'],
    link: './rl-math-principle/01_Bellman_Equation/01_Theory_Derivation'
  },
  {
    title: '策略梯度方法',
    desc: '从 REINFORCE 到 PPO，掌握策略优化的核心算法与数学推导',
    tags: ['策略梯度', 'PPO', 'TRPO'],
    link: './rl-math-principle/02_Policy_Gradient/01_Theory_Derivation'
  }
]

// Related Resources
const relatedResources = [
  {
    icon: '📄',
    title: 'AI 论文阅读',
    desc: '精选 AI 领域重要论文解读',
    link: '/sections/posts/ai-paper-reading-2024/'
  },
  {
    icon: '🎮',
    title: 'RL 应用案例',
    desc: '强化学习在游戏与机器人中的应用',
    link: '/sections/posts/rl-from-game-to-reality/'
  },
  {
    icon: '💻',
    title: '代码实现',
    desc: '算法对应的 PyTorch 实现',
    link: './rl-math-principle/00_Foundations/02_Implementation.py'
  },
  {
    icon: '📊',
    title: '可视化工具',
    desc: '交互式学习工具与可视化',
    link: '/sections/resources/'
  }
]

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
   Knowledge Page — Star River Style
   ═══════════════════════════════════════════════════════════════════════════ */

.knowledge-page {
  position: relative;
  width: 95%;
  max-width: 1800px;
  margin: 0 auto;
  padding: 80px 24px;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Floating Shapes - Creative Decoration */
.floating-shapes {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.shape {
  position: absolute;
  font-size: 24px;
  color: var(--sr-accent-star);
  opacity: 0.08;
  animation: float-shape 20s ease-in-out infinite;
}

.shape-1 { top: 10%; left: 5%; animation-delay: 0s; }
.shape-2 { top: 30%; right: 8%; animation-delay: -4s; font-size: 32px; }
.shape-3 { top: 60%; left: 3%; animation-delay: -8s; font-size: 20px; }
.shape-4 { top: 80%; right: 5%; animation-delay: -12s; font-size: 28px; }
.shape-5 { top: 45%; left: 8%; animation-delay: -16s; font-size: 36px; }

@keyframes float-shape {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.08;
  }
  25% {
    transform: translateY(-30px) rotate(90deg);
    opacity: 0.12;
  }
  50% {
    transform: translateY(-15px) rotate(180deg);
    opacity: 0.06;
  }
  75% {
    transform: translateY(-40px) rotate(270deg);
    opacity: 0.1;
  }
}

/* Background Grid */
.bg-grid {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(184, 160, 144, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(184, 160, 144, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}

/* Hero */
.hero-section {
  text-align: center;
  padding: 40px 0 64px;
  position: relative;
  z-index: 1;
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
.title-accent { color: var(--sr-morandi-purple); font-weight: 400; }
.hero-desc { max-width: 500px; margin: 0 auto 48px; }

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

.stat-num { font-size: 28px; font-weight: 300; letter-spacing: -0.02em; color: var(--sr-text-primary); }
.stat-label { font-size: 12px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sr-text-muted); }

/* Main Content */
.knowledge-main {
  display: flex;
  flex-direction: column;
  gap: 80px;
  position: relative;
  z-index: 1;
}

/* Section Headers */
.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-family: var(--sr-font-primary);
  font-size: 28px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 12px 0;
  letter-spacing: -0.02em;
}

.section-desc {
  max-width: 500px;
  margin: 0 auto;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
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

.title-icon { font-size: 20px; }

/* Featured Card */
.featured-card {
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 40px !important;
  text-decoration: none;
  color: inherit;
}

.featured-visual {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--sr-glass-bg);
  border-radius: var(--sr-radius-lg);
  border: 1px solid var(--sr-glass-border);
}

.visual-icon {
  font-size: 48px;
  animation: icon-breathe 4s ease-in-out infinite;
}

@keyframes icon-breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.featured-content { flex: 1; }

.featured-content h3 {
  font-family: var(--sr-font-primary);
  font-size: 22px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 12px;
}

.featured-content p {
  font-size: 15px;
  color: var(--sr-text-secondary);
  margin: 0 0 24px;
  line-height: 1.7;
}

.featured-meta {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--sr-text-muted);
  font-weight: 500;
}

.meta-icon { font-size: 14px; }

.meta-arrow {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px !important;
  font-size: 13px !important;
}

.meta-arrow svg { width: 16px; height: 16px; }

/* Topics Grid */
.topic-card {
  display: flex;
  gap: 20px;
  padding: 28px !important;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
}

.topic-number {
  font-size: 48px;
  font-weight: 200;
  color: var(--sr-accent-star);
  line-height: 1;
  flex-shrink: 0;
  opacity: 0.3;
  transition: all 0.4s var(--sr-spring-bounce);
}

.topic-card:hover .topic-number {
  opacity: 0.6;
  transform: scale(1.1);
}

.topic-content { flex: 1; display: flex; flex-direction: column; }

.topic-icon-wrapper {
  width: 44px;
  height: 44px;
  background: var(--sr-glass-bg);
  border-radius: var(--sr-radius-md);
  border: 1px solid var(--sr-glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.topic-card:hover .topic-icon-wrapper { transform: scale(1.08); }
.topic-icon { font-size: 22px; }

.topic-title {
  font-family: var(--sr-font-primary);
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 6px;
}

.topic-desc {
  font-size: 13px;
  color: var(--sr-text-secondary);
  margin: 0 0 16px;
  line-height: 1.6;
  flex: 1;
}

.topic-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topic-arrow {
  width: 18px;
  height: 18px;
  color: var(--sr-text-tertiary);
  transition: all 0.3s var(--sr-spring-bounce);
}

.topic-card:hover .topic-arrow {
  color: var(--sr-accent-star);
  transform: translateX(4px);
}

/* Articles List - Grid Layout */
.articles-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}

.article-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px !important;
  text-decoration: none;
  color: inherit;
  border-radius: var(--sr-radius-md) !important;
}

.article-marker {
  width: 3px;
  height: 44px;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0.6;
}

.article-marker.theory { background: var(--sr-morandi-purple); }
.article-marker.code { background: var(--sr-morandi-blue); }
.article-marker.practice { background: var(--sr-morandi-green); }

.article-content { flex: 1; }

.article-content .sr-tag { margin-bottom: 8px; }

.article-title {
  font-family: var(--sr-font-primary);
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 6px;
  transition: color 0.2s ease;
}

.article-card:hover .article-title { color: var(--sr-accent-star); }

.article-excerpt {
  font-size: 13px;
  color: var(--sr-text-secondary);
  margin: 0 0 8px;
  line-height: 1.6;
}

.article-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--sr-text-muted);
  font-family: 'JetBrains Mono', monospace;
}

.article-arrow {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border-radius: var(--sr-radius-sm);
  color: var(--sr-text-tertiary);
  flex-shrink: 0;
  transition: all 0.3s var(--sr-spring-bounce);
}

.article-arrow svg { width: 16px; height: 16px; }

.article-card:hover .article-arrow {
  color: var(--sr-accent-star);
  transform: translateX(3px);
  background: var(--sr-glass-bg-hover);
}

/* Learning Path Section */
.learning-path-section {
  margin-top: 60px;
}

.learning-path-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.path-step {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  position: relative;
}

.path-number {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border: 2px solid var(--sr-accent-star);
  border-radius: 50%;
  font-family: var(--sr-font-primary);
  font-size: 18px;
  font-weight: 600;
  color: var(--sr-accent-star);
  flex-shrink: 0;
}

.path-content {
  flex: 1;
  min-width: 0;
}

.path-title {
  font-family: var(--sr-font-primary);
  font-size: 17px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 6px;
}

.path-desc {
  font-size: 14px;
  color: var(--sr-text-secondary);
  line-height: 1.6;
  margin: 0 0 10px;
}

.path-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.path-tag {
  font-size: 11px;
  padding: 3px 10px;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-sm);
  color: var(--sr-text-muted);
}

.path-link {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: 50%;
  color: var(--sr-text-muted);
  flex-shrink: 0;
  transition: all 0.3s var(--sr-spring-bounce);
}

.path-link svg { width: 16px; height: 16px; }

.path-step:hover .path-link {
  color: var(--sr-accent-star);
  border-color: var(--sr-accent-star);
  transform: translateX(3px);
}

/* Related Resources Section */
.related-resources-section {
  margin-top: 60px;
}

.resources-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.resource-card-mini {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  text-decoration: none;
  color: inherit;
}

.resource-icon-mini {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-md);
  font-size: 18px;
  flex-shrink: 0;
}

.resource-info-mini {
  flex: 1;
  min-width: 0;
}

.resource-info-mini h4 {
  font-family: var(--sr-font-primary);
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 3px;
}

.resource-info-mini p {
  font-size: 12px;
  color: var(--sr-text-muted);
  margin: 0;
}

.resource-card-mini svg {
  width: 14px;
  height: 14px;
  color: var(--sr-text-muted);
  flex-shrink: 0;
  transition: all 0.3s var(--sr-spring-bounce);
}

.resource-card-mini:hover svg {
  color: var(--sr-accent-star);
  transform: translateX(3px);
}

/* Responsive */
@media (max-width: 768px) {
  .knowledge-page { padding: 60px 16px 60px; }
  .hero-stats { flex-direction: column; align-items: center; }
  .featured-card { flex-direction: column; text-align: center; padding: 28px !important; }
  .featured-meta { justify-content: center; }
  .meta-arrow { margin-left: 0; width: 100%; justify-content: center; }
  .article-card { flex-direction: column; align-items: flex-start; }
  .article-marker { width: 40px; height: 3px; }
  .article-arrow { align-self: flex-end; }
  
  .path-step {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .path-link {
    align-self: flex-end;
  }
  
  .resources-cards {
    grid-template-columns: 1fr;
  }
}
</style>
