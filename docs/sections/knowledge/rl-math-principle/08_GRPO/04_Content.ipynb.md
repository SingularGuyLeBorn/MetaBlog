---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/08_GRPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# GRPO算法：理论与代码逐块对应

本Notebook将GRPO (Group Relative Policy Optimization) 的核心公式与代码实现逐块对应。


```python
import torch
import torch.nn.functional as F
torch.manual_seed(42)
```

---

## 1. 组优势估计

### 公式
$$A_i = \frac{R_i - \bar{R}}{\sigma_R + \epsilon}  \quad \text{(原始GRPO)}$$
$$A_i = R_i - \bar{R}  \quad \text{(Dr. GRPO, 推荐)}$$

其中: $\bar{R} = \frac{1}{G}\sum_{j=1}^G R_j$


```python
def compute_grpo_advantages(rewards, group_size, use_std_norm=False, eps=1e-5):
    """
    计算GRPO组优势
    
    A_i = R_i - mean(R)  [Dr. GRPO]
    A_i = (R_i - mean(R)) / std(R)  [原始GRPO]
    """
    num_prompts = len(rewards) // group_size
    
    # 重塑为 [num_prompts, group_size]
    rewards = rewards.view(num_prompts, group_size)
    
    # 组内均值
    mean_r = rewards.mean(dim=1, keepdim=True)
    advantages = rewards - mean_r
    
    # 可选归一化
    if use_std_norm:
        std_r = rewards.std(dim=1, keepdim=True)
        advantages = advantages / (std_r + eps)
    
    return advantages.view(-1)

# 示例: 2个prompt, 每个4个response
rewards = torch.tensor([
    1.0, 0.0, 0.5, 0.5,  # Prompt 1: mean=0.5
    0.0, 0.0, 1.0, 1.0   # Prompt 2: mean=0.5
])

advantages = compute_grpo_advantages(rewards, group_size=4)
print(f"奖励: {rewards.tolist()}")
print(f"优势: {advantages.tolist()}")
print(f"\n解读: 高于均值→正优势, 低于均值→负优势")
```

---

## 2. GRPO损失函数

### 公式 (与PPO相同结构)
$$L^{GRPO} = -\mathbb{E}\left[\min(r(\theta) A, \text{clip}(r(\theta), 1-\epsilon, 1+\epsilon) A)\right]$$


```python
def grpo_loss(new_log_probs, old_log_probs, advantages, clip_epsilon=0.2):
    """
    GRPO损失
    
    L = -E[min(r·A, clip(r)·A)]
    """
    # 概率比
    ratio = torch.exp(new_log_probs - old_log_probs)
    
    # 裁剪
    clipped = torch.clamp(ratio, 1 - clip_epsilon, 1 + clip_epsilon)
    
    # 取较小值
    surr1 = ratio * advantages
    surr2 = clipped * advantages
    loss = -torch.min(surr1, surr2).mean()
    
    return loss, ratio

# 模拟
new_logp = torch.tensor([-10.0, -12.0, -11.0, -11.5])  # 新策略
old_logp = torch.tensor([-10.5, -11.5, -11.5, -11.5])  # 旧策略
advs = torch.tensor([0.5, -0.5, 0.0, 0.0])              # 优势

loss, ratio = grpo_loss(new_logp, old_logp, advs)
print(f"GRPO损失: {loss.item():.4f}")
print(f"概率比: {ratio.tolist()}")
```

---

## 3. Dr. GRPO vs 原始GRPO

### 问题: 标准差归一化可能导致信号放大


```python
# 测试: 几乎相同的奖励
rewards_similar = torch.tensor([1.0, 1.0, 1.0, 1.01])

adv_original = compute_grpo_advantages(rewards_similar, 4, use_std_norm=True)
adv_dr = compute_grpo_advantages(rewards_similar, 4, use_std_norm=False)

print("测试: 几乎相同的奖励")
print(f"奖励: {rewards_similar.tolist()}")
print(f"原始GRPO优势: {adv_original.tolist()}")
print(f"Dr. GRPO优势: {adv_dr.tolist()}")
print(f"\n问题: 原始GRPO放大了微小差异 ({adv_original[-1]:.2f})!")
print(f"推荐: 使用Dr. GRPO (不归一化)")
```

---

## 4. GRPO vs PPO对比

### 核心区别: 优势计算方式


```python
print("GRPO vs PPO优势计算对比")
print("="*50)
print("")
print("PPO:")
print("  A_t = r_t + γV(s_{t+1}) - V(s_t)  (需要价值网络)")
print("")
print("GRPO:")
print("  A_i = R_i - mean(R_1, ..., R_G)   (使用组均值)")
print("")
print("GRPO优势:")
print("  ✓ 无需额外的价值网络")
print("  ✓ 节省显存和计算")
print("  ✓ 更适合LLM生成任务")
```

---

## 5. 总结

| 组件 | 公式 | 代码 |
|------|------|------|
| 组优势 | $A_i = R_i - \bar{R}$ | `rewards - rewards.mean(dim=1)` |
| 概率比 | $r = \pi/\pi_{old}$ | `exp(new_logp - old_logp)` |
| 损失 | $-\min(rA, clip(r)A)$ | `-torch.min(surr1, surr2)` |



