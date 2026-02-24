<template>
  <div class="section-hero" :class="`theme-${theme}`">
    <!-- Animated Background -->
    <div class="hero-background">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="grid-pattern"></div>
    </div>

    <!-- Main Content -->
    <div class="hero-content">
      <!-- Icon & Badge -->
      <div class="hero-header">
        <div class="icon-wrapper" :class="{ 'animate-pulse': isHovering }" @mouseenter="isHovering = true" @mouseleave="isHovering = false">
          <span class="icon-emoji">{{ icon }}</span>
          <div class="icon-glow"></div>
        </div>
        <span class="badge" v-if="badge">{{ badge }}</span>
      </div>

      <!-- Title & Description -->
      <h1 class="hero-title">
        <span class="title-word" v-for="(word, i) in titleWords" :key="i" :style="{ animationDelay: `${i * 0.1}s` }">
          {{ word }}
        </span>
      </h1>
      <p class="hero-description">{{ description }}</p>

      <!-- Stats -->
      <div class="hero-stats" v-if="stats.length">
        <div class="stat-item" v-for="(stat, i) in stats" :key="i" :style="{ animationDelay: `${0.5 + i * 0.1}s` }">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="hero-actions">
        <a v-for="(action, i) in actions" :key="i" :href="action.link" class="action-btn" :class="action.type || 'primary'">
          <span class="btn-icon" v-if="action.icon">{{ action.icon }}</span>
          <span class="btn-text">{{ action.text }}</span>
          <span class="btn-arrow">→</span>
        </a>
      </div>

      <!-- Quick Links -->
      <div class="quick-links" v-if="quickLinks.length">
        <h3 class="quick-links-title">快速导航</h3>
        <div class="links-grid">
          <a v-for="(link, i) in quickLinks" :key="i" :href="link.link" class="quick-link-card" :style="{ animationDelay: `${0.8 + i * 0.05}s` }">
            <span class="link-icon">{{ link.icon || '→' }}</span>
            <div class="link-info">
              <span class="link-title">{{ link.title }}</span>
              <span class="link-desc" v-if="link.description">{{ link.description }}</span>
            </div>
          </a>
        </div>
      </div>

      <!-- Recent Items -->
      <div class="recent-section" v-if="recentItems.length">
        <h3 class="recent-title">{{ recentTitle }}</h3>
        <div class="recent-list">
          <a v-for="(item, i) in recentItems" :key="i" :href="item.link" class="recent-item" :class="{ 'has-image': item.image }">
            <img v-if="item.image" :src="item.image" :alt="item.title" class="item-image" />
            <div class="item-content">
              <span class="item-title">{{ item.title }}</span>
              <span class="item-meta" v-if="item.date || item.tag">
                <span class="item-tag" v-if="item.tag">{{ item.tag }}</span>
                <span class="item-date" v-if="item.date">{{ item.date }}</span>
              </span>
              <p class="item-excerpt" v-if="item.excerpt">{{ item.excerpt }}</p>
            </div>
          </a>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="features-section" v-if="features.length">
        <h3 class="features-title">核心特性</h3>
        <div class="features-grid">
          <div v-for="(feature, i) in features" :key="i" class="feature-card">
            <div class="feature-icon">{{ feature.icon }}</div>
            <h4 class="feature-title">{{ feature.title }}</h4>
            <p class="feature-desc">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Stat {
  value: string
  label: string
}

interface Action {
  text: string
  link: string
  icon?: string
  type?: 'primary' | 'secondary' | 'ghost'
}

interface QuickLink {
  title: string
  link: string
  icon?: string
  description?: string
}

interface RecentItem {
  title: string
  link: string
  date?: string
  tag?: string
  excerpt?: string
  image?: string
}

interface Feature {
  icon: string
  title: string
  description: string
}

const props = withDefaults(defineProps<{
  theme?: 'blue' | 'purple' | 'green' | 'orange' | 'pink'
  icon: string
  badge?: string
  title: string
  description: string
  stats?: Stat[]
  actions?: Action[]
  quickLinks?: QuickLink[]
  recentItems?: RecentItem[]
  recentTitle?: string
  features?: Feature[]
}>(), {
  theme: 'blue',
  stats: () => [],
  actions: () => [],
  quickLinks: () => [],
  recentItems: () => [],
  recentTitle: '最近更新',
  features: () => []
})

const isHovering = ref(false)

const titleWords = computed(() => props.title.split(''))
</script>

<style scoped>
.section-hero {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: 48px 24px;
  overflow: hidden;
}

/* Animated Background */
.hero-background {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  top: -200px;
  right: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  bottom: -100px;
  left: -100px;
  animation-delay: -7s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  top: 50%;
  left: 50%;
  animation-delay: -14s;
}

.theme-blue .orb-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.theme-blue .orb-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.theme-blue .orb-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.theme-purple .orb-1 { background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); }
.theme-purple .orb-2 { background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); }
.theme-purple .orb-3 { background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); }

.theme-green .orb-1 { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.theme-green .orb-2 { background: linear-gradient(135deg, #84cc16 0%, #22c55e 100%); }
.theme-green .orb-3 { background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); }

.theme-orange .orb-1 { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
.theme-orange .orb-2 { background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); }
.theme-orange .orb-3 { background: linear-gradient(135deg, #fb923c 0%, #fbbf24 100%); }

.theme-pink .orb-1 { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); }
.theme-pink .orb-2 { background: linear-gradient(135deg, #f472b6 0%, #e879f9 100%); }
.theme-pink .orb-3 { background: linear-gradient(135deg, #fb7185 0%, #fda4af 100%); }

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* Content */
.hero-content {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.hero-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.icon-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: all 0.3s ease;
}

.icon-wrapper:hover {
  transform: scale(1.05) rotate(5deg);
}

.icon-emoji {
  font-size: 40px;
  line-height: 1;
}

.icon-glow {
  position: absolute;
  inset: -2px;
  border-radius: 24px;
  background: inherit;
  filter: blur(20px);
  opacity: 0;
  transition: opacity 0.3s;
  z-index: -1;
}

.icon-wrapper:hover .icon-glow,
.icon-wrapper.animate-pulse .icon-glow {
  opacity: 0.6;
}

.badge {
  padding: 6px 14px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Title */
.hero-title {
  font-size: 56px;
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 24px;
  color: var(--vp-c-text-1);
}

.title-word {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease forwards;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Description */
.hero-description {
  font-size: 20px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  max-width: 600px;
  margin: 0 0 32px;
}

/* Stats */
.hero-stats {
  display: flex;
  gap: 32px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  transform: translateY(10px);
  animation: fadeInUp 0.5s ease forwards;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--vp-c-brand);
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--vp-c-text-3);
}

/* Actions */
.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%);
  color: white;
  box-shadow: 0 4px 20px rgba(var(--vp-c-brand-rgb), 0.3);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(var(--vp-c-brand-rgb), 0.4);
}

.action-btn.secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.action-btn.secondary:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand);
}

.action-btn.ghost {
  color: var(--vp-c-text-2);
}

.action-btn.ghost:hover {
  color: var(--vp-c-brand);
}

.btn-arrow {
  transition: transform 0.3s;
}

.action-btn:hover .btn-arrow {
  transform: translateX(4px);
}

/* Quick Links */
.quick-links {
  margin-bottom: 48px;
}

.quick-links-title {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--vp-c-text-3);
  margin-bottom: 20px;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.quick-link-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateX(-10px);
  animation: fadeInLeft 0.5s ease forwards;
}

@keyframes fadeInLeft {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.quick-link-card:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.link-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 10px;
  font-size: 18px;
  flex-shrink: 0;
}

.link-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.link-desc {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

/* Recent Section */
.recent-section {
  margin-bottom: 48px;
}

.recent-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 20px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recent-item {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.recent-item:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.item-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 12px;
  flex-shrink: 0;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.item-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.item-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.item-tag {
  padding: 4px 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.item-date {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.item-excerpt {
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Features Section */
.features-section {
  margin-bottom: 48px;
}

.features-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 20px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.feature-card {
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-soft);
  border-radius: 12px;
  font-size: 24px;
  margin-bottom: 16px;
}

.feature-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
}

.feature-desc {
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .section-hero {
    padding: 32px 16px;
  }
  
  .hero-title {
    font-size: 36px;
  }
  
  .hero-description {
    font-size: 17px;
  }
  
  .hero-stats {
    gap: 24px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .hero-actions {
    flex-direction: column;
  }
  
  .action-btn {
    justify-content: center;
  }
  
  .links-grid {
    grid-template-columns: 1fr;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
