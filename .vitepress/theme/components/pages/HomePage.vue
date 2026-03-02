<template>
  <div class="home-page-liquid">
    <!-- 环境光球 -->
    <div class="lg-ambient">
      <div class="lg-ambient-orb"></div>
      <div class="lg-ambient-orb"></div>
      <div class="lg-ambient-orb"></div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-badge lg-glass lg-hover-indent">
          <span class="badge-icon">🚀</span>
          <span class="badge-text">数字孪生级知识管理系统</span>
        </div>
        <h1 class="hero-title">
          <span class="gradient-text">MetaUniverse</span>
          <span class="title-secondary">Blog</span>
        </h1>
        <p class="hero-desc">构建你的第二大脑，让知识流动起来</p>
        
        <div class="hero-actions">
          <a href="/sections/knowledge/rl-math-principle/" class="btn-hero-primary lg-glass lg-sheen">
            <span>开始探索</span>
            <span class="arrow">→</span>
          </a>
          <a href="/sections/about/" class="btn-hero-secondary lg-glass lg-hover-indent">关于作者</a>
        </div>
        
        <div class="hero-stats lg-stagger">
          <div class="stat-card lg-glass lg-glass-alive lg-hover-indent">
            <span class="stat-num">200+</span>
            <span class="stat-label">知识节点</span>
            <!-- 气泡 -->
            <div class="lg-bubbles">
              <div class="lg-bubble"></div>
              <div class="lg-bubble"></div>
              <div class="lg-bubble"></div>
            </div>
          </div>
          <div class="stat-card lg-glass lg-glass-alive lg-hover-indent">
            <span class="stat-num">20+</span>
            <span class="stat-label">技术文章</span>
            <div class="lg-bubbles">
              <div class="lg-bubble"></div>
              <div class="lg-bubble"></div>
            </div>
          </div>
          <div class="stat-card lg-glass lg-glass-alive lg-hover-indent">
            <span class="stat-num">10K+</span>
            <span class="stat-label">总阅读</span>
            <div class="lg-bubbles">
              <div class="lg-bubble"></div>
              <div class="lg-bubble"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="features-section">
      <h2 class="section-title">核心模块</h2>
      <div class="features-grid lg-stagger">
        <a 
          v-for="(feature, index) in features" 
          :key="feature.title"
          :href="feature.link"
          class="feature-card lg-glass lg-glass-alive lg-refraction lg-caustic-shadow lg-hover-indent lg-sheen lg-enter"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="feature-icon-wrap" :class="feature.colorClass">
            <span class="feature-icon-emoji">{{ feature.icon }}</span>
          </div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
          <span class="feature-link" :class="feature.colorClass">
            {{ feature.linkText }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <!-- 微观气泡 -->
          <div class="lg-bubbles">
            <div class="lg-bubble"></div>
            <div class="lg-bubble"></div>
            <div class="lg-bubble"></div>
          </div>
        </a>
      </div>
    </section>

    <!-- Recent Updates -->
    <section class="recent-section">
      <h2 class="section-title">最近更新</h2>
      <div class="recent-list lg-stagger">
        <a 
          v-for="(item, index) in recentItems" 
          :key="item.title" 
          :href="item.link" 
          class="recent-card lg-glass lg-hover-indent lg-sheen lg-enter"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="recent-tag" :class="item.tagClass">{{ item.tag }}</div>
          <div class="recent-content">
            <h4>{{ item.title }}</h4>
            <p>{{ item.desc }}</p>
          </div>
          <span class="recent-date">{{ item.date }}</span>
          <div class="recent-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const features = [
  {
    icon: '🧠',
    title: '知识库',
    desc: '强化学习数学原理、系统化知识体系，深度剖析技术原理',
    link: '/sections/knowledge/rl-math-principle/',
    linkText: '探索知识',
    colorClass: 'purple'
  },
  {
    icon: '📝',
    title: '文章列表',
    desc: 'AI 论文阅读、技术博客、学习笔记，记录成长的每一步',
    link: '/sections/posts/ai-paper-reading-2024.html',
    linkText: '阅读文章',
    colorClass: 'blue'
  },
  {
    icon: '🎨',
    title: '公开资源',
    desc: '精选开源项目与工具，提升开发效率',
    link: '/sections/resources/',
    linkText: '查看资源',
    colorClass: 'mint'
  },
  {
    icon: '👋',
    title: '关于我',
    desc: '全栈开发者，技术爱好者，期待与你交流',
    link: '/sections/about/',
    linkText: '了解更多',
    colorClass: 'gold'
  }
]

const recentItems = [
  {
    title: 'AI 论文阅读 2024',
    desc: '精选2024年人工智能领域的重要论文，深入解读核心思想与创新点...',
    link: '/sections/posts/ai-paper-reading-2024.html',
    tag: 'AI',
    tagClass: 'ai',
    date: '2024-12-01'
  },
  {
    title: '强化学习：从游戏到现实',
    desc: '探讨强化学习技术在游戏、机器人、推荐系统等领域的应用...',
    link: '/sections/posts/rl-from-game-to-reality.html',
    tag: '强化学习',
    tagClass: 'ai',
    date: '2024-11-15'
  },
  {
    title: '强化学习数学原理 - 测度论基础',
    desc: '从测度论的角度理解强化学习，建立严格的数学框架...',
    link: '/sections/knowledge/rl-math-principle/00_Foundations/01_Theory_Derivation.html',
    tag: '数学',
    tagClass: 'math',
    date: '2024-10-20'
  }
]
</script>

<style scoped>
.home-page-liquid {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  overflow: hidden;
}

/* ── Hero Section ── */
.hero-section {
  position: relative;
  padding: 80px 0 60px;
  text-align: center;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  border-radius: 50px;
  margin-bottom: 28px;
  animation: lg-materialize 0.6s var(--lg-ease-viscous) both;
}

.badge-icon {
  font-size: 18px;
}

.badge-text {
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, #8b5cf6, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
}

.hero-title {
  font-size: 64px;
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 20px 0;
  animation: lg-materialize 0.6s var(--lg-ease-viscous) 0.1s both;
}

.gradient-text {
  background: linear-gradient(135deg, #8b5cf6 0%, #60a5fa 50%, #34d399 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.3));
}

.title-secondary {
  color: var(--vp-c-text-1);
  margin-left: 12px;
}

.hero-desc {
  font-size: 20px;
  color: var(--vp-c-text-2);
  margin-bottom: 40px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  animation: lg-materialize 0.6s var(--lg-ease-viscous) 0.2s both;
  font-weight: 500;
}

/* ── Hero Buttons ── */
.hero-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 48px;
  animation: lg-materialize 0.6s var(--lg-ease-viscous) 0.3s both;
}

.btn-hero-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.60), rgba(96, 165, 250, 0.50)) !important;
  color: white;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid rgba(139, 92, 246, 0.30) !important;
  box-shadow: 0 8px 30px rgba(139, 92, 246, 0.25);
  transition:
    transform      500ms var(--lg-ease-viscous),
    box-shadow     500ms var(--lg-ease-viscous),
    background     500ms var(--lg-ease-viscous) !important;
}

.btn-hero-primary:hover {
  transform: scale(0.985) translateY(1px);
  box-shadow:
    0 4px 20px rgba(139, 92, 246, 0.35),
    inset 0 2px 6px rgba(0, 0, 0, 0.08);
}

.btn-hero-primary .arrow {
  transition: transform 500ms var(--lg-ease-viscous);
}

.btn-hero-primary:hover .arrow {
  transform: translateX(6px);
}

.btn-hero-secondary {
  display: inline-flex;
  align-items: center;
  padding: 16px 32px;
  color: var(--vp-c-text-2);
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition:
    transform      500ms var(--lg-ease-viscous),
    box-shadow     500ms var(--lg-ease-viscous),
    background     500ms var(--lg-ease-viscous),
    border-color   500ms var(--lg-ease-viscous);
}

.btn-hero-secondary:hover {
  color: var(--vp-c-brand);
}

/* ── Stats ── */
.hero-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  animation: lg-materialize 0.6s var(--lg-ease-viscous) 0.4s both;
}

.stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  border-radius: var(--lg-radius-lg);
  min-width: 120px;
  overflow: hidden;
}

.stat-num {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #8b5cf6 0%, #60a5fa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 14px;
  color: var(--vp-c-text-3);
  font-weight: 600;
}

/* ── Section Titles ── */
.section-title {
  font-size: 32px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 48px;
  color: var(--vp-c-text-1);
  animation: lg-materialize 0.6s var(--lg-ease-viscous) both;
}

/* ── Features Grid ── */
.features-section {
  padding: 60px 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.feature-card {
  position: relative;
  padding: 32px;
  border-radius: var(--lg-radius-lg) !important;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
}

.feature-icon-wrap {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--lg-radius-md);
  margin-bottom: 20px;
  transition:
    transform      500ms var(--lg-ease-viscous),
    box-shadow     500ms var(--lg-ease-viscous);
}

.feature-icon-wrap.purple {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05));
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.08);
}
.feature-icon-wrap.blue {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(96, 165, 250, 0.05));
  box-shadow: 0 0 20px rgba(96, 165, 250, 0.08);
}
.feature-icon-wrap.mint {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(52, 211, 153, 0.05));
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.08);
}
.feature-icon-wrap.gold {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05));
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.08);
}

.feature-card:hover .feature-icon-wrap {
  transform: scale(1.08) rotate(-3deg);
}

.feature-icon-emoji {
  font-size: 32px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 12px 0;
  color: var(--vp-c-text-1);
}

.feature-card p {
  font-size: 15px;
  color: var(--vp-c-text-2);
  margin: 0 0 20px 0;
  line-height: 1.7;
}

.feature-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  transition: gap 500ms var(--lg-ease-viscous);
}

.feature-link.purple { color: #a78bfa; }
.feature-link.blue   { color: #60a5fa; }
.feature-link.mint   { color: #34d399; }
.feature-link.gold   { color: #fbbf24; }

.feature-card:hover .feature-link {
  gap: 12px;
}

.feature-link svg {
  width: 16px;
  height: 16px;
  transition: transform 500ms var(--lg-ease-viscous);
}

.feature-card:hover .feature-link svg {
  transform: translateX(4px);
}

/* ── Recent Updates ── */
.recent-section {
  padding: 40px 0;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recent-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  border-radius: var(--lg-radius-lg) !important;
  text-decoration: none;
  color: inherit;
}

.recent-card:hover .recent-arrow {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.50), rgba(96, 165, 250, 0.40));
  color: white;
  transform: translateX(4px);
}

.recent-tag {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.recent-tag.ai {
  background: linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05));
  color: #a78bfa;
}

.recent-tag.math {
  background: linear-gradient(145deg, rgba(96, 165, 250, 0.15), rgba(96, 165, 250, 0.05));
  color: #60a5fa;
}

.recent-content {
  flex: 1;
}

.recent-content h4 {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: var(--vp-c-text-1);
}

.recent-content p {
  font-size: 14px;
  color: var(--vp-c-text-3);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-date {
  font-size: 13px;
  color: var(--vp-c-text-3);
  font-weight: 600;
}

.recent-arrow {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lg-frost);
  border-radius: 10px;
  color: var(--vp-c-text-3);
  transition:
    all 500ms var(--lg-ease-viscous);
}

.recent-arrow svg {
  width: 18px;
  height: 18px;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero-title {
    font-size: 42px;
  }
  
  .hero-stats {
    flex-direction: column;
    gap: 16px;
  }
  
  .stat-card {
    width: 100%;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .recent-card {
    flex-wrap: wrap;
  }
  
  .recent-content p {
    width: 100%;
  }
  
  .recent-date {
    order: 2;
  }
}
</style>
