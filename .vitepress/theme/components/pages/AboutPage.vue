<template>
  <div class="about-page-3d">
    <!-- 背景光效 -->
    <div class="ambient-light">
      <div class="light-orb orb-1"></div>
      <div class="light-orb orb-2"></div>
      <div class="light-orb orb-3"></div>
    </div>

    <!-- Profile Hero with 3D Animated Avatar -->
    <section class="profile-hero-3d">
      <div class="avatar-wrapper-3d">
        <div class="avatar-3d">
          <span>🚀</span>
        </div>
        <div class="avatar-ring-3d ring-1"></div>
        <div class="avatar-ring-3d ring-2"></div>
        <div class="avatar-glow"></div>
      </div>
      
      <h1 class="name-3d">MetaUniverse</h1>
      <p class="tagline-3d">AI 研究员 · 全栈开发者 · 终身学习者</p>
      
      <div class="social-links-3d">
        <a href="https://github.com" target="_blank" class="social-btn-3d" title="GitHub">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <a href="mailto:hello@example.com" class="social-btn-3d" title="Email">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </a>
        <a href="#" class="social-btn-3d" title="Twitter">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        </a>
      </div>
    </section>

    <!-- Intro Section -->
    <section class="intro-section-3d">
      <h2>👋 你好，我是 MetaUniverse</h2>
      <p class="intro-text-3d">
        一名热爱技术的 AI 研究员和全栈开发者。我相信<strong>知识的力量</strong>，也相信<strong>分享的快乐</strong>。
        这个博客是我构建的<strong>数字孪生级知识管理系统</strong>，用来记录学习、整理思考、分享见解。
      </p>
      
      <div class="quote-box-3d">
        <span class="quote-icon">"</span>
        <blockquote>构建第二大脑，让知识流动起来。</blockquote>
        <span class="quote-icon">"</span>
      </div>
    </section>

    <!-- Skills Section -->
    <section class="skills-section-3d">
      <h2>🛠️ 技术栈</h2>
      <div class="skills-cloud-3d">
        <span v-for="(skill, index) in skills" :key="skill" class="skill-tag-3d" :style="{ animationDelay: `${index * 0.05}s` }">{{ skill }}</span>
      </div>
    </section>

    <!-- Timeline Section -->
    <section class="timeline-section-3d">
      <h2>📅 时间线</h2>
      <div class="timeline-3d">
        <div v-for="(item, index) in timeline" :key="item.title" class="timeline-item-3d" :style="{ animationDelay: `${index * 0.15}s` }">
          <div class="timeline-marker-3d">{{ item.icon }}</div>
          <div class="timeline-content-3d">
            <div class="timeline-date-3d">{{ item.date }}</div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="contact-section-3d">
      <h2>📮 联系我</h2>
      <p>如果你有任何问题、建议，或者只是想聊聊技术，欢迎随时联系我！</p>
      
      <div class="contact-grid-3d">
        <a v-for="(contact, index) in contacts" :key="contact.title" :href="contact.link" class="contact-card-3d" :style="{ animationDelay: `${index * 0.1}s` }">
          <div class="contact-icon-3d">{{ contact.icon }}</div>
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
  </div>
</template>

<script setup lang="ts">
const skills = ['PyTorch', 'Transformers', 'LLM', 'RLHF', 'Vue 3', 'React', 'TypeScript', 'Tailwind', 'Python', 'Node.js', 'PostgreSQL', 'Redis', 'Docker']

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
</script>

<style scoped>
.about-page-3d {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  padding: 80px 24px 60px;
  overflow: visible;
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
  animation: float-orb 25s ease-in-out infinite;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 70%);
  top: 10%;
  left: 30%;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%);
  top: 50%;
  right: 20%;
  animation-delay: -8s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.12), transparent 70%);
  bottom: 20%;
  left: 40%;
  animation-delay: -16s;
}

@keyframes float-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -40px) scale(1.1); }
  66% { transform: translate(-30px, 30px) scale(0.9); }
}

/* 3D Profile Hero */
.profile-hero-3d {
  text-align: center;
  padding: 60px 0 40px;
  position: relative;
}

.avatar-wrapper-3d {
  position: relative;
  display: inline-block;
  margin-bottom: 32px;
}

.avatar-3d {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  box-shadow: 
    0 8px 32px rgba(59, 130, 246, 0.4),
    0 16px 64px rgba(139, 92, 246, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  position: relative;
  z-index: 2;
  animation: avatar-float 4s ease-in-out infinite;
  transform-style: preserve-3d;
}

@keyframes avatar-float {
  0%, 100% { transform: translateY(0) rotateY(0); }
  50% { transform: translateY(-10px) rotateY(5deg); }
}

.avatar-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 0;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

.avatar-ring-3d {
  position: absolute;
  border-radius: 50%;
  border: 2px dashed;
  z-index: 1;
}

.ring-1 {
  top: -12px;
  left: -12px;
  right: -12px;
  bottom: -12px;
  border-color: rgba(59, 130, 246, 0.4);
  animation: spin 15s linear infinite;
}

.ring-2 {
  top: -24px;
  left: -24px;
  right: -24px;
  bottom: -24px;
  border-color: rgba(139, 92, 246, 0.2);
  animation: spin-reverse 25s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes spin-reverse { to { transform: rotate(-360deg); } }

.name-3d {
  font-size: 42px;
  font-weight: 800;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
  letter-spacing: -1px;
  filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.2));
}

.tagline-3d {
  font-size: 18px;
  color: #64748b;
  margin-bottom: 32px;
  font-weight: 500;
}

.social-links-3d {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.social-btn-3d {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  color: #64748b;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.social-btn-3d::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.social-btn-3d:hover {
  transform: translateY(-4px) rotateX(10deg);
  border-color: transparent;
  box-shadow: 0 12px 30px rgba(59, 130, 246, 0.3);
  color: white;
}

.social-btn-3d:hover::before {
  opacity: 1;
}

.social-btn-3d svg {
  position: relative;
  z-index: 1;
}

/* Intro Section */
.intro-section-3d {
  padding: 48px 0;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.intro-section-3d h2 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 20px;
  color: #1e293b;
}

.intro-text-3d {
  font-size: 17px;
  line-height: 1.9;
  color: #475569;
}

.intro-text-3d strong {
  color: #3b82f6;
  font-weight: 700;
}

.quote-box-3d {
  margin-top: 32px;
  padding: 28px 32px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 20px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.1);
}

.quote-icon {
  font-size: 48px;
  color: #3b82f6;
  font-family: Georgia, serif;
  line-height: 1;
  opacity: 0.5;
}

.quote-box-3d blockquote {
  margin: 0;
  font-size: 20px;
  font-style: italic;
  color: #1d4ed8;
  font-weight: 600;
  text-align: center;
}

/* Skills Section */
.skills-section-3d {
  padding: 48px 0;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.skills-section-3d h2 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 24px;
  color: #1e293b;
}

.skills-cloud-3d {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.skill-tag-3d {
  padding: 10px 20px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  animation: tag-pop 0.4s ease backwards;
}

@keyframes tag-pop {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.skill-tag-3d:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-3px) rotate(2deg);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

/* Timeline Section */
.timeline-section-3d {
  padding: 48px 0;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.timeline-section-3d h2 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 40px;
  color: #1e293b;
}

.timeline-3d {
  position: relative;
  padding-left: 40px;
}

.timeline-3d::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6, #10b981);
  border-radius: 1px;
}

.timeline-item-3d {
  position: relative;
  margin-bottom: 36px;
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

.timeline-marker-3d {
  position: absolute;
  left: -40px;
  width: 40px;
  height: 40px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 2px solid #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  z-index: 1;
  transition: all 0.3s ease;
}

.timeline-item-3d:hover .timeline-marker-3d {
  transform: scale(1.15) rotate(10deg);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.timeline-content-3d {
  padding-left: 20px;
  padding: 20px 24px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
}

.timeline-item-3d:hover .timeline-content-3d {
  transform: translateX(8px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
  border-color: rgba(59, 130, 246, 0.3);
}

.timeline-date-3d {
  font-size: 13px;
  color: #3b82f6;
  font-weight: 700;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.timeline-content-3d h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1e293b;
}

.timeline-content-3d p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

/* Contact Section */
.contact-section-3d {
  padding: 48px 0;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

.contact-section-3d h2 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 12px;
  color: #1e293b;
}

.contact-section-3d > p {
  color: #64748b;
  margin-bottom: 28px;
  font-size: 16px;
}

.contact-grid-3d {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.contact-card-3d {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  animation: card-fade-in 0.5s ease backwards;
  position: relative;
  overflow: hidden;
}

@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.contact-card-3d::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
  opacity: 0;
  transition: opacity 0.3s;
}

.contact-card-3d:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-4px) rotateX(5deg);
  box-shadow: 0 16px 40px rgba(59, 130, 246, 0.15);
}

.contact-card-3d:hover::before {
  opacity: 1;
}

.contact-icon-3d {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  transition: all 0.3s ease;
}

.contact-card-3d:hover .contact-icon-3d {
  transform: scale(1.1) rotate(-5deg);
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.contact-info {
  flex: 1;
}

.contact-info h4 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #1e293b;
}

.contact-info span {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.contact-arrow {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.3s ease;
}

.contact-arrow svg {
  width: 18px;
  height: 18px;
}

.contact-card-3d:hover .contact-arrow {
  color: #3b82f6;
  transform: translateX(4px);
}

/* Responsive */
@media (max-width: 640px) {
  .about-page-3d {
    padding: 50px 16px 40px;
  }
  
  .avatar-3d {
    width: 120px;
    height: 120px;
    font-size: 60px;
  }
  
  .name-3d {
    font-size: 32px;
  }
  
  .timeline-3d {
    padding-left: 32px;
  }
  
  .timeline-marker-3d {
    left: -32px;
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  .contact-grid-3d {
    grid-template-columns: 1fr;
  }
  
  .quote-box-3d {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }
  
  .quote-box-3d blockquote {
    font-size: 18px;
  }
}
</style>
