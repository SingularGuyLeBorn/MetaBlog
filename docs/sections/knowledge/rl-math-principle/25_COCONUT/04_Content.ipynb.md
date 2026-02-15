---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/25_COCONUT/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# COCONUT: 潜在空间漫游 (Latent Space Walk)

本笔记本可视化了 **Token Reasoning** (离散) 与 **Continuous Reasoning** (连续) 在高维空间中的轨迹差异。


```python
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

# 模拟高维空间降维到 3D
steps = 20

# 1. 离散 CoT 轨迹 (Zig-Zag)
# 每次必须坍缩到一个具体的 Word Embedding，导致轨迹跳跃
cot_x = np.linspace(0, 10, steps)
cot_y = np.sin(cot_x) + np.random.normal(0, 0.5, steps) # 噪声
cot_z = np.cos(cot_x)

# 2. COCONUT 轨迹 (Smooth)
# 在流形上平滑演化
coco_x = np.linspace(0, 10, steps * 5) # 更高的时间分辨率
coco_y = np.sin(coco_x)
coco_z = np.cos(coco_x)

fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

ax.plot(cot_x, cot_y, cot_z, marker='o', linestyle='--', color='red', label='Discrete CoT (Token Space)')
ax.plot(coco_x, coco_y, coco_z, linewidth=3, color='blue', label='COCONUT (Latent Space)')

ax.set_title("Reasoning Trajectory: Discrete vs Continuous")
ax.set_xlabel("Dim 1")
ax.legend()
plt.show()
```

## 视觉隐喻

- **红色虚线 (CoT)**: 像是在过河时必须要踩着石头 (Token) 走。有时候石头之间的距离太远，或者没有合适的石头，推理就会卡住。
- **蓝色实线 (COCONUT)**: 像是在河中游泳。自由，连续，可以抵达任何位置，不受词表的限制。



