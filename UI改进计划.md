# UI 改进计划

## 任务清单

### 1. UI打字机效果（高优先级）
- **目标**: 思考模式下模拟流式输出视觉效果
- **实现**: 
  - 在 `MessageBubble.vue` 或 `MessageList.vue` 中添加打字机逻辑
  - 对于非流式响应，逐字显示 `content` 和 `reasoning_content`
  - 支持可调节的打字速度

### 2. 默认折叠工具调用和思考气泡（高优先级）
- **目标**: 减少视觉噪音，默认折叠次要信息
- **实现**:
  - 修改思考气泡组件，添加 `collapsed` 状态
  - 修改工具调用卡片，添加 `collapsed` 状态
  - 点击展开/折叠

### 3. 增加工具到10个（中优先级）
当前8个工具：
1. get_article_content
2. search_articles
3. list_articles
4. create_article
5. update_article
6. delete_article
7. get_current_time
8. test_echo

需要添加2个：
9. **summarize_text** - 文本摘要工具
10. **translate_text** - 文本翻译工具

### 4. Agent配置页面重构（高优先级）

#### 4.1 Skills与Tools区分
- 明确区分内置Skills（能力）和注册Tools（工具调用）
- 提供Skills原文查看入口（JSON格式）
- 重新设计UI布局

#### 4.2 Skills编辑系统
- 新增Skills管理页面
- 支持CRUD操作
- 字段：name, description, prompt, parameters, enabled

#### 4.3 权限设置（占位）
- 保留UI框架
- 后续实现功能

#### 4.4 记忆管理系统（参考Claude/Codex）
- **Claude Memory特点**:
  - 长期记忆存储
  - 用户可查看和编辑
  - 跨会话保留
- **Codex上下文管理**:
  - 文件引用跟踪
  - 上下文窗口管理
  - 智能压缩
- **实现**:
  - 服务端API：记忆存储/检索/更新/删除
  - 前端UI：记忆查看器和编辑器
  - 持久化存储（文件或数据库）

### 5. 日志系统改进（中优先级）
- 每个session一个JSON文件（已实现）
- 添加UI展示标记（`ui_visible: true/false`）
- 添加人类可读注释（`human_note: "这是AI的思考过程"`）
- 区分AI回复和系统注释

## 实施顺序建议

```
第1阶段（快速 wins）:
- 任务3: 增加工具到10个（简单）
- 任务2: 默认折叠（中等）

第2阶段（核心功能）:
- 任务1: 打字机效果（中等）
- 任务5: 日志改进（中等）

第3阶段（大型重构）:
- 任务4.1-4.2: Skills系统（复杂）
- 任务4.4: 记忆系统（复杂）
```

请先确认实施顺序，或告诉我优先做哪个任务。
