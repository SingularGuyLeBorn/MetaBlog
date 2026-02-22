<template>
  <div class="home-page-3d">
    <!-- 背景光效 -->
    <div class="ambient-light">
      <div class="light-orb orb-1"></div>
      <div class="light-orb orb-2"></div>
      <div class="light-orb orb-3"></div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section-3d">
      <div class="hero-content-3d">
        <div class="hero-badge-3d">
          <span class="badge-icon">🚀</span>
          <span class="badge-text">数字孪生级知识管理系统</span>
        </div>
        <h1 class="hero-title-3d">
          <span class="gradient-text-3d">MetaUniverse</span>
          <span class="title-secondary-3d">Blog</span>
        </h1>
        <p class="hero-desc-3d">构建你的第二大脑，让知识流动起来</p>
        
        <div class="hero-actions-3d">
          <a href="/sections/knowledge/rl-math-principle/" class="btn-primary-3d">
            <span>开始探索</span>
            <span class="arrow">→</span>
          </a>
          <a href="/sections/about/" class="btn-secondary-3d">关于作者</a>
        </div>
        
        <div class="hero-stats-3d">
          <div class="stat-3d">
            <span class="stat-num">200+</span>
            <span class="stat-label">知识节点</span>
          </div>
          <div class="stat-3d">
            <span class="stat-num">20+</span>
            <span class="stat-label">技术文章</span>
          </div>
          <div class="stat-3d">
            <span class="stat-num">10K+</span>
            <span class="stat-label">总阅读</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="features-section-3d">
      <h2 class="section-title-3d">核心模块</h2>
      <div class="features-grid-3d">
        <a 
          v-for="(feature, index) in features" 
          :key="feature.title"
          :href="feature.link"
          class="feature-card-3d"
          :class="feature.colorClass"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="feature-glow"></div>
          <div class="feature-icon-3d">{{ feature.icon }}</div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
          <span class="feature-link-3d">
            {{ feature.linkText }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </a>
      </div>
    </section>

    <!-- Recent Updates -->
    <section class="recent-section-3d">
      <h2 class="section-title-3d">最近更新</h2>
      <div class="recent-list-3d">
        <a 
          v-for="(item, index) in recentItems" 
          :key="item.title" 
          :href="item.link" 
          class="recent-card-3d"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="recent-tag-3d" :class="item.tagClass">{{ item.tag }}</div>
          <div class="recent-content">
            <h4>{{ item.title }}</h4>
            <p>{{ item.desc }}</p>
          </div>
          <span class="recent-date-3d">{{ item.date }}</span>
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
    colorClass: 'green'
  },
  {
    icon: '👋',
    title: '关于我',
    desc: '全栈开发者，技术爱好者，期待与你交流',
    link: '/sections/about/',
    linkText: '了解更多',
    colorClass: 'orange'
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
.home-page-3d {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
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
  filter: blur(100px);
  opacity: 0.4;
  animation: orb-float 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 70%);
  top: 10%;
  left: 20%;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%);
  top: 40%;
  right: 10%;
  animation-delay: -7s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.12), transparent 70%);
  bottom: 10%;
  left: 30%;
  animation-delay: -14s;
}

@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -40px) scale(1.1); }
  66% { transform: translate(-30px, 30px) scale(0.9); }
}

/* 3D Hero Section */
.hero-section-3d {
  position: relative;
  padding: 80px 0 60px;
  text-align: center;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-content-3d {
  position: relative;
  z-index: 1;
}

.hero-badge-3d {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 50px;
  margin-bottom: 28px;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
  animation: fade-in-down 0.6s ease;
}

@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.badge-icon {
  font-size: 18px;
}

.badge-text {
  font-size: 14px;
  font-weight: 700;
  color: #3b82f6;
  letter-spacing: 0.5px;
}

.hero-title-3d {
  font-size: 64px;
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 20px 0;
  animation: fade-in-up 0.6s ease 0.1s backwards;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gradient-text-3d {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.3));
}

.title-secondary-3d {
  color: #1e293b;
  margin-left: 12px;
}

.hero-desc-3d {
  font-size: 20px;
  color: #64748b;
  margin-bottom: 40px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  animation: fade-in-up 0.6s ease 0.2s backwards;
  font-weight: 500;
}

/* 3D 按钮 */
.hero-actions-3d {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 48px;
  animation: fade-in-up 0.6s ease 0.3s backwards;
}

.btn-primary-3d {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
  transform-style: preserve-3d;
}

.btn-primary-3d:hover {
  transform: translateY(-4px) rotateX(5deg);
  box-shadow: 0 16px 40px rgba(59, 130, 246, 0.45);
}

.btn-primary-3d .arrow {
  transition: transform 0.3s ease;
}

.btn-primary-3d:hover .arrow {
  transform: translateX(6px);
}

.btn-secondary-3d {
  display: inline-flex;
  align-items: center;
  padding: 16px 32px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  color: #475569;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.btn-secondary-3d:hover {
  border-color: rgba(59, 130, 246, 0.4);
  color: #3b82f6;
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(59, 130, 246, 0.15);
}

/* 3D Stats */
.hero-stats-3d {
  display: flex;
  justify-content: center;
  gap: 48px;
  animation: fade-in-up 0.6s ease 0.4s backwards;
}

.stat-3d {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  min-width: 120px;
}

.stat-3d:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
}

.stat-num {
  font-size: 36px;
  font-weight: 800;
  color: #3b82f6;
  line-height: 1;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
}

/* 3D Features Grid */
.features-section-3d {
  padding: 60px 0;
}

.section-title-3d {
  font-size: 32px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 48px;
  color: #1e293b;
}

.features-grid-3d {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}

.feature-card-3d {
  position: relative;
  padding: 32px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 24px;
  text-decoration: none;
  color: inherit;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  animation: card-fade-in 0.6s ease backwards;
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

.feature-card-3d:hover {
  transform: translateY(-8px) rotateX(3deg);
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.12);
}

.feature-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.feature-card-3d.purple .feature-glow {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent);
}
.feature-card-3d.blue .feature-glow {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent);
}
.feature-card-3d.green .feature-glow {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent);
}
.feature-card-3d.orange .feature-glow {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), transparent);
}

.feature-card-3d:hover .feature-glow {
  opacity: 1;
}

.feature-card-3d.purple:hover { border-color: rgba(139, 92, 246, 0.4); }
.feature-card-3d.blue:hover { border-color: rgba(59, 130, 246, 0.4); }
.feature-card-3d.green:hover { border-color: rgba(16, 185, 129, 0.4); }
.feature-card-3d.orange:hover { border-color: rgba(245, 158, 11, 0.4); }

.feature-icon-3d {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border-radius: 16px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.feature-card-3d.purple .feature-icon-3d { background: linear-gradient(135deg, #f3e8ff, #ede9fe); }
.feature-card-3d.blue .feature-icon-3d { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
.feature-card-3d.green .feature-icon-3d { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
.feature-card-3d.orange .feature-icon-3d { background: linear-gradient(135deg, #fef3c7, #fde68a); }

.feature-card-3d:hover .feature-icon-3d {
  transform: scale(1.1) rotate(-5deg);
}

.feature-card-3d h3 {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 12px 0;
  color: #1e293b;
}

.feature-card-3d p {
  font-size: 15px;
  color: #64748b;
  margin: 0 0 20px 0;
  line-height: 1.7;
}

.feature-link-3d {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.feature-card-3d.purple .feature-link-3d { color: #8b5cf6; }
.feature-card-3d.blue .feature-link-3d { color: #3b82f6; }
.feature-card-3d.green .feature-link-3d { color: #10b981; }
.feature-card-3d.orange .feature-link-3d { color: #f59e0b; }

.feature-card-3d:hover .feature-link-3d {
  gap: 12px;
}

.feature-link-3d svg {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.feature-card-3d:hover .feature-link-3d svg {
  transform: translateX(4px);
}

/* 3D Recent Updates */
.recent-section-3d {
  padding: 40px 0;
}

.recent-list-3d {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recent-card-3d {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  animation: slide-in-right 0.5s ease backwards;
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.recent-card-3d:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateX(8px);
  box-shadow: 0 12px 30px rgba(59, 130, 246, 0.12);
}

.recent-tag-3d {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.recent-tag-3d.ai {
  background: linear-gradient(145deg, #ede9fe, #ddd6fe);
  color: #6d28d9;
}

.recent-tag-3d.math {
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
}

.recent-content {
  flex: 1;
}

.recent-content h4 {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: #1e293b;
}

.recent-content p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-date-3d {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 600;
}

.recent-arrow {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border-radius: 10px;
  color: #94a3b8;
  transition: all 0.3s ease;
}

.recent-arrow svg {
  width: 18px;
  height: 18px;
}

.recent-card-3d:hover .recent-arrow {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  transform: translateX(4px);
}

/* 响应式 */
@media (max-width: 768px) {
  .hero-title-3d {
    font-size: 42px;
  }
  
  .hero-stats-3d {
    flex-direction: column;
    gap: 16px;
  }
  
  .stat-3d {
    width: 100%;
  }
  
  .features-grid-3d {
    grid-template-columns: 1fr;
  }
  
  .recent-card-3d {
    flex-wrap: wrap;
  }
  
  .recent-content p {
    width: 100%;
  }
  
  .recent-date-3d {
    order: 2;
  }
}
</style>
