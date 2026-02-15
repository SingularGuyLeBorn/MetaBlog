---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/03_Classic_REINFORCE/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# REINFORCE算法：理论与代码的逐块对应

本Notebook将REINFORCE算法的理论公式与代码实现逐块对应，帮助理解每一行代码背后的数学原理。

---


## 1. 导入依赖

首先导入必要的库。


```python
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.distributions import Categorical
import matplotlib.pyplot as plt

# 设置随机种子以保证可重复性
torch.manual_seed(42)
np.random.seed(42)
```

---

## 2. 策略网络 $\pi_\theta(a|s)$

### 理论公式

策略是一个从状态到动作概率分布的映射。对于离散动作，我们使用Softmax函数：

$$\pi_\theta(a|s) = \frac{\exp(h_\theta(s, a))}{\sum_{a'} \exp(h_\theta(s, a'))}$$

其中：
- $h_\theta(s, a)$ 是神经网络对状态-动作对的评分（logits）
- $\theta$ 是神经网络的所有参数

### 代码实现


```python
class PolicyNetwork(nn.Module):
    """
    策略网络：将状态映射到动作概率分布
    
    结构：
    输入 s → 全连接层 → ReLU → 全连接层 → Softmax → 概率 π(a|s)
    """
    def __init__(self, state_dim, action_dim, hidden_size=64):
        super().__init__()
        # 第一层：状态 → 隐藏层
        self.fc1 = nn.Linear(state_dim, hidden_size)
        # 第二层：隐藏层 → 动作logits
        self.fc2 = nn.Linear(hidden_size, action_dim)
    
    def forward(self, state):
        """
        前向传播
        
        数学过程：
        1. h₁ = ReLU(W₁ · s + b₁)     -- 第一层
        2. logits = W₂ · h₁ + b₂       -- 第二层（未归一化）
        3. π(a|s) = Softmax(logits)    -- 归一化为概率
        """
        x = F.relu(self.fc1(state))        # h₁ = ReLU(W₁ · s + b₁)
        logits = self.fc2(x)               # h_θ(s, a)
        action_probs = F.softmax(logits, dim=-1)  # Softmax归一化
        return action_probs

# 测试：创建一个策略网络
state_dim = 4  # 例如CartPole的状态维度
action_dim = 2  # 两个动作：左/右
policy = PolicyNetwork(state_dim, action_dim)

# 输入一个随机状态
test_state = torch.randn(1, 4)
action_probs = policy(test_state)
print(f"状态: {test_state.numpy().flatten()}")
print(f"动作概率: π(a=0|s)={action_probs[0,0]:.4f}, π(a=1|s)={action_probs[0,1]:.4f}")
print(f"概率和: {action_probs.sum().item():.6f}（应该等于1）")
```

---

## 3. 动作采样与对数概率

### 理论公式

根据策略分布采样动作：
$$a \sim \pi_\theta(\cdot|s)$$

同时计算对数概率（用于后续梯度计算）：
$$\log \pi_\theta(a|s)$$

### 代码实现


```python
def select_action(policy, state):
    """
    根据策略采样动作
    
    对应理论：
    - a ~ π_θ(·|s)：从分布中采样
    - 返回 log π_θ(a|s) 用于梯度计算
    """
    # 转换为Tensor
    state_tensor = torch.FloatTensor(state).unsqueeze(0)
    
    # 获取动作概率分布
    action_probs = policy(state_tensor)
    
    # 创建分类分布（Categorical Distribution）
    # 这是PyTorch对离散概率分布的封装
    dist = Categorical(action_probs)
    
    # 从分布中采样动作：a ~ π_θ(·|s)
    action = dist.sample()
    
    # 计算对数概率：log π_θ(a|s)
    # 这就是策略梯度中的 ∇log π 的"log π"部分
    log_prob = dist.log_prob(action)
    
    return action.item(), log_prob

# 测试
test_state = np.array([0.1, -0.2, 0.05, 0.3])
action, log_prob = select_action(policy, test_state)
print(f"采样的动作: {action}")
print(f"对数概率 log π(a|s): {log_prob.item():.4f}")
print(f"对应的概率 π(a|s): {np.exp(log_prob.item()):.4f}")
```

---

## 4. 回报计算 $G_t$

### 理论公式

回报（Return）是从时刻 $t$ 开始的折扣奖励和：

$$G_t = r_{t+1} + \gamma r_{t+2} + \gamma^2 r_{t+3} + \ldots = \sum_{k=0}^{T-t-1} \gamma^k r_{t+k+1}$$

使用递归公式可以高效计算：
$$G_t = r_{t+1} + \gamma G_{t+1}$$

### 代码实现


```python
def compute_returns(rewards, gamma):
    """
    计算每个时刻的折扣回报
    
    使用递归公式：G_t = r_{t+1} + γ · G_{t+1}
    从后往前计算，因为 G_t 依赖于 G_{t+1}
    """
    T = len(rewards)
    returns = [0.0] * T
    
    # 边界条件：最后一步
    # G_{T-1} = r_T（没有更多未来奖励）
    returns[T-1] = rewards[T-1]
    
    # 从后往前递归
    for t in range(T-2, -1, -1):
        # G_t = r_{t+1} + γ · G_{t+1}
        returns[t] = rewards[t] + gamma * returns[t+1]
    
    return returns

# 示例：一个5步的轨迹
rewards = [1, 1, 1, 1, 1]  # 每步奖励都是1
gamma = 0.99
returns = compute_returns(rewards, gamma)

print("时刻 t | 奖励 r | 回报 G_t")
print("-" * 30)
for t, (r, g) in enumerate(zip(rewards, returns)):
    print(f"  {t}    |   {r}   | {g:.4f}")

print(f"\n验证：G_0 应该 = 1 + 0.99×1 + 0.99²×1 + 0.99³×1 + 0.99⁴×1")
theoretical = sum([gamma**k for k in range(5)])
print(f"理论值: {theoretical:.4f}, 计算值: {returns[0]:.4f}")
```

---

## 5. 回报标准化

### 为什么需要标准化？

问题：如果所有回报 $G_t$ 都是正数，那么所有动作的概率都会增加。

解决方案：将回报标准化为均值0、标准差1的分布：
$$G'_t = \frac{G_t - \mu_G}{\sigma_G + \epsilon}$$

这样，约一半的 $G'_t$ 是正的（增大概率），一半是负的（减小概率）。

### 代码实现


```python
def normalize_returns(returns):
    """
    标准化回报
    
    公式：G'_t = (G_t - mean) / (std + ε)
    """
    returns_tensor = torch.FloatTensor(returns)
    mean = returns_tensor.mean()
    std = returns_tensor.std()
    eps = 1e-8  # 防止除零
    normalized = (returns_tensor - mean) / (std + eps)
    return normalized

# 测试
raw_returns = [10, 8, 6, 12, 9]
normalized = normalize_returns(raw_returns)

print("原始回报:", raw_returns)
print(f"均值: {np.mean(raw_returns):.2f}, 标准差: {np.std(raw_returns):.2f}")
print("\n标准化后:")
for t, (g, g_norm) in enumerate(zip(raw_returns, normalized.tolist())):
    sign = "+" if g_norm > 0 else ""
    print(f"  G_{t}={g} → G'_{t}={sign}{g_norm:.3f}")
print(f"\n标准化后均值: {normalized.mean():.6f}（应接近0）")
print(f"标准化后标准差: {normalized.std():.6f}（应接近1）")
```

---

## 6. 策略梯度损失

### 理论公式

策略梯度定理给出了目标函数的梯度：
$$\nabla_\theta J(\theta) = \mathbb{E}\left[\sum_t \nabla_\theta \log \pi_\theta(a_t|s_t) \cdot G_t\right]$$

在PyTorch中，我们定义**损失函数**（因为PyTorch做梯度下降来最小化损失）：
$$\text{Loss} = -\sum_t \log \pi_\theta(a_t|s_t) \cdot G_t$$

**注意负号**：因为 $\min(-J) = \max(J)$

### 代码实现


```python
def compute_policy_loss(log_probs, returns):
    """
    计算策略梯度损失
    
    Loss = -Σ_t log π(a_t|s_t) · G_t
    
    负号的原因：
    - 我们想最大化期望回报 J(θ)
    - PyTorch的optimizer.step()做的是梯度下降（最小化）
    - 所以 loss = -J(θ)，最小化 -J 等于最大化 J
    """
    # 将log_prob列表转换为张量
    log_probs_tensor = torch.stack(log_probs)
    
    # 元素乘法：每个 log_prob 乘以对应的 return
    weighted_log_probs = log_probs_tensor * returns
    
    # 求和并取负
    loss = -weighted_log_probs.sum()
    
    return loss

# 模拟演示
# 假设我们采集了一个3步的轨迹
fake_log_probs = [torch.tensor(-0.5), torch.tensor(-0.3), torch.tensor(-0.8)]
fake_returns = torch.tensor([1.5, 0.2, -0.7])  # 标准化后的回报

loss = compute_policy_loss(fake_log_probs, fake_returns)
print(f"策略损失: {loss.item():.4f}")
print("\n分解：")
for t, (lp, g) in enumerate(zip(fake_log_probs, fake_returns)):
    contribution = -(lp.item() * g.item())
    print(f"  步骤{t}: -({lp.item():.2f} × {g.item():.2f}) = {contribution:.4f}")
```

---

## 7. 完整的REINFORCE更新

### 算法流程

1. 使用当前策略 $\pi_\theta$ 采集一个完整回合
2. 计算每步的回报 $G_t$
3. 标准化回报
4. 计算损失 $L = -\sum_t \log\pi(a_t|s_t) \cdot G_t$
5. 反向传播计算梯度
6. 更新参数 $\theta \leftarrow \theta - \alpha \nabla L$（注意是减，因为loss是负的J）

### 代码实现


```python
def reinforce_update(policy, optimizer, log_probs, rewards, gamma):
    """
    REINFORCE算法的一次完整更新
    
    对应算法伪代码：
    1. 计算回报 G_t = Σ γ^k r_{t+k+1}
    2. 标准化回报
    3. 计算损失 Loss = -Σ log π · G
    4. θ ← θ + α · ∇_θ J（通过 optimizer 实现）
    """
    # 步骤1：计算回报
    returns = compute_returns(rewards, gamma)
    
    # 步骤2：标准化
    returns_normalized = normalize_returns(returns)
    
    # 步骤3：计算损失
    loss = compute_policy_loss(log_probs, returns_normalized)
    
    # 步骤4：梯度更新
    optimizer.zero_grad()  # 清空之前的梯度
    loss.backward()        # 反向传播计算 ∇_θ Loss
    optimizer.step()       # θ ← θ - α · ∇_θ Loss（等价于 θ ← θ + α · ∇_θ J）
    
    return loss.item()

print("REINFORCE更新函数已定义！")
print("\n完整的算法流程：")
print("1. 采集轨迹 τ = (s₀,a₀,r₁,s₁,a₁,r₂,...)")
print("2. 计算 G_t = r_{t+1} + γG_{t+1}")
print("3. 标准化 G'_t = (G_t - μ) / σ")
print("4. Loss = -Σ log π(a_t|s_t) · G'_t")
print("5. θ ← θ - α · ∇Loss = θ + α · ∇J")
```

---

## 8. 总结

| 理论概念 | 数学公式 | 代码实现 |
|----------|----------|----------|
| 策略 | $\pi_\theta(a|s) = \text{Softmax}(h_\theta)$ | `PolicyNetwork.forward()` |
| 采样 | $a \sim \pi_\theta(\cdot|s)$ | `Categorical.sample()` |
| 对数概率 | $\log \pi_\theta(a|s)$ | `Categorical.log_prob()` |
| 回报 | $G_t = r_{t+1} + \gamma G_{t+1}$ | `compute_returns()` |
| 标准化 | $G'_t = (G_t - \mu) / \sigma$ | `normalize_returns()` |
| 损失 | $L = -\sum \log\pi \cdot G$ | `compute_policy_loss()` |
| 更新 | $\theta \leftarrow \theta + \alpha \nabla J$ | `optimizer.step()` |



