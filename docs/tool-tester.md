# 🔧 工具测试面板

点击卡片上的「测试」按钮或「一键测试全部」来验证所有工具。

<script setup>
import ToolTester from '../.vitepress/theme/components/ToolTester.vue'
</script>

<ToolTester />

## 故障排查

### fetch_url 返回 504/502

1. **检查网络连通性**
   ```bash
   ping api.github.com
   ```

2. **检查目标网站** - 在浏览器中直接访问测试 URL

3. **防火墙/代理** - 某些网络环境可能限制外网访问

4. **增加超时时间** - 某些网站响应较慢

### MCP 工具失败

检查 MCP Server 是否正确初始化（查看浏览器控制台日志）

### GitHub API 限制

GitHub API 有速率限制，未认证请求每小时 60 次限制。
