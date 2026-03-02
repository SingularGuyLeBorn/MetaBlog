<template>
  <div class="home-page-liquid-v3">
    <!-- 环境光球 - 深海氛围 -->
    <div class="ambient-orbs">
      <div class="ambient-orb"></div>
      <div class="ambient-orb"></div>
      <div class="ambient-orb"></div>
    </div>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <!-- 徽章 -->
        <div class="hero-badge lg-v3-enter" :class="{ 'awaken': isLoaded }">
          <span class="badge-icon">🚀</span>
          <span class="badge-text">数字孪生级知识管理系统</span>
        </div>
        
        <!-- 标题 -->
        <h1 class="hero-title lg-v3-enter" :class="{ 'awaken': isLoaded }" style="animation-delay: 0.08s">
          <span class="gradient-text">MetaUniverse</span>
          <span class="title-secondary">Blog</span>
        </h1>
        
        <!-- 描述 -->
        <p class="hero-desc lg-v3-enter" :class="{ 'awaken': isLoaded }" style="animation-delay: 0.16s">
          构建你的第二大脑，让知识流动起来
        </p>
        
        <!-- 按钮组 -->
        <div class="hero-actions lg-v3-enter" :class="{ 'awaken': isLoaded }" style="animation-delay: 0.24s">
          <a href="/sections/knowledge/rl-math-principle/" class="btn-primary">
            <span>开始探索</span>
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <a href="/sections/about/" class="btn-secondary">
            <span>关于作者</span>
          </a>
        </div>
        
        <!-- 统计数据 -->
        <div class="hero-stats" :class="{ 'stagger-in': isLoaded }">
          <div class="stat-card" v-for="(stat, i) in stats" :key="stat.label" :style="{ animationDelay: `${0.32 + i * 0.08}s` }">
            <div class="stat-bubbles">
              <div class="bubble"></div>
              <div class="bubble"></div>
              <div class="bubble"></div>
            </div>
            <span class="stat-num">{{ stat.num }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="features-section">
      <h2 class="section-title" :class="{ 'fade-in': featuresVisible }">核心模块</h2>
      <div class="features-grid" :class="{ 'stagger-in': featuresVisible }">
        <a 
          v-for="(feature, index) in features" 
          :key="feature.title"
          :href="feature.link"
          class="feature-card"
          :class="{ 'enter': featuresVisible }"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @mouseenter="handleCardHover"
          @mouseleave="handleCardLeave"
        >
          <!-- 气泡 -->
          <div class="card-bubbles">
            <div class="bubble"></div>
            <div class="bubble"></div>
            <div class="bubble"></div>
          </div>
          
          <!-- 图标 -->
          <div class="feature-icon-wrap" :class="feature.colorClass">
            <span class="feature-icon-emoji">{{ feature.icon }}</span>
          </div>
          
          <!-- 内容 -->
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
          
          <!-- 链接 -->
          <span class="feature-link" :class="feature.colorClass">
            {{ feature.linkText }}
            <svg class="link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </a>
      </div>
    </section>

    <!-- Recent Updates -->
    <section class="recent-section">
      <h2 class="section-title" :class="{ 'fade-in': recentVisible }">最近更新</h2>
      <div class="recent-list" :class="{ 'stagger-in': recentVisible }">
        <a 
          v-for="(item, index) in recentItems" 
          :key="item.title" 
          :href="item.link" 
          class="recent-card"
          :class="{ 'enter': recentVisible }"
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
import { ref, onMounted, onUnmounted } from 'vue'

// 加载状态
const isLoaded = ref(false)
const featuresVisible = ref(false)
const recentVisible = ref(false)

// 统计数据
const stats = [
  { num: '200+', label: '知识节点' },
  { num: '20+', label: '技术文章' },
  { num: '10K+', label: '总阅读' }
]

// 功能模块
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

// 最近更新
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

// 卡片悬停处理 - 添加有机形变
const handleCardHover = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement
  card.classList.add('is-hovered')
}

const handleCardLeave = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement
  card.classList.remove('is-hovered')
}

// 可见性观察器
let observers: IntersectionObserver[] = []

onMounted(() => {
  // 触发入场动画
  requestAnimationFrame(() => {
    isLoaded.value = true
  })
  
  // 观察功能区域
  const featuresSection = document.querySelector('.features-section')
  if (featuresSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          featuresVisible.value = true
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.2 })
    observer.observe(featuresSection)
    observers.push(observer)
  }
  
  // 观察最近更新区域
  const recentSection = document.querySelector('.recent-section')
  if (recentSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          recentVisible.value = true
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.2 })
    observer.observe(recentSection)
    observers.push(observer)
  }
})

onUnmounted(() => {
  observers.forEach(obs => obs.disconnect())
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   HomePage Liquid Glass V3 样式
   ═══════════════════════════════════════════════════════════════ */

.home-page-liquid-v3 {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  overflow: hidden;
}

/* ── 环境光球 ── */
.ambient-orbs {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.20;
  animation: orb-float 25s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
}

.ambient-orb:nth-child(1) {
  width: 500px;
  height: 500px;
  top: -10%;
  right: -5%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.6), transparent 70%);
}

.ambient-orb:nth-child(2) {
  width: 400px;
  height: 400px;
  bottom: -8%;
  left: -3%;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.5), transparent 70%);
  animation-delay: -8s;
  animation-duration: 20s;
}

.ambient-orb:nth-child(3) {
  width: 350px;
  height: 350px;
  top: 45%;
  left: 35%;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.5), transparent 70%);
  animation-delay: -16s;
  animation-duration: 22s;
}

@keyframes orb-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  20% { transform: translateY(-20px) rotate(2deg); }
  40% { transform: translateY(-10px) rotate(-1deg); }
  60% { transform: translateY(-30px) rotate(1deg); }
  80% { transform: translateY(-15px) rotate(-0.5deg); }
}

/* ── Hero Section ── */
.hero-section {
  position: relative;
  padding: 100px 0 70px;
  text-align: center;
  min-height: 75vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-content {
  position: relative;
  z-index: 1;
}

/* 入场动画 */
.lg-v3-enter {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
  filter: blur(8px);
  transition: 
    opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.lg-v3-enter.awaken {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

/* 徽章 */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50px;
  margin-bottom: 32px;
  cursor: default;
  transition: 
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  animation: breathe-gentle 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.hero-badge:hover {
  transform: scale(0.985);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.06);
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

/* 标题 */
.hero-title {
  font-size: 68px;
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 24px 0;
}

.gradient-text {
  background: linear-gradient(135deg, #8b5cf6 0%, #60a5fa 50%, #34d399 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 16px rgba(139, 92, 246, 0.25));
}

.title-secondary {
  color: var(--vp-c-text-1);
  margin-left: 16px;
}

/* 描述 */
.hero-desc {
  font-size: 20px;
  color: var(--vp-c-text-2);
  margin-bottom: 48px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  font-weight: 500;
  line-height: 1.6;
}

/* ── 按钮组 - 液态按钮 ── */
.hero-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 56px;
}

.btn-primary {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.75) 0%, rgba(96, 165, 250, 0.65) 100%);
  border: 1px solid rgba(139, 92, 246, 0.40);
  border-radius: 18px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.30);
  overflow: hidden;
  transition: 
    transform 0.3s cubic-bezier(0.68, -0.15, 0.265, 1.15),
    box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.btn-primary:hover {
  transform: scale(0.985) translateY(1px);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.85) 0%, rgba(96, 165, 250, 0.75) 100%);
  box-shadow: 
    0 12px 40px rgba(139, 92, 246, 0.40),
    0 0 60px rgba(139, 92, 246, 0.15);
}

.btn-primary:hover::before {
  transform: translateX(100%);
}

.btn-primary:active {
  transform: scale(0.978) translateY(2px);
  transition-duration: 0.1s;
}

.arrow-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.btn-primary:hover .arrow-icon {
  transform: translateX(4px);
}

.btn-secondary {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(12px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  color: var(--vp-c-text-1);
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: 
    transform 0.3s cubic-bezier(0.68, -0.15, 0.265, 1.15),
    background 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.btn-secondary:hover {
  transform: scale(0.985) translateY(1px);
  background: rgba(255, 255, 255, 0.20);
  border-color: rgba(168, 85, 247, 0.30);
  box-shadow: 
    0 0 30px rgba(168, 85, 247, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}

.btn-secondary:active {
  transform: scale(0.978) translateY(2px);
  transition-duration: 0.1s;
}

/* ── 统计数据卡片 ── */
.hero-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 36px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  min-width: 130px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  animation: breathe-gentle 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  transition: 
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.stagger-in .stat-card {
  animation: 
    bounce-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
    breathe-gentle 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.stat-card:hover {
  transform: scale(0.985) translateY(1px);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(168, 85, 247, 0.22);
  box-shadow: 
    inset 0 2px 10px rgba(0, 0, 0, 0.06),
    0 0 30px rgba(168, 85, 247, 0.08);
}

.stat-bubbles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  border-radius: inherit;
}

.bubble {
  position: absolute;
  width: 5px;
  height: 5px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.4), transparent 70%);
  border-radius: 50%;
  animation: bubble-rise 12s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
}

.stat-card .bubble:nth-child(1) { left: 15%; animation-delay: 0s; animation-duration: 10s; }
.stat-card .bubble:nth-child(2) { left: 50%; animation-delay: 3s; animation-duration: 13s; width: 4px; height: 4px; }
.stat-card .bubble:nth-child(3) { left: 75%; animation-delay: 6s; animation-duration: 11s; width: 6px; height: 6px; }

@keyframes bubble-rise {
  0% { transform: translateY(100%) scale(0); opacity: 0; }
  5% { opacity: 0.5; }
  85% { opacity: 0.2; }
  100% { transform: translateY(-10%) scale(1.1); opacity: 0; }
}

.stat-num {
  font-size: 38px;
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
  font-size: 34px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 48px;
  color: var(--vp-c-text-1);
  opacity: 0;
  transform: translateY(16px);
  transition: 
    opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.section-title.fade-in {
  opacity: 1;
  transform: translateY(0);
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
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  opacity: 0;
  transform: translateY(24px) scale(0.96);
  filter: blur(4px);
  transition: 
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  animation: breathe-gentle 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.feature-card.enter {
  animation: 
    materialize 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards,
    breathe-gentle 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.feature-card:hover {
  transform: scale(0.985) translateY(2px);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(168, 85, 247, 0.25);
  box-shadow: 
    inset 0 3px 12px rgba(0, 0, 0, 0.06),
    0 0 35px rgba(168, 85, 247, 0.10);
}

.card-bubbles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  border-radius: inherit;
}

.card-bubbles .bubble:nth-child(1) { left: 12%; animation-delay: 0s; }
.card-bubbles .bubble:nth-child(2) { left: 45%; animation-delay: 4s; width: 4px; height: 4px; }
.card-bubbles .bubble:nth-child(3) { left: 78%; animation-delay: 8s; width: 6px; height: 6px; }

.feature-icon-wrap {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  margin-bottom: 22px;
  transition: 
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.feature-card:hover .feature-icon-wrap {
  transform: scale(1.05) rotate(-2deg);
}

.feature-icon-wrap.purple {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(139, 92, 246, 0.06));
  box-shadow: 0 0 25px rgba(139, 92, 246, 0.12);
}

.feature-icon-wrap.blue {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.18), rgba(96, 165, 250, 0.06));
  box-shadow: 0 0 25px rgba(96, 165, 250, 0.12);
}

.feature-icon-wrap.mint {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(52, 211, 153, 0.06));
  box-shadow: 0 0 25px rgba(52, 211, 153, 0.12);
}

.feature-icon-wrap.gold {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 191, 36, 0.06));
  box-shadow: 0 0 25px rgba(251, 191, 36, 0.12);
}

.feature-icon-emoji {
  font-size: 34px;
}

.feature-card h3 {
  font-size: 21px;
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
  transition: gap 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.feature-link.purple { color: #a78bfa; }
.feature-link.blue   { color: #60a5fa; }
.feature-link.mint   { color: #34d399; }
.feature-link.gold   { color: #fbbf24; }

.feature-card:hover .feature-link {
  gap: 12px;
}

.link-arrow {
  width: 16px;
  height: 16px;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.feature-card:hover .link-arrow {
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
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  opacity: 0;
  transform: translateY(20px);
  transition: 
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.recent-card.enter {
  animation: materialize 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.recent-card:hover {
  transform: scale(0.992) translateY(1px);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(96, 165, 250, 0.22);
  box-shadow: 
    inset 0 2px 8px rgba(0, 0, 0, 0.05),
    0 0 25px rgba(96, 165, 250, 0.08);
}

.recent-card:hover .recent-arrow {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.60), rgba(96, 165, 250, 0.50));
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
  background: linear-gradient(145deg, rgba(139, 92, 246, 0.18), rgba(139, 92, 246, 0.06));
  color: #a78bfa;
}

.recent-tag.math {
  background: linear-gradient(145deg, rgba(96, 165, 250, 0.18), rgba(96, 165, 250, 0.06));
  color: #60a5fa;
}

.recent-content {
  flex: 1;
  min-width: 0;
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
  flex-shrink: 0;
}

.recent-arrow {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--vp-c-text-3);
  transition: 
    all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  flex-shrink: 0;
}

.recent-arrow svg {
  width: 18px;
  height: 18px;
}

/* ── Keyframes ── */
@keyframes materialize {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
    filter: blur(8px);
  }
  60% {
    opacity: 1;
    transform: translateY(-2px) scale(1.005);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  50% {
    transform: translateY(-4px) scale(1.01);
  }
  75% {
    transform: translateY(2px) scale(0.998);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes breathe-gentle {
  0%, 100% { transform: scale(1) translateY(0); }
  25% { transform: scale(1.002) translateY(-1px); }
  50% { transform: scale(1.004) translateY(-2px); }
  75% { transform: scale(1.002) translateY(-1px); }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero-title {
    font-size: 44px;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    max-width: 280px;
    justify-content: center;
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
  
  .recent-content {
    width: 100%;
    order: 3;
  }
  
  .recent-date {
    order: 2;
  }
  
  .recent-arrow {
    order: 4;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 36px;
  }
  
  .title-secondary {
    display: block;
    margin-left: 0;
    margin-top: 8px;
  }
  
  .hero-desc {
    font-size: 18px;
  }
}
</style>
