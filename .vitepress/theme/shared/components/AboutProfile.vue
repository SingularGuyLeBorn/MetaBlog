<script setup lang="ts">
// About profile content
</script>

<template>
  <div class="about-profile">
    <div class="profile-card glass slide-in">
      <div class="avatar-container">
        <div class="avatar">
           <span class="avatar-text">源</span>
        </div>
        <div class="status-indicator"></div>
      </div>
      
      <h2>MetaBlog 作者</h2>
      <p class="bio">探索 AI 与 硬件系统的边界。</p>
      <p class="desc">热衷于大模型微调、端侧部署与高性能计算。</p>

      <div class="tags">
         <span class="tag">PyTorch</span>
         <span class="tag">CUDA</span>
         <span class="tag">Next.js</span>
         <span class="tag">RAG</span>
      </div>
      
      <div class="stats">
        <div class="stat">
          <span class="value counter">42</span>
          <span class="label">文章</span>
        </div>
        <div class="stat">
          <span class="value counter">10k+</span>
          <span class="label">代码行</span>
        </div>
        <div class="stat">
          <span class="value">∞</span>
          <span class="label">探索</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-profile {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
}

.profile-card {
  width: 100%;
  max-width: 450px;
  padding: 50px 30px;
  text-align: center;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.profile-card:hover {
  transform: translateY(-10px) scale(1.02);
}

.slide-in {
  opacity: 0;
  animation: slideIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

.avatar-container {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
}

.avatar {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--vp-c-brand-light), var(--vp-c-brand));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
}

.avatar-text {
  font-size: 48px;
  font-weight: bold;
  color: white;
}

.status-indicator {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  background-color: #10b981; /* Green for online */
  border: 4px solid white;
  border-radius: 50%;
}

h2 {
  font-size: 2rem;
  margin-bottom: 12px;
  color: var(--vp-c-text-1);
}

.bio {
  font-size: 1.1rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
  margin-bottom: 8px;
}

.desc {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin-bottom: 24px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
}

.tag {
  padding: 4px 12px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--vp-c-brand-dark);
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.stats {
  display: flex;
  justify-content: space-around;
  padding-top: 30px;
  border-top: 1px solid var(--glass-border);
}

.stat {
  display: flex;
  flex-direction: column;
}

.value {
  font-size: 28px;
  font-weight: 800;
  color: var(--vp-c-text-1);
  background: linear-gradient(to right, var(--vp-c-brand-dark), var(--vp-c-brand));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.label {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 4px;
}
</style>
