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
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.25rem;
  text-decoration: none;
  color: #1e293b;
  transition: all 0.3s ease;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.ai-project-card:hover {
  transform: translateY(-4px);
  border-color: #cbd5e1;
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
}

.card-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.8) 45%,
    rgba(255, 255, 255, 0.9) 50%,
    rgba(255, 255, 255, 0.8) 55%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 0.6s;
  pointer-events: none;
}

.ai-project-card:hover .card-shine {
  transform: translateX(100%);
}

.card-glow {
  display: none;
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
  color: #64748b;
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
  background: #ede9fe;
  border: 1px solid #ddd6fe;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #7c3aed;
}

.stars-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.8rem;
  background: #fef3c7;
  border-radius: 20px;
  font-size: 0.85rem;
}

.stars-count {
  font-weight: 600;
  color: #d97706;
}

/* Description */
.project-description {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: #475569;
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
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

/* Footer */
.project-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.tech-stack {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tech-badge {
  padding: 0.2rem 0.5rem;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  color: #0284c7;
}

.license-badge {
  padding: 0.2rem 0.5rem;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #94a3b8;
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
