---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/09_DAPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# DAPO算法：理论与代码逐块对应

本Notebook将DAPO的四大技术与代码实现逐块对应。


```python
import torch
torch.manual_seed(42)
```

---

## 1. Clip-Higher (解耦裁剪)

### 公式
$$\text{clip}^{DAPO}(r, A) = \begin{cases}
\min(r, 1+\epsilon_{high}) & A > 0 \text{ (只裁上界)}\\
\max(r, 1-\epsilon_{low}) & A < 0 \text{ (只裁下界)}
\end{cases}$$

DAPO使用 $\epsilon_{high}=0.28 > \epsilon_{low}=0.2$，鼓励探索。


```python
def dapo_clip(ratio, advantages, eps_high=0.28, eps_low=0.2):
    """
    DAPO解耦裁剪
    
    A > 0: 只裁上界 (允许更多探索)
    A < 0: 只裁下界 (防止过度惩罚)
    """
    clipped = torch.where(
        advantages > 0,
        torch.clamp(ratio, max=1 + eps_high),
        torch.clamp(ratio, min=1 - eps_low)
    )
    return clipped

# 演示
ratio = torch.tensor([0.7, 0.9, 1.1, 1.5])
advantages = torch.tensor([1.0, 1.0, -1.0, -1.0])

clipped = dapo_clip(ratio, advantages)
print(f"概率比 r:  {ratio.tolist()}")
print(f"优势 A:    {advantages.tolist()}")
print(f"裁剪后:    {clipped.tolist()}")
print()
print("解读:")
print("  - r=0.7, A>0: 不裁剪 (下界不影响正优势)")
print("  - r=1.5, A<0: 不裁剪 (上界不影响负优势)")
```

---

## 2. Dynamic Sampling (动态采样)

过滤全零奖励的prompts，避免无效更新。


```python
def filter_zero_prompts(rewards, group_size):
    """过滤全零奖励的prompts"""
    rewards_grouped = rewards.view(-1, group_size)
    has_nonzero = (rewards_grouped != 0).any(dim=1)
    return has_nonzero

# 演示: 3个prompts，每个4个responses
rewards = torch.tensor([
    1.0, 0.0, 0.5, 0.0,  # Prompt 1: 有非零 ✓
    0.0, 0.0, 0.0, 0.0,  # Prompt 2: 全零 ✗
    0.0, 1.0, 0.0, 1.0   # Prompt 3: 有非零 ✓
])

valid = filter_zero_prompts(rewards, group_size=4)
print(f"奖励: {rewards.tolist()}")
print(f"有效prompts: {valid.tolist()}")
print("\n结果: Prompt 2被过滤，避免无效更新")
```

---

## 3. Token-Level Loss

### 公式
$$L^{DAPO} = -\sum_t \text{clip}(r_t) \cdot A$$

逐token计算损失，更细粒度的信用分配。


```python
def token_level_loss(per_token_ratio, advantages, mask):
    """
    Token级损失
    
    L = -Σ_t r_t · A
    """
    # 扩展优势到token维度
    adv_expanded = advantages.unsqueeze(-1)  # [B, 1]
    
    # Token级损失
    per_token_loss = -per_token_ratio * adv_expanded
    
    # 掩码求和
    loss = (per_token_loss * mask).sum() / mask.sum()
    return loss

# 模拟
B, T = 2, 5
per_token_ratio = torch.ones(B, T)  # [2, 5]
advantages = torch.tensor([0.5, -0.5])  # [2]
mask = torch.ones(B, T)

loss = token_level_loss(per_token_ratio, advantages, mask)
print(f"Token级损失: {loss.item():.4f}")
```

---

## 4. Overlong Reward Shaping

### 公式
$$R_{shaped} = R_{original} - \lambda \cdot \max(0, |y| - L_{max})$$


```python
def overlong_shaping(rewards, lengths, max_len, penalty=0.01):
    """过长奖励塑造"""
    excess = torch.clamp(lengths - max_len, min=0)
    return rewards - penalty * excess

# 演示
rewards = torch.tensor([1.0, 1.0, 1.0])
lengths = torch.tensor([100, 500, 600])  # max=500

shaped = overlong_shaping(rewards, lengths, max_len=500)
print(f"原始奖励: {rewards.tolist()}")
print(f"回复长度: {lengths.tolist()}")
print(f"塑造后:   {shaped.tolist()}")
print("\n结果: 长度600超过500，被惩罚")
```

---

## 5. 总结

| 技术 | 解决的问题 | 核心改进 |
|------|------------|----------|
| Clip-Higher | 熵坍缩 | 解耦裁剪，$\epsilon_{high} > \epsilon_{low}$ |
| Dynamic Sampling | 无效更新 | 过滤全零prompts |
| Token-Level Loss | 粗粒度 | 逐token计算损失 |
| Overlong Shaping | 截断问题 | 软惩罚替代硬截断 |



