---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/05_PPO/04_Content.ipynb
aside: false
---
# 04_Content.ipynb

# PPO算法：理论与代码逐块对应

本Notebook将PPO (Proximal Policy Optimization) 的核心公式与代码实现逐块对应。

```java
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.distributions import Categorical

torch.manual_seed(42)
```

---

## 1. 概率比 r(θ)

### 公式

$$
r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{\text{old}}}(a_t|s_t)}
$$

### 对数形式（数值稳定）

$$
r_t = \exp(\log \pi_\theta - \log \pi_{\text{old}})
$$

```python
def compute_ratio(new_log_probs, old_log_probs):
    """
    计算概率比 r(θ) = π_new / π_old
  
    使用对数计算更稳定：
    r = exp(log π_new - log π_old)
    """
    ratio = torch.exp(new_log_probs - old_log_probs)
    return ratio

# 示例
old_log_prob = torch.tensor(-1.0)  # log π_old(a|s) = -1.0
new_log_prob = torch.tensor(-0.8)  # log π_new(a|s) = -0.8 (概率更高了)

ratio = compute_ratio(new_log_prob, old_log_prob)
print(f"log π_old = {old_log_prob.item():.2f} → π_old = {np.exp(old_log_prob.item()):.4f}")
print(f"log π_new = {new_log_prob.item():.2f} → π_new = {np.exp(new_log_prob.item()):.4f}")
print(f"概率比 r = π_new/π_old = {ratio.item():.4f}")
```

---

## 2. PPO-Clip目标函数

### 公式

$$
L^{CLIP}(\theta) = \mathbb{E}_t\left[\min\left(r_t A_t, \text{clip}(r_t, 1-\epsilon, 1+\epsilon) A_t\right)\right]
$$

### 公式分解

1. 原始目标：$r_t \cdot A_t$
2. 裁剪目标：$\text{clip}(r_t, 1-\epsilon, 1+\epsilon) \cdot A_t$
3. 取较小者：$\min(\text{原始}, \text{裁剪})$

```python
def ppo_clip_objective(old_log_probs, new_log_probs, advantages, clip_epsilon=0.2):
    """
    PPO-Clip目标函数
  
    L = min(r·A, clip(r, 1-ε, 1+ε)·A)
    """
    # 步骤1: 计算概率比
    ratio = torch.exp(new_log_probs - old_log_probs)
  
    # 步骤2: 原始目标 r * A
    surr1 = ratio * advantages
  
    # 步骤3: 裁剪目标 clip(r, 1-ε, 1+ε) * A
    clipped_ratio = torch.clamp(ratio, 1.0 - clip_epsilon, 1.0 + clip_epsilon)
    surr2 = clipped_ratio * advantages
  
    # 步骤4: 取min (转为loss需要加负号)
    objective = torch.min(surr1, surr2)
  
    return objective, ratio, clipped_ratio

# 示例：好动作 (A > 0)
old_lp = torch.tensor([-0.5, -0.5, -0.5])
new_lp = torch.tensor([-0.3, -0.5, -0.8])  # 概率增/不变/减
advantages = torch.tensor([1.0, 1.0, 1.0])  # 正优势

obj, r, r_clip = ppo_clip_objective(old_lp, new_lp, advantages)
print("好动作 (A > 0):")
print(f"  概率比 r     = {r.numpy()}")
print(f"  裁剪后 r_clip = {r_clip.numpy()}")
print(f"  目标 L       = {obj.numpy()}")
```

---

## 3. Actor-Critic网络

### 结构

```
状态 s → [共享层] → [Actor头] → 动作概率 π(a|s)
                 ↘ [Critic头] → 状态价值 V(s)
```

```python
class ActorCritic(nn.Module):
    """Actor-Critic网络"""
    def __init__(self, state_dim, action_dim, hidden=64):
        super().__init__()
        # 共享特征层
        self.shared = nn.Sequential(
            nn.Linear(state_dim, hidden),
            nn.Tanh()
        )
        # Actor: 输出动作logits
        self.actor = nn.Linear(hidden, action_dim)
        # Critic: 输出状态价值
        self.critic = nn.Linear(hidden, 1)
  
    def forward(self, state):
        features = self.shared(state)
        action_logits = self.actor(features)
        value = self.critic(features)
        return action_logits, value.squeeze(-1)

# 测试
net = ActorCritic(state_dim=4, action_dim=2)
state = torch.randn(1, 4)
logits, value = net(state)
probs = F.softmax(logits, dim=-1)
print(f"状态: {state.numpy().flatten()[:2]}...")
print(f"动作概率: {probs.detach().numpy().flatten()}")
print(f"状态价值: {value.item():.4f}")
```

---

## 4. GAE (广义优势估计)

### 公式

$$
\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t) \quad \text{(TD误差)}
$$

$$
\hat{A}_t = \delta_t + \gamma\lambda \hat{A}_{t+1} \quad \text{(GAE递归)}
$$

```python
def compute_gae(rewards, values, gamma=0.99, gae_lambda=0.95):
    """
    计算GAE优势
  
    从后往前递归：
    δ_t = r_t + γ·V(s') - V(s)
    A_t = δ_t + γλ·A_{t+1}
    """
    T = len(rewards)
    advantages = [0.0] * T
    gae = 0
  
    for t in reversed(range(T)):
        if t == T - 1:
            next_value = 0  # 终止状态
        else:
            next_value = values[t + 1]
      
        # TD误差
        delta = rewards[t] + gamma * next_value - values[t]
      
        # GAE递归
        gae = delta + gamma * gae_lambda * gae
        advantages[t] = gae
  
    return advantages

# 示例
rewards = [1, 1, 1, 1, 1]
values = [0.5, 0.6, 0.7, 0.8, 0.9]
advantages = compute_gae(rewards, values)

print("时刻 | 奖励 | V(s) | 优势 A")
print("-" * 35)
for t, (r, v, a) in enumerate(zip(rewards, values, advantages)):
    print(f"  {t}  |  {r}   | {v:.1f}  | {a:.4f}")
```

---

## 5. 完整PPO更新

### 损失函数

$$
L = L^{CLIP} + c_1 L^{VF} - c_2 S[\pi]
$$

其中：

- $L^{CLIP}$: 策略损失（裁剪目标的负值）
- $L^{VF} = (V_\theta(s) - V_{target})^2$: 价值损失
- $S[\pi]$: 熵正则化（鼓励探索）

```python
def ppo_loss(old_log_probs, new_log_probs, advantages, 
             values, returns, entropy,
             clip_epsilon=0.2, value_coef=0.5, entropy_coef=0.01):
    """
    PPO总损失
  
    L = L_policy + c1 * L_value - c2 * entropy
    """
    # 策略损失
    ratio = torch.exp(new_log_probs - old_log_probs)
    surr1 = ratio * advantages
    surr2 = torch.clamp(ratio, 1-clip_epsilon, 1+clip_epsilon) * advantages
    policy_loss = -torch.min(surr1, surr2).mean()
  
    # 价值损失
    value_loss = F.mse_loss(values, returns)
  
    # 熵正则化（负号因为要最大化熵）
    entropy_loss = -entropy.mean()
  
    # 总损失
    total_loss = policy_loss + value_coef * value_loss + entropy_coef * entropy_loss
  
    return total_loss, policy_loss, value_loss, entropy.mean()

print("PPO损失函数定义完成！")
print("损失组成:")
print("  - 策略损失: -E[min(r·A, clip(r)·A)]")
print("  - 价值损失: MSE(V, V_target)")
print("  - 熵正则化: -c2 * H(π)")
```

---

## 6. 总结


| 公式                           | 代码                                |
| ------------------------------ | ----------------------------------- |
| $r = \pi/\pi_{old}$            | `torch.exp(log_new - log_old)`      |
| $\text{clip}(r, 1\pm\epsilon)$ | `torch.clamp(r, 1-ε, 1+ε)`        |
| $L^{CLIP}$                     | `-torch.min(r*A, clip(r)*A).mean()` |
| GAE                            | `delta + γλ * gae` (递归)         |
