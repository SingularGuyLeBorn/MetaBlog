# 语雀助手 - 可用工具列表

## 知识库管理
| 工具 | 说明 |
|------|------|
| `yuqueRepoList` | 列出所有知识库 |
| `yuqueRepoCreate` | 创建知识库 |
| `yuqueRepoUpdate` | 更新知识库 |
| `yuqueRepoDelete` | 删除知识库 |
| `yuqueRepoGet` | 获取知识库详情 |
| `yuqueRepoSettingGet` | 获取知识库设置 |
| `yuqueRepoSettingUpdate` | 更新知识库设置 |

## 文档操作
| 工具 | 说明 |
|------|------|
| `yuqueDocList` | 列出知识库中的文档 |
| `yuqueDocRead` | 读取文档内容（返回 Lake HTML，含 doc_id） |
| `yuqueDocCreate` | 创建文档（推荐 format="markdown"） |
| `yuqueDocUpdate` | 更新文档（支持局部 replace_text 或全量替换） |
| `yuqueDocDelete` | 删除文档（需 doc_id） |

## 目录与搜索
| 工具 | 说明 |
|------|------|
| `yuqueTocGet` | 获取知识库目录结构 |
| `yuqueSearch` | 搜索（当前不可用） |

## 图片与媒体
| 工具 | 说明 |
|------|------|
| `yuqueImageUpload` | 上传图片到语雀 CDN，返回可引用的 URL |
