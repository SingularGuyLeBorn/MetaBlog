---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/24_OREO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# OREO: 价值加权 (Value Weighting) 可视化

本笔记本可视化了 OREO 算法的核心机制：**基于价值的过滤 (Value-Based Filtering)**。
我们展示了在一个含有噪声的数据集上，如何通过 Value Weighting 自动筛选出高质量样本进行学习。


```python
import numpy as np
import matplotlib.pyplot as plt

# 模拟 100 个样本的 Value (Q值)
# 包含很多低质量样本 (Low Value) 和少量高质量样本 (High Value)
values = np.concatenate([
    np.random.normal(0, 1, 80),  # 80% 垃圾样本
    np.random.normal(5, 1, 20)   # 20% 黄金样本
])

# 温度系数 alpha (控制筛选的严格程度)
alphas = [0.5, 1.0, 5.0]

plt.figure(figsize=(12, 4))

for i, alpha in enumerate(alphas):
    # 计算权重 Weights = exp(V / alpha)
    weights = np.exp(values / alpha)
    weights = weights / np.sum(weights) # 归一化
    
    plt.subplot(1, 3, i+1)
    plt.bar(range(len(values)), weights, color='purple')
    plt.title(f"Alpha = {alpha}")
    plt.xlabel("Sample Index")
    if i == 0:
        plt.ylabel("Learning Weight")
    plt.ylim(0, 0.4)

plt.suptitle("OREO Weight Distribution (High Alpha = Uniform, Low Alpha = Selective)")
plt.tight_layout()
plt.show()
```

## 分析

- **Alpha = 5.0**: 权重分布较平缓，Policy 会学习大部分数据（包括垃圾数据）。
- **Alpha = 0.5**: 权重高度集中在那些 Value > 4 的样本上。Policy 几乎忽略了前 80 个样本。

OREO 利用这种机制，在离线数据集中"大浪淘沙"，只从最好的推理步骤中学习。



