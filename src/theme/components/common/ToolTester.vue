<!--
  ToolTester - AI 工具测试平台
  
  功能：
  - 测试所有 AI Agent 工具
  - 支持参数可视化编辑
  - 详细的执行日志和错误信息
  - 结果格式化展示
-->
<template>
  <div class="tool-tester">
    <!-- 头部 -->
    <div class="tester-header">
      <div class="header-title">
        <span class="title-icon">🧪</span>
        <h3>工具测试平台</h3>
      </div>
      <div class="header-actions">
        <button 
          class="btn-test-all"
          :class="{ running: isRunningAllTests }"
          :disabled="isRunningAllTests"
          @click="runAllTests"
        >
          <span v-if="isRunningAllTests" class="btn-spinner">⟳</span>
          <span v-else>🚀</span>
          {{ isRunningAllTests ? `测试中... ${batchTestProgress.completed}/${batchTestProgress.total}` : '测试所有工具' }}
        </button>
      </div>
      <div class="header-stats">
        <span class="stat-item">
          <span class="stat-value">{{ availableTools.length }}</span>
          <span class="stat-label">可用工具</span>
        </span>
        <span class="stat-item">
          <span class="stat-value success">{{ successCount }}</span>
          <span class="stat-label">成功</span>
        </span>
        <span class="stat-item">
          <span class="stat-value error">{{ errorCount }}</span>
          <span class="stat-label">失败</span>
        </span>
      </div>
    </div>

    <div class="tester-layout">
      <!-- 左侧：工具选择 -->
      <div class="tools-sidebar">
        <div class="sidebar-title">工具列表</div>
        <div class="tools-categories">
          <div 
            v-for="category in toolCategories" 
            :key="category.id"
            class="category-section"
          >
            <div class="category-header" @click="toggleCategory(category.id)">
              <span class="category-icon">{{ category.icon }}</span>
              <span class="category-name">{{ category.name }}</span>
              <span class="category-count">{{ category.tools.length }}</span>
              <span class="toggle-icon" :class="{ expanded: expandedCategories.includes(category.id) }">▶</span>
            </div>
            <div v-show="expandedCategories.includes(category.id)" class="category-tools">
              <button
                v-for="tool in category.tools"
                :key="tool.name"
                class="tool-item"
                :class="{ active: selectedTool?.name === tool.name, disabled: tool.status === 'developing' }"
                @click="selectTool(tool)"
              >
                <span class="tool-status" :class="tool.status"></span>
                <span class="tool-name">{{ tool.name }}</span>
                <span v-if="tool.status === 'developing'" class="tool-badge">开发中</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：参数配置 -->
      <div class="params-panel">
        <div v-if="selectedTool" class="panel-content">
          <div class="tool-header">
            <h4>{{ selectedTool.name }}</h4>
            <p class="tool-description">{{ selectedTool.description }}</p>
          </div>

          <!-- 参数表单 -->
          <div class="params-form">
            <div class="form-title">
              <span>参数配置</span>
              <button class="btn-clear" @click="clearParams">清空</button>
            </div>
            
            <div class="param-list">
              <div 
                v-for="(param, key) in selectedTool.parameters.properties" 
                :key="key"
                class="param-item"
              >
                <label class="param-label">
                  {{ key }}
                  <span v-if="selectedTool.parameters.required?.includes(key)" class="required">*</span>
                  <span class="param-type">{{ param.type }}</span>
                </label>
                <div class="param-input-wrapper">
                  <!-- 字符串类型 -->
                  <input
                    v-if="param.type === 'string' && !param.enum"
                    v-model="params[key]"
                    type="text"
                    :placeholder="param.description"
                    class="param-input"
                  />
                  <!-- 枚举类型 -->
                  <select
                    v-else-if="param.enum"
                    v-model="params[key]"
                    class="param-select"
                  >
                    <option value="">请选择...</option>
                    <option v-for="opt in param.enum" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <!-- 数字类型 -->
                  <input
                    v-else-if="param.type === 'number' || param.type === 'integer'"
                    v-model.number="params[key]"
                    type="number"
                    :placeholder="param.description"
                    class="param-input"
                  />
                  <!-- 布尔类型 -->
                  <label v-else-if="param.type === 'boolean'" class="param-checkbox">
                    <input v-model="params[key]" type="checkbox" />
                    <span class="check-slider"></span>
                  </label>
                  <!-- 数组类型 -->
                  <textarea
                    v-else-if="param.type === 'array'"
                    v-model="arrayParams[key]"
                    :placeholder="'每行一个项目，或输入 JSON 数组'"
                    class="param-textarea"
                    rows="3"
                  ></textarea>
                  <!-- 默认 -->
                  <input
                    v-else
                    v-model="params[key]"
                    type="text"
                    :placeholder="param.description"
                    class="param-input"
                  />
                </div>
                <p class="param-desc">{{ param.description }}</p>
              </div>
            </div>

            <!-- JSON 模式 -->
            <div class="json-mode-toggle">
              <label class="toggle-label">
                <input v-model="isJsonMode" type="checkbox" />
                <span>JSON 模式</span>
              </label>
            </div>

            <div v-if="isJsonMode" class="json-editor">
              <textarea
                v-model="jsonParams"
                class="json-textarea"
                rows="8"
                placeholder="输入 JSON 格式参数"
              ></textarea>
              <button class="btn-apply" @click="applyJsonParams">应用 JSON</button>
            </div>
          </div>

          <!-- 执行按钮 -->
          <button 
            class="btn-execute"
            :disabled="isExecuting || selectedTool.status === 'developing'"
            @click="executeTool"
          >
            <span v-if="isExecuting" class="spinner"></span>
            <span v-else>▶</span>
            {{ isExecuting ? '执行中...' : '执行工具' }}
          </button>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">🔧</div>
          <p>请从左侧选择要测试的工具</p>
        </div>
      </div>

      <!-- 右侧：结果展示 -->
      <div class="result-panel">
        <div class="panel-tabs">
          <button 
            class="tab-btn"
            :class="{ active: activeTab === 'result' }"
            @click="activeTab = 'result'"
          >
            执行结果
          </button>
          <button 
            class="tab-btn"
            :class="{ active: activeTab === 'logs' }"
            @click="activeTab = 'logs'"
          >
            执行日志
            <span v-if="logs.length" class="tab-badge">{{ logs.length }}</span>
          </button>
        </div>

        <div class="panel-content">
          <!-- 结果标签页 -->
          <div v-show="activeTab === 'result'" class="result-content">
            <div v-if="lastResult" class="result-box" :class="lastResult.type">
              <div class="result-header">
                <span class="result-status" :class="lastResult.type">
                  {{ lastResult.type === 'success' ? '✓' : lastResult.type === 'error' ? '✗' : '⏱' }}
                </span>
                <span class="result-time">{{ formatTime(lastResult.time) }}</span>
                <span v-if="lastResult.isBatchResult" class="result-badge">批量测试</span>
              </div>
              
              <!-- 批量测试结果 -->
              <div v-if="lastResult.isBatchResult" class="batch-result">
                <div class="batch-summary">
                  <h4>📊 测试报告</h4>
                  <div class="summary-stats">
                    <div class="stat-box">
                      <span class="stat-num">{{ lastResult.data.summary.total }}</span>
                      <span class="stat-label">总计</span>
                    </div>
                    <div class="stat-box success">
                      <span class="stat-num">{{ lastResult.data.summary.success }}</span>
                      <span class="stat-label">成功</span>
                    </div>
                    <div class="stat-box error">
                      <span class="stat-num">{{ lastResult.data.summary.error }}</span>
                      <span class="stat-label">失败</span>
                    </div>
                    <div class="stat-box">
                      <span class="stat-num">{{ lastResult.data.summary.successRate }}%</span>
                      <span class="stat-label">成功率</span>
                    </div>
                  </div>
                </div>
                <div class="batch-details">
                  <h5>详细结果</h5>
                  <div 
                    v-for="item in lastResult.data.results" 
                    :key="item.tool"
                    class="batch-item"
                    :class="item.status"
                  >
                    <span class="item-status">{{ item.status === 'success' ? '✅' : '❌' }}</span>
                    <span class="item-name">{{ item.tool }}</span>
                    <span v-if="item.duration" class="item-duration">{{ item.duration }}ms</span>
                  </div>
                </div>
              </div>
              
              <!-- 单工具结果 -->
              <pre v-else class="result-data">{{ formatResult(lastResult.data) }}</pre>
            </div>
            <div v-else class="empty-result">
              <p>执行工具后在此查看结果</p>
            </div>
          </div>

          <!-- 日志标签页 -->
          <div v-show="activeTab === 'logs'" class="logs-content">
            <div v-if="logs.length" class="logs-list">
              <div 
                v-for="(log, index) in logs" 
                :key="index"
                class="log-item"
                :class="log.level"
              >
                <span class="log-time">{{ formatTime(log.time) }}</span>
                <span class="log-level">{{ log.level }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
            <div v-else class="empty-logs">
              <p>暂无执行日志</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { executeTool as executeRealTool, hasTool } from '@/theme/tools'
import { computed, reactive, ref, watch } from 'vue'

// ============ 工具定义 ============

const toolCategories = [
  {
    id: 'article',
    name: '知识库文章',
    icon: '📚',
    tools: [
      {
        name: 'listArticles',
        description: '列出知识库中的文章目录，支持分类筛选和层级浏览',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            section: { 
              type: 'string', 
              description: '按分类筛选，例如 "knowledge"、"posts"',
              enum: ['knowledge', 'posts', '']
            },
            folder_path: {
              type: 'string',
              description: '指定文件夹路径，例如 "/sections/knowledge/ml/"'
            },
            limit: { 
              type: 'integer', 
              description: '返回结果数量限制，默认20',
              default: 20
            },
            recursive: {
              type: 'boolean',
              description: '是否递归列出子文件夹内容，默认false'
            },
            sort_by: {
              type: 'string',
              description: '排序方式',
              enum: ['name', 'date', 'category']
            }
          },
          required: []
        }
      },
      {
        name: 'getArticleContent',
        description: '获取指定文章的完整内容，支持行号范围和元数据',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            path: { 
              type: 'string', 
              description: '文章路径，支持 "/sections/posts/article" 或 "sections/posts/article.md"'
            },
            start_line: {
              type: 'integer',
              description: '起始行号(从1开始)'
            },
            end_line: {
              type: 'integer',
              description: '结束行号'
            },
            max_length: {
              type: 'integer',
              description: '最大返回字符数，默认8000'
            },
            include_metadata: {
              type: 'boolean',
              description: '是否包含 frontmatter 元数据'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'searchArticles',
        description: '根据关键词搜索文章，支持全文检索',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            query: { 
              type: 'string', 
              description: '搜索关键词'
            },
            section: {
              type: 'string',
              description: '限定搜索的分类'
            },
            limit: { 
              type: 'integer', 
              description: '返回结果数量限制，默认5条'
            },
            include_folders: {
              type: 'boolean',
              description: '是否包含文件夹结果'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'createArticle',
        description: '创建新文章，自动创建父文件夹，支持 frontmatter',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            title: { 
              type: 'string', 
              description: '文章标题'
            },
            path: { 
              type: 'string', 
              description: '文章路径，例如 "knowledge/transformer.md"'
            },
            content: { 
              type: 'string', 
              description: '文章内容(Markdown)'
            },
            tags: {
              type: 'array',
              description: '文章标签数组'
            },
            category: {
              type: 'string',
              description: '文章分类'
            },
            overwrite: {
              type: 'boolean',
              description: '如果文件已存在是否覆盖'
            }
          },
          required: ['title', 'path']
        }
      },
      {
        name: 'updateArticle',
        description: '更新文章内容，支持多种更新模式',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            path: { 
              type: 'string', 
              description: '文章路径'
            },
            content: { 
              type: 'string', 
              description: '新的文章内容'
            },
            mode: {
              type: 'string',
              description: '更新模式',
              enum: ['replace', 'append', 'prepend', 'insert']
            },
            position: {
              type: 'integer',
              description: '插入位置(仅在 mode=insert 时有效)'
            },
            after_section: {
              type: 'string',
              description: '在某个章节标题后插入'
            },
            dry_run: {
              type: 'boolean',
              description: '是否仅预览变更'
            }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'deleteArticle',
        description: '删除文章或文件夹，支持备份选项',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            path: { 
              type: 'string', 
              description: '要删除的路径'
            },
            confirm: {
              type: 'boolean',
              description: '确认删除'
            },
            backup_first: {
              type: 'boolean',
              description: '删除前是否备份'
            }
          },
          required: ['path']
        }
      }
    ]
  },
  {
    id: 'web',
    name: '网络内容抓取',
    icon: '🌐',
    tools: [

      {
        name: 'fetchArxiv',
        description: '抓取 ArXiv 论文信息，支持摘要、作者、PDF链接',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            paper_id: { 
              type: 'string', 
              description: 'ArXiv 论文 ID，例如 "2401.12345"'
            },
            include_abstract: {
              type: 'boolean',
              description: '是否包含摘要'
            },
            include_pdf: {
              type: 'boolean',
              description: '是否返回 PDF 链接'
            },
            version: {
              type: 'string',
              description: '论文版本号'
            }
          },
          required: ['paper_id']
        }
      },
      {
        name: 'github_get_repo',
        description: '获取 GitHub 项目信息，包括 stars、forks、语言等',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            owner: { 
              type: 'string', 
              description: '仓库所有者'
            },
            repo: { 
              type: 'string', 
              description: '仓库名称'
            },
            include_readme: {
              type: 'boolean',
              description: '是否包含 README 内容'
            },
            include_stats: {
              type: 'boolean',
              description: '是否包含统计信息(stars、forks 等)'
            }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'github_get_issues',
        description: '获取 GitHub 项目的 Issues 列表',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: '仓库所有者' },
            repo: { type: 'string', description: '仓库名称' },
            state: { 
              type: 'string', 
              description: 'Issue 状态',
              enum: ['open', 'closed', 'all']
            },
            labels: { type: 'string', description: '标签筛选' },
            limit: { type: 'integer', description: '返回数量限制' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'github_get_commit_history',
        description: '获取 GitHub 项目的提交记录',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: '仓库所有者' },
            repo: { type: 'string', description: '仓库名称' },
            path: { type: 'string', description: '限定文件路径' },
            per_page: { type: 'integer', description: '返回数量限制', default: 10 }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'github_list_repo_contents',
        description: '列出 GitHub 仓库的文件和目录内容',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: '仓库所有者' },
            repo: { type: 'string', description: '仓库名称' },
            path: { type: 'string', description: '目录路径，默认为根目录' },
            ref: { type: 'string', description: '分支、标签或 commit SHA' }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'github_get_file_content',
        description: '获取 GitHub 项目中指定文件的内容',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: '仓库所有者' },
            repo: { type: 'string', description: '仓库名称' },
            path: { type: 'string', description: '文件路径' },
            ref: { type: 'string', description: '分支、标签或 commit SHA' },
            max_length: { type: 'integer', description: '最大返回字符数', default: 10000 }
          },
          required: ['owner', 'repo', 'path']
        }
      },
      {
        name: 'github_search_code',
        description: '在 GitHub 上搜索代码',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' },
            language: { type: 'string', description: '限定编程语言' },
            limit: { type: 'integer', description: '返回数量限制', default: 5 }
          },
          required: ['query']
        }
      }
    ]
  },
  {
    id: 'system',
    name: '系统工具',
    icon: '🛠️',
    tools: [
      {
        name: 'getCurrentTime',
        description: '获取当前系统时间',
        status: 'available',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },

    ]
  },

]

// ============ 状态 ============

const expandedCategories = ref(['article'])
const selectedTool = ref(null)
const params = reactive({})
const arrayParams = reactive({})
const isJsonMode = ref(false)
const jsonParams = ref('')
const isExecuting = ref(false)
const activeTab = ref('result')
const logs = ref([])
const lastResult = ref(null)
const successCount = ref(0)
const errorCount = ref(0)

// ============ 批量测试状态 ============
const isRunningAllTests = ref(false)
const batchTestProgress = ref({
  total: 0,
  completed: 0,
  current: '',
  results: []
})

// ============ 计算属性 ============

const availableTools = computed(() => {
  return toolCategories.flatMap(c => c.tools)
})

// ============ 方法 ============

function toggleCategory(id) {
  const index = expandedCategories.value.indexOf(id)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(id)
  }
}

function selectTool(tool) {
  if (tool.status === 'developing') return
  selectedTool.value = tool
  // 重置参数
  Object.keys(params).forEach(key => delete params[key])
  Object.keys(arrayParams).forEach(key => delete arrayParams[key])
  // 设置默认值
  if (tool.parameters?.properties) {
    Object.entries(tool.parameters.properties).forEach(([key, prop]) => {
      if (prop.default !== undefined) {
        params[key] = prop.default
      }
    })
  }
  updateJsonFromParams()
}

function clearParams() {
  Object.keys(params).forEach(key => delete params[key])
  Object.keys(arrayParams).forEach(key => delete arrayParams[key])
  updateJsonFromParams()
}

function updateJsonFromParams() {
  const data = { ...params }
  // 处理数组参数
  Object.entries(arrayParams).forEach(([key, value]) => {
    if (value.trim()) {
      try {
        // 尝试解析 JSON
        data[key] = JSON.parse(value)
      } catch {
        // 按行分割
        data[key] = value.split('\n').filter(line => line.trim())
      }
    }
  })
  jsonParams.value = JSON.stringify(data, null, 2)
}

function applyJsonParams() {
  try {
    const data = JSON.parse(jsonParams.value)
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        arrayParams[key] = value.join('\n')
        delete params[key]
      } else {
        params[key] = value
        delete arrayParams[key]
      }
    })
    addLog('info', 'JSON 参数已应用')
  } catch (e) {
    addLog('error', `JSON 解析错误: ${e.message}`)
  }
}

// 监听参数变化，同步 JSON
watch([params, arrayParams], () => {
  if (!isJsonMode.value) {
    updateJsonFromParams()
  }
}, { deep: true })

function addLog(level, message) {
  logs.value.unshift({
    time: Date.now(),
    level,
    message
  })
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  })
}

function formatResult(data) {
  if (typeof data === 'string') return data
  return JSON.stringify(data, null, 2)
}

async function executeTool() {
  if (!selectedTool.value || isExecuting.value) return
  
  isExecuting.value = true
  addLog('info', `开始执行: ${selectedTool.value.name}`)
  
  try {
    // 构建参数
    let finalParams = { ...params }
    Object.entries(arrayParams).forEach(([key, value]) => {
      if (value.trim()) {
        try {
          finalParams[key] = JSON.parse(value)
        } catch {
          finalParams[key] = value.split('\n').filter(line => line.trim())
        }
      }
    })
    
    addLog('info', `参数: ${JSON.stringify(finalParams)}`)
    
    // 检查工具是否已注册
    if (!hasTool(selectedTool.value.name)) {
      throw new Error(`工具 "${selectedTool.value.name}" 未注册到工具系统中\n\n请检查：\n1. 工具是否已正确导出\n2. 工具是否已在 registry 中注册\n3. 工具名称拼写是否正确`)
    }
    
    // 调用真实的工具执行器
    addLog('info', '调用真实工具执行器...')
    const result = await executeRealTool(selectedTool.value.name, finalParams)
    
    lastResult.value = {
      type: 'success',
      time: Date.now(),
      data: {
        success: true,
        tool: selectedTool.value.name,
        params: finalParams,
        result: result
      }
    }
    successCount.value++
    addLog('success', '执行成功')
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''
    
    lastResult.value = {
      type: 'error',
      time: Date.now(),
      data: {
        error: errorMessage,
        code: 'EXECUTION_ERROR',
        stack: errorStack,
        suggestion: '请检查：\n1. 工具名称是否正确\n2. 参数是否符合要求\n3. 网络连接是否正常(网络工具)\n4. 查看浏览器控制台获取详细错误信息'
      }
    }
    errorCount.value++
    addLog('error', `执行失败: ${errorMessage}`)
  } finally {
    isExecuting.value = false
  }
}

function generateMockResult(toolName, params) {
  switch (toolName) {
    case 'listArticles':
      return {
        articles: [
          { title: 'Transformer 详解', path: 'knowledge/transformer.md', category: 'AI' },
          { title: 'Docker 入门', path: 'knowledge/docker-basics.md', category: 'DevOps' }
        ],
        total: 2
      }
    case 'getArticleContent':
      return {
        title: '示例文章',
        content: '# 示例文章\n\n这是一篇测试文章的内容...',
        metadata: { date: '2024-01-01', tags: ['test'] }
      }
    case 'searchArticles':
      return {
        results: [
          { title: '搜索结果 1', path: 'knowledge/result1.md', relevance: 0.95 },
          { title: '搜索结果 2', path: 'knowledge/result2.md', relevance: 0.87 }
        ],
        query: params.query
      }
    case 'getCurrentTime':
      return {
        timestamp: Date.now(),
        iso: new Date().toISOString(),
        formatted: new Date().toLocaleString('zh-CN')
      }

    default:
      return { message: 'Mock result for ' + toolName, params }
  }
}

// ============ 批量测试所有工具 ============

// 为每个工具生成测试参数
function generateTestParams(tool) {
  const params = {}
  const properties = tool.parameters?.properties || {}
  const required = tool.parameters?.required || []
  
  for (const [key, prop] of Object.entries(properties)) {
    // 如果有默认值，使用默认值
    if (prop.default !== undefined) {
      params[key] = prop.default
      continue
    }
    
    // 根据类型生成测试值
    switch (prop.type) {
      case 'string':
        if (key === 'url') {
          params[key] = 'https://api.github.com/users/octocat'
        } else if (key === 'query') {
          params[key] = 'test'
        } else if (key === 'path') {
          params[key] = 'README.md'
        } else if (key === 'content') {
          params[key] = '这是测试内容'
        } else if (key === 'title') {
          params[key] = '测试标题'
        } else if (key === 'message') {
          params[key] = 'Hello, World!'
        } else if (key === 'owner') {
          params[key] = 'facebook'
        } else if (key === 'repo') {
          params[key] = 'react'
        } else if (key === 'paper_id') {
          params[key] = '2401.12345'
        } else if (key === 'knowledge_base_name') {
          params[key] = 'test_kb'
        } else if (key === 'name') {
          params[key] = 'test_item'
        } else if (key === 'document_id') {
          params[key] = 'test-doc-id'
        } else if (key === 'language') {
          params[key] = prop.enum?.[0] || 'javascript'
        } else if (key === 'format') {
          params[key] = prop.enum?.[0] || 'markdown'
        } else if (key === 'state') {
          params[key] = prop.enum?.[0] || 'open'
        } else if (key === 'expression') {
          params[key] = '2 + 2'
        } else if (key === 'text') {
          params[key] = '这是一段测试文本'
        } else if (key === 'code') {
          params[key] = 'console.log("Hello")'
        } else {
          params[key] = `test_${key}`
        }
        break
      case 'integer':
      case 'number':
        if (key === 'limit' || key === 'per_page' || key === 'max_length') {
          params[key] = Math.min(prop.default || 5, 10)
        } else if (key === 'timeout') {
          params[key] = 5000
        } else if (key === 'repeat_count') {
          params[key] = 1
        } else {
          params[key] = 1
        }
        break
      case 'boolean':
        params[key] = true
        break
      case 'array':
        params[key] = ['test1', 'test2']
        break
      case 'object':
        params[key] = {}
        break
      default:
        params[key] = null
    }
    
    // 如果不是必填参数且没有默认值，可能不需要包含
    if (!required.includes(key) && prop.default === undefined) {
      // 保留生成的值，让测试更完整
    }
  }
  
  return params
}

async function runAllTests() {
  if (isRunningAllTests.value) return
  
  const availableTools = toolCategories
    .flatMap(c => c.tools)
    .filter(t => t.status === 'available' && hasTool(t.name))
  
  if (availableTools.length === 0) {
    addLog('error', '没有可测试的工具')
    return
  }
  
  isRunningAllTests.value = true
  batchTestProgress.value = {
    total: availableTools.length,
    completed: 0,
    current: '',
    results: []
  }
  
  addLog('info', `🚀 开始批量测试 ${availableTools.length} 个工具`)
  
  const results = []
  let successCountBatch = 0
  let errorCountBatch = 0
  
  for (let i = 0; i < availableTools.length; i++) {
    const tool = availableTools[i]
    batchTestProgress.value.current = tool.name
    
    addLog('info', `[${i + 1}/${availableTools.length}] 测试: ${tool.name}`)
    
    try {
      const testParams = generateTestParams(tool)
      const startTime = Date.now()
      
      const result = await executeRealTool(tool.name, testParams)
      
      const duration = Date.now() - startTime
      results.push({
        tool: tool.name,
        status: 'success',
        duration,
        result: typeof result === 'string' ? result.substring(0, 500) : result
      })
      successCountBatch++
      addLog('success', `✅ ${tool.name} 成功 (${duration}ms)`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      results.push({
        tool: tool.name,
        status: 'error',
        error: errorMessage.substring(0, 200)
      })
      errorCountBatch++
      addLog('error', `❌ ${tool.name} 失败: ${errorMessage.substring(0, 100)}`)
    }
    
    batchTestProgress.value.completed = i + 1
    
    // 添加小延迟，避免请求过快
    if (i < availableTools.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  batchTestProgress.value.results = results
  
  // 生成测试报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: availableTools.length,
      success: successCountBatch,
      error: errorCountBatch,
      successRate: ((successCountBatch / availableTools.length) * 100).toFixed(1)
    },
    results
  }
  
  lastResult.value = {
    type: 'success',
    time: Date.now(),
    isBatchResult: true,
    data: report
  }
  
  // 更新总统计
  successCount.value += successCountBatch
  errorCount.value += errorCountBatch
  
  addLog('info', `📊 批量测试完成: ${successCountBatch} 成功, ${errorCountBatch} 失败 (${report.summary.successRate}%)`)
  
  isRunningAllTests.value = false
  batchTestProgress.value.current = ''
  
  // 切换到结果标签
  activeTab.value = 'result'
}
</script>

<style scoped>
.tool-tester {
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  margin: 20px 0;
}

/* 头部 */
.tester-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #1e293b, #334155);
  color: white;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 24px;
}

.header-title h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #94a3b8;
}

.stat-value.success {
  color: #4ade80;
}

.stat-value.error {
  color: #f87171;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
}

/* 布局 */
.tester-layout {
  display: grid;
  grid-template-columns: 240px 1fr 360px;
  min-height: 500px;
}

/* 侧边栏 */
.tools-sidebar {
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  padding: 16px;
  overflow-y: auto;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.category-section {
  margin-bottom: 8px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-header:hover {
  background: #f1f5f9;
}

.category-icon {
  font-size: 16px;
}

.category-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.category-count {
  font-size: 11px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 100px;
}

.toggle-icon {
  font-size: 10px;
  color: #94a3b8;
  transition: transform 0.2s;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.category-tools {
  padding-left: 8px;
  margin-top: 4px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.tool-item:hover {
  background: #f1f5f9;
}

.tool-item.active {
  background: #dbeafe;
}

.tool-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.tool-status.available {
  background: #22c55e;
}

.tool-status.developing {
  background: #f59e0b;
}

.tool-name {
  flex: 1;
  font-size: 12px;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-badge {
  font-size: 10px;
  color: #f59e0b;
  background: #fffbeb;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 参数面板 */
.params-panel {
  padding: 20px;
  background: #fafafa;
  overflow-y: auto;
}

.panel-content {
  height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.tool-header {
  margin-bottom: 20px;
}

.tool-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
}

.tool-description {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* 参数表单 */
.params-form {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 16px;
}

.btn-clear {
  font-size: 12px;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
}

.btn-clear:hover {
  color: #ef4444;
}

.param-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.param-label .required {
  color: #ef4444;
}

.param-type {
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: normal;
}

.param-input,
.param-select,
.param-textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  color: #1f2937;
  background: white;
  outline: none;
  transition: all 0.2s;
}

.param-input:focus,
.param-select:focus,
.param-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.param-desc {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.param-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.param-checkbox input {
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
}

/* JSON 模式 */
.json-mode-toggle {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e5e7eb;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.json-editor {
  margin-top: 12px;
}

.json-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
}

.btn-apply {
  margin-top: 8px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

/* 执行按钮 */
.btn-execute {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-execute:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-execute:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 结果面板 */
.result-panel {
  background: white;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
}

.tab-btn {
  flex: 1;
  padding: 14px;
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #3b82f6;
  background: #eff6ff;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #3b82f6;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  margin-left: 6px;
  background: #3b82f6;
  color: white;
  font-size: 11px;
  border-radius: 100px;
}

.result-content,
.logs-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.result-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.result-box.success {
  border-color: #86efac;
  background: #f0fdf4;
}

.result-box.error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.result-status {
  font-size: 16px;
}

.result-status.success {
  color: #22c55e;
}

.result-status.error {
  color: #ef4444;
}

.result-time {
  font-size: 12px;
  color: #64748b;
}

.result-data {
  padding: 16px;
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}

.empty-result,
.empty-logs {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #94a3b8;
  font-size: 13px;
}

/* 日志列表 */
.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.log-item.info {
  background: #f1f5f9;
}

.log-item.success {
  background: #f0fdf4;
  color: #166534;
}

.log-item.error {
  background: #fef2f2;
  color: #991b1b;
}

.log-time {
  color: #94a3b8;
  font-family: monospace;
  font-size: 11px;
}

.log-level {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.1);
}

.log-message {
  flex: 1;
  word-break: break-word;
}

/* 批量测试按钮 */
.header-actions {
  margin-right: auto;
  margin-left: 16px;
}

.btn-test-all {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.btn-test-all:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.btn-test-all:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-test-all.running {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  animation: pulse 1.5s ease-in-out infinite;
}

.btn-spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

/* 批量测试结果 */
.result-badge {
  padding: 2px 8px;
  background: #3b82f6;
  color: white;
  font-size: 11px;
  border-radius: 4px;
  margin-left: 8px;
}

.batch-result {
  padding: 16px;
}

.batch-summary {
  margin-bottom: 20px;
}

.batch-summary h4 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #1e293b;
}

.summary-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  min-width: 80px;
}

.stat-box.success {
  border-color: #86efac;
  background: #f0fdf4;
}

.stat-box.error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.stat-box .stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.stat-box.success .stat-num {
  color: #16a34a;
}

.stat-box.error .stat-num {
  color: #dc2626;
}

.stat-box .stat-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}

.batch-details {
  max-height: 400px;
  overflow-y: auto;
}

.batch-details h5 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #475569;
}

.batch-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 13px;
  background: white;
  border: 1px solid #e2e8f0;
}

.batch-item.success {
  border-left: 3px solid #22c55e;
}

.batch-item.error {
  border-left: 3px solid #ef4444;
  background: #fef2f2;
}

.item-status {
  font-size: 14px;
}

.item-name {
  flex: 1;
  font-family: monospace;
  font-weight: 500;
}

.item-duration {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

/* 响应式 */
@media (max-width: 1024px) {
  .tester-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }
  
  .tools-sidebar {
    max-height: 200px;
  }
  
  .result-panel {
    min-height: 300px;
  }
  
  .header-actions {
    margin-left: 0;
    margin-top: 12px;
  }
  
  .tester-header {
    flex-wrap: wrap;
  }
  
  .header-stats {
    margin-left: auto;
  }
}
</style>
