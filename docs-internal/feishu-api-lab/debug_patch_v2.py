import os
from pathlib import Path
from dotenv import load_dotenv
from feishu_client import FeishuClient
import json
import requests

load_dotenv(Path('../../.env'))
client = FeishuClient()
token = client.get_tenant_access_token()

# Create fresh doc
r_doc = client.request('POST', '/docx/v1/documents', json_data={'title': 'Final Patch Test'})
doc_id = r_doc['document']['document_id']
print(f"Doc ID: {doc_id}")

# Try direct requests to isolate any client.py issues
url = f"https://open.feishu.cn/open-apis/drive/v1/files/{doc_id}?type=docx"
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
payload = {'name': 'Success Patch Title'}

print(f"\nFinal Attempt: PATCH {url}")
r = requests.patch(url, headers=headers, json=payload)
print(f"Status Code: {r.status_code}")
print(f"Response: {json.dumps(r.json(), indent=2, ensure_ascii=False)}")
