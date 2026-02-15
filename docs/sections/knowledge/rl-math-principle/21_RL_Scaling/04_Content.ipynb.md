---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/21_RL_Scaling/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# 交互式 RL 预算规划器 (Budget Planner)

基于 Meta 2025 RL Scaling Laws。
用于计算您的最佳 **Critic 规模** 和 **数据需求量**。


```python
import numpy as np
import matplotlib.pyplot as plt

def calculate_needs(policy_params_B):
    # 定律 1: Critic 容量 (Critic Capacity)
    critic_params_B = policy_params_B ** 1.2
    
    # 定律 2: 数据需求 (每参数 Token 数)
    # RL 需要比 Pretraining 多约 5倍的数据/参数比
    tokens_B = policy_params_B * 100 
    
    return critic_params_B, tokens_B

# 用户输入: Policy 模型大小 (Billion)
sizes = np.array([1, 7, 70, 405])
critics, data = calculate_needs(sizes)

print("---- RL 缩放规划 (Scaling Plan) ----")
for s, c, d in zip(sizes, critics, data):
    print(f"Policy: {s:3d}B -> Critic 理想大小: {c:4.1f}B | 数据需求: {d:5d}B Tokens")
```

## 可视化差距 (Visualizing the Divergence)

检查随着 Policy 变大，Critic 需要大多少。


```python
plt.figure(figsize=(10, 6))
plt.plot(sizes, sizes, label='线性增长 (同 Policy 大小)', linestyle='--', color='gray')
plt.plot(sizes, critics, label='Critic 需求 (1.2次幂)', color='red', linewidth=3)
plt.xlabel("Policy 大小 (Billion)")
plt.ylabel("所需 Critic 大小 (Billion)")
plt.title("双重缩放差距 (The Dual-Scaling Gap)")
plt.legend()
plt.grid(True)
plt.show()
```


