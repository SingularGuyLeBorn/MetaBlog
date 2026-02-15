---
title: 04_Content.ipynb
filePath: knowledge/rl-math-principle/17_GDPO/04_Content.ipynb
aside: false
---

# 04_Content.ipynb

# SteerLM 演示：控制 LLM

本笔记本模拟了 **属性条件化 (Attribute Conditioning)** (SteerLM/GDPO) 的工作原理。
我们将可视化改变输入属性如何偏移输出的概率分布。


```python
def mock_llm_generate(prompt, attributes):
    """
    根据属性模拟 LLM 的回复风格。
    """
    helpfulness = attributes.get('helpfulness', 5)
    humor = attributes.get('humor', 0)
    
    base_response = "Quantum physics is about probabilities."
    
    if helpfulness > 8:
        base_response = "Quantum physics describes nature at the smallest scales using wave functions."
    elif helpfulness < 3:
        base_response = "It's magic stuff."
        
    if humor > 7:
        base_response += " It's like Schrodinger's cat: dead and alive until you look!"
    
    return base_response

# 场景 1: 高帮助性，无幽默
attr1 = {'helpfulness': 9, 'humor': 0}
res1 = mock_llm_generate("What is quantum?", attr1)
print(f"[系统 1]: {res1}")

# 场景 2: 中帮助性，高幽默
attr2 = {'helpfulness': 5, 'humor': 9}
res2 = mock_llm_generate("What is quantum?", attr2)
print(f"[系统 2]: {res2}")
```

## RL 中的应用案例

在传统的 RLHF 中，我们优化单一的标量奖励（质量）。
在 SteerLM 中，我们可以一边最大化 `Helpfulness`，一边保持低 `Verbosity` (啰嗦度)；或者在最大化 `Creativity` 的同时保持高 `Safety`。

这种多目标控制仅仅通过在推理时改变 Prompt 格式字符串即可实现。



