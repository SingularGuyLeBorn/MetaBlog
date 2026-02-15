---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/12_RLOO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# RLOO算法：交互式演示

我们将演示如何通过向量化操作高效计算Leave-One-Out基线。

```python
import torch
print("PyTorch version:", torch.__version__)
```

## 1. 模拟数据
假设Batch=2, Group Size=4。

```python
rewards = torch.tensor([
    [10.0, 5.0, 8.0, 2.0],  # Prompt 1
    [1.0,  1.0, 1.0, 5.0]   # Prompt 2
])
print("Rewards shape:", rewards.shape)
```

## 2. 计算总和 (Row Sum)

```python
sum_rewards = rewards.sum(dim=1, keepdim=True)
print("Sum rewards:\n", sum_rewards)
# 预期: 
# [[25.],
#  [ 8.]]
```

## 3. 计算留一均值 (LOO Mean)
$$b_i = \frac{\text{Sum} - R_i}{G - 1}$$

```python
G = 4
loo_means = (sum_rewards - rewards) / (G - 1)
print("LOO Means:\n", loo_means)

# 验证 Prompt 1, Response 0 (Reward=10):
# Expected Baseline = (5+8+2)/3 = 5.0
print("\nCheck P1_R0: Expected=5.0, Actual=", loo_means[0, 0].item())
```

## 4. 计算优势 (Advantage)
$$A_i = R_i - b_i$$

```python
advantages = rewards - loo_means
print("Advantages:\n", advantages)

# 验证 P1_R0 (Reward=10, Baseline=5):
# Expected Adv = 5.0
print("\nCheck P1_R0 Adv: Expected=5.0, Actual=", advantages[0,0].item())
```

## 5. 对此GRPO
GRPO使用包含自身的均值。

```python
grpo_mean = rewards.mean(dim=1, keepdim=True)
print("GRPO Mean (P1):", grpo_mean[0].item())
# P1 Mean = 25/4 = 6.25

grpo_adv = rewards - grpo_mean
print("GRPO Adv (P1_R0):", grpo_adv[0,0].item())
# 10 - 6.25 = 3.75

print("\n对比:")
print("RLOO Adv:", advantages[0,0].item(), " (更强烈)")
print("GRPO Adv:", grpo_adv[0,0].item(), " (被自身拉低)")
```
