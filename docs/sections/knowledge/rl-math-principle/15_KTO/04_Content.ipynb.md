---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/15_KTO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# KTO 损失函数可视化：数学中的心理学

本笔记本聚焦于 **KTO 损失函数**，它源自 Kahneman & Tversky 的前景理论 (Prospect Theory)。
我们将可视化损失函数（以及梯度）在处理“被选中”(Chosen/Gain) 和 “被拒绝”(Rejected/Loss) 样本时的不同行为，模拟“**损失厌恶 (Loss Aversion)**”。


```python
import torch
import torch.nn.functional as F
import matplotlib.pyplot as plt
import numpy as np

# 超参数
beta = 0.5
lambda_chosen = 1.0
lambda_rejected = 1.33 # 损失厌恶系数：我们对失败的痛恨大于对成功的喜悦
KL_est = 0.0 # 为了方便观察，假设 Z(x) ~ KL 为 0

# 隐式奖励范围 (Log Ratio)
r_vals = torch.linspace(-5, 5, 100)

print("Setup Complete.")
```

## 1. 价值函数形状 (The Value Function Shape)

KTO 分别处理 Chosen 和 Rejected 数据点。
- **Chosen**: 我们希望最大化 `L_chosen(r)`
- **Rejected**: 我们希望最小化 `L_rejected(r)`


```python
def kto_loss_chosen(r):
    # 标准 logistic loss
    return 1 - F.sigmoid(beta * (r - KL_est))

def kto_loss_rejected(r):
    # 注意这里的反转：我们希望 r 远小于 KL reference
    # 以及标量权重 lambda_rejected
    raw_loss = 1 - F.sigmoid(beta * (KL_est - r))
    return lambda_rejected * raw_loss

loss_c = kto_loss_chosen(r_vals)
loss_r = kto_loss_rejected(r_vals)

plt.figure(figsize=(10, 6))
plt.plot(r_vals.numpy(), loss_c.numpy(), label='Loss (Chosen/选中)', color='green')
plt.plot(r_vals.numpy(), loss_r.numpy(), label='Loss (Rejected/拒绝)', color='red')
plt.title(f"KTO 损失地形图 (Lambda_rej={lambda_rejected})")
plt.xlabel("隐式奖励 (Implicit Reward / Log Ratio)")
plt.ylabel("Loss")
plt.grid(True, alpha=0.3)
plt.legend()
plt.show()
```

## 2. 梯度分析 (The 'Push')

注意 **红线 (Rejected)** 比 绿线 在相同误差幅度下更陡峭/更高吗？
这意味着模型会感受到一股更强的“推力”去修正一个糟糕的错误（选中了本该拒绝的样本），相比之下，改善一个好的答案的动力则较小。

这种**不对称性**防止了模型为了偶尔的高奖励而“胡言乱语”。它强制了安全性/保守性。



