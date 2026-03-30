# Academic Research Skill

## 描述
学术研究助手 - 搜索论文、查找 AI 模型、追踪研究进展

## 使用场景
- 用户询问"最新的 Transformer 论文"
- 用户需要"查找某个领域的研究"
- 用户想"了解某个模型"
- 用户要求"搜索开源代码实现"

## 能力

### 搜索论文

**ArXiv**（最全面）
```
search_arxiv(
  query="transformer attention",
  category="cs.CL",  // 可选: cs.AI, cs.CV, cs.LG
  max_results=10
)
```
获取详情：`fetch_arxiv(paper_id="2401.12345")`

**Semantic Scholar**（有引用数）
```
search_semantic_scholar(
  query="deep learning",
  limit=10
)
```

**Papers With Code**（带代码实现）
```
search_paperswithcode(
  query="image classification",
  limit=10
)
```

**OpenReview**（顶级会议）
```
search_openreview(
  query="reinforcement learning",
  venue="ICLR",  // 可选: NeurIPS, ICML
  limit=10
)
```

### 搜索模型

**HuggingFace**
```
search_huggingface(
  query="bert",
  task="text-classification",  // 可选
  limit=10
)
```
获取详情：`fetch_huggingface_model(model_id="bert-base-chinese")`

## 最佳实践
1. 优先使用 ArXiv 搜索最新论文
2. 需要引用信息时用 Semantic Scholar
3. 需要代码实现时用 Papers With Code
4. 查找顶会论文时用 OpenReview
5. 为用户总结论文核心贡献

## 示例对话

**用户**: 找一下最近关于大语言模型的论文
**助手**:
```
[调用 search_arxiv]
```
找到以下相关论文：
1. ...

**用户**: 这个模型的详细信息
**助手**:
```
[调用 fetch_arxiv]
```
论文详情：...
