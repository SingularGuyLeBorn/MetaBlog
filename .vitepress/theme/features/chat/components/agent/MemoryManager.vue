<template>
  <div class="memory-manager">
    <!-- 澶撮儴 -->
    <div class="manager-header">
      <div class="header-title">
        <Icon name="database" class="title-icon" />
        <div>
          <h2 class="title-text">璁板繂绠＄悊</h2>
          <p class="title-desc">绠＄悊 Agents 鐨勯暱鏈熻蹇嗘暟鎹?/p>
        </div>
      </div>
    </div>

    <!-- 缁熻鍗＄墖 -->
    <div class="stats-grid">
      <LiquidGlass
        v-for="(stat, idx) in stats"
        :key="stat.id"
        class="stat-card-glass"
        :glow-color="stat.glowColor"
        :intensity="0.3"
      >
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: stat.gradient }">
            <Icon :name="stat.icon" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 璁板繂鍒楄〃 -->
    <LiquidGlass class="list-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.2">
      <div class="memory-list-header">
        <h3>璁板繂鏉＄洰</h3>
        <div class="list-actions">
          <div class="search-box">
            <Icon name="search" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="鎼滅储璁板繂..."
              class="search-input"
            />
          </div>
          <LiquidGlass glow-color="var(--sr-morandi-pink, #d4b8b8)" :intensity="0.3">
            <button class="clear-btn" @click="clearAll">
              <Icon name="trash-2" />
              娓呯┖鍏ㄩ儴
            </button>
          </LiquidGlass>
        </div>
      </div>

      <div class="memory-list">
        <LiquidGlass
          v-for="(memory, idx) in filteredMemories"
          :key="memory.id"
          class="memory-item-glass"
          :glow-color="memory.agentColor"
          :intensity="0.2"
        >
          <div class="memory-item">
            <div class="memory-avatar">{{ memory.agentAvatar }}</div>
            <div class="memory-content">
              <div class="memory-header">
                <span class="memory-agent">{{ memory.agentName }}</span>
                <span class="memory-time">{{ memory.time }}</span>
              </div>
              <p class="memory-text">{{ memory.content }}</p>
            </div>
            <button class="delete-btn" @click="deleteMemory(memory.id)">
              <Icon name="x" />
            </button>
          </div>
        </LiquidGlass>

        <!-- 绌虹姸鎬?-->
        <div v-if="filteredMemories.length === 0" class="empty-state">
          <Icon name="database" class="empty-icon" />
          <p>鏆傛棤璁板繂鏁版嵁</p>
          <span>Agent 浼氬湪瀵硅瘽涓嚜鍔ㄥ涔犲拰瀛樺偍璁板繂</span>
        </div>
      </div>
    </LiquidGlass>

    <!-- 瀵煎嚭鎸夐挳 -->
    <div class="export-section">
      <LiquidGlass glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.3">
        <button class="export-btn" @click="exportMemories">
          <Icon name="download" />
          瀵煎嚭璁板繂鏁版嵁
        </button>
      </LiquidGlass>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Icon from '../../../shared/Icon.vue'
import LiquidGlass from '../../../shared/LiquidGlass.vue'

const searchQuery = ref('')

const stats = [
  { id: 'total', label: '鎬昏蹇嗘暟', value: '128', icon: 'layers', gradient: 'linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8))', glowColor: 'var(--sr-accent-star, #b8a090)' },
  { id: 'agents', label: '娑夊強 Agents', value: '6', icon: 'users', gradient: 'linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), #2563eb)', glowColor: 'var(--sr-morandi-blue, #9daab8)' },
  { id: 'size', label: '瀛樺偍澶у皬', value: '2.4MB', icon: 'hard-drive', gradient: 'linear-gradient(135deg, var(--sr-morandi-green, #a8b3a8), var(--sr-morandi-green, #a8b3a8))', glowColor: 'var(--sr-morandi-green, #a8b3a8)' },
  { id: 'today', label: '浠婃棩鏂板', value: '12', icon: 'trending-up', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', glowColor: '#f59e0b' }
]

const memories = ref([
  { id: '1', agentName: '浠ｇ爜鍔╂墜', agentAvatar: '馃懆鈥嶐煉?, agentColor: 'var(--sr-morandi-blue, #9daab8)', content: '鐢ㄦ埛鍋忓ソ浣跨敤 TypeScript 鍜?Vue 3 缁勫悎寮?API', time: '2灏忔椂鍓? },
  { id: '2', agentName: '鍐欎綔涓撳', agentAvatar: '鉁嶏笍', agentColor: '#ec4899', content: '鐢ㄦ埛鍠滄绠€娲佹槑浜嗙殑鏂囬锛岄伩鍏嶅啑闀挎弿杩?, time: '5灏忔椂鍓? },
  { id: '3', agentName: '鏁版嵁鍒嗘瀽甯?, agentAvatar: '馃搳', agentColor: 'var(--sr-morandi-green, #a8b3a8)', content: '鐢ㄦ埛缁忓父璇锋眰 CSV 鏍煎紡鐨勬暟鎹鍑?, time: '鏄ㄥぉ' },
  { id: '4', agentName: '閫氱敤鍔╂墜', agentAvatar: '馃', agentColor: 'var(--sr-accent-star, #b8a090)', content: '鐢ㄦ埛瀵?AI 浼︾悊璇濋鎰熷叴瓒ｏ紝缁忓父璇㈤棶鐩稿叧闂', time: '2澶╁墠' },
])

const filteredMemories = computed(() => {
  if (!searchQuery.value) return memories.value
  const q = searchQuery.value.toLowerCase()
  return memories.value.filter(m => 
    m.content.toLowerCase().includes(q) ||
    m.agentName.toLowerCase().includes(q)
  )
})

function deleteMemory(id: string) {
  if (confirm('纭畾瑕佸垹闄よ繖鏉¤蹇嗗悧锛?)) {
    memories.value = memories.value.filter(m => m.id !== id)
  }
}

function clearAll() {
  if (confirm('纭畾瑕佹竻绌烘墍鏈夎蹇嗗悧锛熸鎿嶄綔涓嶅彲鎭㈠銆?)) {
    memories.value = []
  }
}

function exportMemories() {
  const data = JSON.stringify(memories.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `memories-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
@import '../../../styles/liquid-glass-theme.css';

.memory-manager {
  max-width: 1000px;
  margin: 0 auto;
  padding: 8px;
}

/* 澶撮儴 */
.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  color: var(--sr-accent-star, #b8a090);
}

.title-text {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.title-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 缁熻缃戞牸 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card-glass {
  border-radius: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
  margin-bottom: 2px;
}

.stat-label {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 鍒楄〃 */
.list-glass {
  border-radius: 28px;
  margin-bottom: 24px;
}

.memory-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.memory-list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.list-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.search-input {
  width: 240px;
  padding: 10px 14px 10px 40px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  transition: all 0.2s;
}

.search-input:hover,
.search-input:focus {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(184, 160, 144, 0.3);
  outline: none;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(212, 184, 184, 0.1);
  border: none;
  border-radius: 10px;
  color: var(--sr-morandi-pink, #d4b8b8);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(212, 184, 184, 0.2);
}

.clear-btn svg {
  width: 16px;
  height: 16px;
}

/* 璁板繂鍒楄〃 */
.memory-list {
  padding: 20px;
}

.memory-item-glass {
  border-radius: 16px;
  margin-bottom: 12px;
}

.memory-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
}

.memory-avatar {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.memory-content {
  flex: 1;
}

.memory-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.memory-agent {
  font-weight: 600;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
}

.memory-time {
  font-size: 12px;
  color: #94a3b8;
}

.memory-text {
  margin: 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
  line-height: 1.5;
}

.delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.memory-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(212, 184, 184, 0.1);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.delete-btn svg {
  width: 16px;
  height: 16px;
}

/* 绌虹姸鎬?*/
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  text-align: center;
  color: #94a3b8;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: #cbd5e1;
}

.empty-state p {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-muted, #94a3b8);
}

.empty-state span {
  font-size: 14px;
}

/* 瀵煎嚭鍖?*/
.export-section {
  display: flex;
  justify-content: center;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: linear-gradient(135deg, var(--sr-morandi-green, #a8b3a8), var(--sr-morandi-green, #a8b3a8));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(168, 179, 168, 0.3);
}

.export-btn svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .memory-list-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>
