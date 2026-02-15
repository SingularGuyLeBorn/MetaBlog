---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/10_GSPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# GSPO算法：理论与代码逐块对应

本Notebook将GSPO的序列级优化与代码实现逐块对应。


```python
import torch
import torch.nn.functional as F
torch.manual_seed(42)
```

---

## 1. Token级 vs 序列级比率

### GRPO (Token级)
$$r = \prod_t \frac{\pi_\theta(y_t)}{\pi_{old}(y_t)}$$

### GSPO (序列级)
$$r = \exp\left(\sum_t \log\pi_\theta(y_t) - \sum_t \log\pi_{old}(y_t)\right)$$


```python
def compare_ratio_methods(T=100):
    """对比Token级和序列级的数值稳定性"""
    # 模拟token级log比率
    token_log_ratio = torch.randn(T) * 0.1
    
    # GRPO: Token级乘积
    grpo_ratio = torch.exp(token_log_ratio).prod()
    
    # GSPO: 序列级
    gspo_ratio = torch.exp(token_log_ratio.sum())
    
    return grpo_ratio, gspo_ratio

grpo, gspo = compare_ratio_methods()
print(f"T=100 tokens:")
print(f"  GRPO ratio: {grpo.item():.2e}")
print(f"  GSPO ratio: {gspo.item():.4f}")
print(f"\n结论: GRPO可能爆炸，GSPO更稳定")
```

---

## 2. 序列级log概率

### 公式
$$\log\pi(y|x) = \sum_{t=1}^T \log P(y_t | y_{<t})$$


```python
def compute_sequence_log_probs(per_token_logps, mask):
    """
    计算序列级log概率
    
    log π(y) = Σ_t log P(y_t)
    """
    seq_logp = (per_token_logps * mask).sum(dim=-1)
    return seq_logp

# 模拟
B, T = 2, 10
per_token_logps = torch.randn(B, T) - 5  # 负值
mask = torch.ones(B, T)

seq_logps = compute_sequence_log_probs(per_token_logps, mask)
print(f"Token log概率形状: {per_token_logps.shape}")
print(f"序列log概率形状: {seq_logps.shape}")
print(f"序列log概率值: {seq_logps.tolist()}")
```

---

## 3. GSPO损失函数

### 公式
$$L^{GSPO} = -\mathbb{E}\left[\min(r \cdot A, \text{clip}(r, 1-\epsilon, 1+\epsilon) \cdot A)\right]$$


```python
def gspo_loss(policy_seq_logp, old_seq_logp, advantages, clip_eps=0.2):
    """
    GSPO损失 (序列级裁剪)
    """
    # 序列级比率
    ratio = torch.exp(policy_seq_logp - old_seq_logp)
    
    # 序列级裁剪 (GSPO的关键!)
    clipped = torch.clamp(ratio, 1 - clip_eps, 1 + clip_eps)
    
    # PPO损失
    surr1 = ratio * advantages
    surr2 = clipped * advantages
    loss = -torch.min(surr1, surr2).mean()
    
    return loss, ratio

# 模拟
policy_logp = torch.tensor([-50.0, -48.0, -52.0, -49.0])
old_logp = torch.tensor([-50.0, -50.0, -50.0, -50.0])
advantages = torch.tensor([0.5, 0.3, -0.5, -0.3])

loss, ratio = gspo_loss(policy_logp, old_logp, advantages)
print(f"序列比率: {ratio.tolist()}")
print(f"GSPO损失: {loss.item():.4f}")
```

---

## 4. 总结

| 组件 | GRPO | GSPO |
|------|------|------|
| 比率计算 | $\prod r_t$ | $\exp(\sum \log r_t)$ |
| 裁剪级别 | Token级 | 序列级 |
| MoE稳定性 | ✗ | ✓ |



