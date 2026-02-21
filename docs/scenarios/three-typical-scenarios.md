# 三个典型场景详细设计

## 场景1：人类创作 (Human Creation)

### 触发条件
用户想要手动创建一篇新文章

### 完整流程

#### 步骤1: 用户打开控制中心
- **用户动作**: 点击页面右下角的 "🎛️ 控制中心" 按钮
- **前端组件**: ControlCenter.vue - 显示控制中心弹窗
- **API调用**: 无 (纯前端交互)
- **日志记录**: actor="human", event="ui.controlcenter.open"

#### 步骤2: 用户选择文章管理
- **用户动作**: 点击 "📝 文章管理" 按钮
- **前端组件**: ArticleManager.vue - 加载文章列表
- **API调用**: GET /api/articles/list
- **日志记录**: 
  - human: article.list.open
  - system: api.response (200)

#### 步骤3: 用户点击新建文章
- **用户动作**: 点击 "+ 新建文章" 按钮
- **前端组件**: 显示新建文章弹窗
- **API调用**: 无
- **日志记录**: human: article.create.modal.open

#### 步骤4: 用户填写文章信息
- **用户动作**: 输入标题、选择分类、填写标签
- **前端组件**: CreateArticleModal.vue
- **API调用**: 无 (表单输入)
- **日志记录**: 无 (避免日志过多)

#### 步骤5: 用户选择保存路径
- **用户动作**: 点击路径选择器
- **前端组件**: PathSelector.vue
- **API调用**: 无
- **日志记录**: human: path.select

#### 步骤6: 用户确认创建
- **用户动作**: 点击 "创建" 按钮
- **前端组件**: ArticleManager.vue
- **API调用**: POST /api/articles/create
- **日志记录**:
  - human: article.create.submit
  - system: article.create.success (或 article.create.error)

---

## 场景2：AI被动创作 (AI Passive Creation)

### 触发条件
用户通过AI聊天助手请求AI帮助创作内容

### 完整流程

#### 步骤1: 用户打开AI聊天助手
- **用户动作**: 点击AI Orb图标
- **前端组件**: AIChatOrb.vue
- **API调用**: 无
- **日志记录**: human: chat.open

#### 步骤2: 用户输入创作请求
- **用户动作**: 输入 "帮我写一篇关于强化学习的文章"
- **前端组件**: AIChatOrb.vue - 渲染用户消息
- **API调用**: POST /api/logs/add (记录用户消息)
- **日志记录**: human: chat.message

#### 步骤3: AI接收请求并处理
- **系统组件**: chat-service.ts
- **API调用**: 
  - POST /api/logs/add (记录AI请求)
  - 调用 DeepSeek/Kimi API (流式)
- **日志记录**:
  - ai: chat.request
  - ai: chat.stream.request

#### 步骤4: AI流式响应
- **系统组件**: chat-service.ts
- **API调用**: POST /api/logs/add (记录首Token)
- **日志记录**: ai: chat.stream.first_token
- **前端组件**: AIChatOrb.vue - 实时渲染

#### 步骤5: AI响应完成
- **系统组件**: chat-service.ts
- **API调用**: POST /api/logs/add
- **日志记录**:
  - ai: chat.stream.complete
  - ai: chat.response
- **前端组件**: AIChatOrb.vue - 完成渲染

#### 步骤6: 用户要求AI保存文章 (可选)
- **用户动作**: 发送 "把这篇文章保存到知识库"
- **系统组件**: SkillEngine + CreateArticleSkill
- **API调用**: POST /api/files/save
- **日志记录**:
  - ai: skill.execute
  - ai: file.create

---

## 场景3：AI主动创作 (AI Proactive Creation)

### 触发条件
系统根据定时任务自动执行创作任务

### 完整流程

#### 步骤1: 触发条件满足
- **触发类型**: 定时任务 / 事件触发 / 用户设定计划
- **系统组件**: AgentRuntime.ts
- **API调用**: 无
- **日志记录**: system: agent.trigger

#### 步骤2: AI分析上下文
- **系统组件**: IntentRouter + SkillEngine
- **API调用**: GET /api/articles/list
- **日志记录**: ai: agent.context.build

#### 步骤3: AI规划创作任务
- **系统组件**: TaskManager
- **API调用**: 内部状态管理
- **日志记录**: ai: agent.task.plan

#### 步骤4: AI执行研究 (可选)
- **系统组件**: ResearchSkill
- **API调用**: 外部搜索API
- **日志记录**:
  - ai: agent.research.start
  - ai: agent.research.complete

#### 步骤5: AI生成大纲
- **系统组件**: CreateArticleSkill
- **API调用**: 内部 LLM.chat()
- **日志记录**: ai: agent.outline.generate

#### 步骤6: AI撰写内容
- **系统组件**: CreateArticleSkill
- **API调用**: 内部 LLM.chatStream()
- **日志记录**:
  - ai: agent.write.progress (多次)
  - ai: agent.write.complete

#### 步骤7: AI保存文章
- **系统组件**: CreateArticleSkill
- **API调用**: POST /api/articles/create
- **日志记录**:
  - ai: agent.file.save
  - system: api.response (200)
  - ai: agent.task.complete

#### 步骤8: 系统通知用户 (可选)
- **系统组件**: NotificationManager
- **API调用**: 内部推送
- **日志记录**: system: notification.push

---

## 日志统计汇总

| Actor | 场景1 | 场景2 | 场景3 | 总计 |
|-------|-------|-------|-------|------|
| human | 6 | 2 | 0 | 8 |
| ai | 0 | 6 | 8 | 14 |
| system | 2 | 2 | 3 | 7 |

### 关键API端点
- POST /api/logs/add - 添加日志
- GET /api/logs/recent - 获取最近日志
- GET /api/logs/stats - 获取日志统计
- GET /api/articles/list - 获取文章列表
- POST /api/articles/create - 创建文章
- POST /api/files/save - 保存文件
