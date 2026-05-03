<template>
  <div class="section-home">
    <!-- 全宽 Hero -->
    <section class="hero-fullwidth">
      <div class="hero-bg-effects">
        <div class="gradient-blob blob-1"></div>
        <div class="gradient-blob blob-2"></div>
        <div class="gradient-blob blob-3"></div>
        <div class="grid-lines"></div>
      </div>
      
      <div class="hero-content-wide">
        <div class="hero-left">
          <div class="badge">
            <span class="badge-icon">{{ icon || '📚' }}</span>
            <span class="badge-text">{{ sectionLabel }}</span>
          </div>
          <h1 class="hero-title">{{ title }}</h1>
          <p class="hero-desc">{{ description }}</p>
          <div class="hero-stats-row">
            <div class="stat-box">
              <span class="stat-num">{{ dynamicFolders.length }}</span>
              <span class="stat-label">子专题</span>
            </div>
            <div class="stat-box">
              <span class="stat-num">{{ totalArticles }}</span>
              <span class="stat-label">文章</span>
            </div>
            <div class="stat-box">
              <span class="stat-num">{{ totalFiles }}</span>
              <span class="stat-label">文件</span>
            </div>
          </div>
        </div>
        
        <div class="hero-right">
          <div class="visual-stack">
            <div class="stack-card card-1">📄</div>
            <div class="stack-card card-2">💡</div>
            <div class="stack-card card-3">🚀</div>
            <div class="stack-card card-main">{{ icon || '📚' }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 全宽内容区 -->
    <main class="content-fullwidth">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <h2>📂 子专题</h2>
          <span class="count">{{ dynamicFolders.length }} 个</span>
        </div>
        <div class="toolbar-right">
          <button :class="['view-btn', { active: viewMode === 'grid' }]" @click="viewMode = 'grid'">
            ⊞ 网格
          </button>
          <button :class="['view-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'">
            ☰ 列表
          </button>
          <button :class="['view-btn', { active: viewMode === 'masonry' }]" @click="viewMode = 'masonry'">
            ▦ 瀑布
          </button>
        </div>
      </div>

      <!-- 网格视图 - 多列 -->
      <div v-if="viewMode === 'grid'" class="grid-4col">
        <a
          v-for="(folder, index) in dynamicFolders"
          :key="folder.path"
          :href="folder.link"
          class="folder-card"
          :style="{ '--delay': index * 0.05 + 's' }"
        >
          <div class="card-glow"></div>
          <div class="card-content">
            <div class="card-header-row">
              <span class="card-num">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="card-icon">{{ folder.icon || defaultIcons[index % defaultIcons.length] }}</span>
            </div>
            <h3 class="card-title">{{ folder.title }}</h3>
            <p class="card-desc">{{ folder.description }}</p>
            <div class="card-footer-row">
              <span class="count-badge">{{ folder.articleCount }} 篇</span>
              <span class="arrow">→</span>
            </div>
          </div>
        </a>
      </div>

      <!-- 列表视图 - 宽行 -->
      <div v-else-if="viewMode === 'list'" class="list-wide">
        <a
          v-for="(folder, index) in dynamicFolders"
          :key="folder.path"
          :href="folder.link"
          class="list-row"
        >
          <div class="row-num">{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="row-icon">{{ folder.icon || defaultIcons[index % defaultIcons.length] }}</div>
          <div class="row-info">
            <h3>{{ folder.title }}</h3>
            <p>{{ folder.description }}</p>
          </div>
          <div class="row-meta">
            <div class="meta-tags" v-if="folder.children">
              <span v-for="tag in folder.children.slice(0, 3)" :key="tag.text" class="tag">
                {{ tag.text }}
              </span>
            </div>
            <span class="article-count">{{ folder.articleCount }} 篇文章</span>
          </div>
          <div class="row-arrow">→</div>
        </a>
      </div>

      <!-- 瀑布流视图 -->
      <div v-else class="masonry-3col">
        <div class="masonry-col" v-for="col in 3" :key="col">
          <a
            v-for="(folder, index) in getColumnItems(dynamicFolders, col - 1, 3)"
            :key="folder.path"
            :href="folder.link"
            class="masonry-card"
            :class="{ 'tall': index % 3 === 0 }"
          >
            <div class="masonry-num">{{ String((folder.index ?? 0) + 1).padStart(2, '0') }}</div>
            <div class="masonry-icon">{{ folder.icon || defaultIcons[(folder.index ?? 0) % defaultIcons.length] }}</div>
            <h3>{{ folder.title }}</h3>
            <p>{{ folder.description }}</p>
            <div class="masonry-footer">
              <span>{{ folder.articleCount }} 篇</span>
              <span>→</span>
            </div>
          </a>
        </div>
      </div>
    </main>

    <!-- 底部信息栏 - 全宽 -->
    <footer class="footer-wide">
      <div class="footer-content">
        <div class="footer-section">
          <h4>📊 统计</h4>
          <p>共 {{ dynamicFolders.length }} 个子专题,{{ totalArticles }} 篇文章</p>
        </div>
        <div class="footer-section">
          <h4>🕐 最近更新</h4>
          <p>实时同步文件夹内容</p>
        </div>
        <div class="footer-section">
          <h4>🔗 快速链接</h4>
          <div class="quick-links">
            <a v-for="folder in dynamicFolders.slice(0, 3)" :key="folder.path" :href="folder.link">
              {{ folder.title }}
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useData, useRoute } from 'vitepress'
import { computed, ref } from 'vue'

interface SubFolder {
  path: string
  link: string
  title: string
  description: string
  icon?: string
  articleCount: number
  children?: any[]
  index?: number
}

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
  sectionLabel?: string
}>(), {
  title: '专题概览',
  description: '探索各个子专题与核心知识',
  icon: '📚',
  sectionLabel: '知识库'
})

const { theme } = useData()
const route = useRoute()
const viewMode = ref<'grid' | 'list' | 'masonry'>('grid')

const defaultIcons = ['📊', '🎯', '🚀', '💡', '🔬', '🎨', '⚙️', '💻', '🔍', '📖', '🌟', '🔥', '⚡', '🎮', '📱']

// 动态从 sidebar 获取数据
const dynamicFolders = computed<SubFolder[]>(() => {
  const currentPath = route.path.replace(/index\.html$/, '')
  const sidebarKey = Object.keys(theme.value.sidebar || {}).find(k => currentPath.startsWith(k))
  const sidebarNodes = sidebarKey ? theme.value.sidebar[sidebarKey] : []
  
  return sidebarNodes.map((node: any, index: number) => {
    let link = node.link || '#'
    if ((!link || link === '#') && node.items?.length > 0) {
      link = node.items[0].link
    }
    
    const countItems = (items: any[]): number => {
      if (!items) return 0
      return items.reduce((sum, item) => {
        if (item.items) return sum + countItems(item.items)
        return sum + 1
      }, 0)
    }
    
    return {
      path: link,
      link: link,
      title: node.text || node.title || '未命名',
      description: node.description || getAutoDesc(node.text),
      icon: defaultIcons[index % defaultIcons.length],
      articleCount: countItems(node.items),
      children: node.items,
      index
    }
  })
})

const getAutoDesc = (title: string): string => {
  const descs: Record<string, string> = {
    'rl': '强化学习算法、理论与实现',
    'math': '数学基础与严格推导',
    'paper': '前沿论文与技术解读',
    'game': '游戏AI与实战案例',
    'resource': '工具资源与项目展示',
    'foundation': '基础知识与核心概念',
    'transform': '变换与动画效果'
  }
  const lower = title?.toLowerCase() || ''
  for (const [k, v] of Object.entries(descs)) {
    if (lower.includes(k)) return v
  }
  return '探索相关知识和资源'
}

const totalArticles = computed(() => 
  dynamicFolders.value.reduce((sum, f) => sum + f.articleCount, 0)
)

const totalFiles = computed(() => 
  dynamicFolders.value.reduce((sum, f) => sum + (f.children?.length || 0), 0)
)

// 瀑布流分栏
const getColumnItems = (items: SubFolder[], colIndex: number, colCount: number) => {
  return items.filter((_, i) => i % colCount === colIndex).map(item => item)
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   全宽 SectionIndex - 真正利用宽屏
   ═══════════════════════════════════════════════════════════════ */

.section-home {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #fafafa 0%, #f0f0f5 100%);
}

/* ─── 全宽 Hero ─── */
.hero-fullwidth {
  position: relative;
  width: 100%;
  padding: 60px 40px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero-bg-effects {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gradient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
}

.blob-1 {
  width: 500px;
  height: 500px;
  background: #f093fb;
  top: -100px;
  right: 10%;
}

.blob-2 {
  width: 400px;
  height: 400px;
  background: #4facfe;
  bottom: -50px;
  left: 5%;
}

.blob-3 {
  width: 300px;
  height: 300px;
  background: #43e97b;
  top: 20%;
  right: 30%;
}

.grid-lines {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 50px 50px;
}

.hero-content-wide {
  position: relative;
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 60px;
  align-items: center;
}

.hero-left {
  color: white;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.2);
  border-radius: 100px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

.badge-icon { font-size: 18px; }
.badge-text { font-size: 13px; font-weight: 600; }

.hero-title {
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 800;
  margin: 0 0 16px 0;
  line-height: 1.1;
}

.hero-desc {
  font-size: 18px;
  opacity: 0.9;
  line-height: 1.6;
  margin: 0 0 32px 0;
  max-width: 600px;
}

.hero-stats-row {
  display: flex;
  gap: 16px;
}

.stat-box {
  padding: 16px 24px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
}

.stat-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  opacity: 0.8;
  margin-top: 4px;
}

/* Hero 右侧视觉效果 */
.hero-right {
  display: flex;
  justify-content: center;
  align-items: center;
}

.visual-stack {
  position: relative;
  width: 300px;
  height: 300px;
}

.stack-card {
  position: absolute;
  width: 80px;
  height: 80px;
  background: rgba(255,255,255,0.2);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  backdrop-filter: blur(10px);
  animation: float 6s ease-in-out infinite;
}

.card-1 { top: 0; left: 0; animation-delay: 0s; }
.card-2 { top: 40px; right: 20px; animation-delay: -2s; }
.card-3 { bottom: 40px; left: 20px; animation-delay: -4s; }

.card-main {
  width: 140px;
  height: 140px;
  font-size: 72px;
  background: rgba(255,255,255,0.3);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

/* ─── 全宽内容区 ─── */
.content-fullwidth {
  max-width: 1600px;
  margin: 0 auto;
  padding: 40px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-left h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #1e293b;
}

.count {
  padding: 4px 12px;
  background: #f1f5f9;
  border-radius: 100px;
  font-size: 13px;
  color: #64748b;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.view-btn {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn:hover, .view-btn.active {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

/* ─── 4列网格 ─── */
.grid-4col {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.folder-card {
  position: relative;
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  animation: fadeIn 0.5s ease backwards;
  animation-delay: var(--delay, 0s);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.folder-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.15);
  border-color: #6366f1;
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.folder-card:hover .card-glow {
  opacity: 1;
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-num {
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
  font-family: monospace;
}

.card-icon {
  font-size: 32px;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.card-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count-badge {
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 100px;
  font-size: 12px;
  color: #64748b;
}

.arrow {
  font-size: 18px;
  color: #cbd5e1;
  transition: all 0.2s;
}

.folder-card:hover .arrow {
  color: #6366f1;
  transform: translateX(4px);
}

/* ─── 宽列表视图 ─── */
.list-wide {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-row {
  display: grid;
  grid-template-columns: 60px 60px 1fr 300px 60px;
  gap: 20px;
  align-items: center;
  padding: 20px 24px;
  background: white;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  border: 1px solid #e2e8f0;
}

.list-row:hover {
  background: #f8fafc;
  border-color: #6366f1;
}

.row-num {
  font-size: 20px;
  font-weight: 200;
  color: #cbd5e1;
  font-family: monospace;
}

.row-icon {
  font-size: 28px;
  text-align: center;
}

.row-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.row-info p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.row-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.meta-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.tag {
  padding: 2px 8px;
  background: #e0e7ff;
  color: #6366f1;
  font-size: 11px;
  border-radius: 4px;
}

.article-count {
  font-size: 13px;
  color: #94a3b8;
}

.row-arrow {
  font-size: 20px;
  color: #cbd5e1;
  text-align: center;
}

.list-row:hover .row-arrow {
  color: #6366f1;
}

/* ─── 瀑布流视图 ─── */
.masonry-3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.masonry-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.masonry-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

.masonry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(0,0,0,0.08);
}

.masonry-card.tall {
  padding: 32px 24px;
}

.masonry-num {
  font-size: 12px;
  color: #cbd5e1;
  font-family: monospace;
  margin-bottom: 12px;
}

.masonry-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.masonry-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1e293b;
}

.masonry-card p {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.masonry-footer {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #94a3b8;
}

/* ─── 底部栏 ─── */
.footer-wide {
  margin-top: 60px;
  padding: 40px;
  background: #1e293b;
  color: white;
}

.footer-content {
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.footer-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  opacity: 0.8;
}

.footer-section p {
  font-size: 14px;
  opacity: 0.6;
  margin: 0;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-links a {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  font-size: 13px;
  color: white;
  text-decoration: none;
  transition: all 0.2s;
}

.quick-links a:hover {
  background: rgba(255,255,255,0.2);
}

/* ─── 响应式 ─── */
@media (max-width: 1200px) {
  .grid-4col {
    grid-template-columns: repeat(3, 1fr);
  }
  .hero-content-wide {
    grid-template-columns: 1fr;
  }
  .hero-right {
    display: none;
  }
}

@media (max-width: 900px) {
  .grid-4col {
    grid-template-columns: repeat(2, 1fr);
  }
  .masonry-3col {
    grid-template-columns: repeat(2, 1fr);
  }
  .list-row {
    grid-template-columns: 50px 50px 1fr 60px;
  }
  .row-meta {
    display: none;
  }
  .footer-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .hero-fullwidth {
    padding: 40px 20px;
  }
  .content-fullwidth {
    padding: 20px;
  }
  .grid-4col, .masonry-3col {
    grid-template-columns: 1fr;
  }
  .hero-stats-row {
    flex-wrap: wrap;
  }
  .stat-box {
    flex: 1;
    min-width: 100px;
  }
}
</style>
