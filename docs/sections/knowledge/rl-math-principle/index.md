# 强化学习的数学原理：从贝尔曼方程到 GRPO [​](#强化学习的数学原理-从贝尔曼方程到-grpo) [​](#强化学习的数学原理-从贝尔曼方程到-grpo-​) [​](#强化学习的数学原理-从贝尔曼方程到-grpo-​-​) [​](#强化学习的数学原理-从贝尔曼方程到-grpo-​-​-​) [​](#强化学习的数学原理-从贝尔曼方程到-grpo-​-​-​-​) [​](#强化学习的数学原理-从贝尔曼方程到-grpo-​-​-​-​-​) [​](#强化学习的数学原理-从贝尔曼方程到-grpo-​-​-​-​-​-​) [​](#强化学习的数学原理-从贝尔曼方程到-grpo-​-​-​-​-​-​-​)

> 本知识库致力于从数学层面深入剖析强化学习（RL）的核心算法，涵盖从经典的贝尔曼方程到最新的生成式强化学习（如 GRPO、DPO）的全景技术演进。

📚 核心内容

本系列不仅仅是公式的堆砌，更注重算法背后的数学直觉与推导逻辑。所有代码实现均可在对应章节的 algorithms 目录下找到。

## 第一部分：基石 (Foundations) [​](#第一部分-基石-foundations) [​](#第一部分-基石-foundations-​) [​](#第一部分-基石-foundations-​-​) [​](#第一部分-基石-foundations-​-​-​) [​](#第一部分-基石-foundations-​-​-​-​) [​](#第一部分-基石-foundations-​-​-​-​-​) [​](#第一部分-基石-foundations-​-​-​-​-​-​) [​](#第一部分-基石-foundations-​-​-​-​-​-​-​)

建立强化学习的数学大厦地基，理解 MDP 与价值函数。

- [00. 基础知识](./00_Foundations/) - 概率论、优化基础
- [01. 贝尔曼方程](./01_Bellman_Equation/) - MDP、价值迭代、策略迭代
- [03. 经典 REINFORCE](./03_Classic_REINFORCE/) - 蒙特卡洛策略梯度

/

## 第二部分：策略梯度进阶 (Advanced Policy Gradients) [​](#第二部分-策略梯度进阶-advanced-policy-gradients) [​](#第二部分-策略梯度进阶-advanced-policy-gradients-​) [​](#第二部分-策略梯度进阶-advanced-policy-gradients-​-​) [​](#第二部分-策略梯度进阶-advanced-policy-gradients-​-​-​) [​](#第二部分-策略梯度进阶-advanced-policy-gradients-​-​-​-​) [​](#第二部分-策略梯度进阶-advanced-policy-gradients-​-​-​-​-​) [​](#第二部分-策略梯度进阶-advanced-policy-gradients-​-​-​-​-​-​) [​](#第二部分-策略梯度进阶-advanced-policy-gradients-​-​-​-​-​-​-​)

从原始的策略梯度走向更稳定、更高效的优化方法。

- [02. 策略梯度定理](./02_Policy_Gradient/) - Log-Derivative Trick
- [04. TRPO (Trust Region Policy Optimization)](./04_TRPO/) - 信任区域、共轭梯度
- [05. PPO (Proximal Policy Optimization)](./05_PPO/) - 裁剪目标、重要性采样
- [06. Actor-Critic](./06_Actor_Critic/) - 结合价值估计与策略优化
- [22. LitePPO](./22_LitePPO/) - 轻量级 PPO 实现探讨

## 第三部分：人类偏好对齐 (Preference Optimization) [​](#第三部分-人类偏好对齐-preference-optimization) [​](#第三部分-人类偏好对齐-preference-optimization-​) [​](#第三部分-人类偏好对齐-preference-optimization-​-​) [​](#第三部分-人类偏好对齐-preference-optimization-​-​-​) [​](#第三部分-人类偏好对齐-preference-optimization-​-​-​-​) [​](#第三部分-人类偏好对齐-preference-optimization-​-​-​-​-​) [​](#第三部分-人类偏好对齐-preference-optimization-​-​-​-​-​-​) [​](#第三部分-人类偏好对齐-preference-optimization-​-​-​-​-​-​-​)

大语言模型时代的核心技术，如何让模型符合人类价值观。

### 核心算法 [​](#核心算法) [​](#核心算法-​) [​](#核心算法-​-​) [​](#核心算法-​-​-​) [​](#核心算法-​-​-​-​) [​](#核心算法-​-​-​-​-​) [​](#核心算法-​-​-​-​-​-​) [​](#核心算法-​-​-​-​-​-​-​)

- [20. RLHF Pipeline](./20_RLHF_Pipeline/) - 基于人类反馈的强化学习全流程
- [07. DPO (Direct Preference Optimization)](./07_DPO/) - 也就是直接偏好优化，无需 Reward Model
- [08. GRPO (Group Relative Policy Optimization)](./08_GRPO/) - DeepSeek-R1 核心算法，组内相对优势
- [11. ORPO (Odds Ratio Preference Optimization)](./11_ORPO/) - 这里是 ORPO

### 变体与改进 [​](#变体与改进) [​](#变体与改进-​) [​](#变体与改进-​-​) [​](#变体与改进-​-​-​) [​](#变体与改进-​-​-​-​) [​](#变体与改进-​-​-​-​-​) [​](#变体与改进-​-​-​-​-​-​) [​](#变体与改进-​-​-​-​-​-​-​)

- [09. DAPO](./09_DAPO/)
- [10. GSPO](./10_GSPO/)
- [12. RLOO](./12_RLOO/)
- [13. SimPO](./13_SimPO/)
- [14. IPO](./14_IPO/)
- [15. KTO](./15_KTO/)
- [16. GMPO](./16_GMPO/)
- [17. GDPO](./17_GDPO/)
- [18. GHPO](./18_GHPO/)
- [24. OREO](./24_OREO/)
- [25. COCONUT](./25_COCONUT/)

## 第四部分：前沿探索 (Frontiers) [​](#第四部分-前沿探索-frontiers) [​](#第四部分-前沿探索-frontiers-​) [​](#第四部分-前沿探索-frontiers-​-​) [​](#第四部分-前沿探索-frontiers-​-​-​) [​](#第四部分-前沿探索-frontiers-​-​-​-​) [​](#第四部分-前沿探索-frontiers-​-​-​-​-​) [​](#第四部分-前沿探索-frontiers-​-​-​-​-​-​) [​](#第四部分-前沿探索-frontiers-​-​-​-​-​-​-​)

强化学习在 Scaling Law 及其他领域的延伸。

- [19. JustRL](./19_JustRL/) - 极简 RL 框架
- [21. RL Scaling](./21_RL_Scaling/) - 强化学习的扩展定律
- [23. RLVR](./23_RLVR/) - 强化学习与虚拟现实
- [99. 算法族谱对比](./99_Family_Comparisons/) - 各类算法的横向对比与选型指南

💡 学习建议

建议按照顺序阅读第一、二部分打好基础，通过手推公式理解算法本质。第三部分偏好优化是当前 LLM 对齐的热点，可根据兴趣选择性深入。