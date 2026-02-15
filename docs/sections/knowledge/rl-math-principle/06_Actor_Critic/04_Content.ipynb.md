---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/06_Actor_Critic/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# Actor-Critic 方差缩减演示

本笔记本旨在演示为什么引入 Critic (作为基线) 相比原始的 REINFORCE 能显著降低梯度的方差。
我们将模拟一个简单的多臂老虎机 (Bandit) 问题来可视化梯度的稳定性。


```python
import numpy as np
import matplotlib.pyplot as plt

# 设置环境
true_reward_mean = 10.0
reward_std = 5.0
n_samples = 100

# 1. REINFORCE 梯度 (G_t)
# 梯度 ~ Reward * Grad_Log_Prob
# 为了简单起见，假设 Grad_Log_Prob = 1
rewards = np.random.normal(true_reward_mean, reward_std, n_samples)
grads_reinforce = rewards 

# 2. Actor-Critic 梯度 (G_t - V(s))
# 假设 Critic 已经完美学会了平均奖励期望
baseline = true_reward_mean
grads_ac = rewards - baseline

plt.figure(figsize=(12, 5))
plt.subplot(1, 2, 1)
plt.plot(grads_reinforce, label='REINFORCE 梯度', color='red', alpha=0.6)
plt.axhline(y=true_reward_mean, color='black', linestyle='--', label='均值')
plt.title(f"REINFORCE 方差: {np.var(grads_reinforce):.2f}")
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(grads_ac, label='Actor-Critic 梯度', color='green', alpha=0.6)
plt.axhline(y=0, color='black', linestyle='--', label='零均值')
plt.title(f"AC 方差: {np.var(grads_ac):.2f}")
plt.legend()

plt.show()
```

## 视觉证明 (Visual Proof)

绿色曲线 (AC) 围绕 0 上下波动，且包含了与红色曲线 (REINFORCE, 围绕 10 波动) 完全相同的信息量。
然而，绿色梯度的幅度要小得多，这意味着参数更新更加稳定，不会从悬崖上掉下去。



