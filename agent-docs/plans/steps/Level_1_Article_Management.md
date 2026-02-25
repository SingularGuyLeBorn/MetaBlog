# Step 1: 核心文章管理机制 (Non-AI 增删改查)

## 1. 概念定位
此阶段为整个 MetaBlog 的基石。博客的根本属性是内容的承载，因此在引入任何 AI 要素之前，系统必须具备对本地 Markdown 文件的绝对管控力。所有的 AI 生成、Agent 操作都是基于这套文件读写基建。

## 2. 核心功能点与状态
- **功能 1：文集树形结构读取**
  - **描述**：递归扫描 `.md` 文件夹，生成左侧 Sidebar 导航，以及支持面包屑导航。
  - **完成度**：✅ `100% 已实现`
  - **现有交互**：页面刷新/首次加载，左侧 Sidebar 生成完整的目录树。点击文件，即加载 `Markdown` 内容。
- **功能 2：页面内联编辑器 (Vditor)**
  - **描述**：不需要单独的 Edit 页面。利用 Vditor 的双向绑定，在阅读文章时，直接在原位进行编辑并保存。
  - **完成度**：✅ `100% 已实现`
  - **现有交互**：用户停留在任意 `.md` 路由，工具栏直接显现，可进行加粗、插入图片等所见即所得的编辑。
- **功能 3：文章的增、修改、保存、删除**
  - **描述**：文件系统的物理 CRUD。
  - **完成度**：✅ `100% 已实现`
  - **现有交互**：
    - **新建**：左侧边栏提供新建文件/文件夹图标。
    - **保存**：编辑器内 Ctrl+S 或失去焦点自动调用后端 API 写回本地 `.md` 文件。
    - **删除**：侧边栏右键或悬浮按钮点击删除，弹出确认模态框，后端执行 `fs.unlink`。

## 3. UI 交互设计剖析
- **页面布局**：
  - 左侧：Resizable 的 File Tree（基于自定义 VitePress Sidebar）。
  - 中间：内容阅读区/无缝融合的 Vditor 编辑器。
  - 右侧：文档内 TOC (Table of Contents)。
- **操作动线**：
  - 选中文件 -> Vditor 渲染 -> 键盘输入 -> `Ctrl+S` -> 触发前端发出 HTTP 请求 -> 页面呈现 Saving 状态反馈 -> 右上角 Toast 提示“保存成功”。

## 4. API 规约与运转机制
这些基础 API 提供给前端调用，同时也是**未来 Agent 配置 Tools 时操作文件系统的底层支撑**。

| API / 行为 | Endpoint / Method | 请求入参 (Input) | 响应出参 (Output) |
|---|---|---|---|
| **文章保存** | `POST /api/articles/update` | `{ path: 'docs/a.md', content: '# H1...' }` | `{ success: true, timestamp: 12345 }` |
| **新建文章** | `POST /api/articles/create` | `{ folder: 'docs/AI', name: 'new.md' }` | `{ success: true, path: 'docs/AI/new.md' }` |
| **删除文章** | `POST /api/articles/delete` | `{ path: 'docs/a.md' }` | `{ success: true }` |
| **文章列表** | `GET /api/articles` | `None` | `{ success: true, tree: [...] }` |

## 5. 缺陷与演进建议
1. **缺陷**：文件树状态的管理部分耦合在 VitePress 的编译期。虽然通过了特殊的后端 API 实现热更新刷新，但偶然会出现同步延迟。
2. **建议**：在此 Step 已经完备的情况下，无需大幅修改，仅确保后端提供的一系列 CRUD 函数，后续可以被包装为标准的 JSON Schema (OpenAI Function Calling format)，以便提供给 AI (Step 3)。
