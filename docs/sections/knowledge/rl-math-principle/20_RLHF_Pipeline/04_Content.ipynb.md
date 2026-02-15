---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/20_RLHF_Pipeline/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# RLHF Pipeline 模拟器

本笔记本提供了一个标准 RLHF PPO 流水线中数据流的高层模拟。
我们跟踪张量形状在 Actor, Critic, Ref, 和 Reward Models 之间流转时的变化。


```python
import torch

# 配置
Batch = 2
SeqLen = 10
Hidden = 4

def print_shape(name, tensor):
    print(f"[{name}] Shape: {tensor.shape}")

# 1. Prompt 生成
prompts = torch.randint(0, 100, (Batch, 5))
print_shape("Prompts", prompts)

# 2. Actor 采样 (Generation)
# 模拟生成 5 个新 Token
responses = torch.randint(0, 100, (Batch, 10))
print_shape("Responses (Actor Output)", responses)

# 3. Reward Model 打分
# 每个序列返回一个标量
rewards = torch.randn(Batch)
print_shape("Rewards (RM Output)", rewards)

# 4. Critic 价值估计
# 每个 Token 返回一个标量 (Dense)
values = torch.randn(Batch, SeqLen)
print_shape("Values (Critic Output)", values)

# 5. Reference LogProbs
# 每个 Token 一个标量
ref_logprobs = torch.randn(Batch, SeqLen)
print_shape("Ref LogProbs", ref_logprobs)

# 6. GAE 计算 (Processing)
# 结合 Rewards 和 Values 计算 Advantages
advantages = torch.randn(Batch, SeqLen)
print_shape("Advantages (Computed)", advantages)

print("\nPipeline 流程检查完毕。所有形状对齐。")
```

## 3. 内存瓶颈分析

显存占用的峰值出现在步骤 6 (PPO 更新)，此时我们需要：
- Actor 的梯度
- Critic 的梯度
- 优化器状态 (Adam = 2x Model Size)
- 激活值检查点 (Activation Checkpoints)

这就是为什么**卸载 (Offloading)** Ref 和 RM 是至关重要的。



