<template>
  <div class="home-page-star-river">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <!-- Badge -->
        <div class="hero-badge fade-up" :class="{ 'visible': isLoaded }">
          <span class="badge-star">✦</span>
          <span class="badge-text">AI 驱动的知识管理系统</span>
        </div>
        
        <!-- Title - Large Typography -->
        <h1 class="hero-title sr-title-large fade-up stagger-1" :class="{ 'visible': isLoaded }">
          <span class="title-main">Meta</span>
          <span class="title-accent">Universe</span>
        </h1>
        
        <p class="hero-desc sr-subtitle fade-up stagger-2" :class="{ 'visible': isLoaded }">
          构建你的第二大脑，探索全息知识网络 <br/>
          大语言模型 · 星河平台 · 端侧部署
        </p>
        
        <!-- Actions -->
        <div class="hero-actions fade-up stagger-3" :class="{ 'visible': isLoaded }">
          <a href="/sections/knowledge/rl-math-principle/" class="star-btn star-btn-primary magnetic-btn">
            <span>开始探索</span>
            <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a href="/sections/about/" class="star-btn magnetic-btn">
            <span>关于作者</span>
          </a>
        </div>
      </div>
      
      <!-- Floating Orbs — ambient decoration -->
      <div class="hero-orbs" :class="{ 'visible': isLoaded }">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
      
      <!-- Stats - Glass Cards -->
      <div class="hero-stats" :class="{ 'visible': isLoaded }">
        <div 
          v-for="(stat, i) in stats" 
          :key="stat.label" 
          class="stat-card glass-card glass-card-hover tilt-card scale-in"
          :style="{ transitionDelay: `${0.4 + i * 0.1}s` }"
        >
          <span class="stat-icon">{{ stat.icon }}</span>
          <span class="stat-num">{{ stat.num }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <!-- Tech Stack Marquee - Enhanced Scroll -->
    <section class="marquee-section fade-up" :class="{ 'visible': isLoaded }">
      <div class="marquee-track">
        <div class="marquee-content">
          <span v-for="(tech, i) in [...techStack, ...techStack, ...techStack, ...techStack]" :key="i" class="tech-badge badge-outline">
            {{ tech }}
          </span>
        </div>
      </div>
      <div class="marquee-track" style="margin-top: 16px;">
        <div class="marquee-content reverse">
          <span v-for="(tech, i) in [...techStack2, ...techStack2, ...techStack2, ...techStack2]" :key="i" class="tech-badge badge-filled">
            {{ tech }}
          </span>
        </div>
      </div>
      <div class="marquee-track" style="margin-top: 16px;">
        <div class="marquee-content">
          <span v-for="(tech, i) in [...techStack3, ...techStack3, ...techStack3, ...techStack3]" :key="i" class="tech-badge badge-outline" style="opacity: 0.8">
            {{ tech }}
          </span>
        </div>
      </div>
    </section>

    <!-- Features Section - Grid Layout -->
    <section class="features-section sr-section">
      <div class="sr-container">
        <div class="section-header fade-up" :class="{ 'visible': featuresVisible }">
          <span class="section-badge">✦ 核心模块</span>
          <h2 class="section-title-lg">探索知识宇宙</h2>
          <p class="section-desc sr-body">四大核心模块，覆盖从学习到创作的完整工作流</p>
        </div>
        
        <div class="features-grid sr-grid sr-grid-2">
          <a 
            v-for="(feature, index) in features" 
            :key="feature.title"
            :href="feature.link"
            class="feature-card glass-card glass-card-hover tilt-card fade-up"
            :class="{ 'visible': featuresVisible }"
            :style="{ transitionDelay: `${index * 80}ms` }"
          >
            <div class="feature-header">
              <div class="feature-icon-wrapper">
                <span class="feature-icon">{{ feature.icon }}</span>
              </div>
              <span class="sr-tag" :class="'sr-tag-morandi-' + feature.tagColor">{{ feature.tag }}</span>
            </div>
            
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-desc sr-body">{{ feature.desc }}</p>
            
            <div class="feature-link">
              <span>{{ feature.linkText }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- Community Voices - Dual Vertical Scroll -->
    <section class="community-section sr-section">
      <div class="sr-container community-container">
        <div class="community-header fade-up" :class="{ 'visible': communityVisible }">
          <span class="section-badge">◎ 社区探索</span>
          <h2 class="section-title-lg">倾听全球社区声音</h2>
          <p class="section-desc sr-body">与全球数万名开发者共同探索人工智能与前沿技术知识。从强化学习的数学原理，到工程化的落地实践。</p>
          <a href="/sections/about/" class="star-btn magnetic-btn" style="margin-top: 24px; display: inline-flex;">
            加入我们
          </a>
        </div>
        
        <div class="community-scroll-wrapper fade-up stagger-1" :class="{ 'visible': communityVisible }">
          <!-- Left Column (Scrolling UP) -->
          <div class="scroll-column column-up">
            <div class="scroll-content-up">
              <div v-for="(voice, i) in [...voicesLeft, ...voicesLeft]" :key="'l'+i" class="voice-card glass-card">
                <p class="voice-text">"{{ voice.text }}"</p>
                <div class="voice-author">
                  <div class="avatar">{{ voice.avatar }}</div>
                  <div>
                    <div class="name">{{ voice.name }}</div>
                    <div class="role">{{ voice.role }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Right Column (Scrolling DOWN) -->
          <div class="scroll-column column-down">
            <div class="scroll-content-down">
              <div v-for="(voice, i) in [...voicesRight, ...voicesRight]" :key="'r'+i" class="voice-card glass-card">
                <p class="voice-text">"{{ voice.text }}"</p>
                <div class="voice-author">
                  <div class="avatar">{{ voice.avatar }}</div>
                  <div>
                    <div class="name">{{ voice.name }}</div>
                    <div class="role">{{ voice.role }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Highlights Section — visual richness -->
    <section class="highlights-section sr-section">
      <div class="sr-container">
        <div class="section-header fade-up" :class="{ 'visible': highlightsVisible }">
          <span class="section-badge">◈ 技术亮点</span>
          <h2 class="section-title-lg">为什么选择 MetaUniverse</h2>
        </div>

        <div class="highlights-grid">
          <div 
            v-for="(hl, i) in highlights" 
            :key="hl.title"
            class="highlight-item fade-up"
            :class="{ 'visible': highlightsVisible }"
            :style="{ transitionDelay: `${i * 60}ms` }"
          >
            <div class="highlight-num">{{ String(i + 1).padStart(2, '0') }}</div>
            <div class="highlight-content">
              <h4>{{ hl.title }}</h4>
              <p>{{ hl.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Updates Section -->
    <section class="recent-section sr-section">
      <div class="sr-container">
        <div class="section-header-row">
          <div>
            <span class="section-badge">◎ 最近更新</span>
            <h2 class="section-title-lg" style="margin-top: 8px;">最新动态</h2>
          </div>
          <a href="/sections/posts/" class="star-btn magnetic-btn">
            查看全部
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
              <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
        
        <div class="recent-list">
          <a 
            v-for="(item, index) in recentItems" 
            :key="item.title" 
            :href="item.link" 
            class="recent-item glass-card glass-card-hover micro-interaction fade-up"
            :class="{ 'visible': recentVisible }"
            :style="{ transitionDelay: `${index * 80}ms` }"
          >
            <div class="recent-meta">
              <span class="sr-tag" :class="'sr-tag-morandi-' + item.tagColor">{{ item.tag }}</span>
              <span class="recent-date">{{ item.date }}</span>
            </div>
            
            <div class="recent-content">
              <h4>{{ item.title }}</h4>
              <p>{{ item.desc }}</p>
            </div>
            
            <svg class="recent-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- Projects Section -->
    <section class="projects-section sr-section fade-up" :class="{ 'visible': recentVisible }">
      <div class="sr-container">
        <div class="section-header">
          <span class="section-badge">🚀 开源项目</span>
          <h2 class="section-title-lg">技术实践</h2>
          <p class="section-desc sr-body">将理论知识转化为实际项目，探索技术的无限可能</p>
        </div>
        
        <div class="projects-grid sr-grid sr-grid-2">
          <a 
            v-for="(project, index) in projects" 
            :key="project.title"
            :href="project.link"
            class="project-card glass-card glass-card-hover tilt-card fade-up"
            :class="{ 'visible': recentVisible }"
            :style="{ transitionDelay: `${index * 100}ms` }"
          >
            <div class="project-header">
              <div class="project-icon-wrapper">
                <span class="project-icon">{{ project.icon }}</span>
              </div>
              <div class="project-tags">
                <span v-for="tag in project.tags" :key="tag" class="project-tag">{{ tag }}</span>
              </div>
            </div>
            
            <h3 class="project-title">{{ project.title }}</h3>
            <p class="project-desc">{{ project.desc }}</p>
            
            <div class="project-stats">
              <span class="project-stat">
                <span class="stat-dot" :style="{ background: project.statusColor }"></span>
                {{ project.status }}
              </span>
              <span class="project-stat">⭐ {{ project.stars }}</span>
            </div>
            
            <div class="project-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- Extended Knowledge Section -->
    <section class="extended-section sr-section fade-up" :class="{ 'visible': recentVisible }">
      <div class="sr-container">
        <div class="section-header">
          <span class="section-badge">📚 扩展知识</span>
          <h2 class="section-title-lg">深度阅读</h2>
          <p class="section-desc sr-body">精选的技术文章和教程，助你深入理解复杂概念</p>
        </div>
        
        <div class="extended-list">
          <a 
            v-for="(item, index) in extendedArticles" 
            :key="item.title" 
            :href="item.link"
            class="extended-item glass-card glass-card-hover tilt-card fade-up"
            :class="{ 'visible': recentVisible }"
            :style="{ transitionDelay: `${index * 80}ms` }"
          >
            <div class="extended-marker" :class="item.type"></div>
            <div class="extended-content">
              <div class="extended-meta">
                <span class="extended-type">{{ item.typeLabel }}</span>
                <span class="extended-date">{{ item.date }}</span>
              </div>
              <h4 class="extended-title">{{ item.title }}</h4>
              <p class="extended-excerpt">{{ item.excerpt }}</p>
              <div class="extended-tags">
                <span v-for="tag in item.tags" :key="tag" class="extended-tag">{{ tag }}</span>
              </div>
            </div>
            <svg class="extended-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- Bottom CTA — immersive -->
    <section class="cta-section sr-section fade-up" :class="{ 'visible': recentVisible }">
      <div class="cta-card glass-card tilt-card">
        <div class="cta-visual">
          <div class="cta-glow"></div>
          <span class="cta-icon">✦</span>
        </div>
        <div class="cta-content">
          <h3>准备好探索了吗？</h3>
          <p class="sr-body">从强化学习数学原理开始，踏上系统化学习的旅程</p>
        </div>
        <a href="/sections/knowledge/rl-math-principle/" class="star-btn star-btn-primary magnetic-btn">
          启程
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
            <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

// Loading state
const isLoaded = ref(false)
const featuresVisible = ref(false)
const communityVisible = ref(false)
const highlightsVisible = ref(false)
const recentVisible = ref(false)

// Voices Data for Dual Scroll
const voicesLeft = [
  { name: 'Alex Chen', role: 'AI Researcher', avatar: '👨‍🔬', text: '这个平台彻底改变了我阅读论文的方式，排版对数学公式的支持非常棒。' },
  { name: 'Sarah J.', role: 'Frontend Lead', avatar: '👩‍💻', text: '极简的莫兰迪风格和玻璃拟态 UI 让人在阅读长篇技术文章时感到极度舒适。' },
  { name: 'David W.', role: 'Data Scientist', avatar: '🧑‍💻', text: '终于找到了一个能把强化学习讲得既严谨又易懂的知识库。' },
  { name: 'Dr. Emily', role: 'Professor', avatar: '👩‍🏫', text: '我建议我的学生在这里学习大模型的底层架构，系统的脉络非常清晰。' }
]
const voicesRight = [
  { name: 'Kevin H.', role: 'Backend Engineer', avatar: '👨‍💻', text: '技术深度令人惊叹，这里的 Agentic Workflow 解析让我受益匪浅。' },
  { name: 'Linda Y.', role: 'Product Manager', avatar: '👩‍💼', text: '把复杂的前沿 AI 概念讲得如此优雅，真的是不可多得的资源。' },
  { name: 'Tom R.', role: 'Student', avatar: '🎓', text: '扩散模型和 PyTorch 的系列文章简直是我的毕业设计救星。' },
  { name: 'Sophia L.', role: 'UI/UX Designer', avatar: '🎨', text: '从字体排版到弹性动画，每一处细节的处理都充满了高级质感。' }
]

// Tech stack for marquee
const techStack = [
  'PyTorch', 'Transformers', 'LLM', 'RLHF', 'Vue 3', 'React', 
  'TypeScript', 'Tailwind', 'Python', 'Node.js', 'PostgreSQL', 
  'Redis', 'Docker', 'VitePress', 'DeepSeek'
]
const techStack2 = [
  'Node.js', 'Docker', 'Vite', 'ONNX', 'TensorRT', 'LangChain',
  'CUDA 12', 'Framer Motion', 'WebGL', 'WebGPU', 'Ollama', 
  'vLLM', 'TensorFlow', 'JAX', 'Pydantic'
]
const techStack3 = [
  'Agentic Workflow', 'Retrieval Augmented Generation', 'Vector Database', 
  'Milvus', 'Qdrant', 'Kubernetes', 'FastAPI', 'gRPC', 'WebSockets',
  'Rust', 'Go', 'WebAssembly', 'OpenAI', 'Anthropic', 'Gemini'
]

// Stats data
const stats = [
  { num: '200+', label: '知识节点', icon: '◈' },
  { num: '20+', label: '技术文章', icon: '◎' },
  { num: '10K+', label: '总阅读', icon: '✦' }
]

// Features data
const features = [
  {
    icon: '◈',
    title: '知识库',
    desc: '强化学习数学原理、系统化知识体系，从测度论到策略梯度，深度剖析技术原理',
    link: '/sections/knowledge/rl-math-principle/',
    linkText: '探索知识',
    tag: '核心',
    tagColor: 'purple'
  },
  {
    icon: '◎',
    title: '文章列表',
    desc: 'AI 论文阅读、技术博客、学习笔记，记录从理论到工程的每一步思考',
    link: '/sections/posts/ai-paper-reading-2024.html',
    linkText: '阅读文章',
    tag: '博客',
    tagColor: 'blue'
  },
  {
    icon: '◉',
    title: '公开资源',
    desc: '精选开源项目与工具，提升开发效率，从框架到部署一应俱全',
    link: '/sections/resources/',
    linkText: '查看资源',
    tag: '资源',
    tagColor: 'green'
  },
  {
    icon: '✦',
    title: '关于我',
    desc: '全栈开发者 × AI 研究员，在电路与系统的边界探索大模型的星辰大海',
    link: '/sections/about/',
    linkText: '了解更多',
    tag: '关于',
    tagColor: 'beige'
  }
]

// Highlights data
const highlights = [
  { title: 'AI 驱动', desc: '内置 AI 助手，智能检索、自动化任务编排' },
  { title: '数学严谨', desc: '从测度论出发，建立强化学习的严格数学框架' },
  { title: '全栈覆盖', desc: 'PyTorch × Vue 3 × Docker，从训练到部署' },
  { title: '知识图谱', desc: '关联式知识管理，构建可视化学习路径' },
  { title: '持续迭代', desc: '每周更新内容，追踪前沿 AI 研究成果' },
  { title: '开源精神', desc: '所有内容开放共享，共建技术社区' }
]

// Recent items data
const recentItems = [
  {
    title: 'AI 论文阅读 2024',
    desc: '精选2024年人工智能领域的重要论文，深入解读核心思想与创新点',
    link: '/sections/posts/ai-paper-reading-2024/ai-paper-reading-2024.html',
    tag: 'AI',
    tagColor: 'purple',
    date: '2024-12-01'
  },
  {
    title: '强化学习：从游戏到现实',
    desc: '探讨强化学习技术在游戏、机器人、推荐系统等领域的应用',
    link: '/sections/posts/rl-from-game-to-reality/rl-from-game-to-reality.html',
    tag: 'RL',
    tagColor: 'blue',
    date: '2024-11-15'
  },
  {
    title: '测度论基础',
    desc: '从测度论的角度理解强化学习，建立严格的数学框架',
    link: '/sections/knowledge/rl-math-principle/00_Foundations/01_Theory_Derivation.html',
    tag: '数学',
    tagColor: 'green',
    date: '2024-10-20'
  }
]

// Projects data
const projects = [
  {
    icon: '🧠',
    title: 'MetaBlog 知识系统',
    desc: 'AI 驱动的智能博客系统，支持知识图谱、RAG 检索、Agent 工作流',
    tags: ['Vue 3', 'VitePress', 'AI'],
    status: '持续开发',
    statusColor: '#10b981',
    stars: '128',
    link: '/sections/about/'
  },
  {
    icon: '📊',
    title: 'RL-Notebooks',
    desc: '强化学习算法实现集合，包含 DQN、PPO、SAC 等算法的 PyTorch 实现',
    tags: ['PyTorch', 'RL', 'Jupyter'],
    status: '开源维护',
    statusColor: '#3b82f6',
    stars: '256',
    link: '/sections/knowledge/'
  },
  {
    icon: '🤖',
    title: 'LLM-Toolkit',
    desc: '大语言模型工具包，支持多种模型接入、Prompt 管理、对话导出',
    tags: ['Python', 'LLM', 'CLI'],
    status: '版本迭代',
    statusColor: '#f59e0b',
    stars: '89',
    link: '/chat'
  },
  {
    icon: '🔍',
    title: 'PaperLens',
    desc: 'AI 论文阅读助手，自动摘要、关键概念提取、相关论文推荐',
    tags: ['NLP', 'RAG', 'Streamlit'],
    status: '原型开发',
    statusColor: '#8b5cf6',
    stars: '45',
    link: '/sections/posts/ai-paper-reading-2024/'
  }
]

// Extended articles data
const extendedArticles = [
  {
    title: 'DeepSeek-V3 核心技术解析：MoE 与 MLA 机制',
    excerpt: '深入解析 DeepSeek-V3 中的混合专家模型(MoE)和多头潜在注意力机制(MLA)，理解其高效训练与推理的技术原理...',
    link: '/sections/posts/DeepSeek-V3中的MoE与MLA：混合专家与多头潜在注意力机制详解.html',
    type: 'paper',
    typeLabel: '论文解读',
    date: '2024-12',
    tags: ['DeepSeek', 'MoE', 'Attention']
  },
  {
    title: 'Transformer 架构详解',
    excerpt: '从自注意力机制到多头注意力，从编码器到解码器，全面解析 Transformer 架构的设计原理与实现细节...',
    link: '/sections/posts/Transformer-详解.html',
    type: 'tutorial',
    typeLabel: '技术教程',
    date: '2024-11',
    tags: ['Transformer', 'NLP', 'Deep Learning']
  },
  {
    title: 'Docker 容器化部署实战',
    excerpt: '从 Dockerfile 编写到多容器编排，掌握 Docker Compose 和容器网络配置，实现应用的容器化部署...',
    link: '/sections/posts/docker.html',
    type: 'guide',
    typeLabel: '实践指南',
    date: '2024-10',
    tags: ['Docker', 'DevOps', 'Deployment']
  },
  {
    title: '微服务架构设计模式',
    excerpt: '探讨微服务架构的核心设计模式，包括服务发现、负载均衡、熔断降级、分布式追踪等关键概念...',
    link: '/sections/posts/微服务架构设计模式详解.html',
    type: 'architecture',
    typeLabel: '架构设计',
    date: '2024-09',
    tags: ['Microservices', 'Architecture', 'Cloud']
  },
  {
    title: '李白生平解析：诗仙的传奇人生',
    excerpt: '穿越千年时光，探寻李白的人生轨迹，解读其诗歌创作背后的历史背景与情感世界...',
    link: '/sections/posts/李白生平解析：诗仙的传奇人生.html',
    type: 'culture',
    typeLabel: '人文历史',
    date: '2024-08',
    tags: ['History', 'Poetry', 'Culture']
  }
]

// Intersection observers
let observers: IntersectionObserver[] = []

const observeSection = (selector: string, ref: { value: boolean }) => {
  const el = document.querySelector(selector)
  if (el) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ref.value = true
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.15 })
    observer.observe(el)
    observers.push(observer)
  }
}

onMounted(() => {
  requestAnimationFrame(() => { isLoaded.value = true })
  observeSection('.features-section', featuresVisible)
  observeSection('.community-section', communityVisible)
  observeSection('.highlights-section', highlightsVisible)
  observeSection('.recent-section', recentVisible)
  
  // 初始化卡片倾斜效果
  nextTick(() => {
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

onUnmounted(() => {
  observers.forEach(obs => obs.disconnect())
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   HomePage - Star River Design System — Enriched
   ═══════════════════════════════════════════════════════════════════════════ */

.home-page-star-river {
  position: relative;
  width: 95%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

/* ── Hero Section ── */
.hero-section {
  min-height: 90vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 120px 0 60px;
  text-align: center;
  position: relative;
}

.hero-content {
  max-width: 800px;
  margin-bottom: 60px;
  position: relative;
  z-index: 1;
}

/* Badge */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  margin-bottom: 32px;
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-full);
  background: var(--sr-glass-bg);
  backdrop-filter: blur(8px);
}

.badge-star { font-size: 12px; color: var(--sr-accent-star); }
.badge-text { font-size: 12px; font-weight: 500; letter-spacing: 0.05em; color: var(--sr-text-secondary); }

/* Title */
.hero-title { margin-bottom: 24px; line-height: 1.1; }
.title-main { color: var(--sr-text-primary); font-weight: 200; font-size: 64px; display: block; }
.title-accent { color: var(--sr-morandi-purple); font-weight: 400; font-size: 64px; display: block; }

/* Description */
.hero-desc { max-width: 580px; margin: 0 auto 48px; font-size: 20px; line-height: 1.6; }

/* Actions */
.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-arrow {
  width: 16px;
  height: 16px;
  margin-left: 4px;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.star-btn:hover .btn-arrow {
  transform: translateX(4px);
}

/* Floating Orbs — ambient background effect */
.hero-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  transition: opacity 1.5s ease;
}

.hero-orbs.visible { opacity: 1; }

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  animation: float 8s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(184, 160, 144, 0.12) 0%, transparent 70%);
  top: 10%;
  right: -5%;
  animation-delay: 0s;
}

.orb-2 {
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgba(179, 168, 184, 0.1) 0%, transparent 70%);
  bottom: 20%;
  left: -5%;
  animation-delay: -3s;
}

.orb-3 {
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(154, 168, 179, 0.1) 0%, transparent 70%);
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  animation-delay: -5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) translateX(0); }
  25% { transform: translateY(-20px) translateX(10px); }
  50% { transform: translateY(-10px) translateX(-10px); }
  75% { transform: translateY(-25px) translateX(5px); }
}

/* Stats */
.hero-stats {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
  opacity: 0;
  transition: opacity 0.6s ease;
  position: relative;
  z-index: 1;
}

.hero-stats.visible { opacity: 1; }

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 44px;
  min-width: 140px;
}

.stat-icon {
  font-size: 16px;
  color: var(--sr-accent-star);
  margin-bottom: 4px;
  opacity: 0.6;
}

.stat-num {
  font-size: 32px;
  font-weight: 200;
  color: var(--sr-text-primary);
  font-variant-numeric: tabular-nums;
}

.stat-suffix {
  font-size: 20px;
  font-weight: 300;
  color: var(--sr-accent-star);
  margin-left: 2px;
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sr-text-muted);
}

/* ── Tech Stack Marquee ── */
.marquee-section {
  padding: 60px 0;
  margin-bottom: 80px;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%);
}

.marquee-track {
  width: 100%;
  overflow: hidden;
}

.tech-badge {
  font-family: var(--sr-font-primary);
  font-size: 56px;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: -0.02em;
  line-height: 1;
}

.badge-outline {
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(184, 160, 144, 0.4); /* Morandi light border */
}

.badge-filled {
  color: rgba(184, 160, 144, 0.15); /* Solid ghost fill */
}

.marquee-content {
  display: flex;
  gap: 40px;
  width: max-content;
  animation: marquee 50s linear infinite;
  padding-left: 20px;
}

.marquee-content.reverse {
  animation: marquee-reverse 45s linear infinite;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(-25% - 10px)); } /* Since we use 4 copies, move 1 copy over (25%) */
}

@keyframes marquee-reverse {
  0% { transform: translateX(calc(-25% - 10px)); }
  100% { transform: translateX(0); }
}

/* ── Section Headers ── */
.section-header {
  text-align: left;
  margin-bottom: 56px;
}

.section-badge {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sr-accent-star);
  margin-bottom: 16px;
}

.section-title-lg {
  font-family: var(--sr-font-primary);
  font-size: 40px;
  font-weight: 600;
  color: var(--sr-text-primary);
  letter-spacing: -0.03em;
  margin: 0 0 16px;
}

.section-desc {
  max-width: 600px;
  font-size: 16px;
  color: var(--sr-text-secondary);
  line-height: 1.6;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 36px;
}

/* ── Features ── */
.features-section { padding-top: 80px; }

.features-grid { gap: 24px; }

.feature-card {
  display: flex;
  flex-direction: column;
  padding: 32px;
  text-decoration: none;
  color: inherit;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.feature-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-md);
  transition: transform 0.3s var(--sr-spring-bounce);
}

.feature-card:hover .feature-icon-wrapper {
  transform: scale(1.1);
}

.feature-icon {
  font-size: 20px;
  color: var(--sr-accent-star);
}

.feature-title {
  font-size: 20px;
  font-weight: 500;
  color: var(--sr-text-primary);
  margin-bottom: 12px;
}

.feature-desc {
  margin-bottom: 24px;
  flex: 1;
}

.feature-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-text-secondary);
  transition: color 0.2s ease;
}

.feature-link svg {
  width: 14px;
  height: 14px;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.feature-card:hover .feature-link {
  color: var(--sr-accent-star);
}

.feature-card:hover .feature-link svg {
  transform: translateX(4px);
}

/* ── Community Voices (Dual Scroll) ── */
.community-section {
  padding-top: 80px;
  padding-bottom: 80px;
}

.community-container {
  display: flex;
  align-items: center;
  gap: 60px;
}

.community-header {
  flex: 1;
  max-width: 400px;
}

.community-scroll-wrapper {
  flex: 1.5;
  display: flex;
  gap: 20px;
  height: 500px;
  overflow: hidden;
  position: relative;
  /* Soft fade at top and bottom of the vertical scroll columns */
  mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
}

.scroll-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.scroll-content-up {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: scroll-y-up 40s linear infinite;
}

.scroll-content-down {
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* Start positioned halfway up to allow downwards movement continuously */
  animation: scroll-y-down 40s linear infinite;
}

/* Pause animation on hover */
.scroll-column:hover .scroll-content-up,
.scroll-column:hover .scroll-content-down {
  animation-play-state: paused;
}

@keyframes scroll-y-up {
  0% { transform: translateY(0); }
  100% { transform: translateY(calc(-50% - 10px)); } /* 10px is half gap */
}

@keyframes scroll-y-down {
  0% { transform: translateY(calc(-50% - 10px)); }
  100% { transform: translateY(0); }
}

.voice-card {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: rgba(255, 255, 255, 0.45);
  transition: transform 0.3s var(--sr-spring-bounce), box-shadow 0.3s ease;
}

.voice-card:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 24px rgba(184, 160, 144, 0.1);
  border-color: rgba(255, 255, 255, 0.8);
}

.voice-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--sr-text-primary);
  font-style: italic;
  margin: 0;
}

.voice-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
}

.voice-author .avatar {
  font-size: 28px;
  background: var(--sr-bg-secondary);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sr-border-light);
}

.voice-author .name {
  font-weight: 600;
  font-size: 14px;
  color: var(--sr-text-primary);
  margin-bottom: 2px;
}

.voice-author .role {
  font-size: 12px;
  color: var(--sr-text-muted);
}

/* ── Highlights Grid ── */
.highlights-section { padding-top: 80px; }

.highlights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.highlight-item {
  display: flex;
  gap: 16px;
  padding: 28px;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-md);
  backdrop-filter: blur(8px);
  transition: all 0.35s var(--sr-spring-bounce);
}

.highlight-item:hover {
  transform: translateY(-3px);
  border-color: rgba(184, 160, 144, 0.2);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

.highlight-num {
  font-size: 32px;
  font-weight: 200;
  color: var(--sr-text-tertiary);
  line-height: 1;
  flex-shrink: 0;
  opacity: 0.4;
}

.highlight-content h4 {
  font-family: var(--sr-font-primary);
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 6px;
}

.highlight-content p {
  font-size: 13px;
  color: var(--sr-text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* ── Recent Section ── */
.recent-section { padding-top: 80px; }

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 28px;
  text-decoration: none;
  color: inherit;
}

.recent-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 100px;
}

.recent-date {
  font-size: 12px;
  color: var(--sr-text-muted);
}

.recent-content {
  flex: 1;
  min-width: 0;
}

.recent-content h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--sr-text-primary);
  margin-bottom: 6px;
  transition: color 0.2s ease;
}

.recent-item:hover .recent-content h4 {
  color: var(--sr-accent-star);
}

.recent-content p {
  font-size: 14px;
  color: var(--sr-text-muted);
  line-height: 1.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-arrow {
  width: 20px;
  height: 20px;
  color: var(--sr-text-muted);
  flex-shrink: 0;
  transition: all 0.3s var(--sr-spring-bounce);
}

.recent-item:hover .recent-arrow {
  color: var(--sr-accent-star);
  transform: translateX(4px);
}

/* ── Bottom CTA ── */
.cta-section {
  padding-top: 60px;
}

.cta-card {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 40px !important;
  position: relative;
  overflow: hidden;
}

.cta-visual {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cta-glow {
  position: absolute;
  inset: -10px;
  background: radial-gradient(circle, rgba(184, 160, 144, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: cta-breathe 4s ease-in-out infinite;
}

@keyframes cta-breathe {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.cta-icon {
  font-size: 28px;
  color: var(--sr-accent-star);
  position: relative;
  z-index: 1;
}

.cta-content {
  flex: 1;
}

.cta-content h3 {
  font-family: var(--sr-font-primary);
  font-size: 32px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 12px;
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .community-container {
    flex-direction: column;
  }
  
  .community-header {
    max-width: 100%;
    text-align: center;
    margin-bottom: 40px;
  }
  
  .community-scroll-wrapper {
    width: 100%;
    height: 400px;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 80px 0 60px;
    min-height: auto;
  }
  
  .hero-content { margin-bottom: 48px; }
  .hero-actions { flex-direction: column; align-items: center; }
  .star-btn { width: 100%; max-width: 280px; justify-content: center; }
  .features-grid { grid-template-columns: 1fr; }
  .highlights-grid { grid-template-columns: 1fr; }
  
  .recent-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .recent-meta {
    flex-direction: row;
    align-items: center;
    min-width: auto;
  }
  
  .recent-arrow { align-self: flex-end; }
  
  .cta-card {
    flex-direction: column;
    text-align: center;
  }

  .section-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .home-page-star-river { padding: 0 16px 60px; }
  .stat-card { padding: 24px 32px; min-width: 120px; }
  .stat-num { font-size: 28px; }
}

/* ── Projects Section ── */
.projects-section { padding-top: 80px; }

.projects-grid { gap: 24px; }

.project-card {
  display: flex;
  flex-direction: column;
  padding: 28px;
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.project-icon-wrapper {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-md);
  font-size: 24px;
  transition: transform 0.3s var(--sr-spring-bounce);
}

.project-card:hover .project-icon-wrapper {
  transform: scale(1.1) rotate(-5deg);
}

.project-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.project-tag {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-sm);
  color: var(--sr-text-secondary);
}

.project-title {
  font-family: var(--sr-font-primary);
  font-size: 18px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 10px;
}

.project-desc {
  font-size: 14px;
  color: var(--sr-text-secondary);
  line-height: 1.6;
  margin: 0 0 16px;
  flex: 1;
}

.project-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: auto;
}

.project-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--sr-text-muted);
}

.stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.project-arrow {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: 20px;
  height: 20px;
  color: var(--sr-text-muted);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s var(--sr-spring-bounce);
}

.project-card:hover .project-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--sr-accent-star);
}

/* ── Extended Articles Section ── */
.extended-section { padding-top: 80px; }

.extended-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.extended-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
}

.extended-marker {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.extended-marker.paper { background: linear-gradient(180deg, #b8a090, #9a8b7a); }
.extended-marker.tutorial { background: linear-gradient(180deg, #7c9a92, #5a7c70); }
.extended-marker.guide { background: linear-gradient(180deg, #9aa6b2, #7a8a9a); }
.extended-marker.architecture { background: linear-gradient(180deg, #a69ab6, #867a9a); }
.extended-marker.culture { background: linear-gradient(180deg, #c4a99a, #a4897a); }

.extended-content {
  flex: 1;
  min-width: 0;
}

.extended-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.extended-type {
  font-size: 12px;
  color: var(--sr-accent-star);
  font-weight: 500;
}

.extended-date {
  font-size: 12px;
  color: var(--sr-text-muted);
}

.extended-title {
  font-family: var(--sr-font-primary);
  font-size: 17px;
  font-weight: 600;
  color: var(--sr-text-primary);
  margin: 0 0 8px;
  transition: color 0.2s ease;
}

.extended-item:hover .extended-title {
  color: var(--sr-accent-star);
}

.extended-excerpt {
  font-size: 14px;
  color: var(--sr-text-secondary);
  line-height: 1.6;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.extended-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.extended-tag {
  font-size: 11px;
  padding: 3px 10px;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-sm);
  color: var(--sr-text-muted);
}

.extended-arrow {
  width: 20px;
  height: 20px;
  color: var(--sr-text-muted);
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s var(--sr-spring-bounce);
}

.extended-item:hover .extended-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--sr-accent-star);
}

@media (max-width: 768px) {
  .projects-grid { grid-template-columns: 1fr; }
  
  .extended-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .extended-marker {
    width: 40px;
    height: 4px;
  }
  
  .project-arrow,
  .extended-arrow {
    opacity: 1;
    transform: none;
  }
}
</style>
