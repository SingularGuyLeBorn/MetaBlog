# 重构执行清单

> 复制到 Todo 工具,逐步执行

---

## 阶段 1: Tools 合并

### 1.1 准备
- [ ] 确认 git 状态干净
- [ ] 创建新分支 `git checkout -b refactor/cleanup`
- [ ] 确认 IDE 自动更新 imports 已开启

### 1.2 合并每个 tool 分类 (重复 11 次)

**article**
- [ ] 创建 `tools/article.ts`,复制 definitions + executors 内容
- [ ] IDE 删除 `tools/article/` 文件夹
- [ ] 验证 import 路径更新

**academic**
- [ ] 创建 `tools/academic.ts`
- [ ] 删除 `tools/academic/` 文件夹
- [ ] 验证

**github**
- [ ] 创建 `tools/github.ts`
- [ ] 删除 `tools/github/` 文件夹
- [ ] 验证

**platform**
- [ ] 创建 `tools/platform.ts`
- [ ] 删除 `tools/platform/` 文件夹
- [ ] 验证

**kb**
- [ ] 创建 `tools/kb.ts`
- [ ] 删除 `tools/kb/` 文件夹
- [ ] 验证

**note**
- [ ] 创建 `tools/note.ts`
- [ ] 删除 `tools/note/` 文件夹
- [ ] 验证

**file**
- [ ] 创建 `tools/file.ts`
- [ ] 删除 `tools/file/` 文件夹
- [ ] 验证

**text**
- [ ] 创建 `tools/text.ts`
- [ ] 删除 `tools/text/` 文件夹
- [ ] 验证

**code**
- [ ] 创建 `tools/code.ts`
- [ ] 删除 `tools/code/` 文件夹
- [ ] 验证

**network**
- [ ] 创建 `tools/network.ts`
- [ ] 删除 `tools/network/` 文件夹
- [ ] 验证

**system**
- [ ] 创建 `tools/system.ts`
- [ ] 删除 `tools/system/` 文件夹
- [ ] 验证

### 1.3 阶段 1 验证
- [ ] 运行 `npm run build` 无错误
- [ ] 运行 `npm run dev` 正常启动
- [ ] 提交: `git commit -m "refactor: merge tool files"`

---

## 阶段 2: Services → Stores 合并

### 2.1 合并 chatStorage → chatStore
- [ ] 打开 `chatStore.ts` 和 `chatStorage.ts`
- [ ] 把 `chatStorage.ts` 的所有函数复制到 `chatStore.ts`
- [ ] 更新 `chatStore.ts` 中的 import (删除 storage import)
- [ ] 删除 `api/services/chatStorage.ts`
- [ ] 更新 `services/index.ts` 导出
- [ ] 验证 `useChat.ts` 正常工作
- [ ] 提交

### 2.2 合并 storage → chatStore
- [ ] 把 `storage.ts` 的内容合并到 `chatStore.ts`
- [ ] 删除 `api/services/storage.ts`
- [ ] 删除 `stores/dataStore.ts`
- [ ] 更新 `chat/index.ts` 导出路径
- [ ] 验证
- [ ] 提交

### 2.3 合并 agentStorage → agentStore
- [ ] 把 `agentStorage.ts` 的函数合并到 `agentStore.ts`
- [ ] 删除 `api/services/agentStorage.ts`
- [ ] 验证 Agent 相关组件
- [ ] 提交

### 2.4 阶段 2 验证
- [ ] 运行 `npm run build` 无错误
- [ ] 测试 Chat 功能
- [ ] 测试 Agent 功能
- [ ] 提交: `git commit -m "refactor: merge services into stores"`

---

## 阶段 3: 删除冗余文件

### 3.1 删除旧 Skills 文件
- [ ] 删除 `stores/skillLoader.ts`
- [ ] 删除 `stores/skillStore.ts`
- [ ] 删除 `stores/useSkills.ts`
- [ ] 验证引用这些文件的地方
- [ ] 提交

### 3.2 删除旧 Agents 文件
- [ ] 检查 `stores/useAgents.ts` 和 `stores/useAgentConfig.ts` 的差异
- [ ] 合并到 `stores/agentStore.ts`
- [ ] 删除 `stores/useAgents.ts`
- [ ] 验证
- [ ] 提交

### 3.3 更新 Stores Index
- [ ] 更新 `stores/index.ts` 导出
- [ ] 删除旧的导出
- [ ] 添加新的导出
- [ ] 验证
- [ ] 提交

---

## 阶段 4: Services 精简

### 4.1 合并 sessionLogger → logger
- [ ] 把 `sessionLogger.ts` 的函数复制到 `logger.ts`
- [ ] 删除 `api/services/sessionLogger.ts`
- [ ] 更新 `aiService.ts` 中的 import
- [ ] 验证
- [ ] 提交

### 4.2 更新 Services Index
- [ ] 简化 `services/index.ts`
- [ ] 从 `stores/` 重新导出 storage 相关
- [ ] 验证
- [ ] 提交

### 4.3 最终验证
- [ ] 运行 `npm run build` 无错误
- [ ] 运行 `npm run dev` 正常
- [ ] 测试所有功能
- [ ] 最终提交: `git commit -m "refactor: cleanup services directory"`

---

## 最终检查

### 文件数量统计
- [ ] 统计重构前文件数
- [ ] 统计重构后文件数
- [ ] 确认减少 60% 以上

### 功能测试
- [ ] Chat 功能正常
- [ ] Agent 功能正常
- [ ] Tools 调用正常
- [ ] 无控制台报错

### 代码质量
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告
- [ ] Import 路径规范

---

## 回滚准备

如果中途出现问题：

```bash
# 放弃当前修改
git checkout -- .
git clean -fd

# 或者回滚到特定提交
git log --oneline  # 查看提交历史
git reset --hard <commit-hash>

# 或者切换回 main
git checkout main
```

---

## 完成庆祝 🎉

- [ ] 代码已合并到 main
- [ ] 团队通知已发送
- [ ] 文档已更新
