import os
from pathlib import Path
from dotenv import load_dotenv
from feishu_client import FeishuClient
import json

load_dotenv(Path('../../.env'))
client = FeishuClient()

# 1. Create doc
r_doc = client.api('POST', '/docx/v1/documents', json_data={'title': 'Structure Check'})
doc_id = r_doc['document']['document_id']
print(f"Doc ID: {doc_id}")

# 2. Get file metadata from Drive
print("\nChecking file metadata via GET /drive/v1/files/{doc_id}")
r_meta = client.request('GET', f'/drive/v1/files/{doc_id}')
print(json.dumps(r_meta, indent=2, ensure_ascii=False))
