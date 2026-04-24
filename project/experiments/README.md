# 实验与测试代码

本目录存放 API 实验、模型测试和原型验证代码。这些代码不作为生产代码使用，仅用于技术验证和参考。

---

## 📂 目录结构

```
experiments/
├── feishu-api/            # 飞书开放平台 API 实验
│   ├── feishu_client.py
│   └── 99_feishu_api_showcase.ipynb
│
├── github-api/            # GitHub API 实验
│   ├── github_client.py
│   └── 99_github_cli_showcase.ipynb
│
├── yuque-api/             # 语雀 API 实验
│   ├── yuque_client.py
│   ├── lake_builder.py
│   └── 99_yuque_api_showcase.ipynb
│
└── model-reference/       # 大模型 API 参考文档与测试
    ├── deepseek/          # DeepSeek API 测试
    ├── kimi/              # Kimi API 测试
    └── zhipu/             # 智谱 API 测试
```

---

## 🧪 各实验说明

### 飞书 API 实验

- **feishu_client.py**: 飞书 API 封装客户端
- **99_feishu_api_showcase.ipynb**: Jupyter Notebook 展示飞书文档/表格/消息 API 用法

### GitHub API 实验

- **github_client.py**: GitHub GraphQL/REST API 封装
- **99_github_cli_showcase.ipynb**: GitHub API 功能展示

### 语雀 API 实验

- **yuque_client.py**: 语雀 API 封装
- **lake_builder.py**: 语雀 Lake 格式构建器
- **99_yuque_api_showcase.ipynb**: 语雀文档/知识库 API 展示

### 模型 API 参考

各模型厂商的官方 API 使用示例：

| 模型 | 文档 | Notebook |
|------|------|----------|
| DeepSeek | `deepseek/docs/` | `deepseek/notebook/` |
| Kimi | `kimi/docs/` | `kimi/notebook/` |
| 智谱 | `zhipu/docs/` | `zhipu/notebook/` |

---

## 🚀 运行环境

各实验目录下通常包含 `requirements.txt`，安装依赖后可直接运行：

```bash
cd experiments/feishu-api
pip install -r requirements.txt
python feishu_client.py
```

Jupyter Notebook 需要安装 Jupyter：

```bash
pip install jupyter
jupyter notebook 99_feishu_api_showcase.ipynb
```
