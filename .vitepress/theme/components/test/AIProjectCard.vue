<template>
  <a 
    :href="project.github_url" 
    target="_blank"
    rel="noopener noreferrer"
    class="ai-project-card"
    :class="`category-${project.category.toLowerCase().replace(/\s+/g, '-')}`"
  >
    <div class="card-shine"></div>
    
    <div class="project-header">
      <div class="project-icon" :style="{ background: iconGradient }">
        {{ projectIcon }}
      </div>
      <div class="project-title-group">
        <h3 class="project-name">{{ project.name }}</h3>
        <span class="project-author">@{{ project.author }}</span>
      </div>
    </div>
    
    <div class="project-category">
      <span class="category-badge">{{ project.category }}</span>
      <div class="stars-badge">
        <span>⭐</span>
        <span class="stars-count">{{ formatStars(project.stars) }}</span>
      </div>
    </div>
    
    <p class="project-description">{{ project.description }}</p>
    
    <div class="project-features">
      <span v-for="(feature, i) in project.key_features.slice(0, 3)" :key="i" class="feature-tag">
        {{ feature.split(' ')[0] }}
      </span>
    </div>
    
    <div class="project-footer">
      <div class="tech-stack">
        <span v-for="(tech, i) in project.tech_stack.slice(0, 3)" :key="i" class="tech-badge">
          {{ tech }}
        </span>
      </div>
      <div class="license-badge" :title="project.license">
        {{ project.license.split(' ')[0] }}
      </div>
    </div>
    
    <div class="card-glow"></div>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AIProject {
  id: number
  name: string
  author: string
  full_name: string
  description: string
  key_features: string[]
  stars: number
  forks: number
  tech_stack: string[]
  github_url: string
  license: string
  category: string
}

const props = defineProps<{
  project: AIProject
}>()

const projectIcon = computed(() => {
  const icons: Record<string, string> = {
    'AutoGPT': '🤖',
    'MetaGPT': '🏢',
    'LangChain': '🔗',
    'AutoGen': '🔄',
    'CrewAI': '👥',
    'LlamaIndex': '🦙',
    'Dify': '🎨',
    'OpenHands': '👐',
    'Flowise': '🌊',
    'LangGraph': '📊',
    'DSPy': '🧠',
    'CAMEL': '🐪'
  }
  return icons[props.project.name] || '🚀'
})

const iconGradient = computed(() => {
  const gradients: Record<string, string> = {
    'Multi-Agent 框架': 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    'LLM 应用框架': 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    '数据智能体框架': 'linear-gradient(135deg, #f59e0b, #ef4444)',
    'LLM 应用平台': 'linear-gradient(135deg, #10b981, #06b6d4)',
    'AI 编程智能体': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    '低代码 LLM 平台': 'linear-gradient(135deg, #ec4899, #f59e0b)',
    '智能体编排框架': 'linear-gradient(135deg, #14b8a6, #06b6d4)',
    'LLM 编程框架': 'linear-gradient(135deg, #f97316, #ef4444)',
    '多智能体研究框架': 'linear-gradient(135deg, #84cc16, #10b981)'
  }
  return gradients[props.project.category] || 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
})

function formatStars(stars: number): string {
  if (stars >= 10000) {
    return (stars / 1000).toFixed(1) + 'k'
  }
  return stars.toString()
}
</script>

<style scoped>
.ai-project-card {
  position: relative;
  display: block;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  transform-style: preserve-3d;
}

.ai-project-card:hover {
  transform: translateY(-8px) rotateX(5deg);
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.3),
    0 0 60px rgba(139, 92, 246, 0.1);
}

.card-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.05) 45%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 55%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.ai-project-card:hover .card-shine {
  transform: translateX(100%);
}

.card-glow {
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, 
    rgba(139, 92, 246, 0.2), 
    rgba(6, 182, 212, 0.2),
    rgba(236, 72, 153, 0.2)
  );
  border-radius: 20px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: -1;
  filter: blur(20px);
}

.ai-project-card:hover .card-glow {
  opacity: 1;
}

/* Header */
.project-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.project-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.project-title-group {
  flex: 1;
  min-width: 0;
}

.project-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-author {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Category & Stars */
.project-category {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.category-badge {
  padding: 0.3rem 0.8rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #a78bfa;
}

.stars-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  font-size: 0.85rem;
}

.stars-count {
  font-weight: 600;
  color: #fbbf24;
}

/* Description */
.project-description {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Features */
.project-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.feature-tag {
  padding: 0.25rem 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Footer */
.project-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.tech-stack {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tech-badge {
  padding: 0.2rem 0.5rem;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  color: #06b6d4;
}

.license-badge {
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

/* Category specific styles */
.category-multi-agent-框架 .category-badge {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
  color: #a78bfa;
}

.category-llm-应用平台 .category-badge {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.category-ai-编程智能体 .category-badge {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.3);
  color: #818cf8;
}
</style>
