#!/usr/bin/env python3
import sys, json
sys.path.insert(0, ".")
from yuque_client import YuqueClient

client = YuqueClient()
book_id = 68016047
doc_slug = "xzumlwoglq2pl5im"

# 直接调用 API 看完整响应
result = client.api("GET", f"/api/docs/{doc_slug}", query={"book_id": str(book_id)})
print("Full response keys:", result.keys())
print("data keys:", result.get("data", {}).keys() if isinstance(result.get("data"), dict) else "N/A")

data = result.get("data", {})
if isinstance(data, list) and data:
    data = data[0]

print(f"\nbody length: {len(data.get('body', ''))}")
print(f"body_asl length: {len(data.get('body_asl', ''))}")
print(f"content length: {len(data.get('content', ''))}")
print(f"body_draft length: {len(data.get('body_draft', ''))}")
print(f"body_draft_asl length: {len(data.get('body_draft_asl', ''))}")

print(f"\nbody preview: {repr(data.get('body', '')[:200])}")
print(f"content preview: {repr(data.get('content', '')[:200])}")
