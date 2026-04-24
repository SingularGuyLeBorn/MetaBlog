# 需求清单

本目录维护 MetaBlog 的所有功能需求，分为 **待实现** 和 **已完成** 两部分。

---

## 📊 需求总览

| 状态 | 数量 | 文件 |
|------|------|------|
| 🚧 待实现 | 见 [backlog.md](./backlog.md) | backlog.md |
| ✅ 已完成 | 见 [completed.md](./completed.md) | completed.md |

---

## 🏷️ 需求分类

按功能领域划分：

| 领域 | 说明 |
|------|------|
| **Harness** | 工程底座（守护进程、回滚、沙箱、审计） |
| **Hermes** | 智能层（身份、记忆、RAG、自进化） |
| **Execution** | 执行层（代码沙箱、Bash、Git） |
| **Claw** | 触点层（语音、邮件、微信、统一网关） |
| **Data** | 数据获取（网页采集、论文下载、图片搜索） |
| **Content** | 内容创作（论文转博客/PPT、算法可视化） |
| **Academic** | 学术层（文献搜索、引用分析、LaTeX 辅助） |
| **Platform** | 平台扩展（飞书、语雀、Notion、Blender） |
| **Frontend** | 前端体验（移动端、暗黑模式、实体卡片） |

---

## 📝 需求格式

每个需求包含以下字段：

```markdown
### [需求ID] 需求名称

- **状态**: 待实现 / 进行中 / 已完成
- **优先级**: P0（紧急）/ P1（重要）/ P2（一般）/ P3（低优先级）
- **领域**: Harness / Hermes / Execution / ...
- **关联层级**: L3 / L4 / L5 / L6
- **描述**: 一句话说明
- **参考项目**: OpenClaw / OmniAgent / GenericAgent / ...
- **核心机制**: 最值得借鉴的具体设计点
```

---

## 🔗 相关文档

- [开发路线图](../docs/roadmap.md)
- [架构设计](../docs/architecture.md)
