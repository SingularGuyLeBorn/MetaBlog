---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/16_GMPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# GMPO vs GRPO: 基线研究

本笔记本演示了为什么在处理奖励异常值 (Outliers) 时，**几何平均** (GMPO) 比 **算术平均** (GRPO) 作为基线更加鲁棒。


```python
import numpy as np
import matplotlib.pyplot as plt

# 场景设定: 一个 Group 包含 5 个回复
# 情况 1: 所有回复质量相近 (稳定)
rewards_stable = np.array([0.8, 0.85, 0.75, 0.82, 0.78])

# 情况 2: 一个极其幸运的猜中 (异常值)
rewards_outlier = np.array([0.1, 0.1, 0.1, 0.1, 0.95]) 

print("数据初始化完成。")
```

```python
def calculate_advantages(rewards, method='GRPO'):
    if method == 'GRPO':
        # 算术平均基线
        baseline = np.mean(rewards)
        std = np.std(rewards) + 1e-8
        return (rewards - baseline) / std
    elif method == 'GMPO':
        # 几何平均基线
        baseline = np.exp(np.mean(np.log(rewards + 1e-6)))
        # 此处演示简单差分，虽然 GMPO 理论上常使用比率
        return rewards - baseline 

adv_grpo = calculate_advantages(rewards_outlier, 'GRPO')
adv_gmpo = calculate_advantages(rewards_outlier, 'GMPO')

print("异常值案例分析:")
print(f"原始奖励: {rewards_outlier}")
print(f"GRPO 优势 (Adv): {np.round(adv_grpo, 2)}")
print(f"GMPO 优势 (Adv): {np.round(adv_gmpo, 2)}")
```

## 分析

注意 GRPO 的基线 (算术平均) 是如何被那个 `0.95` 显著拉高的，这导致其他 `0.1` 的奖励看起来非常差 (负值很大)。
而 GMPO 的基线 (几何平均) 保持在较低位置，更接近数据分布的中位数，提供了完全不同的优势景观。

在 RL 中，如果基线定得太高，我们会过度打压探索。GMPO 有助于在长尾奖励分布中保持一个更“公平”的基线。



