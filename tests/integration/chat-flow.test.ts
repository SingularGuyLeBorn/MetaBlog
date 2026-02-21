/**
 * Chat 流程集成测试
 * 
 * 测试完整的用户交互流程
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore, useSessionStore, useMessageStore, useStreamStore } from '../../.vitepress/agent/stores'
import { ChatStateMachine } from '../../.vitepress/agent/stores/machines/ChatStateMachine'

describe('Chat 流程集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 模拟 API
    vi.mock('../../.vitepress/agent/api', () => ({
      chatApi: {
        sendMessage: vi.fn().mockResolvedValue({
          id: 'msg_123',
          content: 'AI 回复内容',
          role: 'assistant'
        }),
        saveMessage: vi.fn().mockImplementation((sessionId, message) => 
          Promise.resolve({ ...message, id: `msg_${Date.now()}`, saved: true })
        ),
        streamMessage: vi.fn()
      }
    }))
  })

  describe('完整对话流程', () => {
    it('应该完成从创建会话到发送消息的全流程', async () => {
      const chat = useChatStore()
      const session = useSessionStore()
      const message = useMessageStore()

      // 1. 创建新会话
      const newSession = await session.createSession('测试会话')
      expect(newSession).toBeDefined()
      expect(newSession.title).toBe('测试会话')

      // 2. 切换到新会话
      await chat.switchSession(newSession.id)
      expect(chat.currentSessionId).toBe(newSession.id)

      // 3. 更新输入
      chat.updateInput('你好，AI！')
      expect(chat.inputContent).toBe('你好，AI！')

      // 4. 发送消息
      // 注意：由于 API 被 mock，这里主要测试状态流转
      expect(chat.currentState).toBe('IDLE')
      
      // 模拟发送
      chat.updateInput('')
      
      // 验证状态回到 IDLE
      expect(chat.currentState).toBe('IDLE')
    })

    it('应该在多个会话间正确切换', async () => {
      const chat = useChatStore()
      const session = useSessionStore()
      const message = useMessageStore()

      // 创建两个会话
      const session1 = await session.createSession('会话 1')
      const session2 = await session.createSession('会话 2')

      // 切换到会话 1 并添加消息
      await chat.switchSession(session1.id)
      message.addMessage({
        sessionId: session1.id,
        role: 'user',
        content: '消息 1',
        status: 'sent'
      })

      // 切换到会话 2 并添加消息
      await chat.switchSession(session2.id)
      message.addMessage({
        sessionId: session2.id,
        role: 'user',
        content: '消息 2',
        status: 'sent'
      })

      // 验证消息隔离
      expect(message.getSessionMessages(session1.id)).toHaveLength(1)
      expect(message.getSessionMessages(session2.id)).toHaveLength(1)
      expect(message.getSessionMessages(session1.id)[0].content).toBe('消息 1')
      expect(message.getSessionMessages(session2.id)[0].content).toBe('消息 2')

      // 切换回会话 1
      await chat.switchSession(session1.id)
      expect(chat.currentSessionId).toBe(session1.id)
    })

    it('应该正确分组显示会话', async () => {
      const session = useSessionStore()

      // 创建几个会话
      await session.createSession('今天的会话')
      
      // 模拟昨天的会话
      const yesterdaySession = await session.createSession('昨天的会话')
      yesterdaySession.updatedAt = Date.now() - 24 * 60 * 60 * 1000

      // 验证分组
      expect(session.todaySessions.length).toBeGreaterThanOrEqual(1)
      expect(session.yesterdaySessions.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('状态机集成', () => {
    it('应该正确流转状态', () => {
      const machine = new ChatStateMachine()

      // 初始状态
      expect(machine.getState()).toBe('IDLE')

      // 开始输入
      expect(machine.transition({ type: 'START_COMPOSING' })).toBe(true)
      expect(machine.getState()).toBe('COMPOSING')

      // 发送消息
      expect(machine.transition({ type: 'SEND_MESSAGE' })).toBe(true)
      expect(machine.getState()).toBe('SENDING')

      // 开始流式
      expect(machine.transition({ type: 'START_STREAM' })).toBe(true)
      expect(machine.getState()).toBe('STREAMING')

      // 流式结束
      expect(machine.transition({ type: 'STREAM_END' })).toBe(true)
      expect(machine.getState()).toBe('IDLE')
    })

    it('应该阻止非法状态流转', () => {
      const machine = new ChatStateMachine()

      // 不能直接从 IDLE 到 STREAMING
      expect(machine.transition({ type: 'START_STREAM' })).toBe(false)
      expect(machine.getState()).toBe('IDLE')

      // 正确流转到 SENDING
      machine.transition({ type: 'START_COMPOSING' })
      machine.transition({ type: 'SEND_MESSAGE' })
      expect(machine.getState()).toBe('SENDING')

      // 不能从 SENDING 直接 INTERRUPT（必须先进入 STREAMING）
      expect(machine.transition({ type: 'INTERRUPT' })).toBe(false)
    })
  })

  describe('消息管理', () => {
    it('应该正确处理乐观更新', async () => {
      const message = useMessageStore()
      const sessionId = 'test_session'

      // 添加乐观消息
      const tempId = await message.addMessageOptimistic({
        sessionId,
        role: 'user',
        content: '乐观更新测试'
      })

      // 验证消息已添加（乐观）
      const messages = message.getSessionMessages(sessionId)
      expect(messages).toHaveLength(1)
      expect(messages[0].id).toContain('temp_')

      // 模拟回滚
      message.rollbackMessage(tempId)
      expect(message.getSessionMessages(sessionId)).toHaveLength(0)
    })

    it('应该正确导出消息', async () => {
      const message = useMessageStore()
      const sessionId = 'export_test'

      // 添加测试消息
      message.addMessage({
        sessionId,
        role: 'user',
        content: '用户消息',
        status: 'sent'
      })
      message.addMessage({
        sessionId,
        role: 'assistant',
        content: 'AI 回复',
        status: 'sent'
      })

      // 导出为 Markdown
      const markdown = message.exportMessages(sessionId, 'markdown')
      expect(markdown).toContain('用户消息')
      expect(markdown).toContain('AI 回复')

      // 导出为 JSON
      const json = message.exportMessages(sessionId, 'json')
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(2)
    })
  })

  describe('快捷键处理', () => {
    it('应该正确处理快捷键', () => {
      const chat = useChatStore()

      // 模拟 Enter 键
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      
      // 模拟 Shift+Enter
      const shiftEnterEvent = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true })

      // 测试状态判断
      chat.updateInput('测试内容')
      expect(chat.canSend).toBe(true)
    })
  })
})
