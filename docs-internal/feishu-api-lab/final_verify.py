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

def verify_step(did, action_name):
    """辅助：在每个步骤后读取并验证文档状态"""
    print(f"\n--- [验证] {action_name} ---")
    res = client.api('GET', f'/docx/v1/documents/{did}/raw_content')
    blocks = client.api('GET', f'/docx/v1/documents/{did}/blocks/{did}/children')
    items = blocks.get('items', [])
    content = res.get('content', '').replace('\n', ' ')
    print(f"  [RESULT] 当前块总数: {len(items)} | 文字快照: {content[:100]}...")

print('✅ 验证环境准备就绪!')
# 创建时显式指定标题，规避 Drive API 分布式索引延迟
r_doc = client.api('POST', '/docx/v1/documents', json_data={'title': 'MetaBlog Hardcore 终极方案'})
doc_id = r_doc['document']['document_id']
print(f"✅ 文档创建成功: {doc_id}")
verify_step(doc_id, "初始空文档状态")
# 注入基础结构：标题 + 修改占位块 + 删除占位块
init_blocks = [
    {'block_type': 3, 'heading1': {'elements': [{'text_run': {'content': '核心 CRUD 总线验证'}}]}},
    {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '待修改段落：原始占位文本。'}}]}},
    {'block_type': 2, 'text': {'elements': [{'text_run': {'content': '这一行是垃圾数据，注定被 DELETE 掉。'}}]}}
]
client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': init_blocks})
verify_step(doc_id, "批量注入基础块")
# 删除最后一个块 (索引为 2)
client.api('DELETE', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children/batch_delete', 
           json_data={'start_index': 2, 'end_index': 3})
verify_step(doc_id, "定点删除操作")
# 重新获取 Blocks 以定位中间那个文字块的 ID
lists = client.api('GET', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children')
target_id = lists['items'][1]['block_id']

# 执行 PATCH 操作，更新内容并修改样式（加粗）
requests.patch(f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{target_id}',
               headers=headers, 
               json={'update_text_elements': {'elements': [{'text_run': {'content': 'PATCH 成功：内容已覆写为加粗的新文字！', 'text_element_style': {'bold': True}}}]}})
verify_step(doc_id, "PATCH 定点更新")
# 写入代码块和引用块
advanced_blocks = [
    {'block_type': 14, 'code': {'elements': [{'text_run': {'content': 'def metablog_sync(): return True'}}]}},
    {'block_type': 15, 'quote': {'elements': [{'text_run': {'content': '追求极简的工程思维：先验证，再实装。'}}]}} 
]
client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': advanced_blocks})
verify_step(doc_id, "插入代码与引用块")
print("--- 启动表格自动化装填流水线 (25单元格) ---")
table_req = {'block_type': 31, 'table': {'property': {'column_size': 5, 'row_size': 5}}}
r_table = client.api('POST', f'/docx/v1/documents/{doc_id}/blocks/{doc_id}/children', json_data={'children': [table_req]})
cell_ids = r_table['children'][0]['table']['cells']

for idx, cid in enumerate(cell_ids):
    if idx > 0 and idx % 3 == 0: time.sleep(0.4) # 遵守 3QPS 限制
    r_cell = client.request('GET', f'/docx/v1/documents/{doc_id}/blocks/{cid}')
    anchor_id = r_cell["data"]["block"]["children"][0]
    requests.patch(f'https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{anchor_id}',
                   headers=headers, 
                   json={'update_text_elements': {'elements': [{'text_run': {'content': f'R{idx//5}_C{idx%5}'}}]}})

print("✅ 表格全量数据同步完成！")
verify_step(doc_id, "大型表格综合装填验证")
print(f"\n--- 最终渲染结果展示 ---")
print(f"飞书文档链接: https://feishu.cn/docx/{doc_id}")
final_res = client.api('GET', f'/docx/v1/documents/{doc_id}/raw_content')
print("-" * 60)
print(final_res.get('content'))
print("-" * 60)