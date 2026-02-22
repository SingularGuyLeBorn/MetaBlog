# MetaUniverse Blog

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3-green.svg)](https://vuejs.org/)
[![VitePress](https://img.shields.io/badge/VitePress-1.x-blue.svg)](https://vitepress.dev/)

> 数字孪生级知识管理系统 - 构建你的第二大脑，让知识流动起来

## 🌟 特性

- **🧠 知识库** - 系统化的知识体系，从强化学习到人工智能，深度剖析技术原理
- **📝 文章列表** - 技术博客、学习笔记、项目总结，记录成长的每一步
- **🎨 公开资源** - 精心整理的教程、工具、模板，提升开发效率
- **✨ 在线编辑** - 内置 Vditor 编辑器，支持 Markdown 实时预览和本地保存
- **🔍 智能搜索** - 快速定位所需内容
- **📱 响应式设计** - 完美适配各种设备
- **🤖 AI Chat** - 集成 DeepSeek API，支持思考模式与工具调用

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/metablog.git
cd metablog

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加你的 DeepSeek API Key

# 启动开发服务器
npm run docs:dev
```

### 构建

```bash
# 构建生产版本
npm run docs:build

# 预览生产构建
npm run docs:preview
```

## 🤖 AI Chat 功能

MetaBlog 集成了强大的 AI Chat 功能，基于 DeepSeek API 实现：

### 已实现功能

- ✅ **基础对话** - 支持流式/非流式输出，默认流式
- ✅ **思考模式** - 支持 deepseek-reasoner 模型，展示思考过程
- ✅ **工具调用** - 思考过程中可调用工具（获取时间、文章操作等）
- ✅ **串行展示** - 思考过程与工具调用结果按顺序展示
- ✅ **3D 头像** - 用户头像具有悬浮、光晕、旋转边框等 3D 效果
- ✅ **会话管理** - 支持多会话，会话隔离
- ✅ **消息版本** - 支持重新生成，保留历史版本

### 支持的工具

| 工具名 | 功能 | 触发条件 |
|-------|------|---------|
| `get_current_time` | 获取当前时间 | 用户询问时间 |
| `get_article_content` | 读取文章内容 | 用户要求查看某篇文章 |
| `list_articles` | 列出文章列表 | 用户询问有哪些文章 |
| `create_article` | 创建新文章 | 用户要求创建文章 |
| `update_article` | 更新文章内容 | 用户要求编辑文章 |
| `delete_article` | 删除文章 | 用户要求删除文章 |
| `search_articles` | 搜索文章 | 用户提供关键词搜索 |

### 技术实现

- **API**: DeepSeek API (v1)
- **支持模型**: deepseek-chat, deepseek-reasoner
- **请求大小**: 最大支持 100KB 请求体
- **工具调用**: 遵循官方 tool_calls 规范

## 🛠️ 技术栈

- **框架**: [Vue 3](https://vuejs.org/) + [VitePress](https://vitepress.dev/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **编辑器**: [Vditor](https://github.com/Vanessa219/vditor)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图标**: [Lucide Vue](https://lucide.dev/)
- **AI API**: [DeepSeek](https://platform.deepseek.com/)

## 📁 项目结构

```
.
├── docs/                       # VitePress 文档目录
│   ├── .vitepress/            # VitePress 配置和主题
│   │   ├── theme/             # 自定义主题
│   │   │   ├── components/    # Vue 组件
│   │   │   │   └── ai-chat/   # AI Chat 模块
│   │   │   │       ├── core/      # 核心逻辑
│   │   │   │       │   ├── services/  # AI 服务
│   │   │   │       │   ├── composables/ # 组合式函数
│   │   │   │       │   └── types/     # 类型定义
│   │   │   │       ├── modules/   # 功能模块
│   │   │   │       │   ├── chat/     # 聊天模块
│   │   │   │       │   └── agent/    # Agent 模块
│   │   │   │       └── ui/        # UI 组件
│   │   │   ├── stores/        # Pinia 状态管理
│   │   │   └── index.ts       # 主题入口
│   │   └── config.ts          # VitePress 配置
│   ├── sections/              # 内容分区
│   │   ├── posts/             # 文章列表
│   │   ├── knowledge/         # 知识库
│   │   ├── resources/         # 公开资源
│   │   └── about/             # 关于我
│   ├── index.md               # 首页
│   └── ...                    # 其他文档
├── model-reference/           # 模型参考文档
│   └── deepseek/              # DeepSeek API 文档
│       └── notebook/          # Jupyter Notebook 测试
├── package.json
├── tailwind.config.js
└── README.md
```

## ✏️ 在线编辑功能

本项目集成了 Vditor 编辑器，支持以下功能：

- **双击编辑** - 在任意 Markdown 页面双击进入编辑模式
- **实时预览** - IR 模式下的即时渲染
- **大纲导航** - 右侧自动生成文档大纲
- **快捷键支持**:
  - `Ctrl+S` - 保存并退出
  - `Esc` - 取消编辑
- **本地保存** - 通过本地 API 保存到文件系统

## 📝 开发计划

### 第一阶段：AI Chat 基础（已完成 ✅）

- [x] 基础对话功能（流式/非流式）
- [x] DeepSeek API 集成
- [x] 思考模式支持（reasoner 模型）
- [x] 工具调用框架
- [x] 会话管理
- [x] 消息版本控制

### 第二阶段：Agent 化（进行中 🚧）

- [x] 思考过程串行展示
- [x] 工具调用嵌入思考过程
- [ ] Agent 自主决策
- [ ] 多轮对话上下文优化
- [ ] 工具执行结果缓存

### 第三阶段：高级功能（计划中 📋）

- [ ] 文件上传/下载
- [ ] 代码执行环境
- [ ] 知识库 RAG 集成
- [ ] 多模型支持（OpenAI、Claude 等）
- [ ] 语音输入/输出

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证开源。

## 🙏 致谢

- [VitePress](https://vitepress.dev/) - 静态网站生成器
- [Vditor](https://github.com/Vanessa219/vditor) - 强大的 Markdown 编辑器
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [DeepSeek](https://platform.deepseek.com/) - AI API 服务

---

Made with ❤️ by [Your Name](https://github.com/yourusername)
