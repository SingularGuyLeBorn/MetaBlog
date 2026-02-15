---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/13_SimPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# SimPO Margin Loss：交互式演示

演示 Target Margin (Gamma) 如何影响 Loss 景观。


```python
import torch
import torch.nn.functional as F
import matplotlib.pyplot as plt
import numpy as np
```

## 1. 定义 SimPO Loss
$$ L = -\log \sigma( \beta \cdot \Delta r - \gamma ) $$


```python
def simpo_loss(delta_r, beta=2.0, gamma=1.0):
    return -F.logsigmoid(beta * delta_r - gamma)
```

## 2. 可视化 Loss vs 奖励差 (Delta R)
我们对比 Gamma=0 (无Margin) 和 Gamma=1 (有Margin) 的情况。


```python
delta_r = torch.linspace(-1.0, 2.0, 100)

loss_no_margin = simpo_loss(delta_r, gamma=0.0)
loss_margin = simpo_loss(delta_r, gamma=1.0)

plt.figure(figsize=(8, 6))
plt.plot(delta_r, loss_no_margin, label="Gamma=0.0 (Like DPO)", linestyle="--")
plt.plot(delta_r, loss_margin, label="Gamma=1.0 (SimPO)", linewidth=2)

# 标注 Zero Loss 区域
plt.axvline(x=0, color='gray', linestyle=':', alpha=0.5)
plt.axvline(x=0.5, color='red', linestyle=':', alpha=0.5, label="Gamma/Beta = 0.5")

plt.title("Effect of Margin on Loss")
plt.xlabel("Reward Difference (AvgLogP_w - AvgLogP_l)")
plt.ylabel("Loss")
plt.legend()
plt.grid(True)
plt.show()
```

## 3. 分析
1. **零点右移**：注意看蓝色实线 (SimPO)。即使 $\Delta r = 0$ (好坏样本得分一样)，Loss 依然很大。
2. **强制Gap**：Loss 只有在 $\Delta r > \gamma / \beta = 1.0 / 2.0 = 0.5$ 时才开始显著下降。
3. **鲁棒性**：这种机制迫使模型在好坏样本之间建立起“护城河”。



