---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/07_DPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# DPO算法：理论与代码逐块对应

本Notebook将DPO (Direct Preference Optimization) 的核心公式与代码实现逐块对应。


```python
import torch
import torch.nn.functional as F
torch.manual_seed(42)
```

---

## 1. 隐式奖励

### 公式
$$\hat{r}_\theta(x, y) = \beta \log \frac{\pi_\theta(y|x)}{\pi_{ref}(y|x)}$$

### 解释
DPO的核心洞察：语言模型本身可以作为隐式奖励模型。奖励由策略与参考模型的对数概率比给出。


```python
def compute_implicit_reward(policy_logps, ref_logps, beta=0.1):
    """
    计算隐式奖励
    
    r̂(x,y) = β * log(π_θ(y|x) / π_ref(y|x))
           = β * (log π_θ(y|x) - log π_ref(y|x))
    """
    return beta * (policy_logps - ref_logps)

# 示例
policy_logp = torch.tensor(-10.0)  # log π_θ
ref_logp = torch.tensor(-12.0)     # log π_ref
beta = 0.1

reward = compute_implicit_reward(policy_logp, ref_logp, beta)
print(f"策略log概率: {policy_logp.item():.2f}")
print(f"参考log概率: {ref_logp.item():.2f}")
print(f"隐式奖励: {reward.item():.4f}")
print(f"\n解读: 策略给这个response更高的概率 → 正奖励")
```

---

## 2. DPO损失函数

### 公式
$$\mathcal{L}_{DPO} = -\mathbb{E}\left[\log\sigma\left(\hat{r}(y_w) - \hat{r}(y_l)\right)\right]$$

展开：
$$= -\mathbb{E}\left[\log\sigma\left(\beta\log\frac{\pi_\theta(y_w)}{\pi_{ref}(y_w)} - \beta\log\frac{\pi_\theta(y_l)}{\pi_{ref}(y_l)}\right)\right]$$


```python
def dpo_loss(policy_chosen_logps, policy_rejected_logps,
             ref_chosen_logps, ref_rejected_logps, beta=0.1):
    """
    DPO损失函数
    
    L = -log σ(β * (log π_θ(y_w)/π_ref(y_w) - log π_θ(y_l)/π_ref(y_l)))
    """
    # 步骤1: 计算log ratio
    chosen_logratio = policy_chosen_logps - ref_chosen_logps
    rejected_logratio = policy_rejected_logps - ref_rejected_logps
    
    # 步骤2: 计算logits
    logits = beta * (chosen_logratio - rejected_logratio)
    
    # 步骤3: 二元交叉熵
    loss = -F.logsigmoid(logits)
    
    return loss.mean(), logits

# 示例：模型正确偏好chosen
policy_chosen = torch.tensor(-8.0)    # 策略给chosen更高概率
policy_rejected = torch.tensor(-10.0)
ref_chosen = torch.tensor(-10.0)
ref_rejected = torch.tensor(-10.0)

loss, logits = dpo_loss(policy_chosen, policy_rejected, ref_chosen, ref_rejected, 0.1)
print(f"DPO损失: {loss.item():.4f}")
print(f"Logits: {logits.item():.4f}")
print(f"\n解读: logits > 0 意味着模型正确地偏好chosen")
```

---

## 3. 序列对数概率计算

### 公式
$$\log\pi_\theta(y|x) = \sum_{t=1}^{|y|} \log P_\theta(y_t | x, y_{<t})$$


```python
def compute_sequence_log_prob(logits, labels):
    """
    从语言模型logits计算序列log概率
    
    log π(y|x) = Σ_t log P(y_t | y_{<t})
    """
    # 对齐：logits[t] 预测 labels[t+1]
    shift_logits = logits[:, :-1, :]  # [B, T-1, V]
    shift_labels = labels[:, 1:]       # [B, T-1]
    
    # 每个位置的log概率
    log_probs = F.log_softmax(shift_logits, dim=-1)
    
    # 提取目标token的log概率
    per_token_logp = torch.gather(
        log_probs, dim=2, index=shift_labels.unsqueeze(-1)
    ).squeeze(-1)
    
    # 序列总log概率
    return per_token_logp.sum(dim=-1)

# 模拟
B, T, V = 2, 5, 100  # batch, seq_len, vocab
logits = torch.randn(B, T, V)
labels = torch.randint(0, V, (B, T))

seq_logps = compute_sequence_log_prob(logits, labels)
print(f"序列log概率: {seq_logps.tolist()}")
```

---

## 4. DPO变体

### IPO (Identity Preference Optimization)
$$\mathcal{L}_{IPO} = \left(\hat{r}(y_w) - \hat{r}(y_l) - \frac{1}{\beta}\right)^2$$

### SimPO (无参考模型)
$$\mathcal{L}_{SimPO} = -\log\sigma\left(\frac{\beta}{|y_w|}\log\pi(y_w) - \frac{\beta}{|y_l|}\log\pi(y_l) - \gamma\right)$$


```python
def ipo_loss(logits, beta=0.1):
    """IPO: 正则化DPO"""
    target = 1.0 / beta
    return (logits - target) ** 2

def simpo_loss(policy_chosen_logps, policy_rejected_logps, 
               chosen_len, rejected_len, beta=2.0, gamma=0.5):
    """SimPO: 无参考模型 + 长度归一化"""
    chosen_per_token = policy_chosen_logps / chosen_len
    rejected_per_token = policy_rejected_logps / rejected_len
    logits = beta * (chosen_per_token - rejected_per_token) - gamma
    return -F.logsigmoid(logits)

print("DPO变体对比:")
print("- DPO: 需要参考模型, log ratio")
print("- IPO: 添加正则化, 防止过拟合")
print("- SimPO: 无参考模型, 长度归一化")
```

---

## 5. 总结

| 组件 | 公式 | 代码 |
|------|------|------|
| 隐式奖励 | $\hat{r} = \beta\log\frac{\pi}{\pi_{ref}}$ | `beta * (policy_logps - ref_logps)` |
| DPO损失 | $-\log\sigma(\hat{r}_w - \hat{r}_l)$ | `-F.logsigmoid(logits)` |
| 序列log概率 | $\sum_t \log P(y_t\|y_{<t})$ | `gather + sum` |



