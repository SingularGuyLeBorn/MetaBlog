---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/18_GHPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# GHPO 模拟：平衡探索与锚定 (Balancing Exploration and Grounding)

本笔记本可视化了使用混合损失 (Hybrid Loss) 训练时的模型轨迹。
我们将参数空间简化为 1D，展示 SFT Loss 如何防止模型跑偏，而 RL Loss 如何推动模型向高峰攀登。


```python
import numpy as np
import matplotlib.pyplot as plt

# x 轴: 模型参数 Theta
theta = np.linspace(-5, 5, 100)

# 1. SFT Loss (以 0 为中心的二次碗 - 代表“真理/原始分布”)
loss_sft = (theta - 0)**2

# 2. RL Reward (线性 - 代表“漂移/诱惑”)
# 假设 Theta 越向右，Reward 越高，但无限向右可能有悬崖
loss_rl = -1.0 * theta 

# 混合损失 (Hybrid Loss)
alpha = 0.5
loss_total = alpha * loss_rl + (1 - alpha) * loss_sft

plt.figure(figsize=(10, 6))
plt.plot(theta, loss_sft, label='SFT Loss (锚定/Grounding)', linestyle='--')
plt.plot(theta, loss_rl, label='RL Loss (推动/Pushing)', linestyle='--')
plt.plot(theta, loss_total, label='Hybrid Loss (混合)', linewidth=3, color='black')

plt.title("GHPO 混合损失地形图")
plt.xlabel("模型参数 (Model Parameter)")
plt.ylabel("Loss")
plt.legend()
plt.axvline(x=0, color='gray', alpha=0.3, linestyle=':')
plt.grid(True, alpha=0.3)
plt.show()
```

## 结论

**黑色曲线** (混合损失) 找到的最小值点向右偏移了（获得了更高的 Reward），但仍然被限制在一个合理的范围内（锚定）。
如果没有 SFT Loss (蓝色虚线)，RL Loss (橙色虚线) 会将 Theta 推向无穷大 (模型崩塌/Hack)。



