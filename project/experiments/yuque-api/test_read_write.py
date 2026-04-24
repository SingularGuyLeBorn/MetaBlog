#!/usr/bin/env python3
"""
测试读取和写入的字段映射关系
"""
import sys
sys.path.insert(0, ".")
from yuque_client import YuqueClient

client = YuqueClient()
book_id = 68016047
doc_slug = "xzumlwoglq2pl5im"
doc_id = 230671709

# 1. 读取当前文档
print("=== 1. 读取文档 ===")
result = client.api("GET", f"/api/docs/{doc_slug}", query={"book_id": str(book_id)})
data = result.get("data", {})
if isinstance(data, list) and data:
    data = data[0]

original_content = data.get("content", "")
print(f"content length: {len(original_content)}")
print(f"content preview: {original_content[:300]}...")

# 2. 尝试用 content 更新 body_asl
print("\n=== 2. 用 body_asl = content 更新 ===")
update_result = client.api("PUT", f"/api/docs/{doc_id}", data={
    "body_asl": original_content,
    "format": "lake",
}, referer="https://www.yuque.com")
print(f"update status: {update_result.get('status')}")

# 3. 再次读取
print("\n=== 3. 再次读取验证 ===")
result2 = client.api("GET", f"/api/docs/{doc_slug}", query={"book_id": str(book_id)})
data2 = result2.get("data", {})
if isinstance(data2, list) and data2:
    data2 = data2[0]
new_content = data2.get("content", "")
print(f"new content length: {len(new_content)}")
if new_content == original_content:
    print("Content preserved OK!")
else:
    print("Content CHANGED!")
    print(f"diff: {new_content[:300]}...")

# 4. 测试 append：在 content 末尾追加 Lake HTML
print("\n=== 4. 测试 append 到 content ===")
append_html = '<p data-lake-id="test123" id="test123"><span>APPENDED TEXT</span></p>'
new_body = original_content + append_html
update_result2 = client.api("PUT", f"/api/docs/{doc_id}", data={
    "body_asl": new_body,
    "format": "lake",
}, referer="https://www.yuque.com")
print(f"append update status: {update_result2.get('status')}")

# 5. 验证 append
print("\n=== 5. 验证 append ===")
result3 = client.api("GET", f"/api/docs/{doc_slug}", query={"book_id": str(book_id)})
data3 = result3.get("data", {})
if isinstance(data3, list) and data3:
    data3 = data3[0]
final_content = data3.get("content", "")
if "APPENDED TEXT" in final_content:
    print("Append verified OK!")
else:
    print("Append NOT found in content")
    print(f"final content: {final_content[:500]}...")
