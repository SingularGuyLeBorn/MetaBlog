/**
 * ============================================================================
 * 组件逻辑 - AgentIdentity
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/components
 */


export type ChainType = 'ethereum' | 'solana' | 'bitcoin' | 'polygon'

/**
 * Wallet 接口定义
 *
 */
export interface Wallet {
  address: string
  chain: ChainType
  name?: string
  isDefault?: boolean
}

/**
 * PlatformAccount 接口定义
 *
 */
export interface PlatformAccount {
  platform: string           // xiaohongshu, bilibili, twitter, etc.
  username: string
  displayName?: string
  avatar?: string
  cookie?: string            // 登录态
  isLoggedIn: boolean
  lastLoginAt?: string
  expiresAt?: string         // Cookie 过期时间
}

/**
 * AgentPermissions 接口定义
 *
 */
export interface AgentPermissions {
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  canSchedule: boolean
  canBrowse: boolean         // 浏览器自动化权限
  maxDailyRequests: number
  allowedPlatforms: string[]
}

/**
 * AgentPreferences 接口定义
 *
 */
export interface AgentPreferences {
  contentTypes: ('article' | 'video' | 'image' | 'thread')[]
  keywords: string[]         // 关注的关键词
  ignoreKeywords: string[]   // 屏蔽的关键词
  minContentLength: number
  autoPublish: boolean       // 是否自动发布
  language: string[]         // 偏好语言
}

/**
 * AgentIdentity 接口定义
 *
 */
export interface AgentIdentity {
  id: string
  name: string
  description?: string
  avatar?: string
  createdAt: string
  updatedAt: string

  // 联系方式
  email?: string
  phone?: string

  // Web3 身份
  wallets: Wallet[]
  defaultWallet?: string     // 默认钱包地址

  // 平台账号
  accounts: PlatformAccount[]

  // 权限配置
  permissions: AgentPermissions

  // 行为偏好
  preferences: AgentPreferences

  // 元数据
  metadata?: Record<string, any>
}

/**
 * IdentityCreateInput 接口定义
 *
 */
export interface IdentityCreateInput {
  name: string
  description?: string
  avatar?: string
  email?: string
  phone?: string
  wallet?: {
    address: string
    chain: ChainType
  }
  permissions?: Partial<AgentPermissions>
  preferences?: Partial<AgentPreferences>
}

/**
 * Agent Identity Manager
 * 管理所有 Agent 的身份信息
 */
export class AgentIdentityManager {
  private identities: Map<string, AgentIdentity> = new Map()
  private STORAGE_KEY = 'agent_identities'

  constructor() {
    this.loadFromStorage()
  }

  /**
   * 创建新的 Agent Identity
   */
  create(input: IdentityCreateInput): AgentIdentity {
    const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()

    const identity: AgentIdentity = {
      id,
      name: input.name,
      description: input.description,
      avatar: input.avatar,
      createdAt: now,
      updatedAt: now,
      email: input.email,
      phone: input.phone,
      wallets: input.wallet ? [{
        ...input.wallet,
        isDefault: true
      }] : [],
      defaultWallet: input.wallet?.address,
      accounts: [],
      permissions: {
        canRead: true,
        canWrite: true,
        canDelete: false,
        canSchedule: true,
        canBrowse: true,
        maxDailyRequests: 100,
        allowedPlatforms: ['xiaohongshu', 'bilibili', 'zhihu'],
        ...input.permissions
      },
      preferences: {
        contentTypes: ['article', 'video'],
        keywords: [],
        ignoreKeywords: [],
        minContentLength: 100,
        autoPublish: false,
        language: ['zh', 'en'],
        ...input.preferences
      }
    }

    this.identities.set(id, identity)
    this.saveToStorage()

    console.log(`[Identity] Created agent: ${input.name} (${id})`)
    return identity
  }

  /**
   * 获取 Identity
   */
  get(id: string): AgentIdentity | undefined {
    return this.identities.get(id)
  }

  /**
   * 获取所有 Identity
   */
  getAll(): AgentIdentity[] {
    return Array.from(this.identities.values())
  }

  /**
   * 更新 Identity
   */
  update(id: string, updates: Partial<AgentIdentity>): AgentIdentity | null {
    const identity = this.identities.get(id)
    if (!identity) return null

    const updated: AgentIdentity = {
      ...identity,
      ...updates,
      id, // 不可修改
      createdAt: identity.createdAt, // 不可修改
      updatedAt: new Date().toISOString()
    }

    this.identities.set(id, updated)
    this.saveToStorage()

    return updated
  }

  /**
   * 删除 Identity
   */
  delete(id: string): boolean {
    const result = this.identities.delete(id)
    if (result) {
      this.saveToStorage()
    }
    return result
  }

  /**
   * 添加平台账号
   */
  addPlatformAccount(
    identityId: string,
    account: Omit<PlatformAccount, 'isLoggedIn'>
  ): PlatformAccount | null {
    const identity = this.identities.get(identityId)
    if (!identity) return null

    const newAccount: PlatformAccount = {
      ...account,
      isLoggedIn: !!account.cookie
    }

    // 检查是否已存在,存在则更新
    const existingIndex = identity.accounts.findIndex(
      a => a.platform === account.platform
    )

    if (existingIndex >= 0) {
      identity.accounts[existingIndex] = newAccount
    } else {
      identity.accounts.push(newAccount)
    }

    this.saveToStorage()
    return newAccount
  }

  /**
   * 移除平台账号
   */
  removePlatformAccount(identityId: string, platform: string): boolean {
    const identity = this.identities.get(identityId)
    if (!identity) return false

    const initialLength = identity.accounts.length
    identity.accounts = identity.accounts.filter(a => a.platform !== platform)

    if (identity.accounts.length !== initialLength) {
      this.saveToStorage()
      return true
    }
    return false
  }

  /**
   * 添加钱包
   */
  addWallet(identityId: string, wallet: Wallet): Wallet | null {
    const identity = this.identities.get(identityId)
    if (!identity) return null

    // 检查地址是否已存在
    const exists = identity.wallets.some(w =>
      w.address.toLowerCase() === wallet.address.toLowerCase()
    )
    if (exists) {
      throw new Error('Wallet address already exists')
    }

    // 如果是第一个钱包,设为默认
    if (identity.wallets.length === 0) {
      wallet.isDefault = true
      identity.defaultWallet = wallet.address
    }

    identity.wallets.push(wallet)
    this.saveToStorage()
    return wallet
  }

  /**
   * 设置默认钱包
   */
  setDefaultWallet(identityId: string, address: string): boolean {
    const identity = this.identities.get(identityId)
    if (!identity) return false

    const wallet = identity.wallets.find(w =>
      w.address.toLowerCase() === address.toLowerCase()
    )
    if (!wallet) return false

    identity.wallets.forEach(w => w.isDefault = false)
    wallet.isDefault = true
    identity.defaultWallet = address

    this.saveToStorage()
    return true
  }

  /**
   * 验证权限
   */
  checkPermission(
    identityId: string,
    permission: keyof AgentPermissions,
    platform?: string
  ): boolean {
    const identity = this.identities.get(identityId)
    if (!identity) return false

    const perms = identity.permissions

    // 基础权限检查
    if (typeof perms[permission] === 'boolean') {
      if (!perms[permission]) return false
    }

    // 平台权限检查
    if (platform && !perms.allowedPlatforms.includes(platform)) {
      return false
    }

    return true
  }

  /**
   * 导出 Identity(备份)
   */
  exportIdentity(id: string): string | null {
    const identity = this.identities.get(id)
    if (!identity) return null

    // 敏感信息脱敏
    const exportData = {
      ...identity,
      accounts: identity.accounts.map(a => ({
        ...a,
        cookie: a.cookie ? '[REDACTED]' : undefined
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 导入 Identity
   */
  importIdentity(json: string): AgentIdentity | null {
    try {
      const data = JSON.parse(json)
      // 验证必要字段
      if (!data.name) throw new Error('Missing required field: name')

      return this.create({
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        email: data.email,
        phone: data.phone,
        wallet: data.wallets?.[0],
        permissions: data.permissions,
        preferences: data.preferences
      })
    } catch (error) {
      console.error('[Identity] Import failed:', error)
      return null
    }
  }

  /**
   * 持久化到存储
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return

    const data = Array.from(this.identities.entries())
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
  }

  /**
   * 从存储加载
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (data) {
        const entries: [string, AgentIdentity][] = JSON.parse(data)
        this.identities = new Map(entries)
      }
    } catch (error) {
      console.error('[Identity] Failed to load from storage:', error)
    }
  }
}

// 创建全局实例
export const identityManager = new AgentIdentityManager()

// 默认 Agent 创建函数
/**
 * 创建DefaultAgent
 *
 * @param name - 参数(string = 'Content Collector')
 * @returns 返回值(AgentIdentity)
 */
export function createDefaultAgent(name: string = 'Content Collector'): AgentIdentity {
  return identityManager.create({
    name,
    description: '默认内容采集 Agent',
    permissions: {
      canRead: true,
      canWrite: true,
      canDelete: false,
      canSchedule: true,
      canBrowse: true,
      maxDailyRequests: 100,
      allowedPlatforms: ['xiaohongshu', 'bilibili', 'zhihu', 'twitter']
    },
    preferences: {
      contentTypes: ['article', 'video'],
      keywords: [],
      ignoreKeywords: ['广告', '推广'],
      minContentLength: 100,
      autoPublish: false,
      language: ['zh', 'en']
    }
  })
}
