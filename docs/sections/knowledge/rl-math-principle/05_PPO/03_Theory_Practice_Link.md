# 第5章：近端策略优化 (Proximal Policy Optimization, PPO)

**论文信息**：

- **标题**：Proximal Policy Optimization Algorithms
- **作者**：John Schulman, Filip Wolski, Prafulla Dhariwal, Alec Radford, Oleg Klimov OpenAI
- **年份**：2017
- **arXiv**：1707.06347
- **PDF**：见 papers/ 目录

**前置知识**：策略梯度定理（第2章）、REINFORCE（第3章）

## 0. 本章目标

PPO是**现代深度强化学习的标准算法**，被广泛应用于：

- OpenAI Five (Dota 2)
- ChatGPT训练 (RLHF)
- 机器人控制
- 各种LLM对齐任务

本章将：

- 解释REINFORCE/TRPO的局限性，以及PPO如何解决这些问题
- 详细推导**重要性采样 (Importance Sampling)** 的数学原理
- 逐步推导**PPO-Clip目标函数**
- 解释裁剪机制的直观含义和数学意义
- 介绍完整的PPO算法流程 算法流程算法流程算法流程算法流程算法流程算法流程

javascript


```
// Enter code here...11
```
## 1. REINFORCE和TRPO的问题

### 1.1 REINFORCE的问题回顾

回忆第3章，REINFORCE的更新规则是：

$$
\theta \leftarrow \theta + \alpha \nabla_\theta \log \pi_\theta(a|s) \cdot G_t 
$$

**公式符号详解**：

符号含义类型说明$\theta$参数向量策略网络的参数$\alpha$学习率标量控制更新步长$\nabla_\theta$梯度算子计算损失对参数的偏导$\pi_\theta(a \vert s)$策略概率标量在状态 $s$ 下选择动作 $a$ 的概率$G_t$累计回报标量$G_t = \sum_{k=0}^{\infty} \gamma^k r_{t+k}$

问题1：On-Policy限制**

每次更新 $\theta$ 后，必须丢弃所有旧数据，重新采样。

**原因**：策略梯度公式中的期望 $\mathbb{E}_{\tau \sim \pi_\theta}[\ldots]$ 要求轨迹必须来自**当前策略** $\pi_\theta$。

**后果**：样本效率极低，需要大量环境交互。

**问题2：更新步长敏感**

- 步长太大 → 策略可能"跳"得太远，性能突然崩溃
- 步长太小 → 学习太慢

### 1.2 TRPO：一种解决方案

**信任区域策略优化 (Trust Region Policy Optimization, TRPO)** 通过限制策略更新的幅度来保证单调改进。

TRPO的优化问题：

$$
\max_\theta \quad \mathbb{E}_{s \sim \rho^{\pi_{\text{old}}}} \left[ \frac{\pi_\theta(a|s)}{\pi_{\theta_{\text{old}}}(a|s)} A^{\pi_{\text{old}}}(s, a) \right] 
$$

$$
\text{s.t.} \quad D_{KL}\left(\pi_{\theta_{\text{old}}}(\cdot \vert s) \| \pi_\theta(\cdot \vert s)\right) \leq \delta 
$$

**公式各项详解**：

符号含义说明$\frac{\pi_\theta(a \vert s)}{\pi_{\theta_{\text{old}}}(a \vert s)}$概率比率衡量新旧策略差异$A^{\pi_{\text{old}}}(s, a)$优势函数$A = Q(s,a) - V(s)$$D_{KL}$KL 散度衡量两个概率分布的差异$\delta$信任区域半径控制更新幅度**TRPO的问题**：

- 求解带约束的优化问题需要二阶导数（Hessian矩阵）
- 实现复杂（共轭梯度、线搜索等）
- 计算代价高

### 1.3 PPO的动机

> **PPO的核心思想**：用简单的**裁剪 (Clipping)** 机制替代TRPO的KL约束，获得类似的效果但实现更简单。



## 2. 重要性采样 (Importance Sampling)

### 2.1 动机：复用旧数据

我们想用旧策略 $\pi_{\theta_{\text{old}}}$ 采集的数据来更新新策略 $\pi_\theta$。

**问题**：策略梯度公式要求轨迹来自当前策略，但我们只有旧策略的数据。

**解决方案**：重要性采样。

### 2.2 重要性采样的数学原理

$$
\mathbb{E}_{x \sim p}[f(x)] = \mathbb{E}_{x \sim q}\left[\frac{p(x)}{q(x)} f(x)\right] 
$$

符号含义说明$\mathbb{E}_{x \sim p}$目标期望我们想要计算的目标$\frac{p(x)}{q(x)}$重要性权重校正采样分布的偏差**推导**：

$$
\mathbb{E}_{x \sim p}[f(x)] = \int p(x) f(x) dx = \int q(x) \cdot \frac{p(x)}{q(x)} \cdot f(x) dx = \mathbb{E}_{x \sim q}\left[\frac{p(x)}{q(x)} f(x)\right] 
$$

**关键**：$\frac{p(x)}{q(x)}$ 称为**重要性权重 (Importance Weight)**。

### 2.3 应用到策略梯度

$$
J(\theta) = \mathbb{E}_{(s,a) \sim \pi_{\theta_{\text{old}}}}\left[\frac{\pi_\theta(a|s)}{\pi_{\theta_{\text{old}}}(a|s)} A^{\pi_{\theta_{\text{old}}}}(s, a)\right] 
$$

定义**概率比**：

$$
r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{\text{old}}}(a_t|s_t)} 
$$

**公式符号详解**：

符号含义取值范围解释$r_t(\theta)$概率比率$(0,+\infty)$新旧策略选择该动作的概率之比$r_t > 1$概率增加此时新策略更可能选择该动作$r_t < 1$概率减少此时新策略更不可能选择该动作则目标变为：

$$
J(\theta) = \mathbb{E}_t\left[r_t(\theta) A_t\right] 
$$

### 2.4 重要性权重的问题

**问题**：当新旧策略差异很大时，$r_t(\theta)$ 可能变得非常大或极小，导致方差爆炸或策略崩溃。

**这就是PPO裁剪机制要解决的问题**。

## 3. PPO-Clip目标函数

### 3.1 核心公式

$$
L^{CLIP}(\theta) = \mathbb{E}_t\left[\min\left(r_t(\theta) A_t, \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon) A_t\right)\right] 
$$

**公式各项详解**：

符号含义说明$L^{CLIP}$裁剪目标函数需要被最大化的总量$\text{clip}(r, 1-\epsilon, 1+\epsilon)$裁剪函数将概率比限制在 $[1-\epsilon, 1+\epsilon]$$\epsilon$裁剪超参数通常取 0.1~0.2

### 3.2 clip函数的定义

$$
\text{clip}(r, 1-\epsilon, 1+\epsilon) = \begin{cases} 1-\epsilon & \text{if } r < 1-\epsilon \\ r & \text{if } 1-\epsilon \leq r \leq 1+\epsilon \\ 1+\epsilon & \text{if } r > 1+\epsilon \end{cases} 
$$

### 图解：PPO裁剪目标函数

![PPO裁剪目标函数](/knowledge/rl-math-principle/05_PPO/images/clipping_objective.png)PPO裁剪目标函数 PPO裁剪目标函数 PPO裁剪目标函数 PPO裁剪目标函数

**关键理解**：

- PPO通过裁剪限制了策略更新的幅度，保证新策略不会偏离旧策略太远。
- 实现了与TRPO类似的"信任区域"效果，但计算更简单。

### 3.3 为什么用min而不是直接clip？

**关键洞察**：min 的作用是进行“悲观”估计。

- **好动作 ($A_t > 0$)**：限制概率过度增长。
- **坏动作 ($A_t < 0$)**：限制概率过度减小。

无论优势正负，min 都起到“保守更新”的作用。

### 图解：PPO信任区域视角

![PPO信任区域](/knowledge/rl-math-principle/05_PPO/images/trust_region.png)PPO信任区域 PPO信任区域 PPO信任区域 PPO信任区域

PPO信任区域

## 4. 完整的PPO算法

### 4.1 PPO-Clip伪代码

```python
算法: PPO-Clip

1. 初始化策略网络 π_θ 和价值网络 V_φ
2. 重复迭代：
   a. 使用旧策略采样获得 T 步轨迹数据
   b. 计算优势函数 Â_t (通常用 GAE)
   c. 通过优化 L_clip + L_V - L_entropy 更新参数
   d. 更新旧策略参数 θ_old ← θ
```

### 4.2 关键超参数详解

参数符号典型值含义与作用 $\epsilon$ = 0.1~0.2控制策略更新范围 $\gamma$ = 0.99折扣因子，重视长期奖励 $\lambda$ = 0.95GAE参数，权衡偏差与方差

## 5. 本章总结

### 5.1 核心公式汇总

概念公式说明概率比$r_t(\theta) = \frac{\pi_\theta}{\pi_{\text{old}}}$衡量策略变更PPO-Clip$L = \mathbb{E}[\min(r_t A_t, \text{clip} \cdot A_t)]$保护性更新### 5.2 PPO的贡献 [​](#_5-2-ppo的贡献)

- **简单高效**：只需一阶梯度，无需二阶 Hessian 矩阵。
- **稳定可靠**：裁剪机制防止策略剧烈变化。
- **样本高效**：可以多次复用同一批采样数据。

## 6. 开源实现参考

- **OpenAI Baselines**: [https://github.com/openai/baselines](https://github.com/openai/baselines)
- **Stable-Baselines3**: [https://github.com/DLR-RM/stable-baselines3](https://github.com/DLR-RM/stable-baselines3)

**下一章预告**：[第6章：RLHF与人类反馈对齐](./../06_RLHF/01_Theory_Derivation)