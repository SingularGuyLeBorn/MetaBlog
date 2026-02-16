<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-bg">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
      
      <div class="hero-content">
        <div class="hero-badge">🚀 数字孪生级知识管理系统</div>
        <h1 class="hero-title">
          <span class="gradient-text">MetaUniverse</span>
          <span class="title-secondary">Blog</span>
        </h1>
        <p class="hero-desc">构建你的第二大脑，让知识流动起来</p>
        
        <div class="hero-actions">
          <a href="/sections/knowledge/rl-math-principle/" class="btn-primary">
            <span>开始探索</span>
            <span class="arrow">→</span>
          </a>
          <a href="/sections/about/" class="btn-secondary">关于作者</a>
        </div>
        
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-num">200+</span>
            <span class="stat-label">知识节点</span>
          </div>
          <div class="stat">
            <span class="stat-num">20+</span>
            <span class="stat-label">技术文章</span>
          </div>
          <div class="stat">
            <span class="stat-num">10K+</span>
            <span class="stat-label">总阅读</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="features-section">
      <h2 class="section-title">核心模块</h2>
      <div class="features-grid">
        <a href="/sections/knowledge/rl-math-principle/" class="feature-card purple">
          <div class="feature-icon">🧠</div>
          <h3>知识库</h3>
          <p>强化学习数学原理、系统化知识体系，深度剖析技术原理</p>
          <span class="feature-link">探索知识 →</span>
        </a>
        
        <a href="/sections/posts/ai-paper-reading-2024.html" class="feature-card blue">
          <div class="feature-icon">📝</div>
          <h3>文章列表</h3>
          <p>AI 论文阅读、技术博客、学习笔记，记录成长的每一步</p>
          <span class="feature-link">阅读文章 →</span>
        </a>
        
        <a href="/sections/resources/" class="feature-card green">
          <div class="feature-icon">🎨</div>
          <h3>公开资源</h3>
          <p>精选开源项目与工具，提升开发效率</p>
          <span class="feature-link">查看资源 →</span>
        </a>
        
        <a href="/sections/about/" class="feature-card orange">
          <div class="feature-icon">👋</div>
          <h3>关于我</h3>
          <p>全栈开发者，技术爱好者，期待与你交流</p>
          <span class="feature-link">了解更多 →</span>
        </a>
      </div>
    </section>

    <!-- Recent Updates -->
    <section class="recent-section">
      <h2 class="section-title">最近更新</h2>
      <div class="recent-list">
        <a v-for="item in recentItems" :key="item.title" :href="item.link" class="recent-card">
          <div class="recent-tag" :class="item.tagClass">{{ item.tag }}</div>
          <h4>{{ item.title }}</h4>
          <p>{{ item.desc }}</p>
          <span class="recent-date">{{ item.date }}</span>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
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
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

.hero-section {
  position: relative;
  padding: 60px 0 50px;
  text-align: center;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
}

.orb-1 { width: 400px; height: 400px; background: linear-gradient(135deg, #667eea, #764ba2); top: -100px; right: 10%; animation: float 8s ease-in-out infinite; }
.orb-2 { width: 300px; height: 300px; background: linear-gradient(135deg, #f093fb, #f5576c); bottom: 10%; left: 10%; animation: float 10s ease-in-out infinite -2s; }
.orb-3 { width: 250px; height: 250px; background: linear-gradient(135deg, #4facfe, #00f2fe); top: 40%; left: 30%; animation: float 12s ease-in-out infinite -4s; }

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

.hero-content { position: relative; z-index: 1; }
.hero-badge { display: inline-block; padding: 8px 16px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand); border-radius: 20px; font-size: 14px; font-weight: 500; margin-bottom: 24px; }

.hero-title { font-size: 56px; font-weight: 800; line-height: 1.1; margin: 0 0 16px; }
.gradient-text { background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.title-secondary { color: var(--vp-c-text-1); }
.hero-desc { font-size: 20px; color: var(--vp-c-text-2); margin-bottom: 32px; }

.hero-actions { display: flex; gap: 16px; justify-content: center; margin-bottom: 48px; }
.btn-primary, .btn-secondary { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: 600; text-decoration: none; transition: all 0.3s; }
.btn-primary { background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%); color: white; box-shadow: 0 4px 20px rgba(var(--vp-c-brand-rgb), 0.3); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(var(--vp-c-brand-rgb), 0.4); }
.btn-primary .arrow { transition: transform 0.3s; }
.btn-primary:hover .arrow { transform: translateX(4px); }
.btn-secondary { background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); border: 1px solid var(--vp-c-divider); }
.btn-secondary:hover { border-color: var(--vp-c-brand); color: var(--vp-c-brand); }

.hero-stats { display: flex; justify-content: center; gap: 48px; }
.stat { display: flex; flex-direction: column; gap: 4px; }
.stat-num { font-size: 32px; font-weight: 700; color: var(--vp-c-brand); }
.stat-label { font-size: 14px; color: var(--vp-c-text-3); }

.features-section { padding: 50px 0; }
.section-title { font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 40px; color: var(--vp-c-text-1); }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }

.feature-card { padding: 28px; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 16px; text-decoration: none; transition: all 0.3s; }
.feature-card:hover { transform: translateY(-4px); border-color: var(--vp-c-brand); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1); }
.feature-card.purple:hover { border-color: #8b5cf6; }
.feature-card.blue:hover { border-color: #3b82f6; }
.feature-card.green:hover { border-color: #10b981; }
.feature-card.orange:hover { border-color: #f97316; }

.feature-icon { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: var(--vp-c-brand-soft); border-radius: 14px; font-size: 28px; margin-bottom: 16px; }
.feature-card h3 { font-size: 18px; font-weight: 600; color: var(--vp-c-text-1); margin: 0 0 8px; }
.feature-card p { font-size: 14px; color: var(--vp-c-text-2); line-height: 1.6; margin: 0 0 16px; }
.feature-link { font-size: 14px; font-weight: 500; color: var(--vp-c-brand); }

.recent-section { padding: 40px 0; }
.recent-list { display: flex; flex-direction: column; gap: 12px; }
.recent-card { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 12px; text-decoration: none; transition: all 0.3s; }
.recent-card:hover { border-color: var(--vp-c-brand); transform: translateX(4px); }
.recent-tag { padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; flex-shrink: 0; }
.recent-tag.ai { background: #ede9fe; color: #7c3aed; }
.recent-tag.math { background: #dbeafe; color: #2563eb; }
.recent-card h4 { font-size: 16px; font-weight: 600; color: var(--vp-c-text-1); margin: 0; flex: 1; }
.recent-card p { font-size: 14px; color: var(--vp-c-text-2); margin: 0; max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recent-date { font-size: 13px; color: var(--vp-c-text-3); flex-shrink: 0; }

@media (max-width: 768px) {
  .hero-title { font-size: 40px; }
  .hero-actions { flex-direction: column; }
  .hero-stats { gap: 24px; }
  .recent-card { flex-wrap: wrap; }
  .recent-card p { width: 100%; max-width: none; order: 3; }
  .recent-date { order: 2; }
}
</style>
