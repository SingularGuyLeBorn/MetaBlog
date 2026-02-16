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

## 🛠️ 技术栈

- **框架**: [Vue 3](https://vuejs.org/) + [VitePress](https://vitepress.dev/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **编辑器**: [Vditor](https://github.com/Vanessa219/vditor)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图标**: [Lucide Vue](https://lucide.dev/)

## 📁 项目结构

```
.
├── docs/                       # VitePress 文档目录
│   ├── .vitepress/            # VitePress 配置和主题
│   │   ├── theme/             # 自定义主题
│   │   │   ├── components/    # Vue 组件
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

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证开源。

## 🙏 致谢

- [VitePress](https://vitepress.dev/) - 静态网站生成器
- [Vditor](https://github.com/Vanessa219/vditor) - 强大的 Markdown 编辑器
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架

---

Made with ❤️ by [Your Name](https://github.com/yourusername)
