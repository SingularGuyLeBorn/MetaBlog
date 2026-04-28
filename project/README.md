# MetaBlog 项目管理文档

本目录集中管理 MetaBlog 的所有项目文档、需求清单和实验代码。

---

## 📂 目录结构

```
project/
├── requirements/          # 需求清单与产品规划
│   ├── README.md          # 需求总览
│   ├── backlog.md         # 待实现需求(功能清单)
│   └── completed.md       # 已完成需求
│
├── docs/                  # 项目技术文档
│   ├── README.md          # 文档导航
│   ├── architecture.md    # Agent 分层控制架构
│   ├── roadmap.md         # 开发路线图
│   ├── backend-proxy.md   # 后端代理计划
│   ├── platform-parser.md # 平台解析设计
│   ├── sandbox-selection.md # 沙箱选型文档
│   ├── agent-swarm.md     # Agent Swarm 设计
│   └── design/
│       └── agent-runner.md # Agent Runner 设计
│
└── experiments/           # API 实验与测试代码
    ├── README.md
    ├── feishu-api/        # 飞书 API 实验
    ├── github-api/        # GitHub API 实验
    ├── yuque-api/         # 语雀 API 实验
    └── model-reference/   # 模型 API 参考(DeepSeek/Kimi/Zhipu)
        ├── deepseek/
        ├── kimi/
        └── zhipu/
```

---

## 🗺️ 文档导航

### 需求与规划

| 文档 | 内容 |
|------|------|
| [requirements/backlog.md](./requirements/backlog.md) | 功能需求清单(待实现) |
| [requirements/completed.md](./requirements/completed.md) | 已完成需求记录 |
| [docs/roadmap.md](./docs/roadmap.md) | 开发路线图(L1-L6 层级) |

### 架构与设计

| 文档 | 内容 |
|------|------|
| [docs/architecture.md](./docs/architecture.md) | Agent 分层控制架构(L0-L6) |
| [docs/backend-proxy.md](./docs/backend-proxy.md) | BFF 后端代理方案 |
| [docs/platform-parser.md](./docs/platform-parser.md) | 平台链接解析设计 |
| [docs/sandbox-selection.md](./docs/sandbox-selection.md) | 代码沙箱选型(Monty + BoxLite) |
| [docs/agent-swarm.md](./docs/agent-swarm.md) | Agent Swarm 集群设计 |
| [docs/design/agent-runner.md](./design/agent-runner.md) | Agent Runner 详细设计 |

### 实验代码

| 目录 | 内容 |
|------|------|
| [experiments/feishu-api/](./experiments/feishu-api/) | 飞书 API 实验(Python + Notebook) |
| [experiments/github-api/](./experiments/github-api/) | GitHub API 实验 |
| [experiments/yuque-api/](./experiments/yuque-api/) | 语雀 API 实验 |
| [experiments/model-reference/](./experiments/model-reference/) | 模型 API 使用参考 |

---

## 🔄 维护规范

- **需求变更**：在 `requirements/backlog.md` 中更新，完成后移至 `completed.md`
- **文档更新**：修改后同步更新本导航页中的描述
- **实验代码**：新增实验在对应子目录下创建，附上 README 说明
