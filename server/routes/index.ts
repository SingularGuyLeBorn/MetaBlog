/**
 * ============================================================================
 * 路由统一导出入口
 * ============================================================================
 *
 * 按领域分组导入，vitepress-integration.ts 只需 import 本文件即可。
 */

// ─── 初始化与文件 ───
export { registerInitRoutes } from "./init";
export { registerFilesRoutes } from "./internal/files";

// ─── 外部 API 代理（BFF）───
export { registerProxyRoutes } from "./external/proxy";
export { registerLarkRoutes } from "./external/lark";
export { registerYuqueRoutes } from "./external/yuque";
export { registerGitHubRoutes } from "./external/github";

// ─── 内部业务路由 ───
export { registerContentRoutes } from "./internal/content";
export { registerLogsRoutes } from "./internal/logs";
export { registerSkillsRoutes } from "./internal/skills";
export { registerMemoriesRoutes } from "./internal/memories";
export { registerMcpRoutes } from "./internal/mcp";
export { registerSessionsRoutes } from "./internal/sessions";
export { registerChatRoutes } from "./internal/chat";
export { registerSandboxRoutes } from "./internal/sandbox";

// ─── Agent 相关 ───
export { registerAgentNativeRoutes } from "./agent/agent-native";
export { registerAgentSystemRoutes } from "./agent/agent-system";

// ─── 平台解析 ───
export { registerPlatformParserRoutes } from "./platform/platform-parser";
