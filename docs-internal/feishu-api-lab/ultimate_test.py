import os
import time
import json
from dotenv import load_dotenv
from pathlib import Path
from feishu_client import FeishuClient
import requests

# 0. 初始化
load_dotenv(Path('../../.env'))
client = FeishuClient()
token = client.get_tenant_access_token()
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

def get_current_state(did):
    """辅助：打印当前文档的纯文本缩略图和块数量"""
    try:
        res = client.api('GET', f'/docx/v1/documents/{did}/raw_content')
        blocks = client.api('GET', f'/docx/v1/documents/{did}/blocks/{did}/children')
        content = res.get('content', '').replace('\n', ' ')
        print(f"  [STATE] 块总数: {len(blocks.get('items', []))} | 内容预览: {content[:100]}...")
    except Exception as e:
        print(f"  [STATE] 读取状态失败: {e}")

print('✅ 验证环境准备就绪!')
print("--- 操作: 创建文档 ---")
r_doc = client.api('POST', '/docx/v1/documents', json_data={'title': '初始未命名文档'})
doc_id = r_doc['document']['document_id']
print(f"✅ 创建成功: {doc_id}")
get_current_state(doc_id)
print("--- 操作: 分配权限 ---")
owner_id = os.environ.get('FEISHU_OWNER_OPEN_ID')
if owner_id:
    client.api('POST', f'/drive/v1/permissions/{doc_id}/members', 
               json_data={'member_type': 'openid', 'member_id': owner_id, 'perm': 'full_access'},
               params={'type': 'docx', 'need_notification': 'false'})
    print(f"✅ 权限已下发至: {owner_id}")
else:
    print("ℹ️ 环境变量中未找到 OWNER_ID")
get_current_state(doc_id)
print("--- 操作: 更新文档标题 ---")
# 修复：Drive API 的 PATCH 必须带 type 参数
try:
    client.api('PATCH', f'/drive/v1/files/{doc_id}', 
               params={'type': 'docx'}, 
               json_data={'name': 'MetaBlog: 飞书 API 完美验证文档'})
    print("✅ 标题更新成功 (type=docx)")
except Exception as e:
    print(f"⚠️ type=docx 失败，正在尝试 type=file 备选方案... ({e})")
    client.api('PATCH', f'/drive/v1/files/{doc_id}', 
               params={'type': 'file'}, 
               json_data={'name': 'MetaBlog: 飞书 API 完美验证文档'})
    print("✅ 标题更新成功 (type=file)")

get_current_state(doc_id)
print("--- 操作: 增加基础内容 (Heading + Text) ---")
blocks = [
    {'block_type': 3, 'heading1': {'elements': [{'text_run': {'content': '第一章：基础测试'}}]}},
    {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '这是一行待删除的临时文本'}}]}},
    {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '这是一行待修改的原始文本'}}]}}
]
client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': blocks})
get_current_state(doc_id)

print("\n--- 操作: 删除中间内容 (删除第2个块) ---")
# 索引从 0 开始
client.api('DELETE', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children/batch_delete', 
           json_data={'start_index': 1, 'end_index': 2})
get_current_state(doc_id)

print("\n--- 操作: 修改剩余内容 (PATCH 第2个块) ---")
lists = client.api('GET', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children')
target_id = lists['items'][1]['block_id']
requests.patch(f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{target_id}',
               headers=headers, 
               json={'update_text_elements': {'elements': [{'text_run': {'content': '内容已被 PATCH 修改成功，并加粗', 'text_element_style': {'bold': True}}}]}})
get_current_state(doc_id)
print("--- 操作: 插入代码块与公式 ---")
complex_blocks = [
    {'block_type': 14, 'code': {'elements': [{'text_run': {'content': 'print("Hello MetaBlog")'}}]}},
    {'block_type': 20, 'equation': {'content': 'E = mc^2'}} 
]
client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': complex_blocks})
get_current_state(doc_id)
print("--- 操作: 创建 2x2 小表格 ---")
table_req = {'block_type': 31, 'table': {'property': {'column_size': 2, 'row_size': 2}}}
r_table = client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': [table_req]})
cell_ids = r_table['children'][0]['table']['cells']

data_2x2 = ['H1', 'H2', 'V1', 'V2']
for idx, cid in enumerate(cell_ids):
    # GET 拿到自动生成的子节点
    r_cell = client.request('GET', f'/docx/v1/documents/{doc_id}/blocks/{cid}')
    requests.patch(f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{r_cell["data"]["block"]["children"][0]}',
                   headers=headers, 
                   json={'update_text_elements': {'elements': [{'text_run': {'content': data_2x2[idx]}}]}})
print("✅ 小表格填充完成")
get_current_state(doc_id)

print("\n--- 操作: 创建 5x5 大表格 (压力测试) ---")
big_table_req = {'block_type': 31, 'table': {'property': {'column_size': 5, 'row_size': 5}}}
r_big_table = client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': [big_table_req]})
big_cell_ids = r_big_table['children'][0]['table']['cells']

for idx, cid in enumerate(big_cell_ids):
    if idx > 0 and idx % 3 == 0: time.sleep(0.4)
    r_cell = client.request('GET', f'/docx/v1/documents/{doc_id}/blocks/{cid}')
    requests.patch(f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{r_cell["data"]["block"]["children"][0]}',
                   headers=headers, 
                   json={'update_text_elements': {'elements': [{'text_run': {'content': f'R{idx//5}C{idx%5}'}}]}})
print(f"✅ 5x5 大表格 ({len(big_cell_ids)} 格) 填充完成")
get_current_state(doc_id)
print(f"\n--- 最终验证报告 ---")
print(f"文稿链接: https://feishu.cn/docx/{doc_id}")
final_res = client.api('GET', f'/docx/v1/documents/{doc_id}/raw_content')
print("-" * 50)
print(final_res.get('content'))
print("-" * 50)