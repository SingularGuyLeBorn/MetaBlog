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

// ─── 外部 API 代理(BFF)───
export { registerGitHubRoutes } from "./external/github";
export { registerLarkRoutes } from "./external/lark";
export { registerProxyRoutes } from "./external/proxy";
export { registerYuqueRoutes } from "./external/yuque";

// ─── 内部业务路由 ───
export { registerChatRoutes } from "./internal/chat";
export { registerContentRoutes } from "./internal/content";
export { registerLogsRoutes } from "./internal/logs";
export { registerMcpRoutes } from "./internal/mcp";
export { registerMemoriesRoutes } from "./internal/memories";
export { registerSandboxRoutes } from "./internal/sandbox";
export { registerSessionsRoutes } from "./internal/sessions";
export { registerSkillsRoutes } from "./internal/skills";
export { registerOCRRoutes } from "./internal/ocr";

// ─── Agent 相关 ───
export { registerAgentNativeRoutes } from "./agent/agent-native";
export { registerAgentSystemRoutes } from "./agent/agent-system";

// ─── 平台解析 ───
export { registerPlatformParserRoutes } from "./platform/platform-parser";

// ─── 搜索 ───
export { registerSearchRoutes } from "./search";
