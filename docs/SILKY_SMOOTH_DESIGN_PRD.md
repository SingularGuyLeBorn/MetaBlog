# 🎭 丝滑3D交互设计规范

> **目标：定义什么是真正的"丝滑"——不是卡顿的炫技，而是呼吸般的自然流畅。**

---

## 一、丝滑的核心定义

### 什么是真正的丝滑？

**不是：**
- ❌ 0.4秒的慢速动画
- ❌ 鼠标一动就抽搐的3D倾斜
- ❌ 满屏乱飞的悬浮效果
- ❌ 占用80% GPU的粒子特效

**而是：**
- ✅ **60fps 恒定帧率** - 每一帧都稳如老狗
- ✅ **16ms 响应延迟** - 比人类感知更快
- ✅ **物理真实的运动** - 符合惯性和摩擦力
- ✅ **有目的的动效** - 每个动画都在讲故事

### 丝滑的数学标准

| 指标 | 丝滑标准 | 当前实现 | 差距 |
|------|----------|----------|------|
| 帧率 | 60fps | 30-45fps | ❌ 不达标 |
| 响应延迟 | <16ms | 100-400ms | ❌ 极差 |
| 动画时长 | 150-300ms | 400-600ms | ❌ 过慢 |
| GPU占用 | <20% | 60-80% | ❌ 过载 |

---

## 二、3D卡片系统 - 呼吸般的悬浮

### 2.1 基础卡片结构

```vue
<template>
  <div 
    class="card-3d"
    :class="{ 'is-hovered': isHovered }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <div class="card-inner">
      <!-- 内容 -->
    </div>
    <!-- 光泽层 -->
    <div class="card-shine" :style="shineStyle" />
  </div>
</template>
```

### 2.2 丝滑3D效果参数

```css
.card-3d {
  /* 基础3D设置 */
  transform-style: preserve-3d;
  perspective: 1000px;
  
  /* 过渡 - 300ms是丝滑的黄金时长 */
  transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1);
  
  /* 阴影 - 单层但精致 */
  box-shadow: 
    0 1px 2px rgba(0,0,0,0.02),
    0 4px 8px rgba(0,0,0,0.04),
    0 8px 16px rgba(0,0,0,0.06);
}

/* 悬浮状态 - 微妙但明确的反馈 */
.card-3d.is-hovered {
  transform: 
    translateY(-4px)      /* 轻微上浮 */
    rotateX(2deg)         /* 极小的3D倾斜 */
    scale(1.01);          /* 几乎不可见的放大 */
  
  box-shadow: 
    0 4px 8px rgba(0,0,0,0.04),
    0 12px 24px rgba(0,0,0,0.08),
    0 24px 48px rgba(0,0,0,0.12);
}
```

### 2.3 光泽效果（Shine Effect）

```css
.card-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255,255,255,0.4) 45%,
    rgba(255,255,255,0.6) 50%,
    rgba(255,255,255,0.4) 55%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 600ms ease-out;
  pointer-events: none;
}

.card-3d.is-hovered .card-shine {
  transform: translateX(100%);
}
```

**效果：** 鼠标悬浮时，一道光泽从卡片上滑过，像金属表面的反光。

### 2.4 为什么这样设计？

| 特性 | 数值 | 原因 |
|------|------|------|
| 上浮高度 | -4px | 足够感知，不破坏布局 |
| 倾斜角度 | 2deg | 有3D感但不眩晕 |
| 放大比例 | 1.01 | 几乎不可见，但"感觉"更精致 |
| 动画时长 | 300ms | 快速但不急促 |
| 缓动曲线 | cubic-bezier(0.23, 1, 0.32, 1) | 快速启动，优雅减速 |

---

## 三、3D按钮系统 - 物理反馈

### 3.1 按钮的三种状态

```vue
<template>
  <button 
    class="btn-3d"
    :class="{ 'is-pressed': isPressed }"
    @mousedown="isPressed = true"
    @mouseup="isPressed = false"
    @mouseleave="isPressed = false"
  >
    <span class="btn-text">{{ text }}</span>
    <span class="btn-shadow" />
  </button>
</template>
```

### 3.2 物理真实的按压

```css
.btn-3d {
  position: relative;
  padding: 12px 24px;
  background: linear-gradient(180deg, #8b5cf6, #7c3aed);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  
  /* 基础3D */
  transform: translateY(0);
  transform-style: preserve-3d;
  transition: transform 100ms ease-out;
}

/* 按钮文字 */
.btn-text {
  display: block;
  transform: translateZ(10px);
  transition: transform 100ms ease-out;
}

/* 阴影层 - 模拟深度 */
.btn-shadow {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: rgba(139, 92, 246, 0.4);
  filter: blur(8px);
  transform: translateY(4px) translateZ(-10px);
  transition: all 100ms ease-out;
  z-index: -1;
}

/* 按压状态 - 物理下沉 */
.btn-3d.is-pressed {
  transform: translateY(2px);
}

.btn-3d.is-pressed .btn-text {
  transform: translateZ(4px);
}

.btn-3d.is-pressed .btn-shadow {
  transform: translateY(2px) translateZ(-10px) scale(0.95);
  opacity: 0.6;
}
```

### 3.3 按钮状态时间线

```
鼠标按下 (0ms)
  ↓
transform: translateY(2px)        [即时响应]
阴影缩小 + 变淡                   [100ms过渡]
  ↓
鼠标释放 (Xms)
  ↓
transform: translateY(0)          [100ms回弹]
阴影恢复                          [同步恢复]
```

**总反馈时间：100ms**  
**人类感知阈值：100ms**  
**结果：感觉"即时"但又有物理反馈**

### 3.4 微交互动画

```css
/* 点击涟漪效果 */
.btn-3d::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: radial-gradient(
    circle at var(--click-x, 50%) var(--click-y, 50%),
    rgba(255,255,255,0.4) 0%,
    transparent 60%
  );
  opacity: 0;
  transform: scale(0.5);
  transition: none;
}

.btn-3d.is-pressed::after {
  opacity: 1;
  transform: scale(1);
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}
```

**效果：** 点击位置产生涟漪扩散，像水滴落入水面。

---

## 四、头像3D系统 - 立体肖像

### 4.1 分层结构

```vue
<template>
  <div class="avatar-3d" :class="{ 'is-online': isOnline }">
    <!-- 背景光环 -->
    <div class="avatar-halo" />
    
    <!-- 主体 -->
    <div class="avatar-body">
      <img :src="src" :alt="alt" />
    </div>
    
    <!-- 状态指示器 -->
    <div class="avatar-status">
      <div class="status-pulse" />
    </div>
    
    <!-- 悬浮信息 -->
    <div class="avatar-tooltip">
      {{ name }}
    </div>
  </div>
</template>
```

### 4.2 3D头像参数

```css
.avatar-3d {
  position: relative;
  width: 56px;
  height: 56px;
  transform-style: preserve-3d;
  cursor: pointer;
}

/* 背景光环 */
.avatar-halo {
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, #8b5cf6, #3b82f6);
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.8);
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.avatar-3d:hover .avatar-halo {
  opacity: 0.3;
  transform: scale(1);
}

/* 主体 */
.avatar-body {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transform: translateZ(20px);
  transition: transform 300ms ease-out;
}

.avatar-3d:hover .avatar-body {
  transform: translateZ(30px) scale(1.05);
}

.avatar-body img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 状态指示器 */
.avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateZ(30px);
}

.avatar-status::after {
  content: '';
  width: 10px;
  height: 10px;
  background: #10b981;
  border-radius: 50%;
}

/* 在线状态 - 呼吸灯 */
.status-pulse {
  position: absolute;
  inset: 2px;
  background: #10b981;
  border-radius: 50%;
  opacity: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(2); opacity: 0; }
}

/* 悬浮信息 */
.avatar-tooltip {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  padding: 6px 12px;
  background: rgba(0,0,0,0.8);
  color: white;
  font-size: 12px;
  border-radius: 8px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 200ms ease-out;
}

.avatar-3d:hover .avatar-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

### 4.3 头像动画时序

| 阶段 | 时长 | 效果 |
|------|------|------|
| 悬浮开始 | 0ms | 光环开始扩散 |
| 0-150ms | 150ms | 头像上浮 + 放大 |
| 150-300ms | 150ms | 光环完全展开 |
| 悬浮期间 | - | 呼吸灯持续闪烁 |
| 悬浮结束 | 200ms | 所有效果平滑恢复 |

---

## 五、页面过渡 - 液态流动

### 5.1 路由过渡

```vue
<template>
  <RouterView v-slot="{ Component }">
    <Transition name="page-flow" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
.page-flow-enter-active,
.page-flow-leave-active {
  transition: all 300ms cubic-bezier(0.23, 1, 0.32, 1);
}

.page-flow-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-flow-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
```

### 5.2 列表进入动画

```vue
<template>
  <TransitionGroup name="list-flow" tag="div">
    <div 
      v-for="(item, index) in items" 
      :key="item.id"
      class="list-item"
      :style="{ transitionDelay: `${index * 30}ms` }"
    >
      {{ item.name }}
    </div>
  </TransitionGroup>
</template>

<style>
.list-flow-enter-active {
  transition: all 400ms cubic-bezier(0.23, 1, 0.32, 1);
}

.list-flow-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* 最大延迟限制 - 避免长列表等待过久 */
.list-item:nth-child(n+10) {
  transition-delay: 300ms !important;
}
</style>
```

**关键：** 最大延迟限制在 300ms，前 10 个项目依次进入，后面的批量进入。

### 5.3 模态框3D进入

```vue
<template>
  <Transition name="modal-3d">
    <div v-if="show" class="modal-overlay">
      <div class="modal-content">
        <!-- 内容 -->
      </div>
    </div>
  </Transition>
</template>

<style>
.modal-3d-enter-active {
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-3d-leave-active {
  transition: all 200ms ease-in;
}

.modal-3d-enter-from .modal-content {
  opacity: 0;
  transform: 
    perspective(1000px) 
    rotateX(-10deg) 
    translateY(-30px) 
    scale(0.95);
}

.modal-3d-enter-to .modal-content {
  opacity: 1;
  transform: 
    perspective(1000px) 
    rotateX(0) 
    translateY(0) 
    scale(1);
}

.modal-3d-leave-to .modal-content {
  opacity: 0;
  transform: 
    perspective(1000px) 
    rotateX(10deg) 
    translateY(30px) 
    scale(0.95);
}
</style>
```

**效果：** 模态框从上方"翻开"进入，像一张卡片被放到桌面上。

---

## 六、滚动体验 - 惯性流动

### 6.1 平滑滚动

```css
html {
  scroll-behavior: smooth;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.3);
}
```

### 6.2 视差滚动效果

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const scrollY = ref(0)

const onScroll = () => {
  scrollY.value = window.scrollY
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="parallax-container">
    <div 
      class="parallax-bg"
      :style="{ transform: `translateY(${scrollY * 0.5}px)` }"
    />
    <div class="parallax-content">
      <!-- 内容 -->
    </div>
  </div>
</template>

<style>
.parallax-container {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.parallax-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  will-change: transform;
}

.parallax-content {
  position: relative;
  z-index: 1;
}
</style>
```

### 6.3 滚动触发动画

```vue
<script setup>
import { ref, onMounted } from 'vue'

const elements = ref([])

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 }
  )
  
  elements.value.forEach(el => observer.observe(el))
})
</script>

<template>
  <div 
    v-for="i in 10" 
    :key="i"
    ref="el => { if(el) elements[i-1] = el }"
    class="scroll-reveal"
  >
    Content {{ i }}
  </div>
</template>

<style>
.scroll-reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 600ms cubic-bezier(0.23, 1, 0.32, 1);
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
```

---

## 七、性能优化 - 丝滑的保障

### 7.1 will-change 策略

```css
/* 仅在需要时启用 */
.card-3d {
  will-change: transform;
}

/* 动画结束后移除 */
.card-3d:not(.is-hovered) {
  will-change: auto;
}
```

### 7.2 GPU 加速

```css
.animated-element {
  /* 强制 GPU 渲染 */
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

### 7.3 节流策略

```javascript
// 鼠标移动节流 - 60fps 不需要每像素都更新
const throttle = (fn, wait) => {
  let lastTime = 0
  return (...args) => {
    const now = Date.now()
    if (now - lastTime >= wait) {
      lastTime = now
      fn(...args)
    }
  }
}

// 使用：16ms = 60fps
element.addEventListener('mousemove', throttle(handleMouseMove, 16))
```

### 7.4 减少重排

```javascript
// ❌ 错误：多次修改导致多次重排
const updatePosition = (x, y) => {
  element.style.left = x + 'px'
  element.style.top = y + 'px'
  element.style.transform = `translate(${x}px, ${y}px)`
}

// ✅ 正确：使用 transform，一次性修改
const updatePosition = (x, y) => {
  element.style.transform = `translate3d(${x}px, ${y}px, 0)`
}
```

---

## 八、缓动曲线库

```css
:root {
  /* 标准 - 适用于大多数过渡 */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 减速 - 适用于元素进入 */
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  
  /* 加速 - 适用于元素离开 */
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
  
  /* 弹性 - 适用于按钮按压等交互 */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* 丝滑 - 最流畅的减速 */
  --ease-silky: cubic-bezier(0.23, 1, 0.32, 1);
}
```

---

## 九、动效时间规范

| 场景 | 时长 | 缓动 |
|------|------|------|
| 按钮反馈 | 100ms | ease-out |
| 卡片悬浮 | 300ms | --ease-silky |
| 页面过渡 | 300ms | --ease-standard |
| 模态框进入 | 300ms | --ease-bounce |
| 模态框离开 | 200ms | --ease-accelerate |
| 列表项进入 | 400ms | --ease-silky |
| 滚动揭示 | 600ms | --ease-decelerate |
| 复杂动画 | 800ms | --ease-standard |

---

## 十、检查清单

### 丝滑度检查

- [ ] 所有动画稳定在 60fps
- [ ] 交互响应时间 < 100ms
- [ ] 动画时长在 150-400ms 范围
- [ ] 使用合适的缓动曲线
- [ ] GPU 占用 < 30%

### 3D 效果检查

- [ ] 悬浮效果微妙（上浮 2-4px）
- [ ] 倾斜角度 < 5 度
- [ ] 使用光泽效果增强质感
- [ ] 阴影随悬浮深度变化
- [ ] 支持减少动画偏好

### 无障碍检查

- [ ] 支持 `prefers-reduced-motion`
- [ ] 所有交互可通过键盘完成
- [ ] 焦点状态清晰可见
- [ ] 对比度符合 WCAG AA

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 总结

**丝滑不是堆砌效果，而是精准控制。**

- **少即是多**：一个精致的 3D 卡片胜过满屏抽搐的元素
- **物理真实**：符合惯性的运动感觉更自然
- **性能优先**：60fps 是底线，不是目标
- **目的明确**：每个动效都要服务于用户体验

**记住：最好的动效是用户几乎注意不到，但感觉"很舒服"的那个。**

---

*文档版本：v1.0 - 丝滑标准*  
*目标帧率：60fps*  
*目标延迟：<16ms*  
*核心价值观：流畅即正义*
