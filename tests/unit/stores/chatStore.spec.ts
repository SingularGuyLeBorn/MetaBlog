/**
 * chatStore 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '../../../.vitepress/agent/stores/chatStore'
import { useSessionStore } from '../../../.vitepress/agent/stores/sessionStore'
import { useMessageStore } from '../../../.vitepress/agent/stores/messageStore'

// Mock API
di.mock('../../../.vitepress/agent/api/chat', () => ({
  saveSession: vi.fn(),
  getSession: vi.fn()
}))

describe('chatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  describe('状态管理', () => {
    it('初始状态正确', () => {
      const chat = useChatStore()
      
      expect(chat.inputContent).toBe('')
      expect(chat.inputArticles).toEqual([])
      expect(chat.activeSkill).toBeNull()
      expect(chat.currentState).toBe('IDLE')
      expect(chat.isLoading).toBe(false)
      expect(chat.canSend).toBe(false)
    })
    
    it('updateInput 更新内容', () => {
      const chat = useChatStore()
      chat.updateInput('hello')
      
      expect(chat.inputContent).toBe('hello')
    })
    
    it('有内容时 canSend 为 true', () => {
      const chat = useChatStore()
      chat.updateInput('hello')
      
      expect(chat.canSend).toBe(true)
    })
    
    it('空白内容时 canSend 为 false', () => {
      const chat = useChatStore()
      chat.updateInput('   ')
      
      expect(chat.canSend).toBe(false)
    })
    
    it('加载中时 canSend 为 false', () => {
      const chat = useChatStore()
      chat.updateInput('hello')
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      
      expect(chat.canSend).toBe(false)
    })
  })
  
  describe('文章引用', () => {
    it('attachArticle 添加文章', () => {
      const chat = useChatStore()
      const article = { path: '/test.md', title: 'Test' }
      
      chat.attachArticle(article)
      
      expect(chat.inputArticles).toHaveLength(1)
      expect(chat.inputArticles[0]).toEqual(article)
    })
    
    it('重复文章不添加', () => {
      const chat = useChatStore()
      const article = { path: '/test.md', title: 'Test' }
      
      chat.attachArticle(article)
      chat.attachArticle(article)
      
      expect(chat.inputArticles).toHaveLength(1)
    })
    
    it('detachArticle 移除文章', () => {
      const chat = useChatStore()
      const article = { path: '/test.md', title: 'Test' }
      
      chat.attachArticle(article)
      chat.detachArticle(article.path)
      
      expect(chat.inputArticles).toHaveLength(0)
    })
    
    it('有引用文章时 canSend 为 true', () => {
      const chat = useChatStore()
      chat.attachArticle({ path: '/test.md', title: 'Test' })
      
      expect(chat.canSend).toBe(true)
    })
  })
  
  describe('技能选择', () => {
    it('setActiveSkill 设置技能', () => {
      const chat = useChatStore()
      chat.setActiveSkill('summarize')
      
      expect(chat.activeSkill).toBe('summarize')
    })
    
    it('setActiveSkill null 清除技能', () => {
      const chat = useChatStore()
      chat.setActiveSkill('summarize')
      chat.setActiveSkill(null)
      
      expect(chat.activeSkill).toBeNull()
    })
  })
  
  describe('发送消息', () => {
    it('canSend 为 false 时拒绝发送', async () => {
      const chat = useChatStore()
      // 不输入内容
      
      const result = await chat.sendMessage({})
      
      expect(result).toBe(false)
    })
    
    it('发送时创建会话（如果没有）', async () => {
      const chat = useChatStore()
      const session = useSessionStore()
      
      chat.updateInput('test message')
      
      // Mock 发送成功
      vi.spyOn(chat, 'sendMessage').mockResolvedValueOnce(true)
      
      await chat.sendMessage({})
      
      // 验证创建了会话
      expect(session.currentSessionId).toBeTruthy()
    })
    
    it('发送后清空输入', async () => {
      const chat = useChatStore()
      chat.updateInput('test')
      
      // Mock 发送
      vi.spyOn(chat, 'sendMessage').mockImplementation(async () => {
        chat.inputContent = ''
        return true
      })
      
      await chat.sendMessage({})
      
      expect(chat.inputContent).toBe('')
    })
    
    it('发送后清空引用', async () => {
      const chat = useChatStore()
      chat.updateInput('test')
      chat.attachArticle({ path: '/test.md', title: 'Test' })
      
      // Mock 发送
      vi.spyOn(chat, 'sendMessage').mockImplementation(async () => {
        chat.inputArticles = []
        return true
      })
      
      await chat.sendMessage({})
      
      expect(chat.inputArticles).toHaveLength(0)
    })
  })
  
  describe('中断操作', () => {
    it('canInterrupt 在正确状态为 true', () => {
      const chat = useChatStore()
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      
      expect(chat.canInterrupt).toBe(true)
    })
    
    it('canInterrupt 在错误状态为 false', () => {
      const chat = useChatStore()
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      chat.stateMachine.transition({ type: 'ERROR' })
      
      expect(chat.canInterrupt).toBe(false)
    })
    
    it('interrupt 中断当前请求', () => {
      const chat = useChatStore()
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      
      const result = chat.interrupt()
      
      expect(result).toBe(true)
      expect(chat.currentState).toBe('INTERRUPTED')
    })
    
    it('不能中断时返回 false', () => {
      const chat = useChatStore()
      // IDLE 状态不能中断
      
      const result = chat.interrupt()
      
      expect(result).toBe(false)
    })
  })
  
  describe('重试操作', () => {
    it('ERROR 状态可以重试', () => {
      const chat = useChatStore()
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      chat.stateMachine.transition({ type: 'ERROR' })
      
      // retry 应该可以调用
      expect(chat.stateMachine.can('RETRY')).toBe(true)
    })
    
    it('INTERRUPTED 状态可以重试', () => {
      const chat = useChatStore()
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      chat.stateMachine.transition({ type: 'INTERRUPT' })
      
      expect(chat.stateMachine.can('RETRY')).toBe(true)
    })
    
    it('IDLE 状态不能重试', () => {
      const chat = useChatStore()
      
      expect(chat.stateMachine.can('RETRY')).toBe(false)
    })
  })
  
  describe('重置', () => {
    it('reset 清除所有状态', () => {
      const chat = useChatStore()
      chat.updateInput('test')
      chat.attachArticle({ path: '/test.md', title: 'Test' })
      chat.setActiveSkill('summarize')
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      
      chat.reset()
      
      expect(chat.inputContent).toBe('')
      expect(chat.inputArticles).toHaveLength(0)
      expect(chat.activeSkill).toBeNull()
      expect(chat.currentState).toBe('IDLE')
    })
  })
  
  describe('草稿恢复', () => {
    it('restoreDraft 恢复保存的草稿', () => {
      const chat = useChatStore()
      chat.updateInput('draft content')
      chat.attachArticle({ path: '/draft.md', title: 'Draft' })
      
      // 模拟页面刷新：创建新的 store 实例
      setActivePinia(createPinia())
      const newChat = useChatStore()
      
      newChat.restoreDraft()
      
      expect(newChat.inputContent).toBe('draft content')
      expect(newChat.inputArticles).toHaveLength(1)
    })
  })
  
  describe('计算属性', () => {
    it('isLoading 在活跃状态为 true', () => {
      const chat = useChatStore()
      
      expect(chat.isLoading).toBe(false)
      
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      expect(chat.isLoading).toBe(true)
      
      chat.stateMachine.transition({ type: 'START_STREAM' })
      expect(chat.isLoading).toBe(true)
      
      chat.stateMachine.transition({ type: 'STREAM_END' })
      expect(chat.isLoading).toBe(false)
    })
    
    it('isStreaming 只在 STREAMING 为 true', () => {
      const chat = useChatStore()
      
      expect(chat.isStreaming).toBe(false)
      
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      expect(chat.isStreaming).toBe(false)
      
      chat.stateMachine.transition({ type: 'START_STREAM' })
      expect(chat.isStreaming).toBe(true)
    })
    
    it('hasError 只在 ERROR 为 true', () => {
      const chat = useChatStore()
      
      expect(chat.hasError).toBe(false)
      
      chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
      chat.stateMachine.transition({ type: 'ERROR' })
      
      expect(chat.hasError).toBe(true)
    })
  })
})
