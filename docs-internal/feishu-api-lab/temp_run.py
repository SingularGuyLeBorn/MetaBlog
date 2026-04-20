import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from feishu_client import FeishuClient
import requests

load_dotenv(Path('../../.env'))
client = FeishuClient()
token = client.get_tenant_access_token()
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
print('OK')
# 创建测试文档
doc = client.api('POST', '/docx/v1/documents', json_data={'title': 'Update/Delete 最终测试'})
doc_id = doc['document']['document_id']
print(f'Doc ID: {doc_id}')
# 创建 text block
r = client.request(
    'POST',
    f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children',
    json_data={'children': [{'block_type': 2, 'text': {'elements': [{'text_run': {'content': 'Old text'}}]}}]}
)
text_id = r['data']['children'][0]['block_id']
print(f'Text block ID: {text_id}')

# PATCH（正确格式：update_text_elements）
r_patch = requests.patch(
    f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{text_id}',
    headers=headers,
    json={'update_text_elements': {'elements': [{'text_run': {'content': 'PATCHED text'}}]}}
)
print(json.dumps(r_patch.json(), indent=2, ensure_ascii=False))
# 创建 heading block
r = client.request(
    'POST',
    f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children',
    json_data={'children': [{'block_type': 3, 'heading1': {'elements': [{'text_run': {'content': 'Old heading'}}]}}]}
)
heading_id = r['data']['children'][0]['block_id']
print(f'Heading block ID: {heading_id}')

# PATCH heading 也用 update_text_elements
r_patch = requests.patch(
    f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{heading_id}',
    headers=headers,
    json={'update_text_elements': {'elements': [{'text_run': {'content': 'PATCHED heading'}}]}}
)
print(json.dumps(r_patch.json(), indent=2, ensure_ascii=False))
# 获取待删除 block 的索引
r_list = client.request('GET', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children')
items = r_list['data']['items']
print(f'Total blocks: {len(items)}')
for i, item in enumerate(items):
    print(f'  [{i}] {item["block_id"][:12]}... type={item["block_type"]}')

# 删除多个 block（必须从大到小的 index 删！）
target_indices = [2, 1]  # 先删 index 2，再删 index 1
for idx in target_indices:
    print(f'\nDeleting block at index {idx}...')
    r_delete = requests.delete(
        f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{doc_id}/children/batch_delete',
        headers=headers,
        json={'start_index': idx, 'end_index': idx + 1}
    )
    print(json.dumps(r_delete.json(), indent=2, ensure_ascii=False))
    time.sleep(0.3)

# 验证
r_list = client.request('GET', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children')
print(f'\nAfter delete: {len(r_list["data"]["items"])} blocks')
# 创建空 table（4 columns x 5 rows = 20 cells）
r = client.request(
    'POST',
    f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children',
    json_data={'children': [{'block_type': 31, 'table': {'property': {'column_size': 4, 'row_size': 5}}}]}
)
table_id = r['data']['children'][0]['block_id']
cell_ids = r['data']['children'][0]['table']['cells']
print(f'table_id={table_id[:20]}..., cells={len(cell_ids)}')

# 对每个 cell：GET 获取 auto-generated text child，然后 PATCH
patch_ok = 0
for i, cid in enumerate(cell_ids):
    r_cell = client.request('GET', f'/docx/v1/documents/{doc_id}/blocks/{cid}')
    text_child_id = r_cell['data']['block']['children'][0]
    content = f'Cell-{i//4}-{i%4}'
    
    r_patch = requests.patch(
        f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{text_child_id}',
        headers=headers,
        json={'update_text_elements': {'elements': [{'text_run': {'content': content}}]}}
    )
    if r_patch.json().get('code') == 0:
        patch_ok += 1
    else:
        print(f'  Cell {i} FAIL: {r_patch.json().get("msg")}')
    if i > 0 and i % 3 == 0:
        time.sleep(0.4)

print(f'\n{patch_ok}/{len(cell_ids)} cells patched OK')

# 验证 cell children 数量（应该都是 1）
for i in [0, 5, 10, 19]:
    r_cell = client.request('GET', f'/docx/v1/documents/{doc_id}/blocks/{cell_ids[i]}')
    children = r_cell['data']['block']['children']
    print(f'  Cell {i}: {len(children)} children')
# 验证 raw_content（应无空行副作用）
r_raw = client.request('GET', f'/docx/v1/documents/{doc_id}/raw_content')
print(r_raw.get('data', {}).get('content', 'N/A')[:500])