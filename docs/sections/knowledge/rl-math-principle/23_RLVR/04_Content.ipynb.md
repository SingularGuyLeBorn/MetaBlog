---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/23_RLVR/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# 可视化：推理树与过程奖励 (Process Visualization)

本笔记本可视化了 RLVR 训练中的 **搜索树 (Search Tree)**。
每一个节点代表推理的一步，绿色路径代表通向正确答案的路径 (Golden Path)。


```python
import networkx as nx
import matplotlib.pyplot as plt

# 创建一个有向图
G = nx.DiGraph()

# 节点：状态 (当前 CoT)
nodes = [
    ("Start", "15 + 27"),
    ("Step 1A", "10 + 20 = 30"), # 分解加法 (Good)
    ("Step 1B", "1 + 2 = 3"),    # 错误位数对齐 (Bad)
    ("Step 2A", "5 + 7 = 12"),   # 继续 Step 1A
    ("Step 3A", "30 + 12 = 42"), # 最终结果
    ("fail", "35")               # Step 1B 的错误结果
]

edges = [
    ("Start", "Step 1A"),
    ("Start", "Step 1B"),
    ("Step 1A", "Step 2A"),
    ("Step 2A", "Step 3A"),
    ("Step 1B", "fail")
]

G.add_nodes_from([n[0] for n in nodes])
G.add_edges_from(edges)

pos = nx.spring_layout(G, seed=42)
plt.figure(figsize=(8, 6))

# 绘制节点
node_colors = ['lightgray', 'lightgreen', 'salmon', 'lightgreen', 'lime', 'red']
nx.draw(G, pos, with_labels=True, node_color=node_colors, node_size=2000, font_weight='bold', arrows=True)

plt.title("RLVR 推理搜索树 (Monte Carlo Tree Search)")
plt.show()
```

## 解释

- **绿色路径**: 正确的推理链。RLVR 的目标就是通过奖励最终节点 (Lime)，将奖励信号回传 (Backpropagate) 给路径上的所有节点 (Process Rewards)。
- **红色路径**: 错误的推理。会被 Verifier 斩断。

在 DeepSeek R1 中，这个树是在 Token 级别隐式展开的。



