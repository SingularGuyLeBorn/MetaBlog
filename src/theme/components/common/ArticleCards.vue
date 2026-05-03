<template>
  <div class="article-cards">
    <!-- 顶部信息区 -->
    <div class="header-section" v-if="showHeader">
      <div class="header-content">
        <h1 class="header-title">{{ title }}</h1>
        <p class="header-desc">{{ description }}</p>
        <div class="header-meta" v-if="displayArticles.length > 0">
          <span class="meta-item">📚 {{ displayArticles.length }} 个子专题</span>
          <span class="meta-item" v-if="lastUpdated">🕐 更新于 {{ lastUpdated }}</span>
        </div>
      </div>
      <div class="header-icon">{{ icon || '📚' }}</div>
    </div>

    <!-- 子专题纵向列表 -->
    <div class="articles-list">
      <a
        v-for="(article, index) in displayArticles"
        :key="article.link"
        :href="article.link"
        class="article-card"
      >
        <!-- 序号 -->
        <div class="card-index">{{ String(index + 1).padStart(2, '0') }}</div>
        
        <!-- 内容区域 -->
        <div class="card-content">
          <!-- 标题 -->
          <h3 class="card-title">{{ article.title }}</h3>

          <!-- 描述 -->
          <p class="card-desc" v-if="article.description">
            {{ article.description }}
          </p>

          <!-- 标签 -->
          <div class="card-tags" v-if="article.tags && article.tags.length">
            <span 
              v-for="tag in article.tags.slice(0, 4)" 
              :key="tag"
              class="tag"
            >
              {{ tag }}
            </span>
          </div>

          <!-- 元信息 -->
          <div class="card-meta">
            <span class="meta-count" v-if="article.itemCount !== undefined">
              {{ article.itemCount }} 篇文章
            </span>
            <span class="meta-date" v-if="article.date">
              {{ formatDate(article.date) }}
            </span>
          </div>
        </div>

        <!-- 箭头 -->
        <div class="card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </a>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-if="displayArticles.length === 0">
      <div class="empty-icon">📝</div>
      <p class="empty-text">暂无子专题</p>
      <p class="empty-hint">该专题下还没有添加子专题</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useData, useRoute } from 'vitepress'
import { computed } from 'vue'

interface Article {
  link: string
  title: string
  description?: string
  tags?: string[]
  date?: string
  itemCount?: number
}

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
  articles?: Article[]
  showHeader?: boolean
}>(), {
  title: '',
  description: '',
  icon: '📚',
  articles: () => [],
  showHeader: true
})

const { theme } = useData()
const route = useRoute()

// 从 sidebar 自动获取当前路径下的子专题
const sidebarArticles = computed<Article[]>(() => {
  const currentPath = route.path.replace(/index\.html$/, '').replace(/\/$/, '')
  const sidebar = theme.value.sidebar || {}
  
  // 遍历所有 sidebar 配置
  for (const [key, nodes] of Object.entries(sidebar)) {
    if (currentPath.startsWith(key.replace(/\/$/, ''))) {
      // 递归查找匹配的节点
      const findMatchingNode = (items: any[]): any => {
        for (const node of items) {
          // 检查当前节点是否匹配
          const nodeLink = (node.link || '').replace(/index\.html$/, '').replace(/\/$/, '')
          if (nodeLink === currentPath) {
            return node
          }
          // 递归检查子节点
          if (node.items) {
            const found = findMatchingNode(node.items)
            if (found) return found
          }
        }
        return null
      }
      
      const matchedNode = findMatchingNode(nodes as any[])
      if (matchedNode && matchedNode.items) {
        return matchedNode.items.map((item: any) => ({
          link: item.link,
          title: item.text || item.title,
          description: item.description || getDefaultDescription(item.text),
          tags: extractTags(item.text),
          itemCount: item.items?.length || 0
        }))
      }
    }
  }
  return []
})

const displayArticles = computed(() => {
  if (props.articles && props.articles.length > 0) return props.articles
  return sidebarArticles.value
})

const lastUpdated = computed(() => {
  // 简化处理,返回空字符串或当前日期
  return ''
})

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getDefaultDescription = (title: string): string => {
  const descs: Record<string, string> = {
    'Foundations': '强化学习基础理论,涵盖MDP、价值函数等核心概念',
    'Bellman': '贝尔曼方程与动态规划,理解强化学习的数学基础',
    'Policy Gradient': '策略梯度定理,从理论推导到实践应用',
    'REINFORCE': '经典策略梯度算法,蒙特卡洛方法的基本实现',
    'TRPO': '信任区域策略优化,保证策略更新的稳定性',
    'PPO': '近端策略优化,OpenAI的主流算法实现',
    'Actor-Critic': '演员-评论家架构,结合值函数与策略梯度',
    'DPO': '直接偏好优化,无需Reward Model的对齐方法',
    'GRPO': '组相对策略优化,DeepSeek-R1的核心算法',
    'DAPO': '分布式偏好优化,扩展DPO到分布式场景',
    'GSPO': '广义自偏好优化,统一的偏好学习框架',
    'ORPO': '赔率比偏好优化,单阶段对齐方法',
    'RLOO': '强化学习 leave-one-out,高效的优势估计',
    'SimPO': '简单偏好优化,简化DPO的目标函数',
    'IPO': '身份偏好优化,解决DPO的过拟合问题',
    'KTO': 'Kahneman-Tversky优化,基于人类偏好的对齐',
    'GMPO': '几何平均偏好优化,基于几何平均的目标函数',
    'GDPO': '广义直接偏好优化,统一的DPO变体',
    'GHPO': '广义混合偏好优化,结合多种偏好信号',
    'JustRL': 'Justified Reinforcement Learning,可解释的强化学习',
    'RLHF Pipeline': 'RLHF完整流程,从数据收集到模型部署',
    'Scaling': '强化学习的规模扩展,大模型的训练技巧',
    'LitePPO': '轻量级PPO,适用于资源受限场景',
    'RLVR': '强化学习 with Verified Rewards,验证奖励的训练',
    'OREO': '优化奖励估计与优化,高效的对齐策略',
    'COCONUT': '连续思维链,非语言推理的新范式',
  }
  for (const [key, value] of Object.entries(descs)) {
    if (title?.toLowerCase().includes(key.toLowerCase())) return value
  }
  return '深入理解强化学习核心概念与算法实现'
}

const extractTags = (title: string): string[] => {
  if (!title) return ['理论']
  const tags: string[] = []
  const lower = title.toLowerCase()
  if (lower.includes('foundation')) tags.push('基础')
  if (lower.includes('bellman') || lower.includes('mdp')) tags.push('MDP')
  if (lower.includes('policy') || lower.includes('gradient')) tags.push('策略梯度')
  if (lower.includes('trpo') || lower.includes('ppo') || lower.includes('lite')) tags.push('策略优化')
  if (lower.includes('actor') || lower.includes('critic')) tags.push('Actor-Critic')
  if (lower.includes('rlhf')) tags.push('RLHF')
  if (lower.includes('dpo') || lower.includes('grpo') || lower.includes('preference')) tags.push('偏好优化')
  if (lower.includes('scaling')) tags.push('Scaling')
  if (tags.length === 0) tags.push('理论')
  return tags.slice(0, 3)
}
</script>

<style scoped>
.article-cards {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
}

/* 头部区域 */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 40px;
}

.header-content {
  flex: 1;
}

.header-title {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.header-desc {
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 16px 0;
  max-width: 600px;
}

.header-meta {
  display: flex;
  gap: 20px;
}

.meta-item {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

.header-icon {
  font-size: 64px;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 20px;
  margin-left: 32px;
}

/* 文章纵向列表 */
.articles-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 文章卡片 - 宽卡片,纵向排列 */
.article-card {
  display: flex;
  align-items: stretch;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 28px 32px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.article-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.12);
  transform: translateX(8px);
}

/* 序号 */
.card-index {
  font-size: 42px;
  font-weight: 200;
  color: #e2e8f0;
  line-height: 1;
  font-family: 'SF Mono', monospace;
  min-width: 70px;
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.article-card:hover .card-index {
  color: #bfdbfe;
}

/* 内容区域 - 占据大部分空间 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* 标题 */
.card-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.4;
  word-break: break-word;
}

/* 描述 - 完整显示 */
.card-desc {
  font-size: 16px;
  color: #64748b;
  line-height: 1.7;
  margin: 0;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* 标签 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.tag {
  padding: 6px 14px;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 500;
  border-radius: 20px;
}

/* 元信息 */
.card-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #94a3b8;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

/* 箭头 */
.card-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  color: #cbd5e1;
  margin-left: 20px;
  transition: all 0.3s ease;
}

.card-arrow svg {
  width: 24px;
  height: 24px;
}

.article-card:hover .card-arrow {
  color: #3b82f6;
  transform: translateX(4px);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: #f8fafc;
  border-radius: 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 15px;
  color: #64748b;
  margin: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .article-cards {
    padding: 24px 16px;
  }
  
  .header-section {
    flex-direction: column;
    text-align: center;
    padding: 28px 24px;
  }
  
  .header-icon {
    margin: 24px 0 0 0;
    width: 100px;
    height: 100px;
    font-size: 56px;
  }
  
  .header-title {
    font-size: 26px;
  }
  
  .article-card {
    padding: 20px;
  }
  
  .card-index {
    font-size: 32px;
    min-width: 50px;
  }
  
  .card-title {
    font-size: 19px;
  }
  
  .card-desc {
    font-size: 14px;
  }
  
  .card-arrow {
    display: none;
  }
}

@media (max-width: 480px) {
  .card-index {
    font-size: 28px;
    min-width: 45px;
  }
  
  .card-title {
    font-size: 17px;
  }
  
  .tag {
    font-size: 12px;
    padding: 4px 10px;
  }
}
</style>
