<template>
  <div class="tool-tester-3d light-theme">
    <!-- 背景效果 -->
    <div class="bg-effects">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- 头部 -->
    <header class="header-3d">
      <div class="logo-container">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <h1 class="title-3d">
          <span class="title-gradient">Tool</span>
          <span class="title-normal">Tester</span>
        </h1>
      </div>
      <p class="subtitle">AI Agent 工具链测试平台</p>
      
      <!-- 控制按钮 -->
      <div class="controls">
        <button class="btn-3d btn-primary" @click="testAll" :disabled="testingAll">
          <span class="btn-icon">🚀</span>
          {{ testingAll ? '测试中...' : '一键测试' }}
        </button>
      </div>
    </header>

    <!-- 统计面板 -->
    <section class="stats-section">
      <div class="stat-cards">
        <div class="stat-card-3d success">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ passed }}</div>
          <div class="stat-label">通过</div>
        </div>
        <div class="stat-card-3d error">
          <div class="stat-icon">❌</div>
          <div class="stat-value">{{ failed }}</div>
          <div class="stat-label">失败</div>
        </div>
        <div class="stat-card-3d pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">{{ pending }}</div>
          <div class="stat-label">待测</div>
        </div>
        <div class="stat-card-3d total">
          <div class="stat-icon">📊</div>
          <div class="stat-value">{{ total }}</div>
          <div class="stat-label">总计</div>
        </div>
      </div>
    </section>

    <!-- 分类测试区 -->
    <main class="test-categories">
      <!-- MCP 工具 -->
      <section class="category-section">
        <div class="category-header" @click="toggleCategory('mcp')">
          <div class="category-icon">📦</div>
          <h2>MCP 工具</h2>
          <span class="category-count">{{ getCategoryStats('mcp') }}</span>
          <span class="toggle-icon" :class="{ 'open': expanded.mcp }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.mcp" class="test-grid">
            <TestCard3D 
              v-for="test in mcpTests" 
              :key="test.name"
              :test="test"
              @run="runTest(test)"
              @click="openModal(test)"
            />
          </div>
        </Transition>
      </section>

      <!-- 网络工具 -->
      <section class="category-section">
        <div class="category-header" @click="toggleCategory('network')">
          <div class="category-icon">🌐</div>
          <h2>网络工具 - 大模型厂商</h2>
          <span class="category-count">{{ getCategoryStats('network') }}</span>
          <span class="toggle-icon" :class="{ 'open': expanded.network }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.network" class="test-grid">
            <TestCard3D 
              v-for="test in networkTests" 
              :key="test.name"
              :test="test"
              @run="runTest(test)"
              @click="openModal(test)"
            />
          </div>
        </Transition>
      </section>

      <!-- 文章工具 -->
      <section class="category-section">
        <div class="category-header" @click="toggleCategory('article')">
          <div class="category-icon">📝</div>
          <h2>文章工具 - 完整CRUD</h2>
          <span class="category-count">{{ getCategoryStats('article') }}</span>
          <span class="toggle-icon" :class="{ 'open': expanded.article }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.article" class="test-grid">
            <TestCard3D 
              v-for="test in articleTests" 
              :key="test.name"
              :test="test"
              @run="runTest(test)"
              @click="openModal(test)"
            />
          </div>
        </Transition>
      </section>

      <!-- GitHub 工具 -->
      <section class="category-section">
        <div class="category-header" @click="toggleCategory('github')">
          <div class="category-icon">🐙</div>
          <h2>GitHub 工具</h2>
          <span class="category-count">{{ getCategoryStats('github') }}</span>
          <span class="toggle-icon" :class="{ 'open': expanded.github }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.github" class="test-grid">
            <TestCard3D 
              v-for="test in githubTests" 
              :key="test.name"
              :test="test"
              @run="runTest(test)"
              @click="openModal(test)"
            />
          </div>
        </Transition>
      </section>

      <!-- AI 项目展示 -->
      <section class="category-section ai-projects">
        <div class="category-header" @click="toggleCategory('ai')">
          <div class="category-icon">🤖</div>
          <h2>热门 AI Agent 项目</h2>
          <span class="toggle-icon" :class="{ 'open': expanded.ai }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.ai" class="projects-grid">
            <AIProjectCard 
              v-for="project in aiProjects" 
              :key="project.name"
              :project="project"
            />
          </div>
        </Transition>
      </section>
    </main>

    <!-- 日志面板 -->
    <aside class="log-panel" :class="{ 'open': showLogs }">
      <div class="log-toggle" @click="showLogs = !showLogs">
        <span>📋 测试日志</span>
        <span class="log-count" v-if="logs.length > 0">{{ logs.length }}</span>
      </div>
      <div class="log-content">
        <div 
          v-for="(log, i) in logs" 
          :key="i" 
          class="log-item"
          :class="log.type"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-badge" :class="log.type">{{ log.type }}</span>
          <span class="log-msg">{{ log.message }}</span>
        </div>
      </div>
    </aside>

    <!-- 模态框 -->
    <TestResultModal
      :show="modalVisible"
      :test="selectedTest"
      @close="modalVisible = false"
      @rerun="selectedTest && runTest(selectedTest)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { mcpManager } from '../ai-chat/core/mcp'
import TestCard3D from './TestCard3D.vue'
import AIProjectCard from './AIProjectCard.vue'
import TestResultModal from './TestResultModal.vue'
import { aiProjectsData } from './ai-projects-data'

const API_BASE = '/api'

interface TestCase {
  name: string
  description: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: string
  rawResult?: string
  error?: boolean
  category: string
  fn: () => Promise<{formatted: string, raw: string}>
}

// 展开状态
const expanded = ref({
  mcp: true,
  network: true,
  article: true,
  github: true,
  ai: false
})

const toggleCategory = (cat: string) => {
  expanded.value[cat as keyof typeof expanded.value] = !expanded.value[cat as keyof typeof expanded.value]
}

// 模态框
const modalVisible = ref(false)
const selectedTest = ref<TestCase | null>(null)

const openModal = (test: TestCase) => {
  selectedTest.value = test
  modalVisible.value = true
}

// 日志
const logs = ref<{type: string, time: string, message: string}[]>([])
const showLogs = ref(false)

function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const now = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value.unshift({ type, time: now, message })
  if (logs.value.length > 100) logs.value.pop()
}

// MCP 测试
const mcpTests = ref<TestCase[]>([
  { 
    category: 'mcp', 
    name: 'MCP Math', 
    description: '数学计算工具', 
    status: 'pending', 
    fn: async () => {
      const expression = '123 + 456 * 2'
      const result = await mcpManager.execute('calculate', { expression })
      const raw = JSON.stringify(result, null, 2)
      const formatted = `✅ 数学计算成功\n\n📝 输入: ${expression}\n📊 结果: ${result.result}`
      return { formatted, raw }
    }
  },
  { 
    category: 'mcp', 
    name: 'MCP Text Stats', 
    description: '文本统计工具', 
    status: 'pending', 
    fn: async () => {
      const text = 'Hello World! 你好世界！'
      const result = await mcpManager.execute('text_stats', { text })
      const raw = JSON.stringify(result, null, 2)
      const formatted = `✅ 文本统计成功\n\n📊 字符数: ${result.length}\n📊 行数: ${result.lines}\n📊 单词数: ${result.words}\n📊 中文字符: ${result.chineseChars}`
      return { formatted, raw }
    }
  },
  { 
    category: 'mcp', 
    name: 'MCP System Info', 
    description: '系统信息查询', 
    status: 'pending', 
    fn: async () => {
      const result = await mcpManager.execute('get_system_info', {})
      const raw = JSON.stringify(result, null, 2)
      const formatted = `✅ 系统信息获取成功\n\n🖥️ 平台: ${result.platform}\n🌐 语言: ${result.language}\n🌍 时区: ${result.timezone}`
      return { formatted, raw }
    }
  },
])

// 网络工具测试
const networkTests = ref<TestCase[]>([
  { 
    category: 'network', 
    name: 'DeepSeek API', 
    description: 'DeepSeek API 状态检查', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://api.deepseek.com/models', timeout: 10000 })
      })
      const text = await response.text()
      const raw = `HTTP ${response.status}\n\n${text}`
      if (response.status === 401) {
        return { formatted: '✅ DeepSeek API 服务正常（需要认证）', raw }
      }
      return { formatted: `✅ 响应: ${text.substring(0, 200)}`, raw }
    }
  },
  { 
    category: 'network', 
    name: '智谱 AI API', 
    description: '智谱 AI API 状态检查', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://open.bigmodel.cn/api/paas/v4/models', timeout: 10000 })
      })
      const text = await response.text()
      const raw = `HTTP ${response.status}\n\n${text}`
      if (response.status === 401) {
        return { formatted: '✅ 智谱 AI API 服务正常（需要认证）', raw }
      }
      return { formatted: `✅ 响应: ${text.substring(0, 200)}`, raw }
    }
  },
])

// 文章工具测试 - 完整CRUD
const TEST_ARTICLE_PATH = 'sections/posts/test-tool-article.md'
let createdArticlePath = ''

const articleTests = ref<TestCase[]>([
  // ====== 查询类工具 ======
  { 
    category: 'article', 
    name: 'List Articles', 
    description: '查询所有文章列表', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/articles/list-all`)
      const result = await response.json()
      const raw = JSON.stringify(result, null, 2)
      const data = result.data || []
      const formatted = `✅ 查询成功\n\n📊 共找到 ${data.length} 篇文章${data.length > 0 ? '\n\n📄 前3篇:' + data.slice(0, 3).map((a: any, i: number) => `\n  ${i+1}. ${a.title}`).join('') : ''}`
      return { formatted, raw }
    }
  },
  { 
    category: 'article', 
    name: 'Search Articles', 
    description: '搜索文章（关键词: AI）', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/articles/search?q=AI`)
      const result = await response.json()
      const raw = JSON.stringify(result, null, 2)
      const data = result.data || []
      const formatted = `✅ 搜索成功\n\n🔍 关键词: "AI"\n📊 找到 ${data.length} 篇相关文章`
      return { formatted, raw }
    }
  },
  { 
    category: 'article', 
    name: 'Get Article Detail', 
    description: '获取单篇文章详情', 
    status: 'pending', 
    fn: async () => {
      const listRes = await fetch(`${API_BASE}/articles/list-all`)
      const listResult = await listRes.json()
      const data = listResult.data || []
      if (data.length === 0) {
        return { formatted: '⚠️ 暂无文章可供查询', raw: '[]' }
      }
      const path = data[0].path
      const response = await fetch(`${API_BASE}/articles/detail?path=${encodeURIComponent(path)}`)
      const content = await response.text()
      const raw = `Path: ${path}\n\n${content}`
      const formatted = `✅ 获取详情成功\n\n📄 路径: ${path}\n📏 长度: ${content.length} 字符\n\n📝 内容预览:\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`
      return { formatted, raw }
    }
  },
  
  // ====== 创建类工具 ======
  { 
    category: 'article', 
    name: 'Create Article', 
    description: '创建测试文章（带元数据）', 
    status: 'pending', 
    fn: async () => {
      const timestamp = Date.now()
      const content = `---\ntitle: 测试文章-${timestamp}\ndate: ${new Date().toISOString()}\ntags: [test, ai, automation]\ncategory: test\n---\n\n# 测试文章 ${timestamp}\n\n这是由 ToolTester 自动创建的测试文章。\n\n## 功能测试\n\n- 创建文章 ✅\n- 添加元数据 ✅\n- 设置标签 ✅\n\n生成时间: ${new Date().toLocaleString('zh-CN')}`
      
      const response = await fetch(`${API_BASE}/articles/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: TEST_ARTICLE_PATH, content })
      })
      const result = await response.json()
      const raw = JSON.stringify(result, null, 2)
      createdArticlePath = TEST_ARTICLE_PATH
      const formatted = result.success 
        ? `✅ 文章创建成功\n\n📄 路径: ${TEST_ARTICLE_PATH}\n📏 内容长度: ${content.length} 字符\n🏷️ 标签: test, ai, automation`
        : `❌ 创建失败: ${result.error}`
      return { formatted, raw }
    }
  },
  { 
    category: 'article', 
    name: 'Create Article - Minimal', 
    description: '创建极简文章（仅标题）', 
    status: 'pending', 
    fn: async () => {
      const content = `# 极简测试文章\n\n内容: ${Date.now()}`
      const path = 'sections/posts/test-minimal.md'
      const response = await fetch(`${API_BASE}/articles/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      })
      const result = await response.json()
      const raw = JSON.stringify(result, null, 2)
      const formatted = result.success 
        ? `✅ 极简文章创建成功\n\n📄 路径: ${path}`
        : `❌ 创建失败: ${result.error}`
      return { formatted, raw }
    }
  },
  
  // ====== 更新类工具 ======
  { 
    category: 'article', 
    name: 'Update Article', 
    description: '更新文章内容（追加）', 
    status: 'pending', 
    fn: async () => {
      const path = createdArticlePath || TEST_ARTICLE_PATH
      const newContent = `\n\n## 更新记录\n\n更新时间: ${new Date().toLocaleString('zh-CN')}\n更新类型: 追加内容\n更新者: ToolTester`
      
      // 先读取原内容
      const readRes = await fetch(`${API_BASE}/articles/detail?path=${encodeURIComponent(path)}`)
      const originalContent = await readRes.text()
      const updatedContent = originalContent + newContent
      
      const response = await fetch(`${API_BASE}/articles/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: updatedContent })
      })
      const result = await response.json()
      const raw = JSON.stringify(result, null, 2)
      const formatted = result.success 
        ? `✅ 文章更新成功\n\n📄 路径: ${path}\n📏 新增内容: ${newContent.length} 字符\n📏 总长度: ${updatedContent.length} 字符`
        : `❌ 更新失败: ${result.error}`
      return { formatted, raw }
    }
  },
  { 
    category: 'article', 
    name: 'Update Article - Metadata', 
    description: '更新文章元数据', 
    status: 'pending', 
    fn: async () => {
      const path = createdArticlePath || TEST_ARTICLE_PATH
      const content = `---\ntitle: 更新后的标题\ndate: ${new Date().toISOString()}\ntags: [updated, test, metadata]\ncategory: updated\nauthor: ToolTester\n---\n\n# 已更新的文章\n\n元数据已更新。`
      
      const response = await fetch(`${API_BASE}/articles/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      })
      const result = await response.json()
      const raw = JSON.stringify(result, null, 2)
      const formatted = result.success 
        ? `✅ 元数据更新成功\n\n📄 路径: ${path}\n🏷️ 新标签: updated, test, metadata\n✏️ 作者: ToolTester`
        : `❌ 更新失败: ${result.error}`
      return { formatted, raw }
    }
  },
  
  // ====== 删除类工具 ======
  { 
    category: 'article', 
    name: 'Delete Test Articles', 
    description: '清理所有测试文章', 
    status: 'pending', 
    fn: async () => {
      const testPaths = [
        TEST_ARTICLE_PATH,
        'sections/posts/test-minimal.md'
      ]
      const results = []
      for (const path of testPaths) {
        const response = await fetch(`${API_BASE}/articles/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        })
        const result = await response.json()
        results.push({ path, success: result.success, error: result.error })
      }
      const raw = JSON.stringify(results, null, 2)
      const successCount = results.filter((r: any) => r.success).length
      const formatted = `✅ 清理完成\n\n📊 删除结果:\n${results.map((r: any, i: number) => `  ${i+1}. ${r.path.split('/').pop()} - ${r.success ? '✅' : '❌'}`).join('\n')}\n\n总计: ${successCount}/${results.length} 成功`
      return { formatted, raw }
    }
  },
])

// GitHub 工具测试
const githubTests = ref<TestCase[]>([
  { 
    category: 'github', 
    name: 'AutoGen Repo', 
    description: '获取微软 AutoGen 仓库信息', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/github/repo/microsoft/autogen`)
      const data = await response.json()
      const raw = JSON.stringify(data, null, 2)
      const formatted = `✅ 仓库信息获取成功\n\n📦 ${data.full_name}\n⭐ Stars: ${data.stargazers_count?.toLocaleString()}\n🍴 Forks: ${data.forks_count?.toLocaleString()}\n🔤 语言: ${data.language}`
      return { formatted, raw }
    }
  },
  { 
    category: 'github', 
    name: 'MetaGPT Repo', 
    description: '获取 MetaGPT 仓库信息', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/github/repo/foundationagents/metagpt`)
      const data = await response.json()
      const raw = JSON.stringify(data, null, 2)
      const formatted = `✅ 仓库信息获取成功\n\n📦 ${data.full_name}\n⭐ Stars: ${data.stargazers_count?.toLocaleString()}\n🍴 Forks: ${data.forks_count?.toLocaleString()}`
      return { formatted, raw }
    }
  },
])

// AI 项目数据
const aiProjects = ref(aiProjectsData)

// 统计
const allTests = computed(() => [...mcpTests.value, ...networkTests.value, ...articleTests.value, ...githubTests.value])
const passed = computed(() => allTests.value.filter(t => t.status === 'success').length)
const failed = computed(() => allTests.value.filter(t => t.status === 'error').length)
const pending = computed(() => allTests.value.filter(t => t.status === 'pending').length)
const total = computed(() => allTests.value.length)

const testingAll = ref(false)

async function runTest(test: TestCase) {
  test.status = 'running'
  test.result = ''
  test.rawResult = ''
  addLog(`开始: ${test.name}`)
  try {
    const { formatted, raw } = await test.fn()
    test.result = formatted
    test.rawResult = raw
    test.status = 'success'
    addLog(`✅ ${test.name}`, 'success')
  } catch (err: any) {
    test.result = err.message || String(err)
    test.rawResult = err.stack || err.message || String(err)
    test.status = 'error'
    addLog(`❌ ${test.name}: ${err.message}`, 'error')
  }
}

async function testAll() {
  testingAll.value = true
  logs.value = []
  addLog('🚀 开始批量测试...')
  for (const test of allTests.value) {
    await runTest(test)
    await new Promise(r => setTimeout(r, 200))
  }
  testingAll.value = false
  addLog(`✅ 测试完成! 通过: ${passed.value}, 失败: ${failed.value}`, 'success')
}

function getCategoryStats(cat: string) {
  const tests = allTests.value.filter(t => t.category === cat)
  const done = tests.filter(t => t.status === 'success').length
  return `${done}/${tests.length}`
}
</script>

<style scoped>
.tool-tester-3d {
  position: relative;
  min-height: 100vh;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 50%, #f1f5f9 100%);
  color: #1e293b;
}

/* 背景效果 */
.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%);
  top: -200px;
  right: -200px;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%);
  bottom: -100px;
  left: -100px;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 头部 */
.header-3d {
  position: relative;
  text-align: center;
  margin-bottom: 2rem;
  z-index: 1;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
}

.logo-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}

.title-3d {
  font-size: 3rem;
  font-weight: 800;
  margin: 0;
  display: flex;
  gap: 0.5rem;
}

.title-gradient {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.title-normal {
  color: #1e293b;
}

.subtitle {
  color: #64748b;
  margin-bottom: 1.5rem;
}

.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-3d {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 统计面板 */
.stats-section {
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  max-width: 700px;
  margin: 0 auto;
}

.stat-card-3d {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.25rem;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.stat-card-3d:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.1);
}

.stat-card-3d.success { border-top: 3px solid #10b981; }
.stat-card-3d.error { border-top: 3px solid #ef4444; }
.stat-card-3d.pending { border-top: 3px solid #f59e0b; }
.stat-card-3d.total { border-top: 3px solid #3b82f6; }

.stat-icon {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

/* 分类区域 */
.test-categories {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
}

.category-section {
  margin-bottom: 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
  background: linear-gradient(to right, #f8fafc, #ffffff);
}

.category-header:hover {
  background: #f1f5f9;
}

.category-icon {
  font-size: 1.5rem;
}

.category-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  flex: 1;
  color: #1e293b;
}

.category-count {
  font-size: 0.875rem;
  color: #64748b;
  padding: 0.25rem 0.75rem;
  background: #f1f5f9;
  border-radius: 20px;
}

.toggle-icon {
  font-size: 0.75rem;
  color: #94a3b8;
  transition: transform 0.3s;
}

.toggle-icon.open {
  transform: rotate(180deg);
}

/* 测试网格 */
.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 2000px;
  opacity: 1;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding: 0;
}

/* 日志面板 */
.log-panel {
  position: fixed;
  bottom: 0;
  right: 1.5rem;
  width: 400px;
  max-height: 50vh;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
  transform: translateY(calc(100% - 48px));
  transition: transform 0.3s ease;
}

.log-panel.open {
  transform: translateY(0);
}

.log-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  color: #374151;
}

.log-count {
  background: #3b82f6;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
}

.log-content {
  padding: 1rem;
  max-height: calc(50vh - 48px);
  overflow-y: auto;
}

.log-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.8125rem;
  border-radius: 6px;
  margin-bottom: 0.25rem;
}

.log-item.success { background: #f0fdf4; }
.log-item.error { background: #fef2f2; }

.log-time {
  color: #94a3b8;
  font-family: monospace;
  font-size: 0.75rem;
}

.log-badge {
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.625rem;
  text-transform: uppercase;
  font-weight: 600;
}

.log-badge.success { background: #bbf7d0; color: #166534; }
.log-badge.error { background: #fecaca; color: #991b1b; }
.log-badge.info { background: #dbeafe; color: #1e40af; }

.log-msg {
  flex: 1;
  color: #374151;
}

@media (max-width: 768px) {
  .tool-tester-3d {
    padding: 1rem;
  }
  
  .title-3d {
    font-size: 2rem;
  }
  
  .test-grid,
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .log-panel {
    right: 0;
    left: 0;
    width: auto;
    border-radius: 0;
  }
}
</style>
