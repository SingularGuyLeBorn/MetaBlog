---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/22_LitePPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# LitePPO: 动态优势归一化 (Dynamic Advantage Normalization)

本笔记本可视化了 **Advantage Normalization** 对梯度稳定性的巨大影响。
在没有 Critic 的情况下，简单的 Batch Normalization 可以将奖励分布拉回标准正态分布，从而模拟 Baseline 的效果。


```python
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# 模拟一批奖励 (Batch Rewards)
# 假设模型在一个高奖励区域 (比如都已经是很不错的回答)
raw_rewards = np.random.normal(loc=10.0, scale=2.0, size=1000)

# 1. 无归一化 (直接作为 Advantage)
adv_raw = raw_rewards

# 2. LitePPO 归一化
adv_norm = (raw_rewards - np.mean(raw_rewards)) / (np.std(raw_rewards) + 1e-8)

# 可视化
plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
sns.histplot(adv_raw, kde=True, color='orange')
plt.title("原始奖励 (Raw Rewards)")
plt.axvline(0, color='red', linestyle='--', label='Zero')
plt.legend()
# 注意：这里所有值都是正的！这意味着模型对所有样本都在"正向强化"，
# 只是程度不同。这会导致概率分布塌缩。

plt.subplot(1, 2, 2)
sns.histplot(adv_norm, kde=True, color='green')
plt.title("LitePPO 归一化优势 (Normalized Advantage)")
plt.axvline(0, color='red', linestyle='--', label='Zero')
plt.legend()
# 注意：这里有正有负。模型会抑制低于平均水平的样本，强化高于平均水平的样本。
# 这就是 Critic 的作用！

plt.tight_layout()
plt.show()
```

## 结论 (Conclusion)

通过简单的 `(R - Mean) / Std`，我们不需要训练一个神经网络 Critic 也就实现了 **"区分好坏"** 的功能。
LitePPO 证明了数学技巧有时比增加参数更有效。



