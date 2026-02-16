# 04_Content.ipynb ​

# 第0章：测度论与概率空间基础 (Jupyter版) ​

## 1. 核心理论速览 ​

在强化学习中，期望（Expectation）不仅仅是平均值，它是基于测度论的勒贝格积分（Lebesgue Integral）：

E[X]=∫ΩX(ω)dP(ω)这允许我们统一处理离散（GridWorld）和连续（MuJoCo）状态空间。

python
```
import numpy as np
import matplotlib.pyplot as plt

# 模拟大数定律：随着采样数增加，样本均值趋向于理论期望
def demonstrate_lln(n_samples=1000):
    # 理论期望 E[X] = 0 (对于标准正态分布)
    samples = np.random.normal(0, 1, n_samples)
    running_means = np.cumsum(samples) / np.arange(1, n_samples + 1)
    
    plt.figure(figsize=(10, 5))
    plt.plot(running_means, label='Sample Mean')
    plt.axhline(0, color='r', linestyle='--', label='True Expectation (0)')
    plt.title(f'Law of Large Numbers (N={n_samples})')
    plt.xlabel('Sample Size')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.show()

demonstrate_lln(5000)
```

## 2. 理论与代码的桥梁 ​

- 代码中的 np.random 实际上是在模拟概率测度 P。
- 代码中的 mean() 实际上是勒贝格积分的蒙特卡洛近似。

> "测度论是裁判，代码是运动员。裁判制定规则（收敛性），运动员尽力奔跑（计算）。"