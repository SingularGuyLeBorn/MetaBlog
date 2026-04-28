---
title: 2024 年 AI 论文阅读清单：从 GPT-4 到 Sora
date: 2024-12-30
category: 人工智能
tags: [论文阅读, GPT-4, Sora, AI]
---

# 2024 年 AI 论文阅读清单：从 GPT-4 到 Sora

> 2024 年是大模型爆发的一年。从 GPT-4 Turbo 到 Claude 3，从 Sora 到 Gemini Pro，AI 技术的进步让人目不暇接。本文整理了今年最值得阅读的 10 篇 AI 论文。

## 🎯 大语言模型

### 1. GPT-4 Technical Report

OpenAI 发布的 GPT-4 技术报告，虽然细节不多，但仍然是目前最强大语言模型的官方介绍。

**核心亮点：**
- 多模态能力(文本 + 图像)
- 在各种专业考试中达到人类水平
- 安全性对齐的重要性

### 2. Llama 2: Open Foundation and Fine-Tuned Chat Models

Meta 开源的 Llama 2 系列，真正推动了开源大模型的发展。

**关键创新：**
- 完全开源可商用
- 从 7B 到 70B 多个规模
- 详细的 RLHF 训练过程

### 3. Mistral 7B

Mistral AI 证明了小模型也能有大能量。

**为什么重要：**
- 7B 参数超越 Llama 2 13B
- 滑动窗口注意力机制
- 开源 + 高效

## 🎬 多模态与生成模型

### 4. Sora: A Review on Background, Technology, Limitations, and Opportunities of Large Vision Models

虽然 OpenAI 没有发布 Sora 的论文，但这篇综述详细分析了视频生成模型的技术路线。

**技术要点：**
- 时空联合建模
- 视频压缩网络
- 扩散 Transformer 架构

### 5. Gemini 1.5 Pro

Google 的 Gemini 1.5 带来了惊人的 1M 上下文窗口。

**突破之处：**
- 100万 token 上下文
- 多模态理解(文本、图像、音频、视频)
-  needle-in-haystack 测试表现

## 🧠 强化学习与大模型对齐

### 6. Direct Preference Optimization (DPO)

DPO 算法让大模型对齐变得前所未有的简单。

**核心思想：**
```
不需要奖励模型，直接从偏好数据优化策略
损失函数：L_DPO = -log σ(β log(π(y_w|x)/π_ref(y_w|x)) - β log(π(y_l|x)/π_ref(y_l|x)))
```

### 7. RLHF: Proximal Policy Optimization (PPO)

虽然 PPO 不是新算法，但 InstructGPT 论文让 RLHF 成为大模型训练的标准流程。

**三阶段训练：**
1. SFT：监督微调
2. RM：奖励模型训练
3. PPO：强化学习优化

### 8. GRPO: Group Relative Policy Optimization

DeepSeek-R1 使用的 GRPO 算法，省掉了价值模型。

**创新点：**
- 不需要单独训练价值网络
- 使用组内相对优势估计
- 更适合大模型场景

## 🔬 效率与优化

### 9. QLoRA: Efficient Finetuning of Quantized LLMs

QLoRA 让单卡微调大模型成为可能。

**技术组合：**
- 4-bit 量化
- 双量化
- 分页优化器
- LoRA 适配器

### 10. FlashAttention-2

FlashAttention 系列继续推动注意力计算的效率边界。

**优化点：**
- IO 感知的精确注意力
- 更好的并行性
- 支持更长序列

## 📚 阅读建议

### 初学者路线
1. 从 Llama 2 论文开始，了解开源模型的架构
2. 阅读 DPO 论文，理解偏好优化的基本思想
3. 看 QLoRA，学习如何高效微调

### 进阶路线
1. 深入 GPT-4 技术报告，理解多模态大模型
2. 研究 Sora 相关论文，了解视频生成
3. 阅读 GRPO 等最新算法，掌握前沿对齐技术

## 💭 思考与展望

2024 年 AI 领域的几个关键趋势：

1. **模型规模与效率并重**：不再一味追求参数规模，而是注重推理效率
2. **多模态成为标配**：文本、图像、音频、视频的统一理解
3. **开源生态繁荣**：Llama、Mistral 等开源模型推动创新
4. **对齐技术成熟**：RLHF、DPO 等方法论逐渐标准化

2025 年，我们期待看到：
- 更高效的模型架构
- 更长的上下文窗口
- 更强的推理能力
- 更低成本的部署方案

---

> 📮 **订阅更新**：每周精选 AI 论文解读，直达邮箱
> 
> 💬 **讨论交流**：欢迎在评论区分享你的阅读心得

<style>
.article-meta {
  display: flex;
  gap: 16px;
  padding: 16px 0;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 14px;
  color: var(--vp-c-text-3);
}

.paper-card {
  padding: 20px;
  margin: 16px 0;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border-left: 4px solid var(--vp-c-brand);
}

.paper-card h3 {
  margin-top: 0;
  font-size: 18px;
}

.reading-path {
  padding: 20px;
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, var(--vp-c-bg-soft) 100%);
  border-radius: 12px;
  margin: 24px 0;
}

.reading-path h4 {
  margin-top: 0;
}
</style>
