---
title: 刑天铠甲合体动画
layout: page
---

# 刑天铠甲合体动画展示

这里是铠甲勇士刑天的各种合体动画效果展示。

## 合体动画列表

<div class="armor-nav">
  <a href="./basic.html" class="armor-card">
    <div class="armor-icon">🛡️</div>
    <h3>基础合体</h3>
    <p>刑天铠甲标准合体流程</p>
  </a>
  <a href="./upgrade.html" class="armor-card">
    <div class="armor-icon">⚔️</div>
    <h3>战神升级</h3>
    <p>战神刑天升级形态</p>
  </a>
  <a href="./weapons.html" class="armor-card">
    <div class="armor-icon">🔥</div>
    <h3>武器召唤</h3>
    <p>火刑剑与天烈剑召唤</p>
  </a>
  <a href="./finisher.html" class="armor-card">
    <div class="armor-icon">💥</div>
    <h3>必杀技</h3>
    <p>天地战神斩释放</p>
  </a>
</div>

<style>
.armor-nav {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.armor-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  background: var(--sr-glass-bg);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-lg);
  text-decoration: none;
  color: inherit;
  transition: all 0.3s var(--sr-spring-bounce);
}

.armor-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border-color: var(--sr-accent-star);
}

.armor-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.armor-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
}

.armor-card p {
  font-size: 14px;
  color: var(--sr-text-secondary);
  margin: 0;
  text-align: center;
}
</style>
