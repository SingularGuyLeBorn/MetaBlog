/**
 * 系统工具执行器
 * 
 * 包括：获取当前时间、测试回声工具
 */

/**
 * 获取当前时间
 */
export function getCurrentTime(): string {
  return new Date().toISOString()
}

/**
 * 测试回声工具
 */
export async function testEcho(args: Record<string, any>): Promise<string> {
  const ts = new Date().toLocaleString('zh-CN')
  return `🎯 工具调用成功\n📅 ${ts}\n📨 "${args.message}"\n🔢 重复: ${args.repeat_count || 1}`
}
