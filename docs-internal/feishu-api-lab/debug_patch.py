import os
from pathlib import Path
from dotenv import load_dotenv
from feishu_client import FeishuClient
import json

# Setup
load_dotenv(Path('../../.env'))
client = FeishuClient()
token = client.get_tenant_access_token()

# 1. Create a dummy doc to test title update
r_doc = client.api('POST', '/docx/v1/documents', json_data={'title': 'Test Title Update'})
doc_id = r_doc['document']['document_id']
print(f"Created doc: {doc_id}")

# 2. Try update title via Drive PATCH
print("\nAttempt 1: PATCH /drive/v1/files/{doc_id} with {'name': 'New Name'}")
try:
    # We use request() to see the raw response
    res = client.request('PATCH', f'/drive/v1/files/{doc_id}', json_data={'name': 'Updated via Drive API'})
    print(f"Result: {json.dumps(res, indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")

# 3. Try providing 'type' in query
print("\nAttempt 2: PATCH /drive/v1/files/{doc_id}?type=docx with {'name': 'New Name'}")
try:
    res = client.request('PATCH', f'/drive/v1/files/{doc_id}', params={'type': 'docx'}, json_data={'name': 'Updated with Type'})
    print(f"Result: {json.dumps(res, indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
