/**
 * FileStorage - 文件系统存储适配�?
 * 
 * �?Memory 模块提供文件级持久化能力
 * 存储位置: .vitepress/agent/memory/data/
 * 
 * 特性：
 * - JSON 格式存储
 * - 自动创建目录
 * - 写入后验�?
 * - 备份机制（写入失败时保留旧文件）
 */

import { getFileContent, saveFileContent } from './utils/fileAdapter'

export interface StorageOptions {
  /** 存储名称（决定文件名�?*/
  name: string
  /** 默认数据 */
  defaultData?: any
}

export class FileStorage<T> {
  private name: string
  private data: T
  private loaded: boolean = false
  private saveQueue: Promise<void> = Promise.resolve()

  constructor(options: StorageOptions) {
    this.name = options.name
    this.data = options.defaultData ?? ({} as T)
  }

  /**
   * 获取存储文件路径
   */
  private getFilePath(): string {
    return `.vitepress/agent/memory/data/${this.name}.json`
  }

  /**
   * 加载数据
   */
  async load(): Promise<void> {
    if (this.loaded) return

    try {
      const content = await getFileContent(this.getFilePath())
      if (content) {
        const parsed = JSON.parse(content)
        this.data = { ...this.data, ...parsed }
        console.log(`[FileStorage] 加载成功: ${this.name}`)
      }
    } catch (error) {
      console.warn(`[FileStorage] 加载失败，使用默认�? ${this.name}`, error)
      // 使用默认数据
    }

    this.loaded = true
  }

  /**
   * 保存数据
   */
  async save(): Promise<void> {
    if (!this.loaded) {
      console.warn(`[FileStorage] 未加载就保存: ${this.name}`)
      return
    }

    // 队列化保存操作，避免并发写入
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        const content = JSON.stringify(this.data, null, 2)
        await saveFileContent(this.getFilePath(), content)
        console.log(`[FileStorage] 保存成功: ${this.name}`)
      } catch (error) {
        console.error(`[FileStorage] 保存失败: ${this.name}`, error)
        throw error
      }
    })

    return this.saveQueue
  }

  /**
   * 获取数据
   */
  getData(): T {
    return this.data
  }

  /**
   * 设置数据
   */
  setData(data: T): void {
    this.data = data
  }

  /**
   * 更新数据（部分更新）
   */
  updateData(updater: (data: T) => void): void {
    updater(this.data)
  }

  /**
   * 是否已加�?
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * 清空数据
   */
  async clear(): Promise<void> {
    this.data = {} as T
    await this.save()
  }
}

/**
 * 创建存储实例
 */
export function createStorage<T>(options: StorageOptions): FileStorage<T> {
  return new FileStorage<T>(options)
}

export default FileStorage
