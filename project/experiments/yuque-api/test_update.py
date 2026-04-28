#!/usr/bin/env python3
import sys
sys.path.insert(0, ".")
from yuque_client import YuqueClient

client = YuqueClient()

# 在 zf1hbk 中获取一个现有文档
book_id = 68016047
docs_result = client.api("GET", "/api/docs", query={"book_id": str(book_id)})
docs = docs_result.get("data", [])

if not docs:
    print("No docs found")
    sys.exit(1)

doc = docs[0]
doc_id = doc["id"]
doc_slug = doc["slug"]
print(f"Test doc: {doc['title']} (ID={doc_id}, slug={doc_slug})")

# 读取当前内容
read_result = client.read_doc(book_id, doc_slug)
current = read_result.get("body") or read_result.get("body_asl") or read_result.get("content") or ""
print(f"Current content length: {len(current)}")
print(f"Current content first 200 chars: {current[:200]}...")

# 尝试更新(追加)
new_body = current + "\n\n<!-- API test append marker -->"
update_result = client.api("PUT", f"/api/docs/{doc_id}", data={
    "title": doc["title"],
    "body": new_body,
    "format": "markdown",
}, referer="https://www.yuque.com")
print(f"Update result status: {update_result.get('status')}")

if update_result.get("status") != 200:
    print(f"Update failed: {update_result}")
else:
    print("Update OK!")
    # 验证
    verify = client.read_doc(book_id, doc_slug)
    verify_body = verify.get("body") or verify.get("body_asl") or verify.get("content") or ""
    if "API test append marker" in verify_body:
        print("Verified: append marker found in updated doc!")
    else:
        print("Warning: append marker NOT found")
