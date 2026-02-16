---
layout: home

hero:
  name: "MetaUniverse Blog"
  text: "数字孪生级知识管理系统"
  tagline: 构建你的第二大脑，让知识流动起来
  image:
    src: /hero-illustration.svg
    alt: MetaUniverse
  actions:
    - theme: brand
      text: 开始探索
      link: /sections/knowledge/
    - theme: alt
      text: 关于作者
      link: /sections/about/

features:
  - icon: 🧠
    title: 知识库
    details: 系统化的知识体系，从强化学习到人工智能，深度剖析技术原理
    link: /sections/knowledge/
  
  - icon: 📝
    title: 文章列表
    details: 技术博客、学习笔记、项目总结，记录成长的每一步
    link: /sections/posts/
  
  - icon: 🎨
    title: 可视化
    details: 知识图谱、思维导图、流程图，让复杂的知识一目了然
    link: /sections/knowledge/knowledge-graph
  
  - icon: 🔍
    title: 智能搜索
    details: 基于 RAG 的智能检索，快速找到你需要的内容
    link: /sections/resources/

---

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 添加动态打字效果
  const tagline = document.querySelector('.tagline')
  if (tagline) {
    const text = tagline.textContent
    tagline.textContent = ''
    let i = 0
    const typeWriter = () => {
      if (i < text.length) {
        tagline.textContent += text.charAt(i)
        i++
        setTimeout(typeWriter, 50)
      }
    }
    setTimeout(typeWriter, 500)
  }
})
</script>

<style>
/* Hero 区域自定义样式 */
.VPHero {
  margin-top: -64px !important;
  padding-top: 120px !important;
  background: linear-gradient(135deg, var(--vp-c-bg) 0%, var(--vp-c-bg-soft) 100%);
  position: relative;
  overflow: hidden;
}

.VPHero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(22, 119, 255, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(64, 150, 255, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.VPHero .name {
  font-size: 56px !important;
  font-weight: 700 !important;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.VPHero .text {
  font-size: 36px !important;
  font-weight: 600 !important;
  color: var(--vp-c-text-1) !important;
  margin-top: 16px !important;
}

.VPHero .tagline {
  font-size: 20px !important;
  color: var(--vp-c-text-2) !important;
  margin-top: 24px !important;
  min-height: 28px;
}

/* 特性卡片样式 */
.VPFeatures {
  margin-top: 80px !important;
}

.VPFeatures .VPFeature {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.VPFeatures .VPFeature:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  border-color: var(--vp-c-brand);
}

.VPFeatures .icon {
  font-size: 40px !important;
  margin-bottom: 16px;
  display: block;
}

.VPFeatures .title {
  font-size: 20px !important;
  font-weight: 600 !important;
  color: var(--vp-c-text-1) !important;
  margin-bottom: 12px;
}

.VPFeatures .details {
  font-size: 15px !important;
  color: var(--vp-c-text-2) !important;
  line-height: 1.6;
}

/* 按钮样式 */
.VPButton {
  border-radius: 8px !important;
  padding: 12px 24px !important;
  font-weight: 500 !important;
  transition: all 0.2s !important;
}

.VPButton:hover {
  transform: translateY(-2px);
}

.VPButton.brand {
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%) !important;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3) !important;
}

.VPButton.brand:hover {
  box-shadow: 0 6px 16px rgba(22, 119, 255, 0.4) !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .VPHero .name {
    font-size: 40px !important;
  }
  
  .VPHero .text {
    font-size: 24px !important;
  }
  
  .VPFeatures {
    margin-top: 40px !important;
  }
  
  .VPFeatures .VPFeature {
    padding: 24px;
  }
}
</style>

## 🚀 最新动态

<div class="news-grid">

### 📚 知识库更新
- **[强化学习数学原理](/sections/knowledge/rl-math-principle/)** - 从贝尔曼方程到 GRPO 的全景技术演进
- **[DPO 算法族谱](/sections/knowledge/rl-math-principle/99_Family_Comparisons/DPO_Family)** - 深入理解偏好优化算法的演进

### 🎯 推荐阅读
- [PPO 算法详解](/sections/knowledge/rl-math-principle/05_PPO/) - 近端策略优化原理解析
- [GRPO 与 DPO 对比](/sections/knowledge/rl-math-principle/08_GRPO/GRPO_Family_Comparison) - DeepSeek-R1 核心算法解析

</div>

<style>
.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin: 32px 0;
}

.news-grid h3 {
  color: var(--vp-c-brand);
  font-size: 18px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--vp-c-brand-soft);
}

.news-grid ul {
  list-style: none;
  padding: 0;
}

.news-grid li {
  padding: 8px 0;
  border-bottom: 1px solid var(--vp-c-divider-light);
}

.news-grid li:last-child {
  border-bottom: none;
}

.news-grid a {
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.news-grid a:hover {
  color: var(--vp-c-brand);
}
</style>

## 💡 关于这个站点

MetaUniverse Blog 是一个**数字孪生级知识管理系统**，灵感来源于：

- **语雀**的优雅编辑体验
- **Notion**的灵活组织能力
- **Obsidian**的知识图谱可视化
- **VitePress**的极速性能

> "知识的价值不在于收藏，而在于连接。" —— 构建这个博客的初衷

<div class="cta-section">
  <a href="/sections/knowledge/" class="cta-button">开始探索知识库 →</a>
</div>

<style>
.cta-section {
  text-align: center;
  margin: 48px 0;
}

.cta-button {
  display: inline-block;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%);
  color: white;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(22, 119, 255, 0.3);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(22, 119, 255, 0.4);
}
</style>
