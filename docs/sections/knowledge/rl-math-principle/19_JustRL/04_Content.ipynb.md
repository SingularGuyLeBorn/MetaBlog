---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/19_JustRL/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# JustRL vs PPO: 极简主义大对决

本笔记本展示了 JustRL (2512.16649) 相比标准 PPO 的简洁性。
我们将实现两者的虚拟 Loss 函数，并在概念层面对比它们的复杂度与显存占用。


```python
import torch
import torch.nn.functional as F

# 模拟数据
B, G, Vocab = 2, 4, 100
log_probs = torch.randn(B, G, requires_grad=True)
old_log_probs = log_probs.detach() + torch.randn(B, G) * 0.1
rewards = torch.randn(B, G)
values = torch.randn(B, G) # 仅 PPO 需要
ref_log_probs = log_probs.detach() + 0.05 # 仅 PPO 需要

print("数据初始化完成。")
```

## 1. PPO Loss (繁杂之路)

标准 PPO 需要：
- 重要性采样比率 (Importance Sampling Ratio)
- 截断 (Clipping)
- 价值损失 (Value Loss)
- KL 散度惩罚
- 熵奖励 (Entropy Bonus)


```python
def ppo_loss_demo():
    # 1. 优势函数 (通常是 GAE, 这里简化为 R-V)
    adv = rewards - values # 需要 Critic
    
    # 2. 比率
    ratio = torch.exp(log_probs - old_log_probs)
    
    # 3. 截断 (Clip)
    surr1 = ratio * adv
    surr2 = torch.clamp(ratio, 0.8, 1.2) * adv
    policy_loss = -torch.min(surr1, surr2).mean()
    
    # 4. 价值损失 (需要训练 Critic)
    value_loss = F.mse_loss(values, rewards)
    
    # 5. KL 惩罚
    kl = (log_probs - ref_log_probs).mean()
    
    # 总损失
    total_loss = policy_loss + 0.5 * value_loss + 0.1 * kl
    return total_loss

print(f"PPO 损失计算完毕: {ppo_loss_demo().item():.4f}")
```

## 2. JustRL Loss (极简配方)

JustRL 只需要：
- 组归一化 (Group Normalization)
- 策略梯度 (Policy Gradient)
- ... 没了。


```python
def justrl_loss_demo():
    # 1. 组归一化优势计算
    mean = rewards.mean(dim=1, keepdim=True)
    std = rewards.std(dim=1, keepdim=True) + 1e-8
    adv = (rewards - mean) / std
    
    # 2. 策略梯度 (Vanilla)
    loss = -(adv * log_probs).mean()
    
    return loss

print(f"JustRL 损失计算完毕: {justrl_loss_demo().item():.4f}")
```

## 3. 对比总结

注意 JustRL 的逻辑代码中完全没有 `torch.clamp`, `value_loss`, 和 `ref_log_probs`。
这意味着在前向传播时，我们**不需要加载** 参考模型 (Ref Model) 或 评论家模型 (Critic Model) 到 GPU 显存中。

**判决**: JustRL 就是 "Just" RL (仅仅是 RL，没别的)。



