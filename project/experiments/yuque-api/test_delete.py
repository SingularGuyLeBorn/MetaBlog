#!/usr/bin/env python3
"""
测试删除文档 - 使用刚创建的知识库中的文档
但注意：当前账号无法创建文档，所以这个测试可能需要跳过
或者测试删除一个现有文档
"""
import sys
sys.path.insert(0, ".")
from yuque_client import YuqueClient

client = YuqueClient()

# 在新创建的知识库 api-test-auto 中查看是否有文档
book_id = 78128665
docs_result = client.api("GET", "/api/docs", query={"book_id": str(book_id)})
docs = docs_result.get("data", [])
print(f"New book has {len(docs)} docs")

# 尝试删除 zf1hbk 中一个文档来验证删除 API
# 先列出来看看
book_id2 = 68016047
docs_result2 = client.api("GET", "/api/docs", query={"book_id": str(book_id2), "limit": "5"})
docs2 = docs_result2.get("data", [])
for d in docs2:
    print(f"  Doc: {d['title']} (ID={d['id']}, slug={d['slug']})")
