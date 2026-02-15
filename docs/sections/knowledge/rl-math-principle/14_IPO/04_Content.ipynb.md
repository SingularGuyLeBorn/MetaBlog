---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/14_IPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# IPO vs DPO 损失地形图

本笔记本可视化了 DPO (Logits Loss) 与 IPO (MSE Loss) 之间的区别。
- **DPO**: 试图将 Margin 推向无限大 (存在过拟合风险)。
- **IPO**: 试图达到一个特定的目标 Margin (自带正则化效应)。


```python
import numpy as np
import matplotlib.pyplot as plt

beta = 0.5
target_gap = 1 / (2 * beta)

# x轴: 对数概率差 (Log-Ratio Gap): (h_w - h_l)
gap = np.linspace(-2, 4, 100)

# 1. DPO Loss: -log(sigmoid(beta * gap))
loss_dpo = -np.log(1 / (1 + np.exp(-beta * gap))) 

# 2. IPO Loss: (gap - target)^2
loss_ipo = (gap - target_gap)**2

plt.figure(figsize=(10, 6))
plt.plot(gap, loss_dpo, label='DPO Loss', linewidth=2)
plt.plot(gap, loss_ipo, label=f'IPO Loss (目标值={target_gap})', linewidth=2, linestyle='--')
plt.axvline(x=target_gap, color='green', linestyle=':', label='IPO 目标 Gap')

plt.title("DPO vs IPO 损失函数对比")
plt.xlabel("Log Probability Gap (Chosen - Rejected)")
plt.ylabel("Loss")
plt.legend()
plt.grid(True, alpha=0.3)
plt.ylim(0, 5)
plt.show()
```


