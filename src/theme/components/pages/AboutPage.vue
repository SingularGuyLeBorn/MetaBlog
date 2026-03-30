<template>
  <div class="about-page">
    <!-- Profile Hero — 极简 -->
    <section class="profile-hero fade-up">
      <div class="avatar-wrapper">
        <div class="avatar">
          <span>🚀</span>
        </div>
      </div>
      
      <h1 class="sr-title name">MetaUniverse</h1>
      <p class="sr-subtitle tagline">AI 研究员 · 全栈开发者 · 终身学习者</p>
      
      <div class="social-links">
        <a href="https://github.com" target="_blank" class="social-btn neu-btn magnetic-btn" title="GitHub">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <a href="mailto:hello@example.com" class="social-btn neu-btn magnetic-btn" title="Email">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </a>
        <a href="#" class="social-btn neu-btn magnetic-btn" title="Twitter">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        </a>
      </div>
    </section>

    <!-- Intro Section -->
    <section class="intro-section fade-up">
      <h2 class="section-heading">👋 你好，我是 MetaUniverse</h2>
      <p class="intro-text">
        一名热爱技术的 AI 研究员和全栈开发者。我相信<strong>知识的力量</strong>，也相信<strong>分享的快乐</strong>。
        这个博客是我构建的<strong>数字孪生级知识管理系统</strong>，用来记录学习、整理思考、分享见解。
      </p>
      
      <div class="quote-box glass-card tilt-card scanline-effect">
        <span class="quote-mark">"</span>
        <blockquote>构建第二大脑，让知识流动起来。</blockquote>
        <span class="quote-mark">"</span>
      </div>
    </section>

    <!-- Skills Section -->
    <section class="skills-section fade-up">
      <h2 class="section-heading">🛠️ 技术栈</h2>
      <div class="skills-cloud">
        <span 
          v-for="(skill, index) in skills" 
          :key="skill" 
          class="sr-tag micro-interaction"
          :class="tagColors[index % tagColors.length]"
          :style="{ transitionDelay: `${index * 50}ms` }"
        >{{ skill }}</span>
      </div>
    </section>

    <!-- Timeline Section -->
    <section class="timeline-section fade-up">
      <h2 class="section-heading">📅 时间线</h2>
      <div class="timeline">
        <div 
          v-for="(item, index) in timeline" 
          :key="item.title" 
          class="timeline-item fade-up"
          :style="{ transitionDelay: `${index * 100}ms` }"
        >
          <div class="timeline-marker">{{ item.icon }}</div>
          <div class="timeline-content glass-card micro-interaction">
            <div class="timeline-date">{{ item.date }}</div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="contact-section fade-up">
      <h2 class="section-heading">📮 联系我</h2>
      <p class="contact-desc">如果你有任何问题、建议，或者只是想聊聊技术，欢迎随时联系我！</p>
      
      <div class="contact-grid">
        <a 
          v-for="(contact, index) in contacts" 
          :key="contact.title" 
          :href="contact.link" 
          class="contact-card glass-card glass-card-hover tilt-card magnetic-btn"
          :style="{ transitionDelay: `${index * 80}ms` }"
        >
          <div class="contact-icon">{{ contact.icon }}</div>
          <div class="contact-info">
            <h4>{{ contact.title }}</h4>
            <span>{{ contact.value }}</span>
          </div>
          <div class="contact-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </a>
      </div>
    </section>

    <!-- Projects Showcase -->
    <section class="projects-section fade-up">
      <h2 class="section-heading">🚀 项目展示</h2>
      <div class="projects-grid">
        <a 
          v-for="(project, index) in myProjects" 
          :key="project.title" 
          :href="project.link"
          class="project-card-about glass-card glass-card-hover tilt-card fade-up"
          :style="{ transitionDelay: `${index * 100}ms` }"
        >
          <div class="project-header-about">
            <span class="project-icon-about">{{ project.icon }}</span>
            <div class="project-tech">
              <span v-for="t in project.tech" :key="t" class="tech-tag">{{ t }}</span>
            </div>
          </div>
          <h3 class="project-title-about">{{ project.title }}</h3>
          <p class="project-desc-about">{{ project.desc }}</p>
        </a>
      </div>
    </section>

    <!-- Achievements -->
    <section class="achievements-section fade-up">
      <h2 class="section-heading">🏆 成就统计</h2>
      <div class="achievements-grid">
        <div 
          v-for="(ach, index) in achievements" 
          :key="ach.label" 
          class="achievement-card glass-card scale-in"
          :style="{ transitionDelay: `${index * 100}ms` }"
        >
          <span class="achievement-icon">{{ ach.icon }}</span>
          <span class="achievement-value">{{ ach.value }}</span>
          <span class="achievement-label">{{ ach.label }}</span>
        </div>
      </div>
    </section>

    <!-- Interests -->
    <section class="interests-section fade-up">
      <h2 class="section-heading">💡 兴趣领域</h2>
      <div class="interests-grid">
        <div 
          v-for="(interest, index) in interests" 
          :key="interest.title" 
          class="interest-card glass-card glass-card-hover tilt-card fade-up"
          :style="{ transitionDelay: `${index * 80}ms` }"
        >
          <span class="interest-icon">{{ interest.icon }}</span>
          <h4 class="interest-title">{{ interest.title }}</h4>
          <p class="interest-desc">{{ interest.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick } from 'vue'
import { useCountUp } from '../shared/composables/useInteractiveEffects'

const skills = ['PyTorch', 'Transformers', 'LLM', 'RLHF', 'Vue 3', 'React', 'TypeScript', 'Tailwind', 'Python', 'Node.js', 'PostgreSQL', 'Redis', 'Docker']

const tagColors = ['sr-tag-morandi-purple', 'sr-tag-morandi-blue', 'sr-tag-morandi-green', 'sr-tag-morandi-pink']

const timeline = [
  { icon: '🚀', date: '2024 - 至今', title: '深入研究大模型与强化学习', desc: '专注于 LLM、RLHF、DPO、GRPO 等方向的研究，构建了这个知识管理系统。' },
  { icon: '💼', date: '2022 - 2024', title: '全栈开发者', desc: '在科技公司担任全栈工程师，负责 AI 产品的研发和部署。' },
  { icon: '🎓', date: '2018 - 2022', title: '计算机科学学位', desc: '系统学习计算机科学基础，对人工智能产生浓厚兴趣。' },
  { icon: '💻', date: '2015 - 至今', title: '编程之旅', desc: '写下第一行 "Hello World"，从此踏上编程的不归路。' }
]

const contacts = [
  { icon: '📧', title: 'Email', value: 'hello@example.com', link: 'mailto:hello@example.com' },
  { icon: '🐙', title: 'GitHub', value: '@metauniverse', link: 'https://github.com' },
  { icon: '💬', title: '微信', value: 'metauniverse', link: '#' }
]

// Projects showcase
const myProjects = [
  {
    icon: '🧠',
    title: 'MetaBlog',
    desc: 'AI 驱动的智能博客系统，支持知识图谱、RAG 检索',
    tech: ['Vue 3', 'VitePress', 'AI'],
    link: '/'
  },
  {
    icon: '📊',
    title: 'RL-Notebooks',
    desc: '强化学习算法 PyTorch 实现集合',
    tech: ['PyTorch', 'Jupyter', 'RL'],
    link: '/sections/knowledge/'
  },
  {
    icon: '🤖',
    title: 'LLM-Toolkit',
    desc: '大语言模型工具包，支持多模型接入',
    tech: ['Python', 'CLI', 'LLM'],
    link: '/chat'
  }
]

// Achievements
const achievements = [
  { icon: '📝', value: '50+', label: '技术文章' },
  { icon: '⭐', value: '1K+', label: 'GitHub Stars' },
  { icon: '📚', value: '10+', label: '开源项目' },
  { icon: '🎓', value: '5+', label: '年经验' }
]

// Interests
const interests = [
  { icon: '🤖', title: '大语言模型', desc: 'LLM 架构、训练与部署' },
  { icon: '🎮', title: '强化学习', desc: 'RL 算法与游戏 AI' },
  { icon: '🧠', title: '知识图谱', desc: 'RAG 与语义搜索' },
  { icon: '🎨', title: 'UI/UX 设计', desc: '界面设计与用户体验' }
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
   About Page — Star River Style
   ═══════════════════════════════════════════════════════════════════════════ */

.about-page {
  position: relative;
  width: 95%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 80px 24px 60px;
}

/* Profile Hero */
.profile-hero {
  text-align: center;
  padding: 40px 0 48px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 32px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, 
    var(--sr-morandi-purple) 0%, 
    var(--sr-morandi-blue) 50%, 
    var(--sr-morandi-pink) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  box-shadow: 
    0 8px 32px rgba(179, 168, 184, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.06),
    inset 0 2px 4px rgba(255, 255, 255, 0.4);
  animation: avatar-breathe 5s ease-in-out infinite;
}

@keyframes avatar-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1.02); }
}

.name {
  font-size: clamp(2rem, 5vw, 3rem) !important;
  margin-bottom: 8px;
  color: var(--sr-text-primary);
  font-weight: 300 !important;
  letter-spacing: -0.03em;
}

.tagline {
  margin-bottom: 32px;
}

/* Social Links — Neumorphic */
.social-links {
  display: flex;
  gap: 14px;
  justify-content: center;
}

.social-btn {
  width: 48px;
  height: 48px;
  border-radius: var(--sr-radius-md) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sr-text-secondary);
  padding: 0 !important;
  transition: all 0.3s var(--sr-spring-bounce);
}

.social-btn:hover {
  color: var(--sr-accent-star);
  transform: translateY(-3px);
}

/* Section Headings */
.section-heading {
  font-family: var(--sr-font-primary);
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--sr-text-primary);
  letter-spacing: -0.01em;
}

/* Intro Section */
.intro-section {
  padding: 48px 0;
  border-top: 1px solid var(--sr-glass-border-strong);
}

.intro-text {
  font-size: 16px;
  line-height: 1.9;
  color: var(--sr-text-secondary);
}

.intro-text strong {
  color: var(--sr-accent-star);
  font-weight: 600;
}

.quote-box {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.quote-mark {
  font-size: 40px;
  color: var(--sr-morandi-warm);
  font-family: Georgia, serif;
  line-height: 1;
  opacity: 0.4;
}

.quote-box blockquote {
  margin: 0;
  font-size: 18px;
  font-style: italic;
  color: var(--sr-accent-star);
  font-weight: 500;
  text-align: center;
  border: none;
  padding: 0;
  background: none;
}

/* Skills Section */
.skills-section {
  padding: 48px 0;
  border-top: 1px solid var(--sr-glass-border-strong);
}

.skills-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* Timeline Section */
.timeline-section {
  padding: 48px 0;
  border-top: 1px solid var(--sr-glass-border-strong);
}

.timeline {
  position: relative;
  padding-left: 40px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, 
    var(--sr-morandi-purple), 
    var(--sr-morandi-blue), 
    var(--sr-morandi-green)
  );
  border-radius: 1px;
  opacity: 0.4;
}

.timeline-item {
  position: relative;
  margin-bottom: 28px;
}

.timeline-marker {
  position: absolute;
  left: -40px;
  width: 40px;
  height: 40px;
  background: var(--sr-bg-elevated);
  border: 2px solid var(--sr-morandi-purple);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 
    0 2px 8px rgba(179, 168, 184, 0.2);
  z-index: 1;
  transition: all 0.3s var(--sr-spring-bounce);
}

.timeline-item:hover .timeline-marker {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(179, 168, 184, 0.3);
}

.timeline-content {
  padding: 20px 24px !important;
  border-radius: var(--sr-radius-md) !important;
}

.timeline-date {
  font-size: 12px;
  color: var(--sr-accent-star);
  font-weight: 500;
  margin-bottom: 6px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.timeline-content h3 {
  font-family: var(--sr-font-primary);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--sr-text-primary);
}

.timeline-content p {
  font-size: 14px;
  color: var(--sr-text-secondary);
  margin: 0;
  line-height: 1.7;
}

/* Contact Section */
.contact-section {
  padding: 48px 0;
  border-top: 1px solid var(--sr-glass-border-strong);
}

.contact-desc {
  color: var(--sr-text-secondary);
  margin-bottom: 24px;
  font-size: 15px;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: inherit;
}

.contact-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-md);
  flex-shrink: 0;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.contact-card:hover .contact-icon {
  transform: scale(1.08);
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-info h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  color: var(--sr-text-primary);
}

.contact-info span {
  font-size: 13px;
  color: var(--sr-text-muted);
  font-weight: 400;
}

.contact-arrow {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sr-text-tertiary);
  transition: all 0.3s var(--sr-spring-bounce);
  flex-shrink: 0;
}

.contact-arrow svg {
  width: 16px;
  height: 16px;
}

.contact-card:hover .contact-arrow {
  color: var(--sr-accent-star);
  transform: translateX(3px);
}

/* Responsive */
@media (max-width: 640px) {
  .about-page {
    padding: 50px 16px 40px;
  }
  
  .avatar {
    width: 100px;
    height: 100px;
    font-size: 48px;
  }
  
  .timeline {
    padding-left: 32px;
  }
  
  .timeline-marker {
    left: -32px;
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  .contact-grid {
    grid-template-columns: 1fr;
  }
  
  .quote-box {
    flex-direction: column;
    text-align: center;
  }
  
  .quote-box blockquote {
    font-size: 16px;
  }
}

/* Projects Section */
.projects-section {
  margin-top: 48px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.project-card-about {
  display: flex;
  flex-direction: column;
  padding: 24px;
  text-decoration: none;
  color: inherit;
}

.project-header-about {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-icon-about {
  font-size: 32px;
}

.project-tech {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tech-tag {
  font-size: 10px;
  padding: 3px 8px;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-sm);
  color: var(--sr-text-muted);
}

.project-title-about {
  font-family: var(--sr-font-primary);
  font-size: 17px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 8px;
  transition: color 0.2s ease;
}

.project-card-about:hover .project-title-about {
  color: var(--sr-accent-star);
}

.project-desc-about {
  font-size: 14px;
  color: var(--sr-text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* Achievements Section */
.achievements-section {
  margin-top: 48px;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.achievement-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
}

.achievement-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.achievement-value {
  font-family: var(--sr-font-primary);
  font-size: 28px;
  font-weight: 600;
  color: var(--sr-accent-star);
  margin-bottom: 4px;
}

.achievement-label {
  font-size: 13px;
  color: var(--sr-text-secondary);
}

/* Interests Section */
.interests-section {
  margin-top: 48px;
  margin-bottom: 40px;
}

.interests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.interest-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px;
  text-align: center;
}

.interest-icon {
  font-size: 36px;
  margin-bottom: 12px;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.interest-card:hover .interest-icon {
  transform: scale(1.1);
}

.interest-title {
  font-family: var(--sr-font-primary);
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 6px;
}

.interest-desc {
  font-size: 13px;
  color: var(--sr-text-secondary);
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .achievements-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .interests-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
