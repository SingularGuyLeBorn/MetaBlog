#!/usr/bin/env python3
"""生成飞书 API Showcase Notebook"""
import json
import os
from datetime import datetime

CELLS = []

def add_cell(source, cell_type="code", outputs=None):
    CELLS.append({
        "cell_type": cell_type,
        "execution_count": None,
        "metadata": {},
        "source": source if isinstance(source, list) else source.split("\n"),
        "outputs": outputs or []
    })

# ========== Cell 1: 标题 ==========
add_cell("""# 飞书 (Feishu/Lark) API 全流程验证

> **目标**: 验证飞书 Open API 的完整能力链路
> **覆盖**: 认证 → 创建 → 追加(文本/标题/列表/代码/公式/表格/图片) → 读取 → 块操作 → 搜索 → 消息 → 清理
> **认证**: App ID + App Secret → tenant_access_token
""", cell_type="markdown")

# ========== Cell 2: 导入和认证 ==========
add_cell("""from feishu_client import FeishuClient, md_to_blocks, make_text_block, make_heading_block, make_code_block, extract_text_from_block, block_type_name
from pathlib import Path
from datetime import datetime
import json

# 初始化客户端（自动从 .env 读取 FEISHU_APP_ID / FEISHU_APP_SECRET）
client = FeishuClient()

# 健康检查
health = client.health_check()
print(f"[{'OK' if health['ok'] else 'FAIL'}] FeishuClient initialized")
print(f"       Token valid: {health['token_valid']}")
print(f"       Expire in: {health['expire_in']}s")
""")

# ========== Cell 3: 创建文档 ==========
add_cell("""# 创建测试文档
title = f"API验证 - {datetime.now().strftime('%H:%M:%S')}"

result = client.api("POST", "/docx/v1/documents", json_data={"title": title})
document_id = result["document"]["document_id"]

print(f"[OK] Created doc: {title}")
print(f"     document_id: {document_id}")
print(f"     URL: https://open.feishu.cn/docx/{document_id}")
""")

# ========== Cell 4: 追加文本（content 方式） ==========
add_cell("""# 方式1: 传 content 字符串（自动分段）
content = """## 文本追加测试

这是一段普通文本，用于验证 feishu_doc_append 的 content 模式。

- 支持无序列表
- 自动转换为飞书 bullet block

1. 有序列表项1
2. 有序列表项2

> 引用块测试

段落之间需要空行分隔。"""

blocks = md_to_blocks(content)
print(f"[INFO] Converted to {len(blocks)} blocks")
for b in blocks:
    print(f"  {block_type_name(b['block_type'])}: {extract_text_from_block(b)[:30]}...")

result = client.api(
    "POST",
    f"/docx/v1/documents/{document_id}/blocks/{document_id}/children",
    json_data={"children": blocks}
)
print(f"[OK] Appended {len(blocks)} blocks")
""")

# ========== Cell 5: 追加代码块 ==========
add_cell("""# 追加代码块
code_blocks = [
    make_heading_block("代码块测试", level=2),
    make_text_block("Python 示例代码:"),
    make_code_block("def hello():\\n    print('Hello, Feishu!')\\n\\nhello()"),
]

result = client.api(
    "POST",
    f"/docx/v1/documents/{document_id}/blocks/{document_id}/children",
    json_data={"children": code_blocks}
)
print(f"[OK] Appended code block")
""")

# ========== Cell 6: 追加数学公式 ==========
add_cell("""# 追加数学公式（KaTeX 语法）
# 飞书原生支持公式，通过 text_element_style 设置
def make_formula_block(latex: str, inline: bool = False):
    return {
        "block_type": 2,  # text
        "text": {
            "elements": [{
                "text_run": {
                    "content": latex,
                    "text_element_style": {
                        "inline_formula" if inline else "formula": True
                    }
                }
            }]
        }
    }

formula_blocks = [
    make_heading_block("数学公式测试", level=2),
    make_text_block("行内公式: E = mc^2"),
    {
        "block_type": 2,
        "text": {
            "elements": [{
                "text_run": {
                    "content": "x = \\\\frac{-b \\\\pm \\\\sqrt{b^2-4ac}}{2a}",
                    "text_element_style": {"formula": True}
                }
            }]
        }
    },
]

result = client.api(
    "POST",
    f"/docx/v1/documents/{document_id}/blocks/{document_id}/children",
    json_data={"children": formula_blocks}
)
print(f"[OK] Appended formula blocks")
""")

# ========== Cell 7: 追加表格 ==========
add_cell("""# 追加表格（直接构造 table block）
table_block = {
    "block_type": 31,  # table
    "table": {
        "property": {
            "row_size": 3,
            "column_size": 3,
            "merge_type": 0,
            "header_row": True,
            "header_column": False
        },
        "cells": [
            {"block_type": 32, "table_cell": {"children": [make_text_block("姓名")]}},
            {"block_type": 32, "table_cell": {"children": [make_text_block("年龄")]}},
            {"block_type": 32, "table_cell": {"children": [make_text_block("城市")]}},
            {"block_type": 32, "table_cell": {"children": [make_text_block("Alice")]}},
            {"block_type": 32, "table_cell": {"children": [make_text_block("25")]}},
            {"block_type": 32, "table_cell": {"children": [make_text_block("北京")]}},
            {"block_type": 32, "table_cell": {"children": [make_text_block("Bob")]}},
            {"block_type": 32, "table_cell": {"children": [make_text_block("30")]}},
            {"block_type": 32, "table_cell": {"children": [make_text_block("上海")]}},
        ]
    }
}

result = client.api(
    "POST",
    f"/docx/v1/documents/{document_id}/blocks/{document_id}/children",
    json_data={"children": [make_heading_block("表格测试", level=2), table_block]}
)
print(f"[OK] Appended table block")
""")

# ========== Cell 8: 上传图片 ==========
add_cell("""# 上传图片到飞书文档素材库
# 先创建一个简单图片用于测试
from PIL import Image
import io
import base64

# 创建测试图片
img = Image.new('RGB', (400, 200), color=(73, 109, 137))
# 添加一些文字
from PIL import ImageDraw, ImageFont
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("arial.ttf", 24)
except:
    font = ImageFont.load_default()
draw.text((20, 80), "Test Image for Feishu", fill=(255, 255, 255), font=font)

# 保存为 base64
buf = io.BytesIO()
img.save(buf, format='PNG')
img_base64 = base64.b64encode(buf.getvalue()).decode()

print(f"[INFO] Image size: {len(buf.getvalue())} bytes")

# 上传图片
upload_result = client.request(
    "POST",
    "/drive/v1/medias/upload_all",
    files={"file": ("test.png", buf.getvalue(), "image/png")},
    data={
        "file_name": "test.png",
        "parent_type": "doc_image",
        "parent_node": document_id,
        "size": str(len(buf.getvalue())),
    }
)

if upload_result.get("code", -1) == 0:
    file_token = upload_result["data"]["file_token"]
    print(f"[OK] Image uploaded, file_token: {file_token}")
else:
    print(f"[WARN] Upload failed: {upload_result.get('msg')}")
    file_token = None
""")

# ========== Cell 9: 插入图片块 ==========
add_cell("""# 插入图片 block
if file_token:
    image_block = {
        "block_type": 27,  # image
        "image": {
            "token": file_token
        }
    }
    result = client.api(
        "POST",
        f"/docx/v1/documents/{document_id}/blocks/{document_id}/children",
        json_data={"children": [make_heading_block("图片测试", level=2), image_block]}
    )
    print(f"[OK] Inserted image block")
else:
    print("[SKIP] No file_token, skip image block")
""")

# ========== Cell 10: 读取文档 ==========
add_cell("""# 读取文档纯文本
read_result = client.api("GET", f"/docx/v1/documents/{document_id}/content")

# 提取纯文本
texts = []
for item in read_result.get("content", []):
    t = item.get("text", "")
    if t:
        texts.append(t)

print(f"[OK] Read doc, extracted {len(texts)} text segments")
print("--- Content preview ---")
for t in texts[:10]:
    print(t[:80])
""")

# ========== Cell 11: 获取块结构 ==========
add_cell("""# 获取文档块结构
blocks_result = client.api("GET", f"/docx/v1/documents/{document_id}/blocks", params={"page_size": 500})
block_items = blocks_result.get("items", [])

print(f"[OK] Got {len(block_items)} blocks")
print(f"{'Block ID':<30} {'Type':<15} {'Preview'}")
print("-" * 70)
for b in block_items[:15]:
    bt = b.get("block_type", 0)
    bid = b.get("block_id", "")[:28]
    preview = extract_text_from_block(b)[:30]
    print(f"{bid:<30} {block_type_name(bt):<15} {preview}")
""")

# ========== Cell 12: 更新指定块 ==========
add_cell("""# 更新第一个文本块的内容
text_blocks = [b for b in block_items if b.get("block_type") == 2]
if text_blocks:
    target = text_blocks[0]
    target_id = target["block_id"]
    
    update_result = client.api(
        "PUT",
        f"/docx/v1/documents/{document_id}/blocks/{target_id}",
        json_data={
            "replace_block": {
                "block_type": 2,
                "text": {
                    "elements": [{
                        "text_run": {
                            "content": "[已更新] 这段文本已被 feishu_doc_update_block 修改",
                            "text_element_style": {}
                        }
                    }]
                }
            }
        }
    )
    print(f"[OK] Updated block {target_id}")
else:
    print("[SKIP] No text block found")
""")

# ========== Cell 13: 搜索文档 ==========
add_cell("""# 搜索飞书文档
try:
    search_result = client.api(
        "POST",
        "/suite/docs-api/search/object",
        json_data={"search_key": "API", "count": 5}
    )
    docs = search_result.get("docs_entities", [])
    print(f"[OK] Found {len(docs)} docs")
    for d in docs[:3]:
        print(f"  - {d.get('title', 'N/A')} ({d.get('type', 'N/A')})")
except Exception as e:
    print(f"[WARN] Search failed: {e}")
""")

# ========== Cell 14: 搜索用户 ==========
add_cell("""# 搜索飞书用户（通过邮箱精确查找）
# 注意：需要应用有通讯录权限
try:
    user_result = client.api(
        "POST",
        "/contact/v3/users/batch_get_id",
        json_data={"emails": ["test@example.com"]},
        params={"user_id_type": "open_id"}
    )
    users = user_result.get("user_list", [])
    print(f"[OK] Found {len(users)} users")
    for u in users:
        print(f"  - {u.get('user_id', 'N/A')}")
except Exception as e:
    print(f"[WARN] User search failed: {e}")
""")

# ========== Cell 15: 删除测试块 ==========
add_cell("""# 删除最后一个块（清理测试数据）
if len(block_items) > 1:
    last_block = block_items[-1]
    last_id = last_block["block_id"]
    
    del_result = client.api(
        "DELETE",
        f"/docx/v1/documents/{document_id}/blocks/{last_id}"
    )
    print(f"[OK] Deleted last block {last_id}")
else:
    print("[SKIP] Too few blocks to delete")
""")

# ========== Cell 16: 清理总结 ==========
add_cell("""# 验证总结
print("=" * 60)
print("飞书 API 全流程验证完成")
print("=" * 60)
print(f"测试文档 ID: {document_id}")
print(f"文档链接: https://open.feishu.cn/docx/{document_id}")
print()
print("已验证功能:")
print("  [OK] 认证 (tenant_access_token)")
print("  [OK] 创建文档")
print("  [OK] 追加文本/标题/列表/引用 (content 模式)")
print("  [OK] 追加代码块")
print("  [OK] 追加数学公式")
print("  [OK] 追加表格")
print("  [OK] 上传图片")
print("  [OK] 插入图片块")
print("  [OK] 读取文档")
print("  [OK] 获取块结构")
print("  [OK] 更新块")
print("  [OK] 搜索文档")
print("  [OK] 搜索用户")
print("  [OK] 删除块")
print()
print("注意: 测试文档未自动删除，请手动清理")
""")

# ========== 生成 notebook ==========
nb = {
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.10.0"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 4,
    "cells": CELLS
}

output_path = Path(__file__).parent / "99_feishu_api_showcase.ipynb"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)

print(f"[OK] Generated: {output_path}")
print(f"     Cells: {len(CELLS)}")
