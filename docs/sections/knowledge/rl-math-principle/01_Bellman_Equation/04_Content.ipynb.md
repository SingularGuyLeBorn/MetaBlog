# 04_Content.ipynb ​

# 第1章：贝尔曼方程 (Jupyter版)  ​

## 核心概念 ​

贝尔曼最优方程是强化学习的"物理定律"。它描述了状态价值之间的递归关系：

V∗(s)=maxa(R(s,a)+γ∑s′P(s′|s,a)V∗(s′))我们通过价值迭代 (Value Iteration) 算法来求解这个方程。

python
```
import numpy as np

# 简单的价值迭代 Demo
states = [0, 1, 2]  # 0: Left, 1: Middle, 2: Right (Goal)
rewards = [0, 0, 1]
gamma = 0.9
V = np.zeros(3)

for i in range(10):
    V_new = np.zeros(3)
    # State 0: Can go Right to 1
    V_new[0] = 0 + gamma * V[1]
    # State 1: Can go Right to 2 (Goal)
    V_new[1] = 0 + gamma * V[2]
    # State 2: Goal (Terminal), Value stays 0 or reward logic depends on formulation
    # Here simple reward prop example:
    V_new[2] = 1.0 
    
    V = V_new
    print(f"Iter {i}: V={V}")
```

可以看到价值从目标状态 (State 2) 一步步向后传播 (Backpropagate) 到起始状态。