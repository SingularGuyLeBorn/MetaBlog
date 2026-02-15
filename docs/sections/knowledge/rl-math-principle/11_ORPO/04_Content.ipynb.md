---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/11_ORPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# ORPO损失函数：交互式演示

演示Odds Ratio相比于普通Probability在区分好坏样本时的梯度放大效应。


```python
import torch
import torch.nn.functional as F
import matplotlib.pyplot as plt
import numpy as np
```

## 1. Odds vs Probability
看看当概率 $p$ 从 0.5 增加到 0.99 时，Odds 是如何变化的。


```python
probs = torch.linspace(0.01, 0.99, 100)
odds = probs / (1 - probs)

plt.figure(figsize=(10, 4))
plt.subplot(1, 2, 1)
plt.plot(probs, odds)
plt.title("Odds vs Probability")
plt.xlabel("Probability p")
plt.ylabel("Odds p/(1-p)")
plt.grid(True)

plt.subplot(1, 2, 2)
plt.plot(probs, torch.log(odds))
plt.title("Log Odds vs Probability")
plt.xlabel("Probability p")
plt.ylabel("Log Odds")
plt.grid(True)
plt.show()
```

## 2. 计算 ORPO Loss
假设我们有一组 Chosen 和 Rejected 的 Log Probs。
Chosen: -0.5 (p=0.60)
Rejected: -2.0 (p=0.13)


```python
def compute_log_odds(log_p):
    return log_p - torch.log1p(-torch.exp(log_p))

log_p_w = torch.tensor([-0.5])
log_p_l = torch.tensor([-2.0])

lo_w = compute_log_odds(log_p_w)
lo_l = compute_log_odds(log_p_l)

print(f"Log Odds Chosen ({log_p_w.item()}): {lo_w.item():.2f}")
print(f"Log Odds Rejected ({log_p_l.item()}): {lo_l.item():.2f}")

diff = lo_w - lo_l
loss = -F.logsigmoid(diff)
print(f"ORPO Loss contribution: {loss.item():.4f}")
```

## 3. 梯度敏感度分析
如果在 DPO 中，奖励是由 policy/ref 的比率决定的。
在 ORPO 中，由于 Odds 函数在 p>0.5 时增长极快，模型会受到极强的信号去进一步推高 Chosen 的概率。



