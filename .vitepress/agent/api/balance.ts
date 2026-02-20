/**
 * DeepSeek Balance API - 余额查询
 * 查询 DeepSeek API 账户余额
 */

import { getLLMManager } from '../llm'

// ============================================
// Types
// ============================================

export interface BalanceInfo {
  isAvailable: boolean
  balanceInfos: Array<{
    currency: string
    totalBalance: string
    grantedBalance: string
    toppedUpBalance: string
  }>
}

export interface BalanceResponse {
  success: boolean
  data?: BalanceInfo
  error?: string
}

// ============================================
// API Functions
// ============================================

/**
 * 查询 DeepSeek 账户余额
 * GET https://api.deepseek.com/user/balance
 */
export async function queryDeepSeekBalance(): Promise<BalanceResponse> {
  try {
    // 从环境变量获取 API key
    const apiKey = (import.meta as any).env?.VITE_DEEPSEEK_API_KEY
      || (typeof process !== 'undefined' ? process.env?.VITE_DEEPSEEK_API_KEY : undefined)

    if (!apiKey) {
      return {
        success: false,
        error: 'DeepSeek API key not configured'
      }
    }

    const response = await fetch('https://api.deepseek.com/user/balance', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`
      }
    }
    
    const data: BalanceInfo = await response.json()
    
    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to query balance: ${(error as Error).message}`
    }
  }
}

/**
 * 格式化余额显示
 */
export function formatBalance(balance: string | undefined): string {
  if (!balance) return '0.00'
  
  const num = parseFloat(balance)
  if (isNaN(num)) return '0.00'
  
  // 如果是 CNY，转换为元
  if (num > 100) {
    return `¥${(num / 100).toFixed(2)}`
  }
  
  return `$${num.toFixed(2)}`
}

/**
 * 检查余额是否充足
 */
export function isBalanceSufficient(balanceInfo: BalanceInfo | undefined, threshold: number = 1.0): boolean {
  if (!balanceInfo || !balanceInfo.balanceInfos || balanceInfo.balanceInfos.length === 0) {
    return false
  }
  
  const total = parseFloat(balanceInfo.balanceInfos[0].totalBalance || '0')
  return total >= threshold
}

// ============================================
// Vue Composable
// ============================================

import { ref, computed } from 'vue'

export function useDeepSeekBalance() {
  const balance = ref<BalanceInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const formattedBalance = computed(() => {
    if (!balance.value?.balanceInfos?.[0]) return '未配置'
    return formatBalance(balance.value.balanceInfos[0].totalBalance)
  })
  
  const isAvailable = computed(() => {
    return balance.value?.isAvailable ?? false
  })
  
  const isLowBalance = computed(() => {
    if (!balance.value?.balanceInfos?.[0]) return false
    const total = parseFloat(balance.value.balanceInfos[0].totalBalance || '0')
    return total < 1.0 // 少于1美元视为余额不足
  })
  
  async function refresh() {
    loading.value = true
    error.value = null
    
    try {
      const result = await queryDeepSeekBalance()
      if (result.success) {
        balance.value = result.data || null
      } else {
        error.value = result.error || '查询失败'
        balance.value = null
      }
    } catch (e) {
      error.value = (e as Error).message
      balance.value = null
    } finally {
      loading.value = false
    }
  }
  
  return {
    balance,
    loading,
    error,
    formattedBalance,
    isAvailable,
    isLowBalance,
    refresh
  }
}
