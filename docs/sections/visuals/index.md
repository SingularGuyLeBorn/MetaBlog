# Visuals 视觉

沉浸式 3D 视觉体验，探索宇宙、神话与未来的无限可能。

<div class="visuals-grid">
  <a href="./cosmos/" class="visual-card">
    <div class="card-image cosmos-bg">
      <div class="planet-icon">🪐</div>
    </div>
    <div class="card-content">
      <h3>Cosmos 宇宙</h3>
      <p>探索太阳系的奥秘，从炽热的太阳到遥远的行星，感受宇宙的浩瀚与壮美。</p>
      <div class="card-tags">
        <span class="tag">太阳系</span>
        <span class="tag">行星</span>
        <span class="tag">科学</span>
      </div>
    </div>
  </a>

  <a href="./blackhole/" class="visual-card">
    <div class="card-image blackhole-bg">
      <div class="blackhole-icon"></div>
    </div>
    <div class="card-content">
      <h3>Black Hole 黑洞</h3>
      <p>体验宇宙中最神秘的天体，探索事件视界、吸积盘与引力透镜的奥秘。</p>
      <div class="card-tags">
        <span class="tag">天体物理</span>
        <span class="tag">引力</span>
        <span class="tag">神秘</span>
      </div>
    </div>
  </a>

  <a href="./dragon-phoenix/" class="visual-card">
    <div class="card-image dragon-phoenix-bg">
      <div class="dp-icons">
        <span class="dp-dragon">🐉</span>
        <span class="dp-phoenix">🔥</span>
      </div>
    </div>
    <div class="card-content">
      <h3>Dragon & Phoenix 龙凤呈祥</h3>
      <p>龙凤双舞，阴阳调和，呈现中国传统文化中最祥瑞的景象。</p>
      <div class="card-tags">
        <span class="tag">神话</span>
        <span class="tag">传统文化</span>
        <span class="tag">祥瑞</span>
      </div>
    </div>
  </a>

  <a href="./phoenix/" class="visual-card">
    <div class="card-image phoenix-bg">
      <div class="fire-icon">🔥</div>
    </div>
    <div class="card-content">
      <h3>Phoenix 凤凰涅槃</h3>
      <p>浴火重生，永恒轮回，见证凤凰在烈焰中获得新生的壮丽景象。</p>
      <div class="card-tags">
        <span class="tag">重生</span>
        <span class="tag">火焰</span>
        <span class="tag">传说</span>
      </div>
    </div>
  </a>

  <a href="./dragon/" class="visual-card">
    <div class="card-image dragon-bg">
      <div class="dragon-icon">🐲</div>
    </div>
    <div class="card-content">
      <h3>Dragon 龙</h3>
      <p>腾云驾雾，呼风唤雨，跟随东方神龙在云海中翱翔。</p>
      <div class="card-tags">
        <span class="tag">东方神话</span>
        <span class="tag">神兽</span>
        <span class="tag">图腾</span>
      </div>
    </div>
  </a>

  <a href="./armor-hero/" class="visual-card">
    <div class="card-image armor-bg">
      <div class="armor-icon">🤖</div>
    </div>
    <div class="card-content">
      <h3>Armor Hero 机甲英雄</h3>
      <p>未来科技的结晶，机械与勇气的结合，守护人类和平的超级战士。</p>
      <div class="card-tags">
        <span class="tag">科幻</span>
        <span class="tag">机甲</span>
        <span class="tag">未来</span>
      </div>
    </div>
  </a>
</div>

<style scoped>
.visuals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.visual-card {
  display: block;
  background: linear-gradient(135deg, rgba(20, 25, 40, 0.8) 0%, rgba(15, 20, 35, 0.9) 100%);
  border: 1px solid rgba(100, 150, 255, 0.15);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.visual-card:hover {
  transform: translateY(-5px);
  border-color: rgba(100, 150, 255, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(100, 150, 255, 0.1);
}

.card-image {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.cosmos-bg {
  background: linear-gradient(135deg, #1a1a3e 0%, #0a0a1a 50%, #1a1530 100%);
}

.blackhole-bg {
  background: radial-gradient(ellipse at center, #1a0a2e 0%, #000000 70%);
}

.dragon-phoenix-bg {
  background: linear-gradient(135deg, #1a1a3e 0%, #3e1a1a 50%, #1a1530 100%);
}

.phoenix-bg {
  background: linear-gradient(135deg, #3e1a1a 0%, #5e2a1a 50%, #1a0a0a 100%);
}

.dragon-bg {
  background: linear-gradient(135deg, #0a1a2e 0%, #1a2a4e 50%, #0a1520 100%);
}

.armor-bg {
  background: linear-gradient(135deg, #1a1a2e 0%, #2a2a4e 50%, #1a1a2e 100%);
}

.planet-icon {
  font-size: 4rem;
  animation: float 3s ease-in-out infinite;
}

.blackhole-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #444, #000);
  box-shadow: 0 0 30px rgba(100, 50, 200, 0.5);
  animation: pulse 2s ease-in-out infinite;
}

.dp-icons {
  display: flex;
  gap: 2rem;
  font-size: 3rem;
}

.dp-dragon {
  animation: float 3s ease-in-out infinite;
}

.dp-phoenix {
  animation: float 3s ease-in-out infinite 0.5s;
}

.fire-icon {
  font-size: 4rem;
  animation: flicker 1.5s ease-in-out infinite;
}

.dragon-icon {
  font-size: 4rem;
  animation: float 3s ease-in-out infinite;
}

.armor-icon {
  font-size: 4rem;
  animation: pulse 2s ease-in-out infinite;
}

.card-content {
  padding: 1.5rem;
}

.card-content h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.2rem;
  color: #e0e0ff;
}

.card-content p {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: #a0a0c0;
  line-height: 1.6;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  background: rgba(100, 150, 255, 0.15);
  border: 1px solid rgba(100, 150, 255, 0.2);
  border-radius: 20px;
  font-size: 0.75rem;
  color: #80a0ff;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes flicker {
  0%, 100% { opacity: 1; transform: scale(1); }
  25% { opacity: 0.8; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
  75% { opacity: 0.9; transform: scale(0.98); }
}
</style>
