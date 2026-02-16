<template>
  <div class="section-page">
    <!-- Profile Hero with animated avatar -->
    <section class="profile-hero">
      <div class="avatar-wrapper">
        <div class="avatar">
          <span>🚀</span>
        </div>
        <div class="avatar-ring"></div>
      </div>
      
      <h1 class="name">MetaUniverse</h1>
      <p class="tagline">AI 研究员 · 全栈开发者 · 终身学习者</p>
      
      <div class="social-links">
        <a href="https://github.com" target="_blank" class="social-btn" title="GitHub">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <a href="mailto:hello@example.com" class="social-btn" title="Email">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </a>
        <a href="#" class="social-btn" title="Twitter">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        </a>
      </div>
    </section>

    <!-- Intro Section -->
    <section class="intro-section">
      <h2>👋 你好，我是 MetaUniverse</h2>
      <p class="intro-text">
        一名热爱技术的 AI 研究员和全栈开发者。我相信<strong>知识的力量</strong>，也相信<strong>分享的快乐</strong>。
        这个博客是我构建的<strong>数字孪生级知识管理系统</strong>，用来记录学习、整理思考、分享见解。
      </p>
      
      <div class="quote-box">
        <blockquote>"构建第二大脑，让知识流动起来。"</blockquote>
      </div>
    </section>

    <!-- Skills Section -->
    <section class="skills-section">
      <h2>🛠️ 技术栈</h2>
      <div class="skills-cloud">
        <span v-for="skill in skills" :key="skill" class="skill-tag">{{ skill }}</span>
      </div>
    </section>

    <!-- Timeline Section -->
    <section class="timeline-section">
      <h2>📅 时间线</h2>
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-marker">🚀</div>
          <div class="timeline-content">
            <div class="timeline-date">2024 - 至今</div>
            <h3>深入研究大模型与强化学习</h3>
            <p>专注于 LLM、RLHF、DPO、GRPO 等方向的研究，构建了这个知识管理系统。</p>
          </div>
        </div>
        
        <div class="timeline-item">
          <div class="timeline-marker">💼</div>
          <div class="timeline-content">
            <div class="timeline-date">2022 - 2024</div>
            <h3>全栈开发者</h3>
            <p>在科技公司担任全栈工程师，负责 AI 产品的研发和部署。</p>
          </div>
        </div>
        
        <div class="timeline-item">
          <div class="timeline-marker">🎓</div>
          <div class="timeline-content">
            <div class="timeline-date">2018 - 2022</div>
            <h3>计算机科学学位</h3>
            <p>系统学习计算机科学基础，对人工智能产生浓厚兴趣。</p>
          </div>
        </div>
        
        <div class="timeline-item">
          <div class="timeline-marker">💻</div>
          <div class="timeline-content">
            <div class="timeline-date">2015 - 至今</div>
            <h3>编程之旅</h3>
            <p>写下第一行 "Hello World"，从此踏上编程的不归路。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="contact-section">
      <h2>📮 联系我</h2>
      <p>如果你有任何问题、建议，或者只是想聊聊技术，欢迎随时联系我！</p>
      
      <div class="contact-grid">
        <a href="mailto:hello@example.com" class="contact-card">
          <div class="contact-icon">📧</div>
          <div class="contact-info">
            <h4>Email</h4>
            <span>hello@example.com</span>
          </div>
        </a>
        
        <a href="https://github.com" target="_blank" class="contact-card">
          <div class="contact-icon">🐙</div>
          <div class="contact-info">
            <h4>GitHub</h4>
            <span>@metauniverse</span>
          </div>
        </a>
        
        <a href="#" class="contact-card">
          <div class="contact-icon">💬</div>
          <div class="contact-info">
            <h4>微信</h4>
            <span>metauniverse</span>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const skills = ['PyTorch', 'Transformers', 'LLM', 'RLHF', 'Vue 3', 'React', 'TypeScript', 'Tailwind', 'Python', 'Node.js', 'PostgreSQL', 'Redis', 'Docker']
</script>

<style scoped>
.section-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 80px 24px 60px;
  overflow: visible;
}

/* Profile Hero with Animated Avatar */
.profile-hero {
  text-align: center;
  padding: 40px 0;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 24px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  box-shadow: 0 8px 32px rgba(22, 119, 255, 0.3);
  position: relative;
  z-index: 1;
}

.avatar-ring {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  border-radius: 50%;
  border: 2px dashed var(--vp-c-brand);
  animation: spin 20s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.name {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.3;
  overflow: visible;
}

.tagline {
  font-size: 17px;
  color: var(--vp-c-text-2);
  margin-bottom: 24px;
  line-height: 1.5;
  overflow: visible;
}

.social-links {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.social-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  transition: all 0.2s;
  border: 1px solid var(--vp-c-divider);
}

.social-btn:hover {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
  transform: translateY(-2px);
}

/* Intro Section */
.intro-section {
  padding: 40px 0;
  border-top: 1px solid var(--vp-c-divider);
}

.intro-section h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--vp-c-text-1);
}

.intro-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.quote-box {
  margin-top: 24px;
  padding: 20px 24px;
  background: var(--vp-c-brand-soft);
  border-left: 4px solid var(--vp-c-brand);
  border-radius: 0 8px 8px 0;
}

.quote-box blockquote {
  margin: 0;
  font-size: 17px;
  font-style: italic;
  color: var(--vp-c-brand-dark);
}

/* Skills Section */
.skills-section {
  padding: 40px 0;
  border-top: 1px solid var(--vp-c-divider);
}

.skills-section h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--vp-c-text-1);
}

.skills-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-tag {
  padding: 8px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
}

.skill-tag:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  transform: translateY(-2px);
}

/* Timeline Section */
.timeline-section {
  padding: 40px 0;
  border-top: 1px solid var(--vp-c-divider);
}

.timeline-section h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 32px;
  color: var(--vp-c-text-1);
}

.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--vp-c-divider);
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
}

.timeline-marker {
  position: absolute;
  left: -32px;
  width: 32px;
  height: 32px;
  background: var(--vp-c-bg);
  border: 2px solid var(--vp-c-brand);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.timeline-content {
  padding-left: 16px;
}

.timeline-date {
  font-size: 13px;
  color: var(--vp-c-brand);
  font-weight: 600;
  margin-bottom: 4px;
}

.timeline-content h3 {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
}

.timeline-content p {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* Contact Section */
.contact-section {
  padding: 40px 0;
  border-top: 1px solid var(--vp-c-divider);
}

.contact-section h2 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--vp-c-text-1);
}

.contact-section > p {
  color: var(--vp-c-text-2);
  margin-bottom: 24px;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.contact-card:hover {
  border-color: var(--vp-c-brand);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.contact-icon {
  font-size: 28px;
}

.contact-info h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--vp-c-text-1);
}

.contact-info span {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

@media (max-width: 640px) {
  .section-page {
    padding: 50px 16px 40px;
  }
  
  .name {
    font-size: 28px;
  }
  
  .timeline {
    padding-left: 24px;
  }
  
  .timeline-marker {
    left: -24px;
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
  
  .contact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
