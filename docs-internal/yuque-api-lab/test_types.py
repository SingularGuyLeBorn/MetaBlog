#!/usr/bin/env python3
import sys
sys.path.insert(0, ".")
from yuque_client import YuqueClient

client = YuqueClient()
book_id = 78128665

for t in ["Doc", "Note", "Resource", "Sheet", "Table"]:
    result = client.api("POST", "/api/docs", data={
        "action": "prependChild",
        "book_id": book_id,
        "title": f"Test-{t}",
        "type": t,
        "insert_to_catalog": True,
        "body": "# Test",
        "status": 0,
    }, referer="https://www.yuque.com")
    print(f"type={t}: status={result.get('status')}, code={result.get('code')}")
