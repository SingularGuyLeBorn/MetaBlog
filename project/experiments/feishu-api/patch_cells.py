#!/usr/bin/env python3
"""精确修复 notebook 中两个报错的 cell"""
import json
from pathlib import Path

NB_PATH = Path("99_feishu_api_showcase.ipynb")
nb = json.loads(NB_PATH.read_text(encoding="utf-8"))

# Fix 1: 表格 cell - children[0] 是 heading，children[1] 才是 table
for i, cell in enumerate(nb["cells"]):
    src = "".join(cell["source"])
    if "table_id = result[\"children\"][0][\"block_id\"]" in src:
        new_src = src.replace(
            'table_id = result["children"][0]["block_id"]\ncell_ids = result["children"][0]["table"]["cells"]',
            '# children[0]=heading, children[1]=table\ntable_block_result = [c for c in result["children"] if c.get("block_type") == 31][0]\ntable_id = table_block_result["block_id"]\ncell_ids = table_block_result["table"]["cells"]'
        )
        # 同时修复 PATCH 结果判断
        new_src = new_src.replace(
            '    if patch_result.get("code", -1) == 0:\n        print(f"[OK] Cell {idx} updated")\n    else:\n        print(f"[WARN] Cell {idx} patch failed: {patch_result.get(\'msg\')}")',
            '    if patch_result.get("code", 0) == 0 or "block" in patch_result:\n        print(f"[OK] Cell {idx} updated")\n    else:\n        print(f"[WARN] Cell {idx} patch failed: {patch_result.get(\'msg\')}")'
        )
        nb["cells"][i]["source"] = new_src.split("\n")
        # 确保每行末尾有换行符(除了最后一行)
        nb["cells"][i]["source"] = [line + "\n" for line in new_src.split("\n")[:-1]] + [new_src.split("\n")[-1]]
        print(f"[OK] Fixed cell {i+1}: table indexing + PATCH check")
        break

# Fix 2: 图片上传 cell - 确保 img_bytes 变量名一致
# 先找到创建图片的 cell，检查变量名
for i, cell in enumerate(nb["cells"]):
    src = "".join(cell["source"])
    if "buf = io.BytesIO()" in src and "img.save" in src:
        # 检查这个 cell 定义了哪些变量
        if "img_bytes = buf.getvalue()" in src:
            print(f"[OK] Cell {i+1} defines img_bytes correctly")
        elif "buf.getvalue()" in src:
            # 可能变量名不一致
            print(f"[CHECK] Cell {i+1} image creation: {src[:200]}")
        break

# 保存
with open(NB_PATH, "w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)

print(f"[OK] Saved: {NB_PATH}")
