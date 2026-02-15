---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/04_TRPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# TRPO 信任域可视化 (Trust Region Visualization)

本笔记本旨在可视化 **信任域 (Trust Region)** 和 **自然梯度 (Natural Gradient)** 的核心概念。
- **最速下降法 (Steepest Descent)**: 垂直于等高线移动 (忽略了曲率信息)。
- **自然梯度 (Natural Gradient)**: 根据参数空间的几何结构 (KL 散度) 调整梯度方向。


```python
import numpy as np
import matplotlib.pyplot as plt

# 定义一个倾斜的二次函数 (模拟病态的优化地形)
def loss_fn(x, y):
    return 0.5 * (x**2 + 10 * y**2)

x = np.linspace(-5, 5, 100)
y = np.linspace(-5, 5, 100)
X, Y = np.meshgrid(x, y)
Z = loss_fn(X, Y)

plt.figure(figsize=(8, 6))
plt.contour(X, Y, Z, levels=20, cmap='viridis')

# 起点位于 (-4, -1) 处的梯度
start_x, start_y = -4, -1
grad_x = -1 * start_x
grad_y = -10 * start_y # Y 方向的梯度极其陡峭

# 标准梯度下降步 (Vanilla SGD)
# 它在 Y 方向上移动过多，导致震荡
plt.arrow(start_x, start_y, grad_x*0.2, grad_y*0.2, head_width=0.2, color='red', label='标准梯度 (Standard Gradient)')

# 自然梯度步 (由逆 Hessian 矩阵校正)
# H = [[1, 0], [0, 10]] -> H_inv = [[1, 0], [0, 0.1]]
# NatGrad = [grad_x, grad_y * 0.1]
nat_grad_x = grad_x * 1
nat_grad_y = grad_y * 0.1 
plt.arrow(start_x, start_y, nat_grad_x*0.5, nat_grad_y*0.5, head_width=0.2, color='green', label='自然梯度 (Natural Gradient)')

plt.title("标准梯度 vs 自然梯度 (TRPO 核心)")
plt.legend()
plt.grid()
plt.show()
```

## 洞察 (Insight)

**自然梯度** (绿色箭头) 直接指向极小值点 (0,0)，即使地形非常倾斜。
TRPO 利用这一原理，确保无论参数敏感度如何变化，更新步伐始终稳健。



