<template>
  <div class="balance-display" :class="{ low: isLowBalance, loading }">
    <div class="balance-header">
      <span class="balance-icon">💰</span>
      <span class="balance-label">DeepSeek 余额</span>
      <button 
        class="refresh-btn" 
        @click="refresh"
        :disabled="loading"
        title="刷新余额"
      >
        <span v-if="loading">⏳</span>
        <span v-else>🔄</span>
      </button>
    </div>
    
    <div class="balance-content">
      <div v-if="error" class="balance-error">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ error }}</span>
      </div>
      
      <div v-else-if="balance" class="balance-info">
        <div class="balance-amount">{{ formattedBalance }}</div>
        <div class="balance-detail">
          <div class="detail-row">
            <span class="detail-label">赠送余额:</span>
            <span class="detail-value">{{ formatBalance(balance.balanceInfos[0]?.grantedBalance) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">充值余额:</span>
            <span class="detail-value">{{ formatBalance(balance.balanceInfos[0]?.toppedUpBalance) }}</span>
          </div>
        </div>
      </div>
      
      <div v-else class="balance-empty">
        <span>点击刷新查询余额</span>
      </div>
    </div>
    
    <div v-if="isLowBalance && balance" class="balance-warning">
      <span>⚠️ 余额不足，请及时充值</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDeepSeekBalance, formatBalance } from '../../../agent/api/balance'

const { balance, loading, error, formattedBalance, isLowBalance, refresh } = useDeepSeekBalance()

onMounted(() => {
  // 自动刷新一次
  refresh()
})
</script>

<style scoped>
.balance-display {
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.balance-display.low {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-color: #fecaca;
}

.balance-display.loading {
  opacity: 0.8;
}

.balance-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.balance-icon {
  font-size: 20px;
}

.balance-label {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.refresh-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.refresh-btn:hover:not(:disabled) {
  background: #f8fafc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.balance-content {
  min-height: 60px;
}

.balance-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fee2e2;
  border-radius: 8px;
  font-size: 12px;
  color: #991b1b;
}

.error-icon {
  font-size: 16px;
}

.balance-info {
  text-align: center;
}

.balance-amount {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.balance-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}

.balance-empty {
  text-align: center;
  padding: 20px;
  color: #94a3b8;
  font-size: 13px;
}

.balance-warning {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fee2e2;
  border-radius: 6px;
  font-size: 12px;
  color: #dc2626;
  text-align: center;
}
</style>
