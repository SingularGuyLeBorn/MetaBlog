/**
 * Stores Plugins Index
 * 
 * 提供的插件：
 * - persistPlugin: 状态持久化到 localStorage
 * - loggerPlugin: 开发环境日志记录
 */

export { createPersistPlugin, type PersistOptions } from './persistPlugin'
export { createLoggerPlugin, type LoggerOptions } from './loggerPlugin'
