# Link Parsers 测试环境

按平台分类的独立测试 notebook，与前端 `platform-parser.ts` 逻辑对齐。

## 目录结构

```
link-parsers/
├── zhihu/
│   ├── zhihu-parser-test.ipynb   # 知乎/知乎专栏：Playwright + 系统 Chrome + stealth + 6层解析
│   └── test-output/              # 输出：{article_id}.{html,md,txt}
├── wechat/
│   ├── wechat-parser-test.ipynb  # 微信公众号：requests + js_content 正则提取
│   └── test-output/
├── xiaohongshu/
│   ├── xiaohongshu-parser-test.ipynb  # 小红书：Playwright + stealth + JSON-LD/DOM
│   └── test-output/
└── generic/
    ├── generic-parser-test.ipynb      # 通用网页：trafilatura → readability fallback
    └── test-output/
```

## 与前端对齐要点

| 平台 | 前端逻辑 | Notebook 对齐 |
|------|---------|--------------|
| 知乎 | `headless=false` + `channel="chrome"` + stealth script + `domcontentloaded` + 3s wait + 6层 fallback + `turndown` Markdown | 完全一致，仅 Python 侧用 `markdownify` 替代 `turndown` |
| 微信 | `requests` + `js_content` DOM + `data-src`→`src` | 完全一致 |
| 小红书 | `headless=false` + stealth + DOM/JSON-LD fallback | 完全一致 |
| 通用 | `trafilatura` / `readability` fallback | `trafilatura` 优先，失败再 heuristic |

## 使用方法

1. 打开对应平台的 `.ipynb`
2. 修改 Cell 1 的 `TEST_URL`
3. 依次执行所有 Cell
4. 结果自动保存到 `<platform>/test-output/<article_id>.{html,md,txt}`（与 ipynb 同目录）

## 依赖

```bash
pip install playwright markdownify beautifulsoup4 requests trafilatura
playwright install chromium   # 如使用系统 Chrome 可跳过
```

## 注意事项

- **Windows 控制台编码**: `print()` 中文可能显示为 `?`，但文件写入始终是 UTF-8，不影响结果
- **知乎反爬**: 必须 `headless=false` + 系统 Chrome，否则会返回 `40362` 异常
- **系统 Chrome 路径**: Windows 默认在 `C:\Program Files\Google\Chrome\Application\chrome.exe`
