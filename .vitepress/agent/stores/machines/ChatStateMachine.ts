/**
 * ChatStateMachine - 对话状态机
 * 
 * 管理对话的生命周期状态，参考 XState 设计但保持轻量
 * 状态流转：
 * IDLE -> COMPOSING -> SENDING -> RECEIVING/STREAMING -> IDLE
 *                    \-> ERROR -> RETRY/SENDING
 *                    \-> INTERRUPTED -> RETRY/IDLE
 */

export type ChatState = 
  | 'IDLE'           // 空闲
  | 'COMPOSING'      // 正在输入
  | 'SENDING'        // 发送中
  | 'RECEIVING'      // 等待响应（非流式）
  | 'STREAMING'      // 接收流式响应
  | 'ERROR'          // 错误状态
  | 'INTERRUPTED';   // 用户中断

export interface ChatStateContext {
  currentSessionId: string | null;
  currentMessageId: string | null;
  error: Error | null;
  retryCount: number;
  lastActivityAt: number;
}

export type ChatStateEventType = 
  | 'START_COMPOSING'
  | 'SEND_MESSAGE'
  | 'RECEIVE_RESPONSE'
  | 'START_STREAM'
  | 'STREAM_CHUNK'
  | 'STREAM_END'
  | 'ERROR'
  | 'RETRY'
  | 'INTERRUPT'
  | 'RESET';

export interface ChatStateEvent {
  type: ChatStateEventType;
  payload?: any;
}

type TransitionTable = Record<ChatState, Partial<Record<ChatStateEventType, ChatState>>>;

export class ChatStateMachine {
  private state: ChatState = 'IDLE';
  private context: ChatStateContext;
  private listeners: Set<(state: ChatState, context: ChatStateContext) => void> = new Set();
  
  // 状态转换规则表
  // 设计原则：
  // 1. 正常流程: IDLE -> COMPOSING -> SENDING -> STREAMING -> IDLE
  // 2. 错误恢复: 任何错误状态都可以通过 RESET 回到 IDLE
  // 3. 中断处理: SENDING/STREAMING 可以通过 INTERRUPT 中断
  private transitions: TransitionTable = {
    IDLE: {
      START_COMPOSING: 'COMPOSING',
      SEND_MESSAGE: 'SENDING',  // 允许从 IDLE 直接发送（空输入情况下）
      RESET: 'IDLE'  // 幂等
    },
    COMPOSING: {
      SEND_MESSAGE: 'SENDING',
      RESET: 'IDLE'
    },
    SENDING: {
      START_STREAM: 'STREAMING',
      RECEIVE_RESPONSE: 'IDLE',  // 非流式响应
      ERROR: 'ERROR',
      INTERRUPT: 'INTERRUPTED',
      RESET: 'IDLE'  // 允许取消发送
    },
    RECEIVING: {
      START_STREAM: 'STREAMING',  // 接收中转为流式
      RECEIVE_RESPONSE: 'IDLE',
      ERROR: 'ERROR',
      INTERRUPT: 'INTERRUPTED',
      RESET: 'IDLE'
    },
    STREAMING: {
      STREAM_END: 'IDLE',
      STREAM_CHUNK: 'STREAMING',  // 保持流式状态
      ERROR: 'ERROR',
      INTERRUPT: 'INTERRUPTED',
      RESET: 'IDLE'  // 允许停止流式输出
    },
    ERROR: {
      RETRY: 'SENDING',
      RESET: 'IDLE',
      START_COMPOSING: 'COMPOSING'
    },
    INTERRUPTED: {
      RESET: 'IDLE',
      RETRY: 'SENDING',
      START_COMPOSING: 'COMPOSING'
    }
  };

  constructor(initialContext?: Partial<ChatStateContext>) {
    this.context = {
      currentSessionId: null,
      currentMessageId: null,
      error: null,
      retryCount: 0,
      lastActivityAt: Date.now(),
      ...initialContext
    };
  }

  /**
   * 执行状态转换
   */
  transition(event: ChatStateEvent): boolean {
    const currentTransitions = this.transitions[this.state];
    const nextState = currentTransitions?.[event.type];
    
    if (!nextState) {
      console.warn(`[ChatStateMachine] 无效的状态转换: ${this.state} -> ${event.type}`);
      return false;
    }

    const prevState = this.state;
    this.state = nextState;
    this.context.lastActivityAt = Date.now();
    
    // 更新上下文
    this.updateContext(event);
    
    console.log(`[ChatStateMachine] ${prevState} -> ${nextState} (via ${event.type})`);
    this.notifyListeners();
    return true;
  }

  private updateContext(event: ChatStateEvent) {
    switch (event.type) {
      case 'SEND_MESSAGE':
        this.context.currentMessageId = event.payload?.messageId;
        this.context.retryCount = 0;
        this.context.error = null;
        break;
      case 'ERROR':
        this.context.error = event.payload?.error;
        this.context.retryCount++;
        break;
      case 'RETRY':
        this.context.error = null;
        break;
      case 'RESET':
      case 'STREAM_END':
        this.context.currentMessageId = null;
        this.context.error = null;
        break;
    }
  }

  getState(): ChatState {
    return this.state;
  }

  getContext(): Readonly<ChatStateContext> {
    return { ...this.context };
  }

  can(eventType: ChatStateEventType): boolean {
    const currentTransitions = this.transitions[this.state];
    return !!currentTransitions?.[eventType];
  }

  onTransition(listener: (state: ChatState, context: ChatStateContext) => void): () => void {
    this.listeners.add(listener);
    // 立即通知当前状态
    listener(this.state, { ...this.context });
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, { ...this.context });
      } catch (e) {
        console.error('[ChatStateMachine] 监听器错误:', e);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 便捷方法
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 是否处于活跃状态（正在发送或接收）
   */
  isActive(): boolean {
    return ['SENDING', 'RECEIVING', 'STREAMING'].includes(this.state);
  }

  /**
   * 是否可以发送消息
   */
  canSend(): boolean {
    return this.can('SEND_MESSAGE');
  }

  /**
   * 是否可以中断
   */
  canInterrupt(): boolean {
    return this.can('INTERRUPT');
  }

  /**
   * 获取状态描述
   */
  getStateDescription(): string {
    const descriptions: Record<ChatState, string> = {
      'IDLE': '准备就绪',
      'COMPOSING': '正在输入',
      'SENDING': '发送中',
      'RECEIVING': '等待响应',
      'STREAMING': '接收响应中',
      'ERROR': '发生错误',
      'INTERRUPTED': '已中断'
    };
    return descriptions[this.state];
  }

  /**
   * 重置状态机到初始状态
   */
  reset(): void {
    this.state = 'IDLE';
    this.context = {
      currentSessionId: null,
      currentMessageId: null,
      error: null,
      retryCount: 0,
      lastActivityAt: Date.now()
    };
    this.notifyListeners();
    console.log('[ChatStateMachine] 已重置到初始状态');
  }
}
