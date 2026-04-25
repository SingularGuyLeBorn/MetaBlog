/**
 * ============================================================================
 * 路由共享类型定义
 * ============================================================================
 *
 * 原本散落在 proxy.ts / init.ts 中的 RouteContext 统一提取到这里，
 * 避免循环依赖和重复定义。
 */

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}
