/**
 * ChatStateMachine 单元测试
 */
import { describe, it, expect, vi } from 'vitest'
import { ChatStateMachine } from '../../../.vitepress/agent/stores/machines/ChatStateMachine'

describe('ChatStateMachine', () => {
  describe('基础状态流转', () => {
    it('初始状态应为 IDLE', () => {
      const sm = new ChatStateMachine()
      expect(sm.getState()).toBe('IDLE')
    })
    
    it('IDLE -> COMPOSING', () => {
      const sm = new ChatStateMachine()
      expect(sm.transition({ type: 'START_COMPOSING' })).toBe(true)
      expect(sm.getState()).toBe('COMPOSING')
    })
    
    it('IDLE -> SENDING', () => {
      const sm = new ChatStateMachine()
      expect(sm.transition({ type: 'SEND_MESSAGE' })).toBe(true)
      expect(sm.getState()).toBe('SENDING')
    })
    
    it('COMPOSING -> SENDING', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'START_COMPOSING' })
      expect(sm.transition({ type: 'SEND_MESSAGE' })).toBe(true)
      expect(sm.getState()).toBe('SENDING')
    })
    
    it('SENDING -> STREAMING', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.transition({ type: 'START_STREAM' })).toBe(true)
      expect(sm.getState()).toBe('STREAMING')
    })
    
    it('SENDING -> IDLE (非流式完成)', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.transition({ type: 'RECEIVE_RESPONSE' })).toBe(true)
      expect(sm.getState()).toBe('IDLE')
    })
    
    it('STREAMING -> IDLE', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'START_STREAM' })
      expect(sm.transition({ type: 'STREAM_END' })).toBe(true)
      expect(sm.getState()).toBe('IDLE')
    })
  })
  
  describe('错误处理', () => {
    it('SENDING -> ERROR', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.transition({ type: 'ERROR', payload: { error: new Error('test') } })).toBe(true)
      expect(sm.getState()).toBe('ERROR')
    })
    
    it('STREAMING -> ERROR', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'START_STREAM' })
      expect(sm.transition({ type: 'ERROR' })).toBe(true)
      expect(sm.getState()).toBe('ERROR')
    })
    
    it('ERROR -> RETRY -> SENDING', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'ERROR' })
      expect(sm.transition({ type: 'RETRY' })).toBe(true)
      expect(sm.getState()).toBe('SENDING')
    })
    
    it('ERROR -> RESET -> IDLE', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'ERROR' })
      expect(sm.transition({ type: 'RESET' })).toBe(true)
      expect(sm.getState()).toBe('IDLE')
    })
  })
  
  describe('中断操作', () => {
    it('SENDING -> INTERRUPT', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.transition({ type: 'INTERRUPT' })).toBe(true)
      expect(sm.getState()).toBe('INTERRUPTED')
    })
    
    it('STREAMING -> INTERRUPT', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'START_STREAM' })
      expect(sm.transition({ type: 'INTERRUPT' })).toBe(true)
      expect(sm.getState()).toBe('INTERRUPTED')
    })
    
    it('INTERRUPTED -> RETRY', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'INTERRUPT' })
      expect(sm.transition({ type: 'RETRY' })).toBe(true)
      expect(sm.getState()).toBe('SENDING')
    })
    
    it('INTERRUPTED -> RESET', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'INTERRUPT' })
      expect(sm.transition({ type: 'RESET' })).toBe(true)
      expect(sm.getState()).toBe('IDLE')
    })
  })
  
  describe('非法状态转换', () => {
    it('IDLE 不能直接 INTERRUPT', () => {
      const sm = new ChatStateMachine()
      expect(sm.transition({ type: 'INTERRUPT' })).toBe(false)
      expect(sm.getState()).toBe('IDLE')
    })
    
    it('SENDING 不能直接 SEND_MESSAGE', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.transition({ type: 'SEND_MESSAGE' })).toBe(false)
      expect(sm.getState()).toBe('SENDING')
    })
    
    it('ERROR 不能直接 INTERRUPT', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'ERROR' })
      expect(sm.transition({ type: 'INTERRUPT' })).toBe(false)
      expect(sm.getState()).toBe('ERROR')
    })
  })
  
  describe('便捷方法', () => {
    it('isActive() 在活跃状态返回 true', () => {
      const sm = new ChatStateMachine()
      expect(sm.isActive()).toBe(false)
      
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.isActive()).toBe(true)
      
      sm.transition({ type: 'START_STREAM' })
      expect(sm.isActive()).toBe(true)
      
      sm.transition({ type: 'STREAM_END' })
      expect(sm.isActive()).toBe(false)
    })
    
    it('canSend() 在正确状态返回 true', () => {
      const sm = new ChatStateMachine()
      expect(sm.canSend()).toBe(true)
      
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.canSend()).toBe(false)
      
      sm.transition({ type: 'ERROR' })
      expect(sm.canSend()).toBe(false)
    })
    
    it('canInterrupt() 在正确状态返回 true', () => {
      const sm = new ChatStateMachine()
      expect(sm.canInterrupt()).toBe(false)
      
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.canInterrupt()).toBe(true)
      
      sm.transition({ type: 'ERROR' })
      expect(sm.canInterrupt()).toBe(false)
    })
  })
  
  describe('监听器', () => {
    it('onTransition 在状态变化时触发', () => {
      const sm = new ChatStateMachine()
      const listener = vi.fn()
      
      sm.onTransition(listener)
      
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(listener).toHaveBeenCalledWith('SENDING', expect.any(Object))
      
      sm.transition({ type: 'STREAM_END' })
      expect(listener).toHaveBeenCalledWith('IDLE', expect.any(Object))
    })
    
    it('取消监听后不再触发', () => {
      const sm = new ChatStateMachine()
      const listener = vi.fn()
      
      const unsubscribe = sm.onTransition(listener)
      unsubscribe()
      
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(listener).toHaveBeenCalledTimes(1) // 只包括初始调用
    })
  })
  
  describe('上下文更新', () => {
    it('SEND_MESSAGE 时更新 currentMessageId', () => {
      const sm = new ChatStateMachine()
      sm.transition({ type: 'SEND_MESSAGE', payload: { messageId: 'msg_123' } })
      
      expect(sm.getContext().currentMessageId).toBe('msg_123')
    })
    
    it('ERROR 时更新 error 和 retryCount', () => {
      const sm = new ChatStateMachine()
      const error = new Error('test error')
      
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'ERROR', payload: { error } })
      
      expect(sm.getContext().error).toBe(error)
      expect(sm.getContext().retryCount).toBe(1)
    })
    
    it('RETRY 时重置 error', () => {
      const sm = new ChatStateMachine()
      
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'ERROR', payload: { error: new Error('test') } })
      sm.transition({ type: 'RETRY' })
      
      expect(sm.getContext().error).toBeNull()
      expect(sm.getContext().retryCount).toBe(1)
    })
    
    it('多次 ERROR 增加 retryCount', () => {
      const sm = new ChatStateMachine()
      
      sm.transition({ type: 'SEND_MESSAGE' })
      sm.transition({ type: 'ERROR' })
      sm.transition({ type: 'RETRY' })
      sm.transition({ type: 'ERROR' })
      sm.transition({ type: 'RETRY' })
      sm.transition({ type: 'ERROR' })
      
      expect(sm.getContext().retryCount).toBe(3)
    })
    
    it('STREAM_END 重置 currentMessageId', () => {
      const sm = new ChatStateMachine()
      
      sm.transition({ type: 'SEND_MESSAGE', payload: { messageId: 'msg_123' } })
      sm.transition({ type: 'START_STREAM' })
      sm.transition({ type: 'STREAM_END' })
      
      expect(sm.getContext().currentMessageId).toBeNull()
    })
  })
  
  describe('时间戳', () => {
    it('记录 lastActivityAt', () => {
      const before = Date.now()
      const sm = new ChatStateMachine()
      const after = Date.now()
      
      expect(sm.getContext().lastActivityAt).toBeGreaterThanOrEqual(before)
      expect(sm.getContext().lastActivityAt).toBeLessThanOrEqual(after)
    })
    
    it('状态转换时更新时间戳', async () => {
      const sm = new ChatStateMachine()
      const initialTime = sm.getContext().lastActivityAt
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      sm.transition({ type: 'SEND_MESSAGE' })
      expect(sm.getContext().lastActivityAt).toBeGreaterThan(initialTime)
    })
  })
})
